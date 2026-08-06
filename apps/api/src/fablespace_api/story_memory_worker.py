"""Durable, default-off worker for bounded StoryMemory formation jobs."""

from __future__ import annotations

import argparse
import logging
import signal
import time
from collections.abc import Mapping
from dataclasses import replace
from datetime import datetime
from math import isfinite
from threading import Event
from uuid import NAMESPACE_URL, uuid5

from .app_factory import build_system_story_llm_config
from .application.story_memory import (
    FORMATION_OUTPUT_TOKEN_LIMIT,
    FORMATION_RAW_RESPONSE_BYTES_PER_TOKEN,
    FORMATION_UNMETERED_OUTPUT_BYTES_PER_TOKEN,
    FormationCandidate,
    MemoryFormationInput,
    MemoryPromotionBoundary,
    PRODUCTION_PROMOTION_RULE_REGISTRY,
    PromotionRule,
    RecallCandidate,
    StoryMemoryFormationService,
    StoryMemoryPolicy,
    StoryMemoryPromotionService,
    canonical_memory_hash,
)
from .content import PALACE_STORY_WORLD_ID
from .core.llm_clients import LLMConfig, LLMError, complete
from .domain.story_state import (
    MemoryKind,
    MemoryLayer,
    MemoryRecallScope,
    MemoryReviewStatus,
    PrivateMemory,
    StoryStateError,
)
from .infrastructure.database import Database
from .infrastructure.schema_revision import (
    SchemaStartupMode,
    inspect_schema_startup,
    resolve_schema_revision_marker_path,
)
from .infrastructure.settings import ApiSettings
from .infrastructure.storage import resolve_database_url
from .infrastructure.story_memory_store import (
    FormationBaseline,
    MemoryJobClaim,
    MemoryRevisionWrite,
    MemorySourceWrite,
    StoryMemoryStore,
)

logger = logging.getLogger(__name__)
_POLL_SECONDS = 2.0


class DeploymentStructuredMemoryModel:
    """Adapt the deployment StoryWorld model to the strict memory JSON protocol."""

    def __init__(self, config: LLMConfig) -> None:
        """Keep the already validated deployment config without creating another source."""

        self.config = config

    def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int,
        deadline_seconds: float,
    ) -> str:
        """Call once and reject empty, over-token, or late responses without logging content."""

        if max_tokens < 1 or max_tokens > FORMATION_OUTPUT_TOKEN_LIMIT:
            raise StoryStateError("memory_model_token_limit", "记忆模型输出预算无效。")
        if (
            isinstance(deadline_seconds, bool)
            or not isinstance(deadline_seconds, (int, float))
            or not isfinite(float(deadline_seconds))
            or not 0 < float(deadline_seconds) <= 120.0
        ):
            raise StoryStateError("memory_model_deadline", "记忆模型截止时间无效。")
        started = time.monotonic()
        deadline_monotonic = started + float(deadline_seconds)
        raw_response_byte_limit = (
            max_tokens * FORMATION_RAW_RESPONSE_BYTES_PER_TOKEN
        )
        try:
            response = complete(
                replace(self.config, max_tokens=max_tokens),
                messages,
                request_deadline_monotonic=deadline_monotonic,
                response_byte_limit=raw_response_byte_limit,
            )
        except LLMError as exc:
            code = (
                "memory_model_deadline"
                if "deadline_exhausted" in str(exc.diagnostic or "")
                else "memory_model_unavailable"
            )
            message = (
                "记忆形成模型超过截止时间。"
                if code == "memory_model_deadline"
                else "记忆形成模型不可用。"
            )
            raise StoryStateError(code, message) from exc
        except Exception as exc:
            raise StoryStateError("memory_model_unavailable", "记忆形成模型不可用。") from exc
        if time.monotonic() > deadline_monotonic:
            raise StoryStateError("memory_model_deadline", "记忆形成模型超过截止时间。")
        completion_tokens = _completion_token_usage(getattr(response, "usage", None))
        if completion_tokens is not None and completion_tokens > max_tokens:
            raise StoryStateError("memory_model_token_limit", "记忆模型输出超过 token 上限。")
        content = getattr(response, "content", None)
        if not isinstance(content, str) or not content.strip():
            raise StoryStateError("memory_model_empty", "记忆形成模型返回空结果。")
        content_byte_count = len(content.encode("utf-8"))
        if content_byte_count > raw_response_byte_limit:
            raise StoryStateError("memory_model_response_limit", "记忆模型原始结果过大。")
        if (
            completion_tokens is None
            and content_byte_count
            > max_tokens * FORMATION_UNMETERED_OUTPUT_BYTES_PER_TOKEN
        ):
            raise StoryStateError(
                "memory_model_unmetered_token_limit",
                "记忆模型缺少可核验 usage 且原始结果超过保守 token 上限。",
            )
        return content


