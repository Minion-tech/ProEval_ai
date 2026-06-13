from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class InterviewContextResponse(BaseModel):
    agent_name: str = Field(..., description="Name of the AI agent")
    system_prompt: str = Field(..., description="System prompt for the conversational agent")
    initial_questions: List[str] = Field(..., description="List of 3-5 technical questions")
    student_name: Optional[str] = None
    student_role: Optional[str] = None

class InterviewResultPayload(BaseModel):
    transcript: str = Field(..., description="Full text transcript of the interview")
    telemetry: dict = Field(default_factory=dict, description="Anti-cheat telemetry data (gaze tracking, etc.)")

class InterviewResultResponse(BaseModel):
    status: str
    message: str
    flags: List[str] = Field(default_factory=list, description="Any integrity flags raised during the session")
