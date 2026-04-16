"""
Token Counter — estimate and count tokens for LLM prompts.

Supports:
- tiktoken (OpenAI's BPE tokenizer, cl100k_base)
- sentencepiece (for local models like Llama)
- FIM (fill-in-the-middle) tokenization
- Per-backend encoding selection
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Encodings registry ────────────────────────────────────────────────────────


class TokenCounter:
    """
    Unified token counting interface.
    Falls back to character-based estimation if tokenizers are unavailable.
    """

    def __init__(self, backend: str = "cl100k_base"):
        self.backend = backend
        self._encoder = None
        self._sentencepiece_model = None
        self._init_encoder(backend)

    def _init_encoder(self, backend: str) -> None:
        """Initialize the appropriate encoder."""
        # Try tiktoken first
        try:
            import tiktoken
            if backend == "cl100k_base":
                self._encoder = tiktoken.get_encoding("cl100k_base")
                self.backend = "cl100k_base"
                return
            elif backend == "o200k_base":
                self._encoder = tiktoken.get_encoding("o200k_base")
                self.backend = "o200k_base"
                return
            elif backend == "p50k_base":
                self._encoder = tiktoken.get_encoding("p50k_base")
                self.backend = "p50k_base"
                return
            elif backend == "p50k_edit":
                self._encoder = tiktoken.get_encoding("p50k_edit")
                self.backend = "p50k_edit"
                return
            elif backend == "r50k_base":
                self._encoder = tiktoken.get_encoding("r50k_base")
                self.backend = "r50k_base"
                return
        except Exception:
            pass

        # Try sentencepiece
        try:
            import sentencepiece
            model_path = self._get_sentencepiece_model_path()
            if model_path:
                self._sentencepiece_model = sentencepiece.SentencePieceProcessor()
                self._sentencepiece_model.Load(str(model_path))
                self.backend = f"sentencepiece:{model_path}"
                return
        except Exception:
            pass

        # Fallback: no encoder
        self.backend = "fallback"
        logger.warning("No tokenizer available, using character-based estimation")

    def _get_sentencepiece_model_path(self) -> Optional[Path]:
        """Find an available sentencepiece model."""
        # Check common locations
        candidates = [
            Path.home() / ".cache" / "fablemap" / "tokenizers",
            Path(__file__).parent.parent / "tokenizers",
            Path(".") / "tokenizers",
        ]
        for directory in candidates:
            sp_file = directory / "tokenizer.model"
            if sp_file.exists():
                return sp_file
            # Check for any .model file
            for model in directory.glob("*.model"):
                return model
        return None

    def encode(self, text: str) -> list[int]:
        """Encode text to token IDs."""
        if self._encoder:
            return self._encoder.encode(text, allowed_special="all")
        if self._sentencepiece_model:
            return self._sentencepiece_model.EncodeAsIds(text)
        # Fallback: return character codes
        return [ord(c) for c in text]

    def decode(self, tokens: list[int]) -> str:
        """Decode token IDs back to text."""
        if self._encoder:
            return self._encoder.decode(tokens)
        if self._sentencepiece_model:
            return self._sentencepiece_model.DecodeIds(tokens)
        return "".join(chr(t) for t in tokens if t < 128000)

    def count(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encode(text))

    def count_messages(self, messages: list[dict]) -> int:
        """Count tokens in a messages array (OpenAI chat format)."""
        total = 0
        for msg in messages:
            total += 3  # <im_start>{role}\n
            total += self.count(msg.get("content", ""))
            total += 1  # \n<im_end>
        total += 3  # <im_start>assistant\n
        return total

    def count_messages_anthropic(self, messages: list[dict]) -> int:
        """Count tokens in Claude message format."""
        total = 0
        for msg in messages:
            if msg.get("role") == "system":
                total += self.count(msg.get("content", ""))
                total += 8  # overhead
            elif msg.get("role") == "user":
                total += self.count(msg.get("content", ""))
                total += 6  # overhead per message
            elif msg.get("role") == "assistant":
                total += self.count(msg.get("content", ""))
                total += 6
        return total


# ─── Backend → encoding mapping ────────────────────────────────────────────────


def get_tokenizer_for_backend(backend: str, model: str = "") -> TokenCounter:
    """
    Get the appropriate token counter for a given LLM backend.
    """
    # OpenAI models
    if "gpt-4o" in model or "gpt-4-turbo" in model or "chatgpt-4o" in model:
        return TokenCounter("o200k_base")
    elif "gpt-4" in model or "gpt-3.5" in model:
        return TokenCounter("cl100k_base")

    # Claude (uses BPE similar to GPT-4)
    if "claude" in backend.lower():
        return TokenCounter("cl100k_base")

    # Code models
    if any(x in model for x in ["code", "codex"]):
        return TokenCounter("p50k_base")

    # Default to cl100k_base
    return TokenCounter("cl100k_base")


# ─── Utilities ──────────────────────────────────────────────────────────────────


def estimate_tokens(text: str) -> int:
    """
    Quick token estimation without loading a tokenizer.
    Uses character-based heuristics:
    - Chinese characters: ~0.5 tokens each
    - English words: ~0.75 tokens each
    - Punctuation/numbers: ~0.25 tokens each
    """
    if not text:
        return 0

    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    english = sum(1 for c in text if c.isalpha() and not ("\u4e00" <= c <= "\u9fff"))
    other = len(text) - chinese - english

    return int(chinese * 0.5 + english * 0.75 + other * 0.25)


# ─── Cached counter ────────────────────────────────────────────────────────────


_counter_cache: dict[str, TokenCounter] = {}


def get_counter(backend: str = "cl100k_base") -> TokenCounter:
    """Get a cached token counter instance."""
    if backend not in _counter_cache:
        _counter_cache[backend] = TokenCounter(backend)
    return _counter_cache[backend]


def count_tokens(text: str, backend: str = "cl100k_base") -> int:
    """Count tokens using the cached counter."""
    return get_counter(backend).count(text)
