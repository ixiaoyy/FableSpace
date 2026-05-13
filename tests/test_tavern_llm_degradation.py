from pathlib import Path
from tempfile import TemporaryDirectory

from fablemap_api.core.llm_clients import LLMError
from fablemap_api.core.tavern import ChatMessage, LLMConfig, Tavern, TavernCharacter, VisitorState
from fablemap_api.core.web.config import ApiSettings
from fablemap_api.core.web.service import WebService


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def _create_open_tavern(service: WebService) -> Tavern:
    tavern = Tavern(
        id="tavern_degrade",
        name="Degrade Test Tavern",
        description="A tavern for LLM degradation checks.",
        lat=31.23,
        lon=121.47,
        owner_id="owner_degrade",
        status="open",
        characters=[
            TavernCharacter(
                id="char_degrade",
                tavern_id="tavern_degrade",
                name="Mira",
                first_mes="欢迎光临。",
            )
        ],
    )
    service.tavern_store.create_tavern(tavern)
    return tavern


def test_llm_failure_returns_degradation_payload_without_local_npc_reply(monkeypatch):
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )

        class BrokenClient:
            def complete(self, messages):
                raise LLMError("upstream timeout")

        monkeypatch.setattr("fablemap_api.core.web.service.create_client", lambda config: BrokenClient())

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="你好",
            visitor_id="visitor_degrade",
        )

        assert payload["degraded"] is True
        assert payload["degradation"]["reason"] == "llm_error"
        assert payload["degradation"]["technical_detail"] == "upstream timeout"
        assert payload["tavern_status"] == "open"
        assert payload["response"] == ""
        assert payload["response_mode"]["kind"] == "llm_unavailable"
        assert service.tavern_store.get_tavern(tavern.id).status == "open"

        history = service.tavern_store.get_chat_history(tavern.id, "visitor_degrade", "char_degrade")
        assert history == []


def test_missing_llm_config_returns_friendly_degradation_and_closes_tavern():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="你好",
            visitor_id="visitor_degrade",
        )

        assert payload["degraded"] is True
        assert payload["degradation"]["reason"] == "llm_not_configured"
        assert payload["response_mode"]["kind"] == "llm_not_configured"
        assert payload["response_mode"]["requires_owner_llm"] is True
        assert payload["tavern_status"] == "closed"
        assert service.tavern_store.get_tavern(tavern.id).status == "closed"


def test_rules_backend_is_not_treated_as_npc_llm():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="rules", model="local-rules", api_key=""),
        )

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="你好",
            visitor_id="visitor_rules",
        )

        assert payload["degraded"] is True
        assert payload["response"] == ""
        assert payload["response_mode"]["kind"] == "llm_not_configured"
        assert payload["response_mode"]["requires_owner_llm"] is True
        assert "配置" in payload["response_mode"]["message"]


def test_visitor_name_is_used_in_prompt_and_persisted(monkeypatch):
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )

        captured = {}

        class Response:
            content = "欢迎回来，Mina。"
            usage = {"total_tokens": 7}

        class CapturingClient:
            def complete(self, messages):
                captured["messages"] = messages
                return Response()

        monkeypatch.setattr("fablemap_api.core.web.service.create_client", lambda config: CapturingClient())

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="还记得我的名字吗？",
            visitor_id="visitor_degrade",
            visitor_name="Mina",
        )

        assert payload["degraded"] is False
        assert payload["visitor_state"]["visitor_id"] == "visitor_degrade"
        assert payload["visitor_state"]["relationship"]["strength"] > 0
        assert any("当前访客称呼" in m.get("content", "") and "Mina" in m.get("content", "") for m in captured["messages"])

        history = service.tavern_store.get_chat_history(tavern.id, "visitor_degrade", "char_degrade")
        assert [message.visitor_name for message in history] == ["Mina", "Mina"]


