from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-compat"
VISITOR_ID = "visitor-compat"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(client: TestClient) -> str:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "兼容清单酒馆",
            "description": "用于核验 compatibility inventory 中的 native parity。",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_v1_update_preserves_flexible_group_metadata_for_compat_group_crud(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    update_response = client.put(
        f"/api/v1/taverns/{tavern_id}",
        headers={"X-User-Id": OWNER_ID},
        json={
            "groups": [
                {
                    "id": "grp-native-parity",
                    "name": "吧台夜谈组",
                    "member_ids": ["npc-a", "npc-b"],
                    "strategy": "balanced",
                }
            ],
        },
    )

    assert update_response.status_code == 200
    group = update_response.json()["groups"][0]
    assert group["id"] == "grp-native-parity"
    assert group["member_ids"] == ["npc-a", "npc-b"]


def test_v1_memories_alias_covers_visitor_memory_list_compat_route(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    created = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "scope": "visitor_tavern",
            "dimension": "preference",
            "horizon": "long",
            "content": "Visitor compat likes quiet neon corners.",
            "visibility": "private",
        },
    )
    assert created.status_code == 200
    memory_id = created.json()["memory_atom"]["id"]

    listed = client.get(
        f"/api/v1/taverns/{tavern_id}/memories",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID, "keyword": "quiet"},
    )

    assert listed.status_code == 200
    payload = listed.json()
    assert payload["total"] == 1
    assert [memory["id"] for memory in payload["memories"]] == [memory_id]

    owner_list = client.get(
        f"/api/v1/taverns/{tavern_id}/memories",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert owner_list.status_code == 200
    assert owner_list.json()["total"] == 0


def test_v1_tavern_delete_covers_compat_delete_route(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)

    forbidden = client.delete(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": VISITOR_ID})
    assert forbidden.status_code == 403

    deleted = client.delete(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": OWNER_ID})
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True

    missing = client.get(f"/api/v1/taverns/{tavern_id}", headers={"X-User-Id": OWNER_ID})
    assert missing.status_code == 404


def test_v1_chat_sessions_keep_compat_owner_and_visitor_boundaries(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id = _create_tavern(client)
    character_response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"name": "档案员", "first_mes": "欢迎来到兼容清单酒馆。"},
    )
    assert character_response.status_code == 200
    character_id = character_response.json()["id"]

    chat_response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": character_id,
            "visitor_id": VISITOR_ID,
            "visitor_name": "兼容旅人",
            "message": "今晚记录一下我的来访。",
        },
    )
    assert chat_response.status_code == 200

    owner_all = client.get(f"/api/v1/taverns/{tavern_id}/chat/sessions", headers={"X-User-Id": OWNER_ID})
    assert owner_all.status_code == 200
    assert owner_all.json()["count"] == 1

    visitor_own = client.get(f"/api/v1/taverns/{tavern_id}/chat/sessions", headers={"X-User-Id": VISITOR_ID})
    assert visitor_own.status_code == 200
    assert visitor_own.json()["chats"][0]["visitor_id"] == VISITOR_ID

    other_requested = client.get(
        f"/api/v1/taverns/{tavern_id}/chat/sessions",
        headers={"X-User-Id": "visitor-other"},
        params={"visitor_id": VISITOR_ID},
    )
    assert other_requested.status_code == 403


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/bookmarks"),
        ("POST", "/api/bookmarks"),
        ("DELETE", "/api/bookmarks/bookmark-1"),
        ("GET", "/api/templates"),
        ("POST", "/api/templates"),
        ("DELETE", "/api/templates/template-1"),
        ("GET", "/api/backups"),
        ("POST", "/api/backups/create"),
        ("POST", "/api/backups/restore"),
        ("POST", "/api/autocomplete"),
        ("POST", "/api/speech/transcribe"),
        ("POST", "/api/caption"),
        ("POST", "/api/generate"),
        ("POST", "/api/bulkedit"),
        ("GET", "/api/quickreplies"),
        ("POST", "/api/quickreplies"),
        ("POST", "/api/quickreplies/render"),
        ("GET", "/api/commands"),
        ("POST", "/api/commands/execute"),
        ("GET", "/api/extensions"),
        ("POST", "/api/extensions/demo/enable"),
        ("POST", "/api/extensions/demo/disable"),
        ("GET", "/api/extensions/demo/settings"),
        ("POST", "/api/extensions/demo/settings"),
        ("GET", "/api/presets"),
        ("POST", "/api/presets"),
        ("GET", "/api/presets/preset-1"),
        ("DELETE", "/api/presets/preset-1"),
        ("POST", "/api/vectors/add"),
        ("POST", "/api/vectors/search"),
        ("POST", "/api/image/generate"),
        ("GET", "/api/image/models"),
        ("POST", "/api/translate"),
        ("POST", "/api/translate/detect"),
        ("POST", "/api/embed"),
    ],
)
def test_category_m_routes_removed_from_compatibility_router(
    tmp_path: Path,
    method: str,
    path: str,
) -> None:
    client = _client(tmp_path)
    response = client.request(method, path, headers={"X-User-Id": OWNER_ID}, json={})
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/api/group/create"),
        ("GET", "/api/group/session-1"),
        ("POST", "/api/group/session-1/add_member"),
        ("POST", "/api/group/session-1/talkativeness"),
        ("POST", "/api/group/session-1/send"),
        ("POST", "/api/group/session-1/record"),
    ],
)
def test_legacy_group_session_routes_removed_after_native_group_chat_migration(
    tmp_path: Path,
    method: str,
    path: str,
) -> None:
    client = _client(tmp_path)
    response = client.request(method, path, headers={"X-User-Id": OWNER_ID}, json={})
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/taverns/tavern-compat/group-chat"),
        ("PUT", "/api/taverns/tavern-compat/group-chat/config"),
        ("POST", "/api/taverns/tavern-compat/group-chat"),
        ("GET", "/api/taverns/tavern-compat/group-chat/history"),
        ("PUT", "/api/taverns/tavern-compat/characters/char-compat/talkativeness"),
    ],
)
def test_compatibility_tavern_group_chat_routes_removed_after_v1_migration(
    tmp_path: Path,
    method: str,
    path: str,
) -> None:
    client = _client(tmp_path)
    response = client.request(method, path, headers={"X-User-Id": OWNER_ID}, json={})
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/groups"),
        ("POST", "/api/groups"),
        ("GET", "/api/groups/group-compat"),
        ("PUT", "/api/groups/group-compat"),
        ("DELETE", "/api/groups/group-compat"),
    ],
)
def test_legacy_group_metadata_routes_removed_after_v1_groups_metadata_parity(
    tmp_path: Path,
    method: str,
    path: str,
) -> None:
    client = _client(tmp_path)
    response = client.request(method, path, headers={"X-User-Id": OWNER_ID}, json={})
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/taverns/tavern-compat/memories"),
        ("POST", "/api/chats/import"),
        ("POST", "/api/chats/export"),
        ("POST", "/api/chats/search"),
    ],
)
def test_removed_chat_memory_compatibility_routes_return_404(
    tmp_path: Path,
    method: str,
    path: str,
) -> None:
    client = _client(tmp_path)
    response = client.request(method, path, headers={"X-User-Id": OWNER_ID}, json={})
    assert response.status_code == 404
