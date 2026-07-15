from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.owner_config import (
    OutputRulesTestRequest,
    OutputRulesWriteRequest,
    OwnerDialoguePreviewDryRunRequest,
    PromptBlocksPreviewRequest,
    PromptBlocksWriteRequest,
    PresetImportApplyRequest,
    PresetImportPreviewRequest,
    RuntimePresetApplyRequest,
    RuntimePresetsWriteRequest,
    WorldInfoTestRequest,
)
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["owner-config"])


@router.post("/{space_id}/world-info/test")
def test_world_info(request: Request, space_id: str, data: WorldInfoTestRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).test_world_info(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/output-rules")
def get_output_rules(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_output_rules(space_id, get_user_id(request))


@router.put("/{space_id}/output-rules")
def save_output_rules(request: Request, space_id: str, data: OutputRulesWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).save_output_rules(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/output-rules/test")
def test_output_rules(request: Request, space_id: str, data: OutputRulesTestRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).test_output_rules(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/prompt-blocks")
def get_prompt_blocks(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_prompt_blocks(space_id, get_user_id(request))


@router.put("/{space_id}/prompt-blocks")
def save_prompt_blocks(request: Request, space_id: str, data: PromptBlocksWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).save_prompt_blocks(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/prompt-blocks/preview")
def preview_prompt_blocks(request: Request, space_id: str, data: PromptBlocksPreviewRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).preview_prompt_blocks(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/dialogue-preview/dry-run")
def preview_owner_dialogue_dry_run(
    request: Request,
    space_id: str,
    data: OwnerDialoguePreviewDryRunRequest,
) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).preview_owner_dialogue_dry_run(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/runtime-presets")
def get_runtime_presets(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_runtime_presets(space_id, get_user_id(request))


@router.put("/{space_id}/runtime-presets")
def save_runtime_presets(request: Request, space_id: str, data: RuntimePresetsWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).save_runtime_presets(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/runtime-presets/apply")
def apply_runtime_preset(request: Request, space_id: str, data: RuntimePresetApplyRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).apply_runtime_preset(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/preset-import/preview")
def preview_preset_import(request: Request, space_id: str, data: PresetImportPreviewRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).preview_preset_import(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/preset-import/apply")
def apply_preset_import(request: Request, space_id: str, data: PresetImportApplyRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).apply_preset_import(space_id, data.to_payload(), get_user_id(request))
