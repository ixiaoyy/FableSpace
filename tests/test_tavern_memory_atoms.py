from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from fablemap.memory import MemoryAtom, auto_create_memories_from_chat, select_memory_atoms_for_prompt


def test_memory_atom_normalizes_payload_defaults():
    atom = MemoryAtom.from_dict(
        {
            "id": "mem_x",
            "tavern_id": "tavern_x",
            "scope": "unknown",
            "dimension": "bad",
            "horizon": "forever",
            "visibility": "secret",
            "content": "Visitor likes jasmine tea.",
            "importance": "2.5",
            "confidence": "-1",
            "source_message_ids": "msg_1,msg_2",
        }
    )

    assert atom.scope == "visitor_tavern"
    assert atom.dimension == "fact"
    assert atom.horizon == "short"
    assert atom.visibility == "private"
    assert atom.importance == 1.0
    assert atom.confidence == 0.0
    assert atom.source_message_ids == ["msg_1", "msg_2"]


def test_memory_atoms_crud_filters_and_private_visibility():
    from fastapi import HTTPException
    from fablemap.web.config import ApiSettings
    from fablemap.web.service import WebService

    with TemporaryDirectory() as tmpdir:
        service = WebService(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        owner_id = "owner_memory_atoms"
        alpha_id = "visitor_alpha"
        beta_id = "visitor_beta"

        tavern = service.create_tavern_payload(
            {
                "id": "tavern_memory_atoms",
                "name": "Memory Atom Tavern",
                "description": "A tavern for structured memory tests.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id=owner_id,
        )
        tavern_id = tavern["id"]

        service.add_character_payload(tavern_id, {"id": "char_keeper", "name": "Keeper"}, owner_id)

        private_atom = service.create_memory_atom_payload(
            tavern_id,
            {
                "scope": "visitor_character",
                "dimension": "preference",
                "horizon": "long",
                "subject": alpha_id,
                "character_id": "char_keeper",
                "content": "Alpha likes jasmine tea.",
                "importance": 0.9,
                "confidence": 0.8,
                "source_message_ids": ["msg_alpha_1"],
                "visibility": "private",
            },
            alpha_id,
        )["memory_atom"]
        private_id = private_atom["id"]
        assert private_atom["visitor_id"] == alpha_id

        alpha_list = service.list_memory_atoms_payload(
            tavern_id,
            alpha_id,
            dimension="preference",
            horizon="long",
        )
        assert alpha_list["count"] == 1
        assert alpha_list["memory_atoms"][0]["id"] == private_id

        owner_list = service.list_memory_atoms_payload(tavern_id, owner_id)
        assert owner_list["count"] == 0

        beta_list = service.list_memory_atoms_payload(tavern_id, beta_id)
        assert beta_list["count"] == 0

        with pytest.raises(HTTPException) as forbidden_private_create:
            service.create_memory_atom_payload(
                tavern_id,
                {
                    "scope": "visitor_tavern",
                    "subject": beta_id,
                    "content": "This should not be allowed.",
                    "visibility": "private",
                },
                alpha_id,
            )
        assert forbidden_private_create.value.status_code == 403

        with pytest.raises(HTTPException) as forbidden_owner_update:
            service.update_memory_atom_payload(
                tavern_id,
                private_id,
                {"content": "Owner should not edit private visitor memory."},
                owner_id,
            )
        assert forbidden_owner_update.value.status_code == 403

        with pytest.raises(HTTPException) as forbidden_beta_update:
            service.update_memory_atom_payload(
                tavern_id,
                private_id,
                {"content": "Beta should not edit Alpha memory."},
                beta_id,
            )
        assert forbidden_beta_update.value.status_code == 403

        updated_private = service.update_memory_atom_payload(
            tavern_id,
            private_id,
            {"content": "Alpha likes jasmine tea and quiet corners.", "pinned": True},
            alpha_id,
        )["memory_atom"]
        assert updated_private["pinned"] is True
        assert "quiet corners" in updated_private["content"]

        service.create_memory_atom_payload(
            tavern_id,
            {
                "scope": "visitor_tavern",
                "dimension": "event",
                "horizon": "mid",
                "subject": alpha_id,
                "visitor_id": alpha_id,
                "content": "Owner-visible note about Alpha's first return visit.",
                "visibility": "owner",
            },
            owner_id,
        )

        service.create_memory_atom_payload(
            tavern_id,
            {
                "scope": "tavern_public",
                "dimension": "fact",
                "horizon": "long",
                "subject": tavern_id,
                "content": "The back room clock always runs five minutes slow.",
                "visibility": "public",
            },
            owner_id,
        )

        owner_visible = service.list_memory_atoms_payload(tavern_id, owner_id)
        owner_contents = [item["content"] for item in owner_visible["memory_atoms"]]
        assert "Alpha likes jasmine tea and quiet corners." not in owner_contents
        assert any("Owner-visible note" in content for content in owner_contents)
        assert any("clock always runs" in content for content in owner_contents)

        anonymous_public = service.list_memory_atoms_payload(
            tavern_id,
            visibility="public",
        )
        assert anonymous_public["count"] == 1
        assert "clock always runs" in anonymous_public["memory_atoms"][0]["content"]

        deleted = service.delete_memory_atom_payload(tavern_id, private_id, alpha_id)
        assert deleted["ok"] is True

        alpha_after_delete = service.list_memory_atoms_payload(
            tavern_id,
            alpha_id,
            visitor_id=alpha_id,
        )
        remaining_ids = [item["id"] for item in alpha_after_delete["memory_atoms"]]
        assert private_id not in remaining_ids


def test_auto_memory_pipeline_extracts_scores_and_merges():
    from fablemap.web.config import ApiSettings
    from fablemap.web.service import WebService

    with TemporaryDirectory() as tmpdir:
        service = WebService(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        owner_id = "owner_auto_memory"
        visitor_id = "visitor_auto_memory"
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_auto_memory",
                "name": "Auto Memory Tavern",
                "description": "A tavern for auto memory tests.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id=owner_id,
        )
        tavern_id = tavern["id"]
        character = service.add_character_payload(
            tavern_id,
            {"id": "char_keeper", "name": "Keeper"},
            owner_id,
        )

        created = auto_create_memories_from_chat(
            service.tavern_store,
            tavern_id,
            visitor_id,
            character["id"],
            character["name"],
            "我喜欢茉莉茶。昨天我在桥边遇见了旧朋友。",
            "我一定会记住这件事。",
            user_message_id="msg_user_1",
            assistant_message_id="msg_assistant_1",
            importance_threshold=0.5,
        )

        assert len(created) == 3
        dimensions = {atom.dimension for atom in created}
        assert {"preference", "event", "promise"}.issubset(dimensions)
        assert all(atom.visibility == "private" for atom in created)
        assert all(atom.visitor_id == visitor_id for atom in created)

        auto_create_memories_from_chat(
            service.tavern_store,
            tavern_id,
            visitor_id,
            character["id"],
            character["name"],
            "我喜欢茉莉茶。",
            "",
            user_message_id="msg_user_2",
            importance_threshold=0.5,
        )

        stored = service.tavern_store.list_memory_atoms(tavern_id)
        assert len(stored) == 3
        preference = next(atom for atom in stored if atom.dimension == "preference")
        assert preference.metadata["hit_count"] == 2
        assert preference.source_message_ids == ["msg_user_1", "msg_user_2"]


def test_select_memory_atoms_for_prompt_prioritizes_pin_horizon_relevance_and_flags():
    atoms = [
        MemoryAtom(
            id="mem_short",
            tavern_id="tavern_prompt_memory",
            scope="visitor_character",
            dimension="preference",
            horizon="short",
            content="访客喜欢茉莉茶。",
            importance=0.6,
            confidence=0.8,
            visitor_id="visitor_alpha",
            character_id="char_keeper",
        ),
        MemoryAtom(
            id="mem_pinned",
            tavern_id="tavern_prompt_memory",
            scope="visitor_tavern",
            dimension="promise",
            horizon="short",
            content="Keeper promised to keep a window seat for the visitor.",
            importance=0.55,
            confidence=0.7,
            pinned=True,
            visitor_id="visitor_alpha",
            character_id="char_other",
        ),
        MemoryAtom(
            id="mem_long",
            tavern_id="tavern_prompt_memory",
            scope="visitor_character",
            dimension="event",
            horizon="long",
            content="访客昨天在桥边遇见旧朋友。",
            importance=0.9,
            confidence=0.9,
            visitor_id="visitor_alpha",
            character_id="char_keeper",
        ),
        MemoryAtom(
            id="mem_wrong",
            tavern_id="tavern_prompt_memory",
            scope="visitor_character",
            dimension="fact",
            horizon="long",
            content="这条记忆已经被标错。",
            importance=1.0,
            confidence=1.0,
            visitor_id="visitor_alpha",
            character_id="char_keeper",
            metadata={"flagged_wrong": True},
        ),
    ]

    selected = select_memory_atoms_for_prompt(
        atoms,
        visitor_id="visitor_alpha",
        character_id="char_keeper",
        current_message="还记得茉莉茶和桥边的事吗？",
        budget_tokens=120,
    )

    assert [atom.id for atom in selected][:3] == ["mem_pinned", "mem_long", "mem_short"]
    assert "mem_wrong" not in [atom.id for atom in selected]


def test_structured_memory_is_injected_into_chat_prompt(monkeypatch):
    from fablemap.tavern import LLMConfig
    from fablemap.web.config import ApiSettings
    from fablemap.web.service import WebService

    with TemporaryDirectory() as tmpdir:
        service = WebService(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        owner_id = "owner_prompt_memory"
        visitor_id = "visitor_prompt_memory"
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_prompt_memory",
                "name": "Prompt Memory Tavern",
                "description": "A tavern for prompt memory tests.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id=owner_id,
        )
        tavern_id = tavern["id"]
        service.update_tavern_payload(
            tavern_id,
            {
                "status": "open",
                "memory_policy": {
                    "mode": "balanced",
                    "short_term": True,
                    "mid_term": True,
                    "long_term": True,
                    "budget_tokens": 800,
                },
            },
            owner_id,
        )
        character = service.add_character_payload(
            tavern_id,
            {"id": "char_keeper", "name": "Keeper", "first_mes": "欢迎回来。"},
            owner_id,
        )
        service.tavern_store.save_llm_config(
            tavern_id,
            LLMConfig(backend="openai", model="gpt-4o-mini", api_key="sk-test"),
        )
        service.create_memory_atom_payload(
            tavern_id,
            {
                "scope": "visitor_character",
                "dimension": "preference",
                "horizon": "long",
                "subject": visitor_id,
                "visitor_id": visitor_id,
                "character_id": character["id"],
                "content": "访客喜欢茉莉茶，尤其是靠窗座位。",
                "importance": 0.9,
                "visibility": "private",
            },
            visitor_id,
        )

        captured = {}

        class Response:
            content = "茉莉茶和靠窗座位，都给你留着。"
            usage = {"total_tokens": 13}

        class CapturingClient:
            def complete(self, messages):
                captured["messages"] = messages
                return Response()

        monkeypatch.setattr("fablemap.web.service.create_client", lambda config: CapturingClient())

        payload = service.tavern_chat_payload(
            tavern_id=tavern_id,
            character_id=character["id"],
            message="我回来了，想坐老位置。",
            visitor_id=visitor_id,
            visitor_name="阿航",
        )

        prompt_text = "\n\n".join(message.get("content", "") for message in captured["messages"])
        assert payload["degraded"] is False
        assert "当前访客结构化记忆" in prompt_text
        assert "访客喜欢茉莉茶" in prompt_text
        assert "created_memories" in payload
