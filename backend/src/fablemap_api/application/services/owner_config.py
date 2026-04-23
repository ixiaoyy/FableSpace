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
from ...domain.tavern_policy import can_view_memory, clean_text
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

class OwnerConfigApplicationMixin:
    """Focused ownerconfig use cases."""

    def test_world_info(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        return test_world_info_entries(
            tavern_id=tavern_id,
            tavern_name=tavern.name,
            tavern_description=tavern.description,
            tavern_scene_prompt=tavern.scene_prompt,
            tavern_world_info=tavern.world_info,
            data=data,
        )

    def get_output_rules(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        rules = normalize_output_rules(tavern.output_rules)
        if not rules:
            rules = default_output_rules()
        return {
            "tavern_id": tavern_id,
            "rules": rules,
            "default_rules": default_output_rules(),
        }

    def save_output_rules(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        tavern.output_rules = normalize_output_rules(payload.get("rules", payload.get("output_rules")))
        tavern = self.store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "rules": tavern.output_rules,
            "tavern": tavern.to_dict_private(user_id),
        }

    def test_output_rules(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        source_rules = payload.get("rules", payload.get("output_rules", tavern.output_rules))
        result = apply_output_rules(payload.get("text", ""), source_rules)
        return {
            "tavern_id": tavern_id,
            **result,
        }

    def get_prompt_blocks(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        blocks = normalize_prompt_blocks(tavern.prompt_blocks)
        if not blocks:
            blocks = default_prompt_blocks()
        return {
            "tavern_id": tavern_id,
            "blocks": blocks,
            "default_blocks": default_prompt_blocks(),
        }

    def save_prompt_blocks(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        tavern.prompt_blocks = normalize_prompt_blocks(payload.get("blocks", payload.get("prompt_blocks")))
        tavern = self.store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "blocks": tavern.prompt_blocks,
            "tavern": tavern.to_dict_private(user_id),
        }

    def preview_prompt_blocks(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        blocks = normalize_prompt_blocks(payload.get("blocks", payload.get("prompt_blocks", tavern.prompt_blocks)))
        if not blocks:
            blocks = default_prompt_blocks()

        character_id = str(payload.get("character_id") or "").strip()
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            character = tavern.characters[0] if tavern.characters else None
        if not character:
            raise HTTPException(status_code=400, detail="请先为酒馆添加角色")

        visitor_name = clean_text(payload.get("visitor_name"), max_length=32) or "旅人"
        message = str(payload.get("message") or "我想了解这里。")
        config = PromptBuildConfig(
            tavern_name=tavern.name,
            tavern_scene_prompt=tavern.scene_prompt or "",
            char_name=character.name,
            char_personality=character.personality or "",
            char_scenario=character.scenario or "",
            char_first_mes=character.first_mes or "",
            char_system_prompt=character.system_prompt or "",
            user_name=visitor_name,
            visitor_visit_count=self._safe_int(payload.get("visitor_visit_count"), 0),
            visitor_relationship_stage=str(payload.get("visitor_relationship_stage") or ""),
            visitor_relationship_strength=self._safe_float(payload.get("visitor_relationship_strength"), 0.0),
            visitor_message_count=self._safe_int(payload.get("visitor_message_count"), 0),
            world_info_entries=[entry.to_dict() if hasattr(entry, "to_dict") else entry for entry in tavern.world_info],
            prompt_blocks=blocks,
            history_max_messages=8,
        )
        prompt_result = PromptBuilder(config).build([], message)
        messages = prompt_result.get("messages", [])
        return {
            "tavern_id": tavern_id,
            "character_id": character.id,
            "character_name": character.name,
            "blocks": blocks,
            "messages": messages,
            "message_count": len(messages),
        }

    def get_runtime_presets(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        custom_presets = custom_runtime_presets(tavern.runtime_presets)
        return {
            "tavern_id": tavern_id,
            "active_preset_id": tavern.active_preset_id,
            "presets": combine_runtime_presets(custom_presets),
            "custom_presets": custom_presets,
            "default_presets": default_runtime_presets(),
            "memory_policy": safe_memory_policy(tavern.memory_policy),
        }

    def save_runtime_presets(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        custom_presets = custom_runtime_presets(payload.get("presets", payload.get("runtime_presets")))
        tavern.runtime_presets = custom_presets
        if "active_preset_id" in payload:
            tavern.active_preset_id = str(payload.get("active_preset_id") or "").strip()
        tavern = self.store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "active_preset_id": tavern.active_preset_id,
            "presets": combine_runtime_presets(tavern.runtime_presets),
            "custom_presets": custom_runtime_presets(tavern.runtime_presets),
            "tavern": tavern.to_dict_private(user_id),
        }

    def apply_runtime_preset(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}

        preset: dict[str, Any] | None = None
        if isinstance(payload.get("preset"), dict):
            normalized = normalize_runtime_presets([payload["preset"]])
            preset = normalized[0] if normalized else None
        if preset is None:
            preset = find_runtime_preset(
                combine_runtime_presets(tavern.runtime_presets),
                str(payload.get("preset_id") or payload.get("id") or ""),
            )
        if preset is None:
            raise HTTPException(status_code=404, detail="运行预设不存在")

        llm_config = safe_llm_preset_config(preset.get("llm_config"))
        if llm_config:
            current_private = tavern.llm_config.to_dict_private()
            preset_backend = llm_config.get("backend") or current_private.get("backend")
            preserve_key = preset_backend == current_private.get("backend")
            llm_config = {
                **current_private,
                **llm_config,
                "api_key": current_private.get("api_key", "") if preserve_key else "",
                "token_used": current_private.get("token_used", 0),
            }

        update_payload: dict[str, Any] = {
            "active_preset_id": preset.get("id") or "",
            "memory_policy": safe_memory_policy(preset.get("memory_policy")),
        }
        if llm_config:
            update_payload["llm_config"] = llm_config
        prompt_blocks = normalize_prompt_blocks(preset.get("prompt_blocks"))
        if prompt_blocks:
            update_payload["prompt_blocks"] = prompt_blocks
        output_rules = normalize_output_rules(preset.get("output_rules"))
        if output_rules:
            update_payload["output_rules"] = output_rules

        tavern_payload = self.update_tavern(tavern_id, update_payload, user_id)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "active_preset_id": preset.get("id") or "",
            "preset": preset,
            "tavern": tavern_payload,
        }
