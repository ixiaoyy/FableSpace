from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from math import isfinite
from types import MappingProxyType
from typing import Iterable, Mapping, NoReturn


class PublicationStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CanonCategory(str, Enum):
    FIXED_FACT = "fixed_fact"
    STORY_SETTING = "story_setting"
    NEEDS_VERIFICATION = "needs_verification"


@dataclass(frozen=True, slots=True)
class CanonEntry:
    id: str
    category: CanonCategory
    statement: str
    sources: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class RelationshipStage:
    id: str
    label: str
    minimum_affinity: int | float
    attitude: str


@dataclass(frozen=True, slots=True)
class RelationshipRules:
    minimum_affinity: int | float
    maximum_affinity: int | float
    initial_affinity: int | float
    natural_turn_max_delta: int | float
    stages: tuple[RelationshipStage, ...]


@dataclass(frozen=True, slots=True)
class RelationshipEffect:
    character_id: str
    affinity_delta: int | float
    reason: str
    set_flags: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Character:
    id: str
    story_world_id: str
    name: str
    motive: str
    secret: str
    voice: str
    current_situation: str
    opening_line: str
    relationship_rules: RelationshipRules


@dataclass(frozen=True, slots=True)
class PlayerRole:
    id: str
    story_world_id: str
    name: str
    gender: str
    background: str
    entry_reason: str
    character_visible_information: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class StoryChoice:
    id: str
    label: str
    next_node_id: str
    is_key: bool
    required_flags: tuple[str, ...]
    blocked_flags: tuple[str, ...]
    set_flags: tuple[str, ...]
    relationship_effects: tuple[RelationshipEffect, ...]


@dataclass(frozen=True, slots=True)
class StoryNode:
    id: str
    narration: str
    choices: tuple[StoryChoice, ...]
    ending_id: str | None


@dataclass(frozen=True, slots=True)
class StoryChapter:
    id: str
    title: str
    entry_node_id: str
    nodes: tuple[StoryNode, ...]


@dataclass(frozen=True, slots=True)
class StoryEnding:
    id: str
    title: str
    summary: str


@dataclass(frozen=True, slots=True)
class StoryWorld:
    id: str
    title: str
    summary: str
    genre: str
    publication_status: PublicationStatus
    content_version: str
    entry_chapter_id: str
    player_role: PlayerRole
    characters: tuple[Character, ...]
    chapters: tuple[StoryChapter, ...]
    endings: tuple[StoryEnding, ...]
    canon_entries: tuple[CanonEntry, ...]


class StoryContentValidationError(ValueError):
    """A stable, attributable failure raised for invalid system story content."""

    def __init__(self, code: str, path: str, message: str) -> None:
        self.code = code
        self.path = path
        self.message = message
        super().__init__(f"{code} at {path}: {message}")


@dataclass(frozen=True, slots=True, init=False, eq=False)
class StoryWorldRegistry:
    _story_worlds: tuple[StoryWorld, ...]
    _by_id: Mapping[str, StoryWorld]
    _published: tuple[StoryWorld, ...]

    def __init__(self, story_worlds: Iterable[StoryWorld]) -> None:
        if isinstance(story_worlds, (str, bytes)):
            _fail(
                "invalid_collection",
                "story_worlds",
                "Story worlds must be provided as an iterable of StoryWorld objects.",
            )
        try:
            materialized = tuple(story_worlds)
        except TypeError:
            _fail(
                "invalid_collection",
                "story_worlds",
                "Story worlds must be provided as an iterable of StoryWorld objects.",
            )

        _validate_registry(materialized)
        by_id = MappingProxyType({story_world.id: story_world for story_world in materialized})
        published = tuple(
            story_world
            for story_world in materialized
            if story_world.publication_status is PublicationStatus.PUBLISHED
        )
        object.__setattr__(self, "_story_worlds", materialized)
        object.__setattr__(self, "_by_id", by_id)
        object.__setattr__(self, "_published", published)

    def get(self, story_world_id: str) -> StoryWorld | None:
        return self._by_id.get(story_world_id)

    def require(self, story_world_id: str) -> StoryWorld:
        return self._by_id[story_world_id]

    def all(self) -> tuple[StoryWorld, ...]:
        return self._story_worlds

    def published(self) -> tuple[StoryWorld, ...]:
        return self._published


