from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.worldinfo import WorldInfoGlobalTestRequest, WorldInfoWriteRequest
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(tags=["worldinfo"])


@router.get("/worldinfo")
def list_world_info(request: Request, space_id: str = "") -> dict[str, Any]:
    return spaces_service(request).list_world_info(get_user_id(request), space_id=space_id)


@router.post("/worldinfo")
def create_world_info(request: Request, data: WorldInfoWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).create_world_info(data.to_payload(), get_user_id(request))


@router.put("/worldinfo/{entry_id}")
def update_world_info(request: Request, entry_id: str, data: WorldInfoWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_world_info(entry_id, data.to_payload(), get_user_id(request))


@router.delete("/worldinfo/{entry_id}")
def delete_world_info(request: Request, entry_id: str, data: WorldInfoWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).delete_world_info(entry_id, data.to_payload(), get_user_id(request))


@router.post("/worldinfo/test")
def test_world_info_global(request: Request, data: WorldInfoGlobalTestRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).test_world_info_global(data.to_payload(), get_user_id(request))
