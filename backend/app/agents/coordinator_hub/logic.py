import uuid
from typing import Any, Dict, List
import google.generativeai as genai
from app.agents.architect import ArchitectAgent
from app.agents.auditor import AuditorAgent
from app.agents.ideator import IdeatorAgent
from app.agents.mentor import MentorAgent
from app.db.Models import EvaluationPhase
from app.state_management.project_memory.state import ProjectState

class CoordinatorHub:
    """
    Central router for MAPES.
    It owns phase routing, shared state mutation, and result synthesis.
    """

    def __init__(self, client: genai.GenerativeModel, model: str):
        self.ideator = IdeatorAgent(client, model)
        self.architect = ArchitectAgent(client, model)
        self.mentor = MentorAgent(client, model)
        self.auditor = AuditorAgent(client, model)

    def build_initial_state(
        self,
        *,
        submission_id: uuid.UUID,
        team_id: str,
        phase: str,
        phase_1_data: Dict[str, Any] | None,
        phase_2_data: Dict[str, Any] | None,
        final_data: Dict[str, Any] | None,
        members: List[Dict[str, Any]],
    ) -> ProjectState:
        project_context: Dict[str, Any] = {
            "title": (phase_1_data or {}).get("title", "Untitled"),
            "domain": (phase_1_data or {}).get("domain", ""),
            "abstract": (phase_1_data or {}).get("abstract", ""),
            "tech_stack": (phase_1_data or {}).get("tech_stack", []),
            "github_url": (phase_2_data or {}).get("github_url", ""),
            "presentation_url": (phase_2_data or {}).get("presentation_url", ""),
            "final_summary": (final_data or {}).get("final_summary", ""),
            "individual_contributions": (final_data or {}).get("individual_contributions", []),
            "members": members,
        }

        return {
            "submission_id": submission_id,
            "current_phase": phase,
            "team_id": team_id,
            "phase_1_data": phase_1_data,
            "phase_2_data": phase_2_data,
            "final_data": final_data,
            "project_context": project_context,
            "agent_logs": [],
            "risk_flags": [],
            "recommendations": [],
            "clarification_questions": [],
            "clarification_answers": [],
            "heuristics": {
                "vcs_signals": {},
                "github_activity": {},
                "plagiarism_risks": [],
                "security_findings": [],
                "coverage": {},
                "role_alignment": {},
            },
            "total_score": 0.0,
            "verdict": "PENDING",
            "ai_narrative": "",
            "next_node": "start",
            "errors": [],
            "completed_nodes": [],
            "trace_id": str(uuid.uuid4()),
        }

    async def run_phase(self, state: ProjectState, phase: EvaluationPhase) -> ProjectState:
        if phase == EvaluationPhase.PHASE_1:
            return await self._run_phase_1(state)
        if phase == EvaluationPhase.PHASE_2:
            return await self._run_phase_2(state)
        if phase == EvaluationPhase.FINAL:
            return await self._run_final_phase(state)

        state["errors"].append(f"Unsupported phase: {phase}")
        state["verdict"] = "FAILED"
        state["next_node"] = "error"
        return state

    async def _run_phase_1(self, state: ProjectState) -> ProjectState:
        state["next_node"] = "ideator"
        ideator_result = await self.ideator.analyze(state["phase_1_data"] or {})
        self._record_agent_result(state, "ideator", ideator_result)

        architect_payload = {
            **(state["phase_1_data"] or {}),
            "members": state["project_context"]["members"],
        }

        state["next_node"] = "architect"
        architect_result = await self.architect.analyze(architect_payload)
        self._record_agent_result(state, "architect", architect_result)

        state["clarification_questions"] = ideator_result.get("clarification_questions", [])
        self._finalize_phase_1(state, ideator_result, architect_result)
        return state

    async def _run_phase_2(self, state: ProjectState) -> ProjectState:
        phase_2_payload = {
            **(state["phase_2_data"] or {}),
            "title": state["project_context"].get("title", "Untitled"),
            "tech_stack": state["project_context"].get("tech_stack", []),
            "github_url": state["project_context"].get("github_url", ""),
            "presentation_url": state["project_context"].get("presentation_url", ""),
            "members": state["project_context"].get("members", []),
        }

        state["next_node"] = "mentor"
        mentor_result = await self.mentor.analyze(phase_2_payload)
        self._record_agent_result(state, "mentor", mentor_result)

        state["heuristics"]["github_activity"] = mentor_result.get("github_activity", {})
        state["heuristics"]["plagiarism_risks"] = mentor_result.get("plagiarism_risks", [])
        state["heuristics"]["role_alignment"] = mentor_result.get("role_alignment", {})

        state["total_score"] = float(mentor_result.get("score", 0))
        state["verdict"] = mentor_result.get("verdict", "REVIEW")
        state["ai_narrative"] = self._build_phase_2_narrative(mentor_result)
        state["next_node"] = "complete"
        return state

    async def _run_final_phase(self, state: ProjectState) -> ProjectState:
        final_payload = {
            "title": state["project_context"].get("title", "Untitled"),
            "tech_stack": state["project_context"].get("tech_stack", []),
            "final_summary": state["project_context"].get("final_summary", ""),
            "individual_contributions": state["project_context"].get("individual_contributions", []),
            "members": state["project_context"].get("members", []),
        }

        state["next_node"] = "auditor"
        auditor_result = await self.auditor.analyze(final_payload)
        self._record_agent_result(state, "auditor", auditor_result)

        state["heuristics"]["security_findings"] = auditor_result.get("security_findings", [])
        state["heuristics"]["coverage"] = auditor_result.get("coverage", {})
        state["heuristics"]["role_alignment"] = auditor_result.get("role_alignment", {})

        state["total_score"] = float(auditor_result.get("score", 0))
        state["verdict"] = auditor_result.get("verdict", "REVIEW")
        state["ai_narrative"] = self._build_final_narrative(auditor_result)
        state["next_node"] = "complete"
        return state

    def _record_agent_result(
        self,
        state: ProjectState,
        node_name: str,
        result: Dict[str, Any],
    ) -> None:
        state["agent_logs"].append(result)
        state["completed_nodes"].append(node_name)
        state["risk_flags"].extend(result.get("findings", []))
        state["recommendations"].extend(result.get("recommendations", []))

    def _finalize_phase_1(
        self,
        state: ProjectState,
        ideator_result: Dict[str, Any],
        architect_result: Dict[str, Any],
    ) -> None:
        state["total_score"] = (
            float(ideator_result.get("score", 0)) + float(architect_result.get("score", 0))
        ) / 2

        if state["clarification_questions"]:
            state["verdict"] = "AWAITING_CLARIFICATION"
            state["ai_narrative"] = self._build_clarification_narrative(state["clarification_questions"])
            state["next_node"] = "awaiting_clarification"
            return

        state["verdict"] = "COMPLETED"
        state["ai_narrative"] = self._build_phase_1_narrative(ideator_result, architect_result)
        state["next_node"] = "complete"

    def _build_clarification_narrative(self, questions: List[str]) -> str:
        prompt_narrative = "### Clarification Required\n"
        prompt_narrative += "The agents need a bit more detail before giving a strong industry-grade verdict.\n\n"
        for question in questions:
            prompt_narrative += f"- {question}\n"
        return prompt_narrative

    def _build_phase_1_narrative(
        self,
        ideator_result: Dict[str, Any],
        architect_result: Dict[str, Any],
    ) -> str:
        narrative = (
            f"### {ideator_result['agent']} Audit\n"
            f"**Verdict**: {ideator_result['verdict']}\n"
            f"{ideator_result['reasoning']}\n\n"
            f"**Potential Implementation Timeline**:\n"
        )
        for step in ideator_result.get("timeline", []):
            narrative += f"- **Weeks {step['weeks']}**: {step['goal']}\n"

        narrative += (
            f"\n---\n### {architect_result['agent']} Review\n"
            f"**Verdict**: {architect_result['verdict']}\n"
            f"{architect_result['reasoning']}\n"
        )
        return narrative

    def _build_phase_2_narrative(self, mentor_result: Dict[str, Any]) -> str:
        narrative = (
            f"### {mentor_result['agent']} Progress Review\n"
            f"**Verdict**: {mentor_result['verdict']}\n"
            f"{mentor_result['reasoning']}\n\n"
            f"**Observed Strengths**:\n"
        )
        for finding in mentor_result.get("findings", []):
            narrative += f"- {finding}\n"
        narrative += "\n**Recommendations**:\n"
        for recommendation in mentor_result.get("recommendations", []):
            narrative += f"- {recommendation}\n"
        return narrative

    def _build_final_narrative(self, auditor_result: Dict[str, Any]) -> str:
        narrative = (
            f"## Final Project Audit\n"
            f"### Compliance Verdict: {auditor_result['verdict']}\n"
            f"**Score**: {auditor_result['score']}/100\n\n"
            f"**Key Findings**:\n"
        )
        for finding in auditor_result.get("findings", []):
            narrative += f"- {finding}\n"
        narrative += "\n**Recommendations**:\n"
        for recommendation in auditor_result.get("recommendations", []):
            narrative += f"- {recommendation}\n"
        return narrative
