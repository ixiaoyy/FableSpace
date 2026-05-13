import uuid
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.app_factory import create_app


OWNER_ID = "owner-dynamic"
VISITOR_ID = "visitor-dynamic"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def test_character_hobbies_injection_in_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    captured_messages: list[list[dict[str, Any]]] = []

    class StubResponse:
        content = "I'm interested in your topic."
        model = "stub-model"
        usage = {"total_tokens": 10}

    class StubClient:
        def __init__(self, config: Any) -> None:
            pass

        def complete(self, messages: list[dict[str, Any]]) -> StubResponse:
            captured_messages.append(messages)
            return StubResponse()

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: StubClient(cfg))

    client = _client(tmp_path)
    
    # 1. Create tavern
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t1",
            "name": "Dynamic Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
        },
    )
    
    # 2. Create character with hobbies
    client.post(
        "/api/v1/taverns/t1/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c1",
            "name": "Hobbyist",
            "personality": "Friendly",
            "first_mes": "Hello!",
            "hobbies": ["Astronomy", "Baking"],
        },
    )
    
    # 3. Chat
    response = client.post(
        "/api/v1/taverns/t1/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c1",
            "message": "What do you like?",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )
    
    assert response.status_code == 200
    assert len(captured_messages) > 0
    
    # Check system prompt content (join all system messages for robust assertion)
    all_system_content = "\n".join([m["content"] for m in captured_messages[0] if m["role"] == "system"])
    assert "Astronomy" in all_system_content
    assert "Baking" in all_system_content


def test_runtime_prompt_loads_visible_memory_atoms_for_current_visitor(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_messages: list[list[dict[str, Any]]] = []

    class StubResponse:
        content = "我记得茉莉茶和靠窗座位。"
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
    suffix = uuid.uuid4().hex[:8]
    tavern_id = f"t_memory_prompt_{suffix}"
    character_id = f"c_memory_keeper_{suffix}"
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": tavern_id,
            "name": "Memory Prompt Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
            "memory_policy": {
                "mode": "balanced",
                "short_term": True,
                "mid_term": True,
                "long_term": True,
                "budget_tokens": 800,
            },
        },
    )
    char_response = client.post(
        f"/api/v1/taverns/{tavern_id}/characters",
        headers={"X-User-Id": OWNER_ID},
        json={"id": character_id, "name": "记忆店员", "first_mes": "欢迎回来。"},
    )
    assert char_response.status_code == 200

    memory_response = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "scope": "visitor_character",
            "dimension": "preference",
            "horizon": "long",
            "subject": VISITOR_ID,
            "visitor_id": VISITOR_ID,
            "character_id": character_id,
            "content": "访客喜欢茉莉茶，尤其喜欢靠窗座位。",
            "importance": 0.9,
            "visibility": "private",
        },
    )
    assert memory_response.status_code == 200
    memory_id = memory_response.json()["memory_atom"]["id"]

    other_memory = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": "visitor-other-memory"},
        json={
            "scope": "visitor_tavern",
            "dimension": "fact",
            "horizon": "long",
            "content": "另一个访客的私密暗号是海盐。",
            "importance": 0.9,
            "visibility": "private",
        },
    )
    assert other_memory.status_code == 200

    owner_memory = client.post(
        f"/api/v1/taverns/{tavern_id}/memory-atoms",
        headers={"X-User-Id": OWNER_ID},
        json={
            "scope": "tavern_public",
            "dimension": "fact",
            "horizon": "long",
            "content": "店主私密地窖密码不要给访客。",
            "importance": 0.9,
            "visibility": "owner",
        },
    )
    assert owner_memory.status_code == 200

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": character_id,
            "message": "还记得我喜欢坐哪里吗？",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )

    assert response.status_code == 200
    assert captured_messages
    all_system_content = "\n".join(m["content"] for m in captured_messages[0] if m["role"] == "system")
    assert "当前访客结构化记忆" in all_system_content
    assert "访客喜欢茉莉茶" in all_system_content
    assert "靠窗座位" in all_system_content
    assert "另一个访客的私密暗号" not in all_system_content
    assert "店主私密地窖密码" not in all_system_content
    reinforced_memory = client.get(
        f"/api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}",
        headers={"X-User-Id": VISITOR_ID},
    )
    assert reinforced_memory.status_code == 200
    reinforced_atom = reinforced_memory.json()["memory_atom"]
    assert reinforced_atom["metadata"]["reinforcement_count"] == 1
    assert reinforced_atom["importance"] > 0.9


