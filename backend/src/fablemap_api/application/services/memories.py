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
from ...domain.tavern_policy import clean_text
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

class MemoryApplicationMixin:
    """Focused memory use cases."""

    def list_memories(
        self,
        tavern_id: str,
        *,
        user_id: str = "",
        visitor_id: str = "",
        scope: str = "",
        dimension: str = "",
        horizon: str = "",
        pinned: bool | None = None,
        keyword: str = "",
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        atoms = [
            atom
            for atom in self.store.list_memory_atoms(tavern_id)
            if self._memory_visible(atom, tavern, user_id)
            and (not visitor_id or atom.visitor_id == visitor_id or atom.subject == visitor_id)
            and (not scope or atom.scope == scope)
            and (not dimension or atom.dimension == dimension)
            and (not horizon or atom.horizon == horizon)
            and (pinned is None or atom.pinned is pinned)
            and (not keyword or keyword.lower() in atom.content.lower())
        ]
        safe_limit = max(1, min(int(limit or 50), 500))
        safe_offset = max(0, int(offset or 0))
        page = atoms[safe_offset : safe_offset + safe_limit]
        return {
            "memories": [atom.to_dict() for atom in page],
            "count": len(page),
            "total": len(atoms),
            "offset": safe_offset,
            "limit": safe_limit,
        }

    def list_memory_atoms(
        self,
        tavern_id: str,
        *,
        user_id: str = "",
        scope: str = "",
        dimension: str = "",
        horizon: str = "",
        visibility: str = "",
        visitor_id: str = "",
        character_id: str = "",
        place_id: str = "",
        limit: int = 100,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        filters = memory_atom_filters(
            scope=scope,
            dimension=dimension,
            horizon=horizon,
            visibility=visibility,
            visitor_id=visitor_id,
            character_id=character_id,
            place_id=place_id,
        )
        max_items = clamp_memory_limit(limit)

        atoms: list[dict[str, Any]] = []
        for atom in self.store.list_memory_atoms(tavern_id):
            if not can_view_memory_atom(atom, tavern, user_id):
                continue
            if not memory_atom_matches_filters(atom, **filters):
                continue
            atoms.append(atom.to_dict())
            if len(atoms) >= max_items:
                break

        return {
            "tavern_id": tavern_id,
            "memory_atoms": atoms,
            "count": len(atoms),
            "filters": filters,
        }

    def get_memory_atom(self, tavern_id: str, memory_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        atom = self.store.get_memory_atom(tavern_id, memory_id)
        if not atom:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not can_view_memory_atom(atom, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能访问这条记忆")
        return {"tavern_id": tavern_id, "memory_atom": atom.to_dict()}

    def create_memory_atom(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=401, detail="创建记忆需要明确用户身份")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        try:
            atom = memory_atom_from_payload(data or {}, tavern_id=tavern_id, user_id=user_id, now=_utc_now_iso())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        reason = validate_memory_atom_create(atom, tavern, user_id)
        if reason:
            raise HTTPException(status_code=403, detail=reason)
        created = self.store.save_memory_atom(tavern_id, atom)
        return {"ok": True, "tavern_id": tavern_id, "memory_atom": created.to_dict()}

    def update_memory_atom(
        self,
        tavern_id: str,
        memory_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        existing = self.store.get_memory_atom(tavern_id, memory_id)
        if not existing:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not can_edit_memory_atom(existing, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能修改这条记忆")
        try:
            updated = memory_atom_from_payload(
                data or {},
                tavern_id=tavern_id,
                user_id=user_id,
                now=_utc_now_iso(),
                existing=existing,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        reason = validate_memory_atom_update(updated, tavern, user_id)
        if reason:
            raise HTTPException(status_code=403, detail=reason)
        saved = self.store.save_memory_atom(tavern_id, updated)
        return {"ok": True, "tavern_id": tavern_id, "memory_atom": saved.to_dict()}

    def feedback_memory_atom(
        self,
        tavern_id: str,
        memory_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=401, detail="反馈记忆需要明确用户身份")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        existing = self.store.get_memory_atom(tavern_id, memory_id)
        if not existing:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not can_edit_memory_atom(existing, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能修改这条记忆")
        if "correct" not in (data or {}):
            raise HTTPException(status_code=400, detail="correct is required")

        now = _utc_now_iso()
        correct = bool((data or {}).get("correct"))
        corrected_content = clean_text((data or {}).get("content", ""), max_length=500)
        metadata = dict(existing.metadata or {})
        metadata["feedback_updated_at"] = now
        metadata["feedback_user_id"] = user_id

        if correct:
            metadata["feedback_correct_count"] = int(metadata.get("feedback_correct_count") or 0) + 1
            metadata["reinforcement_count"] = int(metadata.get("reinforcement_count") or 0) + 1
            metadata["last_reinforced_at"] = now
            metadata["flagged_wrong"] = False
            metadata.pop("excluded_from_prompt", None)
            existing.importance = min(1.0, float(existing.importance or 0.0) + 0.05)
            existing.confidence = min(1.0, float(existing.confidence or 0.0) + 0.03)
            feedback_status = "reinforced"
        elif corrected_content:
            metadata["feedback_correction_count"] = int(metadata.get("feedback_correction_count") or 0) + 1
            metadata["flagged_wrong"] = False
            metadata.pop("excluded_from_prompt", None)
            existing.content = corrected_content
            existing.importance = max(float(existing.importance or 0.0), 0.6)
            existing.confidence = max(float(existing.confidence or 0.0), 0.75)
            feedback_status = "corrected"
        else:
            metadata["feedback_wrong_count"] = int(metadata.get("feedback_wrong_count") or 0) + 1
            metadata["flagged_wrong"] = True
            metadata["excluded_from_prompt"] = True
            existing.importance = max(0.0, float(existing.importance or 0.0) - 0.15)
            existing.confidence = max(0.0, float(existing.confidence or 0.0) - 0.25)
            feedback_status = "flagged_wrong"

        existing.updated_at = now
        existing.metadata = metadata
        saved = self.store.save_memory_atom(tavern_id, existing)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "memory_atom": saved.to_dict(),
            "feedback": {
                "status": feedback_status,
                "correct": correct,
            },
        }

    def delete_memory_atom(self, tavern_id: str, memory_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        atom = self.store.get_memory_atom(tavern_id, memory_id)
        if not atom:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not can_edit_memory_atom(atom, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能删除这条记忆")
        deleted = self.store.delete_memory_atom(tavern_id, memory_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="记忆不存在")
        return {"ok": True, "tavern_id": tavern_id, "memory_id": memory_id}

    def _memory_visible(self, atom: Any, tavern: Tavern, user_id: str) -> bool:
        return can_view_memory_atom(atom, tavern, user_id)
