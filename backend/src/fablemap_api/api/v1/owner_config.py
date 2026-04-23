from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.owner_config import (
    OutputRulesTestRequest,
    OutputRulesWriteRequest,
    PromptBlocksPreviewRequest,
    PromptBlocksWriteRequest,
    RuntimePresetApplyRequest,
    RuntimePresetsWriteRequest,
    WorldInfoTestRequest,
)
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["owner-config"])


@router.post("/{tavern_id}/world-info/test")
def test_world_info(request: Request, tavern_id: str, data: WorldInfoTestRequest) -> dict[str, Any]:
    return taverns_service(request).test_world_info(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/output-rules")
def get_output_rules(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_output_rules(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/output-rules")
def save_output_rules(request: Request, tavern_id: str, data: OutputRulesWriteRequest) -> dict[str, Any]:
    return taverns_service(request).save_output_rules(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/output-rules/test")
def test_output_rules(request: Request, tavern_id: str, data: OutputRulesTestRequest) -> dict[str, Any]:
    return taverns_service(request).test_output_rules(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/prompt-blocks")
def get_prompt_blocks(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_prompt_blocks(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/prompt-blocks")
def save_prompt_blocks(request: Request, tavern_id: str, data: PromptBlocksWriteRequest) -> dict[str, Any]:
    return taverns_service(request).save_prompt_blocks(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/prompt-blocks/preview")
def preview_prompt_blocks(request: Request, tavern_id: str, data: PromptBlocksPreviewRequest) -> dict[str, Any]:
    return taverns_service(request).preview_prompt_blocks(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/runtime-presets")
def get_runtime_presets(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_runtime_presets(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/runtime-presets")
def save_runtime_presets(request: Request, tavern_id: str, data: RuntimePresetsWriteRequest) -> dict[str, Any]:
    return taverns_service(request).save_runtime_presets(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/runtime-presets/apply")
def apply_runtime_preset(request: Request, tavern_id: str, data: RuntimePresetApplyRequest) -> dict[str, Any]:
    return taverns_service(request).apply_runtime_preset(tavern_id, data.to_payload(), get_user_id(request))
