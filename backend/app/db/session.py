from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession    
from app.core.config import settings  

# Engine and session factory (lazily initialized)
engine = None
AsyncSessionLocal = None

def get_engine():
    """Lazy initialization of async engine to avoid event loop issues at import time"""
    global engine
    if engine is None:
        # settings.DATABASE_URL is already sanitized of sslmode by its field_validator
        connect_args = {"timeout": 10}
        
        # Check original raw environment variable or original setting to see if SSL was required
        import os
        raw_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
        if "sslmode=require" in raw_url or "sslmode=verify-full" in raw_url or "sslmode=verify-ca" in raw_url or "ssl=require" in raw_url:
            connect_args["ssl"] = True

        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            future=True,
            connect_args=connect_args
        )
    return engine

def get_session_factory():
    """Lazy initialization of session factory"""
    global AsyncSessionLocal
    if AsyncSessionLocal is None:
        AsyncSessionLocal = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            autoflush=False,
            expire_on_commit=False
        )
    return AsyncSessionLocal

# 3. Dependency to get DB session in FastAPI routes
# This ensures every request gets its own session and closes it automatically 
async def get_db():
    async with get_session_factory()() as session:
        yield session