"""
Territory Application Service — 领地应用服务

提供领地的业务逻辑编排，依赖 TerritoryStore 进行持久化。
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from fablespace_api.core.territory import (
    TerritoryClaimRequest,
    TerritoryStatus,
    TerritoryType,
    TerritoryUpdateRequest,
)


class TerritoryApplicationService:
    """领地应用服务"""

    def __init__(self, store: Any):
        self.store = store

    def check_availability(
        self,
        lat: float,
        lon: float,
        radius: float,
        territory_type: str,
        exclude_territory_id: str | None = None,
    ) -> dict[str, Any]:
        """检查位置是否可用于申领。"""
        return self.store.check_availability(lat, lon, radius, territory_type, exclude_territory_id)

    def create_territory(self, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        """创建新领地。"""
        territory_type = data.get("type")
        if not territory_type:
            raise HTTPException(status_code=400, detail="领地类型不能为空")

        try:
            TerritoryType(territory_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"无效的领地类型: {territory_type}")

        request = TerritoryClaimRequest(
            type=territory_type,
            center_lat=float(data.get("center_lat", 0)),
            center_lon=float(data.get("center_lon", 0)),
            radius=float(data.get("radius", 50)),
            owner_id=user_id,
            space_id=data.get("space_id"),
            name=data.get("name"),
        )

        try:
            return self.store.create_territory(request)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    def get_territory(self, territory_id: str) -> dict[str, Any] | None:
        """获取领地详情。"""
        return self.store.get_territory(territory_id)

    def update_territory(self, territory_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        """更新领地。"""
        territory = self.store.get_territory(territory_id)
        if not territory:
            raise HTTPException(status_code=404, detail="领地不存在")

        if territory.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="你不是此领地的主人")

        request = TerritoryUpdateRequest(
            radius=float(data["radius"]) if "radius" in data else None,
            status=data.get("status"),
            name=data.get("name"),
        )

        try:
            return self.store.update_territory(territory_id, request)
        except KeyError:
            raise HTTPException(status_code=404, detail="领地不存在")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    def delete_territory(self, territory_id: str, user_id: str) -> bool:
        """废弃领地。"""
        territory = self.store.get_territory(territory_id)
        if not territory:
            return False

        if territory.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="你不是此领地的主人")

        return self.store.delete_territory(territory_id)

    def list_territories(
        self,
        *,
        owner_id: str | None = None,
        space_id: str | None = None,
        type: str | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """列出领地。"""
        territory_type = None
        if type:
            try:
                territory_type = TerritoryType(type)
            except ValueError:
                pass

        territory_status = None
        if status:
            try:
                territory_status = TerritoryStatus(status)
            except ValueError:
                pass

        return self.store.list_territories(
            owner_id=owner_id,
            space_id=space_id,
            type=territory_type,
            status=territory_status,
            limit=limit,
            offset=offset,
        )

    def query_nearby(
        self,
        lat: float,
        lon: float,
        radius: float,
        types: list[str] | None = None,
        statuses: list[str] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """查询附近领地。"""
        territory_types = None
        if types:
            territory_types = []
            for t in types:
                try:
                    territory_types.append(TerritoryType(t))
                except ValueError:
                    pass

        territory_statuses = None
        if statuses:
            territory_statuses = []
            for s in statuses:
                try:
                    territory_statuses.append(TerritoryStatus(s))
                except ValueError:
                    pass

        return self.store.query_nearby(
            lat=lat,
            lon=lon,
            radius=radius,
            types=territory_types,
            statuses=territory_statuses,
            limit=limit,
        )

    def get_territory_by_tavern(self, space_id: str) -> dict[str, Any] | None:
        """通过酒馆ID获取领地。"""
        return self.store.get_territory_by_tavern(space_id)
