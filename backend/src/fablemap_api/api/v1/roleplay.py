from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.roleplay import RoleplayClaimDecisionRequest, RoleplayClaimRequest, RoleplayConfigRequest
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["roleplay"])


@router.get("/{tavern_id}/roleplay")
def get_roleplay(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_roleplay(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/roleplay")
def save_roleplay_config(request: Request, tavern_id: str, data: RoleplayConfigRequest) -> dict[str, Any]:
    return taverns_service(request).save_roleplay_config(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/roleplay/claims")
def request_character_claim(request: Request, tavern_id: str, data: RoleplayClaimRequest) -> dict[str, Any]:
    return taverns_service(request).request_character_claim(tavern_id, data.to_payload(), get_user_id(request))


@router.put("/{tavern_id}/roleplay/claims/{claim_id}")
def decide_character_claim(
    request: Request,
    tavern_id: str,
    claim_id: str,
    data: RoleplayClaimDecisionRequest,
) -> dict[str, Any]:
    return taverns_service(request).decide_character_claim(tavern_id, claim_id, data.to_payload(), get_user_id(request))
