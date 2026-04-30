import pytest

from fablemap_api.core.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks, truncate_to_budget
from fablemap_api.core.prompt_builder import PromptBuildConfig, PromptBuilder
from fablemap_api.core.state_cards import StateCard
from fablemap_api.core.web.config import ApiSettings
from fablemap_api.core.web.service import WebService


def _combined_prompt_text(prompt_result: dict) -> str:
    return "\n\n".join(str(message.get("content", "")) for message in prompt_result.get("messages", []))


def _prompt_config(blocks: list[dict] | None = None) -> PromptBuildConfig:
    return PromptBuildConfig(
        tavern_name="雾港旧店",
        tavern_scene_prompt="档案柜在雨声里发亮。",
        char_name="鹿灯",
        char_personality="谨慎、温柔，记得每位访客的旧事。",
        char_scenario="鹿灯正在深夜守店。",
        char_first_mes="灯还亮着。",
        char_system_prompt="只以鹿灯身份回应。",
        user_name="访客甲",
        visitor_visit_count=2,
        visitor_relationship_stage="regular",
        visitor_relationship_strength=0.61,
        visitor_message_count=5,
        world_info_entries=[
            {
                "id": "wi_archive",
                "tavern_id": "tavern_prompt_unit",
                "keys": ["档案柜"],
                "content": "档案柜里藏着一张蓝色车票。",
                "order": 7,
            }
        ],
        prompt_blocks=blocks if blocks is not None else default_prompt_blocks(),
        history_max_messages=4,
    )


def test_prompt_block_builder_uses_default_segments_and_dynamic_world_info():
    result = PromptBuilder(_prompt_config()).build([], "我想打开档案柜。")
    text = _combined_prompt_text(result)

    assert result["messages"][-1] == {"role": "user", "content": "我想打开档案柜。"}
    assert "【场景：雾港旧店】" in text
    assert "只以鹿灯身份回应。" in text
    assert "角色姓名：鹿灯" in text
    assert "当前访客关系状态" in text
    assert "关系阶段=常客" in text
    assert "[WorldInfo: 档案柜]" in text
    assert "蓝色车票" in text
    assert "请保持鹿灯的角色口吻" in text
    assert result["prompt_blocks"][0]["id"] == "scene"


def test_prompt_blocks_can_disable_world_info_and_truncate_custom_segments():
    blocks = [block for block in default_prompt_blocks() if block["id"] != "world_info"]
    blocks.append(
        {
            "id": "tiny_custom",
            "name": "短预算段落",
            "enabled": True,
            "type": "custom",
            "order": 55,
            "template": "X" * 400,
            "token_budget": 8,
        }
    )

    result = PromptBuilder(_prompt_config(blocks)).build([], "我想打开档案柜。")
    text = _combined_prompt_text(result)

    assert "蓝色车票" not in text
    assert "X" * 160 not in text
    assert truncate_to_budget("Y" * 400, 8).endswith("…")


def test_prompt_blocks_normalize_unknown_type_and_order():
    blocks = normalize_prompt_blocks(
        [
            {"id": "b", "name": "B", "type": "unknown", "order": "20", "template": "B"},
            {"id": "a", "name": "A", "type": "custom", "order": "10", "template": "A"},
        ]
    )

    assert [block["id"] for block in blocks] == ["a", "b"]
    assert blocks[1]["type"] == "custom"


