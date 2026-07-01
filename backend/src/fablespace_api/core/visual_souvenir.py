from __future__ import annotations

import re
from typing import Any


DEFAULT_NEGATIVE_PROMPT = (
    "real person likeness, private address, phone number, email, api keys, "
    "photorealistic identity document, watermark, readable private text"
)


def build_visual_souvenir_preview(
    *,
    space_id: str,
    space_name: str = "",
    character_name: str = "",
    visitor_id: str = "",
    user_message: str = "",
    assistant_message: str = "",
    style: str = "",
) -> dict[str, Any]:
    """Build a no-image shared-moment souvenir prompt preview.

    This helper formats observable text into a conservative image brief. It does
    not call image generation and does not persist prompts or assets.
    """

    safe_tavern_id = _text(space_id, max_length=120)
    safe_tavern_name = _text(space_name, max_length=120) or safe_tavern_id
    safe_character_name = _text(character_name, max_length=80) or "NPC"
    safe_visitor_id = _text(visitor_id, max_length=120)
    source_summary = _redact(
        _text(f"{user_message} {assistant_message}", max_length=500),
        visitor_id=safe_visitor_id,
    )
    safe_style = _redact(_text(style, max_length=120), visitor_id=safe_visitor_id) or "warm cyber tavern postcard"
    moment = source_summary or "a quiet shared moment at the tavern counter"
    prompt = (
        f"{safe_style}; a cinematic illustrated keepsake from the cyber tavern '{safe_tavern_name}', "
        f"{safe_character_name} and a traveler sharing a small memorable moment; "
        f"moment details: {moment}; cozy neon light, map-anchored tavern atmosphere, no readable private data"
    )
    prompt = _redact(prompt, visitor_id=safe_visitor_id)

    return {
        "ok": True,
        "space_id": safe_tavern_id,
        "space_name": safe_tavern_name,
        "visitor_id": safe_visitor_id,
        "preview_only": True,
        "applied": False,
        "image_generated": False,
        "requires_confirmation": True,
        "souvenir": {
            "prompt": prompt,
            "negative_prompt": DEFAULT_NEGATIVE_PROMPT,
            "source_summary": source_summary,
            "style": safe_style,
        },
        "privacy_notes": [
            "预览不会生成图片或保存资产。",
            "提示词使用 traveler/访客泛称，避免暴露 visitor_id、私人姓名或联系方式。",
            "如未来生成图片，必须先确认用途并把验收资产落到项目规范路径。",
        ],
        "next_action": "review_prompt_before_image_generation",
    }


def _redact(text: str, *, visitor_id: str = "") -> str:
    result = text
    if visitor_id:
        result = result.replace(visitor_id, "a traveler")
    result = re.sub(r"[\w.\-+]+@[\w.\-]+\.\w+", "[redacted-email]", result)
    result = re.sub(r"(?<!\d)(?:\+?\d[\d\s-]{7,}\d)(?!\d)", "[redacted-phone]", result)
    result = result.replace("api_key", "[redacted-secret]").replace("API Key", "[redacted-secret]")
    return result


def _text(value: Any, *, max_length: int = 600) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else "")).strip()
    return text[:max_length]
