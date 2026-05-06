from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from fablemap_api.core.default_taverns import DEFAULT_PUBLIC_WELFARE_OWNER_ID
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


OWNER_ID = "owner-runtime"
VISITOR_ID = "visitor-runtime"
OTHER_VISITOR_ID = "visitor-other"


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None)))


def _create_tavern(
    client: TestClient,
    *,
    llm_config: dict[str, Any] | None = None,
) -> tuple[str, list[str]]:
    response = client.post(
        "/api/v1/taverns",
        headers={"X-User-Id": OWNER_ID},
        json={
            "name": "运行时酒馆",
            "description": "用于测试 LLM、群聊和语音迁移",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
            "scene_prompt": "吧台悬着蓝色灯牌。",
            "llm_config": llm_config or {"backend": "rules", "model": "rules", "api_key": "owner-secret"},
        },
    )
    assert response.status_code == 200
    tavern_id = response.json()["id"]
    character_ids: list[str] = []
    for name in ("灯牌调酒师", "夜航向导"):
        created = client.post(
            f"/api/v1/taverns/{tavern_id}/characters",
            headers={"X-User-Id": OWNER_ID},
            json={
                "name": name,
                "description": f"{name} 负责群聊测试。",
                "personality": "友好、简短",
                "first_mes": "欢迎来到运行时酒馆。",
                "talkativeness": 1.0,
            },
        )
        assert created.status_code == 200
        character_ids.append(created.json()["id"])
    return tavern_id, character_ids


def test_v1_llm_probe_and_voice_config_endpoints(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(client)

    direct_probe = client.post(
        "/api/v1/llm/test-config",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "rules", "model": "rules"},
    )
    assert direct_probe.status_code == 200
    assert direct_probe.json()["ok"] is True
    assert "api_key" not in direct_probe.text

    tavern_probe = client.post(
        f"/api/v1/taverns/{tavern_id}/test-llm",
        headers={"X-User-Id": OWNER_ID},
        json={"backend": "rules", "model": "rules"},
    )
    assert tavern_probe.status_code == 200
    assert tavern_probe.json()["ok"] is True

    missing_secret = client.post("/api/v1/llm/test-config", json={"backend": "openai", "model": "gpt-test"})
    assert missing_secret.status_code == 200
    assert missing_secret.json()["ok"] is False

    defaults = client.get(f"/api/v1/taverns/{tavern_id}/voice", headers={"X-User-Id": VISITOR_ID})
    assert defaults.status_code == 200
    assert defaults.json()["voice_config"]["enabled"] is False

    disabled_tts = client.post(
        f"/api/v1/taverns/{tavern_id}/tts",
        headers={"X-User-Id": VISITOR_ID},
        json={"text": "请读出这句话。"},
    )
    assert disabled_tts.status_code == 400
    assert disabled_tts.json()["error"] == "语音未启用"

    visitor_save = client.put(
        f"/api/v1/taverns/{tavern_id}/voice",
        headers={"X-User-Id": VISITOR_ID},
        json={"enabled": True},
    )
    assert visitor_save.status_code == 403

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/voice",
        headers={"X-User-Id": OWNER_ID},
        json={"enabled": "true", "tts_provider": "edge_tts", "stt_provider": "browser", "auto_play": "true"},
    )
    assert saved.status_code == 200
    assert saved.json()["voice_config"]["enabled"] is True
    assert saved.json()["voice_config"]["auto_play"] is True

    browser_stt = client.post(
        f"/api/v1/taverns/{tavern_id}/stt",
        headers={"X-User-Id": VISITOR_ID},
        content=b"not-real-audio",
    )
    assert browser_stt.status_code == 400
    assert browser_stt.json()["error"] == "浏览器 STT 无需上传到后端"


