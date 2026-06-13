import abc
import httpx
import asyncio
from typing import Optional
from app.core.config import settings

class SummarizationProvider(abc.ABC):
    """
    Interface for Summarization Providers (D in SOLID: Dependency Inversion).
    Allows switching between Hugging Face, local models, or other APIs without 
    changing the service logic.
    """
    @abc.abstractmethod
    async def summarize(self, text: str, model: str, max_length: int = 500) -> str:
        pass

class HuggingFaceInferenceProvider(SummarizationProvider):
    """
    Implementation of Hugging Face Serverless Inference (S in SOLID: Single Responsibility).
    Responsible solely for communicating with the HF API.
    """
    API_URL = "https://api-inference.huggingface.co/models/"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def summarize(self, text: str, model: str, max_length: int = 500) -> str:
        if not self.api_key:
            return "Summarization skipped: HUGGINGFACE_API_KEY not configured."
        
        if not text or len(text.strip()) < 50:
            return text

        # Hard-trim to ~10k characters to avoid Hugging Face payload limits
        safe_text = text[:10000] if len(text) > 10000 else text

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "inputs": f"Summarize the following content concisely, highlighting the most important technical and engineering details:\n\n{safe_text}",
            "parameters": {"max_new_tokens": max_length, "return_full_text": False}
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.API_URL}{model}",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 503:
                    estimated_time = response.json().get("estimated_time", 20)
                    print(f"DEBUG: HF Model {model} is loading. Retrying in {estimated_time}s...")
                    await asyncio.sleep(estimated_time)
                    return await self.summarize(safe_text, model, max_length)

                response.raise_for_status()
                result = response.json()
                
                generated = ""
                if isinstance(result, list) and len(result) > 0:
                    generated = result[0].get("generated_text", "")
                elif isinstance(result, dict):
                    generated = result.get("generated_text", "")
                
                # If we got a real summary, return it.
                if generated and len(generated) > 10:
                    return generated
                
                # If HF returned something weird or empty, fallback to a local trim instead of the 2.9MB text
                return safe_text[:1000] + "\n[Truncated due to summarization failure]"

            except Exception as e:
                print(f"ERROR: Hugging Face summarization failed: {e}")
                # Fallback to local trim to protect the subsequent AI agents from 429s
                return safe_text[:1000] + f"\n[Summarization Error: {str(e)[:50]}]"

from app.core.chunker import SmartChunker
from app.core.cache import summary_cache
from app.core.rate_limiter import hf_rate_limiter

class SummarizerService:
    """
    High-level service to orchestrate summarization (O in SOLID: Open/Closed).
    New summarization strategies can be added by implementing SummarizationProvider
    and injecting them here.
    """
    def __init__(self, provider: SummarizationProvider):
        self.provider = provider

    def _local_trim_fallback(self, text: str, max_chars: int) -> str:
        """Deterministic local fallback if API fails."""
        if not text:
            return ""
        if len(text) <= max_chars:
            return text
        
        # Keep start and end to preserve context
        half = max_chars // 2
        return (
            f"{text[:half]}\n\n"
            "[... DETAILED CONTENT REMOVED FOR TOKEN EFFICIENCY ...]\n\n"
            f"{text[-half:]}"
        )

    async def _process_chunks(self, text: str, model: str, max_length: int) -> str:
        """Processes text in chunks, utilizing cache and rate limiting."""
        chunks = SmartChunker.chunk_text(text)
        if not chunks:
            return ""
        
        chunk_summaries = []
        for chunk in chunks:
            chunk_hash = SmartChunker.hash_chunk(chunk)
            
            # Step 2: Cache First
            cached_summary = await summary_cache.get_summary(chunk_hash)
            if cached_summary:
                chunk_summaries.append(cached_summary)
                continue
                
            # Step 3 & 4: Rate Limiter + HF Summarization
            try:
                summary = await hf_rate_limiter.call_with_backoff(
                    self.provider.summarize, chunk, model, max_length
                )
                await summary_cache.set_summary(chunk_hash, summary)
                chunk_summaries.append(summary)
            except Exception as e:
                print(f"DEBUG: Chunk summarization failed, using local fallback. {e}")
                chunk_summaries.append(self._local_trim_fallback(chunk, 500))
        
        # Step 5: Aggregate then pass once
        aggregated = "\n\n".join(chunk_summaries)
        # Final hard-trim to ensure context <= ~4000 tokens (16000 chars)
        return self._local_trim_fallback(aggregated, 16000)

    async def summarize_code(self, code: str) -> str:
        """Specifically uses the Coder model for codebases."""
        return await self._process_chunks(code, settings.HF_CODE_MODEL, 256)

    async def summarize_document(self, doc_text: str) -> str:
        """Specifically uses the Text model for reports/presentations."""
        return await self._process_chunks(doc_text, settings.HF_TEXT_MODEL, 256)

# Factory function to provide the service with the preferred implementation
def get_summarizer_service() -> SummarizerService:
    provider = HuggingFaceInferenceProvider(api_key=settings.HUGGINGFACE_API_KEY)
    return SummarizerService(provider)
