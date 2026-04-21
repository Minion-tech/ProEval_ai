"""
Minimal mock backend for Playwright testing - bypasses database completely.
This runs fast without waiting for PostgreSQL connections.

Run: python mock_backend.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="ProEval Mock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "version": "mock"}

@app.post("/api/v1/auth/register")
async def register(data: dict):
    return {"message": "OTP is temporarily disabled for testing. Continue to verification with any 6-digit code."}

@app.post("/api/v1/auth/verify")
async def verify_otp(data: dict):
    return {
        "access_token": "test_token_" + data.get("email", "user"),
        "token_type": "bearer"
    }

@app.get("/api/v1/auth/me")
async def get_current_user():
    return {
        "id": "test-user-id",
        "name": "Test Student",
        "email": "nabeelakhan74409@gmail.com",
        "role": "STUDENT",
        "department": "CSE",
        "enrollment_no": "12345",
        "programme": "BTECH",
        "batch": "2024"
    }

@app.post("/api/v1/auth/login")
async def login(data: dict):
    return {
        "access_token": "test_token_" + data.get("email", "user"),
        "token_type": "bearer"
    }

@app.get("/api/v1/auth/faculty")
async def list_faculty():
    return [
        {
            "id": "fac-1",
            "name": "Dr. John Smith",
            "email": "john@example.com",
            "role": "FACULTY",
            "department": "CSE"
        },
        {
            "id": "fac-2",
            "name": "Dr. Jane Doe",
            "email": "jane@example.com",
            "role": "FACULTY",
            "department": "CSE"
        }
    ]

@app.get("/api/v1/projects")
async def get_projects():
    return []

@app.post("/api/v1/projects")
async def create_project(data: dict):
    return {"id": "proj-1", "status": "submitted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
