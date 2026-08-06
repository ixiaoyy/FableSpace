"""Immutable domain projections for private StoryWorld runtime state."""

from __future__ import annotations

import re
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


class MemoryLayer(str, Enum):
    """Closed abstraction layers persisted for Character-private memory."""

    L1 = "l1"
    L2 = "l2"
    L3 = "l3"


class MemoryKind(str, Enum):
    """Closed memory semantics; each value is valid for exactly one layer."""

    INTERACTION_FACT = "interaction_fact"
    PLAYER_CLAIM = "player_claim"
    PLAYER_COMMITMENT = "player_commitment"
    REVIEWED_CHOICE = "reviewed_choice"
    RELATIONSHIP_CHANGE = "relationship_change"
    SCENE_SUMMARY = "scene_summary"
    CHARACTER_IMPRESSION = "character_impression"


class MemoryEvidenceClass(str, Enum):
    """Authority class attached to one immutable memory revision."""

    REVIEWED_EVENT = "reviewed_event"
    OBSERVED_DIALOGUE = "observed_dialogue"
    PLAYER_CLAIM = "player_claim"
    INFERRED = "inferred"
    NEEDS_VERIFICATION = "needs_verification"


class MemoryRecallScope(str, Enum):
    """Maximum reviewed scope in which one memory revision may be recalled."""

    NONE = "none"
    RUN = "run"
    STORY = "story"
    WORLD = "world"


class MemoryReviewStatus(str, Enum):
    """Lifecycle state for an append-only memory revision."""

    VALIDATED = "validated"
    PROMOTED = "promoted"
    INVALIDATED = "invalidated"


