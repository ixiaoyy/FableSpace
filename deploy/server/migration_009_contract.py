"""Pure contracts shared by the controlled FableSpace 009 migration tools."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Mapping, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, uuid5

MIGRATION_ID = "009_multi_story_atomic_switch"
MIGRATION_FILE = Path("apps/api/sql/migrations/009_multi_story_atomic_switch.sql")
BASELINE_TABLES = frozenset(
    {
        "character_relationships",
        "managed_media_assets",
        "managed_story_worlds",
        "player_story_states",
        "private_memories",
        "story_events",
        "story_messages",
        "story_runs",
    }
)
TARGET_TABLES = frozenset(
    BASELINE_TABLES
    | {
        "memory_formation_jobs",
        "player_story_progress",
        "private_memory_sources",
    }
)
STORY_ID_BY_WORLD_ID = {
    "history_broad_street_water_1854": "broad_street_water_1854",
    "story_palace_snow_edict": "palace_snow_edict",
}
STORY_KIND_BY_WORLD_ID = {
    "history_broad_street_water_1854": "growth",
    "story_palace_snow_edict": "ensemble",
}
FOCUS_CHARACTER_BY_WORLD_ID = {
    "history_broad_street_water_1854": "char_history_broad_street_annie",
    "story_palace_snow_edict": None,
}
LEGACY_DELETE_COHORT = {
    "story_world_id": "history_broad_street_water_1854",
    "status": "completed",
    "content_version": "annie-broad-street-2026-07-27.1",
    "player_role_id": "role_history_broad_street_beggar",
    "ending_id": None,
    "ending_summary": None,
}
OLD_STORY_RUN_FIELDS = (
    "id",
    "player_id",
    "story_world_id",
    "content_version",
    "player_role_id",
    "status",
    "current_chapter_id",
    "current_node_id",
    "key_choices",
    "story_flags",
    "ending_id",
    "ending_summary",
    "started_at",
    "completed_at",
)


class Migration009ContractError(RuntimeError):
    """Raise a stable fail-closed reason without including private row content."""

    def __init__(self, code: str) -> None:
        """Store one safe reason code for callers and redacted operator reports."""

        self.code = code
        super().__init__(code)


def canonical_json(value: object) -> str:
    """Serialize a JSON-safe value with stable key and separator rules."""

    return json.dumps(
        _json_value(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def canonical_hash(value: object) -> str:
    """Return a SHA-256 over the canonical UTF-8 representation."""

    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def story_run_fingerprint_payload_v1(row: Mapping[str, object]) -> str:
    """Return the canonical preimage binding every old StoryRun field in order."""

    missing = [field for field in OLD_STORY_RUN_FIELDS if field not in row]
    if missing:
        raise Migration009ContractError("story_run_fingerprint_missing_field")
    ordered = [[field, _json_value(row[field])] for field in OLD_STORY_RUN_FIELDS]
    return canonical_json({"contract": "StoryRunFingerprintV1", "fields": ordered})


def story_run_fingerprint_v1(row: Mapping[str, object]) -> str:
    """Hash every old StoryRun column in fixed field order for stop-write revalidation."""

    payload = story_run_fingerprint_payload_v1(row)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def rowset_hash_payload(rows: Iterable[Mapping[str, object]]) -> str:
    """Return the canonical preimage for one order-independent database row set."""

    canonical_rows = sorted(canonical_json(dict(row)) for row in rows)
    return canonical_json(canonical_rows)


def rowset_hash(rows: Iterable[Mapping[str, object]]) -> str:
    """Hash a row set independent of database return order without logging its values."""

    payload = rowset_hash_payload(rows)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def convert_legacy_story_world_payload(payload: Mapping[str, object]) -> dict[str, object]:
    """Strictly convert one recognized old managed StoryWorld document to stories[]."""

    source = _mapping(payload, "managed_story_world_payload_invalid")
    world_id = _required_text(source.get("id"), "managed_story_world_id_invalid")
    story_id = STORY_ID_BY_WORLD_ID.get(world_id)
    if story_id is None:
        raise Migration009ContractError("managed_story_world_unmapped")
    if "stories" in source:
        raise Migration009ContractError("managed_story_world_mixed_shape")
    for field in ("entry_chapter_id", "chapters", "endings"):
        if field not in source:
            raise Migration009ContractError("managed_story_world_legacy_field_missing")

    raw_characters = _list(source.get("characters"), "managed_story_world_characters_invalid")
    characters: list[dict[str, object]] = []
    participants: list[dict[str, object]] = []
    for raw_character in raw_characters:
        character = dict(_mapping(raw_character, "managed_story_world_character_invalid"))
        character_id = _required_text(
            character.get("id"), "managed_story_world_character_id_invalid"
        )
        if "current_situation" not in character or "opening_line" not in character:
            raise Migration009ContractError("managed_story_world_character_story_fields_missing")
        participants.append(
            {
                "character_id": character_id,
                "current_situation": character.pop("current_situation"),
                "opening_line": character.pop("opening_line"),
                "can_start": True,
            }
        )
        characters.append(character)

    participant_ids = {item["character_id"] for item in participants}
    focus_character_id = FOCUS_CHARACTER_BY_WORLD_ID[world_id]
    if focus_character_id is not None and focus_character_id not in participant_ids:
        raise Migration009ContractError("managed_story_world_focus_character_missing")

    chapters = _list(source["chapters"], "managed_story_world_chapters_invalid")
    converted_chapters: list[dict[str, object]] = []
    for raw_chapter in chapters:
        chapter = dict(_mapping(raw_chapter, "managed_story_world_chapter_invalid"))
        raw_nodes = _list(chapter.get("nodes"), "managed_story_world_nodes_invalid")
        nodes: list[dict[str, object]] = []
        for raw_node in raw_nodes:
            node = dict(_mapping(raw_node, "managed_story_world_node_invalid"))
            if "presentation_kind" in node or "character_id" in node:
                raise Migration009ContractError("managed_story_world_node_mixed_shape")
            node["presentation_kind"] = "system"
            node["character_id"] = None
            nodes.append(node)
        chapter["nodes"] = nodes
        converted_chapters.append(chapter)

    target = dict(source)
    target["characters"] = characters
    entry_chapter_id = target.pop("entry_chapter_id")
    target_chapters = target.pop("chapters")
    endings = target.pop("endings")
    if canonical_hash(target_chapters) != canonical_hash(chapters):
        raise Migration009ContractError("managed_story_world_chapter_projection_changed")
    target["stories"] = [
        {
            "id": story_id,
            "title": source.get("title"),
            "summary": source.get("summary"),
            "kind": STORY_KIND_BY_WORLD_ID[world_id],
            "publication_status": "published",
            "focus_character_id": focus_character_id,
            "participants": participants,
            "entry_chapter_id": entry_chapter_id,
            "chapters": converted_chapters,
            "endings": endings,
            "character_decisions": [],
        }
    ]
    return target


def project_story_messages(
    *,
    story_run_id: str,
    events: Sequence[Mapping[str, object]],
    participant_character_ids: set[str],
) -> list[dict[str, object]]:
    """Build the only allowed pre-009 Event-to-Message projection or fail closed."""

    ordered_events = sorted(events, key=lambda row: int(row.get("sequence") or -1))
    message_events = [row for row in ordered_events if row.get("event_type") == "message"]
    projected: list[dict[str, object]] = []
    for message_sequence, event in enumerate(message_events, start=1):
        event_id = _required_text(event.get("id"), "message_event_id_invalid")
        event_sequence = _nonnegative_int(
            event.get("sequence"), "message_event_sequence_invalid"
        )
        role = _required_text(event.get("role"), "message_event_role_invalid")
        character_id = event.get("character_id")
        if character_id is not None:
            character_id = _required_text(character_id, "message_event_character_invalid")

        if role == "character":
            visible_character_id = _participant(character_id, participant_character_ids)
        elif role == "system":
            visible_character_id = _participant(character_id, participant_character_ids)
        elif role == "player":
            direct_targets = {
                str(candidate.get("character_id"))
                for candidate in message_events
                if candidate.get("role") == "character"
                and candidate.get("source_id") == event_id
                and candidate.get("character_id") in participant_character_ids
            }
            if len(direct_targets) != 1:
                raise Migration009ContractError("player_message_visibility_not_unique")
            visible_character_id = direct_targets.pop()
            if character_id is not None and character_id != visible_character_id:
                raise Migration009ContractError("player_message_visibility_conflict")
        else:
            raise Migration009ContractError("message_event_role_invalid")

        projected.append(
            {
                "id": str(
                    uuid5(
                        NAMESPACE_URL,
                        f"fablespace:{MIGRATION_ID}:message:{story_run_id}:{event_id}",
                    )
                ),
                "story_run_id": story_run_id,
                "sequence": message_sequence,
                "role": role,
                "character_id": character_id,
                "visible_to_character_ids": [visible_character_id],
                "content": _required_text(event.get("content"), "message_event_content_invalid"),
                "source_event_id": event_id,
                "source_event_sequence": event_sequence,
                "created_at": event.get("created_at"),
            }
        )
    return projected


def assert_existing_messages_match_projection(
    existing: Sequence[Mapping[str, object]],
    projected: Sequence[Mapping[str, object]],
) -> None:
    """Accept only exact existing projections while allowing deterministic missing rows."""

    projected_by_event = {row["source_event_id"]: row for row in projected}
    seen: set[str] = set()
    compared_fields = (
        "id",
        "story_run_id",
        "sequence",
        "role",
        "character_id",
        "visible_to_character_ids",
        "content",
        "source_event_id",
        "source_event_sequence",
        "created_at",
    )
    for row in existing:
        source_event_id = row.get("source_event_id")
        expected = projected_by_event.get(source_event_id)
        if expected is None or str(source_event_id) in seen:
            raise Migration009ContractError("story_message_extra_or_duplicate")
        seen.add(str(source_event_id))
        for field in compared_fields:
            if _json_value(row.get(field)) != _json_value(expected.get(field)):
                raise Migration009ContractError("story_message_projection_conflict")


def _json_value(value: object) -> Any:
    """Normalize driver JSON, datetimes and mappings into canonical JSON values."""

    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith(("{", "[")):
            try:
                return _json_value(json.loads(stripped))
            except json.JSONDecodeError:
                return value
        return value
    if isinstance(value, datetime):
        normalized = value
        if normalized.tzinfo is None:
            normalized = normalized.replace(tzinfo=timezone.utc)
        return normalized.astimezone(timezone.utc).isoformat(timespec="microseconds").replace(
            "+00:00", "Z"
        )
    if isinstance(value, Mapping):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    raise Migration009ContractError("canonical_value_unsupported")


def _mapping(value: object, code: str) -> Mapping[str, object]:
    """Require a mapping for one strict conversion boundary."""

    if not isinstance(value, Mapping):
        raise Migration009ContractError(code)
    return value


def _list(value: object, code: str) -> list[object]:
    """Require a JSON list without accepting strings or tuples from callers."""

    if not isinstance(value, list):
        raise Migration009ContractError(code)
    return value


def _required_text(value: object, code: str) -> str:
    """Require one non-empty string without changing its stored content."""

    if not isinstance(value, str) or not value.strip():
        raise Migration009ContractError(code)
    return value


def _nonnegative_int(value: object, code: str) -> int:
    """Require a non-negative integer while rejecting booleans."""

    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise Migration009ContractError(code)
    return value


def _participant(value: object, participant_ids: set[str]) -> str:
    """Require one explicit Character that participates in the mapped ReviewedStory."""

    character_id = _required_text(value, "message_event_character_invalid")
    if character_id not in participant_ids:
        raise Migration009ContractError("message_event_character_not_participant")
    return character_id


__all__ = [
    "BASELINE_TABLES",
    "LEGACY_DELETE_COHORT",
    "MIGRATION_FILE",
    "MIGRATION_ID",
    "Migration009ContractError",
    "OLD_STORY_RUN_FIELDS",
    "STORY_ID_BY_WORLD_ID",
    "TARGET_TABLES",
    "assert_existing_messages_match_projection",
    "canonical_hash",
    "canonical_json",
    "convert_legacy_story_world_payload",
    "project_story_messages",
    "rowset_hash",
    "rowset_hash_payload",
    "story_run_fingerprint_payload_v1",
    "story_run_fingerprint_v1",
]
