from __future__ import annotations

import json
import logging
import random
import re
import uuid
from datetime import UTC, datetime
from typing import Any
from fablespace_api.core.cultivation_logic import is_cultivation_space, update_cultivation_chat_count, get_progression_status

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
from fablespace_api.core.memory import auto_create_memories_from_chat, select_memory_atoms_for_prompt
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
from fablespace_api.core.skill_packs import (
    LOCAL_RUMOR_SKILL_PACK_ID,
    NEIGHBORHOOD_KNOWLEDGE_SKILL_PACK_ID,
    TERRITORY_AWARENESS_SKILL_PACK_ID,
    build_local_rumor_prompt_block,
    build_neighborhood_knowledge_prompt_block,
    build_territory_awareness_prompt_block,
    is_skill_pack_enabled,
    normalize_skill_pack_settings,
)
from fablespace_api.core.public_welfare_rules import resolve_public_welfare_rules_response
from fablespace_api.core.episode_builder import build_episode_export
from fablespace_api.core.visual_souvenir import build_visual_souvenir_preview
from fablespace_api.core.voice_greeting import build_voice_greeting_preview
from fablespace_api.core.simulation import generate_npc_feeling
from fablespace_api.core.state_cards import format_state_cards_for_prompt
from fablespace_api.infrastructure.storage import store_database
from fablespace_api.core.space import (
    ChatMessage,
    LLMConfig as TavernLLMConfig,
    Tavern,
    VisitorState,
    VoiceConfig,
    WorldInfoEntry,
    _hydrate_system_public_welfare_llm_config,
    _is_system_or_public_welfare_space_data,
    _normalize_gender,
)
from fablespace_api.core.continuity_validator import ContinuityValidator, ConflictReport
from fablespace_api.core.prompt_builder import (
    PromptBuilder,
    PromptBuildConfig,
    ChatMessage as PromptChatMessage
)
from fablespace_api.core.hobbies import get_hobby_label, normalize_hobbies
from fablespace_api.core.npc_voice import build_rules_identity_phrase
from fablespace_api.core.item_economy import process_npc_response as process_item_gifts
from fablespace_api.core.visitor_play_identity import (
    build_play_identity_system_prompt,
    merge_play_identity_metadata,
    playable_gender,
    play_identity_id_from_metadata,
    validate_requested_play_identity,
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
from ...domain.space_policy import can_view_memory, clean_text, relationship_stage_for

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
FALLBACK_NOTICE = "NPC 暂时无法给出有效回复，可以换个问法或稍后重试。"
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
        if user_id and user_id != visitor_id and not self._is_owner(tavern, user_id):
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
        if user_id and user_id != visitor_id and not self._is_owner(tavern, user_id):
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

        # ── LLM Config Resolution: Prefer Tavern Config, Fallback to User Global ──
        llm_config = self._get_runtime_llm_config(space_id) or tavern.llm_config

        # Global Overdrive: If tavern is on 'rules' but visitor has a real LLM, use visitor's
        if _is_rules_backend(llm_config.backend) and user_id and self.owner_config_store:
            owner_llm = self.owner_config_store.get_default_llm_config(user_id)
            if owner_llm and not _is_rules_backend(owner_llm.get("backend")):
                from fablespace_api.core.llm_clients import LLMConfig as ClientLLMConfig
                llm_config = ClientLLMConfig(
                    backend=owner_llm.get("backend", "openai"),
                    model=owner_llm.get("model", ""),
                    api_key=owner_llm.get("api_key", ""),
                    base_url=owner_llm.get("base_url", ""),
                    temperature=float(owner_llm.get("temperature", 0.8)),
                    max_tokens=int(owner_llm.get("max_tokens", 1024)),
                    top_p=float(owner_llm.get("top_p", 1.0)),
                )
        # ─────────────────────────────────────────────────────────────────────────
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
                "空间正在歇业",
                "店主暂时关闭了这间空间。",
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

        # ── Item Economy: parse gifts, award coins, strip tags ─────────────
        _rel_stage = "stranger"
        try:
            _prompt_vs = self.store.get_visitor_state(space_id, visitor_id)
            _rel = _prompt_vs.relationship if _prompt_vs else None
            _rel_stage = (_rel.get("stage", "stranger") if isinstance(_rel, dict) else getattr(_rel, "stage", "stranger")) or "stranger"
        except Exception:
            pass
        _engagement = self._get_or_init_engagement(space_id, visitor_id)
        _gift_result = process_item_gifts(
            response_text,
            relationship_stage=_rel_stage,
            wallet=_engagement.get("wallet"),
            ledger=_engagement.get("ledger"),
            character_id=character_id,
        )
        response_text = _gift_result["clean_text"]
        if _gift_result["coins_added"] > 0:
            try:
                self._save_engagement(space_id, visitor_id, _engagement)
            except Exception as _exc:
                logger.warning("Failed to save engagement wallet: %s", _exc)
        # ──────────────────────────────────────────────────────────────────
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

        state_card_candidates: list[dict[str, Any]] = []
        if not is_fallback:
            try:
                state_card_candidates = self.create_state_card_candidates_from_chat(
                    space_id=space_id,
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
            "tavern_status": "closed" if degradation else tavern.status,
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "state_card_candidates": state_card_candidates,
            "conflicts": conflicts,
            "timestamp": now,
            "gift": {
                "coins_added": _gift_result["coins_added"],
                "events": _gift_result["events"],
                "wallet_balance": _gift_result["wallet_balance"],
            },
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

    def test_tavern_llm(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        if not payload:
            llm_config = self._get_runtime_llm_config(space_id)
            payload = llm_config.to_dict_private() if llm_config and hasattr(llm_config, "to_dict_private") else {}
        else:
            hydrated = _hydrate_system_public_welfare_llm_config(
                tavern,
                TavernLLMConfig.from_dict(payload),
                space_id=space_id,
            )
            payload = hydrated.to_dict_private()
        return self.test_llm_config(payload)

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

    def update_group_chat_config(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
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
        tavern = self.store.update_space(tavern)
        return {
            "ok": True,
            "space_id": space_id,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": normalize_group_chat_config(tavern.group_chat_config),
            "characters": [self._group_character_payload(character) for character in tavern.characters],
        }

    def update_character_talkativeness(self, space_id: str, character_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.update_group_chat_config(
            space_id,
            {"character_talkativeness": {character_id: (data or {}).get("talkativeness", (data or {}).get("value", 0.5))}},
            user_id,
        )

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
        self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id)
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
                    "action": "店主可以检查 API Key、模型名称或 Base URL。",
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
                    "action": "稍后重试；如果持续出现，请店主重新测试 AI 配置。",
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

        state_card_candidates: list[dict[str, Any]] = []
        if assistant_text:
            try:
                state_card_candidates = self.create_state_card_candidates_from_chat(
                    space_id=space_id,
                    visitor_id=visitor_id,
                    character_id="",
                    user_message=saved_user_content,
                    assistant_message=assistant_text,
                    source_message_ids=[current_user_message_id, str(non_fallback_responses[0].get("id") or "")],
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
            "is_fallback": not bool(assistant_text),
            "fallback_notice": FALLBACK_NOTICE if not assistant_text else "",
            "visitor_state": visitor_state.to_dict(),
            "affinity": affinity_result.get("affinity"),
            "created_memories": created_memories,
            "state_card_candidates": state_card_candidates,
            "conflicts": conflicts,
        }

    def get_group_chat_history(self, space_id: str, visitor_id: str = "", user_id: str = "", limit: int = 50) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
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

    def get_voice_config(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        self._get_tavern_or_404(space_id)
        voice_config = self.store.get_voice_config(space_id) or VoiceConfig()
        return {"voice_config": voice_config.to_dict()}

    def preview_voice_greeting(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        payload = data or {}
        character_id = str(payload.get("character_id") or payload.get("characterId") or "").strip()
        if not character_id:
            raise HTTPException(status_code=400, detail="语音问候预览需要 character_id")
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        voice_config = self.store.get_voice_config(space_id) or VoiceConfig()
        return build_voice_greeting_preview(
            space_id=tavern.id,
            space_name=tavern.name,
            character=character,
            voice_config=voice_config,
            greeting_index=payload.get("greeting_index", payload.get("greetingIndex", 0)),
        )

    def preview_visual_souvenir(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not str(user_id or "").strip():
            raise HTTPException(status_code=401, detail="纪念图预览需要明确用户身份")
        tavern = self._get_tavern_or_404(space_id)
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
            space_id=tavern.id,
            space_name=tavern.name,
            character_name=character.name,
            visitor_id=visitor_id,
            user_message=user_message,
            assistant_message=assistant_message,
            style=str(payload.get("style") or ""),
        )

    def save_voice_config(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        if "enabled" in payload:
            payload = {**payload, "enabled": normalize_bool(payload.get("enabled"))}
        if "auto_play" in payload:
            payload = {**payload, "auto_play": normalize_bool(payload.get("auto_play"))}
        voice_config = VoiceConfig.from_dict(payload)
        tavern.voice_config = voice_config
        self.store.save_voice_config(space_id, voice_config)
        self.store.update_space(tavern)
        return {"ok": True, "voice_config": voice_config.to_dict()}

    def synthesize_voice(self, space_id: str, data: dict[str, Any], user_id: str = "") -> bytes:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        text = clean_text((data or {}).get("text"), max_length=1200)
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        voice_config = self.store.get_voice_config(space_id)
        if not voice_config or not voice_config.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")
        llm_config = self._get_runtime_llm_config(space_id)
        api_key = llm_config.api_key if llm_config else ""
        base_url = llm_config.base_url if llm_config else ""
        try:
            from fablespace_api.core.tts_clients import TTSConfig, create_tts_provider

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
        space_id: str,
        audio_bytes: bytes,
        *,
        audio_format: str = "webm",
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio data")
        voice_config = self.store.get_voice_config(space_id)
        if not voice_config or not voice_config.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")
        if voice_config.stt_provider == "browser":
            raise HTTPException(status_code=400, detail="浏览器 STT 无需上传到后端")
        try:
            from fablespace_api.core.stt_service import transcribe_bytes

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

    def _co_present_character_prompt_roster(
        self,
        tavern: Tavern,
        current_character_id: str,
        *,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        """Build a compact same-tavern NPC roster for prompt-only context."""

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

            # Simulation feelings for Rules backend
            character = next((c for c in tavern.characters if c.id == character_id), None)
            sim_feeling = ""
            if character and character.simulation_state:
                # 只在非常强烈时提及（数值 < 20）
                s = character.simulation_state
                if s.hunger < 20: sim_feeling = "，肚子发出了响亮的咕噜声"
                elif s.thirst < 20: sim_feeling = "，嘴唇看起来有些干裂"
                elif s.energy < 20: sim_feeling = "，看起来困得睁不开眼"

            if hobby_label:
                fallbacks = [
                    f"{character_name}点了点头{identity_suffix}{sim_feeling}，看起来正忙着摆弄他的{hobby_label}{state_mention}，但还是分心听你说话。",
                    f"{character_name}微微一笑{identity_suffix}{sim_feeling}，似乎想到了和{hobby_label}相关的事{state_mention}，随后轻声回应了你。",
                    f"{character_name}停下了手中关于{hobby_label}的动作{state_mention}，抬头看向你{identity_suffix}{sim_feeling}，等待你继续说下去。",
                    f"{character_name}思考片刻{identity_suffix}{sim_feeling}，或许是在想如何把{hobby_label}的精髓分享给你{state_mention}，他耐心地听着。",
                ]
                return random.choice(fallbacks)

            if state_mention or sim_feeling:
                return f"{character_name}静静地听着{identity_suffix}{state_mention}{sim_feeling}，若有所思地看向你。"

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

        # Simulation feelings & Social KB Retrieval
        character = next((c for c in tavern.characters if c.id == character_id), None)
        npc_feeling = generate_npc_feeling(character, tavern.place_type) if character else ""

        raw_social_memories = character.social_memories if character else []
        relevant_social_memories = self._filter_relevant_social_memories(raw_social_memories, message)

        # Relationship graph context (confirmed edges for this tavern/character)
        relationship_context = self._fetch_relationship_context(tavern.id, character_id)

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
            tavern_lat=tavern.lat,
            tavern_lon=tavern.lon,
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
            npc_feeling=npc_feeling,
            social_memories=relevant_social_memories,
            relationship_context=relationship_context,
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
    def _recency_bonus(timestamp_str: str | None) -> float:
        """计算时效性加分：越新的记忆权重越高。

        - 1 小时内: +4
        - 24 小时内: +2
        - 72 小时内: +1
        - 更旧或无时间戳: 0
        """
        if not timestamp_str:
            return 0.0
        try:
            ts = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            now = datetime.now(UTC)
            age_hours = (now - ts).total_seconds() / 3600
            if age_hours < 1:
                return 4.0
            if age_hours < 24:
                return 2.0
            if age_hours < 72:
                return 1.0
            return 0.0
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def _extract_ngrams(text: str, n: int = 2) -> set[str]:
        """从文本中提取 n-gram 集合，用于中文模糊匹配。"""
        chars = [c for c in text if not c.isspace()]
        if len(chars) < n:
            return set(chars)
        return {"".join(chars[i:i + n]) for i in range(len(chars) - n + 1)}

    def _filter_relevant_social_memories(self, memories: list[dict], user_message: str) -> list[dict]:
        """
        关键词 + n-gram 匹配检索，带时效性权重，防止 Prompt 爆炸。

        评分规则:
        - 来源名出现在用户消息中: +10
        - 内容 n-gram 与用户消息重叠: 每个 +5
        - 时效性加分: 1h 内 +4, 24h 内 +2, 72h 内 +1
        - Top-K=3；无匹配时回退到最近 2 条
        """
        if not memories:
            return []

        user_message_l = user_message.lower()
        user_ngrams = self._extract_ngrams(user_message_l)

        scored_memories: list[tuple[float, dict]] = []
        for m in memories:
            score = 0.0
            content = m.get("content", "").lower()
            source = m.get("source_name", "").lower()

            # 来源名精确匹配
            if source and source in user_message_l:
                score += 10

            # n-gram 重叠匹配（适配中文）
            content_ngrams = self._extract_ngrams(content)
            overlap = content_ngrams & user_ngrams
            score += len(overlap) * 5

            # 时效性加分
            score += self._recency_bonus(m.get("timestamp"))

            scored_memories.append((score, m))

        # 按综合分数降序排序
        scored_memories.sort(key=lambda x: x[0], reverse=True)

        # 如果最高分仍为 0（无任何匹配），按原始顺序取最近 2 条
        if scored_memories[0][0] <= 0:
            return memories[:2]

        # 否则取 Top 3
        return [m for score, m in scored_memories[:3]]

    def _fetch_relationship_context(self, space_id: str, character_id: str) -> list[dict]:
        """获取与当前角色相关的已确认关系边，用于 prompt 注入。

        仅返回 status=confirmed 的边，最多 5 条。
        每条包含 target_name, behavior_type, strength_preset, direction, display_name, description。
        如果底层存储不可用，静默返回空列表。
        """
        database = store_database(self.store)
        if database is None:
            return []

        try:
            from fablespace_api.infrastructure.relationship_graph_store import (
                SQLAlchemyRelationshipGraphStore,
            )
            graph_store = SQLAlchemyRelationshipGraphStore(database)
        except Exception:
            logger.debug("Relationship graph store unavailable; skipping relationship context")
            return []

        # 查询酒馆级别的已确认边
        tavern_edges = graph_store.list_confirmed_edges_for_node("tavern", space_id)

        # 如果有 character_id，也查询角色级别的边
        char_edges = []
        if character_id:
            char_edges = graph_store.list_confirmed_edges_for_node("character", character_id)

        # 合并并去重，限制最多 5 条
        all_edges: list[dict] = []
        seen_ids: set[str] = set()

        for edge in tavern_edges + char_edges:
            if edge.id in seen_ids:
                continue
            seen_ids.add(edge.id)

            # 确定方向和目标
            if edge.source_node_id == space_id or edge.source_node_id == character_id:
                direction = "outgoing"
                target_name = edge.display_name or edge.target_node_id
            else:
                direction = "incoming"
                target_name = edge.display_name or edge.source_node_id

            all_edges.append({
                "target_name": target_name,
                "behavior_type": edge.behavior_type,
                "strength_preset": edge.strength_preset,
                "direction": direction,
                "display_name": edge.display_name,
                "description": edge.description,
            })

        return all_edges[:5]

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

        # Territory Awareness Pack
        if is_skill_pack_enabled(settings, TERRITORY_AWARENESS_SKILL_PACK_ID):
            config = next((item.get("config", {}) for item in settings if item.get("id") == TERRITORY_AWARENESS_SKILL_PACK_ID), {})
            limit = self._safe_int(config.get("limit"), 3) if isinstance(config, dict) else 3
            radius = self._safe_int(config.get("radius"), 300) if isinstance(config, dict) else 300
            try:
                if hasattr(self, "territory_service") and self.territory_service:
                    current = self.territory_service.get_territory_by_tavern(tavern.id)
                    nearby = self.territory_service.query_nearby(tavern.lat, tavern.lon, radius, limit=limit)
                    # Filter out current territory from nearby if present
                    if current:
                        nearby = [t for t in nearby if t.get("id") != current.get("id")]
                    blocks.append(build_territory_awareness_prompt_block(current, nearby, limit=limit))
            except Exception as exc:
                logger.warning("Failed to fetch territory awareness for prompt: %s", exc)

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
            public_welfare_runtime = bool(tavern and _is_system_or_public_welfare_space_data(tavern))
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
        if tavern and _is_system_or_public_welfare_space_data(tavern):
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
            "is_fallback": True,
            "fallback_notice": message or FALLBACK_NOTICE,
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
        # 修行空间对话统计
        progression = None
        tavern = self.store.get_space(space_id)
        if tavern and is_cultivation_space(tavern):
            update_cultivation_chat_count(state)
            progression = get_progression_status(state)

        self.store.update_visitor_state(space_id, state)
        return {"visitor_state": state, "affinity": result.to_dict(), "progression": progression}


    def _get_or_init_engagement(self, space_id: str, visitor_id: str) -> dict:
        """Get or initialize visitor engagement wallet from VisitorState.metadata."""
        try:
            vs = self.store.get_visitor_state(space_id, visitor_id)
            meta = (vs.metadata or {}) if vs else {}
            progress = meta.get("_engagement_progress") or {}
            if not isinstance(progress.get("wallet"), dict):
                progress["wallet"] = {"balance": 0, "lifetime_earned": 0, "lifetime_spent": 0}
            if not isinstance(progress.get("ledger"), list):
                progress["ledger"] = []
            return progress
        except Exception:
            return {"wallet": {"balance": 0, "lifetime_earned": 0, "lifetime_spent": 0}, "ledger": []}

    def _save_engagement(self, space_id: str, visitor_id: str, engagement: dict) -> None:
        """Persist visitor engagement wallet back to VisitorState.metadata."""
        try:
            vs = self.store.get_visitor_state(space_id, visitor_id)
            if vs is None:
                return
            if not isinstance(vs.metadata, dict):
                vs.metadata = {}
            vs.metadata["_engagement_progress"] = engagement
            self.store.update_visitor_state(space_id, vs)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("_save_engagement failed: %s", exc)

    def _touch_visitor_state(
        self,
        space_id: str,
        visitor_id: str,
        now: str,
        *,
        visitor_gender: str = "",
    ) -> VisitorState:
        state = self.store.get_visitor_state(space_id, visitor_id) or VisitorState(visitor_id=visitor_id, space_id=space_id, first_visit=now)
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
        self.store.update_visitor_state(space_id, state)
        return state

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

    def list_chat_sessions(
        self,
        space_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        """List chat sessions scoped to one tavern."""
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        resolved_visitor_id = self._chat_scope_visitor_id(tavern, user_id, visitor_id)
        sessions = self.store.list_chat_sessions(space_id, character_id=character_id, visitor_id=resolved_visitor_id)
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
        taverns = self.taverns.list_spaces(owner_id=user_id)
        for space_payload in taverns:
            space_id = str(space_payload.get("id") or "")
            if not space_id:
                continue
            tavern = self.store.get_space(space_id)
            if not tavern or not self._is_owner(tavern, user_id):
                continue
            resolved_visitor_id = self._chat_scope_visitor_id(tavern, user_id, visitor_id)
            sessions = self.store.list_chat_sessions(
                space_id,
                character_id=character_id,
                visitor_id=resolved_visitor_id,
            )
            chats.extend(self._chat_session_row(tavern, session) for session in sessions)

        chats.sort(key=lambda session: str(session.get("updated_at", "")), reverse=True)
        return {"chats": chats, "count": len(chats)}

    def export_chat(
        self,
        space_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
        format: str = "json",
    ) -> dict[str, Any]:
        """Export chat history in JSON or text format."""
        tavern = self._get_tavern_or_404(space_id)
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
        space_id: str,
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
        tavern = self._get_tavern_or_404(space_id)
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
            space_id=tavern.id,
            space_name=tavern.name,
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
        space_id: str,
        user_id: str = "",
        *,
        character_id: str = "",
        visitor_id: str = "",
        query: str = "",
        limit: int | str = 50,
    ) -> dict[str, Any]:
        """Search chat history for one tavern while preserving visitor boundaries."""
        tavern = self._get_tavern_or_404(space_id)
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
            "space_id": session.get("space_id", tavern.id),
            "space_name": tavern.name,
            "visitor_id": session.get("visitor_id", ""),
            "visitor_name": visitor_name,
            "character_id": session.get("character_id", ""),
            "character_name": character.name if character else "",
            "message_count": session.get("message_count", 0),
            "last_message": str(last_payload.get("content", ""))[:100],
            "last_role": last_payload.get("role", ""),
            "updated_at": last_payload.get("timestamp", "") or session.get("updated_at", ""),
        }
