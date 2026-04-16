"""
STT (Speech-to-Text) Service — 语音转文字

支持多种后端:
- Whisper (OpenAI) — 本地或云端
- FasterWhisper — 更快的本地推理
- Silero — 免费本地模型
- HuggingFace ASR — 多模型支持
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ─── Config ──────────────────────────────────────────────────────────────────


@dataclass
class STTConfig:
    """STT configuration."""
    provider: str = "whisper"  # whisper | fasterwhisper | silero | hf
    model: str = "base"  # Model size: tiny, base, small, medium, large
    language: str = ""  # Empty = auto-detect
    device: str = "auto"  # cpu, cuda, auto
    api_key: str = ""
    base_url: str = ""


# ─── STT Providers ────────────────────────────────────────────────────────────


class STTProvider:
    """Base STT provider."""

    def transcribe(self, audio_path: str, **kwargs) -> str:
        raise NotImplementedError


class WhisperSTT(STTProvider):
    """OpenAI Whisper STT (via openai-whisper or API)."""

    def __init__(self, config: STTConfig):
        self.config = config

    def transcribe(self, audio_path: str, **kwargs) -> str:
        try:
            import whisper
        except ImportError:
            raise ImportError("openai-whisper not installed. Run: pip install openai-whisper")

        model = whisper.load_model(self.config.model)
        result = model.transcribe(
            audio_path,
            language=self.config.language or None,
            **kwargs,
        )
        return result["text"].strip()


class FasterWhisperSTT(STTProvider):
    """Faster Whisper — CTranslate2-based (much faster than OpenAI Whisper)."""

    def __init__(self, config: STTConfig):
        self.config = config

    def transcribe(self, audio_path: str, **kwargs) -> str:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise ImportError("faster-whisper not installed. Run: pip install faster-whisper")

        device = self.config.device if self.config.device != "auto" else "cpu"
        compute_type = "int8" if device == "cpu" else "float16"

        model = WhisperModel(
            self.config.model,
            device=device,
            compute_type=compute_type,
        )
        segments, _ = model.transcribe(
            audio_path,
            language=self.config.language or None,
            **kwargs,
        )
        return " ".join(seg.text for seg in segments).strip()


class SileroSTT(STTProvider):
    """Silero STT — free, lightweight local model."""

    def __init__(self, config: STTConfig):
        self.config = config
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                import torch
                from silero import silero_tts
                torch.set_num_threads(1)
                self._model = torch.jit.load(silero_tts())
            except ImportError:
                raise ImportError("silero-tts not installed (this is STT, not TTS). Silero STT requires: pip install silero-tts")

    def transcribe(self, audio_path: str, **kwargs) -> str:
        self._load_model()
        # Note: Silero is primarily TTS. For STT, use Silero's separate ASR model.
        # This is a placeholder - recommend using faster-whisper instead.
        raise NotImplementedError("Silero STT not fully implemented. Use faster-whisper instead.")


class HFSTT(STTProvider):
    """HuggingFace ASR models."""

    def __init__(self, config: STTConfig):
        self.config = config
        self._pipeline = None

    def transcribe(self, audio_path: str, **kwargs) -> str:
        try:
            from transformers import pipeline
        except ImportError:
            raise ImportError("transformers not installed. Run: pip install transformers torch")

        if self._pipeline is None:
            model_name = self.config.model or "openai/whisper-base"
            self._pipeline = pipeline(
                "automatic-speech-recognition",
                model=model_name,
                device=self.config.device or "cpu",
            )

        result = self._pipeline(audio_path, **kwargs)
        return result["text"].strip()


# ─── Factory ──────────────────────────────────────────────────────────────────


_PROVIDERS = {
    "whisper": WhisperSTT,
    "fasterwhisper": FasterWhisperSTT,
    "silero": SileroSTT,
    "hf": HFSTT,
    "huggingface": HFSTT,
}


def create_stt_provider(config: STTConfig) -> STTProvider:
    """Create an STT provider."""
    provider_cls = _PROVIDERS.get(config.provider.lower(), FasterWhisperSTT)
    return provider_cls(config)


# ─── Main Interface ───────────────────────────────────────────────────────────


def transcribe_audio(
    audio_path: str,
    model: str = "base",
    language: str = "",
    provider: str = "fasterwhisper",
    **kwargs,
) -> str:
    """
    Transcribe an audio file to text.

    Args:
        audio_path: Path to audio file (mp3, wav, webm, m4a, etc.)
        model: Model size (tiny, base, small, medium, large)
        language: Language code (e.g., "en", "zh", "ja"). Empty = auto.
        provider: STT provider (fasterwhisper recommended for speed)

    Returns:
        Transcribed text
    """
    config = STTConfig(
        provider=provider,
        model=model,
        language=language,
    )
    provider_obj = create_stt_provider(config)
    return provider_obj.transcribe(audio_path, **kwargs)


def transcribe_bytes(
    audio_bytes: bytes,
    format: str = "webm",
    **kwargs,
) -> str:
    """Transcribe audio from bytes."""
    import tempfile, os
    suffix = f".{format}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        path = f.name
    try:
        return transcribe_audio(path, **kwargs)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