def _validate_registry(story_worlds: tuple[object, ...]) -> None:
    world_ids: dict[str, str] = {}
    for world_index, story_world in enumerate(story_worlds):
        world_path = f"story_worlds[{world_index}]"
        _require_instance(story_world, StoryWorld, world_path)
        _record_id(world_ids, story_world.id, f"{world_path}.id", "StoryWorld")

    character_ids: dict[str, str] = {}
    player_role_ids: dict[str, str] = {}
    for world_index, story_world in enumerate(story_worlds):
        _validate_story_world(
            story_world,
            f"story_worlds[{world_index}]",
            character_ids,
            player_role_ids,
        )


def _validate_story_world(
    story_world: StoryWorld,
    path: str,
    registry_character_ids: dict[str, str],
    registry_player_role_ids: dict[str, str],
) -> None:
    _require_text(story_world.title, f"{path}.title")
    _require_text(story_world.summary, f"{path}.summary")
    _require_text(story_world.genre, f"{path}.genre")
    if not isinstance(story_world.publication_status, PublicationStatus):
        _fail(
            "invalid_publication_status",
            f"{path}.publication_status",
            "Publication status must be draft, published, or archived.",
        )
    _require_id(story_world.content_version, f"{path}.content_version")
    _require_id(story_world.entry_chapter_id, f"{path}.entry_chapter_id")

    if story_world.player_role is None:
        _fail(
            "missing_player_role",
            f"{path}.player_role",
            "A StoryWorld must define exactly one PlayerRole.",
        )
    _require_instance(story_world.player_role, PlayerRole, f"{path}.player_role")
    _validate_player_role(story_world.player_role, story_world.id, f"{path}.player_role")
    _record_id(
        registry_player_role_ids,
        story_world.player_role.id,
        f"{path}.player_role.id",
        "PlayerRole",
    )

    characters = _require_tuple(story_world.characters, f"{path}.characters")
    if not characters:
        _fail(
            "missing_character",
            f"{path}.characters",
            "A StoryWorld must contain at least one Character.",
        )
    character_by_id: dict[str, Character] = {}
    for character_index, character in enumerate(characters):
        character_path = f"{path}.characters[{character_index}]"
        _require_instance(character, Character, character_path)
        _validate_character(character, story_world.id, character_path)
        _record_id(
            registry_character_ids,
            character.id,
            f"{character_path}.id",
            "Character",
        )
        character_by_id[character.id] = character

    endings = _validate_endings(story_world.endings, path)
    canon_entries = _validate_canon_entries(story_world.canon_entries, path)
    (
        chapters,
        node_by_id,
        node_paths,
        choice_targets,
        terminal_endings,
    ) = _validate_chapters(story_world.chapters, character_by_id, path)

    chapter_by_id = {chapter.id: chapter for chapter in chapters}
    entry_chapter = chapter_by_id.get(story_world.entry_chapter_id)
    if entry_chapter is None:
        _fail(
            "missing_reference",
            f"{path}.entry_chapter_id",
            f"Entry chapter {story_world.entry_chapter_id!r} does not exist in this StoryWorld.",
        )

    for choice_path, next_node_id in choice_targets:
        if next_node_id not in node_by_id:
            _fail(
                "missing_reference",
                f"{choice_path}.next_node_id",
                f"Next node {next_node_id!r} does not exist in this StoryWorld.",
            )

    ending_ids = set(endings)
    for node_path, ending_id in terminal_endings:
        if ending_id not in ending_ids:
            _fail(
                "missing_reference",
                f"{node_path}.ending_id",
                f"Ending {ending_id!r} does not exist in this StoryWorld.",
            )

    _validate_story_graph(
        entry_chapter.entry_node_id,
        node_by_id,
        node_paths,
        endings,
        path,
    )

    if story_world.publication_status is PublicationStatus.PUBLISHED:
        for canon_id, (canon_entry, canon_path) in canon_entries.items():
            if canon_entry.category is CanonCategory.NEEDS_VERIFICATION:
                _fail(
                    "unverified_canon",
                    f"{canon_path}.category",
                    f"Published StoryWorld content cannot include unverified canon {canon_id!r}.",
                )


