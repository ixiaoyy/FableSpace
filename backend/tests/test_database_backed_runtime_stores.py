from __future__ import annotations

import asyncio
from pathlib import Path

from fablemap_api.core.notifications import SQLAlchemyNotificationStore
from fablemap_api.core.rumor import NeighborhoodRumor, SQLAlchemyRumorStore
from fablemap_api.core.writeback import SQLAlchemyWritebackStore, WritebackEngine
from fablemap_api.infrastructure.home_store import SQLAlchemyHomeStore
from fablemap_api.infrastructure.owner_config_store import SQLAlchemyOwnerConfigStore
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.infrastructure.storage import (
    create_owner_config_store,
    create_tavern_store,
    create_visitor_note_store,
    store_database,
)
from fablemap_api.infrastructure.visitor_note_store import SQLAlchemyVisitorNoteStore


def _database_settings(tmp_path: Path) -> ApiSettings:
    return ApiSettings(
        output_root=tmp_path,
        fixture_file=None,
        frontend_root=None,
        storage_backend="database",
        database_url="",
        mysql_url="",
    )


def test_database_backend_is_default_sqlite_store(tmp_path: Path) -> None:
    settings = _database_settings(tmp_path)
    store = create_tavern_store(settings)

    assert type(store).__name__ == "MySQLTavernStore"
    assert store_database(store) is not None
    assert (tmp_path / "fablemap.sqlite3").exists()
    assert not (tmp_path / "taverns").exists()


def test_runtime_side_stores_persist_in_database(tmp_path: Path) -> None:
    settings = _database_settings(tmp_path)
    tavern_store = create_tavern_store(settings)
    db = store_database(tavern_store)
    assert db is not None

    owner_store = create_owner_config_store(settings, tavern_store)
    assert isinstance(owner_store, SQLAlchemyOwnerConfigStore)
    owner_store.save_default_llm_config(
        "owner_a",
        {"backend": "openai", "model": "gpt-test", "base_url": "http://127.0.0.1:8000"},
    )
    owner_store_reloaded = SQLAlchemyOwnerConfigStore(db)
    owner_config = owner_store_reloaded.get_default_llm_config("owner_a")
    assert owner_config["backend"] == "openai"
    assert owner_config["base_url"] == "http://127.0.0.1:8000"

    note_store = create_visitor_note_store(settings, tavern_store)
    assert isinstance(note_store, SQLAlchemyVisitorNoteStore)
    note = note_store.create_note("tavern_a", "visitor_a", {"visitor_nickname": "旅人A", "content": "下次再来"})
    notes, total = SQLAlchemyVisitorNoteStore(db).list_notes("tavern_a")
    assert total == 1
    assert notes[0]["id"] == note["id"]
    assert notes[0]["content"] == "下次再来"

    async def notification_roundtrip() -> None:
        notifications = SQLAlchemyNotificationStore(db)
        created = await notifications.add_notification(
            "owner_a",
            "new_visitor",
            "新访客进入",
            "旅人A 进入了你的酒馆",
            {"tavern_id": "tavern_a"},
            tavern_id="tavern_a",
            tavern_name="测试酒馆",
        )
        reloaded = SQLAlchemyNotificationStore(db)
        rows, total_count, unread_count = await reloaded.get_notifications("owner_a")
        assert total_count == 1
        assert unread_count == 1
        assert rows[0]["id"] == created.id
        assert await reloaded.mark_as_read("owner_a", created.id) is True
        assert await SQLAlchemyNotificationStore(db).get_unread_count("owner_a") == 0

    asyncio.run(notification_roundtrip())

    rumor_store = SQLAlchemyRumorStore(db)
    rumor = NeighborhoodRumor.create(
        source_tavern_id="source_tavern",
        target_tavern_id="target_tavern",
        target_tavern_name="目标酒馆",
        character_id="npc_a",
        character_name="NPC A",
        rumor_text="听说目标酒馆今天很热闹。",
        trigger_keywords=["热闹"],
    )
    rumor_store.add(rumor)
    assert SQLAlchemyRumorStore(db).get(rumor.id).rumor_text == "听说目标酒馆今天很热闹。"

    home_store = SQLAlchemyHomeStore(db)
    home = home_store.create_home("owner_a", "Owner 的空间", visit_settings={"public": True})
    home_store.add_member(home.id, {"name": "展示物", "member_type": "display_object"})
    home_store.record_visit(home.id, "visitor_a", stay_duration=12)
    reloaded_home_store = SQLAlchemyHomeStore(db)
    reloaded_home = reloaded_home_store.get_home(home.id)
    assert reloaded_home is not None
    assert reloaded_home.name == "Owner 的空间"
    assert len(reloaded_home.members) == 1
    assert reloaded_home_store.get_visits(home.id)[0].visitor_id == "visitor_a"

    writeback = WritebackEngine(SQLAlchemyWritebackStore(db))
    payload = writeback.process_event({
        "event_type": "observe",
        "player_id": "visitor_a",
        "target": {"target_type": "poi", "target_id": "poi_a", "slice_id": "slice_a"},
        "payload": {"intensity": 2},
    })
    assert payload["persistence"]["storage"] == "database"
    state = SQLAlchemyWritebackStore(db).load()
    assert state["events"][0]["player_id"] == "visitor_a"
