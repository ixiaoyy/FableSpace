"""
领地系统测试

测试领地核心功能：碰撞检测、存储 CRUD、API 端点。
"""

import math
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app
from fablemap_api.core.territory import (
    Territory,
    TerritoryType,
    TerritoryStatus,
    TerritoryClaimRequest,
    haversine_distance,
    check_location_available,
    find_nearby_territories,
    TerritoryNearbyQuery,
    validate_radius,
    validate_coordinates,
)
from fablemap_api.infrastructure.territory_store import TerritoryStore


# ─────────────────────────────────────────
# 测试 Haversine 距离计算
# ─────────────────────────────────────────

class TestHaversineDistance:
    def test_same_point_returns_zero(self):
        """同一点距离为 0"""
        assert haversine_distance(39.9042, 116.4074, 39.9042, 116.4074) == pytest.approx(0, abs=0.1)

    def test_known_distance_beijing_to_shanghai(self):
        """北京到上海约 1068 公里"""
        # 北京: 39.9042, 116.4074
        # 上海: 31.2304, 121.4737
        distance = haversine_distance(39.9042, 116.4074, 31.2304, 121.4737)
        # 约 1068 公里 = 1,068,000 米
        assert 1_060_000 < distance < 1_080_000

    def test_short_distance_100m(self):
        """约 0.001 度的距离约 111 米（纬度方向）"""
        distance = haversine_distance(39.9042, 116.4074, 39.9052, 116.4074)
        # 0.001 纬度约 111 米
        assert 100 < distance < 125

    def test_symmetric(self):
        """距离计算是对称的"""
        d1 = haversine_distance(39.9042, 116.4074, 31.2304, 121.4737)
        d2 = haversine_distance(31.2304, 121.4737, 39.9042, 116.4074)
        assert d1 == pytest.approx(d2, rel=1e-9)


# ─────────────────────────────────────────
# 测试领地数据模型
# ─────────────────────────────────────────

class TestTerritoryModel:
    def test_create_territory(self):
        """创建领地对象"""
        territory = Territory(
            id="test_001",
            owner_id="user_001",
            type=TerritoryType.TAVERN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=50,
        )
        assert territory.id == "test_001"
        assert territory.type == TerritoryType.TAVERN
        assert territory.status == TerritoryStatus.CLAIMED

    def test_territory_to_dict(self):
        """领地转字典"""
        territory = Territory(
            id="test_001",
            owner_id="user_001",
            type=TerritoryType.GARDEN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=100,
        )
        data = territory.to_dict()
        assert data["id"] == "test_001"
        assert data["type"] == "garden"
        assert data["radius"] == 100

    def test_territory_from_dict(self):
        """从字典创建领地"""
        data = {
            "id": "test_002",
            "owner_id": "user_002",
            "type": "pet_shop",
            "center_lat": 39.9042,
            "center_lon": 116.4074,
            "radius": 50,
        }
        territory = Territory.from_dict(data)
        assert territory.id == "test_002"
        assert territory.type == TerritoryType.PET_SHOP


# ─────────────────────────────────────────
# 测试领地类型验证
# ─────────────────────────────────────────

class TestTerritoryTypeValidation:
    def test_validate_radius_tavern_valid(self):
        """酒馆半径 50 在有效范围内"""
        valid, msg = validate_radius(50, TerritoryType.TAVERN)
        assert valid

    def test_validate_radius_tavern_too_small(self):
        """酒馆半径 10 太小"""
        valid, msg = validate_radius(10, TerritoryType.TAVERN)
        assert not valid
        assert "不能小于" in msg

    def test_validate_radius_tavern_too_large(self):
        """酒馆半径 300 太大"""
        valid, msg = validate_radius(300, TerritoryType.TAVERN)
        assert not valid
        assert "不能大于" in msg

    def test_validate_radius_garden_can_be_larger(self):
        """菜园允许更大的半径"""
        valid, msg = validate_radius(200, TerritoryType.GARDEN)
        assert valid

    def test_validate_radius_accepts_string_type(self):
        """API/service 层传入字符串类型时也应按枚举限制校验"""
        valid, msg = validate_radius(50, "tavern")
        assert valid
        assert msg == ""

    def test_validate_coordinates_valid(self):
        """有效坐标"""
        valid, msg = validate_coordinates(39.9042, 116.4074)
        assert valid

    def test_validate_coordinates_invalid_lat(self):
        """无效纬度"""
        valid, msg = validate_coordinates(91, 116.4074)
        assert not valid
        assert "纬度" in msg

    def test_validate_coordinates_invalid_lon(self):
        """无效经度"""
        valid, msg = validate_coordinates(39.9042, 181)
        assert not valid
        assert "经度" in msg


