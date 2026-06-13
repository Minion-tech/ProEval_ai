import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.db.Models import Base, AdminUser, StudentAuth, ProjectSubmission, Evaluation, ProjectPhase, EvaluationStatus, EvaluationPhase, ProgrammeType
from app.services.project_service import ProjectService
from app.api.schemas.projects import ProjectSubmissionCreateSchema, Phase1DataSchema

# Setup DB Engine
engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def run_full_phase1_test():
    async with AsyncSessionLocal() as db:
        print("--- [FULL PHASE 1 INTEGRATION TEST START] ---")

        # 1. Setup Student
        query_student = select(StudentAuth).limit(1)
        result_st = await db.execute(query_student)
        student = result_st.scalar_one_or_none()
        if not student:
            student = StudentAuth(
                name="Test Student", 
                email="test@uni.edu", 
                enrollment_no="T-001", 
                password_hash="fake", 
                programme=ProgrammeType.BTECH, 
                department="CS", 
                batch="2024", 
                is_verified=True
            )
            db.add(student)
            await db.commit()
            await db.refresh(student)

        # 2. Check for existing project or create new
        query_existing = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == student.id,
                ProjectSubmission.is_deleted == False
            )
        )
        result_proj = await db.execute(query_existing)
        project = result_proj.scalar_one_or_none()

        if not project:
            proposal_data = ProjectSubmissionCreateSchema(
                academic_year="2025-26", semester=6,
                phase_1_data=Phase1DataSchema(
                    title="Smart Energy Grid using AI",
                    abstract="This project aims to optimize energy distribution in urban areas using reinforcement learning to reduce wastage during peak hours by 15%.",
                    domain="AI / Green Tech",
                    objectives=["Predict demand", "Optimize distribution"],
                    tech_stack=["Python", "TensorFlow", "FastAPI"],
                    use_case_diagram="data:image/png;base64,fake-image-data"
                )
            )
            project = await ProjectService.create_submission(db, student.id, proposal_data)
        
        print(f"Project ID: {project.id} | Team ID: {project.team_id}")

        # 3. WAIT for AI to finish (Polling)
        # Evaluation is triggered automatically upon creation
        print("\n--- [WAITING: Polling for AI Evaluation Result...] ---")
        for i in range(24): # Wait up to 120 seconds (5s * 24)
            await asyncio.sleep(5)
            # Fresh query each time
            async with AsyncSessionLocal() as check_db:
                query_eval = select(Evaluation).where(
                    and_(Evaluation.submission_id == project.id, Evaluation.phase == EvaluationPhase.PHASE_1)
                ).order_by(Evaluation.created_at.desc())
                result_eval = await check_db.execute(query_eval)
                evaluation = result_eval.scalars().first()

                if evaluation:
                    print(f"  Attempt {i+1}: Status = {evaluation.status}")
                    if evaluation.status == EvaluationStatus.COMPLETED:
                        print("\n--- [FINAL RESULT: AI EVALUATION SUCCESS] ---")
                        print(f"Score: {evaluation.total_score}/10")
                        print(f"Feedback: {evaluation.ai_narrative[:500]}...")
                        return
                    elif evaluation.status == EvaluationStatus.FAILED:
                        print(f"\n--- [FINAL RESULT: AI EVALUATION FAILED] ---")
                        print(f"Error: {evaluation.ai_narrative}")
                        return
                    elif evaluation.status == EvaluationStatus.AWAITING_CLARIFICATION:
                        print(f"  Attempt {i+1}: Status = AWAITING_CLARIFICATION. Stopping poll.")
                        return
                else:
                    print(f"  Attempt {i+1}: No evaluation record yet...")

        print("\n--- [TIMEOUT: AI Evaluation took too long] ---")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_full_phase1_test())
