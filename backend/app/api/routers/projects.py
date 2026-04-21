from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, Any

from app.api.deps import get_current_faculty, get_current_student, get_current_user
from app.db.session import get_db
from app.api.schemas.projects import (
    EvaluationResponseSchema,
    Phase2SubmissionSchema,
    ProjectSubmissionCreateSchema,
    ProjectSubmissionResponseSchema,
    TeamJoinSchema,
    TeamMembershipResponseSchema,
    MyProjectResponseSchema,
    MyProposalsResponseSchema,
    FinalSubmissionSchema,
)
from app.services.evaluation_service import EvaluationService
from app.services.project_service import ProjectService
from app.db.Models import (
    EvaluationPhase,
    Faculty,
    FacultyRole,
    GuideStatus,
    StudentAuth,
    TeamMembership,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


async def _ensure_submission_view_access(
    db: AsyncSession,
    submission_id: UUID,
    current_user: StudentAuth | Faculty,
) -> None:
    """
    Enforce project visibility rules before returning evaluation details.

    Students can view only if they lead or belong to the team.
    Faculty can view only if they are the assigned guide or an admin.
    """
    submission = await ProjectService.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project submission not found.",
        )

    if isinstance(current_user, StudentAuth):
        if submission.leader_id == current_user.id:
            return

        membership_query = select(TeamMembership).where(
            TeamMembership.submission_id == submission_id,
            TeamMembership.student_id == current_user.id,
        )
        membership_result = await db.execute(membership_query)
        if membership_result.scalar_one_or_none():
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project.",
        )

    if current_user.role == FacultyRole.ADMIN or submission.guide_id == current_user.id:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this project.",
    )

@router.post(
    "/",
    response_model=ProjectSubmissionResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_new_project(
    data: ProjectSubmissionCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
):
    """Endpoint for the student leader to submit a phase 1 proposal"""
    try:
        new_project = await ProjectService.create_submission(
            db=db,
            leader_id=current_student.id,
            data=data,
        )
        return new_project
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the project.",
        )


@router.patch(
    "/{submission_id}/phase-1",
    response_model=ProjectSubmissionResponseSchema,
)
async def resubmit_phase_1(
    submission_id: UUID,
    data: ProjectSubmissionCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> ProjectSubmissionResponseSchema:
    """Edit and resubmit the same Phase 1 project."""
    return await ProjectService.update_phase_1_submission(
        db=db,
        submission_id=submission_id,
        leader_id=current_student.id,
        data=data,
    )


@router.post(
    "/{submission_id}/phase-1/send-to-guide",
    response_model=ProjectSubmissionResponseSchema,
)
async def send_phase_1_to_guide(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> ProjectSubmissionResponseSchema:
    """Mark the project as sent to guide after student reviews AI feedback."""
    return await ProjectService.send_phase_1_to_guide(
        db=db,
        submission_id=submission_id,
        leader_id=current_student.id,
    )

@router.get("/my-project", response_model=Optional[MyProjectResponseSchema])
async def get_my_active_project(
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> Any:
    """Returns the student's current active project membership details."""
    return await ProjectService.get_my_project(db, current_student.id)


@router.get("/my-proposals", response_model=MyProposalsResponseSchema)
async def get_my_proposals(
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> Any:
    """
    Returns all Phase 1 proposals the student has submitted (up to 3),
    each with their AI evaluation status and score for comparison.
    """
    return await ProjectService.get_my_proposals(db, current_student.id)


@router.post(
    "/select-proposal/{submission_id}",
    response_model=ProjectSubmissionResponseSchema,
)
async def select_proposal(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> Any:
    """
    Student selects their preferred Phase 1 proposal.
    All other pending proposals for the same semester are soft-deleted.
    """
    return await ProjectService.select_proposal(
        db=db,
        student_id=current_student.id,
        submission_id=submission_id,
    )

@router.patch("/{submission_id}/approve", response_model=ProjectSubmissionResponseSchema)
async def approve_project(
    submission_id: UUID,
    status: GuideStatus,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_faculty: Faculty = Depends(get_current_faculty),
) -> ProjectSubmissionResponseSchema:
    """Endpoint for the guide to approve or reject a project proposal"""
    return await ProjectService.approve_submission(
        db=db,
        submission_id=submission_id,
        guide_id=current_faculty.id,
        status=status,
        feedback=feedback,
    )

@router.post(
    "/phase-2/{submission_id}",
    response_model=ProjectSubmissionResponseSchema,
)
async def submit_phase_2(
    submission_id: UUID,
    data: Phase2SubmissionSchema,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> ProjectSubmissionResponseSchema:
    """Endpoint for the team leader to submit Phase 2 progress details."""
    return await ProjectService.submit_phase_2(
        db=db,
        submission_id=submission_id,
        leader_id=current_student.id,
        data=data,
    )


@router.patch(
    "/phase-2/{submission_id}/review",
    response_model=ProjectSubmissionResponseSchema,
)
async def review_phase_2(
    submission_id: UUID,
    status: GuideStatus,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_faculty: Faculty = Depends(get_current_faculty),
) -> ProjectSubmissionResponseSchema:
    """Endpoint for the assigned guide to review the Phase 2 submission."""
    return await ProjectService.review_phase_2(
        db=db,
        submission_id=submission_id,
        guide_id=current_faculty.id,
        status=status,
        feedback=feedback,
    )

@router.post(
    "/final/{submission_id}",
    response_model=ProjectSubmissionResponseSchema,
)
async def submit_final_project(
    submission_id: UUID,
    data: FinalSubmissionSchema,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> ProjectSubmissionResponseSchema:
    """Endpoint for the team leader to submit Final project work."""
    return await ProjectService.submit_final(
        db=db,
        submission_id=submission_id,
        leader_id=current_student.id,
        data=data,
    )


@router.patch(
    "/final/{submission_id}/review",
    response_model=ProjectSubmissionResponseSchema,
)
async def review_final_project(
    submission_id: UUID,
    status: GuideStatus,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_faculty: Faculty = Depends(get_current_faculty),
) -> ProjectSubmissionResponseSchema:
    """Endpoint for the assigned guide to review the Final submission and trigger grading."""
    return await ProjectService.review_final(
        db=db,
        submission_id=submission_id,
        guide_id=current_faculty.id,
        status=status,
        feedback=feedback,
    )


@router.get(
    "/{submission_id}/evaluations/{phase}",
    response_model=EvaluationResponseSchema,
)
async def get_project_evaluation(
    submission_id: UUID,
    phase: EvaluationPhase,
    db: AsyncSession = Depends(get_db),
    current_user: StudentAuth | Faculty = Depends(get_current_user),
) -> EvaluationResponseSchema:
    """Return the latest evaluation for a given submission phase."""
    await _ensure_submission_view_access(
        db=db,
        submission_id=submission_id,
        current_user=current_user,
    )

    evaluation = await EvaluationService.get_submission_evaluation(
        db=db,
        submission_id=submission_id,
        phase=phase,
    )
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found for the requested phase.",
        )

    return evaluation


@router.post(
    "/join",
    response_model=TeamMembershipResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def join_existing_team(
    data: TeamJoinSchema,
    db: AsyncSession = Depends(get_db),
    current_student: StudentAuth = Depends(get_current_student),
) -> TeamMembershipResponseSchema:
    """Endpoint for a student to join an existing team via Team ID"""
    return await ProjectService.join_team(
        db=db,
        student_id=current_student.id,
        data=data,
    )
