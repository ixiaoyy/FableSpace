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
    SPACE_PACKAGE_TYPE,
    TAVERN_PACKAGE_VERSION,
    package_dict,
    package_list,
    safe_llm_preset,
    safe_tavern_package_tavern,
)
from ...domain.space_policy import can_view_memory, clean_text
from ...domain.space_share_policy import build_space_share_payload
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

MAX_TAVERN_LIST_LIMIT = 100


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_tavern_list_pagination(limit: int | None, offset: int | None) -> tuple[int | None, int]:
    safe_offset = max(0, int(offset or 0))
    if limit is None:
        return None, safe_offset
    safe_limit = max(0, min(int(limit), MAX_TAVERN_LIST_LIMIT))
    return safe_limit, safe_offset


class TavernManagementApplicationMixin:
    """Focused tavernmanagement use cases."""

    def list_spaces(
        self,
        *,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        status: str | None = None,
        place_type: str = "",
        special_type: str = "",
        query: str = "",
        owner_id: str = "",
        limit: int | None = None,
        offset: int = 0,
    ) -> dict[str, Any]:
        spaces = self.taverns.list_spaces(
            lat=lat,
            lon=lon,
            radius=radius,
            access=access,
            status=status,
            place_type=place_type,
            special_type=special_type,
            query=query,
            owner_id=owner_id,
        )
        safe_limit, safe_offset = _normalize_tavern_list_pagination(limit, offset)
        total = len(spaces)
        end = None if safe_limit is None else safe_offset + safe_limit
        paged_spaces = spaces[safe_offset:end]
        count = len(paged_spaces)
        return {
            "spaces": paged_spaces,
            "taverns": paged_spaces,
            "count": count,
            "total": total,
            "limit": safe_limit,
            "offset": safe_offset,
            "has_more": safe_offset + count < total,
        }

    def create_space(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        return self.taverns.create_space(data, owner_id)

    def get_space(self, space_id: str, user_id: str = "", view: str = "") -> dict[str, Any]:
        tavern = self._resolve_public_space_reference_or_404(space_id)
        return self.taverns.get_space(tavern.id, user_id, view=view)

    def get_tavern_share(self, space_id: str, user_id: str = "", base_url: str = "") -> dict[str, Any]:
        tavern = self._resolve_public_space_reference_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        return build_space_share_payload(tavern, base_url=base_url)

    def update_space(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.update_space(space_id, data, user_id)

    def delete_space(self, space_id: str, user_id: str = "") -> dict[str, str]:
        return self.taverns.delete_space(space_id, user_id)

    def add_home_member(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.add_home_member(space_id, data, user_id)

    def create_school_enrollment(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.create_school_enrollment(space_id, data, user_id)

    def create_place_relationship(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.create_place_relationship(space_id, data, user_id)

    def decide_place_relationship(
        self,
        space_id: str,
        relationship_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        return self.taverns.decide_place_relationship(space_id, relationship_id, data, user_id)

    def list_school_members(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        return self.taverns.list_school_members(space_id, user_id)

    def enter_space(
        self,
        space_id: str,
        password: str = "",
        user_id: str = "",
        visitor_gender: str = "",
    ) -> dict[str, Any]:
        return self.taverns.enter_space(space_id, password, user_id, visitor_gender)

    def get_tavern_metrics(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        return self.taverns.get_tavern_metrics(space_id, user_id)