def _completion_token_usage(usage: object) -> int | None:
    """Return provider-reported output tokens, rejecting malformed recognized counters."""

    if usage is None:
        return None
    if isinstance(usage, bool):
        raise StoryStateError("memory_model_usage_invalid", "记忆模型 usage 无效。")
    if isinstance(usage, int):
        if usage < 0:
            raise StoryStateError("memory_model_usage_invalid", "记忆模型 usage 无效。")
        return usage
    if not isinstance(usage, Mapping):
        return None
    counts: list[int] = []
    for key in (
        "completion_tokens",
        "output_tokens",
        "candidatesTokenCount",
        "eval_count",
    ):
        if key not in usage:
            continue
        value = usage[key]
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise StoryStateError("memory_model_usage_invalid", "记忆模型 usage 无效。")
        counts.append(value)
    return max(counts) if counts else None


class StoryMemoryWorker:
    """Claim one durable job at a time and commit only lease/CAS-valid revisions."""

    def __init__(
        self,
        store: StoryMemoryStore,
        formation: StoryMemoryFormationService,
    ) -> None:
        """Bind the Store and side-effect-free formation policy used by one process."""

        self.store = store
        self.formation = formation
        policy = getattr(formation, "policy", None)
        self.promotion = StoryMemoryPromotionService(
            policy
            if isinstance(policy, StoryMemoryPolicy)
            else StoryMemoryPolicy(PRODUCTION_PROMOTION_RULE_REGISTRY)
        )

    def process_one(self) -> bool:
        """Process at most one eligible job and report whether a claim was obtained."""

        claim = self.store.claim_next_job()
        if claim is None:
            return False
        started = time.monotonic()
        try:
            baseline = self.store.load_formation_baseline(claim)
            if baseline is None:
                logger.info("Memory formation status=stale_claim")
                return True
            revisions = self._form_revisions(baseline)
            if not self.store.commit_formation(baseline, revisions):
                self._mark_retryable(claim, "baseline_changed")
                logger.info("Memory formation status=retryable reason=baseline_changed")
                return True
        except StoryStateError as exc:
            self._mark_retryable(claim, exc.code)
            logger.warning("Memory formation status=retryable reason=%s", exc.code)
            return True
        except Exception as exc:
            self._mark_retryable(claim, "formation_failed")
            logger.warning(
                "Memory formation status=retryable reason=formation_failed class=%s",
                exc.__class__.__name__,
            )
            return True
        logger.info(
            "Memory formation status=committed revisions=%s elapsed_ms=%s",
            len(revisions),
            int((time.monotonic() - started) * 1_000),
        )
        return True

    def _mark_retryable(self, claim: MemoryJobClaim, error_code: str) -> None:
        """Best-effort release a claimed lease without exposing database failure details."""

        try:
            self.store.mark_retryable(claim, error_code=error_code)
        except Exception as exc:
            logger.warning(
                "Memory formation status=lease_release_failed class=%s",
                exc.__class__.__name__,
            )

    def _form_revisions(
        self,
        baseline: FormationBaseline,
    ) -> tuple[MemoryRevisionWrite, ...]:
        """Form bounded L1 and due L2 writes without mutating persistence state."""

        source = MemoryFormationInput(
            story_run_id=baseline.story_run_id,
            character_id=baseline.character_id,
            player_role_id=baseline.player_role_id,
            content_version=baseline.content_version,
            predecessor_events=baseline.predecessor_events,
            events=baseline.events,
            through_event_sequence=baseline.through_event_sequence,
            through_event_id=baseline.through_event_id,
            historical_character=(
                baseline.story_world_id == PALACE_STORY_WORLD_ID
            ),
        )
        l1_candidates = self.formation.form_l1(source)
        l1_writes = self._candidate_writes(
            baseline,
            l1_candidates,
            layer=MemoryLayer.L1,
            logical_slots=None,
        )

        revisions: list[MemoryRevisionWrite] = list(l1_writes)
        l2_due = (
            len(l1_writes) >= 4
            or any(
                event.event_type in {"choice", "run_completed"}
                for event in baseline.events
            )
        )
        if l2_due:
            if self.store.renew_lease(baseline.claim) is None:
                raise StoryStateError("memory_lease_lost", "记忆形成租约已经失效。")
            effective_by_key = {
                memory.logical_key: memory
                for memory in self.store.load_effective_l1(baseline)
            }
            now = datetime.utcnow()
            for write in l1_writes:
                effective_by_key[write.logical_key] = _revision_domain(write, now)
            l2_candidates = self.formation.form_l2(
                source=source,
                effective_l1=tuple(effective_by_key.values()),
            )
            revisions.extend(
                self._candidate_writes(
                    baseline,
                    l2_candidates,
                    layer=MemoryLayer.L2,
                    logical_slots=tuple(range(len(l2_candidates))),
                )
            )
        boundary = _reviewed_completion_boundary(baseline, source)
        if boundary is not None:
            revisions.extend(
                self._promotion_revisions(
                    baseline,
                    boundary=boundary,
                    l1_writes=l1_writes,
                )
            )
        return tuple(revisions)

    def _promotion_revisions(
        self,
        baseline: FormationBaseline,
        *,
        boundary: MemoryPromotionBoundary,
        l1_writes: tuple[MemoryRevisionWrite, ...],
    ) -> tuple[MemoryRevisionWrite, ...]:
        """Append reviewed L1 promotion and optional non-historical L3 at run completion."""

        rule = self.promotion.applicable_rule(boundary)
        if rule is None:
            return ()
        if self.store.renew_lease(baseline.claim) is None:
            raise StoryStateError("memory_lease_lost", "记忆晋升租约已经失效。")
        by_key = {
            candidate.memory.logical_key: candidate
            for candidate in self.store.load_validated_l1_for_promotion(baseline)
        }
        now = datetime.utcnow()
        for write in l1_writes:
            memory = _revision_domain(write, now)
            by_key[memory.logical_key] = RecallCandidate(
                memory=memory,
                source_chain_complete=True,
                source_visible_to_character=True,
            )
        validated = self.promotion.validate_l1_sources(
            boundary=boundary,
            rule_id=rule.id,
            candidates=tuple(
                candidate
                for candidate in by_key.values()
                if candidate.memory.memory_kind in rule.allowed_kinds
            ),
        )
        promoted_l1_writes = _promoted_l1_writes(
            baseline,
            rule=rule,
            validated_l1=validated,
        )
        if not promoted_l1_writes:
            return ()
        writes: list[MemoryRevisionWrite] = list(promoted_l1_writes)
        if (
            boundary.historical_character
            or MemoryKind.CHARACTER_IMPRESSION not in rule.allowed_kinds
        ):
            return tuple(writes)
        promoted_l1 = tuple(
            _revision_domain(write, now) for write in promoted_l1_writes
        )
        relationship = self.store.load_relationship_projection(baseline)
        l3_candidates = self.formation.form_l3(
            promoted_l1=promoted_l1,
            relationship_projection=relationship.content,
            promotion_rule_id=rule.id,
            historical_character=False,
        )
        writes.extend(
            _promoted_l3_writes(
                baseline,
                rule=rule,
                candidates=l3_candidates,
                promoted_l1=promoted_l1,
                relationship_baseline_hash=relationship.baseline_hash,
            )
        )
        return tuple(writes)

    def _candidate_writes(
        self,
        baseline: FormationBaseline,
        candidates: tuple[FormationCandidate, ...],
        *,
        layer: MemoryLayer,
        logical_slots: tuple[int, ...] | None,
    ) -> tuple[MemoryRevisionWrite, ...]:
        """Build stable keys, revisions, and immutable source edges for one layer batch."""

        event_index = {
            event.id: event
            for event in (*baseline.predecessor_events, *baseline.events)
        }
        logical_keys = tuple(
            _logical_key(
                baseline,
                candidate,
                layer=layer,
                slot=(logical_slots[index] if logical_slots is not None else None),
            )
            for index, candidate in enumerate(candidates)
        )
        previous_by_key = self.store.load_latest_revisions(baseline, logical_keys)
        writes: list[MemoryRevisionWrite] = []
        for ordinal, (candidate, logical_key) in enumerate(zip(candidates, logical_keys)):
            content_hash = canonical_memory_hash(candidate.content)
            previous = previous_by_key.get(logical_key)
            if (
                previous is not None
                and previous.content_hash == content_hash
                and previous.review_status is not MemoryReviewStatus.INVALIDATED
            ):
                continue
            idempotency_key = canonical_memory_hash(
                {
                    "player_id": baseline.player_id,
                    "story_world_id": baseline.story_world_id,
                    "character_id": baseline.character_id,
                    "role_scope": baseline.player_role_id,
                    "baseline_hash": baseline.baseline_hash,
                    "pipeline_version": baseline.claim.key.pipeline_version,
                    "layer": layer.value,
                    "ordinal": ordinal,
                    "logical_key": logical_key,
                    "event_sources": list(candidate.source_event_ids),
                    "memory_sources": list(candidate.source_memory_ids),
                }
            )
            sources: list[MemorySourceWrite] = []
            for event_id in candidate.source_event_ids:
                event = event_index.get(event_id)
                if event is None:
                    raise StoryStateError(
                        "invalid_memory_source",
                        "记忆候选引用了不属于当前可见批次的事件。",
                    )
                sources.append(
                    MemorySourceWrite(
                        source_kind="event",
                        relation_kind="evidence",
                        source_story_id=baseline.story_id,
                        source_story_run_id=baseline.story_run_id,
                        source_event_id=event.id,
                        source_event_sequence=event.sequence,
                    )
                )
            sources.extend(
                MemorySourceWrite(
                    source_kind="memory",
                    relation_kind="derived_from",
                    source_memory_id=memory_id,
                )
                for memory_id in candidate.source_memory_ids
            )
            if previous is not None:
                sources.append(
                    MemorySourceWrite(
                        source_kind="memory",
                        relation_kind="supersedes",
                        source_memory_id=previous.id,
                    )
                )
            if not sources:
                raise StoryStateError("invalid_memory_source", "记忆候选缺少不可变来源。")
            writes.append(
                MemoryRevisionWrite(
                    id=str(uuid5(NAMESPACE_URL, f"fablespace-memory:{idempotency_key}")),
                    player_id=baseline.player_id,
                    story_world_id=baseline.story_world_id,
                    origin_story_id=baseline.story_id,
                    origin_story_run_id=baseline.story_run_id,
                    character_id=baseline.character_id,
                    role_scope_player_role_id=baseline.player_role_id,
                    layer=layer,
                    memory_kind=candidate.kind,
                    evidence_class=candidate.evidence_class,
                    content=candidate.content,
                    structured_payload=candidate.structured_payload,
                    salience=candidate.salience,
                    recall_scope=MemoryRecallScope.RUN,
                    review_status=MemoryReviewStatus.VALIDATED,
                    promotion_rule_id=None,
                    story_content_version=baseline.content_version,
                    pipeline_version=baseline.claim.key.pipeline_version,
                    logical_key=logical_key,
                    revision=1 if previous is None else previous.revision + 1,
                    idempotency_key=idempotency_key,
                    content_hash=content_hash,
                    sources=tuple(sources),
                )
            )
        return tuple(writes)


