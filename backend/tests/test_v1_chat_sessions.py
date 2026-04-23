from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-chat-sessions"
VISITOR_ID = "visitor-chat-sessions"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern_with_character(client: TestClient) -> tuple[str, str]:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "会话测试酒馆",
            "description": "用于测试聊天会话列表和导出",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "status": "open",
            "scene_prompt": "温暖的酒馆。",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200
    tavern_id = response.json()["id"]

    char_response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "测试角色",
            "description": "用于测试的角色。",
            "personality": "友善",
        },
    )
    assert char_response.status_code == 200
    character_id = char_response.json()["id"]

    return tavern_id, character_id


def _send_chat(client: TestClient, tavern_id: str, character_id: str, visitor_id: str, message: str) -> None:
    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": visitor_id},
        json={
            "character_id": character_id,
            "message": message,
            "visitor_id": visitor_id,
            "visitor_name": "测试访客",
        },
    )
    assert response.status_code == 200


def test_v1_list_chat_sessions_empty(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    response = client.get(
        f"/api/v1/taverns/{tavern_id}/chat/sessions",
        headers={"X-User-Id": OWNER_ID},
    )
    assert response.status_code == 200
    data = response.json()
    assert "chats" in data
    assert "count" in data
    assert data["count"] == 0
    assert data["chats"] == []


def test_v1_list_chat_sessions_with_messages(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "你好，我想了解这间酒馆。")
    _send_chat(client, tavern_id, character_id, VISITOR_ID, "有什么特色吗？")

    response = client.get(
        f"/api/v1/taverns/{tavern_id}/chat/sessions",
        headers={"X-User-Id": OWNER_ID},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert len(data["chats"]) >= 1

    session = data["chats"][0]
    assert session["tavern_id"] == tavern_id
    assert session["character_id"] == character_id
    assert session["character_name"] == "测试角色"
    assert session["visitor_id"] == VISITOR_ID
    assert session["visitor_name"] == "测试访客"
    assert "message_count" in session
    assert "last_message" in session
    assert "last_role" in session
    assert "updated_at" in session


def test_v1_list_chat_sessions_filter_by_character(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    char2_response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"name": "第二个角色", "description": "另一个角色"},
    )
    assert char2_response.status_code == 200
    character_id_2 = char2_response.json()["id"]

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "给第一个角色")
    _send_chat(client, tavern_id, character_id_2, VISITOR_ID, "给第二个角色")

    filtered = client.get(
        f"/api/v1/taverns/{tavern_id}/chat/sessions",
        headers={"X-User-Id": OWNER_ID},
        params={"character_id": character_id},
    )
    assert filtered.status_code == 200
    data = filtered.json()
    for session in data["chats"]:
        assert session["character_id"] == character_id


def test_v1_export_chat_json(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "测试消息1")
    _send_chat(client, tavern_id, character_id, VISITOR_ID, "测试消息2")

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/export",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "format": "json"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "messages" in data
    assert isinstance(data["messages"], list)
    assert len(data["messages"]) >= 4


def test_v1_export_chat_text(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "文本导出测试")

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/export",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "format": "text"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert isinstance(data["text"], str)
    assert "文本导出测试" in data["text"] or "测试角色" in data["text"]


def test_v1_export_chat_by_visitor(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "访客自己的消息")

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/export",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "visitor_id": VISITOR_ID, "format": "json"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "messages" in data


def test_v1_export_chat_nonexistent_tavern(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.post(
        "/api/v1/taverns/nonexistent-tavern-id/chat/export",
        headers={"X-User-Id": OWNER_ID},
        json={"format": "json"},
    )
    assert response.status_code == 404


def test_v1_search_chat_history_respects_owner_and_visitor_scope(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "Alpha private note")

    owner_search = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/search",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "query": "PRIVATE", "limit": 10},
    )
    assert owner_search.status_code == 200
    owner_payload = owner_search.json()
    assert owner_payload["count"] >= 1
    assert any(
        result["message"]["content"] == "Alpha private note"
        for result in owner_payload["results"]
    )

    visitor_search = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/search",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "query": "alpha"},
    )
    assert visitor_search.status_code == 200
    assert visitor_search.json()["count"] >= 1

    empty_search = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/search",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "query": "   "},
    )
    assert empty_search.status_code == 200
    assert empty_search.json()["count"] == 0


def test_v1_export_and_search_reject_cross_visitor_scope(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    _send_chat(client, tavern_id, character_id, VISITOR_ID, "Cross visitor private note")

    forbidden_export = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/export",
        headers={"X-User-Id": "visitor-other"},
        json={"character_id": character_id, "visitor_id": VISITOR_ID, "format": "text"},
    )
    assert forbidden_export.status_code == 403

    forbidden_search = client.post(
        f"/api/v1/taverns/{tavern_id}/chat/search",
        headers={"X-User-Id": "visitor-other"},
        json={"character_id": character_id, "visitor_id": VISITOR_ID, "query": "private"},
    )
    assert forbidden_search.status_code == 403
