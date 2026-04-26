import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.db.Models import Notification, NotificationType, ProjectSubmission, Faculty


class NotificationService:
    """Service for managing notifications to faculty members."""

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        faculty_id: uuid.UUID,
        project_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        project_snapshot: Optional[dict] = None,
    ) -> Notification:
        """Create a new notification for a faculty member."""
        notification = Notification(
            faculty_id=faculty_id,
            project_id=project_id,
            notification_type=notification_type,
            title=title,
            message=message,
            project_snapshot=project_snapshot,
            is_read=False,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def get_faculty_notifications(
        db: AsyncSession,
        faculty_id: uuid.UUID,
        unread_only: bool = False,
    ) -> List[Notification]:
        """Get all notifications for a faculty member, optionally filtered to unread only."""
        query = select(Notification).where(Notification.faculty_id == faculty_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        # Order by created_at descending (newest first)
        query = query.order_by(Notification.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_notification_by_id(
        db: AsyncSession,
        notification_id: uuid.UUID,
    ) -> Optional[Notification]:
        """Get a specific notification by ID."""
        query = select(Notification).where(Notification.id == notification_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id: uuid.UUID,
    ) -> Notification:
        """Mark a notification as read."""
        notification = await NotificationService.get_notification_by_id(db, notification_id)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        notification.is_read = True
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def get_unread_count(
        db: AsyncSession,
        faculty_id: uuid.UUID,
    ) -> int:
        """Get the count of unread notifications for a faculty member."""
        query = select(Notification).where(
            and_(
                Notification.faculty_id == faculty_id,
                Notification.is_read == False
            )
        )
        result = await db.execute(query)
        notifications = result.scalars().all()
        return len(notifications)

    @staticmethod
    async def delete_notification(
        db: AsyncSession,
        notification_id: uuid.UUID,
    ) -> None:
        """Delete a notification."""
        notification = await NotificationService.get_notification_by_id(db, notification_id)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        await db.delete(notification)
        await db.commit()

    @staticmethod
    async def send_project_to_guide(
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Notification:
        """
        Send a project to its assigned guide.
        Creates a notification and validates project/guide exist.
        """
        # Fetch the project
        project_query = select(ProjectSubmission).where(ProjectSubmission.id == project_id)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Validate project is in Phase 1
        if project.current_phase.value != "PHASE_1":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Only Phase 1 projects can be sent to guides"
            )
        
        # Validate guide is assigned
        if not project.guide_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No guide assigned to this project"
            )
        
        # Fetch guide name for title
        guide_query = select(Faculty).where(Faculty.id == project.guide_id)
        guide_result = await db.execute(guide_query)
        guide = guide_result.scalar_one_or_none()
        
        if not guide:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned guide not found"
            )
        
        # Create snapshot of project data for quick display
        project_snapshot = {
            "id": str(project.id),
            "team_id": project.team_id,
            "title": project.phase_1_data.get("title") if project.phase_1_data else "Untitled",
            "phase": project.current_phase.value,
            "admin_status": project.admin_status.value,
            "academic_year": project.academic_year,
            "semester": project.semester,
            "phase_1_data": project.phase_1_data,
            "members_count": len(project.members) if project.members else 0,
        }
        
        # Auto-accept the project for the guide (no need for explicit acceptance)
        from app.db.Models import GuideStatus
        project.guide_status = GuideStatus.ACCEPTED
        
        # Create the notification
        notification = await NotificationService.create_notification(
            db=db,
            faculty_id=project.guide_id,
            project_id=project_id,
            notification_type=NotificationType.PROJECT_SENT,
            title=f"Project {project.team_id} - {project.phase_1_data.get('title', 'Untitled') if project.phase_1_data else 'Untitled'} Assigned",
            message=f"Your admin has assigned the project '{project.phase_1_data.get('title', 'Untitled') if project.phase_1_data else 'Untitled'}' (Team ID: {project.team_id}) to you.",
            project_snapshot=project_snapshot,
        )
        
        # Commit changes to set guide_status
        await db.commit()
        
        return notification
