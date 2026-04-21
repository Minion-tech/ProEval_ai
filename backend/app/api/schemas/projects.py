from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from app.db.Models import EvaluationPhase, EvaluationStatus

#phase 1  Form Data
class Phase1DataSchema(BaseModel):
    title: str = Field(..., min_length=10, max_length=500, description="Project title")
    abstract: str = Field(..., min_length=50, max_length=2000, description="Primary project objective")
    domain: str = Field(..., example = "Artificial Intelligence/Machine Learning")
    objectives: List[str] = Field(..., min_items=1, description="List of the key goals")
    methodology: str = Field(..., min_length=50, max_length=3000, description="Planned methodology or implementation approach")
    use_case_diagram: str = Field(..., min_length=20, description="Uploaded use case diagram as a data URL")
    tech_stack: List[str] = Field(..., min_items=1, description="Technologies to be used")

# the request schema what  the student  send 
class ProjectSubmissionCreateSchema(BaseModel):
    """Schema for creating a new project submission (Phase 1)."""
    phase_1_data: Phase1DataSchema
    guide_id: UUID
    academic_year: str = Field(..., example="2025-26")
    semester: int = Field(..., ge=1, le=8)


class Phase2DataSchema(BaseModel):
    """Schema for the mid-term progress review payload."""

    github_url: str = Field(..., min_length=10, description="Repository URL for the project")
    architecture_diagram_url: Optional[str] = Field(
        default=None,
        description="URL to the latest architecture diagram or system design artifact",
    )
    progress_notes: str = Field(
        ...,
        min_length=50,
        max_length=3000,
        description="Detailed summary of the work completed so far",
    )
    completed_milestones: List[str] = Field(
        ...,
        min_items=1,
        description="Milestones completed since proposal approval",
    )
    pending_risks: List[str] = Field(
        default_factory=list,
        description="Known blockers, risks, or unresolved technical concerns",
    )
    documentation_url: Optional[str] = Field(
        default=None,
        description="Optional link to supporting documentation",
    )


class Phase2SubmissionSchema(BaseModel):
    """Schema for submitting Phase 2 project progress."""

    phase_2_data: Phase2DataSchema

class FinalDataSchema(BaseModel):
    """Schema for the final project submission payload."""
    final_report_url: str = Field(..., min_length=10, description="URL to the final project report (PDF)")
    presentation_url: str = Field(..., min_length=10, description="URL to the project presentation (PPT/PDF)")
    demo_video_url: Optional[str] = Field(None, description="URL to the project demo video")
    code_repository_url: str = Field(..., min_length=10, description="Final repository URL")
    final_summary: str = Field(..., min_length=100, max_length=5000, description="Comprehensive summary of the project outcome")
    individual_contributions: str = Field(..., min_length=50, description="Audit of what each member did")

class FinalSubmissionSchema(BaseModel):
    """Schema for submitting the final project work."""
    final_data: FinalDataSchema

class TeamJoinSchema(BaseModel):
    """Schema for a student to join an existing team."""
    team_id: str = Field(..., description="Human-readable team ID like TEAM-2025-1234")
    role: str = Field(..., min_length=2, max_length=100, example="Frontend Developer")
    functions: str = Field(..., min_length=10, description="What specific tasks will you handle?")
    modules: str = Field(..., min_length=5, description="Which parts of the code will you work on?")

class TeamMembershipResponseSchema(BaseModel):
    """Schema representing a team member record."""
    id: UUID
    submission_id: UUID
    student_id: UUID
    role: str
    functions: str
    modules: str
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationResponseSchema(BaseModel):
    """Schema representing AI feedback for a specific project phase."""

    id: UUID
    submission_id: UUID
    faculty_id: UUID
    phase: EvaluationPhase
    status: EvaluationStatus
    total_score: Optional[float] = None
    grade: Optional[str] = None
    ai_narrative: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

#3 the response schema (What api returns)
class ProjectSubmissionResponseSchema(BaseModel):
    """Schema representing a project record sent back to the client."""
    id: UUID
    team_id: str
    leader_id: UUID
    guide_id: Optional[UUID] = None
    current_phase: str
    guide_status: str
    academic_year: str
    semester: int
    created_at: datetime

    class Config:
        #this is the line which allow us to convert the SQLAlchemy model to pydantic model
        from_attributes = True

class TeamMemberInfoSchema(BaseModel):
    """Detailed info about a team member for the UI."""
    name: str
    email: str
    role: str
    functions: str
    modules: str
    is_leader: bool

class MyProjectResponseSchema(BaseModel):
    """Schema for a student's current active project including teammate info."""
    project: Optional[ProjectSubmissionResponseSchema] = None
    user_role: Optional[str] = None
    member_count: int = 0
    members: List[TeamMemberInfoSchema] = []
    previous_projects: List[ProjectSubmissionResponseSchema] = []

    class Config:
        from_attributes = True


class ProposalWithEvalSchema(BaseModel):
    """One Phase 1 proposal with its AI evaluation summary, used on the compare page."""
    id: UUID
    team_id: str
    attempt_number: int
    phase_1_data: Optional[dict] = None
    evaluation_status: Optional[str] = None
    evaluation_score: Optional[float] = None
    evaluation_grade: Optional[str] = None
    evaluation_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MyProposalsResponseSchema(BaseModel):
    """All Phase 1 proposals for the student together with AI comparison data."""
    proposals: List[ProposalWithEvalSchema]
    can_submit_more: bool
    total_proposals: int
    ai_recommendation_id: Optional[str] = None  # UUID str of highest-scoring proposal

    class Config:
        from_attributes = True

