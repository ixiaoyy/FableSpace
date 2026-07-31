"""Isolated schema bootstrap used only by explicit legacy migration commands."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text

# Register legacy ORM tables on shared metadata for explicit migration commands.
from . import models as _legacy_models
from .database import Database

logger = logging.getLogger(__name__)


def create_legacy_tables(database: Database) -> None:
    """Create tables on the supplied migration database, apply legacy patches, and return None."""
    database.create_tables()
    _ensure_legacy_schema_compatibility(database)


def _ensure_legacy_schema_compatibility(database: Database) -> None:
    """Apply existing compatibility SQL to the supplied migration database and return None."""
    dialect = (database.engine.dialect.name or "").lower()

    def has_column(table_name: str, column_name: str) -> bool:
        """Return whether a legacy table currently exposes the requested column."""
        try:
            return any(
                column.get("name") == column_name
                for column in inspect(database.engine).get_columns(table_name)
            )
        except Exception:
            return False

    def add_json_column_sql(table_name: str, column_name: str) -> str:
        """Build a nullable JSON column patch for an additive legacy field."""
        column_type = "JSON NULL" if dialect.startswith("mysql") else "JSON"
        return f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"

    def add_string_column_sql(
        table_name: str,
        column_name: str,
        *,
        length: int = 32,
        default: str = "",
        nullable: bool = False,
    ) -> str:
        """Build a string column patch with a safe default for existing rows."""
        escaped_default = default.replace("'", "''")
        null_sql = "NULL" if nullable else "NOT NULL"
        return (
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} "
            f"VARCHAR({length}) {null_sql} DEFAULT '{escaped_default}'"
        )

    def rename_column_sql(
        table_name: str,
        old_column_name: str,
        new_column_name: str,
        *,
        column_sql: str,
    ) -> str:
        """Build a dialect-aware legacy column rename statement."""
        if dialect.startswith("mysql"):
            return (
                f"ALTER TABLE {table_name} CHANGE COLUMN {old_column_name} "
                f"{new_column_name} {column_sql}"
            )
        return (
            f"ALTER TABLE {table_name} RENAME COLUMN "
            f"{old_column_name} TO {new_column_name}"
        )

    def sync_legacy_column_name(
        table_name: str,
        old_column_name: str,
        new_column_name: str,
        *,
        column_sql: str,
    ) -> list[str]:
        """Rename or backfill an old tavern column to its current physical name."""
        has_old_column = has_column(table_name, old_column_name)
        has_new_column = has_column(table_name, new_column_name)
        if has_old_column and not has_new_column:
            return [
                rename_column_sql(
                    table_name,
                    old_column_name,
                    new_column_name,
                    column_sql=column_sql,
                )
            ]
        if has_old_column and has_new_column:
            return [
                f"UPDATE {table_name} SET {new_column_name} = {old_column_name} "
                f"WHERE ({new_column_name} IS NULL OR {new_column_name} = '') "
                f"AND {old_column_name} IS NOT NULL AND {old_column_name} <> ''"
            ]
        return []

    def execute_schema_statements(statements: list[str]) -> None:
        """Apply collected compatibility statements in a single connection scope."""
        if not statements:
            return
        with database.engine.begin() as connection:
            for statement in statements:
                logger.info(
                    "Applying legacy schema compatibility patch: %s",
                    statement,
                )
                connection.execute(text(statement))

    legacy_column_statements: list[str] = []
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "characters",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "world_info",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "visitors",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "chat_messages",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "memory_atoms",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "gameplay_sessions",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "llm_configs",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "territories",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "state_cards",
            "tavern_id",
            "space_id",
            column_sql="VARCHAR(64) NOT NULL",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "relationship_edges",
            "source_tavern_id",
            "source_space_id",
            column_sql="VARCHAR(64) NOT NULL DEFAULT ''",
        )
    )
    legacy_column_statements.extend(
        sync_legacy_column_name(
            "relationship_edges",
            "target_tavern_id",
            "target_space_id",
            column_sql="VARCHAR(64) NOT NULL DEFAULT ''",
        )
    )
    execute_schema_statements(legacy_column_statements)

    statements: list[str] = []
    if not has_column("taverns", "special_type"):
        statements.append(add_string_column_sql("taverns", "special_type"))
    if not has_column("taverns", "roleplay_mode"):
        statements.append(
            add_string_column_sql("taverns", "roleplay_mode", default="ai_only")
        )
    if not has_column("taverns", "layout_style"):
        statements.append(
            add_string_column_sql("taverns", "layout_style", default="lobby")
        )
    if not has_column("taverns", "place_type"):
        statements.append(
            add_string_column_sql("taverns", "place_type", default="space")
        )
    if not has_column("taverns", "character_claims"):
        statements.append(add_json_column_sql("taverns", "character_claims"))
    if not has_column("taverns", "skill_packs"):
        statements.append(add_json_column_sql("taverns", "skill_packs"))
    if not has_column("taverns", "engagement_config"):
        statements.append(add_json_column_sql("taverns", "engagement_config"))
    if not has_column("taverns", "home_members"):
        statements.append(add_json_column_sql("taverns", "home_members"))
    if not has_column("taverns", "place_relationships"):
        statements.append(add_json_column_sql("taverns", "place_relationships"))
    if not has_column("taverns", "timezone"):
        statements.append(
            add_string_column_sql(
                "taverns",
                "timezone",
                length=64,
                default="",
                nullable=True,
            )
        )
    if not has_column("taverns", "operating_hours"):
        statements.append(add_json_column_sql("taverns", "operating_hours"))
    if not has_column("characters", "gender"):
        statements.append(
            add_string_column_sql("characters", "gender", default="unspecified")
        )
    if not has_column("characters", "hobbies"):
        statements.append(add_json_column_sql("characters", "hobbies"))
    if not has_column("visitors", "gender"):
        statements.append(
            add_string_column_sql("visitors", "gender", default="unspecified")
        )
    if not has_column("visitors", "metadata"):
        statements.append(add_json_column_sql("visitors", "metadata"))
    execute_schema_statements(statements)
