import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.db.Models import StudentAuth, Faculty, ProgrammeType, PreApprovedStudent
from app.api.schemas.auth import StudentRegister, OTPVerify
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.email_service import EmailService

# Mock Redis Store (We can implement real Redis later)
# key: email, value: {code: str, expiry: datetime}
otp_store = {}

class AuthService:
    @staticmethod
    async def get_student_by_email_or_enrollment(
        db: AsyncSession, 
        email: str, 
        enrollment_no: str
    ) -> Optional[StudentAuth]:
        """Finds a student by their email or enrollment number."""
        query = select(StudentAuth).where(
            or_(
                StudentAuth.email == email,
                StudentAuth.enrollment_no == enrollment_no
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_faculty_by_email(db: AsyncSession, email: str) -> Optional[Faculty]:
        """Finds a faculty member by their email."""
        query = select(Faculty).where(Faculty.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_faculty(db: AsyncSession) -> list[Faculty]:
        """Returns a list of all faculty members (potential guides)."""
        query = select(Faculty).order_by(Faculty.name)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    def _normalize_programme(p: str) -> ProgrammeType:
        """Helper to convert common strings like 'B.Tech' to 'BTECH' enum."""
        # Convert to upper, remove dots and spaces
        p_clean = p.upper().replace(".", "").replace(" ", "")
        try:
            return ProgrammeType(p_clean)
        except ValueError:
            # Fallback to BTECH
            return ProgrammeType.BTECH

    @staticmethod
    async def register_student(db: AsyncSession, data: StudentRegister) -> str:
        """
        Handles initial registration:
        1. Checks for existing user.
        2. Checks whitelist.
        3. Generates OTP.
        4. Sends OTP email.
        """
        # 1. Check if student is in the Pre-Approved whitelist (skipped in dev/test mode)
        approved_student = None
        if settings.OTP_ENABLED:
            whitelist_query = select(PreApprovedStudent).where(
                PreApprovedStudent.enrollment_no == data.enrollment_no
            )
            whitelist_result = await db.execute(whitelist_query)
            approved_student = whitelist_result.scalar_one_or_none()

            if not approved_student:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your enrollment number is not in the pre-approved list. Please contact Admin."
                )

            if approved_student.is_registered:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This enrollment number has already been used to create an account."
                )

        # 2. Check for duplicates
        existing = await AuthService.get_student_by_email_or_enrollment(
            db, data.email, data.enrollment_no
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or Enrollment Number already registered."
            )

        # 3. Generate a 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # 4. Store OTP with 5-minute expiry
        # In production, we use Redis for this!
        otp_store[data.email] = {
            "code": otp_code,
            "expiry": datetime.now(timezone.utc) + timedelta(minutes=5),
            "user_data": data # Temporarily store data until verified
        }

        # 5. Send OTP email only when OTP is enabled
        if settings.OTP_ENABLED:
            try:
                await EmailService.send_otp_email(data.email, otp_code)
            except Exception as e:
                # If email fails, cleanup and re-raise
                if data.email in otp_store:
                    del otp_store[data.email]
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email. Please try again."
                )
            return f"A verification code has been sent to {data.email}"

        return "OTP is temporarily disabled for testing. Continue to verification with any 6-digit code."

    @staticmethod
    async def verify_otp_and_create_user(db: AsyncSession, data: OTPVerify) -> StudentAuth:
        """
        Verifies the OTP and finally creates the user in the database.
        """
        # 1. Find OTP in store
        if data.email not in otp_store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification session expired or not found."
            )

        stored_data = otp_store[data.email]
        
        # 2. Check Expiry
        if datetime.now(timezone.utc) > stored_data["expiry"]:
            del otp_store[data.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired. Please register again."
            )

        # 3. Check Code only when OTP is enabled
        if settings.OTP_ENABLED and stored_data["code"] != data.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code."
            )

        # 4. Mark as registered in Whitelist (skipped in dev/test mode)
        user_data: StudentRegister = stored_data["user_data"]

        if settings.OTP_ENABLED:
            whitelist_query = select(PreApprovedStudent).where(
                PreApprovedStudent.enrollment_no == user_data.enrollment_no
            )
            whitelist_result = await db.execute(whitelist_query)
            approved_student = whitelist_result.scalar_one_or_none()

            if not approved_student or approved_student.is_registered:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Authorization failed. Whitelist error."
                )

            approved_student.is_registered = True
            db.add(approved_student)

        # 5. Create the Actual User in DB
        # Normalize programme string to Enum
        programme_enum = AuthService._normalize_programme(user_data.programme)

        new_student = StudentAuth(
            name=user_data.name,
            email=user_data.email,
            enrollment_no=user_data.enrollment_no,
            password_hash=get_password_hash(user_data.password),
            programme=programme_enum,
            department=user_data.department,
            batch=user_data.batch,
            is_verified=True
        )

        db.add(new_student)
        await db.commit()
        await db.refresh(new_student)

        # 6. Send welcome email (don't fail the registration if this fails)
        try:
            await EmailService.send_welcome_email(user_data.email, user_data.name)
        except Exception as e:
            # Log the error but don't fail registration
            print(f"Failed to send welcome email to {user_data.email}: {e}")

        # 7. Cleanup OTP store
        del otp_store[data.email]

        return new_student
