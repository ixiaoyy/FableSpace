from __future__ import annotations

from typing import Any


def clean_text(value: Any, *, max_length: int = 800) -> str:
    """Normalize route-facing free text without adding product content."""

    text = " ".join(str(value or "").replace("\r\n", "\n").split())
    return text[:max_length]


def relationship_stage_for(strength: float, visit_count: int) -> str:
    """Map persisted visitor relationship metrics to stable stage labels."""

    if strength >= 0.75 or visit_count >= 8:
        return "confidant"
    if strength >= 0.45 or visit_count >= 4:
        return "regular"
    if strength >= 0.15 or visit_count >= 2:
        return "acquaintance"
    return "stranger"


def is_space_owner(tavern: Any, user_id: str) -> bool:
    owner_id = getattr(tavern, "owner_id", "")
    return bool(user_id and owner_id and owner_id == user_id)


def can_view_space(tavern: Any, user_id: str) -> bool:
    return getattr(tavern, "access", "") != "private" or is_space_owner(tavern, user_id)


def can_view_memory(atom: Any, tavern: Any, user_id: str) -> bool:
    if getattr(atom, "visibility", "") == "public":
        return True
    if is_space_owner(tavern, user_id):
        return True
    visible_to = {
        getattr(atom, "visitor_id", ""),
        getattr(atom, "subject", ""),
        getattr(atom, "created_by", ""),
    }
    return bool(user_id and user_id in visible_to)
