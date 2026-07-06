from __future__ import annotations

from typing import Any


def normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}
    return bool(value)


def normalize_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def normalize_talkativeness(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.5
    if parsed != parsed:
        return 0.5
    return max(0.0, min(1.0, parsed))


def normalize_group_chat_config(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        value = {}

    allowed_strategies = {"balanced", "weighted_random", "round_robin", "relevance"}
    strategy = str(value.get("strategy") or "balanced").strip()
    if strategy not in allowed_strategies:
        strategy = "balanced"

    return {
        "strategy": strategy,
        "max_responses_per_turn": normalize_int(value.get("max_responses_per_turn", 2), 2, 1, 3),
        "response_cooldown_seconds": normalize_int(value.get("response_cooldown_seconds", 0), 0, 0, 30),
        "require_name_prefix": normalize_bool(value.get("require_name_prefix", True)),
    }


def clamp_chat_history_limit(value: Any, default: int = 50, maximum: int = 200) -> int:
    return normalize_int(value, default, 1, maximum)
