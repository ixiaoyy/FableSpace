from pathlib import Path
from tempfile import TemporaryDirectory

from fablemap.prompt_builder import ChatMessage, PromptBuildConfig, PromptBuilder
from fablemap.web.config import ApiSettings
from fablemap.web.service import WebService


OWNER_ID = "owner_world_info_injection"


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def _world_info_entries() -> list[dict]:
    return [
        {
            "id": "wi_constant",
            "constant": True,
            "content": "The school gate closes at dusk.",
            "order": 5,
        },
        {
            "id": "wi_secondary",
            "keys": ["档案柜"],
            "keys_secondary": ["钥匙"],
            "content": "The archive key is hidden under the red ledger.",
            "order": 10,
        },
        {
            "id": "wi_primary",
            "keys": ["毕业照"],
            "content": "The graduation photo is locked in the old archive.",
            "order": 20,
        },
        {
            "id": "wi_recent_depth",
            "keys": ["新暗号"],
            "content": "The new code opens the side stairwell.",
            "depth": 1,
            "order": 25,
        },
        {
            "id": "wi_old_depth",
            "keys": ["旧暗号"],
            "content": "The old code should be too far back to inject.",
            "depth": 1,
            "order": 26,
        },
        {
            "id": "wi_disabled",
            "keys": ["禁用词"],
            "content": "This disabled entry must not inject.",
            "disable": True,
            "order": 1,
        },
        {
            "id": "wi_probability_zero",
            "keys": ["零概率"],
            "content": "This zero probability entry must not inject.",
            "probability": 0,
            "order": 2,
        },
    ]


def test_world_info_hit_tester_reports_keywords_depth_order_and_statuses():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_world_info_injection",
                "name": "WorldInfo Injection Tavern",
                "description": "A tavern for world info injection checks.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id=OWNER_ID,
        )
        service.update_tavern_payload(
            tavern["id"],
            {"world_info": _world_info_entries()},
            user_id=OWNER_ID,
        )

        payload = service.test_world_info_payload(
            tavern["id"],
            {
                "message": "我想看毕业照，也找到了钥匙。禁用词和零概率也在这句里。",
                "recent_messages": [
                    "很早以前有人提到旧暗号。",
                    "刚刚有人告诉我新暗号。",
                ],
            },
            user_id=OWNER_ID,
        )

        assert payload["entry_count"] == 7
        assert payload["matched_count"] == 4
        assert [item["id"] for item in payload["matches"]] == [
            "wi_constant",
            "wi_secondary",
            "wi_primary",
            "wi_recent_depth",
        ]

        by_id = {item["id"]: item for item in payload["entries"]}
        assert by_id["wi_secondary"]["matched_keys"] == []
        assert by_id["wi_secondary"]["matched_secondary_keys"] == ["钥匙"]
        assert by_id["wi_recent_depth"]["depth"] == 1
        assert by_id["wi_recent_depth"]["status"] == "matched"
        assert by_id["wi_old_depth"]["status"] == "not_matched"
        assert by_id["wi_disabled"]["keyword_matched"] is True
        assert by_id["wi_disabled"]["status"] == "disabled"
        assert by_id["wi_probability_zero"]["keyword_matched"] is True
        assert by_id["wi_probability_zero"]["status"] == "probability_zero"


def test_prompt_builder_injects_world_info_in_order_and_respects_depth():
    config = PromptBuildConfig(
        tavern_name="WorldInfo Injection Tavern",
        tavern_scene_prompt="档案柜在门后。",
        char_name="Archivist",
        char_personality="Precise and quiet.",
        char_system_prompt="Stay in character.",
        world_info_entries=_world_info_entries(),
        history_max_messages=4,
    )
    history = [
        ChatMessage(role="user", content="很早以前有人提到旧暗号。"),
        ChatMessage(role="assistant", content="刚刚有人告诉我新暗号。"),
    ]

    result = PromptBuilder(config).build(
        history,
        "我想看毕业照，也找到了钥匙。禁用词和零概率也在这句里。",
    )
    injected = [message for message in result["messages"] if message.get("_wi_entry_id")]

    assert [message["_wi_entry_id"] for message in injected] == [
        "wi_constant",
        "wi_secondary",
        "wi_primary",
        "wi_recent_depth",
    ]
    injected_text = "\n\n".join(message["content"] for message in injected)
    assert "school gate closes" in injected_text
    assert "archive key" in injected_text
    assert "graduation photo" in injected_text
    assert "new code opens" in injected_text
    assert "old code should be too far back" not in injected_text
    assert "disabled entry" not in injected_text
    assert "zero probability entry" not in injected_text