def test_v1_after_school_hero_supply_chat_uses_hero_dream_rules_response(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.post(
        "/api/v1/taverns/pw_after_school_hero_supply/chat",
        headers={"X-User-Id": "visitor-v1-hero"},
        json={
            "character_id": "char_pw_aheng",
            "message": "我想找回小时候的英雄名，但现在说出来有点尴尬。",
            "visitor_id": "visitor-v1-hero",
            "visitor_name": "测试旅人",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is False
    assert payload["tavern_status"] == "open"
    assert "空白旧英雄卡推到灯下" in payload["response"]
    assert "英雄名" in payload["response"]
    assert "贴纸" in payload["response"]


def test_v1_third_shelf_generic_rules_chat_does_not_echo_scene_prompt(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.post(
        "/api/v1/taverns/pw_third_shelf_observatory/chat",
        headers={"X-User-Id": "visitor-v1-weather"},
        json={
            "character_id": "char_pw_9_delta",
            "message": "天气怎么样？",
            "visitor_id": "visitor-v1-weather",
            "visitor_name": "测试旅人",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is False
    assert payload["tavern_status"] == "open"
    assert payload["response"].strip()
    assert "便利店" in payload["response"] or "人类" in payload["response"]
    assert "这里的气味和灯光让我想到" not in payload["response"]
    assert "氛围是" not in payload["response"]
    assert "我听见了——天气怎么样" not in payload["response"]
    assert client.app.state.taverns.store.get_token_usage("pw_third_shelf_observatory") == 0


def test_v1_public_welfare_rules_chat_reports_rules_mode_without_internal_fields(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.post(
        "/api/v1/taverns/pw_after_school_hero_supply/chat",
        headers={"X-User-Id": "visitor-v1-rules-mode"},
        json={
            "character_id": "char_pw_aheng",
            "message": "我想修补旧道具，也想知道怎么玩。",
            "visitor_id": "visitor-v1-rules-mode",
            "visitor_name": "测试旅人",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is False
    assert payload["tavern_status"] == "open"
    assert payload["response_mode"]["kind"] == "built_in_rules"
    assert payload["response_mode"]["requires_owner_llm"] is False
    assert "规则模式" in payload["response_mode"]["label"]
    assert "无 Key" in payload["response_mode"]["label"]

    combined_text = f"{payload['response']}\n{payload['response_mode']}"
    for internal_field in (
        "system_prompt",
        "scene_prompt",
        "prompt_blocks",
        "backend=rules",
        "public-welfare-rules-v1",
    ):
        assert internal_field not in combined_text


def test_v1_user_tavern_without_llm_reports_configuration_mode(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_ids = _create_tavern(
        client,
        llm_config={"backend": "openai", "model": "gpt-test", "api_key": "", "base_url": ""},
    )

    response = client.post(
        f"/api/v1/taverns/{tavern_id}/chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "character_id": character_ids[0],
            "message": "今晚可以聊聊吗？",
            "visitor_id": VISITOR_ID,
            "visitor_name": "测试旅人",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is True
    assert payload["degradation"]["reason"] == "llm_not_configured"
    assert payload["response_mode"]["kind"] == "llm_not_configured"
    assert payload["response_mode"]["requires_owner_llm"] is True
    assert "配置" in payload["response_mode"]["message"]
    assert "AI NPC" not in payload["response_mode"]["label"]
    assert payload["tavern_status"] == "closed"


def test_v1_public_welfare_uses_versioned_kilo_config_when_free_model_is_selected(
    tmp_path: Path,
    monkeypatch,
) -> None:
    captured_configs: list[Any] = []

    class DummyResponse:
        content = "V1 Kilo 测试模型回复。"
        model = "kilo-auto/free"
        usage = {"total_tokens": 23}

    class DummyClient:
        def __init__(self, config: Any) -> None:
            captured_configs.append(config)

        def complete(self, messages: list[dict[str, Any]]) -> DummyResponse:
            return DummyResponse()

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: DummyClient(cfg))

    client = _client(tmp_path)

    saved = client.put(
        "/api/v1/taverns/pw_lantern_helpdesk",
        headers={"X-User-Id": DEFAULT_PUBLIC_WELFARE_OWNER_ID},
        json={
            "llm_config": {
                "backend": "custom",
                "model": "kilo-auto/free",
                "api_key": "",
                "base_url": "",
                "temperature": 0.8,
                "max_tokens": 1024,
                "top_p": 0.9,
            }
        },
    )

    assert saved.status_code == 200
    assert saved.json()["status"] == "open"
    assert saved.json()["llm_config"]["model"] == "kilo-auto/free"

    reloaded = client.get(
        "/api/v1/taverns/pw_lantern_helpdesk",
        headers={"X-User-Id": DEFAULT_PUBLIC_WELFARE_OWNER_ID},
    )
    assert reloaded.status_code == 200
    assert reloaded.json()["llm_config"]["model"] == "kilo-auto/free"

    visitor_view = client.get(
        "/api/v1/taverns/pw_lantern_helpdesk",
        headers={"X-User-Id": "visitor-v1-public-welfare-free"},
    )
    assert visitor_view.status_code == 200
    assert visitor_view.json()["llm_config"]["api_key"] == ""

    probe = client.post(
        "/api/v1/taverns/pw_lantern_helpdesk/test-llm",
        headers={"X-User-Id": DEFAULT_PUBLIC_WELFARE_OWNER_ID},
        json={
            "backend": "custom",
            "model": "kilo-auto/free",
            "api_key": "",
            "base_url": "",
        },
    )
    assert probe.status_code == 200
    assert probe.json()["ok"] is True
    assert captured_configs
    assert captured_configs[-1].api_key
    captured_configs.clear()

    response = client.post(
        "/api/v1/taverns/pw_lantern_helpdesk/chat",
        headers={"X-User-Id": "visitor-v1-public-welfare-free"},
        json={
            "character_id": "char_pw_xiaozhou",
            "message": "你好，我是新手，怎么玩？",
            "visitor_id": "visitor-v1-public-welfare-free",
            "visitor_name": "测试旅人",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is False
    assert payload["tavern_status"] == "open"
    assert payload["response"] == "V1 Kilo 测试模型回复。"
    assert captured_configs
    assert captured_configs[0].backend == "custom"
    assert captured_configs[0].model == "kilo-auto/free"
    assert captured_configs[0].base_url == "https://api.kilo.ai/api/gateway"
    assert captured_configs[0].api_key
    assert client.app.state.taverns.store.get_token_usage("pw_lantern_helpdesk") > 0


def test_v1_group_chat_config_send_history_and_permissions(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_ids = _create_tavern(client)

    defaults = client.get(f"/api/v1/taverns/{tavern_id}/group-chat", headers={"X-User-Id": VISITOR_ID})
    assert defaults.status_code == 200
    assert defaults.json()["group_chat_enabled"] is False
    assert defaults.json()["character_count"] == 2

    visitor_update = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": VISITOR_ID},
        json={"group_chat_enabled": True},
    )
    assert visitor_update.status_code == 403

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 2,
                "response_cooldown_seconds": 0,
                "require_name_prefix": True,
            },
            "character_talkativeness": {character_ids[0]: 1.0, character_ids[1]: 1.0},
        },
    )
    assert saved.status_code == 200
    assert saved.json()["group_chat_enabled"] is True
    assert saved.json()["group_chat_config"]["strategy"] == "round_robin"

    chatted = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "今晚灯牌亮吗？"},
    )
    assert chatted.status_code == 200
    payload = chatted.json()
    assert payload["speaker_count"] == 2
    assert payload["messages"][0]["character_id"] in set(character_ids)
    assert payload["degraded"] is False
    assert payload["visitor_state"]["visitor_id"] == VISITOR_ID

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert history.status_code == 200
    assert history.json()["message_count"] == 3
    assert {message["role"] for message in history.json()["messages"]} == {"user", "assistant"}

    owner_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert owner_history.status_code == 200
    assert owner_history.json()["message_count"] == 3

    other_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": OTHER_VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert other_history.status_code == 403

    talk = client.put(
        f"/api/v1/taverns/{tavern_id}/characters/{character_ids[0]}/talkativeness",
        headers={"X-User-Id": OWNER_ID},
        json={"talkativeness": 0.2},
    )
    assert talk.status_code == 200
    updated = next(item for item in talk.json()["characters"] if item["id"] == character_ids[0])
    assert updated["talkativeness"] == 0.2


def test_v1_group_chat_respects_response_cap_and_round_robin_across_turns(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_ids = _create_tavern(client)

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 1,
                "response_cooldown_seconds": 0,
                "require_name_prefix": True,
            },
            "character_talkativeness": {character_ids[0]: "2", character_ids[1]: 1},
        },
    )
    assert saved.status_code == 200
    assert saved.json()["group_chat_config"]["max_responses_per_turn"] == 1
    assert next(item for item in saved.json()["characters"] if item["id"] == character_ids[0])["talkativeness"] == 1.0

    first = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "第一轮。"},
    )
    second = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "第二轮。"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["speaker_count"] == 1
    assert second.json()["speaker_count"] == 1
    assert first.json()["messages"][0]["character_id"] != second.json()["messages"][0]["character_id"]

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert history.status_code == 200
    assert history.json()["message_count"] == 4
    assert [message["role"] for message in history.json()["messages"]].count("assistant") == 2


def test_v1_group_chat_rules_backend_creates_memory_and_respects_silent_character(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, character_ids = _create_tavern(client)

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 2,
                "response_cooldown_seconds": 0,
                "require_name_prefix": False,
            },
            "character_talkativeness": {character_ids[1]: 0},
        },
    )
    assert saved.status_code == 200
    assert next(item for item in saved.json()["characters"] if item["id"] == character_ids[1])["talkativeness"] == 0.0

    chatted = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={
            "visitor_id": VISITOR_ID,
            "visitor_name": "测试旅人",
            "message": "你好，我喜欢蓝莓派，这是我的重要偏好。",
        },
    )
    assert chatted.status_code == 200
    payload = chatted.json()
    assert payload["degraded"] is False
    assert payload["speaker_count"] == 1
    assert payload["messages"][0]["character_id"] == character_ids[0]
    assert payload["messages"][0]["content"]
    assert payload["visitor_state"]["visitor_id"] == VISITOR_ID
    assert payload["visitor_state"]["relationship"]["strength"] > 0
    assert payload["created_memories"]
    assert any("蓝莓派" in memory["content"] for memory in payload["created_memories"])

    history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID, "limit": 10},
    )
    assert history.status_code == 200
    history_payload = history.json()
    assert history_payload["message_count"] == 2
    assert set(message["role"] for message in history_payload["messages"]) == {"user", "assistant"}
    assert [message["role"] for message in history_payload["messages"]].count("assistant") == 1

    memories = client.get(
        f"/api/v1/taverns/{tavern_id}/memories",
        headers={"X-User-Id": VISITOR_ID},
        params={"visitor_id": VISITOR_ID},
    )
    assert memories.status_code == 200
    assert any(
        memory["scope"] == "visitor_tavern" and "蓝莓派" in memory["content"]
        for memory in memories.json()["memories"]
    )
    assert client.app.state.taverns.store.get_token_usage(tavern_id) == 0


