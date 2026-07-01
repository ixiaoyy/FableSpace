from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import HTTPException

from fablespace_api.core.skill_packs import (
    available_skill_pack_definitions,
    merged_skill_pack_settings,
    normalize_skill_pack_settings,
    validate_skill_pack_ids,
)


class SkillPackApplicationMixin:
    """Owner-visible Tavern Skill Pack use cases."""

    def list_skill_packs(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        owner = self._is_owner(tavern, user_id)
        settings = merged_skill_pack_settings(tavern.skill_packs)
        if not owner:
            settings = [item for item in settings if item.get("enabled")]
        return {
            "space_id": space_id,
            "available_packs": available_skill_pack_definitions(),
            "skill_packs": deepcopy(settings),
            "enabled_pack_ids": [item["id"] for item in settings if item.get("enabled")],
            "owner_view": owner,
        }

    def update_skill_packs(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        source = payload.get("skill_packs", payload.get("packs", payload))
        try:
            validate_skill_pack_ids(source)
            settings = normalize_skill_pack_settings(source)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        tavern.skill_packs = settings
        tavern = self.store.update_space(tavern)
        return {
            "ok": True,
            "space_id": space_id,
            "available_packs": available_skill_pack_definitions(),
            "skill_packs": deepcopy(tavern.skill_packs),
            "enabled_pack_ids": [item["id"] for item in tavern.skill_packs if item.get("enabled")],
            "owner_view": True,
        }
