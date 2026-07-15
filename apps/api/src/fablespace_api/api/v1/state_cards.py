from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Request

from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service


router = APIRouter(prefix="/spaces", tags=["state-cards"])


@router.get("/{space_id}/state-cards")
def list_state_cards(
    request: Request,
    space_id: str,
    status: str = "",
    category: str = "",
    canon_scope: str = "",
    visitor_id: str = "",
    character_id: str = "",
    limit: int = 100,
) -> dict[str, Any]:
    return spaces_service(request).list_state_cards(
        space_id,
        user_id=get_user_id(request),
        status=status,
        category=category,
        canon_scope=canon_scope,
        visitor_id=visitor_id,
        character_id=character_id,
        limit=limit,
    )


@router.post("/{space_id}/state-cards")
def create_state_card(request: Request, space_id: str, data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    user_id = get_user_id(request)
    visitor_id = str(data.get("visitor_id") or "").strip()
    status = str(data.get("status") or "pending").strip()
    if (
        data.get("fixed_canon")
        or str(data.get("canon_scope") or "visitor").strip() == "tavern"
        or (visitor_id and visitor_id != user_id)
        or status in {"confirmed", "rejected", "superseded"}
    ):
        require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).create_state_card(space_id, data, user_id)


@router.post("/{space_id}/gm-layer/preview")
def preview_gm_layer(request: Request, space_id: str, data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    user_id = get_user_id(request)
    visitor_id = str(data.get("visitor_id") or data.get("visitorId") or user_id).strip()
    if visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).preview_gm_layer(space_id, data, user_id)


@router.put("/{space_id}/state-cards/{card_id}/decision")
def decide_state_card(
    request: Request,
    space_id: str,
    card_id: str,
    data: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    card = service.store.get_state_card(space_id, card_id)
    owner_operation = bool(card) and (
        card.fixed_canon
        or card.canon_scope == "tavern"
        or not card.visitor_id
        or (card.visitor_id and card.visitor_id != user_id)
    )
    if owner_operation:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            service._ensure_owner(service._get_tavern_or_404(space_id), user_id)
    return service.decide_state_card(space_id, card_id, data, user_id)
