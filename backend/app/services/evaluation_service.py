import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic

from app.db.Models import (
    Evaluation,
    ProjectSubmission,
    EvaluationPhase,
    EvaluationStatus,
    GuideStatus,
    ProjectPhase,
)
from app.db.session import AsyncSessionLocal
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
        Real AI Analysis using Anthropic Claude.
        """
        async with AsyncSessionLocal() as db:
            # 1. Fetch the records
            query = select(Evaluation).where(Evaluation.id == evaluation_id)
            result = await db.execute(query)
            evaluation = result.scalar_one_or_none()
            
            if not evaluation:
                return

            query_project = select(ProjectSubmission).where(ProjectSubmission.id == evaluation.submission_id)
            result_project = await db.execute(query_project)
            project = result_project.scalar_one_or_none()

            if not project or not project.phase_1_data:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = "Error: Missing phase data."
                await db.commit()
                return

            # 2. Mark as In Progress
            evaluation.status = EvaluationStatus.IN_PROGRESS
            await db.commit()

            try:
                # 3. Construct the AI Prompt
                # We feed the student's proposal into the prompt
                proposal = project.phase_1_data
                system_prompt = (
                    "You are a Senior Academic Evaluator at a top Technical University. "
                    "Your task is to analyze a student's 'Phase 1: Project Proposal'. "
                    "You must provide rigorous, professional, and actionable feedback. "
                    "Focus on: Technical Feasibility, Scope Clarity, and Innovation. "
                    "Return your response in a clear format: "
                    "1. Score (0-10) "
                    "2. Detailed Feedback (Narrative) "
                    "3. Suggestions for Phase 2."
                )

                user_content = (
                    f"Project Title: {proposal.get('title')}\n"
                    f"Abstract: {proposal.get('abstract')}\n"
                    f"Domain: {proposal.get('domain')}\n"
                    f"Objectives: {', '.join(proposal.get('objectives', []))}\n"
                    f"Tech Stack: {', '.join(proposal.get('tech_stack', []))}\n"
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

                # 5. Extract the content
                ai_text = message.content[0].text
                
                # Simple extraction of score (In a real app, we'd use structured output/pydantic)
                # For now, we save the full text and a generic score
                evaluation.ai_narrative = ai_text
                evaluation.total_score = 7.0 # Default if we can't parse easily
                
                # Try to parse a score if the AI provided one (e.g., 'Score: 8.5/10')
                if "Score:" in ai_text:
                    try:
                        score_part = ai_text.split("Score:")[1].split("/")[0].strip()
                        evaluation.total_score = float(score_part)
                    except:
                        pass

                evaluation.status = EvaluationStatus.COMPLETED
                project.current_phase = ProjectPhase.PHASE_2
                await db.commit()
                print(f"SUCCESS: AI Evaluation {evaluation_id} completed via Claude.")

            except Exception as e:
                print(f"AI ERROR: {str(e)}")
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = f"Claude API Error: {str(e)}"
                await db.commit()

    @staticmethod
    async def run_phase_2_analysis(
        evaluation_id: uuid.UUID
    ) -> None:
        """
        Mid-term architecture and progress analysis using Claude.
        """
        async with AsyncSessionLocal() as db:
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
