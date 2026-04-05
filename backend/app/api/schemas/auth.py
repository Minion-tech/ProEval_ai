from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from app.db.Models.users import ProgrammeType

class StudentRegister(BaseModel):
    """Schema for new student registration."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    enrollment_no: str = Field(..., min_length=5, max_length=50)
    password: str = Field(..., min_length=8)
    programme: ProgrammeType
    department: str = Field(..., min_length=2, max_length=255)
    batch: str = Field(..., example="2024-2028")

class OTPVerify(BaseModel):
    """Schema for verifying the 6-digit OTP sent to email."""
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

class Token(BaseModel):
    """Schema for the JWT response."""
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """Schema for the data stored inside the JWT."""
    sub: Optional[str] = None # This will be the User UUID
