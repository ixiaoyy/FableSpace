"""SQLAlchemy models for private StoryWorld runtime state."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    CHAR,
    CheckConstraint,
    Column,
    Computed,
    DateTime,
    Float,
    ForeignKeyConstraint,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.mysql import DOUBLE, TINYINT

from .database import Base


class PlayerStoryStateModel(Base):
    __tablename__ = "player_story_states"

    player_id = Column(String(64), primary_key=True)
    story_world_id = Column(String(128), primary_key=True)
    visit_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    last_visited_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class StoryRunModel(Base):
    __tablename__ = "story_runs"

    id = Column(String(36), primary_key=True)
    player_id = Column(String(64), nullable=False)
    story_world_id = Column(String(128), nullable=False)
    story_id = Column(String(128), nullable=False)
    content_version = Column(String(128), nullable=False)
    player_role_id = Column(String(128), nullable=False)
    status = Column(String(16), nullable=False)
    active_slot = Column(
        SmallInteger().with_variant(TINYINT(), "mysql"),
        Computed("CASE WHEN status = 'active' THEN 1 ELSE NULL END", persisted=True),
        nullable=True,
    )
    current_chapter_id = Column(String(128), nullable=False)
    current_node_id = Column(String(128), nullable=False)
    key_choices = Column(JSON, nullable=False, default=list)
    story_flags = Column(JSON, nullable=False, default=list)
    ending_id = Column(String(128), nullable=True)
    ending_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id"],
            ["player_story_states.player_id", "player_story_states.story_world_id"],
            name="fk_story_runs_state",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "status IN ('active', 'completed')",
            name="ck_story_runs_status",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "story_id",
            "active_slot",
            name="uq_story_runs_player_world_story_active",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "story_id",
            "id",
            name="uq_story_runs_owner_story_id",
        ),
        Index(
            "idx_story_runs_player_world_story_status",
            "player_id",
            "story_world_id",
            "story_id",
            "status",
            "completed_at",
        ),
    )


class PlayerStoryProgressModel(Base):
    __tablename__ = "player_story_progress"

    player_id = Column(String(64), primary_key=True)
    story_world_id = Column(String(128), primary_key=True)
    story_id = Column(String(128), primary_key=True)
    active_story_run_id = Column(String(36), nullable=True)
    last_visited_at = Column(DateTime, nullable=True)
    completed_run_summaries = Column(JSON, nullable=False, default=list)

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id"],
            ["player_story_states.player_id", "player_story_states.story_world_id"],
            name="fk_player_story_progress_state",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["active_story_run_id"],
            ["story_runs.id"],
            name="fk_player_story_progress_active_run",
            ondelete="SET NULL",
        ),
    )


class StoryEventModel(Base):
    __tablename__ = "story_events"

    id = Column(String(36), primary_key=True)
    story_run_id = Column(String(36), nullable=False)
    sequence = Column(Integer, nullable=False)
    event_type = Column(String(32), nullable=False)
    character_id = Column(String(128), nullable=True)
    role = Column(String(16), nullable=True)
    content = Column(Text, nullable=False)
    source_kind = Column(String(32), nullable=False)
    source_id = Column(String(128), nullable=True)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["story_run_id"],
            ["story_runs.id"],
            name="fk_story_events_story_run",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "story_run_id",
            "sequence",
            name="uq_story_events_run_sequence",
        ),
        UniqueConstraint(
            "story_run_id",
            "id",
            name="uq_story_events_run_id",
        ),
        UniqueConstraint(
            "story_run_id",
            "id",
            "sequence",
            name="uq_story_events_run_id_sequence",
        ),
        Index(
            "idx_story_events_run_source",
            "story_run_id",
            "source_kind",
            "source_id",
        ),
    )


class CharacterRelationshipModel(Base):
    __tablename__ = "character_relationships"

    player_id = Column(String(64), primary_key=True)
    story_world_id = Column(String(128), primary_key=True)
    character_id = Column(String(128), primary_key=True)
    affinity = Column(Float().with_variant(DOUBLE(), "mysql"), nullable=False)
    stage = Column(String(64), nullable=False)
    last_change_reason = Column(Text, nullable=False, default="")
    flags = Column(JSON, nullable=False, default=list)
    last_source_story_run_id = Column(String(36), nullable=True)
    last_source_event_id = Column(String(36), nullable=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id"],
            ["player_story_states.player_id", "player_story_states.story_world_id"],
            name="fk_character_relationships_state",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["last_source_story_run_id", "last_source_event_id"],
            ["story_events.story_run_id", "story_events.id"],
            name="fk_character_relationships_source_event",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "(last_source_story_run_id IS NULL AND last_source_event_id IS NULL) "
            "OR (last_source_story_run_id IS NOT NULL "
            "AND last_source_event_id IS NOT NULL)",
            name="ck_character_relationships_source_pair",
        ),
    )


class StoryMessageModel(Base):
    __tablename__ = "story_messages"

    id = Column(String(36), primary_key=True)
    story_run_id = Column(String(36), nullable=False)
    sequence = Column(Integer, nullable=False)
    role = Column(String(16), nullable=False)
    character_id = Column(String(128), nullable=True)
    visible_to_character_ids = Column(JSON, nullable=False, default=list)
    content = Column(Text, nullable=False)
    source_event_id = Column(String(36), nullable=False)
    source_event_sequence = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["story_run_id"],
            ["story_runs.id"],
            name="fk_story_messages_story_run",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["source_event_id"],
            ["story_events.id"],
            name="fk_story_messages_source_event",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "role IN ('player', 'character', 'system')",
            name="ck_story_messages_role",
        ),
        Index(
            "uq_story_messages_run_sequence",
            "story_run_id",
            "sequence",
            unique=True,
        ),
        Index(
            "idx_story_messages_run_event",
            "story_run_id",
            "source_event_id",
        ),
    )


class PrivateMemoryModel(Base):
    __tablename__ = "private_memories"

    id = Column(String(36), primary_key=True)
    player_id = Column(String(64), nullable=False)
    story_world_id = Column(String(128), nullable=False)
    origin_story_id = Column(String(128), nullable=False)
    origin_story_run_id = Column(String(36), nullable=False)
    character_id = Column(String(128), nullable=False)
    role_scope_player_role_id = Column(String(128), nullable=True)
    layer = Column(String(2), nullable=False)
    memory_kind = Column(String(32), nullable=False)
    evidence_class = Column(String(32), nullable=False)
    content = Column(Text, nullable=True)
    structured_payload = Column(JSON, nullable=False, default=dict)
    salience = Column(SmallInteger, nullable=False)
    recall_scope = Column(String(16), nullable=False)
    review_status = Column(String(16), nullable=False)
    promotion_rule_id = Column(String(128), nullable=True)
    story_content_version = Column(String(128), nullable=False)
    pipeline_version = Column(String(64), nullable=False)
    logical_key = Column(CHAR(64), nullable=False)
    revision = Column(Integer, nullable=False)
    idempotency_key = Column(CHAR(64), nullable=False)
    content_hash = Column(CHAR(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id"],
            ["player_story_states.player_id", "player_story_states.story_world_id"],
            name="fk_private_memories_state",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            [
                "player_id",
                "story_world_id",
                "origin_story_id",
                "origin_story_run_id",
            ],
            [
                "story_runs.player_id",
                "story_runs.story_world_id",
                "story_runs.story_id",
                "story_runs.id",
            ],
            name="fk_private_memories_origin_run",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "character_id",
            "idempotency_key",
            name="uq_private_memories_idempotency",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "character_id",
            "logical_key",
            "revision",
            name="uq_private_memories_logical_revision",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "id",
            name="uq_private_memories_owner_id",
        ),
        UniqueConstraint(
            "player_id",
            "story_world_id",
            "character_id",
            "id",
            name="uq_private_memories_owner_character_id",
        ),
        CheckConstraint(
            "layer IN ('l1', 'l2', 'l3')",
            name="ck_private_memories_layer",
        ),
        CheckConstraint(
            "memory_kind IN ('interaction_fact', 'player_claim', "
            "'player_commitment', 'reviewed_choice', 'relationship_change', "
            "'scene_summary', 'character_impression')",
            name="ck_private_memories_kind",
        ),
        CheckConstraint(
            "evidence_class IN ('reviewed_event', 'observed_dialogue', "
            "'player_claim', 'inferred', 'needs_verification')",
            name="ck_private_memories_evidence_class",
        ),
        CheckConstraint(
            "recall_scope IN ('none', 'run', 'story', 'world')",
            name="ck_private_memories_recall_scope",
        ),
        CheckConstraint(
            "review_status IN ('validated', 'promoted', 'invalidated')",
            name="ck_private_memories_review_status",
        ),
        CheckConstraint(
            "(layer = 'l1' AND memory_kind IN ('interaction_fact', "
            "'player_claim', 'player_commitment', 'reviewed_choice', "
            "'relationship_change')) OR "
            "(layer = 'l2' AND memory_kind = 'scene_summary') OR "
            "(layer = 'l3' AND memory_kind = 'character_impression')",
            name="ck_private_memories_layer_kind",
        ),
        CheckConstraint(
            "salience BETWEEN 0 AND 100",
            name="ck_private_memories_salience",
        ),
        CheckConstraint(
            "revision >= 1",
            name="ck_private_memories_revision",
        ),
        CheckConstraint(
            "layer <> 'l2' OR review_status = 'invalidated' "
            "OR recall_scope = 'run'",
            name="ck_private_memories_l2_scope",
        ),
        CheckConstraint(
            "review_status <> 'validated' OR "
            "(layer IN ('l1', 'l2') AND recall_scope = 'run')",
            name="ck_private_memories_validated_scope",
        ),
        CheckConstraint(
            "review_status <> 'promoted' OR "
            "(layer IN ('l1', 'l3') AND recall_scope IN ('story', 'world') "
            "AND promotion_rule_id IS NOT NULL "
            "AND evidence_class <> 'needs_verification')",
            name="ck_private_memories_promoted_scope",
        ),
        CheckConstraint(
            "layer <> 'l3' OR review_status IN ('promoted', 'invalidated')",
            name="ck_private_memories_l3_status",
        ),
        CheckConstraint(
            "(review_status = 'invalidated' AND recall_scope = 'none' "
            "AND content IS NULL) OR "
            "(review_status <> 'invalidated' AND content IS NOT NULL)",
            name="ck_private_memories_content_lifecycle",
        ),
        Index(
            "idx_private_memories_recall",
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
        Index(
            "idx_private_memories_origin",
            "origin_story_run_id",
            "character_id",
            "layer",
            "created_at",
        ),
        Index(
            "idx_private_memories_revision",
            "player_id",
            "story_world_id",
            "character_id",
            "logical_key",
            "revision",
        ),
    )


class PrivateMemorySourceModel(Base):
    __tablename__ = "private_memory_sources"

    memory_id = Column(String(36), primary_key=True)
    player_id = Column(String(64), nullable=False)
    story_world_id = Column(String(128), nullable=False)
    character_id = Column(String(128), nullable=False)
    ordinal = Column(SmallInteger, primary_key=True)
    source_kind = Column(String(8), nullable=False)
    source_story_id = Column(String(128), nullable=True)
    source_story_run_id = Column(String(36), nullable=True)
    source_event_id = Column(String(36), nullable=True)
    source_event_sequence = Column(Integer, nullable=True)
    source_memory_id = Column(String(36), nullable=True)
    relation_kind = Column(String(16), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id", "character_id", "memory_id"],
            [
                "private_memories.player_id",
                "private_memories.story_world_id",
                "private_memories.character_id",
                "private_memories.id",
            ],
            name="fk_private_memory_sources_memory",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            [
                "player_id",
                "story_world_id",
                "character_id",
                "source_memory_id",
            ],
            [
                "private_memories.player_id",
                "private_memories.story_world_id",
                "private_memories.character_id",
                "private_memories.id",
            ],
            name="fk_private_memory_sources_source_memory",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            [
                "player_id",
                "story_world_id",
                "source_story_id",
                "source_story_run_id",
            ],
            [
                "story_runs.player_id",
                "story_runs.story_world_id",
                "story_runs.story_id",
                "story_runs.id",
            ],
            name="fk_private_memory_sources_source_run",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["source_story_run_id", "source_event_id", "source_event_sequence"],
            [
                "story_events.story_run_id",
                "story_events.id",
                "story_events.sequence",
            ],
            name="fk_private_memory_sources_source_event",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "memory_id",
            "source_story_run_id",
            "source_event_id",
            "source_event_sequence",
            "relation_kind",
            name="uq_private_memory_sources_event",
        ),
        UniqueConstraint(
            "memory_id",
            "source_memory_id",
            "relation_kind",
            name="uq_private_memory_sources_memory",
        ),
        CheckConstraint(
            "source_kind IN ('event', 'memory')",
            name="ck_private_memory_sources_source_kind",
        ),
        CheckConstraint(
            "relation_kind IN ('evidence', 'derived_from', 'supersedes', "
            "'contradicts', 'invalidates')",
            name="ck_private_memory_sources_relation_kind",
        ),
        CheckConstraint(
            "ordinal >= 0",
            name="ck_private_memory_sources_ordinal",
        ),
        CheckConstraint(
            "(source_event_id IS NOT NULL AND source_memory_id IS NULL) OR "
            "(source_event_id IS NULL AND source_memory_id IS NOT NULL)",
            name="ck_private_memory_sources_source_exclusive",
        ),
        CheckConstraint(
            "(source_kind = 'event' AND source_story_id IS NOT NULL "
            "AND source_story_run_id IS NOT NULL AND source_event_id IS NOT NULL "
            "AND source_event_sequence IS NOT NULL AND source_event_sequence >= 0 "
            "AND source_memory_id IS NULL) OR "
            "(source_kind = 'memory' AND source_story_id IS NULL "
            "AND source_story_run_id IS NULL AND source_event_id IS NULL "
            "AND source_event_sequence IS NULL AND source_memory_id IS NOT NULL)",
            name="ck_private_memory_sources_source_shape",
        ),
        CheckConstraint(
            "(relation_kind = 'evidence' AND source_kind = 'event') OR "
            "(relation_kind IN ('derived_from', 'supersedes', 'contradicts', "
            "'invalidates') AND source_kind = 'memory')",
            name="ck_private_memory_sources_relation_source",
        ),
    )


class MemoryFormationJobModel(Base):
    __tablename__ = "memory_formation_jobs"

    player_id = Column(String(64), nullable=False)
    story_world_id = Column(String(128), nullable=False)
    story_id = Column(String(128), nullable=False)
    story_run_id = Column(String(36), primary_key=True)
    character_id = Column(String(128), primary_key=True)
    pipeline_version = Column(String(64), primary_key=True)
    processed_event_sequence = Column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    pending_event_sequence = Column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    status = Column(String(24), nullable=False)
    attempt_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    lease_token = Column(String(64), nullable=True)
    lease_expires_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
    last_error_code = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["player_id", "story_world_id", "story_id", "story_run_id"],
            [
                "story_runs.player_id",
                "story_runs.story_world_id",
                "story_runs.story_id",
                "story_runs.id",
            ],
            name="fk_memory_formation_jobs_story_run",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "status IN ('idle', 'pending', 'running', 'retryable_failed', 'blocked')",
            name="ck_memory_formation_jobs_status",
        ),
        CheckConstraint(
            "processed_event_sequence >= 0 AND pending_event_sequence >= 0 "
            "AND processed_event_sequence <= pending_event_sequence",
            name="ck_memory_formation_jobs_watermarks",
        ),
        CheckConstraint(
            "attempt_count >= 0",
            name="ck_memory_formation_jobs_attempt_count",
        ),
        CheckConstraint(
            "(status = 'idle' "
            "AND processed_event_sequence = pending_event_sequence) OR "
            "(status IN ('pending', 'running', 'retryable_failed', 'blocked') "
            "AND processed_event_sequence < pending_event_sequence)",
            name="ck_memory_formation_jobs_status_watermark",
        ),
        CheckConstraint(
            "(status = 'running' AND lease_token IS NOT NULL "
            "AND lease_expires_at IS NOT NULL) OR "
            "(status <> 'running' AND lease_token IS NULL "
            "AND lease_expires_at IS NULL)",
            name="ck_memory_formation_jobs_lease",
        ),
        CheckConstraint(
            "next_retry_at IS NULL OR status = 'retryable_failed'",
            name="ck_memory_formation_jobs_retry",
        ),
        CheckConstraint(
            "status <> 'blocked' OR last_error_code IS NOT NULL",
            name="ck_memory_formation_jobs_blocked_error",
        ),
        Index(
            "idx_memory_formation_jobs_worker",
            "status",
            "next_retry_at",
            "lease_expires_at",
        ),
    )


from .schema_comments import apply_schema_comments

apply_schema_comments(Base.metadata)


__all__ = [
    "CharacterRelationshipModel",
    "MemoryFormationJobModel",
    "PlayerStoryProgressModel",
    "PlayerStoryStateModel",
    "PrivateMemoryModel",
    "PrivateMemorySourceModel",
    "StoryEventModel",
    "StoryMessageModel",
    "StoryRunModel",
]
