import json
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.ai_provider import create_generation_model

class InterviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ProEval AI Interviewer",
            persona="You are an expert technical interviewer evaluating student projects."
        )

    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates personalized interview questions based on project context, 
        student role, and previous phase outcomes.
        """
        project_context = data.get("project_context", "")
        student_name = data.get("student_name", "the student")
        student_role = data.get("student_role", "a team member")

        system_instruction = (
            f"PERSONALITY: You are 'AI Interviewer,' a Senior Project Evaluator. Highly analytical, objective, and fair. "
            f"CRITICAL: You are currently interviewing {student_name}, who served as {student_role} on the project. "
            f"You MUST address them as {student_name} at the very start of the conversation. "
            "TONE & STYLE: Be EXTREMELY CONCISE. Speak in 1-2 short sentences maximum. "
            "CRITICAL CREDIT SAVING RULE: Keep every response under 20 words. Allow the student 80% of the airtime. "
            "Maintain the persona of a rigorous government evaluator. Do not reveal you are an AI. "
            "INTERVIEW PHASES: 1. Context Setting. 2. Technical Deep Dive (Ask about architecture/stack). 3. Problem Solving. "
            "Ask exactly three technical questions. Once answered, thank them and tell them to click 'Complete Interview'. "
            "Return a JSON object with 'system_prompt' (the full persona for the conversational agent) and 'initial_questions' keys."
        )
        
        model = create_generation_model(system_instruction=system_instruction)

        try:
            response = await model.generate_content_async(
                contents=f"Generate interview context for this student project:\n{project_context}",
                generation_config={"temperature": 0.7}
            )
            ai_data = self.parse_json_response(response.text)
            
            return {
                "agent_name": self.name,
                "project_summary": project_context[:1000], # Pass actual data
                "system_prompt": ai_data.get("system_prompt", "You are a technical interviewer."),
                "initial_questions": ai_data.get("initial_questions", ["Tell me about your project."])
            }
        except Exception as e:
            # Fallback to robust defaults if AI fails
            return {
                "agent_name": f"{self.name} (Safe Mode)",
                "system_prompt": f"You are interviewing {student_name} about their project.",
                "initial_questions": [
                    "What was the most challenging technical aspect of your implementation?",
                    "How did you handle security and data integrity?",
                    "What would you do differently if you started over today?"
                ]
            }