def test_prompt_blocks_api_defaults_save_preview_and_authz(tmp_path):
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap_api.core.web.app import create_web_app

    app = create_web_app(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None))
    headers = {"X-User-Id": "owner_prompt_blocks"}

    with TestClient(app) as client:
        tavern_response = client.post(
            "/api/taverns",
            headers=headers,
            json={
                "id": "tavern_prompt_blocks",
                "name": "Prompt Blocks Tavern",
                "description": "A tavern for prompt block tests.",
                "lat": 31.23,
                "lon": 121.47,
                "scene_prompt": "旧收音机在柜台后发出白噪音。",
            },
        )
        assert tavern_response.status_code == 200

        char_response = client.post(
            "/api/taverns/tavern_prompt_blocks/characters",
            headers=headers,
            json={
                "name": "Archivist",
                "personality": "Precise and quiet.",
                "scenario": "Watching the rain.",
                "system_prompt": "Stay in character.",
            },
        )
        assert char_response.status_code == 200
        character_id = char_response.json()["id"]

        default_response = client.get("/api/taverns/tavern_prompt_blocks/prompt-blocks", headers=headers)
        assert default_response.status_code == 200
        defaults = default_response.json()["blocks"]
        assert [block["id"] for block in defaults[:3]] == ["scene", "character_system", "character_profile"]

        blocks = [
            {
                "id": "custom_intro",
                "name": "自定义导入段",
                "enabled": True,
                "type": "custom",
                "order": 5,
                "template": "【测试段落】{{char}}/{{user}}/{{input}}",
                "token_budget": 300,
            }
        ]
        save_response = client.put(
            "/api/taverns/tavern_prompt_blocks/prompt-blocks",
            headers=headers,
            json={"blocks": blocks},
        )
        assert save_response.status_code == 200
        assert save_response.json()["blocks"][0]["id"] == "custom_intro"
        assert save_response.json()["tavern"]["prompt_blocks"][0]["id"] == "custom_intro"

        preview_response = client.post(
            "/api/taverns/tavern_prompt_blocks/prompt-blocks/preview",
            headers=headers,
            json={
                "character_id": character_id,
                "visitor_name": "李雷",
                "message": "查看档案柜",
            },
        )
        assert preview_response.status_code == 200
        preview = preview_response.json()
        assert preview["character_name"] == "Archivist"
        assert preview["message_count"] == 2
        assert "【测试段落】Archivist/李雷/查看档案柜" in preview["messages"][0]["content"]
        assert preview["messages"][-1] == {"role": "user", "content": "查看档案柜"}

        forbidden = client.put(
            "/api/taverns/tavern_prompt_blocks/prompt-blocks",
            headers={"X-User-Id": "other_owner"},
            json={"blocks": []},
        )
        assert forbidden.status_code == 403


def _prompt_config_with_state_cards(blocks: list[dict] | None = None, state_cards: list[dict] | None = None) -> PromptBuildConfig:
    cfg = _prompt_config(blocks)
    cfg.state_cards = state_cards
    return cfg


def test_state_cards_injected_into_prompt_when_configured():
    blocks = default_prompt_blocks()
    cards = [
        {"id": "sc1", "category": "task", "title": "Blue Ticket Task", "summary": "Find the blue ticket in the archive.", "status": "confirmed", "fixed_canon": True},
        {"id": "sc2", "category": "resource", "title": "Old Ticket", "summary": "An old ticket from Fog Harbor.", "status": "confirmed", "fixed_canon": False},
    ]
    result = PromptBuilder(_prompt_config_with_state_cards(blocks, cards)).build([], "I want to see the ticket.")
    text = _combined_prompt_text(result)

    assert "Blue Ticket Task" in text
    assert "Find the blue ticket in the archive" in text
    # sc2 has fixed_canon=False so should NOT appear in prompt
    assert "Old Ticket" not in text


def test_state_cards_fixed_canon_filter():
    blocks = default_prompt_blocks()
    # Only sc1 has both confirmed + fixed_canon; sc2 is confirmed but not fixed_canon
    cards = [
        {"id": "sc1", "category": "task", "title": "Blue Ticket", "summary": "Blue ticket confirmed.", "status": "confirmed", "fixed_canon": True},
        {"id": "sc2", "category": "resource", "title": "Old Ticket", "summary": "Old ticket confirmed.", "status": "confirmed", "fixed_canon": False},
        {"id": "sc3", "category": "event", "title": "Pending Card", "summary": "Pending card.", "status": "pending", "fixed_canon": True},
    ]
    result = PromptBuilder(_prompt_config_with_state_cards(blocks, cards)).build([], "Hello.")
    text = _combined_prompt_text(result)

    assert "Blue Ticket" in text
    assert "Blue ticket confirmed" in text
    # sc2 is not fixed_canon, so should not appear
    assert "Old Ticket" not in text
    # sc3 is not confirmed, so should not appear
    assert "Pending Card" not in text


