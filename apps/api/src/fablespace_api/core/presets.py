from __future__ import annotations

from typing import Any


def _coerce_int(
    value: Any,
    fallback: int,
    *,
    minimum: int,
    maximum: int,
) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, number))


def safe_memory_policy(value: Any) -> dict[str, Any]:
    """Normalize the published story's private-memory runtime policy."""

    if not isinstance(value, dict):
        return {}

    allowed_modes = {
        "off",
        "visitor_state",
        "structured",
        "balanced",
        "long_context",
    }
    mode = str(value.get("mode") or "visitor_state").strip()
    if mode not in allowed_modes:
        mode = "visitor_state"
    return {
        "mode": mode,
        "short_term": bool(value.get("short_term", True)),
        "mid_term": bool(
            value.get(
                "mid_term",
                mode in {"structured", "balanced", "long_context"},
            )
        ),
        "long_term": bool(
            value.get("long_term", mode in {"balanced", "long_context"})
        ),
        "budget_tokens": _coerce_int(
            value.get("budget_tokens"),
            1200,
            minimum=0,
            maximum=200000,
        ),
        "notes": str(value.get("notes") or "").strip()[:1000],
    }


__all__ = ["safe_memory_policy"]
