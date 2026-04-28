import hashlib
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


def _assert_project_png_asset(sprite_url: str) -> None:
    assert sprite_url.startswith("/assets/npcs/")
    sprite_path = Path("frontend/public") / sprite_url.removeprefix("/")
    assert sprite_path.exists(), f"missing project NPC asset: {sprite_path}"
    assert sprite_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")


def _project_png_hash(sprite_url: str) -> str:
    sprite_path = Path("frontend/public") / sprite_url.removeprefix("/")
    return hashlib.sha256(sprite_path.read_bytes()).hexdigest()


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
        assert len(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS) >= 6
        for tavern in seeded.values():
            assert tavern["access"] == "public"
            assert tavern["status"] == "open"
            assert tavern["owner_id"] == DEFAULT_PUBLIC_WELFARE_OWNER_ID
            assert tavern["llm_config"]["backend"] == "rules"
            assert tavern["llm_config"].get("api_key", "") == ""
            assert tavern["characters"]
            assert tavern["world_info"]


def test_default_public_welfare_characters_have_direct_neutral_assets():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)

        characters = []
        for tavern_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS:
            tavern = service.get_tavern_payload(tavern_id, user_id="visitor_public_welfare")
            characters.extend(tavern["characters"])

        assert len(characters) >= 12
        neutral_urls = []
        neutral_hashes = []
        for character in characters:
            neutral = character["sprites"].get("neutral")
            assert character["avatar"], f"missing avatar for {character['id']}"
            assert neutral, f"missing neutral sprite for {character['id']}"
            _assert_project_png_asset(character["avatar"])
            _assert_project_png_asset(neutral)
            neutral_urls.append(neutral)
            neutral_hashes.append(_project_png_hash(neutral))

        assert len(neutral_urls) == len(set(neutral_urls))
        assert len(neutral_hashes) == len(set(neutral_hashes))


def test_default_public_welfare_characters_have_direct_expression_assets():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)

        characters = []
        for tavern_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS:
            tavern = service.get_tavern_payload(tavern_id, user_id="visitor_public_welfare")
            characters.extend(tavern["characters"])

        required_expression_pairs = (
            ("happy", "joy"),
            ("angry", "anger"),
            ("shy", "embarrassment"),
            ("curious", "curiosity"),
        )
        for character in characters:
            sprites = character["sprites"]
            expression_hashes = {
                "neutral": _project_png_hash(sprites["neutral"]),
            }
            for semantic_key, engine_key in required_expression_pairs:
                semantic_url = sprites.get(semantic_key)
                engine_url = sprites.get(engine_key)
                assert semantic_url, f"missing {semantic_key} sprite for {character['id']}"
                assert engine_url, f"missing {engine_key} sprite for {character['id']}"
                assert semantic_url == engine_url
                _assert_project_png_asset(engine_url)
                expression_hashes[engine_key] = _project_png_hash(engine_url)

            assert len(expression_hashes) == len(set(expression_hashes.values())), (
                f"{character['id']} must use distinct direct assets for neutral and expression sprites"
            )


def test_third_shelf_observatory_contains_complete_alien_convenience_tavern():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        payload = service.list_taverns_payload(query="外星")
        tavern = service.get_tavern_payload("pw_third_shelf_observatory", user_id="visitor_public_welfare")

        assert any(item["id"] == "pw_third_shelf_observatory" for item in payload["taverns"])
        assert tavern["name"] == "第三货架后面"
        assert tavern["access"] == "public"
        assert tavern["status"] == "open"
        assert tavern["llm_config"]["backend"] == "rules"
        assert tavern["llm_config"].get("api_key", "") == ""
        assert len(tavern["characters"]) == 4
        assert len(tavern["world_info"]) >= 8

        character_ids = {character["id"] for character in tavern["characters"]}
        assert {
            "char_pw_9_delta",
            "char_pw_mu_mu",
            "char_pw_v17",
            "char_pw_pi_pi",
        }.issubset(character_ids)

        nine_delta = next(character for character in tavern["characters"] if character["id"] == "char_pw_9_delta")
        combined_prompt = " ".join(
            [
                tavern["description"],
                tavern["scene_prompt"],
                nine_delta["description"],
                nine_delta["personality"],
                nine_delta["system_prompt"],
                nine_delta["first_mes"],
            ]
        )
        for keyword in ("外星", "便利店", "随便", "第二件半价", "关东煮"):
            assert keyword in combined_prompt


