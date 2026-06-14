from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession    
from app.core.config import settings  

# Engine and session factory (lazily initialized)
engine = None
AsyncSessionLocal = None

def get_engine():
    """Lazy initialization of async engine to avoid event loop issues at import time"""
    global engine
    if engine is None:
        url = settings.DATABASE_URL
        connect_args = {"timeout": 10}
        
        # asyncpg doesn't support 'sslmode' in the connection string.
        # This commonly happens when using hosted DBs like Neon, Supabase, or AWS.
        if "postgresql+asyncpg" in url and "sslmode=" in url:
            import re
            # If sslmode is require or similar, we enable SSL in connect_args
            if "sslmode=require" in url or "sslmode=verify-full" in url or "sslmode=verify-ca" in url:
                connect_args["ssl"] = True
            
            # Strip sslmode from the URL query string
            url = re.sub(r"(\?|&)sslmode=[^&]*", "", url)
            # Clean up potential trailing '?' or '&'
            url = url.replace("?&", "?").rstrip("?").rstrip("&")

        engine = create_async_engine(
            url,
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