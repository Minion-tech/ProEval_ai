import json
import re
from typing import Dict, Any, List
import google.generativeai as genai
from app.agents.base import BaseAgent
from app.core.ai_provider import create_generation_model
from app.skills import build_system_prompt, validate_skill_inputs
from app.skills.engine import build_skill_payload
from langsmith import traceable

class MentorAgent(BaseAgent):
    def __init__(self, client: genai.GenerativeModel, model: str):
        super().__init__(
            name="Mentor",
            persona="Technical Lead & Hackathon Judge. Expert in pitching complex solutions and delivering high-impact prototypes."
        )
        self.client = client
        self.model = model

    @traceable(name="MentorAgent.analyze", run_type="chain")
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates execution quality during Phase 2.
        """
        project_title = data.get("title", "Untitled")
        tech_stack = data.get("tech_stack", [])
        github_url = data.get("github_url", "")
        presentation_url = data.get("presentation_url", "")
        progress_notes = data.get("progress_notes", "")
        presentation_summary = data.get("presentation_summary", "")
        members = data.get("members", [])
        github_code_summary = data.get("github_code_summary", "")
        github_code_context = data.get("github_code_context", "")

        # 1. Build Payload using Skill Engine (includes deterministic script results)
        skill_id = "phase2_execution_monitor"
        payload = build_skill_payload(self.persona, skill_id, data)
        
        system_prompt = payload["system_prompt"]
        script_results = payload["script_results"]

        # 2. Build User Content with metrics
        metrics_context = ""
        if script_results:
            quality = script_results.get("quality_metrics", {})
            metrics_context = (
                "\n--- EARLY CODE QUALITY SIGNALS (FROM GITHUB) ---\n"
                f"Overall Quality Score: {quality.get('overall_quality_score')}/100\n"
                f"Lint Errors: {quality.get('metrics', {}).get('lint_errors')}\n"
                f"Findings: " + ", ".join(quality.get("findings", [])) + "\n"
                "--------------------------------------------------\n"
            )

        user_content = (
            f"Project: {project_title}\n"
            f"Tech Stack: {', '.join(tech_stack)}\n"
            f"GitHub URL: {github_url}\n"
            f"Presentation: {presentation_summary or presentation_url or 'Not provided'}\n"
            f"Progress Notes: {progress_notes}\n"
            f"Members: {json.dumps(members)}\n"
            f"{metrics_context}"
        )

        if github_code_summary:
            user_content += (
                "\n--- REPOSITORY CODE SUMMARY ---\n"
                f"{github_code_summary}\n"
                "--- END REPOSITORY CODE SUMMARY ---\n"
            )
        elif github_code_context:
            user_content += (
                "\n--- REPOSITORY SOURCE SNAPSHOT ---\n"
                f"{github_code_context}\n"
                "--- END REPOSITORY SOURCE SNAPSHOT ---\n"
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
                        temperature=0.3,
                        max_output_tokens=4000,
                    )
                )
                break
            except Exception as e:
                err_msg = str(e)
                if ("429" in err_msg or "ResourceExhausted" in err_msg) and attempt < max_retries - 1:
                    print(f"DEBUG: MentorAgent hit rate limit (429). Retrying in {retry_delay}s... (Attempt {attempt+1})")
                    import asyncio
                    await asyncio.sleep(retry_delay)
                elif "404" in err_msg or "not found" in err_msg.lower():
                    print(f"ERROR: MentorAgent model not found: {self.model}. Check GEMINI_MODEL in .env")
                    raise e
                else:
                    print(f"ERROR: MentorAgent failed: {err_msg}")
                    raise e

        raw_text = response.text
        try:
            result = self.parse_json_response(raw_text)
        except Exception:
            result = {
                "execution_score": 60,
                "verdict": "AT_RISK",
                "reasoning": "Fallback response used because Mentor output could not be parsed.",
                "strengths": [],
                "recommendations": [],
                "plagiarism_risks": [],
                "github_activity": {},
                "role_alignment": {},
            }

        return {
            "agent": self.name,
            "verdict": result.get("verdict", "AT_RISK"),
            "score": result.get("execution_score", 0),
            "reasoning": result.get("reasoning", ""),
            "findings": result.get("strengths", []),
            "recommendations": result.get("recommendations", []),
            "plagiarism_risks": result.get("plagiarism_risks", []),
            "github_activity": result.get("github_activity", {}),
            "role_alignment": result.get("role_alignment", {}),
            "raw_log": result,
        }

    @traceable(name="MentorAgent.hackathon_audit", run_type="chain")
    async def hackathon_audit(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes project presentation/pitch for hackathon-readiness.
        """
        project_title = data.get("title", "Untitled")
        final_summary = data.get("final_summary", "")
        tech_stack = data.get("tech_stack", [])
        individual_contributions = data.get("individual_contributions", "")
        final_report_url = data.get("final_report_url", "")
        presentation_url = data.get("presentation_url", "")
        presentation_summary = data.get("presentation_summary", "")
        repository_url = data.get("github_url", "")
        demo_video_url = data.get("demo_video_url", "")
        github_code_summary = data.get("github_code_summary", "")
        github_code_context = data.get("github_code_context", "")

        # 1. Validate and Build Prompt
        skill_id = "final_hackathon_readiness"
        validate_skill_inputs(skill_id, data)
        system_prompt = build_system_prompt(self.persona, skill_id)

        user_content = (
            f"Project: {project_title}\n"
            f"Summary: {final_summary}\n"
            f"Tech: {', '.join(tech_stack)}\n"
            f"Final Report URL: {final_report_url}\n"
            f"Presentation: {presentation_summary or presentation_url or 'Not provided'}\n"
            f"GitHub URL: {repository_url}\n"
            f"Demo Video URL: {demo_video_url or 'Not provided'}\n"
            f"Contributions: {individual_contributions}"
        )

        if github_code_summary:
            user_content += (
                "\n\n--- REPOSITORY CODE SUMMARY ---\n"
                f"{github_code_summary}\n"
                "--- END REPOSITORY CODE SUMMARY ---\n"
            )
        elif github_code_context:
            user_content += (
                "\n\n--- REPOSITORY SOURCE SNAPSHOT ---\n"
                f"{github_code_context}\n"
                "--- END REPOSITORY SOURCE SNAPSHOT ---\n"
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
                        temperature=0.3,
                        max_output_tokens=4000,
                    )
                )
                break
            except Exception as e:
                err_msg = str(e)
                if ("429" in err_msg or "ResourceExhausted" in err_msg) and attempt < max_retries - 1:
                    print(f"DEBUG: MentorAgent hit rate limit (429). Retrying in {retry_delay}s... (Attempt {attempt+1})")
                    import asyncio
                    await asyncio.sleep(retry_delay)
                elif "404" in err_msg or "not found" in err_msg.lower():
                    print(f"ERROR: MentorAgent model not found: {self.model}. Check GEMINI_MODEL in .env")
                    raise e
                else:
                    print(f"ERROR: MentorAgent failed: {err_msg}")
                    raise e

        raw_text = response.text
        try:
            result = self.parse_json_response(raw_text)
        except Exception:
            result = {"readiness_score": 75, "verdict": "Good potential", "strengths": [], "improvements": []}

        return {
            "agent": self.name,
            "verdict": result.get("verdict", ""),
            "score": result.get("readiness_score", 0),
            "findings": result.get("strengths", []),
            "recommendations": result.get("improvements", []),
            "raw_log": result
        }
