"""Deterministic verification for Annie's complete P0 story path."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "apps" / "api" / "src"))
os.environ["FABLESPACE_SEED_DEFAULT_SPACES"] = "0"

from fablespace_api.app_factory import create_app  # noqa: E402
from fablespace_api.content.annie_broad_street import (  # noqa: E402
    ANNIE_CHARACTER_ID,
    ANNIE_STORY_WORLD_ID,
    STORY_WORLD_REGISTRY,
)
from fablespace_api.infrastructure.database import Base  # noqa: E402
from fablespace_api.infrastructure.models import *  # noqa: E402,F401,F403
from fablespace_api.infrastructure.schema_comments import (  # noqa: E402
    apply_schema_comments,
    schema_comment_errors,
)
from fablespace_api.infrastructure.settings import ApiSettings  # noqa: E402
from fablespace_api.infrastructure.story_state_models import *  # noqa: E402,F401,F403
from fablespace_api.infrastructure.story_state_models import StoryRunModel  # noqa: E402


class FakeResponder:
    def reply(self, **_kwargs) -> str:
        return "安妮把陶罐抱紧了一点：“我只说我亲眼看见的。”"


def unwrap(response):
    assert response.status_code < 400, response.text
    return response.json()["data"]


def main() -> None:
    world = STORY_WORLD_REGISTRY.require(ANNIE_STORY_WORLD_ID)
    assert world.characters[0].id == ANNIE_CHARACTER_ID
    assert all(len(entry.sources) >= 2 for entry in world.canon_entries if entry.category.value == "fixed_fact")
    assert len(list((REPO_ROOT / "apps" / "api" / "sql" / "migrations").glob("004_*.sql"))) == 1

    apply_schema_comments(Base.metadata)
    assert not schema_comment_errors(Base.metadata), schema_comment_errors(Base.metadata)

    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        temp_path = Path(temp_dir)
        settings = ApiSettings(
            output_root=temp_path / "output",
            storage_backend="database",
            database_url=f"sqlite:///{(temp_path / 'fablespace.sqlite3').as_posix()}",
            session_cookie_secure=False,
        )
        app = create_app(settings)
        app.state.story_worlds.responder = FakeResponder()

        with TestClient(app) as client:
            detail = unwrap(
                client.get(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/characters/{ANNIE_CHARACTER_ID}"
                )
            )
            assert detail["player_role"]["name"] == "乞丐"
            assert "secret" not in detail["character"]
            serialized_detail = str(detail)
            assert "OPENCODE_API_KEY" not in serialized_detail
            assert "fixed_fact" not in serialized_detail

            assert unwrap(
                client.get(f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/current")
            )["run"] is None
            assert client.cookies.get("fablespace_player_id")

            run = unwrap(
                client.post(f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs")
            )["run"]
            assert run["status"] == "active"
            assert run["content_version"] == world.content_version
            assert len(run["events"]) == 2
            assert "player_id" not in run

            run = unwrap(
                client.post(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{run['id']}/messages",
                    json={"content": "你闻到了什么？"},
                )
            )["run"]
            assert len(run["events"]) == 4
            assert run["current_node"]["id"] == "node_water_request"

            rejected = client.post(
                f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{run['id']}/choices",
                json={"choice_id": "choice_not_published"},
            )
            assert rejected.status_code == 409

            run = unwrap(
                client.post(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{run['id']}/choices",
                    json={"choice_id": "choice_ask_what_she_saw"},
                )
            )["run"]
            assert run["relationship"]["stage"] == "trusting"

            duplicate = unwrap(
                client.post(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{run['id']}/choices",
                    json={"choice_id": "choice_ask_what_she_saw"},
                )
            )["run"]
            assert len(duplicate["events"]) == len(run["events"])

            completed = unwrap(
                client.post(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{run['id']}/choices",
                    json={"choice_id": "choice_record_only_known"},
                )
            )["run"]
            assert completed["status"] == "completed"
            assert completed["ending"]["id"] == "ending_witness_heard"

            restored = unwrap(
                client.get(f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/current")
            )["run"]
            assert restored["id"] == completed["id"]
            assert restored["status"] == "completed"

            restarted = unwrap(
                client.post(f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/restart")
            )["run"]
            assert restarted["id"] != completed["id"]
            assert restarted["relationship"]["stage"] == "watchful"
            assert restarted["completed_run_summaries"][-1]["ending_id"] == "ending_witness_heard"
            assert len(restarted["events"]) == 2

            with app.state.story_database.session_scope() as session:
                restarted_model = session.get(StoryRunModel, restarted["id"])
                assert restarted_model is not None
                assert restarted_model.key_choices == []
                assert restarted_model.story_flags == []
                assert restarted_model.private_memories == []

            with TestClient(app) as stranger:
                denied = stranger.post(
                    f"/api/v1/story-worlds/{ANNIE_STORY_WORLD_ID}/runs/{restarted['id']}/choices",
                    json={"choice_id": "choice_walk_away"},
                )
                assert denied.status_code == 404

        app.state.story_database.dispose()

    print("PASS: Annie detail -> dialogue -> choices -> ending -> restore -> restart")


if __name__ == "__main__":
    main()
