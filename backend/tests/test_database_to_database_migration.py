from __future__ import annotations

from pathlib import Path

from fablemap_api.infrastructure.database import Database
from fablemap_api.infrastructure.migrate_database import run_database_migration
from fablemap_api.infrastructure.models import ChatMessageModel, MemoryAtomModel, TavernModel
from fablemap_api.infrastructure.mysql_store import create_mysql_tables


def _sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.resolve().as_posix()}"


def test_database_migration_upserts_runtime_tables(tmp_path: Path) -> None:
    source_url = _sqlite_url(tmp_path / "source.sqlite3")
    target_url = _sqlite_url(tmp_path / "target.sqlite3")

    source = Database(source_url)
    target = Database(target_url)
    try:
        create_mysql_tables(source)
        create_mysql_tables(target)

        with source.session_scope() as session:
            session.add(
                TavernModel(
                    id="tavern_a",
                    name="测试空间",
                    lat=31.2,
                    lon=121.5,
                    owner_id="owner_a",
                    status="open",
                )
            )
            session.add(
                ChatMessageModel(
                    id="msg_a",
                    tavern_id="tavern_a",
                    character_id="char_a",
                    visitor_id="visitor_a",
                    role="user",
                    content="你好",
                )
            )
            session.add(
                MemoryAtomModel(
                    id="mem_a",
                    tavern_id="tavern_a",
                    scope="visitor_tavern",
                    dimension="fact",
                    horizon="long",
                    content="访客喜欢安静角落",
                    visitor_id="visitor_a",
                )
            )

        summary = run_database_migration(source_url, target_url, create_database=False)

        assert summary["totals"]["source"] >= 3
        assert summary["tables"]["taverns"]["inserted"] == 1
        assert summary["tables"]["chat_messages"]["inserted"] == 1
        assert summary["tables"]["memory_atoms"]["inserted"] == 1

        with target.session_scope() as session:
            assert session.query(TavernModel).filter_by(id="tavern_a").one().name == "测试空间"
            assert session.query(ChatMessageModel).filter_by(id="msg_a").one().content == "你好"
            assert session.query(MemoryAtomModel).filter_by(id="mem_a").one().visitor_id == "visitor_a"

        with source.session_scope() as session:
            session.query(TavernModel).filter_by(id="tavern_a").one().name = "测试空间更新"

        second_summary = run_database_migration(source_url, target_url, create_database=False)
        assert second_summary["tables"]["taverns"]["updated"] == 1
        with target.session_scope() as session:
            assert session.query(TavernModel).filter_by(id="tavern_a").one().name == "测试空间更新"
    finally:
        source.dispose()
        target.dispose()
