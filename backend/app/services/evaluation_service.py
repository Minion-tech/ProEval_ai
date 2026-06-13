import uuid
import re
import asyncio
from typing import Optional

from anthropic import AsyncAnthropic
import google.generativeai as genai
from langsmith.wrappers import wrap_anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import HTTPException

from app.db.session import get_session_factory
from app.db.Models import (
    Evaluation, 
    EvaluationPhase, 
    EvaluationStatus, 
    ProjectSubmission, 
    ProjectPhase, 
    TeamMembership,
    MemberEvaluation
)
from app.agents.ideator import IdeatorAgent
from app.agents.architect import ArchitectAgent
from app.agents.mentor import MentorAgent
from app.agents.auditor import AuditorAgent
from app.core.config import settings
from app.core.summarizer import get_summarizer_service
from app.core.rate_limiter import agent_rate_limiter
from app.evaluation_heuristics.github_tracker import (
    GithubCodeFetcher,
    GithubCodeFetcherError,
    GithubRepositoryNotFoundError,
    GithubUnauthorizedError,
)

class EvaluationService:
    COMMON_PHASE_1_QUESTIONS = [
        "What specific real-world user or organization will benefit first from this project?",
        "What makes this project meaningfully different from common student projects in the same domain?",
        "What is the smallest end-to-end version you can realistically complete and demonstrate in Phase 1/early Phase 2?",
    ]

    @staticmethod
    async def _fetch_github_code_context(repository_url: str) -> str:
        if not repository_url:
            return ""

        # Try with configured token first
        fetcher = GithubCodeFetcher(
            personal_access_token=settings.GITHUB_PERSONAL_ACCESS_TOKEN or None,
        )

        try:
            return await asyncio.to_thread(fetcher.fetch_repository_code, repository_url)
        except GithubUnauthorizedError:
            # Fallback: If token is invalid/expired, try fetching WITHOUT a token (works for public repos)
            print("WARNING: GitHub token unauthorized. Retrying without token for public access.")
            fetcher_no_token = GithubCodeFetcher(personal_access_token=None)
            try:
                return await asyncio.to_thread(fetcher_no_token.fetch_repository_code, repository_url)
            except Exception as exc:
                return f"GitHub access denied (Invalid token and public fetch failed): {exc}"
        except (GithubRepositoryNotFoundError, GithubCodeFetcherError) as exc:
            return f"GitHub repository fetch failed: {exc}"
        except Exception as exc:
            return f"Unexpected error while fetching GitHub code: {exc}"

    @staticmethod
    def _summarize_github_code_context(github_code_context: str) -> str:
        if not github_code_context:
            return ""

        file_matches = re.findall(r"--- FILE: (.+?) ---", github_code_context)
        summary_parts: list[str] = []
        summary_parts.append(f"Repository snapshot includes {len(file_matches)} file entries.")
        if file_matches:
            summary_parts.append("Key files: " + ", ".join(file_matches[:8]))

        trimmed = github_code_context.strip()
        if len(trimmed) > 2400:
            summary_parts.append("Repository content was large, so only a representative excerpt is included below:")
            summary_parts.append(trimmed[:2400].rstrip() + "\n[truncated]")
        else:
            summary_parts.append("Repository content snapshot:")
            summary_parts.append(trimmed)

        return "\n".join(summary_parts)

    @staticmethod
    def _summarize_presentation(presentation_url: str) -> str:
        if not presentation_url:
            return "No presentation was provided."
        if presentation_url.startswith("data:"):
            return (
                "A presentation file was uploaded, but the raw file content is not available for automated summary. "
                "Use the supplied presentation reference and project narrative for evaluation."
            )
        return f"Presentation reference: {presentation_url}"

    @staticmethod
    def _escape_html(value: str) -> str:
        if value is None:
            return ""
        if not isinstance(value, str):
            value = str(value)
        return (
            value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
        )

    @staticmethod
    def _html_wrap(content: str) -> str:
        return (
            '<div style="font-family: \'Segoe UI\', sans-serif; max-width: 720px; padding: 24px;">'
            f'{content}'
            '</div>'
        )

    @staticmethod
    def _html_heading(level: int, text: str) -> str:
        tag = "h2" if level == 2 else "h3"
        return (
            f"<{tag} style=\"font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 12px 0;\">"
            f"{EvaluationService._escape_html(text)}"
            f"</{tag}>"
        )

    @staticmethod
    def _clean_markdown_text(value: str) -> str:
        if value is None:
            return ""
        if not isinstance(value, str):
            value = str(value)
        text = value.strip()
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
        text = re.sub(r"\*(.*?)\*", r"\1", text)
        text = re.sub(r"__(.*?)__", r"\1", text)
        text = re.sub(r"_(.*?)_", r"\1", text)
        text = re.sub(r"(^|\s)[\-–•]\s+", r"\1", text)
        text = re.sub(r"[#`]+", "", text)
        return text.strip()

    @staticmethod
    def _html_paragraph(text: str) -> str:
        return (
            f"<p style=\"font-size: 14px; color: #333; line-height: 1.7; margin: 0 0 14px 0;\">"
            f"{EvaluationService._escape_html(text)}"
            f"</p>"
        )

    @staticmethod
    def _html_paragraph_html(html: str) -> str:
        return (
            f"<p style=\"font-size: 14px; color: #333; line-height: 1.7; margin: 0 0 14px 0;\">"
            f"{html}"
            f"</p>"
        )

    @staticmethod
    def _html_list(items: list[str]) -> str:
        if not items:
            return ""
        li_elements = "".join(
            f"<li style=\"margin-bottom: 8px;\">{EvaluationService._escape_html(item)}</li>"
            for item in items
        )
        return f"<ul style=\"font-size: 14px; color: #333; line-height: 1.7; margin: 0 0 18px 0; padding-left: 20px;\">{li_elements}</ul>"

    @staticmethod
    def _html_label(text: str, color_key: str) -> str:
        # Simple mapping for colors
        colors = {
            "APPROVE": "#d4edda", # Green
            "PASS": "#d4edda",
            "DISTINCT": "#cce5ff", # Blue
            "REFINE": "#fff3cd", # Orange
            "REVIEW": "#fff3cd",
            "FAIL": "#f8d7da", # Red
            "REJECT": "#f8d7da",
            "AT_RISK": "#f8d7da",
            "ON_TRACK": "#d4edda",
        }
        bg = colors.get(color_key.upper(), "#f1f5f9")
        return f'<span style="background-color: {bg}; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">{text}</span>'

    @staticmethod
    async def get_latest_evaluation(
        db: AsyncSession,
        submission_id: uuid.UUID,
        phase: EvaluationPhase,
    ) -> Optional[Evaluation]:
        """Returns the latest evaluation for a submission-phase pair."""
        query = (
            select(Evaluation)
            .where(
                Evaluation.submission_id == submission_id,
                Evaluation.phase == phase,
            )
            .order_by(Evaluation.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def create_evaluation_record(
        db: AsyncSession,
        submission_id: uuid.UUID,
        phase: EvaluationPhase,
        agent_logs: Optional[list] = None,
    ) -> Evaluation:
        """Creates the initial pending record."""
        new_evaluation = Evaluation(
            submission_id=submission_id,
            phase=phase,
            status=EvaluationStatus.PENDING,
            agent_logs=agent_logs,
        )
        db.add(new_evaluation)
        await db.commit()
        await db.refresh(new_evaluation)
        return new_evaluation

    @staticmethod
    async def run_phase_1_analysis(evaluation_id: uuid.UUID):
        """
        MAPES Phase 1: Leader submission -> clarification -> Ideator mentorship.
        """
        print(f"DEBUG: Starting Phase 1 analysis for evaluation {evaluation_id}")
        evaluation = None
        async with get_session_factory()() as db:
            try:
                query = select(Evaluation).where(Evaluation.id == evaluation_id)
                result = await db.execute(query)
                evaluation = result.scalar_one_or_none()
                if not evaluation:
                    print(f"DEBUG: Evaluation {evaluation_id} not found")
                    return

                query_project = (
                    select(ProjectSubmission)
                    .where(ProjectSubmission.id == evaluation.submission_id)
                    .options(
                        joinedload(ProjectSubmission.members).joinedload(
                            TeamMembership.student
                        )
                    )
                )
                result_project = await db.execute(query_project)
                project = result_project.unique().scalar_one_or_none()

                if not project or not project.phase_1_data:
                    print(
                        f"DEBUG: Project or Phase 1 data missing for evaluation {evaluation_id}"
                    )
                    evaluation.status = EvaluationStatus.FAILED
                    evaluation.ai_narrative = "Missing Phase 1 data."
                    await db.commit()
                    return

                print(f"DEBUG: Updating evaluation {evaluation_id} to IN_PROGRESS")
                evaluation.status = EvaluationStatus.IN_PROGRESS
                await db.commit()

                clarification_answers = (project.phase_1_data or {}).get("clarification_answers")

                if not clarification_answers:
                    evaluation.agent_logs = [{
                        "agent": "Ideator",
                        "stage": "clarification",
                        "clarification_questions": EvaluationService.COMMON_PHASE_1_QUESTIONS,
                    }]
                    evaluation.total_score = None
                    evaluation.status = EvaluationStatus.AWAITING_CLARIFICATION
                    prompt_narrative = "### Clarification Required\n"
                    prompt_narrative += "Please answer these common project questions before Ideator finalizes the Phase 1 mentorship:\n\n"
                    for q in EvaluationService.COMMON_PHASE_1_QUESTIONS:
                        prompt_narrative += f"- {q}\n"
                    evaluation.ai_narrative = prompt_narrative
                    await db.commit()
                    return

                # RUN AI IDEATOR
                ideator = IdeatorAgent(None, settings.GEMINI_MODEL)
                ideator_results = await ideator.analyze(project.phase_1_data)

                # BUILD HTML NARRATIVE
                narrative_parts = [
                    EvaluationService._html_heading(2, f"Mentorship Feedback: {project.phase_1_data.get('title', 'Project')}"),
                    EvaluationService._html_paragraph(EvaluationService._clean_markdown_text(ideator_results.get("reasoning", "")))
                ]

                if ideator_results.get("findings"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Key Concerns"))
                    narrative_parts.append(EvaluationService._html_list(ideator_results["findings"]))

                if ideator_results.get("student_alerts"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Friendly Alerts for Portfolio Strength"))
                    narrative_parts.append(EvaluationService._html_list(ideator_results["student_alerts"]))

                if ideator_results.get("improvement_actions"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Concrete Improvement Actions"))
                    narrative_parts.append(EvaluationService._html_list(ideator_results["improvement_actions"]))

                # Add clarification section
                if ideator_results.get("clarification_feedback"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Clarification Feedback"))
                    feedback_items = []
                    for cf in ideator_results["clarification_feedback"]:
                        label = EvaluationService._html_label(cf.get("viability", "REVIEW"), cf.get("viability", "REVIEW"))
                        feedback_items.append(f"<strong>Question {cf.get('question_index', '?')}:</strong> {label} {EvaluationService._clean_markdown_text(cf.get('notes', ''))}")
                    narrative_parts.append(EvaluationService._html_list(feedback_items))

                if ideator_results.get("timeline"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Suggested 12-Week Roadmap"))
                    roadmap_items = []
                    for step in ideator_results.get("timeline", []):
                        weeks = step.get("weeks") or step.get("week") or "?"
                        goal = step.get("goal") or step.get("guidance") or ""
                        roadmap_items.append(f"Weeks {weeks}: {goal}")
                    narrative_parts.append(EvaluationService._html_list(roadmap_items))

                narrative = EvaluationService._html_wrap("".join(narrative_parts))

                # Persist structured ideator results (timeline, clarification evaluations) to agent_logs
                evaluation.agent_logs = [ideator_results]
                evaluation.total_score = None
                evaluation.ai_narrative = narrative
                evaluation.status = EvaluationStatus.COMPLETED

                await db.commit()

            except Exception as e:
                import traceback

                error_trace = traceback.format_exc()
                print(f"MAPES PHASE 1 ERROR: {str(e)}")
                print(f"TRACEBACK: {error_trace}")

                if evaluation:
                    err_msg = str(e)
                    friendly_msg = f"Agent Error: {err_msg}"
                    
                    if "quota" in err_msg.lower() or "429" in err_msg:
                        friendly_msg = (
                            "### AI Quota Exceeded\n"
                            "The AI Mentors have reached their daily processing limit. "
                            "Please wait for a few hours or until tomorrow morning for your analysis to complete. "
                            "Your project has been saved and will be ready for re-evaluation soon."
                        )

                    try:
                        evaluation.status = EvaluationStatus.FAILED
                        evaluation.ai_narrative = friendly_msg
                        await db.commit()
                    except Exception as inner_e:
                        print(f"DEBUG: Failed to save FAILED status: {inner_e}")

    @staticmethod
    async def run_phase_1_architect_review(evaluation_id: uuid.UUID):
        """Runs Architect only after the team is fully formed."""
        print(f"DEBUG: Starting Phase 1 architect review for evaluation {evaluation_id}")
        evaluation = None
        async with get_session_factory()() as db:
            try:
                result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
                evaluation = result.scalar_one_or_none()
                if not evaluation:
                    return

                query_project = (
                    select(ProjectSubmission)
                    .where(ProjectSubmission.id == evaluation.submission_id)
                    .options(
                        joinedload(ProjectSubmission.members).joinedload(TeamMembership.student)
                    )
                )
                result_project = await db.execute(query_project)
                project = result_project.unique().scalar_one_or_none()

                if not project:
                    return

                evaluation.status = EvaluationStatus.IN_PROGRESS
                await db.commit()

                ideator_result = None
                ideator_eval_result = await db.execute(
                    select(Evaluation)
                    .where(
                        Evaluation.submission_id == project.id,
                        Evaluation.phase == EvaluationPhase.PHASE_1,
                        Evaluation.id != evaluation.id,
                    )
                    .order_by(Evaluation.created_at.desc())
                )
                for prev in ideator_eval_result.scalars().all():
                    if prev.agent_logs and prev.agent_logs[0].get("agent") == "Ideator":
                        ideator_result = prev.agent_logs[0]
                        break

                architect = ArchitectAgent(None, settings.GEMINI_MODEL)
                member_summary = [
                    {
                        "name": m.student.name,
                        "role": m.role,
                        "skills": m.tech_stack,
                        "functions": m.functions,
                        "modules": m.modules,
                        "work_description": m.work_description,
                    }
                    for m in project.members
                ]
                architect_payload = {**project.phase_1_data, "members": member_summary}
                architect_results = await architect.analyze(architect_payload)

                logs = []
                narrative_parts = []
                if ideator_result:
                    logs.append(ideator_result)
                    narrative_parts.append(EvaluationService._html_heading(2, f"{ideator_result['agent']} Mentorship"))
                    ideator_verdict_html = EvaluationService._html_label(str(ideator_result.get('verdict', 'REFINE')).upper(), str(ideator_result.get('verdict', 'REFINE')).upper())
                    narrative_parts.append(EvaluationService._html_paragraph_html(f"Verdict: {ideator_verdict_html}"))
                    if ideator_result.get("reasoning"):
                        narrative_parts.append(EvaluationService._html_paragraph(EvaluationService._clean_markdown_text(ideator_result["reasoning"])))

                narrative_parts.append(EvaluationService._html_heading(2, f"{architect_results['agent']} Review"))
                architect_verdict_html = EvaluationService._html_label(str(architect_results.get('verdict', 'REFINE')).upper(), str(architect_results.get('verdict', 'REFINE')).upper())
                narrative_parts.append(EvaluationService._html_paragraph_html(f"Verdict: {architect_verdict_html}"))
                if architect_results.get("reasoning"):
                    narrative_parts.append(EvaluationService._html_paragraph(EvaluationService._clean_markdown_text(architect_results["reasoning"])))

                if architect_results.get("findings"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Technical Concerns"))
                    narrative_parts.append(EvaluationService._html_list(architect_results["findings"]))

                if architect_results.get("recommendations"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Technical Guidance"))
                    narrative_parts.append(EvaluationService._html_list(architect_results["recommendations"]))

                narrative = EvaluationService._html_wrap("".join(narrative_parts))

                logs.append(architect_results)

                evaluation.agent_logs = logs
                evaluation.total_score = None
                evaluation.ai_narrative = narrative
                evaluation.status = EvaluationStatus.COMPLETED
                project.current_phase = ProjectPhase.PHASE_2
                await db.commit()
            except Exception as e:
                import traceback

                print(f"MAPES PHASE 1 ARCHITECT ERROR: {str(e)}")
                print(traceback.format_exc())
                if evaluation:
                    err_msg = str(e)
                    friendly_msg = f"Architect Error: {err_msg}"
                    
                    if "quota" in err_msg.lower() or "429" in err_msg:
                        friendly_msg = (
                            "### AI Quota Exceeded\n"
                            "The AI Mentors have reached their daily processing limit. "
                            "Please wait for a few hours or until tomorrow morning for your analysis to complete. "
                            "Your project has been saved and will be ready for re-evaluation soon."
                        )

                    try:
                        evaluation.status = EvaluationStatus.FAILED
                        evaluation.ai_narrative = friendly_msg
                        await db.commit()
                    except Exception:
                        pass

    @staticmethod
    async def run_phase_2_analysis(evaluation_id: uuid.UUID) -> None:
        """
        MAPES Phase 2: Execution Monitoring (Mentor Agent)
        """
        evaluation = None
        async with get_session_factory()() as db:
            try:
                query = select(Evaluation).where(Evaluation.id == evaluation_id)
                result = await db.execute(query)
                evaluation = result.scalar_one_or_none()
                if not evaluation:
                    return

                query_project = (
                    select(ProjectSubmission)
                    .where(ProjectSubmission.id == evaluation.submission_id)
                    .options(
                        joinedload(ProjectSubmission.members).joinedload(TeamMembership.student)
                    )
                )
                result_project = await db.execute(query_project)
                project = result_project.unique().scalar_one_or_none()

                if not project or not project.phase_2_data:
                    evaluation.status = EvaluationStatus.FAILED
                    evaluation.ai_narrative = "Missing Phase 2 data."
                    await db.commit()
                    return

                evaluation.status = EvaluationStatus.IN_PROGRESS
                await db.commit()

                mentor = MentorAgent(None, settings.GEMINI_MODEL)

                # Combine Phase 1 (context) and Phase 2 (progress)
                member_summary = [
                    {"name": m.student.name, "role": m.role, "skills": m.tech_stack}
                    for m in project.members
                ]
                github_url = project.phase_2_data.get("github_url", "")
                github_code_context = await EvaluationService._fetch_github_code_context(github_url)
                github_code_summary = EvaluationService._summarize_github_code_context(github_code_context)
                presentation_summary = EvaluationService._summarize_presentation(
                    project.phase_2_data.get("presentation_url", "")
                )

                mentor_payload = {
                    "title": project.phase_1_data.get("title", "Untitled"),
                    "tech_stack": project.phase_1_data.get("tech_stack", []),
                    "github_url": github_url,
                    "presentation_url": project.phase_2_data.get("presentation_url", ""),
                    "presentation_summary": presentation_summary,
                    "progress_notes": project.phase_2_data.get("progress_notes", ""),
                    "members": member_summary,
                    "github_code_summary": github_code_summary,
                }

                # Step 6: Sequential Execution via Rate Limiter
                mentor_results = await agent_rate_limiter.call_with_backoff(mentor.analyze, mentor_payload)

                narrative_parts = [
                    EvaluationService._html_heading(2, f"Phase 2: {mentor_results['agent']} Progress Review"),
                    EvaluationService._html_paragraph_html(f"Verdict: {EvaluationService._html_label(str(mentor_results.get('verdict', 'AT_RISK')).upper(), str(mentor_results.get('verdict', 'AT_RISK')).upper())} | Execution Score: {mentor_results['score']}/100"),
                ]
                if mentor_results.get("reasoning"):
                    narrative_parts.append(EvaluationService._html_paragraph(EvaluationService._clean_markdown_text(mentor_results["reasoning"])))

                if mentor_results.get("findings"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Identified Strengths"))
                    narrative_parts.append(EvaluationService._html_list(mentor_results["findings"]))

                if mentor_results.get("recommendations"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Improvement Recommendations"))
                    narrative_parts.append(EvaluationService._html_list(mentor_results["recommendations"]))

                if mentor_results.get("plagiarism_risks"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Risk Signals"))
                    narrative_parts.append(EvaluationService._html_list(mentor_results["plagiarism_risks"]))

                narrative = EvaluationService._html_wrap("".join(narrative_parts))

                evaluation.ai_narrative = narrative
                evaluation.total_score = mentor_results["score"]
                evaluation.agent_logs = [mentor_results]
                evaluation.status = EvaluationStatus.COMPLETED

                await db.commit()

            except Exception as e:
                err_msg = str(e)
                friendly_msg = f"Mentor Agent Error: {err_msg}"
                
                if "quota" in err_msg.lower() or "429" in err_msg:
                    friendly_msg = (
                        "### AI Quota Exceeded\n"
                        "The AI Mentors have reached their daily processing limit. "
                        "Please wait for a few hours or until tomorrow morning for your analysis to complete. "
                        "Your project has been saved and will be ready for re-evaluation soon."
                    )

                if evaluation:
                    evaluation.status = EvaluationStatus.FAILED
                    evaluation.ai_narrative = friendly_msg
                    await db.commit()

    @staticmethod
    async def run_final_analysis(evaluation_id: uuid.UUID) -> None:
        """
        MAPES Phase 3: Final Audit (Mentor Agent Only - Optimized for Rate Limits)
        """
        # Random jitter safety delay to prevent burst limit 429s from concurrent evaluations
        import random
        await asyncio.sleep(random.uniform(5, 25))

        evaluation = None
        async with get_session_factory()() as db:
            try:
                query = select(Evaluation).where(Evaluation.id == evaluation_id)
                result = await db.execute(query)
                evaluation = result.scalar_one_or_none()
                if not evaluation:
                    return

                query_project = (
                    select(ProjectSubmission)
                    .where(ProjectSubmission.id == evaluation.submission_id)
                    .options(
                        joinedload(ProjectSubmission.members).joinedload(TeamMembership.student)
                    )
                )
                result_project = await db.execute(query_project)
                project = result_project.unique().scalar_one_or_none()

                if not project or not project.final_data:
                    evaluation.status = EvaluationStatus.FAILED
                    evaluation.ai_narrative = "Missing Final submission data."
                    await db.commit()
                    return

                evaluation.status = EvaluationStatus.IN_PROGRESS
                await db.commit()

                auditor = AuditorAgent(None, settings.GEMINI_MODEL)
                summarizer = get_summarizer_service()

                # Combine everything for final audit
                member_summary = [
                    {"name": m.student.name, "role": m.role, "skills": m.tech_stack}
                    for m in project.members
                ]
                github_url = project.final_data.get("github_url", "")
                github_code_context = await EvaluationService._fetch_github_code_context(github_url)
                
                # Compress Large Code Context (SOLID: Delegating summarization to specialized service)
                print(f"DEBUG: Summarizing GitHub code for {github_url}...")
                github_code_summary = await summarizer.summarize_code(github_code_context)

                # Compress Final Summary / Notes (If large)
                final_notes_raw = project.final_data.get("final_notes", "No final summary provided")
                print(f"DEBUG: Summarizing final notes...")
                final_summary_compressed = await summarizer.summarize_document(final_notes_raw)

                # Filter out massive base64 data from URLs to prevent 'Payload too large' (429/413) errors.
                # AI models cannot read raw base64 anyway.
                final_report_url = project.final_data.get("final_report_url", "No report URL")
                if final_report_url and final_report_url.startswith("data:"):
                    final_report_url = "[Base64 PDF/Document Uploaded]"

                presentation_url = project.final_data.get("presentation_url", "No presentation URL")
                if presentation_url and presentation_url.startswith("data:"):
                    presentation_url = "[Base64 Presentation Uploaded]"

                auditor_payload = {
                    "title": project.phase_1_data.get("title", "Untitled"),
                    "tech_stack": project.phase_1_data.get("tech_stack", []),
                    "github_url": github_url,
                    "final_summary": final_summary_compressed,
                    "members": member_summary,
                    "github_code_summary": github_code_summary,
                    "phase_2_feedback": (project.phase_2_data or {}).get("progress_notes", ""), 
                    "individual_contributions": [], 
                    "final_report_url": final_report_url,
                    "presentation_url": presentation_url
                }

                # Step 6 & 7: Sequential Execution via Rate Limiter
                readiness_results = await agent_rate_limiter.call_with_backoff(auditor.analyze, auditor_payload)

                narrative_parts = [
                    EvaluationService._html_heading(2, f"Final Hackathon Readiness Audit ({readiness_results['agent']})"),
                    EvaluationService._html_paragraph_html(f"Readiness Verdict: {EvaluationService._html_label(str(readiness_results.get('verdict', 'REVIEW')).upper(), str(readiness_results.get('verdict', 'REVIEW')).upper())} | Competition Score: {readiness_results['score']}/100"),
                ]
                if readiness_results.get("reasoning"):
                    narrative_parts.append(EvaluationService._html_paragraph(EvaluationService._clean_markdown_text(readiness_results.get("reasoning", ""))))

                if readiness_results.get("findings"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Competition Strengths"))
                    narrative_parts.append(EvaluationService._html_list(readiness_results.get("findings", [])))

                if readiness_results.get("recommendations"):
                    narrative_parts.append(EvaluationService._html_heading(3, "Final Improvement Recommendations"))
                    narrative_parts.append(EvaluationService._html_list(readiness_results.get("recommendations", [])))

                narrative = EvaluationService._html_wrap("".join(narrative_parts))

                evaluation.ai_narrative = narrative
                evaluation.total_score = readiness_results["score"]
                evaluation.agent_logs = [readiness_results]
                evaluation.status = EvaluationStatus.COMPLETED
                project.current_phase = ProjectPhase.FINAL # Keep as final

                await db.commit()

            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"CRITICAL: Final Analysis failed for {evaluation_id}: {error_details}")
                if evaluation:
                    err_msg = str(e)
                    friendly_msg = f"Audit Agent Error: {err_msg}"
                    
                    if "quota" in err_msg.lower() or "429" in err_msg:
                        friendly_msg = (
                            "### AI Quota Exceeded\n"
                            "The AI Mentors have reached their daily processing limit. "
                            "Please wait for a few hours or until tomorrow morning for your analysis to complete. "
                            "Your project has been saved and will be ready for re-evaluation soon."
                        )

                    evaluation.status = EvaluationStatus.FAILED
                    evaluation.ai_narrative = friendly_msg
                    await db.commit()

    @staticmethod
    async def generate_member_orientation(member_id: uuid.UUID):
        """
        (Stays as is or can be refactored to use ArchitectAgent)
        """
        pass