def _reviewed_completion_boundary(
    baseline: FormationBaseline,
    source: MemoryFormationInput,
) -> MemoryPromotionBoundary | None:
    """Return only an exact terminal reviewed-ending event as a promotion boundary."""

    completed = tuple(event for event in baseline.events if event.event_type == "run_completed")
    if not completed:
        return None
    event = completed[-1]
    ending_id = event.payload.get("ending_id")
    if (
        len(completed) != 1
        or event.id != baseline.through_event_id
        or event.sequence != baseline.through_event_sequence
    ):
        raise StoryStateError(
            "memory_promotion_boundary_invalid",
            "记忆晋升只允许唯一且位于批次末尾的 run_completed 事件。",
        )
    if event.rule_source == "story_run.start_terminal":
        if (
            event.character_id != baseline.character_id
            or event.role != "system"
            or event.source_kind != "authored"
            or event.payload.get("completion_kind") != "reviewed_ending"
            or not isinstance(ending_id, str)
            or not ending_id.strip()
        ):
            raise StoryStateError(
                "memory_promotion_boundary_invalid",
                "起始终局事件不属于当前可信 Character 范围。",
            )
        return None
    if event.rule_source == "story_run.restart_stale":
        if (
            event.character_id is not None
            or event.role != "system"
            or event.source_kind != "authored"
            or event.payload.get("completion_kind") != "stale_restart"
            or ending_id is not None
        ):
            raise StoryStateError(
                "memory_promotion_boundary_invalid",
                "过期轮次结束事件不是可信的非晋升生命周期边界。",
            )
        return None
    if (
        event.rule_source != "story_run.complete"
        or event.character_id != baseline.character_id
        or event.role != "system"
        or event.source_kind != "authored"
        or event.payload.get("completion_kind") != "reviewed_ending"
        or not isinstance(ending_id, str)
        or not ending_id.strip()
    ):
        raise StoryStateError(
            "memory_promotion_boundary_invalid",
            "记忆晋升只允许精确的审核终局 run_completed 事件。",
        )
    return MemoryPromotionBoundary(
        player_id=baseline.player_id,
        story_world_id=baseline.story_world_id,
        story_id=baseline.story_id,
        story_run_id=baseline.story_run_id,
        character_id=baseline.character_id,
        player_role_id=baseline.player_role_id,
        content_version=baseline.content_version,
        pipeline_version=baseline.claim.key.pipeline_version,
        ending_id=ending_id,
        historical_character=source.historical_character,
    )


