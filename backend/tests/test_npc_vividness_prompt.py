import uuid
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.app_factory import create_app


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

if __name__ == "__main__":
    pytest.main([__file__])
