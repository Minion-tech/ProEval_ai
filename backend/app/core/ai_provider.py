from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import google.generativeai as genai
import httpx

from app.core.config import settings


@dataclass
class TextGenerationResponse:
    text: str


class GroqGenerativeModel:
    """
    Small compatibility adapter for the subset of Gemini's async SDK used by agents.

    Agents call generate_content_async(...). This adapter lets the same agent code
    use Groq's OpenAI-compatible chat API.
    """

    API_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, model_name: str, system_instruction: str | None = None) -> None:
        self.model_name = model_name
        self.system_instruction = system_instruction or ""

    async def generate_content_async(
        self,
        contents: Any,
        generation_config: Any | None = None,
    ) -> TextGenerationResponse:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        temperature = getattr(generation_config, "temperature", 0.2) if generation_config else 0.2
        max_tokens = getattr(generation_config, "max_output_tokens", 4000) if generation_config else 4000
        user_text = self._contents_to_text(contents)

        # Proactive size check for Groq (approx 30KB limit for safe processing)
        # Groq has a strict request size limit. If the text is too large, we should
        # fail early so the Resilient model can fall back to Gemini.
        payload_size = len(user_text.encode('utf-8')) + len(self.system_instruction.encode('utf-8'))
        if payload_size > 30_000: # 30KB
            raise ValueError(f"Payload too large for Groq ({payload_size} bytes). Max safe limit 30KB.")

        messages = []
        if self.system_instruction:
            messages.append({"role": "system", "content": self.system_instruction})
        messages.append({"role": "user", "content": user_text})

        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                self.API_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()

        return TextGenerationResponse(text=data["choices"][0]["message"]["content"])

    def _contents_to_text(self, contents: Any) -> str:
        if isinstance(contents, str):
            return contents

        if isinstance(contents, Iterable):
            parts: list[str] = []
            for item in contents:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "data" in item:
                    parts.append(
                        "[Image input was attached, but the Groq text model cannot inspect images. "
                        "Evaluate the proposal text and mention that diagram-specific feedback needs Gemini/manual review.]"
                    )
                else:
                    parts.append(str(item))
            return "\n".join(parts)

        return str(contents)


class NvidiaNimModel:
    """
    Adapter for NVIDIA NIM API (Specifically configured for Gemma 4 31B).
    """

    API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

    def __init__(self, model_name: str, system_instruction: str | None = None) -> None:
        self.model_name = model_name
        self.system_instruction = system_instruction or ""

    async def generate_content_async(
        self,
        contents: Any,
        generation_config: Any | None = None,
    ) -> TextGenerationResponse:
        if not settings.NVIDIA_API_KEY:
            raise RuntimeError("NVIDIA_API_KEY is not configured.")

        temperature = getattr(generation_config, "temperature", 0.7) if generation_config else 0.7
        max_tokens = getattr(generation_config, "max_output_tokens", 8192) if generation_config else 8192
        user_text = self._contents_to_text(contents)

        messages = []
        if self.system_instruction:
            messages.append({"role": "system", "content": self.system_instruction})
        messages.append({"role": "user", "content": user_text})

        payload_size = len(user_text.encode('utf-8')) + len(self.system_instruction.encode('utf-8'))
        if payload_size > 500_000: # 500KB
            raise ValueError(f"Payload too large for NVIDIA API ({payload_size} bytes). Max limit 500KB.")

        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                self.API_URL,
                headers={
                    "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": 0.95,
                    "chat_template_kwargs": {"enable_thinking": False},
                    "stream": False,
                },
            )
            if response.status_code != 200:
                print(f"DEBUG: NVIDIA NIM API Error ({response.status_code}): {response.text}")
            response.raise_for_status()
            data = response.json()
            
        content = data["choices"][0]["message"].get("content", "")

        return TextGenerationResponse(text=content)

    def _contents_to_text(self, contents: Any) -> str:
        if isinstance(contents, str):
            return contents

        if isinstance(contents, Iterable):
            parts: list[str] = []
            for item in contents:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "data" in item:
                    parts.append(
                        "[Image input was attached, but the text model cannot inspect images. "
                        "Evaluate the proposal text and mention that diagram-specific feedback needs Gemini/manual review.]"
                    )
                else:
                    parts.append(str(item))
            return "\n".join(parts)

        return str(contents)


class ResilientGenerativeModel:
    """Try configured providers in order and return the first successful response."""

    def __init__(self, model_name: str, system_instruction: str | None = None) -> None:
        self.model_name = model_name
        self.system_instruction = system_instruction

    async def generate_content_async(
        self,
        contents: Any,
        generation_config: Any | None = None,
    ) -> TextGenerationResponse:
        errors: list[str] = []
        providers = [
            item.strip().lower()
            for item in settings.AI_PROVIDER_PRIORITY.split(",")
            if item.strip()
        ]

        for provider in providers:
            try:
                if provider == "nvidia":
                    model = NvidiaNimModel(
                        settings.NVIDIA_MODEL,
                        system_instruction=self.system_instruction,
                    )
                    return await model.generate_content_async(contents, generation_config)
                    
                if provider == "groq":
                    model = GroqGenerativeModel(
                        settings.GROQ_MODEL,
                        system_instruction=self.system_instruction,
                    )
                    return await model.generate_content_async(contents, generation_config)

                if provider == "gemini":
                    if not settings.GEMINI_API_KEY:
                        raise RuntimeError("GEMINI_API_KEY is not configured.")
                    genai.configure(api_key=settings.GEMINI_API_KEY)
                    model = genai.GenerativeModel(
                        model_name=settings.GEMINI_MODEL,
                        system_instruction=self.system_instruction,
                    )
                    response = await model.generate_content_async(
                        contents,
                        generation_config=generation_config,
                    )
                    return TextGenerationResponse(text=response.text)

                errors.append(f"{provider}: unsupported provider")
            except Exception as exc:
                errors.append(f"{provider}: {exc}")

        raise RuntimeError("All AI providers failed: " + " | ".join(errors))


def create_generation_model(
    model_name: str | None = None,
    system_instruction: str | None = None,
) -> ResilientGenerativeModel:
    return ResilientGenerativeModel(
        model_name or settings.GEMINI_MODEL,
        system_instruction=system_instruction,
    )
