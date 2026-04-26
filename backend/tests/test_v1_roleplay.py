from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-roleplay"
VISITOR_ID = "visitor-roleplay"
OTHER_VISITOR_ID = "visitor-other-roleplay"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern_with_character(client: TestClient) -> tuple[str, str]:
    created = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "Roleplay Test Tavern",
            "description": "A tavern for player-as-NPC tests.",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert created.status_code == 200
    tavern_id = created.json()["id"]

    character = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"name": "Night Clerk", "first_mes": "Welcome back."},
    )
    assert character.status_code == 200
    return tavern_id, character.json()["id"]


def test_roleplay_defaults_and_owner_mode_update(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern_with_character(client)

    defaults = client.get(f"/api/v1/taverns/{tavern_id}/roleplay", headers={"X-User-Id": VISITOR_ID})
    assert defaults.status_code == 200
    assert defaults.json()["roleplay_mode"] == "ai_only"
    assert defaults.json()["claims"] == []

    forbidden = client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay",
        headers={"X-User-Id": VISITOR_ID},
        json={"roleplay_mode": "hybrid"},
    )
    assert forbidden.status_code == 403

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay",
        headers={"X-User-Id": OWNER_ID},
        json={"roleplay_mode": "hybrid"},
    )
    assert saved.status_code == 200
    assert saved.json()["roleplay_mode"] == "hybrid"

    reloaded = client.get(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": OWNER_ID})
    assert reloaded.status_code == 200
    assert reloaded.json()["roleplay_mode"] == "hybrid"


def test_visitor_claim_requires_hybrid_mode_and_existing_character(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)

    disabled = client.post(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "player_name": "Visitor"},
    )
    assert disabled.status_code == 400

    client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay",
        headers={"X-User-Id": OWNER_ID},
        json={"roleplay_mode": "hybrid"},
    )
    missing_character = client.post(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": "char-missing", "player_name": "Visitor"},
    )
    assert missing_character.status_code == 404


def test_claim_visibility_and_owner_decision_flow(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)
    client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay",
        headers={"X-User-Id": OWNER_ID},
        json={"roleplay_mode": "hybrid"},
    )

    requested = client.post(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "player_name": "Visitor One"},
    )
    assert requested.status_code == 200
    claim = requested.json()["claim"]
    assert claim["status"] == "pending"
    assert claim["player_id"] == VISITOR_ID

    owner_view = client.get(f"/api/v1/taverns/{tavern_id}/roleplay", headers={"X-User-Id": OWNER_ID})
    assert len(owner_view.json()["claims"]) == 1

    other_view = client.get(f"/api/v1/taverns/{tavern_id}/roleplay", headers={"X-User-Id": OTHER_VISITOR_ID})
    assert other_view.status_code == 200
    assert other_view.json()["claims"] == []

    approved = client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims/{claim['id']}",
        headers={"X-User-Id": OWNER_ID},
        json={"status": "approved", "note": "Welcome behind the bar."},
    )
    assert approved.status_code == 200
    assert approved.json()["claim"]["status"] == "approved"

    other_after_approval = client.get(f"/api/v1/taverns/{tavern_id}/roleplay", headers={"X-User-Id": OTHER_VISITOR_ID})
    assert len(other_after_approval.json()["claims"]) == 1
    assert other_after_approval.json()["claims"][0]["status"] == "approved"


def test_only_one_approved_claim_per_character(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_id = _create_tavern_with_character(client)
    client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay",
        headers={"X-User-Id": OWNER_ID},
        json={"roleplay_mode": "hybrid"},
    )

    first = client.post(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims",
        headers={"X-User-Id": VISITOR_ID},
        json={"character_id": character_id, "player_name": "Visitor One"},
    ).json()["claim"]
    second = client.post(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims",
        headers={"X-User-Id": OTHER_VISITOR_ID},
        json={"character_id": character_id, "player_name": "Visitor Two"},
    ).json()["claim"]

    client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims/{first['id']}",
        headers={"X-User-Id": OWNER_ID},
        json={"status": "approved"},
    )
    replacement = client.put(
        f"/api/v1/taverns/{tavern_id}/roleplay/claims/{second['id']}",
        headers={"X-User-Id": OWNER_ID},
        json={"status": "approved"},
    )
    assert replacement.status_code == 200

    claims = client.get(f"/api/v1/taverns/{tavern_id}/roleplay", headers={"X-User-Id": OWNER_ID}).json()["claims"]
    approved_claims = [claim for claim in claims if claim["status"] == "approved"]
    revoked_claims = [claim for claim in claims if claim["status"] == "revoked"]
    assert [claim["id"] for claim in approved_claims] == [second["id"]]
    assert [claim["id"] for claim in revoked_claims] == [first["id"]]
