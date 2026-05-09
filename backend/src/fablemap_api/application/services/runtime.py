from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any
from fablemap_api.core.cultivation_logic import is_cultivation_tavern, update_cultivation_chat_count, get_progression_status

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
from fablemap_api.core.skill_packs import (
    LOCAL_RUMOR_SKILL_PACK_ID,
    NEIGHBORHOOD_KNOWLEDGE_SKILL_PACK_ID,
    build_local_rumor_prompt_block,
    build_neighborhood_knowledge_prompt_block,
    is_skill_pack_enabled,
    normalize_skill_pack_settings,
)
from fablemap_api.core.episode_builder import build_episode_export
from fablemap_api.core.voice_greeting import build_voice_greeting_preview
from fablemap_api.core.visual_souvenir import build_visual_souvenir_preview
from fablemap_api.core.tavern import (
    ChatMessage,
    LLMConfig as TavernLLMConfig,
    Tavern,
    VisitorState,
    VoiceConfig,
    WorldInfoEntry,
    _hydrate_system_public_welfare_llm_config,
    _is_system_or_public_welfare_tavern_data,
    _normalize_gender,
)
from fablemap_api.core.continuity_validator import ContinuityValidator, ConflictReport

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
from ...domain.tavern_policy import can_view_memory, clean_text, relationship_stage_for

from ...core.affinity import AffinityCalculator, AffinityStage, AffinityPromptBuilder
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


RULES_BACKENDS = {"rules", "rule_based", "public_welfare"}


def _is_rules_backend(backend: str) -> bool:
    return str(backend or "").strip().lower() in RULES_BACKENDS


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _days_since(iso_timestamp: str | None) -> int:
    if not iso_timestamp:
        return 0
    try:
        ts = iso_timestamp.replace("Z", "+00:00")
        past = datetime.fromisoformat(ts).astimezone(UTC)
        now = datetime.now(UTC)
        return max(0, (now - past).days)
    except (ValueError, TypeError):
        return 0


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


