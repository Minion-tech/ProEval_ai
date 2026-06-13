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
from app.core.config import settings
from app.db.Models import AdminUser, StudentAuth

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.options("/register")
async def register_options():
    return {}

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
    Unified login: Handles both Students and Admins.
    """
    # Dev Mode Bypass: Automatically create/login test user
    if settings.ENABLE_TEST_MODE:
        if data.email == settings.TEST_USER_EMAIL:
            user = await AuthService.get_student_by_email_or_enrollment(db, data.email, "")
            from app.core.security import get_password_hash
            from app.db.Models import ProgrammeType
            
            if not user:
                # Create a mock student if they don't exist
                user = StudentAuth(
                    name="Test Student",
                    email=settings.TEST_USER_EMAIL,
                    enrollment_no="TEST-0000",
                    password_hash=get_password_hash(data.password),
                    programme=ProgrammeType.BTECH,
                    department="Computer Science",
                    batch="2022-2026",
                    is_verified=True
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            
            # In test mode, we allow the login if it's the test email
            access_token = create_access_token(subject=user.id)
            return {"access_token": access_token, "token_type": "bearer"}
        
        if data.email == "admin@proeval.ai":
            # Return a token for the transient Dev Admin
            access_token = create_access_token(subject="00000000-0000-0000-0000-000000000000")
            return {"access_token": access_token, "token_type": "bearer"}

    user = None

    # 1. Search the StudentAuth table first (majority of users)
    user = await AuthService.get_student_by_email_or_enrollment(db, data.email, "")
    
    # 2. If not a student, search the AdminUser table
    if not user:
        user = await AuthService.get_admin_by_email(db, data.email)

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
    current_user: StudentAuth | AdminUser = Depends(get_current_user),
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
