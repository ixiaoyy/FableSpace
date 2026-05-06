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
from fablemap_api.core.preset_import import (
    PresetImportError,
    build_preset_import_apply_plan,
    preview_preset_import as build_preset_import_preview,
)
from fablemap_api.core.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks
from fablemap_api.core.prompt_builder import PromptBuildConfig, PromptBuilder
from fablemap_api.core.tavern import (
    ChatMessage,
    Tavern,
    TavernCharacter,
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

    def _state_cards_for_prompt(self, tavern_id: str) -> list[dict[str, Any]]:
        """Load state cards for PromptBuilder; builder keeps only confirmed fixed canon."""
        try:
            return [
                card.to_dict() if hasattr(card, "to_dict") else card
                for card in self.store.list_state_cards(tavern_id)
            ]
        except Exception:
            return []

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
            state_cards=self._state_cards_for_prompt(tavern_id),
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

    def preview_owner_dialogue_dry_run(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Owner-only prompt dry-run for NPC dialogue preview.

        The dry-run uses the same PromptBuilder / WorldInfo path as owner prompt
        preview. It never writes chat history, memory atoms, visitor state, or
        writeback state. External model calls happen only when ``call_model`` is
        explicitly true.
        """
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}

        character_id = str(payload.get("character_id") or "").strip()
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            character = tavern.characters[0] if tavern.characters else None
        if not character:
            raise HTTPException(status_code=400, detail="请先为酒馆添加角色")

        message = clean_text(payload.get("message"), max_length=1600) or "如果我是第一次进店的访客，你会怎么打招呼？"
        visitor_id = clean_text(payload.get("visitor_id"), max_length=64) or "owner-preview-dry-run"
        visitor_name = clean_text(payload.get("visitor_name"), max_length=32) or "预览旅人"
        call_model = bool(payload.get("call_model", False))

        visitor_state = self.store.get_visitor_state(tavern_id, visitor_id) if visitor_id else None
        history = self.store.get_chat_history(tavern_id, visitor_id, character.id, limit=8) if visitor_id else []
        visitor_message_count = 0
        if visitor_id:
            try:
                visitor_message_count = sum(
                    int(session.get("message_count", 0) or 0)
                    for session in self.store.list_chat_sessions(tavern_id, visitor_id=visitor_id, limit=None)
                )
            except Exception:
                visitor_message_count = len(history)

        blocks = normalize_prompt_blocks(tavern.prompt_blocks)
        if not blocks:
            blocks = default_prompt_blocks()
        config = PromptBuildConfig(
            tavern_name=tavern.name,
            tavern_scene_prompt=tavern.scene_prompt or "",
            char_name=character.name,
            char_personality=character.personality or "",
            char_scenario=character.scenario or "",
            char_first_mes=character.first_mes or "",
            char_system_prompt=character.system_prompt or "",
            user_name=visitor_name,
            visitor_visit_count=visitor_state.visit_count if visitor_state else 0,
            visitor_relationship_stage=visitor_state.relationship_stage if visitor_state else "",
            visitor_relationship_strength=float(visitor_state.relationship_strength or 0.0) if visitor_state else 0.0,
            visitor_message_count=visitor_message_count,
            world_info_entries=[entry.to_dict() if hasattr(entry, "to_dict") else entry for entry in tavern.world_info],
            state_cards=self._state_cards_for_prompt(tavern_id),
            prompt_blocks=blocks,
            history_max_messages=8,
        )
        prompt_result = PromptBuilder(config).build([], message)
        messages = prompt_result.get("messages", [])
        world_info_probe = test_world_info_entries(
            tavern_id=tavern_id,
            tavern_name=tavern.name,
            tavern_description=tavern.description,
            tavern_scene_prompt=tavern.scene_prompt,
            tavern_world_info=tavern.world_info,
            data={"message": message, "include_tavern_context": True},
        )

        llm_config = self._get_runtime_llm_config(tavern_id)
        assistant_message = ""
        model_called = False
        model_error = ""
        degraded = False
        token_estimate = 0
        model_status = "not_requested"

        if call_model:
            if not llm_config or not llm_config.is_configured():
                degraded = True
                model_status = "llm_not_configured"
                model_error = "AI 后端还没配置；未调用模型。"
            elif str(llm_config.backend or "").strip().lower() in {"rules", "rule_based", "public_welfare"}:
                assistant_message = self._rules_response(character.name, message, tavern)
                model_status = "rules_backend"
            else:
                try:
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
                    assistant_message = clean_text(client.complete(messages).content, max_length=2400)
                    model_called = True
                    model_status = "called"
                except LLMError as exc:
                    degraded = True
                    model_status = "llm_error"
                    model_error = str(exc)[:180]
                except Exception as exc:
                    degraded = True
                    model_status = "llm_unexpected_error"
                    model_error = str(exc)[:180]
            token_estimate = max(1, (len(message) + len(assistant_message or "")) // 4) if assistant_message or model_called else 0

        return {
            "ok": True,
            "tavern_id": tavern_id,
            "character_id": character.id,
            "character_name": character.name,
            "visitor_id": visitor_id,
            "visitor_name": visitor_name,
            "message": message,
            "dry_run": True,
            "persisted": False,
            "model_requested": call_model,
            "model_called": model_called,
            "model_status": model_status,
            "model_error": model_error,
            "degraded": degraded,
            "assistant_message": assistant_message,
            "token_estimate": token_estimate,
            "history_written": False,
            "memory_written": False,
            "writeback_written": False,
            "visitor_state_written": False,
            "messages": messages,
            "message_count": len(messages),
            "matched_world_info_count": int(world_info_probe.get("matched_count", 0) or 0),
            "matched_world_info": world_info_probe.get("matches", []),
            "prompt_summary": {
                "block_count": len(blocks),
                "history_message_count": len(history),
                "state_card_count": len(config.state_cards),
                "world_info_entry_count": len(tavern.world_info),
            },
            "notes": [
                "dry_run=true：仅用于店主预览 prompt 组装。",
                "persisted=false：不会写入 chat history、memory、visitor state 或 writeback。",
                "model_called 只有在店主明确请求且外部模型实际调用成功时才为 true。",
            ],
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

    def preview_preset_import(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        try:
            report = build_preset_import_preview(data or {})
        except PresetImportError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {
            "tavern_id": tavern_id,
            "tavern_name": tavern.name,
            **report,
        }

    def apply_preset_import(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        payload = data or {}
        try:
            plan = build_preset_import_apply_plan(
                payload,
                selected_ids=payload.get("selected_ids"),
                target_map=payload.get("target_map"),
                include_runtime_parameters=bool(payload.get("include_runtime_parameters", False)),
            )
        except PresetImportError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        response_base = {
            "tavern_id": tavern_id,
            "tavern_name": tavern.name,
            **plan,
        }
        if not bool(payload.get("confirm", False)):
            return response_base

        diff = plan.get("diff", {})
        new_prompt_blocks = diff.get("prompt_blocks", []) if isinstance(diff, dict) else []
        new_world_info = diff.get("world_info", []) if isinstance(diff, dict) else []
        new_characters = diff.get("characters", []) if isinstance(diff, dict) else []
        new_runtime_presets = diff.get("runtime_presets", []) if isinstance(diff, dict) else []

        tavern.prompt_blocks = normalize_prompt_blocks(
            [
                *tavern.prompt_blocks,
                *new_prompt_blocks,
            ]
        )
        tavern.world_info = [
            *tavern.world_info,
            *[
                WorldInfoEntry.from_dict({**entry, "tavern_id": tavern_id})
                for entry in new_world_info
                if isinstance(entry, dict)
            ],
        ]
        tavern.characters = [
            *tavern.characters,
            *[
                TavernCharacter.from_dict({**character, "tavern_id": tavern_id})
                for character in new_characters
                if isinstance(character, dict)
            ],
        ]
        tavern.runtime_presets = custom_runtime_presets(
            [
                *tavern.runtime_presets,
                *new_runtime_presets,
            ]
        )

        tavern = self.store.update_tavern(tavern)
        applied_counts = {
            "prompt_blocks": len(new_prompt_blocks),
            "world_info": len(new_world_info),
            "characters": len(new_characters),
            "runtime_presets": len(new_runtime_presets),
        }
        return {
            **response_base,
            "applied": True,
            "confirm_required": False,
            "applied_counts": applied_counts,
            "tavern": tavern.to_dict_private(user_id),
        }

    def _require_user_id(self, user_id: str) -> str:
        safe_user_id = str(user_id or "").strip()
        if not safe_user_id:
            raise HTTPException(status_code=401, detail="用户身份不能为空")
        return safe_user_id

    def get_owner_default_llm(self, user_id: str = "") -> dict[str, Any]:
        owner_id = self._require_user_id(user_id)
        if not self.owner_config_store:
            return {"configured": False, "llm_config": {}}
        from fablemap_api.domain.owner_llm_policy import mask_owner_llm_config

        return mask_owner_llm_config(self.owner_config_store.get_default_llm_config(owner_id))

    def save_owner_default_llm(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        owner_id = self._require_user_id(user_id)
        if not self.owner_config_store:
            raise HTTPException(status_code=500, detail="店主默认 LLM 配置存储不可用")
        from fablemap_api.domain.owner_llm_policy import mask_owner_llm_config, normalize_owner_llm_config

        config = self.owner_config_store.save_default_llm_config(owner_id, normalize_owner_llm_config(data))
        return mask_owner_llm_config(config)

    def generate_tavern_draft(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        owner_id = self._require_user_id(user_id)
        if not self.owner_config_store:
            raise HTTPException(status_code=500, detail="店主默认 LLM 配置存储不可用")

        from fablemap_api.domain.owner_llm_policy import (
            normalize_tavern_draft_request,
            owner_llm_is_configured,
            sanitize_tavern_draft,
        )

        config = self.owner_config_store.get_default_llm_config(owner_id)
        if not owner_llm_is_configured(config):
            raise HTTPException(status_code=400, detail="请先配置店主默认 LLM")

        request_data = normalize_tavern_draft_request(data)
        messages = self._build_tavern_draft_messages(request_data)
        try:
            response = create_client(
                ClientLLMConfig(
                    backend=config.get("backend", "openai"),
                    model=config.get("model", "gpt-4o-mini"),
                    api_key=config.get("api_key", ""),
                    base_url=config.get("base_url", ""),
                    temperature=float(config.get("temperature", 0.8)),
                    max_tokens=int(config.get("max_tokens", 1024)),
                    top_p=float(config.get("top_p", 1.0)),
                )
            ).complete(messages)
        except LLMError as exc:
            raise HTTPException(status_code=502, detail=f"AI 草稿生成失败：{exc}") from exc

        try:
            parsed = json.loads(str(response.content or ""))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="AI 草稿返回不是有效 JSON") from exc
        if not isinstance(parsed, dict):
            raise HTTPException(status_code=502, detail="AI 草稿 JSON 必须是对象")
        try:
            draft = sanitize_tavern_draft(parsed)
        except ValueError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return {"draft": draft}

    def _build_tavern_draft_messages(self, data: dict[str, Any]) -> list[dict[str, str]]:
        style_tags = "、".join(data.get("style_tags") or []) or "温暖、可进入、适合聊天"
        forbidden = "、".join(data.get("forbidden") or []) or "现实名人、既有 IP、露骨色情、危险行动、API Key、私人敏感信息"
        tone = data.get("tone") or "赛博酒馆、现实映射、店主可编辑"
        system = (
            "你是 FableMap 的开店草稿助手。只返回 JSON，不要 Markdown，不要解释。"
            "生成内容必须是未发布、可编辑、可丢弃的候选草稿。"
            "不要声称已经创建或发布酒馆。不要生成现实名人、影视/游戏/IP 角色。"
            "不要生成露骨色情、未成年性化、非自愿、仇恨骚扰、现实危险行动。"
            "不要写真实私人地址、身份证、手机号、API Key 等敏感信息。"
            "不要生成战斗、等级、装备、排行榜。"
        )
        user = (
            "请基于真实坐标和店主偏好生成一份开店草稿 JSON。\n"
            f"坐标：lat={data['lat']}, lon={data['lon']}\n"
            f"地址标签：{data.get('address') or '未填写'}\n"
            f"地点类型：{data.get('place_type') or 'tavern'}\n"
            f"风格标签：{style_tags}\n"
            f"禁止方向：{forbidden}\n"
            f"语气：{tone}\n"
            'JSON 结构必须为：{"name": string, "description": string, "scene_prompt": string, '
            '"character": {"name": string, "description": string, "personality": string, '
            '"scenario": string, "system_prompt": string, "first_mes": string, '
            '"mes_example": string, "tags": string[]}}'
        )
        return [{"role": "system", "content": system}, {"role": "user", "content": user}]
