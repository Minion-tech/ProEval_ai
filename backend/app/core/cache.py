import json
import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

class SummaryCache:
    """
    Step 2: Cache First
    Uses Redis to cache chunk summaries based on their SHA-256 hash.
    Prevents redundant API calls on repeated project evaluations.
    """
    
    TTL_SECONDS = 86400  # 24 hours

    def __init__(self):
        # We can reuse the CELERY_BROKER_URL host/port but ideally a dedicated db for cache.
        # For simplicity, we just use the broker URL.
        self.redis = aioredis.from_url(settings.CELERY_BROKER_URL, decode_responses=True)

    async def get_summary(self, chunk_hash: str) -> Optional[str]:
        """Retrieves a cached summary for a specific chunk hash."""
        try:
            key = f"proeval:summary:{chunk_hash}"
            cached_data = await self.redis.get(key)
            if cached_data:
                return cached_data
            return None
        except Exception as e:
            print(f"WARNING: Redis cache GET failed: {e}")
            return None

    async def set_summary(self, chunk_hash: str, summary: str) -> None:
        """Caches a summary with a 24-hour TTL."""
        try:
            if summary:
                key = f"proeval:summary:{chunk_hash}"
                await self.redis.setex(key, self.TTL_SECONDS, summary)
        except Exception as e:
            print(f"WARNING: Redis cache SET failed: {e}")
            
# Singleton instance
summary_cache = SummaryCache()
