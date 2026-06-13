import importlib
from typing import Dict, Any, Optional
from app.skills.metadata import get_skill_definition
from app.skills.instructions import load_instruction

def validate_skill_inputs(skill_id: str, data: Dict[str, Any]) -> None:
    """
    Validates that the provided data contains all required inputs for a skill.
    
    Args:
        skill_id: The unique ID of the skill.
        data: The input data dictionary to validate.
        
    Raises:
        ValueError: If the skill is not found or required fields are missing.
    """
    skill = get_skill_definition(skill_id)
    if not skill:
        raise ValueError(f"Skill '{skill_id}' not found in registry.")
    
    missing_fields = [field for field in skill.required_inputs if field not in data]
    if missing_fields:
        raise ValueError(
            f"Missing required input fields for skill '{skill.name}': {', '.join(missing_fields)}"
        )

def run_skill_script(skill_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Executes the deterministic script associated with a skill, if one exists.
    
    Args:
        skill_id: The unique ID of the skill.
        data: The input data to pass to the script.
        
    Returns:
        The results from the script, or None if no script is defined.
    """
    skill = get_skill_definition(skill_id)
    if not skill or not skill.script_name:
        return None
    
    try:
        # Dynamically import the script module
        module = importlib.import_module(f"app.skills.scripts.{skill.script_name}")
        
        # Convention: Each script must have a function named 'run_skill' or match its ID
        if hasattr(module, "run_skill"):
            return module.run_skill(data)
        elif hasattr(module, "run_compliance_check") and skill_id == "phase3_compliance_audit":
            return module.run_compliance_check(data)
        elif hasattr(module, f"run_{skill.script_name}"):
            return getattr(module, f"run_{skill.script_name}")(data)
            
        raise AttributeError(f"Script '{skill.script_name}' for skill '{skill_id}' has no valid entry point.")
        
    except Exception as e:
        # Log error but don't necessarily crash the whole agent flow
        print(f"ERROR: Failed to execute script for skill '{skill_id}': {str(e)}")
        return {"error": str(e), "status": "SCRIPT_FAILED"}

def build_skill_payload(agent_persona: str, skill_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepares a full payload for an agent, including the system prompt and deterministic results.
    """
    validate_skill_inputs(skill_id, data)
    
    system_prompt = build_system_prompt(agent_persona, skill_id)
    script_results = run_skill_script(skill_id, data)
    
    return {
        "system_prompt": system_prompt,
        "script_results": script_results,
        "input_data": data
    }

def build_system_prompt(agent_persona: str, skill_id: str) -> str:
    """
    Combines an agent's persona with a skill's instructions to create a full system prompt.
    
    Args:
        agent_persona: The 'Who you are' string from the agent.
        skill_id: The unique ID of the skill to load 'What you do' instructions for.
        
    Returns:
        A combined system prompt string.
        
    Raises:
        ValueError: If the skill is not found.
    """
    skill = get_skill_definition(skill_id)
    if not skill:
        raise ValueError(f"Skill '{skill_id}' not found in registry.")
    
    task_instruction = load_instruction(skill.instruction_key)
    
    return f"You are the {agent_persona}.\n\n{task_instruction}"
