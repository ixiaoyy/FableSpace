from __future__ import annotations

from typing import Any

from .common import FlexibleBody


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


class RuntimePresetsWriteRequest(FlexibleBody):
    presets: list[dict[str, Any]] | None = None
    runtime_presets: list[dict[str, Any]] | None = None
    active_preset_id: str | None = None


class RuntimePresetApplyRequest(FlexibleBody):
    preset_id: str | None = None
    id: str | None = None
    preset: dict[str, Any] | None = None


__all__ = [
    "OutputRulesTestRequest",
    "OutputRulesWriteRequest",
    "PromptBlocksPreviewRequest",
    "PromptBlocksWriteRequest",
    "RuntimePresetApplyRequest",
    "RuntimePresetsWriteRequest",
    "WorldInfoTestRequest",
]