def test_v1_group_chat_rejects_cross_visitor_impersonation(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(client)
    victim_id = "victim-group-runtime"
    attacker_id = "attacker-group-runtime"

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {"strategy": "round_robin", "max_responses_per_turn": 1},
        },
    )
    assert saved.status_code == 200

    attacker_send = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": attacker_id},
        json={
            "visitor_id": victim_id,
            "visitor_name": "受害者",
            "message": "我想冒充别人。",
        },
    )
    assert attacker_send.status_code == 403

    victim_send = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": victim_id},
        json={
            "visitor_id": victim_id,
            "visitor_name": "受害者",
            "message": "你好，我是本人。",
        },
    )
    assert victim_send.status_code == 200
    assert victim_send.json()["speaker_count"] == 1

    attacker_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": attacker_id},
        params={"visitor_id": victim_id},
    )
    assert attacker_history.status_code == 403

    owner_history = client.get(
        f"/api/v1/taverns/{tavern_id}/group-chat/history",
        headers={"X-User-Id": OWNER_ID},
        params={"visitor_id": victim_id},
    )
    assert owner_history.status_code == 200
    assert owner_history.json()["message_count"] == 2


def test_v1_group_chat_response_cooldown_suppresses_recent_speakers(tmp_path: Path) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(client)

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 1,
                "response_cooldown_seconds": 30,
            },
        },
    )
    assert saved.status_code == 200

    first = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "旅人", "message": "第一轮。"},
    )
    second = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "旅人", "message": "第二轮。"},
    )
    third = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "旅人", "message": "第三轮。"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 200
    assert first.json()["messages"][0]["character_id"] != second.json()["messages"][0]["character_id"]
    assert third.json()["speaker_count"] == 0
    assert third.json()["degraded"] is True


