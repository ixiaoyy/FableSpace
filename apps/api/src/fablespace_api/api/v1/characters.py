from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.characters import (
    CharacterCardExportRequest,
    CharacterCardParseRequest,
    CharacterDraftRequest,
    CharacterImportRequest,
    CharacterWriteRequest,
    ExpressionInferRequest,
    SpriteMapWriteRequest,
)
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["characters"])
utilities_router = APIRouter(tags=["character-utilities"])


@utilities_router.get("/expressions")
def list_expressions(request: Request) -> dict[str, Any]:
    return spaces_service(request).list_expressions()


@utilities_router.post("/expression/infer")
def infer_expression(request: Request, data: ExpressionInferRequest) -> dict[str, Any]:
    return spaces_service(request).infer_expression(data.to_payload())


@utilities_router.post("/characters/parse")
def parse_character_card(request: Request, data: CharacterCardParseRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).parse_character_card_payload(data.to_payload())


@utilities_router.post("/characters/export")
def export_character_card(request: Request, data: CharacterCardExportRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).export_character_card_payload(data.to_payload())


@router.get("/{space_id}/characters")
def list_characters(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_characters(space_id, get_user_id(request))


@router.post("/{space_id}/characters/ai-draft")
def generate_character_draft(request: Request, space_id: str, data: CharacterDraftRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).generate_character_draft(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/characters")
def add_character(request: Request, space_id: str, data: CharacterWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).add_character(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/characters/import")
def import_character_card(request: Request, space_id: str, data: CharacterImportRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).import_character_card(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/characters/{character_id}/sprites")
def get_character_sprites(request: Request, space_id: str, character_id: str) -> dict[str, Any]:
    return spaces_service(request).get_character_sprites(space_id, character_id, get_user_id(request))


@router.put("/{space_id}/characters/{character_id}/sprites")
def update_character_sprites(
    request: Request,
    space_id: str,
    character_id: str,
    data: SpriteMapWriteRequest,
) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_character_sprites(
        space_id,
        character_id,
        data.to_payload(),
        get_user_id(request),
    )


@router.put("/{space_id}/characters/{character_id}")
def update_character(
    request: Request,
    space_id: str,
    character_id: str,
    data: CharacterWriteRequest,
) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_character(space_id, character_id, data.to_payload(), get_user_id(request))


@router.delete("/{space_id}/characters/{character_id}")
def delete_character(request: Request, space_id: str, character_id: str) -> dict[str, str]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).delete_character(space_id, character_id, get_user_id(request))
