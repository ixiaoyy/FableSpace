from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from fablemap.web.config import ApiSettings
from fablemap.web.service import WebService


def _web_service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def test_web_service_legacy_tavern_wrappers_persist_extension_fields():
    with TemporaryDirectory() as tmpdir:
        service = _web_service(tmpdir)
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_router_compat",
                "name": "Router Compat Tavern",
                "description": "A tavern for legacy router compatibility.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id="owner_router_compat",
        )

        service.update_tavern(
            tavern["id"],
            {
                "groups": [{"id": "grp_test", "name": "Night Table"}],
                "bookmarks": [{"id": "bm_test", "content": "Remember this line."}],
                "chat_templates": [{"id": "tmpl_test", "name": "Slow Burn", "prompt": "Stay in character."}],
                "world_info": [
                    {
                        "id": "wi_test",
                        "keys": "lantern, desk",
                        "keys_secondary": "rain",
                        "content": "The brass lantern is always warm.",
                        "insertion_order": 42,
                    }
                ],
            },
            user_id="owner_router_compat",
        )

        fetched = service.get_tavern(tavern["id"], "owner_router_compat")
        assert fetched["groups"] == [{"id": "grp_test", "name": "Night Table"}]
        assert fetched["bookmarks"] == [{"id": "bm_test", "content": "Remember this line."}]
        assert fetched["chat_templates"][0]["id"] == "tmpl_test"
        assert fetched["world_info"][0]["keys"] == ["lantern", "desk"]
        assert fetched["world_info"][0]["keys_secondary"] == ["rain"]
        assert fetched["world_info"][0]["order"] == 42
        assert fetched["world_info"][0]["insertion_order"] == 42

        listed = service.list_taverns("owner_router_compat")
        assert [item["id"] for item in listed] == [tavern["id"]]


def test_character_card_world_info_import_is_attached_to_tavern():
    with TemporaryDirectory() as tmpdir:
        service = _web_service(tmpdir)
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_character_book",
                "name": "Character Book Tavern",
                "description": "A tavern for character book imports.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id="owner_character_book",
        )

        service.add_character_payload(
            tavern["id"],
            {
                "name": "Archivist",
                "world_info": [
                    {
                        "keys": ["archive", "ledger"],
                        "content": "The ledger records every late-night visitor.",
                        "depth": 3,
                    }
                ],
            },
            user_id="owner_character_book",
        )

        fetched = service.get_tavern(tavern["id"], "owner_character_book")
        assert len(fetched["world_info"]) == 1
        assert fetched["world_info"][0]["tavern_id"] == tavern["id"]
        assert fetched["world_info"][0]["keys"] == ["archive", "ledger"]
        assert fetched["world_info"][0]["content"] == "The ledger records every late-night visitor."
        assert fetched["world_info"][0]["depth"] == 3


def test_world_info_hit_tester_matches_saved_and_temporary_entries():
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap.web.app import create_web_app

    with TemporaryDirectory() as tmpdir:
        app = create_web_app(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))
        headers = {"X-User-Id": "owner_world_info_tester"}

        with TestClient(app) as client:
            tavern_response = client.post(
                "/api/taverns",
                headers=headers,
                json={
                    "id": "tavern_world_info_tester",
                    "name": "WorldInfo Tester Tavern",
                    "description": "A tavern for world info hit tests.",
                    "lat": 31.23,
                    "lon": 121.47,
                },
            )
            assert tavern_response.status_code == 200
            update_response = client.put(
                "/api/taverns/tavern_world_info_tester",
                headers=headers,
                json={
                    "world_info": [
                        {
                            "id": "wi_photo",
                            "keys": ["毕业照", "photo"],
                            "content": "The graduation photo is locked in the old archive.",
                            "order": 20,
                        },
                        {
                            "id": "wi_constant",
                            "constant": True,
                            "content": "The school gate closes at dusk.",
                            "order": 5,
                        },
                    ]
                },
            )
            assert update_response.status_code == 200

            test_response = client.post(
                "/api/taverns/tavern_world_info_tester/world-info/test",
                headers=headers,
                json={
                    "message": "刘大爷，我想看毕业照。",
                    "world_info": [
                        *update_response.json()["world_info"],
                        {
                            "id": "wi_unsaved",
                            "keys": ["档案柜"],
                            "content": "The archive cabinet smells like rain.",
                            "order": 10,
                        },
                    ],
                },
            )
            assert test_response.status_code == 200
            payload = test_response.json()
            assert payload["matched_count"] == 2
            assert [item["id"] for item in payload["matches"]] == ["wi_constant", "wi_photo"]
            photo = next(item for item in payload["entries"] if item["id"] == "wi_photo")
            unsaved = next(item for item in payload["entries"] if item["id"] == "wi_unsaved")
            assert photo["matched_keys"] == ["毕业照"]
            assert unsaved["matched"] is False

            forbidden = client.post(
                "/api/taverns/tavern_world_info_tester/world-info/test",
                headers={"X-User-Id": "other_owner"},
                json={"message": "毕业照"},
            )
            assert forbidden.status_code == 403
