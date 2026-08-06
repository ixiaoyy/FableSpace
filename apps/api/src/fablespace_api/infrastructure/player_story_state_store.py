"""Transactional persistence for private player StoryWorld state."""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from math import isfinite
from types import MappingProxyType
from typing import Any, Protocol
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..content.story_world_codec import story_world_from_payload
from ..domain.story_state import (
    CharacterRelationship,
    CompletedRunSummary,
    PlayerStoryProgress,
    PlayerStoryState,
    RecordedChoice,
    StoryEvent,
    StoryMessage,
    StoryRun,
    StoryRunStatus,
    StoryStateError,
    freeze_json_mapping,
)
from ..domain.story_world import (
    Character,
    CharacterDecision,
    DecisionPredicate,
    DecisionPredicateKind,
    PlayerRole,
    PredicateValue,
    PublicationStatus,
    RelationshipEffect,
    RelationshipStage,
    ReviewedStory,
    StoryChapter,
    StoryCharacterParticipation,
    StoryChoice,
    StoryEnding,
    StoryNode,
    StoryNodePresentationKind,
    StoryWorld,
    StoryWorldRegistry,
)
from .database import Database
from .managed_content_models import ManagedStoryWorldModel
from .story_memory_store import StoryMemoryStore
from .story_state_models import (
    CharacterRelationshipModel,
    PlayerStoryProgressModel,
    PlayerStoryStateModel,
    StoryEventModel,
    StoryMessageModel,
    StoryRunModel,
)

MESSAGE_ROLES = frozenset({"player", "character", "system"})
EVENT_SOURCE_KINDS = frozenset(
    {"authored", "free_input", "reviewed_choice", "reviewed_decision"}
)
DIALOGUE_HISTORY_LIMIT = 8
CONTINUITY_MESSAGE_LIMIT = 10
_OPENING_LINE_QUOTED_SPEECH = re.compile(
    r'“([^”]+)”|「([^」]+)」|『([^』]+)』|"([^"]+)"'
)


class StoryWorldSource(Protocol):
    """Minimal live content source accepted by the runtime state store."""

    def get(self, story_world_id: str) -> StoryWorld | None:
        """Return the latest reviewed world for one stable ID, or None."""


@dataclass(frozen=True, slots=True)
class StoryRunAggregate:
    """Owner-scoped persisted aggregate returned without leaking a Session or ORM row."""

    story_world: StoryWorld
    story: ReviewedStory
    state: PlayerStoryState
    progress: PlayerStoryProgress
    run: StoryRun
    relationships: tuple[CharacterRelationship, ...]
    events: tuple[StoryEvent, ...]
    messages: tuple[StoryMessage, ...]


@dataclass(frozen=True, slots=True)
class StoryRunContinuity:
    """Read-only recent-run summary inputs for one explicit ReviewedStory."""

    run: StoryRun
    can_resume: bool
    recent_character_messages: tuple[StoryMessage, ...]


@dataclass(frozen=True, slots=True)
class DialogueWriteGuard:
    """CAS fields bound to one run, story, and Character before dependency calls."""

    story_run_id: str
    story_id: str
    character_id: str
    content_version: str
    current_chapter_id: str
    current_node_id: str
    last_event_sequence: int
    relationship_source_story_run_id: str | None
    relationship_source_event_id: str | None


@dataclass(frozen=True, slots=True)
class DialogueSnapshot:
    """Bounded Character-visible L0 plus the relationship and later-write guard."""

    story_world: StoryWorld
    story: ReviewedStory
    participation: StoryCharacterParticipation
    run: StoryRun
    relationship: CharacterRelationship
    visible_messages: tuple[StoryMessage, ...]
    write_guard: DialogueWriteGuard


@dataclass(frozen=True, slots=True)
class RelationshipChangeWrite:
    """Validated natural-dialogue relationship change applied after its source event."""

    affinity_delta: int | float
    reason: str
    set_flags: tuple[str, ...] = ()
    signal: str | None = None


@dataclass(frozen=True, slots=True)
class AcceptedDialogueTurn:
    """Already-policy-checked dialogue output persisted as one atomic L0 turn."""

    player_content: str
    character_content: str
    narration_before: str = ""
    narration_after: str = ""
    boundary_reason: str = "accepted"
    model_output_replaced: bool = False
    replacement_source: str | None = None
    historical_projection: bool = False
    relationship_change: RelationshipChangeWrite | None = None