def _validate_player_role(player_role: PlayerRole, story_world_id: str, path: str) -> None:
    _require_id(player_role.id, f"{path}.id")
    _require_id(player_role.story_world_id, f"{path}.story_world_id")
    if player_role.story_world_id != story_world_id:
        _fail(
            "cross_world_reference",
            f"{path}.story_world_id",
            "PlayerRole must reference its containing StoryWorld.",
        )
    _require_text(player_role.name, f"{path}.name")
    _require_text(player_role.gender, f"{path}.gender")
    _require_text(player_role.background, f"{path}.background")
    _require_text(player_role.entry_reason, f"{path}.entry_reason")
    visible_information = _require_tuple(
        player_role.character_visible_information,
        f"{path}.character_visible_information",
    )
    for information_index, information in enumerate(visible_information):
        _require_text(
            information,
            f"{path}.character_visible_information[{information_index}]",
        )


def _validate_character(character: Character, story_world_id: str, path: str) -> None:
    _require_id(character.id, f"{path}.id")
    _require_id(character.story_world_id, f"{path}.story_world_id")
    if character.story_world_id != story_world_id:
        _fail(
            "cross_world_reference",
            f"{path}.story_world_id",
            "Character must reference its containing StoryWorld.",
        )
    _require_text(character.name, f"{path}.name")
    _require_text(character.motive, f"{path}.motive")
    _require_text(character.secret, f"{path}.secret")
    _require_text(character.voice, f"{path}.voice")
    _require_text(character.current_situation, f"{path}.current_situation")
    _require_text(character.opening_line, f"{path}.opening_line")
    _require_instance(
        character.relationship_rules,
        RelationshipRules,
        f"{path}.relationship_rules",
    )
    _validate_relationship_rules(character.relationship_rules, f"{path}.relationship_rules")


def _validate_relationship_rules(rules: RelationshipRules, path: str) -> None:
    minimum = _require_number(rules.minimum_affinity, f"{path}.minimum_affinity")
    maximum = _require_number(rules.maximum_affinity, f"{path}.maximum_affinity")
    initial = _require_number(rules.initial_affinity, f"{path}.initial_affinity")
    natural_delta = _require_number(
        rules.natural_turn_max_delta,
        f"{path}.natural_turn_max_delta",
    )
    if minimum >= maximum:
        _fail(
            "invalid_relationship_range",
            path,
            "Relationship minimum affinity must be less than maximum affinity.",
        )
    if not minimum <= initial <= maximum:
        _fail(
            "invalid_relationship_range",
            f"{path}.initial_affinity",
            "Initial affinity must fall within the relationship range.",
        )
    if natural_delta < 0 or natural_delta > maximum - minimum:
        _fail(
            "invalid_relationship_range",
            f"{path}.natural_turn_max_delta",
            "Natural turn delta must be non-negative and no larger than the affinity range.",
        )

    stages = _require_tuple(rules.stages, f"{path}.stages")
    if not stages:
        _fail(
            "missing_relationship_stage",
            f"{path}.stages",
            "Relationship rules must define at least one stage.",
        )
    stage_ids: dict[str, str] = {}
    previous_threshold: int | float | None = None
    for stage_index, stage in enumerate(stages):
        stage_path = f"{path}.stages[{stage_index}]"
        _require_instance(stage, RelationshipStage, stage_path)
        _record_id(stage_ids, stage.id, f"{stage_path}.id", "RelationshipStage")
        _require_text(stage.label, f"{stage_path}.label")
        threshold = _require_number(
            stage.minimum_affinity,
            f"{stage_path}.minimum_affinity",
        )
        _require_text(stage.attitude, f"{stage_path}.attitude")
        if not minimum <= threshold <= maximum:
            _fail(
                "invalid_relationship_stage",
                f"{stage_path}.minimum_affinity",
                "Relationship stage threshold must fall within the affinity range.",
            )
        if previous_threshold is not None and threshold <= previous_threshold:
            _fail(
                "invalid_relationship_stage",
                f"{stage_path}.minimum_affinity",
                "Relationship stage thresholds must be strictly increasing.",
            )
        previous_threshold = threshold

    if initial < stages[0].minimum_affinity:
        _fail(
            "unmapped_initial_affinity",
            f"{path}.initial_affinity",
            "Initial affinity must map to a configured relationship stage.",
        )


