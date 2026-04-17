from pathlib import Path
from tempfile import TemporaryDirectory
import json

import pytest
from fastapi import HTTPException

from fablemap.tavern import ChatMessage
from fablemap.web.config import ApiSettings
from fablemap.web.service import WebService


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def _message(tavern_id: str, visitor_id: str, character_id: str, content: str) -> ChatMessage:
    return ChatMessage(
        id=f"msg_{visitor_id}_{character_id}",
        tavern_id=tavern_id,
        visitor_id=visitor_id,
        character_id=character_id,
        role="user",
        content=content,
        timestamp="2026-04-17T13:00:00Z",
    )


def test_tavern_backup_restore_round_trips_metadata_and_chat_history():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_backup_restore",
                "name": "Backup Tavern",
                "description": "Original description.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id="owner_backup",
        )
        character = service.add_character_payload(
            tavern["id"],
            {"name": "Keeper"},
            user_id="owner_backup",
        )
        service.tavern_store.add_chat_message(
            _message(tavern["id"], "visitor_backup", character["id"], "Please remember this.")
        )

        backup = service.create_tavern_backup(tavern["id"], "owner_backup")
        assert backup["ok"] is True
        assert backup["chat_sessions"] == 1

        service.update_tavern(tavern["id"], {"name": "Changed Tavern"}, "owner_backup")
        service.tavern_store.delete_chat_history(tavern["id"])

        restored = service.restore_tavern_backup(
            backup["backup_name"],
            tavern_id=tavern["id"],
            user_id="owner_backup",
        )
        assert restored["ok"] is True
        assert restored["restored_messages"] == 1

        fetched = service.get_tavern(tavern["id"], "owner_backup")
        assert fetched["name"] == "Backup Tavern"
        history = service.tavern_store.get_chat_history(tavern["id"], "visitor_backup", character["id"])
        assert len(history) == 1
        assert history[0].content == "Please remember this."


def test_restore_backup_rejects_paths_outside_backup_directory():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        with pytest.raises(HTTPException) as exc_info:
            service.restore_tavern_backup("../outside.json", tavern_id="tavern_x", user_id="owner_x")
        assert exc_info.value.status_code == 400


def test_tavern_package_export_import_excludes_secrets_and_visitor_data():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_package_source",
                "name": "Package Source",
                "description": "A shareable tavern.",
                "lat": 31.23,
                "lon": 121.47,
                "access": "password",
                "password": "secret-password",
                "scene_prompt": "Keep the old station quiet.",
                "llm_config": {
                    "backend": "openai",
                    "model": "gpt-4o-mini",
                    "api_key": "sk-secret-package-test",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
            },
            owner_id="owner_package",
        )
        character = service.add_character_payload(
            tavern["id"],
            {"id": "char_package_keeper", "name": "Keeper", "personality": "Quiet"},
            user_id="owner_package",
        )
        service.update_tavern(
            tavern["id"],
            {
                "world_info": [
                    {
                        "id": "wi_package_photo",
                        "keys": ["毕业照"],
                        "content": "The photo is hidden behind the counter.",
                        "order": 10,
                    }
                ],
                "bookmarks": [{"id": "bm_package", "content": "Do not export visitors."}],
            },
            user_id="owner_package",
        )
        service.tavern_store.add_chat_message(
            _message(tavern["id"], "visitor_private", character["id"], "Private visitor memory.")
        )

        package = service.export_tavern_package_payload(tavern["id"], "owner_package")
        serialized = json.dumps(package, ensure_ascii=False)
        assert package["type"] == "fablemap_tavern_package"
        assert package["characters"][0]["name"] == "Keeper"
        assert package["world_info"][0]["keys"] == ["毕业照"]
        assert "sk-secret-package-test" not in serialized
        assert "password_hash" not in serialized
        assert "secret-password" not in serialized
        assert "Private visitor memory" not in serialized
        assert "chat_sessions" not in package

        imported = service.import_tavern_package_payload(
            {
                "package": package,
                "lat": 35.0,
                "lon": 139.0,
                "name": "Imported Package Tavern",
            },
            user_id="owner_import_package",
        )
        assert imported["ok"] is True
        imported_tavern = imported["tavern"]
        assert imported_tavern["name"] == "Imported Package Tavern"
        assert imported_tavern["owner_id"] == "owner_import_package"
        assert imported_tavern["access"] == "private"
        assert imported_tavern["lat"] == 35.0
        assert imported_tavern["lon"] == 139.0
        assert imported_tavern["characters"][0]["name"] == "Keeper"
        assert imported_tavern["world_info"][0]["content"] == "The photo is hidden behind the counter."
        assert imported_tavern["llm_config"].get("api_key", "") == ""
        assert service.tavern_store.list_chat_sessions(imported_tavern["id"], limit=None) == []
