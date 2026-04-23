from __future__ import annotations

from .common import FlexibleBody


class LLMConfigTestRequest(FlexibleBody):
    backend: str | None = None
    model: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None


class VoiceConfigRequest(FlexibleBody):
    enabled: bool | str | int | None = None
    tts_provider: str | None = None
    tts_voice: str | None = None
    tts_model: str | None = None
    tts_speed: float | None = None
    tts_language: str | None = None
    stt_provider: str | None = None
    stt_model: str | None = None
    auto_play: bool | str | int | None = None


class TTSRequest(FlexibleBody):
    text: str | None = None
    character_id: str | None = None


__all__ = ["LLMConfigTestRequest", "TTSRequest", "VoiceConfigRequest"]
