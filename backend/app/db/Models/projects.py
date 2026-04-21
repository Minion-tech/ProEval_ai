import enum
import uuid
from typing import Optional, List
from sqlalchemy import String, Enum, ForeignKey, Integer, JSON, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.Models.base import Base, TimestampMixin

class ProjectPhase(str, enum.Enum):
    PHASE_1 = "PHASE_1"
    PHASE_2 = "PHASE_2"
    FINAL = "FINAL"
    SUBMITTED = "SUBMITTED"

class GuideStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class AdminStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"

class ProjectSubmission(Base, TimestampMixin):
    """The central model for student project evaluations."""
    
    __tablename__ = "project_submissions"

    # Human-readable team identifier (e.g., TEAM-2026-0042)
    team_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    
    # Relationships to Users
    leader_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("studentauth.id"), nullable=False)
    guide_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("faculty.id"))
    
    # Phase Data (Flexible JSON storage)
    phase_1_data: Mapped[Optional[dict]] = mapped_column(JSONB) # {title, abstract, domain, goals}
    phase_2_data: Mapped[Optional[dict]] = mapped_column(JSONB) # {github_url, mid_term_notes}
    final_data: Mapped[Optional[dict]] = mapped_column(JSONB) # {final_report_url, demo_url}
    
    current_phase: Mapped[ProjectPhase] = mapped_column(
        Enum(ProjectPhase),
        default=ProjectPhase.PHASE_1,
        nullable=False
    )
    
    guide_status: Mapped[GuideStatus] = mapped_column(
        Enum(GuideStatus),
        default=GuideStatus.PENDING,
        nullable=False
    )

    admin_status: Mapped[AdminStatus] = mapped_column(
        Enum(AdminStatus),
        default=AdminStatus.PENDING,
        nullable=False
    )

    admin_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False) # e.g., "2025-26"
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Multi-proposal support (up to 3 Phase 1 proposals before selection)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False, server_default="1")

    # Soft Deletion (For Admin resets)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # SQLAlchemy Relationships
    leader = relationship("StudentAuth", backref="led_submissions")
    guide = relationship("Faculty", backref="guided_submissions")
    members = relationship("TeamMembership", back_populates="submission", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="submission")

class TeamMembership(Base, TimestampMixin):
    """Links students to a ProjectSubmission with their specific contributions."""
    
    __tablename__ = "team_memberships"

    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_submissions.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("studentauth.id"), nullable=False)
    
    role: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., "Developer", "Designer"
    functions: Mapped[str] = mapped_column(Text, nullable=False) # Detailed description of duties
    modules: Mapped[str] = mapped_column(Text, nullable=False) # List of codebase components worked on
    
    # New fields for AI decision support (Architecture v3.0)
    work_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[Optional[str]] = mapped_column(Text, nullable=True) 
    ai_feedback: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True) # {skill_gap_alerts: List[str], workload_balance: float}

    # SQLAlchemy Relationships
    submission = relationship("ProjectSubmission", back_populates="members")
    student = relationship("StudentAuth", backref="memberships")
