from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from fablespace_api.core.default_spaces import DEFAULT_PUBLIC_WELFARE_TAVERN_IDS


@dataclass(frozen=True, slots=True)
class FixtureCharacterSignature:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class HistoricalFixtureSignature:
    space_id: str
    owner_id: str
    name: str
    original_access: str
    original_status: str
    characters: tuple[FixtureCharacterSignature, ...]


HISTORICAL_FIXTURE_RETIREMENT_SIGNATURES = (
    HistoricalFixtureSignature(
        space_id="platform-public",
        owner_id="owner-platform-home",
        name="公开星港",
        original_access="public",
        original_status="open",
        characters=(
            FixtureCharacterSignature(id="public-char-a", name="阿珀"),
            FixtureCharacterSignature(id="public-char-b", name="米娅"),
        ),
    ),
    HistoricalFixtureSignature(
        space_id="mainline-golden-path-tavern",
        owner_id="owner-mainline-smoke",
        name="主链路验收空间",
        original_access="public",
        original_status="open",
        characters=(
            FixtureCharacterSignature(id="char-mainline-keeper", name="验收店员"),
        ),
    ),
    HistoricalFixtureSignature(
        space_id="engagement-demo",
        owner_id="owner_engagement",
        name="纪念币茶馆",
        original_access="public",
        original_status="open",
        characters=(
            FixtureCharacterSignature(id="npc_keeper", name="茶博士"),
        ),
    ),
    HistoricalFixtureSignature(
        space_id="continuity-tavern",
        owner_id="owner_continuity",
        name="Continuity Tavern",
        original_access="public",
        original_status="open",
        characters=(
            FixtureCharacterSignature(id="char_logic", name="Logic"),
        ),
    ),
    HistoricalFixtureSignature(
        space_id="episode-export-tavern-public",
        owner_id="owner_episode_export",
        name="Episode Export Tavern",
        original_access="public",
        original_status="open",
        characters=(
            FixtureCharacterSignature(id="char_keeper", name="Keeper"),
        ),
    ),
)


def matches_historical_fixture(
    record: Any,
    signature: HistoricalFixtureSignature,
) -> bool:
    """Return whether a persisted Space still has one complete fixture signature."""
    if not isinstance(record, Mapping):
        return False
    if (
        record.get("id") != signature.space_id
        or record.get("owner_id") != signature.owner_id
        or record.get("name") != signature.name
        or record.get("access") != signature.original_access
        or record.get("status") != signature.original_status
    ):
        return False

    characters = record.get("characters")
    if not isinstance(characters, list):
        return False

    expected_names = {
        character.id: character.name
        for character in signature.characters
    }
    matched_names: dict[str, Any] = {}
    for character in characters:
        if not isinstance(character, Mapping):
            continue
        character_id = character.get("id")
        if character_id not in expected_names:
            continue
        if character_id in matched_names:
            return False
        matched_names[character_id] = character.get("name")
    return matched_names == expected_names


_fixture_space_ids = tuple(
    signature.space_id
    for signature in HISTORICAL_FIXTURE_RETIREMENT_SIGNATURES
)
if len(set(_fixture_space_ids)) != len(_fixture_space_ids):
    raise RuntimeError("Historical fixture retirement signatures must use unique Space IDs")

_canonical_overlap = set(_fixture_space_ids).intersection(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS)
if _canonical_overlap:
    raise RuntimeError(
        "Canonical story Spaces cannot appear in the historical fixture retirement allow-list: "
        + ", ".join(sorted(_canonical_overlap))
    )
