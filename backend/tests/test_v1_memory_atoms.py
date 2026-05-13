from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient) -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": "owner-1"},
        json={
            "name": "记忆空间",
            "description": "用于测试结构化记忆迁移",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_v1_memory_atoms_preserve_private_visitor_boundary(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    create_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "visitor-1"},
        json={
            "scope": "visitor_tavern",
            "dimension": "preference",
            "horizon": "long",
            "content": "Visitor one likes quiet corners.",
            "visibility": "private",
        },
    )
    assert create_response.status_code == 200
    private_atom = create_response.json()["memory_atom"]
    memory_id = private_atom["id"]
    assert private_atom["visitor_id"] == "visitor-1"
    assert private_atom["subject"] == "visitor-1"

    own_list = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "visitor-1"},
        params={"visibility": "private"},
    )
    assert own_list.status_code == 200
    assert [atom["id"] for atom in own_list.json()["memory_atoms"]] == [memory_id]

    owner_read = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": "owner-1"},
    )
    assert owner_read.status_code == 403

    other_read = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": "visitor-2"},
    )
    assert other_read.status_code == 403

    update_response = client.put(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": "visitor-1"},
        json={"pinned": True, "content": "Visitor one likes quiet corners and low music."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["memory_atom"]["pinned"] is True

    owner_delete = client.delete(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": "owner-1"},
    )
    assert owner_delete.status_code == 403

    visitor_delete = client.delete(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": "visitor-1"},
    )
    assert visitor_delete.status_code == 200
    assert visitor_delete.json()["memory_id"] == memory_id


def test_v1_memory_atoms_public_and_owner_visibility(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    public_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "owner-1"},
        json={
            "scope": "tavern_public",
            "dimension": "fact",
            "horizon": "mid",
            "content": "The tavern bell rings at midnight.",
            "visibility": "public",
        },
    )
    assert public_response.status_code == 200
    public_id = public_response.json()["memory_atom"]["id"]

    owner_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "owner-1"},
        json={
            "scope": "tavern_public",
            "dimension": "fact",
            "content": "Owner-only cellar note.",
            "visibility": "owner",
        },
    )
    assert owner_response.status_code == 200
    owner_id = owner_response.json()["memory_atom"]["id"]

    anonymous_public = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        params={"visibility": "public"},
    )
    assert anonymous_public.status_code == 200
    assert [atom["id"] for atom in anonymous_public.json()["memory_atoms"]] == [public_id]

    anonymous_owner = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{owner_id}",
    )
    assert anonymous_owner.status_code == 403

    owner_list = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "owner-1"},
    )
    assert owner_list.status_code == 200
    assert {atom["id"] for atom in owner_list.json()["memory_atoms"]} == {public_id, owner_id}


def test_v1_memory_atom_feedback_reinforces_corrects_and_flags_private_memory(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    create_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "visitor-1"},
        json={
            "scope": "visitor_tavern",
            "dimension": "preference",
            "horizon": "mid",
            "content": "Visitor one likes quiet corners.",
            "importance": 0.6,
            "confidence": 0.7,
            "visibility": "private",
        },
    )
    assert create_response.status_code == 200
    memory_id = create_response.json()["memory_atom"]["id"]

    other_feedback = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback",
        headers={"X-User-Id": "visitor-2"},
        json={"correct": True},
    )
    assert other_feedback.status_code == 403

    reinforce_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback",
        headers={"X-User-Id": "visitor-1"},
        json={"correct": True},
    )
    assert reinforce_response.status_code == 200
    reinforced = reinforce_response.json()["memory_atom"]
    assert reinforce_response.json()["feedback"]["status"] == "reinforced"
    assert reinforced["metadata"]["reinforcement_count"] == 1
    assert reinforced["importance"] > 0.6

    correction_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback",
        headers={"X-User-Id": "visitor-1"},
        json={"correct": False, "content": "Visitor one likes the window seat, not quiet corners."},
    )
    assert correction_response.status_code == 200
    corrected = correction_response.json()["memory_atom"]
    assert correction_response.json()["feedback"]["status"] == "corrected"
    assert corrected["content"] == "Visitor one likes the window seat, not quiet corners."
    assert corrected["metadata"]["flagged_wrong"] is False

    wrong_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback",
        headers={"X-User-Id": "visitor-1"},
        json={"correct": False},
    )
    assert wrong_response.status_code == 200
    flagged = wrong_response.json()["memory_atom"]
    assert wrong_response.json()["feedback"]["status"] == "flagged_wrong"
    assert flagged["metadata"]["flagged_wrong"] is True
    assert flagged["metadata"]["excluded_from_prompt"] is True