@dataclass(frozen=True, slots=True)
class DecisionFacts:
    """Trusted structured facts available to closed CharacterDecision predicates."""

    investigation_results: Mapping[str, PredicateValue] = field(default_factory=dict)
    player_commitments: Mapping[str, bool] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Normalize IDs and freeze only supported JSON-scalar decision facts."""

        investigations: dict[str, PredicateValue] = {}
        for raw_key, raw_value in self.investigation_results.items():
            key = _required_text(raw_key, "investigation_result_id")
            investigations[key] = _predicate_value(
                raw_value,
                "investigation_result_value",
            )
        commitments: dict[str, bool] = {}
        for raw_key, raw_value in self.player_commitments.items():
            key = _required_text(raw_key, "player_commitment_id")
            if not isinstance(raw_value, bool):
                raise StoryStateError(
                    "invalid_decision_facts",
                    "玩家承诺事实必须是布尔值。",
                )
            commitments[key] = raw_value
        object.__setattr__(
            self,
            "investigation_results",
            MappingProxyType(investigations),
        )
        object.__setattr__(
            self,
            "player_commitments",
            MappingProxyType(commitments),
        )


class PlayerStoryStateStore:
    """Own all 009 runtime SQL, transaction order, and trusted scope checks."""

    def __init__(
        self,
        database: Database,
        registry: StoryWorldSource,
        memory_store: StoryMemoryStore,
    ) -> None:
        """Bind the database, live content source, and session-aware memory outbox."""

        self.database = database
        self.registry = registry
        self.memory_store = memory_store

    def _published_world_in_session(
        self,
        session: Session,
        story_world_id: str,
        *,
        for_write: bool,
    ) -> StoryWorld:
        """Decode the complete managed registry in this transaction, locking it for writes."""

        story_world_id = _required_text(story_world_id, "story_world_id")
        statement = select(ManagedStoryWorldModel).order_by(
            ManagedStoryWorldModel.story_world_id
        )
        if for_write:
            statement = statement.with_for_update(read=True)
        rows = tuple(session.scalars(statement).all())
        worlds = tuple(
            story_world_from_payload(row.payload_json)
            for row in rows
        )
        registry = StoryWorldRegistry(worlds)
        world = registry.get(story_world_id)
        if world is None or world.publication_status is not PublicationStatus.PUBLISHED:
            raise StoryStateError(
                "story_world_not_found",
                "没有找到已发布的 StoryWorld。",
            )
        return world

    def get_or_create_state(
        self,
        player_id: str,
        story_world_id: str,
        *,
        now: datetime | None = None,
    ) -> PlayerStoryState:
        """Create only the player/world root when absent and return its immutable value."""

        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        visited_at = now or datetime.utcnow()
        try:
            with self.database.session_scope() as session:
                state = self._state_for_update(
                    session,
                    player_id,
                    world.id,
                    now=visited_at,
                )
                session.flush()
                return self._state_domain(state)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "玩家故事状态被并发创建，请重新读取。",
            ) from exc

    def get_state(
        self,
        player_id: str,
        story_world_id: str,
    ) -> PlayerStoryState | None:
        """Read the player/world root without locking, refreshing, or creating it."""

        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            return self._state_domain(state) if state is not None else None

    def get_progress(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> PlayerStoryProgress | None:
        """Read one explicit story progress row without any continuity side effect."""

        world = self._published_world(story_world_id)
        story = self._published_story(world, story_id)
        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            progress = session.get(
                PlayerStoryProgressModel,
                (player_id, world.id, story.id),
            )
            return self._progress_domain(progress) if progress is not None else None

    def list_progress(
        self,
        player_id: str,
        story_world_id: str,
    ) -> tuple[PlayerStoryProgress, ...]:
        """Return all persisted per-story progress rows for one trusted owner/world."""

        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            rows = tuple(
                session.scalars(
                    select(PlayerStoryProgressModel)
                    .where(
                        PlayerStoryProgressModel.player_id == player_id,
                        PlayerStoryProgressModel.story_world_id == world.id,
                    )
                    .order_by(PlayerStoryProgressModel.story_id)
                )
            )
            return tuple(self._progress_domain(row) for row in rows)

    def start_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        *,
        character_id: str,
        player_role_id: str,
        run_id: str | None = None,
        now: datetime | None = None,
    ) -> StoryRunAggregate:
        """Reuse a valid active run or create one; never replace a stale active run."""

        player_id = _required_text(player_id, "player_id")
        started_at = now or datetime.utcnow()
        resolved_run_id = _required_text(run_id or str(uuid4()), "run_id")

        try:
            with self.database.session_scope() as session:
                world = self._published_world_in_session(
                    session,
                    story_world_id,
                    for_write=True,
                )
                story = self._published_story(world, story_id)
                participation = self._participation(
                    world,
                    story,
                    character_id,
                    require_can_start=True,
                )
                player_role = self._player_role(world, player_role_id)
                state = self._state_for_update(
                    session,
                    player_id,
                    world.id,
                    now=started_at,
                )
                progress = self._progress_for_update(
                    session,
                    player_id,
                    world.id,
                    story.id,
                )
                active = self._active_run_for_progress(
                    session,
                    state,
                    progress,
                    for_update=True,
                )
                if active is not None:
                    if not self._run_uses_current_content(active, world, story):
                        raise StoryStateError(
                            "story_content_changed",
                            "活动轮次锁定的故事内容已经变化，请显式重新开始。",
                        )
                    if active.player_role_id != player_role.id:
                        raise StoryStateError(
                            "player_role_locked",
                            "当前轮次已经锁定了另一个 PlayerRole。",
                        )
                    self._touch_scope(
                        state,
                        progress,
                        started_at,
                        count_visit=True,
                    )
                    session.flush()
                    return self._aggregate(session, world, story, active)

                self._require_no_unpointed_active(
                    session,
                    player_id,
                    world.id,
                    story.id,
                )
                run = self._start_new_run(
                    session,
                    state,
                    progress,
                    world,
                    story,
                    participation,
                    player_role,
                    run_id=resolved_run_id,
                    started_at=started_at,
                )
                session.flush()
                return self._aggregate(session, world, story, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "active_run_exists",
                "同一故事已有活动轮次，请先重新读取。",
            ) from exc

    def restart_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        *,
        character_id: str,
        player_role_id: str,
        run_id: str | None = None,
        now: datetime | None = None,
    ) -> StoryRunAggregate:
        """Replace only a stale active run, or create a new run when none is active."""

        player_id = _required_text(player_id, "player_id")
        restarted_at = now or datetime.utcnow()
        resolved_run_id = _required_text(run_id or str(uuid4()), "run_id")

        try:
            with self.database.session_scope() as session:
                world = self._published_world_in_session(
                    session,
                    story_world_id,
                    for_write=True,
                )
                story = self._published_story(world, story_id)
                participation = self._participation(
                    world,
                    story,
                    character_id,
                    require_can_start=True,
                )
                player_role = self._player_role(world, player_role_id)
                state = self._state_for_update(
                    session,
                    player_id,
                    world.id,
                    now=restarted_at,
                )
                progress = self._progress_for_update(
                    session,
                    player_id,
                    world.id,
                    story.id,
                )
                active = self._active_run_for_progress(
                    session,
                    state,
                    progress,
                    for_update=True,
                )
                if active is not None:
                    if self._run_uses_current_content(active, world, story):
                        raise StoryStateError(
                            "active_run_exists",
                            "当前故事仍有可继续的活动轮次。",
                        )
                    self._stop_stale_run(
                        session,
                        active,
                        progress,
                        story,
                        stopped_at=restarted_at,
                        current_content_version=world.content_version,
                    )
                    session.flush()
                else:
                    self._require_no_unpointed_active(
                        session,
                        player_id,
                        world.id,
                        story.id,
                    )

                run = self._start_new_run(
                    session,
                    state,
                    progress,
                    world,
                    story,
                    participation,
                    player_role,
                    run_id=resolved_run_id,
                    started_at=restarted_at,
                )
                session.flush()
                return self._aggregate(session, world, story, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "active_run_exists",
                "同一故事已有活动轮次，请先重新读取。",
            ) from exc

    def resume_active_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        *,
        character_id: str,
    ) -> StoryRunAggregate | None:
        """Read a current-version active run without updating visits or persisted state."""

        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            world = self._published_world_in_session(
                session,
                story_world_id,
                for_write=False,
            )
            story = self._published_story(world, story_id)
            self._participation(world, story, character_id)
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            progress = session.get(
                PlayerStoryProgressModel,
                (player_id, world.id, story.id),
            )
            if state is None or progress is None or not progress.active_story_run_id:
                return None
            run = self._owned_run(
                session,
                player_id,
                world.id,
                story.id,
                progress.active_story_run_id,
            )
            if run.status != StoryRunStatus.ACTIVE.value:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "分故事活动指针没有指向活动轮次。",
                )
            if not self._run_uses_current_content(run, world, story):
                return None
            return self._aggregate(session, world, story, run)

    def get_current_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        *,
        character_id: str,
    ) -> StoryRunAggregate | None:
        """Read a resumable active run, or the latest completed run when no active exists."""

        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            world = self._published_world_in_session(
                session,
                story_world_id,
                for_write=False,
            )
            story = self._published_story(world, story_id)
            self._participation(world, story, character_id)
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            progress = session.get(
                PlayerStoryProgressModel,
                (player_id, world.id, story.id),
            )
            if state is None or progress is None:
                return None
            if progress.active_story_run_id:
                run = self._owned_run(
                    session,
                    player_id,
                    world.id,
                    story.id,
                    progress.active_story_run_id,
                )
                if run.status != StoryRunStatus.ACTIVE.value:
                    raise StoryStateError(
                        "invalid_persisted_state",
                        "分故事活动指针没有指向活动轮次。",
                    )
                if not self._run_uses_current_content(run, world, story):
                    return None
                return self._aggregate(session, world, story, run)

            run = self._latest_completed_run(
                session,
                player_id,
                world.id,
                story.id,
            )
            return (
                self._aggregate(session, world, story, run)
                if run is not None
                else None
            )

    def get_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
    ) -> StoryRunAggregate | None:
        """Read one exact owner/world/story/run aggregate without modifying it."""

        player_id = _required_text(player_id, "player_id")
        run_id = _required_text(run_id, "run_id")
        with self.database.session_scope() as session:
            world = self._published_world_in_session(
                session,
                story_world_id,
                for_write=False,
            )
            story = self._published_story(world, story_id)
            run = session.scalar(
                select(StoryRunModel).where(
                    StoryRunModel.id == run_id,
                    StoryRunModel.player_id == player_id,
                    StoryRunModel.story_world_id == world.id,
                )
            )
            if run is None:
                return None
            if run.story_id != story.id:
                raise StoryStateError(
                    "story_mismatch",
                    "StoryRun 不属于请求中的 ReviewedStory。",
                )
            return self._aggregate(session, world, story, run)

    def read_continuity(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> StoryRunContinuity | None:
        """Return a side-effect-free active-or-latest-completed continuity summary."""

        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            world = self._published_world_in_session(
                session,
                story_world_id,
                for_write=False,
            )
            story = self._published_story(world, story_id)
            progress = session.get(
                PlayerStoryProgressModel,
                (player_id, world.id, story.id),
            )
            if progress is None:
                return None
            if progress.active_story_run_id:
                run = self._owned_run(
                    session,
                    player_id,
                    world.id,
                    story.id,
                    progress.active_story_run_id,
                )
                if run.status != StoryRunStatus.ACTIVE.value:
                    raise StoryStateError(
                        "invalid_persisted_state",
                        "分故事活动指针没有指向活动轮次。",
                    )
            else:
                run = self._latest_completed_run(
                    session,
                    player_id,
                    world.id,
                    story.id,
                )
            if run is None:
                return None
            projected_run = self._run_domain(run)
            self._validate_recorded_choice_sources(
                projected_run,
                self._events_for_run(session, run),
            )
            records = self._message_records_for_projection(
                session,
                run,
                world,
                story,
            )
            recent = tuple(
                message
                for message, _ in records
                if message.role == "character" and message.character_id is not None
            )[-CONTINUITY_MESSAGE_LIMIT:]
            return StoryRunContinuity(
                run=projected_run,
                can_resume=(
                    run.status == StoryRunStatus.ACTIVE.value
                    and self._run_uses_current_content(run, world, story)
                ),
                recent_character_messages=recent,
            )

    def get_dialogue_snapshot(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
    ) -> DialogueSnapshot:
        """Read bounded, visibility-proven dialogue L0 and a later-write CAS guard."""

        player_id = _required_text(player_id, "player_id")
        with self.database.session_scope() as session:
            world = self._published_world_in_session(
                session,
                story_world_id,
                for_write=False,
            )
            story = self._published_story(world, story_id)
            participation = self._participation(world, story, character_id)
            run = self._owned_active_run(
                session,
                player_id,
                world.id,
                story.id,
                run_id,
            )
            self._require_current_content(run, world, story)
            self._require_interaction_character(
                self._node_in_chapter(
                    story,
                    run.current_chapter_id,
                    run.current_node_id,
                ),
                participation.character_id,
            )
            relationship = self._relationship_for_update(
                session,
                player_id,
                world.id,
                participation.character_id,
                world,
                initialize_if_missing=False,
                for_update=False,
                now=datetime.utcnow(),
            )
            last_sequence = self._latest_event_sequence(session, run.id)
            visible_messages = self._dialogue_messages(
                session,
                run,
                story,
                participation.character_id,
            )
            projected_run = self._run_domain(run)
            self._validate_recorded_choice_sources(
                projected_run,
                self._events_for_run(session, run),
            )
            return DialogueSnapshot(
                story_world=world,
                story=story,
                participation=participation,
                run=projected_run,
                relationship=self._relationship_domain(relationship),
                visible_messages=visible_messages,
                write_guard=DialogueWriteGuard(
                    story_run_id=run.id,
                    story_id=run.story_id,
                    character_id=participation.character_id,
                    content_version=run.content_version,
                    current_chapter_id=run.current_chapter_id,
                    current_node_id=run.current_node_id,
                    last_event_sequence=last_sequence,
                    relationship_source_story_run_id=(
                        relationship.last_source_story_run_id
                    ),
                    relationship_source_event_id=relationship.last_source_event_id,
                ),
            )

    def record_dialogue_turn(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
        *,
        guard: DialogueWriteGuard,
        turn: AcceptedDialogueTurn,
        now: datetime | None = None,
    ) -> StoryRunAggregate:
        """Persist one accepted player/Character turn, optional narration and relationship atomically."""

        if not isinstance(guard, DialogueWriteGuard):
            raise StoryStateError("invalid_dialogue_guard", "对话写入 guard 无效。")
        if not isinstance(turn, AcceptedDialogueTurn):
            raise StoryStateError("invalid_dialogue_turn", "对话写入载荷无效。")
        player_id = _required_text(player_id, "player_id")
        player_content = _required_text(turn.player_content, "player_content")
        character_content = _required_text(turn.character_content, "character_content")
        boundary_reason = _required_text(turn.boundary_reason, "boundary_reason")
        narration_before = _optional_text(turn.narration_before, "narration_before")
        narration_after = _optional_text(turn.narration_after, "narration_after")
        replacement_source = (
            None
            if turn.replacement_source is None
            else _required_text(turn.replacement_source, "replacement_source")
        )
        if not isinstance(turn.model_output_replaced, bool) or not isinstance(
            turn.historical_projection,
            bool,
        ):
            raise StoryStateError(
                "invalid_dialogue_turn",
                "对话策略标记必须是布尔值。",
            )
        if turn.model_output_replaced:
            if replacement_source not in {"model_policy", "input_policy"}:
                raise StoryStateError(
                    "invalid_dialogue_turn",
                    "安全替代必须声明 model_policy 或 input_policy 来源。",
                )
        elif replacement_source is not None:
            raise StoryStateError(
                "invalid_dialogue_turn",
                "未替代的 Character 回复不得声明替代来源。",
            )
        if turn.historical_projection and (
            narration_before is not None or narration_after is not None
        ):
            raise StoryStateError(
                "invalid_dialogue_turn",
                "历史真人剧情转述不得附带生成式叙述。",
            )
        relationship_change = self._validated_relationship_change(
            turn.relationship_change
        )
        written_at = now or datetime.utcnow()

        try:
            with self.database.session_scope() as session:
                world = self._published_world_in_session(
                    session,
                    story_world_id,
                    for_write=True,
                )
                story = self._published_story(world, story_id)
                participation = self._participation(world, story, character_id)
                if relationship_change is not None:
                    character = self._character(world, participation.character_id)
                    maximum_delta = float(
                        character.relationship_rules.natural_turn_max_delta
                    )
                    if abs(float(relationship_change.affinity_delta)) > maximum_delta:
                        raise StoryStateError(
                            "relationship_delta_exceeded",
                            "自然对话关系变化超过 Character 审核上限。",
                        )
                state, progress, run = self._active_scope_for_update(
                    session,
                    player_id,
                    world.id,
                    story.id,
                    run_id,
                )
                self._require_current_content(run, world, story)
                self._require_interaction_character(
                    self._node_in_chapter(
                        story,
                        run.current_chapter_id,
                        run.current_node_id,
                    ),
                    participation.character_id,
                )
                self._require_dialogue_guard(
                    session,
                    run,
                    story,
                    guard,
                    character_id=participation.character_id,
                )
                relationship = self._relationship_for_update(
                    session,
                    player_id,
                    world.id,
                    participation.character_id,
                    world,
                    initialize_if_missing=False,
                    for_update=True,
                    now=written_at,
                )
                if (
                    relationship.last_source_story_run_id
                    != guard.relationship_source_story_run_id
                    or relationship.last_source_event_id
                    != guard.relationship_source_event_id
                ):
                    raise StoryStateError(
                        "relationship_source_conflict",
                        "长期关系来源已变化，请基于最新状态重新回应。",
                    )

                player_event = self._append_event(
                    session,
                    run,
                    event_type="message",
                    role="player",
                    content=player_content,
                    source_kind="free_input",
                    source_id=None,
                    rule_source="dialogue.accepted.player",
                    payload={
                        "boundary_reason": boundary_reason,
                        "visible_to_character_ids": [participation.character_id],
                    },
                    created_at=written_at,
                )
                self._append_message(
                    session,
                    run,
                    player_event,
                    role="player",
                    character_id=None,
                    visible_to_character_ids=(participation.character_id,),
                    content=player_content,
                    created_at=written_at,
                )
                last_event = player_event

                if narration_before is not None:
                    last_event = self._append_event(
                        session,
                        run,
                        event_type="narration",
                        role="system",
                        content=narration_before,
                        source_kind="free_input",
                        source_id=player_event.id,
                        rule_source="dialogue.accepted.narration",
                        payload={
                            "boundary_reason": boundary_reason,
                            "presentation_version": 2,
                            "placement": "before_dialogue",
                        },
                        created_at=written_at,
                    )

                character_event = self._append_event(
                    session,
                    run,
                    event_type="message",
                    role="character",
                    character_id=participation.character_id,
                    content=character_content,
                    source_kind="free_input",
                    source_id=player_event.id,
                    rule_source="dialogue.accepted.character",
                    payload={
                        "boundary_reason": boundary_reason,
                        "model_output_replaced": turn.model_output_replaced,
                        "replacement_source": replacement_source,
                        "presentation_version": 2,
                        "historical_projection": turn.historical_projection,
                        "visible_to_character_ids": [participation.character_id],
                    },
                    created_at=written_at,
                )
                self._append_message(
                    session,
                    run,
                    character_event,
                    role="character",
                    character_id=participation.character_id,
                    visible_to_character_ids=(participation.character_id,),
                    content=character_content,
                    created_at=written_at,
                )
                last_event = character_event

                if narration_after is not None:
                    last_event = self._append_event(
                        session,
                        run,
                        event_type="narration",
                        role="system",
                        content=narration_after,
                        source_kind="free_input",
                        source_id=character_event.id,
                        rule_source="dialogue.accepted.narration",
                        payload={
                            "boundary_reason": boundary_reason,
                            "presentation_version": 2,
                            "placement": "after_dialogue",
                        },
                        created_at=written_at,
                    )

                if relationship_change is not None:
                    last_event, relationship = self._apply_relationship_change(
                        session,
                        run,
                        world,
                        character_id=participation.character_id,
                        affinity_delta=relationship_change.affinity_delta,
                        reason=relationship_change.reason,
                        set_flags=relationship_change.set_flags,
                        source_kind="free_input",
                        source_id=player_event.id,
                        rule_source="dialogue.relationship",
                        extra_payload={"signal": relationship_change.signal},
                        changed_at=written_at,
                        relationship=relationship,
                    )

                self._touch_scope(
                    state,
                    progress,
                    written_at,
                    count_visit=False,
                )
                self._enqueue_memory(
                    session,
                    run,
                    story,
                    (participation.character_id,),
                    last_event.sequence,
                )
                session.flush()
                return self._aggregate(session, world, story, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "对话事件或消息序列发生并发冲突，请重新读取。",
            ) from exc

    def apply_choice(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
        choice_id: str,
        *,
        payload: Mapping[str, object] | None = None,
        decision_facts: DecisionFacts | None = None,
        now: datetime | None = None,
    ) -> StoryRunAggregate:
        """Apply one reviewed choice, node, decisions, relationships, and completion atomically."""

        player_id = _required_text(player_id, "player_id")
        choice_id = _required_text(choice_id, "choice_id")
        safe_payload = _json_object({} if payload is None else payload)
        facts = decision_facts or DecisionFacts()
        if not isinstance(facts, DecisionFacts):
            raise StoryStateError(
                "invalid_decision_facts",
                "CharacterDecision facts 无效。",
            )
        changed_at = now or datetime.utcnow()

        try:
            with self.database.session_scope() as session:
                world = self._published_world_in_session(
                    session,
                    story_world_id,
                    for_write=True,
                )
                story = self._published_story(world, story_id)
                participation = self._participation(world, story, character_id)
                state, progress, run = self._scope_for_update(
                    session,
                    player_id,
                    world.id,
                    story.id,
                    run_id,
                )
                self._require_current_content(run, world, story)
                prior = session.scalar(
                    select(StoryEventModel).where(
                        StoryEventModel.story_run_id == run.id,
                        StoryEventModel.event_type == "choice",
                        StoryEventModel.source_kind == "reviewed_choice",
                        StoryEventModel.source_id == choice_id,
                    )
                )
                if prior is not None:
                    prior_input = dict(prior.payload or {}).get("input", {})
                    if prior_input != safe_payload:
                        raise StoryStateError(
                            "choice_idempotency_conflict",
                            "同一选择已使用不同载荷写入。",
                        )
                    return self._aggregate(session, world, story, run)

                if run.status != StoryRunStatus.ACTIVE.value:
                    raise StoryStateError("run_completed", "这个故事轮次已经结束。")
                if progress.active_story_run_id != run.id:
                    raise StoryStateError(
                        "invalid_persisted_state",
                        "StoryRun 与分故事活动指针不一致。",
                    )
                node = self._node_in_chapter(
                    story,
                    run.current_chapter_id,
                    run.current_node_id,
                )
                self._require_interaction_character(
                    node,
                    participation.character_id,
                )
                choice = self._choice(node.choices, choice_id)
                flags = set(_string_list(run.story_flags, "story_flags"))
                if not set(choice.required_flags).issubset(flags) or (
                    set(choice.blocked_flags) & flags
                ):
                    raise StoryStateError(
                        "choice_unavailable",
                        "这个选择当前不可用。",
                    )

                choice_event = self._append_event(
                    session,
                    run,
                    event_type="choice",
                    role="player",
                    character_id=participation.character_id,
                    content=choice.label,
                    source_kind="reviewed_choice",
                    source_id=choice.id,
                    rule_source="story_choice.apply",
                    payload={
                        "choice_id": choice.id,
                        "input": safe_payload,
                        "next_node_id": choice.next_node_id,
                        "set_flags": list(choice.set_flags),
                        "visible_to_character_ids": [participation.character_id],
                    },
                    created_at=changed_at,
                )
                self._append_message(
                    session,
                    run,
                    choice_event,
                    role="player",
                    character_id=None,
                    visible_to_character_ids=(participation.character_id,),
                    content=choice.label,
                    created_at=changed_at,
                )
                if choice.is_key:
                    recorded = list(run.key_choices or [])
                    recorded.append(
                        {
                            "choice_id": choice.id,
                            "payload": safe_payload,
                            "source_event_id": choice_event.id,
                            "source_event_sequence": choice_event.sequence,
                        }
                    )
                    run.key_choices = recorded
                run.story_flags = list(
                    dict.fromkeys(
                        [*_string_list(run.story_flags, "story_flags"), *choice.set_flags]
                    )
                )

                touched_character_ids = {participation.character_id}
                last_event = choice_event
                for effect in choice.relationship_effects:
                    last_event, _ = self._apply_reviewed_effect(
                        session,
                        run,
                        world,
                        effect,
                        source_kind="reviewed_choice",
                        source_id=choice_event.id,
                        rule_source="story_choice.relationship",
                        changed_at=changed_at,
                    )
                    touched_character_ids.add(effect.character_id)

                target_chapter, target_node = self._chapter_for_node(
                    story,
                    choice.next_node_id,
                )
                run.current_chapter_id = target_chapter.id
                run.current_node_id = target_node.id
                last_event = self._append_node_presentation(
                    session,
                    run,
                    story,
                    target_node,
                    created_at=changed_at,
                )
                if target_node.character_id is not None:
                    touched_character_ids.add(target_node.character_id)

                target_node, last_event, decision_touched = self._resolve_decisions(
                    session,
                    run,
                    world,
                    story,
                    target_node,
                    current_character_id=participation.character_id,
                    facts=facts,
                    created_at=changed_at,
                    last_event=last_event,
                )
                touched_character_ids.update(decision_touched)

                if target_node.ending_id is not None:
                    last_event = self._complete_run(
                        session,
                        run,
                        progress,
                        story,
                        target_node.ending_id,
                        character_id=participation.character_id,
                        source_kind="reviewed_choice",
                        source_id=choice_event.id,
                        rule_source="story_choice.complete",
                        completed_at=changed_at,
                    )
                self._touch_scope(
                    state,
                    progress,
                    changed_at,
                    count_visit=False,
                )
                self._enqueue_memory(
                    session,
                    run,
                    story,
                    tuple(touched_character_ids),
                    last_event.sequence,
                )
                session.flush()
                return self._aggregate(session, world, story, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "选择、事件或关系写入发生并发冲突，请重新读取。",
            ) from exc

    def complete_run(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
        *,
        now: datetime | None = None,
    ) -> StoryRunAggregate:
        """Complete the current terminal node and enqueue its run_completed event atomically."""

        player_id = _required_text(player_id, "player_id")
        completed_at = now or datetime.utcnow()
        try:
            with self.database.session_scope() as session:
                world = self._published_world_in_session(
                    session,
                    story_world_id,
                    for_write=True,
                )
                story = self._published_story(world, story_id)
                participation = self._participation(world, story, character_id)
                state, progress, run = self._scope_for_update(
                    session,
                    player_id,
                    world.id,
                    story.id,
                    run_id,
                )
                if run.status == StoryRunStatus.COMPLETED.value:
                    return self._aggregate(session, world, story, run)
                if progress.active_story_run_id != run.id:
                    raise StoryStateError(
                        "invalid_persisted_state",
                        "StoryRun 与分故事活动指针不一致。",
                    )
                self._require_current_content(run, world, story)
                node = self._node_in_chapter(
                    story,
                    run.current_chapter_id,
                    run.current_node_id,
                )
                self._require_interaction_character(
                    node,
                    participation.character_id,
                )
                if node.ending_id is None:
                    raise StoryStateError(
                        "ending_not_found",
                        "当前节点不是审核终局。",
                    )
                event = self._complete_run(
                    session,
                    run,
                    progress,
                    story,
                    node.ending_id,
                    character_id=participation.character_id,
                    source_kind="authored",
                    source_id=node.id,
                    rule_source="story_run.complete",
                    completed_at=completed_at,
                )
                self._touch_scope(
                    state,
                    progress,
                    completed_at,
                    count_visit=False,
                )
                self._enqueue_memory(
                    session,
                    run,
                    story,
                    (participation.character_id,),
                    event.sequence,
                )
                session.flush()
                return self._aggregate(session, world, story, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "StoryRun 完成写入发生并发冲突，请重新读取。",
            ) from exc

    def list_relationships(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
    ) -> tuple[CharacterRelationship, ...]:
        """List long-term relationships for this run's explicit story participants."""

        world = self._published_world(story_world_id)
        story = self._published_story(world, story_id)
        with self.database.session_scope() as session:
            run = self._owned_run(
                session,
                player_id,
                world.id,
                story.id,
                run_id,
            )
            return self._relationships_for_story(session, run, story)

    def list_events(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
    ) -> tuple[StoryEvent, ...]:
        """List the ordered append-only event ledger for one exact scoped run."""

        world = self._published_world(story_world_id)
        story = self._published_story(world, story_id)
        with self.database.session_scope() as session:
            run = self._owned_run(
                session,
                player_id,
                world.id,
                story.id,
                run_id,
            )
            return self._events_for_run(session, run)

    def list_messages(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        *,
        character_id: str | None = None,
    ) -> tuple[StoryMessage, ...]:
        """List validated message projections, optionally limited to one Character's visibility."""

        world = self._published_world(story_world_id)
        story = self._published_story(world, story_id)
        resolved_character_id = None
        if character_id is not None:
            resolved_character_id = self._participation(
                world,
                story,
                character_id,
            ).character_id
        with self.database.session_scope() as session:
            run = self._owned_run(
                session,
                player_id,
                world.id,
                story.id,
                run_id,
            )
            messages = tuple(
                message
                for message, _ in self._validated_message_records(session, run, story)
            )
            if resolved_character_id is None:
                return messages
            return tuple(
                message
                for message in messages
                if resolved_character_id in message.visible_to_character_ids
            )

    def _start_new_run(
        self,
        session: Session,
        state: PlayerStoryStateModel,
        progress: PlayerStoryProgressModel,
        world: StoryWorld,
        story: ReviewedStory,
        participation: StoryCharacterParticipation,
        player_role: PlayerRole,
        *,
        run_id: str,
        started_at: datetime,
    ) -> StoryRunModel:
        """Insert one run parent, missing relationships, opening L0, and active pointer."""

        chapter = self._chapter(story, story.entry_chapter_id)
        node = self._node_in_chapter(story, chapter.id, chapter.entry_node_id)
        run = StoryRunModel(
            id=run_id,
            player_id=state.player_id,
            story_world_id=world.id,
            story_id=story.id,
            content_version=world.content_version,
            player_role_id=player_role.id,
            status=StoryRunStatus.ACTIVE.value,
            current_chapter_id=chapter.id,
            current_node_id=node.id,
            key_choices=[],
            story_flags=[],
            ending_id=None,
            ending_summary=None,
            started_at=started_at,
            completed_at=None,
        )
        session.add(run)
        session.flush()
        progress.active_story_run_id = run.id
        self._ensure_story_relationships(
            session,
            state.player_id,
            world,
            story,
            now=started_at,
        )
        self._append_event(
            session,
            run,
            event_type="run_started",
            role="system",
            content=story.summary,
            source_kind="authored",
            source_id=story.id,
            rule_source="story_run.start",
            payload={
                "story_id": story.id,
                "chapter_id": chapter.id,
                "node_id": node.id,
                "content_version": world.content_version,
                "player_role_id": player_role.id,
                "entry_character_id": participation.character_id,
            },
            created_at=started_at,
        )
        last_event = self._append_node_presentation(
            session,
            run,
            story,
            node,
            created_at=started_at,
        )
        last_event = self._append_opening_message(
            session,
            run,
            participation,
            created_at=started_at,
        )
        self._touch_scope(
            state,
            progress,
            started_at,
            count_visit=True,
        )
        if node.ending_id is not None:
            last_event = self._complete_run(
                session,
                run,
                progress,
                story,
                node.ending_id,
                character_id=participation.character_id,
                source_kind="authored",
                source_id=node.id,
                rule_source="story_run.start_terminal",
                completed_at=started_at,
            )
        memory_character_ids = [participation.character_id]
        if (
            node.presentation_kind is StoryNodePresentationKind.CHARACTER
            and node.character_id is not None
        ):
            memory_character_ids.append(node.character_id)
        self._enqueue_memory(
            session,
            run,
            story,
            memory_character_ids,
            last_event.sequence,
        )
        return run

    def _stop_stale_run(
        self,
        session: Session,
        run: StoryRunModel,
        progress: PlayerStoryProgressModel,
        story: ReviewedStory,
        *,
        stopped_at: datetime,
        current_content_version: str,
    ) -> StoryEventModel:
        """Archive a stale run with a Character-neutral, non-memory lifecycle event."""

        if run.status != StoryRunStatus.ACTIVE.value or progress.active_story_run_id != run.id:
            raise StoryStateError(
                "invalid_persisted_state",
                "只有分故事活动指针锁定的轮次可以停止。",
            )
        event = self._append_event(
            session,
            run,
            event_type="run_completed",
            role="system",
            content="故事内容版本已更新，玩家明确开始了新的轮次。",
            source_kind="authored",
            source_id=story.id,
            rule_source="story_run.restart_stale",
            payload={
                "completion_kind": "stale_restart",
                "ending_id": None,
                "locked_content_version": run.content_version,
                "current_content_version": current_content_version,
            },
            created_at=stopped_at,
        )
        run.status = StoryRunStatus.COMPLETED.value
        run.ending_id = None
        run.ending_summary = None
        run.completed_at = stopped_at
        progress.active_story_run_id = None
        progress.last_visited_at = stopped_at
        return event

    def _complete_run(
        self,
        session: Session,
        run: StoryRunModel,
        progress: PlayerStoryProgressModel,
        story: ReviewedStory,
        ending_id: str,
        *,
        character_id: str,
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        completed_at: datetime,
    ) -> StoryEventModel:
        """Append run_completed before updating run and per-story completion projections."""

        if run.status != StoryRunStatus.ACTIVE.value or progress.active_story_run_id != run.id:
            raise StoryStateError(
                "invalid_persisted_state",
                "当前轮次与分故事活动指针不一致。",
            )
        ending = self._ending(story, ending_id)
        event = self._append_event(
            session,
            run,
            event_type="run_completed",
            role="system",
            character_id=character_id,
            content=ending.summary,
            source_kind=source_kind,
            source_id=source_id or ending.id,
            rule_source=rule_source,
            payload={
                "completion_kind": "reviewed_ending",
                "ending_id": ending.id,
                "ending_title": ending.title,
            },
            created_at=completed_at,
        )
        run.status = StoryRunStatus.COMPLETED.value
        run.ending_id = ending.id
        run.ending_summary = ending.summary
        run.completed_at = completed_at
        progress.active_story_run_id = None
        summaries = list(progress.completed_run_summaries or [])
        if not any(
            isinstance(item, dict) and item.get("story_run_id") == run.id
            for item in summaries
        ):
            summaries.append(
                {
                    "story_run_id": run.id,
                    "story_id": story.id,
                    "ending_id": ending.id,
                    "summary": ending.summary,
                    "completed_at": completed_at.isoformat(),
                }
            )
        progress.completed_run_summaries = summaries
        progress.last_visited_at = completed_at
        return event

    def _resolve_decisions(
        self,
        session: Session,
        run: StoryRunModel,
        world: StoryWorld,
        story: ReviewedStory,
        node: StoryNode,
        *,
        current_character_id: str,
        facts: DecisionFacts,
        created_at: datetime,
        last_event: StoryEventModel,
    ) -> tuple[StoryNode, StoryEventModel, set[str]]:
        """Resolve ordered CharacterDecision rules and bounded chained result nodes."""

        decisions: dict[str, CharacterDecision] = {
            decision.trigger_node_id: decision
            for decision in story.character_decisions
        }
        visited: set[str] = set()
        touched: set[str] = set()
        current = node
        while current.id in decisions:
            decision = decisions[current.id]
            if decision.id in visited or len(visited) >= len(story.character_decisions):
                raise StoryStateError(
                    "decision_cycle",
                    "CharacterDecision 自动转换形成循环。",
                )
            visited.add(decision.id)
            rule = next(
                (
                    candidate
                    for candidate in decision.rules
                    if all(
                        self._predicate_matches(
                            session,
                            run,
                            condition,
                            current_character_id=current_character_id,
                            facts=facts,
                        )
                        for condition in candidate.conditions
                    )
                ),
                None,
            )
            if rule is None:
                raise StoryStateError(
                    "decision_no_match",
                    "CharacterDecision 没有唯一确定的审核结果。",
                )
            decision_event = self._append_event(
                session,
                run,
                event_type="character_decision",
                role="system",
                character_id=decision.character_id,
                content=rule.reason,
                source_kind="reviewed_decision",
                source_id=decision.id,
                rule_source="character_decision.apply",
                payload={
                    "decision_id": decision.id,
                    "rule_id": rule.id,
                    "trigger_node_id": decision.trigger_node_id,
                    "next_node_id": rule.next_node_id,
                    "set_flags": list(rule.set_flags),
                    "facts": self._decision_facts_payload(
                        current_character_id,
                        facts,
                    ),
                },
                created_at=created_at,
            )
            run.story_flags = list(
                dict.fromkeys(
                    [*_string_list(run.story_flags, "story_flags"), *rule.set_flags]
                )
            )
            touched.add(decision.character_id)
            last_event = decision_event
            for effect in rule.relationship_effects:
                last_event, _ = self._apply_reviewed_effect(
                    session,
                    run,
                    world,
                    effect,
                    source_kind="reviewed_decision",
                    source_id=decision_event.id,
                    rule_source="character_decision.relationship",
                    changed_at=created_at,
                )
                touched.add(effect.character_id)
            chapter, current = self._chapter_for_node(story, rule.next_node_id)
            run.current_chapter_id = chapter.id
            run.current_node_id = current.id
            last_event = self._append_node_presentation(
                session,
                run,
                story,
                current,
                created_at=created_at,
            )
            if current.character_id is not None:
                touched.add(current.character_id)
        return current, last_event, touched

    def _predicate_matches(
        self,
        session: Session,
        run: StoryRunModel,
        predicate: DecisionPredicate,
        *,
        current_character_id: str,
        facts: DecisionFacts,
    ) -> bool:
        """Evaluate one closed predicate from persisted or trusted structured facts."""

        if predicate.kind is DecisionPredicateKind.STORY_FLAG:
            return (
                predicate.flag in set(_string_list(run.story_flags, "story_flags"))
            ) is predicate.expected
        if predicate.kind is DecisionPredicateKind.INVESTIGATION_RESULT:
            if predicate.result_id not in facts.investigation_results:
                return False
            return _predicate_values_equal(
                facts.investigation_results[predicate.result_id],
                predicate.expected_value,
            )
        if predicate.kind is DecisionPredicateKind.PLAYER_COMMITMENT:
            return facts.player_commitments.get(predicate.action_id, False) is predicate.expected
        if predicate.kind is DecisionPredicateKind.CURRENT_CHARACTER:
            return predicate.character_id == current_character_id
        if predicate.kind is not DecisionPredicateKind.RELATIONSHIP_RANGE:
            raise StoryStateError(
                "invalid_decision_predicate",
                "CharacterDecision predicate 不在封闭合同中。",
            )
        relationship = session.get(
            CharacterRelationshipModel,
            (run.player_id, run.story_world_id, predicate.character_id),
        )
        if relationship is None:
            raise StoryStateError(
                "invalid_persisted_state",
                "决定条件引用的长期关系不存在。",
            )
        affinity = float(relationship.affinity)
        return (
            predicate.minimum_affinity is None
            or affinity >= float(predicate.minimum_affinity)
        ) and (
            predicate.maximum_affinity is None
            or affinity <= float(predicate.maximum_affinity)
        )

    @staticmethod
    def _decision_facts_payload(
        current_character_id: str,
        facts: DecisionFacts,
    ) -> dict[str, Any]:
        """Return replay-safe structured facts recorded with a reviewed decision."""

        return {
            "current_character_id": current_character_id,
            "investigation_results": dict(facts.investigation_results),
            "player_commitments": dict(facts.player_commitments),
        }

    def _apply_reviewed_effect(
        self,
        session: Session,
        run: StoryRunModel,
        world: StoryWorld,
        effect: RelationshipEffect,
        *,
        source_kind: str,
        source_id: str,
        rule_source: str,
        changed_at: datetime,
    ) -> tuple[StoryEventModel, CharacterRelationshipModel]:
        """Apply one authored relationship effect after appending its source event."""

        return self._apply_relationship_change(
            session,
            run,
            world,
            character_id=effect.character_id,
            affinity_delta=effect.affinity_delta,
            reason=effect.reason,
            set_flags=effect.set_flags,
            source_kind=source_kind,
            source_id=source_id,
            rule_source=rule_source,
            extra_payload={},
            changed_at=changed_at,
        )

    def _apply_relationship_change(
        self,
        session: Session,
        run: StoryRunModel,
        world: StoryWorld,
        *,
        character_id: str,
        affinity_delta: int | float,
        reason: str,
        set_flags: Sequence[str],
        source_kind: str,
        source_id: str,
        rule_source: str,
        extra_payload: Mapping[str, object],
        changed_at: datetime,
        relationship: CharacterRelationshipModel | None = None,
    ) -> tuple[StoryEventModel, CharacterRelationshipModel]:
        """Append relationship_changed, then update value and its immutable source pair."""

        character = self._character(world, character_id)
        delta = _finite_number(affinity_delta, "affinity_delta")
        reason = _required_text(reason, "relationship_reason")
        flags = tuple(dict.fromkeys(_input_string_sequence(set_flags, "relationship_flags")))
        if delta == 0 and not flags:
            raise StoryStateError(
                "empty_relationship_change",
                "关系变化必须改变好感或写入审核标记。",
            )
        row = relationship or self._relationship_for_update(
            session,
            run.player_id,
            run.story_world_id,
            character.id,
            world,
            initialize_if_missing=True,
            for_update=True,
            now=changed_at,
        )
        previous_affinity = float(row.affinity)
        next_affinity = self._clamp_affinity(character, previous_affinity + delta)
        next_stage = self._stage_for(character, next_affinity)
        event = self._append_event(
            session,
            run,
            event_type="relationship_changed",
            role="system",
            character_id=character.id,
            content=reason,
            source_kind=source_kind,
            source_id=source_id,
            rule_source=rule_source,
            payload={
                "character_id": character.id,
                "previous_affinity": previous_affinity,
                "affinity_delta": delta,
                "affinity": next_affinity,
                "stage": next_stage.id,
                "reason": reason,
                "set_flags": list(flags),
                **_json_object(extra_payload),
            },
            created_at=changed_at,
        )
        row.affinity = next_affinity
        row.stage = next_stage.id
        row.last_change_reason = reason
        row.flags = list(
            dict.fromkeys([*_string_list(row.flags, "relationship.flags"), *flags])
        )
        row.last_source_story_run_id = run.id
        row.last_source_event_id = event.id
        row.updated_at = changed_at
        return event, row

    def _append_node_presentation(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
        node: StoryNode,
        *,
        created_at: datetime,
    ) -> StoryEventModel:
        """Write node presentation, creating a message only for Character dialogue."""

        payload = {
            "story_id": story.id,
            "node_id": node.id,
            "presentation_kind": node.presentation_kind.value,
        }
        if node.presentation_kind is StoryNodePresentationKind.CHARACTER:
            character_id = _required_text(node.character_id, "node.character_id")
            event = self._append_event(
                session,
                run,
                event_type="message",
                role="character",
                character_id=character_id,
                content=node.narration,
                source_kind="authored",
                source_id=node.id,
                rule_source="story_node.character",
                payload={
                    **payload,
                    "visible_to_character_ids": [character_id],
                },
                created_at=created_at,
            )
            self._append_message(
                session,
                run,
                event,
                role="character",
                character_id=character_id,
                visible_to_character_ids=(character_id,),
                content=node.narration,
                created_at=created_at,
            )
            return event
        event_type = (
            "action"
            if node.presentation_kind is StoryNodePresentationKind.ACTION
            else "narration"
        )
        return self._append_event(
            session,
            run,
            event_type=event_type,
            role="system",
            content=node.narration,
            source_kind="authored",
            source_id=node.id,
            rule_source=f"story_node.{node.presentation_kind.value}",
            payload=payload,
            created_at=created_at,
        )

    def _append_opening_message(
        self,
        session: Session,
        run: StoryRunModel,
        participation: StoryCharacterParticipation,
        *,
        created_at: datetime,
    ) -> StoryEventModel:
        """Keep reviewed opening source text on its event and project only quoted speech."""

        event = self._append_event(
            session,
            run,
            event_type="message",
            role="character",
            character_id=participation.character_id,
            content=participation.opening_line,
            source_kind="authored",
            source_id="opening_line",
            rule_source="story_participation.opening",
            payload={
                "opening": True,
                "visible_to_character_ids": [participation.character_id],
            },
            created_at=created_at,
        )
        self._append_message(
            session,
            run,
            event,
            role="character",
            character_id=participation.character_id,
            visible_to_character_ids=(participation.character_id,),
            content=_opening_line_dialogue(participation.opening_line),
            created_at=created_at,
        )
        return event

    def _append_event(
        self,
        session: Session,
        run: StoryRunModel,
        *,
        event_type: str,
        role: str | None,
        content: str,
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        payload: Mapping[str, object],
        created_at: datetime,
        character_id: str | None = None,
    ) -> StoryEventModel:
        """Allocate the next run-owned event sequence and flush its append-only row."""

        if role is not None and role not in MESSAGE_ROLES:
            raise StoryStateError("invalid_event_role", "StoryEvent role 无效。")
        source_kind = _required_text(source_kind, "source_kind")
        if source_kind not in EVENT_SOURCE_KINDS:
            raise StoryStateError(
                "invalid_event_source_kind",
                "StoryEvent source_kind 不在封闭合同中。",
            )
        sequence = self._latest_event_sequence(session, run.id) + 1
        event_payload = _json_object(payload)
        event_payload["rule_source"] = _required_text(rule_source, "rule_source")
        event = StoryEventModel(
            id=str(uuid4()),
            story_run_id=run.id,
            sequence=sequence,
            event_type=_required_text(event_type, "event_type"),
            character_id=(
                None
                if character_id is None
                else _required_text(character_id, "character_id")
            ),
            role=role,
            content=_required_text(content, "content"),
            source_kind=source_kind,
            source_id=(
                None if source_id is None else _required_text(source_id, "source_id")
            ),
            payload=event_payload,
            created_at=created_at,
        )
        session.add(event)
        session.flush()
        return event

    def _append_message(
        self,
        session: Session,
        run: StoryRunModel,
        source_event: StoryEventModel,
        *,
        role: str,
        character_id: str | None,
        visible_to_character_ids: Sequence[str],
        content: str,
        created_at: datetime,
    ) -> StoryMessageModel:
        """Project one message event with explicit Character visibility in the same transaction."""

        role = _required_text(role, "message.role")
        if role not in MESSAGE_ROLES:
            raise StoryStateError("invalid_message_role", "StoryMessage role 无效。")
        visible_ids = tuple(
            dict.fromkeys(
                _input_string_sequence(
                    visible_to_character_ids,
                    "visible_to_character_ids",
                )
            )
        )
        if not visible_ids:
            raise StoryStateError(
                "invalid_message_visibility",
                "StoryMessage 必须有至少一个可见 Character。",
            )
        if role == "character":
            resolved_character_id = _required_text(character_id, "character_id")
            if resolved_character_id not in visible_ids:
                raise StoryStateError(
                    "invalid_message_visibility",
                    "Character 消息必须对发言 Character 可见。",
                )
        elif character_id is not None:
            raise StoryStateError(
                "invalid_message_character",
                "非 Character 消息不得绑定发言 Character。",
            )
        else:
            resolved_character_id = None
        message = StoryMessageModel(
            id=str(uuid4()),
            story_run_id=run.id,
            sequence=self._next_message_sequence(session, run.id),
            role=role,
            character_id=resolved_character_id,
            visible_to_character_ids=list(visible_ids),
            content=_required_text(content, "message.content"),
            source_event_id=source_event.id,
            source_event_sequence=int(source_event.sequence),
            created_at=created_at,
        )
        session.add(message)
        session.flush()
        return message

    def _state_for_update(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        *,
        now: datetime,
    ) -> PlayerStoryStateModel:
        """Lock or create the world-root state before any per-story child write."""

        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == player_id,
                PlayerStoryStateModel.story_world_id == story_world_id,
            )
            .with_for_update()
        )
        if state is None:
            state = PlayerStoryStateModel(
                player_id=player_id,
                story_world_id=story_world_id,
                visit_count=0,
                last_visited_at=now,
            )
            session.add(state)
            session.flush()
        return state

    def _progress_for_update(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> PlayerStoryProgressModel:
        """Lock or create one story-scoped progress row under its existing root."""

        progress = session.scalar(
            select(PlayerStoryProgressModel)
            .where(
                PlayerStoryProgressModel.player_id == player_id,
                PlayerStoryProgressModel.story_world_id == story_world_id,
                PlayerStoryProgressModel.story_id == story_id,
            )
            .with_for_update()
        )
        if progress is None:
            progress = PlayerStoryProgressModel(
                player_id=player_id,
                story_world_id=story_world_id,
                story_id=story_id,
                active_story_run_id=None,
                last_visited_at=None,
                completed_run_summaries=[],
            )
            session.add(progress)
            session.flush()
        return progress

    def _scope_for_update(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
    ) -> tuple[PlayerStoryStateModel, PlayerStoryProgressModel, StoryRunModel]:
        """Lock the root, story progress, and exact owner-scoped run in stable order."""

        player_id = _required_text(player_id, "player_id")
        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == player_id,
                PlayerStoryStateModel.story_world_id == story_world_id,
            )
            .with_for_update()
        )
        if state is None:
            raise StoryStateError("run_not_found", "没有找到这个故事轮次。")
        progress = session.scalar(
            select(PlayerStoryProgressModel)
            .where(
                PlayerStoryProgressModel.player_id == player_id,
                PlayerStoryProgressModel.story_world_id == story_world_id,
                PlayerStoryProgressModel.story_id == story_id,
            )
            .with_for_update()
        )
        if progress is None:
            raise StoryStateError("run_not_found", "没有找到这个故事轮次。")
        run = self._owned_run(
            session,
            player_id,
            story_world_id,
            story_id,
            run_id,
            for_update=True,
        )
        return state, progress, run

    def _active_scope_for_update(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
    ) -> tuple[PlayerStoryStateModel, PlayerStoryProgressModel, StoryRunModel]:
        """Lock an exact scoped run and require both active status and progress pointer."""

        state, progress, run = self._scope_for_update(
            session,
            player_id,
            story_world_id,
            story_id,
            run_id,
        )
        if run.status != StoryRunStatus.ACTIVE.value:
            raise StoryStateError("run_completed", "这个故事轮次已经结束。")
        if progress.active_story_run_id != run.id:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryRun 与分故事活动指针不一致。",
            )
        return state, progress, run

    def _owned_run(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        *,
        for_update: bool = False,
    ) -> StoryRunModel:
        """Require exact owner/world/run first, then fail distinctly on story mismatch."""

        player_id = _required_text(player_id, "player_id")
        story_world_id = _required_text(story_world_id, "story_world_id")
        story_id = _required_text(story_id, "story_id")
        run_id = _required_text(run_id, "run_id")
        statement = select(StoryRunModel).where(
            StoryRunModel.id == run_id,
            StoryRunModel.player_id == player_id,
            StoryRunModel.story_world_id == story_world_id,
        )
        if for_update:
            statement = statement.with_for_update()
        run = session.scalar(statement)
        if run is None:
            raise StoryStateError("run_not_found", "没有找到这个故事轮次。")
        if run.story_id != story_id:
            raise StoryStateError(
                "story_mismatch",
                "StoryRun 不属于请求中的 ReviewedStory。",
            )
        return run

    def _owned_active_run(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        *,
        for_update: bool = False,
    ) -> StoryRunModel:
        """Require an exact owner/world/story run whose lifecycle is still active."""

        run = self._owned_run(
            session,
            player_id,
            story_world_id,
            story_id,
            run_id,
            for_update=for_update,
        )
        if run.status != StoryRunStatus.ACTIVE.value:
            raise StoryStateError("run_completed", "这个故事轮次已经结束。")
        return run

    def _active_run_for_progress(
        self,
        session: Session,
        state: PlayerStoryStateModel,
        progress: PlayerStoryProgressModel,
        *,
        for_update: bool,
    ) -> StoryRunModel | None:
        """Resolve and verify one progress pointer without repairing missing state."""

        if not progress.active_story_run_id:
            return None
        run = self._owned_run(
            session,
            state.player_id,
            state.story_world_id,
            progress.story_id,
            progress.active_story_run_id,
            for_update=for_update,
        )
        if run.status != StoryRunStatus.ACTIVE.value:
            raise StoryStateError(
                "invalid_persisted_state",
                "分故事活动指针没有指向活动轮次。",
            )
        return run

    @staticmethod
    def _touch_scope(
        state: PlayerStoryStateModel,
        progress: PlayerStoryProgressModel,
        visited_at: datetime,
        *,
        count_visit: bool,
    ) -> None:
        """Update visit timestamps and count only explicit story-entry visits."""

        if count_visit:
            state.visit_count = int(state.visit_count or 0) + 1
        state.last_visited_at = visited_at
        progress.last_visited_at = visited_at

    def _require_no_unpointed_active(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> None:
        """Fail closed when an active row exists without the matching progress pointer."""

        active = session.scalar(
            select(StoryRunModel)
            .where(
                StoryRunModel.player_id == player_id,
                StoryRunModel.story_world_id == story_world_id,
                StoryRunModel.story_id == story_id,
                StoryRunModel.status == StoryRunStatus.ACTIVE.value,
            )
            .with_for_update()
        )
        if active is not None:
            raise StoryStateError(
                "invalid_persisted_state",
                "存在没有被分故事进度指向的活动轮次。",
            )

    @staticmethod
    def _latest_completed_run(
        session: Session,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> StoryRunModel | None:
        """Return the latest completed run for one exact owner/story, if any."""

        return session.scalar(
            select(StoryRunModel)
            .where(
                StoryRunModel.player_id == player_id,
                StoryRunModel.story_world_id == story_world_id,
                StoryRunModel.story_id == story_id,
                StoryRunModel.status == StoryRunStatus.COMPLETED.value,
            )
            .order_by(
                StoryRunModel.completed_at.desc(),
                StoryRunModel.started_at.desc(),
                StoryRunModel.id.desc(),
            )
            .limit(1)
        )

    def _ensure_story_relationships(
        self,
        session: Session,
        player_id: str,
        world: StoryWorld,
        story: ReviewedStory,
        *,
        now: datetime,
    ) -> None:
        """Initialize only missing participant relationships and never reset existing rows."""

        for participant in story.participants:
            self._relationship_for_update(
                session,
                player_id,
                world.id,
                participant.character_id,
                world,
                initialize_if_missing=True,
                for_update=True,
                now=now,
            )

    def _relationship_for_update(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        character_id: str,
        world: StoryWorld,
        *,
        initialize_if_missing: bool,
        for_update: bool,
        now: datetime,
    ) -> CharacterRelationshipModel:
        """Lock one long-term relationship, optionally initializing only a missing row."""

        character = self._character(world, character_id)
        statement = select(CharacterRelationshipModel).where(
            CharacterRelationshipModel.player_id == player_id,
            CharacterRelationshipModel.story_world_id == story_world_id,
            CharacterRelationshipModel.character_id == character.id,
        )
        if for_update:
            statement = statement.with_for_update()
        relationship = session.scalar(statement)
        if relationship is not None:
            self._validate_relationship_source(session, relationship)
            return relationship
        if not initialize_if_missing:
            raise StoryStateError(
                "invalid_persisted_state",
                "Character 长期关系不存在。",
            )
        initial_affinity = float(character.relationship_rules.initial_affinity)
        relationship = CharacterRelationshipModel(
            player_id=player_id,
            story_world_id=story_world_id,
            character_id=character.id,
            affinity=initial_affinity,
            stage=self._stage_for(character, initial_affinity).id,
            last_change_reason="",
            flags=[],
            last_source_story_run_id=None,
            last_source_event_id=None,
            updated_at=now,
        )
        session.add(relationship)
        session.flush()
        return relationship

    @staticmethod
    def _validate_relationship_source(
        session: Session,
        relationship: CharacterRelationshipModel,
    ) -> None:
        """Prove a long-term relationship source belongs to the same owner and world."""

        source_run_id = relationship.last_source_story_run_id
        source_event_id = relationship.last_source_event_id
        if (source_run_id is None) != (source_event_id is None):
            raise StoryStateError(
                "invalid_persisted_state",
                "长期关系来源必须成对存在。",
            )
        if source_run_id is None:
            return
        source_run = session.get(StoryRunModel, source_run_id)
        source_event = session.scalar(
            select(StoryEventModel).where(
                StoryEventModel.story_run_id == source_run_id,
                StoryEventModel.id == source_event_id,
            )
        )
        if (
            source_run is None
            or source_run.player_id != relationship.player_id
            or source_run.story_world_id != relationship.story_world_id
            or source_event is None
            or source_event.event_type != "relationship_changed"
            or source_event.character_id != relationship.character_id
        ):
            raise StoryStateError(
                "invalid_persisted_state",
                "长期关系来源不属于同一玩家、世界与 Character。",
            )

    def _require_dialogue_guard(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
        guard: DialogueWriteGuard,
        *,
        character_id: str,
    ) -> None:
        """Reject a dialogue response computed from a changed run or event watermark."""

        if (
            guard.story_run_id != run.id
            or guard.story_id != story.id
            or guard.character_id != character_id
        ):
            raise StoryStateError(
                "dialogue_state_changed",
                "对话快照不属于当前 StoryRun。",
            )
        if (
            guard.content_version != run.content_version
            or guard.current_chapter_id != run.current_chapter_id
            or guard.current_node_id != run.current_node_id
            or guard.last_event_sequence != self._latest_event_sequence(session, run.id)
        ):
            raise StoryStateError(
                "dialogue_state_changed",
                "故事状态已经变化，请基于当前内容重新回应。",
            )

    def _aggregate(
        self,
        session: Session,
        world: StoryWorld,
        story: ReviewedStory,
        run: StoryRunModel,
    ) -> StoryRunAggregate:
        """Project an exact run and all application-facing children before Session close."""

        state = session.get(
            PlayerStoryStateModel,
            (run.player_id, run.story_world_id),
        )
        progress = session.get(
            PlayerStoryProgressModel,
            (run.player_id, run.story_world_id, run.story_id),
        )
        if state is None or progress is None:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryRun 缺少所属状态或分故事进度。",
            )
        if run.story_world_id != world.id or run.story_id != story.id:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryRun 投影越过了请求中的世界或故事边界。",
            )
        if (
            run.status == StoryRunStatus.ACTIVE.value
            and progress.active_story_run_id != run.id
        ):
            raise StoryStateError(
                "invalid_persisted_state",
                "活动 StoryRun 与分故事进度指针不一致。",
            )
        projected_run = self._run_domain(run)
        events = self._events_for_run(session, run)
        self._validate_recorded_choice_sources(projected_run, events)
        return StoryRunAggregate(
            story_world=world,
            story=story,
            state=self._state_domain(state),
            progress=self._progress_domain(progress),
            run=projected_run,
            relationships=self._relationships_for_story(session, run, story),
            events=events,
            messages=tuple(
                message
                for message, _ in self._message_records_for_projection(
                    session,
                    run,
                    world,
                    story,
                )
            ),
        )

    @staticmethod
    def _state_domain(model: PlayerStoryStateModel) -> PlayerStoryState:
        """Project the world-root state into its four-field immutable domain value."""

        return PlayerStoryState(
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            visit_count=int(model.visit_count or 0),
            last_visited_at=model.last_visited_at,
        )

    def _progress_domain(
        self,
        model: PlayerStoryProgressModel,
    ) -> PlayerStoryProgress:
        """Validate and project ordered per-story completion summaries."""

        summaries: list[CompletedRunSummary] = []
        raw_summaries = model.completed_run_summaries or []
        if not isinstance(raw_summaries, list):
            raise StoryStateError(
                "invalid_persisted_state",
                "完成轮次摘要必须是数组。",
            )
        for raw in raw_summaries:
            if not isinstance(raw, dict):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "完成轮次摘要必须是对象。",
                )
            story_id = _required_text(raw.get("story_id"), "summary.story_id")
            if story_id != model.story_id:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "完成轮次摘要跨越了 ReviewedStory 边界。",
                )
            completed_at = _parse_datetime(raw.get("completed_at"))
            if completed_at is None:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "完成轮次摘要缺少有效完成时间。",
                )
            summaries.append(
                CompletedRunSummary(
                    story_run_id=_required_text(
                        raw.get("story_run_id"),
                        "summary.story_run_id",
                    ),
                    story_id=story_id,
                    ending_id=_required_text(raw.get("ending_id"), "summary.ending_id"),
                    summary=_required_text(raw.get("summary"), "summary.summary"),
                    completed_at=completed_at,
                )
            )
        return PlayerStoryProgress(
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            story_id=model.story_id,
            active_story_run_id=model.active_story_run_id,
            last_visited_at=model.last_visited_at,
            completed_run_summaries=tuple(summaries),
        )

    @staticmethod
    def _run_domain(model: StoryRunModel) -> StoryRun:
        """Validate target-shape run JSON and project one immutable StoryRun."""

        choices: list[RecordedChoice] = []
        raw_choices = model.key_choices or []
        if not isinstance(raw_choices, list):
            raise StoryStateError(
                "invalid_persisted_state",
                "关键选择必须是结构化数组。",
            )
        for raw in raw_choices:
            if not isinstance(raw, dict):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "关键选择不符合 009 结构。",
                )
            source_sequence = raw.get("source_event_sequence")
            if (
                isinstance(source_sequence, bool)
                or not isinstance(source_sequence, int)
                or source_sequence < 1
            ):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "关键选择来源序号无效。",
                )
            raw_payload = raw.get("payload")
            if not isinstance(raw_payload, Mapping):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "关键选择载荷必须是对象。",
                )
            choices.append(
                RecordedChoice(
                    choice_id=_required_text(raw.get("choice_id"), "choice_id"),
                    payload=freeze_json_mapping(raw_payload),
                    source_event_id=_required_text(
                        raw.get("source_event_id"),
                        "source_event_id",
                    ),
                    source_event_sequence=source_sequence,
                )
            )
        try:
            status = StoryRunStatus(model.status)
        except ValueError as exc:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryRun 状态不在允许范围内。",
            ) from exc
        if status is StoryRunStatus.ACTIVE and (
            model.ending_id is not None
            or model.ending_summary is not None
            or model.completed_at is not None
        ):
            raise StoryStateError(
                "invalid_persisted_state",
                "活动 StoryRun 含有完成字段。",
            )
        if status is StoryRunStatus.COMPLETED and model.completed_at is None:
            raise StoryStateError(
                "invalid_persisted_state",
                "已完成 StoryRun 缺少完成时间。",
            )
        return StoryRun(
            id=model.id,
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            story_id=model.story_id,
            content_version=model.content_version,
            player_role_id=model.player_role_id,
            status=status,
            current_chapter_id=model.current_chapter_id,
            current_node_id=model.current_node_id,
            key_choices=tuple(choices),
            story_flags=tuple(_string_list(model.story_flags, "story_flags")),
            ending_id=model.ending_id,
            ending_summary=model.ending_summary,
            started_at=model.started_at,
            completed_at=model.completed_at,
        )

    @staticmethod
    def _relationship_domain(
        model: CharacterRelationshipModel,
    ) -> CharacterRelationship:
        """Project one world-long relationship while preserving its source pair."""

        if (model.last_source_story_run_id is None) != (
            model.last_source_event_id is None
        ):
            raise StoryStateError(
                "invalid_persisted_state",
                "长期关系来源必须成对存在。",
            )
        return CharacterRelationship(
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            character_id=model.character_id,
            affinity=float(model.affinity),
            stage=model.stage,
            last_change_reason=model.last_change_reason,
            flags=tuple(_string_list(model.flags, "relationship.flags")),
            last_source_story_run_id=model.last_source_story_run_id,
            last_source_event_id=model.last_source_event_id,
            updated_at=model.updated_at,
        )

    @staticmethod
    def _event_domain(model: StoryEventModel) -> StoryEvent:
        """Project one event after requiring a JSON object payload."""

        if not isinstance(model.payload, dict):
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryEvent payload 必须是对象。",
            )
        rule_source = model.payload.get("rule_source")
        if (
            not isinstance(rule_source, str)
            or not rule_source.strip()
            or rule_source != rule_source.strip()
        ):
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryEvent 缺少规范 rule_source。",
            )
        return StoryEvent(
            id=model.id,
            story_run_id=model.story_run_id,
            sequence=int(model.sequence),
            event_type=model.event_type,
            character_id=model.character_id,
            role=model.role,
            content=model.content,
            source_kind=model.source_kind,
            source_id=model.source_id,
            rule_source=rule_source,
            payload=freeze_json_mapping(model.payload),
            created_at=model.created_at,
        )

    @staticmethod
    def _message_domain(model: StoryMessageModel) -> StoryMessage:
        """Project one already-source-validated StoryMessage row."""

        return StoryMessage(
            id=model.id,
            story_run_id=model.story_run_id,
            sequence=int(model.sequence),
            role=model.role,
            character_id=model.character_id,
            visible_to_character_ids=tuple(
                _string_list(
                    model.visible_to_character_ids,
                    "visible_to_character_ids",
                )
            ),
            content=model.content,
            source_event_id=model.source_event_id,
            source_event_sequence=int(model.source_event_sequence),
            created_at=model.created_at,
        )

    def _relationships_for_story(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
    ) -> tuple[CharacterRelationship, ...]:
        """Return only relationships owned by this run owner and story participants."""

        participant_ids = tuple(participant.character_id for participant in story.participants)
        rows = tuple(
            session.scalars(
                select(CharacterRelationshipModel)
                .where(
                    CharacterRelationshipModel.player_id == run.player_id,
                    CharacterRelationshipModel.story_world_id == run.story_world_id,
                    CharacterRelationshipModel.character_id.in_(participant_ids),
                )
                .order_by(CharacterRelationshipModel.character_id)
            )
        )
        for row in rows:
            self._validate_relationship_source(session, row)
        return tuple(self._relationship_domain(row) for row in rows)

    def _events_for_run(
        self,
        session: Session,
        run: StoryRunModel,
    ) -> tuple[StoryEvent, ...]:
        """Return the ordered event ledger for one already owner-scoped run."""

        rows = tuple(
            session.scalars(
                select(StoryEventModel)
                .where(StoryEventModel.story_run_id == run.id)
                .order_by(StoryEventModel.sequence)
            )
        )
        expected = tuple(range(1, len(rows) + 1))
        if tuple(int(row.sequence) for row in rows) != expected:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryEvent 序列不连续。",
            )
        return tuple(self._event_domain(row) for row in rows)

    @staticmethod
    def _validate_recorded_choice_sources(
        run: StoryRun,
        events: Sequence[StoryEvent],
    ) -> None:
        """Prove every recorded key choice points to its exact reviewed event and input."""

        event_by_id = {event.id: event for event in events}
        seen_choice_ids: set[str] = set()
        for choice in run.key_choices:
            source = event_by_id.get(choice.source_event_id)
            source_input = source.payload.get("input") if source is not None else None
            if (
                choice.choice_id in seen_choice_ids
                or source is None
                or source.sequence != choice.source_event_sequence
                or source.event_type != "choice"
                or source.source_kind != "reviewed_choice"
                or source.source_id != choice.choice_id
                or not isinstance(source_input, Mapping)
                or freeze_json_mapping(source_input) != choice.payload
            ):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "关键选择没有唯一、匹配的来源事件。",
                )
            seen_choice_ids.add(choice.choice_id)

    def _validated_message_records(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
    ) -> tuple[tuple[StoryMessage, StoryEventModel], ...]:
        """Verify source event, content, role, speaker, and participant visibility for messages."""

        return self._source_validated_message_records(
            session,
            run,
            current_participant_ids=frozenset(
                participant.character_id for participant in story.participants
            ),
        )

    def _message_records_for_projection(
        self,
        session: Session,
        run: StoryRunModel,
        world: StoryWorld,
        story: ReviewedStory,
    ) -> tuple[tuple[StoryMessage, StoryEventModel], ...]:
        """Return message/source pairs using live scope only for current-content runs."""

        if self._run_uses_current_content(run, world, story):
            return self._validated_message_records(session, run, story)
        return self._source_validated_message_records(
            session,
            run,
            current_participant_ids=None,
        )

    def _source_validated_message_records(
        self,
        session: Session,
        run: StoryRunModel,
        *,
        current_participant_ids: frozenset[str] | None,
    ) -> tuple[tuple[StoryMessage, StoryEventModel], ...]:
        """Return same-run message/source pairs, optionally enforcing live participants."""

        event_rows = tuple(
            session.scalars(
                select(StoryEventModel).where(StoryEventModel.story_run_id == run.id)
            )
        )
        event_by_id = {event.id: event for event in event_rows}
        message_rows = tuple(
            session.scalars(
                select(StoryMessageModel)
                .where(StoryMessageModel.story_run_id == run.id)
                .order_by(StoryMessageModel.sequence)
            )
        )
        expected_sequences = tuple(range(1, len(message_rows) + 1))
        if tuple(int(row.sequence) for row in message_rows) != expected_sequences:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryMessage 序列不连续。",
            )
        records: list[tuple[StoryMessage, StoryEventModel]] = []
        for row in message_rows:
            event = event_by_id.get(row.source_event_id)
            visibility = _string_list(
                row.visible_to_character_ids,
                "visible_to_character_ids",
            )
            source_shape_valid = event is not None and (
                (
                    event.event_type == "message"
                    and event.character_id == row.character_id
                )
                or (
                    event.event_type == "choice"
                    and event.source_kind == "reviewed_choice"
                    and row.role == "player"
                    and row.character_id is None
                    and event.character_id in visibility
                )
            )
            if (
                event is None
                or int(event.sequence) != int(row.source_event_sequence)
                or not source_shape_valid
                or row.role not in MESSAGE_ROLES
                or event.role != row.role
                or not visibility
                or (
                    current_participant_ids is not None
                    and not set(visibility).issubset(current_participant_ids)
                )
            ):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "StoryMessage 来源或 Character 可见性无效。",
                )
            expected_content = (
                _opening_line_dialogue(event.content)
                if event.source_kind == "authored" and event.source_id == "opening_line"
                else event.content
            )
            if expected_content != row.content:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "StoryMessage 与来源事件正文不一致。",
                )
            if row.role == "character" and (
                row.character_id is None or row.character_id not in visibility
            ):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "Character 消息缺少合法 speaker 可见性。",
                )
            if row.role != "character" and row.character_id is not None:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "非 Character 消息绑定了 speaker。",
                )
            records.append((self._message_domain(row), event))
        return tuple(records)

    def _dialogue_messages(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
        character_id: str,
    ) -> tuple[StoryMessage, ...]:
        """Return only paired, policy-valid messages visible to the current Character."""

        records = self._validated_message_records(session, run, story)
        visible = [
            (message, event)
            for message, event in records
            if character_id in message.visible_to_character_ids
        ]
        blocked_player_event_ids: set[str] = set()
        included_character_event_ids: set[str] = set()
        included_player_event_ids: set[str] = set()
        for message, event in visible:
            if message.role != "character" or message.character_id != character_id:
                continue
            payload = event.payload if isinstance(event.payload, dict) else {}
            if (
                payload.get("model_output_replaced") is True
                and payload.get("replacement_source") == "model_policy"
            ):
                if event.source_id:
                    blocked_player_event_ids.add(event.source_id)
                continue
            included_character_event_ids.add(event.id)
            if event.source_kind == "free_input" and event.source_id:
                included_player_event_ids.add(event.source_id)

        messages: list[StoryMessage] = []
        for message, event in visible:
            if message.role == "character" and event.id in included_character_event_ids:
                messages.append(message)
            elif (
                message.role == "player"
                and event.id in included_player_event_ids
                and event.id not in blocked_player_event_ids
            ):
                messages.append(message)
        return tuple(messages[-DIALOGUE_HISTORY_LIMIT:])

    def _enqueue_memory(
        self,
        session: Session,
        run: StoryRunModel,
        story: ReviewedStory,
        character_ids: Sequence[str],
        pending_event_sequence: int,
    ) -> None:
        """Advance outbox watermarks only when every requested Character is in story scope."""

        participant_ids = {participant.character_id for participant in story.participants}
        scoped_ids = tuple(
            dict.fromkeys(
                _input_string_sequence(character_ids, "memory_character_ids")
            )
        )
        if not scoped_ids or any(
            character_id not in participant_ids for character_id in scoped_ids
        ):
            raise StoryStateError(
                "invalid_memory_character",
                "accepted L0 包含不属于当前故事的 Character。",
            )
        self.memory_store.enqueue_after_events(
            session,
            run=run,
            character_ids=scoped_ids,
            pending_event_sequence=pending_event_sequence,
        )

    @staticmethod
    def _latest_event_sequence(session: Session, run_id: str) -> int:
        """Return the current run event watermark while the caller owns write ordering."""

        value = session.scalar(
            select(func.coalesce(func.max(StoryEventModel.sequence), 0)).where(
                StoryEventModel.story_run_id == run_id
            )
        )
        return int(value or 0)

    @staticmethod
    def _next_message_sequence(session: Session, run_id: str) -> int:
        """Return the next dense message projection sequence under the run lock."""

        value = session.scalar(
            select(func.coalesce(func.max(StoryMessageModel.sequence), 0)).where(
                StoryMessageModel.story_run_id == run_id
            )
        )
        return int(value or 0) + 1

    def _run_uses_current_content(
        self,
        run: StoryRunModel,
        world: StoryWorld,
        story: ReviewedStory,
    ) -> bool:
        """Check immutable run identity plus all current story graph references without writes."""

        if (
            run.story_world_id != world.id
            or run.story_id != story.id
            or run.content_version != world.content_version
            or not any(role.id == run.player_role_id for role in world.player_roles)
        ):
            return False
        try:
            self._node_in_chapter(
                story,
                run.current_chapter_id,
                run.current_node_id,
            )
            if run.ending_id is not None:
                self._ending(story, run.ending_id)
            for raw in run.key_choices or []:
                if not isinstance(raw, dict):
                    return False
                self._story_choice(story, _required_text(raw.get("choice_id"), "choice_id"))
        except StoryStateError:
            return False
        if run.status == StoryRunStatus.ACTIVE.value:
            return (
                run.ending_id is None
                and run.ending_summary is None
                and run.completed_at is None
            )
        return run.status == StoryRunStatus.COMPLETED.value and run.completed_at is not None

    def _require_current_content(
        self,
        run: StoryRunModel,
        world: StoryWorld,
        story: ReviewedStory,
    ) -> None:
        """Reject a stale or structurally unresolvable run without repairing it."""

        if not self._run_uses_current_content(run, world, story):
            raise StoryStateError(
                "story_content_changed",
                "活动轮次锁定的故事内容已经变化，请显式重新开始。",
            )

    @staticmethod
    def _validated_relationship_change(
        value: RelationshipChangeWrite | None,
    ) -> RelationshipChangeWrite | None:
        """Validate one optional natural relationship change before opening a transaction."""

        if value is None:
            return None
        if not isinstance(value, RelationshipChangeWrite):
            raise StoryStateError(
                "invalid_relationship_change",
                "关系变化载荷无效。",
            )
        delta = _finite_number(value.affinity_delta, "affinity_delta")
        reason = _required_text(value.reason, "relationship_reason")
        flags = tuple(
            dict.fromkeys(_input_string_sequence(value.set_flags, "relationship_flags"))
        )
        if delta == 0 and not flags:
            raise StoryStateError(
                "empty_relationship_change",
                "关系变化必须改变好感或写入审核标记。",
            )
        signal = None if value.signal is None else _required_text(value.signal, "signal")
        return RelationshipChangeWrite(
            affinity_delta=delta,
            reason=reason,
            set_flags=flags,
            signal=signal,
        )

    def _published_world(self, story_world_id: str) -> StoryWorld:
        """Resolve one current published StoryWorld from the live source."""

        story_world_id = _required_text(story_world_id, "story_world_id")
        world = self.registry.get(story_world_id)
        if world is None or world.publication_status is not PublicationStatus.PUBLISHED:
            raise StoryStateError(
                "story_world_not_found",
                "没有找到已发布的 StoryWorld。",
            )
        return world

    @staticmethod
    def _published_story(world: StoryWorld, story_id: str) -> ReviewedStory:
        """Resolve one explicit published ReviewedStory without default selection."""

        story_id = _required_text(story_id, "story_id")
        story = next((candidate for candidate in world.stories if candidate.id == story_id), None)
        if story is None or story.publication_status is not PublicationStatus.PUBLISHED:
            raise StoryStateError(
                "story_not_found",
                "没有找到已发布的 ReviewedStory。",
            )
        return story

    @staticmethod
    def _player_role(world: StoryWorld, player_role_id: str) -> PlayerRole:
        """Resolve the explicit world-owned PlayerRole locked by a new StoryRun."""

        player_role_id = _required_text(player_role_id, "player_role_id")
        role = next((candidate for candidate in world.player_roles if candidate.id == player_role_id), None)
        if role is None:
            raise StoryStateError(
                "player_role_not_found",
                "PlayerRole 不属于当前 StoryWorld。",
            )
        return role

    @staticmethod
    def _character(world: StoryWorld, character_id: str) -> Character:
        """Resolve one stable Character from its containing StoryWorld."""

        character_id = _required_text(character_id, "character_id")
        character = next(
            (candidate for candidate in world.characters if candidate.id == character_id),
            None,
        )
        if character is None:
            raise StoryStateError(
                "character_not_found",
                "Character 不属于当前 StoryWorld。",
            )
        return character

    def _participation(
        self,
        world: StoryWorld,
        story: ReviewedStory,
        character_id: str,
        *,
        require_can_start: bool = False,
    ) -> StoryCharacterParticipation:
        """Resolve one story participant and optionally require an approved entry."""

        character = self._character(world, character_id)
        participation = next(
            (
                candidate
                for candidate in story.participants
                if candidate.character_id == character.id
            ),
            None,
        )
        if participation is None or (require_can_start and not participation.can_start):
            raise StoryStateError(
                "participant_mismatch",
                "Character 不是当前 ReviewedStory 允许的参与入口。",
            )
        return participation

    @staticmethod
    def _require_interaction_character(
        node: StoryNode,
        character_id: str,
    ) -> None:
        """Require Character-bound nodes to advance only through that Character context."""

        if (
            node.presentation_kind is StoryNodePresentationKind.CHARACTER
            and node.character_id != character_id
        ):
            raise StoryStateError(
                "character_context_mismatch",
                "当前 Character 不能推进另一个 Character 的审核节点。",
            )

    @staticmethod
    def _chapter(story: ReviewedStory, chapter_id: str) -> StoryChapter:
        """Resolve a chapter only within its locked ReviewedStory."""

        chapter_id = _required_text(chapter_id, "chapter_id")
        chapter = next((candidate for candidate in story.chapters if candidate.id == chapter_id), None)
        if chapter is None:
            raise StoryStateError(
                "chapter_not_found",
                "章节不属于当前 ReviewedStory。",
            )
        return chapter

    @classmethod
    def _node_in_chapter(
        cls,
        story: ReviewedStory,
        chapter_id: str,
        node_id: str,
    ) -> StoryNode:
        """Resolve a node and prove it belongs to the run's locked chapter."""

        chapter = cls._chapter(story, chapter_id)
        node_id = _required_text(node_id, "node_id")
        node = next((candidate for candidate in chapter.nodes if candidate.id == node_id), None)
        if node is None:
            raise StoryStateError(
                "node_not_found",
                "节点不属于 StoryRun 锁定的章节。",
            )
        return node

    @staticmethod
    def _chapter_for_node(
        story: ReviewedStory,
        node_id: str,
    ) -> tuple[StoryChapter, StoryNode]:
        """Resolve a cross-chapter target only inside the same ReviewedStory."""

        node_id = _required_text(node_id, "node_id")
        for chapter in story.chapters:
            node = next((candidate for candidate in chapter.nodes if candidate.id == node_id), None)
            if node is not None:
                return chapter, node
        raise StoryStateError(
            "node_not_found",
            "节点不属于当前 ReviewedStory。",
        )

    @staticmethod
    def _ending(story: ReviewedStory, ending_id: str) -> StoryEnding:
        """Resolve an ending only inside the run's locked ReviewedStory."""

        ending_id = _required_text(ending_id, "ending_id")
        ending = next((candidate for candidate in story.endings if candidate.id == ending_id), None)
        if ending is None:
            raise StoryStateError(
                "ending_not_found",
                "结局不属于当前 ReviewedStory。",
            )
        return ending

    @staticmethod
    def _choice(choices: Sequence[StoryChoice], choice_id: str) -> StoryChoice:
        """Resolve one available choice from the current node's reviewed tuple."""

        choice = next((candidate for candidate in choices if candidate.id == choice_id), None)
        if choice is None:
            raise StoryStateError("choice_unavailable", "这个选择当前不可用。")
        return choice

    @classmethod
    def _story_choice(cls, story: ReviewedStory, choice_id: str) -> StoryChoice:
        """Resolve a recorded choice ID anywhere inside its original ReviewedStory."""

        for chapter in story.chapters:
            for node in chapter.nodes:
                try:
                    return cls._choice(node.choices, choice_id)
                except StoryStateError as error:
                    if error.code != "choice_unavailable":
                        raise
        raise StoryStateError(
            "choice_unavailable",
            "关键选择不属于当前 ReviewedStory。",
        )

    @staticmethod
    def _stage_for(character: Character, affinity: float) -> RelationshipStage:
        """Return the highest reviewed relationship stage reached by affinity."""

        eligible = tuple(
            stage
            for stage in character.relationship_rules.stages
            if affinity >= float(stage.minimum_affinity)
        )
        if not eligible:
            raise StoryStateError(
                "relationship_stage_not_found",
                "关系值没有对应的审核阶段。",
            )
        return eligible[-1]

    @staticmethod
    def _clamp_affinity(character: Character, affinity: float) -> float:
        """Clamp one finite relationship value to the Character's reviewed range."""

        affinity = _finite_number(affinity, "affinity")
        return max(
            float(character.relationship_rules.minimum_affinity),
            min(float(character.relationship_rules.maximum_affinity), affinity),
        )


