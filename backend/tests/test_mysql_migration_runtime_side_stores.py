from __future__ import annotations

import json

from fablemap_api.infrastructure.database import Database
from fablemap_api.infrastructure.migrate import run_migration
from fablemap_api.infrastructure.models import (
    ChatMessageModel,
    HomeModel,
    HomeVisitModel,
    LLMConfigModel,
    OwnerConfigModel,
    StateCardModel,
    TavernModel,
    VisitorNoteModel,
    WritebackStateModel,
)


def _write_json(path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_migration_moves_legacy_runtime_files_into_database(tmp_path):
    output_root = tmp_path / "runtime"
    taverns_root = output_root / "taverns"
    tavern_id = "tavern_legacy"

    _write_json(
        taverns_root / "taverns.json",
        {
            tavern_id: {
                "id": tavern_id,
                "name": "旧文件酒馆",
                "description": "from json",
                "lat": 35.0,
                "lon": 139.0,
                "access": "public",
                "status": "open",
                "layout_style": "npc-chat",
                "place_type": "convenience-store",
                "llm_config": {
                    "backend": "rules",
                    "model": "rules",
                    "api_key": "",
                },
                "characters": [
                    {
                        "id": "char_delta",
                        "name": "社长 9-Delta",
                        "description": "外星社长",
                    }
                ],
                "world_info": [
                    {
                        "id": "wi_rules",
                        "keys": ["便利店"],
                        "content": "第三排货架后面。",
                    }
                ],
                "_visitors": {
                    "visitor_a": {
                        "visit_count": 2,
                        "relationship": {"strength": 0.4, "stage": "familiar"},
                    }
                },
                "_memory_atoms": {
                    "mem_a": {
                        "scope": "visitor",
                        "dimension": "preference",
                        "horizon": "long_term",
                        "subject": "visitor_a",
                        "content": "喜欢天气话题",
                    }
                },
                "_gameplay_sessions": {
                    "session_a": {
                        "gameplay_id": "gp_a",
                        "visitor_id": "visitor_a",
                        "state": "started",
                    }
                },
                "_state_cards": {
                    "card_weather": {
                        "category": "event_log",
                        "status": "pending",
                        "canon_scope": "visitor",
                        "visitor_id": "visitor_a",
                        "title": "天气话题",
                    }
                },
            }
        },
    )
    _write_json(
        taverns_root / "taverns_keyvault.json",
        {
            tavern_id: {
                "backend": "openai",
                "model": "gpt-4o-mini",
                "api_key": "sk-private",
                "base_url": "https://example.invalid/v1",
            }
        },
    )
    chat_file = taverns_root / "chat_history" / tavern_id / "visitor_a_char_delta.jsonl"
    chat_file.parent.mkdir(parents=True, exist_ok=True)
    chat_file.write_text(
        json.dumps(
            {
                "id": "msg_a",
                "role": "user",
                "content": "天气怎么样",
                "timestamp": "2026-05-06T00:00:00Z",
            },
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    _write_json(
        output_root / "owner_configs.json",
        {
            "owner_a": {
                "default_llm": {
                    "backend": "openai",
                    "model": "gpt-4o-mini",
                    "api_key": "sk-owner",
                }
            }
        },
    )
    _write_json(
        output_root / "visitor_notes.json",
        {
            tavern_id: [
                {
                    "id": "note_a",
                    "visitor_id": "visitor_a",
                    "visitor_nickname": "旅人",
                    "content": "下次还来",
                }
            ]
        },
    )
    _write_json(
        output_root / "homes" / "homes.json",
        {
            "home_a": {
                "id": "home_a",
                "owner_id": "owner_a",
                "name": "旧 Home",
                "members": [{"id": "mem_a", "name": "台灯"}],
            }
        },
    )
    _write_json(
        output_root / "homes" / "visits.json",
        {
            "home_a": [
                {
                    "id": "visit_a",
                    "visitor_id": "visitor_a",
                    "left_message": "来过",
                }
            ]
        },
    )
    _write_json(
        output_root / "writeback" / "writeback-state.json",
        {
            "players": {"visitor_a": {"state": {"mood": "curious"}}},
            "slices": {},
        },
    )

    db_url = f"sqlite:///{(tmp_path / 'fablemap.sqlite3').as_posix()}"

    summary = run_migration(None, db_url, output_root=str(output_root))
    # Re-run to prove the migration is safe for targeted backfill and does not
    # duplicate runtime side-store rows.
    run_migration(str(taverns_root), db_url, output_root=str(output_root))

    db = Database(db_url)
    try:
        with db.session_scope() as session:
            tavern = session.query(TavernModel).filter_by(id=tavern_id).one()
            assert tavern.name == "旧文件酒馆"
            assert tavern.layout_style == "npc-chat"
            assert tavern.place_type == "convenience-store"

            llm = session.query(LLMConfigModel).filter_by(tavern_id=tavern_id).one()
            assert llm.backend == "openai"
            assert llm.api_key == "sk-private"

            assert session.query(ChatMessageModel).filter_by(id="msg_a").count() == 1
            assert session.query(StateCardModel).filter_by(tavern_id=tavern_id, id="card_weather").count() == 1
            assert session.query(OwnerConfigModel).filter_by(owner_id="owner_a").count() == 1
            assert session.query(VisitorNoteModel).filter_by(id="note_a").count() == 1
            assert session.query(HomeModel).filter_by(id="home_a").count() == 1
            assert session.query(HomeVisitModel).filter_by(id="visit_a").count() == 1
            writeback = session.query(WritebackStateModel).filter_by(key="default").one()
            assert writeback.state["players"]["visitor_a"]["state"]["mood"] == "curious"

            assert session.query(ChatMessageModel).filter_by(id="msg_a").count() == 1
            assert session.query(VisitorNoteModel).filter_by(id="note_a").count() == 1
    finally:
        db.dispose()

    assert summary["taverns"] == 1
    assert summary["owner_configs"] == 1
    assert summary["visitor_notes"] == 1
    assert summary["homes"] == 1
    assert summary["home_visits"] == 1
    assert summary["writeback_states"] == 1
