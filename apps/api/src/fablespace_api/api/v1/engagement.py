"""
Engagement API — Per-tavern soft currency, gifts, and bonus draw vouchers.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id


router = APIRouter(prefix="/spaces/{space_id}/engagement", tags=["engagement"])


def _engagement_service(request: Request):
    from ...application.engagement import get_engagement_service
    return get_engagement_service(request)


@router.get("/me")
def get_visitor_engagement(request: Request, space_id: str) -> dict[str, Any]:
    """Get the current visitor's engagement progress (wallet, vouchers, etc.)."""
    visitor_id = get_user_id(request)
    return _engagement_service(request).get_visitor_progress(space_id, visitor_id)


@router.get("/config")
def get_engagement_config(request: Request, space_id: str) -> dict[str, Any]:
    """Get the engagement config for this tavern (owner only for full config)."""
    owner_id = get_user_id(request)
    return _engagement_service(request).get_config(space_id, owner_id)


@router.put("/config")
def update_engagement_config(request: Request, space_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update engagement config (owner only)."""
    require_session_capability(request, CREATOR_CAPABILITY)
    owner_id = get_user_id(request)
    return _engagement_service(request).update_config(space_id, owner_id, data)


@router.post("/claim-reward")
def claim_engagement_reward(request: Request, space_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Claim engagement reward for completing a gameplay session."""
    visitor_id = get_user_id(request)
    session_id = data.get("session_id", "")
    return _engagement_service(request).claim_reward(space_id, visitor_id, session_id)


@router.post("/gifts/send")
def send_gift_to_character(request: Request, space_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Send a gift from the catalog to an NPC character."""
    visitor_id = get_user_id(request)
    gift_id = data.get("gift_id", "")
    character_id = data.get("character_id", "")
    return _engagement_service(request).send_gift(space_id, visitor_id, character_id, gift_id)


@router.post("/vouchers/redeem")
def redeem_bonus_voucher(request: Request, space_id: str) -> dict[str, Any]:
    """Redeem coins to get a bonus draw voucher."""
    visitor_id = get_user_id(request)
    return _engagement_service(request).redeem_voucher(space_id, visitor_id)
