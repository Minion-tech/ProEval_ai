from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.api.schemas.admin import (
    FacultyCreateSchema, 
    FacultyResponseSchema, 
    AdminReplaceGuideSchema, 
    AdminProjectActionSchema,
    BulkStudentUploadSchema,
    GuideProfileResponseSchema,
    RegisteredStudentResponseSchema,
)
from app.api.schemas.projects import ProjectSubmissionResponseSchema
from app.services.admin_service import AdminService
from app.services.notification_service import NotificationService

router = APIRouter()

# --- FACULTY MANAGEMENT ---

@router.post("/users/faculty", response_model=FacultyResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_faculty(
    faculty_data: FacultyCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Register a new faculty member (Admin only)."""
    return await AdminService.create_faculty(db, faculty_data)

@router.get("/users/faculty", response_model=List[FacultyResponseSchema])
async def list_faculty(
    db: AsyncSession = Depends(get_db),
):
    """List all registered faculty members (Admin only)."""
    return await AdminService.get_all_faculty(db)

@router.get("/users/faculty/load")
async def get_faculty_load(
    db: AsyncSession = Depends(get_db),
):
    """Admin only: View faculty project counts (Load Balancer)."""
    return await AdminService.get_guide_load(db)

@router.get("/users/faculty/{guide_id}", response_model=GuideProfileResponseSchema)
async def get_guide_profile(
    guide_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Admin only: View a detailed profile of a specific faculty member."""
    return await AdminService.get_guide_profile(db, guide_id)

@router.get("/reports/cohort")
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
):
    """Admin only: High-level dashboard statistics."""
    return await AdminService.get_overview(db)

# --- PROJECT MANAGEMENT ---

@router.get("/projects", response_model=List[ProjectSubmissionResponseSchema])
async def list_all_projects(
    db: AsyncSession = Depends(get_db),
):
    """View all project submissions (Admin only)."""
    return await AdminService.get_all_projects(db)

@router.patch("/projects/{project_id}/guide", response_model=ProjectSubmissionResponseSchema)
async def reassign_project_guide(
    project_id: UUID,
    payload: AdminReplaceGuideSchema,
    db: AsyncSession = Depends(get_db),
):
    """Forcibly reassign a new guide to a project (Admin only)."""
    return await AdminService.reassign_guide(db, project_id, payload)

@router.patch("/projects/{project_id}/status", response_model=ProjectSubmissionResponseSchema)
async def update_project_status(
    project_id: UUID,
    payload: AdminProjectActionSchema,
    db: AsyncSession = Depends(get_db),
):
    """Approve, Reject, or Request Revision for a project (Admin only)."""
    return await AdminService.update_project_status(db, project_id, payload)

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a project (Admin only). Resets student dashboard."""
    return await AdminService.delete_project(db, project_id)

@router.post("/projects/{project_id}/send-to-guide")
async def send_project_to_guide(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Send a Phase 1 project to its assigned guide (Admin only). Creates a notification and adds to guide's teams."""
    notification = await NotificationService.send_project_to_guide(db, project_id)
    return {
        "status": "sent",
        "notification_id": str(notification.id),
        "message": "Project sent to guide successfully"
    }

# --- STUDENT MANAGEMENT ---

@router.get("/users/students", response_model=List[RegisteredStudentResponseSchema])
async def list_registered_students(
    db: AsyncSession = Depends(get_db),
):
    """View student accounts that have completed registration (Admin only)."""
    return await AdminService.get_registered_students(db)

@router.post("/users/students/upload", status_code=status.HTTP_201_CREATED)
async def upload_preapproved_students(
    data: BulkStudentUploadSchema,
    db: AsyncSession = Depends(get_db),
):
    """Bulk upload university enrollment records used for registration validation (Admin only)."""
    return await AdminService.upload_students(db, data)

@router.get("/users/students/whitelist")
async def get_whitelist(
    db: AsyncSession = Depends(get_db),
):
    """View university enrollment records used for registration validation (Admin only)."""
    return await AdminService.get_all_preapproved_students(db)
