"""
Territory API Contracts — 领地 API 请求/响应模型
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .common import FlexibleBody


class TerritoryCheckRequest(FlexibleBody):
    """检查位置可用性请求"""
    lat: float
    lon: float
    radius: float
    type: str


class TerritoryCheckResponse(BaseModel):
    """检查位置可用性响应"""
    available: bool
    message: str
    conflicting_territories: list[dict[str, Any]]


class TerritoryClaimRequest(FlexibleBody):
    """申领领地请求"""
    type: str
    center_lat: float
    center_lon: float
    radius: float
    tavern_id: str | None = None
    name: str | None = None


class TerritoryUpdateRequest(FlexibleBody):
    """更新领地请求"""
    radius: float | None = None
    status: str | None = None
    name: str | None = None


class TerritoryResponse(BaseModel):
    """领地响应"""
    id: str
    owner_id: str
    type: str
    center_lat: float
    center_lon: float
    radius: float
    status: str
    tavern_id: str | None = None
    name: str | None = None
    created_at: str
    updated_at: str
    distance: float | None = None


class TerritoryListResponse(BaseModel):
    """领地列表响应"""
    territories: list[dict[str, Any]]
    count: int


class TerritoryNearbyResponse(BaseModel):
    """附近领地响应"""
    territories: list[dict[str, Any]]
    count: int


__all__ = [
    "TerritoryCheckRequest",
    "TerritoryCheckResponse",
    "TerritoryClaimRequest",
    "TerritoryListResponse",
    "TerritoryNearbyResponse",
    "TerritoryResponse",
    "TerritoryUpdateRequest",
]
