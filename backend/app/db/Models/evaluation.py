import enum
import uuid
from typing import Optional, List
from sqlalchemy import String, Enum, ForeignKey, Integer, JSON, Text, Boolean, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.Models.base import Base, TimestampMixin

class EvaluationPhase(str, enum.Enum):
    PHASE_1 = "PHASE_1"
    PHASE_2 = "PHASE_2"
    FINAL = "FINAL"

class EvaluationStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Evaluation(Base, TimestampMixin):
    """Stores AI-generated feedback and scores for a specific phase of a project."""
    
    __tablename__ = "evaluations"

    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_submissions.id"), nullable=False)
    faculty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("faculty.id"), nullable=False)
    
    phase: Mapped[EvaluationPhase] = mapped_column(Enum(EvaluationPhase), nullable=False)
    status: Mapped[EvaluationStatus] = mapped_column(
        Enum(EvaluationStatus),
        default=EvaluationStatus.PENDING,
        nullable=False
    )
    
    # The main AI feedback for this phase
    ai_narrative: Mapped[Optional[str]] = mapped_column(Text)
    
    # Overall numeric result
    total_score: Mapped[Optional[float]] = mapped_column(Float)
    grade: Mapped[Optional[str]] = mapped_column(String(5)) # e.g., "A+", "B"
    
    # Metadata for the agent run
    agent_trace_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    
    # Relationship links
    submission = relationship("ProjectSubmission", back_populates="evaluations")
    evaluator = relationship("Faculty", backref="evaluations_performed")
    criterion_scores = relationship("EvaluationCriterionScore", back_populates="evaluation", cascade="all, delete-orphan")
    member_evaluations = relationship("MemberEvaluation", back_populates="evaluation", cascade="all, delete-orphan")

class EvaluationCriterionScore(Base, TimestampMixin):
    """Detailed scores for specific criteria (e.g., Innovation, Code Quality)."""
    
    __tablename__ = "evaluation_criterion_scores"

    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False)
    
    criterion_key: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., "INNOVATION"
    score: Mapped[float] = mapped_column(Float, nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    
    evaluation = relationship("Evaluation", back_populates="criterion_scores")

class MemberEvaluation(Base, TimestampMixin):
    """Stores individual AI-generated feedback and scores for each team member."""
    
    __tablename__ = "member_evaluations"

    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False)
    membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("team_memberships.id"), nullable=False)
    
    # Individual Scores
    contribution_score: Mapped[float] = mapped_column(Float, default=0.0)
    technical_depth: Mapped[float] = mapped_column(Float, default=0.0)
    code_quality: Mapped[float] = mapped_column(Float, default=0.0)
    documentation: Mapped[float] = mapped_column(Float, default=0.0)
    
    overall_member_score: Mapped[float] = mapped_column(Float, default=0.0)
    grade: Mapped[Optional[str]] = mapped_column(String(5))
    
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text)
    
    # True if the AI verified their modules in the actual codebase
    alignment_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    evaluation = relationship("Evaluation", back_populates="member_evaluations")
    membership = relationship("TeamMembership", backref="individual_evaluations")
    viva_questions = relationship("VivaQuestion", back_populates="member_evaluation", cascade="all, delete-orphan")

class VivaQuestion(Base, TimestampMixin):
    """AI-generated viva questions based on the student's project work."""
    
    __tablename__ = "viva_questions"

    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False)
    member_evaluation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("member_evaluations.id"))
    
    question: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_answer: Mapped[Optional[str]] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(50)) # "BASIC", "INTERMEDIATE", "ADVANCED"
    
    # Relationships
    evaluation = relationship("Evaluation", backref="all_viva_questions")
    member_evaluation = relationship("MemberEvaluation", back_populates="viva_questions")
