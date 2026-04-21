# Our schema ensures that the frontend sends exactly what we expect—no more, no less.
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import Optional, List
import enum
from app.db.Models.users import FacultyRole, ProgrammeType

# we define the possible choice for an admin's decision
class AdminDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REQUEST_REVISION = "REQUEST_REVISION"

#this is the bllueprint for when an admin approves or rejects the project
class AdminProjectActionSchema(BaseModel):
    """Schema for admin actions on projects, such as approval, rejection, or requesting revisions.
    """
    action: AdminDecision = Field(..., description="The decision: APPROVED, REJECTED, or REQUEST_REVISION")

    #optionall feedback for the student 
    feedback: Optional[str] = Field(None, max_length=1000, description="Optional feedback for the student regarding the decision")

#3 this is the blueprint specifically for replacing a guide    
class AdminReplaceGuideSchema(BaseModel):
    """Schema for admin to forcibly assign a new guide to a project."""
    project_id: UUID = Field(..., description="The ID of the project for which to replace the guide")
    new_guide_id: UUID = Field(..., description="The ID of the new guide to assign")

class FacultyCreateSchema(BaseModel):
    """Schema for an Admin to create a new Faculty account."""

    name: str = Field(..., min_length=2, max_length=100, description="Full name of the faculty member")
    email: EmailStr = Field(..., description="University email address")
    password: str = Field(..., min_length=8, description="Initial password for the account")
    department: Optional[str] = Field(None, description="Department (e.g., Computer Science)")
    specialization: Optional[str] = Field(None, description="Specialization (e.g., AI, ML, Blockchain)")

class FacultyResponseSchema(BaseModel):
    """Schema for returning faculty details (excluding password)."""
    id: UUID
    name: str
    email: str
    role: FacultyRole
    department: Optional[str]
    specialization: Optional[str]

    class Config:
        from_attributes = True

class PreApprovedStudentSchema(BaseModel):
    """University-side student record used to validate enrollment during registration."""
    name: str = Field(..., min_length=2, max_length=100)
    enrollment_no: str = Field(..., description="Unique University Enrollment Number")
    email: Optional[EmailStr] = Field(None, description="Student email, if available from the university list")
    programme: ProgrammeType
    department: str
    batch: str = Field(..., example="2024-2028")

class BulkStudentUploadSchema(BaseModel):
    """Schema for bulk-uploading university enrollment records."""
    students: List[PreApprovedStudentSchema]

class RegisteredStudentResponseSchema(BaseModel):
    """Student account created through the registration flow."""
    id: UUID
    name: str
    email: EmailStr
    enrollment_no: str
    programme: ProgrammeType
    department: str
    batch: str
    is_verified: bool

    class Config:
        from_attributes = True

class StudentProjectUnderGuideSchema(BaseModel):
    """Detailed project info for the Guide Profile view."""
    semester: int
    academic_year: str
    team_id: str
    student_leader: str
    teammates: List[str]
    topic_name: str
    current_phase: str
    phase_1_submitted: bool
    phase_2_submitted: bool
    final_submitted: bool

class GuideProfileResponseSchema(BaseModel):
    """The full profile of a guide including their projects."""
    id: UUID
    name: str
    email: str
    department: Optional[str]
    specialization: Optional[str]
    is_active: bool = True
    projects: List[StudentProjectUnderGuideSchema]

    class Config:
        from_attributes = True