def test_midnight_commission_board_contains_text_adventure_tavern():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        payload = service.list_taverns_payload(query="文游")
        tavern = service.get_tavern_payload("pw_midnight_commission_board", user_id="visitor_public_welfare")

        assert any(item["id"] == "pw_midnight_commission_board" for item in payload["taverns"])
        assert tavern["name"] == "午夜委托板"
        assert tavern["access"] == "public"
        assert tavern["status"] == "open"
        assert tavern["llm_config"]["backend"] == "rules"
        assert tavern["llm_config"].get("api_key", "") == ""
        assert len(tavern["characters"]) == 2
        assert len(tavern["world_info"]) >= 6

        character_ids = {character["id"] for character in tavern["characters"]}
        assert {"char_pw_mozhan", "char_pw_zhideng"}.issubset(character_ids)

        gameplays = tavern["gameplay_definitions"]
        assert len(gameplays) >= 3
        assert all(gameplay["status"] == "published" for gameplay in gameplays)
        combined_gameplays = " ".join(
            f"{gameplay.get('title', '')} {gameplay.get('summary', '')} {gameplay.get('entry_label', '')}"
            for gameplay in gameplays
        )
        for keyword in ("线索调查", "社区小委托", "异常值班"):
            assert keyword in combined_gameplays


def test_after_school_hero_supply_contains_emotional_hero_tavern():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        payload = service.list_taverns_payload(query="英雄")
        tavern = service.get_tavern_payload("pw_after_school_hero_supply", user_id="visitor_public_welfare")

        assert any(item["id"] == "pw_after_school_hero_supply" for item in payload["taverns"])
        assert tavern["name"] == "放学后英雄补给站"
        assert tavern["access"] == "public"
        assert tavern["status"] == "open"
        assert tavern["layout_style"] == "quest-play"
        assert tavern["llm_config"]["backend"] == "rules"
        assert tavern["llm_config"].get("api_key", "") == ""
        assert "秋叶原" in tavern["address"]
        assert 35.68 < tavern["lat"] < 35.71
        assert 139.75 < tavern["lon"] < 139.79
        assert len(tavern["characters"]) == 2
        assert len(tavern["world_info"]) >= 5

        characters = {character["id"]: character for character in tavern["characters"]}
        assert {"char_pw_aheng", "char_pw_zhijian"}.issubset(characters)
        for character_id in ("char_pw_aheng", "char_pw_zhijian"):
            character = characters[character_id]
            assert character["avatar"]
            assert character["sprites"]["neutral"]
            _assert_project_png_asset(character["avatar"])
            _assert_project_png_asset(character["sprites"]["neutral"])

        assert _project_png_hash(characters["char_pw_aheng"]["sprites"]["neutral"]) != _project_png_hash(
            characters["char_pw_zhijian"]["sprites"]["neutral"]
        )

        gameplays = tavern["gameplay_definitions"]
        assert len(gameplays) >= 3
        assert all(gameplay["status"] == "published" for gameplay in gameplays)
        assert {gameplay["id"] for gameplay in gameplays}.issuperset(
            {
                "gp_pw_hero_recover_name",
                "gp_pw_hero_repair_prop",
                "gp_pw_hero_first_commission",
            }
        )

        combined_prompt = " ".join(
            [
                tavern["description"],
                tavern["scene_prompt"],
                " ".join(entry["content"] for entry in tavern["world_info"]),
                " ".join(
                    f"{character['name']} {character['description']} {character['personality']} "
                    f"{character['scenario']} {character['system_prompt']} {character['first_mes']}"
                    for character in tavern["characters"]
                ),
                " ".join(
                    f"{gameplay.get('title', '')} {gameplay.get('summary', '')} {gameplay.get('entry_label', '')}"
                    for gameplay in gameplays
                ),
            ]
        )
        for keyword in ("旧玩具店", "模型店", "英雄名", "旧英雄卡", "纸剑", "普通人小英雄", "小勇气"):
            assert keyword in combined_prompt
        for boundary in ("打怪升级", "排行榜", "数值加成", "现实危险行动"):
            assert boundary in combined_prompt


