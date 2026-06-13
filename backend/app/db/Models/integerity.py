import enum
import uuid
from typing import Optional
from sqlalchemy import String, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.Models.base import Base, TimestampMixin

class IntegrityFlagType(str, enum.Enum):
    SIMILARITY = "SIMILARITY"              # Plagiarism
    STYLE_SHIFT = "STYLE_SHIFT"            # Radical change in coding/writing style
    CODE_JUMP = "CODE_JUMP"                # Sophistication doesn't match phase
    AI_GENERATED = "AI_GENERATED"          # Likely AI-generated without editing
    CONTRIBUTION_MISMATCH = "CONTRIBUTION_MISMATCH" # Claimed modules not found

class IntegritySeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class IntegrityFlag(Base, TimestampMixin):
    """Flags specific integrity issues detected by the AI agents."""
    
    __tablename__ = "integrity_flags"

    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False)
    
    flag_type: Mapped[IntegrityFlagType] = mapped_column(Enum(IntegrityFlagType), nullable=False)
    severity: Mapped[IntegritySeverity] = mapped_column(Enum(IntegritySeverity), nullable=False)
    
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[Optional[str]] = mapped_column(Text) # Quotes, code snippets, or URLs
    
    # Admins can resolve flags manually
    resolved_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    resolved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("admins.id"))
    
    # Relationships
    evaluation = relationship("Evaluation", back_populates="integrity_flags")
    resolved_by = relationship("AdminUser", backref="resolved_flags")
