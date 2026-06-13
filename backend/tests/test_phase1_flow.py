import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.db.Models import Base, AdminUser, StudentAuth, ProjectSubmission, Evaluation, ProjectPhase, EvaluationStatus, EvaluationPhase, ProgrammeType
from app.services.project_service import ProjectService
from app.api.schemas.projects import ProjectSubmissionCreateSchema, Phase1DataSchema

# 1. Setup DB Engine (Using the main DB URL)
engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def run_phase1_test():
    async with AsyncSessionLocal() as db:
        print("--- [PHASE 1 INTEGRATION TEST START] ---")

        # STEP 1: Ensure we have an Admin Member
        query_admin = select(AdminUser).where(AdminUser.email == "admin@university.edu")
        result = await db.execute(query_admin)
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("Creating dummy Admin member...")
            admin = AdminUser(
                name="System Admin",
                email="admin@university.edu",
                password_hash="fake_hash",
                department="IT Services"
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
        
        print(f"Using Admin: {admin.name} (ID: {admin.id})")

        # STEP 2: Ensure we have a Student Leader
        query_student = select(StudentAuth).limit(1)
        result_st = await db.execute(query_student)
        student = result_st.scalar_one_or_none()

        if not student:
            print("Creating a test student...")
            student = StudentAuth(
                name="Integration Test Student",
                email="it_student@university.edu",
                enrollment_no="TEST-IT-001",
                password_hash="fake_hash",
                programme=ProgrammeType.BTECH,
                department="Computer Science",
                batch="2024-2028",
                is_verified=True
            )
            db.add(student)
            await db.commit()
            await db.refresh(student)

        print(f"Using Student: {student.name} (ID: {student.id})")

        # STEP 3: Student Submits Phase 1 Proposal
        print("\n--- [ACTION: Student Submitting Proposal] ---")
        
        # We need to manually handle existing submissions for this student to avoid 400
        # If one exists, we'll just use it instead of creating a new one
        query_existing = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == student.id,
                ProjectSubmission.academic_year == "2025-26",
                ProjectSubmission.semester == 6,
                ProjectSubmission.is_deleted == False
            )
        )
        existing_result = await db.execute(query_existing)
        project = existing_result.scalar_one_or_none()

        if not project:
            proposal_data = ProjectSubmissionCreateSchema(
                academic_year="2025-26",
                semester=6,
                phase_1_data=Phase1DataSchema(
                    title="AI-Powered Smart Campus Traffic Management",
                    abstract="A project that uses computer vision to optimize parking and traffic flow within the university campus using existing CCTV infrastructure. It involves real-time detection and occupancy mapping.",
                    domain="Artificial Intelligence",
                    objectives=["Reduce wait times by 20%", "Automate parking billing", "Real-time occupancy detection"],
                    tech_stack=["Python", "PyTorch", "FastAPI", "PostgreSQL"],
                    use_case_diagram="data:image/png;base64,fake-image-data"
                )
            )
            project = await ProjectService.create_submission(db, student.id, proposal_data)
            print(f"SUCCESS: Project created with Team ID: {project.team_id}")
        else:
            print(f"INFO: Using existing project for this student (Team ID: {project.team_id})")

        # STEP 4: Wait and Check for AI Evaluation (Auto-triggered upon submission)
        print("\n--- [WAITING: AI Agents are analyzing...] ---")
        print("Sleeping for 30 seconds to allow autonomous agents to finish...")
        await asyncio.sleep(30)

        # Re-fetch evaluation results using a fresh session to ensure we get DB changes
        query_eval = select(Evaluation).where(
            and_(
                Evaluation.submission_id == project.id,
                Evaluation.phase == EvaluationPhase.PHASE_1
            )
        ).order_by(Evaluation.created_at.desc())
        
        result_eval = await db.execute(query_eval)
        evaluation = result_eval.scalars().first()

        if evaluation:
            print(f"Current Evaluation Status: {evaluation.status}")
            if evaluation.status == EvaluationStatus.COMPLETED:
                print("\n--- [FINAL RESULT: AI EVALUATION SUCCESS] ---")
                print(f"AI Narrative Feedback:\n{evaluation.ai_narrative[:500]}...") 
            elif evaluation.status == EvaluationStatus.FAILED:
                print(f"\nFAILURE: AI Evaluation failed: {evaluation.ai_narrative}")
            elif evaluation.status == EvaluationStatus.AWAITING_CLARIFICATION:
                print(f"\nSTATUS: Awaiting clarification answers from student.")
            else:
                print(f"\nSTILL IN PROGRESS: Check again in a few seconds.")
        else:
            print("\nFAILURE: No evaluation record found in DB.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_phase1_test())
