import json
from pathlib import Path
from tempfile import TemporaryDirectory

from fablemap_api.core.default_taverns import (
    DEFAULT_PUBLIC_WELFARE_OWNER_ID,
    DEFAULT_PUBLIC_WELFARE_TAVERN_IDS,
)
from fablemap_api.core.tavern import TavernStore
from fablemap_api.core.web.config import ApiSettings
from fablemap_api.core.web.service import WebService


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def test_default_public_welfare_taverns_are_seeded_and_discoverable():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)

        payload = service.list_taverns_payload(query="公益")
        seeded = {
            tavern["id"]: tavern
            for tavern in payload["taverns"]
            if tavern["id"] in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS
        }

        assert set(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS).issubset(seeded)
        assert len(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS) >= 4
        for tavern in seeded.values():
            assert tavern["access"] == "public"
            assert tavern["status"] == "open"
            assert tavern["owner_id"] == DEFAULT_PUBLIC_WELFARE_OWNER_ID
            assert tavern["llm_config"]["backend"] == "rules"
            assert tavern["llm_config"].get("api_key", "") == ""
            assert tavern["characters"]
            assert tavern["world_info"]


def test_community_repair_includes_heguang_communication_npc():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.get_tavern_payload("pw_community_repair", user_id="visitor_public_welfare")

        heguang = next(
            (character for character in tavern["characters"] if character["name"] == "和光"),
            None,
        )

        assert heguang is not None
        assert tavern["access"] == "public"
        assert tavern["llm_config"]["backend"] == "rules"
        assert heguang["id"] == "char_pw_heguang"
        assert heguang["tavern_id"] == "pw_community_repair"
        for field in ("description", "personality", "scenario", "system_prompt", "first_mes", "mes_example"):
            assert heguang[field]
        assert {"公益", "关键对话", "调停"}.issubset(set(heguang["tags"]))

        combined_prompt = " ".join(
            [
                heguang["description"],
                heguang["personality"],
                heguang["system_prompt"],
                heguang["first_mes"],
                heguang["mes_example"],
            ]
        )
        for keyword in ("共同目标", "安全感", "真诚", "行动"):
            assert keyword in combined_prompt


def test_default_public_welfare_seed_adds_missing_platform_characters_to_existing_store():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        taverns_file = Path(tmpdir) / "taverns" / "taverns.json"
        data = json.loads(taverns_file.read_text(encoding="utf-8"))
        community = data["pw_community_repair"]
        community["characters"] = [
            character
            for character in community["characters"]
            if character.get("id") != "char_pw_heguang"
        ]
        taverns_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        service = _service(tmpdir)
        repaired = service.get_tavern_payload("pw_community_repair", user_id="visitor_public_welfare")

        assert any(character["id"] == "char_pw_heguang" for character in repaired["characters"])


def test_default_public_welfare_seed_can_be_disabled(monkeypatch):
    monkeypatch.setenv("FABLEMAP_SEED_DEFAULT_TAVERNS", "0")
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        payload = service.list_taverns_payload(query="公益")
        assert payload["taverns"] == []
        assert payload["count"] == 0


def test_default_public_welfare_seed_does_not_overwrite_corrupt_store():
    with TemporaryDirectory() as tmpdir:
        root = Path(tmpdir) / "taverns"
        root.mkdir()
        taverns_file = root / "taverns.json"
        taverns_file.write_text("{not valid json", encoding="utf-8")

        TavernStore(root)

        assert taverns_file.read_text(encoding="utf-8") == "{not valid json"


def test_default_public_welfare_tavern_chat_uses_local_rules_backend():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.get_tavern_payload("pw_lantern_helpdesk", user_id="")
        character_id = tavern["characters"][0]["id"]

        entered = service.enter_tavern_payload(
            tavern["id"],
            user_id="visitor_public_welfare",
        )
        assert entered["ok"] is True
        assert entered["status"] == "open"

        response = service.tavern_chat_payload(
            tavern_id=tavern["id"],
            character_id=character_id,
            message="你好，我是新手，怎么玩？",
            visitor_id="visitor_public_welfare",
            visitor_name="测试旅人",
            user_id="visitor_public_welfare",
        )

        assert response["degraded"] is False
        assert response["tavern_status"] == "open"
        assert "新手" in response["response"] or "开店" in response["response"]
        assert service.tavern_store.get_token_usage(tavern["id"]) == 0

        sessions = service.tavern_store.list_chat_sessions(
            tavern["id"],
            visitor_id="visitor_public_welfare",
            character_id=character_id,
            limit=None,
        )
        assert len(sessions) == 1
        assert sessions[0]["message_count"] == 2
