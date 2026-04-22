from __future__ import annotations

import base64
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
    EXPRESSION_CATEGORIES,
    STANDARD_EXPRESSIONS,
    ChatMessage,
    Tavern,
    TavernService,
    TavernSpriteSet,
    TavernStore,
    VisitorState,
    VoiceConfig,
    WorldInfoEntry,
)

from ..domain.expression_policy import infer_expression_keyword, normalize_sprite_map
from ..domain.group_chat_policy import (
    clamp_chat_history_limit,
    normalize_bool,
    normalize_group_chat_config,
    normalize_talkativeness,
)
from ..domain.memory_atom_policy import (
    can_edit_memory_atom,
    can_view_memory_atom,
    clamp_memory_limit,
    memory_atom_filters,
    memory_atom_from_payload,
    memory_atom_matches_filters,
    validate_memory_atom_create,
    validate_memory_atom_update,
)
from ..domain.tavern_package_policy import (
    TAVERN_PACKAGE_TYPE,
    TAVERN_PACKAGE_VERSION,
    package_dict,
    package_list,
    safe_llm_preset,
    safe_tavern_package_tavern,
)
from ..domain.tavern_policy import (
    can_view_memory,
    can_view_tavern,
    clean_text,
    is_tavern_owner,
    relationship_stage_for,
)
from ..domain.world_info_policy import (
    test_world_info_entries,
    world_info_depth,
    world_info_keywords,
    world_info_order,
    world_info_probability,
)
from ..infrastructure.settings import ApiSettings


logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class TavernApplicationService:
    """Application facade for native `/api/v1/taverns` use cases.

    This layer deliberately depends on the current tavern/gameplay/memory core
    modules rather than the current web router/service layer. That keeps HTTP
    contracts in `api/v1`, product orchestration here, and persistence/domain
    behavior in the core modules while the enterprise package is expanded.
    """

    def __init__(self, store: TavernStore):
        self.store = store
        self.taverns = TavernService(store)

    @classmethod
    def from_settings(cls, settings: ApiSettings) -> "TavernApplicationService":
        return cls(TavernStore(settings.output_root / "taverns"))

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

    def update_tavern(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.update_tavern(tavern_id, data, user_id)

    def delete_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, str]:
        return self.taverns.delete_tavern(tavern_id, user_id)

    def export_tavern_package(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)

        tavern_payload = tavern.to_dict()
        safe_tavern = safe_tavern_package_tavern(tavern_payload)
        safe_tavern.pop("password_hash", None)
        llm_preset = safe_llm_preset(tavern_payload.get("llm_config"))
        return {
            "type": TAVERN_PACKAGE_TYPE,
            "version": TAVERN_PACKAGE_VERSION,
            "exported_at": _utc_now_iso(),
            "source": {
                "tavern_id": tavern.id,
                "author_id": tavern.owner_id,
            },
            "tavern": safe_tavern,
            "characters": tavern_payload.get("characters", []),
            "world_info": tavern_payload.get("world_info", []),
            "groups": tavern_payload.get("groups", []),
            "bookmarks": tavern_payload.get("bookmarks", []),
            "chat_templates": tavern_payload.get("chat_templates", []),
            "gameplay_definitions": tavern_payload.get("gameplay_definitions", []),
            "output_rules": tavern_payload.get("output_rules") or default_output_rules(),
            "prompt_blocks": tavern_payload.get("prompt_blocks") or default_prompt_blocks(),
            "runtime_presets": custom_runtime_presets(tavern_payload.get("runtime_presets")),
            "default_runtime_presets": default_runtime_presets(),
            "active_preset_id": tavern_payload.get("active_preset_id", ""),
            "prompt_preset": {
                "llm_config": llm_preset,
            },
            "memory_policy": safe_memory_policy(tavern_payload.get("memory_policy")),
            "voice_config": tavern_payload.get("voice_config", {}),
            "cover": tavern_payload.get("cover", ""),
        }

    def import_tavern_package(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        package = payload.get("package") if isinstance(payload.get("package"), dict) else payload
        if not isinstance(package, dict):
            raise HTTPException(status_code=400, detail="package is required")
        if package.get("type") != TAVERN_PACKAGE_TYPE:
            raise HTTPException(status_code=400, detail="不支持的酒馆包类型")

        tavern_payload = package.get("tavern") if isinstance(package.get("tavern"), dict) else {}
        if not tavern_payload:
            raise HTTPException(status_code=400, detail="酒馆包缺少 tavern 数据")

        try:
            lat = float(payload.get("lat", tavern_payload.get("lat")))
            lon = float(payload.get("lon", tavern_payload.get("lon")))
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="导入酒馆包时需要有效坐标") from exc

        source_name = str(tavern_payload.get("name") or "导入酒馆").strip() or "导入酒馆"
        tavern_id = str(payload.get("tavern_id") or f"tavern_{uuid.uuid4().hex[:12]}").strip()
        raw_access = str(payload.get("access") or tavern_payload.get("access") or "private").strip()
        access = raw_access if raw_access in {"public", "private", "password"} else "private"
        if access == "password":
            access = "private"

        create_payload: dict[str, Any] = {
            "id": tavern_id,
            "name": str(payload.get("name") or source_name).strip() or source_name,
            "description": tavern_payload.get("description", ""),
            "lat": lat,
            "lon": lon,
            "address": payload.get("address", tavern_payload.get("address", "")),
            "access": access,
            "scene_prompt": tavern_payload.get("scene_prompt", ""),
        }
        llm_preset = safe_llm_preset(
            package_dict(package, tavern_payload, "prompt_preset").get("llm_config") or tavern_payload.get("llm_config")
        )
        if llm_preset:
            create_payload["llm_config"] = llm_preset

        created = self.create_tavern(create_payload, owner_id=user_id)
        update_payload: dict[str, Any] = {
            "characters": package_list(package, tavern_payload, "characters"),
            "world_info": package_list(package, tavern_payload, "world_info"),
            "groups": package_list(package, tavern_payload, "groups"),
            "bookmarks": package_list(package, tavern_payload, "bookmarks"),
            "chat_templates": package_list(package, tavern_payload, "chat_templates"),
            "gameplay_definitions": package_list(package, tavern_payload, "gameplay_definitions"),
            "output_rules": package_list(package, tavern_payload, "output_rules"),
            "prompt_blocks": package_list(package, tavern_payload, "prompt_blocks"),
            "runtime_presets": package_list(package, tavern_payload, "runtime_presets"),
            "active_preset_id": str(package.get("active_preset_id") or tavern_payload.get("active_preset_id") or ""),
            "memory_policy": package_dict(package, tavern_payload, "memory_policy"),
        }
        if llm_preset:
            update_payload["llm_config"] = llm_preset

        imported = self.update_tavern(created["id"], update_payload, user_id)
        voice_config = package_dict(package, tavern_payload, "voice_config")
        if voice_config:
            imported_tavern = self._get_tavern_or_404(imported["id"])
            imported_tavern.voice_config = VoiceConfig.from_dict(voice_config)
            self.store.save_voice_config(imported["id"], imported_tavern.voice_config)
            self.store.update_tavern(imported_tavern)
            imported = self.get_tavern(imported["id"], user_id)

        return {
            "ok": True,
            "tavern_id": imported["id"],
            "tavern": imported,
            "characters": len(imported.get("characters", [])),
            "world_info": len(imported.get("world_info", [])),
        }

    def enter_tavern(self, tavern_id: str, password: str = "", user_id: str = "") -> dict[str, Any]:
        return self.taverns.enter_tavern(tavern_id, password, user_id)

    def list_visitors(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)

        visitor_names: dict[str, str] = {}
        message_counts: dict[str, int] = {}
        for session in self.store.list_chat_sessions(tavern_id, limit=None):
            visitor_id = str(session.get("visitor_id") or "")
            if not visitor_id:
                continue
            visitor_name = str(session.get("visitor_name") or "")
            if visitor_name and not visitor_names.get(visitor_id):
                visitor_names[visitor_id] = visitor_name
            message_counts[visitor_id] = message_counts.get(visitor_id, 0) + int(session.get("message_count", 0) or 0)

        visitors = []
        for state in self.store.list_visitor_states(tavern_id):
            payload = state.to_dict()
            payload["visitor_name"] = visitor_names.get(state.visitor_id, "")
            payload["message_count"] = message_counts.get(state.visitor_id, 0)
            visitors.append(payload)

        return {"visitors": visitors, "count": len(visitors)}

    def list_characters(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.get_tavern(tavern_id, user_id)
        return {"characters": tavern.get("characters", [])}

    def add_character(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.add_character(tavern_id, data, user_id)

    def import_character_card(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.import_character_card(tavern_id, data, user_id)

    def update_character(self, tavern_id: str, char_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        return self.taverns.update_character(tavern_id, char_id, data, user_id)

    def delete_character(self, tavern_id: str, char_id: str, user_id: str = "") -> dict[str, str]:
        return self.taverns.delete_character(tavern_id, char_id, user_id)

    def list_expressions(self) -> dict[str, Any]:
        return {
            "expressions": STANDARD_EXPRESSIONS,
            "categories": EXPRESSION_CATEGORIES,
            "count": len(STANDARD_EXPRESSIONS),
        }

    def get_character_sprites(self, tavern_id: str, character_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_visible(tavern, user_id)
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        sprites = TavernSpriteSet(character.sprites.to_dict() if character.sprites else {})
        default_expression, default_url = sprites.get_default()
        return {
            "character_id": character_id,
            "character_name": character.name,
            "sprites": sprites.to_dict(),
            "sprite_map": sprites.to_sprite_map(),
            "default_expression": default_expression,
            "default_url": default_url,
        }

    def update_character_sprites(
        self,
        tavern_id: str,
        character_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        character = next((item for item in tavern.characters if item.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        payload = data or {}
        new_sprites = normalize_sprite_map(payload.get("sprites", payload))
        character.sprites = TavernSpriteSet(new_sprites) if new_sprites else None
        self.store.update_tavern(tavern)
        return {"ok": True, "character_id": character_id, "sprites": new_sprites}

    def infer_expression(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        text = clean_text(payload.get("text"), max_length=1200)
        if not text:
            raise HTTPException(status_code=400, detail="text is required")
        tavern_id = str(payload.get("tavern_id") or "").strip()
        character_name = clean_text(payload.get("character_name"), max_length=80)
        if tavern_id:
            llm_config = self.store.get_llm_config(tavern_id)
            external_backend = str(llm_config.backend or "").lower() if llm_config else ""
            if llm_config and llm_config.is_configured() and external_backend not in {
                "rules",
                "rule_based",
                "public_welfare",
            }:
                labels = ", ".join(STANDARD_EXPRESSIONS)
                try:
                    client = create_client(
                        ClientLLMConfig(
                            backend=llm_config.backend,
                            model=llm_config.model,
                            api_key=llm_config.api_key,
                            base_url=llm_config.base_url,
                            temperature=0.1,
                            max_tokens=20,
                            top_p=1.0,
                        )
                    )
                    response = client.complete([
                        {
                            "role": "user",
                            "content": (
                                "You are an emotion classifier. Output only one label from this list: "
                                f"{labels}. Character: {character_name}. Response: {text}"
                            ),
                        }
                    ])
                    expression = clean_text(response.content, max_length=40).lower()
                    if expression not in STANDARD_EXPRESSIONS:
                        expression = next(
                            (item for item in STANDARD_EXPRESSIONS if item in expression or expression in item),
                            "neutral",
                        )
                    return {"expression": expression, "source": "llm", "text": text}
                except Exception as exc:
                    logger.warning("Expression LLM inference failed for tavern=%s: %s", tavern_id, exc)
        return {"expression": infer_expression_keyword(text), "source": "keyword", "text": text}

    def parse_character_card_payload(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        source: Any = payload
        try:
            if "json" in payload:
                source = payload["json"]
            elif "base64" in payload:
                decoded = base64.b64decode(str(payload.get("base64") or ""))
                if decoded.startswith(b"\x89PNG"):
                    from fablemap_api.core.char_card_parser import CharacterCardParser

                    parsed = CharacterCardParser().parse_png(decoded)
                    if parsed is None:
                        raise ValueError("Could not parse PNG as character card")
                    return self._parsed_character_payload(parsed)
                source = json.loads(decoded.decode("utf-8"))

            from fablemap_api.core.char_card_parser import parse_character_card as parse_card

            return self._parsed_character_payload(parse_card(source))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    def export_character_card_payload(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        character_data = payload.get("character") if isinstance(payload.get("character"), dict) else payload
        format_type = str(payload.get("format") or "v2").strip().lower()
        try:
            from fablemap_api.core.char_card_parser import export_character_card, parse_character_card as parse_card

            parsed = parse_card(character_data)
            return export_character_card(parsed, format_type)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    def list_world_info(self, user_id: str = "", tavern_id: str = "") -> dict[str, Any]:
        entries: list[dict[str, Any]] = []
        if tavern_id:
            tavern = self._get_tavern_or_404(tavern_id)
            self._ensure_visible(tavern, user_id)
            source_taverns = [tavern]
        else:
            source_taverns = self.store.list_taverns(include_private=bool(user_id), owner_id=user_id)

        for tavern in source_taverns:
            if not can_view_tavern(tavern, user_id):
                continue
            for entry in tavern.world_info:
                item = entry.to_dict()
                item["tavern_id"] = tavern.id
                item["tavern_name"] = tavern.name
                entries.append(item)
        return {"world_info": entries, "count": len(entries)}

    def create_world_info(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        entry = self._world_info_entry_from_payload(tavern_id, payload)
        tavern.world_info.append(entry)
        self.store.update_tavern(tavern)
        return {"ok": True, "entry": entry.to_dict()}

    def update_world_info(self, entry_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        for index, entry in enumerate(tavern.world_info):
            if entry.id != entry_id:
                continue
            merged = {**entry.to_dict(), **payload, "id": entry_id, "tavern_id": tavern_id}
            tavern.world_info[index] = self._world_info_entry_from_payload(tavern_id, merged, entry_id=entry_id)
            self.store.update_tavern(tavern)
            return {"ok": True, "entry": tavern.world_info[index].to_dict()}
        raise HTTPException(status_code=404, detail="WorldInfo entry not found")

    def delete_world_info(self, entry_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = data or {}
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)
        original_count = len(tavern.world_info)
        tavern.world_info = [entry for entry in tavern.world_info if entry.id != entry_id]
        if len(tavern.world_info) == original_count:
            raise HTTPException(status_code=404, detail="WorldInfo entry not found")
        self.store.update_tavern(tavern)
        return {"ok": True, "entry_id": entry_id, "tavern_id": tavern_id}

    def test_world_info_global(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        payload = dict(data or {})
        tavern_id = str(payload.get("tavern_id") or "").strip()
        if not tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")
        if "message" not in payload and "text" in payload:
            payload["message"] = payload.get("text")
        if not str(payload.get("message") or "").strip():
            raise HTTPException(status_code=400, detail="text is required")
        return self.test_world_info(tavern_id, payload, user_id)

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

        llm_config = self.store.get_llm_config(tavern_id)
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
            llm_config = self.store.get_llm_config(tavern_id)
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

        llm_config = self.store.get_llm_config(tavern_id)
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
        llm_config = self.store.get_llm_config(tavern_id)
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

    def _world_info_entry_from_payload(
        self,
        tavern_id: str,
        data: dict[str, Any],
        *,
        entry_id: str = "",
    ) -> WorldInfoEntry:
        payload = data or {}
        resolved_id = str(entry_id or payload.get("id") or f"wi_{uuid.uuid4().hex[:12]}").strip()
        return WorldInfoEntry(
            id=resolved_id,
            tavern_id=tavern_id,
            keys=world_info_keywords(payload.get("keys")),
            content=str(payload.get("content") or ""),
            keys_secondary=world_info_keywords(payload.get("keys_secondary")),
            selective=normalize_bool(payload.get("selective", True)),
            constant=normalize_bool(payload.get("constant", False)),
            depth=world_info_depth(payload),
            order=world_info_order(payload),
            probability=world_info_probability(payload),
            disable=normalize_bool(payload.get("disable", False)),
        )

    def _parsed_character_payload(self, character: Any) -> dict[str, Any]:
        return {
            "name": character.name,
            "description": character.description,
            "personality": character.personality,
            "scenario": character.scenario,
            "system_prompt": character.system_prompt,
            "first_mes": character.first_mes,
            "mes_example": character.mes_example,
            "alternate_greetings": list(character.alternate_greetings or []),
            "tags": list(character.tags or []),
            "sprites": dict(character.sprites or {}),
            "world_info": list(character.world_info or []),
            "source_format": character.source_format,
        }

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

    def _get_tavern_or_404(self, tavern_id: str) -> Tavern:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")
        return tavern

    def _is_owner(self, tavern: Tavern, user_id: str) -> bool:
        return is_tavern_owner(tavern, user_id)

    def _ensure_owner(self, tavern: Tavern, user_id: str) -> None:
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

    def _ensure_visible(self, tavern: Tavern, user_id: str) -> None:
        if not can_view_tavern(tavern, user_id):
            raise HTTPException(status_code=403, detail="此酒馆是私人的")

    def _memory_visible(self, atom: Any, tavern: Tavern, user_id: str) -> bool:
        return can_view_memory(atom, tavern, user_id)

    def _safe_int(self, value: Any, fallback: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback

    def _safe_float(self, value: Any, fallback: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return fallback

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
