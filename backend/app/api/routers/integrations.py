import hmac
import hashlib
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Dict, Any

from app.db.session import get_db
from app.db.Models import StudentAuth
from app.services.interview_service import InterviewService
from app.services.project_service import ProjectService
from app.core.config import settings

router = APIRouter(prefix="/integrations", tags=["Integrations"])

# Simple in-memory store to map ElevenLabs Agent requests to the correct Submission ID
# Key: The "call_id" or a "session_token" provided by the frontend
# Value: The actual submission_id UUID string
ACTIVE_SESSIONS: Dict[str, str] = {}

class SessionRegisterRequest(BaseModel):
    submission_id: str
    session_token: str

@router.post("/register-session")
async def register_interview_session(request: SessionRegisterRequest):
    """
    Called by the frontend BEFORE starting the ElevenLabs call.
    This links a simple token to the complex submission UUID.
    """
    ACTIVE_SESSIONS[request.session_token] = request.submission_id
    print(f"DEBUG [ElevenLabs Session]: Registered session {request.session_token} -> {request.submission_id}")
    return {"status": "registered"}

@router.post("/elevenlabs/project-context")
async def get_elevenlabs_project_context(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint for ElevenLabs Tool.
    Bypasses AI parameter hallucination by looking up the session_token in ACTIVE_SESSIONS.
    """
    try:
        body = await request.json()
        print(f"DEBUG [ElevenLabs Tool]: Received body: {body}")
    except Exception:
        body = {}

    # Find the session_token passed by the frontend
    session_token = None
    if "dynamic_variables" in body:
        session_token = body["dynamic_variables"].get("session_token")
        
    if not session_token:
        print("DEBUG [ElevenLabs Tool]: No session_token found in dynamic_variables. Trying headers/parameters.")
        # Fallback if AI tried to pass it directly
        if "parameters" in body:
            session_token = body["parameters"].get("session_token")

    if not session_token or session_token not in ACTIVE_SESSIONS:
        print(f"DEBUG [ElevenLabs Tool]: Unregistered or missing session_token: '{session_token}'")
        # Return generic data instead of crashing, so the call can at least proceed
        return {
            "user_name": "Student",
            "user_role": "Developer",
            "project_details": "Please ask the student to describe their project, as I could not load the specific details.",
            "interview_questions": ["What is the main goal of your project?", "What technologies did you use?"],
            "formatted_text": "Generic Interview Context"
        }

    # Retrieve the real submission_id from our backend memory
    real_submission_id_str = ACTIVE_SESSIONS[session_token]
    print(f"DEBUG [ElevenLabs Tool]: Mapped session {session_token} to Submission ID: {real_submission_id_str}")

    try:
        submission_uuid = UUID(real_submission_id_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid mapped UUID.")

    submission = await ProjectService.get_submission_by_id(db, submission_uuid)
    if not submission:
        raise HTTPException(status_code=404, detail="Project not found")

    leader_result = await db.execute(select(StudentAuth).where(StudentAuth.id == submission.leader_id))
    leader = leader_result.scalar_one_or_none()
    
    if not leader:
        raise HTTPException(status_code=404, detail="Project leader not found")

    context = await InterviewService.get_interview_context(db, submission_uuid, leader)
    
    return {
        "user_name": leader.name,
        "user_role": context.get("student_role", "Developer"),
        "project_details": context.get("project_summary", "A technical project."),
        "interview_questions": context.get("initial_questions", []),
        "formatted_text": f"Interviewing {leader.name}. Project: {context.get('project_summary')}"
    }

@router.post("/elevenlabs/webhook")
async def handle_elevenlabs_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    elevenlabs_signature: str = Header(None, alias="ElevenLabs-Signature"),
):
    """
    Webhook receiver for ElevenLabs post-call data.
    Verified using HMAC signature.
    """
    print(f"!!! [ElevenLabs Webhook] RECEIVED HIT AT {datetime.now()}")
    # 1. Verify Signature
    body = await request.body()
    print(f"!!! [ElevenLabs Webhook] BODY LENGTH: {len(body)}")
    
    if settings.ELEVENLABS_WEBHOOK_SECRET:
        if not elevenlabs_signature:
            raise HTTPException(status_code=401, detail="Missing ElevenLabs-Signature header")
            
        mac = hmac.new(
            settings.ELEVENLABS_WEBHOOK_SECRET.encode(),
            msg=body,
            digestmod=hashlib.sha256
        )
        expected_signature = mac.hexdigest()
        
        if not hmac.compare_digest(expected_signature, elevenlabs_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    # 2. Parse Payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # 3. Extract Call Metadata
    call_data = payload.get("call", {})
    results = payload.get("data_collection_results", {})
    
    # 4. Get Submission ID from dynamic variables passed in the call
    dynamic_vars = call_data.get("variables", {})
    submission_id_str = dynamic_vars.get("submission_id")
    
    if not submission_id_str:
        return {"status": "ignored", "reason": "no_submission_id"}

    try:
        submission_id = UUID(submission_id_str)
    except ValueError:
        return {"status": "error", "message": "invalid_uuid"}

    # 5. Process Transcript
    transcript_list = payload.get("transcript", [])
    formatted_transcript = ""
    for entry in transcript_list:
        role = "Student" if entry.get("role") == "user" else "AI"
        msg = entry.get("message", "")
        formatted_transcript += f"{role}: {msg}\n"

    # 6. Map ElevenLabs Data Points to our Feedback Template
    summary = results.get("evaluation_summary", "Viva completed successfully.")
    score = results.get("technical_score", 70)
    strengths = results.get("key_strengths", "Not specified.")
    improvement = results.get("improvement_plan", "Continue practicing technical communication.")
    
    # New Data Points
    student_name = results.get("student_name", "Student")
    project_title = results.get("project_title", "Project")
    challenges = results.get("project_challenges_summary", "No challenges noted.")
    tech_notes = results.get("technical_assesment_notes", "No detailed notes provided.")

    # 7. Build HTML Narrative for the Feedback Page
    ai_narrative = f"""
    <div class="viva-report space-y-6">
        <div class="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest">Candidate</h3>
                <p class="text-xl font-bold text-slate-900">{student_name}</p>
            </div>
            <div class="text-right">
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest">Project</h3>
                <p class="text-lg font-medium text-slate-700">{project_title}</p>
            </div>
        </div>

        <div class="p-6 bg-violet-50 rounded-2xl border border-violet-100 shadow-sm">
            <h3 class="text-lg font-bold text-violet-900 mb-2">Final Viva Summary</h3>
            <p class="text-slate-700 leading-relaxed font-medium">{summary}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <div class="p-5 bg-green-50 rounded-xl border border-green-100">
                    <h4 class="font-bold text-green-800 mb-2">Key Strengths</h4>
                    <p class="text-sm text-slate-600 leading-relaxed">{strengths}</p>
                </div>
                <div class="p-5 bg-orange-50 rounded-xl border border-orange-100">
                    <h4 class="font-bold text-orange-800 mb-2">Areas for Growth</h4>
                    <p class="text-sm text-slate-600 leading-relaxed">{improvement}</p>
                </div>
            </div>
            
            <div class="p-5 bg-blue-50 rounded-xl border border-blue-100">
                <h4 class="font-bold text-blue-800 mb-2">Project Challenges & Solutions</h4>
                <p class="text-sm text-slate-600 leading-relaxed italic">"{challenges}"</p>
            </div>
        </div>

        <div class="p-6 bg-white rounded-2xl border border-slate-200">
            <h4 class="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
                Technical Assessment Notes
            </h4>
            <div class="text-sm text-slate-600 space-y-2 whitespace-pre-wrap">
                {tech_notes}
            </div>
        </div>

        <div class="mt-8">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                Interview Transcript
                <span class="text-[10px] normal-case font-medium">Session ID: {call_data.get('call_id', 'N/A')}</span>
            </h4>
            <div class="max-h-80 overflow-y-auto p-5 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed">
                {formatted_transcript.replace('\n', '<br/>')}
            </div>
        </div>
    </div>
    """

    # 8. Save to Database
    await InterviewService.process_interview_results(db, submission_id, {
        "transcript": formatted_transcript,
        "ai_narrative": ai_narrative,
        "total_score": score,
        "telemetry": {"webhook_call_id": call_data.get("call_id")}
    })

    return {"status": "success"}

