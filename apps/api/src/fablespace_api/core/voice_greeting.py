from __future__ import annotations

import re
from typing import Any

from .space import TavernCharacter, VoiceConfig


def build_voice_greeting_preview(
    *,
    space_id: str,
    space_name: str = "",
    character: TavernCharacter,
    voice_config: VoiceConfig | None = None,
    greeting_index: int | str = 0,
) -> dict[str, Any]:
    """Build a no-audio preview payload for an NPC voice greeting.

    The preview only selects text and describes the `/tts` request that a UI may
    call after user action. It never calls a TTS provider and never returns
    generated audio bytes.
    """

    voice = voice_config or VoiceConfig()
    source, text = _select_greeting(character, greeting_index)
    voice_payload = voice.to_dict()
    tts_ready = bool(voice.enabled and text)
    notes = [
        "这是语音问候预览，不会自动合成或播放音频。",
        "用户确认播放时，前端应再调用 /tts 并传入 tts_request。",
    ]
    if not voice.enabled:
        notes.append("语音未启用；店主开启 VoiceConfig 后才能合成音频。")
    if not text:
        notes.append("角色没有可用开场白，已回退为空预览。")

    return {
        "ok": True,
        "space_id": _text(space_id, max_length=120),
        "space_name": _text(space_name, max_length=120),
        "character_id": character.id,
        "character_name": character.name,
        "preview_only": True,
        "applied": False,
        "audio_generated": False,
        "tts_ready": tts_ready,
        "greeting": {
            "text": text,
            "source": source,
            "greeting_index": _safe_index(greeting_index),
        },
        "voice": {
            "enabled": bool(voice_payload.get("enabled")),
            "tts_provider": voice_payload.get("tts_provider") or "",
            "tts_voice": voice_payload.get("tts_voice") or "",
            "tts_model": voice_payload.get("tts_model") or "",
            "tts_speed": voice_payload.get("tts_speed") or 1.0,
            "tts_language": voice_payload.get("tts_language") or "",
            "auto_play": bool(voice_payload.get("auto_play")),
        },
        "tts_request": {"text": text, "character_id": character.id},
        "notes": notes,
    }


def _select_greeting(character: TavernCharacter, greeting_index: int | str) -> tuple[str, str]:
    index = _safe_index(greeting_index)
    if index <= 0:
        return "first_mes", _text(character.first_mes, max_length=600)
    alternates = [item for item in character.alternate_greetings if _text(item, max_length=600)]
    alternate_index = index - 1
    if 0 <= alternate_index < len(alternates):
        return f"alternate_greetings[{alternate_index}]", _text(alternates[alternate_index], max_length=600)
    if character.first_mes:
        return "first_mes", _text(character.first_mes, max_length=600)
    return "empty", ""


def _safe_index(value: int | str) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


def _text(value: Any, *, max_length: int = 600) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else "")).strip()
    return text[:max_length]
