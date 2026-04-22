from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-package"
VISITOR_ID = "visitor-package"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _gameplay_payload() -> dict:
    return {
        "id": "gp_route",
        "title": "测试路线",
        "status": "published",
        "summary": "用于测试会话放弃。",
        "entry_label": "开始",
        "nodes": [
            {
                "id": "start",
                "narration": "开始。",
                "choices": [{"id": "go", "label": "继续", "next_node_id": "complete"}],
                "fallback_events": [{"id": "fallback", "text": "继续。", "next_node_id": "complete"}],
            },
            {"id": "complete", "kind": "complete", "narration": "完成。", "choices": []},
        ],
        "completion": {"complete_node_ids": ["complete"], "reward_text": "完成奖励", "memory_atom": {"enabled": False}},
    }


def _create_tavern(client: TestClient) -> tuple[str, str]:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "包裹酒馆",
            "description": "用于测试酒馆包迁移",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "scene_prompt": "雨夜测试场景。",
            "llm_config": {"backend": "rules", "model": "rules", "api_key": "secret-key"},
            "gameplay_definitions": [_gameplay_payload()],
        },
    )
    assert response.status_code == 200
    tavern_id = response.json()["id"]
    character = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "包裹看板娘",
            "description": "负责打包导出。",
            "first_mes": "欢迎打包。",
            "world_info": [{"keys": ["包裹"], "content": "包裹测试世界书。"}],
        },
    )
    assert character.status_code == 200
    return tavern_id, character.json()["id"]


def test_v1_tavern_package_export_import_redacts_sensitive_config(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(client)

    exported = client.get(f"/api/v1/taverns/{tavern_id}/package", headers={"X-User-Id": OWNER_ID})
    assert exported.status_code == 200
    package = exported.json()
    assert package["type"] == "fablemap_tavern_package"
    assert "api_key" not in package["tavern"]["llm_config"]
    assert "password_hash" not in package["tavern"]
    assert package["characters"][0]["name"] == "包裹看板娘"
    assert package["world_info"][0]["keys"] == ["包裹"]
    assert package["gameplay_definitions"][0]["id"] == "gp_route"
    assert "_gameplay_sessions" not in package

    imported = client.post(
        "/api/v1/tavern-packages/import",
        headers={"X-User-Id": "owner-imported"},
        json={"package": package, "lat": 30.0, "lon": 120.0, "name": "导入后的酒馆"},
    )
    assert imported.status_code == 200
    payload = imported.json()
    assert payload["ok"] is True
    assert payload["characters"] == 1
    assert payload["world_info"] == 1
    assert payload["tavern"]["owner_id"] == "owner-imported"
    assert payload["tavern"]["name"] == "导入后的酒馆"
    assert payload["tavern"]["llm_config"]["api_key"] == ""


def test_v1_visitors_character_import_and_gameplay_abandon(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern(client)

    imported_character = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/import",
        headers={"X-User-Id": OWNER_ID},
        json={
            "data": {
                "name": "导入角色",
                "description": "来自 SillyTavern 卡。",
                "first_mes": "我是导入角色。",
                "character_book": {
                    "entries": [{"keys": ["导入"], "content": "导入角色的世界书。"}],
                },
            }
        },
    )
    assert imported_character.status_code == 200
    assert imported_character.json()["name"] == "导入角色"

    entered = client.post(f"/api/v1/taverns/{tavern_id}/enter", headers={"X-User-Id": VISITOR_ID}, json={})
    assert entered.status_code == 200
    chatted = client.post(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": character_id,
            "visitor_id": VISITOR_ID,
            "visitor_name": "包裹旅人",
            "message": "我来测试访客列表。",
        },
    )
    assert chatted.status_code == 200

    visitors = client.get(f"/api/v1/taverns/{tavern_id}/visitors", headers={"X-User-Id": OWNER_ID})
    assert visitors.status_code == 200
    visitor_payload = visitors.json()["visitors"][0]
    assert visitor_payload["visitor_id"] == VISITOR_ID
    assert visitor_payload["visitor_name"] == "包裹旅人"
    assert visitor_payload["message_count"] == 2

    visitor_forbidden = client.get(f"/api/v1/taverns/{tavern_id}/visitors", headers={"X-User-Id": VISITOR_ID})
    assert visitor_forbidden.status_code == 403

    started = client.post(
        f"/api/v1/taverns/{tavern_id}/gameplay-sessions",
        headers={"X-User-Id": VISITOR_ID},
        json={"gameplay_id": "gp_route", "character_id": character_id},
    )
    assert started.status_code == 200
    session_id = started.json()["session"]["id"]

    other_abandon = client.post(
        f"/api/v1/taverns/{tavern_id}/gameplay-sessions/{session_id}/abandon",
        headers={"X-User-Id": "other-visitor"},
    )
    assert other_abandon.status_code == 403

    abandoned = client.post(
        f"/api/v1/taverns/{tavern_id}/gameplay-sessions/{session_id}/abandon",
        headers={"X-User-Id": VISITOR_ID},
    )
    assert abandoned.status_code == 200
    assert abandoned.json()["session"]["state"] == "abandoned"
