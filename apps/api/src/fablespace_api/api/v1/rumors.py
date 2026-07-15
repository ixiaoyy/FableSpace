"""
FableSpace Neighborhood Rumor API — 邻里传闻 API 端点
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.rumor import (
    RumorGenerateRequest,
    RumorListResponse,
)
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/rumors", tags=["rumors"])


@router.get("", response_model=RumorListResponse)
def list_rumors(
    request: Request,
    source_space_id: str = "",
    limit: int = 10,
    include_expired: bool = False,
) -> dict[str, Any]:
    """获取传闻列表"""
    return spaces_service(request).list_rumors(
        source_space_id=source_space_id,
        limit=limit,
        include_expired=include_expired,
    )


@router.post("/generate", response_model=dict[str, Any])
def generate_rumor(
    request: Request,
    data: RumorGenerateRequest,
) -> dict[str, Any]:
    """生成一条传闻"""
    require_session_capability(request, CREATOR_CAPABILITY)
    user_id = get_user_id(request)
    service = spaces_service(request)
    if request.app.state.settings.auth_mode == "parallellines":
        service._ensure_owner(service._get_tavern_or_404(data.source_space_id), user_id)
    return service.generate_rumor(
        source_space_id=data.source_space_id,
        target_space_id=data.target_space_id,
        target_tavern_name=data.target_tavern_name,
        character_id=data.character_id,
        character_name=data.character_name,
        trigger_type=data.trigger_type,
        trigger_keywords=data.trigger_keywords,
        user_id=user_id,
    )


@router.post("/{rumor_id}/view")
def record_rumor_view(
    request: Request,
    rumor_id: str,
) -> dict[str, Any]:
    """记录传闻浏览"""
    return spaces_service(request).record_rumor_view(rumor_id)


@router.post("/{rumor_id}/click")
def record_rumor_click(
    request: Request,
    rumor_id: str,
) -> dict[str, Any]:
    """记录传闻点击"""
    return spaces_service(request).record_rumor_click(rumor_id)


@router.delete("/{rumor_id}")
def delete_rumor(
    request: Request,
    rumor_id: str,
) -> dict[str, Any]:
    """删除传闻"""
    require_session_capability(request, CREATOR_CAPABILITY)
    user_id = get_user_id(request)
    return spaces_service(request).delete_rumor(rumor_id, user_id)