def test_core_web_prompt_injects_npc_identity_and_voice_contract(monkeypatch):
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        character = tavern.characters[0]
        character.description = "雾港旧店的失物看守人，专门替回访者保管旧车票。"
        character.personality = "慢热、低声、会先确认访客是否迷路。"
        character.scenario = "Mira 正在柜台后整理雨夜失物。"
        character.system_prompt = "只以失物看守人的身份回应。"
        character.mes_example = "Mira把车票夹回本子：先别急，你要找哪一段路？"
        character.tags = ["失物看守人", "旧车票"]
        character.traits = ["慢热", "低声"]
        service.tavern_store.update_tavern(tavern)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )

        captured = {}

        class Response:
            content = "我在，先说你要找哪张车票。"
            usage = {"total_tokens": 8}

        class CapturingClient:
            def complete(self, messages):
                captured["messages"] = messages
                return Response()

        monkeypatch.setattr("fablemap_api.core.web.service.create_client", lambda config: CapturingClient())

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="你是谁？",
            visitor_id="visitor_voice",
            visitor_name="Mina",
        )

        assert payload["degraded"] is False
        system_text = "\n".join(m.get("content", "") for m in captured["messages"] if m.get("role") == "system")
        assert "【NPC身份与口吻底线】" in system_text
        assert "你现在只能作为「Mira」回应" in system_text
        assert "失物看守人" in system_text
        assert "慢热、低声" in system_text
        assert "不要自称 AI" in system_text


def test_display_message_is_persisted_while_full_prompt_reaches_llm(monkeypatch):
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )

        captured = {}

        class Response:
            content = "我来主持，先给你三个安全选项。"
            usage = {"total_tokens": 9}

        class CapturingClient:
            def complete(self, messages):
                captured["messages"] = messages
                return Response()

        monkeypatch.setattr("fablemap_api.core.web.service.create_client", lambda config: CapturingClient())

        hidden_prompt = "我想和你玩一局《线索调查》。\n请按内部主持规则开局。"
        display_message = "开始《线索调查》：请直接开局。"
        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message=hidden_prompt,
            display_message=display_message,
            visitor_id="visitor_display",
        )

        assert payload["degraded"] is False
        assert any(hidden_prompt in m.get("content", "") for m in captured["messages"])

        history = service.tavern_store.get_chat_history(tavern.id, "visitor_display", "char_degrade")
        assert history[0].role == "user"
        assert history[0].content == display_message
        assert hidden_prompt not in history[0].content


def test_visitor_relationship_state_is_used_in_prompt(monkeypatch):
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_open_tavern(service)
        service.tavern_store.save_llm_config(
            tavern.id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )
        service.tavern_store.update_visitor_state(
            tavern.id,
            VisitorState(
                visitor_id="visitor_degrade",
                tavern_id=tavern.id,
                visit_count=4,
                first_visit="2026-04-16T10:00:00Z",
                last_visit="2026-04-17T09:30:00Z",
                relationship_strength=0.52,
                relationship_stage="regular",
            ),
        )
        service.tavern_store.add_chat_message(
            ChatMessage(
                id="msg_old_relationship_context",
                tavern_id=tavern.id,
                character_id="char_degrade",
                visitor_id="visitor_degrade",
                visitor_name="Mina",
                role="user",
                content="昨天我说过我喜欢靠窗的位置。",
                timestamp="2026-04-16T10:05:00Z",
            )
        )

        captured = {}

        class Response:
            content = "当然，Mina。靠窗的位置还给你留着。"
            usage = {"total_tokens": 11}

        class CapturingClient:
            def complete(self, messages):
                captured["messages"] = messages
                return Response()

        monkeypatch.setattr("fablemap_api.core.web.service.create_client", lambda config: CapturingClient())

        payload = service.tavern_chat_payload(
            tavern_id=tavern.id,
            character_id="char_degrade",
            message="我回来啦。",
            visitor_id="visitor_degrade",
            visitor_name="Mina",
        )

        assert payload["degraded"] is False
        relationship_contexts = [
            m.get("content", "")
            for m in captured["messages"]
            if "当前访客关系状态" in m.get("content", "")
        ]
        assert relationship_contexts
        assert "关系阶段=常客" in relationship_contexts[0]
        assert "到访次数=4" in relationship_contexts[0]
        assert "历史消息数=1" in relationship_contexts[0]
        assert "关系强度=52%" in relationship_contexts[0]