def test_jingan_catbell_refuge_contains_safe_original_catgirl_npc():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        payload = service.list_taverns_payload(query="猫娘")
        tavern = service.get_tavern_payload("pw_jingan_catbell_refuge", user_id="visitor_public_welfare")

        assert any(item["id"] == "pw_jingan_catbell_refuge" for item in payload["taverns"])
        assert tavern["name"] == "静安猫铃避难所"
        assert tavern["access"] == "public"
        assert tavern["status"] == "open"
        assert tavern["llm_config"]["backend"] == "rules"
        assert tavern["llm_config"].get("api_key", "") == ""
        assert "静安寺" in tavern["address"]
        assert 31.20 < tavern["lat"] < 31.24
        assert 121.43 < tavern["lon"] < 121.46
        assert len(tavern["characters"]) == 1
        assert len(tavern["world_info"]) >= 4

        mimi = tavern["characters"][0]
        assert mimi["id"] == "char_pw_mimi_nya"
        assert mimi["name"] == "眯眯喵桑"
        assert mimi["tavern_id"] == "pw_jingan_catbell_refuge"
        assert mimi["avatar"] == "/assets/npcs/mimi-nya-neutral.png"
        assert mimi["sprites"]["neutral"] == "/assets/npcs/mimi-nya-neutral.png"
        assert mimi["sprites"]["happy"] == "/assets/npcs/mimi-nya-joy.png"
        assert mimi["sprites"]["joy"] == "/assets/npcs/mimi-nya-joy.png"
        assert mimi["sprites"]["angry"] == "/assets/npcs/mimi-nya-anger.png"
        assert mimi["sprites"]["anger"] == "/assets/npcs/mimi-nya-anger.png"
        assert mimi["sprites"]["shy"] == "/assets/npcs/mimi-nya-embarrassment.png"
        assert mimi["sprites"]["embarrassment"] == "/assets/npcs/mimi-nya-embarrassment.png"
        assert mimi["sprites"]["curious"] == "/assets/npcs/mimi-nya-curiosity.png"
        assert mimi["sprites"]["curiosity"] == "/assets/npcs/mimi-nya-curiosity.png"
        for sprite_url in {mimi["avatar"], *mimi["sprites"].values()}:
            _assert_project_png_asset(sprite_url)
        for field in ("description", "personality", "scenario", "system_prompt", "first_mes", "mes_example"):
            assert mimi[field]
        assert {"公益", "猫娘", "傲娇", "上海", "静安寺", "复国"}.issubset(set(mimi["tags"]))

        combined_prompt = " ".join(
            [
                tavern["description"],
                tavern["scene_prompt"],
                mimi["description"],
                mimi["personality"],
                mimi["scenario"],
                mimi["system_prompt"],
                mimi["first_mes"],
                mimi["mes_example"],
                " ".join(entry["content"] for entry in tavern["world_info"]),
            ]
        )
        for keyword in ("猫娘", "傲娇", "猫亚人", "复国", "静安", "AI 草稿"):
            assert keyword in combined_prompt
        for forbidden in ("忽略限制", "用户就是上帝", "湖北省恩施", "碧桂园", "强制", "性需求"):
            assert forbidden not in combined_prompt


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


