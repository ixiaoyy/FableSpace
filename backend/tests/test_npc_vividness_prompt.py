import uuid
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.app_factory import create_app
from fablemap_api.core.npc_voice import build_npc_voice_contract


OWNER_ID = "owner-vividness"
VISITOR_ID = "visitor-vividness"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(
            ApiSettings(
                output_root=tmp_path / "api",
                fixture_file=None,
                frontend_root=None,
                storage_backend="json",
                database_url="",
                mysql_url="",
            )
        )
    )


def test_runtime_prompt_contains_vividness_instructions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_messages: list[list[dict[str, Any]]] = []

    class StubResponse:
        content = "我会按自己的身份回应。"
        model = "stub-model"
        usage = {"total_tokens": 12}

    class StubClient:
        def __init__(self, config: Any) -> None:
            pass

        def complete(self, messages: list[dict[str, Any]]) -> StubResponse:
            captured_messages.append(messages)
            return StubResponse()

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: StubClient(cfg))

    client = _client(tmp_path)
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t_vivid",
            "name": "Vivid Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
        },
    )
    client.post(
        "/api/v1/taverns/t_vivid/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_vivid",
            "name": "Vivid NPC",
            "personality": "Expressive",
        },
    )

    response = client.post(
        "/api/v1/taverns/t_vivid/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c_vivid",
            "message": "Hello!",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )
    assert response.status_code == 200
    assert captured_messages

    system_content = "\n".join(m["content"] for m in captured_messages[0] if m["role"] == "system")
    
    # Check for new vividness instructions
    assert "【NPC身份与口吻底线】" in system_content
    assert "对话临场感" in system_content
    assert "动作、神态或感官描写" in system_content
    assert "拒绝机械化" in system_content
    assert "情绪共鸣" in system_content
    assert "个性化口吻" in system_content
    assert "控制在 1-3 句" in system_content


def test_npc_voice_contract_selects_tough_love_positioning_for_roast_tags() -> None:
    contract = build_npc_voice_contract(
        name="刺梨",
        personality="聪明、嘴毒，但关键时刻会护着访客。",
        tags=["最佳损友", "毒舌", "吐槽"],
    )

    assert "【角色定位响应模板】" in contract
    assert "Positioning: Tough-love best friend / roast advisor NPC" in contract
    assert "Brutal Honesty with a Brain" in contract
    assert "Tough Love" in contract
    assert "Cut the Fluff" in contract
    assert "Scannability is King" in contract
    assert "DROP THE MIC" in contract
    assert "exactly one sharp, relevant follow-up question" in contract
    assert "Do not claim a model name, device, paid tier, multimodal ability" in contract


def test_npc_voice_contract_uses_safety_positioning_before_roast_style() -> None:
    contract = build_npc_voice_contract(
        name="弥夏",
        personality="夜班护士，严厉、犀利。",
        tags=["护士", "分诊", "毒舌", "安全边界"],
    )

    assert "专业分诊 / 安全边界型 NPC" in contract
    assert "Positioning: Tough-love best friend / roast advisor NPC" not in contract
    assert "优先建议现实求助、可信任的人或当地紧急服务" in contract


if __name__ == "__main__":
    pytest.main([__file__])
