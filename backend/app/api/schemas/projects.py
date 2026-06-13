from typing import Optional, List, Any
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
    academic_year: str = Field(..., example="2025-26")
    semester: int = Field(..., ge=1, le=8)


class ClarificationAnswersSchema(BaseModel):
    """Answers to common Phase 1 clarification questions."""
    answers: List[str] = Field(..., min_items=1)


class Phase2DataSchema(BaseModel):
    """Schema for the mid-term progress review payload."""

    github_url: str = Field(..., min_length=10, description="Repository URL for the project")
    presentation_url: str = Field(
        ...,
        min_length=10,
        description="URL to the latest project presentation (PPT/PDF)",
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


class Phase2SubmissionSchema(BaseModel):
    """Schema for submitting Phase 2 project progress."""

    phase_2_data: Phase2DataSchema

class FinalDataSchema(BaseModel):
    """Schema for the final project submission payload."""
    final_report_url: str = Field(..., min_length=10, description="Uploaded final project report as a data URL or a public file link")
    presentation_url: str = Field(..., min_length=10, description="Uploaded project presentation as a data URL or a public file link")
    demo_video_url: Optional[str] = Field(None, description="URL to the project demo video")
    github_url: str = Field(..., min_length=10, description="Final GitHub repository URL")
    final_summary:Optional[str] = Field(None, min_length=100, max_length=5000, description="Comprehensive summary of the project outcome")
    individual_contributions: Optional[str] = Field(None, min_length=50, description="Audit of what each member did")

class FinalSubmissionSchema(BaseModel):
    """Schema for submitting the final project work."""
    final_data: FinalDataSchema

class TeamJoinSchema(BaseModel):
    """Schema for a student to join an existing team."""
    team_id: str = Field(..., description="Human-readable team ID like TEAM-2025-1234")
    role: str = Field(..., min_length=2, example="Frontend Developer")
    functions: str = Field(..., min_length=2, description="What specific tasks will you handle?")
    modules: Optional[str] = Field(
        None,
        description="Modules or components this member will own",
    )
    tech_stack: Optional[str] = Field(None, description="Skills/technologies the member brings")
    work_description: Optional[str] = Field(None, description="Detailed contribution plan")

class TeamMembershipResponseSchema(BaseModel):
    """Schema representing a team member record."""
    id: UUID
    submission_id: UUID
    student_id: UUID
    role: str
    functions: str
    modules: Optional[str] = None
    tech_stack: Optional[str] = None
    work_description: Optional[str] = None
    has_viewed_feedback: bool = False
    message: Optional[str] = None
    is_architect_triggered: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationResponseSchema(BaseModel):
    """Schema representing AI feedback for a specific project phase."""

    id: UUID
    submission_id: UUID
    phase: EvaluationPhase
    status: EvaluationStatus
    total_score: Optional[float] = None
    grade: Optional[str] = None
    ai_narrative: Optional[str] = None
    agent_logs: Optional[Any] = None
    roadmap_json: Optional[Any] = None
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
    current_phase: str
    academic_year: str
    semester: int
    phase_1_data: Optional[dict] = None
    phase_2_data: Optional[dict] = None
    final_data: Optional[dict] = None
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
    modules: Optional[str] = None
    tech_stack: Optional[str] = None
    is_leader: bool

class MyProjectResponseSchema(BaseModel):
    """Schema for a student's current active project including teammate info."""
    project: Optional[ProjectSubmissionResponseSchema] = None
    user_role: Optional[str] = None
    member_count: int = 0
    members: List[TeamMemberInfoSchema] = []
    previous_projects: List[ProjectSubmissionResponseSchema] = []
    latest_evaluation_status: Optional[str] = None
    latest_evaluation_phase: Optional[str] = None

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
