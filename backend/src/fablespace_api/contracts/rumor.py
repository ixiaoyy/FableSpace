"""
FableSpace Neighborhood Rumor Contracts — 邻里传闻请求/响应模型
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .common import FlexibleBody


class RumorGenerateRequest(FlexibleBody):
    """生成传闻请求"""
    source_space_id: str
    target_space_id: str
    target_tavern_name: str
    character_id: str
    character_name: str
    trigger_type: str = "keyword"  # keyword, random, visit
    trigger_keywords: list[str] = []


class RumorListRequest(FlexibleBody):
    """获取传闻列表请求"""
    source_space_id: str | None = None
    limit: int = 10
    include_expired: bool = False


class RumorResponse(BaseModel):
    """传闻响应"""
    id: str
    source_space_id: str
    target_space_id: str
    target_tavern_name: str
    character_id: str
    character_name: str
    rumor_text: str
    trigger_type: str
    trigger_keywords: list[str]
    weight: float
    created_at: str
    expires_at: str | None = None
    view_count: int = 0
    click_count: int = 0


class RumorListResponse(BaseModel):
    """传闻列表响应"""
    rumors: list[dict[str, Any]]
    count: int


class RumorClickRequest(FlexibleBody):
    """传闻点击请求"""
    pass  # 点击时不需要额外数据，rumor_id 在 URL 中


__all__ = [
    "RumorClickRequest",
    "RumorGenerateRequest",
    "RumorListRequest",
    "RumorListResponse",
    "RumorResponse",
]
