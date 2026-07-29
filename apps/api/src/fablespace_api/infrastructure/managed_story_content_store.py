"""Database-backed source of current administrator-managed StoryWorld content."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from uuid import uuid4

from sqlalchemy import select

from ..content.story_world_codec import (
    story_world_from_payload,
    story_world_to_payload,
)
from ..domain.story_world import StoryWorld, StoryWorldRegistry
from .database import Database
from .managed_content_models import (
    ManagedMediaAssetModel,
    ManagedStoryWorldModel,
)


@dataclass(frozen=True, slots=True)
class ManagedStoryWorldRecord:
    story_world: StoryWorld
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ManagedMediaAssetRecord:
    id: str
    object_key: str
    url: str
    byte_count: int
    sha256: str
    mime_type: str
    width: int | None
    height: int | None
    source_type: str
    source_note: str
    created_at: datetime


class ManagedStoryWorldStore:
    """Expose the current database documents through the registry read contract."""

    def __init__(
        self,
        database: Database,
        seed_registry: StoryWorldRegistry,
    ) -> None:
        self.database = database
        self.seed_registry = seed_registry

    def seed_missing(self) -> int:
        """Insert missing built-in worlds without replacing administrator edits."""
        seeded = 0
        with self.database.session_scope() as session:
            rows = list(
                session.scalars(
                    select(ManagedStoryWorldModel)
                    .order_by(ManagedStoryWorldModel.story_world_id)
                    .with_for_update()
                ).all()
            )
            existing_ids = {row.story_world_id for row in rows}
            worlds = [story_world_from_payload(row.payload_json) for row in rows]
            now = datetime.utcnow()
            for story_world in self.seed_registry.all():
                if story_world.id in existing_ids:
                    continue
                session.add(
                    ManagedStoryWorldModel(
                        story_world_id=story_world.id,
                        payload_json=story_world_to_payload(story_world),
                        updated_at=now,
                    )
                )
                worlds.append(story_world)
                seeded += 1
            StoryWorldRegistry(worlds)
        return seeded

    def get(self, story_world_id: str) -> StoryWorld | None:
        record = self.get_record(story_world_id)
        return record.story_world if record else None

    def require(self, story_world_id: str) -> StoryWorld:
        story_world = self.get(story_world_id)
        if story_world is None:
            raise KeyError(story_world_id)
        return story_world

    def all(self) -> tuple[StoryWorld, ...]:
        return tuple(record.story_world for record in self.list_records())

    def published(self) -> tuple[StoryWorld, ...]:
        return StoryWorldRegistry(self.all()).published()

    def get_record(self, story_world_id: str) -> ManagedStoryWorldRecord | None:
        return next(
            (
                record
                for record in self.list_records()
                if record.story_world.id == story_world_id
            ),
            None,
        )

    def list_records(self) -> tuple[ManagedStoryWorldRecord, ...]:
        with self.database.session_scope() as session:
            rows = list(
                session.scalars(
                    select(ManagedStoryWorldModel).order_by(
                        ManagedStoryWorldModel.updated_at.desc(),
                        ManagedStoryWorldModel.story_world_id,
                    )
                ).all()
            )
            worlds = tuple(
                story_world_from_payload(row.payload_json)
                for row in rows
            )
            StoryWorldRegistry(worlds)
            return tuple(
                ManagedStoryWorldRecord(
                    story_world=story_world,
                    updated_at=row.updated_at,
                )
                for row, story_world in zip(rows, worlds, strict=True)
            )

    def save(
        self,
        story_world_id: str,
        raw_payload: object,
    ) -> ManagedStoryWorldRecord:
        """Validate the complete registry and atomically replace one document."""
        candidate = story_world_from_payload(raw_payload)
        if candidate.id != story_world_id:
            raise ValueError("StoryWorld ID 与请求路径不一致。")
        candidate = replace(candidate, content_version=_new_content_version())
        now = datetime.utcnow()
        with self.database.session_scope() as session:
            rows = list(
                session.scalars(
                    select(ManagedStoryWorldModel)
                    .order_by(ManagedStoryWorldModel.story_world_id)
                    .with_for_update()
                ).all()
            )
            target = next(
                (row for row in rows if row.story_world_id == story_world_id),
                None,
            )
            if target is None:
                raise KeyError(story_world_id)
            worlds = [
                candidate
                if row.story_world_id == story_world_id
                else story_world_from_payload(row.payload_json)
                for row in rows
            ]
            StoryWorldRegistry(worlds)
            target.payload_json = story_world_to_payload(candidate)
            target.updated_at = now
            session.flush()
        return ManagedStoryWorldRecord(candidate, now)


class ManagedMediaAssetStore:
    """Persist immutable upload metadata without exposing a media-library API."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def record(
        self,
        *,
        object_key: str,
        url: str,
        content: bytes,
        sha256: str,
        mime_type: str,
        width: int | None,
        height: int | None,
        source_note: str,
    ) -> ManagedMediaAssetRecord:
        created_at = datetime.utcnow()
        model = ManagedMediaAssetModel(
            id=str(uuid4()),
            object_key=object_key,
            url=url,
            byte_count=len(content),
            sha256=sha256,
            mime_type=mime_type,
            width=width,
            height=height,
            source_type="user-provided",
            source_note=source_note,
            created_at=created_at,
        )
        with self.database.session_scope() as session:
            session.add(model)
            session.flush()
            record = ManagedMediaAssetRecord(
                id=model.id,
                object_key=model.object_key,
                url=model.url,
                byte_count=model.byte_count,
                sha256=model.sha256,
                mime_type=model.mime_type,
                width=model.width,
                height=model.height,
                source_type=model.source_type,
                source_note=model.source_note,
                created_at=model.created_at,
            )
        return record


def _new_content_version() -> str:
    now = datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
    return f"admin-{now}-{uuid4().hex[:8]}"


__all__ = [
    "ManagedMediaAssetRecord",
    "ManagedMediaAssetStore",
    "ManagedStoryWorldRecord",
    "ManagedStoryWorldStore",
]
