import asyncio
from pathlib import Path
import sys

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.api.schemas.projects import (
    Phase1DataSchema,
    Phase2DataSchema,
    Phase2SubmissionSchema,
    ProjectSubmissionCreateSchema,
)
from app.core.config import settings
from app.db.Models import (
    Evaluation,
    EvaluationPhase,
    EvaluationStatus,
    AdminUser,
    AdminRole,
    ProgrammeType,
    ProjectSubmission,
    ProjectPhase,
    StudentAuth,
)
from app.services.project_service import ProjectService

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_or_create_admin(db: AsyncSession) -> AdminUser:
    query = select(AdminUser).where(AdminUser.email == "admin@university.edu")
    result = await db.execute(query)
    admin = result.scalar_one_or_none()

    if admin:
        return admin

    admin = AdminUser(
        name="System Admin",
        email="admin@university.edu",
        password_hash="fake_hash",
        department="IT Services",
        role=AdminRole.ADMIN
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


async def get_or_create_student(db: AsyncSession) -> StudentAuth:
    query = select(StudentAuth).where(StudentAuth.email == "phase2_student@university.edu")
    result = await db.execute(query)
    student = result.scalar_one_or_none()

    if student:
        return student

    student = StudentAuth(
        name="Phase Two Student",
        email="phase2_student@university.edu",
        enrollment_no="PHASE2-TEST-001",
        password_hash="fake_hash",
        programme=ProgrammeType.BTECH,
        department="Computer Science",
        batch="2024-2028",
        is_verified=True,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def get_or_create_phase1_project(
    db: AsyncSession,
    student: StudentAuth,
) -> ProjectSubmission:
    query = select(ProjectSubmission).where(
        and_(
            ProjectSubmission.leader_id == student.id,
            ProjectSubmission.academic_year == "2025-26",
            ProjectSubmission.semester == 6,
            ProjectSubmission.is_deleted == False
        )
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if project:
        return project

    payload = ProjectSubmissionCreateSchema(
        academic_year="2025-26",
        semester=6,
        phase_1_data=Phase1DataSchema(
            title="AI-Based Smart Lab Resource Allocation",
            abstract=(
                "This project aims to optimize the allocation of computer lab systems, "
                "time slots, and faculty-supervised sessions using predictive analytics "
                "and demand forecasting for university operations."
            ),
            domain="Artificial Intelligence",
            objectives=[
                "Predict lab demand",
                "Optimize slot allocation",
                "Reduce idle systems",
            ],
            tech_stack=["Python", "FastAPI", "PostgreSQL"],
            use_case_diagram="data:image/png;base64,fake-image-data"
        ),
    )

    return await ProjectService.create_submission(
        db=db,
        leader_id=student.id,
        data=payload,
    )


async def ensure_phase_1_completed(
    db: AsyncSession,
    project: ProjectSubmission,
) -> None:
    query = select(Evaluation).where(
        and_(
            Evaluation.submission_id == project.id,
            Evaluation.phase == EvaluationPhase.PHASE_1,
        )
    ).order_by(Evaluation.created_at.desc())

    result = await db.execute(query)
    phase_1_eval = result.scalars().first()

    if phase_1_eval and phase_1_eval.status == EvaluationStatus.COMPLETED:
        print("INFO: Phase 1 evaluation already completed.")
        return

    print("INFO: Seeding a completed Phase 1 evaluation so Phase 2 can be tested.")
    project.current_phase = ProjectPhase.PHASE_2

    if not phase_1_eval:
        phase_1_eval = Evaluation(
            submission_id=project.id,
            phase=EvaluationPhase.PHASE_1,
            status=EvaluationStatus.COMPLETED,
            total_score=8.0,
            ai_narrative="Manual test seed for completed Phase 1.",
        )
        db.add(phase_1_eval)
    else:
        phase_1_eval.status = EvaluationStatus.COMPLETED
        phase_1_eval.total_score = 8.0
        phase_1_eval.ai_narrative = "Manual test seed for completed Phase 1."

    await db.commit()
    await db.refresh(project)


async def wait_for_phase_2_result(
    db_factory: async_sessionmaker[AsyncSession],
    submission_id,
    max_attempts: int = 24,
) -> None:
    for attempt in range(1, max_attempts + 1):
        await asyncio.sleep(5)

        async with db_factory() as db:
            query = select(Evaluation).where(
                and_(
                    Evaluation.submission_id == submission_id,
                    Evaluation.phase == EvaluationPhase.PHASE_2,
                )
            ).order_by(Evaluation.created_at.desc())

            result = await db.execute(query)
            evaluation = result.scalars().first()

            if not evaluation:
                print(f"Attempt {attempt}: no Phase 2 evaluation record yet.")
                continue

            print(f"Attempt {attempt}: status = {evaluation.status}")

            if evaluation.status == EvaluationStatus.COMPLETED:
                print("\n--- [PHASE 2 EVALUATION COMPLETED] ---")
                print(f"Score: {evaluation.total_score}")
                if evaluation.ai_narrative:
                    print(f"Feedback:\n{evaluation.ai_narrative[:800]}")
                return

            if evaluation.status == EvaluationStatus.FAILED:
                print("\n--- [PHASE 2 EVALUATION FAILED] ---")
                print(evaluation.ai_narrative)
                return

    print("\n--- [TIMEOUT] Phase 2 evaluation did not finish in time. ---")


async def run_phase_2_manual_test() -> None:
    async with AsyncSessionLocal() as db:
        print("--- [PHASE 2 MANUAL TEST START] ---")

        admin = await get_or_create_admin(db)
        student = await get_or_create_student(db)
        project = await get_or_create_phase1_project(db, student)

        print(f"Student ID: {student.id}")
        print(f"Submission ID: {project.id}")
        print(f"Team ID: {project.team_id}")

        await ensure_phase_1_completed(db, project)

        print("\n--- [STEP 1: Submit Phase 2 Data] ---")
        phase_2_payload = Phase2SubmissionSchema(
            phase_2_data=Phase2DataSchema(
                github_url="https://github.com/example/proeval-phase2",
                presentation_url="https://example.com/proeval-phase2-midterm.pdf",
                progress_notes=(
                    "We completed the authentication module, protected route access, "
                    "project submission APIs, and the initial "
                    "evaluation pipeline. We also integrated JWT-based identity "
                    "resolution and role-aware authorization for students and admins."
                ),
                completed_milestones=[
                    "Student registration and login",
                    "Protected project submission route",
                    "Autonomous Phase 1 evaluation",
                    "JWT-based current-user dependency",
                ],
                pending_risks=[
                    "Redis is still mocked for OTP storage",
                    "Background evaluation jobs should move to Celery",
                ],
            )
        )

        updated_project = await ProjectService.submit_phase_2(
            db=db,
            submission_id=project.id,
            leader_id=student.id,
            data=phase_2_payload,
        )
        print(f"SUCCESS: Phase 2 submitted. Current phase = {updated_project.current_phase}")

        print("\n--- [STEP 2: Wait for AI Evaluation] ---")
        await wait_for_phase_2_result(AsyncSessionLocal, project.id)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_phase_2_manual_test())
