"""SQLAlchemy models for administrator-managed system story content."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Index, Integer, String, Text

from .database import Base


class ManagedStoryWorldModel(Base):
    __tablename__ = "managed_story_worlds"

    story_world_id = Column(String(128), primary_key=True)
    payload_json = Column(JSON, nullable=False)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class ManagedMediaAssetModel(Base):
    __tablename__ = "managed_media_assets"

    id = Column(String(36), primary_key=True)
    object_key = Column(String(512), nullable=False)
    url = Column(String(1024), nullable=False)
    byte_count = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    mime_type = Column(String(64), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    source_type = Column(String(32), nullable=False)
    source_note = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("uq_managed_media_assets_object_key", "object_key", unique=True),
        Index("idx_managed_media_assets_created_at", "created_at"),
    )


from .schema_comments import apply_schema_comments

apply_schema_comments(Base.metadata)


__all__ = ["ManagedMediaAssetModel", "ManagedStoryWorldModel"]
