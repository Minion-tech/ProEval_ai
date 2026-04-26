import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic

from sqlalchemy.orm import joinedload
from app.db.Models import (
    Evaluation,
    ProjectSubmission,
    TeamMembership,
    EvaluationPhase,
    EvaluationStatus,
    GuideStatus,
    ProjectPhase,
)
from app.db.session import get_session_factory
from app.core.config import settings

# Initialize the Anthropic Client
# Note: This uses the ANTHROPIC_API_KEY from our settings
anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

class EvaluationService:
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
        faculty_id: uuid.UUID,
        phase: EvaluationPhase
    ) -> Evaluation:
        """Creates the initial pending record."""
        new_evaluation = Evaluation(
            submission_id=submission_id,
            faculty_id=faculty_id,
            phase=phase,
            status=EvaluationStatus.PENDING
        )
        db.add(new_evaluation)
        await db.commit()
        await db.refresh(new_evaluation)
        return new_evaluation

    @staticmethod
    async def get_submission_evaluation(
        db: AsyncSession,
        submission_id: uuid.UUID,
        phase: EvaluationPhase,
    ) -> Optional[Evaluation]:
        """Return the newest evaluation for a project submission and phase."""
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
    async def run_phase_1_analysis(
        evaluation_id: uuid.UUID
    ):
        """
        Real AI Analysis using Anthropic Claude with Personalized Mentorship.
        """
        try:
            await EvaluationService._run_phase_1_analysis_inner(evaluation_id)
        except Exception as e:
            print(f"FATAL: phase-1 task crashed before inner handler: {e}")
            try:
                async with get_session_factory()() as db:
                    result = await db.execute(
                        select(Evaluation).where(Evaluation.id == evaluation_id)
                    )
                    ev = result.scalar_one_or_none()
                    if ev and ev.status not in (EvaluationStatus.COMPLETED, EvaluationStatus.FAILED):
                        ev.status = EvaluationStatus.FAILED
                        ev.ai_narrative = f"Internal error: {str(e)}"
                        await db.commit()
            except Exception:
                pass

    @staticmethod
    async def _run_phase_1_analysis_inner(evaluation_id: uuid.UUID):
        async with get_session_factory()() as db:
            # 1. Fetch the records
            query = select(Evaluation).where(Evaluation.id == evaluation_id)
            result = await db.execute(query)
            evaluation = result.scalar_one_or_none()
            
            if not evaluation:
                return

            # Fetch project with team members
            query_project = select(ProjectSubmission).where(
                ProjectSubmission.id == evaluation.submission_id
            ).options(
                joinedload(ProjectSubmission.members).joinedload(TeamMembership.student)
            )
            result_project = await db.execute(query_project)
            project = result_project.unique().scalar_one_or_none()

            if not project or not project.phase_1_data:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = "Error: Missing phase data."
                await db.commit()
                return

            # 2. Mark as In Progress
            evaluation.status = EvaluationStatus.IN_PROGRESS
            await db.commit()

            try:
                # 3. Construct the Personalized Info
                member_details = []
                for m in project.members:
                    member_details.append(
                        f"- {m.student.name} (Role: {m.role}, Skills: {m.tech_stack or 'None listed'})"
                    )

                proposal = project.phase_1_data
                system_prompt = (
                    "You are a Senior Academic Mentor at a Technical University. "
                    "Analyze this student 'Phase 1: Project Proposal'. "
                    "Provide a high-quality, encouraging, and personalized mentorship report. "
                    "Structure your response exactly as follows:\n\n"
                    "VERDICT: [Score 0-10] [One-sentence summary]\n\n"
                    "PILLARS:\n"
                    "- Clarity: [High/Med/Low] - [Reason]\n"
                    "- Feasibility: [High/Med/Low] - [Reason]\n"
                    "- Innovation: [High/Med/Low] - [Reason]\n\n"
                    "TEAM INSIGHTS:\n"
                    "[For each member provided, give one tip matching their skills to the project needs]\n\n"
                    "TOP 3 REFINEMENTS:\n"
                    "1. [Actionable step]\n"
                    "2. [Actionable step]\n"
                    "3. [Actionable step]"
                )

                user_content = (
                    f"Project Title: {proposal.get('title')}\n"
                    f"Domain: {proposal.get('domain')}\n"
                    f"Project Objective: {proposal.get('abstract')}\n"
                    f"Objectives: {', '.join(proposal.get('objectives', []))}\n"
                    f"Methodology: {proposal.get('methodology')}\n"
                    f"Use Case Diagram Uploaded: {'Yes' if proposal.get('use_case_diagram') else 'No'}\n"
                    f"Project Tech Stack: {', '.join(proposal.get('tech_stack', []))}\n\n"
                    f"The Team:\n" + "\n".join(member_details)
                )

                # 4. Call Claude API
                message = await anthropic_client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=1500,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_content}
                    ]
                )

                # 5. Extract and Save
                ai_text = message.content[0].text
                evaluation.ai_narrative = ai_text
                
                # Try to parse the score
                if "VERDICT: " in ai_text:
                    try:
                        score_part = ai_text.split("VERDICT:")[1].split("/")[0].strip()
                        # Extract first number found
                        import re
                        match = re.search(r"\d+(\.\d+)?", score_part)
                        if match:
                            evaluation.total_score = float(match.group())
                    except:
                        evaluation.total_score = 7.0

                evaluation.status = EvaluationStatus.COMPLETED
                
                # Only move to Phase 2 if score is decent (e.g. >= 5)
                # This acts as the automated gatekeeper
                if evaluation.total_score >= 5.0:
                    project.current_phase = ProjectPhase.PHASE_2
                
                await db.commit()
                print(f"SUCCESS: Personalized AI Mentorship {evaluation_id} completed.")

            except Exception as e:
                print(f"AI ERROR: {str(e)}")
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = f"Mentorship Error: {str(e)}"
                await db.commit()

    @staticmethod
    async def run_phase_2_analysis(
        evaluation_id: uuid.UUID
    ) -> None:
        """
        Mid-term architecture and progress analysis using Claude.
        """
        async with get_session_factory()() as db:
            query = select(Evaluation).where(Evaluation.id == evaluation_id)
            result = await db.execute(query)
            evaluation = result.scalar_one_or_none()

            if not evaluation:
                return

            query_project = select(ProjectSubmission).where(ProjectSubmission.id == evaluation.submission_id)
            result_project = await db.execute(query_project)
            project = result_project.scalar_one_or_none()

            if not project or not project.phase_2_data:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = "Error: Missing Phase 2 data."
                await db.commit()
                return

            evaluation.status = EvaluationStatus.IN_PROGRESS
            await db.commit()

            try:
                phase_2_payload = project.phase_2_data
                system_prompt = (
                    "You are a Senior Software Architecture Reviewer and Academic Project Evaluator. "
                    "Review this student's mid-term Phase 2 submission. "
                    "Focus on implementation progress, architecture quality, code organization, delivery risk, "
                    "and documentation maturity. "
                    "Return your response in this format: "
                    "1. Score (0-10) "
                    "2. Strengths "
                    "3. Risks / Gaps "
                    "4. Recommendations before final submission."
                )

                user_content = (
                    f"GitHub URL: {phase_2_payload.get('github_url')}\n"
                    f"Architecture Diagram URL: {phase_2_payload.get('architecture_diagram_url')}\n"
                    f"Progress Notes: {phase_2_payload.get('progress_notes')}\n"
                    f"Completed Milestones: {', '.join(phase_2_payload.get('completed_milestones', []))}\n"
                    f"Pending Risks: {', '.join(phase_2_payload.get('pending_risks', []))}\n"
                    f"Documentation URL: {phase_2_payload.get('documentation_url')}\n"
                )

                message = await anthropic_client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=1800,
                    temperature=0.5,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_content}
                    ]
                )

                ai_text = message.content[0].text
                evaluation.ai_narrative = ai_text
                evaluation.total_score = 7.5

                if "Score:" in ai_text:
                    try:
                        score_part = ai_text.split("Score:")[1].split("/")[0].strip()
                        evaluation.total_score = float(score_part)
                    except:
                        pass

                evaluation.status = EvaluationStatus.COMPLETED
                project.current_phase = ProjectPhase.FINAL
                await db.commit()
                print(f"SUCCESS: Phase 2 AI Evaluation {evaluation_id} completed via Claude.")

            except Exception as e:
                print(f"AI ERROR: {str(e)}")
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = f"Claude API Error: {str(e)}"
                await db.commit()

    @staticmethod
    async def run_final_analysis(
        evaluation_id: uuid.UUID
    ) -> None:
        """
        Final synthesis and comprehensive project evaluation using Claude.
        """
        async with get_session_factory()() as db:
            query = select(Evaluation).where(Evaluation.id == evaluation_id)
            result = await db.execute(query)
            evaluation = result.scalar_one_or_none()

            if not evaluation:
                return

            query_project = select(ProjectSubmission).where(ProjectSubmission.id == evaluation.submission_id)
            result_project = await db.execute(query_project)
            project = result_project.scalar_one_or_none()

            if not project or not project.final_data:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = "Error: Missing Final submission data."
                await db.commit()
                return

            evaluation.status = EvaluationStatus.IN_PROGRESS
            await db.commit()

            try:
                final_payload = project.final_data
                p1 = project.phase_1_data or {}
                p2 = project.phase_2_data or {}

                system_prompt = (
                    "You are the Head of Department and Chief Academic Evaluator. "
                    "Conduct a final, comprehensive audit of this student project. "
                    "Synthesize all phases: Proposal, Mid-term, and now the Final Result. "
                    "Evaluate against: Core Objectives fulfillment, Technical Complexity, Presentation Quality, "
                    "and Individual Contributions. "
                    "Return your response in this format: "
                    "1. Final Score (0-100) "
                    "2. Letter Grade (A+, A, B, etc.) "
                    "3. Executive Summary "
                    "4. Objective Fulfillment Audit "
                    "5. Individual Contribution Assessment."
                )

                user_content = (
                    f"Project Title: {p1.get('title')}\n"
                    f"Final Report URL: {final_payload.get('final_report_url')}\n"
                    f"Presentation URL: {final_payload.get('presentation_url')}\n"
                    f"Demo Video URL: {final_payload.get('demo_video_url')}\n"
                    f"Code Repository: {final_payload.get('code_repository_url')}\n"
                    f"Final Outcome Summary: {final_payload.get('final_summary')}\n"
                    f"Individual Contribution Audit: {final_payload.get('individual_contributions')}\n"
                )

                message = await anthropic_client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=2500,
                    temperature=0.3,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_content}
                    ]
                )

                ai_text = message.content[0].text
                evaluation.ai_narrative = ai_text
                
                # Logic to extract score and grade
                score = 80.0
                grade = "A"

                if "Final Score:" in ai_text:
                    try:
                        score_part = ai_text.split("Final Score:")[1].split("/")[0].split("\n")[0].strip()
                        score = float(score_part.replace("%", ""))
                    except: pass
                
                if "Letter Grade:" in ai_text:
                    try:
                        grade = ai_text.split("Letter Grade:")[1].split("\n")[0].strip()
                    except: pass

                evaluation.total_score = score
                evaluation.grade = grade
                evaluation.status = EvaluationStatus.COMPLETED
                
                # Mark project as fully complete
                project.current_phase = ProjectPhase.SUBMITTED # Or COMPLETED
                
                await db.commit()
                print(f"SUCCESS: Final AI Evaluation {evaluation_id} completed via Claude.")

            except Exception as e:
                print(f"AI ERROR: {str(e)}")
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = f"Claude API Error: {str(e)}"
                await db.commit()

    @staticmethod
    async def generate_member_orientation(member_id: uuid.UUID):
        """
        AI generates a personalized onboarding report for a new teammate.
        """
        async with get_session_factory()() as db:
            # 1. Fetch the member with their project and student details
            query = select(TeamMembership).where(TeamMembership.id == member_id).options(
                joinedload(TeamMembership.submission),
                joinedload(TeamMembership.student)
            )
            result = await db.execute(query)
            member = result.scalar_one_or_none()
            
            if not member or not member.submission:
                return

            project = member.submission
            proposal = project.phase_1_data or {}

            # 2. Construct the Mentorship Prompt
            system_prompt = (
                "You are an AI Technical Project Manager. A student has just joined a project team. "
                "Your task is to welcome them and provide a 'Role-Based Technical Orientation'. "
                "Be encouraging, professional, and highly specific to their role. "
                "Structure your response exactly as follows:\n\n"
                "WELCOME: [Personalized greeting]\n\n"
                "ROLE CONTEXT: [Explain how their role contributes to the project vision]\n\n"
                "TECHNICAL ROADMAP: [3-4 specific technical steps or tools they should explore based on their role and skills]\n\n"
                "FIRST TASK: [One immediate 'Quick Win' task they can do today]"
            )

            user_content = (
                f"Project Title: {proposal.get('title')}\n"
                f"Project Abstract: {proposal.get('abstract')}\n"
                f"Student Name: {member.student.name}\n"
                f"Assigned Role: {member.role}\n"
                f"Student Skills (Tech Stack): {member.tech_stack or 'General/TBD'}\n"
                f"Expected Contribution: {member.work_description or 'Project development'}"
            )

            try:
                # 3. Call Claude API
                message = await anthropic_client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=1000,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}]
                )

                # 4. Save the orientation to ai_feedback JSON column
                member.ai_feedback = {
                    "orientation": message.content[0].text
                }
                await db.commit()
                print(f"SUCCESS: AI Orientation generated for member {member.student.name}")

            except Exception as e:
                print(f"AI ORIENTATION ERROR: {str(e)}")