def test_v1_group_chat_second_turn_prompt_keeps_previous_assistant_reply(
    tmp_path: Path,
    monkeypatch,
) -> None:
    client = _client(tmp_path)
    tavern_id, _ = _create_tavern(
        client,
        llm_config={"backend": "openai", "model": "gpt-test", "api_key": "sk-test-group-runtime"},
    )

    saved = client.put(
        f"/api/v1/taverns/{tavern_id}/group-chat/config",
        headers={"X-User-Id": OWNER_ID},
        json={
            "group_chat_enabled": True,
            "group_chat_config": {
                "strategy": "round_robin",
                "max_responses_per_turn": 1,
                "response_cooldown_seconds": 0,
                "require_name_prefix": True,
            },
        },
    )
    assert saved.status_code == 200

    captured_calls: list[list[dict[str, Any]]] = []

    class DummyClient:
        def complete(self, messages: list[dict[str, Any]]):
            captured_calls.append(messages)

            class DummyResponse:
                content = f"记住第 {len(captured_calls)} 轮群聊回应。"

            return DummyResponse()

    monkeypatch.setattr("fablemap_api.application.services.runtime.create_client", lambda cfg: DummyClient())

    first = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "先聊第一轮。"},
    )
    assert first.status_code == 200
    first_reply = first.json()["messages"][0]["content"]

    second = client.post(
        f"/api/v1/taverns/{tavern_id}/group-chat",
        headers={"X-User-Id": VISITOR_ID},
        json={"visitor_id": VISITOR_ID, "visitor_name": "运行时旅人", "message": "再聊第二轮。"},
    )
    assert second.status_code == 200

    assert len(captured_calls) >= 2
    second_prompt = "\n\n".join(
        str(message.get("content") or "")
        for message in captured_calls[-1]
        if isinstance(message, dict) and message.get("content")
    )
    assert first_reply in second_prompt
