"""
FableMap Neighborhood Rumor API — 邻里传闻 API 端点
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.rumor import (
    RumorGenerateRequest,
    RumorListResponse,
)
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/rumors", tags=["rumors"])


@router.get("", response_model=RumorListResponse)
def list_rumors(
    request: Request,
    source_tavern_id: str = "",
    limit: int = 10,
    include_expired: bool = False,
) -> dict[str, Any]:
    """获取传闻列表"""
    return taverns_service(request).list_rumors(
        source_tavern_id=source_tavern_id,
        limit=limit,
        include_expired=include_expired,
    )


@router.post("/generate", response_model=dict[str, Any])
def generate_rumor(
    request: Request,
    data: RumorGenerateRequest,
) -> dict[str, Any]:
    """生成一条传闻"""
    user_id = get_user_id(request)
    return taverns_service(request).generate_rumor(
        source_tavern_id=data.source_tavern_id,
        target_tavern_id=data.target_tavern_id,
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
    return taverns_service(request).record_rumor_view(rumor_id)


@router.post("/{rumor_id}/click")
def record_rumor_click(
    request: Request,
    rumor_id: str,
) -> dict[str, Any]:
    """记录传闻点击"""
    return taverns_service(request).record_rumor_click(rumor_id)


@router.delete("/{rumor_id}")
def delete_rumor(
    request: Request,
    rumor_id: str,
) -> dict[str, Any]:
    """删除传闻"""
    user_id = get_user_id(request)
    return taverns_service(request).delete_rumor(rumor_id, user_id)
