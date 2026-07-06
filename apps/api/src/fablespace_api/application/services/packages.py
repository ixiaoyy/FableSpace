from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from fablespace_api.core.gameplay import (
    GameplayEvent,
    GameplaySession,
    completion_payload,
    fallback_result,
    is_complete_node,
    new_event,
    normalize_gameplay_definitions,
    scene_for_node,
)
from fablespace_api.core.group_chat import GroupChatManager, GroupMember
from fablespace_api.core.llm_clients import LLMConfig as ClientLLMConfig
from fablespace_api.core.llm_clients import LLMError, create_client
from fablespace_api.core.memory import auto_create_memories_from_chat
from fablespace_api.core.output_rules import apply_output_rules, default_output_rules, normalize_output_rules
from fablespace_api.core.presets import (
    combine_runtime_presets,
    custom_runtime_presets,
    default_runtime_presets,
    find_runtime_preset,
    normalize_runtime_presets,
    safe_llm_preset_config,
    safe_memory_policy,
)
from fablespace_api.core.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks
from fablespace_api.core.prompt_builder import PromptBuildConfig, PromptBuilder
from fablespace_api.core.space import (
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
from ...domain.space_package_policy import (
    SUPPORTED_SPACE_PACKAGE_TYPES,
    SPACE_PACKAGE_TYPE,
    TAVERN_PACKAGE_VERSION,
    package_dict,
    package_list,
    safe_llm_preset,
    safe_tavern_package_tavern,
)
from ...domain.space_policy import can_view_memory, clean_text
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

class PackageApplicationMixin:
    """Focused package use cases."""

    def export_tavern_package(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)

        space_payload = tavern.to_dict()
        safe_space = safe_tavern_package_tavern(space_payload)
        safe_space.pop("password_hash", None)
        llm_preset = safe_llm_preset(space_payload.get("llm_config"))
        return {
            "type": SPACE_PACKAGE_TYPE,
            "version": TAVERN_PACKAGE_VERSION,
            "exported_at": _utc_now_iso(),
            "source": {
                "space_id": tavern.id,
                "author_id": tavern.owner_id,
            },
            "space": safe_space,
            "tavern": safe_space,
            "characters": space_payload.get("characters", []),
            "world_info": space_payload.get("world_info", []),
            "groups": space_payload.get("groups", []),
            "bookmarks": space_payload.get("bookmarks", []),
            "chat_templates": space_payload.get("chat_templates", []),
            "gameplay_definitions": space_payload.get("gameplay_definitions", []),
            "output_rules": space_payload.get("output_rules") or default_output_rules(),
            "prompt_blocks": space_payload.get("prompt_blocks") or default_prompt_blocks(),
            "runtime_presets": custom_runtime_presets(space_payload.get("runtime_presets")),
            "skill_packs": space_payload.get("skill_packs", []),
            "default_runtime_presets": default_runtime_presets(),
            "active_preset_id": space_payload.get("active_preset_id", ""),
            "prompt_preset": {
                "llm_config": llm_preset,
            },
            "memory_policy": safe_memory_policy(space_payload.get("memory_policy")),
            "voice_config": space_payload.get("voice_config", {}),
            "cover": space_payload.get("cover", ""),
        }

    def import_tavern_package(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        package = payload.get("package") if isinstance(payload.get("package"), dict) else payload
        if not isinstance(package, dict):
            raise HTTPException(status_code=400, detail="package is required")
        if package.get("type") not in SUPPORTED_SPACE_PACKAGE_TYPES:
            raise HTTPException(status_code=400, detail="不支持的空间包类型")

        space_payload = package.get("space") if isinstance(package.get("space"), dict) else {}
        if not space_payload:
            space_payload = package.get("tavern") if isinstance(package.get("tavern"), dict) else {}
        if not space_payload:
            raise HTTPException(status_code=400, detail="空间包缺少 space 数据")

        try:
            lat = float(payload.get("lat", space_payload.get("lat")))
            lon = float(payload.get("lon", space_payload.get("lon")))
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="导入空间包时需要有效坐标") from exc

        source_name = str(space_payload.get("name") or "导入空间").strip() or "导入空间"
        space_id = str(payload.get("space_id") or f"space_{uuid.uuid4().hex[:12]}").strip()
        raw_access = str(payload.get("access") or space_payload.get("access") or "private").strip()
        access = raw_access if raw_access in {"public", "private", "password"} else "private"
        if access == "password":
            access = "private"

        create_payload: dict[str, Any] = {
            "id": space_id,
            "name": str(payload.get("name") or source_name).strip() or source_name,
            "description": space_payload.get("description", ""),
            "lat": lat,
            "lon": lon,
            "address": payload.get("address", space_payload.get("address", "")),
            "access": access,
            "roleplay_mode": space_payload.get("roleplay_mode", "ai_only"),
            "scene_prompt": space_payload.get("scene_prompt", ""),
        }
        llm_preset = safe_llm_preset(
            package_dict(package, space_payload, "prompt_preset").get("llm_config") or space_payload.get("llm_config")
        )
        if llm_preset:
            create_payload["llm_config"] = llm_preset

        created = self.create_space(create_payload, owner_id=user_id)
        update_payload: dict[str, Any] = {
            "characters": package_list(package, space_payload, "characters"),
            "world_info": package_list(package, space_payload, "world_info"),
            "groups": package_list(package, space_payload, "groups"),
            "bookmarks": package_list(package, space_payload, "bookmarks"),
            "chat_templates": package_list(package, space_payload, "chat_templates"),
            "gameplay_definitions": package_list(package, space_payload, "gameplay_definitions"),
            "output_rules": package_list(package, space_payload, "output_rules"),
            "prompt_blocks": package_list(package, space_payload, "prompt_blocks"),
            "runtime_presets": package_list(package, space_payload, "runtime_presets"),
            "skill_packs": package_list(package, space_payload, "skill_packs"),
            "active_preset_id": str(package.get("active_preset_id") or space_payload.get("active_preset_id") or ""),
            "memory_policy": package_dict(package, space_payload, "memory_policy"),
        }
        if llm_preset:
            update_payload["llm_config"] = llm_preset

        imported = self.update_space(created["id"], update_payload, user_id)
        voice_config = package_dict(package, space_payload, "voice_config")
        if voice_config:
            imported_tavern = self._get_tavern_or_404(imported["id"])
            imported_tavern.voice_config = VoiceConfig.from_dict(voice_config)
            self.store.save_voice_config(imported["id"], imported_tavern.voice_config)
            self.store.update_space(imported_tavern)
            imported = self.get_space(imported["id"], user_id)

        return {
            "ok": True,
            "space_id": imported["id"],
            "space": imported,
            "tavern": imported,
            "characters": len(imported.get("characters", [])),
            "world_info": len(imported.get("world_info", [])),
        }

    def list_visitors(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)

        visitor_names: dict[str, str] = {}
        message_counts: dict[str, int] = {}
        for session in self.store.list_chat_sessions(space_id, limit=None):
            visitor_id = str(session.get("visitor_id") or "")
            if not visitor_id:
                continue
            visitor_name = str(session.get("visitor_name") or "")
            if visitor_name and not visitor_names.get(visitor_id):
                visitor_names[visitor_id] = visitor_name
            message_counts[visitor_id] = message_counts.get(visitor_id, 0) + int(session.get("message_count", 0) or 0)

        visitors = []
        for state in self.store.list_visitor_states(space_id):
            payload = state.to_dict()
            payload["visitor_name"] = visitor_names.get(state.visitor_id, "")
            payload["message_count"] = message_counts.get(state.visitor_id, 0)
            visitors.append(payload)

        return {"visitors": visitors, "count": len(visitors)}
