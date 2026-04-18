from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi import HTTPException

from fablemap.llm_clients import LLMError
from fablemap.web.service import WebService
from fablemap.web.config import ApiSettings


OWNER_ID = "owner_create_wizard"


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def _wizard_payload(tavern_id: str, access: str = "public", **extra):
    payload = {
        "id": tavern_id,
        "name": f"Wizard Tavern {tavern_id}",
        "description": "Created from the 3 minute wizard.",
        "lat": 31.230416,
        "lon": 121.473701,
        "access": access,
        "scene_prompt": "Old lamps, rain on the door, and a patient keeper.",
    }
    payload.update(extra)
    return payload


def test_create_wizard_access_modes_and_password_gate():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)

        public_tavern = service.create_tavern_payload(
            _wizard_payload("wizard_public", "public"),
            owner_id=OWNER_ID,
        )
        assert public_tavern["access"] == "public"
        assert public_tavern["status"] == "closed"
        assert public_tavern["owner_id"] == OWNER_ID

        public_enter = service.enter_tavern_payload(public_tavern["id"], user_id="visitor_public")
        assert public_enter["visitor_state"]["visit_count"] == 1

        password_tavern = service.create_tavern_payload(
            _wizard_payload("wizard_password", "password", password="secret-door"),
            owner_id=OWNER_ID,
        )
        assert password_tavern["access"] == "password"
        assert password_tavern["password_hash"]
        assert password_tavern["password_hash"] != "secret-door"

        with pytest.raises(HTTPException) as missing_password:
            service.enter_tavern_payload(password_tavern["id"], user_id="visitor_password")
        assert missing_password.value.status_code == 401

        with pytest.raises(HTTPException) as wrong_password:
            service.enter_tavern_payload(
                password_tavern["id"],
                password="wrong",
                user_id="visitor_password",
            )
        assert wrong_password.value.status_code == 401

        correct_password = service.enter_tavern_payload(
            password_tavern["id"],
            password="secret-door",
            user_id="visitor_password",
        )
        assert correct_password["visitor_state"]["visitor_id"] == "visitor_password"

        private_tavern = service.create_tavern_payload(
            _wizard_payload("wizard_private", "private"),
            owner_id=OWNER_ID,
        )
        assert private_tavern["access"] == "private"

        with pytest.raises(HTTPException) as visitor_enter:
            service.enter_tavern_payload(private_tavern["id"], user_id="visitor_private")
        assert visitor_enter.value.status_code == 403

        owner_enter = service.enter_tavern_payload(private_tavern["id"], user_id=OWNER_ID)
        assert owner_enter["ok"] is True


def test_create_wizard_ai_config_status_and_direct_test(monkeypatch):
    class GoodResponse:
        model = "gpt-test"
        content = "你好。"

    class GoodClient:
        def complete(self, messages):
            assert messages[0]["role"] == "user"
            return GoodResponse()

    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)

        no_ai = service.create_tavern_payload(
            _wizard_payload("wizard_no_ai", "public"),
            owner_id=OWNER_ID,
        )
        assert no_ai["status"] == "closed"
        assert no_ai["llm_config"]["api_key"] == ""

        local_ai = service.create_tavern_payload(
            _wizard_payload(
                "wizard_local_ai",
                "public",
                llm_config={
                    "backend": "ollama",
                    "model": "llama3.2",
                    "api_key": "",
                    "base_url": "http://localhost:11434",
                },
            ),
            owner_id=OWNER_ID,
        )
        assert local_ai["status"] == "open"
        assert local_ai["llm_config"]["base_url"] == "http://localhost:11434"

        remote_ai = service.create_tavern_payload(
            _wizard_payload(
                "wizard_remote_ai",
                "public",
                llm_config={
                    "backend": "openai",
                    "model": "gpt-4o-mini",
                    "api_key": "sk-create-wizard",
                    "temperature": 0.6,
                },
            ),
            owner_id=OWNER_ID,
        )
        assert remote_ai["status"] == "open"
        assert remote_ai["llm_config"]["api_key"] == "sk-create-wizard"

        monkeypatch.setattr("fablemap.llm_clients.create_client", lambda config: GoodClient())
        test_success = service.test_llm_config_payload(
            {
                "backend": "openai",
                "model": "gpt-test",
                "api_key": "sk-test",
            }
        )
        assert test_success == {
            "ok": True,
            "message": "连接成功",
            "model": "gpt-test",
            "preview": "你好。",
        }

        test_missing_credentials = service.test_llm_config_payload(
            {"backend": "openai", "model": "gpt-test"}
        )
        assert test_missing_credentials["ok"] is False
        assert "API Key" in test_missing_credentials["message"]

        def broken_client(config):
            raise LLMError("upstream refused the key")

        monkeypatch.setattr("fablemap.llm_clients.create_client", broken_client)
        test_failure = service.test_llm_config_payload(
            {
                "backend": "openai",
                "model": "gpt-test",
                "api_key": "sk-bad",
            }
        )
        assert test_failure["ok"] is False
        assert "upstream refused the key" in test_failure["message"]


def test_create_wizard_imported_and_manual_characters_persist():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.create_tavern_payload(
            _wizard_payload("wizard_characters", "public"),
            owner_id=OWNER_ID,
        )
        tavern_id = tavern["id"]

        imported = service.import_character_card_payload(
            tavern_id,
            {
                "spec": "chara_card_v2",
                "data": {
                    "name": "Mira",
                    "description": "Night desk keeper.",
                    "personality": "Patient and dryly funny.",
                    "scenario": "A quiet lobby after rain.",
                    "system_prompt": "Stay in character.",
                    "first_mes": "伞放门口就好。",
                    "alternate_greetings": ["你又来了。"],
                    "tags": ["keeper", "rain"],
                    "character_book": {
                        "entries": [
                            {
                                "keys": ["雨夜"],
                                "content": "Rain makes the neon signs hum.",
                                "order": 12,
                            }
                        ]
                    },
                },
            },
            user_id=OWNER_ID,
        )
        assert imported["name"] == "Mira"
        assert imported["alternate_greetings"] == ["你又来了。"]
        assert imported["tags"] == ["keeper", "rain"]

        manual = service.add_character_payload(
            tavern_id,
            {
                "name": "Kai",
                "description": "Manual wizard character.",
                "personality": "Cheerful, precise.",
                "first_mes": "今晚想听什么故事？",
                "tags": "manual,guide",
                "sprites": {"neutral": "https://example.test/kai-neutral.png"},
            },
            user_id=OWNER_ID,
        )
        assert manual["name"] == "Kai"
        assert manual["tags"] == ["manual", "guide"]
        assert manual["sprites"]["neutral"] == "https://example.test/kai-neutral.png"

        payload = service.get_tavern_payload(tavern_id, OWNER_ID)
        assert [character["name"] for character in payload["characters"]] == ["Mira", "Kai"]
        assert payload["world_info"][0]["keys"] == ["雨夜"]
        assert payload["world_info"][0]["content"] == "Rain makes the neon signs hum."
