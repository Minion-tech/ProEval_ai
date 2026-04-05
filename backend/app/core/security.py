import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from passlib.context import CryptContext

from app.core.config import settings

# 1. Setup Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2. JWT Configuration
ALGORITHM = "HS256"

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Creates a JWT 'Digital Badge' for the user using PyJWT."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default expiry
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    # Payload
    to_encode = {"exp": expire, "sub": str(subject)}
    
    # Sign the token
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if a user's login password matches the scrambled version in the DB."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Scrambles a new password for safe storage in the database."""
    return pwd_context.hash(password)
