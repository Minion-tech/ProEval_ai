from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.services.notification_service import NotificationService
from app.db.Models import Notification, ProjectSubmission

router = APIRouter()


@router.get("/notifications")
async def get_faculty_notifications(
    db: AsyncSession = Depends(get_db),
):
    """Get all notifications for the current faculty member with unread count."""
    # TODO: Get faculty_id from JWT token (current user)
    # For now, this is a placeholder that will be updated when auth is integrated
    # This endpoint requires authentication middleware
    return {
        "notifications": [],
        "unread_count": 0,
        "message": "Faculty authentication not yet implemented for this endpoint"
    }


@router.get("/notifications/unread-count")
async def get_unread_notification_count(
    db: AsyncSession = Depends(get_db),
):
    """Get the count of unread notifications for the current faculty member."""
    # TODO: Get faculty_id from JWT token (current user)
    return {
        "unread_count": 0,
        "message": "Faculty authentication not yet implemented for this endpoint"
    }


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    notification = await NotificationService.mark_as_read(db, notification_id)
    return {
        "status": "success",
        "notification_id": str(notification.id),
        "is_read": notification.is_read
    }


@router.get("/notifications/{notification_id}")
async def get_notification_detail(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific notification including full project snapshot."""
    notification = await NotificationService.get_notification_by_id(db, notification_id)
    
    if not notification:
        return {
            "status": "error",
            "message": "Notification not found"
        }
    
    return {
        "id": str(notification.id),
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type.value,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
        "project_snapshot": notification.project_snapshot
    }


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    await NotificationService.delete_notification(db, notification_id)
    return {
        "status": "success",
        "message": "Notification deleted"
    }


@router.get("/my-projects")
async def get_faculty_projects(
    faculty_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all projects assigned to this faculty member (their My Teams)."""
    # Fetch all projects where this faculty is the guide
    query = select(ProjectSubmission).where(
        ProjectSubmission.guide_id == faculty_id
    ).order_by(ProjectSubmission.created_at.desc())
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # Map to response format
    project_list = []
    for project in projects:
        project_list.append({
            "id": str(project.id),
            "team_id": project.team_id,
            "title": project.phase_1_data.get("title") if project.phase_1_data else "Untitled",
            "current_phase": project.current_phase.value,
            "admin_status": project.admin_status.value,
            "guide_status": project.guide_status.value,
            "academic_year": project.academic_year,
            "semester": project.semester,
            "members_count": len(project.members) if project.members else 0,
        })
    
    return {
        "status": "success",
        "projects": project_list,
        "count": len(project_list)
    }

