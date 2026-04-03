from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import projects

#1 intialize the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
)

#2 Set up CORS middleware
#this allows your frontend (e.g, localhost:3000) to make requests to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#3 Include Routers
#we mount the project router under hte /api/v1 prefix
app.include_router(projects.router, prefix=settings.API_V1_STR)

#4  Root endpoint for sanity check
@app.get("/", tags=["Health"])
async def root():
    """Basic health check endpoint to ensure the server is alive"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "version": "2.2-Iterative"
    }