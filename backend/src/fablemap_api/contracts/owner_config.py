from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .common import FlexibleBody


class OwnerDefaultLLMRequest(FlexibleBody):
    """保存店主默认 LLM 配置请求"""
    backend: str = "openai"
    model: str = "gpt-4o-mini"
    api_key: str = ""
    base_url: str = ""
    temperature: float = 0.8
    max_tokens: int = 1024
    top_p: float = 1.0


class OwnerDefaultLLMSafeResponse(BaseModel):
    """店主默认 LLM 配置安全响应（不含 API Key 明文）"""
    configured: bool
    llm_config: dict[str, Any] | None = None


class OwnerDefaultLLMSaveResponse(BaseModel):
    """店主默认 LLM 配置保存响应"""
    ok: bool
    owner_id: str
    configured: bool


class WorldInfoTestRequest(FlexibleBody):
    message: str | None = None
    recent_messages: list[Any] | None = None
    include_tavern_context: bool | None = None
    world_info: list[dict[str, Any]] | dict[str, Any] | None = None


class OutputRulesWriteRequest(FlexibleBody):
    rules: list[dict[str, Any]] | None = None
    output_rules: list[dict[str, Any]] | None = None


class OutputRulesTestRequest(FlexibleBody):
    text: str | None = None
    rules: list[dict[str, Any]] | None = None
    output_rules: list[dict[str, Any]] | None = None


class PromptBlocksWriteRequest(FlexibleBody):
    blocks: list[dict[str, Any]] | None = None
    prompt_blocks: list[dict[str, Any]] | None = None


class PromptBlocksPreviewRequest(FlexibleBody):
    blocks: list[dict[str, Any]] | None = None
    prompt_blocks: list[dict[str, Any]] | None = None
    character_id: str | None = None
    message: str | None = None
    visitor_name: str | None = None
    visitor_visit_count: int | None = None
    visitor_relationship_stage: str | None = None
    visitor_relationship_strength: float | None = None
    visitor_message_count: int | None = None


class OwnerDialoguePreviewDryRunRequest(FlexibleBody):
    character_id: str | None = None
    message: str | None = None
    visitor_id: str | None = None
    visitor_name: str | None = None
    call_model: bool | None = None


class RuntimePresetsWriteRequest(FlexibleBody):
    presets: list[dict[str, Any]] | None = None
    runtime_presets: list[dict[str, Any]] | None = None
    active_preset_id: str | None = None


class RuntimePresetApplyRequest(FlexibleBody):
    preset_id: str | None = None
    id: str | None = None
    preset: dict[str, Any] | None = None


class PresetImportPreviewRequest(FlexibleBody):
    preset: dict[str, Any] | str | None = None
    preset_json: str | None = None
    content: str | None = None


class PresetImportApplyRequest(FlexibleBody):
    preset: dict[str, Any] | str | None = None
    preset_json: str | None = None
    content: str | None = None
    selected_ids: list[str] | None = None
    target_map: dict[str, str] | None = None
    include_runtime_parameters: bool | None = None
    confirm: bool | None = None


class TavernDraftGenerateRequest(FlexibleBody):
    """生成酒馆草稿请求"""
    lat: float
    lon: float
    address: str | None = None
    place_type: str | None = None
    style_tags: list[str] | None = None
    forbidden: list[str] | None = None
    tone: str | None = None


class TavernDraftCharacter(BaseModel):
    """草稿中的 NPC 字段"""
    name: str
    description: str | None = None
    personality: str | None = None
    scenario: str | None = None
    system_prompt: str | None = None
    first_mes: str = ""
    mes_example: str | None = None
    tags: list[str] | None = None


class TavernDraftResponse(BaseModel):
    """酒馆草稿响应"""
    draft: dict[str, Any]


__all__ = [
    "OwnerDefaultLLMRequest",
    "OwnerDefaultLLMSafeResponse",
    "OwnerDefaultLLMSaveResponse",
    "OwnerDialoguePreviewDryRunRequest",
    "PresetImportApplyRequest",
    "PresetImportPreviewRequest",
    "TavernDraftCharacter",
    "TavernDraftGenerateRequest",
    "TavernDraftResponse",
]