def _promoted_l1_writes(
    baseline: FormationBaseline,
    *,
    rule: PromotionRule,
    validated_l1: tuple[PrivateMemory, ...],
) -> tuple[MemoryRevisionWrite, ...]:
    """Copy validated L1 exactly into append-only promoted revisions."""

    writes: list[MemoryRevisionWrite] = []
    for memory in validated_l1:
        idempotency_key = canonical_memory_hash(
            {
                "operation": "promote_l1",
                "rule_id": rule.id,
                "source_memory_id": memory.id,
                "source_revision": memory.revision,
                "pipeline_version": baseline.claim.key.pipeline_version,
            }
        )
        writes.append(
            MemoryRevisionWrite(
                id=str(uuid5(NAMESPACE_URL, f"fablespace-memory:{idempotency_key}")),
                player_id=memory.player_id,
                story_world_id=memory.story_world_id,
                origin_story_id=memory.origin_story_id,
                origin_story_run_id=memory.origin_story_run_id,
                character_id=memory.character_id,
                role_scope_player_role_id=(
                    None if rule.allow_role_neutral else memory.role_scope_player_role_id
                ),
                layer=MemoryLayer.L1,
                memory_kind=memory.memory_kind,
                evidence_class=memory.evidence_class,
                content=memory.content,
                structured_payload=memory.structured_payload,
                salience=memory.salience,
                recall_scope=rule.recall_scope,
                review_status=MemoryReviewStatus.PROMOTED,
                promotion_rule_id=rule.id,
                story_content_version=memory.story_content_version,
                pipeline_version=memory.pipeline_version,
                logical_key=memory.logical_key,
                revision=memory.revision + 1,
                idempotency_key=idempotency_key,
                content_hash=memory.content_hash,
                sources=(
                    MemorySourceWrite(
                        source_kind="memory",
                        relation_kind="supersedes",
                        source_memory_id=memory.id,
                    ),
                ),
            )
        )
    return tuple(writes)


