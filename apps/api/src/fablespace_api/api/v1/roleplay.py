from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.roleplay import RoleplayClaimDecisionRequest, RoleplayClaimRequest, RoleplayConfigRequest
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["roleplay"])


@router.get("/{space_id}/roleplay")
def get_roleplay(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_roleplay(space_id, get_user_id(request))


@router.put("/{space_id}/roleplay")
def save_roleplay_config(request: Request, space_id: str, data: RoleplayConfigRequest) -> dict[str, Any]:
    return spaces_service(request).save_roleplay_config(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/roleplay/claims")
def request_character_claim(request: Request, space_id: str, data: RoleplayClaimRequest) -> dict[str, Any]:
    return spaces_service(request).request_character_claim(space_id, data.to_payload(), get_user_id(request))


@router.put("/{space_id}/roleplay/claims/{claim_id}")
def decide_character_claim(
    request: Request,
    space_id: str,
    claim_id: str,
    data: RoleplayClaimDecisionRequest,
) -> dict[str, Any]:
    return spaces_service(request).decide_character_claim(space_id, claim_id, data.to_payload(), get_user_id(request))
