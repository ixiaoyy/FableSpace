import asyncio

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from fablemap_api.core.notifications import get_notification_store
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


def _client_and_store(tmp_path):
    client = TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))
    store = get_notification_store()
    return client, store


def test_notification_rest_list_and_mark_read(tmp_path):
    client, store = _client_and_store(tmp_path)
    asyncio.run(store.add_notification(
        user_id="owner_notify",
        notification_type="new_visitor",
        title="新访客进入",
        content="visitor_a 进入了你的酒馆",
        tavern_id="tavern_a",
        tavern_name="测试酒馆",
    ))

    listed = client.get("/api/v1/notifications", headers={"X-User-Id": "owner_notify"})
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["total"] == 1
    assert body["unread_count"] == 1
    notification_id = body["notifications"][0]["id"]

    other_listed = client.get("/api/v1/notifications", headers={"X-User-Id": "owner_other"})
    assert other_listed.status_code == 200, other_listed.text
    assert other_listed.json()["total"] == 0

    other_marked = client.post(f"/api/v1/notifications/{notification_id}/read", headers={"X-User-Id": "owner_other"})
    assert other_marked.status_code == 404

    marked = client.post(f"/api/v1/notifications/{notification_id}/read", headers={"X-User-Id": "owner_notify"})
    assert marked.status_code == 200, marked.text
    assert marked.json()["unread_count"] == 0


def test_notification_store_persists_unread_state_across_app_recreate(tmp_path):
    client, store = _client_and_store(tmp_path)
    created = asyncio.run(store.add_notification(
        user_id="owner_persist",
        notification_type="new_guest_message",
        title="新回访反馈",
        content="旅人留下了 owner-visible 反馈",
        tavern_id="tavern_persist",
        tavern_name="持久化酒馆",
    ))

    reloaded = TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))
    listed = reloaded.get("/api/v1/notifications", headers={"X-User-Id": "owner_persist"})
    assert listed.status_code == 200, listed.text
    assert listed.json()["unread_count"] == 1
    assert listed.json()["notifications"][0]["id"] == created.id
    assert listed.json()["notifications"][0]["read"] is False

    marked = reloaded.post(f"/api/v1/notifications/{created.id}/read", headers={"X-User-Id": "owner_persist"})
    assert marked.status_code == 200, marked.text

    reloaded_again = TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))
    after_mark = reloaded_again.get("/api/v1/notifications", headers={"X-User-Id": "owner_persist"})
    assert after_mark.status_code == 200, after_mark.text
    assert after_mark.json()["unread_count"] == 0
    assert after_mark.json()["notifications"][0]["read"] is True


def test_notification_websocket_rejects_path_only_or_mismatched_identity(tmp_path):
    client, _store = _client_and_store(tmp_path)

    with pytest.raises(WebSocketDisconnect) as missing_identity:
        with client.websocket_connect("/api/v1/notifications/ws/owner_live") as websocket:
            websocket.receive_json()
    assert missing_identity.value.code == 1008

    with pytest.raises(WebSocketDisconnect) as mismatched_identity:
        with client.websocket_connect("/api/v1/notifications/ws/owner_live?user_id=owner_other") as websocket:
            websocket.receive_json()
    assert mismatched_identity.value.code == 1008


def test_notification_websocket_receives_live_notification(tmp_path):
    client, store = _client_and_store(tmp_path)

    with client.websocket_connect("/api/v1/notifications/ws/owner_live?user_id=owner_live") as websocket:
        connected = websocket.receive_json()
        assert connected["type"] == "connected"
        assert connected["unread_count"] == 0

        asyncio.run(store.add_notification(
            user_id="owner_live",
            notification_type="new_guest_message",
            title="新反馈",
            content="旅人给店主留下了回访反馈",
            tavern_id="tavern_live",
            tavern_name="实时酒馆",
        ))

        pushed = websocket.receive_json()
        assert pushed["type"] == "notification"
        assert pushed["data"]["notification_type"] == "new_guest_message"
        assert pushed["data"]["tavern_name"] == "实时酒馆"
