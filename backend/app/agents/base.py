import uuid
import json
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseAgent(ABC):
    def __init__(self, name: str, persona: str):
        self.name = name
        self.persona = persona

    @abstractmethod
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Performs the agent-specific analysis logic."""
        pass

    @staticmethod
    def parse_json_response(raw_text: str) -> Dict[str, Any]:
        """
        Standardized highly robust JSON parser for LLM responses.
        Uses a multi-stage repair strategy for common LLM mistakes,
        including truncation and conversational filler.
        """
        # Stage 1: Basic Cleanup
        cleaned = raw_text.strip()
        # Remove markdown code fences if they exist
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
        
        # Stage 2: Greedy Extraction
        # Try to find the first '{' and either the last '}' or the end of string
        start_idx = cleaned.find('{')
        if start_idx == -1:
            candidate = cleaned
        else:
            end_idx = cleaned.rfind('}')
            if end_idx != -1 and end_idx > start_idx:
                candidate = cleaned[start_idx:end_idx+1]
            else:
                candidate = cleaned[start_idx:]

        def attempt_parse(text: str) -> Optional[Dict]:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return None

        # Pass 1: Standard
        result = attempt_parse(candidate)
        if result is not None: return result

        # Pass 2: Strip comments and trailing commas
        repaired = re.sub(r"//.*", "", candidate)
        repaired = re.sub(r",(\s*[}\]])", r"\1", repaired)
        result = attempt_parse(repaired)
        if result is not None: return result

        # Pass 3: Fix missing commas between fields or list items (Heuristic)
        # Look for "key": "value" followed by a newline and another "key":
        repaired = re.sub(r'("[\w_]+"\s*:\s*(?:"[^"]*"|[\d\.]+|true|false|null|\[[^\]]*\]|\{[^\}]*\}))\s*\n\s*(?="[\w_]+"\s*:)', r'\1,\n', repaired)
        # Look for } followed by { on a new line (missing comma between objects in a list)
        repaired = re.sub(r'\}\s*\n\s*\{', '},\n{', repaired)
        result = attempt_parse(repaired)
        if result is not None: return result
        
        # Pass 4: Attempt to repair truncated JSON by closing open structures
        # This is useful if the LLM hit a token limit
        stack = []
        in_string = False
        escape = False
        
        for char in candidate:
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if not in_string:
                if char == '{':
                    stack.append('}')
                elif char == '[':
                    stack.append(']')
                elif char == '}':
                    if stack and stack[-1] == '}':
                        stack.pop()
                elif char == ']':
                    if stack and stack[-1] == ']':
                        stack.pop()
        
        if stack or in_string:
            repaired_trunc = candidate
            if in_string:
                repaired_trunc += '"'
            while stack:
                repaired_trunc += stack.pop()
            
            result = attempt_parse(repaired_trunc)
            if result is not None: return result

        # Pass 5: Final attempt - just use json.loads to get the real error for logging
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            # Last ditch: try the original cleaned text if candidate failed
            try:
                if candidate != cleaned:
                    return json.loads(cleaned)
                raise e
            except json.JSONDecodeError:
                print(f"DEBUG: Final JSON Parse Failure: {e}")
                raise e

    def format_log(self, reasoning: str, findings: List[str]) -> Dict[str, Any]:
        """Standardized format for agent internal logs."""
        return {
            "agent": self.name,
            "reasoning": reasoning,
            "findings": findings
        }
