import asyncio
import sys
from pathlib import Path

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings
from app.db.Models import (
    Evaluation,
    EvaluationPhase,
    EvaluationStatus,
    Faculty,
    GuideStatus,
    ProgrammeType,
    ProjectPhase,
    ProjectSubmission,
    StudentAuth,
)
from app.services.evaluation_service import EvaluationService
from app.services.project_service import ProjectService
from app.api.schemas.projects import Phase1DataSchema, ProjectSubmissionCreateSchema


DEFAULT_REPO_URL = "https://github.com/octocat/Hello-World"

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_or_create_faculty(db: AsyncSession) -> Faculty:
    result = await db.execute(select(Faculty).where(Faculty.email == "phase2_github_guide@university.edu"))
    faculty = result.scalar_one_or_none()
    if faculty:
        return faculty

    faculty = Faculty(
        name="Dr. GitHub Repo Guide",
        email="phase2_github_guide@university.edu",
        password_hash="fake_hash",
        department="Computer Science",
    )
    db.add(faculty)
    await db.commit()
    await db.refresh(faculty)
    return faculty


async def get_or_create_student(db: AsyncSession) -> StudentAuth:
    result = await db.execute(select(StudentAuth).where(StudentAuth.email == "phase2_github_student@university.edu"))
    student = result.scalar_one_or_none()
    if student:
        return student

    student = StudentAuth(
        name="Phase Two GitHub Student",
        email="phase2_github_student@university.edu",
        enrollment_no="PHASE2-GH-001",
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


async def get_or_create_project(
    db: AsyncSession,
    student: StudentAuth,
    faculty: Faculty,
) -> ProjectSubmission:
    result = await db.execute(
        select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == student.id,
                ProjectSubmission.academic_year == "2025-26",
                ProjectSubmission.semester == 6,
                ProjectSubmission.is_deleted == False,
            )
        )
    )
    project = result.scalar_one_or_none()
    if project:
        return project

    payload = ProjectSubmissionCreateSchema(
        guide_id=faculty.id,
        academic_year="2025-26",
        semester=6,
        phase_1_data=Phase1DataSchema(
            title="GitHub Evaluation Pipeline Smoke Test",
            abstract=(
                "This proposal exists only to validate that the evaluation system can "
                "fetch a repository tarball from GitHub and include that code context "
                "inside the Phase 2 mentor review."
            ),
            domain="Developer Tooling",
            objectives=[
                "Fetch repository tarball",
                "Filter source files in memory",
                "Pass code snapshot into AI evaluation",
            ],
            methodology=(
                "We create a minimal project record, seed Phase 1 as complete, then "
                "store a GitHub repository URL in Phase 2 data and trigger only the "
                "Mentor-based progress evaluation flow."
            ),
            use_case_diagram="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            tech_stack=["Python", "FastAPI", "Requests", "PostgreSQL"],
        ),
    )
    return await ProjectService.create_submission(db=db, leader_id=student.id, data=payload)


async def ensure_phase_1_complete(db: AsyncSession, project: ProjectSubmission, faculty: Faculty) -> None:
    result = await db.execute(
        select(Evaluation)
        .where(
            and_(
                Evaluation.submission_id == project.id,
                Evaluation.phase == EvaluationPhase.PHASE_1,
            )
        )
        .order_by(Evaluation.created_at.desc())
    )
    evaluation = result.scalars().first()

    project.current_phase = ProjectPhase.PHASE_2
    project.guide_status = GuideStatus.ACCEPTED

    if evaluation:
        evaluation.status = EvaluationStatus.COMPLETED
        evaluation.total_score = 80
        evaluation.ai_narrative = "Seeded Phase 1 completion for GitHub smoke test."
    else:
        db.add(
            Evaluation(
                submission_id=project.id,
                faculty_id=faculty.id,
                phase=EvaluationPhase.PHASE_1,
                status=EvaluationStatus.COMPLETED,
                total_score=80,
                ai_narrative="Seeded Phase 1 completion for GitHub smoke test.",
            )
        )

    await db.commit()


async def wait_for_phase_2_result(submission_id, max_attempts: int = 30) -> None:
    for attempt in range(1, max_attempts + 1):
        await asyncio.sleep(5)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Evaluation)
                .where(
                    and_(
                        Evaluation.submission_id == submission_id,
                        Evaluation.phase == EvaluationPhase.PHASE_2,
                    )
                )
                .order_by(Evaluation.created_at.desc())
            )
            evaluation = result.scalars().first()
            if not evaluation:
                print(f"Attempt {attempt}: no Phase 2 evaluation yet.")
                continue

            print(f"Attempt {attempt}: status = {evaluation.status}")
            if evaluation.status == EvaluationStatus.COMPLETED:
                print("\n--- [PHASE 2 GITHUB EVALUATION COMPLETED] ---")
                print(f"Score: {evaluation.total_score}")
                if evaluation.ai_narrative:
                    print(f"Narrative Preview:\n{evaluation.ai_narrative[:1200]}")
                if evaluation.agent_logs:
                    print("\nAgent Log Keys:", list(evaluation.agent_logs[0].keys()))
                return

            if evaluation.status == EvaluationStatus.FAILED:
                print("\n--- [PHASE 2 GITHUB EVALUATION FAILED] ---")
                print(evaluation.ai_narrative)
                return

    print("\n--- [TIMEOUT] Phase 2 GitHub evaluation did not finish in time. ---")


async def run_phase_2_github_only_test(repo_url: str) -> None:
    async with AsyncSessionLocal() as db:
        print("--- [PHASE 2 GITHUB-ONLY TEST START] ---")
        print(f"Repository URL: {repo_url}")

        faculty = await get_or_create_faculty(db)
        student = await get_or_create_student(db)
        project = await get_or_create_project(db, student, faculty)
        await ensure_phase_1_complete(db, project, faculty)

        project.phase_2_data = {
            "github_url": repo_url,
            "presentation_url": "https://example.com/github-only-phase2.pdf",
            "progress_notes": (
                "This is a GitHub-only smoke test for Phase 2. The evaluator should "
                "fetch repository code, build the in-memory source snapshot, and use "
                "that context in the mentor review."
            ),
            "completed_milestones": ["GitHub repo submitted for automated analysis"],
            "pending_risks": [],
        }
        project.current_phase = ProjectPhase.PHASE_2
        project.guide_status = GuideStatus.ACCEPTED
        await db.commit()

        phase_2_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            faculty_id=faculty.id,
            phase=EvaluationPhase.PHASE_2,
        )

        print(f"Submission ID: {project.id}")
        print(f"Team ID: {project.team_id}")
        print(f"Evaluation ID: {phase_2_eval.id}")

        asyncio.create_task(EvaluationService.run_phase_2_analysis(phase_2_eval.id))

    await wait_for_phase_2_result(project.id)
    await engine.dispose()


if __name__ == "__main__":
    repo_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_REPO_URL
    asyncio.run(run_phase_2_github_only_test(repo_url))
