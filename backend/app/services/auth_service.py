import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.db.Models import StudentAuth, Faculty
from app.api.schemas.auth import StudentRegister, OTPVerify
from app.core.security import get_password_hash, verify_password, create_access_token

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
    async def register_student(db: AsyncSession, data: StudentRegister) -> str:
        """
        Handles initial registration:
        1. Checks for existing user.
        2. Generates OTP.
        3. Creates a 'Pending' account (unverified).
        4. (Soon) Sends OTP email.
        """
        # 1. Check for duplicates
        existing = await AuthService.get_student_by_email_or_enrollment(
            db, data.email, data.enrollment_no
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or Enrollment Number already registered."
            )

        # 2. Generate a 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # 3. Store OTP with 5-minute expiry
        # In production, we use Redis for this!
        otp_store[data.email] = {
            "code": otp_code,
            "expiry": datetime.now(timezone.utc) + timedelta(minutes=5),
            "user_data": data # Temporarily store data until verified
        }

        # 4. MOCK: Print OTP to console for testing
        print(f"--- [MOCK EMAIL] ---")
        print(f"To: {data.email}")
        print(f"Subject: Your Verification Code for ProEval")
        print(f"Code: {otp_code}")
        print(f"---------------------")

        return f"A verification code has been sent to {data.email}"

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

        # 3. Check Code
        if stored_data["code"] != data.otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code."
            )

        # 4. Create the Actual User in DB
        user_data: StudentRegister = stored_data["user_data"]
        new_student = StudentAuth(
            name=user_data.name,
            email=user_data.email,
            enrollment_no=user_data.enrollment_no,
            password_hash=get_password_hash(user_data.password),
            programme=user_data.programme,
            department=user_data.department,
            batch=user_data.batch,
            is_verified=True
        )

        db.add(new_student)
        await db.commit()
        await db.refresh(new_student)

        # 5. Cleanup OTP store
        del otp_store[data.email]

        return new_student