class RuntimeApplicationMixin:
    """Focused runtime use cases."""

    def chat_history(
        self,
        tavern_id: str,
        *,
        visitor_id: str,
        character_id: str | None = None,
        user_id: str = "",
        limit: int = 50,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        self._ensure_visible(tavern, user_id)
        if user_id and user_id != visitor_id and not self._is_owner(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能访问其他访客的聊天记录")

        messages = self.store.get_chat_history(tavern_id, visitor_id, character_id, limit=limit)
        return {"messages": [message.to_dict() for message in messages]}

    def send_chat(
        self,
        tavern_id: str,
        *,
        character_id: str,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        visitor_gender: str = "",
        user_id: str = "",
        extra_context: list[dict[str, Any]] | None = None,
        display_message: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        if user_id and user_id != visitor_id and not self._is_owner(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能代替其他访客发送消息")
        self._ensure_visible(tavern, user_id)

        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")

        clean_message = clean_text(message, max_length=1600)
        if not clean_message:
            raise HTTPException(status_code=400, detail="消息不能为空")

        llm_config = self._get_runtime_llm_config(tavern_id)
        if tavern.status != "open":
            if not llm_config or not llm_config.is_configured():
                return self._degraded_chat(
                    character_id,
                    character.name,
                    "closed",
                    "AI 后端还没配置",
                    "这间空间还没有可用的模型配置。",
                    reason="llm_not_configured",
                )
            return self._degraded_chat(
                character_id,
                character.name,
                tavern.status,
                "空间正在歇业",
                "店主暂时关闭了这间空间。",
                reason="tavern_closed",
            )

        if not llm_config or not llm_config.is_configured():
            return self._degraded_chat(
                character_id,
                character.name,
                "closed",
                "AI 后端还没配置",
                "这间空间还没有可用的模型配置。",
                reason="llm_not_configured",
            )

        prompt_visitor_state = self.store.get_visitor_state(tavern_id, visitor_id)
        degradation: dict[str, Any] | None = None
        try:
            response_text = self._chat_response_text(
                tavern=tavern,
                character_name=character.name,
                character_prompt=character.system_prompt or character.personality or character.description,
                message=clean_message,
                llm_config=llm_config,
                extra_context=extra_context or [],
                visitor_state=prompt_visitor_state,
            )
        except LLMError as exc:
            return self._degraded_chat(
                character_id,
                character.name,
                tavern.status,
                "AI 后端暂时不可用",
                "模型调用失败，本轮没有生成 NPC 回复。",
                reason="llm_error",
                technical_detail=str(exc)[:180],
                llm_config=llm_config,
                tavern=tavern,
            )

        now = _utc_now_iso()
        user_message = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            tavern_id=tavern_id,
            character_id=character_id,
            visitor_id=visitor_id,
            visitor_name=clean_text(visitor_name, max_length=24),
            role="user",
            content=clean_text(display_message or clean_message, max_length=1600),
            timestamp=now,
        )
        assistant_message = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            tavern_id=tavern_id,
            character_id=character_id,
            visitor_id=visitor_id,
            visitor_name=user_message.visitor_name,
            role="assistant",
            content=response_text,
            timestamp=now,
        )
        self.store.add_chat_message(user_message)
        self.store.add_chat_message(assistant_message)
        if not _is_rules_backend(llm_config.backend):
            self.store.add_token_usage(tavern_id, max(1, (len(clean_message) + len(response_text)) // 4))

        # Calculate and update visitor affinity based on chat interaction
        affinity_result = self._update_affinity_from_chat(
            tavern_id=tavern_id,
            visitor_id=visitor_id,
            visitor_message=clean_message,
            character_response=response_text,
            visitor_gender=visitor_gender,
            now=now,
        )
        visitor_state = affinity_result["visitor_state"]

        created_memories: list[dict[str, Any]] = []
        try:
            atoms = auto_create_memories_from_chat(
                self.store,
                tavern_id,
                visitor_id,
                character_id,
                character.name,
                user_message.content,
                response_text,
                user_message_id=user_message.id,
                assistant_message_id=assistant_message.id,
                importance_threshold=0.5,
            )
            created_memories = [atom.to_dict() for atom in atoms]
        except Exception:
            created_memories = []

        conflicts: list[dict[str, Any]] = []
        try:
            confirmed_cards = [
                c for c in self.store.list_state_cards(tavern_id)
                if c.status == "confirmed" and (c.canon_scope == "tavern" or c.visitor_id == visitor_id)
            ]
            validator = ContinuityValidator()
            reports = validator.validate_reply(response_text, confirmed_cards)
            conflicts = [
                {
                    "card_id": r.card_id,
                    "card_title": r.card_title,
                    "reason": r.contradiction_reason,
                    "severity": r.severity
                }
                for r in reports
            ]
        except Exception as exc:
            logger.warning("Continuity validation failed: %s", exc)

        state_card_candidates: list[dict[str, Any]] = []
        try:
            state_card_candidates = self.create_state_card_candidates_from_chat(
                tavern_id=tavern_id,
                visitor_id=visitor_id,
                character_id=character_id,
                user_message=user_message.content,
                assistant_message=response_text,
                source_message_ids=[user_message.id, assistant_message.id],
                proposed_by=visitor_id,
                source="chat",
            )
        except Exception:
            state_card_candidates = []

        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response_text,
            "mood": "curious",
            "degraded": bool(degradation),
            "degradation": degradation,
            "response_mode": self._chat_response_mode(
                llm_config,
                tavern=tavern,
                reason=str((degradation or {}).get("reason") or ""),
            ),
            "tavern_status": "closed" if degradation else tavern.status,
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "state_card_candidates": state_card_candidates,
            "conflicts": conflicts,
            "timestamp": now,
        }

    def test_llm_config(self, data: dict[str, Any]) -> dict[str, Any]:
        """Probe a supplied LLM config without exposing or persisting secrets."""
        payload = data or {}
        backend = str(payload.get("backend") or "openai").strip() or "openai"
        model = str(payload.get("model") or "").strip()
        if _is_rules_backend(backend):
            return {
                "ok": False,
                "message": "规则后端不是可用的 NPC LLM；请配置外部模型或使用系统公益 LLM。",
                "model": model or backend,
                "preview": "",
            }

        try:
            cfg = ClientLLMConfig(
                backend=backend,
                model=model,
                api_key=str(payload.get("api_key") or ""),
                base_url=str(payload.get("base_url") or ""),
                temperature=float(payload.get("temperature", 0.8)),
                max_tokens=int(payload.get("max_tokens", 256)),
                top_p=float(payload.get("top_p", 1.0)),
            )
            if not cfg.api_key and not cfg.base_url:
                return {"ok": False, "message": "请提供 API Key 或 Base URL"}
            response = create_client(cfg).complete([{"role": "user", "content": "你好，请回复一个简单的问候。"}])
            return {
                "ok": True,
                "message": "连接成功",
                "model": response.model,
                "preview": clean_text(response.content, max_length=200),
            }
        except LLMError as exc:
            return {"ok": False, "message": f"连接失败：{str(exc)[:200]}"}
        except Exception as exc:
            logger.warning("LLM config probe failed for backend=%s model=%s: %s", backend, model, exc)
            return {"ok": False, "message": f"连接失败：{str(exc)[:200]}"}

    def test_tavern_llm(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        if not payload:
            llm_config = self._get_runtime_llm_config(tavern_id)
            payload = llm_config.to_dict_private() if llm_config and hasattr(llm_config, "to_dict_private") else {}
        else:
            hydrated = _hydrate_system_public_welfare_llm_config(
                tavern,
                TavernLLMConfig.from_dict(payload),
                tavern_id=tavern_id,
            )
            payload = hydrated.to_dict_private()
        return self.test_llm_config(payload)

    def get_group_chat_config(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        return {
            "tavern_id": tavern_id,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": normalize_group_chat_config(tavern.group_chat_config),
            "characters": [self._group_character_payload(character) for character in tavern.characters],
            "character_count": len(tavern.characters),
        }

    def update_group_chat_config(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        if "group_chat_enabled" in payload:
            tavern.group_chat_enabled = normalize_bool(payload.get("group_chat_enabled"))
        if isinstance(payload.get("group_chat_config"), dict):
            tavern.group_chat_config = normalize_group_chat_config({**(tavern.group_chat_config or {}), **payload["group_chat_config"]})
        if isinstance(payload.get("character_talkativeness"), dict):
            for character_id, talkativeness in payload["character_talkativeness"].items():
                character = next((item for item in tavern.characters if item.id == character_id), None)
                if character:
                    character.talkativeness = normalize_talkativeness(talkativeness)
        tavern = self.store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": normalize_group_chat_config(tavern.group_chat_config),
            "characters": [self._group_character_payload(character) for character in tavern.characters],
        }

    def update_character_talkativeness(self, tavern_id: str, character_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.update_group_chat_config(
            tavern_id,
            {"character_talkativeness": {character_id: (data or {}).get("talkativeness", (data or {}).get("value", 0.5))}},
            user_id,
        )

    def send_group_chat(
        self,
        tavern_id: str,
        *,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        visitor_gender: str = "",
        user_id: str = "",
        display_message: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id)
        self._ensure_visible(tavern, user_id)

        if not tavern.group_chat_enabled:
            raise HTTPException(status_code=400, detail="群聊未启用")
        if not tavern.characters:
            raise HTTPException(status_code=400, detail="空间没有角色")
        clean_message = clean_text(message, max_length=1600)
        if not clean_message:
            raise HTTPException(status_code=400, detail="消息不能为空")
        if tavern.status != "open":
            return {"messages": [], "error": "空间正在歇业", "degraded": True}

        llm_config = self._get_runtime_llm_config(tavern_id)
        if not llm_config or not llm_config.is_configured():
            return {"messages": [], "error": "AI 后端还没配置", "degraded": True}

        config = normalize_group_chat_config(tavern.group_chat_config)
        manager = GroupChatManager()
        manager.strategy = config["strategy"]
        manager.set_max_responses_per_turn(config["max_responses_per_turn"])

        now = _utc_now_iso()
        visitor_display_name = clean_text(visitor_name, max_length=32) or "旅人"
        saved_user_content = clean_text(display_message or clean_message, max_length=1600)
        history = self._group_chat_history_messages(tavern, visitor_id, limit=30)
        cooled_character_ids = self._group_chat_cooled_character_ids(
            history,
            cooldown_seconds=int(config.get("response_cooldown_seconds", 0) or 0),
            now_iso=now,
        )

        for character in tavern.characters:
            manager.add_member(
                GroupMember(
                    character_id=character.id,
                    name=character.name,
                    talkativeness=0.0 if character.id in cooled_character_ids else character.talkativeness,
                    avatar_url=self._character_avatar(character),
                )
            )
        manager.add_member(GroupMember(character_id="user", name=visitor_display_name, talkativeness=1.0, is_user=True))
        manager.add_user_message(clean_message)

        current_user_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        self.store.add_chat_message(
            ChatMessage(
                id=current_user_message_id,
                tavern_id=tavern_id,
                character_id="_group",
                visitor_id=visitor_id,
                visitor_name=visitor_display_name,
                role="user",
                content=saved_user_content,
                timestamp=now,
            )
        )

        active_character_ids = [member.character_id for member in manager.members if not member.is_user and not member.is_narrator and member.talkativeness > 0]
        self._seed_group_round_robin_selector(manager, active_character_ids, history)
        prompt_visitor_state = self.store.get_visitor_state(tavern_id, visitor_id)
        responses: list[dict[str, Any]] = []
        total_token_count = 0
        turn_degraded = False

        for speaker in manager.select_next_speakers():
            if speaker.is_user:
                continue
            character = next((item for item in tavern.characters if item.id == speaker.character_id), None)
            if not character:
                continue

            prompt_message = f"{visitor_display_name}: {clean_message}" if config.get("require_name_prefix", True) else clean_message
            degradation: dict[str, Any] | None = None
            try:
                response_text = self._chat_response_text(
                    tavern=tavern,
                    character_name=character.name,
                    character_prompt=character.system_prompt or character.personality or character.description,
                    message=prompt_message,
                    llm_config=llm_config,
                    extra_context=[self._group_history_prompt_item(item, tavern, visitor_display_name) for item in history],
                    visitor_state=prompt_visitor_state,
                )
            except LLMError as exc:
                turn_degraded = True
                degradation = {
                    "reason": "llm_error",
                    "title": "AI 后端暂时不可用",
                    "message": "模型调用失败，本轮该 NPC 没有生成回复。",
                    "action": "店主可以检查 API Key、模型名称或 Base URL。",
                    "technical_detail": str(exc)[:180],
                }
                logger.warning("Group chat LLM error for tavern=%s character=%s: %s", tavern_id, speaker.character_id, exc)
                continue
            except Exception as exc:
                logger.warning("Group chat response failed for tavern=%s character=%s: %s", tavern_id, speaker.character_id, exc)
                turn_degraded = True
                degradation = {
                    "reason": "llm_unexpected_error",
                    "title": "AI 回应暂时中断",
                    "message": "群聊后端遇到异常，本轮该 NPC 没有生成回复。",
                    "action": "稍后重试；如果持续出现，请店主重新测试 AI 配置。",
                    "technical_detail": str(exc)[:180],
                }
                continue

            output_rule_result = apply_output_rules(response_text, tavern.output_rules)
            response_text = output_rule_result.get("text", response_text)
            token_count = max(1, (len(clean_message) + len(response_text)) // 4)
            total_token_count += token_count
            assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
            response_timestamp = _utc_now_iso()
            assistant_message = ChatMessage(
                id=assistant_message_id,
                tavern_id=tavern_id,
                character_id=speaker.character_id,
                visitor_id=visitor_id,
                visitor_name=visitor_display_name,
                role="assistant",
                content=response_text,
                timestamp=response_timestamp,
                token_count=token_count,
            )
            self.store.add_chat_message(assistant_message)
            history.append(assistant_message)
            manager.add_assistant_message(speaker.character_id, response_text, speaker.name)
            payload = {
                "id": assistant_message_id,
                "character_id": speaker.character_id,
                "character_name": speaker.name,
                "avatar": speaker.avatar_url,
                "content": response_text,
                "timestamp": response_timestamp,
                "degraded": bool(degradation),
                "output_rules": {
                    "changed": output_rule_result.get("changed", False),
                    "applied": output_rule_result.get("applied", []),
                    "errors": output_rule_result.get("errors", []),
                },
            }
            if degradation:
                payload["degradation"] = degradation
            responses.append(payload)

        if total_token_count:
            self.store.add_token_usage(tavern_id, total_token_count)
        assistant_text = "\n".join(
            f"{response.get('character_name') or '群聊角色'}: {response.get('content') or ''}".strip()
            for response in responses
            if response.get("content")
        )
        if responses:
            affinity_result = self._update_affinity_from_chat(
                tavern_id=tavern_id,
                visitor_id=visitor_id,
                visitor_message=clean_message,
                character_response=assistant_text,
                visitor_gender=visitor_gender,
                now=now,
            )
            visitor_state = affinity_result["visitor_state"]
        else:
            affinity_result = {"affinity": None}
            visitor_state = self._touch_visitor_state(tavern_id, visitor_id, now, visitor_gender=visitor_gender)
        if not responses:
            return {
                "messages": [],
                "speaker_count": 0,
                "strategy": manager.strategy,
                "error": "群聊角色暂时没有回应",
                "degraded": True,
                "visitor_state": visitor_state.to_dict(),
                "affinity": affinity_result.get("affinity"),
                "created_memories": [],
                "state_card_candidates": [],
            }

        created_memories: list[dict[str, Any]] = []
        try:
            atoms = auto_create_memories_from_chat(
                self.store,
                tavern_id,
                visitor_id,
                "",
                "群聊",
                saved_user_content,
                assistant_text,
                user_message_id=current_user_message_id,
                assistant_message_id=str(responses[0].get("id") or ""),
                importance_threshold=0.5,
            )
            created_memories = [atom.to_dict() for atom in atoms]
        except Exception:
            created_memories = []

        conflicts: list[dict[str, Any]] = []
        try:
            confirmed_cards = [
                c for c in self.store.list_state_cards(tavern_id)
                if c.status == "confirmed" and (c.canon_scope == "tavern" or c.visitor_id == visitor_id)
            ]
            validator = ContinuityValidator()
            reports = validator.validate_reply(assistant_text, confirmed_cards)
            conflicts = [
                {
                    "card_id": r.card_id,
                    "card_title": r.card_title,
                    "reason": r.contradiction_reason,
                    "severity": r.severity
                }
                for r in reports
            ]
        except Exception as exc:
            logger.warning("Group chat continuity validation failed: %s", exc)

        state_card_candidates: list[dict[str, Any]] = []
        try:
            state_card_candidates = self.create_state_card_candidates_from_chat(
                tavern_id=tavern_id,
                visitor_id=visitor_id,
                character_id="",
                user_message=saved_user_content,
                assistant_message=assistant_text,
                source_message_ids=[current_user_message_id, str(responses[0].get("id") or "")],
                proposed_by=visitor_id,
                source="group_chat",
            )
        except Exception:
            state_card_candidates = []

        return {
            "messages": responses,
            "speaker_count": len(responses),
            "strategy": manager.strategy,
            "degraded": turn_degraded,
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "state_card_candidates": state_card_candidates,
            "conflicts": conflicts,
        }

    def get_group_chat_history(self, tavern_id: str, visitor_id: str = "", user_id: str = "", limit: int = 50) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        requested_visitor_id = str(visitor_id or "").strip()
        user_id = str(user_id or "").strip()
        if requested_visitor_id:
            resolved_visitor_id = requested_visitor_id
            self._ensure_group_chat_visitor_scope(tavern, user_id, resolved_visitor_id, allow_owner_all=True)
        elif self._is_owner(tavern, user_id):
            resolved_visitor_id = ""
            self._ensure_group_chat_visitor_scope(tavern, user_id, resolved_visitor_id, allow_owner_all=True)
        else:
            resolved_visitor_id = user_id
            self._ensure_group_chat_visitor_scope(tavern, user_id, resolved_visitor_id)
        self._ensure_visible(tavern, user_id)

        history = self._group_chat_history_messages(tavern, resolved_visitor_id, limit=clamp_chat_history_limit(limit))
        messages = []
        for message in history:
            character = next((item for item in tavern.characters if item.id == message.character_id), None)
            character_name = message.visitor_name or "旅人" if message.character_id == "_group" else (character.name if character else message.character_id)
            messages.append(
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "character_id": message.character_id,
                    "character_name": character_name,
                    "visitor_name": message.visitor_name,
                    "timestamp": message.timestamp,
                }
            )
        return {"messages": messages, "message_count": len(messages)}

    def get_voice_config(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        self._get_tavern_or_404(tavern_id)
        voice_config = self.store.get_voice_config(tavern_id) or VoiceConfig()
        return {"voice_config": voice_config.to_dict()}

    def preview_voice_greeting(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        payload = data or {}
        character_id = str(payload.get("character_id") or payload.get("characterId") or "").strip()
        if not character_id:
            raise HTTPException(status_code=400, detail="语音问候预览需要 character_id")
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        voice_config = self.store.get_voice_config(tavern_id) or VoiceConfig()
        return build_voice_greeting_preview(
            tavern_id=tavern.id,
            tavern_name=tavern.name,
            character=character,
            voice_config=voice_config,
            greeting_index=payload.get("greeting_index", payload.get("greetingIndex", 0)),
        )

    def preview_visual_souvenir(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not str(user_id or "").strip():
            raise HTTPException(status_code=401, detail="纪念图预览需要明确用户身份")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        payload = data or {}
        visitor_id = str(payload.get("visitor_id") or payload.get("visitorId") or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="纪念图预览需要 visitor_id")
        if visitor_id != user_id and not self._is_owner(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能为其他访客预览纪念图")
        character_id = str(payload.get("character_id") or payload.get("characterId") or "").strip()
        if not character_id:
            raise HTTPException(status_code=400, detail="纪念图预览需要 character_id")
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        user_message = payload.get("user_message") or payload.get("userMessage") or ""
        assistant_message = payload.get("assistant_message") or payload.get("assistantMessage") or ""
        if not clean_text(f"{user_message} {assistant_message}", max_length=1200):
            raise HTTPException(status_code=400, detail="纪念图预览需要可观察回合文本")
        return build_visual_souvenir_preview(
            tavern_id=tavern.id,
            tavern_name=tavern.name,
            character_name=character.name,
            visitor_id=visitor_id,
            user_message=user_message,
            assistant_message=assistant_message,
            style=str(payload.get("style") or ""),
        )

    def save_voice_config(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        if "enabled" in payload:
            payload = {**payload, "enabled": normalize_bool(payload.get("enabled"))}
        if "auto_play" in payload:
            payload = {**payload, "auto_play": normalize_bool(payload.get("auto_play"))}
        voice_config = VoiceConfig.from_dict(payload)
        tavern.voice_config = voice_config
        self.store.save_voice_config(tavern_id, voice_config)
        self.store.update_tavern(tavern)
        return {"ok": True, "voice_config": voice_config.to_dict()}

    def synthesize_voice(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> bytes:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        text = clean_text((data or {}).get("text"), max_length=1200)
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        voice_config = self.store.get_voice_config(tavern_id)
        if not voice_config or not voice_config.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")
        llm_config = self._get_runtime_llm_config(tavern_id)
        api_key = llm_config.api_key if llm_config else ""
        base_url = llm_config.base_url if llm_config else ""
        try:
            from fablemap_api.core.tts_clients import TTSConfig, create_tts_provider

            provider = create_tts_provider(
                TTSConfig(
                    provider=voice_config.tts_provider,
                    api_key=api_key,
                    base_url=base_url,
                    voice=voice_config.tts_voice,
                    model=voice_config.tts_model,
                    speed=voice_config.tts_speed,
                    language=voice_config.tts_language,
                )
            )
            result = provider.synthesize(text, voice=voice_config.tts_voice or None)
            return result.audio
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"语音合成失败: {exc}") from exc

    def transcribe_voice(
        self,
        tavern_id: str,
        audio_bytes: bytes,
        *,
        audio_format: str = "webm",
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio data")
        voice_config = self.store.get_voice_config(tavern_id)
        if not voice_config or not voice_config.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")
        if voice_config.stt_provider == "browser":
            raise HTTPException(status_code=400, detail="浏览器 STT 无需上传到后端")
        try:
            from fablemap_api.core.stt_service import transcribe_bytes

            text = transcribe_bytes(
                audio_bytes,
                format=audio_format,
                provider=voice_config.stt_provider,
                model=voice_config.stt_model or "base",
                language="",
            )
            return {"text": text, "provider": voice_config.stt_provider}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"语音转写失败: {exc}") from exc

    def _group_character_payload(self, character: Any) -> dict[str, Any]:
        return {
            "id": character.id,
            "name": character.name,
            "talkativeness": normalize_talkativeness(character.talkativeness),
            "avatar": self._character_avatar(character),
        }

    def _character_avatar(self, character: Any) -> str:
        sprites = getattr(character, "sprites", None)
        return str(getattr(character, "avatar", "") or (sprites.get("neutral") if sprites else "") or "")

    def _ensure_group_chat_visitor_scope(
        self,
        tavern: Tavern,
        user_id: str,
        visitor_id: str,
        *,
        allow_owner_all: bool = False,
    ) -> None:
        user_id = str(user_id or "").strip()
        visitor_id = str(visitor_id or "").strip()
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少访客身份")
        if self._is_owner(tavern, user_id):
            if visitor_id or allow_owner_all:
                return
        if visitor_id and visitor_id == user_id:
            return
        raise HTTPException(status_code=403, detail="不能访问其他访客的群聊会话")

    def _parse_group_chat_timestamp(self, value: str) -> datetime | None:
        text = str(value or "").strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)

    def _group_chat_cooled_character_ids(self, history: list[ChatMessage], *, cooldown_seconds: int, now_iso: str) -> set[str]:
        if cooldown_seconds <= 0:
            return set()
        now_dt = self._parse_group_chat_timestamp(now_iso)
        if now_dt is None:
            return set()
        cooled: set[str] = set()
        for message in reversed(history):
            if message.role != "assistant":
                continue
            message_dt = self._parse_group_chat_timestamp(message.timestamp)
            if message_dt is None:
                continue
            elapsed = (now_dt - message_dt).total_seconds()
            if 0 <= elapsed < cooldown_seconds:
                cooled.add(message.character_id)
            elif elapsed >= cooldown_seconds:
                break
        return cooled

    def _seed_group_round_robin_selector(self, manager: GroupChatManager, active_character_ids: list[str], history: list[ChatMessage]) -> None:
        if manager.strategy != "round_robin" or not active_character_ids:
            return
        for message in reversed(history):
            if message.role == "assistant" and message.character_id in active_character_ids:
                manager.selector._round_robin_index = (active_character_ids.index(message.character_id) + 1) % len(active_character_ids)
                return

    def _group_chat_history_messages(self, tavern: Tavern, visitor_id: str, *, limit: int = 50) -> list[ChatMessage]:
        character_ids = {character.id for character in tavern.characters}
        character_ids.add("_group")
        sessions = self.store.list_chat_sessions(tavern.id, visitor_id=visitor_id, limit=None)
        messages: list[ChatMessage] = []
        for session in sessions:
            for message in session.get("messages", []):
                if message.character_id in character_ids:
                    messages.append(message)
        messages.sort(key=lambda item: (item.timestamp or "", item.id or ""))
        return messages[-clamp_chat_history_limit(limit):]

    def _group_history_prompt_item(self, message: ChatMessage, tavern: Tavern, visitor_display_name: str) -> dict[str, str]:
        character = next((item for item in tavern.characters if item.id == message.character_id), None)
        if message.role == "user":
            name = message.visitor_name or visitor_display_name or "旅人"
        elif character:
            name = character.name
        else:
            name = message.character_id or "群聊"
        content = f"{name}: {message.content}" if name else message.content
        return {"role": message.role, "content": clean_text(content, max_length=800)}

    def _chat_response_text(
        self,
        *,
        tavern: Tavern,
        character_name: str,
        character_prompt: str,
        message: str,
        llm_config: Any,
        extra_context: list[dict[str, Any]],
        visitor_state: VisitorState | None = None,
    ) -> str:
        client = create_client(
            ClientLLMConfig(
                backend=llm_config.backend,
                model=llm_config.model,
                api_key=llm_config.api_key,
                base_url=llm_config.base_url,
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                top_p=llm_config.top_p,
                frequency_penalty=getattr(llm_config, "frequency_penalty", 0.0),
                presence_penalty=getattr(llm_config, "presence_penalty", 0.0),
            )
        )
        system_content = f"你是 FableMap 空间「{tavern.name}」里的 NPC {character_name}。{character_prompt}"
        skill_pack_prompt = self._skill_pack_prompt_block(tavern)
        if skill_pack_prompt:
            system_content = f"{system_content}\n\n{skill_pack_prompt}"
        affinity_prompt = self._affinity_prompt_block_for_state(visitor_state)
        if affinity_prompt:
            system_content = f"{system_content}\n\n{affinity_prompt}"
        messages = [
            {"role": "system", "content": system_content},
            *[
                {"role": str(item.get("role") or "user"), "content": clean_text(item.get("content"), max_length=800)}
                for item in extra_context[-12:]
                if isinstance(item, dict) and item.get("content")
            ],
            {"role": "user", "content": message},
        ]
        response_text = clean_text(client.complete(messages).content, max_length=2400)
        if not response_text:
            raise LLMError("LLM returned an empty response")
        return response_text

    def _affinity_prompt_block_for_state(self, state: VisitorState | None) -> str:
        if not state:
            return ""
        return AffinityPromptBuilder().build_prompt_block(
            AffinityStage.from_string(state.relationship_stage or "stranger"),
            float(state.relationship_strength or 0.0),
            interaction_count=state.visit_count or 0,
        )

    def _skill_pack_prompt_block(self, tavern: Tavern) -> str:
        settings = normalize_skill_pack_settings(tavern.skill_packs)
        blocks = []
        
        # Local Rumor Pack
        if is_skill_pack_enabled(settings, LOCAL_RUMOR_SKILL_PACK_ID):
            config = next((item.get("config", {}) for item in settings if item.get("id") == LOCAL_RUMOR_SKILL_PACK_ID), {})
            limit = self._safe_int(config.get("limit"), 3) if isinstance(config, dict) else 3
            try:
                rumors = self.get_rumors_for_tavern(tavern.id, limit=limit)
                blocks.append(build_local_rumor_prompt_block(rumors, limit=limit))
            except Exception:
                pass
        
        # Neighborhood Knowledge Pack
        if is_skill_pack_enabled(settings, NEIGHBORHOOD_KNOWLEDGE_SKILL_PACK_ID):
            config = next((item.get("config", {}) for item in settings if item.get("id") == NEIGHBORHOOD_KNOWLEDGE_SKILL_PACK_ID), {})
            limit = self._safe_int(config.get("limit"), 5) if isinstance(config, dict) else 5
            radius = self._safe_int(config.get("radius"), 500) if isinstance(config, dict) else 500
            try:
                knowledge = self.neighborhood_service.list_nearby_knowledge(
                    tavern.lat, 
                    tavern.lon, 
                    radius_m=radius, 
                    limit=limit
                )
                blocks.append(build_neighborhood_knowledge_prompt_block(
                    knowledge, 
                    limit=limit, 
                    tavern_tags=tavern.intent_tags
                ))
            except Exception as exc:
                logger.warning("Failed to fetch neighborhood knowledge for prompt: %s", exc)
                
        return "\n\n".join(blocks) if blocks else ""

    def _chat_response_mode(
        self,
        llm_config: Any | None = None,
        *,
        tavern: Tavern | None = None,
        reason: str = "",
    ) -> dict[str, Any]:
        if reason == "llm_not_configured":
            return {
                "kind": "llm_not_configured",
                "label": "AI 后端未配置",
                "message": "这间空间还没有可用模型配置；店主需要在 AI 配置页补全连接并测试通过后，NPC 才会以外部 LLM 接待。",
                "requires_owner_llm": True,
            }
        if reason in {"llm_error", "llm_unexpected_error"}:
            public_welfare_runtime = bool(tavern and _is_system_or_public_welfare_tavern_data(tavern))
            return {
                "kind": "llm_unavailable",
                "label": "AI 后端不可用",
                "message": (
                    "系统公益 LLM 调用失败，本轮没有生成 NPC 回复；请稍后重试。"
                    if public_welfare_runtime
                    else "模型调用失败，本轮没有生成 NPC 回复；请稍后重试或请店主检查模型配置。"
                ),
                "requires_owner_llm": not public_welfare_runtime,
            }
        if tavern and _is_system_or_public_welfare_tavern_data(tavern):
            return {
                "kind": "system_public_welfare_llm",
                "label": "公益 LLM",
                "message": "公益空间由系统 LLM 驱动。",
                "requires_owner_llm": False,
            }
        if llm_config and _is_rules_backend(getattr(llm_config, "backend", "")):
            return self._chat_response_mode(reason="llm_not_configured")
        if reason:
            return {
                "kind": "unavailable",
                "label": "暂不可用",
                "message": "当前不能以 AI NPC 接待；请稍后再来，或联系店主检查营业状态与模型配置。",
                "requires_owner_llm": True,
            }
        return {
            "kind": "owner_llm",
            "label": "外部 LLM 模式",
            "message": "当前由店主配置的外部 LLM 驱动 NPC 对话。",
            "requires_owner_llm": True,
        }

    def _degraded_chat(
        self,
        character_id: str,
        character_name: str,
        status: str,
        title: str,
        message: str,
        *,
        reason: str = "unavailable",
        technical_detail: str = "",
        llm_config: Any | None = None,
        tavern: Tavern | None = None,
    ) -> dict[str, Any]:
        degradation = {"reason": reason, "title": title, "message": message, "action": "稍后再来或请店主检查配置。"}
        if technical_detail:
            degradation["technical_detail"] = technical_detail
        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": "",
            "mood": "quiet",
            "degraded": True,
            "degradation": degradation,
            "response_mode": self._chat_response_mode(llm_config, tavern=tavern, reason=reason),
            "tavern_status": status,
            "visitor_state": None,
            "created_memories": [],
            "state_card_candidates": [],
            "timestamp": _utc_now_iso(),
        }

    def _update_affinity_from_chat(
        self,
        *,
        tavern_id: str,
        visitor_id: str,
        visitor_message: str,
        character_response: str,
        now: str,
        visitor_gender: str = "",
    ) -> dict[str, Any]:
        state = self.store.get_visitor_state(tavern_id, visitor_id) or VisitorState(
            visitor_id=visitor_id,
            tavern_id=tavern_id,
            first_visit=now,
        )
        if not state.first_visit:
            state.first_visit = now
        prev_last_visit = state.last_visit
        state.last_visit = now
        if visitor_gender:
            state.gender = _normalize_gender(visitor_gender)

        calculator = AffinityCalculator()
        current_strength = float(state.relationship_strength or 0.0)
        current_stage = AffinityStage.from_string(state.relationship_stage or "stranger")

        # Apply decay if visitor has been away
        days_away = _days_since(prev_last_visit)
        if days_away > 0:
            decay_result = calculator.calculate_decay(
                current_strength=current_strength,
                current_stage=current_stage,
                days_since_last_visit=days_away,
            )
            if decay_result.changes:
                current_strength = decay_result.current_strength
                current_stage = decay_result.new_stage

        result = calculator.calculate_chat_affinity(
            current_strength=current_strength,
            current_stage=current_stage,
            visitor_message=visitor_message,
            character_response=character_response,
            interaction_count=state.visit_count or 0,
        )

        state.relationship_strength = result.current_strength
        state.relationship_stage = result.new_stage.value
        self.store.update_visitor_state(tavern_id, state)
        # 修行空间对话统计
        progression = None
        tavern = self.store.get_tavern(tavern_id)
        if tavern and is_cultivation_tavern(tavern):
            update_cultivation_chat_count(state)
            progression = get_progression_status(state)

        self.store.update_visitor_state(tavern_id, state)
        return {"visitor_state": state, "affinity": result.to_dict(), "progression": progression}

    def _touch_visitor_state(
        self,
        tavern_id: str,
        visitor_id: str,
        now: str,
        *,
        visitor_gender: str = "",
    ) -> VisitorState:
        state = self.store.get_visitor_state(tavern_id, visitor_id) or VisitorState(visitor_id=visitor_id, tavern_id=tavern_id, first_visit=now)
        if not state.first_visit:
            state.first_visit = now
        prev_last_visit = state.last_visit
        state.last_visit = now
        if visitor_gender:
            state.gender = _normalize_gender(visitor_gender)

        # Use new AffinityCalculator for relationship updates
        calculator = AffinityCalculator()
        current_stage = AffinityStage.from_string(state.relationship_stage or "stranger")
        current_strength = float(state.relationship_strength or 0.0)

        # Apply decay if returning after being away
        days_away = _days_since(prev_last_visit)
        if days_away > 0:
            decay_result = calculator.calculate_decay(
                current_strength=current_strength,
                current_stage=current_stage,
                days_since_last_visit=days_away,
            )
            if decay_result.changes:
                current_strength = decay_result.current_strength
                current_stage = decay_result.new_stage

        # Visit-only affinity nudge (no message content)
        result = calculator.calculate_chat_affinity(
            current_strength=current_strength,
            current_stage=current_stage,
            visitor_message="",
            character_response="",
            interaction_count=state.visit_count or 0,
        )

        state.relationship_strength = result.current_strength
        state.relationship_stage = result.new_stage.value
        self.store.update_visitor_state(tavern_id, state)
        return state

    def list_chat_sessions(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        """List chat sessions scoped to one tavern."""
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        resolved_visitor_id = self._chat_scope_visitor_id(tavern, user_id, visitor_id)
        sessions = self.store.list_chat_sessions(tavern_id, character_id=character_id, visitor_id=resolved_visitor_id)
        chats = [self._chat_session_row(tavern, session) for session in sessions]
        return {"chats": chats, "count": len(chats)}

    def list_global_chat_sessions(
        self,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        """List chat sessions across taverns owned by the current user."""
        user_id = str(user_id or "").strip()
        if not user_id:
            return {"chats": [], "count": 0}

        chats: list[dict[str, Any]] = []
        taverns = self.taverns.list_taverns(owner_id=user_id)
        for tavern_payload in taverns:
            tavern_id = str(tavern_payload.get("id") or "")
            if not tavern_id:
                continue
            tavern = self.store.get_tavern(tavern_id)
            if not tavern or not self._is_owner(tavern, user_id):
                continue
            resolved_visitor_id = self._chat_scope_visitor_id(tavern, user_id, visitor_id)
            sessions = self.store.list_chat_sessions(
                tavern_id,
                character_id=character_id,
                visitor_id=resolved_visitor_id,
            )
            chats.extend(self._chat_session_row(tavern, session) for session in sessions)

        chats.sort(key=lambda session: str(session.get("updated_at", "")), reverse=True)
        return {"chats": chats, "count": len(chats)}

    def export_chat(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
        format: str = "json",
    ) -> dict[str, Any]:
        """Export chat history in JSON or text format."""
        tavern = self._get_tavern_or_404(tavern_id)
        format_type = str(format or "json").strip().lower() or "json"
        if format_type not in {"json", "text"}:
            raise HTTPException(status_code=400, detail="Unknown format")
        history, resolved_visitor_id = self._chat_history_for_scope(
            tavern,
            user_id,
            character_id=character_id,
            visitor_id=visitor_id,
        )

        if format_type == "text":
            character = next((char for char in tavern.characters if char.id == character_id), None)
            visitor_label = ""
            for m in reversed(history):
                d = m.to_dict() if hasattr(m, "to_dict") else m
                visitor_label = d.get("visitor_name", "") or visitor_label
                if visitor_label:
                    break
            visitor_label = visitor_label or (resolved_visitor_id[:16] if resolved_visitor_id else "访客")
            lines = []
            for m in history:
                d = m.to_dict() if hasattr(m, "to_dict") else m
                role = d.get("role", "?")
                content = d.get("content", "")
                if role == "assistant":
                    speaker = character.name if character else "NPC"
                elif role == "system":
                    speaker = "系统"
                else:
                    speaker = d.get("visitor_name") or visitor_label
                timestamp = d.get("timestamp", "")
                prefix = f"[{timestamp}] " if timestamp else ""
                lines.append(f"{prefix}{speaker}: {content}")
            return {"text": "\n".join(lines)}
        return {"messages": [m.to_dict() if hasattr(m, "to_dict") else m for m in history]}

    def export_episode(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        visitor_id: str = "",
        character_id: str = "",
        title: str = "",
        include_pending: bool | str | int = False,
        format: str = "markdown",
        limit: int | str = 200,
    ) -> dict[str, Any]:
        """Export a deterministic episode draft from one explicit visitor scope."""
        if not str(user_id or "").strip():
            raise HTTPException(status_code=401, detail="导出剧集需要明确用户身份")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        resolved_visitor_id = str(visitor_id or "").strip()
        if not resolved_visitor_id:
            raise HTTPException(status_code=400, detail="导出剧集需要 visitor_id")
        if resolved_visitor_id != user_id and not self._is_owner(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能导出其他访客的剧集")

        format_type = str(format or "markdown").strip().lower() or "markdown"
        if format_type not in {"markdown", "json"}:
            raise HTTPException(status_code=400, detail="剧集导出格式必须是 markdown 或 json")

        safe_limit = max(1, min(self._safe_int(limit, 200), 500))
        history = self.store.get_chat_history(tavern.id, resolved_visitor_id, character_id, limit=safe_limit)
        character = next((char for char in tavern.characters if char.id == character_id), None)
        include_pending_cards = _truthy(include_pending)
        allowed_statuses = {"confirmed", "pending"} if include_pending_cards else {"confirmed"}
        cards: list[dict[str, Any]] = []
        for card in self.store.list_state_cards(tavern.id):
            if card.visitor_id != resolved_visitor_id:
                continue
            if character_id and card.character_id and card.character_id != character_id:
                continue
            if card.status not in allowed_statuses:
                continue
            if not self._can_view_state_card(card, tavern, user_id):
                continue
            cards.append(card.to_dict())

        export = build_episode_export(
            tavern_id=tavern.id,
            tavern_name=tavern.name,
            visitor_id=resolved_visitor_id,
            character_id=character_id,
            character_name=character.name if character else "",
            title=title,
            messages=history,
            state_cards=cards,
        )
        export["requested_format"] = format_type
        export["include_pending"] = include_pending_cards
        return export

    def search_chat_history(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
        query: str = "",
        limit: int | str = 50,
    ) -> dict[str, Any]:
        """Search chat history for one tavern while preserving visitor boundaries."""
        tavern = self._get_tavern_or_404(tavern_id)
        max_results = max(1, min(self._safe_int(limit, 50), 200))
        normalized_query = str(query or "").strip().lower()
        if not normalized_query:
            return {"results": [], "count": 0, "limit": max_results, "truncated": False}

        history, _ = self._chat_history_for_scope(
            tavern,
            user_id,
            character_id=character_id,
            visitor_id=visitor_id,
        )
        results: list[dict[str, Any]] = []
        match_count = 0
        for index, message in enumerate(history):
            payload = message.to_dict() if hasattr(message, "to_dict") else message
            content = str(payload.get("content", "")).lower()
            if normalized_query not in content:
                continue
            match_count += 1
            if len(results) < max_results:
                results.append({"index": index, "message": payload})

        return {
            "results": results,
            "count": match_count,
            "limit": max_results,
            "truncated": match_count > len(results),
        }

    def _chat_scope_visitor_id(self, tavern: Tavern, user_id: str, visitor_id: str = "") -> str:
        user_id = str(user_id or "").strip()
        requested_visitor_id = str(visitor_id or "").strip()
        tavern_owner = self._is_owner(tavern, user_id)

        if requested_visitor_id:
            if not tavern_owner and requested_visitor_id != user_id:
                raise HTTPException(status_code=403, detail="不能访问其他访客的聊天记录")
            return requested_visitor_id
        if tavern_owner:
            return ""
        return user_id or "__anonymous_without_visitor_id__"

    def _chat_history_for_scope(
        self,
        tavern: Tavern,
        user_id: str,
        *,
        character_id: str = "",
        visitor_id: str = "",
    ) -> tuple[list[Any], str]:
        self._ensure_visible(tavern, user_id)
        resolved_visitor_id = self._chat_scope_visitor_id(tavern, user_id, visitor_id)
        if resolved_visitor_id:
            return self.store.get_chat_history(tavern.id, resolved_visitor_id, character_id), resolved_visitor_id

        history: list[Any] = []
        sessions = self.store.list_chat_sessions(tavern.id, character_id=character_id, limit=None)
        for session in sessions:
            history.extend(session.get("messages", []))
        return history, resolved_visitor_id

    def _chat_session_row(self, tavern: Tavern, session: dict[str, Any]) -> dict[str, Any]:
        character = next(
            (char for char in tavern.characters if char.id == session.get("character_id")),
            None,
        )
        last_message = session.get("last_message")
        last_payload = last_message.to_dict() if hasattr(last_message, "to_dict") else (last_message or {})
        visitor_name = session.get("visitor_name") or last_payload.get("visitor_name", "")
        return {
            "tavern_id": session.get("tavern_id", tavern.id),
            "tavern_name": tavern.name,
            "visitor_id": session.get("visitor_id", ""),
            "visitor_name": visitor_name,
            "character_id": session.get("character_id", ""),
            "character_name": character.name if character else "",
            "message_count": session.get("message_count", 0),
            "last_message": str(last_payload.get("content", ""))[:100],
            "last_role": last_payload.get("role", ""),
            "updated_at": last_payload.get("timestamp", "") or session.get("updated_at", ""),
        }
