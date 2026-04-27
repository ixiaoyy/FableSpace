from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from fablemap_api.domain.tavern_share_policy import build_tavern_share_payload
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-share"
VISITOR_ID = "visitor-share"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient, *, access: str = "public") -> str:
    payload = {
        "name": "雾港酒馆",
        "description": "潮湿码头边的一间小酒馆，店主写下了旧灯塔、海风和夜班水手的设定。" * 4,
        "lat": 31.2304,
        "lon": 121.4737,
        "address": "上海 · 外滩",
        "access": access,
        "llm_config": {"backend": "openai", "model": "gpt-test", "api_key": "sk-share-secret"},
    }
    if access == "password":
        payload["password"] = "secret-door"
    created = client.post("/api/v1/taverns", headers={"X-User-Id": OWNER_ID}, json=payload)
    assert created.status_code == 200
    tavern_id = created.json()["id"]

    character = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"name": "守灯人", "first_mes": "灯还亮着。", "description": "公开角色简介"},
    )
    assert character.status_code == 200
    character_id = character.json()["id"]
    sprites = client.put(
        f"/api/v1/taverns/{tavern_id}/characters/{character_id}/sprites",
        headers={"X-User-Id": OWNER_ID},
        json={"sprites": {"neutral": "/generated/keeper.png", "joy": "/generated/keeper-joy.png"}},
    )
    assert sprites.status_code == 200
    return tavern_id


def test_v1_tavern_share_returns_public_safe_payload(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client, access="public")

    response = client.get(f"/api/v1/taverns/{tavern_id}/share", headers={"X-User-Id": VISITOR_ID})

    assert response.status_code == 200
    payload = response.json()
    assert payload["tavern_id"] == tavern_id
    assert payload["title"] == "雾港酒馆"
    assert len(payload["description"]) <= 200
    assert len(payload["short_description"]) <= 80
    assert payload["location"] == {"lat": 31.2304, "lon": 121.4737, "address": "上海 · 外滩"}
    assert payload["access"] == "public"
    assert payload["character_count"] == 1
    assert payload["characters"] == [{"id": payload["characters"][0]["id"], "name": "守灯人", "avatar": "/generated/keeper.png"}]
    assert payload["share_url"] == f"http://testserver/tavern/{tavern_id}"
    assert payload["share_title"] == "邀请你进入「雾港酒馆」"
    assert "雾港酒馆" in payload["share_text"]

    serialized = json.dumps(payload, ensure_ascii=False)
    assert "sk-share-secret" not in serialized
    assert "api_key" not in serialized
    assert "password_hash" not in serialized
    assert "secret-door" not in serialized
    assert "first_mes" not in serialized
    assert "公开角色简介" not in serialized


def test_v1_tavern_share_hides_private_taverns_from_non_owner(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client, access="private")

    forbidden = client.get(f"/api/v1/taverns/{tavern_id}/share", headers={"X-User-Id": VISITOR_ID})
    assert forbidden.status_code == 403
    assert forbidden.json()["error"] == "此酒馆是私人的"

    owner_view = client.get(f"/api/v1/taverns/{tavern_id}/share", headers={"X-User-Id": OWNER_ID})
    assert owner_view.status_code == 200
    assert owner_view.json()["access"] == "private"


def test_v1_tavern_share_supports_password_tavern_without_leaking_password(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client, access="password")

    response = client.get(f"/api/v1/taverns/{tavern_id}/share")

    assert response.status_code == 200
    payload = response.json()
    assert payload["access"] == "password"
    assert payload["share_url"] == f"http://testserver/tavern/{tavern_id}"
    serialized = json.dumps(payload, ensure_ascii=False)
    assert "secret-door" not in serialized
    assert "password_hash" not in serialized


def test_v1_tavern_share_missing_tavern_is_404(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.get("/api/v1/taverns/missing-share-tavern/share")

    assert response.status_code == 404
    assert response.json()["error"] == "酒馆不存在"


def test_tavern_share_policy_encodes_share_url_and_defaults() -> None:
    tavern = SimpleNamespace(
        id="fog tavern/1",
        name="",
        description="",
        lat=0,
        lon=0,
        address="",
        status="open",
        access="public",
        tags=[],
        characters=[],
    )

    payload = build_tavern_share_payload(tavern, base_url="https://fablemap.example/")

    assert payload["share_url"] == "https://fablemap.example/tavern/fog%20tavern%2F1"
    assert payload["share_title"] == "邀请你进入「未命名酒馆」"
    assert payload["share_text"] == "邀请你进入「未命名酒馆」：店主还没有写下公开简介。"
    assert payload["characters"] == []
    assert payload["character_count"] == 0
