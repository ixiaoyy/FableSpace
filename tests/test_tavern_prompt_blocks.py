import pytest

from fablemap.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks, truncate_to_budget
from fablemap.prompt_builder import PromptBuildConfig, PromptBuilder
from fablemap.web.config import ApiSettings


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
    from fablemap.web.app import create_web_app

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