# ─────────────────────────────────────────
# 测试碰撞检测
# ─────────────────────────────────────────

class TestCollisionDetection:
    def test_same_location_same_type_collision(self):
        """同位置同类型领地碰撞"""
        t1 = Territory(
            id="t1",
            owner_id="user1",
            type=TerritoryType.TAVERN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=50,
        )
        t2 = Territory(
            id="t2",
            owner_id="user2",
            type=TerritoryType.TAVERN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=50,
        )
        # 同一点，半径 50+50=100，应该碰撞
        distance = haversine_distance(t1.center_lat, t1.center_lon, t2.center_lat, t2.center_lon)
        assert distance < (t1.radius + t2.radius)

    def test_different_location_no_collision(self):
        """不同位置无碰撞"""
        t1 = Territory(
            id="t1",
            owner_id="user1",
            type=TerritoryType.TAVERN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=50,
        )
        t2 = Territory(
            id="t2",
            owner_id="user2",
            type=TerritoryType.TAVERN,
            center_lat=39.9142,  # 相距约 1 公里
            center_lon=116.4074,
            radius=50,
        )
        distance = haversine_distance(t1.center_lat, t1.center_lon, t2.center_lat, t2.center_lon)
        assert distance > (t1.radius + t2.radius)

    def test_different_type_can_overlap(self):
        """不同类型可以重叠（功能分区）"""
        t1 = Territory(
            id="t1",
            owner_id="user1",
            type=TerritoryType.TAVERN,
            center_lat=39.9042,
            center_lon=116.4074,
            radius=50,
        )
        t2 = Territory(
            id="t2",
            owner_id="user2",
            type=TerritoryType.GARDEN,  # 不同类型
            center_lat=39.9042,
            center_lon=116.4074,
            radius=100,
        )
        # 不同类型应该不碰撞
        assert t1.type != t2.type


# ─────────────────────────────────────────
# 测试位置可用性检查
# ─────────────────────────────────────────

