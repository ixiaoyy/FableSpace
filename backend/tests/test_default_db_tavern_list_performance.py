from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import event

from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("FABLEMAP_SEED_DEFAULT_TAVERNS", "0")
    return TestClient(
        create_app(
            ApiSettings(
                output_root=tmp_path / "api",
                fixture_file=None,
                frontend_root=None,
                storage_backend="database",
                database_url="",
                mysql_url="",
            )
        )
    )


def _seed_taverns(client: TestClient, count: int = 12) -> None:
    for index in range(count):
        tavern_id = f"perf-tavern-{index}"
        created = client.post(
            "/api/v1/taverns",
            headers={"X-User-Id": "owner-perf"},
            json={
                "id": tavern_id,
                "name": f"性能空间 {index}",
                "description": "用于默认数据库列表性能测试。",
                "lat": 31.23 + index * 0.001,
                "lon": 121.47 + index * 0.001,
                "access": "public",
                "status": "open",
                "llm_config": {"backend": "rules", "model": "rules"},
            },
        )
        assert created.status_code == 200, created.text
        for character_index in range(2):
            character = client.post(
                f"/api/v1/taverns/{tavern_id}/characters",
                headers={"X-User-Id": "owner-perf"},
                json={"id": f"char-{index}-{character_index}", "name": f"角色 {index}-{character_index}"},
            )
            assert character.status_code == 200, character.text


def test_default_database_tavern_list_avoids_token_usage_n_plus_one(tmp_path: Path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    _seed_taverns(client, 12)

    engine = client.app.state.taverns.store._session().engine
    statements: list[str] = []

    def before_cursor_execute(_conn, _cursor, statement, _parameters, _context, _executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        response = client.get("/api/v1/taverns", params={"limit": 12})
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["count"] == 12
    assert all(len(tavern.get("characters", [])) == 2 for tavern in payload["taverns"])
    # Prior behavior queried token usage per tavern; this contract keeps the
    # default DB list path bounded to the tavern query plus eager-loaded child
    # collections and avoids per-row token usage lookups.
    assert len(statements) <= 6
