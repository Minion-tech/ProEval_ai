from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.api.schemas.admin import (
    AdminCreateSchema, 
    AdminResponseSchema, 
    AdminProjectActionSchema,
    BulkStudentUploadSchema,
    RegisteredStudentResponseSchema,
)
from app.api.schemas.projects import ProjectSubmissionResponseSchema
from app.db.Models import EvaluationPhase
from app.services.admin_service import AdminService

router = APIRouter()

# --- ADMIN MANAGEMENT ---

@router.post("/users/admins", response_model=AdminResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_admin(
    admin_data: AdminCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Register a new administrator (Admin only)."""
    return await AdminService.create_admin(db, admin_data)

@router.get("/users/admins", response_model=List[AdminResponseSchema])
async def list_admins(
    db: AsyncSession = Depends(get_db),
):
    """List all registered administrators (Admin only)."""
    return await AdminService.get_all_admins(db)

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

@router.get("/evaluations")
async def list_all_evaluations(
    db: AsyncSession = Depends(get_db),
):
    """View all AI evaluations with project context (Admin only)."""
    return await AdminService.get_all_evaluations(db)

@router.get("/projects/{project_id}/evaluations")
async def list_project_evaluations(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """View all AI evaluations for a project submission (Admin only)."""
    return await AdminService.get_project_evaluations(db, project_id)

@router.get("/evaluations/{submission_id}/{phase}")
async def get_evaluation_detail(
    submission_id: UUID,
    phase: EvaluationPhase,
    db: AsyncSession = Depends(get_db),
):
    """View the latest complete AI evaluation for a project phase (Admin only)."""
    return await AdminService.get_evaluation_detail(db, submission_id, phase)

@router.delete("/evaluations/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an evaluation record (Admin only)."""
    return await AdminService.delete_evaluation(db, evaluation_id)

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


@router.delete("/users/students/whitelist/{student_id}")
async def delete_preapproved_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a university enrollment record (Admin only)."""
    return await AdminService.delete_preapproved_student(db, student_id)


@router.delete("/users/students/{student_id}")
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a student and all related data (Admin only)."""
    return await AdminService.delete_student(db, student_id)
