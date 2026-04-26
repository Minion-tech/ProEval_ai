import enum
import uuid
from typing import Optional
from sqlalchemy import String, Enum, ForeignKey, JSON, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.Models.base import Base, TimestampMixin


class NotificationType(str, enum.Enum):
    PROJECT_SENT = "PROJECT_SENT"
    INVITATION_RECEIVED = "INVITATION_RECEIVED"
    FEEDBACK_RECEIVED = "FEEDBACK_RECEIVED"
    PROJECT_APPROVED = "PROJECT_APPROVED"
    PROJECT_REJECTED = "PROJECT_REJECTED"


class Notification(Base, TimestampMixin):
    """Stores notifications for faculty members about projects and other events."""
    
    __tablename__ = "notifications"
    
    # Foreign Keys
    faculty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("faculty.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_submissions.id"), nullable=False, index=True)
    
    # Notification Details
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType),
        default=NotificationType.PROJECT_SENT,
        nullable=False
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Full project snapshot (JSON for quick display without extra query)
    project_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Read Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    faculty = relationship("Faculty", backref="notifications")
    project = relationship("ProjectSubmission", backref="notifications")
