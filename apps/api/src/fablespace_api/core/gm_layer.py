from __future__ import annotations

import re
from typing import Any

from .state_cards import StateCard, extract_state_card_candidates_from_turn


GM_LAYER_MODE = "structured_conflict_v1"


class GmLayerPreviewError(ValueError):
    """Raised when a GM Layer preview request is missing required observable input."""


def preview_gm_layer_candidates(
    *,
    space_id: str,
    visitor_id: str,
    character_id: str = "",
    user_message: str = "",
    assistant_message: str = "",
    source_message_ids: list[str] | None = None,
    proposed_by: str = "",
    source: str = "system",
    now: str | None = None,
) -> dict[str, Any]:
    """Return preview-only GM Layer candidates without mutating durable canon.

    The GM Layer MVP deliberately reuses StateCard extraction and response shape
    so that later confirmation still flows through the existing Canon Ledger
    endpoints. This helper only creates dictionaries for preview; callers must
    not persist them automatically.
    """

    safe_tavern_id = _text(space_id, max_length=120)
    safe_visitor_id = _text(visitor_id, max_length=120)
    if not safe_tavern_id:
        raise GmLayerPreviewError("GM Layer 预览需要空间 ID")
    if not safe_visitor_id:
        raise GmLayerPreviewError("GM Layer 预览需要 visitor_id")

    clean_user_message = _text(user_message, max_length=1200)
    clean_assistant_message = _text(assistant_message, max_length=1200)
    if not clean_user_message and not clean_assistant_message:
        raise GmLayerPreviewError("GM Layer 预览需要可观察的回合文本")

    cards = extract_state_card_candidates_from_turn(
        space_id=safe_tavern_id,
        visitor_id=safe_visitor_id,
        character_id=_text(character_id, max_length=120),
        user_message=clean_user_message,
        assistant_message=clean_assistant_message,
        source_message_ids=_string_list(source_message_ids),
        proposed_by=_text(proposed_by, max_length=120) or safe_visitor_id,
        source=source if source in {"chat", "group_chat", "gameplay", "manual", "system"} else "system",
        now=now,
    )
    candidates = [_preview_card_payload(card) for card in cards]
    summary = _summary(candidates)
    notes = [
        "GM Layer 只生成待确认候选，不会自动写入正史。",
        "候选来自当前回合可观察文本；确认/忽略仍走 State Card 审核流程。",
    ]
    if not candidates:
        notes.append("当前文本没有足够明确的任务、资源、冲突或事件标记。")

    return {
        "ok": True,
        "space_id": safe_tavern_id,
        "visitor_id": safe_visitor_id,
        "gm_mode": GM_LAYER_MODE,
        "preview_only": True,
        "applied": False,
        "candidates": candidates,
        "summary": summary,
        "notes": notes,
    }


def _preview_card_payload(card: StateCard) -> dict[str, Any]:
    payload = card.to_dict()
    metadata = dict(payload.get("metadata") or {})
    metadata.update(
        {
            "gm_layer": GM_LAYER_MODE,
            "preview_only": True,
            "requires_confirmation": True,
        }
    )
    payload["metadata"] = metadata
    payload["status"] = "pending"
    payload["canon_scope"] = "visitor"
    payload["fixed_canon"] = False
    payload["confirmed_by"] = ""
    return payload


def _summary(candidates: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"total": len(candidates), "task": 0, "resource": 0, "conflict": 0, "event_log": 0}
    for card in candidates:
        category = str(card.get("category") or "")
        if category in counts:
            counts[category] += 1
    return counts


def _text(value: Any, *, max_length: int = 600) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else "")).strip()
    return text[:max_length]


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]
