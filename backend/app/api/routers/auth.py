from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.api.deps import get_current_user
from app.db.session import get_db
from app.api.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    StudentRegister,
    OTPVerify,
    Token,
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token, verify_password
from app.db.Models import Faculty, StudentAuth

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", status_code=status.HTTP_200_OK)
async def register_student(
    data: StudentRegister,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Initial registration: Validates data and sends a verification code.
    """
    message = await AuthService.register_student(db, data)
    return {"message": message}

@router.post("/verify", response_model=Token)
async def verify_otp(
    data: OTPVerify,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Verifies OTP and creates the student account. Returns initial access token.
    """
    user = await AuthService.verify_otp_and_create_user(db, data)
    
    # Auto-login after verification
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login_for_access_token(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Unified login: Handles both Students and Faculty.
    """
    user = None

    # 1. Search the StudentAuth table first (majority of users)
    user = await AuthService.get_student_by_email_or_enrollment(db, data.email, "")
    
    # 2. If not a student, search the Faculty table
    if not user:
        user = await AuthService.get_faculty_by_email(db, data.email)

    # 3. Security Check: If user still doesn't exist, throw 401
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # 4. Password Verification
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # 5. Token Issuance
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=CurrentUserResponse)
async def read_current_user(
    current_user: StudentAuth | Faculty = Depends(get_current_user),
) -> CurrentUserResponse:
    """
    Return the currently authenticated user profile for frontend session restore.
    """
    if isinstance(current_user, StudentAuth):
        return CurrentUserResponse(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            role="STUDENT",
            department=current_user.department,
            enrollment_no=current_user.enrollment_no,
            programme=current_user.programme,
            batch=current_user.batch,
            is_verified=current_user.is_verified,
        )

    return CurrentUserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        department=current_user.department,
    )