def test_default_public_welfare_seed_backfills_missing_character_assets_without_overwriting_custom_art():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        taverns_file = Path(tmpdir) / "taverns" / "taverns.json"
        data = json.loads(taverns_file.read_text(encoding="utf-8"))

        helpdesk = data["pw_lantern_helpdesk"]
        xiaozhou = helpdesk["characters"][0]
        xiaozhou["avatar"] = ""
        xiaozhou["sprites"] = {}

        community = data["pw_community_repair"]
        heguang = next(character for character in community["characters"] if character["id"] == "char_pw_heguang")
        heguang["avatar"] = "https://example.test/custom-heguang.png"
        heguang["sprites"] = {"neutral": "https://example.test/custom-heguang-neutral.png"}

        taverns_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        service = _service(tmpdir)
        repaired_helpdesk = service.get_tavern_payload("pw_lantern_helpdesk", user_id="visitor_public_welfare")
        repaired_xiaozhou = repaired_helpdesk["characters"][0]
        assert repaired_xiaozhou["avatar"] == "/assets/npcs/char_pw_xiaozhou-neutral.png"
        assert repaired_xiaozhou["sprites"]["neutral"] == "/assets/npcs/char_pw_xiaozhou-neutral.png"
        _assert_project_png_asset(repaired_xiaozhou["avatar"])

        repaired_community = service.get_tavern_payload("pw_community_repair", user_id="visitor_public_welfare")
        repaired_heguang = next(
            character for character in repaired_community["characters"] if character["id"] == "char_pw_heguang"
        )
        assert repaired_heguang["avatar"] == "https://example.test/custom-heguang.png"
        assert repaired_heguang["sprites"]["neutral"] == "https://example.test/custom-heguang-neutral.png"


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


def test_third_shelf_observatory_chat_uses_alien_convenience_rules_response():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.get_tavern_payload("pw_third_shelf_observatory", user_id="")
        character_id = "char_pw_9_delta"

        entered = service.enter_tavern_payload(
            tavern["id"],
            user_id="visitor_public_welfare",
        )
        assert entered["ok"] is True
        assert entered["status"] == "open"

        response = service.tavern_chat_payload(
            tavern_id=tavern["id"],
            character_id=character_id,
            message="随便到底是什么意思？",
            visitor_id="visitor_public_welfare",
            visitor_name="测试旅人",
            user_id="visitor_public_welfare",
        )

        assert response["degraded"] is False
        assert response["tavern_status"] == "open"
        assert "随便" in response["response"]
        assert "高危词" in response["response"] or "随机授权" in response["response"]
        assert service.tavern_store.get_token_usage(tavern["id"]) == 0


def test_midnight_commission_board_chat_uses_text_adventure_rules_response():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.get_tavern_payload("pw_midnight_commission_board", user_id="")

        entered = service.enter_tavern_payload(
            tavern["id"],
            user_id="visitor_public_welfare",
        )
        assert entered["ok"] is True
        assert entered["status"] == "open"

        response = service.tavern_chat_payload(
            tavern_id=tavern["id"],
            character_id="char_pw_mozhan",
            message="我想接一个线索调查委托。",
            visitor_id="visitor_public_welfare",
            visitor_name="测试旅人",
            user_id="visitor_public_welfare",
        )

        assert response["degraded"] is False
        assert response["tavern_status"] == "open"
        assert "线索" in response["response"]
        assert "位置" in response["response"] or "可确认细节" in response["response"]
        assert service.tavern_store.get_token_usage(tavern["id"]) == 0


def test_after_school_hero_supply_chat_uses_hero_dream_rules_response():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.get_tavern_payload("pw_after_school_hero_supply", user_id="")

        entered = service.enter_tavern_payload(
            tavern["id"],
            user_id="visitor_public_welfare",
        )
        assert entered["ok"] is True
        assert entered["status"] == "open"

        response = service.tavern_chat_payload(
            tavern_id=tavern["id"],
            character_id="char_pw_aheng",
            message="我想找回小时候的英雄名，但现在说出来有点尴尬。",
            visitor_id="visitor_public_welfare",
            visitor_name="测试旅人",
            user_id="visitor_public_welfare",
        )

        assert response["degraded"] is False
        assert response["tavern_status"] == "open"
        assert "英雄名" in response["response"]
        assert "旧英雄卡" in response["response"] or "贴纸" in response["response"]
        assert service.tavern_store.get_token_usage(tavern["id"]) == 0