def _validate_endings(
    raw_endings: object,
    world_path: str,
) -> dict[str, tuple[StoryEnding, str]]:
    endings = _require_tuple(raw_endings, f"{world_path}.endings")
    if not endings:
        _fail(
            "missing_ending",
            f"{world_path}.endings",
            "A StoryWorld must contain at least one ending.",
        )
    ending_ids: dict[str, str] = {}
    ending_by_id: dict[str, tuple[StoryEnding, str]] = {}
    for ending_index, ending in enumerate(endings):
        ending_path = f"{world_path}.endings[{ending_index}]"
        _require_instance(ending, StoryEnding, ending_path)
        _record_id(ending_ids, ending.id, f"{ending_path}.id", "StoryEnding")
        _require_text(ending.title, f"{ending_path}.title")
        _require_text(ending.summary, f"{ending_path}.summary")
        ending_by_id[ending.id] = (ending, ending_path)
    return ending_by_id


def _validate_canon_entries(
    raw_entries: object,
    world_path: str,
) -> dict[str, tuple[CanonEntry, str]]:
    entries = _require_tuple(raw_entries, f"{world_path}.canon_entries")
    canon_ids: dict[str, str] = {}
    canon_by_id: dict[str, tuple[CanonEntry, str]] = {}
    for canon_index, canon_entry in enumerate(entries):
        canon_path = f"{world_path}.canon_entries[{canon_index}]"
        _require_instance(canon_entry, CanonEntry, canon_path)
        _record_id(canon_ids, canon_entry.id, f"{canon_path}.id", "CanonEntry")
        if not isinstance(canon_entry.category, CanonCategory):
            _fail(
                "invalid_canon_category",
                f"{canon_path}.category",
                "Canon category must be fixed_fact, story_setting, or needs_verification.",
            )
        _require_text(canon_entry.statement, f"{canon_path}.statement")
        sources = _require_tuple(canon_entry.sources, f"{canon_path}.sources")
        normalized_sources: set[str] = set()
        for source_index, source in enumerate(sources):
            _require_text(source, f"{canon_path}.sources[{source_index}]")
            normalized_sources.add(source.strip())
        if (
            canon_entry.category is CanonCategory.FIXED_FACT
            and len(normalized_sources) < 2
        ):
            _fail(
                "insufficient_sources",
                f"{canon_path}.sources",
                "Fixed historical facts require at least two distinct non-empty sources.",
            )
        canon_by_id[canon_entry.id] = (canon_entry, canon_path)
    return canon_by_id


