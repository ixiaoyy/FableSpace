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

class GameplayApplicationMixin:
    """Focused gameplay use cases."""

    def list_gameplays(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        owner = self._is_owner(tavern, user_id)
        gameplays = normalize_gameplay_definitions(tavern.gameplay_definitions)
        if not owner:
            gameplays = [gameplay for gameplay in gameplays if gameplay.get("status") == "published"]
        return {"tavern_id": tavern_id, "gameplays": gameplays}

    def save_gameplays(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        try:
            tavern.gameplay_definitions = normalize_gameplay_definitions((data or {}).get("gameplays", []))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        self.store.update_tavern(tavern)
        return {"ok": True, "tavern_id": tavern_id, "gameplays": tavern.gameplay_definitions}

    def list_gameplay_sessions(
        self,
        tavern_id: str,
        *,
        user_id: str = "",
        state: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        owner = self._is_owner(tavern, user_id)
        sessions = self.store.list_gameplay_sessions(tavern_id)
        if owner and visitor_id:
            sessions = [session for session in sessions if session.visitor_id == visitor_id]
        elif not owner:
            sessions = [session for session in sessions if session.visitor_id == user_id]
        if state == "active":
            sessions = [session for session in sessions if session.state in {"started", "in_progress"}]
        elif state:
            sessions = [session for session in sessions if session.state == state]
        return {"tavern_id": tavern_id, "sessions": [self._session_payload(session, include_events=False) for session in sessions]}

    def start_gameplay_session(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少访客身份")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        gameplay = self._find_gameplay(tavern, str((data or {}).get("gameplay_id") or (data or {}).get("gameplayId") or ""), user_id)
        character_id = str((data or {}).get("character_id") or (data or {}).get("characterId") or "").strip()
        if not character_id and tavern.characters:
            character_id = tavern.characters[0].id

        for session in self.store.list_gameplay_sessions(tavern_id):
            if session.visitor_id == user_id and session.gameplay_id == gameplay["id"] and session.state in {"started", "in_progress"}:
                return {"ok": True, "resumed": True, "session": self._session_payload(session), "scene": scene_for_node(gameplay, session.current_node_id)}

        first_node_id = (gameplay.get("nodes") or [{"id": "start"}])[0].get("id", "start")
        session = GameplaySession.new(
            tavern_id=tavern_id,
            gameplay_id=gameplay["id"],
            visitor_id=user_id,
            character_id=character_id,
            current_node_id=first_node_id,
        )
        start_event = new_event("session_started", narration=scene_for_node(gameplay, first_node_id).get("narration", ""), to_node_id=first_node_id, source="system")
        session.add_event(start_event)
        self.store.save_gameplay_session(tavern_id, session)
        return {"ok": True, "resumed": False, "session": self._session_payload(session), "scene": scene_for_node(gameplay, session.current_node_id)}

    def advance_gameplay_session(
        self,
        tavern_id: str,
        session_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        session = self.store.get_gameplay_session(tavern_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="玩法会话不存在")
        if not self._is_owner(tavern, user_id) and session.visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能访问其他访客的玩法会话")

        gameplay = self._find_gameplay(tavern, session.gameplay_id, user_id)
        choice_id = str((data or {}).get("choice_id") or (data or {}).get("choiceId") or "").strip()
        result = self._advance_by_choice(gameplay, session, choice_id) if choice_id else fallback_result(gameplay, session)
        event = GameplayEvent.from_dict(result["event"])
        session.add_event(event)
        session.turn_count += 1
        session.current_node_id = str(result.get("next_node_id") or session.current_node_id)
        if result.get("completed") or is_complete_node(gameplay, session.current_node_id):
            session.state = "completed"
            session.completion = completion_payload(gameplay, session, event.narration)
        else:
            session.state = "in_progress"
        self.store.save_gameplay_session(tavern_id, session)
        return {
            "ok": True,
            "session": self._session_payload(session),
            "event": event.to_dict(),
            "scene": scene_for_node(gameplay, session.current_node_id),
            "completed": session.state == "completed",
        }

    def abandon_gameplay_session(self, tavern_id: str, session_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        session = self.store.get_gameplay_session(tavern_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="玩法会话不存在")
        if not self._is_owner(tavern, user_id) and session.visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能访问其他访客的玩法会话")
        session.state = "abandoned"
        session.add_event(new_event("abandoned", narration="访客放弃了这局玩法。", source="system"))
        self.store.save_gameplay_session(tavern_id, session)
        return {"ok": True, "session": self._session_payload(session)}

    def _find_gameplay(self, tavern: Tavern, gameplay_id: str, user_id: str) -> dict[str, Any]:
        if not gameplay_id:
            raise HTTPException(status_code=400, detail="缺少玩法 ID")
        owner = self._is_owner(tavern, user_id)
        for gameplay in normalize_gameplay_definitions(tavern.gameplay_definitions):
            if gameplay.get("id") != gameplay_id:
                continue
            if owner or gameplay.get("status") == "published":
                return gameplay
            raise HTTPException(status_code=404, detail="玩法不存在或未发布")
        raise HTTPException(status_code=404, detail="玩法不存在")

    def _advance_by_choice(self, gameplay: dict[str, Any], session: GameplaySession, choice_id: str) -> dict[str, Any]:
        scene = scene_for_node(gameplay, session.current_node_id)
        choice = next((item for item in scene.get("choices", []) if item.get("id") == choice_id), None)
        if not choice:
            return fallback_result(gameplay, session)
        source_node = next((node for node in gameplay.get("nodes", []) if node.get("id") == session.current_node_id), {})
        raw_choice = next((item for item in source_node.get("choices", []) if item.get("id") == choice_id), {})
        next_node_id = str(raw_choice.get("next_node_id") or session.current_node_id)
        event = new_event(
            "choice_selected",
            narration=str(raw_choice.get("label") or choice.get("label") or "继续推进"),
            from_node_id=session.current_node_id,
            to_node_id=next_node_id,
            choice_id=choice_id,
            source="visitor",
        )
        return {
            "source": "choice",
            "event": event.to_dict(),
            "next_node_id": next_node_id,
            "completed": is_complete_node(gameplay, next_node_id, choice=raw_choice),
            "scene": scene_for_node(gameplay, next_node_id),
        }

    def _session_payload(self, session: GameplaySession, *, include_events: bool = True) -> dict[str, Any]:
        payload = session.to_dict()
        if not include_events:
            payload.pop("events", None)
        return payload
