"""Offline guards and plan generation for the controlled FableSpace 009 switch.

The tool deliberately has no database driver.  It emits fixed snapshot SQL and
validates the resulting JSONL files so database credentials and connection
authority remain in the separately approved operator workflow.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any

from migration_009_contract import (
    BASELINE_TABLES,
    LEGACY_DELETE_COHORT,
    MIGRATION_FILE,
    MIGRATION_ID,
    STORY_ID_BY_WORLD_ID,
    TARGET_TABLES,
    Migration009ContractError,
    assert_existing_messages_match_projection,
    canonical_hash,
    canonical_json,
    convert_legacy_story_world_payload,
    project_story_messages,
    rowset_hash,
    rowset_hash_payload,
    story_run_fingerprint_payload_v1,
    story_run_fingerprint_v1,
)

FIXED_DATABASE_NAME = "fablespace"
TOOL_CONTRACT = "fablespace-migration-009-tool-v1"
PREFLIGHT_CONTRACT = "fablespace-migration-009-preflight-v1"
POSTFLIGHT_CONTRACT = "fablespace-migration-009-postflight-v1"
SNAPSHOT_CONTRACT = "fablespace-migration-009-snapshot-v1"
PLAN_TABLE_PREFIX = "_fablespace_009_plan_"
SSH_ACTION_COMMIT = "029f5b4aeeeb58fdfe1410a5d17f967dacf36262"


class Migration009ToolError(RuntimeError):
    """Carry one fixed failure code without embedding private snapshot values."""

    def __init__(self, code: str) -> None:
        """Store one redacted code that is safe to return from the CLI boundary."""

        self.code = code
        super().__init__(code)


@dataclass(frozen=True, slots=True)
class Snapshot:
    """Hold one locally captured database snapshot without opening a connection."""

    records: tuple[dict[str, object], ...]
    rows: Mapping[str, tuple[dict[str, object], ...]]
    schema_records: tuple[dict[str, object], ...]
    meta: Mapping[str, object]

    @classmethod
    def load(cls, path: Path) -> "Snapshot":
        """Parse fixed JSONL output and reject malformed or duplicate metadata."""

        records: list[dict[str, object]] = []
        rows: dict[str, list[dict[str, object]]] = defaultdict(list)
        schema_records: list[dict[str, object]] = []
        meta_rows: list[dict[str, object]] = []
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError as exc:
            raise Migration009ToolError("snapshot_unreadable") from exc
        for line in lines:
            if not line.strip():
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError as exc:
                raise Migration009ToolError("snapshot_json_invalid") from exc
            if not isinstance(raw, dict):
                raise Migration009ToolError("snapshot_record_invalid")
            kind = raw.get("kind")
            if kind == "row":
                table = raw.get("table")
                data = raw.get("data")
                if not isinstance(table, str) or not isinstance(data, dict):
                    raise Migration009ToolError("snapshot_row_invalid")
                rows[table].append(dict(data))
            elif kind == "meta":
                meta_rows.append(raw)
            elif kind in {"table", "column", "index", "foreign_key", "check", "object"}:
                schema_records.append(raw)
            else:
                raise Migration009ToolError("snapshot_record_kind_invalid")
            records.append(raw)
        if len(meta_rows) != 1:
            raise Migration009ToolError("snapshot_meta_count_invalid")
        meta = meta_rows[0]
        if meta.get("contract") != SNAPSHOT_CONTRACT:
            raise Migration009ToolError("snapshot_contract_invalid")
        if meta.get("database") != FIXED_DATABASE_NAME:
            raise Migration009ToolError("snapshot_database_invalid")
        return cls(
            records=tuple(records),
            rows={name: tuple(values) for name, values in rows.items()},
            schema_records=tuple(schema_records),
            meta=meta,
        )

    def digest(self) -> str:
        """Return a stable full-snapshot digest for stopped-write comparisons."""

        return canonical_hash(sorted(canonical_json(record) for record in self.records))

    def schema_digest(self) -> str:
        """Return a stable schema/object digest that excludes every business row."""

        return canonical_hash(
            sorted(canonical_json(record) for record in self.schema_records)
        )

    def table_manifest(self) -> dict[str, dict[str, object]]:
        """Return only safe row counts and canonical row-set hashes by table."""

        table_names = {
            str(record.get("table"))
            for record in self.schema_records
            if record.get("kind") == "table"
        }
        return {
            table: {
                "count": len(self.rows.get(table, ())),
                "rowset_hash": rowset_hash(self.rows.get(table, ())),
            }
            for table in sorted(table_names)
        }


@dataclass(frozen=True, slots=True)
class MigrationPlan:
    """Contain only validated target projections plus the exact deletion guard."""

    delete_run: Mapping[str, object]
    delete_children: Mapping[str, tuple[dict[str, object], ...]]
    delete_counts: Mapping[str, int]
    delete_hashes: Mapping[str, str]
    surviving_run_count: int
    surviving_relationship_count: int
    progress_rows: tuple[dict[str, object], ...]
    relationship_rows: tuple[dict[str, object], ...]
    message_rows: tuple[dict[str, object], ...]
    managed_world_rows: tuple[dict[str, object], ...]

    def safe_projection(self) -> dict[str, object]:
        """Describe the plan using IDs, counts and hashes but no private content."""

        run = self.delete_run
        return {
            "delete": {
                "story_run_id": run["id"],
                "story_world_id": run["story_world_id"],
                "owner_scope_hash": canonical_hash(
                    [run["player_id"], run["story_world_id"], run["id"]]
                ),
                "fingerprint": story_run_fingerprint_v1(run),
                "child_counts": dict(sorted(self.delete_counts.items())),
                "child_hashes": dict(sorted(self.delete_hashes.items())),
            },
            "target_projections": {
                "player_story_progress": _safe_rows(self.progress_rows),
                "character_relationships": _safe_rows(self.relationship_rows),
                "story_messages": _safe_rows(self.message_rows),
                "managed_story_worlds": _safe_rows(self.managed_world_rows),
            },
            "surviving_run_count": self.surviving_run_count,
            "surviving_old_relationship_count": self.surviving_relationship_count,
        }


def _safe_rows(rows: Sequence[Mapping[str, object]]) -> dict[str, object]:
    """Project a private row set to a count and one-way canonical hash."""

    return {"count": len(rows), "rowset_hash": rowset_hash(rows)}


def _json_text(value: object, code: str) -> str:
    """Require a non-empty string at a trusted snapshot boundary."""

    if not isinstance(value, str) or not value.strip():
        raise Migration009ToolError(code)
    return value


def _json_list(value: object, code: str) -> list[object]:
    """Require a JSON list without accepting another iterable type."""

    if not isinstance(value, list):
        raise Migration009ToolError(code)
    return value


def _json_mapping(value: object, code: str) -> Mapping[str, object]:
    """Require a JSON object without coercing strings or arrays."""

    if not isinstance(value, Mapping):
        raise Migration009ToolError(code)
    return value


def _finite_number(value: object, code: str) -> float:
    """Require a finite JSON number while rejecting booleans."""

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise Migration009ToolError(code)
    number = float(value)
    if not math.isfinite(number):
        raise Migration009ToolError(code)
    return number


def _normalized_sql(value: object) -> str:
    """Normalize dialect quoting, case and redundant whitespace for comparisons."""

    normalized = re.sub(r"\s+", " ", str(value or "").replace("`", "").strip()).lower()
    while normalized.startswith("(") and normalized.endswith(")"):
        candidate = normalized[1:-1].strip()
        if candidate.count("(") != candidate.count(")"):
            break
        normalized = candidate
    return normalized


def _normalized_column_type(value: object) -> str:
    """Normalize MySQL integer display widths while preserving bounded text sizes."""

    normalized = _normalized_sql(value)
    return re.sub(r"^(tinyint|smallint|int|integer)\(\d+\)$", r"\1", normalized)


def _normalized_column_default(value: object) -> str | None:
    """Normalize one reflected literal default while preserving SQL NULL as no default."""

    if value is None:
        return None
    return str(value).strip()


def _normalized_generated_expression(value: object) -> str | None:
    """Normalize SQL outside string literals while preserving literal case and content."""

    source = str("" if value is None else value).strip()
    pieces: list[str] = []
    cursor = 0
    while cursor < len(source):
        quote = source.find("'", cursor)
        if quote < 0:
            pieces.append(source[cursor:].replace("`", "").lower())
            break
        pieces.append(source[cursor:quote].replace("`", "").lower())
        end = quote + 1
        while end < len(source):
            if source[end] != "'":
                end += 1
                continue
            if end + 1 < len(source) and source[end + 1] == "'":
                end += 2
                continue
            pieces.append(source[quote : end + 1])
            cursor = end + 1
            break
        else:
            return None
    return "".join(pieces)


def _is_approved_active_slot_generation(value: object) -> bool:
    """Accept only the approved active-slot CASE despite harmless MySQL reflection wrappers."""

    normalized = _normalized_generated_expression(value)
    if normalized is None:
        return False
    return bool(
        re.fullmatch(
            r"\(*\s*case\s+when\s+\(*\s*status\s*=\s*"
            r"(?:_[a-z0-9]+)?'active'\s*\)*\s+then\s+1\s+else\s+null\s+end\s*\)*",
            normalized,
        )
    )


BASELINE_ROW_COLUMNS: dict[str, tuple[tuple[str, str], ...]] = {
    "player_story_states": (
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("player_role_id", "text"),
        ("active_story_run_id", "text"),
        ("visit_count", "number"),
        ("last_visited_at", "datetime"),
        ("completed_run_summaries", "json"),
    ),
    "story_runs": (
        ("id", "text"),
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("content_version", "text"),
        ("player_role_id", "text"),
        ("status", "text"),
        ("current_chapter_id", "text"),
        ("current_node_id", "text"),
        ("key_choices", "json"),
        ("story_flags", "json"),
        ("ending_id", "text"),
        ("ending_summary", "text"),
        ("started_at", "datetime"),
        ("completed_at", "datetime"),
    ),
    "character_relationships": (
        ("story_run_id", "text"),
        ("character_id", "text"),
        ("affinity", "number"),
        ("stage", "text"),
        ("last_change_reason", "text"),
        ("flags", "json"),
    ),
    "story_events": (
        ("id", "text"),
        ("story_run_id", "text"),
        ("sequence", "number"),
        ("event_type", "text"),
        ("character_id", "text"),
        ("role", "text"),
        ("content", "text"),
        ("source_kind", "text"),
        ("source_id", "text"),
        ("payload", "json"),
        ("created_at", "datetime"),
    ),
    "story_messages": (
        ("id", "text"),
        ("story_run_id", "text"),
        ("sequence", "number"),
        ("role", "text"),
        ("character_id", "text"),
        ("visible_to_character_ids", "json"),
        ("content", "text"),
        ("source_event_id", "text"),
        ("source_event_sequence", "number"),
        ("created_at", "datetime"),
    ),
    "private_memories": (
        ("id", "text"),
        ("story_run_id", "text"),
        ("content", "text"),
        ("source_event_id", "text"),
        ("source_event_sequence", "number"),
        ("character_id", "text"),
        ("created_at", "datetime"),
    ),
    "managed_story_worlds": (
        ("story_world_id", "text"),
        ("payload_json", "json"),
        ("updated_at", "datetime"),
    ),
    "managed_media_assets": (
        ("id", "text"),
        ("object_key", "text"),
        ("url", "text"),
        ("byte_count", "number"),
        ("sha256", "text"),
        ("mime_type", "text"),
        ("width", "number"),
        ("height", "number"),
        ("source_type", "text"),
        ("source_note", "text"),
        ("created_at", "datetime"),
    ),
}

TARGET_ROW_COLUMNS: dict[str, tuple[tuple[str, str], ...]] = {
    **{
        name: columns
        for name, columns in BASELINE_ROW_COLUMNS.items()
        if name
        in {"story_events", "story_messages", "managed_story_worlds", "managed_media_assets"}
    },
    "player_story_states": (
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("visit_count", "number"),
        ("last_visited_at", "datetime"),
    ),
    "player_story_progress": (
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("story_id", "text"),
        ("active_story_run_id", "text"),
        ("last_visited_at", "datetime"),
        ("completed_run_summaries", "json"),
    ),
    "story_runs": (
        ("id", "text"),
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("story_id", "text"),
        ("content_version", "text"),
        ("player_role_id", "text"),
        ("status", "text"),
        ("active_slot", "number"),
        ("current_chapter_id", "text"),
        ("current_node_id", "text"),
        ("key_choices", "json"),
        ("story_flags", "json"),
        ("ending_id", "text"),
        ("ending_summary", "text"),
        ("started_at", "datetime"),
        ("completed_at", "datetime"),
    ),
    "character_relationships": (
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("character_id", "text"),
        ("affinity", "number"),
        ("stage", "text"),
        ("last_change_reason", "text"),
        ("flags", "json"),
        ("last_source_story_run_id", "text"),
        ("last_source_event_id", "text"),
        ("updated_at", "datetime"),
    ),
    "private_memories": (
        ("id", "text"),
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("origin_story_id", "text"),
        ("origin_story_run_id", "text"),
        ("character_id", "text"),
        ("role_scope_player_role_id", "text"),
        ("layer", "text"),
        ("memory_kind", "text"),
        ("evidence_class", "text"),
        ("content", "text"),
        ("structured_payload", "json"),
        ("salience", "number"),
        ("recall_scope", "text"),
        ("review_status", "text"),
        ("promotion_rule_id", "text"),
        ("story_content_version", "text"),
        ("pipeline_version", "text"),
        ("logical_key", "text"),
        ("revision", "number"),
        ("idempotency_key", "text"),
        ("content_hash", "text"),
        ("created_at", "datetime"),
    ),
    "private_memory_sources": (
        ("memory_id", "text"),
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("character_id", "text"),
        ("ordinal", "number"),
        ("source_kind", "text"),
        ("source_story_id", "text"),
        ("source_story_run_id", "text"),
        ("source_event_id", "text"),
        ("source_event_sequence", "number"),
        ("source_memory_id", "text"),
        ("relation_kind", "text"),
        ("created_at", "datetime"),
    ),
    "memory_formation_jobs": (
        ("player_id", "text"),
        ("story_world_id", "text"),
        ("story_id", "text"),
        ("story_run_id", "text"),
        ("character_id", "text"),
        ("pipeline_version", "text"),
        ("processed_event_sequence", "number"),
        ("pending_event_sequence", "number"),
        ("status", "text"),
        ("attempt_count", "number"),
        ("lease_token", "text"),
        ("lease_expires_at", "datetime"),
        ("next_retry_at", "datetime"),
        ("last_error_code", "text"),
        ("created_at", "datetime"),
        ("updated_at", "datetime"),
    ),
}

BASELINE_COLUMN_TYPES = {
    "player_story_states": (
        "varchar(64)", "varchar(128)", "varchar(128)", "varchar(36)",
        "int", "datetime", "json",
    ),
    "story_runs": (
        "varchar(36)", "varchar(64)", "varchar(128)", "varchar(128)",
        "varchar(128)", "varchar(16)", "varchar(128)", "varchar(128)",
        "json", "json", "varchar(128)", "text", "datetime", "datetime",
    ),
    "character_relationships": (
        "varchar(36)", "varchar(128)", "double", "varchar(64)", "text", "json",
    ),
    "story_events": (
        "varchar(36)", "varchar(36)", "int", "varchar(32)", "varchar(128)",
        "varchar(16)", "text", "varchar(32)", "varchar(128)", "json", "datetime",
    ),
    "story_messages": (
        "varchar(36)", "varchar(36)", "int", "varchar(16)", "varchar(128)",
        "json", "text", "varchar(36)", "int", "datetime",
    ),
    "private_memories": (
        "varchar(36)", "varchar(36)", "text", "varchar(36)", "int",
        "varchar(128)", "datetime",
    ),
    "managed_story_worlds": ("varchar(128)", "json", "datetime"),
    "managed_media_assets": (
        "varchar(36)", "varchar(512)", "varchar(1024)", "int", "varchar(64)",
        "varchar(64)", "int", "int", "varchar(32)", "text", "datetime",
    ),
}

BASELINE_NULLABLE_COLUMNS = {
    "player_story_states": {"active_story_run_id"},
    "story_runs": {"ending_id", "ending_summary", "completed_at"},
    "story_events": {"character_id", "role", "source_id"},
    "story_messages": {"character_id"},
    "private_memories": {"character_id"},
    "managed_media_assets": {"width", "height"},
}

TARGET_COLUMN_TYPES = {
    "player_story_states": ("varchar(64)", "varchar(128)", "int", "datetime"),
    "player_story_progress": (
        "varchar(64)", "varchar(128)", "varchar(128)", "varchar(36)",
        "datetime", "json",
    ),
    "story_runs": (
        "varchar(36)", "varchar(64)", "varchar(128)", "varchar(128)",
        "varchar(128)", "varchar(128)", "varchar(16)", "tinyint",
        "varchar(128)", "varchar(128)", "json", "json", "varchar(128)",
        "text", "datetime", "datetime",
    ),
    "character_relationships": (
        "varchar(64)", "varchar(128)", "varchar(128)", "double", "varchar(64)",
        "text", "json", "varchar(36)", "varchar(36)", "datetime",
    ),
    "story_events": BASELINE_COLUMN_TYPES["story_events"],
    "story_messages": BASELINE_COLUMN_TYPES["story_messages"],
    "private_memories": (
        "varchar(36)", "varchar(64)", "varchar(128)", "varchar(128)",
        "varchar(36)", "varchar(128)", "varchar(128)", "varchar(2)",
        "varchar(32)", "varchar(32)", "text", "json", "smallint",
        "varchar(16)", "varchar(16)", "varchar(128)", "varchar(128)",
        "varchar(64)", "char(64)", "int", "char(64)", "char(64)", "datetime",
    ),
    "private_memory_sources": (
        "varchar(36)", "varchar(64)", "varchar(128)", "varchar(128)",
        "smallint", "varchar(8)", "varchar(128)", "varchar(36)",
        "varchar(36)", "int", "varchar(36)", "varchar(16)", "datetime",
    ),
    "memory_formation_jobs": (
        "varchar(64)", "varchar(128)", "varchar(128)", "varchar(36)",
        "varchar(128)", "varchar(64)", "int", "int", "varchar(24)", "int",
        "varchar(64)", "datetime", "datetime", "varchar(64)", "datetime", "datetime",
    ),
    "managed_story_worlds": BASELINE_COLUMN_TYPES["managed_story_worlds"],
    "managed_media_assets": BASELINE_COLUMN_TYPES["managed_media_assets"],
}

TARGET_NULLABLE_COLUMNS = {
    "player_story_progress": {"active_story_run_id", "last_visited_at"},
    "story_runs": {"active_slot", "ending_id", "ending_summary", "completed_at"},
    "character_relationships": {"last_source_story_run_id", "last_source_event_id"},
    "story_events": BASELINE_NULLABLE_COLUMNS["story_events"],
    "story_messages": BASELINE_NULLABLE_COLUMNS["story_messages"],
    "private_memories": {
        "role_scope_player_role_id", "content", "promotion_rule_id", "content_hash"
    },
    "private_memory_sources": {
        "source_story_id", "source_story_run_id", "source_event_id",
        "source_event_sequence", "source_memory_id"
    },
    "memory_formation_jobs": {
        "lease_token", "lease_expires_at", "next_retry_at", "last_error_code"
    },
    "managed_media_assets": BASELINE_NULLABLE_COLUMNS["managed_media_assets"],
}

BASELINE_COLUMN_DEFAULTS: dict[tuple[str, str], str] = {
    ("player_story_states", "visit_count"): "0",
}

TARGET_COLUMN_DEFAULTS: dict[tuple[str, str], str] = {
    **BASELINE_COLUMN_DEFAULTS,
    ("memory_formation_jobs", "processed_event_sequence"): "0",
    ("memory_formation_jobs", "pending_event_sequence"): "0",
    ("memory_formation_jobs", "attempt_count"): "0",
}

BASELINE_COLUMN_EXTRAS: dict[tuple[str, str], str] = {}

TARGET_COLUMN_EXTRAS: dict[tuple[str, str], str] = {
    ("story_runs", "active_slot"): "stored generated",
}

PRIMARY_KEYS = {
    "player_story_states": ("player_id", "story_world_id"),
    "player_story_progress": ("player_id", "story_world_id", "story_id"),
    "story_runs": ("id",),
    "character_relationships": ("player_id", "story_world_id", "character_id"),
    "story_events": ("id",),
    "story_messages": ("id",),
    "private_memories": ("id",),
    "private_memory_sources": ("memory_id", "ordinal"),
    "memory_formation_jobs": ("story_run_id", "character_id", "pipeline_version"),
    "managed_story_worlds": ("story_world_id",),
    "managed_media_assets": ("id",),
}

BASELINE_PRIMARY_KEYS = {
    **{name: columns for name, columns in PRIMARY_KEYS.items() if name in BASELINE_TABLES},
    "character_relationships": ("story_run_id", "character_id"),
}

BASELINE_FOREIGN_KEYS = {
    "fk_character_relationships_story_run": (
        "character_relationships",
        ("story_run_id",),
        "story_runs",
        ("id",),
        "CASCADE",
    ),
    "fk_story_events_story_run": (
        "story_events",
        ("story_run_id",),
        "story_runs",
        ("id",),
        "CASCADE",
    ),
    "fk_story_messages_story_run": (
        "story_messages",
        ("story_run_id",),
        "story_runs",
        ("id",),
        "CASCADE",
    ),
    "fk_story_messages_source_event": (
        "story_messages",
        ("source_event_id",),
        "story_events",
        ("id",),
        "CASCADE",
    ),
    "fk_private_memories_story_run": (
        "private_memories",
        ("story_run_id",),
        "story_runs",
        ("id",),
        "CASCADE",
    ),
    "fk_private_memories_source_event": (
        "private_memories",
        ("source_event_id",),
        "story_events",
        ("id",),
        "CASCADE",
    ),
}

TARGET_FOREIGN_KEYS = {
    "fk_story_runs_state": (
        "story_runs",
        ("player_id", "story_world_id"),
        "player_story_states",
        ("player_id", "story_world_id"),
        "CASCADE",
    ),
    "fk_player_story_progress_state": (
        "player_story_progress",
        ("player_id", "story_world_id"),
        "player_story_states",
        ("player_id", "story_world_id"),
        "CASCADE",
    ),
    "fk_player_story_progress_active_run": (
        "player_story_progress",
        ("active_story_run_id",),
        "story_runs",
        ("id",),
        "SET NULL",
    ),
    "fk_story_events_story_run": BASELINE_FOREIGN_KEYS["fk_story_events_story_run"],
    "fk_character_relationships_state": (
        "character_relationships",
        ("player_id", "story_world_id"),
        "player_story_states",
        ("player_id", "story_world_id"),
        "CASCADE",
    ),
    "fk_character_relationships_source_event": (
        "character_relationships",
        ("last_source_story_run_id", "last_source_event_id"),
        "story_events",
        ("story_run_id", "id"),
        "RESTRICT",
    ),
    "fk_story_messages_story_run": BASELINE_FOREIGN_KEYS["fk_story_messages_story_run"],
    "fk_story_messages_source_event": BASELINE_FOREIGN_KEYS[
        "fk_story_messages_source_event"
    ],
    "fk_private_memories_state": (
        "private_memories",
        ("player_id", "story_world_id"),
        "player_story_states",
        ("player_id", "story_world_id"),
        "CASCADE",
    ),
    "fk_private_memories_origin_run": (
        "private_memories",
        ("player_id", "story_world_id", "origin_story_id", "origin_story_run_id"),
        "story_runs",
        ("player_id", "story_world_id", "story_id", "id"),
        "RESTRICT",
    ),
    "fk_private_memory_sources_memory": (
        "private_memory_sources",
        ("player_id", "story_world_id", "character_id", "memory_id"),
        "private_memories",
        ("player_id", "story_world_id", "character_id", "id"),
        "CASCADE",
    ),
    "fk_private_memory_sources_source_memory": (
        "private_memory_sources",
        ("player_id", "story_world_id", "character_id", "source_memory_id"),
        "private_memories",
        ("player_id", "story_world_id", "character_id", "id"),
        "RESTRICT",
    ),
    "fk_private_memory_sources_source_run": (
        "private_memory_sources",
        ("player_id", "story_world_id", "source_story_id", "source_story_run_id"),
        "story_runs",
        ("player_id", "story_world_id", "story_id", "id"),
        "RESTRICT",
    ),
    "fk_private_memory_sources_source_event": (
        "private_memory_sources",
        ("source_story_run_id", "source_event_id", "source_event_sequence"),
        "story_events",
        ("story_run_id", "id", "sequence"),
        "RESTRICT",
    ),
    "fk_memory_formation_jobs_story_run": (
        "memory_formation_jobs",
        ("player_id", "story_world_id", "story_id", "story_run_id"),
        "story_runs",
        ("player_id", "story_world_id", "story_id", "id"),
        "CASCADE",
    ),
}

TARGET_CHECK_NAMES = {
    "story_runs": {"ck_story_runs_status"},
    "character_relationships": {"ck_character_relationships_source_pair"},
    "story_messages": {"ck_story_messages_role"},
    "private_memories": {
        "ck_private_memories_layer",
        "ck_private_memories_kind",
        "ck_private_memories_evidence_class",
        "ck_private_memories_recall_scope",
        "ck_private_memories_review_status",
        "ck_private_memories_layer_kind",
        "ck_private_memories_salience",
        "ck_private_memories_revision",
        "ck_private_memories_l2_scope",
        "ck_private_memories_validated_scope",
        "ck_private_memories_promoted_scope",
        "ck_private_memories_l3_status",
        "ck_private_memories_content_lifecycle",
    },
    "private_memory_sources": {
        "ck_private_memory_sources_source_kind",
        "ck_private_memory_sources_relation_kind",
        "ck_private_memory_sources_ordinal",
        "ck_private_memory_sources_source_exclusive",
        "ck_private_memory_sources_source_shape",
        "ck_private_memory_sources_relation_source",
    },
    "memory_formation_jobs": {
        "ck_memory_formation_jobs_status",
        "ck_memory_formation_jobs_watermarks",
        "ck_memory_formation_jobs_attempt_count",
        "ck_memory_formation_jobs_status_watermark",
        "ck_memory_formation_jobs_lease",
        "ck_memory_formation_jobs_retry",
        "ck_memory_formation_jobs_blocked_error",
    },
}

BASELINE_INDEXES = {
    ("story_runs", "idx_story_runs_player_world_status"): (
        ("player_id", "story_world_id", "status"),
        False,
    ),
    ("story_events", "uq_story_events_run_sequence"): (
        ("story_run_id", "sequence"),
        True,
    ),
    ("story_events", "idx_story_events_run_source"): (
        ("story_run_id", "source_kind", "source_id"),
        False,
    ),
    ("story_messages", "uq_story_messages_run_sequence"): (
        ("story_run_id", "sequence"),
        True,
    ),
    ("story_messages", "idx_story_messages_run_event"): (
        ("story_run_id", "source_event_id"),
        False,
    ),
    ("private_memories", "idx_private_memories_run_created"): (
        ("story_run_id", "created_at"),
        False,
    ),
    ("private_memories", "idx_private_memories_run_event"): (
        ("story_run_id", "source_event_id"),
        False,
    ),
    ("managed_media_assets", "uq_managed_media_assets_object_key"): (
        ("object_key",),
        True,
    ),
    ("managed_media_assets", "idx_managed_media_assets_created_at"): (
        ("created_at",),
        False,
    ),
}

TARGET_INDEXES = {
    ("story_runs", "uq_story_runs_player_world_story_active"): (
        ("player_id", "story_world_id", "story_id", "active_slot"),
        True,
    ),
    ("story_runs", "uq_story_runs_owner_story_id"): (
        ("player_id", "story_world_id", "story_id", "id"),
        True,
    ),
    ("story_runs", "idx_story_runs_player_world_story_status"): (
        ("player_id", "story_world_id", "story_id", "status", "completed_at"),
        False,
    ),
    ("story_events", "uq_story_events_run_sequence"): (
        ("story_run_id", "sequence"),
        True,
    ),
    ("story_events", "uq_story_events_run_id"): (("story_run_id", "id"), True),
    ("story_events", "uq_story_events_run_id_sequence"): (
        ("story_run_id", "id", "sequence"),
        True,
    ),
    ("story_events", "idx_story_events_run_source"): (
        ("story_run_id", "source_kind", "source_id"),
        False,
    ),
    ("story_messages", "uq_story_messages_run_sequence"): (
        ("story_run_id", "sequence"),
        True,
    ),
    ("story_messages", "idx_story_messages_run_event"): (
        ("story_run_id", "source_event_id"),
        False,
    ),
    ("private_memories", "uq_private_memories_idempotency"): (
        ("player_id", "story_world_id", "character_id", "idempotency_key"),
        True,
    ),
    ("private_memories", "uq_private_memories_logical_revision"): (
        ("player_id", "story_world_id", "character_id", "logical_key", "revision"),
        True,
    ),
    ("private_memories", "uq_private_memories_owner_id"): (
        ("player_id", "story_world_id", "id"),
        True,
    ),
    ("private_memories", "uq_private_memories_owner_character_id"): (
        ("player_id", "story_world_id", "character_id", "id"),
        True,
    ),
    ("private_memories", "idx_private_memories_recall"): (
        (
            "player_id",
            "story_world_id",
            "character_id",
            "review_status",
            "recall_scope",
            "origin_story_id",
            "role_scope_player_role_id",
            "layer",
            "salience",
            "created_at",
        ),
        False,
    ),
    ("private_memories", "idx_private_memories_origin"): (
        ("origin_story_run_id", "character_id", "layer", "created_at"),
        False,
    ),
    ("private_memories", "idx_private_memories_revision"): (
        ("player_id", "story_world_id", "character_id", "logical_key", "revision"),
        False,
    ),
    ("private_memory_sources", "uq_private_memory_sources_event"): (
        (
            "memory_id",
            "source_story_run_id",
            "source_event_id",
            "source_event_sequence",
            "relation_kind",
        ),
        True,
    ),
    ("private_memory_sources", "uq_private_memory_sources_memory"): (
        ("memory_id", "source_memory_id", "relation_kind"),
        True,
    ),
    ("memory_formation_jobs", "idx_memory_formation_jobs_worker"): (
        ("status", "next_retry_at", "lease_expires_at"),
        False,
    ),
    ("managed_media_assets", "uq_managed_media_assets_object_key"): (
        ("object_key",),
        True,
    ),
    ("managed_media_assets", "idx_managed_media_assets_created_at"): (
        ("created_at",),
        False,
    ),
}


def _row_expression(column: str, kind: str) -> str:
    """Return the fixed MySQL expression for one JSON-safe snapshot column."""

    quoted = f"`{column}`"
    if kind == "json":
        return f"JSON_EXTRACT({quoted}, '$')"
    if kind == "datetime":
        return (
            f"IF({quoted} IS NULL, NULL, "
            f"DATE_FORMAT({quoted}, '%Y-%m-%dT%H:%i:%s.%fZ'))"
        )
    return quoted


def _snapshot_row_sql(table: str, columns: Sequence[tuple[str, str]]) -> str:
    """Build one fixed JSONL SELECT for every row of an approved table."""

    pairs = ", ".join(
        f"'{name}', {_row_expression(name, kind)}" for name, kind in columns
    )
    order_columns = PRIMARY_KEYS.get(table) or BASELINE_PRIMARY_KEYS.get(table)
    if table == "character_relationships" and any(
        name == "story_run_id" for name, _kind in columns
    ):
        order_columns = BASELINE_PRIMARY_KEYS[table]
    order = ", ".join(f"`{name}`" for name in order_columns or ())
    return (
        "SELECT JSON_OBJECT('kind', 'row', 'table', "
        f"'{table}', 'data', JSON_OBJECT({pairs})) "
        f"FROM `{table}` ORDER BY {order};"
    )


def snapshot_sql(phase: str) -> str:
    """Emit fixed read-only SQL for a baseline or target JSONL snapshot."""

    if phase == "baseline":
        tables = BASELINE_ROW_COLUMNS
    elif phase == "target":
        tables = TARGET_ROW_COLUMNS
    else:
        raise Migration009ToolError("snapshot_phase_invalid")
    statements = [
        "SET SESSION time_zone = '+00:00';",
        "SET TRANSACTION READ ONLY;",
        "START TRANSACTION WITH CONSISTENT SNAPSHOT;",
        (
            "SELECT JSON_OBJECT('kind', 'meta', 'contract', "
            f"'{SNAPSHOT_CONTRACT}', 'database', DATABASE(), "
            "'mysql_version', VERSION(), 'phase', "
            f"'{phase}');"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'table', 'table', TABLE_NAME, "
            "'engine', ENGINE, 'collation', TABLE_COLLATION) "
            "FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'column', 'table', TABLE_NAME, "
            "'column', COLUMN_NAME, 'ordinal', ORDINAL_POSITION, "
            "'column_type', COLUMN_TYPE, 'nullable', IF(IS_NULLABLE = 'YES', 1, 0), "
            "'default', COLUMN_DEFAULT, 'extra', EXTRA, "
            "'generation_expression', GENERATION_EXPRESSION) "
            "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
            "ORDER BY TABLE_NAME, ORDINAL_POSITION;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'index', 'table', TABLE_NAME, "
            "'index', INDEX_NAME, 'non_unique', NON_UNIQUE, 'sequence', SEQ_IN_INDEX, "
            "'column', COLUMN_NAME, 'sub_part', SUB_PART, 'index_type', INDEX_TYPE) "
            "FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() "
            "ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'foreign_key', 'table', k.TABLE_NAME, "
            "'constraint', k.CONSTRAINT_NAME, 'column', k.COLUMN_NAME, "
            "'ordinal', k.ORDINAL_POSITION, 'referenced_table', k.REFERENCED_TABLE_NAME, "
            "'referenced_column', k.REFERENCED_COLUMN_NAME, 'delete_rule', r.DELETE_RULE) "
            "FROM information_schema.KEY_COLUMN_USAGE AS k "
            "JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r "
            "ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA "
            "AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME "
            "AND r.TABLE_NAME = k.TABLE_NAME "
            "WHERE k.CONSTRAINT_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL "
            "ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'check', 'table', t.TABLE_NAME, "
            "'constraint', c.CONSTRAINT_NAME, 'clause', c.CHECK_CLAUSE, "
            "'enforced', t.ENFORCED) FROM information_schema.TABLE_CONSTRAINTS AS t "
            "JOIN information_schema.CHECK_CONSTRAINTS AS c "
            "ON c.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA "
            "AND c.CONSTRAINT_NAME = t.CONSTRAINT_NAME "
            "WHERE t.CONSTRAINT_SCHEMA = DATABASE() AND t.CONSTRAINT_TYPE = 'CHECK' "
            "ORDER BY t.TABLE_NAME, c.CONSTRAINT_NAME;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'object', 'object_type', 'trigger', "
            "'name', TRIGGER_NAME, 'definition', ACTION_STATEMENT, "
            "'timing', ACTION_TIMING, 'event', EVENT_MANIPULATION) "
            "FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() "
            "ORDER BY TRIGGER_NAME;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'object', 'object_type', 'routine', "
            "'name', ROUTINE_NAME, 'routine_type', ROUTINE_TYPE, "
            "'definition', ROUTINE_DEFINITION, 'sql_mode', SQL_MODE) "
            "FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() "
            "ORDER BY ROUTINE_TYPE, ROUTINE_NAME;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'object', 'object_type', 'event', "
            "'name', EVENT_NAME, 'definition', EVENT_DEFINITION, "
            "'event_type', EVENT_TYPE, 'execute_at', EXECUTE_AT, "
            "'interval_value', INTERVAL_VALUE, 'interval_field', INTERVAL_FIELD, "
            "'status', STATUS) FROM information_schema.EVENTS "
            "WHERE EVENT_SCHEMA = DATABASE() ORDER BY EVENT_NAME;"
        ),
        (
            "SELECT JSON_OBJECT('kind', 'object', 'object_type', 'view', "
            "'name', TABLE_NAME, 'definition', VIEW_DEFINITION, "
            "'check_option', CHECK_OPTION, 'security_type', SECURITY_TYPE) "
            "FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() "
            "ORDER BY TABLE_NAME;"
        ),
    ]
    statements.extend(_snapshot_row_sql(table, columns) for table, columns in tables.items())
    statements.append("COMMIT;")
    return "\n".join(statements) + "\n"


def _group_schema(snapshot: Snapshot, kind: str) -> list[dict[str, object]]:
    """Return all schema records of one fixed kind."""

    return [record for record in snapshot.schema_records if record.get("kind") == kind]


def _assert_schema(snapshot: Snapshot, *, target: bool) -> None:
    """Require exact tables/columns/keys/FKs/check names for the selected phase."""

    expected_tables = TARGET_TABLES if target else BASELINE_TABLES
    expected_phase = "target" if target else "baseline"
    if snapshot.meta.get("phase") != expected_phase:
        raise Migration009ToolError("snapshot_phase_mismatch")
    table_rows = _group_schema(snapshot, "table")
    actual_tables = {str(row.get("table")) for row in table_rows}
    if actual_tables != set(expected_tables):
        raise Migration009ToolError("schema_table_set_invalid")
    expected_columns = TARGET_ROW_COLUMNS if target else BASELINE_ROW_COLUMNS
    expected_types = TARGET_COLUMN_TYPES if target else BASELINE_COLUMN_TYPES
    expected_nullable = TARGET_NULLABLE_COLUMNS if target else BASELINE_NULLABLE_COLUMNS
    expected_defaults = TARGET_COLUMN_DEFAULTS if target else BASELINE_COLUMN_DEFAULTS
    expected_extras = TARGET_COLUMN_EXTRAS if target else BASELINE_COLUMN_EXTRAS
    actual_columns: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in _group_schema(snapshot, "column"):
        actual_columns[str(row.get("table"))].append(row)
    for table, columns in expected_columns.items():
        ordered = sorted(actual_columns.get(table, ()), key=lambda row: int(row.get("ordinal") or 0))
        if tuple(str(row.get("column")) for row in ordered) != tuple(
            name for name, _kind in columns
        ):
            raise Migration009ToolError("schema_column_set_invalid")
        if tuple(_normalized_column_type(row.get("column_type")) for row in ordered) != expected_types[table]:
            raise Migration009ToolError("schema_column_type_invalid")
        for row in ordered:
            column_name = str(row.get("column"))
            nullable = bool(int(row.get("nullable") or 0))
            if nullable != (column_name in expected_nullable.get(table, set())):
                raise Migration009ToolError("schema_column_nullability_invalid")
            if "default" not in row or "extra" not in row:
                raise Migration009ToolError("schema_column_metadata_invalid")
            expected_default = expected_defaults.get((table, column_name))
            if _normalized_column_default(row["default"]) != expected_default:
                raise Migration009ToolError("schema_column_default_invalid")
            expected_extra = expected_extras.get((table, column_name), "")
            if _normalized_sql(row["extra"]) != expected_extra:
                raise Migration009ToolError("schema_column_extra_invalid")
    expected_pks = PRIMARY_KEYS if target else BASELINE_PRIMARY_KEYS
    indexes = _index_definitions(snapshot)
    for table, columns in expected_pks.items():
        definition = indexes.get((table, "PRIMARY"))
        if definition != (columns, True):
            raise Migration009ToolError("schema_primary_key_invalid")
    expected_fks = TARGET_FOREIGN_KEYS if target else BASELINE_FOREIGN_KEYS
    if _foreign_key_definitions(snapshot) != expected_fks:
        raise Migration009ToolError("schema_foreign_key_invalid")
    expected_indexes = TARGET_INDEXES if target else BASELINE_INDEXES
    non_primary = {
        key: definition
        for key, definition in indexes.items()
        if key[1] != "PRIMARY"
    }
    fk_prefixes: dict[str, set[tuple[str, ...]]] = defaultdict(set)
    for _name, (table, columns, _ref_table, _ref_columns, _delete_rule) in expected_fks.items():
        fk_prefixes[table].add(columns)
    normalized_indexes = {
        key: definition
        for key, definition in non_primary.items()
        if key in expected_indexes
        or definition[1]
        or not any(
            definition[0][: len(prefix)] == prefix
            for prefix in fk_prefixes.get(key[0], set())
        )
    }
    if normalized_indexes != expected_indexes:
        raise Migration009ToolError("schema_index_set_invalid")
    checks_by_table: dict[str, set[str]] = defaultdict(set)
    for row in _group_schema(snapshot, "check"):
        if str(row.get("enforced") or "YES").upper() != "YES":
            raise Migration009ToolError("schema_check_not_enforced")
        checks_by_table[str(row.get("table"))].add(str(row.get("constraint")))
    expected_checks = TARGET_CHECK_NAMES if target else {
        "story_messages": {"ck_story_messages_role"}
    }
    if {table: names for table, names in checks_by_table.items() if names} != expected_checks:
        raise Migration009ToolError("schema_check_set_invalid")
    if target:
        active_column = next(
            row
            for row in actual_columns["story_runs"]
            if row.get("column") == "active_slot"
        )
        if not _is_approved_active_slot_generation(
            active_column.get("generation_expression")
        ):
            raise Migration009ToolError("schema_active_slot_invalid")


def _index_definitions(
    snapshot: Snapshot,
) -> dict[tuple[str, str], tuple[tuple[str, ...], bool]]:
    """Group ordered information_schema index rows into comparable definitions."""

    grouped: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for row in _group_schema(snapshot, "index"):
        grouped[(str(row.get("table")), str(row.get("index")))].append(row)
    result: dict[tuple[str, str], tuple[tuple[str, ...], bool]] = {}
    for key, rows in grouped.items():
        ordered = sorted(rows, key=lambda row: int(row.get("sequence") or 0))
        columns = tuple(str(row.get("column")) for row in ordered)
        unique = all(int(row.get("non_unique") or 0) == 0 for row in ordered)
        result[key] = (columns, unique)
    return result


def _foreign_key_definitions(
    snapshot: Snapshot,
) -> dict[str, tuple[str, tuple[str, ...], str, tuple[str, ...], str]]:
    """Group ordered FK rows and retain ownership plus delete behavior."""

    grouped: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for row in _group_schema(snapshot, "foreign_key"):
        grouped[(str(row.get("table")), str(row.get("constraint")))].append(row)
    result: dict[str, tuple[str, tuple[str, ...], str, tuple[str, ...], str]] = {}
    for (table, name), rows in grouped.items():
        if name in result:
            raise Migration009ToolError("schema_foreign_key_name_duplicate")
        ordered = sorted(rows, key=lambda row: int(row.get("ordinal") or 0))
        result[name] = (
            table,
            tuple(str(row.get("column")) for row in ordered),
            str(ordered[0].get("referenced_table")),
            tuple(str(row.get("referenced_column")) for row in ordered),
            str(ordered[0].get("delete_rule") or "").upper(),
        )
    return result


def _managed_worlds(
    snapshot: Snapshot,
) -> tuple[
    dict[str, Mapping[str, object]],
    dict[str, dict[str, object]],
    dict[str, set[str]],
]:
    """Validate both fixed managed worlds and return source/target/participant maps."""

    source_by_id: dict[str, Mapping[str, object]] = {}
    target_by_id: dict[str, dict[str, object]] = {}
    participants: dict[str, set[str]] = {}
    for row in snapshot.rows.get("managed_story_worlds", ()):
        world_id = _json_text(row.get("story_world_id"), "managed_world_id_invalid")
        payload = _json_mapping(row.get("payload_json"), "managed_world_payload_invalid")
        if payload.get("id") != world_id or world_id in source_by_id:
            raise Migration009ToolError("managed_world_identity_invalid")
        try:
            converted = convert_legacy_story_world_payload(payload)
        except Migration009ContractError as exc:
            raise Migration009ToolError(exc.code) from exc
        stories = _json_list(converted.get("stories"), "managed_world_stories_invalid")
        if len(stories) != 1:
            raise Migration009ToolError("managed_world_story_count_invalid")
        story = _json_mapping(stories[0], "managed_world_story_invalid")
        raw_participants = _json_list(
            story.get("participants"), "managed_world_participants_invalid"
        )
        participant_ids = {
            _json_text(
                _json_mapping(item, "managed_world_participant_invalid").get("character_id"),
                "managed_world_participant_id_invalid",
            )
            for item in raw_participants
        }
        if len(participant_ids) != len(raw_participants):
            raise Migration009ToolError("managed_world_participant_duplicate")
        source_by_id[world_id] = payload
        target_by_id[world_id] = converted
        participants[world_id] = participant_ids
    if set(source_by_id) != set(STORY_ID_BY_WORLD_ID):
        raise Migration009ToolError("managed_world_set_invalid")
    return source_by_id, target_by_id, participants


def _state_and_runs(
    snapshot: Snapshot,
    managed_sources: Mapping[str, Mapping[str, object]],
) -> tuple[dict[tuple[str, str], dict[str, object]], dict[str, dict[str, object]]]:
    """Validate owner/world/run identities and return indexed baseline rows."""

    states: dict[tuple[str, str], dict[str, object]] = {}
    for row in snapshot.rows.get("player_story_states", ()):
        key = (
            _json_text(row.get("player_id"), "player_state_owner_invalid"),
            _json_text(row.get("story_world_id"), "player_state_world_invalid"),
        )
        if key in states or key[1] not in managed_sources:
            raise Migration009ToolError("player_state_identity_invalid")
        if isinstance(row.get("visit_count"), bool) or not isinstance(
            row.get("visit_count"), int
        ) or int(row["visit_count"]) < 0:
            raise Migration009ToolError("player_state_visit_count_invalid")
        states[key] = dict(row)
    runs: dict[str, dict[str, object]] = {}
    active_keys: set[tuple[str, str, str]] = set()
    for row in snapshot.rows.get("story_runs", ()):
        run_id = _json_text(row.get("id"), "story_run_id_invalid")
        owner = _json_text(row.get("player_id"), "story_run_owner_invalid")
        world_id = _json_text(row.get("story_world_id"), "story_run_world_invalid")
        if run_id in runs or (owner, world_id) not in states:
            raise Migration009ToolError("story_run_identity_invalid")
        story_id = STORY_ID_BY_WORLD_ID.get(world_id)
        if story_id is None:
            raise Migration009ToolError("story_run_world_unmapped")
        payload = managed_sources[world_id]
        role_ids = {
            _json_text(
                _json_mapping(item, "player_role_invalid").get("id"),
                "player_role_id_invalid",
            )
            for item in _json_list(payload.get("player_roles"), "player_roles_invalid")
        }
        if row.get("player_role_id") not in role_ids:
            raise Migration009ToolError("story_run_player_role_invalid")
        status = row.get("status")
        if status not in {"active", "completed"}:
            raise Migration009ToolError("story_run_status_invalid")
        if status == "active":
            active_key = (owner, world_id, story_id)
            if active_key in active_keys:
                raise Migration009ToolError("story_run_active_duplicate")
            active_keys.add(active_key)
            if row.get("completed_at") is not None:
                raise Migration009ToolError("story_run_active_completion_invalid")
            if row.get("ending_id") is not None or row.get("ending_summary") is not None:
                raise Migration009ToolError("story_run_active_ending_invalid")
            if row.get("content_version") != payload.get("content_version"):
                raise Migration009ToolError("story_run_active_content_version_invalid")
        chapters = {
            _json_text(
                _json_mapping(chapter, "story_chapter_invalid").get("id"),
                "story_chapter_id_invalid",
            ): _json_mapping(chapter, "story_chapter_invalid")
            for chapter in _json_list(payload.get("chapters"), "story_chapters_invalid")
        }
        chapter = chapters.get(row.get("current_chapter_id"))
        if chapter is None:
            raise Migration009ToolError("story_run_chapter_reference_invalid")
        node_ids = {
            _json_text(
                _json_mapping(node, "story_node_invalid").get("id"),
                "story_node_id_invalid",
            )
            for node in _json_list(chapter.get("nodes"), "story_nodes_invalid")
        }
        if row.get("current_node_id") not in node_ids:
            raise Migration009ToolError("story_run_node_reference_invalid")
        ending_ids = {
            _json_text(
                _json_mapping(ending, "story_ending_invalid").get("id"),
                "story_ending_id_invalid",
            )
            for ending in _json_list(payload.get("endings"), "story_endings_invalid")
        }
        if row.get("ending_id") is not None and row.get("ending_id") not in ending_ids:
            raise Migration009ToolError("story_run_ending_reference_invalid")
        runs[run_id] = dict(row)
    return states, runs


def _delete_target(
    states: Mapping[tuple[str, str], Mapping[str, object]],
    runs: Mapping[str, Mapping[str, object]],
) -> Mapping[str, object]:
    """Select exactly the approved incompatible run and reject every reference."""

    matches = [
        row
        for row in runs.values()
        if all(row.get(field) == value for field, value in LEGACY_DELETE_COHORT.items())
        and row.get("completed_at") is not None
    ]
    if len(matches) != 1:
        raise Migration009ToolError("legacy_delete_cohort_count_invalid")
    target = matches[0]
    target_id = target["id"]
    for state in states.values():
        if state.get("active_story_run_id") == target_id:
            raise Migration009ToolError("legacy_delete_target_active_reference")
        summaries = _json_list(
            state.get("completed_run_summaries"), "completed_summaries_invalid"
        )
        for item in summaries:
            summary = _json_mapping(item, "completed_summary_invalid")
            if summary.get("story_run_id") == target_id:
                raise Migration009ToolError("legacy_delete_target_summary_reference")
    try:
        story_run_fingerprint_v1(target)
    except Migration009ContractError as exc:
        raise Migration009ToolError(exc.code) from exc
    return target


def _progress_rows(
    states: Mapping[tuple[str, str], Mapping[str, object]],
    runs: Mapping[str, Mapping[str, object]],
    delete_run_id: str,
) -> tuple[dict[str, object], ...]:
    """Build per-story progress only after validating active pointers and summaries."""

    result: list[dict[str, object]] = []
    for (player_id, world_id), state in sorted(states.items()):
        story_id = STORY_ID_BY_WORLD_ID[world_id]
        owned_runs = {
            run_id: run
            for run_id, run in runs.items()
            if run_id != delete_run_id
            and run.get("player_id") == player_id
            and run.get("story_world_id") == world_id
        }
        active_run_id = state.get("active_story_run_id")
        if active_run_id is not None:
            active = owned_runs.get(str(active_run_id))
            if active is None or active.get("status") != "active":
                raise Migration009ToolError("progress_active_run_invalid")
        completed = {
            run_id: run
            for run_id, run in owned_runs.items()
            if run.get("status") == "completed"
        }
        for run in completed.values():
            if (
                not isinstance(run.get("ending_id"), str)
                or not isinstance(run.get("ending_summary"), str)
                or run.get("completed_at") is None
            ):
                raise Migration009ToolError("surviving_completed_run_invalid")
        raw_summaries = _json_list(
            state.get("completed_run_summaries"), "completed_summaries_invalid"
        )
        normalized: list[dict[str, object]] = []
        seen: set[str] = set()
        for raw in raw_summaries:
            summary = _json_mapping(raw, "completed_summary_invalid")
            run_id = _json_text(summary.get("story_run_id"), "completed_summary_run_invalid")
            run = completed.get(run_id)
            if run is None or run_id in seen:
                raise Migration009ToolError("completed_summary_reference_invalid")
            if summary.get("ending_id") != run.get("ending_id") or summary.get(
                "summary"
            ) != run.get("ending_summary"):
                raise Migration009ToolError("completed_summary_projection_invalid")
            seen.add(run_id)
            normalized.append(
                {
                    "story_run_id": run_id,
                    "story_id": story_id,
                    "ending_id": run["ending_id"],
                    "summary": run["ending_summary"],
                    "completed_at": run["completed_at"],
                }
            )
        if seen != set(completed):
            raise Migration009ToolError("completed_summary_coverage_invalid")
        result.append(
            {
                "player_id": player_id,
                "story_world_id": world_id,
                "story_id": story_id,
                "active_story_run_id": active_run_id,
                "last_visited_at": state.get("last_visited_at"),
                "completed_run_summaries": normalized,
            }
        )
    return tuple(result)


def _character_initials(
    managed_sources: Mapping[str, Mapping[str, object]],
) -> dict[tuple[str, str], tuple[float, str]]:
    """Resolve audited initial relationship values and their matching stage IDs."""

    result: dict[tuple[str, str], tuple[float, str]] = {}
    for world_id, payload in managed_sources.items():
        characters = _json_list(payload.get("characters"), "managed_characters_invalid")
        for raw in characters:
            character = _json_mapping(raw, "managed_character_invalid")
            character_id = _json_text(character.get("id"), "managed_character_id_invalid")
            rules = _json_mapping(
                character.get("relationship_rules"), "relationship_rules_invalid"
            )
            affinity = _finite_number(
                rules.get("initial_affinity"), "relationship_initial_affinity_invalid"
            )
            stages = _json_list(rules.get("stages"), "relationship_stages_invalid")
            eligible: list[tuple[float, str]] = []
            for raw_stage in stages:
                stage = _json_mapping(raw_stage, "relationship_stage_invalid")
                minimum = _finite_number(
                    stage.get("minimum_affinity"), "relationship_stage_threshold_invalid"
                )
                stage_id = _json_text(stage.get("id"), "relationship_stage_id_invalid")
                if affinity >= minimum:
                    eligible.append((minimum, stage_id))
            if not eligible:
                raise Migration009ToolError("relationship_initial_stage_missing")
            result[(world_id, character_id)] = (affinity, max(eligible)[1])
    return result


def _relationship_rows(
    snapshot: Snapshot,
    runs: Mapping[str, Mapping[str, object]],
    delete_run_id: str,
    managed_sources: Mapping[str, Mapping[str, object]],
    participants: Mapping[str, set[str]],
) -> tuple[tuple[dict[str, object], ...], int]:
    """Replay zero/one changed-run groups and build deterministic long-term rows."""

    initials = _character_initials(managed_sources)
    events_by_run_character: dict[tuple[str, str], list[Mapping[str, object]]] = defaultdict(list)
    for event in snapshot.rows.get("story_events", ()):
        if event.get("event_type") == "relationship_changed":
            run_id = _json_text(event.get("story_run_id"), "relationship_event_run_invalid")
            character_id = _json_text(
                event.get("character_id"), "relationship_event_character_invalid"
            )
            events_by_run_character[(run_id, character_id)].append(event)
    groups: dict[tuple[str, str, str], list[tuple[Mapping[str, object], Mapping[str, object]]]] = defaultdict(list)
    surviving_old_count = 0
    for relationship in snapshot.rows.get("character_relationships", ()):
        run_id = _json_text(
            relationship.get("story_run_id"), "relationship_run_invalid"
        )
        run = runs.get(run_id)
        if run is None:
            raise Migration009ToolError("relationship_orphan_run")
        character_id = _json_text(
            relationship.get("character_id"), "relationship_character_invalid"
        )
        world_id = str(run["story_world_id"])
        if character_id not in participants[world_id]:
            raise Migration009ToolError("relationship_character_not_participant")
        if run_id == delete_run_id:
            initial_affinity, initial_stage = initials[(world_id, character_id)]
            if events_by_run_character.get((run_id, character_id)) or not _relationship_matches(
                relationship,
                affinity=initial_affinity,
                stage=initial_stage,
                reason="",
                flags=[],
            ):
                raise Migration009ToolError("legacy_delete_relationship_invalid")
            continue
        surviving_old_count += 1
        groups[(str(run["player_id"]), world_id, character_id)].append((relationship, run))
    target: list[dict[str, object]] = []
    for (player_id, world_id, character_id), rows in sorted(groups.items()):
        initial_affinity, initial_stage = initials[(world_id, character_id)]
        changed: list[tuple[Mapping[str, object], Mapping[str, object], Mapping[str, object]]] = []
        for relationship, run in rows:
            run_id = str(run["id"])
            events = sorted(
                events_by_run_character.get((run_id, character_id), ()),
                key=lambda item: int(item.get("sequence") or -1),
            )
            if not events:
                if not _relationship_matches(
                    relationship,
                    affinity=initial_affinity,
                    stage=initial_stage,
                    reason="",
                    flags=[],
                ):
                    raise Migration009ToolError("relationship_unexplained_state")
                continue
            affinity = initial_affinity
            stage = initial_stage
            flags: list[str] = []
            reason = ""
            for event in events:
                payload = _json_mapping(
                    event.get("payload"), "relationship_event_payload_invalid"
                )
                before = _finite_number(
                    payload.get("affinity_before"), "relationship_event_before_invalid"
                )
                after = _finite_number(
                    payload.get("affinity_after"), "relationship_event_after_invalid"
                )
                event_stage = _json_text(
                    payload.get("stage"), "relationship_event_stage_invalid"
                )
                set_flags = [
                    _json_text(item, "relationship_event_flag_invalid")
                    for item in _json_list(
                        payload.get("set_flags"), "relationship_event_flags_invalid"
                    )
                ]
                if not math.isclose(before, affinity, rel_tol=0.0, abs_tol=1e-9):
                    raise Migration009ToolError("relationship_event_replay_gap")
                affinity = after
                stage = event_stage
                flags = list(dict.fromkeys([*flags, *set_flags]))
                reason = _json_text(
                    event.get("content"), "relationship_event_reason_invalid"
                )
            if not _relationship_matches(
                relationship,
                affinity=affinity,
                stage=stage,
                reason=reason,
                flags=flags,
            ):
                raise Migration009ToolError("relationship_replay_mismatch")
            changed.append((relationship, run, events[-1]))
        if len(changed) > 1:
            raise Migration009ToolError("relationship_multiple_changed_runs")
        if changed:
            relationship, run, source_event = changed[0]
            source_run_id: str | None = str(run["id"])
            source_event_id: str | None = _json_text(
                source_event.get("id"), "relationship_source_event_invalid"
            )
        else:
            relationship = rows[0][0]
            source_run_id = None
            source_event_id = None
        target.append(
            {
                "player_id": player_id,
                "story_world_id": world_id,
                "character_id": character_id,
                "affinity": relationship["affinity"],
                "stage": relationship["stage"],
                "last_change_reason": relationship["last_change_reason"],
                "flags": relationship["flags"],
                "last_source_story_run_id": source_run_id,
                "last_source_event_id": source_event_id,
            }
        )
    return tuple(target), surviving_old_count


def _relationship_matches(
    relationship: Mapping[str, object],
    *,
    affinity: float,
    stage: str,
    reason: str,
    flags: Sequence[str],
) -> bool:
    """Compare one stored run relationship with a fully replayed projection."""

    try:
        stored_affinity = _finite_number(
            relationship.get("affinity"), "relationship_affinity_invalid"
        )
        stored_flags = [
            _json_text(item, "relationship_flag_invalid")
            for item in _json_list(relationship.get("flags"), "relationship_flags_invalid")
        ]
    except Migration009ToolError:
        return False
    return (
        math.isclose(stored_affinity, affinity, rel_tol=0.0, abs_tol=1e-9)
        and relationship.get("stage") == stage
        and relationship.get("last_change_reason") == reason
        and stored_flags == list(flags)
    )


def _message_rows(
    snapshot: Snapshot,
    runs: Mapping[str, Mapping[str, object]],
    delete_run_id: str,
    participants: Mapping[str, set[str]],
) -> tuple[dict[str, object], ...]:
    """Project every surviving message event and reject visibility/source drift."""

    events_by_run: dict[str, list[Mapping[str, object]]] = defaultdict(list)
    messages_by_run: dict[str, list[Mapping[str, object]]] = defaultdict(list)
    for event in snapshot.rows.get("story_events", ()):
        run_id = _json_text(event.get("story_run_id"), "story_event_run_invalid")
        run = runs.get(run_id)
        if run is None:
            raise Migration009ToolError("story_event_orphan_run")
        character_id = event.get("character_id")
        if character_id is not None and character_id not in participants[str(run["story_world_id"])]:
            raise Migration009ToolError("story_event_character_not_participant")
        events_by_run[run_id].append(event)
    for message in snapshot.rows.get("story_messages", ()):
        run_id = _json_text(message.get("story_run_id"), "story_message_run_invalid")
        if run_id not in runs:
            raise Migration009ToolError("story_message_orphan_run")
        messages_by_run[run_id].append(message)
    projected: list[dict[str, object]] = []
    for run_id, run in sorted(runs.items()):
        try:
            run_projection = project_story_messages(
                story_run_id=run_id,
                events=events_by_run.get(run_id, ()),
                participant_character_ids=participants[str(run["story_world_id"])],
            )
            assert_existing_messages_match_projection(
                messages_by_run.get(run_id, ()), run_projection
            )
        except Migration009ContractError as exc:
            raise Migration009ToolError(exc.code) from exc
        if run_id == delete_run_id:
            continue
        projected.extend(run_projection)
    return tuple(projected)


def build_plan(snapshot: Snapshot) -> MigrationPlan:
    """Validate one exact eight-table snapshot and create the only allowed plan."""

    _assert_schema(snapshot, target=False)
    managed_sources, managed_targets, participants = _managed_worlds(snapshot)
    states, runs = _state_and_runs(snapshot, managed_sources)
    delete_run = _delete_target(states, runs)
    delete_run_id = str(delete_run["id"])
    if snapshot.rows.get("private_memories"):
        raise Migration009ToolError("legacy_private_memories_not_empty")
    delete_children = {
        "character_relationships": tuple(
            row
            for row in snapshot.rows.get("character_relationships", ())
            if row.get("story_run_id") == delete_run_id
        ),
        "story_messages": tuple(
            row
            for row in snapshot.rows.get("story_messages", ())
            if row.get("story_run_id") == delete_run_id
        ),
        "story_events": tuple(
            row
            for row in snapshot.rows.get("story_events", ())
            if row.get("story_run_id") == delete_run_id
        ),
        "private_memories": tuple(),
    }
    progress = _progress_rows(states, runs, delete_run_id)
    relationships, surviving_old_count = _relationship_rows(
        snapshot,
        runs,
        delete_run_id,
        managed_sources,
        participants,
    )
    messages = _message_rows(snapshot, runs, delete_run_id, participants)
    managed_rows = tuple(
        {
            "story_world_id": world_id,
            "payload_json": managed_targets[world_id],
        }
        for world_id in sorted(managed_targets)
    )
    return MigrationPlan(
        delete_run=delete_run,
        delete_children=delete_children,
        delete_counts={table: len(rows) for table, rows in delete_children.items()},
        delete_hashes={table: rowset_hash(rows) for table, rows in delete_children.items()},
        surviving_run_count=len(runs) - 1,
        surviving_relationship_count=surviving_old_count,
        progress_rows=progress,
        relationship_rows=relationships,
        message_rows=messages,
        managed_world_rows=managed_rows,
    )


def preflight_report(snapshot: Snapshot, plan: MigrationPlan) -> dict[str, object]:
    """Create a persistable redacted preflight report from one validated plan."""

    return {
        "contract": PREFLIGHT_CONTRACT,
        "migration_id": MIGRATION_ID,
        "verdict": "PASS",
        "snapshot_digest": snapshot.digest(),
        "schema_digest": snapshot.schema_digest(),
        "mysql_version_hash": canonical_hash(snapshot.meta.get("mysql_version")),
        "tables": snapshot.table_manifest(),
        "plan": plan.safe_projection(),
    }


def _hex_text(value: object) -> str:
    """Encode one private UTF-8 value as a non-interpreted MySQL hex literal."""

    if not isinstance(value, str):
        raise Migration009ToolError("plan_text_value_invalid")
    return "0x" + value.encode("utf-8").hex()


def _sql_text(value: object) -> str:
    """Return a nullable UTF-8 SQL expression without quote interpolation."""

    if value is None:
        return "NULL"
    return f"CONVERT({_hex_text(value)} USING utf8mb4)"


def _sql_json(value: object) -> str:
    """Return a canonical JSON SQL expression encoded through a hex literal."""

    return f"CAST(CONVERT({_hex_text(canonical_json(value))} USING utf8mb4) AS JSON)"


def _sql_datetime(value: object) -> str:
    """Return a nullable UTC DATETIME expression from the fixed snapshot format."""

    if value is None:
        return "NULL"
    return f"STR_TO_DATE({_hex_text(value)}, '%Y-%m-%dT%H:%i:%s.%fZ')"


def _sql_number(value: object) -> str:
    """Return a finite numeric literal without accepting booleans or strings."""

    number = _finite_number(value, "plan_number_invalid")
    return format(number, ".17g")


def plan_sql(snapshot: Snapshot, plan: MigrationPlan) -> str:
    """Render private projections into session-local staging tables for 009."""

    safe = plan.safe_projection()
    delete = safe["delete"]
    guarded_child_tables = (
        "character_relationships",
        "story_messages",
        "story_events",
    )
    for table in guarded_child_tables:
        rows = plan.delete_children.get(table, ())
        if (
            len(rows) != plan.delete_counts.get(table)
            or rowset_hash(rows) != plan.delete_hashes.get(table)
        ):
            raise Migration009ToolError("delete_guard_plan_inconsistent")
    run_fingerprint_payload = story_run_fingerprint_payload_v1(plan.delete_run)
    child_hash_payloads = {
        table: rowset_hash_payload(plan.delete_children[table])
        for table in guarded_child_tables
    }
    lines = [
        "-- Generated by migration_009_tool.py; contains private migration data.",
        "-- Keep mode 0600, never log this file, and delete it after the maintenance window.",
        "SET NAMES utf8mb4;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_meta` (",
        "  `migration_id` VARCHAR(64) NOT NULL PRIMARY KEY,",
        "  `snapshot_digest` CHAR(64) NOT NULL,",
        "  `delete_run_id` VARCHAR(36) NOT NULL,",
        "  `delete_player_id` VARCHAR(64) NOT NULL,",
        "  `delete_story_world_id` VARCHAR(128) NOT NULL,",
        "  `delete_run_fingerprint` CHAR(64) NOT NULL,",
        "  `delete_run_fingerprint_payload` LONGTEXT NOT NULL,",
        "  `delete_relationship_count` INT NOT NULL,",
        "  `delete_relationship_hash` CHAR(64) NOT NULL,",
        "  `delete_relationship_hash_payload` LONGTEXT NOT NULL,",
        "  `delete_message_count` INT NOT NULL,",
        "  `delete_message_hash` CHAR(64) NOT NULL,",
        "  `delete_message_hash_payload` LONGTEXT NOT NULL,",
        "  `delete_event_count` INT NOT NULL,",
        "  `delete_event_hash` CHAR(64) NOT NULL,",
        "  `delete_event_hash_payload` LONGTEXT NOT NULL,",
        "  `delete_memory_count` INT NOT NULL,",
        "  `baseline_run_count` INT NOT NULL,",
        "  `baseline_relationship_count` INT NOT NULL,",
        "  `baseline_message_count` INT NOT NULL,",
        "  `baseline_event_count` INT NOT NULL,",
        "  `surviving_run_count` INT NOT NULL,",
        "  `surviving_old_relationship_count` INT NOT NULL",
        ") ENGINE=InnoDB;",
        (
            "INSERT INTO `_fablespace_009_plan_meta` VALUES ("
            f"{_sql_text(MIGRATION_ID)}, {_sql_text(snapshot.digest())}, "
            f"{_sql_text(plan.delete_run['id'])}, {_sql_text(plan.delete_run['player_id'])}, "
            f"{_sql_text(plan.delete_run['story_world_id'])}, "
            f"{_sql_text(delete['fingerprint'])}, "
            f"{_sql_text(run_fingerprint_payload)}, "
            f"{plan.delete_counts['character_relationships']}, "
            f"{_sql_text(plan.delete_hashes['character_relationships'])}, "
            f"{_sql_text(child_hash_payloads['character_relationships'])}, "
            f"{plan.delete_counts['story_messages']}, "
            f"{_sql_text(plan.delete_hashes['story_messages'])}, "
            f"{_sql_text(child_hash_payloads['story_messages'])}, "
            f"{plan.delete_counts['story_events']}, "
            f"{_sql_text(plan.delete_hashes['story_events'])}, "
            f"{_sql_text(child_hash_payloads['story_events'])}, "
            f"{plan.delete_counts['private_memories']}, "
            f"{len(snapshot.rows.get('story_runs', ()))}, "
            f"{len(snapshot.rows.get('character_relationships', ()))}, "
            f"{len(snapshot.rows.get('story_messages', ()))}, "
            f"{len(snapshot.rows.get('story_events', ()))}, {plan.surviving_run_count}, "
            f"{plan.surviving_relationship_count});"
        ),
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_delete_run` (",
        "  `id` VARCHAR(36) NOT NULL PRIMARY KEY, `player_id` VARCHAR(64) NOT NULL,",
        "  `story_world_id` VARCHAR(128) NOT NULL, `content_version` VARCHAR(128) NOT NULL,",
        "  `player_role_id` VARCHAR(128) NOT NULL, `status` VARCHAR(16) NOT NULL,",
        "  `current_chapter_id` VARCHAR(128) NOT NULL, `current_node_id` VARCHAR(128) NOT NULL,",
        "  `key_choices` JSON NOT NULL, `story_flags` JSON NOT NULL,",
        "  `ending_id` VARCHAR(128) NULL, `ending_summary` TEXT NULL,",
        "  `started_at` DATETIME NOT NULL, `completed_at` DATETIME NULL",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_delete_relationships` (",
        "  `story_run_id` VARCHAR(36) NOT NULL, `character_id` VARCHAR(128) NOT NULL,",
        "  `affinity` DOUBLE NOT NULL, `stage` VARCHAR(64) NOT NULL,",
        "  `last_change_reason` TEXT NOT NULL, `flags` JSON NOT NULL,",
        "  PRIMARY KEY (`story_run_id`, `character_id`)",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_delete_messages` (",
        "  `id` VARCHAR(36) NOT NULL PRIMARY KEY, `story_run_id` VARCHAR(36) NOT NULL,",
        "  `sequence` INT NOT NULL, `role` VARCHAR(16) NOT NULL, `character_id` VARCHAR(128) NULL,",
        "  `visible_to_character_ids` JSON NOT NULL, `content` TEXT NOT NULL,",
        "  `source_event_id` VARCHAR(36) NOT NULL, `source_event_sequence` INT NOT NULL,",
        "  `created_at` DATETIME NOT NULL",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_delete_events` (",
        "  `id` VARCHAR(36) NOT NULL PRIMARY KEY, `story_run_id` VARCHAR(36) NOT NULL,",
        "  `sequence` INT NOT NULL, `event_type` VARCHAR(32) NOT NULL,",
        "  `character_id` VARCHAR(128) NULL, `role` VARCHAR(16) NULL, `content` TEXT NOT NULL,",
        "  `source_kind` VARCHAR(32) NOT NULL, `source_id` VARCHAR(128) NULL,",
        "  `payload` JSON NOT NULL, `created_at` DATETIME NOT NULL",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_progress` (",
        "  `player_id` VARCHAR(64) NOT NULL, `story_world_id` VARCHAR(128) NOT NULL,",
        "  `story_id` VARCHAR(128) NOT NULL, `active_story_run_id` VARCHAR(36) NULL,",
        "  `last_visited_at` DATETIME NULL, `completed_run_summaries` JSON NOT NULL,",
        "  PRIMARY KEY (`player_id`, `story_world_id`, `story_id`)",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_relationships` (",
        "  `player_id` VARCHAR(64) NOT NULL, `story_world_id` VARCHAR(128) NOT NULL,",
        "  `character_id` VARCHAR(128) NOT NULL, `affinity` DOUBLE NOT NULL,",
        "  `stage` VARCHAR(64) NOT NULL, `last_change_reason` TEXT NOT NULL, `flags` JSON NOT NULL,",
        "  `last_source_story_run_id` VARCHAR(36) NULL, `last_source_event_id` VARCHAR(36) NULL,",
        "  PRIMARY KEY (`player_id`, `story_world_id`, `character_id`)",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_messages` (",
        "  `id` VARCHAR(36) NOT NULL PRIMARY KEY, `story_run_id` VARCHAR(36) NOT NULL,",
        "  `sequence` INT NOT NULL, `role` VARCHAR(16) NOT NULL, `character_id` VARCHAR(128) NULL,",
        "  `visible_to_character_ids` JSON NOT NULL, `content` TEXT NOT NULL,",
        "  `source_event_id` VARCHAR(36) NOT NULL, `source_event_sequence` INT NOT NULL,",
        "  `created_at` DATETIME NOT NULL, UNIQUE KEY `uq_plan_message_source` (`source_event_id`)",
        ") ENGINE=InnoDB;",
        "CREATE TEMPORARY TABLE `_fablespace_009_plan_managed_worlds` (",
        "  `story_world_id` VARCHAR(128) NOT NULL PRIMARY KEY, `payload_json` JSON NOT NULL",
        ") ENGINE=InnoDB;",
    ]
    run = plan.delete_run
    lines.append(
        "INSERT INTO `_fablespace_009_plan_delete_run` VALUES ("
        f"{_sql_text(run['id'])}, {_sql_text(run['player_id'])}, "
        f"{_sql_text(run['story_world_id'])}, {_sql_text(run['content_version'])}, "
        f"{_sql_text(run['player_role_id'])}, {_sql_text(run['status'])}, "
        f"{_sql_text(run['current_chapter_id'])}, {_sql_text(run['current_node_id'])}, "
        f"{_sql_json(run['key_choices'])}, {_sql_json(run['story_flags'])}, "
        f"{_sql_text(run['ending_id'])}, {_sql_text(run['ending_summary'])}, "
        f"{_sql_datetime(run['started_at'])}, {_sql_datetime(run['completed_at'])});"
    )
    for row in plan.delete_children["character_relationships"]:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_delete_relationships` VALUES ("
            f"{_sql_text(row['story_run_id'])}, {_sql_text(row['character_id'])}, "
            f"{_sql_number(row['affinity'])}, {_sql_text(row['stage'])}, "
            f"{_sql_text(row['last_change_reason'])}, {_sql_json(row['flags'])});"
        )
    for row in plan.delete_children["story_messages"]:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_delete_messages` VALUES ("
            f"{_sql_text(row['id'])}, {_sql_text(row['story_run_id'])}, "
            f"{int(row['sequence'])}, {_sql_text(row['role'])}, "
            f"{_sql_text(row['character_id'])}, {_sql_json(row['visible_to_character_ids'])}, "
            f"{_sql_text(row['content'])}, {_sql_text(row['source_event_id'])}, "
            f"{int(row['source_event_sequence'])}, {_sql_datetime(row['created_at'])});"
        )
    for row in plan.delete_children["story_events"]:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_delete_events` VALUES ("
            f"{_sql_text(row['id'])}, {_sql_text(row['story_run_id'])}, "
            f"{int(row['sequence'])}, {_sql_text(row['event_type'])}, "
            f"{_sql_text(row['character_id'])}, {_sql_text(row['role'])}, "
            f"{_sql_text(row['content'])}, {_sql_text(row['source_kind'])}, "
            f"{_sql_text(row['source_id'])}, {_sql_json(row['payload'])}, "
            f"{_sql_datetime(row['created_at'])});"
        )
    for row in plan.progress_rows:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_progress` VALUES ("
            f"{_sql_text(row['player_id'])}, {_sql_text(row['story_world_id'])}, "
            f"{_sql_text(row['story_id'])}, {_sql_text(row['active_story_run_id'])}, "
            f"{_sql_datetime(row['last_visited_at'])}, "
            f"{_sql_json(row['completed_run_summaries'])});"
        )
    for row in plan.relationship_rows:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_relationships` VALUES ("
            f"{_sql_text(row['player_id'])}, {_sql_text(row['story_world_id'])}, "
            f"{_sql_text(row['character_id'])}, {_sql_number(row['affinity'])}, "
            f"{_sql_text(row['stage'])}, {_sql_text(row['last_change_reason'])}, "
            f"{_sql_json(row['flags'])}, {_sql_text(row['last_source_story_run_id'])}, "
            f"{_sql_text(row['last_source_event_id'])});"
        )
    for row in plan.message_rows:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_messages` VALUES ("
            f"{_sql_text(row['id'])}, {_sql_text(row['story_run_id'])}, "
            f"{int(row['sequence'])}, {_sql_text(row['role'])}, "
            f"{_sql_text(row['character_id'])}, {_sql_json(row['visible_to_character_ids'])}, "
            f"{_sql_text(row['content'])}, {_sql_text(row['source_event_id'])}, "
            f"{int(row['source_event_sequence'])}, {_sql_datetime(row['created_at'])});"
        )
    for row in plan.managed_world_rows:
        lines.append(
            "INSERT INTO `_fablespace_009_plan_managed_worlds` VALUES ("
            f"{_sql_text(row['story_world_id'])}, {_sql_json(row['payload_json'])});"
        )
    return "\n".join(lines) + "\n"


def compare_snapshots(left: Snapshot, right: Snapshot) -> dict[str, object]:
    """Require byte-independent canonical equality for stop-write or restore gates."""

    if left.digest() != right.digest():
        raise Migration009ToolError("snapshot_drift_detected")
    return {
        "contract": TOOL_CONTRACT,
        "verdict": "PASS",
        "snapshot_digest": left.digest(),
        "schema_digest": left.schema_digest(),
        "tables": left.table_manifest(),
    }


def compare_preflights(left: Mapping[str, object], right: Mapping[str, object]) -> None:
    """Require the first and stopped-write redacted preflight artifacts to match."""

    required = {"snapshot_digest", "schema_digest", "tables", "plan"}
    if left.get("contract") != PREFLIGHT_CONTRACT or right.get("contract") != PREFLIGHT_CONTRACT:
        raise Migration009ToolError("preflight_contract_invalid")
    if any(left.get(field) != right.get(field) for field in required):
        raise Migration009ToolError("preflight_drift_detected")


def postflight_report(before: Snapshot, after: Snapshot) -> dict[str, object]:
    """Validate exact target Schema and every allowed business projection/delta."""

    plan = build_plan(before)
    _assert_schema(after, target=True)
    before_objects = tuple(
        record for record in before.schema_records if record.get("kind") == "object"
    )
    after_objects = tuple(
        record for record in after.schema_records if record.get("kind") == "object"
    )
    if rowset_hash(before_objects) != rowset_hash(after_objects):
        raise Migration009ToolError("postflight_database_object_changed")
    if after.rows.get("private_memories") or after.rows.get("private_memory_sources") or after.rows.get(
        "memory_formation_jobs"
    ):
        raise Migration009ToolError("postflight_memory_tables_not_empty")
    delete_run_id = str(plan.delete_run["id"])
    after_runs = {str(row.get("id")): row for row in after.rows.get("story_runs", ())}
    if delete_run_id in after_runs or len(after_runs) != plan.surviving_run_count:
        raise Migration009ToolError("postflight_story_run_delta_invalid")
    before_surviving_runs = {
        str(row["id"]): row
        for row in before.rows.get("story_runs", ())
        if row.get("id") != delete_run_id
    }
    for run_id, old in before_surviving_runs.items():
        new = after_runs.get(run_id)
        if new is None:
            raise Migration009ToolError("postflight_surviving_run_missing")
        expected = dict(old)
        expected["story_id"] = STORY_ID_BY_WORLD_ID[str(old["story_world_id"])]
        expected["active_slot"] = 1 if old.get("status") == "active" else None
        if canonical_json(new) != canonical_json(expected):
            raise Migration009ToolError("postflight_surviving_run_changed")
    _assert_projected_rows(
        after.rows.get("player_story_progress", ()),
        plan.progress_rows,
        "postflight_progress_invalid",
    )
    relationship_after = [
        {key: value for key, value in row.items() if key != "updated_at"}
        for row in after.rows.get("character_relationships", ())
    ]
    if any(row.get("updated_at") is None for row in after.rows.get("character_relationships", ())):
        raise Migration009ToolError("postflight_relationship_timestamp_invalid")
    _assert_projected_rows(
        relationship_after,
        plan.relationship_rows,
        "postflight_relationship_invalid",
    )
    _assert_projected_rows(
        after.rows.get("story_messages", ()),
        plan.message_rows,
        "postflight_message_invalid",
    )
    before_events = tuple(
        row
        for row in before.rows.get("story_events", ())
        if row.get("story_run_id") != delete_run_id
    )
    _assert_projected_rows(
        after.rows.get("story_events", ()),
        before_events,
        "postflight_event_delta_invalid",
    )
    before_states = tuple(
        {
            "player_id": row["player_id"],
            "story_world_id": row["story_world_id"],
            "visit_count": row["visit_count"],
            "last_visited_at": row["last_visited_at"],
        }
        for row in before.rows.get("player_story_states", ())
    )
    _assert_projected_rows(
        after.rows.get("player_story_states", ()),
        before_states,
        "postflight_player_state_invalid",
    )
    before_worlds = {
        str(row["story_world_id"]): row
        for row in before.rows.get("managed_story_worlds", ())
    }
    expected_worlds = tuple(
        {
            "story_world_id": row["story_world_id"],
            "payload_json": row["payload_json"],
            "updated_at": before_worlds[str(row["story_world_id"])]["updated_at"],
        }
        for row in plan.managed_world_rows
    )
    _assert_projected_rows(
        after.rows.get("managed_story_worlds", ()),
        expected_worlds,
        "postflight_managed_world_invalid",
    )
    _assert_projected_rows(
        after.rows.get("managed_media_assets", ()),
        before.rows.get("managed_media_assets", ()),
        "postflight_managed_media_changed",
    )
    return {
        "contract": POSTFLIGHT_CONTRACT,
        "migration_id": MIGRATION_ID,
        "verdict": "PASS",
        "before_snapshot_digest": before.digest(),
        "after_snapshot_digest": after.digest(),
        "after_schema_digest": after.schema_digest(),
        "tables": after.table_manifest(),
        "deletion": plan.safe_projection()["delete"],
    }


def _assert_projected_rows(
    actual: Sequence[Mapping[str, object]],
    expected: Sequence[Mapping[str, object]],
    code: str,
) -> None:
    """Require canonical row-set equality without exposing a mismatching value."""

    if len(actual) != len(expected) or rowset_hash(actual) != rowset_hash(expected):
        raise Migration009ToolError(code)


def backup_manifest(
    *, preflight: Mapping[str, object], backup_path: Path, restored: Snapshot
) -> dict[str, object]:
    """Bind a non-empty backup hash to its restored exact snapshot verification."""

    if preflight.get("contract") != PREFLIGHT_CONTRACT or preflight.get("verdict") != "PASS":
        raise Migration009ToolError("backup_preflight_invalid")
    try:
        if backup_path.stat().st_size <= 0:
            raise Migration009ToolError("backup_empty")
        digest = sha256()
        with backup_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError as exc:
        raise Migration009ToolError("backup_unreadable") from exc
    if restored.digest() != preflight.get("snapshot_digest"):
        raise Migration009ToolError("backup_restore_snapshot_mismatch")
    return {
        "contract": "fablespace-migration-009-backup-manifest-v1",
        "migration_id": MIGRATION_ID,
        "backup_file": backup_path.name,
        "backup_byte_count": backup_path.stat().st_size,
        "backup_sha256": digest.hexdigest(),
        "restored_snapshot_digest": restored.digest(),
        "restored_schema_digest": restored.schema_digest(),
        "tables": restored.table_manifest(),
        "verdict": "PASS",
    }


def validate_assets(*, repository_root: Path) -> dict[str, object]:
    """Statically verify the unique migration plus every workflow-pinned release token."""

    migration = repository_root / MIGRATION_FILE
    marker = repository_root / "deploy" / "schema-revision.txt"
    approval = repository_root / "deploy" / "release-approval.txt"
    contract = repository_root / "deploy" / "server" / "migration_009_contract.py"
    tool = repository_root / "deploy" / "server" / "migration_009_tool.py"
    apply_script = repository_root / "deploy" / "server" / "apply_multi_story_009.sh"
    workflow = repository_root / ".github" / "workflows" / "apply-multi-story-009.yml"
    migrations = sorted((repository_root / "apps" / "api" / "sql" / "migrations").glob("009_*.sql"))
    if migrations != [migration]:
        raise Migration009ToolError("migration_009_count_invalid")
    try:
        sql = migration.read_text(encoding="utf-8")
        marker_bytes = marker.read_bytes()
        approval_bytes = approval.read_bytes()
        contract_bytes = contract.read_bytes()
        tool_bytes = tool.read_bytes()
        apply_script_bytes = apply_script.read_bytes()
        apply_script_text = apply_script_bytes.decode("utf-8")
        workflow_text = workflow.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise Migration009ToolError("migration_asset_unreadable") from exc
    if marker_bytes != b"009_multi_story_atomic_switch\n":
        raise Migration009ToolError("schema_revision_marker_invalid")
    if approval_bytes != b"009_multi_story_atomic_switch_runtime_healthy\n":
        raise Migration009ToolError("release_approval_marker_invalid")
    required_fragments = {
        "_fablespace_migration_009_multi_story_atomic_switch",
        "_fablespace_009_plan_meta",
        "_fablespace_009_plan_delete_run",
        "_fablespace_009_plan_delete_relationships",
        "_fablespace_009_plan_delete_messages",
        "_fablespace_009_plan_delete_events",
        "delete_run_fingerprint_payload",
        "delete_relationship_hash_payload",
        "delete_message_hash_payload",
        "delete_event_hash_payload",
        "@@GLOBAL.read_only",
        "player_story_progress",
        "private_memory_sources",
        "memory_formation_jobs",
        "fk_private_memory_sources_source_event",
        "ck_memory_formation_jobs_status_watermark",
        "DROP TABLE `private_memories`",
        "DELETE FROM `character_relationships`",
        "DELETE FROM `story_messages`",
        "DELETE FROM `story_events`",
        "DELETE FROM `story_runs`",
    }
    if any(fragment not in sql for fragment in required_fragments):
        raise Migration009ToolError("migration_sql_contract_incomplete")
    if "mysql --force" in sql.lower() or re.search(r"\b010_", sql):
        raise Migration009ToolError("migration_sql_forbidden_fragment")
    expected_action = f"appleboy/ssh-action@{SSH_ACTION_COMMIT}"
    workflow_fragments = {
        expected_action,
        'APPLY_SCRIPT_RELATIVE="deploy/server/apply_multi_story_009.sh"',
        "git fetch --force --no-tags origin",
        "refs/heads/main:refs/remotes/origin/main",
        'git show "${EXPECTED_SHA}:${APPLY_SCRIPT_RELATIVE}"',
        'git rev-parse --verify "refs/remotes/origin/main^{commit}"',
        'exec env EXPECTED_SHA="${EXPECTED_SHA}"',
        'FABLESPACE_EXPORTED_APPLY_SCRIPT="${APPLY_SCRIPT_TEMP}"',
        '/bin/sh "${APPLY_SCRIPT_TEMP}"',
    }
    apply_script_fragments = {
        "enable_database_write_exclusion",
        "release_database_write_exclusion",
        "SET GLOBAL read_only = ON",
        "SET GLOBAL read_only = OFF",
        "FIRST_WRITE_STARTED=true",
        "trap cleanup EXIT",
    }
    if any(fragment not in workflow_text for fragment in workflow_fragments):
        raise Migration009ToolError("migration_workflow_contract_incomplete")
    if any(fragment not in apply_script_text for fragment in apply_script_fragments):
        raise Migration009ToolError("migration_apply_script_contract_incomplete")
    if re.search(r"appleboy/ssh-action@(?![0-9a-f]{40}(?:\s|#))", workflow_text):
        raise Migration009ToolError("migration_workflow_action_not_commit_pinned")
    if workflow_text.count(expected_action) != 1:
        raise Migration009ToolError("migration_workflow_action_count_invalid")
    if re.search(r"\bscript_path\s*:", workflow_text):
        raise Migration009ToolError("migration_workflow_script_path_forbidden")
    if "${{" in apply_script_text:
        raise Migration009ToolError("migration_apply_script_expression_forbidden")
    bootstrap_marker = "          script: |\n"
    if workflow_text.count(bootstrap_marker) != 1:
        raise Migration009ToolError("migration_workflow_bootstrap_invalid")
    bootstrap_text = workflow_text.split(bootstrap_marker, 1)[1]
    if len(bootstrap_text) >= 21_000:
        raise Migration009ToolError("migration_workflow_bootstrap_too_large")
    pinned_assets = {
        "migration": sha256(migration.read_bytes()).hexdigest(),
        "contract": sha256(contract_bytes).hexdigest(),
        "tool": sha256(tool_bytes).hexdigest(),
        "marker": sha256(marker_bytes).hexdigest(),
        "approval": sha256(approval_bytes).hexdigest(),
        "apply_script": sha256(apply_script_bytes).hexdigest(),
    }
    for asset, digest in pinned_assets.items():
        lower_matches = re.findall(
            rf'expected_{asset}_sha="([0-9a-f]{{64}})"',
            workflow_text,
        )
        upper_matches = re.findall(
            rf'EXPECTED_{asset.upper()}_SHA="([0-9a-f]{{64}})"',
            workflow_text if asset == "apply_script" else apply_script_text,
        )
        if lower_matches != [digest] or upper_matches != [digest]:
            raise Migration009ToolError("migration_workflow_asset_hash_mismatch")
        if asset != "apply_script" and re.search(
            rf'expected_{asset}_sha="[0-9a-f]{{64}}"',
            apply_script_text,
        ):
            raise Migration009ToolError("migration_apply_script_hash_anchor_invalid")
    if re.search(r"EXPECTED_APPLY_SCRIPT_SHA=", apply_script_text):
        raise Migration009ToolError("migration_apply_script_self_hash_forbidden")
    return {
        "contract": TOOL_CONTRACT,
        "migration_id": MIGRATION_ID,
        "verdict": "PASS",
        "migration_sha256": pinned_assets["migration"],
        "marker_sha256": pinned_assets["marker"],
        "approval_sha256": pinned_assets["approval"],
        "apply_script_sha256": pinned_assets["apply_script"],
        "ssh_action_commit": SSH_ACTION_COMMIT,
    }


def _read_json_object(path: Path, code: str) -> Mapping[str, object]:
    """Read one JSON object artifact without accepting arrays or scalar values."""

    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise Migration009ToolError(code) from exc
    if not isinstance(value, Mapping):
        raise Migration009ToolError(code)
    return value


def _write_json(path: Path | None, value: Mapping[str, object]) -> None:
    """Write stable JSON to a requested file or stdout without private samples."""

    encoded = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path is None:
        sys.stdout.write(encoded)
        return
    path.write_text(encoded, encoding="utf-8", newline="\n")


def _parser() -> argparse.ArgumentParser:
    """Build the fixed command surface with no database or SQL input option."""

    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    snapshot_parser = subparsers.add_parser("snapshot-sql")
    snapshot_parser.add_argument("--phase", choices=("baseline", "target"), required=True)
    preflight_parser = subparsers.add_parser("preflight")
    preflight_parser.add_argument("--snapshot", type=Path, required=True)
    preflight_parser.add_argument("--report", type=Path, required=True)
    preflight_parser.add_argument("--plan-sql", type=Path, required=True)
    compare_parser = subparsers.add_parser("compare-snapshots")
    compare_parser.add_argument("--left", type=Path, required=True)
    compare_parser.add_argument("--right", type=Path, required=True)
    compare_preflight_parser = subparsers.add_parser("compare-preflights")
    compare_preflight_parser.add_argument("--left", type=Path, required=True)
    compare_preflight_parser.add_argument("--right", type=Path, required=True)
    postflight_parser = subparsers.add_parser("postflight")
    postflight_parser.add_argument("--before", type=Path, required=True)
    postflight_parser.add_argument("--after", type=Path, required=True)
    postflight_parser.add_argument("--report", type=Path, required=True)
    backup_parser = subparsers.add_parser("backup-manifest")
    backup_parser.add_argument("--preflight", type=Path, required=True)
    backup_parser.add_argument("--backup", type=Path, required=True)
    backup_parser.add_argument("--restored", type=Path, required=True)
    backup_parser.add_argument("--report", type=Path, required=True)
    assets_parser = subparsers.add_parser("validate-assets")
    assets_parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Dispatch one offline migration guard and return a stable process status."""

    arguments = _parser().parse_args(argv)
    try:
        if arguments.command == "snapshot-sql":
            sys.stdout.write(snapshot_sql(arguments.phase))
        elif arguments.command == "preflight":
            snapshot = Snapshot.load(arguments.snapshot)
            plan = build_plan(snapshot)
            _write_json(arguments.report, preflight_report(snapshot, plan))
            arguments.plan_sql.write_text(
                plan_sql(snapshot, plan), encoding="utf-8", newline="\n"
            )
        elif arguments.command == "compare-snapshots":
            _write_json(
                None,
                compare_snapshots(
                    Snapshot.load(arguments.left), Snapshot.load(arguments.right)
                ),
            )
        elif arguments.command == "compare-preflights":
            compare_preflights(
                _read_json_object(arguments.left, "preflight_artifact_invalid"),
                _read_json_object(arguments.right, "preflight_artifact_invalid"),
            )
            _write_json(None, {"contract": TOOL_CONTRACT, "verdict": "PASS"})
        elif arguments.command == "postflight":
            _write_json(
                arguments.report,
                postflight_report(
                    Snapshot.load(arguments.before), Snapshot.load(arguments.after)
                ),
            )
        elif arguments.command == "backup-manifest":
            _write_json(
                arguments.report,
                backup_manifest(
                    preflight=_read_json_object(
                        arguments.preflight, "backup_preflight_invalid"
                    ),
                    backup_path=arguments.backup,
                    restored=Snapshot.load(arguments.restored),
                ),
            )
        elif arguments.command == "validate-assets":
            _write_json(
                None,
                validate_assets(repository_root=arguments.repository_root.resolve()),
            )
        else:
            raise Migration009ToolError("command_invalid")
    except (Migration009ToolError, Migration009ContractError) as exc:
        code = getattr(exc, "code", "migration_009_validation_failed")
        _write_json(
            None,
            {
                "contract": TOOL_CONTRACT,
                "migration_id": MIGRATION_ID,
                "verdict": "BLOCKED",
                "reason": code,
            },
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
