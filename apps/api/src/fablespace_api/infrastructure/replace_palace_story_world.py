"""One-time authorized replacement of the managed palace StoryWorld document."""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select

from ..content import STORY_WORLD_REGISTRY
from ..content.palace_snow_edict import PALACE_STORY_WORLD_ID
from ..content.story_world_codec import (
    story_world_from_payload,
    story_world_to_payload,
)
from ..domain.story_world import StoryWorld, StoryWorldRegistry
from .database import Database
from .managed_content_models import ManagedStoryWorldModel
from .settings import ApiSettings

CONFIRMATION = "REPLACE-PALACE-XIANTIAN-2026-08-05"
EXPECTED_OLD_CONTENT_VERSION = "palace-snow-edict-2026-07-28.1"
EXPECTED_OLD_TITLE = "长明宫·雪夜诏书"
EXPECTED_OLD_CHARACTERS = (
    ("char_story_palace_eunuch_wei", "魏观海"),
    ("char_story_palace_princess_xiao", "萧明珠"),
)
EXPECTED_OLD_PLAYER_ROLES = (
    ("role_story_palace_little_eunuch", "小太监"),
    ("role_story_palace_little_maid", "小宫女"),
)
EXPECTED_NEW_CONTENT_VERSION = "palace-xiantian-coup-2026-08-05.1"
EXPECTED_NEW_TITLE = "先天二年·虔化门"
EXPECTED_NEW_CHARACTERS = (
    ("char_story_palace_eunuch_wei", "高力士"),
    ("char_story_palace_princess_xiao", "太平公主"),
)
EXPECTED_NEW_PLAYER_ROLES = (
    ("role_story_palace_little_eunuch", "内侍小使"),
    ("role_story_palace_little_maid", "宫人"),
)


def _character_signature(story_world: StoryWorld) -> tuple[tuple[str, str], ...]:
    """Return stable Character IDs with display names for replacement checks."""

    return tuple((character.id, character.name) for character in story_world.characters)


def _player_role_signature(story_world: StoryWorld) -> tuple[tuple[str, str], ...]:
    """Return stable PlayerRole IDs with display names for replacement checks."""

    return tuple((role.id, role.name) for role in story_world.player_roles)


def _require_old_signature(story_world: StoryWorld) -> None:
    """Fail unless the locked managed row is exactly the reviewed old release."""

    if (
        story_world.id != PALACE_STORY_WORLD_ID
        or story_world.content_version != EXPECTED_OLD_CONTENT_VERSION
        or story_world.title != EXPECTED_OLD_TITLE
        or _character_signature(story_world) != EXPECTED_OLD_CHARACTERS
        or _player_role_signature(story_world) != EXPECTED_OLD_PLAYER_ROLES
    ):
        raise RuntimeError(
            "Managed palace StoryWorld no longer matches the approved replacement precondition."
        )


def _require_new_signature(story_world: StoryWorld) -> None:
    """Fail unless the reviewed registry target is the approved Xiantian release."""

    if (
        story_world.id != PALACE_STORY_WORLD_ID
        or story_world.content_version != EXPECTED_NEW_CONTENT_VERSION
        or story_world.title != EXPECTED_NEW_TITLE
        or _character_signature(story_world) != EXPECTED_NEW_CHARACTERS
        or _player_role_signature(story_world) != EXPECTED_NEW_PLAYER_ROLES
    ):
        raise RuntimeError(
            "Built-in palace StoryWorld no longer matches the approved replacement target."
        )


def _database_from_settings(settings: ApiSettings) -> Database:
    """Create the configured database handle without creating or migrating any table."""

    if not settings.database_url:
        raise RuntimeError("FABLESPACE_DATABASE_URL is required for managed replacement.")
    return Database(
        url=settings.database_url,
        pool_size=settings.mysql_pool_size,
        max_overflow=settings.mysql_max_overflow,
        echo=settings.mysql_echo,
    )


def replace_managed_palace_story(database: Database) -> tuple[str, str, str]:
    """Replace the reviewed row once, or safely accept the exact target on retry."""

    replacement = STORY_WORLD_REGISTRY.require(PALACE_STORY_WORLD_ID)
    _require_new_signature(replacement)
    replacement_payload = story_world_to_payload(replacement)

    with database.session_scope() as session:
        rows = list(
            session.scalars(
                select(ManagedStoryWorldModel)
                .order_by(ManagedStoryWorldModel.story_world_id)
                .with_for_update()
            ).all()
        )
        target = next(
            (
                row
                for row in rows
                if row.story_world_id == PALACE_STORY_WORLD_ID
            ),
            None,
        )
        if target is None:
            raise RuntimeError("Managed palace StoryWorld row does not exist.")

        current = story_world_from_payload(target.payload_json)
        complete_registry = StoryWorldRegistry(
            tuple(
                replacement
                if row.story_world_id == PALACE_STORY_WORLD_ID
                else story_world_from_payload(row.payload_json)
                for row in rows
            )
        )
        complete_registry.require(PALACE_STORY_WORLD_ID)
        if story_world_to_payload(current) == replacement_payload:
            _require_new_signature(current)
            return (
                "already_current",
                current.content_version,
                replacement.content_version,
            )
        _require_old_signature(current)

        target.payload_json = replacement_payload
        target.updated_at = datetime.now(UTC).replace(tzinfo=None)
        session.flush()
        persisted = story_world_from_payload(target.payload_json)
        _require_new_signature(persisted)
        if story_world_to_payload(persisted) != replacement_payload:
            raise RuntimeError("Managed palace StoryWorld payload did not round-trip exactly.")

    return "replaced", current.content_version, replacement.content_version


def main(argv: Sequence[str] | None = None) -> int:
    """Run the authorized one-row production replacement and print safe metadata only."""

    parser = argparse.ArgumentParser(
        description="Replace the reviewed managed palace StoryWorld document."
    )
    parser.add_argument("--confirmation", required=True)
    args = parser.parse_args(argv)
    if args.confirmation != CONFIRMATION:
        raise SystemExit("Production replacement confirmation did not match.")

    database = _database_from_settings(ApiSettings())
    try:
        status, old_version, new_version = replace_managed_palace_story(database)
    finally:
        database.dispose()

    print(
        f"managed_story_world_status={status} "
        f"story_world_id={PALACE_STORY_WORLD_ID} "
        f"old_content_version={old_version} "
        f"new_content_version={new_version}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
