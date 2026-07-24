"""Transactional persistence for private player StoryWorld state."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime
from math import isfinite
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..domain.story_state import (
    CharacterRelationship,
    CompletedRunSummary,
    PlayerStoryState,
    PrivateMemory,
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
    PublicationStatus,
    StoryChoice,
    StoryWorld,
    StoryWorldRegistry,
)
from .database import Database
from .story_state_models import (
    CharacterRelationshipModel,
    PlayerStoryStateModel,
    PrivateMemoryModel,
    StoryEventModel,
    StoryMessageModel,
    StoryRunModel,
)

MESSAGE_ROLES = frozenset({"player", "character", "system"})


class PlayerStoryStateStore:
    """Keep private StoryWorld state isolated and transactionally consistent."""

    def __init__(self, database: Database, registry: StoryWorldRegistry) -> None:
        self.database = database
        self.registry = registry

    def get_or_create_state(
        self,
        player_id: str,
        story_world_id: str,
        *,
        now: datetime | None = None,
    ) -> PlayerStoryState:
        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        try:
            with self.database.session_scope() as session:
                state = self._state_for_update(
                    session,
                    player_id,
                    world,
                    now=now or datetime.utcnow(),
                )
                session.flush()
                return self._state_domain(session, state)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "玩家故事状态被并发创建，请重新读取。",
            ) from exc

    def get_state(self, player_id: str, story_world_id: str) -> PlayerStoryState | None:
        player_id = _required_text(player_id, "player_id")
        story_world_id = _required_text(story_world_id, "story_world_id")
        with self.database.session_scope() as session:
            state = session.get(PlayerStoryStateModel, (player_id, story_world_id))
            return self._state_domain(session, state) if state is not None else None

    def start_run(
        self,
        player_id: str,
        story_world_id: str,
        *,
        run_id: str | None = None,
        now: datetime | None = None,
    ) -> StoryRun:
        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        started_at = now or datetime.utcnow()
        resolved_run_id = _required_text(run_id or str(uuid4()), "run_id")
        chapter = self._chapter(world, world.entry_chapter_id)
        node = self._node(world, chapter.entry_node_id)

        try:
            with self.database.session_scope() as session:
                state = self._state_for_update(session, player_id, world, now=started_at)
                if state.active_story_run_id:
                    active = session.get(StoryRunModel, state.active_story_run_id)
                    if active is None or active.status != StoryRunStatus.ACTIVE.value:
                        raise StoryStateError(
                            "invalid_persisted_state",
                            "玩家活动轮次指针与故事轮次不一致。",
                        )
                    raise StoryStateError("active_run_exists", "当前故事尚未结束。")

                run = StoryRunModel(
                    id=resolved_run_id,
                    player_id=player_id,
                    story_world_id=world.id,
                    content_version=world.content_version,
                    status=StoryRunStatus.ACTIVE.value,
                    current_chapter_id=chapter.id,
                    current_node_id=node.id,
                    key_choices=[],
                    story_flags=[],
                    private_memories=[],
                    started_at=started_at,
                )
                session.add(run)
                session.flush()

                for character in world.characters:
                    stage = self._stage_for(
                        character,
                        float(character.relationship_rules.initial_affinity),
                    )
                    session.add(
                        CharacterRelationshipModel(
                            story_run_id=run.id,
                            character_id=character.id,
                            affinity=float(character.relationship_rules.initial_affinity),
                            stage=stage.id,
                            last_change_reason="",
                            flags=[],
                        )
                    )

                self._append_event(
                    session,
                    run,
                    event_type="run_started",
                    role="system",
                    content=node.narration,
                    source_kind="authored",
                    source_id=node.id,
                    rule_source="story_run.start",
                    payload={
                        "chapter_id": chapter.id,
                        "node_id": node.id,
                        "content_version": world.content_version,
                    },
                    created_at=started_at,
                )
                state.active_story_run_id = run.id
                state.visit_count = int(state.visit_count or 0) + 1
                state.last_visited_at = started_at
                session.flush()
                return self._run_domain(session, run)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "故事轮次写入发生并发冲突，请重新读取。",
            ) from exc

    def resume_active_run(
        self,
        player_id: str,
        story_world_id: str,
        *,
        now: datetime | None = None,
    ) -> StoryRun | None:
        world = self._published_world(story_world_id)
        player_id = _required_text(player_id, "player_id")
        visited_at = now or datetime.utcnow()
        with self.database.session_scope() as session:
            state = session.scalar(
                select(PlayerStoryStateModel)
                .where(
                    PlayerStoryStateModel.player_id == player_id,
                    PlayerStoryStateModel.story_world_id == world.id,
                )
                .with_for_update()
            )
            if state is None:
                return None
            if state.player_role_id != world.player_role.id:
                raise StoryStateError(
                    "player_role_mismatch",
                    "已保存的 PlayerRole 与 StoryWorld 固定身份不一致。",
                )
            if not state.active_story_run_id:
                return None
            run = self._owned_run(
                session,
                player_id,
                world.id,
                state.active_story_run_id,
                for_update=True,
            )
            if run.status != StoryRunStatus.ACTIVE.value:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "玩家活动轮次指向了已完成轮次。",
                )
            state.visit_count = int(state.visit_count or 0) + 1
            state.last_visited_at = visited_at
            session.flush()
            return self._run_domain(session, run)

    def get_run(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> StoryRun | None:
        player_id = _required_text(player_id, "player_id")
        story_world_id = _required_text(story_world_id, "story_world_id")
        run_id = _required_text(run_id, "run_id")
        with self.database.session_scope() as session:
            run = session.get(StoryRunModel, run_id)
            if (
                run is None
                or run.player_id != player_id
                or run.story_world_id != story_world_id
            ):
                return None
            return self._run_domain(session, run)

    def list_relationships(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> tuple[CharacterRelationship, ...]:
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, story_world_id, run_id)
            rows = session.scalars(
                select(CharacterRelationshipModel)
                .where(CharacterRelationshipModel.story_run_id == run.id)
                .order_by(CharacterRelationshipModel.character_id)
            ).all()
            return tuple(self._relationship_domain(session, row) for row in rows)

    def list_events(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> tuple[StoryEvent, ...]:
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, story_world_id, run_id)
            rows = session.scalars(
                select(StoryEventModel)
                .where(StoryEventModel.story_run_id == run.id)
                .order_by(StoryEventModel.sequence)
            ).all()
            return tuple(self._event_domain(row) for row in rows)

    def list_messages(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> tuple[StoryMessage, ...]:
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, story_world_id, run_id)
            rows = session.scalars(
                select(StoryMessageModel)
                .where(StoryMessageModel.story_run_id == run.id)
                .order_by(StoryMessageModel.sequence)
            ).all()
            return tuple(self._message_domain(row) for row in rows)

    def list_memories(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> tuple[PrivateMemory, ...]:
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, story_world_id, run_id)
            rows = session.scalars(
                select(PrivateMemoryModel)
                .where(PrivateMemoryModel.story_run_id == run.id)
                .order_by(PrivateMemoryModel.created_at, PrivateMemoryModel.id)
            ).all()
            return tuple(self._memory_domain(row) for row in rows)

    def record_message(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        *,
        role: str,
        content: str,
        character_id: str | None = None,
        visible_to_character_ids: Sequence[str] = (),
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        now: datetime | None = None,
    ) -> StoryMessage:
        world = self._published_world(story_world_id)
        role = _required_text(role, "role")
        if role not in MESSAGE_ROLES:
            raise StoryStateError("invalid_message_role", "消息角色不在允许范围内。")
        content = _required_text(content, "content")
        if character_id is not None:
            self._character(world, character_id)
        if role == "character" and character_id is None:
            raise StoryStateError("character_required", "角色消息必须绑定 Character。")
        visible_ids = tuple(
            dict.fromkeys(
                _input_string_sequence(
                    visible_to_character_ids,
                    "visible_to_character_ids",
                )
            )
        )
        for visible_character_id in visible_ids:
            self._character(world, visible_character_id)
        created_at = now or datetime.utcnow()

        try:
            with self.database.session_scope() as session:
                run = self._owned_active_run(
                    session,
                    player_id,
                    world.id,
                    run_id,
                    for_update=True,
                )
                self._require_current_content(run, world)
                event = self._append_event(
                    session,
                    run,
                    event_type="message",
                    role=role,
                    content=content,
                    character_id=character_id,
                    source_kind=source_kind,
                    source_id=source_id,
                    rule_source=rule_source,
                    payload={"visible_to_character_ids": list(visible_ids)},
                    created_at=created_at,
                )
                message_sequence = self._next_message_sequence(session, run.id)
                message = StoryMessageModel(
                    id=str(uuid4()),
                    story_run_id=run.id,
                    sequence=message_sequence,
                    role=role,
                    character_id=character_id,
                    visible_to_character_ids=list(visible_ids),
                    content=content,
                    source_event_id=event.id,
                    source_event_sequence=event.sequence,
                    created_at=created_at,
                )
                session.add(message)
                session.flush()
                return self._message_domain(message)
        except IntegrityError as exc:
            raise StoryStateError(
                "persistence_conflict",
                "消息顺序写入发生并发冲突，请重新读取。",
            ) from exc

    def apply_choice(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        choice_id: str,
        *,
        payload: Mapping[str, object] | None = None,
        now: datetime | None = None,
    ) -> StoryRun:
        world = self._published_world(story_world_id)
        choice_id = _required_text(choice_id, "choice_id")
        safe_payload = _json_object(payload or {})
        changed_at = now or datetime.utcnow()

        with self.database.session_scope() as session:
            run = self._owned_run(
                session,
                player_id,
                world.id,
                run_id,
                for_update=True,
            )
            prior = session.scalar(
                select(StoryEventModel).where(
                    StoryEventModel.story_run_id == run.id,
                    StoryEventModel.source_kind == "reviewed_choice",
                    StoryEventModel.source_id == choice_id,
                    StoryEventModel.event_type == "choice",
                )
            )
            if prior is not None:
                prior_payload = dict(prior.payload or {}).get("input", {})
                if prior_payload != safe_payload:
                    raise StoryStateError(
                        "choice_idempotency_conflict",
                        "同一选择 ID 已使用不同载荷写入。",
                    )
                return self._run_domain(session, run)

            if run.status != StoryRunStatus.ACTIVE.value:
                raise StoryStateError("run_completed", "这个故事轮次已经结束。")
            self._require_current_content(run, world)
            node = self._node_in_chapter(
                world,
                run.current_chapter_id,
                run.current_node_id,
            )
            choice = self._choice(node.choices, choice_id)
            existing_flags = _string_list(run.story_flags, "story_flags")
            flag_set = set(existing_flags)
            if not set(choice.required_flags).issubset(flag_set) or (
                set(choice.blocked_flags) & flag_set
            ):
                raise StoryStateError("choice_unavailable", "这个选择当前不可用。")

            choice_event = self._append_event(
                session,
                run,
                event_type="choice",
                role="player",
                content=choice.label,
                source_kind="reviewed_choice",
                source_id=choice.id,
                rule_source="story_choice.apply",
                payload={
                    "choice_id": choice.id,
                    "input": safe_payload,
                    "next_node_id": choice.next_node_id,
                    "set_flags": list(choice.set_flags),
                },
                created_at=changed_at,
            )
            if choice.is_key:
                choices = list(run.key_choices or [])
                choices.append(
                    {
                        "choice_id": choice.id,
                        "payload": safe_payload,
                        "source_event_id": choice_event.id,
                        "source_event_sequence": choice_event.sequence,
                    }
                )
                run.key_choices = choices

            run.story_flags = list(
                dict.fromkeys([*existing_flags, *choice.set_flags])
            )
            for effect in choice.relationship_effects:
                relationship = session.get(
                    CharacterRelationshipModel,
                    (run.id, effect.character_id),
                )
                if relationship is None:
                    raise StoryStateError(
                        "invalid_persisted_state",
                        "角色关系状态不存在。",
                    )
                character = self._character(world, effect.character_id)
                previous_affinity = float(relationship.affinity)
                relationship.affinity = self._clamp_affinity(
                    character,
                    previous_affinity + float(effect.affinity_delta),
                )
                relationship.stage = self._stage_for(
                    character,
                    float(relationship.affinity),
                ).id
                relationship.last_change_reason = effect.reason
                relationship.flags = list(
                    dict.fromkeys([*(relationship.flags or []), *effect.set_flags])
                )
                self._append_event(
                    session,
                    run,
                    event_type="relationship_changed",
                    role="system",
                    content=effect.reason,
                    character_id=character.id,
                    source_kind="reviewed_choice",
                    source_id=choice.id,
                    rule_source="story_choice.relationship_effect",
                    payload={
                        "affinity_before": previous_affinity,
                        "affinity_after": float(relationship.affinity),
                        "stage": relationship.stage,
                        "set_flags": list(effect.set_flags),
                    },
                    created_at=changed_at,
                )

            previous_chapter_id = run.current_chapter_id
            previous_node_id = run.current_node_id
            next_chapter, next_node = self._chapter_for_node(
                world,
                choice.next_node_id,
            )
            run.current_chapter_id = next_chapter.id
            run.current_node_id = next_node.id
            self._append_event(
                session,
                run,
                event_type="node_changed",
                role="system",
                content=next_node.narration,
                source_kind="reviewed_choice",
                source_id=choice.id,
                rule_source="story_choice.transition",
                payload={
                    "from_chapter_id": previous_chapter_id,
                    "from_node_id": previous_node_id,
                    "to_chapter_id": next_chapter.id,
                    "to_node_id": next_node.id,
                },
                created_at=changed_at,
            )
            if next_node.ending_id:
                self._complete_run(
                    session,
                    run,
                    world,
                    ending_id=next_node.ending_id,
                    source_kind="reviewed_choice",
                    source_id=choice.id,
                    rule_source="story_choice.ending",
                    completed_at=changed_at,
                )
            session.flush()
            return self._run_domain(session, run)

    def change_relationship(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        character_id: str,
        *,
        affinity_delta: float,
        reason: str,
        set_flags: Sequence[str] = (),
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        now: datetime | None = None,
    ) -> CharacterRelationship:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        reason = _required_text(reason, "reason")
        requested_flags = _input_string_sequence(set_flags, "set_flags")
        changed_at = now or datetime.utcnow()

        with self.database.session_scope() as session:
            run = self._owned_active_run(
                session,
                player_id,
                world.id,
                run_id,
                for_update=True,
            )
            self._require_current_content(run, world)
            relationship = session.get(
                CharacterRelationshipModel,
                (run.id, character.id),
            )
            if relationship is None:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "角色关系状态不存在。",
                )
            previous_affinity = float(relationship.affinity)
            relationship.affinity = self._clamp_affinity(
                character,
                previous_affinity + float(affinity_delta),
            )
            relationship.stage = self._stage_for(
                character,
                float(relationship.affinity),
            ).id
            relationship.last_change_reason = reason
            relationship.flags = list(
                dict.fromkeys([*(relationship.flags or []), *requested_flags])
            )
            self._append_event(
                session,
                run,
                event_type="relationship_changed",
                role="system",
                content=reason,
                character_id=character.id,
                source_kind=source_kind,
                source_id=source_id,
                rule_source=rule_source,
                payload={
                    "affinity_before": previous_affinity,
                    "affinity_after": float(relationship.affinity),
                    "stage": relationship.stage,
                    "set_flags": list(requested_flags),
                },
                created_at=changed_at,
            )
            session.flush()
            return self._relationship_domain(session, relationship)

    def add_memory(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        *,
        content: str,
        character_id: str | None,
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        now: datetime | None = None,
    ) -> PrivateMemory:
        world = self._published_world(story_world_id)
        content = _required_text(content, "content")
        if character_id is not None:
            self._character(world, character_id)
        created_at = now or datetime.utcnow()

        with self.database.session_scope() as session:
            run = self._owned_active_run(
                session,
                player_id,
                world.id,
                run_id,
                for_update=True,
            )
            self._require_current_content(run, world)
            event = self._append_event(
                session,
                run,
                event_type="memory_added",
                role="system",
                content=content,
                character_id=character_id,
                source_kind=source_kind,
                source_id=source_id,
                rule_source=rule_source,
                payload={},
                created_at=created_at,
            )
            memory = PrivateMemoryModel(
                id=str(uuid4()),
                story_run_id=run.id,
                content=content,
                source_event_id=event.id,
                source_event_sequence=event.sequence,
                character_id=character_id,
                created_at=created_at,
            )
            session.add(memory)
            session.flush()
            return self._memory_domain(memory)

    def complete_run(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        ending_id: str,
        *,
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        now: datetime | None = None,
    ) -> StoryRun:
        world = self._published_world(story_world_id)
        completed_at = now or datetime.utcnow()
        with self.database.session_scope() as session:
            run = self._owned_run(
                session,
                player_id,
                world.id,
                run_id,
                for_update=True,
            )
            if run.status == StoryRunStatus.COMPLETED.value:
                if run.ending_id != ending_id:
                    raise StoryStateError(
                        "ending_conflict",
                        "已完成轮次不能改写为其他结局。",
                    )
                return self._run_domain(session, run)
            self._require_current_content(run, world)
            self._complete_run(
                session,
                run,
                world,
                ending_id=ending_id,
                source_kind=source_kind,
                source_id=source_id,
                rule_source=rule_source,
                completed_at=completed_at,
            )
            session.flush()
            return self._run_domain(session, run)

    def _state_for_update(
        self,
        session: Session,
        player_id: str,
        world: StoryWorld,
        *,
        now: datetime,
    ) -> PlayerStoryStateModel:
        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == player_id,
                PlayerStoryStateModel.story_world_id == world.id,
            )
            .with_for_update()
        )
        if state is None:
            state = PlayerStoryStateModel(
                player_id=player_id,
                story_world_id=world.id,
                player_role_id=world.player_role.id,
                active_story_run_id=None,
                visit_count=0,
                last_visited_at=now,
                completed_run_summaries=[],
            )
            session.add(state)
            session.flush()
        elif state.player_role_id != world.player_role.id:
            raise StoryStateError(
                "player_role_mismatch",
                "已保存的 PlayerRole 与 StoryWorld 固定身份不一致。",
            )
        return state

    def _owned_run(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        run_id: str,
        *,
        for_update: bool = False,
    ) -> StoryRunModel:
        player_id = _required_text(player_id, "player_id")
        story_world_id = _required_text(story_world_id, "story_world_id")
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
        return run

    def _owned_active_run(
        self,
        session: Session,
        player_id: str,
        story_world_id: str,
        run_id: str,
        *,
        for_update: bool = False,
    ) -> StoryRunModel:
        run = self._owned_run(
            session,
            player_id,
            story_world_id,
            run_id,
            for_update=for_update,
        )
        if run.status != StoryRunStatus.ACTIVE.value:
            raise StoryStateError("run_completed", "这个故事轮次已经结束。")
        return run

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
        sequence = session.scalar(
            select(func.coalesce(func.max(StoryEventModel.sequence), 0)).where(
                StoryEventModel.story_run_id == run.id
            )
        )
        event_payload = _json_object(payload)
        event_payload["rule_source"] = _required_text(rule_source, "rule_source")
        event = StoryEventModel(
            id=str(uuid4()),
            story_run_id=run.id,
            sequence=int(sequence or 0) + 1,
            event_type=_required_text(event_type, "event_type"),
            character_id=character_id,
            role=role,
            content=_required_text(content, "content"),
            source_kind=_required_text(source_kind, "source_kind"),
            source_id=source_id,
            payload=event_payload,
            created_at=created_at,
        )
        session.add(event)
        session.flush()
        return event

    def _next_message_sequence(self, session: Session, run_id: str) -> int:
        sequence = session.scalar(
            select(func.coalesce(func.max(StoryMessageModel.sequence), 0)).where(
                StoryMessageModel.story_run_id == run_id
            )
        )
        return int(sequence or 0) + 1

    def _complete_run(
        self,
        session: Session,
        run: StoryRunModel,
        world: StoryWorld,
        *,
        ending_id: str,
        source_kind: str,
        source_id: str | None,
        rule_source: str,
        completed_at: datetime,
    ) -> None:
        ending = self._ending(world, ending_id)
        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == run.player_id,
                PlayerStoryStateModel.story_world_id == run.story_world_id,
            )
            .with_for_update()
        )
        if state is None or state.active_story_run_id != run.id:
            raise StoryStateError(
                "invalid_persisted_state",
                "当前轮次与玩家活动轮次指针不一致。",
            )
        if run.status != StoryRunStatus.ACTIVE.value:
            raise StoryStateError("run_completed", "这个故事轮次已经结束。")

        self._append_event(
            session,
            run,
            event_type="run_completed",
            role="system",
            content=ending.summary,
            source_kind=source_kind,
            source_id=source_id or ending.id,
            rule_source=rule_source,
            payload={"ending_id": ending.id},
            created_at=completed_at,
        )
        run.status = StoryRunStatus.COMPLETED.value
        run.ending_id = ending.id
        run.ending_summary = ending.summary
        run.completed_at = completed_at
        summaries = list(state.completed_run_summaries or [])
        if not any(item.get("story_run_id") == run.id for item in summaries if isinstance(item, dict)):
            summaries.append(
                {
                    "story_run_id": run.id,
                    "ending_id": ending.id,
                    "summary": ending.summary,
                    "completed_at": completed_at.isoformat(),
                }
            )
        state.completed_run_summaries = summaries
        state.active_story_run_id = None
        state.last_visited_at = completed_at

    def _state_domain(
        self,
        session: Session,
        model: PlayerStoryStateModel,
    ) -> PlayerStoryState:
        summaries: list[CompletedRunSummary] = []
        for raw in model.completed_run_summaries or []:
            if not isinstance(raw, dict):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "已完成轮次摘要不是对象。",
                )
            story_run_id = _required_text(raw.get("story_run_id"), "story_run_id")
            completed_at = _parse_datetime(raw.get("completed_at"))
            if completed_at is None:
                completed_run = session.get(StoryRunModel, story_run_id)
                completed_at = completed_run.completed_at if completed_run else None
            if completed_at is None:
                raise StoryStateError(
                    "invalid_persisted_state",
                    "已完成轮次摘要缺少完成时间。",
                )
            summaries.append(
                CompletedRunSummary(
                    story_run_id=story_run_id,
                    ending_id=_required_text(raw.get("ending_id"), "ending_id"),
                    summary=_required_text(raw.get("summary"), "summary"),
                    completed_at=completed_at,
                )
            )
        return PlayerStoryState(
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            player_role_id=model.player_role_id,
            active_story_run_id=model.active_story_run_id,
            visit_count=int(model.visit_count or 0),
            last_visited_at=model.last_visited_at,
            completed_run_summaries=tuple(summaries),
        )

    def _run_domain(self, session: Session, model: StoryRunModel) -> StoryRun:
        choices: list[RecordedChoice] = []
        for raw in model.key_choices or []:
            if isinstance(raw, str):
                event = session.scalar(
                    select(StoryEventModel).where(
                        StoryEventModel.story_run_id == model.id,
                        StoryEventModel.source_kind == "reviewed_choice",
                        StoryEventModel.source_id == raw,
                        StoryEventModel.event_type == "choice",
                    )
                )
                choices.append(
                    RecordedChoice(
                        choice_id=raw,
                        payload={},
                        source_event_id=event.id if event else "",
                        source_event_sequence=int(event.sequence) if event else 0,
                    )
                )
                continue
            if not isinstance(raw, dict):
                raise StoryStateError(
                    "invalid_persisted_state",
                    "关键选择记录不是受支持的结构。",
                )
            choices.append(
                RecordedChoice(
                    choice_id=_required_text(raw.get("choice_id"), "choice_id"),
                    payload=raw.get("payload") if isinstance(raw.get("payload"), dict) else {},
                    source_event_id=_required_text(
                        raw.get("source_event_id"),
                        "source_event_id",
                    ),
                    source_event_sequence=int(raw.get("source_event_sequence") or 0),
                )
            )
        try:
            status = StoryRunStatus(model.status)
        except ValueError as exc:
            raise StoryStateError(
                "invalid_persisted_state",
                "StoryRun 状态不在允许范围内。",
            ) from exc
        return StoryRun(
            id=model.id,
            player_id=model.player_id,
            story_world_id=model.story_world_id,
            content_version=model.content_version,
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

    def _relationship_domain(
        self,
        session: Session,
        model: CharacterRelationshipModel,
    ) -> CharacterRelationship:
        source_event = session.scalar(
            select(StoryEventModel)
            .where(
                StoryEventModel.story_run_id == model.story_run_id,
                StoryEventModel.character_id == model.character_id,
                StoryEventModel.event_type == "relationship_changed",
            )
            .order_by(StoryEventModel.sequence.desc())
            .limit(1)
        )
        return CharacterRelationship(
            story_run_id=model.story_run_id,
            character_id=model.character_id,
            affinity=float(model.affinity),
            stage=model.stage,
            last_change_reason=model.last_change_reason,
            flags=tuple(_string_list(model.flags, "relationship.flags")),
            last_source_event_id=source_event.id if source_event else None,
            last_source_event_sequence=int(source_event.sequence) if source_event else None,
        )

    @staticmethod
    def _event_domain(model: StoryEventModel) -> StoryEvent:
        payload = model.payload if isinstance(model.payload, dict) else {}
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
            rule_source=str(payload.get("rule_source") or model.source_kind),
            payload=payload,
            created_at=model.created_at,
        )

    @staticmethod
    def _message_domain(model: StoryMessageModel) -> StoryMessage:
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

    @staticmethod
    def _memory_domain(model: PrivateMemoryModel) -> PrivateMemory:
        return PrivateMemory(
            id=model.id,
            story_run_id=model.story_run_id,
            content=model.content,
            source_event_id=model.source_event_id,
            source_event_sequence=int(model.source_event_sequence),
            character_id=model.character_id,
            created_at=model.created_at,
        )

    def _published_world(self, story_world_id: str) -> StoryWorld:
        story_world_id = _required_text(story_world_id, "story_world_id")
        world = self.registry.get(story_world_id)
        if world is None or world.publication_status is not PublicationStatus.PUBLISHED:
            raise StoryStateError(
                "story_world_not_found",
                "没有找到已发布的故事世界。",
            )
        return world

    @staticmethod
    def _require_current_content(run: StoryRunModel, world: StoryWorld) -> None:
        if run.content_version != world.content_version:
            raise StoryStateError(
                "content_version_unavailable",
                "当前注册表不包含此轮次锁定的内容版本。",
            )

    @staticmethod
    def _character(world: StoryWorld, character_id: str) -> Character:
        character_id = _required_text(character_id, "character_id")
        character = next(
            (item for item in world.characters if item.id == character_id),
            None,
        )
        if character is None:
            raise StoryStateError(
                "character_not_found",
                "Character 不属于当前 StoryWorld。",
            )
        return character

    @staticmethod
    def _chapter(world: StoryWorld, chapter_id: str):
        chapter = next((item for item in world.chapters if item.id == chapter_id), None)
        if chapter is None:
            raise StoryStateError(
                "chapter_not_found",
                "章节不属于当前 StoryWorld。",
            )
        return chapter

    @staticmethod
    def _node(world: StoryWorld, node_id: str):
        for chapter in world.chapters:
            node = next((item for item in chapter.nodes if item.id == node_id), None)
            if node is not None:
                return node
        raise StoryStateError("node_not_found", "节点不属于当前 StoryWorld。")

    @classmethod
    def _node_in_chapter(
        cls,
        world: StoryWorld,
        chapter_id: str,
        node_id: str,
    ):
        chapter = cls._chapter(world, chapter_id)
        node = next((item for item in chapter.nodes if item.id == node_id), None)
        if node is None:
            raise StoryStateError(
                "node_not_found",
                "当前节点不属于 StoryRun 锁定的章节。",
            )
        return node

    @staticmethod
    def _chapter_for_node(world: StoryWorld, node_id: str):
        for chapter in world.chapters:
            node = next((item for item in chapter.nodes if item.id == node_id), None)
            if node is not None:
                return chapter, node
        raise StoryStateError("node_not_found", "节点不属于当前 StoryWorld。")

    @staticmethod
    def _ending(world: StoryWorld, ending_id: str):
        ending = next((item for item in world.endings if item.id == ending_id), None)
        if ending is None:
            raise StoryStateError("ending_not_found", "结局不属于当前 StoryWorld。")
        return ending

    @staticmethod
    def _choice(choices: Sequence[StoryChoice], choice_id: str) -> StoryChoice:
        choice = next((item for item in choices if item.id == choice_id), None)
        if choice is None:
            raise StoryStateError("choice_unavailable", "这个选择当前不可用。")
        return choice

    @staticmethod
    def _stage_for(character: Character, affinity: float):
        eligible = [
            stage
            for stage in character.relationship_rules.stages
            if affinity >= float(stage.minimum_affinity)
        ]
        if not eligible:
            raise StoryStateError(
                "relationship_stage_not_found",
                "关系值没有对应的审核关系阶段。",
            )
        return eligible[-1]

    @staticmethod
    def _clamp_affinity(character: Character, affinity: float) -> float:
        if not isfinite(affinity):
            raise StoryStateError(
                "invalid_affinity",
                "关系变化必须是有限数值。",
            )
        return max(
            float(character.relationship_rules.minimum_affinity),
            min(float(character.relationship_rules.maximum_affinity), affinity),
        )


def _required_text(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise StoryStateError("invalid_value", f"{field_name} 不能为空。")
    return value.strip()


def _string_list(value: object, field_name: str) -> list[str]:
    if not isinstance(value, list) or any(
        not isinstance(item, str) or not item for item in value
    ):
        raise StoryStateError(
            "invalid_persisted_state",
            f"{field_name} 必须是非空字符串列表。",
        )
    return list(value)


def _input_string_sequence(value: object, field_name: str) -> tuple[str, ...]:
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise StoryStateError(
            "invalid_value",
            f"{field_name} 必须是字符串列表。",
        )
    result: list[str] = []
    for item in value:
        result.append(_required_text(item, field_name))
    return tuple(result)


def _json_object(value: Mapping[str, object]) -> dict[str, Any]:
    frozen = freeze_json_mapping(value)
    return {key: _json_ready(item) for key, item in frozen.items()}


def _json_ready(value: object) -> Any:
    if isinstance(value, Mapping):
        return {key: _json_ready(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_json_ready(item) for item in value]
    return value


def _parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


__all__ = ["PlayerStoryStateStore"]
