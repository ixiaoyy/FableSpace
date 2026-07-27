"""No-database verification for Annie's private StoryRun UI projection."""

from __future__ import annotations

import inspect
import sys
from pathlib import Path
from types import SimpleNamespace

REPO_ROOT = next(
    parent
    for parent in Path(__file__).resolve().parents
    if (parent / "apps" / "api" / "src").is_dir()
)
sys.path.insert(0, str(REPO_ROOT / "apps" / "api" / "src"))

from fablespace_api.application.story_worlds import StoryWorldApplicationService  # noqa: E402
from fablespace_api.content.annie_broad_street import (  # noqa: E402
    ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE,
    ANNIE_STORY_WORLD,
)


def _projection(node_id: str, status: str) -> dict[str, object]:
    run = SimpleNamespace(current_node_id=node_id, status=status)
    return StoryWorldApplicationService._historical_reference(
        ANNIE_STORY_WORLD,
        run,
    )


def _verify_reference_projection() -> None:
    all_canon_ids = {entry.id for entry in ANNIE_STORY_WORLD.canon_entries}
    staged_ids = {
        entry_id
        for entry_ids in ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE.values()
        for entry_id in entry_ids
    }
    assert staged_ids == all_canon_ids
    assert set(ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE) == {
        "opening",
        "investigation",
        "outcome",
    }

    opening = _projection(ANNIE_STORY_WORLD.chapters[0].entry_node_id, "active")
    investigation = _projection("node_doorstep", "active")
    outcome = _projection("node_trust_ending", "completed")
    assert opening["stage"] == "opening"
    assert investigation["stage"] == "investigation"
    assert outcome["stage"] == "outcome"
    assert opening["unlocked_count"] == 3
    assert investigation["unlocked_count"] == 7
    assert outcome["unlocked_count"] == outcome["total_count"] == 11

    opening_ids = {entry["id"] for entry in opening["entries"]}  # type: ignore[index]
    investigation_ids = {
        entry["id"] for entry in investigation["entries"]  # type: ignore[index]
    }
    outcome_ids = {entry["id"] for entry in outcome["entries"]}  # type: ignore[index]
    assert opening_ids < investigation_ids < outcome_ids
    assert outcome_ids == all_canon_ids

    for entry in outcome["entries"]:  # type: ignore[assignment]
        assert entry["category"] in {"fixed_fact", "story_setting"}
        sources = entry["sources"]
        if entry["category"] == "fixed_fact":
            assert len(sources) >= 2
            assert all(str(source).startswith("https://") for source in sources)
        else:
            assert sources == []


def _verify_choice_feedback_contract() -> None:
    source = inspect.getsource(StoryWorldApplicationService.choose)
    assert 'event_type="relationship_changed"' in source
    assert 'source_kind="reviewed_choice"' in source
    assert '"source_event_id": choice_event.id' in source
    assert '"source_choice_id": choice.id' in source
    assert source.index("choice_event = self._append_event") < source.index(
        'event_type="relationship_changed"'
    )
    assert source.index('event_type="relationship_changed"') < source.index(
        'event_type="narration"'
    )


def main() -> None:
    _verify_reference_projection()
    _verify_choice_feedback_contract()
    print(
        "PASS: reference_stages=3 unlocked=3/7/11 canon_entries=11 "
        "choice_feedback_source_link=1"
    )


if __name__ == "__main__":
    main()
