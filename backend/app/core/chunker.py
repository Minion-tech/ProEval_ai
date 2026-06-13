import hashlib
import re
from typing import List

class SmartChunker:
    """
    Step 1: Smart Chunker
    Parses files, strips redundant whitespace, chunks to safe limits, and hashes.
    """
    
    # Approx 4 chars = 1 token. 4000 chars = ~1000 tokens.
    MAX_CHARS_PER_CHUNK = 4000 

    @staticmethod
    def _clean_text(text: str) -> str:
        """Strips redundant whitespace and obvious empty lines to compress size."""
        if not text:
            return ""
        # Remove consecutive blank lines
        cleaned = re.sub(r'\n\s*\n', '\n', text)
        return cleaned.strip()

    @staticmethod
    def chunk_text(text: str) -> List[str]:
        """Splits a large text into manageable chunks."""
        cleaned = SmartChunker._clean_text(text)
        if not cleaned:
            return []

        chunks = []
        for i in range(0, len(cleaned), SmartChunker.MAX_CHARS_PER_CHUNK):
            chunks.append(cleaned[i : i + SmartChunker.MAX_CHARS_PER_CHUNK])
        
        return chunks

    @staticmethod
    def hash_chunk(chunk: str) -> str:
        """Generates a SHA-256 hash for a specific text chunk."""
        return hashlib.sha256(chunk.encode('utf-8')).hexdigest()
