from __future__ import annotations

import logging
import random
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from fablespace_api.core.group_chat import GroupChatManager, GroupMember
from fablespace_api.core.llm_clients import LLMConfig as ClientLLMConfig
from fablespace_api.core.llm_clients import LLMError, create_client
from fablespace_api.core.memory import auto_create_memories_from_chat, select_memory_atoms_for_prompt
from fablespace_api.core.output_rules import apply_output_rules
from fablespace_api.core.presets import safe_memory_policy
from fablespace_api.core.public_welfare_rules import resolve_public_welfare_rules_response
from fablespace_api.core.space import (
    ChatMessage,
    Tavern,
    VisitorState,
    _is_system_or_public_welfare_space_data,
    _normalize_gender,
)
from fablespace_api.core.continuity_validator import ContinuityValidator
from fablespace_api.core.prompt_builder import (
    PromptBuilder,
    PromptBuildConfig,
    ChatMessage as PromptChatMessage
)
from fablespace_api.core.hobbies import get_hobby_label, normalize_hobbies
from fablespace_api.core.npc_voice import build_rules_identity_phrase
from fablespace_api.core.visitor_play_identity import (
    build_play_identity_system_prompt,
    merge_play_identity_metadata,
    playable_gender,
    play_identity_id_from_metadata,
    validate_requested_play_identity,
)

from ...domain.group_chat_policy import (
    clamp_chat_history_limit,
    normalize_group_chat_config,
    normalize_talkativeness,
)
from ...domain.memory_atom_policy import can_view_memory_atom
from ...domain.space_policy import clean_text

from ...core.affinity import AffinityCalculator, AffinityStage


logger = logging.getLogger(__name__)


RULES_BACKENDS = {"rules", "rule_based", "public_welfare"}
REVIEWED_HISTORICAL_CHOICE_SPACE_IDS = {"history_broad_street_water_1854"}
REVIEWED_HISTORICAL_CHOICE_CONTEXT_MARKER = "fablespace:reviewed-historical-choice"
FALLBACK_NOTICE = "角色暂时无法给出有效回复，可以换个问法或稍后重试。"
NON_ANSWER_FALLBACK_PHRASES = (
    "似乎在听你说话",
    "暂时没有更多回复",
)
GENERIC_NON_ANSWER_FALLBACKS = {
    "i understand",
    "i see",
    "got it",
    "understood",
    "ok",
    "okay",
    "i am listening",
    "i'm listening",
    "i m listening",
    "i hear you",
    "我明白",
    "我明白了",
    "明白了",
    "我知道了",
    "知道了",
    "好的",
    "好",
    "嗯",
}


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


