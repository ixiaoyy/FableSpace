from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-world-info"
VISITOR_ID = "visitor-world-info"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient, access: str = "public") -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "世界书酒馆",
            "description": "用于测试 WorldInfo 全局迁移。",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": access,
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_v1_worldinfo_global_crud_test_and_permissions(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    missing_tavern_id = client.post(
        "/api/v1/worldinfo",
        headers={"X-User-Id": OWNER_ID},
        json={"keys": ["雨声"], "content": "没有 tavern_id 不应写入。"},
    )
    assert missing_tavern_id.status_code == 400

    visitor_create = client.post(
        "/api/v1/worldinfo",
        headers={"X-User-Id": VISITOR_ID},
        json={"tavern_id": tavern_id, "keys": ["雨声"], "content": "访客不能改店主世界书。"},
    )
    assert visitor_create.status_code == 403

    created = client.post(
        "/api/v1/worldinfo",
        headers={"X-User-Id": OWNER_ID},
        json={
            "tavern_id": tavern_id,
            "id": "rain-entry",
            "keys": "雨声，旧钟",
            "keys_secondary": ["吧台"],
            "content": "雨声会触发旧日传闻。",
            "selective": False,
            "insertion_order": 40,
            "depth": 3,
            "probability": 100,
        },
    )
    assert created.status_code == 200
    entry = created.json()["entry"]
    assert entry["id"] == "rain-entry"
    assert entry["keys"] == ["雨声", "旧钟"]
    assert entry["keys_secondary"] == ["吧台"]
    assert entry["order"] == 40

    listed = client.get("/api/v1/worldinfo", headers={"X-User-Id": VISITOR_ID}, params={"tavern_id": tavern_id})
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["count"] == 1
    assert payload["world_info"][0]["id"] == "rain-entry"
    assert payload["world_info"][0]["tavern_id"] == tavern_id
    assert payload["world_info"][0]["tavern_name"] == "世界书酒馆"

    matched = client.post(
        "/api/v1/worldinfo/test",
        headers={"X-User-Id": OWNER_ID},
        json={"tavern_id": tavern_id, "text": "今晚的雨声靠近吧台。"},
    )
    assert matched.status_code == 200
    assert matched.json()["matched_count"] == 1
    assert matched.json()["matches"][0]["id"] == "rain-entry"
    assert matched.json()["matches"][0]["matched_keys"] == ["雨声"]

    visitor_update = client.put(
        "/api/v1/worldinfo/rain-entry",
        headers={"X-User-Id": VISITOR_ID},
        json={"tavern_id": tavern_id, "content": "访客更新不应成功。"},
    )
    assert visitor_update.status_code == 403

    updated = client.put(
        "/api/v1/worldinfo/rain-entry",
        headers={"X-User-Id": OWNER_ID},
        json={"tavern_id": tavern_id, "keys": ["铜铃"], "content": "铜铃会回应回访者。"},
    )
    assert updated.status_code == 200
    assert updated.json()["entry"]["keys"] == ["铜铃"]
    assert updated.json()["entry"]["content"] == "铜铃会回应回访者。"

    visitor_delete = client.request(
        "DELETE",
        "/api/v1/worldinfo/rain-entry",
        headers={"X-User-Id": VISITOR_ID},
        json={"tavern_id": tavern_id},
    )
    assert visitor_delete.status_code == 403

    deleted = client.request(
        "DELETE",
        "/api/v1/worldinfo/rain-entry",
        headers={"X-User-Id": OWNER_ID},
        json={"tavern_id": tavern_id},
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"ok": True, "entry_id": "rain-entry", "tavern_id": tavern_id}

    empty = client.get("/api/v1/worldinfo", headers={"X-User-Id": OWNER_ID}, params={"tavern_id": tavern_id})
    assert empty.status_code == 200
    assert empty.json()["world_info"] == []


def test_v1_worldinfo_global_respects_private_tavern_visibility(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client, access="private")
    created = client.post(
        "/api/v1/worldinfo",
        headers={"X-User-Id": OWNER_ID},
        json={"tavern_id": tavern_id, "keys": ["私密"], "content": "只给主人可见。"},
    )
    assert created.status_code == 200

    visitor_list = client.get("/api/v1/worldinfo", headers={"X-User-Id": VISITOR_ID})
    assert visitor_list.status_code == 200
    assert not any(item["tavern_id"] == tavern_id for item in visitor_list.json()["world_info"])

    visitor_scoped = client.get("/api/v1/worldinfo", headers={"X-User-Id": VISITOR_ID}, params={"tavern_id": tavern_id})
    assert visitor_scoped.status_code == 403
