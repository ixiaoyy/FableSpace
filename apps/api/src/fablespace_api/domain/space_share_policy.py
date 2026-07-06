from __future__ import annotations

from typing import Any
from urllib.parse import quote

from .space_policy import clean_text


def _character_payload(character: Any) -> dict[str, Any]:
    data = character.to_dict() if hasattr(character, "to_dict") else dict(character or {})
    sprites = data.get("sprites") if isinstance(data.get("sprites"), dict) else {}
    avatar = str(data.get("avatar") or "").strip()
    if not avatar:
        for expression in ("neutral", "joy", "default", "avatar"):
            value = str(sprites.get(expression) or "").strip()
            if value:
                avatar = value
                break
    if not avatar and sprites:
        avatar = str(next(iter(sprites.values())) or "").strip()
    return {
        "id": str(data.get("id") or ""),
        "name": clean_text(data.get("name"), max_length=80),
        "avatar": avatar or None,
    }


def build_space_share_payload(tavern: Any, *, base_url: str = "") -> dict[str, Any]:
    """Build a public-safe share payload from owner-authored tavern data."""

    space_id = str(getattr(tavern, "id", "") or "")
    name = clean_text(getattr(tavern, "name", "") or "未命名空间", max_length=80) or "未命名空间"
    description = clean_text(getattr(tavern, "description", ""), max_length=200)
    short_description = clean_text(getattr(tavern, "description", ""), max_length=80)
    encoded_id = quote(space_id, safe="")
    normalized_base_url = str(base_url or "").rstrip("/")
    share_url = f"{normalized_base_url}/tavern/{encoded_id}" if normalized_base_url else f"/tavern/{encoded_id}"
    characters = [_character_payload(character) for character in getattr(tavern, "characters", [])]
    summary = short_description or "店主还没有写下公开简介。"

    return {
        "space_id": space_id,
        "title": name,
        "description": description,
        "short_description": short_description,
        "cover": str(getattr(tavern, "cover", "") or ""),
        "location": {
            "lat": float(getattr(tavern, "lat", 0.0) or 0.0),
            "lon": float(getattr(tavern, "lon", 0.0) or 0.0),
            "address": clean_text(getattr(tavern, "address", ""), max_length=120),
        },
        "status": str(getattr(tavern, "status", "") or ""),
        "access": str(getattr(tavern, "access", "") or "public"),
        "tags": list(getattr(tavern, "tags", []) or []),
        "characters": characters,
        "character_count": len(characters),
        "share_url": share_url,
        "share_title": f"邀请你进入「{name}」",
        "share_text": f"邀请你进入「{name}」：{summary}",
    }
