import json
import re
from typing import Dict, Any, List
import google.generativeai as genai
from app.agents.base import BaseAgent
from app.core.ai_provider import create_generation_model
from app.skills import build_system_prompt, validate_skill_inputs
from langsmith import traceable

class ArchitectAgent(BaseAgent):
    def __init__(self, client: genai.GenerativeModel, model: str):
        super().__init__(
            name="Architect",
            persona="Senior System Architect & CTO. Expert in technical feasibility, tech-stack trade-offs, and ensuring individual accountability in engineering teams."
        )
        self.client = client
        self.model = model

    @traceable(name="ArchitectAgent.analyze", run_type="chain")
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates technical feasibility and role alignment.
        """
        project_title = data.get("title", "Untitled")
        domain = data.get("domain", "")
        tech_stack = data.get("tech_stack", [])
        objectives = data.get("objectives", [])
        methodology = data.get("methodology", "")
        members = data.get("members", []) # Expecting list of {name, role, skills}

        # 1. Validate Inputs and Build Prompt using Skill Engine
        skill_id = "phase1_feasibility_review"
        validate_skill_inputs(skill_id, data)
        system_prompt = build_system_prompt(self.persona, skill_id)

        user_content = (
            f"Project: {project_title}\n"
            f"Domain: {domain}\n"
            f"Stack: {', '.join(tech_stack)}\n"
            f"Objectives: {json.dumps(objectives)}\n"
            f"Methodology: {methodology}\n"
            f"Team: {json.dumps(members)}"
        )

        model_with_system = create_generation_model(
            model_name=self.model,
            system_instruction=system_prompt,
        )

        # Handle 429 Rate Limits gracefully with a retry loop
        max_retries = 5
        retry_delay = 40
        response = None

        for attempt in range(max_retries):
            try:
                response = await model_with_system.generate_content_async(
                    user_content,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.5,
                        max_output_tokens=4000,
                    )
                )
                break
            except Exception as e:
                err_msg = str(e)
                # Only retry on actual rate limits or resource exhaustion
                if ("429" in err_msg or "ResourceExhausted" in err_msg) and "413" not in err_msg and attempt < max_retries - 1:
                    print(f"DEBUG: ArchitectAgent hit rate limit (429). Retrying in {retry_delay}s... (Attempt {attempt+1})")
                    import asyncio
                    await asyncio.sleep(retry_delay)
                elif "404" in err_msg or "not found" in err_msg.lower():
                    print(f"ERROR: ArchitectAgent model not found: {self.model}. Check GEMINI_MODEL in .env")
                    raise e
                else:
                    print(f"ERROR: ArchitectAgent failed: {err_msg}")
                    raise e

        raw_text = response.text
        try:
            result = self.parse_json_response(raw_text)
        except Exception:
            result = {
                "complexity_perspective": "Medium",
                "is_scope_realistic": True,
                "final_mentor_verdict": "Fallback response: AI output parsing failed.",
                "mentorship_observations": [],
                "technical_guidance": []
            }

        is_realistic = result.get("is_scope_realistic", True)

        return {
            "agent": self.name,
            "verdict": "FEASIBLE" if is_realistic else "REVISE",
            "reasoning": result.get("final_mentor_verdict", ""),
            "findings": result.get("mentorship_observations", []),
            "recommendations": result.get("technical_guidance", []),
            "complexity": result.get("complexity_perspective", "N/A"),
            "skill_growth_areas": result.get("skill_growth_areas", []),
            "raw_log": result
        }
