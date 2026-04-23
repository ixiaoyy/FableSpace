from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.characters import (
    CharacterCardExportRequest,
    CharacterCardParseRequest,
    CharacterImportRequest,
    CharacterWriteRequest,
    ExpressionInferRequest,
    SpriteMapWriteRequest,
)
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["characters"])
utilities_router = APIRouter(tags=["character-utilities"])


@utilities_router.get("/expressions")
def list_expressions(request: Request) -> dict[str, Any]:
    return taverns_service(request).list_expressions()


@utilities_router.post("/expression/infer")
def infer_expression(request: Request, data: ExpressionInferRequest) -> dict[str, Any]:
    return taverns_service(request).infer_expression(data.to_payload())


@utilities_router.post("/characters/parse")
def parse_character_card(request: Request, data: CharacterCardParseRequest) -> dict[str, Any]:
    return taverns_service(request).parse_character_card_payload(data.to_payload())


@utilities_router.post("/characters/export")
def export_character_card(request: Request, data: CharacterCardExportRequest) -> dict[str, Any]:
    return taverns_service(request).export_character_card_payload(data.to_payload())


@router.get("/{tavern_id}/characters")
def list_characters(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).list_characters(tavern_id, get_user_id(request))


@router.post("/{tavern_id}/characters")
def add_character(request: Request, tavern_id: str, data: CharacterWriteRequest) -> dict[str, Any]:
    return taverns_service(request).add_character(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/characters/import")
def import_character_card(request: Request, tavern_id: str, data: CharacterImportRequest) -> dict[str, Any]:
    return taverns_service(request).import_character_card(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/characters/{character_id}/sprites")
def get_character_sprites(request: Request, tavern_id: str, character_id: str) -> dict[str, Any]:
    return taverns_service(request).get_character_sprites(tavern_id, character_id, get_user_id(request))


@router.put("/{tavern_id}/characters/{character_id}/sprites")
def update_character_sprites(
    request: Request,
    tavern_id: str,
    character_id: str,
    data: SpriteMapWriteRequest,
) -> dict[str, Any]:
    return taverns_service(request).update_character_sprites(
        tavern_id,
        character_id,
        data.to_payload(),
        get_user_id(request),
    )


@router.put("/{tavern_id}/characters/{character_id}")
def update_character(
    request: Request,
    tavern_id: str,
    character_id: str,
    data: CharacterWriteRequest,
) -> dict[str, Any]:
    return taverns_service(request).update_character(tavern_id, character_id, data.to_payload(), get_user_id(request))


@router.delete("/{tavern_id}/characters/{character_id}")
def delete_character(request: Request, tavern_id: str, character_id: str) -> dict[str, str]:
    return taverns_service(request).delete_character(tavern_id, character_id, get_user_id(request))
