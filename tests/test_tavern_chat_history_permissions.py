from pathlib import Path
from tempfile import TemporaryDirectory

import pytest


def test_chat_history_is_limited_to_visitor_or_owner():
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap_api.core.web.app import create_web_app
    from fablemap_api.core.web.config import ApiSettings

    with TemporaryDirectory() as tmpdir:
        app = create_web_app(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        owner_headers = {"X-User-Id": "owner_chat_history_scope"}

        with TestClient(app) as client:
            tavern_response = client.post(
                "/api/taverns",
                headers=owner_headers,
                json={
                    "id": "tavern_chat_history_scope",
                    "name": "Scoped History Tavern",
                    "description": "A tavern for chat history permission checks.",
                    "lat": 31.23,
                    "lon": 121.47,
                },
            )
            assert tavern_response.status_code == 200
            tavern_id = tavern_response.json()["id"]

            character_response = client.post(
                f"/api/taverns/{tavern_id}/characters",
                headers=owner_headers,
                json={"id": "char_chat_history_scope", "name": "Keeper"},
            )
            assert character_response.status_code == 200
            character_id = character_response.json()["id"]

            save_response = client.post(
                "/api/chats",
                headers={"X-User-Id": "visitor_alpha"},
                json={
                    "tavern_id": tavern_id,
                    "character_id": character_id,
                    "visitor_id": "visitor_alpha",
                    "messages": [
                        {
                            "role": "user",
                            "content": "Alpha private note",
                            "visitor_name": "Mina",
                        }
                    ],
                },
            )
            assert save_response.status_code == 200

            own_history = client.get(
                f"/api/taverns/{tavern_id}/chat?visitor_id=visitor_alpha&character_id={character_id}",
                headers={"X-User-Id": "visitor_alpha"},
            )
            assert own_history.status_code == 200
            assert own_history.json()["visitor_name"] == "Mina"
            assert own_history.json()["messages"][0]["content"] == "Alpha private note"

            owner_history = client.get(
                f"/api/taverns/{tavern_id}/chat?visitor_id=visitor_alpha&character_id={character_id}",
                headers=owner_headers,
            )
            assert owner_history.status_code == 200
            assert owner_history.json()["character_name"] == "Keeper"

            forbidden_history = client.get(
                f"/api/taverns/{tavern_id}/chat?visitor_id=visitor_alpha&character_id={character_id}",
                headers={"X-User-Id": "visitor_beta"},
            )
            assert forbidden_history.status_code == 403

            anonymous_history = client.get(
                f"/api/taverns/{tavern_id}/chat?visitor_id=visitor_alpha&character_id={character_id}",
            )
            assert anonymous_history.status_code == 403