class StoryStateError(RuntimeError):
    """Stable domain failure raised by player story-state persistence."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


@dataclass(frozen=True, slots=True)
class CompletedRunSummary:
    story_run_id: str
    story_id: str
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
    visit_count: int
    last_visited_at: datetime


@dataclass(frozen=True, slots=True)
class PlayerStoryProgress:
    player_id: str
    story_world_id: str
    story_id: str
    active_story_run_id: str | None
    last_visited_at: datetime | None
    completed_run_summaries: tuple[CompletedRunSummary, ...]


@dataclass(frozen=True, slots=True)
class StoryRun:
    id: str
    player_id: str
    story_world_id: str
    story_id: str
    content_version: str
    player_role_id: str
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
    player_id: str
    story_world_id: str
    character_id: str
    affinity: float
    stage: str
    last_change_reason: str
    flags: tuple[str, ...]
    last_source_story_run_id: str | None
    last_source_event_id: str | None
    updated_at: datetime


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
    player_id: str
    story_world_id: str
    origin_story_id: str
    origin_story_run_id: str
    character_id: str
    role_scope_player_role_id: str | None
    layer: MemoryLayer
    memory_kind: MemoryKind
    evidence_class: MemoryEvidenceClass
    content: str | None
    structured_payload: Mapping[str, JSONValue]
    salience: int
    recall_scope: MemoryRecallScope
    review_status: MemoryReviewStatus
    promotion_rule_id: str | None
    story_content_version: str
    pipeline_version: str
    logical_key: str
    revision: int
    idempotency_key: str
    content_hash: str | None
    created_at: datetime

    def __post_init__(self) -> None:
        """Freeze the structured payload and reject an invalid memory revision."""

        object.__setattr__(
            self,
            "structured_payload",
            _freeze_mapping(self.structured_payload),
        )
        validate_memory_layer_kind(self.layer, self.memory_kind)
        validate_memory_revision(
            layer=self.layer,
            evidence_class=self.evidence_class,
            content=self.content,
            salience=self.salience,
            recall_scope=self.recall_scope,
            review_status=self.review_status,
            promotion_rule_id=self.promotion_rule_id,
            logical_key=self.logical_key,
            revision=self.revision,
            idempotency_key=self.idempotency_key,
            content_hash=self.content_hash,
        )


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


_MEMORY_KINDS_BY_LAYER: Mapping[MemoryLayer, frozenset[MemoryKind]] = MappingProxyType(
    {
        MemoryLayer.L1: frozenset(
            {
                MemoryKind.INTERACTION_FACT,
                MemoryKind.PLAYER_CLAIM,
                MemoryKind.PLAYER_COMMITMENT,
                MemoryKind.REVIEWED_CHOICE,
                MemoryKind.RELATIONSHIP_CHANGE,
            }
        ),
        MemoryLayer.L2: frozenset({MemoryKind.SCENE_SUMMARY}),
        MemoryLayer.L3: frozenset({MemoryKind.CHARACTER_IMPRESSION}),
    }
)
_SHA256_PATTERN = re.compile(r"[0-9a-f]{64}\Z")


def validate_memory_layer_kind(layer: MemoryLayer, memory_kind: MemoryKind) -> None:
    """Reject a memory kind that is not part of the closed contract for its layer."""

    if not isinstance(layer, MemoryLayer) or not isinstance(memory_kind, MemoryKind):
        raise StoryStateError(
            "invalid_memory_layer_kind",
            "记忆层级与类型必须使用封闭枚举。",
        )
    allowed_kinds = _MEMORY_KINDS_BY_LAYER.get(layer)
    if allowed_kinds is None or memory_kind not in allowed_kinds:
        raise StoryStateError(
            "invalid_memory_layer_kind",
            "记忆层级与类型不符合封闭合同。",
        )


def validate_memory_revision(
    *,
    layer: MemoryLayer,
    evidence_class: MemoryEvidenceClass,
    content: str | None,
    salience: int,
    recall_scope: MemoryRecallScope,
    review_status: MemoryReviewStatus,
    promotion_rule_id: str | None,
    logical_key: str,
    revision: int,
    idempotency_key: str,
    content_hash: str | None,
) -> None:
    """Validate one immutable revision's ranking, lifecycle, scope, and hash fields."""

    if not isinstance(layer, MemoryLayer):
        raise StoryStateError("invalid_memory_layer", "记忆层级不在封闭合同中。")
    if not isinstance(evidence_class, MemoryEvidenceClass):
        raise StoryStateError("invalid_memory_evidence", "记忆证据类型不在封闭合同中。")
    if not isinstance(recall_scope, MemoryRecallScope):
        raise StoryStateError("invalid_memory_scope", "记忆召回范围不在封闭合同中。")
    if not isinstance(review_status, MemoryReviewStatus):
        raise StoryStateError(
            "invalid_memory_review_status",
            "记忆审核状态不在封闭合同中。",
        )
    if (
        isinstance(salience, bool)
        or not isinstance(salience, int)
        or not 0 <= salience <= 100
    ):
        raise StoryStateError("invalid_memory_salience", "记忆显著度必须位于 0 到 100。")
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 1:
        raise StoryStateError("invalid_memory_revision", "记忆 revision 必须从 1 开始。")

    _validate_sha256(logical_key, field_name="logical_key")
    _validate_sha256(idempotency_key, field_name="idempotency_key")
    if content_hash is not None:
        _validate_sha256(content_hash, field_name="content_hash")

    if (
        layer is MemoryLayer.L2
        and review_status is not MemoryReviewStatus.INVALIDATED
        and recall_scope is not MemoryRecallScope.RUN
    ):
        raise StoryStateError("invalid_memory_scope", "L2 记忆只能在来源 StoryRun 内召回。")

    if review_status is MemoryReviewStatus.VALIDATED:
        if layer not in {MemoryLayer.L1, MemoryLayer.L2}:
            raise StoryStateError(
                "invalid_memory_review_status",
                "validated revision 只允许 L1 或 L2。",
            )
        if recall_scope is not MemoryRecallScope.RUN:
            raise StoryStateError(
                "invalid_memory_scope",
                "validated revision 只能使用 run scope。",
            )

    if review_status is MemoryReviewStatus.PROMOTED:
        if layer not in {MemoryLayer.L1, MemoryLayer.L3}:
            raise StoryStateError(
                "invalid_memory_review_status",
                "promoted revision 只允许 L1 或 L3。",
            )
        if recall_scope not in {MemoryRecallScope.STORY, MemoryRecallScope.WORLD}:
            raise StoryStateError(
                "invalid_memory_scope",
                "promoted revision 只能使用 story 或 world scope。",
            )
        if not isinstance(promotion_rule_id, str) or not promotion_rule_id.strip():
            raise StoryStateError(
                "missing_memory_promotion_rule",
                "promoted revision 必须引用审核晋升规则。",
            )
        if evidence_class is MemoryEvidenceClass.NEEDS_VERIFICATION:
            raise StoryStateError(
                "invalid_memory_promotion_evidence",
                "待核验证据不得晋升。",
            )

    if layer is MemoryLayer.L3 and review_status is MemoryReviewStatus.VALIDATED:
        raise StoryStateError(
            "invalid_memory_review_status",
            "L3 不允许以 validated 状态落库。",
        )

    if review_status is MemoryReviewStatus.INVALIDATED:
        if recall_scope is not MemoryRecallScope.NONE or content is not None:
            raise StoryStateError(
                "invalid_memory_tombstone",
                "invalidated revision 必须使用 none scope 且正文为空。",
            )
    elif not isinstance(content, str):
        raise StoryStateError(
            "missing_memory_content",
            "可召回 revision 必须保存已校验正文。",
        )


def _validate_sha256(value: str, *, field_name: str) -> None:
    """Require one canonical lowercase SHA-256 string for a stable memory key."""

    if not isinstance(value, str) or _SHA256_PATTERN.fullmatch(value) is None:
        raise StoryStateError(
            "invalid_memory_hash",
            f"{field_name} 必须是规范的小写 SHA-256。",
        )


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
    "MemoryEvidenceClass",
    "MemoryKind",
    "MemoryLayer",
    "MemoryRecallScope",
    "MemoryReviewStatus",
    "PlayerStoryProgress",
    "PlayerStoryState",
    "PrivateMemory",
    "RecordedChoice",
    "StoryEvent",
    "StoryMessage",
    "StoryRun",
    "StoryRunStatus",
    "StoryStateError",
    "freeze_json_mapping",
    "validate_memory_layer_kind",
    "validate_memory_revision",
]
