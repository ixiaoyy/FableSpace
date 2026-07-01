from __future__ import annotations

from typing import Any


def _text(value: Any, fallback: str = "") -> str:
    return str(value or fallback).strip()


def _float(value: Any, fallback: float, *, minimum: float, maximum: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def _int(value: Any, fallback: int, *, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def normalize_owner_llm_config(data: dict[str, Any] | None) -> dict[str, Any]:
    payload = data or {}
    return {
        "backend": _text(payload.get("backend"), "openai") or "openai",
        "model": _text(payload.get("model"), "gpt-4o-mini") or "gpt-4o-mini",
        "api_key": _text(payload.get("api_key")),
        "base_url": _text(payload.get("base_url")),
        "temperature": _float(payload.get("temperature"), 0.8, minimum=0.0, maximum=2.0),
        "max_tokens": _int(payload.get("max_tokens"), 1024, minimum=128, maximum=4096),
        "top_p": _float(payload.get("top_p"), 1.0, minimum=0.01, maximum=1.0),
    }


def owner_llm_is_configured(config: dict[str, Any] | None) -> bool:
    payload = config or {}
    return bool(_text(payload.get("api_key")) or _text(payload.get("base_url")))


def mask_owner_llm_config(config: dict[str, Any] | None) -> dict[str, Any]:
    normalized = normalize_owner_llm_config(config)
    return {
        "configured": owner_llm_is_configured(normalized),
        "llm_config": {
            "backend": normalized["backend"],
            "model": normalized["model"],
            "api_key_configured": bool(normalized.get("api_key")),
            "base_url": normalized["base_url"],
            "temperature": normalized["temperature"],
            "max_tokens": normalized["max_tokens"],
            "top_p": normalized["top_p"],
        },
    }


def _list_text(value: Any, *, limit: int = 8, item_max: int = 24) -> list[str]:
    if isinstance(value, str):
        raw_items = value.replace("，", ",").split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []
    result: list[str] = []
    for item in raw_items:
        text = _text(item)[:item_max]
        if text and text not in result:
            result.append(text)
        if len(result) >= limit:
            break
    return result


def normalize_tavern_draft_request(data: dict[str, Any] | None) -> dict[str, Any]:
    payload = data or {}
    return {
        "lat": _float(payload.get("lat"), 0.0, minimum=-90.0, maximum=90.0),
        "lon": _float(payload.get("lon"), 0.0, minimum=-180.0, maximum=180.0),
        "address": _text(payload.get("address"))[:120],
        "place_type": _text(payload.get("place_type"), "space")[:40] or "space",
        "style_tags": _list_text(payload.get("style_tags")),
        "forbidden": _list_text(payload.get("forbidden"), limit=10, item_max=40),
        "tone": _text(payload.get("tone"))[:80],
    }


def sanitize_tavern_draft(data: dict[str, Any]) -> dict[str, Any]:
    character = data.get("character") if isinstance(data.get("character"), dict) else {}
    draft = {
        "name": _text(data.get("name"))[:80],
        "description": _text(data.get("description"))[:500],
        "scene_prompt": _text(data.get("scene_prompt"))[:800],
        "character": {
            "name": _text(character.get("name"))[:80],
            "description": _text(character.get("description"))[:500],
            "personality": _text(character.get("personality"))[:500],
            "scenario": _text(character.get("scenario"))[:800],
            "system_prompt": _text(character.get("system_prompt"))[:1200],
            "first_mes": _text(character.get("first_mes"))[:500],
            "mes_example": _text(character.get("mes_example"))[:1000],
            "tags": _list_text(character.get("tags"), limit=8, item_max=20),
        },
    }
    if not draft["name"] or not draft["description"] or not draft["scene_prompt"]:
        raise ValueError("AI 草稿缺少空间名称、简介或场景提示")
    if not draft["character"]["name"] or not draft["character"]["first_mes"]:
        raise ValueError("AI 草稿缺少 NPC 名称或首次问候")
    return draft
