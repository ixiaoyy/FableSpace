from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.relationship_graph_store import SQLAlchemyRelationshipGraphStore
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.infrastructure.storage import store_database
from fablemap_api.main import create_app

OWNER_A = "owner-api-a"
OWNER_B = "owner-api-b"
OTHER = "visitor-api-other"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient, owner_id: str, name: str) -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": owner_id},
        json={
            "name": name,
            "description": "关系图 API 测试",
            "lat": 31.23,
            "lon": 121.47,
            "access": "public",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def _relationship_store(client: TestClient) -> SQLAlchemyRelationshipGraphStore:
    db = store_database(client.app.state.taverns.store)
    assert db is not None
    return SQLAlchemyRelationshipGraphStore(db)


def test_owner_creates_updates_and_lists_source_side_edge(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_a = _create_tavern(client, OWNER_A, "A 店")
    tavern_b = _create_tavern(client, OWNER_B, "B 店")

    created = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges",
        headers={"X-User-Id": OWNER_A},
        json={
            "target_tavern_id": tavern_b,
            "behavior_type": "friendly",
            "display_name": "互相照应",
            "strength_preset": "normal",
        },
    )

    assert created.status_code == 200, created.text
    edge = created.json()["edge"]
    assert edge["status"] == "confirmed"
    assert edge["source_owner_id"] == OWNER_A
    assert edge["target_owner_id"] == OWNER_B
    assert edge["perspective_scope"] == "source_owner"
    assert edge["display_name"] == "互相照应"
    assert "api_key" not in created.text

    updated = client.put(
        f"/api/v1/taverns/{tavern_a}/relationship-edges/{edge['id']}",
        headers={"X-User-Id": OWNER_A},
        json={"display_name": "姐妹店", "strength_preset": "strong"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["edge"]["display_name"] == "姐妹店"
    assert updated.json()["edge"]["strength_preset"] == "strong"

    listed = client.get(f"/api/v1/taverns/{tavern_a}/relationship-edges", headers={"X-User-Id": OWNER_A})
    assert listed.status_code == 200
    assert listed.json()["count"] == 1
    assert listed.json()["edges"][0]["id"] == edge["id"]

    target_owner_source_list = client.get(
        f"/api/v1/taverns/{tavern_b}/relationship-edges",
        headers={"X-User-Id": OWNER_B},
    )
    assert target_owner_source_list.status_code == 200
    assert target_owner_source_list.json()["count"] == 0, "cross-owner relation stays directional, not B-side canon"


def test_non_owner_cannot_mutate_another_owner_edge(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_a = _create_tavern(client, OWNER_A, "A 店")
    tavern_b = _create_tavern(client, OWNER_B, "B 店")
    created = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges",
        headers={"X-User-Id": OWNER_A},
        json={"target_tavern_id": tavern_b, "behavior_type": "rival"},
    )
    edge_id = created.json()["edge"]["id"]

    denied = client.put(
        f"/api/v1/taverns/{tavern_a}/relationship-edges/{edge_id}",
        headers={"X-User-Id": OTHER},
        json={"display_name": "抢写别人的关系"},
    )

    assert denied.status_code == 403


def test_delegated_ai_auto_confirms_only_source_side_perspective(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_a = _create_tavern(client, OWNER_A, "A 店")
    tavern_b = _create_tavern(client, OWNER_B, "B 店")

    auto_confirmed = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges",
        headers={"X-User-Id": OWNER_A},
        json={
            "target_tavern_id": tavern_b,
            "behavior_type": "hostile",
            "governance_mode": "delegated_ai",
            "confirmed_by_type": "delegated_ai",
            "status": "confirmed",
        },
    )
    assert auto_confirmed.status_code == 200, auto_confirmed.text
    edge = auto_confirmed.json()["edge"]
    assert edge["status"] == "confirmed"
    assert edge["governance_mode"] == "delegated_ai"
    assert edge["confirmed_by_type"] == "delegated_ai"
    assert edge["source_tavern_id"] == tavern_a
    assert edge["target_tavern_id"] == tavern_b

    target_side_hijack = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges",
        headers={"X-User-Id": OWNER_A},
        json={
            "source_tavern_id": tavern_b,
            "target_tavern_id": tavern_a,
            "behavior_type": "friendly",
            "governance_mode": "delegated_ai",
            "confirmed_by_type": "delegated_ai",
            "status": "confirmed",
        },
    )
    assert target_side_hijack.status_code == 400


def test_pending_edge_is_visible_to_owner_but_ignored_by_propagation_queries(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_a = _create_tavern(client, OWNER_A, "A 店")
    tavern_b = _create_tavern(client, OWNER_B, "B 店")

    pending = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges",
        headers={"X-User-Id": OWNER_A},
        json={"target_tavern_id": tavern_b, "behavior_type": "friendly", "status": "pending"},
    )
    assert pending.status_code == 200, pending.text
    edge_id = pending.json()["edge"]["id"]
    assert pending.json()["edge"]["status"] == "pending"

    confirmed_edges = _relationship_store(client).list_confirmed_edges_for_node("tavern", tavern_a)
    assert confirmed_edges == []

    decided = client.post(
        f"/api/v1/taverns/{tavern_a}/relationship-edges/{edge_id}/decision",
        headers={"X-User-Id": OWNER_A},
        json={"status": "confirmed"},
    )
    assert decided.status_code == 200, decided.text
    assert decided.json()["edge"]["status"] == "confirmed"
    confirmed_edges = _relationship_store(client).list_confirmed_edges_for_node("tavern", tavern_a)
    assert [edge.id for edge in confirmed_edges] == [edge_id]
