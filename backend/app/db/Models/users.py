import enum
from typing import Optional
from sqlalchemy import String, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.Models.base import Base, TimestampMixin

# 1. Define an Enum for user roles
class AdminRole(str, enum.Enum):
    ADMIN = "ADMIN"

class AdminUser(Base, TimestampMixin):
    """Model representing System Administrators."""
    __tablename__ = "admins"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[AdminRole] = mapped_column(
        Enum(AdminRole), 
        default=AdminRole.ADMIN,
        nullable=False
    )
    department: Mapped[Optional[str]] = mapped_column(String(255))

class ProgrammeType(str, enum.Enum):
    BTECH = "BTECH"
    MTECH = "MTECH"
    MCA = "MCA"
    PHD = "PHD"

class StudentAuth(Base, TimestampMixin):
    """Model representing Student Accounts for the portal."""
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    enrollment_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    programme: Mapped[ProgrammeType] = mapped_column(
        Enum(ProgrammeType),
        default=ProgrammeType.BTECH,
        nullable=False
    )
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    batch: Mapped[str] = mapped_column(String(10), nullable=False) # e.g., "2024-2028"
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

class PreApprovedStudent(Base, TimestampMixin):
    """A whitelist of students allowed to register for the portal."""
    __tablename__ = "pre_approved_students"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    enrollment_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    
    programme: Mapped[ProgrammeType] = mapped_column(
        Enum(ProgrammeType),
        default=ProgrammeType.BTECH,
        nullable=False
    )
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    batch: Mapped[str] = mapped_column(String(10), nullable=False)
    is_registered: Mapped[bool] = mapped_column(Boolean, default=False)



    
