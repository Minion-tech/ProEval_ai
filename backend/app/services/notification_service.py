import uuid
from typing import Optional, List
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.Models import Notification, NotificationType, ProjectSubmission, AdminUser, StudentAuth


class NotificationService:
    """Service for managing notifications to admins and students."""

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        project_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        admin_id: Optional[uuid.UUID] = None,
        student_id: Optional[uuid.UUID] = None,
        project_snapshot: Optional[dict] = None,
    ) -> Notification:
        """Create a new notification."""
        notification = Notification(
            admin_id=admin_id,
            student_id=student_id,
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
    async def get_user_notifications(
        db: AsyncSession,
        user_id: uuid.UUID,
        unread_only: bool = False,
    ) -> List[Notification]:
        """Get all notifications for a user (admin or student), optionally filtered to unread only."""
        query = select(Notification).where(
            or_(
                Notification.admin_id == user_id,
                Notification.student_id == user_id
            )
        )
        
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
        user_id: uuid.UUID,
    ) -> int:
        """Get the count of unread notifications for a user."""
        query = select(Notification).where(
            and_(
                or_(
                    Notification.admin_id == user_id,
                    Notification.student_id == user_id
                ),
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