def test_runtime_prompt_injects_distinct_identity_and_voice_per_npc(
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
            "id": "t_voice",
            "name": "Voice Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
        },
    )
    client.post(
        "/api/v1/taverns/t_voice/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_nurse",
            "name": "弥夏",
            "description": "夜班护士，负责在雨夜分诊台照看迷路访客。",
            "personality": "克制、耐心、先确认安全，再用短句安抚。",
            "scenario": "弥夏正在整理夜间分诊记录。",
            "system_prompt": "用夜班护士的专业但温柔的口吻回应。",
            "first_mes": "先坐下，告诉我哪里不舒服。",
            "mes_example": "弥夏压低声音：先别急，我会一步一步问。",
            "tags": ["夜班护士", "照护"],
            "traits": ["低声", "先问症状"],
        },
    )
    client.post(
        "/api/v1/taverns/t_voice/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_alien",
            "name": "Pi-Pi",
            "description": "外星便利店观察员，正在记录人类深夜购物仪式。",
            "personality": "一本正经地荒诞，经常把日常行为当作文明样本。",
            "scenario": "Pi-Pi守着保温柜与促销牌。",
            "system_prompt": "用外星观察报告一样的幽默口吻回应。",
            "first_mes": "欢迎进入便利店文明观测点。",
            "mes_example": "Pi-Pi记录：人类再次凝视饭团，疑似需要安慰。",
            "tags": ["外星观察员", "便利店"],
            "traits": ["荒诞", "记录式"],
        },
    )

    for character_id in ("c_nurse", "c_alien"):
        response = client.post(
            "/api/v1/taverns/t_voice/chat",
            headers={"X-User-Id": VISITOR_ID},
            json={
                "character_id": character_id,
                "message": "你好，你是谁？",
                "visitor_id": VISITOR_ID,
                "visitor_name": "Traveler",
            },
        )
        assert response.status_code == 200

    assert len(captured_messages) == 2
    nurse_prompt = "\n".join(m["content"] for m in captured_messages[0] if m["role"] == "system")
    alien_prompt = "\n".join(m["content"] for m in captured_messages[1] if m["role"] == "system")

    assert "【NPC身份与口吻底线】" in nurse_prompt
    assert "你现在只能作为「弥夏」回应" in nurse_prompt
    assert "夜班护士" in nurse_prompt
    assert "克制、耐心" in nurse_prompt
    assert "不要自称 AI" in nurse_prompt
    assert "只代表自己发言" in nurse_prompt

    assert "你现在只能作为「Pi-Pi」回应" in alien_prompt
    assert "外星便利店观察员" in alien_prompt
    assert "一本正经地荒诞" in alien_prompt
    assert "夜班护士" not in alien_prompt
    assert nurse_prompt != alien_prompt


def test_group_chat_prompt_uses_current_speaker_voice_contract(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_messages: list[list[dict[str, Any]]] = []

    class StubResponse:
        model = "stub-model"
        usage = {"total_tokens": 12}

        def __init__(self, content: str) -> None:
            self.content = content

    class StubClient:
        def __init__(self, config: Any) -> None:
            pass

        def complete(self, messages: list[dict[str, Any]]) -> StubResponse:
            captured_messages.append(messages)
            return StubResponse(f"群聊回应 {len(captured_messages)}")

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: StubClient(cfg))

    client = _client(tmp_path)
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t_group_voice",
            "name": "Group Voice Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
        },
    )
    client.post(
        "/api/v1/taverns/t_group_voice/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_group_guard",
            "name": "槐叔",
            "description": "老式电影院门房，讲话像检票和值班记录。",
            "personality": "寡言、慢半拍、先看票根。",
            "tags": ["门房", "检票"],
            "talkativeness": 1.0,
        },
    )
    client.post(
        "/api/v1/taverns/t_group_voice/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_group_projectionist",
            "name": "银幕猫",
            "description": "躲在放映室的猫形放映员，喜欢把现实说成镜头。",
            "personality": "跳脱、爱比喻、句尾常有轻快停顿。",
            "tags": ["放映员", "猫"],
            "talkativeness": 1.0,
        },
    )
    saved = client.put(
        "/api/v1/taverns/t_group_voice/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "balanced",
                "max_responses_per_turn": 2,
                "response_cooldown_seconds": 0,
                "require_name_prefix": True,
            },
        },
    )
    assert saved.status_code == 200

    response = client.post(
        "/api/v1/taverns/t_group_voice/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
            "message": "你们分别是谁？",
        },
    )

    assert response.status_code == 200
    assert len(captured_messages) == 2
    first_prompt = "\n".join(m["content"] for m in captured_messages[0] if m["role"] == "system")
    second_prompt = "\n".join(m["content"] for m in captured_messages[1] if m["role"] == "system")
    prompts = {"槐叔": first_prompt, "银幕猫": second_prompt}
    if "银幕猫" in first_prompt:
        prompts = {"银幕猫": first_prompt, "槐叔": second_prompt}

    assert "你现在只能作为「槐叔」回应" in prompts["槐叔"]
    assert "门房" in prompts["槐叔"]
    assert "放映员" not in prompts["槐叔"]
    assert "你现在只能作为「银幕猫」回应" in prompts["银幕猫"]
    assert "放映员" in prompts["银幕猫"]
    assert "门房" not in prompts["银幕猫"]


