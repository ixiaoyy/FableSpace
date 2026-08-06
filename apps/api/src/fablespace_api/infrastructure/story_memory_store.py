"""Persistence collaborator for memory outbox, revisions, sources, and recall."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..application.story_memory import (
    FORMATION_EVENT_LIMIT,
    FORMATION_L1_CANDIDATE_LIMIT,
    MEMORY_PIPELINE_VERSION,
    MemoryRecallRequest,
    RecallCandidate,
)
from ..domain.story_state import (
    MemoryEvidenceClass,
    MemoryKind,
    MemoryLayer,
    MemoryRecallScope,
    MemoryReviewStatus,
    PrivateMemory,
    StoryEvent,
    StoryStateError,
    freeze_json_mapping,
)
from .database import Database
from .story_state_models import (
    CharacterRelationshipModel,
    MemoryFormationJobModel,
    PrivateMemoryModel,
    PrivateMemorySourceModel,
    StoryEventModel,
    StoryMessageModel,
    StoryRunModel,
)

MEMORY_JOB_LEASE_SECONDS = 10 * 60
MEMORY_JOB_MAX_ATTEMPTS = 5
MEMORY_SOURCE_GRAPH_LIMIT = 128


@dataclass(frozen=True, slots=True)
class MemoryJobKey:
    """Stable primary key for one run/Character/pipeline materialization stream."""

    story_run_id: str
    character_id: str
    pipeline_version: str


@dataclass(frozen=True, slots=True)
class MemoryJobClaim:
    """Short-lived lease returned without holding a database transaction open."""

    key: MemoryJobKey
    lease_token: str
    lease_expires_at: datetime
    processed_event_sequence: int
    pending_event_sequence: int


@dataclass(frozen=True, slots=True)
class FormationBaseline:
    """Immutable worker input and CAS fields captured under one short transaction."""

    claim: MemoryJobClaim
    player_id: str
    story_world_id: str
    story_id: str
    story_run_id: str
    character_id: str
    player_role_id: str
    content_version: str
    predecessor_events: tuple[StoryEvent, ...]
    events: tuple[StoryEvent, ...]
    observed_pending_event_sequence: int
    through_event_sequence: int
    through_event_id: str
    baseline_hash: str


@dataclass(frozen=True, slots=True)
class MemorySourceWrite:
    """One immutable event or prior-memory edge for a new revision."""

    source_kind: str
    relation_kind: str
    source_story_id: str | None = None
    source_story_run_id: str | None = None
    source_event_id: str | None = None
    source_event_sequence: int | None = None
    source_memory_id: str | None = None


@dataclass(frozen=True, slots=True)
class MemoryRevisionWrite:
    """One validated revision plus its complete direct source edge set."""

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
    structured_payload: Mapping[str, object]
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
    sources: tuple[MemorySourceWrite, ...]
    relationship_baseline_hash: str | None = None


@dataclass(frozen=True, slots=True)
class RelationshipProjection:
    """Fixed L3 prompt projection plus a CAS hash of its persisted relationship source."""

    content: str
    baseline_hash: str


class StoryMemoryStore:
    """Keep all memory SQL behind owner-scoped, session-aware operations."""

    def __init__(self, database: Database, *, formation_enabled: bool) -> None:
        """Bind persistence and let the flag control claiming, never accepted-L0 enqueue."""

        self.database = database
        self.formation_enabled = formation_enabled

    def enqueue_after_events(
        self,
        session: Session,
        *,
        run: StoryRunModel,
        character_ids: Sequence[str],
        pending_event_sequence: int,
        pipeline_version: str = MEMORY_PIPELINE_VERSION,
    ) -> None:
        """Advance per-Character pending watermarks in the caller's accepted-L0 transaction."""

        if pending_event_sequence < 1:
            raise StoryStateError("invalid_memory_watermark", "记忆待处理水位必须为正数。")
        for character_id in tuple(dict.fromkeys(character_ids)):
            if not str(character_id).strip():
                raise StoryStateError("invalid_memory_character", "记忆任务 Character 无效。")
            key = (run.id, character_id, pipeline_version)
            job = session.get(MemoryFormationJobModel, key, with_for_update=True)
            now = datetime.utcnow()
            if job is None:
                session.add(
                    MemoryFormationJobModel(
                        player_id=run.player_id,
                        story_world_id=run.story_world_id,
                        story_id=run.story_id,
                        story_run_id=run.id,
                        character_id=character_id,
                        pipeline_version=pipeline_version,
                        processed_event_sequence=0,
                        pending_event_sequence=pending_event_sequence,
                        status="pending",
                        attempt_count=0,
                        lease_token=None,
                        lease_expires_at=None,
                        next_retry_at=None,
                        last_error_code=None,
                        created_at=now,
                        updated_at=now,
                    )
                )
                continue
            if (
                job.player_id != run.player_id
                or job.story_world_id != run.story_world_id
                or job.story_id != run.story_id
            ):
                raise StoryStateError("invalid_memory_job_owner", "记忆任务归属不一致。")
            job.pending_event_sequence = max(
                int(job.pending_event_sequence),
                pending_event_sequence,
            )
            if job.status == "idle" and job.processed_event_sequence < job.pending_event_sequence:
                job.status = "pending"
            job.updated_at = now

    def claim_next_job(self, *, now: datetime | None = None) -> MemoryJobClaim | None:
        """Claim one eligible job with SKIP LOCKED and return after commit."""

        if not self.formation_enabled:
            return None
        claimed_at = now or datetime.utcnow()
        with self.database.session_scope() as session:
            job = session.scalar(
                select(MemoryFormationJobModel)
                .where(
                    or_(
                        MemoryFormationJobModel.status == "pending",
                        and_(
                            MemoryFormationJobModel.status == "retryable_failed",
                            or_(
                                MemoryFormationJobModel.next_retry_at.is_(None),
                                MemoryFormationJobModel.next_retry_at <= claimed_at,
                            ),
                        ),
                        and_(
                            MemoryFormationJobModel.status == "running",
                            MemoryFormationJobModel.lease_expires_at <= claimed_at,
                        ),
                    )
                )
                .order_by(
                    MemoryFormationJobModel.updated_at,
                    MemoryFormationJobModel.story_run_id,
                    MemoryFormationJobModel.character_id,
                )
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if job is None:
                return None
            if int(job.attempt_count) >= MEMORY_JOB_MAX_ATTEMPTS:
                job.status = "blocked"
                job.lease_token = None
                job.lease_expires_at = None
                job.next_retry_at = None
                job.last_error_code = "attempt_limit"
                job.updated_at = claimed_at
                return None
            lease_token = uuid4().hex
            lease_expires_at = claimed_at + timedelta(seconds=MEMORY_JOB_LEASE_SECONDS)
            job.status = "running"
            job.attempt_count = int(job.attempt_count) + 1
            job.lease_token = lease_token
            job.lease_expires_at = lease_expires_at
            job.next_retry_at = None
            job.last_error_code = None
            job.updated_at = claimed_at
            return MemoryJobClaim(
                key=MemoryJobKey(
                    story_run_id=job.story_run_id,
                    character_id=job.character_id,
                    pipeline_version=job.pipeline_version,
                ),
                lease_token=lease_token,
                lease_expires_at=lease_expires_at,
                processed_event_sequence=int(job.processed_event_sequence),
                pending_event_sequence=int(job.pending_event_sequence),
            )

    def renew_lease(
        self,
        claim: MemoryJobClaim,
        *,
        now: datetime | None = None,
    ) -> MemoryJobClaim | None:
        """Extend a still-owned running lease, returning None after ownership changes."""

        renewed_at = now or datetime.utcnow()
        with self.database.session_scope() as session:
            job = session.get(MemoryFormationJobModel, _job_key(claim), with_for_update=True)
            if not _claim_matches(job, claim, renewed_at, allow_expired=False):
                return None
            expires_at = renewed_at + timedelta(seconds=MEMORY_JOB_LEASE_SECONDS)
            job.lease_expires_at = expires_at
            job.updated_at = renewed_at
            return MemoryJobClaim(
                key=claim.key,
                lease_token=claim.lease_token,
                lease_expires_at=expires_at,
                processed_event_sequence=int(job.processed_event_sequence),
                pending_event_sequence=int(job.pending_event_sequence),
            )

    def load_formation_baseline(self, claim: MemoryJobClaim) -> FormationBaseline | None:
        """Load at most 24 new events and two predecessors after validating lease ownership."""

        now = datetime.utcnow()
        with self.database.session_scope() as session:
            job = session.get(MemoryFormationJobModel, _job_key(claim))
            if not _claim_matches(job, claim, now, allow_expired=False):
                return None
            run = session.get(StoryRunModel, claim.key.story_run_id)
            if run is None or (
                run.player_id != job.player_id
                or run.story_world_id != job.story_world_id
                or run.story_id != job.story_id
            ):
                raise StoryStateError("invalid_memory_job_owner", "记忆任务父轮次无效。")
            upper = min(
                int(job.pending_event_sequence),
                int(job.processed_event_sequence) + FORMATION_EVENT_LIMIT,
            )
            event_models = tuple(
                session.scalars(
                    select(StoryEventModel)
                    .where(
                        StoryEventModel.story_run_id == run.id,
                        StoryEventModel.sequence > int(job.processed_event_sequence),
                        StoryEventModel.sequence <= upper,
                    )
                    .order_by(StoryEventModel.sequence)
                )
            )
            if not event_models or event_models[-1].sequence != upper:
                raise StoryStateError("memory_event_gap", "记忆任务事件水位不连续。")
            expected_sequences = tuple(
                range(int(job.processed_event_sequence) + 1, upper + 1)
            )
            if tuple(model.sequence for model in event_models) != expected_sequences:
                raise StoryStateError("memory_event_gap", "记忆任务事件序列存在缺口。")
            visible_event_models = tuple(
                model
                for model in event_models
                if self._event_visible(session, model, job.character_id)
            )
            deterministic_count = 0
            bounded_upper = upper
            for model in visible_event_models:
                if model.event_type not in {"choice", "relationship_changed"}:
                    continue
                deterministic_count += 1
                if deterministic_count > FORMATION_L1_CANDIDATE_LIMIT:
                    bounded_upper = int(model.sequence) - 1
                    break
            if bounded_upper < upper:
                upper = bounded_upper
                event_models = tuple(
                    model for model in event_models if int(model.sequence) <= upper
                )
                visible_event_models = tuple(
                    model
                    for model in visible_event_models
                    if int(model.sequence) <= upper
                )
            predecessor_models = tuple(
                reversed(
                    tuple(
                        session.scalars(
                            select(StoryEventModel)
                            .where(
                                StoryEventModel.story_run_id == run.id,
                                StoryEventModel.sequence
                                <= int(job.processed_event_sequence),
                            )
                            .order_by(StoryEventModel.sequence.desc())
                            .limit(2)
                        )
                    )
                )
            )
            through = _event_domain(event_models[-1])
            events = tuple(_event_domain(model) for model in visible_event_models)
            predecessors = tuple(
                _event_domain(model)
                for model in predecessor_models
                if self._event_visible(session, model, job.character_id)
            )
            baseline_value = {
                "story_run_id": run.id,
                "character_id": job.character_id,
                "player_role_id": run.player_role_id,
                "content_version": run.content_version,
                "processed": int(job.processed_event_sequence),
                "through_sequence": through.sequence,
                "through_id": through.id,
                "event_ids": [model.id for model in event_models],
                "pipeline_version": job.pipeline_version,
            }
            return FormationBaseline(
                claim=claim,
                player_id=run.player_id,
                story_world_id=run.story_world_id,
                story_id=run.story_id,
                story_run_id=run.id,
                character_id=job.character_id,
                player_role_id=run.player_role_id,
                content_version=run.content_version,
                predecessor_events=predecessors,
                events=events,
                observed_pending_event_sequence=int(job.pending_event_sequence),
                through_event_sequence=through.sequence,
                through_event_id=through.id,
                baseline_hash=_stable_hash(baseline_value),
            )

    def commit_formation(
        self,
        baseline: FormationBaseline,
        revisions: Sequence[MemoryRevisionWrite],
    ) -> bool:
        """Lock optional L3 relationship state, then CAS revisions and the watermark."""

        now = datetime.utcnow()
        with self.database.session_scope() as session:
            if any(
                revision.layer is MemoryLayer.L3
                and revision.review_status is MemoryReviewStatus.PROMOTED
                for revision in revisions
            ):
                # Story writes lock relationship before enqueueing this job; preserve that
                # order so the L3 relationship CAS cannot race or deadlock that path.
                session.get(
                    CharacterRelationshipModel,
                    (
                        baseline.player_id,
                        baseline.story_world_id,
                        baseline.character_id,
                    ),
                    with_for_update=True,
                )
            job = session.get(
                MemoryFormationJobModel,
                _job_key(baseline.claim),
                with_for_update=True,
            )
            if not _claim_matches(job, baseline.claim, now, allow_expired=False):
                return False
            run = session.get(StoryRunModel, baseline.story_run_id)
            if run is None or (
                run.player_id != baseline.player_id
                or run.story_world_id != baseline.story_world_id
                or run.story_id != baseline.story_id
                or run.player_role_id != baseline.player_role_id
                or run.content_version != baseline.content_version
                or int(job.processed_event_sequence)
                != baseline.claim.processed_event_sequence
                or not _pending_watermark_covers_baseline(
                    int(job.pending_event_sequence),
                    claimed_pending=baseline.claim.pending_event_sequence,
                    observed_pending=baseline.observed_pending_event_sequence,
                    through_sequence=baseline.through_event_sequence,
                )
            ):
                return False
            recalculated = self._baseline_hash(session, baseline, run, job)
            if recalculated != baseline.baseline_hash:
                return False
            for revision in revisions:
                self._append_revision(session, baseline, revision)
            job.processed_event_sequence = baseline.through_event_sequence
            job.status = (
                "idle"
                if int(job.pending_event_sequence) == baseline.through_event_sequence
                else "pending"
            )
            job.attempt_count = 0
            job.lease_token = None
            job.lease_expires_at = None
            job.next_retry_at = None
            job.last_error_code = None
            job.updated_at = now
            return True

    def load_effective_l1(
        self,
        baseline: FormationBaseline,
        *,
        limit: int = 24,
        review_statuses: tuple[MemoryReviewStatus, ...] = (
            MemoryReviewStatus.VALIDATED,
            MemoryReviewStatus.PROMOTED,
        ),
    ) -> tuple[PrivateMemory, ...]:
        """Return latest, source-complete L1 revisions for this exact run/Character/role."""

        bounded_limit = max(1, min(int(limit), 24))
        if not review_statuses or any(
            status not in {MemoryReviewStatus.VALIDATED, MemoryReviewStatus.PROMOTED}
            for status in review_statuses
        ):
            raise StoryStateError(
                "memory_review_status_invalid",
                "有效 L1 查询只能使用 validated/promoted 状态。",
            )
        request = MemoryRecallRequest(
            player_id=baseline.player_id,
            story_world_id=baseline.story_world_id,
            story_id=baseline.story_id,
            story_run_id=baseline.story_run_id,
            character_id=baseline.character_id,
            player_role_id=baseline.player_role_id,
            content_version=baseline.content_version,
            query_text="",
        )
        with self.database.session_scope() as session:
            latest = (
                select(
                    PrivateMemoryModel.logical_key.label("logical_key"),
                    func.max(PrivateMemoryModel.revision).label("revision"),
                )
                .where(
                    PrivateMemoryModel.player_id == baseline.player_id,
                    PrivateMemoryModel.story_world_id == baseline.story_world_id,
                    PrivateMemoryModel.character_id == baseline.character_id,
                    PrivateMemoryModel.origin_story_run_id == baseline.story_run_id,
                    PrivateMemoryModel.layer == MemoryLayer.L1.value,
                )
                .group_by(PrivateMemoryModel.logical_key)
                .subquery()
            )
            rows = tuple(
                session.scalars(
                    select(PrivateMemoryModel)
                    .join(
                        latest,
                        and_(
                            PrivateMemoryModel.logical_key == latest.c.logical_key,
                            PrivateMemoryModel.revision == latest.c.revision,
                        ),
                    )
                    .where(
                        PrivateMemoryModel.player_id == baseline.player_id,
                        PrivateMemoryModel.story_world_id == baseline.story_world_id,
                        PrivateMemoryModel.character_id == baseline.character_id,
                        PrivateMemoryModel.origin_story_run_id == baseline.story_run_id,
                        PrivateMemoryModel.story_content_version == baseline.content_version,
                        PrivateMemoryModel.role_scope_player_role_id
                        == baseline.player_role_id,
                        PrivateMemoryModel.review_status.in_(
                            tuple(status.value for status in review_statuses)
                        ),
                        PrivateMemoryModel.content.is_not(None),
                    )
                    .order_by(PrivateMemoryModel.created_at.desc())
                    .limit(bounded_limit)
                )
            )
            effective: list[PrivateMemory] = []
            for row in reversed(rows):
                complete, visible, _, _ = self._verify_source_graph(
                    session,
                    row,
                    request,
                    visited=set(),
                    depth=0,
                )
                if complete and visible:
                    effective.append(_memory_domain(row))
            return tuple(effective)

    def load_validated_l1_for_promotion(
        self,
        baseline: FormationBaseline,
        *,
        limit: int = 16,
    ) -> tuple[RecallCandidate, ...]:
        """Return source-complete latest validated L1 for the exact completed-run scope."""

        memories = self.load_effective_l1(
            baseline,
            limit=limit,
            review_statuses=(MemoryReviewStatus.VALIDATED,),
        )
        return tuple(
            RecallCandidate(
                memory=memory,
                source_chain_complete=True,
                source_visible_to_character=True,
            )
            for memory in memories
            if memory.review_status is MemoryReviewStatus.VALIDATED
        )

    def load_relationship_projection(
        self,
        baseline: FormationBaseline,
    ) -> RelationshipProjection:
        """Load one owner-scoped fixed relationship-stage projection without free prose."""

        with self.database.session_scope() as session:
            relationship = session.get(
                CharacterRelationshipModel,
                (
                    baseline.player_id,
                    baseline.story_world_id,
                    baseline.character_id,
                ),
            )
            if relationship is None or not str(relationship.stage or "").strip():
                raise StoryStateError(
                    "memory_relationship_projection_missing",
                    "角色印象缺少可信长期关系阶段。",
                )
            return RelationshipProjection(
                content=json.dumps(
                    {"stage": str(relationship.stage).strip()},
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ),
                baseline_hash=_relationship_baseline_hash(relationship),
            )

    def load_latest_revisions(
        self,
        baseline: FormationBaseline,
        logical_keys: Sequence[str],
    ) -> Mapping[str, PrivateMemory]:
        """Load latest revisions for bounded logical keys inside the claimed owner scope."""

        keys = tuple(dict.fromkeys(str(key) for key in logical_keys if str(key).strip()))
        if len(keys) > 16:
            raise StoryStateError("memory_logical_key_limit", "记忆逻辑键查询数量越界。")
        if not keys:
            return {}
        with self.database.session_scope() as session:
            revision_heads = (
                select(
                    PrivateMemoryModel.logical_key.label("logical_key"),
                    func.max(PrivateMemoryModel.revision).label("revision"),
                )
                .where(
                    PrivateMemoryModel.player_id == baseline.player_id,
                    PrivateMemoryModel.story_world_id == baseline.story_world_id,
                    PrivateMemoryModel.character_id == baseline.character_id,
                    PrivateMemoryModel.logical_key.in_(keys),
                )
                .group_by(PrivateMemoryModel.logical_key)
                .subquery()
            )
            rows = tuple(
                session.scalars(
                    select(PrivateMemoryModel)
                    .join(
                        revision_heads,
                        and_(
                            PrivateMemoryModel.logical_key
                            == revision_heads.c.logical_key,
                            PrivateMemoryModel.revision == revision_heads.c.revision,
                        ),
                    )
                    .where(
                        PrivateMemoryModel.player_id == baseline.player_id,
                        PrivateMemoryModel.story_world_id == baseline.story_world_id,
                        PrivateMemoryModel.character_id == baseline.character_id,
                        PrivateMemoryModel.logical_key.in_(keys),
                    )
                    .order_by(PrivateMemoryModel.logical_key)
                )
            )
            return {row.logical_key: _memory_domain(row) for row in rows}

    def mark_retryable(
        self,
        claim: MemoryJobClaim,
        *,
        error_code: str,
        now: datetime | None = None,
    ) -> bool:
        """Release an owned lease into bounded exponential retry or blocked state."""

        failed_at = now or datetime.utcnow()
        safe_code = _safe_error_code(error_code)
        with self.database.session_scope() as session:
            job = session.get(MemoryFormationJobModel, _job_key(claim), with_for_update=True)
            if not _claim_matches(job, claim, failed_at, allow_expired=True):
                return False
            job.lease_token = None
            job.lease_expires_at = None
            job.last_error_code = safe_code
            if int(job.attempt_count) >= MEMORY_JOB_MAX_ATTEMPTS:
                job.status = "blocked"
                job.next_retry_at = None
            else:
                job.status = "retryable_failed"
                delay_seconds = min(15 * (2 ** max(0, int(job.attempt_count) - 1)), 15 * 60)
                job.next_retry_at = failed_at + timedelta(seconds=delay_seconds)
            job.updated_at = failed_at
            return True

    def load_recall_candidates(
        self,
        request: MemoryRecallRequest,
        *,
        limit: int,
    ) -> Sequence[RecallCandidate]:
        """Return latest owner-scoped revisions with complete Character-visible sources."""

        bounded_limit = max(1, min(int(limit), 32))
        with self.database.session_scope() as session:
            latest = (
                select(
                    PrivateMemoryModel.logical_key.label("logical_key"),
                    func.max(PrivateMemoryModel.revision).label("revision"),
                )
                .where(
                    PrivateMemoryModel.player_id == request.player_id,
                    PrivateMemoryModel.story_world_id == request.story_world_id,
                    PrivateMemoryModel.character_id == request.character_id,
                )
                .group_by(PrivateMemoryModel.logical_key)
                .subquery()
            )
            rows = tuple(
                session.scalars(
                    select(PrivateMemoryModel)
                    .join(
                        latest,
                        and_(
                            PrivateMemoryModel.logical_key == latest.c.logical_key,
                            PrivateMemoryModel.revision == latest.c.revision,
                        ),
                    )
                    .where(
                        PrivateMemoryModel.player_id == request.player_id,
                        PrivateMemoryModel.story_world_id == request.story_world_id,
                        PrivateMemoryModel.character_id == request.character_id,
                        PrivateMemoryModel.review_status.in_(("validated", "promoted")),
                        PrivateMemoryModel.content.is_not(None),
                        or_(
                            PrivateMemoryModel.role_scope_player_role_id.is_(None),
                            PrivateMemoryModel.role_scope_player_role_id
                            == request.player_role_id,
                        ),
                        or_(
                            and_(
                                PrivateMemoryModel.review_status == "validated",
                                PrivateMemoryModel.recall_scope == "run",
                                PrivateMemoryModel.origin_story_run_id
                                == request.story_run_id,
                                PrivateMemoryModel.origin_story_id == request.story_id,
                                PrivateMemoryModel.story_content_version
                                == request.content_version,
                            ),
                            and_(
                                PrivateMemoryModel.review_status == "promoted",
                                PrivateMemoryModel.recall_scope.in_(("story", "world")),
                                or_(
                                    PrivateMemoryModel.recall_scope == "world",
                                    PrivateMemoryModel.origin_story_id == request.story_id,
                                ),
                            ),
                        ),
                    )
                    .order_by(
                        PrivateMemoryModel.salience.desc(),
                        PrivateMemoryModel.created_at.desc(),
                    )
                    .limit(bounded_limit)
                )
            )
            return tuple(
                self._recall_candidate(session, row, request)
                for row in rows
            )

    def _append_revision(
        self,
        session: Session,
        baseline: FormationBaseline,
        revision: MemoryRevisionWrite,
    ) -> None:
        """Append one idempotent revision and all validated sources in the current CAS transaction."""

        if (
            revision.player_id != baseline.player_id
            or revision.story_world_id != baseline.story_world_id
            or revision.origin_story_id != baseline.story_id
            or revision.origin_story_run_id != baseline.story_run_id
            or revision.character_id != baseline.character_id
            or revision.story_content_version != baseline.content_version
            or revision.pipeline_version != baseline.claim.key.pipeline_version
            or not revision.sources
            or any(
                source.source_memory_id == revision.id
                for source in revision.sources
                if source.source_memory_id is not None
            )
        ):
            raise StoryStateError("invalid_memory_revision_owner", "记忆 revision 归属无效。")
        predecessor_edges = tuple(
            source
            for source in revision.sources
            if (
                source.source_kind == "memory"
                and source.relation_kind
                in {"supersedes", "contradicts", "invalidates"}
            )
        )
        if revision.revision == 1 and predecessor_edges:
            raise StoryStateError(
                "memory_revision_source_invalid",
                "首个 revision 不得声明前序修订关系。",
            )
        if revision.review_status is MemoryReviewStatus.PROMOTED:
            self._validate_promoted_sources(session, baseline, revision)
        domain = PrivateMemory(
            id=revision.id,
            player_id=revision.player_id,
            story_world_id=revision.story_world_id,
            origin_story_id=revision.origin_story_id,
            origin_story_run_id=revision.origin_story_run_id,
            character_id=revision.character_id,
            role_scope_player_role_id=revision.role_scope_player_role_id,
            layer=revision.layer,
            memory_kind=revision.memory_kind,
            evidence_class=revision.evidence_class,
            content=revision.content,
            structured_payload=revision.structured_payload,
            salience=revision.salience,
            recall_scope=revision.recall_scope,
            review_status=revision.review_status,
            promotion_rule_id=revision.promotion_rule_id,
            story_content_version=revision.story_content_version,
            pipeline_version=revision.pipeline_version,
            logical_key=revision.logical_key,
            revision=revision.revision,
            idempotency_key=revision.idempotency_key,
            content_hash=revision.content_hash,
            created_at=datetime.utcnow(),
        )
        existing = session.scalar(
            select(PrivateMemoryModel).where(
                PrivateMemoryModel.player_id == revision.player_id,
                PrivateMemoryModel.story_world_id == revision.story_world_id,
                PrivateMemoryModel.character_id == revision.character_id,
                PrivateMemoryModel.idempotency_key == revision.idempotency_key,
            )
        )
        if existing is not None:
            if not self._existing_revision_matches(
                session,
                existing,
                revision,
            ):
                raise StoryStateError("memory_idempotency_conflict", "记忆幂等键发生冲突。")
            return
        session.add(
            PrivateMemoryModel(
                id=domain.id,
                player_id=domain.player_id,
                story_world_id=domain.story_world_id,
                origin_story_id=domain.origin_story_id,
                origin_story_run_id=domain.origin_story_run_id,
                character_id=domain.character_id,
                role_scope_player_role_id=domain.role_scope_player_role_id,
                layer=domain.layer.value,
                memory_kind=domain.memory_kind.value,
                evidence_class=domain.evidence_class.value,
                content=domain.content,
                structured_payload=_json_ready(domain.structured_payload),
                salience=domain.salience,
                recall_scope=domain.recall_scope.value,
                review_status=domain.review_status.value,
                promotion_rule_id=domain.promotion_rule_id,
                story_content_version=domain.story_content_version,
                pipeline_version=domain.pipeline_version,
                logical_key=domain.logical_key,
                revision=domain.revision,
                idempotency_key=domain.idempotency_key,
                content_hash=domain.content_hash,
                created_at=domain.created_at,
            )
        )
        session.flush()
        if revision.revision > 1:
            previous = session.scalar(
                select(PrivateMemoryModel).where(
                    PrivateMemoryModel.player_id == revision.player_id,
                    PrivateMemoryModel.story_world_id == revision.story_world_id,
                    PrivateMemoryModel.character_id == revision.character_id,
                    PrivateMemoryModel.logical_key == revision.logical_key,
                    PrivateMemoryModel.revision == revision.revision - 1,
                )
            )
            if (
                previous is None
                or len(predecessor_edges) != 1
                or predecessor_edges[0].source_memory_id != previous.id
            ):
                raise StoryStateError(
                    "memory_revision_source_missing",
                    "后续 revision 必须精确引用紧邻前序 revision。",
                )
        for ordinal, source in enumerate(revision.sources):
            self._validate_source(session, baseline, source)
            session.add(
                PrivateMemorySourceModel(
                    memory_id=domain.id,
                    player_id=domain.player_id,
                    story_world_id=domain.story_world_id,
                    character_id=domain.character_id,
                    ordinal=ordinal,
                    source_kind=source.source_kind,
                    source_story_id=source.source_story_id,
                    source_story_run_id=source.source_story_run_id,
                    source_event_id=source.source_event_id,
                    source_event_sequence=source.source_event_sequence,
                    source_memory_id=source.source_memory_id,
                    relation_kind=source.relation_kind,
                    created_at=domain.created_at,
                )
            )

    @staticmethod
    def _existing_revision_matches(
        session: Session,
        existing: PrivateMemoryModel,
        revision: MemoryRevisionWrite,
    ) -> bool:
        """Accept an idempotent replay only when the revision and every source edge match."""

        if (
            existing.id != revision.id
            or existing.player_id != revision.player_id
            or existing.story_world_id != revision.story_world_id
            or existing.origin_story_id != revision.origin_story_id
            or existing.origin_story_run_id != revision.origin_story_run_id
            or existing.character_id != revision.character_id
            or existing.role_scope_player_role_id
            != revision.role_scope_player_role_id
            or existing.layer != revision.layer.value
            or existing.memory_kind != revision.memory_kind.value
            or existing.evidence_class != revision.evidence_class.value
            or existing.content != revision.content
            or _json_ready(existing.structured_payload or {})
            != _json_ready(revision.structured_payload)
            or int(existing.salience) != revision.salience
            or existing.recall_scope != revision.recall_scope.value
            or existing.review_status != revision.review_status.value
            or existing.promotion_rule_id != revision.promotion_rule_id
            or existing.story_content_version != revision.story_content_version
            or existing.pipeline_version != revision.pipeline_version
            or existing.logical_key != revision.logical_key
            or int(existing.revision) != revision.revision
            or existing.idempotency_key != revision.idempotency_key
            or existing.content_hash != revision.content_hash
        ):
            return False
        sources = tuple(
            session.scalars(
                select(PrivateMemorySourceModel)
                .where(PrivateMemorySourceModel.memory_id == existing.id)
                .order_by(PrivateMemorySourceModel.ordinal)
            )
        )
        if len(sources) != len(revision.sources):
            return False
        for ordinal, (stored, expected) in enumerate(zip(sources, revision.sources)):
            if (
                int(stored.ordinal) != ordinal
                or stored.player_id != revision.player_id
                or stored.story_world_id != revision.story_world_id
                or stored.character_id != revision.character_id
                or stored.source_kind != expected.source_kind
                or stored.source_story_id != expected.source_story_id
                or stored.source_story_run_id != expected.source_story_run_id
                or stored.source_event_id != expected.source_event_id
                or stored.source_event_sequence != expected.source_event_sequence
                or stored.source_memory_id != expected.source_memory_id
                or stored.relation_kind != expected.relation_kind
            ):
                return False
        return True

    def _validate_source(
        self,
        session: Session,
        baseline: FormationBaseline,
        source: MemorySourceWrite,
    ) -> None:
        """Require every event or memory edge to remain inside the trusted Character scope."""

        if source.source_kind == "event" and source.relation_kind == "evidence":
            event = session.scalar(
                select(StoryEventModel).where(
                    StoryEventModel.story_run_id == source.source_story_run_id,
                    StoryEventModel.id == source.source_event_id,
                    StoryEventModel.sequence == source.source_event_sequence,
                )
            )
            if (
                event is None
                or source.source_story_id != baseline.story_id
                or source.source_story_run_id != baseline.story_run_id
                or event.sequence > baseline.through_event_sequence
                or not self._event_visible(session, event, baseline.character_id)
            ):
                raise StoryStateError("invalid_memory_source", "记忆事件来源无效或不可见。")
            return
        if source.source_kind == "memory" and source.relation_kind in {
            "derived_from",
            "supersedes",
            "contradicts",
            "invalidates",
        }:
            memory = session.get(PrivateMemoryModel, source.source_memory_id)
            if memory is None or (
                memory.player_id != baseline.player_id
                or memory.story_world_id != baseline.story_world_id
                or memory.character_id != baseline.character_id
            ):
                raise StoryStateError("invalid_memory_source", "前序记忆来源归属无效。")
            return
        raise StoryStateError("invalid_memory_source", "记忆来源边类型无效。")

    @staticmethod
    def _validate_promoted_sources(
        session: Session,
        baseline: FormationBaseline,
        revision: MemoryRevisionWrite,
    ) -> None:
        """Require promoted L1/L3 to preserve exact reviewed predecessor/source semantics."""

        memory_sources = tuple(
            source for source in revision.sources if source.source_kind == "memory"
        )
        if revision.layer is MemoryLayer.L1:
            if (
                len(revision.sources) != 1
                or len(memory_sources) != 1
                or memory_sources[0].relation_kind != "supersedes"
            ):
                raise StoryStateError(
                    "memory_promotion_source_invalid",
                    "晋升 L1 必须精确引用一个紧邻 validated revision。",
                )
            previous = session.get(
                PrivateMemoryModel,
                memory_sources[0].source_memory_id,
            )
            if previous is None or (
                previous.player_id != baseline.player_id
                or previous.story_world_id != baseline.story_world_id
                or previous.origin_story_id != baseline.story_id
                or previous.origin_story_run_id != baseline.story_run_id
                or previous.character_id != baseline.character_id
                or previous.role_scope_player_role_id != baseline.player_role_id
                or previous.story_content_version != baseline.content_version
                or previous.layer != MemoryLayer.L1.value
                or previous.memory_kind != revision.memory_kind.value
                or previous.evidence_class != revision.evidence_class.value
                or previous.review_status != MemoryReviewStatus.VALIDATED.value
                or previous.recall_scope != MemoryRecallScope.RUN.value
                or previous.promotion_rule_id is not None
                or previous.logical_key != revision.logical_key
                or int(previous.revision) + 1 != revision.revision
                or previous.content != revision.content
                or _json_ready(previous.structured_payload or {})
                != _json_ready(revision.structured_payload)
                or int(previous.salience) != revision.salience
                or previous.content_hash != revision.content_hash
            ):
                raise StoryStateError(
                    "memory_promotion_source_invalid",
                    "晋升 L1 未原样保留可信前序 revision。",
                )
            return
        if revision.layer is not MemoryLayer.L3 or not memory_sources or any(
            source.relation_kind != "derived_from" for source in memory_sources
        ) or len(memory_sources) != len(revision.sources):
            raise StoryStateError(
                "memory_promotion_source_invalid",
                "晋升 L3 必须仅引用 promoted L1 derived_from 来源。",
            )
        relationship = session.get(
            CharacterRelationshipModel,
            (baseline.player_id, baseline.story_world_id, baseline.character_id),
            with_for_update=True,
        )
        if (
            relationship is None
            or revision.relationship_baseline_hash is None
            or _relationship_baseline_hash(relationship)
            != revision.relationship_baseline_hash
        ):
            raise StoryStateError(
                "memory_relationship_baseline_changed",
                "角色印象使用的长期关系投影已经变化。",
            )
        for source in memory_sources:
            promoted_l1 = session.get(PrivateMemoryModel, source.source_memory_id)
            if promoted_l1 is None or (
                promoted_l1.player_id != baseline.player_id
                or promoted_l1.story_world_id != baseline.story_world_id
                or promoted_l1.origin_story_id != baseline.story_id
                or promoted_l1.origin_story_run_id != baseline.story_run_id
                or promoted_l1.character_id != baseline.character_id
                or promoted_l1.layer != MemoryLayer.L1.value
                or promoted_l1.review_status != MemoryReviewStatus.PROMOTED.value
                or promoted_l1.recall_scope != revision.recall_scope.value
                or promoted_l1.promotion_rule_id != revision.promotion_rule_id
                or promoted_l1.role_scope_player_role_id
                != revision.role_scope_player_role_id
            ):
                raise StoryStateError(
                    "memory_promotion_source_invalid",
                    "晋升 L3 来源不属于同一审核晋升链。",
                )

    def _recall_candidate(
        self,
        session: Session,
        model: PrivateMemoryModel,
        request: MemoryRecallRequest,
    ) -> RecallCandidate:
        """Project one row and verify its bounded source graph without leaking IDs to prompts."""

        complete, visible, started, ended = self._verify_source_graph(
            session,
            model,
            request,
            visited=set(),
            depth=0,
        )
        return RecallCandidate(
            memory=_memory_domain(model),
            source_chain_complete=complete,
            source_visible_to_character=visible,
            source_started_at=started,
            source_ended_at=ended,
        )

    def _verify_source_graph(
        self,
        session: Session,
        model: PrivateMemoryModel,
        request: MemoryRecallRequest,
        *,
        visited: set[str],
        depth: int,
    ) -> tuple[bool, bool, datetime | None, datetime | None]:
        """Traverse bounded immutable sources and reject cycles, gaps, or Character leakage."""

        if depth >= MEMORY_SOURCE_GRAPH_LIMIT or model.id in visited:
            return False, False, None, None
        if (
            model.player_id != request.player_id
            or model.story_world_id != request.story_world_id
            or model.character_id != request.character_id
        ):
            return False, False, None, None
        visited = set(visited)
        visited.add(model.id)
        sources = tuple(
            session.scalars(
                select(PrivateMemorySourceModel)
                .where(PrivateMemorySourceModel.memory_id == model.id)
                .order_by(PrivateMemorySourceModel.ordinal)
            )
        )
        if not sources or tuple(source.ordinal for source in sources) != tuple(range(len(sources))):
            return False, False, None, None
        event_times: list[datetime] = []
        for source in sources:
            if (
                source.player_id != request.player_id
                or source.story_world_id != request.story_world_id
                or source.character_id != request.character_id
            ):
                return False, False, None, None
            if source.source_kind == "event":
                event = session.scalar(
                    select(StoryEventModel).where(
                        StoryEventModel.story_run_id == source.source_story_run_id,
                        StoryEventModel.id == source.source_event_id,
                        StoryEventModel.sequence == source.source_event_sequence,
                    )
                )
                run = session.get(StoryRunModel, source.source_story_run_id)
                if (
                    event is None
                    or run is None
                    or run.player_id != request.player_id
                    or run.story_world_id != request.story_world_id
                    or run.story_id != source.source_story_id
                    or not self._event_visible(session, event, request.character_id)
                ):
                    return False, False, None, None
                event_times.append(event.created_at)
                continue
            source_memory = session.get(PrivateMemoryModel, source.source_memory_id)
            if source_memory is None:
                return False, False, None, None
            complete, visible, started, ended = self._verify_source_graph(
                session,
                source_memory,
                request,
                visited=visited,
                depth=depth + 1,
            )
            if not complete or not visible:
                return False, False, None, None
            if started is not None:
                event_times.append(started)
            if ended is not None:
                event_times.append(ended)
        return (
            True,
            True,
            min(event_times) if event_times else None,
            max(event_times) if event_times else None,
        )

    @staticmethod
    def _event_visible(
        session: Session,
        event: StoryEventModel,
        character_id: str,
    ) -> bool:
        """Resolve message visibility or require an explicit Character on deterministic events."""

        if event.event_type == "message":
            message = session.scalar(
                select(StoryMessageModel).where(
                    StoryMessageModel.story_run_id == event.story_run_id,
                    StoryMessageModel.source_event_id == event.id,
                    StoryMessageModel.source_event_sequence == event.sequence,
                )
            )
            return message is not None and character_id in tuple(
                message.visible_to_character_ids or ()
            )
        return event.character_id == character_id

    @staticmethod
    def _baseline_hash(
        session: Session,
        baseline: FormationBaseline,
        run: StoryRunModel,
        job: MemoryFormationJobModel,
    ) -> str:
        """Recompute the immutable formation CAS value from current persisted rows."""

        event_ids = tuple(
            session.execute(
                select(StoryEventModel.id)
                .where(
                    StoryEventModel.story_run_id == run.id,
                    StoryEventModel.sequence > int(job.processed_event_sequence),
                    StoryEventModel.sequence <= baseline.through_event_sequence,
                )
                .order_by(StoryEventModel.sequence)
            ).scalars()
        )
        return _stable_hash(
            {
                "story_run_id": run.id,
                "character_id": job.character_id,
                "player_role_id": run.player_role_id,
                "content_version": run.content_version,
                "processed": int(job.processed_event_sequence),
                "through_sequence": baseline.through_event_sequence,
                "through_id": baseline.through_event_id,
                "event_ids": list(event_ids),
                "pipeline_version": job.pipeline_version,
            }
        )


def _pending_watermark_covers_baseline(
    current_pending: int,
    *,
    claimed_pending: int,
    observed_pending: int,
    through_sequence: int,
) -> bool:
    """Accept monotonic pending growth while rejecting any loss below the loaded baseline."""

    return current_pending >= max(
        claimed_pending,
        observed_pending,
        through_sequence,
    )


def _claim_matches(
    job: MemoryFormationJobModel | None,
    claim: MemoryJobClaim,
    now: datetime,
    *,
    allow_expired: bool,
) -> bool:
    """Return whether a mutable job row is still owned by this exact lease."""

    return bool(
        job is not None
        and job.status == "running"
        and job.lease_token == claim.lease_token
        and (
            allow_expired
            or (job.lease_expires_at is not None and job.lease_expires_at > now)
        )
    )


def _job_key(claim: MemoryJobClaim) -> tuple[str, str, str]:
    """Return the SQLAlchemy composite primary-key tuple for one claim."""

    return (
        claim.key.story_run_id,
        claim.key.character_id,
        claim.key.pipeline_version,
    )


def _event_domain(model: StoryEventModel) -> StoryEvent:
    """Project one event row into an immutable worker-safe domain value."""

    payload = dict(model.payload or {})
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
        payload=freeze_json_mapping(payload),
        created_at=model.created_at,
    )


