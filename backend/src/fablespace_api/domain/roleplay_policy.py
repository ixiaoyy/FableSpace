from __future__ import annotations

from copy import deepcopy
from typing import Any


ROLEPLAY_MODES = {"ai_only", "hybrid"}
ROLEPLAY_CLAIM_STATUSES = {"pending", "approved", "rejected", "revoked"}
ROLEPLAY_DECISION_STATUSES = {"approved", "rejected", "revoked"}


def normalize_roleplay_mode(value: Any) -> str:
    mode = str(value or "ai_only").strip().lower()
    return mode if mode in ROLEPLAY_MODES else "ai_only"


def normalize_claim_status(value: Any) -> str:
    status = str(value or "pending").strip().lower()
    return status if status in ROLEPLAY_CLAIM_STATUSES else "pending"


def visible_roleplay_claims(claims: list[dict[str, Any]], *, user_id: str, owner: bool) -> list[dict[str, Any]]:
    """Return claims visible to the caller without exposing unrelated pending requests."""

    visible: list[dict[str, Any]] = []
    for claim in claims:
        if owner or claim.get("status") == "approved" or (user_id and claim.get("player_id") == user_id):
            visible.append(deepcopy(claim))
    return visible
