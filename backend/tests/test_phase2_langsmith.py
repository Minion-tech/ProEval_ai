import asyncio
import uuid
import os
import google.generativeai as genai
from app.agents.coordinator_hub import CoordinatorHub
from app.core.config import settings
from app.db.Models import EvaluationPhase

# Initialize Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
client = genai.GenerativeModel(model_name=settings.GEMINI_MODEL)

async def test_phase2_flow():
    """
    Tests the Phase 2 (Mentor) flow through the CoordinatorHub.
    This will generate traces in LangSmith.
    """
    print("🚀 Starting Phase 2 LangSmith Test...")
    
    hub = CoordinatorHub(client, settings.GEMINI_MODEL)
    
    # 1. Prepare Mock Phase 2 State
    submission_id = uuid.uuid4()
    team_id = "test-team-456"
    
    phase_1_data = {
        "title": "AI-Powered Plant Disease Detector",
        "domain": "Agri-Tech / Computer Vision",
        "abstract": "A mobile app that identifies crop diseases using leaf images.",
        "objectives": ["Predict demand", "Optimize distribution"],
        "tech_stack": ["Python", "TensorFlow", "React Native", "FastAPI"]
    }
    
    phase_2_data = {
        "github_url": "https://github.com/student-team/plant-detector-ai",
        "presentation_url": "https://gamma.app/public/mid-term-presentation-abc123",
        "progress_notes": (
            "We have completed the image preprocessing pipeline and integrated the TensorFlow Lite model. "
            "Current focus is on the mobile UI and backend API connection. All members are active."
        )
    }
    
    members = [
        {"name": "Alice", "role": "ML Engineer", "skills": "Python, TensorFlow"},
        {"name": "Bob", "role": "Fullstack Developer", "skills": "React Native, FastAPI"}
    ]
    
    state = hub.build_initial_state(
        submission_id=submission_id,
        team_id=team_id,
        phase="PHASE_2",
        phase_1_data=phase_1_data,
        phase_2_data=phase_2_data,
        final_data=None,
        members=members
    )
    
    # 2. Run Phase 2 Analysis
    print(f"--- Running Mentor Analysis (Phase 2) ---")
    final_state = await hub.run_phase(state, EvaluationPhase.PHASE_2)
    
    # 3. Print Results
    print("\n✅ Phase 2 Analysis Complete!")
    print(f"Verdict: {final_state['verdict']}")
    print(f"Score: {final_state['total_score']}")
    print("\n--- AI Narrative ---")
    print(final_state['ai_narrative'])
    
    print("\n--- Heuristics (Deterministic Signals) ---")
    print(f"GitHub Activity: {final_state['heuristics']['github_activity']}")
    
    print(f"\n🔗 Check LangSmith for the 'CoordinatorHub._run_phase_2' and 'MentorAgent.analyze' traces.")

if __name__ == "__main__":
    # Ensure environment variables are set for LangSmith
    # Expected: LANGCHAIN_TRACING_V2=true, LANGCHAIN_API_KEY=...
    if not os.getenv("LANGCHAIN_API_KEY"):
        print("⚠️ Warning: LANGCHAIN_API_KEY not found. Traces will not be sent to LangSmith.")
    
    asyncio.run(test_phase2_flow())
