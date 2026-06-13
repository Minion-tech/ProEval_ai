from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Any

from app.api.deps import get_current_user
from app.db.session import get_db
from app.api.schemas.interview import (
    InterviewContextResponse,
    InterviewResultPayload,
    InterviewResultResponse
)
from app.services.interview_service import InterviewService
from app.services.project_service import ProjectService
from app.db.Models import StudentAuth, AdminUser, TeamMembership, AdminRole

router = APIRouter(prefix="/projects/{submission_id}/interview", tags=["AI Interview"])

async def _ensure_submission_view_access(
    db: AsyncSession,
    submission_id: UUID,
    current_user: StudentAuth | AdminUser,
) -> None:
    """
    Enforce project visibility rules before returning interview details.
    """
    submission = await ProjectService.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project submission not found.",
        )

    if isinstance(current_user, StudentAuth):
        # Bypass for the test user to allow easy testing of any project
        if current_user.email == "test@proeval.ai":
            return

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

    if isinstance(current_user, AdminUser) and current_user.role == AdminRole.ADMIN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this project.",
    )

@router.get("/context", response_model=InterviewContextResponse)
async def get_interview_context(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StudentAuth | AdminUser = Depends(get_current_user),
):
    """
    Generate personalized interview questions based on the project submission.
    """
    await _ensure_submission_view_access(db, submission_id, current_user)
    return await InterviewService.get_interview_context(db, submission_id, current_user)


@router.post("/results", response_model=InterviewResultResponse)
async def submit_interview_results(
    submission_id: UUID,
    payload: InterviewResultPayload,
    db: AsyncSession = Depends(get_db),
    current_user: StudentAuth | AdminUser = Depends(get_current_user),
):
    """
    Submit the results of the AI interview, including transcript and anti-cheat telemetry.
    """
    await _ensure_submission_view_access(db, submission_id, current_user)
    return await InterviewService.process_interview_results(db, submission_id, payload.model_dump())
