from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app

OWNER_ID = "owner-draft"
VISITOR_ID = "visitor-draft"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient) -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "静安夜航空间",
            "description": "一间锚定上海静安公共街角的小空间。",
            "lat": 31.224,
            "lon": 121.445,
            "access": "public",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_owner_generates_ai_character_draft_without_persisting_it(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    generated = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/ai-draft",
        headers={"X-User-Id": OWNER_ID},
        json={
            "style_tags": ["猫娘", "傲娇", "复国"],
            "forbidden": ["不要露骨", "不要真实私人地址"],
            "tone": "轻喜剧、短句",
        },
    )

    assert generated.status_code == 200
    payload = generated.json()
    assert payload["ok"] is True
    assert payload["tavern_id"] == tavern_id
    assert payload["status"] == "ai_draft"
    assert "店主确认" in " ".join(payload["warnings"])

    draft = payload["draft"]
    assert set(draft) == {
        "name",
        "description",
        "personality",
        "scenario",
        "system_prompt",
        "first_mes",
        "mes_example",
        "tags",
        "hobbies",
    }
    for field in ("name", "description", "personality", "scenario", "system_prompt", "first_mes", "mes_example"):
        assert draft[field]
    assert {"AI 草稿", "猫娘", "傲娇", "复国"}.issubset(set(draft["tags"]))
    assert "静安夜航空间" in draft["scenario"]
    assert "不要露骨" in draft["system_prompt"]
    assert "不要真实私人地址" in draft["system_prompt"]
    assert "自动发布" in draft["system_prompt"]

    listed = client.get(f"/api/v1/taverns/{tavern_id}/characters", headers={"X-User-Id": OWNER_ID})
    assert listed.status_code == 200
    assert listed.json()["characters"] == []

    saved = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json=draft,
    )
    assert saved.status_code == 200
    assert saved.json()["name"] == draft["name"]

    listed_after_save = client.get(f"/api/v1/taverns/{tavern_id}/characters", headers={"X-User-Id": OWNER_ID})
    assert len(listed_after_save.json()["characters"]) == 1


def test_ai_character_draft_is_owner_only(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters/ai-draft",
        headers={"X-User-Id": VISITOR_ID},
        json={"style_tags": ["酒保"]},
    )

    assert response.status_code == 403
    assert response.json()["error"] == "你不是此空间的主人"