def _promoted_l3_writes(
    baseline: FormationBaseline,
    *,
    rule: PromotionRule,
    candidates: tuple[FormationCandidate, ...],
    promoted_l1: tuple[PrivateMemory, ...],
    relationship_baseline_hash: str,
) -> tuple[MemoryRevisionWrite, ...]:
    """Build promoted L3 writes whose only sources are selected promoted L1 edges."""

    source_by_id = {memory.id: memory for memory in promoted_l1}
    writes: list[MemoryRevisionWrite] = []
    for candidate in candidates:
        selected = tuple(source_by_id.get(memory_id) for memory_id in candidate.source_memory_ids)
        if (
            candidate.kind is not MemoryKind.CHARACTER_IMPRESSION
            or not selected
            or any(memory is None for memory in selected)
        ):
            raise StoryStateError("memory_promotion_source_invalid", "L3 来源不属于本批晋升 L1。")
        selected_memories = tuple(memory for memory in selected if memory is not None)
        role_scopes = {memory.role_scope_player_role_id for memory in selected_memories}
        if len(role_scopes) != 1:
            raise StoryStateError("memory_promotion_source_invalid", "L3 来源 PlayerRole 范围不一致。")
        logical_key = canonical_memory_hash(
            {
                "layer": MemoryLayer.L3.value,
                "player_id": baseline.player_id,
                "story_world_id": baseline.story_world_id,
                "character_id": baseline.character_id,
                "role_scope": next(iter(role_scopes)),
                "rule_id": rule.id,
                "source_memory_ids": sorted(candidate.source_memory_ids),
            }
        )
        idempotency_key = canonical_memory_hash(
            {
                "operation": "form_l3",
                "logical_key": logical_key,
                "content_hash": canonical_memory_hash(candidate.content),
                "pipeline_version": baseline.claim.key.pipeline_version,
            }
        )
        writes.append(
            MemoryRevisionWrite(
                id=str(uuid5(NAMESPACE_URL, f"fablespace-memory:{idempotency_key}")),
                player_id=baseline.player_id,
                story_world_id=baseline.story_world_id,
                origin_story_id=baseline.story_id,
                origin_story_run_id=baseline.story_run_id,
                character_id=baseline.character_id,
                role_scope_player_role_id=next(iter(role_scopes)),
                layer=MemoryLayer.L3,
                memory_kind=candidate.kind,
                evidence_class=candidate.evidence_class,
                content=candidate.content,
                structured_payload=candidate.structured_payload,
                salience=candidate.salience,
                recall_scope=rule.recall_scope,
                review_status=MemoryReviewStatus.PROMOTED,
                promotion_rule_id=rule.id,
                story_content_version=baseline.content_version,
                pipeline_version=baseline.claim.key.pipeline_version,
                logical_key=logical_key,
                revision=1,
                idempotency_key=idempotency_key,
                content_hash=canonical_memory_hash(candidate.content),
                sources=tuple(
                    MemorySourceWrite(
                        source_kind="memory",
                        relation_kind="derived_from",
                        source_memory_id=memory.id,
                    )
                    for memory in selected_memories
                ),
                relationship_baseline_hash=relationship_baseline_hash,
            )
        )
    return tuple(writes)


