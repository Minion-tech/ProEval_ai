import json
import re
from typing import Dict, Any, List
import google.generativeai as genai
from app.agents.base import BaseAgent
from app.core.ai_provider import create_generation_model
from app.skills import build_system_prompt, validate_skill_inputs
from langsmith import traceable

class IdeatorAgent(BaseAgent):
    def __init__(self, client: genai.GenerativeModel, model: str):
        super().__init__(
            name="Ideator",
            persona="Senior Innovation Strategist & Startup Mentor. Expert in identifying generic tutorial clones and architecting unique value propositions."
        )
        self.client = client  # This is a GenerativeModel instance
        self.model = model

    @traceable(name="IdeatorAgent.analyze", run_type="chain")
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes Phase 1 proposal for originality, logic (including vision), and generates a 12-week timeline.
        """
        project_title = data.get("title", "Untitled")
        project_abstract = data.get("abstract", "")
        domain = data.get("domain", "")
        objectives = data.get("objectives", [])
        methodology = data.get("methodology", "")
        use_case_diagram = data.get("use_case_diagram", "")
        tech_stack = data.get("tech_stack", [])

        # 1. Validate Inputs and Build Prompt using Skill Engine
        skill_id = "phase1_originality_check"
        validate_skill_inputs(skill_id, data)
        system_prompt = build_system_prompt(self.persona, skill_id)

        # 2. Build User Content
        text_content = (
            f"Project Title: {project_title}\n"
            f"Abstract: {project_abstract}\n"
            f"Domain: {domain}\n"
            f"Objectives: {json.dumps(objectives)}\n"
            f"Methodology: {methodology}\n"
            f"Tech Stack: {', '.join(tech_stack)}\n"
            "Please analyze the attached Use Case Diagram (if provided) along with the text above."
        )
        clarification_answers = data.get("clarification_answers") or []
        if clarification_answers:
            text_content += "\n\nClarification Answers:\n"
            for idx, answer in enumerate(clarification_answers, start=1):
                text_content += f"{idx}. {answer}\n"
            text_content += (
                "\nFor each answer above, evaluate whether the student is thinking in the right direction, "
                "identify any important missing detail, and state whether the answer should be refined or is sufficient."
            )

        contents = [text_content]

        # Check if use_case_diagram is a base64 image
        if isinstance(use_case_diagram, str) and use_case_diagram.startswith("data:image/"):
            try:
                # Extract media type and base64 data
                header, base64_data = use_case_diagram.split(",", 1)
                media_type = header.split(";")[0].split(":")[1]
                
                contents.append({
                    "mime_type": media_type,
                    "data": base64_data,
                })
            except Exception as e:
                contents.append(f"\n[Note: Use Case Diagram was provided but failed to decode: {e}]")
        elif use_case_diagram:
             contents.append(f"\nUse Case Diagram Description: {use_case_diagram}")

        # Gemini doesn't have a direct "system" parameter in generate_content_async if the model was already initialized.
        # However, we can create a new model instance with the system_instruction or prepend it.
        # Re-initializing is fine since it's lightweight.
        model_with_system = create_generation_model(
            model_name=self.model,
            system_instruction=system_prompt,
        )

        # Handle 429 Rate Limits gracefully with a retry loop
        max_retries = 5
        retry_delay = 15
        response = None

        for attempt in range(max_retries):
            try:
                response = await model_with_system.generate_content_async(
                    contents,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=4000,
                    )
                )
                break
            except Exception as e:
                err_msg = str(e)
                # Only retry on actual rate limits or resource exhaustion
                if ("429" in err_msg or "ResourceExhausted" in err_msg) and "413" not in err_msg and attempt < max_retries - 1:
                    print(f"DEBUG: IdeatorAgent hit rate limit (429). Retrying in {retry_delay}s... (Attempt {attempt+1})")
                    import asyncio
                    await asyncio.sleep(retry_delay)
                elif "404" in err_msg or "not found" in err_msg.lower():
                    print(f"ERROR: IdeatorAgent model not found: {self.model}. Check GEMINI_MODEL in .env")
                    raise e
                else:
                    print(f"ERROR: IdeatorAgent failed: {err_msg}")
                    raise e

        raw_text = response.text
        # Extract JSON from potential conversational filler
        try:
            result = self.parse_json_response(raw_text)
        except Exception as exc:
            # Fallback if AI fails JSON
            result = {
                "verdict": "PASSED",
                "summary": f"Error parsing agent response. Manual review suggested. Parser error: {str(exc)}",
                "concerns": ["AI response parsing failed"],
                "student_alerts": [],
                "improvement_actions": [],
                "clarification_questions": [],
                "timeline": []
            }

        # 3. Process Qualitative Results
        verdict = result.get("verdict", "PASSED")
        # 3a. Evaluate clarification answers if provided
        clarification_evaluations = []
        clarification_answers = data.get("clarification_answers") or []
        # Prefer AI-provided clarification_feedback if the model returns it.
        clarification_feedback = result.get("clarification_feedback") or result.get("clarification_evaluations") or []
        if clarification_feedback and isinstance(clarification_feedback, list):
            for item in clarification_feedback:
                if isinstance(item, dict):
                    clarification_evaluations.append({
                        "question_index": item.get("question_index"),
                        "answer": item.get("answer"),
                        "viability": item.get("viability", "REFINE"),
                        "notes": item.get("notes", "Needs improvement or more detail."),
                    })
                else:
                    clarification_evaluations.append({
                        "question_index": None,
                        "answer": None,
                        "viability": "REFINE",
                        "notes": str(item),
                    })
        elif clarification_answers:
            for idx, ans in enumerate(clarification_answers, start=1):
                note = "This answer needs more detail; be explicit about the user, the problem being solved, and the expected outcome."
                viability = "REFINE"
                if isinstance(ans, str):
                    trimmed = ans.strip()
                    if len(trimmed) >= 80:
                        viability = "PASS"
                        note = "This answer is on the right track. Strengthen it by tying the response directly to the project goal and user impact."
                    elif len(trimmed) >= 40:
                        viability = "REFINE"
                        note = "The answer suggests a reasonable direction, but it is still too general. Add a more concrete benefit or next step."
                    else:
                        viability = "REFINE"
                        note = "The response is too brief. Expand it with a clearer explanation of what you will deliver and why it matters."
                clarification_evaluations.append({
                    "question_index": idx,
                    "answer": ans,
                    "viability": viability,
                    "notes": note,
                })

        return {
            "agent": self.name,
            "verdict": verdict,
            "reasoning": result.get("summary", ""),
            "findings": result.get("concerns", []),
            "use_case_feedback": {"feedback": result.get("student_alerts", [])},
            "clarification_questions": result.get("clarification_questions", []),
            "timeline": result.get("timeline", []),
            "clarification_evaluations": clarification_evaluations,
            "common_project_details": {
                "verdict": verdict,
                "improvement_actions": result.get("improvement_actions", [])
            },
            "raw_log": result # For database storage
        }
