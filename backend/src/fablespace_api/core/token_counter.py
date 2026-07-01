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

TIKTOKEN_ENCODINGS = ("cl100k_base", "o200k_base", "p50k_base", "p50k_edit", "r50k_base")
SILLYTAVERN_COMPAT_TOKENIZERS = (
    "claude",
    "llama",
    "llama3",
    "mistral",
    "nerdstash",
    "nerdstash_v2",
    "yi",
    "gemma",
    "jamba",
    "qwen2",
    "command-r",
    "command-a",
    "nemo",
    "deepseek",
)
SUPPORTED_TOKENIZERS = (*TIKTOKEN_ENCODINGS, *SILLYTAVERN_COMPAT_TOKENIZERS)


def normalize_tokenizer_backend(value: str | None = None) -> str:
    """Map SillyTavern/OpenAI-style tokenizer names to native counter names."""
    backend = str(value or "").strip().lower().replace("_", "-")
    if not backend:
        return "cl100k_base"

    direct = {item.lower().replace("_", "-"): item for item in SUPPORTED_TOKENIZERS}
    if backend in direct:
        return direct[backend]

    if any(item in backend for item in ("gpt-5", "o1", "o3", "o4-mini", "gpt-4o", "chatgpt-4o")):
        return "o200k_base"
    if "gpt-4" in backend or "gpt-3.5" in backend:
        return "cl100k_base"
    if "code" in backend or "codex" in backend:
        return "p50k_base"

    for name in SILLYTAVERN_COMPAT_TOKENIZERS:
        if name in backend:
            return name

    return "cl100k_base"

# ─── Encodings registry ────────────────────────────────────────────────────────


class TokenCounter:
    """
    Unified token counting interface.
    Falls back to character-based estimation if tokenizers are unavailable.
    """

    def __init__(self, backend: str = "cl100k_base"):
        self.requested_backend = backend
        self.backend = normalize_tokenizer_backend(backend)
        self._encoder = None
        self._sentencepiece_model = None
        self._init_encoder(self.backend)

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
            model_path = self._get_sentencepiece_model_path(backend)
            if model_path:
                self._sentencepiece_model = sentencepiece.SentencePieceProcessor()
                self._sentencepiece_model.Load(str(model_path))
                self.backend = f"sentencepiece:{model_path}"
                return
        except Exception:
            pass

        # Fallback: no encoder
        self.backend = backend
        logger.warning("No tokenizer available, using character-based estimation")

    def _get_sentencepiece_model_path(self, backend: str) -> Optional[Path]:
        """Find an available sentencepiece model."""
        model_files = {
            "llama": "llama.model",
            "mistral": "mistral.model",
            "nerdstash": "nerdstash.model",
            "nerdstash_v2": "nerdstash_v2.model",
            "yi": "yi.model",
            "gemma": "gemma.model",
            "jamba": "jamba.model",
            "sentencepiece": "tokenizer.model",
        }
        model_name = model_files.get(backend)
        if not model_name:
            return None

        # Check common locations
        candidates = [
            Path.home() / ".cache" / "fablespace" / "tokenizers",
            Path(__file__).resolve().parents[4] / "tokenizers",
            Path(".") / "tokenizers",
        ]
        for directory in candidates:
            sp_file = directory / model_name
            if sp_file.exists():
                return sp_file
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
    model_name = str(model or "").lower()
    backend_name = str(backend or "").lower()

    # OpenAI models
    if any(item in model_name for item in ("gpt-5", "o1", "o3", "o4-mini", "gpt-4o", "gpt-4-turbo", "chatgpt-4o")):
        return TokenCounter("o200k_base")
    elif "gpt-4" in model_name or "gpt-3.5" in model_name:
        return TokenCounter("cl100k_base")

    # Claude (uses BPE similar to GPT-4)
    if "claude" in backend_name or "claude" in model_name:
        return TokenCounter("claude")

    # Code models
    if any(x in model_name for x in ["code", "codex"]):
        return TokenCounter("p50k_base")

    # Default to cl100k_base
    return TokenCounter(normalize_tokenizer_backend(backend_name or model_name))


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
