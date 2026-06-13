import asyncio
from typing import Callable, Any

class RateLimiter:
    """
    Step 3: Token-Bucket Queue & Exponential Backoff
    Prevents burst concurrency issues when calling external AI APIs.
    """
    
    def __init__(self, max_concurrent: int = 2):
        # Limit concurrent calls to prevent instant 429s from Hugging Face
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def call_with_backoff(self, coro_fn: Callable, *args, **kwargs) -> Any:
        """
        Executes a coroutine with exponential backoff (2s -> 4s -> 8s -> 16s).
        Gives up after 4 retries.
        """
        max_retries = 4
        base_delay = 2.0

        async with self.semaphore:
            for attempt in range(max_retries + 1):
                try:
                    return await coro_fn(*args, **kwargs)
                except Exception as e:
                    err_msg = str(e).lower()
                    # Check for rate limit or server busy errors
                    if any(indicator in err_msg for indicator in ["429", "too many requests", "503", "loading", "busy", "timeout", "resourceexhausted", "quota"]):
                        if attempt < max_retries:
                            delay = base_delay * (2 ** attempt)
                            print(f"DEBUG: Rate limit hit. Retrying in {delay}s... (Attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(delay)
                            continue
                    
                    # If it's not a rate limit error or we exhausted retries, raise it.
                    raise e
            
            raise Exception("Max retries exceeded during API call.")

# Singleton instances for different providers
hf_rate_limiter = RateLimiter(max_concurrent=2)
agent_rate_limiter = RateLimiter(max_concurrent=3) # Allow some parallel processing while staying within free tier limits