def _normalize_fallback_candidate(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[\s\"'“”‘’.,!?;:，。！？；：…、（）()【】\[\]{}<>《》]+", " ", text)
    return " ".join(text.split())


def _is_non_answer_fallback_response(response_text: str) -> bool:
    """Detect generic/non-answer fallback text that must not create progress claims.

    Only triggers on very short/empty responses or responses that are EXACTLY
    these phrases. Longer responses with these phrases embedded are accepted as
    valid NPC replies (they may be part of character personality/scenario).
    """

    text = str(response_text or "").strip()
    if not text:
        return True

    # Only flag as fallback if the response is EXACTLY or VERY SHORT with these phrases.
    # Full sentence containing these phrases as part of character dialogue is valid.
    normalized = _normalize_fallback_candidate(text)
    if normalized in GENERIC_NON_ANSWER_FALLBACKS:
        return True

    # Very short responses (under 30 chars) with these exact phrases are fallback
    short_exact_matches = {"似乎在听你说话", "暂时没有更多回复"}
    for phrase in short_exact_matches:
        if text == phrase or (len(text) < 30 and phrase in text):
            return True

    # Allow longer responses even if they contain these phrases
    if len(text) > 30:
        return False

    if any(phrase in text for phrase in NON_ANSWER_FALLBACK_PHRASES):
        return True

    if normalized.startswith("i understand") and len(normalized) <= 32:
        return True
    if normalized.startswith("i hear you") and len(normalized) <= 32:
        return True
    return False


class RuntimeApplicationMixin:
    """Focused runtime use cases."""

    def chat_history(
        self,
        space_id: str,
        *,
        visitor_id: str,
        character_id: str | None = None,
        user_id: str = "",
        limit: int = 50,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        self._ensure_visible(tavern, user_id)
        if user_id and user_id != visitor_id:
            raise HTTPException(status_code=403, detail="不能访问其他访客的聊天记录")

        messages = self.store.get_chat_history(space_id, visitor_id, character_id, limit=limit)
        return {"messages": [message.to_dict() for message in messages]}

    def send_chat(
        self,
        space_id: str,
        *,
        character_id: str,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        visitor_gender: str = "",
        play_identity_id: str | None = None,
        user_id: str = "",
        extra_context: list[dict[str, Any]] | None = None,
        display_message: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        if user_id and user_id != visitor_id:
            raise HTTPException(status_code=403, detail="不能代替其他访客发送消息")
        self._ensure_visible(tavern, user_id)

        # ── Auto-route: 如果未指定 character_id，自动选择 NPC ──
        if not character_id:
            # 1. 尝试从聊天历史中找到该访客上一次对话的 NPC
            try:
                history = self.store.get_chat_history(space_id, visitor_id, limit=1)
                if history:
                    last_char_id = history[-1].character_id
                    last_char = next((c for c in tavern.characters if c.id == last_char_id), None)
                    if last_char:
                        character_id = last_char_id
            except Exception:
                pass

            # 2. 如果没有历史记录，选择第一个可用的 NPC
            if not character_id and tavern.characters:
                character_id = tavern.characters[0].id

            # 3. 如果空间没有 NPC，抛出错误
            if not character_id:
                raise HTTPException(status_code=404, detail="该空间没有可用的角色")

        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")

        clean_message = clean_text(message, max_length=1600)
        if not clean_message:
            raise HTTPException(status_code=400, detail="消息不能为空")

        prompt_visitor_state = self._prepare_prompt_visitor_state(
            space_id,
            visitor_id,
            play_identity_id=play_identity_id,
            visitor_gender=visitor_gender,
        )

        llm_config = self._get_runtime_llm_config(space_id) or tavern.llm_config
        if tavern.status != "open":
            if not llm_config or (not llm_config.is_configured() and not _is_rules_backend(llm_config.backend)):
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
                "故事当前暂停",
                "这个故事暂时不可进入。",
                reason="tavern_closed",
            )

        if not llm_config or (not llm_config.is_configured() and not _is_rules_backend(llm_config.backend)):

            return self._degraded_chat(
                character_id,
                character.name,
                "closed",
                "AI 后端还没配置",
                "这间空间还没有可用的模型配置。",
                reason="llm_not_configured",
            )

        degradation: dict[str, Any] | None = None
        uses_reviewed_historical_choice = (
            tavern.id in REVIEWED_HISTORICAL_CHOICE_SPACE_IDS
            and any(
                isinstance(item, dict)
                and str(item.get("role") or "").strip().lower() == "system"
                and str(item.get("content") or "").strip().startswith(
                    REVIEWED_HISTORICAL_CHOICE_CONTEXT_MARKER
                )
                for item in (extra_context or [])
            )
        )
        response_text = ""
        if uses_reviewed_historical_choice:
            response_text = resolve_public_welfare_rules_response(
                message=clean_message,
                space_id=tavern.id,
                character_name=character.name,
                space_name=tavern.name,
                first_mes=character.first_mes,
                is_revisit=bool(prompt_visitor_state and prompt_visitor_state.visit_count > 1),
            ) or ""
        try:
            if not response_text:
                response_text = self._chat_response_text(
                    tavern=tavern,
                    character_name=character.name,
                    character_prompt=character.system_prompt or character.personality or character.description,
                    character_description=character.description,
                    character_personality=character.personality,
                    character_scenario=character.scenario,
                    character_system_prompt=character.system_prompt,
                    character_mes_example=character.mes_example,
                    character_gender=character.gender,
                    character_tags=character.tags,
                    character_traits=character.traits,
                    message=clean_message,
                    llm_config=llm_config,
                    extra_context=extra_context or [],
                    visitor_state=prompt_visitor_state,
                    visitor_name=visitor_name,
                    prompt_visitor_id=visitor_id,
                    character_id=character_id,
                    first_mes=character.first_mes,
                    hobbies=character.hobbies,
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

        is_fallback = _is_non_answer_fallback_response(response_text)

        now = _utc_now_iso()
        user_message = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            space_id=space_id,
            character_id=character_id,
            visitor_id=visitor_id,
            visitor_name=clean_text(visitor_name, max_length=24),
            role="user",
            content=clean_text(display_message or clean_message, max_length=1600),
            timestamp=now,
        )
        assistant_message = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            space_id=space_id,
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
            self.store.add_token_usage(space_id, max(1, (len(clean_message) + len(response_text)) // 4))
        if not is_fallback:
            try:
                self._reinforce_referenced_memory_atoms(
                    tavern,
                    visitor_id=visitor_id,
                    character_id=character_id,
                    current_message=clean_message,
                    response_text=response_text,
                )
            except Exception as exc:
                logger.warning("Failed to reinforce referenced memory atoms: %s", exc.__class__.__name__)

        if is_fallback:
            visitor_state = self._touch_visitor_state_without_affinity(
                space_id,
                visitor_id,
                now,
                visitor_gender=visitor_gender,
            )
            affinity_result = {"affinity": None}
        else:
            # Calculate and update visitor affinity based on chat interaction
            affinity_result = self._update_affinity_from_chat(
                space_id=space_id,
                visitor_id=visitor_id,
                visitor_message=clean_message,
                character_response=response_text,
                visitor_gender=visitor_gender,
                now=now,
            )
            visitor_state = affinity_result["visitor_state"]

        created_memories: list[dict[str, Any]] = []
        if not is_fallback:
            try:
                atoms = auto_create_memories_from_chat(
                    self.store,
                    space_id,
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
        if not is_fallback:
            try:
                confirmed_cards = [
                    c for c in self.store.list_state_cards(space_id)
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

        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response_text,
            "is_fallback": is_fallback,
            "fallback_notice": FALLBACK_NOTICE if is_fallback else "",
            "mood": "curious",
            "degraded": bool(degradation),
            "degradation": degradation,
            "response_mode": self._chat_response_mode(
                llm_config,
                tavern=tavern,
                reason=str((degradation or {}).get("reason") or ""),
            ),
            "story_status": "paused" if degradation else tavern.status,
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "conflicts": conflicts,
            "timestamp": now,
        }



    def get_group_chat_config(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        return {
            "space_id": space_id,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": normalize_group_chat_config(tavern.group_chat_config),
            "characters": [self._group_character_payload(character) for character in tavern.characters],
            "character_count": len(tavern.characters),
        }



    def send_group_chat(
        self,
        space_id: str,
        *,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        visitor_gender: str = "",
        play_identity_id: str | None = None,
        user_id: str = "",
        display_message: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        self._ensure_group_chat_visitor_scope(user_id, visitor_id)
        self._ensure_visible(tavern, user_id)

        if not tavern.group_chat_enabled:
            raise HTTPException(status_code=400, detail="群聊未启用")
        if not tavern.characters:
            raise HTTPException(status_code=400, detail="空间没有角色")
        clean_message = clean_text(message, max_length=1600)
        if not clean_message:
            raise HTTPException(status_code=400, detail="消息不能为空")

        prompt_visitor_state = self._prepare_prompt_visitor_state(
            space_id,
            visitor_id,
            play_identity_id=play_identity_id,
            visitor_gender=visitor_gender,
        )
        if tavern.status != "open":
            return {"messages": [], "error": "空间正在歇业", "degraded": True}

        llm_config = self._get_runtime_llm_config(space_id)
        if not llm_config or not llm_config.is_configured():
            return {
                "messages": [],
                "error": "AI 后端还没配置",
                "degraded": True,
                "is_fallback": True,
                "fallback_notice": "AI 后端还没配置，本轮没有生成 NPC 回复。",
            }

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
                space_id=space_id,
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
                    character_description=character.description,
                    character_personality=character.personality,
                    character_scenario=character.scenario,
                    character_system_prompt=character.system_prompt,
                    character_mes_example=character.mes_example,
                    character_gender=character.gender,
                    character_tags=character.tags,
                    character_traits=character.traits,
                    message=prompt_message,
                    llm_config=llm_config,
                    extra_context=[self._group_history_prompt_item(item, tavern, visitor_display_name) for item in history],
                    visitor_state=prompt_visitor_state,
                    visitor_name=visitor_display_name,
                    prompt_visitor_id=visitor_id,
                    character_id=character.id,
                    first_mes=character.first_mes,
                    hobbies=character.hobbies,
                )
            except LLMError as exc:
                turn_degraded = True
                degradation = {
                    "reason": "llm_error",
                    "title": "AI 后端暂时不可用",
                    "message": "模型调用失败，本轮该 NPC 没有生成回复。",
                    "action": "请稍后重试。",
                    "technical_detail": str(exc)[:180],
                }
                logger.warning("Group chat LLM error for tavern=%s character=%s: %s", space_id, speaker.character_id, exc)
                continue
            except Exception as exc:
                logger.warning("Group chat response failed for tavern=%s character=%s: %s", space_id, speaker.character_id, exc)
                turn_degraded = True
                degradation = {
                    "reason": "llm_unexpected_error",
                    "title": "AI 回应暂时中断",
                    "message": "群聊后端遇到异常，本轮该 NPC 没有生成回复。",
                    "action": "请稍后重试。",
                    "technical_detail": str(exc)[:180],
                }
                continue

            output_rule_result = apply_output_rules(response_text, tavern.output_rules)
            response_text = output_rule_result.get("text", response_text)
            is_fallback = _is_non_answer_fallback_response(response_text)
            token_count = max(1, (len(clean_message) + len(response_text)) // 4)
            total_token_count += token_count
            assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
            response_timestamp = _utc_now_iso()
            assistant_message = ChatMessage(
                id=assistant_message_id,
                space_id=space_id,
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
                "is_fallback": is_fallback,
                "fallback_notice": FALLBACK_NOTICE if is_fallback else "",
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
            self.store.add_token_usage(space_id, total_token_count)
        non_fallback_responses = [response for response in responses if not response.get("is_fallback")]
        assistant_text = "\n".join(
            f"{response.get('character_name') or '群聊角色'}: {response.get('content') or ''}".strip()
            for response in non_fallback_responses
            if response.get("content")
        )
        if assistant_text:
            try:
                self._reinforce_referenced_memory_atoms(
                    tavern,
                    visitor_id=visitor_id,
                    character_id="",
                    current_message=clean_message,
                    response_text=assistant_text,
                )
            except Exception as exc:
                logger.warning("Failed to reinforce group memory atoms: %s", exc.__class__.__name__)
        if assistant_text:
            affinity_result = self._update_affinity_from_chat(
                space_id=space_id,
                visitor_id=visitor_id,
                visitor_message=clean_message,
                character_response=assistant_text,
                visitor_gender=visitor_gender,
                now=now,
            )
            visitor_state = affinity_result["visitor_state"]
        else:
            affinity_result = {"affinity": None}
            visitor_state = self._touch_visitor_state_without_affinity(space_id, visitor_id, now, visitor_gender=visitor_gender)
        if not responses:
            return {
                "messages": [],
                "speaker_count": 0,
                "strategy": manager.strategy,
                "error": "群聊角色暂时没有回应",
                "degraded": True,
                "is_fallback": True,
                "fallback_notice": FALLBACK_NOTICE,
                "visitor_state": visitor_state.to_dict(),
                "affinity": affinity_result.get("affinity"),
                "created_memories": [],
                "state_card_candidates": [],
            }

        created_memories: list[dict[str, Any]] = []
        if assistant_text:
            try:
                atoms = auto_create_memories_from_chat(
                    self.store,
                    space_id,
                    visitor_id,
                    "",
                    "群聊",
                    saved_user_content,
                    assistant_text,
                    user_message_id=current_user_message_id,
                    assistant_message_id=str(non_fallback_responses[0].get("id") or ""),
                    importance_threshold=0.5,
                )
                created_memories = [atom.to_dict() for atom in atoms]
            except Exception:
                created_memories = []

        conflicts: list[dict[str, Any]] = []
        if assistant_text:
            try:
                confirmed_cards = [
                    c for c in self.store.list_state_cards(space_id)
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

        return {
            "messages": responses,
            "speaker_count": len(responses),
            "strategy": manager.strategy,
            "degraded": turn_degraded,
            "is_fallback": not bool(assistant_text),
            "fallback_notice": FALLBACK_NOTICE if not assistant_text else "",
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "conflicts": conflicts,
        }

    def get_group_chat_history(self, space_id: str, visitor_id: str = "", user_id: str = "", limit: int = 50) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        requested_visitor_id = str(visitor_id or "").strip()
        user_id = str(user_id or "").strip()
        if requested_visitor_id:
            resolved_visitor_id = requested_visitor_id
            self._ensure_group_chat_visitor_scope(user_id, resolved_visitor_id)
        else:
            resolved_visitor_id = user_id
            self._ensure_group_chat_visitor_scope(user_id, resolved_visitor_id)
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

    def _co_present_character_prompt_roster(
        self,
        tavern: Tavern,
        current_character_id: str,
        *,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        """Build a compact same-story character roster for prompt-only context."""

        roster: list[dict[str, Any]] = []
        for character in list(getattr(tavern, "characters", []) or [])[:limit]:
            name = clean_text(getattr(character, "name", ""), max_length=32)
            if not name:
                continue
            role = clean_text(
                getattr(character, "description", "")
                or getattr(character, "personality", "")
                or getattr(character, "scenario", ""),
                max_length=96,
            )
            roster.append({
                "id": getattr(character, "id", ""),
                "name": name,
                "role": role,
                "current": getattr(character, "id", "") == current_character_id,
            })
        return roster

    def _ensure_group_chat_visitor_scope(
        self,
        user_id: str,
        visitor_id: str,
    ) -> None:
        user_id = str(user_id or "").strip()
        visitor_id = str(visitor_id or "").strip()
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少访客身份")
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

    def _prepare_prompt_visitor_state(
        self,
        space_id: str,
        visitor_id: str,
        *,
        play_identity_id: str | None = None,
        visitor_gender: str = "",
    ) -> VisitorState | None:
        """Validate and persist private play identity before any NPC prompt is built.

        Legacy clients that omit ``play_identity_id`` remain read-only here: their
        existing visitor state is returned without inventing a role or gender.
        A submitted identity is stored only in private VisitorState metadata and
        does not increment visits, affinity, or change space access decisions.
        """

        try:
            selected_identity_id, selected_gender = validate_requested_play_identity(
                play_identity_id,
                visitor_gender,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        state = self.store.get_visitor_state(space_id, visitor_id)
        if not selected_identity_id:
            return state

        state = state or VisitorState(visitor_id=visitor_id, space_id=space_id)
        state.gender = selected_gender
        state.metadata = merge_play_identity_metadata(
            state.metadata,
            selected_identity_id,
        )
        self.store.update_visitor_state(space_id, state)
        return state

    def _chat_response_text(
        self,
        *,
        tavern: Tavern,
        character_name: str,
        character_prompt: str,
        character_description: str = "",
        character_personality: str = "",
        character_scenario: str = "",
        character_system_prompt: str = "",
        character_mes_example: str = "",
        character_gender: str = "",
        character_tags: list[str] | None = None,
        character_traits: list[str] | None = None,
        message: str,
        llm_config: Any,
        extra_context: list[dict[str, Any]],
        visitor_state: VisitorState | None = None,
        visitor_name: str = "",
        prompt_visitor_id: str = "",
        character_id: str = "",
        first_mes: str = "",
        hobbies: list[str] | None = None,
    ) -> str:
        visitor_id = str(prompt_visitor_id or (visitor_state.visitor_id if visitor_state else "") or "").strip()
        play_identity_prompt = build_play_identity_system_prompt(
            play_identity_id_from_metadata(visitor_state.metadata if visitor_state else {}),
            playable_gender(visitor_state.gender if visitor_state else ""),
            character_name=character_name,
            space_name=tavern.name,
        )

        # 1. Fetch relevant state cards (needed for both rules and LLM backends)
        all_cards = self.store.list_state_cards(space_id=tavern.id)
        confirmed_cards = [
            c for c in all_cards
            if c.status == "confirmed" and (c.canon_scope == "tavern" or c.visitor_id == visitor_id)
        ]
        # Sort and limit to prevent prompt bloat
        top_cards = sorted(confirmed_cards, key=lambda c: c.updated_at or "", reverse=True)[:10]

        if _is_rules_backend(llm_config.backend):
            res = resolve_public_welfare_rules_response(
                message=message,
                space_id=tavern.id,
                character_name=character_name,
                space_name=tavern.name,
                first_mes=first_mes,
                is_revisit=bool(
                    (visitor_state and visitor_state.visit_count > 1)
                    or top_cards
                    or (visitor_state and visitor_state.relationship_stage != "stranger")
                ),
                revisit_cue=top_cards[0].title if top_cards else "",
            )
            if res:
                return res

            # Fallback logic for rules backend with Hobbies and StateCards awareness
            hobbies = normalize_hobbies(hobbies)
            hobby_label = get_hobby_label(random.choice(hobbies)) if hobbies else ""
            identity_phrase = build_rules_identity_phrase(
                description=character_description,
                personality=character_personality or character_prompt,
                tags=character_tags or [],
            )
            identity_suffix = f"，{identity_phrase}" if identity_phrase else ""

            # Mention a recent state card if available
            state_mention = ""
            if top_cards:
                recent_card = top_cards[0]
                state_mention = f"，并留意到了关于“{recent_card.title}”的动态"

            if hobby_label:
                fallbacks = [
                    f"{character_name}点了点头{identity_suffix}，看起来正忙着摆弄他的{hobby_label}{state_mention}，但还是分心听你说话。",
                    f"{character_name}微微一笑{identity_suffix}，似乎想到了和{hobby_label}相关的事{state_mention}，随后轻声回应了你。",
                    f"{character_name}停下了手中关于{hobby_label}的动作{state_mention}，抬头看向你{identity_suffix}，等待你继续说下去。",
                    f"{character_name}思考片刻{identity_suffix}，或许是在想如何把{hobby_label}的精髓分享给你{state_mention}，他耐心地听着。",
                ]
                return random.choice(fallbacks)

            if state_mention:
                return f"{character_name}静静地听着{identity_suffix}{state_mention}，若有所思地看向你。"

            return f"{character_name}点了点头{identity_suffix}，似乎在听你说话，但暂时没有更多回复。"

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

        # 1. Fetch relevant state cards (already fetched above for rules/llm)
        confirmed_cards = top_cards

        # 2. Prepare Skill Pack prompt block
        skill_pack_prompt = self._skill_pack_prompt_block(tavern)

        # 3. Map extra_context (dicts) to PromptChatMessage list
        history_messages = []
        for item in extra_context[-12:]:
            if not isinstance(item, dict) or not item.get("content"):
                continue
            history_messages.append(
                PromptChatMessage(
                    role=str(item.get("role") or "user"),
                    content=clean_text(item.get("content"), max_length=800),
                    name=str(item.get("visitor_name") or item.get("character_name") or "")
                )
            )

        # 4. Load structured memories for this visitor/character before prompt build.
        memory_policy = safe_memory_policy(getattr(tavern, "memory_policy", {}))
        prompt_memory_atoms = []
        if memory_policy.get("mode") in {"structured", "balanced", "long_context"}:
            try:
                visible_atoms = [
                    atom
                    for atom in self.store.list_memory_atoms(tavern.id)
                    if can_view_memory_atom(atom, tavern, visitor_id)
                ]
                prompt_memory_atoms = select_memory_atoms_for_prompt(
                    visible_atoms,
                    visitor_id=visitor_id,
                    character_id=character_id,
                    current_message=message,
                    budget_tokens=memory_policy.get("budget_tokens", 1200),
                    include_short=bool(memory_policy.get("short_term", True)),
                    include_mid=bool(memory_policy.get("mid_term", True)),
                    include_long=bool(memory_policy.get("long_term", True)),
                )
            except Exception as exc:
                logger.warning("Failed to load memory atoms for prompt: %s", exc.__class__.__name__)
                prompt_memory_atoms = []

        # 4. Initialize PromptBuilder
        legacy_system_prompt = character_prompt if character_prompt.startswith("你是") else ""
        legacy_personality = "" if legacy_system_prompt else character_prompt
        config = PromptBuildConfig(
            char_name=character_name,
            char_description=character_description,
            char_personality=character_personality or legacy_personality,
            char_scenario=character_scenario,
            char_system_prompt=character_system_prompt or legacy_system_prompt,
            char_mes_example=character_mes_example,
            char_gender=character_gender,
            char_tags=character_tags or [],
            char_hobbies=hobbies or [],
            char_traits=character_traits or [],
            char_first_mes=first_mes,
            space_name=tavern.name,
            co_present_characters=self._co_present_character_prompt_roster(tavern, character_id),
            user_name=visitor_name or "旅人",
            user_persona=play_identity_prompt,
            visitor_relationship_stage=visitor_state.relationship_stage if visitor_state else "",
            visitor_relationship_strength=visitor_state.relationship_strength if visitor_state else 0.0,
            visitor_visit_count=visitor_state.visit_count if visitor_state else 0,
            memory_atoms=[atom.to_dict() if hasattr(atom, "to_dict") else atom for atom in prompt_memory_atoms],
            memory_budget_tokens=int(memory_policy.get("budget_tokens", 0) or 0),
            state_cards=[c.to_dict() if hasattr(c, "to_dict") else c for c in confirmed_cards],
            skill_pack_prompt=skill_pack_prompt,
            output_format="openai"
        )

        builder = PromptBuilder(config)
        prompt_data = builder.build(history_messages, message)

        # Presets do not have to reference {{persona}}. Keep the private identity
        # as a dedicated system message so every LLM-backed NPC receives it.
        prompt_messages = prompt_data.get("messages")
        if play_identity_prompt and isinstance(prompt_messages, list):
            already_present = any(
                isinstance(item, dict) and item.get("content") == play_identity_prompt
                for item in prompt_messages
            )
            if not already_present:
                insert_at = 0
                while (
                    insert_at < len(prompt_messages)
                    and isinstance(prompt_messages[insert_at], dict)
                    and prompt_messages[insert_at].get("role") == "system"
                ):
                    insert_at += 1
                prompt_messages.insert(
                    insert_at,
                    {"role": "system", "content": play_identity_prompt},
                )

        response_text = clean_text(client.complete(prompt_data["messages"]).content, max_length=2400)
        if not response_text:
            raise LLMError("LLM returned an empty response")
        return response_text

    def _reinforce_referenced_memory_atoms(
        self,
        tavern: Tavern,
        *,
        visitor_id: str,
        character_id: str,
        current_message: str,
        response_text: str,
    ) -> list[dict[str, Any]]:
        memory_policy = safe_memory_policy(getattr(tavern, "memory_policy", {}))
        if memory_policy.get("mode") not in {"structured", "balanced", "long_context"}:
            return []

        visible_atoms = [
            atom
            for atom in self.store.list_memory_atoms(tavern.id)
            if can_view_memory_atom(atom, tavern, visitor_id)
        ]
        prompt_atoms = select_memory_atoms_for_prompt(
            visible_atoms,
            visitor_id=visitor_id,
            character_id=character_id,
            current_message=current_message,
            budget_tokens=memory_policy.get("budget_tokens", 1200),
            include_short=bool(memory_policy.get("short_term", True)),
            include_mid=bool(memory_policy.get("mid_term", True)),
            include_long=bool(memory_policy.get("long_term", True)),
        )
        now = _utc_now_iso()
        reinforced: list[dict[str, Any]] = []
        for atom in prompt_atoms:
            if not self._memory_atom_reply_references(atom, response_text):
                continue
            metadata = dict(atom.metadata or {})
            metadata["reinforcement_count"] = int(metadata.get("reinforcement_count") or 0) + 1
            metadata["last_reinforced_at"] = now
            metadata["flagged_wrong"] = False
            metadata.pop("excluded_from_prompt", None)
            atom.metadata = metadata
            atom.importance = min(1.0, float(atom.importance or 0.0) + 0.05)
            atom.confidence = min(1.0, float(atom.confidence or 0.0) + 0.02)
            atom.updated_at = now
            saved = self.store.save_memory_atom(tavern.id, atom)
            reinforced.append(saved.to_dict() if hasattr(saved, "to_dict") else dict(saved))
        return reinforced

    @classmethod
    def _memory_atom_reply_references(cls, atom: Any, response_text: str) -> bool:
        content = clean_text(getattr(atom, "content", ""), max_length=500).lower()
        reply = clean_text(response_text, max_length=2400).lower()
        if not content or not reply:
            return False
        if content in reply:
            return True
        content_grams = cls._extract_ngrams(content, 2)
        reply_grams = cls._extract_ngrams(reply, 2)
        overlap = content_grams & reply_grams
        if len(overlap) < 3:
            return False
        return len(overlap) / max(1, min(len(content_grams), len(reply_grams))) >= 0.18

    @staticmethod
    def _extract_ngrams(text: str, n: int = 2) -> set[str]:
        """从文本中提取 n-gram 集合，用于中文模糊匹配。"""
        chars = [c for c in text if not c.isspace()]
        if len(chars) < n:
            return set(chars)
        return {"".join(chars[i:i + n]) for i in range(len(chars) - n + 1)}

    def _skill_pack_prompt_block(self, tavern: Tavern) -> str:
        return ""

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
                "label": "系统模型未配置",
                "message": "系统对话模型暂不可用，请稍后重试。",
            }
        if reason in {"llm_error", "llm_unexpected_error"}:
            return {
                "kind": "llm_unavailable",
                "label": "系统模型暂不可用",
                "message": "模型调用失败，本轮没有生成角色回复；请稍后重试。",
            }
        if tavern and _is_system_or_public_welfare_space_data(tavern):
            return {
                "kind": "system_llm",
                "label": "系统模型",
                "message": "角色对话由平台系统模型驱动。",
            }
        if llm_config and _is_rules_backend(getattr(llm_config, "backend", "")):
            return self._chat_response_mode(reason="llm_not_configured")
        if reason:
            return {
                "kind": "unavailable",
                "label": "暂不可用",
                "message": "角色对话暂不可用，请稍后重试。",
            }
        return {
            "kind": "system_llm",
            "label": "系统模型",
            "message": "角色对话由平台系统模型驱动。",
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
        degradation = {"reason": reason, "title": title, "message": message, "action": "请稍后重试。"}
        if technical_detail:
            degradation["technical_detail"] = technical_detail
        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": "",
            "is_fallback": True,
            "fallback_notice": message or FALLBACK_NOTICE,
            "mood": "quiet",
            "degraded": True,
            "degradation": degradation,
            "response_mode": self._chat_response_mode(llm_config, tavern=tavern, reason=reason),
            "story_status": status,
            "visitor_state": None,
            "created_memories": [],
            "state_card_candidates": [],
            "timestamp": _utc_now_iso(),
        }

    def _update_affinity_from_chat(
        self,
        *,
        space_id: str,
        visitor_id: str,
        visitor_message: str,
        character_response: str,
        now: str,
        visitor_gender: str = "",
    ) -> dict[str, Any]:
        state = self.store.get_visitor_state(space_id, visitor_id) or VisitorState(
            visitor_id=visitor_id,
            space_id=space_id,
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
        self.store.update_visitor_state(space_id, state)
        return {"visitor_state": state, "affinity": result.to_dict()}


    def _touch_visitor_state_without_affinity(
        self,
        space_id: str,
        visitor_id: str,
        now: str,
        *,
        visitor_gender: str = "",
    ) -> VisitorState:
        """Persist visit metadata without awarding relationship progress."""

        state = self.store.get_visitor_state(space_id, visitor_id) or VisitorState(
            visitor_id=visitor_id,
            space_id=space_id,
            first_visit=now,
        )
        if not state.first_visit:
            state.first_visit = now
        state.last_visit = now
        if visitor_gender:
            state.gender = _normalize_gender(visitor_gender)
        self.store.update_visitor_state(space_id, state)
        return state
