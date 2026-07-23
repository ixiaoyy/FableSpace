"""SQLAlchemy models for private StoryWorld runtime state."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text

from .database import Base


class PlayerStoryStateModel(Base):
    __tablename__ = "player_story_states"

    player_id = Column(String(64), primary_key=True)
    story_world_id = Column(String(128), primary_key=True)
    player_role_id = Column(String(128), nullable=False)
    active_story_run_id = Column(String(36), nullable=True)
    visit_count = Column(Integer, nullable=False, default=0)
    last_visited_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_run_summaries = Column(JSON, nullable=False, default=list)


class StoryRunModel(Base):
    __tablename__ = "story_runs"

    id = Column(String(36), primary_key=True)
    player_id = Column(String(64), nullable=False)
    story_world_id = Column(String(128), nullable=False)
    content_version = Column(String(128), nullable=False)
    status = Column(String(16), nullable=False)
    current_chapter_id = Column(String(128), nullable=False)
    current_node_id = Column(String(128), nullable=False)
    key_choices = Column(JSON, nullable=False, default=list)
    story_flags = Column(JSON, nullable=False, default=list)
    private_memories = Column(JSON, nullable=False, default=list)
    ending_id = Column(String(128), nullable=True)
    ending_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_story_runs_player_world_status", "player_id", "story_world_id", "status"),
    )


class CharacterRelationshipModel(Base):
    __tablename__ = "character_relationships"

    story_run_id = Column(
        String(36),
        ForeignKey("story_runs.id", ondelete="CASCADE"),
        primary_key=True,
    )
    character_id = Column(String(128), primary_key=True)
    affinity = Column(Float, nullable=False)
    stage = Column(String(64), nullable=False)
    last_change_reason = Column(Text, nullable=False, default="")
    flags = Column(JSON, nullable=False, default=list)


class StoryEventModel(Base):
    __tablename__ = "story_events"

    id = Column(String(36), primary_key=True)
    story_run_id = Column(
        String(36),
        ForeignKey("story_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
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
        Index("uq_story_events_run_sequence", "story_run_id", "sequence", unique=True),
        Index("idx_story_events_run_source", "story_run_id", "source_kind", "source_id"),
    )
