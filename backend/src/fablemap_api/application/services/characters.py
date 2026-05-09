from __future__ import annotations

import base64
import json
import logging
from typing import Any

from fastapi import HTTPException

from fablemap_api.core.llm_clients import LLMConfig as ClientLLMConfig
from fablemap_api.core.llm_clients import LLMError, create_client
from fablemap_api.core.tavern import EXPRESSION_CATEGORIES, STANDARD_EXPRESSIONS, TavernSpriteSet

from ...domain.expression_policy import infer_expression_keyword, normalize_sprite_map
from ...domain.owner_llm_policy import owner_llm_is_configured
from ...domain.tavern_policy import clean_text


logger = logging.getLogger(__name__)


def _draft_list(value: Any, *, max_items: int = 8, max_length: int = 48) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        raw_items = value.replace("，", ",").replace("\n", ",").split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = [value]
    result: list[str] = []
    for item in raw_items:
        text = clean_text(item, max_length=max_length)
        if text and text not in result:
            result.append(text)
        if len(result) >= max_items:
            break
    return result


def _with_source_tag(tags: list[str], source: str) -> list[str]:
    source_tag = "AI 草稿" if source == "owner_llm" else "本地模板草稿"
    result = [source_tag]
    for tag in tags:
        if tag and tag not in result:
            result.append(tag)
        if len(result) >= 10:
            break
    return result


def _draft_tags(style_tags: list[str], *, source: str) -> list[str]:
    tags: list[str] = []
    for tag in style_tags or ["空间 NPC"]:
        if tag not in tags:
            tags.append(tag)
    return _with_source_tag(tags, source)


def _fallback_role_name(tavern_name: str, style_tags: list[str]) -> str:
    generic_tags = {"AI 草稿", "本地模板草稿", "空间 NPC", "NPC", "招待员", "温暖"}
    primary_style = next((tag for tag in style_tags if tag and tag not in generic_tags), "")
    if primary_style:
        return f"{primary_style[:16]}草稿招待员"
    base_name = (
        tavern_name.replace("空间", "")
        .replace("小店", "")
        .replace("空间", "")
        .strip(" \t\r\n《》“”\"'")
    )
    if base_name:
        return f"{base_name[:12]}草稿招待员"
    return "本地模板 NPC 草稿"


def _sanitize_character_draft(data: dict[str, Any], *, style_tags: list[str]) -> dict[str, Any]:
    tags = _draft_list(data.get("tags"), max_items=10, max_length=32) or style_tags
    draft: dict[str, Any] = {
        "name": clean_text(data.get("name"), max_length=80),
        "description": clean_text(data.get("description"), max_length=500),
        "personality": clean_text(data.get("personality"), max_length=500),
        "scenario": clean_text(data.get("scenario"), max_length=800),
        "system_prompt": clean_text(data.get("system_prompt"), max_length=1200),
        "first_mes": clean_text(data.get("first_mes"), max_length=500),
        "mes_example": clean_text(data.get("mes_example"), max_length=1000),
        "tags": _with_source_tag(tags, "owner_llm"),
        "hobbies": _draft_list(data.get("hobbies"), max_items=10, max_length=32),
    }
    alternate_greetings = _draft_list(data.get("alternate_greetings"), max_items=4, max_length=160)
    if alternate_greetings:
        draft["alternate_greetings"] = alternate_greetings
    if not draft["name"] or not draft["first_mes"]:
        raise ValueError("AI 草稿缺少 NPC 名称或首次问候")
    if not draft["description"]:
        draft["description"] = "店主默认 LLM 生成的未发布 NPC 草稿。"
    if not draft["system_prompt"]:
        draft["system_prompt"] = "你是 FableMap 店主确认前的未发布 AI 草稿 NPC；店主保存后才可正式接待访客。"
    return draft


def _source_warnings(source: str, reason: str = "") -> list[str]:
    if source == "owner_llm":
        return ["AI 草稿不会自动发布，必须由店主确认保存。"]
    if reason == "owner_llm_failed":
        return [
            "AI 草稿不会自动发布，必须由店主确认保存。",
            "店主默认 LLM 调用失败，已返回本地模板草稿；这不是真实 AI 生成，请审核后再保存。",
        ]
    return [
        "AI 草稿不会自动发布，必须由店主确认保存。",
        "当前返回的是本地模板草稿，不是真实 AI 生成；请配置店主默认 LLM 后重试，或把它当作可编辑占位。",
    ]


