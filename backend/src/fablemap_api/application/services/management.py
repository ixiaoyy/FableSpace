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
from ...domain.tavern_share_policy import build_tavern_share_payload
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

class TavernManagementApplicationMixin:
    """Focused tavernmanagement use cases."""

    def list_taverns(
        self,
        *,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        status: str | None = None,
        query: str = "",
        owner_id: str = "",
    ) -> dict[str, Any]:
        taverns = self.taverns.list_taverns(
            lat=lat,
            lon=lon,
            radius=radius,
            access=access,
            status=status,
            query=query,
            owner_id=owner_id,
        )
        return {"taverns": taverns, "count": len(taverns)}

    def create_tavern(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        return self.taverns.create_tavern(data, owner_id)

    def get_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        return self.taverns.get_tavern(tavern_id, user_id)

    def get_tavern_share(self, tavern_id: str, user_id: str = "", base_url: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        return build_tavern_share_payload(tavern, base_url=base_url)

    def update_tavern(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.update_tavern(tavern_id, data, user_id)

    def delete_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, str]:
        return self.taverns.delete_tavern(tavern_id, user_id)

    def enter_tavern(self, tavern_id: str, password: str = "", user_id: str = "") -> dict[str, Any]:
        return self.taverns.enter_tavern(tavern_id, password, user_id)