def _required_text(value: object, field_name: str) -> str:
    """Return one trimmed non-empty input string or raise a stable state error."""

    if not isinstance(value, str) or not value.strip():
        raise StoryStateError("invalid_value", f"{field_name} 不能为空。")
    return value.strip()


def _optional_text(value: object, field_name: str) -> str | None:
    """Normalize optional authored text, treating only blank text as absent."""

    if value is None:
        return None
    if not isinstance(value, str):
        raise StoryStateError("invalid_value", f"{field_name} 必须是字符串。")
    normalized = value.strip()
    return normalized or None


def _finite_number(value: object, field_name: str) -> float:
    """Return one finite non-boolean number for relationship arithmetic."""

    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not isfinite(float(value))
    ):
        raise StoryStateError("invalid_value", f"{field_name} 必须是有限数值。")
    return float(value)


def _predicate_value(value: object, field_name: str) -> PredicateValue:
    """Return one supported finite scalar for investigation-result matching."""

    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return _required_text(value, field_name)
    if isinstance(value, (int, float)):
        number = _finite_number(value, field_name)
        return int(number) if isinstance(value, int) else number
    raise StoryStateError(
        "invalid_decision_facts",
        f"{field_name} 必须是布尔值、有限数值或非空字符串。",
    )


def _predicate_values_equal(left: object, right: object) -> bool:
    """Compare predicate scalars without treating booleans as integers."""

    if isinstance(left, bool) or isinstance(right, bool):
        return isinstance(left, bool) and isinstance(right, bool) and left is right
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return float(left) == float(right)
    return type(left) is type(right) and left == right