class CharacterApplicationMixin:
    """Character management and SillyTavern-compatible card utility use cases."""

    def list_characters(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.get_tavern(tavern_id, user_id)
        return {"characters": tavern.get("characters", [])}

    def generate_character_draft(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, user_id)

        payload = data or {}
        style_tags = _draft_list(payload.get("style_tags"), max_items=8, max_length=32)
        forbidden = _draft_list(payload.get("forbidden"), max_items=8, max_length=80)
        tone = clean_text(payload.get("tone"), max_length=80) or "温暖、短句、有空间陪伴感"
        tavern_name = clean_text(tavern.name, max_length=80) or "这间空间"
        tavern_description = clean_text(tavern.description, max_length=180) or "一间挂接真实坐标的空间"
        style_text = "、".join(style_tags) if style_tags else "空间 NPC"
        forbidden_text = "；".join(forbidden) if forbidden else "不要露骨、不要真实私人地址、不要现实名人或受版权保护角色"

        if self.owner_config_store:
            owner_config = self.owner_config_store.get_default_llm_config(user_id)
            if owner_llm_is_configured(owner_config):
                try:
                    draft = self._generate_owner_llm_character_draft(
                        owner_config=owner_config,
                        tavern_name=tavern_name,
                        tavern_description=tavern_description,
                        tavern_scene_prompt=clean_text(tavern.scene_prompt, max_length=240),
                        style_text=style_text,
                        forbidden_text=forbidden_text,
                        tone=tone,
                        style_tags=style_tags,
                    )
                    return {
                        "ok": True,
                        "tavern_id": tavern_id,
                        "status": "ai_draft",
                        "source": "owner_llm",
                        "source_label": "店主默认 LLM 草稿",
                        "source_reason": "",
                        "draft": draft,
                        "warnings": _source_warnings("owner_llm"),
                    }
                except LLMError as exc:
                    logger.warning(
                        "Owner LLM character draft failed for tavern=%s; falling back to local template (%s)",
                        tavern_id,
                        exc.__class__.__name__,
                    )
                    source_reason = "owner_llm_failed"
            else:
                source_reason = "missing_owner_llm"
        else:
            source_reason = "missing_owner_llm"

        mes_example = (
            "<START>\n"
            "{{user}}: 这里是什么地方？\n"
            f"{{{{char}}}}: 这里是{tavern_name}，这是店主审核前的本地模板草稿。"
            "如果你提到越界内容，我会把话题带回空间氛围和安全互动。"
        )

        draft = {
            "name": _fallback_role_name(tavern_name, style_tags),
            "description": (
                f"{tavern_name}的未发布本地模板 NPC 草稿。灵感来自空间简介：{tavern_description}。"
                f"当前风格标签：{style_text}。"
            ),
            "personality": f"说话风格偏{tone}；围绕店主输入的标签提供占位方向，等待店主改写确认。",
            "scenario": (
                f"角色暂时站在{tavern_name}的入口或吧台旁，等待店主审核。"
                f"空间背景：{tavern_description}"
            ),
            "system_prompt": (
                "你是 FableMap 店主确认前的未发布本地模板草稿 NPC。保持原创，不模仿现实名人、受版权保护角色或特定 IP；"
                "不得声称自己已自动发布，也不得覆盖已有角色。店主确认保存后才可成为 TavernCharacter。"
                f"遵守禁忌方向：{forbidden_text}。保持角色扮演口吻，遇到越界请求时简短拒绝并回到空间互动。"
            ),
            "first_mes": f"欢迎来到{tavern_name}。我只是店主审核前的本地模板草稿，等店主确认后才会正式接待你。",
            "mes_example": mes_example,
            "tags": _draft_tags(style_tags, source="local_template_fallback"),
            "hobbies": [],
        }
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "status": "ai_draft",
            "source": "local_template_fallback",
            "source_label": "本地模板草稿",
            "source_reason": source_reason,
            "draft": draft,
            "warnings": _source_warnings("local_template_fallback", source_reason),
        }

    def _generate_owner_llm_character_draft(
        self,
        *,
        owner_config: dict[str, Any],
        tavern_name: str,
        tavern_description: str,
        tavern_scene_prompt: str,
        style_text: str,
        forbidden_text: str,
        tone: str,
        style_tags: list[str],
    ) -> dict[str, Any]:
        system = (
            "你是 FableMap 的 NPC 草稿助手。只返回 JSON，不要 Markdown，不要解释。"
            "生成内容必须是未发布、可编辑、可丢弃的候选 NPC 草稿。"
            "不要声称已经创建、发布或覆盖任何角色。不要生成现实名人、影视/游戏/IP 角色。"
            "不要生成露骨色情、未成年性化、非自愿、仇恨骚扰、现实危险行动。"
            "不要写真实私人地址、身份证、手机号、API Key 等敏感信息。"
            "不要生成战斗、等级、装备、排行榜。"
        )
        user = (
            "请基于店主的空间上下文生成一份 NPC 草稿 JSON。\n"
            f"空间名称：{tavern_name}\n"
            f"空间简介：{tavern_description}\n"
            f"空间场景提示：{tavern_scene_prompt or '未填写'}\n"
            f"风格标签：{style_text}\n"
            f"禁忌方向：{forbidden_text}\n"
            f"语气：{tone}\n"
            'JSON 结构必须为：{"name": string, "description": string, "personality": string, '
            '"scenario": string, "system_prompt": string, "first_mes": string, '
            '"mes_example": string, "tags": string[], "alternate_greetings": string[]}'
        )
        response = create_client(
            ClientLLMConfig(
                backend=str(owner_config.get("backend") or "openai"),
                model=str(owner_config.get("model") or "gpt-4o-mini"),
                api_key=str(owner_config.get("api_key") or ""),
                base_url=str(owner_config.get("base_url") or ""),
                temperature=float(owner_config.get("temperature", 0.8)),
                max_tokens=int(owner_config.get("max_tokens", 1024)),
                top_p=float(owner_config.get("top_p", 1.0)),
            )
        ).complete([{"role": "system", "content": system}, {"role": "user", "content": user}])
        try:
            parsed = json.loads(str(response.content or ""))
        except json.JSONDecodeError as exc:
            raise LLMError("AI 草稿返回不是有效 JSON") from exc
        if not isinstance(parsed, dict):
            raise LLMError("AI 草稿 JSON 必须是对象")
        try:
            return _sanitize_character_draft(parsed, style_tags=style_tags)
        except ValueError as exc:
            raise LLMError(str(exc)) from exc

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
            llm_config = self._get_runtime_llm_config(tavern_id)
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
                if decoded.startswith(b"\x89PNG") or b"PK\x03\x04" in decoded:
                    from fablemap_api.core.char_card_parser import parse_character_card as parse_card

                    return self._parsed_character_payload(parse_card(decoded))
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
            "hobbies": list(getattr(character, "hobbies", []) or []),
            "sprites": dict(character.sprites or {}),
            "world_info": list(character.world_info or []),
            "source_format": character.source_format,
        }
