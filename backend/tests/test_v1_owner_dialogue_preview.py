from pathlib import Path
import json

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-dialogue-preview"
VISITOR_ID = "visitor-dialogue-preview"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient, *, backend: str = "rules", api_key: str = "owner-secret") -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "干跑预览酒馆",
            "description": "用于测试店主 prompt dry-run。",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "scene_prompt": "吧台边有雨声和铜铃。",
            "world_info": [
                {
                    "id": "rain-memory",
                    "keys": ["雨声"],
                    "content": "雨声会触发旧日传闻，但只能作为酒馆内背景。",
                    "constant": False,
                    "selective": True,
                }
            ],
            "llm_config": {
                "backend": backend,
                "model": "rule-based" if backend == "rules" else "test-model",
                "api_key": api_key,
            },
        },
    )
    assert response.status_code == 200
    tavern_id = response.json()["id"]
    world_info = client.put(
        f"/api/v1/taverns/{tavern_id}",
        headers={"X-User-Id": OWNER_ID},
        json={
            "world_info": [
                {
                    "id": "rain-memory",
                    "keys": ["雨声"],
                    "content": "雨声会触发旧日传闻，但只能作为酒馆内背景。",
                    "constant": False,
                    "selective": True,
                }
            ]
        },
    )
    assert world_info.status_code == 200
    return tavern_id


def _add_character(client: TestClient, tavern_id: str) -> str:
    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "铃兰",
            "description": "吧台后的 NPC",
            "personality": "温和、谨慎",
            "scenario": "雨夜酒馆",
            "system_prompt": "保持赛博酒馆 NPC 口吻。",
            "first_mes": "欢迎回来。",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_v1_owner_dialogue_preview_builds_prompt_without_persistence(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)
    character_id = _add_character(client, tavern_id)

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/dialogue-preview/dry-run",
        headers={"X-User-Id": OWNER_ID},
        json={
            "character_id": character_id,
            "message": "今晚雨声很近，你会怎么开场？",
            "visitor_id": "preview-visitor",
            "visitor_name": "预览旅人",
            "call_model": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["dry_run"] is True
    assert payload["persisted"] is False
    assert payload["model_called"] is False
    assert payload["history_written"] is False
    assert payload["memory_written"] is False
    assert payload["writeback_written"] is False
    assert payload["character_id"] == character_id
    assert payload["character_name"] == "铃兰"
    assert payload["matched_world_info_count"] >= 1
    assert "雨声会触发旧日传闻" in json.dumps(payload["messages"], ensure_ascii=False)

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": "preview-visitor", "character_id": character_id},
    )
    assert history.status_code == 200
    assert history.json()["messages"] == []

    memories = client.get(f"/api/v1/taverns/{tavern_id}/memory-atoms", headers={"X-User-Id": OWNER_ID})
    assert memories.status_code == 200
    assert memories.json()["memory_atoms"] == []


def test_v1_owner_dialogue_preview_can_call_model_only_when_requested(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client, backend="openai", api_key="sk-owner-preview-secret")
    character_id = _add_character(client, tavern_id)
    calls: list[list[dict]] = []

    class DummyClient:
        def complete(self, messages):
            calls.append(messages)

            class Response:
                content = "这是一次 dry-run 模型回复。"

            return Response()

    monkeypatch.setattr("fablemap_api.application.services.owner_config.create_client", lambda cfg: DummyClient())

    no_call = client.post(
        f"/api/v1/taverns/{tavern_id}/dialogue-preview/dry-run",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "message": "先只组装 prompt。", "call_model": False},
    )
    assert no_call.status_code == 200
    assert no_call.json()["model_called"] is False
    assert calls == []

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/dialogue-preview/dry-run",
        headers={"X-User-Id": OWNER_ID},
        json={"character_id": character_id, "message": "确认测试一次模型。", "call_model": True},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["model_called"] is True
    assert payload["assistant_message"] == "这是一次 dry-run 模型回复。"
    assert payload["token_estimate"] > 0
    assert calls and calls[0]
    assert "sk-owner-preview-secret" not in json.dumps(payload, ensure_ascii=False)

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": "owner-preview-dry-run", "character_id": character_id},
    )
    assert history.status_code == 200
    assert history.json()["messages"] == []


def test_v1_owner_dialogue_preview_is_owner_only(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)
    character_id = _add_character(client, tavern_id)

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/dialogue-preview/dry-run",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "message": "我不是店主。"},
    )

    assert response.status_code == 403