def _validate_chapters(
    raw_chapters: object,
    character_by_id: Mapping[str, Character],
    world_path: str,
) -> tuple[
    tuple[StoryChapter, ...],
    dict[str, StoryNode],
    dict[str, str],
    tuple[tuple[str, str], ...],
    tuple[tuple[str, str], ...],
]:
    chapters = _require_tuple(raw_chapters, f"{world_path}.chapters")
    if not chapters:
        _fail(
            "missing_chapter",
            f"{world_path}.chapters",
            "A StoryWorld must contain at least one chapter.",
        )

    chapter_ids: dict[str, str] = {}
    node_ids: dict[str, str] = {}
    choice_ids: dict[str, str] = {}
    node_by_id: dict[str, StoryNode] = {}
    node_paths: dict[str, str] = {}
    choice_targets: list[tuple[str, str]] = []
    terminal_endings: list[tuple[str, str]] = []

    for chapter_index, chapter in enumerate(chapters):
        chapter_path = f"{world_path}.chapters[{chapter_index}]"
        _require_instance(chapter, StoryChapter, chapter_path)
        _record_id(chapter_ids, chapter.id, f"{chapter_path}.id", "StoryChapter")
        _require_text(chapter.title, f"{chapter_path}.title")
        _require_id(chapter.entry_node_id, f"{chapter_path}.entry_node_id")
        nodes = _require_tuple(chapter.nodes, f"{chapter_path}.nodes")
        if not nodes:
            _fail(
                "missing_node",
                f"{chapter_path}.nodes",
                "A StoryChapter must contain at least one node.",
            )

        chapter_node_ids: set[str] = set()
        for node_index, node in enumerate(nodes):
            node_path = f"{chapter_path}.nodes[{node_index}]"
            _require_instance(node, StoryNode, node_path)
            _record_id(node_ids, node.id, f"{node_path}.id", "StoryNode")
            chapter_node_ids.add(node.id)
            node_by_id[node.id] = node
            node_paths[node.id] = node_path
            _require_text(node.narration, f"{node_path}.narration")
            choices = _require_tuple(node.choices, f"{node_path}.choices")
            if node.ending_id is None:
                if not choices:
                    _fail(
                        "dead_end",
                        f"{node_path}.choices",
                        "A non-terminal StoryNode must provide at least one choice.",
                    )
            else:
                _require_id(node.ending_id, f"{node_path}.ending_id")
                if choices:
                    _fail(
                        "terminal_has_choices",
                        f"{node_path}.choices",
                        "A terminal StoryNode cannot provide choices.",
                    )
                terminal_endings.append((node_path, node.ending_id))

            for choice_index, choice in enumerate(choices):
                choice_path = f"{node_path}.choices[{choice_index}]"
                _require_instance(choice, StoryChoice, choice_path)
                _record_id(choice_ids, choice.id, f"{choice_path}.id", "StoryChoice")
                _require_text(choice.label, f"{choice_path}.label")
                _require_id(choice.next_node_id, f"{choice_path}.next_node_id")
                if not isinstance(choice.is_key, bool):
                    _fail(
                        "invalid_boolean",
                        f"{choice_path}.is_key",
                        "StoryChoice is_key must be a boolean.",
                    )
                required_flags = _validate_flags(
                    choice.required_flags,
                    f"{choice_path}.required_flags",
                )
                blocked_flags = _validate_flags(
                    choice.blocked_flags,
                    f"{choice_path}.blocked_flags",
                )
                _validate_flags(choice.set_flags, f"{choice_path}.set_flags")
                overlapping_flags = set(required_flags).intersection(blocked_flags)
                if overlapping_flags:
                    _fail(
                        "conflicting_flags",
                        choice_path,
                        "Required and blocked flags cannot overlap: "
                        + ", ".join(sorted(overlapping_flags)),
                    )
                effects = _require_tuple(
                    choice.relationship_effects,
                    f"{choice_path}.relationship_effects",
                )
                for effect_index, effect in enumerate(effects):
                    _validate_relationship_effect(
                        effect,
                        character_by_id,
                        f"{choice_path}.relationship_effects[{effect_index}]",
                    )
                choice_targets.append((choice_path, choice.next_node_id))

        if chapter.entry_node_id not in chapter_node_ids:
            _fail(
                "missing_reference",
                f"{chapter_path}.entry_node_id",
                f"Chapter entry node {chapter.entry_node_id!r} must belong to this chapter.",
            )

    return (
        chapters,
        node_by_id,
        node_paths,
        tuple(choice_targets),
        tuple(terminal_endings),
    )


def _validate_relationship_effect(
    effect: object,
    character_by_id: Mapping[str, Character],
    path: str,
) -> None:
    _require_instance(effect, RelationshipEffect, path)
    _require_id(effect.character_id, f"{path}.character_id")
    character = character_by_id.get(effect.character_id)
    if character is None:
        _fail(
            "missing_reference",
            f"{path}.character_id",
            f"Relationship effect Character {effect.character_id!r} does not exist in this StoryWorld.",
        )
    affinity_delta = _require_number(effect.affinity_delta, f"{path}.affinity_delta")
    _require_text(effect.reason, f"{path}.reason")
    flags = _validate_flags(effect.set_flags, f"{path}.set_flags")
    if affinity_delta == 0 and not flags:
        _fail(
            "empty_relationship_effect",
            path,
            "Relationship effect must change affinity or set at least one relationship flag.",
        )
    relationship_range = (
        character.relationship_rules.maximum_affinity
        - character.relationship_rules.minimum_affinity
    )
    if abs(affinity_delta) > relationship_range:
        _fail(
            "invalid_relationship_range",
            f"{path}.affinity_delta",
            "Relationship effect delta cannot exceed the Character affinity range.",
        )


