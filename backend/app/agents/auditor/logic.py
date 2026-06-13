import json
import re
from typing import Any, Dict
import google.generativeai as genai
from app.agents.base import BaseAgent
from app.core.ai_provider import create_generation_model
from app.skills import build_system_prompt, validate_skill_inputs
from app.skills.engine import build_skill_payload

class AuditorAgent(BaseAgent):
    def __init__(self, client: genai.GenerativeModel, model: str):
        super().__init__(
            name="Auditor",
            persona="Senior Engineering Auditor. Expert in final compliance, code quality, testing discipline, and contribution verification.",
        )
        self.client = client
        self.model = model

    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        project_title = data.get("title", "Untitled")
        tech_stack = data.get("tech_stack", [])
        final_summary = data.get("final_summary", "")
        individual_contributions = data.get("individual_contributions", [])
        members = data.get("members", [])
        final_report_url = data.get("final_report_url", "")
        presentation_url = data.get("presentation_url", "")
        demo_video_url = data.get("demo_video_url", "")
        repository_url = data.get("github_url", "")
        # Use summarized code if available, fallback to raw context (D in SOLID: Dependency on abstraction)
        github_code_context = data.get("github_code_summary") or data.get("github_code_context", "")

        # 1. Build Payload using Skill Engine (includes deterministic script results)
        skill_id = "phase3_compliance_audit"
        payload = build_skill_payload(self.persona, skill_id, data)
        
        system_prompt = payload["system_prompt"]
        script_results = payload["script_results"]

        # 2. Build User Content, including the deterministic metrics for the LLM to consider
        metrics_context = ""
        if script_results:
            quality = script_results.get("quality_metrics", {})
            metrics_context = (
                "\n--- DETERMINISTIC CODE QUALITY METRICS (FROM GITHUB) ---\n"
                f"Overall Quality Score: {quality.get('overall_quality_score')}/100\n"
                f"Documentation Ratio: {quality.get('metrics', {}).get('documentation_ratio')}\n"
                f"Lint Errors: {quality.get('metrics', {}).get('lint_errors')}\n"
                f"Security Vulnerabilities: {quality.get('metrics', {}).get('security_vulnerabilities')}\n"
                "Findings: " + ", ".join(quality.get("findings", [])) + "\n"
                "----------------------------------------------------------\n"
            )

        user_content = (
            f"Project: {project_title}\n"
            f"Tech Stack: {', '.join(tech_stack)}\n"
            f"Final Report URL: {final_report_url}\n"
            f"Presentation URL: {presentation_url}\n"
            f"Demo Video URL: {demo_video_url or 'Not provided'}\n"
            f"GitHub URL: {repository_url}\n"
            f"Final Summary: {final_summary}\n"
            f"Individual Contributions: {json.dumps(individual_contributions)}\n"
            f"Members: {json.dumps(members)}\n"
            f"{metrics_context}"
        )

        if github_code_context:
            user_content += (
                "\n--- REPOSITORY SOURCE SNAPSHOT ---\n"
                f"{github_code_context}\n"
                "--- END REPOSITORY SOURCE SNAPSHOT ---\n"
            )

        model_with_system = create_generation_model(
            model_name=self.model,
            system_instruction=system_prompt,
        )

        # Let ResilientGenerativeModel handle the fallbacks for 429s.
        # This prevents getting "stuck" in a retry loop on a single provider.
        response = await model_with_system.generate_content_async(
            user_content,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=4000,
            )
        )

        raw_text = response.text
        try:
            result = self.parse_json_response(raw_text)
        except Exception:
            result = {
                "audit_score": 65,
                "verdict": "REVIEW",
                "reasoning": "Fallback response used because Auditor output could not be parsed.",
                "findings": [],
                "recommendations": [],
                "security_findings": [],
                "coverage": {"estimated_percent": 0, "status": "UNKNOWN"},
                "role_alignment": { "summary": "N/A" },
            }

        return {
            "agent": self.name,
            "verdict": result.get("verdict", "REVIEW"),
            "score": result.get("audit_score", 0),
            "reasoning": result.get("reasoning", ""),
            "findings": result.get("findings", []),
            "recommendations": result.get("recommendations", []),
            "security_findings": result.get("security_findings", []),
            "coverage": result.get("coverage", {}),
            "role_alignment": result.get("role_alignment", {}),
            "raw_log": result,
        }
