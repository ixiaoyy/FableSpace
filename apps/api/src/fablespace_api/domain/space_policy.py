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


def can_view_space(tavern: Any, user_id: str) -> bool:
    del user_id
    return getattr(tavern, "access", "") == "public"
