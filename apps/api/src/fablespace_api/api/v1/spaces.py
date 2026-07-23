from __future__ import annotations

from fastapi import APIRouter, Request

from ...contracts.spaces import EnterSpaceRequest
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.get("/{space_id}")
def get_space(request: Request, space_id: str, view: str = "") -> dict:
    return spaces_service(request).get_space(space_id, get_user_id(request), view=view)


@router.post("/{space_id}/enter")
def enter_space(
    request: Request,
    space_id: str,
    data: EnterSpaceRequest | None = None,
) -> dict:
    return spaces_service(request).enter_space(
        space_id,
        password="",
        user_id=get_user_id(request),
        visitor_gender=data.visitor_gender if data else "",
        play_identity_id=data.play_identity_id if data else None,
    )