def _string_list(value: object, field_name: str) -> list[str]:
    """Validate one persisted JSON string array without legacy scalar fallback."""

    if not isinstance(value, list) or any(
        not isinstance(item, str) or not item.strip() or item != item.strip()
        for item in value
    ):
        raise StoryStateError(
            "invalid_persisted_state",
            f"{field_name} 必须是非空字符串数组。",
        )
    return list(value)


def _input_string_sequence(value: object, field_name: str) -> tuple[str, ...]:
    """Validate an input sequence of non-empty strings and preserve its order."""

    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise StoryStateError(
            "invalid_value",
            f"{field_name} 必须是字符串数组。",
        )
    return tuple(_required_text(item, field_name) for item in value)


def _json_object(value: Mapping[str, object]) -> dict[str, Any]:
    """Freeze and convert one JSON-safe mapping for SQLAlchemy persistence."""

    frozen = freeze_json_mapping(value)
    return {key: _json_ready(item) for key, item in frozen.items()}


def _json_ready(value: object) -> Any:
    """Convert recursively immutable domain JSON into mutable JSON-column values."""

    if isinstance(value, Mapping):
        return {str(key): _json_ready(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_json_ready(item) for item in value]
    return value


def _parse_datetime(value: object) -> datetime | None:
    """Parse one persisted ISO timestamp without inventing a fallback time."""

    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def _opening_line_dialogue(content: object) -> str:
    """Extract reviewed quoted speech while preserving an already pure opening."""

    normalized = _required_text(content, "opening_line")
    quoted_parts = [
        next(part for part in match.groups() if part is not None).strip()
        for match in _OPENING_LINE_QUOTED_SPEECH.finditer(normalized)
    ]
    return "\n".join(part for part in quoted_parts if part) or normalized


__all__ = [
    "AcceptedDialogueTurn",
    "DecisionFacts",
    "DialogueSnapshot",
    "DialogueWriteGuard",
    "PlayerStoryStateStore",
    "RelationshipChangeWrite",
    "StoryRunAggregate",
    "StoryRunContinuity",
    "StoryWorldSource",
]
