import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.api.schemas.auth import StudentRegister, OTPVerify
from app.services.auth_service import AuthService, otp_store
from app.db.Models.users import ProgrammeType

# 1. Setup DB for testing
engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def run_manual_test():
    async with AsyncSessionLocal() as db:
        print("--- [TEST 1: Registration] ---")
        test_data = StudentRegister(
            name="Test Student",
            email="test_student@university.edu",
            enrollment_no="TEST-2026-001",
            password="securepassword123",
            programme=ProgrammeType.BTECH,
            department="Computer Science",
            batch="2024-2028"
        )
        
        try:
            message = await AuthService.register_student(db, test_data)
            print(f"SUCCESS: {message}")
            
            # 2. Grab OTP from mock store
            otp_info = otp_store.get(test_data.email)
            if not otp_info:
                print("FAILURE: OTP not found in store!")
                return
            
            otp_code = otp_info["code"]
            print(f"DEBUG: Found OTP in memory: {otp_code}")
            
            print("\n--- [TEST 2: Verification] ---")
            verify_data = OTPVerify(
                email=test_data.email,
                otp_code=otp_code
            )
            
            new_user = await AuthService.verify_otp_and_create_user(db, verify_data)
            print(f"SUCCESS: User created in DB with ID: {new_user.id}")
            print(f"Verification Status: {new_user.is_verified}")
            
        except Exception as e:
            print(f"ERROR DURING TEST: {str(e)}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_manual_test())
