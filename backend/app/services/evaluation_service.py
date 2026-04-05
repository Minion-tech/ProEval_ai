import uuid
import asyncio
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.Models import Evaluation, ProjectSubmission, EvaluationPhase, EvaluationStatus, GuideStatus
from app.db.session import AsyncSessionLocal # We need this to create a new session for background tasks

class EvaluationService:
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
    async def run_phase_1_analysis(
        evaluation_id: uuid.UUID
    ):
        """
        Background Task: Analyzes the project using AI.
        Note: This takes a UUID instead of a DB session because 
        background tasks need to manage their own database connection.
        """
        # 1. Create a fresh database session for this background worker
        async with AsyncSessionLocal() as db:
            # 2. Fetch the Evaluation record
            query = select(Evaluation).where(Evaluation.id == evaluation_id)
            result = await db.execute(query)
            evaluation = result.scalar_one_or_none()
            
            if not evaluation:
                return

            # 3. Fetch Project Data
            query_project = select(ProjectSubmission).where(ProjectSubmission.id == evaluation.submission_id)
            result_project = await db.execute(query_project)
            project = result_project.scalar_one_or_none()

            if not project or not project.phase_1_data:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = "Error: Missing phase data."
                await db.commit()
                return

            # 4. Mark as In Progress
            evaluation.status = EvaluationStatus.IN_PROGRESS
            await db.commit()

            try:
                # 5. SIMULATE AI WORK (Wait 5 seconds)
                await asyncio.sleep(5) 
                
                title = project.phase_1_data.get('title', 'Untitled')
                mock_feedback = (
                    f"AI Analysis for '{title}':\n"
                    "- Scope: Highly feasible.\n"
                    "- Tech Stack: Modern and scalable.\n"
                    "- Suggestion: Add a detailed risk management plan."
                )

                # 6. Finalize
                evaluation.ai_narrative = mock_feedback
                evaluation.total_score = 9.0
                evaluation.status = EvaluationStatus.COMPLETED
                await db.commit()
                print(f"SUCCESS: AI Evaluation {evaluation_id} finished.")

            except Exception as e:
                evaluation.status = EvaluationStatus.FAILED
                evaluation.ai_narrative = f"AI Error: {str(e)}"
                await db.commit()
