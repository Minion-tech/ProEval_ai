#front door of the projects API
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

from app.db.session import get_db
from app.api.schemas.projects import (
    ProjectSubmissionCreateSchema, 
    ProjectSubmissionResponseSchema,
    TeamJoinSchema,
    TeamMembershipResponseSchema
)
from app.services.project_service import ProjectService
from app.db.Models import GuideStatus

#1 create the router
router = APIRouter(prefix="/projects", tags=["Projects"])

#2 define the create project endpoint
@router.post("/", 
            response_model=ProjectSubmissionResponseSchema,
            status_code=status.HTTP_201_CREATED)

async def create_new_project(
    data: ProjectSubmissionCreateSchema,
    db: AsyncSession = Depends(get_db),

    leader_id: UUID = "a1b2c3d4-e5f6-7890-abcd-1234567890ab" # This should come from the auth system in a real application"
    ):
    """Endpoint for the student leader to submit a phase 1 proposal"""
    try:
        #call the brain (The service)
        new_project = await ProjectService.create_submission(
            db=db,
            leader_id=leader_id,
            data=data
        )
        return new_project
    except HTTPException as e:
        #if the service raises a 400 (already leading a project),
        #  we will let it pass through user 
        raise e
    except Exception as e:
        #log unexpected errors and return a 500
        print(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the project."
        ) 

@router.patch("/{submission_id}/approve", 
             response_model=ProjectSubmissionResponseSchema)
async def approve_project(
    submission_id: UUID,
    status: GuideStatus,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    # In a real app, guide_id would come from the current_user's token
    guide_id: UUID = "b2c3d4e5-f6a7-8901-bcde-2345678901bc" 
):
    """Endpoint for the guide to approve or reject a project proposal"""
    return await ProjectService.approve_submission(
        db=db,
        submission_id=submission_id,
        guide_id=guide_id,
        status=status,
        feedback=feedback
    )

@router.post("/join", 
            response_model=TeamMembershipResponseSchema,
            status_code=status.HTTP_201_CREATED)
async def join_existing_team(
    data: TeamJoinSchema,
    db: AsyncSession = Depends(get_db),
    # In a real app, student_id would come from the current_user's token
    student_id: UUID = "c3d4e5f6-a7b8-9012-cdef-3456789012cd"
):
    """Endpoint for a student to join an existing team via Team ID"""
    return await ProjectService.join_team(
        db=db,
        student_id=student_id,
        data=data
    )
