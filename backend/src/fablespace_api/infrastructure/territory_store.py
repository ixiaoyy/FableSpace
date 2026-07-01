"""
FableSpace Territory Store — 领地存储层

提供领地的持久化存储，支持 JSON 和 MySQL 后端。
"""

from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fablespace_api.core.territory import (
    Territory,
    TerritoryStatus,
    TerritoryType,
    TerritoryClaimRequest,
    TerritoryUpdateRequest,
    check_location_available,
    find_nearby_territories,
    TerritoryNearbyQuery,
    validate_radius,
    validate_coordinates,
)


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _format_db_datetime(value: Any) -> str:
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%dT%H:%M:%SZ")
    text = str(value).strip()
    if not text:
        return ""
    return text.replace("+00:00", "Z")


def _gen_id(prefix: str = "territory") -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


class TerritoryStore:
    """JSON-backed territory store for local/dev fallback."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.mkdir(parents=True, exist_ok=True)
        self._territories_file = self.path / "territories.json"
        self._tavern_map_file = self.path / "territory_tavern_map.json"

    def _read_territories(self) -> dict[str, dict[str, Any]]:
        if not self._territories_file.exists():
            return {}
        try:
            payload = json.loads(self._territories_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _write_territories(self, data: dict[str, dict[str, Any]]) -> None:
        self._territories_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _read_tavern_map(self) -> dict[str, str]:
        if not self._tavern_map_file.exists():
            return {}
        try:
            payload = json.loads(self._tavern_map_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _write_tavern_map(self, data: dict[str, str]) -> None:
        self._tavern_map_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _to_territory(self, data: dict[str, Any]) -> Territory:
        return Territory.from_dict(data)

    def _get_all_active_territories(self) -> list[Territory]:
        all_territories = self._read_territories()
        return [
            self._to_territory(t)
            for t in all_territories.values()
            if t.get("status") in [TerritoryStatus.ACTIVE.value, TerritoryStatus.CLAIMED.value]
        ]

    def check_availability(
        self,
        lat: float,
        lon: float,
        radius: float,
        territory_type: TerritoryType | str,
        exclude_territory_id: str | None = None,
    ) -> dict[str, Any]:
        """检查位置是否可用。"""
        valid, msg = validate_coordinates(lat, lon)
        if not valid:
            return {"available": False, "message": msg, "conflicting_territories": []}

        type_str = territory_type.value if isinstance(territory_type, TerritoryType) else territory_type
        valid, msg = validate_radius(radius, territory_type)
        if not valid:
            return {"available": False, "message": msg, "conflicting_territories": []}

        all_active = self._get_all_active_territories()
        result = check_location_available(
            lat, lon, radius, territory_type,
            all_active, exclude_territory_id,
        )
        return {
            "available": result.available,
            "message": result.message,
            "conflicting_territories": result.conflicting_territories,
        }

    def create_territory(self, request: TerritoryClaimRequest) -> dict[str, Any]:
        """创建新领地。"""
        territory_id = _gen_id()

        valid, msg = validate_coordinates(request.center_lat, request.center_lon)
        if not valid:
            raise ValueError(msg)

        valid, msg = validate_radius(request.radius, request.type)
        if not valid:
            raise ValueError(msg)

        availability = self.check_availability(
            request.center_lat, request.center_lon,
            request.radius, request.type,
        )
        if not availability["available"]:
            raise ValueError(availability["message"])

        territory = request.to_territory(territory_id)
        territory.created_at = _now_iso()
        territory.updated_at = _now_iso()

        all_territories = self._read_territories()
        all_territories[territory_id] = territory.to_dict()
        self._write_territories(all_territories)

        if territory.space_id:
            space_map = self._read_tavern_map()
            space_map[territory.space_id] = territory_id
            self._write_tavern_map(space_map)

        return territory.to_dict()

    def get_territory(self, territory_id: str) -> dict[str, Any] | None:
        """获取领地详情。"""
        all_territories = self._read_territories()
        territory = all_territories.get(territory_id)
        if not territory:
            return None
        return dict(territory)

    def update_territory(self, territory_id: str, request: TerritoryUpdateRequest) -> dict[str, Any]:
        """更新领地。"""
        all_territories = self._read_territories()
        territory_data = all_territories.get(territory_id)
        if not territory_data:
            raise KeyError(f"领地不存在: {territory_id}")

        territory = self._to_territory(territory_data)

        if request.radius is not None:
            valid, msg = validate_radius(request.radius, territory.type)
            if not valid:
                raise ValueError(msg)

            availability = self.check_availability(
                territory.center_lat, territory.center_lon,
                request.radius, territory.type,
                exclude_territory_id=territory_id,
            )
            if not availability["available"]:
                raise ValueError(availability["message"])

            territory.radius = request.radius

        if request.status is not None:
            territory.status = request.status

        if request.name is not None:
            territory.name = request.name

        territory.updated_at = _now_iso()
        all_territories[territory_id] = territory.to_dict()
        self._write_territories(all_territories)

        return territory.to_dict()

    def delete_territory(self, territory_id: str) -> bool:
        """废弃领地。"""
        all_territories = self._read_territories()
        if territory_id not in all_territories:
            return False

        territory_data = all_territories[territory_id]
        territory = self._to_territory(territory_data)
        territory.status = TerritoryStatus.ABANDONED
        territory.updated_at = _now_iso()
        all_territories[territory_id] = territory.to_dict()
        self._write_territories(all_territories)

        if territory.space_id:
            space_map = self._read_tavern_map()
            space_map.pop(territory.space_id, None)
            self._write_tavern_map(space_map)

        return True

    def list_territories(
        self,
        *,
        owner_id: str | None = None,
        space_id: str | None = None,
        type: TerritoryType | str | None = None,
        status: TerritoryStatus | str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """列出领地。"""
        all_territories = self._read_territories()
        results = []

        for t in all_territories.values():
            if owner_id and t.get("owner_id") != owner_id:
                continue
            if space_id and t.get("space_id") != space_id:
                continue
            if type:
                type_str = type.value if isinstance(type, TerritoryType) else type
                if t.get("type") != type_str:
                    continue
            if status:
                status_str = status.value if isinstance(status, TerritoryStatus) else status
                if t.get("status") != status_str:
                    continue
            results.append(dict(t))

        results.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        total = len(results)
        safe_offset = max(0, int(offset))
        safe_limit = max(1, min(int(limit), 500))
        return results[safe_offset : safe_offset + safe_limit], total

    def get_territory_by_tavern(self, space_id: str) -> dict[str, Any] | None:
        """通过酒馆ID获取领地。"""
        space_map = self._read_tavern_map()
        territory_id = space_map.get(space_id)
        if not territory_id:
            return None
        return self.get_territory(territory_id)

    def query_nearby(
        self,
        lat: float,
        lon: float,
        radius: float,
        types: list[TerritoryType | str] | None = None,
        statuses: list[TerritoryStatus | str] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """查询附近领地。"""
        all_territories = self._get_all_active_territories()

        query = TerritoryNearbyQuery(
            lat=lat,
            lon=lon,
            radius=radius,
            types=types,
            statuses=statuses,
            limit=limit,
        )

        results = find_nearby_territories(query, all_territories)
        return results


class SQLAlchemyTerritoryStore:
    """Database-backed territory store using SQLAlchemy."""

    def __init__(self, database: Any):
        self.database = database

    def _session(self) -> Any:
        return self.database

    def _to_territory(self, model: Any) -> Territory:
        return Territory(
            id=model.id,
            owner_id=model.owner_id,
            type=model.type,
            center_lat=model.center_lat,
            center_lon=model.center_lon,
            radius=model.radius,
            status=model.status,
            space_id=model.space_id,
            name=model.name,
            created_at=_format_db_datetime(model.created_at),
            updated_at=_format_db_datetime(model.updated_at),
        )

    def check_availability(
        self,
        lat: float,
        lon: float,
        radius: float,
        territory_type: TerritoryType | str,
        exclude_territory_id: str | None = None,
    ) -> dict[str, Any]:
        """检查位置是否可用。"""
        from sqlalchemy import text
        from fablespace_api.core.territory import haversine_distance, TERRITORY_TYPE_META

        valid, msg = validate_coordinates(lat, lon)
        if not valid:
            return {"available": False, "message": msg, "conflicting_territories": []}

        type_str = territory_type.value if isinstance(territory_type, TerritoryType) else territory_type
        valid, msg = validate_radius(radius, territory_type)
        if not valid:
            return {"available": False, "message": msg, "conflicting_territories": []}

        session = self.database.get_session()
        try:
            query = text("""
                SELECT id, owner_id, type, center_lat, center_lon, radius, status, space_id, name
                FROM territories
                WHERE type = :type
                AND status IN ('active', 'claimed')
            """)
            result = session.execute(query, {"type": type_str})
            conflicts = []

            for row in result:
                distance = haversine_distance(lat, lon, row.center_lat, row.center_lon)
                combined_radius = radius + row.radius

                if exclude_territory_id and row.id == exclude_territory_id:
                    continue

                if distance < combined_radius:
                    conflicts.append({
                        "id": row.id,
                        "name": row.name,
                        "type": row.type,
                        "distance": round(distance, 2),
                    })

            if conflicts:
                return {
                    "available": False,
                    "message": f"此处已有同类领地冲突，距离 {conflicts[0]['distance']} 米",
                    "conflicting_territories": conflicts,
                }

            return {"available": True, "message": "该位置可以申领", "conflicting_territories": []}
        finally:
            session.close()

    def create_territory(self, request: TerritoryClaimRequest) -> dict[str, Any]:
        """创建新领地。"""
        from sqlalchemy import text

        valid, msg = validate_coordinates(request.center_lat, request.center_lon)
        if not valid:
            raise ValueError(msg)

        valid, msg = validate_radius(request.radius, request.type)
        if not valid:
            raise ValueError(msg)

        availability = self.check_availability(
            request.center_lat, request.center_lon,
            request.radius, request.type,
        )
        if not availability["available"]:
            raise ValueError(availability["message"])

        territory_id = _gen_id()
        now = datetime.now(UTC)
        type_str = request.type.value if isinstance(request.type, TerritoryType) else request.type

        session = self.database.get_session()
        try:
            query = text("""
                INSERT INTO territories
                (id, owner_id, type, center_lat, center_lon, radius, status, space_id, name, created_at, updated_at)
                VALUES (:id, :owner_id, :type, :center_lat, :center_lon, :radius, :status, :space_id, :name, :created_at, :updated_at)
            """)
            session.execute(query, {
                "id": territory_id,
                "owner_id": request.owner_id,
                "type": type_str,
                "center_lat": request.center_lat,
                "center_lon": request.center_lon,
                "radius": request.radius,
                "status": TerritoryStatus.CLAIMED.value,
                "space_id": request.space_id,
                "name": request.name,
                "created_at": now,
                "updated_at": now,
            })
            session.commit()

            return self.get_territory(territory_id)
        finally:
            session.close()

    def get_territory(self, territory_id: str) -> dict[str, Any] | None:
        """获取领地详情。"""
        from sqlalchemy import text

        session = self.database.get_session()
        try:
            query = text("""
                SELECT id, owner_id, type, center_lat, center_lon, radius, status, space_id, name, created_at, updated_at
                FROM territories
                WHERE id = :id
            """)
            result = session.execute(query, {"id": territory_id})
            row = result.fetchone()
            if not row:
                return None
            return {
                "id": row.id,
                "owner_id": row.owner_id,
                "type": row.type,
                "center_lat": row.center_lat,
                "center_lon": row.center_lon,
                "radius": row.radius,
                "status": row.status,
                "space_id": row.space_id,
                "name": row.name,
                "created_at": _format_db_datetime(row.created_at),
                "updated_at": _format_db_datetime(row.updated_at),
            }
        finally:
            session.close()

    def update_territory(self, territory_id: str, request: TerritoryUpdateRequest) -> dict[str, Any]:
        """更新领地。"""
        from sqlalchemy import text

        existing = self.get_territory(territory_id)
        if not existing:
            raise KeyError(f"领地不存在: {territory_id}")

        updates = {}
        if request.radius is not None:
            valid, msg = validate_radius(request.radius, existing["type"])
            if not valid:
                raise ValueError(msg)
            availability = self.check_availability(
                existing["center_lat"], existing["center_lon"],
                request.radius, existing["type"],
                exclude_territory_id=territory_id,
            )
            if not availability["available"]:
                raise ValueError(availability["message"])
            updates["radius"] = request.radius

        if request.status is not None:
            status_str = request.status.value if isinstance(request.status, TerritoryStatus) else request.status
            updates["status"] = status_str

        if request.name is not None:
            updates["name"] = request.name

        if updates:
            updates["updated_at"] = datetime.now(UTC)
            set_clause = ", ".join(f"{k} = :{k}" for k in updates.keys())
            query = text(f"UPDATE territories SET {set_clause} WHERE id = :id")
            query = query.bindparams(id=territory_id, **updates)

            session = self.database.get_session()
            try:
                session.execute(query, updates)
                session.commit()
            finally:
                session.close()

        return self.get_territory(territory_id)

    def delete_territory(self, territory_id: str) -> bool:
        """废弃领地。"""
        from sqlalchemy import text

        session = self.database.get_session()
        try:
            query = text("UPDATE territories SET status = :status, updated_at = :updated_at WHERE id = :id")
            session.execute(query, {
                "id": territory_id,
                "status": TerritoryStatus.ABANDONED.value,
                "updated_at": datetime.now(UTC),
            })
            session.commit()
            return True
        except Exception:
            session.rollback()
            return False
        finally:
            session.close()

    def list_territories(
        self,
        *,
        owner_id: str | None = None,
        space_id: str | None = None,
        type: TerritoryType | str | None = None,
        status: TerritoryStatus | str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """列出领地。"""
        from sqlalchemy import text

        conditions = []
        params = {}

        if owner_id:
            conditions.append("owner_id = :owner_id")
            params["owner_id"] = owner_id
        if space_id:
            conditions.append("space_id = :space_id")
            params["space_id"] = space_id
        if type:
            type_str = type.value if isinstance(type, TerritoryType) else type
            conditions.append("type = :type")
            params["type"] = type_str
        if status:
            status_str = status.value if isinstance(status, TerritoryStatus) else status
            conditions.append("status = :status")
            params["status"] = status_str

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        session = self.database.get_session()
        try:
            count_query = text(f"SELECT COUNT(*) FROM territories WHERE {where_clause}")
            total = session.execute(count_query, params).scalar() or 0

            list_query = text(f"""
                SELECT id, owner_id, type, center_lat, center_lon, radius, status, space_id, name, created_at, updated_at
                FROM territories
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """)
            params["limit"] = limit
            params["offset"] = offset

            result = session.execute(list_query, params)
            territories = []
            for row in result:
                territories.append({
                    "id": row.id,
                    "owner_id": row.owner_id,
                    "type": row.type,
                    "center_lat": row.center_lat,
                    "center_lon": row.center_lon,
                    "radius": row.radius,
                    "status": row.status,
                    "space_id": row.space_id,
                    "name": row.name,
                    "created_at": _format_db_datetime(row.created_at),
                    "updated_at": _format_db_datetime(row.updated_at),
                })
            return territories, total
        finally:
            session.close()

    def get_territory_by_tavern(self, space_id: str) -> dict[str, Any] | None:
        """通过酒馆ID获取领地。"""
        territories, _ = self.list_territories(space_id=space_id)
        return territories[0] if territories else None

    def query_nearby(
        self,
        lat: float,
        lon: float,
        radius: float,
        types: list[TerritoryType | str] | None = None,
        statuses: list[TerritoryStatus | str] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """查询附近领地。"""
        from sqlalchemy import text
        from fablespace_api.core.territory import haversine_distance

        session = self.database.get_session()
        try:
            params = {}
            type_conditions = []
            if types:
                type_values = [t.value if isinstance(t, TerritoryType) else t for t in types]
                placeholders = ", ".join(f":type_{i}" for i in range(len(type_values)))
                type_conditions.append(f"type IN ({placeholders})")
                for i, t in enumerate(type_values):
                    params[f"type_{i}"] = t

            status_conditions = []
            if statuses:
                status_values = [s.value if isinstance(s, TerritoryStatus) else s for s in statuses]
                placeholders = ", ".join(f":status_{i}" for i in range(len(status_values)))
                status_conditions.append(f"status IN ({placeholders})")
                for i, s in enumerate(status_values):
                    params[f"status_{i}"] = s

            conditions = ["status NOT IN ('abandoned', 'available')"]
            if type_conditions:
                conditions.extend(type_conditions)
            if status_conditions:
                conditions.extend(status_conditions)

            where_clause = " AND ".join(conditions)
            params["lat"] = lat
            params["lon"] = lon
            params["radius"] = radius

            query = text(f"""
                SELECT id, owner_id, type, center_lat, center_lon, radius, status, space_id, name, created_at, updated_at
                FROM territories
                WHERE {where_clause}
            """)

            result = session.execute(query, params)
            territories = []

            for row in result:
                distance = haversine_distance(lat, lon, row.center_lat, row.center_lon)
                if distance <= radius:
                    territories.append({
                        "id": row.id,
                        "owner_id": row.owner_id,
                        "type": row.type,
                        "center_lat": row.center_lat,
                        "center_lon": row.center_lon,
                        "radius": row.radius,
                        "status": row.status,
                        "space_id": row.space_id,
                        "name": row.name,
                        "created_at": _format_db_datetime(row.created_at),
                        "updated_at": _format_db_datetime(row.updated_at),
                        "distance": round(distance, 2),
                    })

            territories.sort(key=lambda x: x["distance"])
            return territories[:limit]
        finally:
            session.close()
