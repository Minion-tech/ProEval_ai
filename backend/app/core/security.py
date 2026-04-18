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
    # Bcrypt has a 72-byte limit. We truncate to 72 bytes safely.
    pwd_bytes = plain_password.encode("utf-8")
    if len(pwd_bytes) > 72:
        plain_password = pwd_bytes[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Scrambles a new password for safe storage. Truncates to 72 bytes for bcrypt."""
    # Bcrypt has a 72-byte limit. We truncate to 72 bytes safely.
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > 72:
        password = pwd_bytes[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(password)
