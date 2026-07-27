"""Verify StoryRun parents are persisted before their FK child rows."""

from __future__ import annotations

import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from sqlalchemy import event, func, select

REPO_ROOT = next(
    parent
    for parent in Path(__file__).resolve().parents
    if (parent / "apps" / "api").is_dir()
)
sys.path.insert(0, str(REPO_ROOT / "apps" / "api" / "src"))

from fablespace_api.application.story_worlds import StoryWorldApplicationService  # noqa: E402
from fablespace_api.content.annie_broad_street import (  # noqa: E402
    ANNIE_STORY_WORLD_ID,
    STORY_WORLD_REGISTRY,
)
from fablespace_api.infrastructure.database import Database  # noqa: E402
from fablespace_api.infrastructure.story_state_models import (  # noqa: E402
    CharacterRelationshipModel,
    StoryEventModel,
    StoryRunModel,
)


class UnexpectedResponder:
    def reply(self, **_kwargs) -> str:
        raise AssertionError("Starting an authored StoryRun must not call the LLM")


def main() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        database = Database(
            f"sqlite:///{(Path(temp_dir) / 'story-run.sqlite3').as_posix()}"
        )

        @event.listens_for(database.engine, "connect")
        def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

        database.create_tables()
        service = StoryWorldApplicationService(
            database,
            STORY_WORLD_REGISTRY,
            UnexpectedResponder(),
        )
        projection = service.start("verification-player", ANNIE_STORY_WORLD_ID)

        with database.session_scope() as session:
            assert session.get(StoryRunModel, projection["id"]) is not None
            relationship_count = session.scalar(
                select(func.count())
                .select_from(CharacterRelationshipModel)
                .where(CharacterRelationshipModel.story_run_id == projection["id"])
            )
            event_count = session.scalar(
                select(func.count())
                .select_from(StoryEventModel)
                .where(StoryEventModel.story_run_id == projection["id"])
            )
            assert relationship_count == 1
            assert event_count == 2

        database.dispose()

    print("PASS: StoryRun parent persisted before relationship and event rows")


if __name__ == "__main__":
    main()