def _validate_story_graph(
    entry_node_id: str,
    node_by_id: Mapping[str, StoryNode],
    node_paths: Mapping[str, str],
    endings: Mapping[str, tuple[StoryEnding, str]],
    world_path: str,
) -> None:
    reachable: set[str] = set()
    pending = [entry_node_id]
    while pending:
        node_id = pending.pop()
        if node_id in reachable:
            continue
        reachable.add(node_id)
        pending.extend(
            choice.next_node_id
            for choice in node_by_id[node_id].choices
            if choice.next_node_id not in reachable
        )

    for node_id, node_path in node_paths.items():
        if node_id not in reachable:
            _fail(
                "unreachable_node",
                f"{node_path}.id",
                f"StoryNode {node_id!r} is unreachable from the StoryWorld entry node.",
            )

    reachable_endings = {
        node_by_id[node_id].ending_id
        for node_id in reachable
        if node_by_id[node_id].ending_id is not None
    }
    if not reachable_endings:
        _fail(
            "unreachable_ending",
            f"{world_path}.endings",
            "The StoryWorld entry node must reach at least one ending.",
        )
    for ending_id, (_, ending_path) in endings.items():
        if ending_id not in reachable_endings:
            _fail(
                "unreferenced_ending",
                f"{ending_path}.id",
                f"StoryEnding {ending_id!r} is not referenced by a reachable terminal node.",
            )


def _validate_flags(raw_flags: object, path: str) -> tuple[str, ...]:
    flags = _require_tuple(raw_flags, path)
    seen: set[str] = set()
    for flag_index, flag in enumerate(flags):
        flag_path = f"{path}[{flag_index}]"
        _require_id(flag, flag_path)
        if flag in seen:
            _fail(
                "duplicate_flag",
                flag_path,
                f"Flag {flag!r} appears more than once.",
            )
        seen.add(flag)
    return flags


def _record_id(
    seen: dict[str, str],
    value: object,
    path: str,
    entity_name: str,
) -> str:
    identifier = _require_id(value, path)
    previous_path = seen.get(identifier)
    if previous_path is not None:
        _fail(
            "duplicate_id",
            path,
            f"{entity_name} ID {identifier!r} duplicates {previous_path}.",
        )
    seen[identifier] = path
    return identifier


def _require_instance(value: object, expected_type: type, path: str) -> None:
    if not isinstance(value, expected_type):
        _fail(
            "invalid_type",
            path,
            f"Expected {expected_type.__name__}, received {type(value).__name__}.",
        )


def _require_tuple(value: object, path: str) -> tuple:
    if not isinstance(value, tuple):
        _fail(
            "invalid_collection",
            path,
            "System story collections must use immutable tuples.",
        )
    return value


def _require_id(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        _fail(
            "invalid_id",
            path,
            "IDs and flags must be non-empty strings without surrounding whitespace.",
        )
    return value


def _require_text(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        _fail(
            "invalid_text",
            path,
            "Required text must be a non-empty string.",
        )
    return value


def _require_number(value: object, path: str) -> int | float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or (isinstance(value, float) and not isfinite(value))
    ):
        _fail(
            "invalid_number",
            path,
            "Relationship values must be finite numbers.",
        )
    return value


def _fail(code: str, path: str, message: str) -> NoReturn:
    raise StoryContentValidationError(code, path, message)


__all__ = [
    "CanonCategory",
    "CanonEntry",
    "Character",
    "PlayerRole",
    "PublicationStatus",
    "RelationshipEffect",
    "RelationshipRules",
    "RelationshipStage",
    "StoryChapter",
    "StoryChoice",
    "StoryContentValidationError",
    "StoryEnding",
    "StoryNode",
    "StoryWorld",
    "StoryWorldRegistry",
]
