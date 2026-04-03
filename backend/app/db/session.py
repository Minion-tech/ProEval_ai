from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession    
from app.core.config import settings  

# 1. Create the Async Engine
# We link echo to settings.DEBUG so we don't spam logs in production
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
)

# 2. Create Session Factory
# expire_on_commit=False is crucial for async to prevent "greenlet errors"
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False
)

# 3. Dependency to get DB session in FastAPI routes
# This ensures every request gets its own session and closes it automatically 
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()