class TestLocationAvailability:
    def test_empty_store_available(self):
        """空存储应该可用"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")
            result = store.check_availability(39.9042, 116.4074, 50, TerritoryType.TAVERN)
            assert result["available"] is True

    def test_existing_territory_blocks_same_type(self):
        """已有领地阻止同类型"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            # 创建第一个领地
            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            store.create_territory(request)

            # 同一位置同类型应该不可用
            result = store.check_availability(39.9042, 116.4074, 50, TerritoryType.TAVERN)
            assert result["available"] is False
            assert len(result["conflicting_territories"]) > 0

    def test_different_type_not_blocked(self):
        """不同类型不被阻止"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            # 创建酒馆
            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            store.create_territory(request)

            # 同一位置菜园应该可用
            result = store.check_availability(39.9042, 116.4074, 100, TerritoryType.GARDEN)
            assert result["available"] is True


# ─────────────────────────────────────────
# 测试领地 CRUD
# ─────────────────────────────────────────

class TestTerritoryCRUD:
    def test_create_territory(self):
        """创建领地"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
                name="测试酒馆",
            )
            territory = store.create_territory(request)

            assert territory["id"].startswith("territory_")
            assert territory["type"] == "tavern"
            assert territory["name"] == "测试酒馆"
            assert territory["status"] == "claimed"

    def test_get_territory(self):
        """获取领地"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.GARDEN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=100,
                owner_id="user1",
            )
            created = store.create_territory(request)

            retrieved = store.get_territory(created["id"])
            assert retrieved is not None
            assert retrieved["id"] == created["id"]
            assert retrieved["type"] == "garden"

    def test_update_territory(self):
        """更新领地"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            created = store.create_territory(request)

            from fablemap_api.core.territory import TerritoryUpdateRequest
            updated = store.update_territory(
                created["id"],
                TerritoryUpdateRequest(status=TerritoryStatus.ACTIVE)
            )

            assert updated["status"] == "active"

    def test_delete_territory(self):
        """废弃领地"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            created = store.create_territory(request)

            success = store.delete_territory(created["id"])
            assert success is True

            # 获取应该返回 None
            retrieved = store.get_territory(created["id"])
            assert retrieved["status"] == "abandoned"


# ─────────────────────────────────────────
# 测试附近领地查询
# ─────────────────────────────────────────

class TestNearbyQuery:
    def test_query_nearby_empty(self):
        """查询附近无结果"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            store.create_territory(request)

            # 查询 100 米外应该无结果
            results = store.query_nearby(39.9052, 116.4074, 50)  # 约 100 米外
            assert len(results) == 0

    def test_query_nearby_with_results(self):
        """查询附近有结果"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            request = TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            )
            store.create_territory(request)

            # 查询 500 米内应该有结果
            results = store.query_nearby(39.9042, 116.4074, 500)
            assert len(results) == 1
            assert results[0]["type"] == "tavern"
            assert "distance" in results[0]

    def test_query_nearby_by_type(self):
        """按类型查询"""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = TerritoryStore(Path(tmpdir) / "territories")

            # 创建酒馆
            store.create_territory(TerritoryClaimRequest(
                type=TerritoryType.TAVERN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=50,
                owner_id="user1",
            ))

            # 创建菜园
            store.create_territory(TerritoryClaimRequest(
                type=TerritoryType.GARDEN,
                center_lat=39.9042,
                center_lon=116.4074,
                radius=100,
                owner_id="user1",
            ))

            # 只查询酒馆
            results = store.query_nearby(
                39.9042, 116.4074, 500,
                types=[TerritoryType.TAVERN]
            )
            assert len(results) == 1
            assert results[0]["type"] == "tavern"


# ─────────────────────────────────────────
# 测试 v1 API
# ─────────────────────────────────────────

def _client(tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None))
    )


class TestTerritoryApi:
    def test_check_and_claim_territory_with_user_identity(self, tmp_path):
        """v1 API 应支持字符串类型、用户身份头和同类型碰撞检测。"""
        client = _client(tmp_path)

        check = client.get(
            "/api/v1/territories/check",
            params={"lat": 39.9042, "lon": 116.4074, "radius": 50, "type": "tavern"},
        )
        assert check.status_code == 200
        assert check.json()["available"] is True

        missing_identity = client.post(
            "/api/v1/territories",
            json={"type": "tavern", "center_lat": 39.9042, "center_lon": 116.4074, "radius": 50},
        )
        assert missing_identity.status_code == 401

        created = client.post(
            "/api/v1/territories",
            headers={"X-User-Id": "owner-territory"},
            json={
                "type": "tavern",
                "center_lat": 39.9042,
                "center_lon": 116.4074,
                "radius": 50,
                "name": "测试领地酒馆",
            },
        )
        assert created.status_code == 200, created.text
        territory = created.json()
        assert territory["owner_id"] == "owner-territory"
        assert territory["type"] == "tavern"
        assert territory["status"] == "claimed"

        blocked = client.get(
            "/api/v1/territories/check",
            params={"lat": 39.9042, "lon": 116.4074, "radius": 50, "type": "tavern"},
        )
        assert blocked.status_code == 200
        assert blocked.json()["available"] is False
        assert len(blocked.json()["conflicting_territories"]) == 1

        garden = client.get(
            "/api/v1/territories/check",
            params={"lat": 39.9042, "lon": 116.4074, "radius": 100, "type": "garden"},
        )
        assert garden.status_code == 200
        assert garden.json()["available"] is True

    def test_update_and_delete_are_owner_scoped(self, tmp_path):
        """更新与废弃必须带 owner 身份，且非 owner 不可修改。"""
        client = _client(tmp_path)
        created = client.post(
            "/api/v1/territories",
            headers={"X-User-Id": "owner-a"},
            json={"type": "garden", "center_lat": 39.9042, "center_lon": 116.4074, "radius": 100},
        )
        assert created.status_code == 200, created.text
        territory_id = created.json()["id"]

        forbidden = client.put(
            f"/api/v1/territories/{territory_id}",
            headers={"X-User-Id": "owner-b"},
            json={"status": "active"},
        )
        assert forbidden.status_code == 403

        updated = client.put(
            f"/api/v1/territories/{territory_id}",
            headers={"X-User-Id": "owner-a"},
            json={"status": "active", "name": "开放菜园"},
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["status"] == "active"
        assert updated.json()["name"] == "开放菜园"

        listed = client.get("/api/v1/territories", params={"owner_id": "owner-a"})
        assert listed.status_code == 200
        assert listed.json()["count"] == 1

        deleted = client.delete(
            f"/api/v1/territories/{territory_id}",
            headers={"X-User-Id": "owner-a"},
        )
        assert deleted.status_code == 200, deleted.text
        assert deleted.json()["ok"] is True

        retrieved = client.get(f"/api/v1/territories/{territory_id}")
        assert retrieved.status_code == 200
        assert retrieved.json()["status"] == "abandoned"
