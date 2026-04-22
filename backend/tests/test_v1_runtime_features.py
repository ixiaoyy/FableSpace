from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-runtime"
VISITOR_ID = "visitor-runtime"
OTHER_VISITOR_ID = "visitor-other"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient) -> tuple[str, list[str]]:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "运行时酒馆",
            "description": "用于测试 LLM、群聊和语音迁移",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "scene_prompt": "吧台悬着蓝色灯牌。",
            "llm_config": {"backend": "rules", "model": "rules", "api_key": "owner-secret"},
        },
    )
    assert response.status_code == 200
    tavern_id = response.json()["id"]
    character_ids: list[str] = []
    for name in ("灯牌调酒师", "夜航向导"):
        created = client.post(
            f"/api/v1/taverns/{tavern_id}/characters",
            headers={"X-User-Id": OWNER_ID},
            json={
                "name": name,
                "description": f"{name} 负责群聊测试。",
                "personality": "友好、简短",
                "first_mes": "欢迎来到运行时酒馆。",
                "talkativeness": 1.0,
            },
        )
        assert created.status_code == 200
        character_ids.append(created.json()["id"])
    return tavern_id, character_ids


def test_v1_llm_probe_and_voice_config_endpoints(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(client)

    direct_probe = client.post(
        "/api/v1/llm/test-config",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "rules", "model": "rules"},
    )
    assert direct_probe.status_code == 200
    assert direct_probe.json()["ok"] is True
    assert "api_key" not in direct_probe.text

    tavern_probe = client.post(
        f"/api/v1/taverns/{tavern_id}/test-llm",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "rules", "model": "rules"},
    )
    assert tavern_probe.status_code == 200
    assert tavern_probe.json()["ok"] is True

    missing_secret = client.post("/api/v1/llm/test-config", json={"backend": "openai", "model": "gpt-test"})
    assert missing_secret.status_code == 200
    assert missing_secret.json()["ok"] is False

    defaults = client.get(f"/api/v1/taverns/{tavern_id}/voice", headers={"X-User-Id": VISITOR_ID})
    assert defaults.status_code == 200
    assert defaults.json()["voice_config"]["enabled"] is False

    disabled_tts = client.post(
        f"/api/v1/taverns/{tavern_id}/tts",
        headers={"X-User-Id": VISITOR_ID},
        json={"text": "请读出这句话。"},
    )
    assert disabled_tts.status_code == 400
    assert disabled_tts.json()["error"] == "语音未启用"

    visitor_save = client.put(
        f"/api/v1/taverns/{tavern_id}/voice",
        headers={"X-User-Id": VISITOR_ID},
        json={"enabled": True},
    )
    assert visitor_save.status_code == 403

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/voice",
        headers={"X-User-Id": OWNER_ID},
        json={"enabled": "true", "tts_provider": "edge_tts", "stt_provider": "browser", "auto_play": "true"},
    )
    assert saved.status_code == 200
    assert saved.json()["voice_config"]["enabled"] is True
    assert saved.json()["voice_config"]["auto_play"] is True

    browser_stt = client.post(
        f"/api/v1/taverns/{tavern_id}/stt",
        headers={"X-User-Id": VISITOR_ID},
        content=b"not-real-audio",
    )
    assert browser_stt.status_code == 400
    assert browser_stt.json()["error"] == "浏览器 STT 无需上传到后端"


def test_v1_group_chat_config_send_history_and_permissions(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_ids = _create_tavern(client)

    defaults = client.get(f"/api/v1/taverns/{tavern_id}/group-chat", headers={"X-User-Id": VISITOR_ID})
    assert defaults.status_code == 200
    assert defaults.json()["group_chat_enabled"] is False
    assert defaults.json()["character_count"] == 2

    visitor_update = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": VISITOR_ID},
        json={"group_chat_enabled": True},
    )
    assert visitor_update.status_code == 403

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 2,
                "response_cooldown_seconds": 0,
                "require_name_prefix": True,
            },
            "character_talkativeness": {character_ids[0]: 1.0, character_ids[1]: 1.0},
        },
    )
    assert saved.status_code == 200
    assert saved.json()["group_chat_enabled"] is True
    assert saved.json()["group_chat_config"]["strategy"] == "round_robin"

    chatted = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "今晚灯牌亮吗？"},
    )
    assert chatted.status_code == 200
    payload = chatted.json()
    assert payload["speaker_count"] == 2
    assert payload["messages"][0]["character_id"] in set(character_ids)
    assert payload["degraded"] is False
    assert payload["visitor_state"]["visitor_id"] == VISITOR_ID

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert history.status_code == 200
    assert history.json()["message_count"] == 3
    assert {message["role"] for message in history.json()["messages"]} == {"user", "assistant"}

    owner_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert owner_history.status_code == 200
    assert owner_history.json()["message_count"] == 3

    other_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": OTHER_VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert other_history.status_code == 403

    talk = client.put(
        f"/api/v1/taverns/{tavern_id}/characters/{character_ids[0]}/talkativeness",
        headers={"X-User-Id": OWNER_ID},
        json={"talkativeness": 0.2},
    )
    assert talk.status_code == 200
    updated = next(item for item in talk.json()["characters"] if item["id"] == character_ids[0])
    assert updated["talkativeness"] == 0.2
