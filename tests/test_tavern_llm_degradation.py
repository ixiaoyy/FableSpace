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


def test_llm_failure_returns_degradation_payload_and_closes_tavern(monkeypatch):
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
        assert payload["tavern_status"] == "closed"
        assert payload["response"]
        assert service.tavern_store.get_tavern(tavern.id).status == "closed"

        history = service.tavern_store.get_chat_history(tavern.id, "visitor_degrade", "char_degrade")
        assert [message.role for message in history] == ["user", "assistant"]


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


def test_rules_backend_returns_explicit_rules_response_mode():
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

        assert payload["degraded"] is False
        assert payload["response_mode"]["kind"] == "built_in_rules"
        assert payload["response_mode"]["requires_owner_llm"] is False
        assert "规则模式" in payload["response_mode"]["label"]
        assert "system_prompt" not in payload["response"]
        assert "scene_prompt" not in payload["response"]


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
