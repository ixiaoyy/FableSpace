import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from fablemap_api.core.llm_clients import LLMError
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-character-draft"
VISITOR_ID = "visitor-character-draft"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient) -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "雨灯路口酒馆",
            "description": "真实路口旁的小酒馆，门口有一盏蓝色雨灯。",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "scene_prompt": "吧台旁能听见雨声。",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_character_draft_uses_owner_default_llm_and_exposes_source(
    tmp_path: Path,
    monkeypatch,
) -> None:
    captured: dict[str, Any] = {}

    class DummyClient:
        def __init__(self, config: Any) -> None:
            captured["config"] = config

        def complete(self, messages: list[dict[str, str]]) -> Any:
            captured["messages"] = messages

            class DummyResponse:
                content = json.dumps(
                    {
                        "name": "雨灯见习生",
                        "description": "在雨灯路口酒馆试写的未发布 NPC。",
                        "personality": "温暖、短句、会先问店主是否确认设定。",
                        "scenario": "站在吧台旁，等待店主审核。",
                        "system_prompt": "保持原创；店主保存前不得声称已经发布。",
                        "first_mes": "我先把雨灯调暗一点，等店主确认后再正式接待你。",
                        "mes_example": "<START>\n{{user}}: 这里是什么地方？\n{{char}}: 这里是雨灯路口酒馆。",
                        "tags": ["雨灯", "招待员"],
                    },
                    ensure_ascii=False,
                )

            return DummyResponse()

    monkeypatch.setattr("fablemap_api.application.services.characters.create_client", lambda cfg: DummyClient(cfg))

    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    saved = client.put(
        "/api/v1/owners/me/default-llm",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "openai", "model": "gpt-draft-test", "api_key": "sk-owner-draft-secret"},
    )
    assert saved.status_code == 200, saved.text

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/ai-draft",
        headers={"X-User-Id": OWNER_ID},
        json={
            "style_tags": ["雨夜", "招待员"],
            "forbidden": ["不要真实私人地址"],
            "tone": "克制、温暖",
        },
    )

    assert response.status_code == 200, response.text
    assert "sk-owner-draft-secret" not in response.text
    body = response.json()
    assert body["source"] == "owner_llm"
    assert body["source_label"] == "店主默认 LLM 草稿"
    assert body["draft"]["name"] == "雨灯见习生"
    assert "AI 草稿" in body["draft"]["tags"]
    assert body["warnings"] == ["AI 草稿不会自动发布，必须由店主确认保存。"]
    assert captured["config"].api_key == "sk-owner-draft-secret"
    prompt = "\n".join(message["content"] for message in captured["messages"])
    assert "雨灯路口酒馆" in prompt
    assert "雨夜" in prompt
    assert "sk-owner-draft-secret" not in prompt

    owner_view = client.get(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": OWNER_ID})
    visitor_view = client.get(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": VISITOR_ID})
    assert owner_view.status_code == 200
    assert visitor_view.status_code == 200
    assert owner_view.json()["characters"] == []
    assert visitor_view.json()["characters"] == []


def test_character_draft_without_owner_llm_returns_transparent_local_template(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/ai-draft",
        headers={"X-User-Id": OWNER_ID},
        json={"style_tags": ["路口向导"], "tone": "温暖、短句"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source"] == "local_template_fallback"
    assert body["source_label"] == "本地模板草稿"
    assert body["source_reason"] == "missing_owner_llm"
    assert body["draft"]["name"] not in {"猫铃看板娘", "夜航招待员"}
    assert body["draft"]["name"].startswith("路口向导")
    assert "本地模板草稿" in body["draft"]["tags"]
    assert "真实 AI 生成" not in body["draft"]["first_mes"]
    assert any("本地模板" in warning and "不是真实 AI 生成" in warning for warning in body["warnings"])


def test_character_draft_llm_failure_degrades_to_transparent_template(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class FailingClient:
        def complete(self, messages: list[dict[str, str]]) -> Any:
            raise LLMError("provider unavailable")

    monkeypatch.setattr("fablemap_api.application.services.characters.create_client", lambda cfg: FailingClient())

    client = _client(tmp_path)
    tavern_id = _create_tavern(client)
    saved = client.put(
        "/api/v1/owners/me/default-llm",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "openai", "model": "gpt-draft-test", "api_key": "sk-owner-draft-secret"},
    )
    assert saved.status_code == 200, saved.text

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/ai-draft",
        headers={"X-User-Id": OWNER_ID},
        json={"style_tags": ["雨夜"], "tone": "克制"},
    )

    assert response.status_code == 200, response.text
    assert "sk-owner-draft-secret" not in response.text
    body = response.json()
    assert body["source"] == "local_template_fallback"
    assert body["source_reason"] == "owner_llm_failed"
    assert body["draft"]["name"].startswith("雨夜")
    assert any("调用失败" in warning and "本地模板草稿" in warning for warning in body["warnings"])
