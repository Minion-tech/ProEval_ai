from typing import Union
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.auth import TokenPayload
from app.core.config import settings
from app.db.Models import Faculty, StudentAuth
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> Union[StudentAuth, Faculty]:
    """
    Resolve the authenticated principal from the JWT subject.

    We support both student and faculty identities because the current system
    uses a shared login endpoint and a shared JWT format.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            raise credentials_exception
        user_id = UUID(token_data.sub)
    except (jwt.InvalidTokenError, ValueError):
        raise credentials_exception

    student_result = await db.execute(
        select(StudentAuth).where(StudentAuth.id == user_id)
    )
    student = student_result.scalar_one_or_none()
    if student:
        return student

    faculty_result = await db.execute(
        select(Faculty).where(Faculty.id == user_id)
    )
    faculty = faculty_result.scalar_one_or_none()
    if faculty:
        return faculty

    raise credentials_exception


async def get_current_student(
    current_user: Union[StudentAuth, Faculty] = Depends(get_current_user),
) -> StudentAuth:
    """Restrict an endpoint to authenticated students only."""
    if not isinstance(current_user, StudentAuth):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required.",
        )
    return current_user


from app.db.Models.users import FacultyRole

async def get_current_faculty(
    current_user: Union[StudentAuth, Faculty] = Depends(get_current_user),
) -> Faculty:
    """Restrict an endpoint to authenticated faculty only."""
    if not isinstance(current_user, Faculty):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty access required.",
        )
    return current_user


async def get_current_admin(
    current_user: Union[StudentAuth, Faculty] = Depends(get_current_user),
) -> Faculty:
    """Restrict an endpoint to authenticated Admins only."""
    if not isinstance(current_user, Faculty) or current_user.role != FacultyRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