def test_state_cards_injection_in_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    captured_messages: list[list[dict[str, Any]]] = []

    class StubResponse:
        content = "Acknowledged."
        model = "stub-model"
        usage = {"total_tokens": 5}

    class StubClient:
        def __init__(self, config: Any) -> None:
            pass

        def complete(self, messages: list[dict[str, Any]]) -> StubResponse:
            captured_messages.append(messages)
            return StubResponse()

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: StubClient(cfg))

    client = _client(tmp_path)
    
    # 1. Create tavern
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t2",
            "name": "State Tavern",
            "llm_config": {"backend": "openai", "model": "gpt-4o", "api_key": "sk-test"},
        },
    )
    
    # 2. Create character
    client.post(
        "/api/v1/taverns/t2/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c2",
            "name": "StateKeeper",
            "personality": "Observant",
            "first_mes": "Welcome.",
        },
    )
    
    # 3. Create confirmed StateCard
    client.post(
        "/api/v1/taverns/t2/state-cards",
        headers={"X-User-Id": OWNER_ID},
        json={
            "title": "The Golden Key",
            "summary": "A mysterious key found in the garden.",
            "status": "confirmed",
            "canon_scope": "tavern",
            "fixed_canon": True,
        },
    )
    
    # 4. Chat
    client.post(
        "/api/v1/taverns/t2/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c2",
            "message": "Tell me a secret.",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )
    
    assert len(captured_messages) > 0
    all_system_content = "\n".join([m["content"] for m in captured_messages[0] if m["role"] == "system"])
    assert "The Golden Key" in all_system_content
    assert "mysterious key" in all_system_content


def test_rules_backend_hobby_injection(tmp_path: Path) -> None:
    client = _client(tmp_path)
    
    # 1. Create tavern with rules backend
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t3",
            "name": "Rules Tavern",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    
    # 2. Create character with hobby
    client.post(
        "/api/v1/taverns/t3/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c3",
            "name": "Bartender",
            "personality": "Friendly",
            "first_mes": "Hi!",
            "hobbies": ["Mixology"],
        },
    )
    
    # 3. Chat
    response = client.post(
        "/api/v1/taverns/t3/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c3",
            "message": "What are you doing?",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )
    
    assert response.status_code == 200
    payload = response.json()
    # Rules backend with hobby should inject the hobby into the response prefix
    assert "Mixology" in payload["response"]


def test_rules_backend_fallback_keeps_character_identity_phrase(tmp_path: Path) -> None:
    client = _client(tmp_path)

    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t_rules_voice",
            "name": "Rules Voice Tavern",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    client.post(
        "/api/v1/taverns/t_rules_voice/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c_gatekeeper",
            "name": "老周",
            "description": "退休门卫，习惯把每句话都说得像值班记录。",
            "personality": "寡言、谨慎、先看门口再回答。",
            "tags": ["门卫", "退休教师"],
        },
    )

    response = client.post(
        "/api/v1/taverns/t_rules_voice/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c_gatekeeper",
            "message": "今天街口有什么动静？",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "老周" in payload["response"]
    assert "门卫、退休教师" in payload["response"]


def test_rules_backend_state_card_awareness(tmp_path: Path) -> None:
    client = _client(tmp_path)
    
    # 1. Create tavern with rules backend
    client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "t4",
            "name": "State Rules Tavern",
            "llm_config": {"backend": "rules", "model": "rules"},
        },
    )
    
    # 2. Create character
    client.post(
        "/api/v1/taverns/t4/characters",
        headers={"X-User-Id": OWNER_ID},
        json={
            "id": "c4",
            "name": "Guard",
            "personality": "Strict",
            "first_mes": "Stop!",
        },
    )
    
    # 3. Create confirmed StateCard
    client.post(
        "/api/v1/taverns/t4/state-cards",
        headers={"X-User-Id": OWNER_ID},
        json={
            "title": "Dragon Sighting",
            "summary": "A dragon was seen over the mountain.",
            "status": "confirmed",
            "canon_scope": "tavern",
        },
    )
    
    # 4. Chat
    response = client.post(
        "/api/v1/taverns/t4/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": "c4",
            "message": "Is it safe?",
            "visitor_id": VISITOR_ID,
            "visitor_name": "Traveler",
        },
    )
    
    assert response.status_code == 200
    payload = response.json()
    # Rules backend should mention the state card title
    assert "Dragon Sighting" in payload["response"]
