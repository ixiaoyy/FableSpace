from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FlexibleBody(BaseModel):
    """Base model for owner-authored dynamic tavern payloads."""

    model_config = ConfigDict(extra="allow")

    def to_payload(self) -> dict[str, Any]:
        payload = self.model_dump(exclude_none=True)
        payload.update(self.model_extra or {})
        return payload


class TavernCreateRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    address: str | None = None
    access: str | None = None
    password: str | None = None
    scene_prompt: str | None = None
    llm_config: dict[str, Any] | None = None


class TavernUpdateRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    address: str | None = None
    access: str | None = None
    password: str | None = None
    status: str | None = None
    scene_prompt: str | None = None
    llm_config: dict[str, Any] | None = None


class TavernListResponse(BaseModel):
    taverns: list[dict[str, Any]]
    count: int


class EnterTavernRequest(BaseModel):
    password: str = ""


class CharacterWriteRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    personality: str | None = None
    scenario: str | None = None
    system_prompt: str | None = None
    first_mes: str | None = None
    tags: list[str] | None = None


class CharacterImportRequest(FlexibleBody):
    data: dict[str, Any] | None = None
    spec: str | None = None
    spec_version: str | None = None


class ChatRequest(BaseModel):
    character_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    extra_context: list[dict[str, Any]] | None = None
    display_message: str = ""


class GameplayWriteRequest(FlexibleBody):
    gameplays: list[dict[str, Any]] | None = None


class GameplaySessionRequest(FlexibleBody):
    gameplay_id: str | None = None
    character_id: str | None = None


class MemoryAtomWriteRequest(FlexibleBody):
    scope: str | None = None
    dimension: str | None = None
    horizon: str | None = None
    subject: str | None = None
    content: str | None = None
    importance: float | None = None
    confidence: float | None = None
    source_message_ids: list[str] | None = None
    pinned: bool | None = None
    visibility: str | None = None
    visitor_id: str | None = None
    character_id: str | None = None
    place_id: str | None = None
    metadata: dict[str, Any] | None = None


class WorldInfoTestRequest(FlexibleBody):
    message: str | None = None
    recent_messages: list[Any] | None = None
    include_tavern_context: bool | None = None
    world_info: list[dict[str, Any]] | None = None


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


class RuntimePresetsWriteRequest(FlexibleBody):
    presets: list[dict[str, Any]] | None = None
    runtime_presets: list[dict[str, Any]] | None = None
    active_preset_id: str | None = None


class RuntimePresetApplyRequest(FlexibleBody):
    preset_id: str | None = None
    id: str | None = None
    preset: dict[str, Any] | None = None


class TavernPackageImportRequest(FlexibleBody):
    package: dict[str, Any] | None = None
    lat: float | None = None
    lon: float | None = None
    name: str | None = None
    address: str | None = None
    access: str | None = None
    tavern_id: str | None = None