def _logical_key(
    baseline: FormationBaseline,
    candidate: FormationCandidate,
    *,
    layer: MemoryLayer,
    slot: int | None,
) -> str:
    """Build one continuity-bound logical key without semantic similarity guesses."""

    semantic = (
        {"slot": slot, "kind": candidate.kind.value}
        if layer is MemoryLayer.L2
        else {
            "kind": candidate.kind.value,
            "evidence_class": candidate.evidence_class.value,
            "source_event_ids": sorted(candidate.source_event_ids),
            "source_memory_ids": sorted(candidate.source_memory_ids),
        }
    )
    return canonical_memory_hash(
        {
            "layer": layer.value,
            "story_run_id": baseline.story_run_id,
            "character_id": baseline.character_id,
            "role_scope": baseline.player_role_id,
            "semantic": semantic,
        }
    )


def _revision_domain(write: MemoryRevisionWrite, created_at: datetime) -> PrivateMemory:
    """Project an uncommitted L1 write for same-batch L2 aggregation validation."""

    return PrivateMemory(
        id=write.id,
        player_id=write.player_id,
        story_world_id=write.story_world_id,
        origin_story_id=write.origin_story_id,
        origin_story_run_id=write.origin_story_run_id,
        character_id=write.character_id,
        role_scope_player_role_id=write.role_scope_player_role_id,
        layer=write.layer,
        memory_kind=write.memory_kind,
        evidence_class=write.evidence_class,
        content=write.content,
        structured_payload=write.structured_payload,
        salience=write.salience,
        recall_scope=write.recall_scope,
        review_status=write.review_status,
        promotion_rule_id=write.promotion_rule_id,
        story_content_version=write.story_content_version,
        pipeline_version=write.pipeline_version,
        logical_key=write.logical_key,
        revision=write.revision,
        idempotency_key=write.idempotency_key,
        content_hash=write.content_hash,
        created_at=created_at,
    )