def _memory_domain(model: PrivateMemoryModel) -> PrivateMemory:
    """Project one immutable revision row while re-running domain validation."""

    return PrivateMemory(
        id=model.id,
        player_id=model.player_id,
        story_world_id=model.story_world_id,
        origin_story_id=model.origin_story_id,
        origin_story_run_id=model.origin_story_run_id,
        character_id=model.character_id,
        role_scope_player_role_id=model.role_scope_player_role_id,
        layer=MemoryLayer(model.layer),
        memory_kind=MemoryKind(model.memory_kind),
        evidence_class=MemoryEvidenceClass(model.evidence_class),
        content=model.content,
        structured_payload=freeze_json_mapping(dict(model.structured_payload or {})),
        salience=int(model.salience),
        recall_scope=MemoryRecallScope(model.recall_scope),
        review_status=MemoryReviewStatus(model.review_status),
        promotion_rule_id=model.promotion_rule_id,
        story_content_version=model.story_content_version,
        pipeline_version=model.pipeline_version,
        logical_key=model.logical_key,
        revision=int(model.revision),
        idempotency_key=model.idempotency_key,
        content_hash=model.content_hash,
        created_at=model.created_at,
    )


def _stable_hash(value: object) -> str:
    """Hash a JSON-safe baseline with stable ordering and no logged content."""

    import hashlib
    import json

    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _relationship_baseline_hash(model: CharacterRelationshipModel) -> str:
    """Hash fixed relationship state and source identity for L3 completion CAS."""

    return _stable_hash(
        {
            "player_id": model.player_id,
            "story_world_id": model.story_world_id,
            "character_id": model.character_id,
            "affinity": model.affinity,
            "stage": model.stage,
            "last_source_story_run_id": model.last_source_story_run_id,
            "last_source_event_id": model.last_source_event_id,
            "updated_at": (
                model.updated_at.isoformat()
                if isinstance(model.updated_at, datetime)
                else None
            ),
        }
    )


def _json_ready(value: object) -> Any:
    """Convert recursively immutable domain JSON into SQLAlchemy JSON values."""

    if isinstance(value, Mapping):
        return {str(key): _json_ready(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_json_ready(item) for item in value]
    return value


def _safe_error_code(value: str) -> str:
    """Accept only bounded identifier-like worker errors, never exception text."""

    normalized = str(value or "").strip()
    if (
        not normalized
        or len(normalized) > 64
        or any(not (character.islower() or character.isdigit() or character == "_") for character in normalized)
    ):
        return "formation_failed"
    return normalized


__all__ = [
    "FormationBaseline",
    "MEMORY_JOB_LEASE_SECONDS",
    "MEMORY_JOB_MAX_ATTEMPTS",
    "MemoryJobClaim",
    "MemoryJobKey",
    "MemoryRevisionWrite",
    "MemorySourceWrite",
    "StoryMemoryStore",
]
