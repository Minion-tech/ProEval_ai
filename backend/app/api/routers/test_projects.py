from fastapi import APIRouter, Depends, HTTPException, params, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, Any

from app.db.session import get_db
from app.api.schemas.projects import (
    ClarificationAnswersSchema,
    EvaluationResponseSchema,
    ProjectSubmissionCreateSchema,
    ProjectSubmissionResponseSchema,
    TeamJoinSchema,
    TeamMembershipResponseSchema,
    MyProjectResponseSchema,
    Phase2SubmissionSchema,
    FinalSubmissionSchema,
)
from app.api.schemas.interview import (
    InterviewContextResponse,
    InterviewResultPayload,
    InterviewResultResponse
)
from app.services.interview_service import InterviewService
from app.services.evaluation_service import EvaluationService
from app.services.project_service import ProjectService
from app.db.Models import (
    EvaluationPhase,
    ProgrammeType,
    StudentAuth,
)
from app.core.config import settings

router = APIRouter(prefix="/test-projects", tags=["Test Projects"])

# MOCK STUDENT ID for testing
async def get_test_student(db: AsyncSession) -> StudentAuth:
    # 1. Try to find the designated test user
    query = select(StudentAuth).where(StudentAuth.email == settings.TEST_USER_EMAIL)
    result = await db.execute(query)
    student = result.scalar_one_or_none()
    
    if student:
        return student

    # 2. Fallback to the first available student
    query = select(StudentAuth).limit(1)
    result = await db.execute(query)
    student = result.scalar_one_or_none()
        
    if student:
        # If we found a student but the email doesn't match, 
        # we can't easily sync it here without potentially breaking transactions.
        # But for Dev Mode bypass to work, we'll just return them.
        # The bypass in ProjectService might fail if we don't sync, 
        # so let's try a safe flush instead of commit.
        if settings.ENABLE_TEST_MODE and student.email != settings.TEST_USER_EMAIL:
            student.email = settings.TEST_USER_EMAIL
            await db.flush() 
        return student
        
    raise HTTPException(status_code=404, detail="No test student found in DB.")


async def create_mock_teammate(db: AsyncSession) -> StudentAuth:
    """Creates a synthetic teammate for the temporary Streamlit tester."""
    import uuid

    suffix = uuid.uuid4().hex[:8]
    teammate = StudentAuth(
        name=f"Mock Teammate {suffix[:4]}",
        email=f"mock-teammate-{suffix}@test.local",
        enrollment_no=f"MOCK-{suffix.upper()}",
        password_hash="test-mode",
        programme=ProgrammeType.BTECH,
        department="Computer Science",
        batch="2024-2028",
        is_verified=True,
    )
    db.add(teammate)
    await db.commit()
    await db.refresh(teammate)
    return teammate

@router.post("/", response_model=ProjectSubmissionResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_new_project_test(
    data: ProjectSubmissionCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for testing UI Phase 1"""
    student = await get_test_student(db)
    return await ProjectService.create_submission(db=db, leader_id=student.id, data=data)

@router.get("/my-project", response_model=Optional[MyProjectResponseSchema])
async def get_my_active_project_test(db: AsyncSession = Depends(get_db)) -> Any:
    """Unprotected version for testing UI Phase 1"""
    student = await get_test_student(db)
    return await ProjectService.get_my_project(db, student.id)

@router.get("/my-proposals", response_model=Any)
async def get_my_proposals_test(db: AsyncSession = Depends(get_db)) -> Any:
    """Unprotected version for testing multi-proposal list"""
    student = await get_test_student(db)
    return await ProjectService.get_my_proposals(db, student.id)

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_test(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for deleting a project"""
    project = await ProjectService.get_submission_by_id(db, submission_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    project.is_deleted = True
    await db.commit()
    return None

@router.get("/{submission_id}/evaluations/{phase}", response_model=EvaluationResponseSchema)
async def get_project_evaluation_test(
    submission_id: UUID,
    phase: EvaluationPhase,
    db: AsyncSession = Depends(get_db),
) -> EvaluationResponseSchema:
    """Unprotected version for testing UI Phase 1"""
    evaluation = await EvaluationService.get_submission_evaluation(db=db, submission_id=submission_id, phase=phase)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    return evaluation

@router.post("/join", response_model=TeamMembershipResponseSchema, status_code=status.HTTP_201_CREATED)
async def join_existing_team_test(
    data: TeamJoinSchema,
    db: AsyncSession = Depends(get_db),
) -> TeamMembershipResponseSchema:
    """Unprotected version for testing UI Phase 1"""
    try:
        student = await create_mock_teammate(db)
        return await ProjectService.join_team(
        db=db,
        student_id=student.id,
        params=data,
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error while joining team: {str(e)}")


@router.post("/{submission_id}/phase-1/clarifications", response_model=ProjectSubmissionResponseSchema)
async def submit_phase_1_clarifications_test(
    submission_id: UUID,
    data: ClarificationAnswersSchema,
    db: AsyncSession = Depends(get_db),
) -> ProjectSubmissionResponseSchema:
    """Unprotected version for testing UI Phase 1 clarification answers."""
    student = await get_test_student(db)
    return await ProjectService.submit_phase_1_clarifications(
        db=db,
        submission_id=submission_id,
        leader_id=student.id,
        answers=data.answers,
    )

@router.patch("/{submission_id}/phase-1", response_model=ProjectSubmissionResponseSchema)
async def resubmit_phase_1_test(
    submission_id: UUID,
    data: ProjectSubmissionCreateSchema,
    db: AsyncSession = Depends(get_db),
) -> ProjectSubmissionResponseSchema:
    """Unprotected version for testing UI Phase 1"""
    student = await get_test_student(db)
    return await ProjectService.update_phase_1_submission(db=db, submission_id=submission_id, leader_id=student.id, data=data)

@router.post("/phase-2/{submission_id}", response_model=ProjectSubmissionResponseSchema)
async def submit_phase_2_test(
    submission_id: UUID,
    data: Phase2SubmissionSchema,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for testing UI Phase 2"""
    student = await get_test_student(db)
    return await ProjectService.submit_phase_2(db=db, submission_id=submission_id, leader_id=student.id, data=data)

@router.post("/final/{submission_id}", response_model=ProjectSubmissionResponseSchema)
async def submit_final_test(
    submission_id: UUID,
    data: FinalSubmissionSchema,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for testing UI Phase 3"""
    student = await get_test_student(db)
    return await ProjectService.submit_final(db=db, submission_id=submission_id, leader_id=student.id, data=data)


@router.get("/{submission_id}/interview/context", response_model=InterviewContextResponse)
async def get_interview_context_test(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for testing AI interview questions."""
    student = await get_test_student(db)
    return await InterviewService.get_interview_context(db, submission_id, student)


@router.post("/{submission_id}/interview/results", response_model=InterviewResultResponse)
async def submit_interview_results_test(
    submission_id: UUID,
    payload: InterviewResultPayload,
    db: AsyncSession = Depends(get_db),
):
    """Unprotected version for submitting AI interview results."""
    student = await get_test_student(db)
    return await InterviewService.process_interview_results(db, submission_id, payload.model_dump())