def _build_worker(settings: ApiSettings) -> tuple[StoryMemoryWorker, Database]:
    """Validate the existing target schema and assemble the enabled worker runtime."""

    model_config = build_system_story_llm_config(settings)
    if model_config is None:
        raise StoryStateError("memory_model_unavailable", "记忆形成模型配置不可用。")
    database = Database(
        url=resolve_database_url(settings),
        pool_size=settings.mysql_pool_size,
        max_overflow=settings.mysql_max_overflow,
        echo=settings.mysql_echo,
    )
    marker_path = resolve_schema_revision_marker_path(
        output_root=settings.output_root,
        configured_path=settings.schema_revision_marker_path,
    )
    try:
        startup = inspect_schema_startup(
            database.engine,
            marker_path=marker_path,
            allow_local_bootstrap=False,
        )
    except Exception:
        database.dispose()
        raise
    if startup.mode is not SchemaStartupMode.VALIDATED_EXISTING:
        database.dispose()
        raise StoryStateError("schema_bootstrap_required", "记忆 worker 只接受既有目标 Schema。")
    store = StoryMemoryStore(database, formation_enabled=True)
    formation = StoryMemoryFormationService(
        DeploymentStructuredMemoryModel(model_config),
        policy=StoryMemoryPolicy(PRODUCTION_PROMOTION_RULE_REGISTRY),
    )
    return StoryMemoryWorker(store, formation), database


def _parse_args() -> argparse.Namespace:
    """Parse the closed once-or-poll worker command surface."""

    parser = argparse.ArgumentParser(description="FableSpace StoryMemory worker")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true", help="process at most one job")
    mode.add_argument("--poll", action="store_true", help="poll until stopped")
    return parser.parse_args()


def main() -> int:
    """Run the default-off worker and stop claiming promptly on TERM/INT."""

    args = _parse_args()
    settings = ApiSettings()
    stop = Event()

    def request_stop(_signum, _frame) -> None:
        """Set the cooperative stop flag without logging signal payloads."""

        stop.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    if not settings.memory_formation_enabled:
        logger.info("Memory formation status=disabled")
        if args.poll:
            while not stop.is_set():
                stop.wait(30.0)
        return 0
    try:
        worker, database = _build_worker(settings)
    except StoryStateError as exc:
        logger.error("Memory worker startup failed reason=%s", exc.code)
        return 2
    except Exception as exc:
        logger.error("Memory worker startup failed class=%s", exc.__class__.__name__)
        return 2
    try:
        if args.once:
            try:
                worker.process_one()
            except Exception as exc:
                logger.error("Memory worker cycle failed class=%s", exc.__class__.__name__)
                return 2
            else:
                return 0
        while not stop.is_set():
            try:
                claimed = worker.process_one()
            except Exception as exc:
                logger.warning("Memory worker cycle failed class=%s", exc.__class__.__name__)
                stop.wait(_POLL_SECONDS)
                continue
            if not claimed:
                stop.wait(_POLL_SECONDS)
        return 0
    finally:
        database.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(main())
