from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from app.db.Models import ProjectPhase

class AgentRole(str, Enum):
    ARCHITECT = "architect"
    AUDITOR = "auditor"
    COORDINATOR = "coordinator"
    IDEATOR = "ideator"
    MENTOR = "mentor"
    MODERATION = "moderation"

class SkillDefinition(BaseModel):
    """
    Defines the contract for a skill within the ProEval system.
    This metadata is used by the Skill Engine to discover and validate skills.
    Includes semantic mapping to job families and proficiency levels.
    """
    skill_id: str = Field(..., description="Unique identifier for the skill (e.g., 'phase1_originality_check')")
    name: str = Field(..., description="Human-readable name of the skill")
    description: str = Field(..., description="Detailed explanation of what the skill evaluates")
    phases: List[ProjectPhase] = Field(..., description="The project phases where this skill is applicable")
    agent_roles: List[AgentRole] = Field(..., description="The agents authorized to invoke this skill")
    instruction_key: str = Field(..., description="Key used to retrieve the corresponding prompt/instruction file")
    required_inputs: List[str] = Field(..., description="List of data fields required by this skill from the input payload")
    tags: Optional[List[str]] = Field(default_factory=list, description="Categorization tags (e.g., 'security', 'innovation')")
    
    # Semantic Ontology Mappings
    job_family: Optional[str] = Field(None, description="The real-world job family this skill aligns with (e.g., 'DevOps', 'Frontend')")
    proficiency_level: Optional[str] = Field(None, description="The expected proficiency level (e.g., 'Entry', 'Intermediate', 'Senior')")
    tool_mappings: List[str] = Field(default_factory=list, description="List of tools this skill evaluates (e.g., ['GitHub', 'Figma', 'React'])")
    
    # Execution Logic
    script_name: Optional[str] = Field(None, description="Name of the deterministic script in skills/scripts/ for this skill")

    class Config:
        json_schema_extra = {
            "example": {
                "skill_id": "phase2_execution_monitor",
                "name": "Execution & Progress Monitor",
                "description": "Monitors Phase 2 progress and GitHub activity.",
                "phases": ["PHASE_2"],
                "agent_roles": ["mentor"],
                "instruction_key": "phase2_execution_monitor",
                "required_inputs": ["github_url", "presentation_url", "progress_notes"],
                "job_family": "Software Engineering",
                "tool_mappings": ["GitHub", "Git"],
                "script_name": "github_behavior"
            }
        }
