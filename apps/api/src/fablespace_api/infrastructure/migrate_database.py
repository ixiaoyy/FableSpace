"""Copy runtime data from one SQLAlchemy database to another.

This is intentionally a non-destructive migrator: it creates the target schema
when needed and upserts rows by primary key, but it never drops target tables or
deletes target-only rows.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import and_, create_engine, func, inspect, select, text
from sqlalchemy.engine import Engine, make_url

from fablespace_api.infrastructure.database import Base, Database
from fablespace_api.infrastructure.env import DEFAULT_ENV_FILE, parse_env_file
from fablespace_api.infrastructure.mysql_space_store import create_mysql_tables
from fablespace_api.infrastructure.storage import redact_database_url


DEFAULT_SOURCE_SQLITE = Path(".fablespace-api") / "fablespace.sqlite3"


def _resolve_target_url(explicit_url: str = "", *, env_file: Path = DEFAULT_ENV_FILE) -> str:
    env_values = parse_env_file(env_file)
    return (
        explicit_url.strip()
        or env_values.get("FABLESPACE_DATABASE_URL", "").strip()
        or os.environ.get("FABLESPACE_DATABASE_URL", "").strip()
        or env_values.get("FABLEMAP_DATABASE_URL", "").strip()
        or os.environ.get("FABLEMAP_DATABASE_URL", "").strip()
        or env_values.get("FABLESPACE_MYSQL_URL", "").strip()
        or os.environ.get("FABLESPACE_MYSQL_URL", "").strip()
        or env_values.get("FABLEMAP_MYSQL_URL", "").strip()
        or os.environ.get("FABLEMAP_MYSQL_URL", "").strip()
    )


def _sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.resolve().as_posix()}"


def _is_mysql_url(database_url: str) -> bool:
    return make_url(database_url).drivername.lower().startswith("mysql")


def _quote_mysql_identifier(identifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_$]+", identifier or ""):
        raise ValueError(f"不安全的 MySQL database 名称: {identifier!r}")
    return f"`{identifier}`"


def ensure_mysql_database_exists(database_url: str) -> bool:
    """Create the target MySQL database if it is missing.

    Returns True if a CREATE DATABASE statement was issued. Non-MySQL URLs are
    ignored because SQLite/PostgreSQL creation semantics differ.
    """

    url = make_url(database_url)
    if not url.drivername.lower().startswith("mysql"):
        return False
    if not url.database:
        return False

    database_name = str(url.database)
    server_url = url.set(database="")
    engine = create_engine(server_url, pool_pre_ping=True)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE DATABASE IF NOT EXISTS "
                    f"{_quote_mysql_identifier(database_name)} "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
        return True
    finally:
        engine.dispose()


def _table_exists(engine: Engine, table_name: str) -> bool:
    return bool(inspect(engine).has_table(table_name))


def _where_primary_key(table: Any, row: dict[str, Any]) -> Any:
    clauses = []
    for column in table.primary_key.columns:
        clauses.append(column == row[column.name])
    return and_(*clauses)


def _copy_table(source: Engine, target: Engine, table: Any, *, dry_run: bool = False) -> dict[str, int]:
    if not _table_exists(source, table.name):
        return {"source": 0, "inserted": 0, "updated": 0, "skipped": 0}

    primary_key_columns = list(table.primary_key.columns)
    if not primary_key_columns:
        return {"source": 0, "inserted": 0, "updated": 0, "skipped": 0}

    with source.connect() as source_conn:
        source_count = int(source_conn.execute(select(func.count()).select_from(table)).scalar() or 0)
        rows = [dict(row) for row in source_conn.execute(select(table)).mappings()]

    inserted = 0
    updated = 0
    skipped = 0
    column_names = {column.name for column in table.columns}

    if dry_run:
        return {"source": source_count, "inserted": 0, "updated": 0, "skipped": 0}

    with target.begin() as target_conn:
        for source_row in rows:
            row = {key: value for key, value in source_row.items() if key in column_names}
            if any(row.get(column.name) is None for column in primary_key_columns):
                skipped += 1
                continue

            exists = target_conn.execute(
                select(*primary_key_columns).where(_where_primary_key(table, row)).limit(1)
            ).first()
            if exists:
                target_conn.execute(table.update().where(_where_primary_key(table, row)).values(**row))
                updated += 1
            else:
                target_conn.execute(table.insert().values(**row))
                inserted += 1

    return {"source": source_count, "inserted": inserted, "updated": updated, "skipped": skipped}


def run_database_migration(
    source_url: str,
    target_url: str,
    *,
    create_database: bool = True,
    dry_run: bool = False,
) -> dict[str, Any]:
    if not source_url:
        raise ValueError("缺少 source_url")
    if not target_url:
        raise ValueError("缺少 target_url")
    if source_url == target_url:
        raise ValueError("source_url 和 target_url 不能相同")

    created_database = False
    if create_database and _is_mysql_url(target_url):
        created_database = ensure_mysql_database_exists(target_url)

    source_engine = create_engine(source_url)
    target_db = Database(target_url)
    try:
        if not dry_run:
            create_mysql_tables(target_db)

        tables: dict[str, dict[str, int]] = {}
        totals = {"source": 0, "inserted": 0, "updated": 0, "skipped": 0}
        for table in Base.metadata.sorted_tables:
            result = _copy_table(source_engine, target_db.engine, table, dry_run=dry_run)
            tables[table.name] = result
            for key in totals:
                totals[key] += int(result.get(key, 0) or 0)

        return {
            "source_url": redact_database_url(source_url),
            "target_url": redact_database_url(target_url),
            "created_database": created_database,
            "dry_run": dry_run,
            "totals": totals,
            "tables": tables,
        }
    finally:
        source_engine.dispose()
        target_db.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy FableSpace runtime data from SQLite/SQLAlchemy DB to target DB")
    parser.add_argument(
        "--source-url",
        default="",
        help="Source SQLAlchemy URL. Defaults to sqlite:///.fablespace-api/fablespace.sqlite3",
    )
    parser.add_argument(
        "--source-sqlite",
        default=str(DEFAULT_SOURCE_SQLITE),
        help="Source SQLite file path used when --source-url is omitted",
    )
    parser.add_argument("--target-url", default="", help="Target SQLAlchemy URL. Defaults to apps/api/.env FABLESPACE_DATABASE_URL")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE), help="Env file used to resolve FABLESPACE_DATABASE_URL")
    parser.add_argument("--no-create-database", action="store_true", help="Do not CREATE DATABASE IF NOT EXISTS for MySQL")
    parser.add_argument("--dry-run", action="store_true", help="Count source rows without writing target rows")
    args = parser.parse_args()

    source_url = args.source_url.strip() or _sqlite_url(Path(args.source_sqlite))
    target_url = _resolve_target_url(args.target_url, env_file=Path(args.env_file))

    if source_url.startswith("sqlite:///"):
        source_path = Path(source_url.removeprefix("sqlite:///"))
        if not source_path.exists():
            print(json.dumps({"error": f"source sqlite not found: {source_path}"}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)

    if not target_url:
        print(json.dumps({"error": "missing target url"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    summary = run_database_migration(
        source_url,
        target_url,
        create_database=not args.no_create_database,
        dry_run=bool(args.dry_run),
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
