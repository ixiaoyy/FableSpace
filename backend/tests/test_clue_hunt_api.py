from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-clue"
OTHER_OWNER_ID = "owner-other-clue"
VISITOR_ID = "visitor-clue"


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


def _create_tavern(client: TestClient, tavern_id: str, owner_id: str = OWNER_ID, access: str = "public") -> None:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": owner_id},
        json={
            "id": tavern_id,
            "name": f"线索空间 {tavern_id}",
            "description": "用于寻宝路线。",
            "lat": 31.23,
            "lon": 121.47,
            "access": access,
            "status": "open",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200, response.text


def _route_payload() -> dict:
    return {
        "id": "route-lantern",
        "title": "灯下两站",
        "description": "从第一盏灯走到第二盏灯。",
        "status": "published",
        "reward_text": "你把两盏灯之间的路记住了。",
        "reward_coin_amount": 3,
        "nodes": [
            {"id": "n1", "tavern_id": "clue-a", "clue": "第一盏灯的颜色？", "answer": "blue", "hint": "看门牌旁的灯。"},
            {"id": "n2", "tavern_id": "clue-b", "clue": "第二盏灯旁边有什么？", "answer": "book", "hint": "看桌面。"},
        ],
    }


def test_clue_hunt_route_governance_rejects_cross_owner_and_private_nodes(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    _create_tavern(client, "clue-a")
    _create_tavern(client, "clue-other", owner_id=OTHER_OWNER_ID)
    _create_tavern(client, "clue-private", access="private")

    cross_owner = _route_payload()
    cross_owner["nodes"][1]["tavern_id"] = "clue-other"
    response = client.post("/api/v1/clue-hunts/routes", headers={"X-User-Id": OWNER_ID}, json=cross_owner)
    assert response.status_code == 403

    private_route = _route_payload()
    private_route["nodes"][1]["tavern_id"] = "clue-private"
    response = client.post("/api/v1/clue-hunts/routes", headers={"X-User-Id": OWNER_ID}, json=private_route)
    assert response.status_code == 400


def test_clue_hunt_session_answer_gate_and_idempotent_reward(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    _create_tavern(client, "clue-a")
    _create_tavern(client, "clue-b")

    created = client.post("/api/v1/clue-hunts/routes", headers={"X-User-Id": OWNER_ID}, json=_route_payload())
    assert created.status_code == 200, created.text
    route = created.json()["route"]
    assert route["nodes"][0]["answer_configured"] is True
    assert "answer" not in route["nodes"][0]
    assert "answer_hash" not in route["nodes"][0]

    public_route = client.get("/api/v1/clue-hunts/routes/route-lantern")
    assert public_route.status_code == 200, public_route.text
    assert public_route.json()["route"]["first_node"]["tavern_id"] == "clue-a"
    assert "nodes" not in public_route.json()["route"]

    started = client.post(
        "/api/v1/clue-hunts/routes/route-lantern/sessions",
        headers={"X-User-Id": VISITOR_ID},
        json={},
    )
    assert started.status_code == 200, started.text
    session = started.json()["session"]
    assert session["current_node"]["tavern_id"] == "clue-a"
    assert len(session["visible_nodes"]) == 1
    session_id = session["id"]

    wrong = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/answer",
        headers={"X-User-Id": VISITOR_ID},
        json={"answer": "red"},
    )
    assert wrong.status_code == 200, wrong.text
    assert wrong.json()["correct"] is False
    assert wrong.json()["session"]["current_node"]["tavern_id"] == "clue-a"

    first = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/answer",
        headers={"X-User-Id": VISITOR_ID},
        json={"answer": " Blue "},
    )
    assert first.status_code == 200, first.text
    assert first.json()["correct"] is True
    assert first.json()["completed"] is False
    assert first.json()["session"]["current_node"]["tavern_id"] == "clue-b"
    assert len(first.json()["session"]["visible_nodes"]) == 2

    forbidden = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/answer",
        headers={"X-User-Id": "other-visitor"},
        json={"answer": "book"},
    )
    assert forbidden.status_code == 403

    second = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/answer",
        headers={"X-User-Id": VISITOR_ID},
        json={"answer": "book"},
    )
    assert second.status_code == 200, second.text
    assert second.json()["completed"] is True
    assert second.json()["session"]["current_node"] is None

    reward = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/reward",
        headers={"X-User-Id": VISITOR_ID},
    )
    assert reward.status_code == 200, reward.text
    assert reward.json()["duplicate"] is False
    assert reward.json()["reward"]["source"] == "clue_hunt_completion"
    assert reward.json()["reward"]["coin_amount"] == 3
    assert reward.json()["reward"]["scope"] == "tavern-local"
    assert reward.json()["reward"]["tavern_id"] == "clue-b"

    duplicate = client.post(
        f"/api/v1/clue-hunts/routes/route-lantern/sessions/{session_id}/reward",
        headers={"X-User-Id": VISITOR_ID},
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["duplicate"] is True
    assert duplicate.json()["reward"]["balance"] == 3
