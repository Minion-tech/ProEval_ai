from typing import Dict, Optional
from .models import SkillDefinition, AgentRole
from app.db.Models import ProjectPhase

# The Skill Registry: A mapping of skill IDs to their definitions
SKILL_REGISTRY: Dict[str, SkillDefinition] = {
    "phase1_originality_check": SkillDefinition(
        skill_id="phase1_originality_check",
        name="Originality & Plagiarism Check",
        description="Analyzes project abstract for uniqueness, innovation, and clone detection.",
        phases=[ProjectPhase.PHASE_1],
        agent_roles=[AgentRole.IDEATOR],
        instruction_key="phase1_originality_check",
        required_inputs=[
            "title",
            "abstract",
            "domain",
            "objectives",
            "methodology",
            "use_case_diagram",
            "tech_stack",
        ],
        job_family="Product Management / Innovation",
        proficiency_level="Entry-Intermediate",
        tool_mappings=["MOSS", "RepoPal"],
        tags=["originality", "clone-detection", "phase1"]
    ),
    "phase1_feasibility_review": SkillDefinition(
        skill_id="phase1_feasibility_review",
        name="Technical Feasibility Review",
        description="Evaluates tech stack alignment, team coverage, and architectural complexity.",
        phases=[ProjectPhase.PHASE_1],
        agent_roles=[AgentRole.ARCHITECT],
        instruction_key="phase1_feasibility_review",
        required_inputs=["title", "domain", "tech_stack", "members", "objectives", "methodology"],
        job_family="System Architecture",
        proficiency_level="Intermediate-Senior",
        tool_mappings=["Architecture Review"],
        tags=["feasibility", "team-coverage", "scope", "phase1"]
    ),
    "phase2_execution_monitor": SkillDefinition(
        skill_id="phase2_execution_monitor",
        name="Execution & Progress Monitor",
        description="Monitors Phase 2 progress, GitHub activity, and role alignment.",
        phases=[ProjectPhase.PHASE_2],
        agent_roles=[AgentRole.MENTOR],
        instruction_key="phase2_execution_monitor",
        required_inputs=["title", "tech_stack", "github_url", "presentation_url", "progress_notes", "members"],
        job_family="Software Engineering / Engineering Management",
        proficiency_level="Intermediate",
        tool_mappings=["GitHub", "Git"],
        script_name="github_behavior",
        tags=["execution", "progress", "github", "phase2"]
    ),
    "phase3_compliance_audit": SkillDefinition(
        skill_id="phase3_compliance_audit",
        name="Phase 3 Compliance Audit",
        description="Audits final project compliance, code quality, and testing discipline.",
        phases=[ProjectPhase.FINAL],
        agent_roles=[AgentRole.AUDITOR],
        instruction_key="phase3_compliance_audit",
        required_inputs=[
            "title",
            "final_summary",
            "tech_stack",
            "individual_contributions",
            "members",
            "final_report_url",
            "presentation_url",
            "github_url",
        ],
        job_family="Quality Assurance / Security Engineering",
        proficiency_level="Senior",
        tool_mappings=["SAST", "SBOM", "Code Coverage"],
        script_name="compliance_check",
        tags=["compliance", "security", "testing", "phase3"]
    ),
    "final_hackathon_readiness": SkillDefinition(
        skill_id="final_hackathon_readiness",
        name="Final Hackathon Readiness Audit",
        description="Audits project presentation and readiness for hackathon success.",
        phases=[ProjectPhase.FINAL],
        agent_roles=[AgentRole.MENTOR],
        instruction_key="final_hackathon_audit",
        required_inputs=[
            "title",
            "final_summary",
            "tech_stack",
            "individual_contributions",
            "final_report_url",
            "presentation_url",
            "github_url",
        ],
        job_family="Product Pitch / Startup Growth",
        proficiency_level="Intermediate",
        tags=["hackathon", "presentation", "final"]
    ),
}

def get_skill_definition(skill_id: str) -> Optional[SkillDefinition]:
    """
    Retrieves a skill definition from the registry by its ID.
    """
    return SKILL_REGISTRY.get(skill_id)
