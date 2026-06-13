# Our schema ensures that the frontend sends exactly what we expect—no more, no less.
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import Optional, List
import enum
from app.db.Models.users import AdminRole, ProgrammeType

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

class AdminCreateSchema(BaseModel):
    """Schema for an Admin to create a new Admin account."""

    name: str = Field(..., min_length=2, max_length=100, description="Full name of the admin")
    email: EmailStr = Field(..., description="University email address")
    password: str = Field(..., min_length=8, description="Initial password for the account")
    department: Optional[str] = Field(None, description="Department (e.g., Computer Science)")

class AdminResponseSchema(BaseModel):
    """Schema for returning admin details (excluding password)."""
    id: UUID
    name: str
    email: str
    role: AdminRole
    department: Optional[str]

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
    # Allow returning emails that may use testing or reserved domains (e.g., test.local)
    email: str
    enrollment_no: str
    programme: ProgrammeType
    department: str
    batch: str
    is_verified: bool

    class Config:
        from_attributes = True
