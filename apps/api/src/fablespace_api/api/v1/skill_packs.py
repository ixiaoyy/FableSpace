from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Request

from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service


router = APIRouter(prefix="/spaces", tags=["skill-packs"])


@router.get("/{space_id}/skill-packs")
def list_skill_packs(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_skill_packs(space_id, get_user_id(request))


@router.put("/{space_id}/skill-packs")
def update_skill_packs(
    request: Request,
    space_id: str,
    data: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_skill_packs(space_id, data, get_user_id(request))
