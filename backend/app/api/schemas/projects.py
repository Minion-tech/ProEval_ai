from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

#phase 1  Form Data
class Phase1DataSchema(BaseModel):
    title: str = Field(..., min_length=10, max_length=500, description="Project title")
    abstract: str = Field(..., min_length=50, max_length=2000, description="A detailed summary of the project")
    domain: str = Field(..., example = "Artificial Intelligence/Machine Learning")
    objectives: List[str] = Field(..., min_items=1, description="List of the key goals")
    tech_stack: List[str] = Field(..., min_items=1, description="Technologies to be used")

# the request schema what  the student  send 
class ProjectSubmissionCreateSchema(BaseModel):
    """Schema for creating a new project submission (Phase 1)."""
    phase_1_data: Phase1DataSchema
    guide_id: UUID
    academic_year: str = Field(..., example="2025-26")
    semester: int = Field(..., ge=1, le=8)

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