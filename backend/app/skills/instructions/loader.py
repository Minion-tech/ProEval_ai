import os
from pathlib import Path

# Base directory for instruction files
INSTRUCTIONS_DIR = Path(__file__).parent

COMMON_MENTORING_PREFIX = """### Shared Evaluation Philosophy
Evaluate student work like a supportive industry mentor, not a harsh hiring gatekeeper.

Core stance:
- Reward evidence of growth, ownership, clarity of thinking, scoped execution, and practical differentiation.
- Do not punish students for not already being fully production-grade.
- Convert weak signals into coaching advice and next steps instead of purely negative judgment.
- Treat originality, explainability, tradeoff awareness, and measurable user or business value as important professional signals.

Industry-readiness lens:
- Strong portfolio projects are original or clearly differentiated, well-scoped, explainable, and backed by visible evidence of thought and iteration.
- Tutorial-clone patterns are low-signal unless the team shows meaningful adaptation, justification, and student-led engineering decisions.
- Teams should explain why they chose a stack, architecture, workflow, or model choice, not only list tools.
- Even student projects should show who the user is, what problem matters, and what makes the solution worth discussing on a resume or in an interview.

Tone rules:
- Be constructive, specific, and mentoring-oriented.
- Use balanced verdicts that help students improve.
- When evidence is missing, describe the uncertainty and what evidence would strengthen the project.
"""

def load_instruction(instruction_key: str) -> str:
    """
    Loads instruction text from a markdown file based on the provided key.
    
    Args:
        instruction_key: The base name of the instruction file (without extension).
        
    Returns:
        The content of the instruction file as a string.
        
    Raises:
        FileNotFoundError: If the instruction file does not exist.
        IOError: If there is an error reading the file.
    """
    file_path = INSTRUCTIONS_DIR / f"{instruction_key}.md"
    
    if not file_path.exists():
        raise FileNotFoundError(f"Instruction file not found: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            instruction_body = f.read()
            return f"{COMMON_MENTORING_PREFIX}\n\n{instruction_body}"
    except Exception as e:
        raise IOError(f"Error reading instruction file {file_path}: {str(e)}")
