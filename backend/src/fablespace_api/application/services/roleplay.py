from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from ...domain.roleplay_policy import (
    ROLEPLAY_DECISION_STATUSES,
    ROLEPLAY_MODES,
    normalize_claim_status,
    normalize_roleplay_mode,
    visible_roleplay_claims,
)
from ...domain.space_policy import clean_text


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class RoleplayApplicationMixin:
    """Focused player-as-NPC roleplay use cases."""

    def get_roleplay(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        owner = self._is_owner(tavern, user_id)
        return {
            "space_id": space_id,
            "roleplay_mode": normalize_roleplay_mode(getattr(tavern, "roleplay_mode", "ai_only")),
            "claims": visible_roleplay_claims(getattr(tavern, "character_claims", []), user_id=user_id, owner=owner),
            "characters": [
                {
                    "id": character.id,
                    "name": character.name,
                    "avatar": character.avatar,
                }
                for character in tavern.characters
            ],
        }

    def save_roleplay_config(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)

        raw_mode = str((data or {}).get("roleplay_mode") or "ai_only").strip().lower()
        if raw_mode not in ROLEPLAY_MODES:
            raise HTTPException(status_code=400, detail="Unsupported roleplay_mode")

        tavern.roleplay_mode = normalize_roleplay_mode(raw_mode)
        self.store.update_space(tavern)
        return {"ok": True, **self.get_roleplay(space_id, user_id)}

    def request_character_claim(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)

        if normalize_roleplay_mode(getattr(tavern, "roleplay_mode", "ai_only")) != "hybrid":
            raise HTTPException(status_code=400, detail="This tavern has not enabled player NPC roleplay")

        character_id = clean_text((data or {}).get("character_id"), max_length=80)
        if not character_id or not any(character.id == character_id for character in tavern.characters):
            raise HTTPException(status_code=404, detail="Character not found")

        payload_player_id = clean_text((data or {}).get("player_id"), max_length=80)
        if user_id and payload_player_id and payload_player_id != user_id:
            raise HTTPException(status_code=403, detail="Cannot request a claim for another player")
        player_id = user_id or payload_player_id
        if not player_id:
            raise HTTPException(status_code=401, detail="Player identity is required to request a claim")

        for claim in tavern.character_claims:
            if (
                claim.get("character_id") == character_id
                and claim.get("player_id") == player_id
                and claim.get("status") in {"pending", "approved"}
            ):
                return {"ok": True, "claim": claim, **self.get_roleplay(space_id, player_id)}

        player_name = clean_text((data or {}).get("player_name"), max_length=80) or player_id
        claim = {
            "id": f"claim_{uuid.uuid4().hex[:12]}",
            "character_id": character_id,
            "player_id": player_id,
            "player_name": player_name,
            "status": "pending",
            "requested_at": _utc_now_iso(),
        }
        tavern.character_claims.append(claim)
        self.store.update_space(tavern)
        return {"ok": True, "claim": claim, **self.get_roleplay(space_id, player_id)}

    def decide_character_claim(
        self,
        space_id: str,
        claim_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)

        status = normalize_claim_status((data or {}).get("status"))
        if status not in ROLEPLAY_DECISION_STATUSES:
            raise HTTPException(status_code=400, detail="Unsupported claim status")

        claim = next((item for item in tavern.character_claims if item.get("id") == claim_id), None)
        if not claim:
            raise HTTPException(status_code=404, detail="Roleplay claim not found")

        if status == "approved" and normalize_roleplay_mode(tavern.roleplay_mode) != "hybrid":
            raise HTTPException(status_code=400, detail="Enable hybrid roleplay before approving claims")

        now = _utc_now_iso()
        if status == "approved":
            for other in tavern.character_claims:
                if other is not claim and other.get("character_id") == claim.get("character_id") and other.get("status") == "approved":
                    other["status"] = "revoked"
                    other["decided_at"] = now

        claim["status"] = status
        claim["decided_at"] = now
        note = clean_text((data or {}).get("note"), max_length=240)
        if note:
            claim["note"] = note
        elif "note" in claim:
            claim.pop("note", None)

        self.store.update_space(tavern)
        return {"ok": True, "claim": claim, **self.get_roleplay(space_id, user_id)}
