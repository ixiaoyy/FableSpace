"""Immutable domain projections for private StoryWorld runtime state."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from math import isfinite
from types import MappingProxyType
from typing import TypeAlias

JSONScalar: TypeAlias = None | bool | int | float | str
JSONValue: TypeAlias = JSONScalar | tuple["JSONValue", ...] | Mapping[str, "JSONValue"]


class StoryRunStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class StoryStateError(RuntimeError):
    """Stable domain failure raised by player story-state persistence."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


@dataclass(frozen=True, slots=True)
class CompletedRunSummary:
    story_run_id: str
    ending_id: str
    summary: str
    completed_at: datetime


@dataclass(frozen=True, slots=True)
class RecordedChoice:
    choice_id: str
    payload: Mapping[str, JSONValue]
    source_event_id: str
    source_event_sequence: int

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", _freeze_mapping(self.payload))


@dataclass(frozen=True, slots=True)
class PlayerStoryState:
    player_id: str
    story_world_id: str
    player_role_id: str
    active_story_run_id: str | None
    visit_count: int
    last_visited_at: datetime | None
    completed_run_summaries: tuple[CompletedRunSummary, ...]


@dataclass(frozen=True, slots=True)
class StoryRun:
    id: str
    player_id: str
    story_world_id: str
    content_version: str
    status: StoryRunStatus
    current_chapter_id: str
    current_node_id: str
    key_choices: tuple[RecordedChoice, ...]
    story_flags: tuple[str, ...]
    ending_id: str | None
    ending_summary: str | None
    started_at: datetime
    completed_at: datetime | None


@dataclass(frozen=True, slots=True)
class CharacterRelationship:
    story_run_id: str
    character_id: str
    affinity: float
    stage: str
    last_change_reason: str
    flags: tuple[str, ...]
    last_source_event_id: str | None
    last_source_event_sequence: int | None


@dataclass(frozen=True, slots=True)
class StoryMessage:
    id: str
    story_run_id: str
    sequence: int
    role: str
    character_id: str | None
    visible_to_character_ids: tuple[str, ...]
    content: str
    source_event_id: str
    source_event_sequence: int
    created_at: datetime


@dataclass(frozen=True, slots=True)
class PrivateMemory:
    id: str
    story_run_id: str
    content: str
    source_event_id: str
    source_event_sequence: int
    character_id: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class StoryEvent:
    id: str
    story_run_id: str
    sequence: int
    event_type: str
    character_id: str | None
    role: str | None
    content: str
    source_kind: str
    source_id: str | None
    rule_source: str
    payload: Mapping[str, JSONValue]
    created_at: datetime

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", _freeze_mapping(self.payload))


def freeze_json_mapping(value: Mapping[str, object]) -> Mapping[str, JSONValue]:
    """Return one recursively immutable, JSON-safe mapping."""

    return _freeze_mapping(value)


def _freeze_mapping(value: Mapping[str, object]) -> Mapping[str, JSONValue]:
    if not isinstance(value, Mapping):
        raise StoryStateError("invalid_json_payload", "结构化载荷必须是对象。")
    frozen: dict[str, JSONValue] = {}
    for key, item in value.items():
        if not isinstance(key, str):
            raise StoryStateError("invalid_json_payload", "结构化载荷的键必须是字符串。")
        frozen[key] = _freeze_json(item)
    return MappingProxyType(frozen)


def _freeze_json(value: object) -> JSONValue:
    if value is None or isinstance(value, (bool, str)):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not isfinite(value):
            raise StoryStateError("invalid_json_payload", "结构化载荷不能包含非有限数值。")
        return value
    if isinstance(value, Mapping):
        return _freeze_mapping(value)
    if isinstance(value, (list, tuple)):
        return tuple(_freeze_json(item) for item in value)
    raise StoryStateError("invalid_json_payload", "结构化载荷包含不能序列化的值。")


__all__ = [
    "CharacterRelationship",
    "CompletedRunSummary",
    "JSONValue",
    "PlayerStoryState",
    "PrivateMemory",
    "RecordedChoice",
    "StoryEvent",
    "StoryMessage",
    "StoryRun",
    "StoryRunStatus",
    "StoryStateError",
    "freeze_json_mapping",
]
