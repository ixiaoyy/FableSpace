from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from fablemap_api.core.gameplay import (
    GameplayEvent,
    GameplaySession,
    completion_payload,
    fallback_result,
    is_complete_node,
    new_event,
    normalize_gameplay_definitions,
    scene_for_node,
)
from fablemap_api.core.group_chat import GroupChatManager, GroupMember
from fablemap_api.core.llm_clients import LLMConfig as ClientLLMConfig
from fablemap_api.core.llm_clients import LLMError, create_client
from fablemap_api.core.memory import auto_create_memories_from_chat
from fablemap_api.core.output_rules import apply_output_rules, default_output_rules, normalize_output_rules
from fablemap_api.core.presets import (
    combine_runtime_presets,
    custom_runtime_presets,
    default_runtime_presets,
    find_runtime_preset,
    normalize_runtime_presets,
    safe_llm_preset_config,
    safe_memory_policy,
)
from fablemap_api.core.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks
from fablemap_api.core.prompt_builder import PromptBuildConfig, PromptBuilder
from fablemap_api.core.tavern import (
    ChatMessage,
    Tavern,
    VisitorState,
    VoiceConfig,
    WorldInfoEntry,
)

from ...domain.group_chat_policy import (
    clamp_chat_history_limit,
    normalize_bool,
    normalize_group_chat_config,
    normalize_talkativeness,
)
from ...domain.memory_atom_policy import (
    can_edit_memory_atom,
    can_view_memory_atom,
    clamp_memory_limit,
    memory_atom_filters,
    memory_atom_from_payload,
    memory_atom_matches_filters,
    validate_memory_atom_create,
    validate_memory_atom_update,
)
from ...domain.tavern_package_policy import (
    TAVERN_PACKAGE_TYPE,
    TAVERN_PACKAGE_VERSION,
    package_dict,
    package_list,
    safe_llm_preset,
    safe_tavern_package_tavern,
)
from ...domain.tavern_policy import can_view_memory, can_view_tavern, clean_text
from ...domain.world_info_policy import (
    test_world_info_entries,
    world_info_depth,
    world_info_entry_id,
    world_info_order,
    world_info_primary_keywords,
    world_info_probability,
    world_info_secondary_keywords,
)


logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

class WorldInfoApplicationMixin:
    """Focused worldinfo use cases."""

    def list_world_info(self, user_id: str = "", tavern_id: str = "") -> dict[str, Any]:
        entries: list[dict[str, Any]] = []
        if tavern_id:
            tavern = self._get_tavern_or_404(tavern_id)
            self._ensure_visible(tavern, user_id)
            source_taverns = [tavern]
        else:
            source_taverns = self.store.list_taverns(include_private=bool(user_id), owner_id=user_id)

        for tavern in source_taverns:
            if not can_view_tavern(tavern, user_id):
                continue
            for entry in tavern.world_info:
                item = entry.to_dict()
                item["tavern_id"] = tavern.id
                item["tavern_name"] = tavern.name
                entries.append(item)
        return {"world_info": entries, "count": len(entries)}

    def create_world_info(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        entry = self._world_info_entry_from_payload(tavern_id, payload)
        tavern.world_info.append(entry)
        self.store.update_tavern(tavern)
        return {"ok": True, "entry": entry.to_dict()}

    def update_world_info(self, entry_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        for index, entry in enumerate(tavern.world_info):
            if entry.id != entry_id:
                continue
            merged = {**entry.to_dict(), **payload, "id": entry_id, "tavern_id": tavern_id}
            tavern.world_info[index] = self._world_info_entry_from_payload(tavern_id, merged, entry_id=entry_id)
            self.store.update_tavern(tavern)
            return {"ok": True, "entry": tavern.world_info[index].to_dict()}
        raise HTTPException(status_code=404, detail="WorldInfo entry not found")

    def delete_world_info(self, entry_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        original_count = len(tavern.world_info)
        tavern.world_info = [entry for entry in tavern.world_info if entry.id != entry_id]
        if len(tavern.world_info) == original_count:
            raise HTTPException(status_code=404, detail="WorldInfo entry not found")
        self.store.update_tavern(tavern)
        return {"ok": True, "entry_id": entry_id, "tavern_id": tavern_id}

    def test_world_info_global(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = dict(data or {})
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        if "message" not in payload and "text" in payload:
            payload["message"] = payload.get("text")
        if not str(payload.get("message") or "").strip():
            raise HTTPException(status_code=400, detail="text is required")
        return self.test_world_info(tavern_id, payload, user_id)

    def _world_info_entry_from_payload(
        self,
        tavern_id: str,
        data: dict[str, Any],
        *,
        entry_id: str = "",
    ) -> WorldInfoEntry:
        payload = data or {}
        resolved_id = str(entry_id or world_info_entry_id(payload) or f"wi_{uuid.uuid4().hex[:12]}").strip()
        return WorldInfoEntry(
            id=resolved_id,
            tavern_id=tavern_id,
            keys=world_info_primary_keywords(payload),
            content=str(payload.get("content") or ""),
            keys_secondary=world_info_secondary_keywords(payload),
            selective=normalize_bool(payload.get("selective", True)),
            constant=normalize_bool(payload.get("constant", False)),
            depth=world_info_depth(payload),
            order=world_info_order(payload),
            probability=world_info_probability(payload),
            disable=normalize_bool(payload.get("disable", False)),
        )
