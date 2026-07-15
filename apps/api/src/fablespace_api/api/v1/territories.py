"""
Territory API Router — 领地 API 路由
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ...contracts.territories import (
    TerritoryClaimRequest,
    TerritoryUpdateRequest,
)
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id

router = APIRouter(prefix="/territories", tags=["territories"])


def territory_service(request: Request):
    return request.app.state.territory_service


@router.get("/check")
def check_territory_availability(
    request: Request,
    lat: float,
    lon: float,
    radius: float,
    type: str,
    exclude_territory_id: str | None = None,
) -> dict[str, Any]:
    """检查位置是否可用于申领领地。"""
    service = territory_service(request)
    return service.check_availability(lat, lon, radius, type, exclude_territory_id)


@router.post("")
def claim_territory(request: Request, data: TerritoryClaimRequest) -> dict[str, Any]:
    """申领新领地。"""
    require_session_capability(request, CREATOR_CAPABILITY)
    service = territory_service(request)
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="用户身份不能为空")
    return service.create_territory(data.to_payload(), user_id)


@router.get("")
def list_territories(
    request: Request,
    owner_id: str | None = None,
    space_id: str | None = None,
    type: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    """列出领地。"""
    service = territory_service(request)
    territories, total = service.list_territories(
        owner_id=owner_id,
        space_id=space_id,
        type=type,
        status=status,
        limit=limit,
        offset=offset,
    )
    return {"territories": territories, "count": total}


@router.get("/nearby")
def query_nearby_territories(
    request: Request,
    lat: float,
    lon: float,
    radius: float = 5000,
    types: str | None = None,
    statuses: str | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    """查询附近领地。"""
    service = territory_service(request)

    type_list = None
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()]

    status_list = None
    if statuses:
        status_list = [s.strip() for s in statuses.split(",") if s.strip()]

    territories = service.query_nearby(lat, lon, radius, type_list, status_list, limit)
    return {"territories": territories, "count": len(territories)}


@router.get("/{territory_id}")
def get_territory(request: Request, territory_id: str) -> dict[str, Any]:
    """获取领地详情。"""
    service = territory_service(request)
    territory = service.get_territory(territory_id)
    if not territory:
        raise HTTPException(status_code=404, detail="领地不存在")
    return territory


@router.put("/{territory_id}")
def update_territory(
    request: Request,
    territory_id: str,
    data: TerritoryUpdateRequest,
) -> dict[str, Any]:
    """更新领地。"""
    require_session_capability(request, CREATOR_CAPABILITY)
    service = territory_service(request)
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="用户身份不能为空")
    return service.update_territory(territory_id, data.to_payload(), user_id)


@router.delete("/{territory_id}")
def delete_territory(request: Request, territory_id: str) -> dict[str, Any]:
    """废弃领地。"""
    require_session_capability(request, CREATOR_CAPABILITY)
    service = territory_service(request)
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="用户身份不能为空")
    success = service.delete_territory(territory_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="领地不存在")
    return {"ok": True, "territory_id": territory_id}
