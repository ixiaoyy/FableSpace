from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.core.tavern import ChatMessage
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-platform-home"


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("FABLEMAP_SEED_DEFAULT_TAVERNS", "0")
    return TestClient(
        create_app(
            ApiSettings(
                output_root=tmp_path / "api",
                fixture_file=None,
                frontend_root=None,
                storage_backend="json",
                database_url="",
                mysql_url="",
            )
        )
    )


def _create_tavern(
    client: TestClient,
    *,
    tavern_id: str,
    name: str,
    access: str = "public",
    place_type: str = "tavern",
    status: str = "open",
) -> dict:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": tavern_id,
            "name": name,
            "description": "Platform home API test tavern.",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": access,
            "place_type": place_type,
            "status": status,
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _add_character(client: TestClient, tavern_id: str, character_id: str, name: str) -> dict:
    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"id": character_id, "name": name, "first_mes": f"{name} 在这里等你。"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_platform_stats_aggregate_public_coordinate_surface(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    public_tavern = _create_tavern(client, tavern_id="platform-public", name="公开星港")
    private_tavern = _create_tavern(client, tavern_id="platform-private", name="私密房间", access="private")
    home_tavern = _create_tavern(client, tavern_id="platform-home", name="公开 Home", place_type="home")

    _add_character(client, public_tavern["id"], "public-char-a", "阿珀")
    _add_character(client, public_tavern["id"], "public-char-b", "米娅")
    _add_character(client, private_tavern["id"], "private-char", "不应展示")
    _add_character(client, home_tavern["id"], "home-char", "不应展示 Home")

    for visitor_id in ("visitor-one", "visitor-two"):
        enter = client.post(
            f"/api/v1/taverns/{public_tavern['id']}/enter",
            headers={"X-User-Id": visitor_id},
            json={},
        )
        assert enter.status_code == 200, enter.text

    response = client.get("/api/v1/platform/stats")

    assert response.status_code == 200, response.text
    payload = response.json()
    stats = payload["stats"]
    assert payload["data"]["stats"] == stats
    assert stats["coordinates"] == 1
    assert stats["characters"] == 2
    assert stats["visits"] == 2
    assert stats["encounters"] == 2
    assert stats["open"] == 1


def test_recent_memories_are_public_assistant_snippets_without_visitor_identity(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    public_tavern = _create_tavern(client, tavern_id="memory-public", name="星港夜谈")
    private_tavern = _create_tavern(client, tavern_id="memory-private", name="私密夜谈", access="private")
    _add_character(client, public_tavern["id"], "keeper", "守灯人")

    store = client.app.state.taverns.store
    store.add_chat_message(
        ChatMessage(
            id="public-user-message",
            tavern_id=public_tavern["id"],
            character_id="keeper",
            visitor_id="visitor-secret",
            visitor_name="不应外露",
            role="user",
            content="这是用户原文，不应该进入首页记忆流。",
            timestamp="2026-05-16T10:00:00Z",
        )
    )
    store.add_chat_message(
        ChatMessage(
            id="public-assistant-message",
            tavern_id=public_tavern["id"],
            character_id="keeper",
            visitor_id="visitor-secret",
            visitor_name="不应外露",
            role="assistant",
            content="欢迎回到星港，今天吧台给你留了一盏灯。",
            timestamp="2026-05-16T10:01:00Z",
        )
    )
    store.add_chat_message(
        ChatMessage(
            id="private-assistant-message",
            tavern_id=private_tavern["id"],
            character_id="private",
            visitor_id="visitor-private",
            role="assistant",
            content="这条私密空间消息不能出现在首页。",
            timestamp="2026-05-16T10:02:00Z",
        )
    )

    response = client.get("/api/v1/platform/recent-memories", params={"limit": 3})

    assert response.status_code == 200, response.text
    payload = response.json()
    memories = payload["memories"]
    assert payload["data"]["memories"] == memories
    assert [memory["content"] for memory in memories] == ["欢迎回到星港，今天吧台给你留了一盏灯。"]
    assert memories[0]["source"] == "星港夜谈"
    assert memories[0]["character_name"] == "守灯人"
    assert "visitor_id" not in memories[0]
    assert "visitor_name" not in memories[0]
