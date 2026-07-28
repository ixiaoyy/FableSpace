"""Verify fresh seeding and ownership-safe legacy retirement for both stores."""

import json
import os
import tempfile
from pathlib import Path

from fablespace_api.core.default_spaces import (
    DEFAULT_PUBLIC_WELFARE_OWNER_ID,
    DEFAULT_PUBLIC_WELFARE_TAVERN_IDS,
    RETIRED_PUBLIC_WELFARE_TAVERN_IDS,
)
from fablespace_api.core.space import Space, SpaceStore
from fablespace_api.infrastructure.storage import _seed_database_default_public_welfare_taverns


os.environ["FABLESPACE_SEED_DEFAULT_SPACES"] = "1"

with tempfile.TemporaryDirectory() as temporary_root:
    json_store = SpaceStore(Path(temporary_root))
    fresh_data = json.loads(json_store.taverns_file.read_text(encoding="utf-8"))
    assert set(fresh_data) == set(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS)

    system_retired_id = RETIRED_PUBLIC_WELFARE_TAVERN_IDS[0]
    user_owned_id = RETIRED_PUBLIC_WELFARE_TAVERN_IDS[1]
    fresh_data[system_retired_id] = {
        "id": system_retired_id,
        "name": "legacy-system",
        "description": "preserve-me",
        "owner_id": DEFAULT_PUBLIC_WELFARE_OWNER_ID,
        "access": "public",
        "status": "open",
    }
    fresh_data[user_owned_id] = {
        "id": user_owned_id,
        "name": "legacy-user",
        "description": "preserve-me",
        "owner_id": "user-owner",
        "access": "public",
        "status": "open",
    }
    json_store.taverns_file.write_text(
        json.dumps(fresh_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    json_store._seed_default_public_welfare_taverns()
    first_json_result = json.loads(json_store.taverns_file.read_text(encoding="utf-8"))
    assert first_json_result[system_retired_id]["access"] == "private"
    assert first_json_result[system_retired_id]["status"] == "closed"
    assert first_json_result[system_retired_id]["description"] == "preserve-me"
    assert first_json_result[user_owned_id] == fresh_data[user_owned_id]
    public_space_ids = {space.id for space in json_store.list_spaces()}
    assert system_retired_id not in public_space_ids
    assert set(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS).issubset(public_space_ids)

    json_store._seed_default_public_welfare_taverns()
    second_json_result = json.loads(json_store.taverns_file.read_text(encoding="utf-8"))
    assert second_json_result == first_json_result


class MemorySpaceStore:
    """Minimal database-store double used to exercise the shared seed routine."""

    def __init__(self) -> None:
        """Create an empty in-memory record map."""
        self.records = {}

    def get_space(self, space_id: str):
        """Return a stored space by ID, or None when absent."""
        return self.records.get(space_id)

    def create_space(self, space: Space) -> Space:
        """Persist a newly seeded space and return it."""
        self.records[space.id] = space
        return space

    def update_space(self, space: Space) -> Space:
        """Replace an existing space and return the stored value."""
        self.records[space.id] = space
        return space

    def save_llm_config(self, space_id: str, llm_config) -> None:
        """Accept the database seeder's optional LLM-config write."""
        del space_id, llm_config


database_store = MemorySpaceStore()
database_store.create_space(
    Space.from_dict({
        "id": system_retired_id,
        "name": "legacy-system",
        "description": "preserve-me",
        "owner_id": DEFAULT_PUBLIC_WELFARE_OWNER_ID,
        "access": "public",
        "status": "open",
    })
)
database_store.create_space(
    Space.from_dict({
        "id": user_owned_id,
        "name": "legacy-user",
        "description": "preserve-me",
        "owner_id": "user-owner",
        "access": "public",
        "status": "open",
    })
)

assert _seed_database_default_public_welfare_taverns(database_store) == 3
first_database_result = {
    space_id: space.to_dict()
    for space_id, space in database_store.records.items()
}
assert set(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS).issubset(first_database_result)
assert first_database_result[system_retired_id]["access"] == "private"
assert first_database_result[system_retired_id]["status"] == "closed"
assert first_database_result[system_retired_id]["description"] == "preserve-me"
assert first_database_result[user_owned_id]["access"] == "public"
assert first_database_result[user_owned_id]["status"] == "open"

assert _seed_database_default_public_welfare_taverns(database_store) == 0
second_database_result = {
    space_id: space.to_dict()
    for space_id, space in database_store.records.items()
}
assert second_database_result == first_database_result

print("legacy-cleanup-contract-ok")
