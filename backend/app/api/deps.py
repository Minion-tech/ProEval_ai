from typing import Union, Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.auth import TokenPayload
from app.core.config import settings
from app.db.Models import AdminUser, StudentAuth, AdminRole
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Union[StudentAuth, AdminUser]:
    """
    Resolve the authenticated principal from the JWT subject.
    Supports Auto-Auth bypass in Dev Mode.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id: Optional[UUID] = None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        token_data = TokenPayload(**payload)
        if token_data.sub:
            user_id = UUID(token_data.sub)
    except (jwt.InvalidTokenError, ValueError, Exception):
        # In Dev Mode, we allow bypassing the token check if it fails or is missing
        if settings.ENABLE_TEST_MODE:
            # 1. Try to resolve the designated test student
            test_student_result = await db.execute(
                select(StudentAuth).where(StudentAuth.email == settings.TEST_USER_EMAIL)
            )
            test_student = test_student_result.scalar_one_or_none()
            if test_student:
                return test_student
            
            # 2. Try to resolve any admin if no student found
            test_admin_result = await db.execute(
                select(AdminUser).limit(1)
            )
            test_admin = test_admin_result.scalar_one_or_none()
            if test_admin:
                return test_admin
            
            # 3. Last resort: Create a transient mock admin for UI testing
            return AdminUser(
                id=UUID("00000000-0000-0000-0000-000000000000"),
                name="Dev Admin",
                email="admin@proeval.ai",
                role=AdminRole.ADMIN,
                password_hash="test-mode"
            )
        
        if not user_id:
            raise credentials_exception

    student_result = await db.execute(
        select(StudentAuth).where(StudentAuth.id == user_id)
    )
    student = student_result.scalar_one_or_none()
    if student:
        return student

    admin_result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    admin = admin_result.scalar_one_or_none()
    if admin:
        return admin

    raise credentials_exception


async def get_current_student(
    current_user: Union[StudentAuth, AdminUser] = Depends(get_current_user),
) -> StudentAuth:
    """Restrict an endpoint to authenticated students only."""
    if not isinstance(current_user, StudentAuth):
        # Allow bypass in test mode if it's the Dev Admin
        if settings.ENABLE_TEST_MODE and isinstance(current_user, AdminUser):
            # We still need a student object for many student-specific routes.
            # This is risky but helps with UI debugging.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student access required (even in Test Mode).",
            )
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required.",
        )
    return current_user


async def get_current_admin(
    current_user: Union[StudentAuth, AdminUser] = Depends(get_current_user),
) -> AdminUser:
    """Restrict an endpoint to authenticated Admins only."""
    if not isinstance(current_user, AdminUser) or current_user.role != AdminRole.ADMIN:
        # Allow bypass in test mode
        if settings.ENABLE_TEST_MODE:
             # Return the current user as an admin if we're in test mode
             # even if they are a student (treating them as superuser)
             if isinstance(current_user, AdminUser):
                 return current_user
             
             # Create a mock admin from student data if possible
             return AdminUser(
                 id=current_user.id,
                 name=current_user.name,
                 email=current_user.email,
                 role=AdminRole.ADMIN,
                 password_hash="test-mode"
             )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