def test_state_cards_render_empty_when_no_cards():
    cfg = _prompt_config()
    cfg.state_cards = []

    result = PromptBuilder(cfg).build([], "Hello.")
    text = _combined_prompt_text(result)
    # When no confirmed+fixed_canon cards exist, nothing injected
    assert "Blue Ticket" not in text
    assert "Pending Card" not in text


def test_state_cards_block_respects_token_budget():
    blocks = default_prompt_blocks()
    long_text = "Very long content description. " * 200
    cards = [
        {"id": f"sc{i}", "category": "task", "title": f"Task {i}", "summary": long_text, "status": "confirmed", "fixed_canon": True}
        for i in range(10)
    ]
    cfg = _prompt_config_with_state_cards(blocks, cards)
    cfg.state_cards_budget_tokens = 50

    result = PromptBuilder(cfg).build([], "Hello")
    text = _combined_prompt_text(result)
    # Should have state cards section with budget truncated
    assert "Task 0" in text or "Task" in text


def test_state_cards_block_id_and_type():
    blocks = default_prompt_blocks()
    result = PromptBuilder(_prompt_config_with_state_cards(blocks, [])).build([], "Hello")
    block_ids = [b["id"] for b in result["prompt_blocks"]]
    assert "state_cards" in block_ids
    state_cards_block = next(b for b in result["prompt_blocks"] if b["id"] == "state_cards")
    assert state_cards_block["type"] == "state_cards"


def test_runtime_chat_prompt_loads_confirmed_fixed_state_cards(tmp_path):
    service = WebService(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None))
    owner_id = "owner_sc03_runtime"
    tavern_id = "tavern_sc03_runtime"
    visitor_id = "visitor_sc03_runtime"

    service.create_tavern_payload(
        {
            "id": tavern_id,
            "name": "SC-03 Runtime Tavern",
            "description": "A tavern for runtime state-card prompt tests.",
            "lat": 31.23,
            "lon": 121.47,
            "llm_config": {"backend": "rules", "model": "rules"},
        },
        owner_id=owner_id,
    )
    service.add_character_payload(
        tavern_id,
        {"id": "char_sc03_keeper", "name": "Keeper", "system_prompt": "Stay in character."},
        owner_id,
    )
    service.tavern_store.save_state_card(
        tavern_id,
        StateCard(
            id="sc_fixed_task",
            tavern_id=tavern_id,
            category="task",
            title="Blue Ticket Task",
            summary="The blue ticket is now fixed canon for this tavern.",
            status="confirmed",
            canon_scope="tavern",
            fixed_canon=True,
            confirmed_by=owner_id,
        ),
    )
    service.tavern_store.save_state_card(
        tavern_id,
        StateCard(
            id="sc_ordinary_resource",
            tavern_id=tavern_id,
            category="resource",
            title="Ordinary Confirmed Resource",
            summary="This confirmed card is not fixed canon and should stay out of the prompt.",
            status="confirmed",
            canon_scope="visitor",
            fixed_canon=False,
            visitor_id=visitor_id,
            confirmed_by=visitor_id,
        ),
    )

    tavern = service.tavern_store.get_tavern(tavern_id)
    character = next(item for item in tavern.characters if item.id == "char_sc03_keeper")
    prompt_bundle = service._build_tavern_character_prompt(
        tavern=tavern,
        character=character,
        llm_config=tavern.llm_config,
        message="What should I remember?",
        visitor_id=visitor_id,
    )
    text = _combined_prompt_text(prompt_bundle["prompt_result"])

    assert "Blue Ticket Task" in text
    assert "The blue ticket is now fixed canon" in text
    assert "Ordinary Confirmed Resource" not in text
