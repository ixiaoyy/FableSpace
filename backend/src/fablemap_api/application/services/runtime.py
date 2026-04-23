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
from ...domain.tavern_policy import can_view_memory, clean_text, relationship_stage_for
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

        if tavern.status != "open":
            return self._degraded_chat(character_id, character.name, tavern.status, "酒馆正在歇业", "店主暂时关闭了这间酒馆。")

        llm_config = self._get_runtime_llm_config(tavern_id)
        if not llm_config or not llm_config.is_configured():
            return self._degraded_chat(character_id, character.name, "closed", "AI 后端还没配置", "这间酒馆还没有可用的模型配置。")

        degradation: dict[str, Any] | None = None
        try:
            response_text = self._chat_response_text(
                tavern=tavern,
                character_name=character.name,
                character_prompt=character.system_prompt or character.personality or character.description,
                message=clean_message,
                llm_config=llm_config,
                extra_context=extra_context or [],
            )
        except LLMError as exc:
            response_text = self._rules_response(character.name, clean_message, tavern)
            degradation = {
                "reason": "llm_error",
                "title": "AI 后端暂时不可用",
                "message": "模型调用失败，已切换为规则回应。",
                "action": "店主可以检查 API Key、模型名称或 Base URL。",
                "technical_detail": str(exc)[:180],
            }

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
        self.store.add_token_usage(tavern_id, max(1, (len(clean_message) + len(response_text)) // 4))
        visitor_state = self._touch_visitor_state(tavern_id, visitor_id, now)

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

        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response_text,
            "mood": "curious",
            "degraded": bool(degradation),
            "degradation": degradation,
            "tavern_status": "closed" if degradation else tavern.status,
            "visitor_state": visitor_state.to_dict(),
            "created_memories": created_memories,
            "timestamp": now,
        }

    def test_llm_config(self, data: dict[str, Any]) -> dict[str, Any]:
        """Probe a supplied LLM config without exposing or persisting secrets."""
        payload = data or {}
        backend = str(payload.get("backend") or "openai").strip() or "openai"
        model = str(payload.get("model") or "").strip()
        if backend.lower() in {"rules", "rule_based", "public_welfare"}:
            return {
                "ok": True,
                "message": "规则后端可用",
                "model": model or backend,
                "preview": self._rules_response("测试角色", "你好", Tavern(id="probe", name="连接测试", description="", lat=0, lon=0)),
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
            raise HTTPException(status_code=400, detail="酒馆没有角色")
        clean_message = clean_text(message, max_length=1600)
        if not clean_message:
            raise HTTPException(status_code=400, detail="消息不能为空")
        if tavern.status != "open":
            return {"messages": [], "error": "酒馆正在歇业", "degraded": True}

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
                )
            except LLMError as exc:
                response_text = self._rules_response(character.name, clean_message, tavern)
                turn_degraded = True
                degradation = {
                    "reason": "llm_error",
                    "title": "AI 后端暂时不可用",
                    "message": "模型调用失败，已切换为规则回应。",
                    "action": "店主可以检查 API Key、模型名称或 Base URL。",
                    "technical_detail": str(exc)[:180],
                }
            except Exception as exc:
                logger.warning("Group chat response failed for tavern=%s character=%s: %s", tavern_id, speaker.character_id, exc)
                response_text = self._rules_response(character.name, clean_message, tavern)
                turn_degraded = True
                degradation = {
                    "reason": "llm_unexpected_error",
                    "title": "AI 回应暂时中断",
                    "message": "群聊后端遇到异常，已切换为规则回应。",
                    "action": "稍后重试；如果持续出现，请店主重新测试 AI 配置。",
                    "technical_detail": str(exc)[:180],
                }

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
        visitor_state = self._touch_visitor_state(tavern_id, visitor_id, now)
        if not responses:
            return {
                "messages": [],
                "speaker_count": 0,
                "strategy": manager.strategy,
                "error": "群聊角色暂时没有回应",
                "degraded": True,
                "visitor_state": visitor_state.to_dict(),
                "created_memories": [],
            }

        created_memories: list[dict[str, Any]] = []
        try:
            assistant_text = "\n".join(
                f"{response.get('character_name') or '群聊角色'}: {response.get('content') or ''}".strip()
                for response in responses
                if response.get("content")
            )
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

        return {
            "messages": responses,
            "speaker_count": len(responses),
            "strategy": manager.strategy,
            "degraded": turn_degraded,
            "visitor_state": visitor_state.to_dict(),
            "created_memories": created_memories,
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
    ) -> str:
        backend = str(llm_config.backend or "").lower()
        if backend in {"rules", "rule_based", "public_welfare"}:
            return self._rules_response(character_name, message, tavern)
        client = create_client(
            ClientLLMConfig(
                backend=llm_config.backend,
                model=llm_config.model,
                api_key=llm_config.api_key,
                base_url=llm_config.base_url,
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                top_p=llm_config.top_p,
            )
        )
        messages = [
            {"role": "system", "content": f"你是 FableMap 赛博酒馆「{tavern.name}」里的 NPC {character_name}。{character_prompt}"},
            *[
                {"role": str(item.get("role") or "user"), "content": clean_text(item.get("content"), max_length=800)}
                for item in extra_context[-12:]
                if isinstance(item, dict) and item.get("content")
            ],
            {"role": "user", "content": message},
        ]
        return clean_text(client.complete(messages).content, max_length=2400) or self._rules_response(character_name, message, tavern)

    def _rules_response(self, character_name: str, message: str, tavern: Tavern) -> str:
        topic = clean_text(message, max_length=80)
        scene = clean_text(tavern.scene_prompt or tavern.description, max_length=80)
        suffix = f"这里的气味和灯光让我想到：{scene}" if scene else "我会把这句话记在今晚的吧台边。"
        return f"{character_name}望向你，轻声回应：“我听见了——{topic}。”{suffix}"

    def _degraded_chat(self, character_id: str, character_name: str, status: str, title: str, message: str) -> dict[str, Any]:
        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": message,
            "mood": "quiet",
            "degraded": True,
            "degradation": {"reason": "unavailable", "title": title, "message": message, "action": "稍后再来或请店主检查配置。"},
            "tavern_status": status,
            "visitor_state": None,
            "created_memories": [],
            "timestamp": _utc_now_iso(),
        }

    def _touch_visitor_state(self, tavern_id: str, visitor_id: str, now: str) -> VisitorState:
        state = self.store.get_visitor_state(tavern_id, visitor_id) or VisitorState(visitor_id=visitor_id, tavern_id=tavern_id, first_visit=now)
        if not state.first_visit:
            state.first_visit = now
        state.last_visit = now
        state.relationship_strength = min(1.0, float(state.relationship_strength or 0.0) + 0.05)
        state.relationship_stage = relationship_stage_for(state.relationship_strength, state.visit_count)
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
