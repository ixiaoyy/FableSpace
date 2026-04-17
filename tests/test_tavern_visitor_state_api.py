from pathlib import Path
from tempfile import TemporaryDirectory

import pytest


def test_tavern_entry_tracks_named_visitor_state_for_owner_feedback():
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap.web.app import create_web_app
    from fablemap.web.config import ApiSettings

    with TemporaryDirectory() as tmpdir:
        app = create_web_app(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        owner_headers = {"X-User-Id": "owner_visitor_state"}

        with TestClient(app) as client:
            tavern_response = client.post(
                "/api/taverns",
                headers=owner_headers,
                json={
                    "id": "tavern_visitor_state",
                    "name": "Visitor State Tavern",
                    "description": "A tavern for visitor state checks.",
                    "lat": 31.23,
                    "lon": 121.47,
                },
            )
            assert tavern_response.status_code == 200
            tavern_id = tavern_response.json()["id"]

            for _ in range(2):
                enter_response = client.post(
                    f"/api/taverns/{tavern_id}/enter",
                    headers={"X-User-Id": "visitor_returning"},
                )
                assert enter_response.status_code == 200
                payload = enter_response.json()
                assert payload["visitor_state"]["visitor_id"] == "visitor_returning"
                assert payload["visitor_state"]["relationship"]["stage"] in {"stranger", "acquaintance"}

            anonymous_enter = client.post(f"/api/taverns/{tavern_id}/enter")
            assert anonymous_enter.status_code == 200
            assert anonymous_enter.json()["visitor_state"] is None

            visitors_response = client.get(
                f"/api/taverns/{tavern_id}/visitors",
                headers=owner_headers,
            )
            assert visitors_response.status_code == 200
            visitors = visitors_response.json()["visitors"]
            assert len(visitors) == 1
            assert visitors[0]["visitor_id"] == "visitor_returning"
            assert visitors[0]["visit_count"] == 2
            assert visitors[0]["relationship"]["stage"] == "acquaintance"

            forbidden_response = client.get(
                f"/api/taverns/{tavern_id}/visitors",
                headers={"X-User-Id": "someone_else"},
            )
            assert forbidden_response.status_code == 403
