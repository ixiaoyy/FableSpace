"""
FableSpace Territory — 领地系统核心

提供领地的创建、查询、碰撞检测等核心功能。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any


# ─────────────────────────────────────────
# 类型定义
# ─────────────────────────────────────────

TerritoryId = str
SpaceId = str
OwnerId = str


class TerritoryType(str, Enum):
    TAVERN = "tavern"
    PET_SHOP = "pet_shop"
    GARDEN = "garden"
    GAME_WORKSHOP = "game_workshop"
    GACHA = "gacha"
    CULTIVATION = "cultivation"
    SHOP = "shop"
    WAREHOUSE = "warehouse"


class TerritoryStatus(str, Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    ACTIVE = "active"
    PAUSED = "paused"
    ABANDONED = "abandoned"


# 领地类型元数据
TERRITORY_TYPE_META = {
    TerritoryType.TAVERN: {
        "name": "酒馆",
        "icon": "🍺",
        "default_radius": 50,
        "min_radius": 20,
        "max_radius": 200,
    },
    TerritoryType.PET_SHOP: {
        "name": "宠物店",
        "icon": "🐱",
        "default_radius": 50,
        "min_radius": 20,
        "max_radius": 200,
    },
    TerritoryType.GARDEN: {
        "name": "菜园",
        "icon": "🌱",
        "default_radius": 100,
        "min_radius": 50,
        "max_radius": 500,
    },
    TerritoryType.GAME_WORKSHOP: {
        "name": "游戏工坊",
        "icon": "🎮",
        "default_radius": 50,
        "min_radius": 20,
        "max_radius": 200,
    },
    TerritoryType.GACHA: {
        "name": "抽卡角",
        "icon": "🎰",
        "default_radius": 50,
        "min_radius": 20,
        "max_radius": 200,
    },
    TerritoryType.CULTIVATION: {
        "name": "修炼场",
        "icon": "🏔️",
        "default_radius": 80,
        "min_radius": 30,
        "max_radius": 300,
    },
    TerritoryType.SHOP: {
        "name": "商店",
        "icon": "🏪",
        "default_radius": 30,
        "min_radius": 10,
        "max_radius": 100,
    },
    TerritoryType.WAREHOUSE: {
        "name": "仓库",
        "icon": "📦",
        "default_radius": 20,
        "min_radius": 10,
        "max_radius": 100,
    },
}

# 领地类型颜色（用于地图可视化）
TERRITORY_TYPE_COLORS = {
    TerritoryType.TAVERN: "#FFD700",
    TerritoryType.PET_SHOP: "#FF69B4",
    TerritoryType.GARDEN: "#32CD32",
    TerritoryType.GAME_WORKSHOP: "#4169E1",
    TerritoryType.GACHA: "#9932CC",
    TerritoryType.CULTIVATION: "#8B4513",
    TerritoryType.SHOP: "#FFD700",
    TerritoryType.WAREHOUSE: "#808080",
}


# ─────────────────────────────────────────
# 数据模型
# ─────────────────────────────────────────

@dataclass
class Territory:
    """领地实体"""

    id: str
    owner_id: str
    type: TerritoryType | str
    center_lat: float
    center_lon: float
    radius: float  # 米
    status: TerritoryStatus | str = TerritoryStatus.CLAIMED
    space_id: str | None = None
    name: str | None = None
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self):
        if isinstance(self.type, str):
            self.type = TerritoryType(self.type)
        if isinstance(self.status, str):
            self.status = TerritoryStatus(self.status)
        if not self.created_at:
            self.created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        if not self.updated_at:
            self.updated_at = self.created_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "type": self.type.value if isinstance(self.type, TerritoryType) else self.type,
            "center_lat": self.center_lat,
            "center_lon": self.center_lon,
            "radius": self.radius,
            "status": self.status.value if isinstance(self.status, TerritoryStatus) else self.status,
            "space_id": self.space_id,
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Territory:
        return cls(
            id=str(data.get("id", "")),
            owner_id=str(data.get("owner_id", "")),
            type=data.get("type", TerritoryType.TAVERN),
            center_lat=float(data.get("center_lat", 0)),
            center_lon=float(data.get("center_lon", 0)),
            radius=float(data.get("radius", 50)),
            status=data.get("status", TerritoryStatus.CLAIMED),
            space_id=data.get("space_id"),
            name=data.get("name"),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )


@dataclass
class TerritoryClaimRequest:
    """申领领地请求"""

    type: TerritoryType | str
    center_lat: float
    center_lon: float
    radius: float
    owner_id: str
    space_id: str | None = None
    name: str | None = None

    def to_territory(self, territory_id: str) -> Territory:
        return Territory(
            id=territory_id,
            owner_id=self.owner_id,
            type=self.type,
            center_lat=self.center_lat,
            center_lon=self.center_lon,
            radius=self.radius,
            status=TerritoryStatus.CLAIMED,
            space_id=self.space_id,
            name=self.name,
        )


@dataclass
class TerritoryUpdateRequest:
    """更新领地请求"""

    radius: float | None = None
    status: TerritoryStatus | str | None = None
    name: str | None = None


@dataclass
class TerritoryCheckResult:
    """位置可用性检查结果"""

    available: bool
    message: str
    conflicting_territories: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class TerritoryNearbyQuery:
    """附近领地查询参数"""

    lat: float
    lon: float
    radius: float  # 查询半径（米）
    types: list[TerritoryType | str] | None = None
    statuses: list[TerritoryStatus | str] | None = None
    limit: int = 100


# ─────────────────────────────────────────
# 碰撞检测
# ─────────────────────────────────────────

# 地球平均半径（米）
EARTH_RADIUS_M = 6371000


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    计算两点间的球面距离（米）。

    使用 Haversine 公式。
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_M * c


def check_territory_collision(
    territory1: Territory,
    territory2: Territory,
) -> bool:
    """
    检测两个领地是否碰撞。

    同类型领地不可重叠。
    不同类型领地可以共存（功能分区）。
    """
    type1 = territory1.type.value if isinstance(territory1.type, TerritoryType) else territory1.type
    type2 = territory2.type.value if isinstance(territory2.type, TerritoryType) else territory2.type

    if type1 != type2:
        return False

    distance = haversine_distance(
        territory1.center_lat, territory1.center_lon,
        territory2.center_lat, territory2.center_lon,
    )

    return distance < (territory1.radius + territory2.radius)


def check_location_available(
    lat: float,
    lon: float,
    radius: float,
    territory_type: TerritoryType | str,
    existing_territories: list[Territory],
    exclude_territory_id: str | None = None,
) -> TerritoryCheckResult:
    """
    检查给定位置是否可以申领新领地。

    规则：
    1. 同类型活跃领地不可重叠
    2. 不同类型领地可以重叠
    """
    type_str = territory_type.value if isinstance(territory_type, TerritoryType) else territory_type
    conflicts = []

    for territory in existing_territories:
        if exclude_territory_id and territory.id == exclude_territory_id:
            continue

        t_type = territory.type.value if isinstance(territory.type, TerritoryType) else territory.type
        t_status = territory.status.value if isinstance(territory.status, TerritoryStatus) else territory.status

        if t_type != type_str:
            continue

        if t_status not in [TerritoryStatus.ACTIVE.value, TerritoryStatus.CLAIMED.value]:
            continue

        distance = haversine_distance(lat, lon, territory.center_lat, territory.center_lon)

        if distance < (radius + territory.radius):
            conflicts.append({
                "id": territory.id,
                "name": territory.name,
                "type": t_type,
                "distance": round(distance, 2),
            })

    if conflicts:
        return TerritoryCheckResult(
            available=False,
            message=f"此处已有同类领地冲突，距离 {conflicts[0]['distance']} 米",
            conflicting_territories=conflicts,
        )

    return TerritoryCheckResult(
        available=True,
        message="该位置可以申领",
    )


def find_nearby_territories(
    query: TerritoryNearbyQuery,
    territories: list[Territory],
) -> list[Territory]:
    """
    查找附近领地。

    支持按类型和状态过滤。
    """
    results = []

    for territory in territories:
        t_type = territory.type.value if isinstance(territory.type, TerritoryType) else territory.type
        t_status = territory.status.value if isinstance(territory.status, TerritoryStatus) else territory.status

        if t_status == TerritoryStatus.ABANDONED.value:
            continue

        if query.types:
            type_values = [t.value if isinstance(t, TerritoryType) else t for t in query.types]
            if t_type not in type_values:
                continue

        if query.statuses:
            status_values = [s.value if isinstance(s, TerritoryStatus) else s for s in query.statuses]
            if t_status not in status_values:
                continue

        distance = haversine_distance(
            query.lat, query.lon,
            territory.center_lat, territory.center_lon,
        )

        if distance <= query.radius:
            territory_dict = territory.to_dict()
            territory_dict["distance"] = round(distance, 2)
            results.append(territory_dict)

    results.sort(key=lambda x: x["distance"])
    return results[: query.limit]


# ─────────────────────────────────────────
# 验证
# ─────────────────────────────────────────

def validate_radius(radius: float, territory_type: TerritoryType | str) -> tuple[bool, str]:
    """验证领地半径是否符合类型限制。"""
    try:
        normalized_type = territory_type if isinstance(territory_type, TerritoryType) else TerritoryType(str(territory_type))
    except ValueError:
        return False, f"未知的领地类型: {territory_type}"

    meta = TERRITORY_TYPE_META.get(normalized_type)
    if not meta:
        return False, f"未知的领地类型: {normalized_type.value}"

    min_radius = meta["min_radius"]
    max_radius = meta["max_radius"]

    if radius < min_radius:
        return False, f"半径不能小于 {min_radius} 米"
    if radius > max_radius:
        return False, f"半径不能大于 {max_radius} 米"

    return True, ""


def validate_coordinates(lat: float, lon: float) -> tuple[bool, str]:
    """验证坐标是否有效。"""
    if not (-90 <= lat <= 90):
        return False, "纬度必须在 -90 到 90 之间"
    if not (-180 <= lon <= 180):
        return False, "经度必须在 -180 到 180 之间"
    return True, ""
