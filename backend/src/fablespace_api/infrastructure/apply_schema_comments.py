"""Apply canonical FableSpace table/column comments to a MySQL database.

The operation is metadata-only: it does not add/drop tables, change application
schema semantics, or touch row data.  It compares the configured database with
``Base.metadata`` and only comments known FableSpace SQLAlchemy tables/columns.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy import Engine, create_engine, inspect, text

from fablespace_api.infrastructure.database import Base
from fablespace_api.infrastructure.env import DEFAULT_ENV_FILE, load_env_file
from fablespace_api.infrastructure.models import *  # noqa: F401,F403 - register all SQLAlchemy tables
from fablespace_api.infrastructure.schema_comments import (
    COLUMN_COMMENTS,
    TABLE_COMMENTS,
    apply_schema_comments,
    iter_project_tables,
    schema_comment_errors,
)


MYSQL_CURRENT_TIMESTAMP_DEFAULTS = {
    "CURRENT_TIMESTAMP",
    "CURRENT_TIMESTAMP()",
    "CURRENT_TIMESTAMP(6)",
    "NOW()",
}


def _resolve_database_url(explicit_url: str | None, env_file: Path) -> str:
    if explicit_url:
        return explicit_url
    load_env_file(env_file, override=False)
    url = (
        os.environ.get("FABLESPACE_DATABASE_URL", "").strip()
        or os.environ.get("FABLEMAP_DATABASE_URL", "").strip()
        or os.environ.get("FABLESPACE_MYSQL_URL", "").strip()
        or os.environ.get("FABLEMAP_MYSQL_URL", "").strip()
    )
    if not url:
        raise SystemExit("No database URL found. Set FABLESPACE_DATABASE_URL or pass --database-url.")
    return url


def _redacted_target(url: str) -> dict[str, Any]:
    parsed = urlsplit(url)
    return {
        "dialect": parsed.scheme,
        "host": parsed.hostname,
        "port": parsed.port,
        "database": (parsed.path or "").lstrip("/"),
    }


def _quote_ident(engine: Engine, identifier: str) -> str:
    return engine.dialect.identifier_preparer.quote(identifier)


def _quote_literal(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def _default_clause(default: Any) -> str:
    if default is None:
        return ""
    default_text = str(default)
    if default_text.upper() in MYSQL_CURRENT_TIMESTAMP_DEFAULTS or default_text.upper().startswith("CURRENT_TIMESTAMP"):
        return f" DEFAULT {default_text}"
    if default_text.upper() == "NULL":
        return " DEFAULT NULL"
    return f" DEFAULT {_quote_literal(default_text)}"


def _column_definition(row: dict[str, Any], comment: str) -> str:
    null_clause = " NOT NULL" if str(row.get("Null", "")).upper() == "NO" else " NULL"
    default_clause = _default_clause(row.get("Default"))
    extra = str(row.get("Extra") or "").strip()
    extra_clause = f" {extra}" if extra else ""
    return f"{row['Type']}{null_clause}{default_clause}{extra_clause} COMMENT {_quote_literal(comment)}"


def audit_database(engine: Engine) -> dict[str, Any]:
    apply_schema_comments(Base.metadata)
    inspector = inspect(engine)
    expected_tables = set(iter_project_tables(Base.metadata))
    actual_tables = set(inspector.get_table_names())

    result: dict[str, Any] = {
        "target": _redacted_target(str(engine.url)),
        "expected_table_count": len(expected_tables),
        "actual_table_count": len(actual_tables),
        "extra_tables": sorted(actual_tables - expected_tables),
        "missing_tables": sorted(expected_tables - actual_tables),
        "model_comment_errors": schema_comment_errors(Base.metadata),
        "missing_table_comments": [],
        "missing_column_comments": {},
    }

    if engine.dialect.name != "mysql":
        result["comment_audit_note"] = "Live table/column comment audit is only supported for MySQL."
        return result

    with engine.connect() as conn:
        db_name = conn.execute(text("select database()")).scalar()
        table_rows = conn.execute(
            text(
                """
                SELECT TABLE_NAME, TABLE_COMMENT
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = :schema AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
                """
            ),
            {"schema": db_name},
        ).mappings()
        result["missing_table_comments"] = [
            row["TABLE_NAME"] for row in table_rows if row["TABLE_NAME"] in expected_tables and not (row["TABLE_COMMENT"] or "").strip()
        ]

        column_rows = conn.execute(
            text(
                """
                SELECT TABLE_NAME, COLUMN_NAME, COLUMN_COMMENT
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = :schema
                ORDER BY TABLE_NAME, ORDINAL_POSITION
                """
            ),
            {"schema": db_name},
        ).mappings()
        missing_columns: dict[str, list[str]] = {}
        for row in column_rows:
            table_name = row["TABLE_NAME"]
            if table_name not in expected_tables:
                continue
            if not (row["COLUMN_COMMENT"] or "").strip():
                missing_columns.setdefault(table_name, []).append(row["COLUMN_NAME"])
        result["missing_column_comments"] = missing_columns

    return result


def build_mysql_comment_statements(engine: Engine) -> list[str]:
    if engine.dialect.name != "mysql":
        raise SystemExit("Applying live table/column comments is only supported for MySQL.")

    apply_schema_comments(Base.metadata)
    statements: list[str] = []
    inspector = inspect(engine)
    actual_tables = set(inspector.get_table_names())

    with engine.connect() as conn:
        for table_name in iter_project_tables(Base.metadata):
            if table_name not in actual_tables:
                continue
            q_table = _quote_ident(engine, table_name)
            table_comment = TABLE_COMMENTS[table_name]
            statements.append(f"ALTER TABLE {q_table} COMMENT = {_quote_literal(table_comment)}")

            rows = conn.execute(text(f"SHOW FULL COLUMNS FROM {q_table}")).mappings().all()
            by_column = {row["Field"]: dict(row) for row in rows}
            for column_name, column_comment in COLUMN_COMMENTS[table_name].items():
                row = by_column.get(column_name)
                if row is None:
                    continue
                q_column = _quote_ident(engine, column_name)
                definition = _column_definition(row, column_comment)
                statements.append(f"ALTER TABLE {q_table} MODIFY COLUMN {q_column} {definition}")

    return statements


def apply_mysql_comment_statements(engine: Engine, statements: list[str]) -> None:
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit or apply FableSpace MySQL table/column comments.")
    parser.add_argument("--database-url", default="", help="SQLAlchemy database URL. Defaults to .env FABLESPACE_DATABASE_URL.")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE), help=".env file used when --database-url is omitted.")
    parser.add_argument("--apply", action="store_true", help="Apply comments. Without this flag, only prints a dry-run summary.")
    parser.add_argument("--show-sql", action="store_true", help="Print generated SQL statements instead of only the summary.")
    args = parser.parse_args()

    url = _resolve_database_url(args.database_url or None, Path(args.env_file))
    engine = create_engine(url, pool_pre_ping=True)

    before = audit_database(engine)
    statements = build_mysql_comment_statements(engine)

    print(f"Target: {before['target']}")
    print(f"Project tables: expected={before['expected_table_count']} actual={before['actual_table_count']}")
    print(f"Extra tables: {before['extra_tables']}")
    print(f"Missing tables: {before['missing_tables']}")
    print(f"Model comment errors: {len(before['model_comment_errors'])}")
    print(f"Missing table comments before: {len(before['missing_table_comments'])}")
    print(f"Missing column comments before: {sum(len(v) for v in before['missing_column_comments'].values())}")
    print(f"Generated comment statements: {len(statements)}")

    if args.show_sql:
        for statement in statements:
            print(statement + ";")

    if not args.apply:
        print("Dry run only. Re-run with --apply to modify MySQL comments.")
        return

    apply_mysql_comment_statements(engine, statements)
    after = audit_database(engine)
    print(f"Missing table comments after: {len(after['missing_table_comments'])}")
    print(f"Missing column comments after: {sum(len(v) for v in after['missing_column_comments'].values())}")
    if after["missing_table_comments"] or after["missing_column_comments"] or after["model_comment_errors"]:
        raise SystemExit("Schema comment apply finished with missing comments; inspect output above.")


if __name__ == "__main__":
    main()
