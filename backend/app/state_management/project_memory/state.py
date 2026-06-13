from typing import TypedDict, List, Dict, Any, Optional
import uuid


class MemberSnapshot(TypedDict, total=False):
    student_id: str
    name: str
    role: str
    functions: str
    modules: str
    work_description: Optional[str]
    tech_stack: Optional[str]


class ProjectContext(TypedDict, total=False):
    title: str
    domain: str
    abstract: str
    tech_stack: List[str]
    github_url: str
    final_summary: str
    individual_contributions: Any
    members: List[MemberSnapshot]


class HeuristicSignals(TypedDict, total=False):
    vcs_signals: Dict[str, Any]
    github_activity: Dict[str, Any]
    plagiarism_risks: List[str]
    security_findings: List[str]
    coverage: Dict[str, Any]
    role_alignment: Dict[str, Any]


class ProjectState(TypedDict):
    """
    Centralized LangGraph state for ProEval_ai.
    Maintains context across Phase 1, 1.5, 2, and 3.
    """
    submission_id: uuid.UUID
    current_phase: str
    team_id: str
    phase_1_data: Optional[Dict[str, Any]]
    phase_2_data: Optional[Dict[str, Any]]
    final_data: Optional[Dict[str, Any]]

    # Shared project context between agents
    project_context: ProjectContext
    agent_logs: List[Dict[str, Any]]
    risk_flags: List[str]
    recommendations: List[str]
    clarification_questions: List[str]
    clarification_answers: List[Dict[str, str]]
    heuristics: HeuristicSignals

    # Evaluation outcomes
    total_score: float
    verdict: str
    ai_narrative: str

    # Metadata
    next_node: str
    errors: List[str]
    completed_nodes: List[str]
    trace_id: str
