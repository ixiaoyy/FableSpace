from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from math import isfinite
from types import MappingProxyType
from typing import Iterable, Mapping, NoReturn, TypeAlias
from urllib.parse import urlparse


class PublicationStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CanonCategory(str, Enum):
    FIXED_FACT = "fixed_fact"
    STORY_SETTING = "story_setting"
    NEEDS_VERIFICATION = "needs_verification"


class StoryKind(str, Enum):
    GROWTH = "growth"
    ENSEMBLE = "ensemble"


class StoryExperienceMode(str, Enum):
    CHARACTER_GROWTH = "character_growth"
    NARRATIVE_STORY = "narrative_story"


class StoryReplayPolicy(str, Enum):
    REPLAYABLE = "replayable"
    PERMANENT_RESULT = "permanent_result"


class StoryChoicePresentation(str, Enum):
    INLINE = "inline"
    PERMANENT_DECISION = "permanent_decision"


class PostEndingMessageMode(str, Enum):
    LLM = "llm"
    UNANSWERED = "unanswered"
    DISABLED = "disabled"


class StoryNodePresentationKind(str, Enum):
    CHARACTER = "character"
    SYSTEM = "system"
    ACTION = "action"


class DecisionPredicateKind(str, Enum):
    STORY_FLAG = "story_flag"
    INVESTIGATION_RESULT = "investigation_result"
    PLAYER_COMMITMENT = "player_commitment"
    CURRENT_CHARACTER = "current_character"
    RELATIONSHIP_RANGE = "relationship_range"


PredicateValue: TypeAlias = bool | int | float | str


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
    identity: str
    age: str
    social_position: str
    motive: str
    secret: str
    voice: str
    relationship_rules: RelationshipRules
    portrait_url: str | None = None


@dataclass(frozen=True, slots=True)
class PlayerRole:
    id: str
    story_world_id: str
    name: str
    age: str
    social_position: str
    gender: str
    background: str
    entry_reason: str
    character_visible_information: tuple[str, ...]
    avatar_url: str | None = None


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
    presentation_kind: StoryNodePresentationKind
    character_id: str | None
    narration: str
    choice_presentation: StoryChoicePresentation
    confirmation_prompt: str | None
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
    post_ending_message_mode: PostEndingMessageMode
    unanswered_reply: str | None
    post_ending_context: str | None


@dataclass(frozen=True, slots=True)
class StoryCharacterParticipation:
    character_id: str
    current_situation: str
    opening_line: str
    can_start: bool
    location_label: str
    arrival_narration: str
    visit_required_flags: tuple[str, ...]
    visit_set_flags: tuple[str, ...]
    knowledge_entry_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class HistoricalReferenceUnlock:
    entry_id: str
    required_flags: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class DecisionPredicate:
    kind: DecisionPredicateKind
    flag: str | None = None
    expected: bool | None = None
    result_id: str | None = None
    expected_value: PredicateValue | None = None
    action_id: str | None = None
    character_id: str | None = None
    minimum_affinity: int | float | None = None
    maximum_affinity: int | float | None = None


@dataclass(frozen=True, slots=True)
class DecisionRule:
    id: str
    conditions: tuple[DecisionPredicate, ...]
    next_node_id: str
    set_flags: tuple[str, ...]
    relationship_effects: tuple[RelationshipEffect, ...]
    reason: str


@dataclass(frozen=True, slots=True)
class CharacterDecision:
    id: str
    character_id: str
    trigger_node_id: str
    rules: tuple[DecisionRule, ...]


@dataclass(frozen=True, slots=True)
class ReviewedStory:
    id: str
    title: str
    summary: str
    kind: StoryKind
    experience_mode: StoryExperienceMode
    replay_policy: StoryReplayPolicy
    publication_status: PublicationStatus
    focus_character_id: str | None
    participants: tuple[StoryCharacterParticipation, ...]
    historical_reference_unlocks: tuple[HistoricalReferenceUnlock, ...]
    entry_chapter_id: str
    chapters: tuple[StoryChapter, ...]
    endings: tuple[StoryEnding, ...]
    character_decisions: tuple[CharacterDecision, ...]


@dataclass(frozen=True, slots=True)
class StoryWorld:
    id: str
    title: str
    summary: str
    genre: str
    publication_status: PublicationStatus
    content_version: str
    player_roles: tuple[PlayerRole, ...]
    characters: tuple[Character, ...]
    stories: tuple[ReviewedStory, ...]
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

    player_roles = _require_tuple(story_world.player_roles, f"{path}.player_roles")
    if not player_roles:
        _fail(
            "missing_player_role",
            f"{path}.player_roles",
            "A StoryWorld must define at least one PlayerRole.",
        )
    for player_role_index, player_role in enumerate(player_roles):
        player_role_path = f"{path}.player_roles[{player_role_index}]"
        _require_instance(player_role, PlayerRole, player_role_path)
        _validate_player_role(player_role, story_world.id, player_role_path)
        _record_id(
            registry_player_role_ids,
            player_role.id,
            f"{player_role_path}.id",
            "PlayerRole",
        )
        if (
            story_world.publication_status is PublicationStatus.PUBLISHED
            and len(player_roles) > 1
            and player_role.avatar_url is None
        ):
            _fail(
                "missing_player_role_avatar",
                f"{player_role_path}.avatar_url",
                "Published multi-role StoryWorlds must provide an avatar for every PlayerRole.",
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

    canon_entries = _validate_canon_entries(story_world.canon_entries, path)
    stories = _require_tuple(story_world.stories, f"{path}.stories")
    if not stories:
        _fail(
            "missing_story",
            f"{path}.stories",
            "A StoryWorld must contain at least one ReviewedStory.",
        )
    story_ids: dict[str, str] = {}
    published_story_count = 0
    for story_index, story in enumerate(stories):
        story_path = f"{path}.stories[{story_index}]"
        _require_instance(story, ReviewedStory, story_path)
        _record_id(story_ids, story.id, f"{story_path}.id", "ReviewedStory")
        _validate_reviewed_story(
            story,
            character_by_id,
            canon_entries,
            story_path,
        )
        if story.publication_status is PublicationStatus.PUBLISHED:
            published_story_count += 1

    if story_world.publication_status is PublicationStatus.PUBLISHED:
        if published_story_count == 0:
            _fail(
                "missing_published_story",
                f"{path}.stories",
                "A published StoryWorld must contain at least one published ReviewedStory.",
            )
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
    _require_text(player_role.age, f"{path}.age")
    _require_text(player_role.social_position, f"{path}.social_position")
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
    if player_role.avatar_url is not None:
        avatar_url = _require_text(player_role.avatar_url, f"{path}.avatar_url")
        parsed = urlparse(avatar_url)
        if parsed.scheme != "https" or not parsed.netloc:
            _fail(
                "invalid_media_url",
                f"{path}.avatar_url",
                "PlayerRole avatar URLs must be absolute HTTPS URLs.",
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
    _require_text(character.identity, f"{path}.identity")
    _require_text(character.age, f"{path}.age")
    _require_text(character.social_position, f"{path}.social_position")
    _require_text(character.motive, f"{path}.motive")
    _require_text(character.secret, f"{path}.secret")
    _require_text(character.voice, f"{path}.voice")
    _require_instance(
        character.relationship_rules,
        RelationshipRules,
        f"{path}.relationship_rules",
    )
    _validate_relationship_rules(character.relationship_rules, f"{path}.relationship_rules")
    if character.portrait_url is not None:
        portrait_url = _require_text(character.portrait_url, f"{path}.portrait_url")
        parsed = urlparse(portrait_url)
        if parsed.scheme != "https" or not parsed.netloc:
            _fail(
                "invalid_media_url",
                f"{path}.portrait_url",
                "Character portrait URLs must be absolute HTTPS URLs.",
            )


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


def _validate_reviewed_story(
    story: ReviewedStory,
    character_by_id: Mapping[str, Character],
    canon_entries: Mapping[str, tuple[CanonEntry, str]],
    path: str,
) -> None:
    """Validate one story as an isolated graph inside its containing world."""
    _require_id(story.id, f"{path}.id")
    _require_text(story.title, f"{path}.title")
    _require_text(story.summary, f"{path}.summary")
    if not isinstance(story.kind, StoryKind):
        _fail(
            "invalid_story_kind",
            f"{path}.kind",
            "ReviewedStory kind must be growth or ensemble.",
        )
    if not isinstance(story.experience_mode, StoryExperienceMode):
        _fail(
            "invalid_story_experience_mode",
            f"{path}.experience_mode",
            "ReviewedStory experience mode must be character_growth or narrative_story.",
        )
    if not isinstance(story.replay_policy, StoryReplayPolicy):
        _fail(
            "invalid_story_replay_policy",
            f"{path}.replay_policy",
            "ReviewedStory replay policy must be replayable or permanent_result.",
        )
    if not isinstance(story.publication_status, PublicationStatus):
        _fail(
            "invalid_publication_status",
            f"{path}.publication_status",
            "Publication status must be draft, published, or archived.",
        )

    participants = _require_tuple(story.participants, f"{path}.participants")
    if not participants:
        _fail(
            "missing_story_participant",
            f"{path}.participants",
            "A ReviewedStory must contain at least one Character participant.",
        )
    participant_ids: dict[str, str] = {}
    start_participant_count = 0
    for participant_index, participant in enumerate(participants):
        participant_path = f"{path}.participants[{participant_index}]"
        _require_instance(participant, StoryCharacterParticipation, participant_path)
        participant_id = _record_id(
            participant_ids,
            participant.character_id,
            f"{participant_path}.character_id",
            "StoryCharacterParticipation",
        )
        if participant_id not in character_by_id:
            _fail(
                "missing_reference",
                f"{participant_path}.character_id",
                f"Participant Character {participant_id!r} does not exist in this StoryWorld.",
            )
        _require_text(participant.current_situation, f"{participant_path}.current_situation")
        _require_text(participant.opening_line, f"{participant_path}.opening_line")
        if not isinstance(participant.can_start, bool):
            _fail(
                "invalid_boolean",
                f"{participant_path}.can_start",
                "StoryCharacterParticipation can_start must be a boolean.",
            )
        _require_text(participant.location_label, f"{participant_path}.location_label")
        _require_text(
            participant.arrival_narration,
            f"{participant_path}.arrival_narration",
        )
        _validate_flags(
            participant.visit_required_flags,
            f"{participant_path}.visit_required_flags",
        )
        _validate_flags(
            participant.visit_set_flags,
            f"{participant_path}.visit_set_flags",
        )
        knowledge_entry_ids = _validate_unique_ids(
            participant.knowledge_entry_ids,
            f"{participant_path}.knowledge_entry_ids",
            "CanonEntry",
        )
        for knowledge_index, entry_id in enumerate(knowledge_entry_ids):
            if entry_id not in canon_entries:
                _fail(
                    "missing_reference",
                    f"{participant_path}.knowledge_entry_ids[{knowledge_index}]",
                    f"Participant knowledge CanonEntry {entry_id!r} does not exist in this StoryWorld.",
                )
        if participant.can_start:
            start_participant_count += 1

    if (
        story.publication_status is PublicationStatus.PUBLISHED
        and start_participant_count == 0
    ):
        _fail(
            "missing_start_participant",
            f"{path}.participants",
            "A published ReviewedStory must allow at least one participant to start it.",
        )

    if story.kind is StoryKind.GROWTH:
        focus_character_id = _require_id(
            story.focus_character_id,
            f"{path}.focus_character_id",
        )
        if focus_character_id not in participant_ids:
            _fail(
                "missing_reference",
                f"{path}.focus_character_id",
                f"Growth story focus Character {focus_character_id!r} must participate in the story.",
            )
    elif story.kind is StoryKind.ENSEMBLE and story.focus_character_id is not None:
        _fail(
            "invalid_focus_character",
            f"{path}.focus_character_id",
            "Ensemble stories cannot define a focus Character.",
        )

    unlocks = _require_tuple(
        story.historical_reference_unlocks,
        f"{path}.historical_reference_unlocks",
    )
    unlock_entry_ids: dict[str, str] = {}
    for unlock_index, unlock in enumerate(unlocks):
        unlock_path = f"{path}.historical_reference_unlocks[{unlock_index}]"
        _require_instance(unlock, HistoricalReferenceUnlock, unlock_path)
        entry_id = _record_id(
            unlock_entry_ids,
            unlock.entry_id,
            f"{unlock_path}.entry_id",
            "HistoricalReferenceUnlock",
        )
        canon = canon_entries.get(entry_id)
        if canon is None:
            _fail(
                "missing_reference",
                f"{unlock_path}.entry_id",
                f"Historical reference CanonEntry {entry_id!r} does not exist in this StoryWorld.",
            )
        if canon[0].category is CanonCategory.STORY_SETTING:
            _fail(
                "invalid_historical_reference_category",
                f"{unlock_path}.entry_id",
                "Historical references can include only fixed_fact or needs_verification CanonEntry values.",
            )
        _validate_flags(unlock.required_flags, f"{unlock_path}.required_flags")

    _require_id(story.entry_chapter_id, f"{path}.entry_chapter_id")
    endings = _validate_endings(story.endings, path)
    (
        chapters,
        node_by_id,
        node_paths,
        choice_targets,
        terminal_endings,
    ) = _validate_chapters(
        story.chapters,
        character_by_id,
        participant_ids,
        path,
    )

    chapter_by_id = {chapter.id: chapter for chapter in chapters}
    entry_chapter = chapter_by_id.get(story.entry_chapter_id)
    if entry_chapter is None:
        _fail(
            "missing_reference",
            f"{path}.entry_chapter_id",
            f"Entry chapter {story.entry_chapter_id!r} does not exist in this ReviewedStory.",
        )

    for choice_path, next_node_id, choice_presentation in choice_targets:
        if next_node_id not in node_by_id:
            _fail(
                "missing_reference",
                f"{choice_path}.next_node_id",
                f"Next node {next_node_id!r} does not exist in this ReviewedStory.",
            )
        if (
            choice_presentation is StoryChoicePresentation.PERMANENT_DECISION
            and node_by_id[next_node_id].ending_id is None
        ):
            _fail(
                "permanent_decision_not_terminal",
                f"{choice_path}.next_node_id",
                "Every permanent_decision choice must lead directly to a terminal StoryNode.",
            )

    ending_ids = set(endings)
    for node_path, ending_id in terminal_endings:
        if ending_id not in ending_ids:
            _fail(
                "missing_reference",
                f"{node_path}.ending_id",
                f"Ending {ending_id!r} does not exist in this ReviewedStory.",
            )

    decision_targets = _validate_character_decisions(
        story.character_decisions,
        node_by_id,
        character_by_id,
        participant_ids,
        path,
    )
    _validate_story_graph(
        entry_chapter.entry_node_id,
        node_by_id,
        node_paths,
        endings,
        decision_targets,
        path,
    )


def _validate_character_decisions(
    raw_decisions: object,
    node_by_id: Mapping[str, StoryNode],
    character_by_id: Mapping[str, Character],
    participant_ids: Mapping[str, str],
    story_path: str,
) -> Mapping[str, tuple[str, ...]]:
    """Validate ordered CharacterDecision rules and return their graph edges."""
    decisions = _require_tuple(raw_decisions, f"{story_path}.character_decisions")
    decision_ids: dict[str, str] = {}
    trigger_paths: dict[str, str] = {}
    decision_targets: dict[str, tuple[str, ...]] = {}
    for decision_index, decision in enumerate(decisions):
        decision_path = f"{story_path}.character_decisions[{decision_index}]"
        _require_instance(decision, CharacterDecision, decision_path)
        _record_id(decision_ids, decision.id, f"{decision_path}.id", "CharacterDecision")
        character_id = _require_id(decision.character_id, f"{decision_path}.character_id")
        if character_id not in participant_ids:
            _fail(
                "missing_reference",
                f"{decision_path}.character_id",
                f"Decision Character {character_id!r} does not participate in this ReviewedStory.",
            )
        trigger_node_id = _require_id(
            decision.trigger_node_id,
            f"{decision_path}.trigger_node_id",
        )
        previous_trigger_path = trigger_paths.get(trigger_node_id)
        if previous_trigger_path is not None:
            _fail(
                "duplicate_decision_trigger",
                f"{decision_path}.trigger_node_id",
                f"Trigger node {trigger_node_id!r} already has a CharacterDecision at {previous_trigger_path}.",
            )
        trigger_node = node_by_id.get(trigger_node_id)
        if trigger_node is None:
            _fail(
                "missing_reference",
                f"{decision_path}.trigger_node_id",
                f"Trigger node {trigger_node_id!r} does not exist in this ReviewedStory.",
            )
        if (
            trigger_node.presentation_kind is not StoryNodePresentationKind.CHARACTER
            or trigger_node.character_id != character_id
        ):
            _fail(
                "invalid_decision_context",
                f"{decision_path}.trigger_node_id",
                "A CharacterDecision trigger must be a Character node bound to the deciding Character.",
            )
        trigger_paths[trigger_node_id] = decision_path

        rules = _require_tuple(decision.rules, f"{decision_path}.rules")
        if not rules:
            _fail(
                "missing_decision_rule",
                f"{decision_path}.rules",
                "A CharacterDecision must contain at least one ordered rule.",
            )
        rule_ids: dict[str, str] = {}
        targets: list[str] = []
        for rule_index, rule in enumerate(rules):
            rule_path = f"{decision_path}.rules[{rule_index}]"
            _require_instance(rule, DecisionRule, rule_path)
            _record_id(rule_ids, rule.id, f"{rule_path}.id", "DecisionRule")
            conditions = _require_tuple(rule.conditions, f"{rule_path}.conditions")
            is_fallback = rule_index == len(rules) - 1
            if is_fallback and conditions:
                _fail(
                    "missing_decision_fallback",
                    f"{rule_path}.conditions",
                    "The final DecisionRule must be an unconditional fallback.",
                )
            if not is_fallback and not conditions:
                _fail(
                    "shadowed_decision_rule",
                    f"{rule_path}.conditions",
                    "Only the final DecisionRule can be unconditional.",
                )
            for condition_index, condition in enumerate(conditions):
                _validate_decision_predicate(
                    condition,
                    character_by_id,
                    participant_ids,
                    f"{rule_path}.conditions[{condition_index}]",
                )

            next_node_id = _require_id(rule.next_node_id, f"{rule_path}.next_node_id")
            if next_node_id not in node_by_id:
                _fail(
                    "missing_reference",
                    f"{rule_path}.next_node_id",
                    f"Decision result node {next_node_id!r} does not exist in this ReviewedStory.",
                )
            _validate_flags(rule.set_flags, f"{rule_path}.set_flags")
            effects = _require_tuple(
                rule.relationship_effects,
                f"{rule_path}.relationship_effects",
            )
            for effect_index, effect in enumerate(effects):
                _validate_relationship_effect(
                    effect,
                    character_by_id,
                    participant_ids,
                    f"{rule_path}.relationship_effects[{effect_index}]",
                )
            _require_text(rule.reason, f"{rule_path}.reason")
            targets.append(next_node_id)
        decision_targets[trigger_node_id] = tuple(targets)
    return MappingProxyType(decision_targets)


def _validate_decision_predicate(
    predicate: object,
    character_by_id: Mapping[str, Character],
    participant_ids: Mapping[str, str],
    path: str,
) -> None:
    """Validate one predicate against the closed set of supported fact readers."""
    _require_instance(predicate, DecisionPredicate, path)
    if not isinstance(predicate.kind, DecisionPredicateKind):
        _fail(
            "invalid_decision_predicate",
            f"{path}.kind",
            "Decision predicate kind is not supported.",
        )

    fields_by_kind = {
        DecisionPredicateKind.STORY_FLAG: frozenset({"flag", "expected"}),
        DecisionPredicateKind.INVESTIGATION_RESULT: frozenset(
            {"result_id", "expected_value"}
        ),
        DecisionPredicateKind.PLAYER_COMMITMENT: frozenset({"action_id", "expected"}),
        DecisionPredicateKind.CURRENT_CHARACTER: frozenset({"character_id"}),
        DecisionPredicateKind.RELATIONSHIP_RANGE: frozenset(
            {"character_id", "minimum_affinity", "maximum_affinity"}
        ),
    }
    all_fields = (
        "flag",
        "expected",
        "result_id",
        "expected_value",
        "action_id",
        "character_id",
        "minimum_affinity",
        "maximum_affinity",
    )
    allowed_fields = fields_by_kind[predicate.kind]
    for field_name in all_fields:
        if field_name not in allowed_fields and getattr(predicate, field_name) is not None:
            _fail(
                "invalid_decision_predicate",
                f"{path}.{field_name}",
                f"Field {field_name!r} is not allowed for {predicate.kind.value!r} predicates.",
            )

    if predicate.kind is DecisionPredicateKind.STORY_FLAG:
        _require_id(predicate.flag, f"{path}.flag")
        _require_boolean(predicate.expected, f"{path}.expected")
        return
    if predicate.kind is DecisionPredicateKind.INVESTIGATION_RESULT:
        _require_id(predicate.result_id, f"{path}.result_id")
        _require_predicate_value(predicate.expected_value, f"{path}.expected_value")
        return
    if predicate.kind is DecisionPredicateKind.PLAYER_COMMITMENT:
        _require_id(predicate.action_id, f"{path}.action_id")
        _require_boolean(predicate.expected, f"{path}.expected")
        return

    character_id = _require_id(predicate.character_id, f"{path}.character_id")
    if character_id not in participant_ids:
        _fail(
            "missing_reference",
            f"{path}.character_id",
            f"Predicate Character {character_id!r} does not participate in this ReviewedStory.",
        )
    if predicate.kind is DecisionPredicateKind.CURRENT_CHARACTER:
        return

    minimum = (
        None
        if predicate.minimum_affinity is None
        else _require_number(predicate.minimum_affinity, f"{path}.minimum_affinity")
    )
    maximum = (
        None
        if predicate.maximum_affinity is None
        else _require_number(predicate.maximum_affinity, f"{path}.maximum_affinity")
    )
    if minimum is None and maximum is None:
        _fail(
            "invalid_relationship_range",
            path,
            "A relationship_range predicate must define at least one affinity boundary.",
        )
    if minimum is not None and maximum is not None and minimum > maximum:
        _fail(
            "invalid_relationship_range",
            path,
            "Predicate minimum affinity cannot exceed maximum affinity.",
        )
    relationship_rules = character_by_id[character_id].relationship_rules
    if minimum is not None and not (
        relationship_rules.minimum_affinity
        <= minimum
        <= relationship_rules.maximum_affinity
    ):
        _fail(
            "invalid_relationship_range",
            f"{path}.minimum_affinity",
            "Predicate minimum affinity must fall within the Character relationship range.",
        )
    if maximum is not None and not (
        relationship_rules.minimum_affinity
        <= maximum
        <= relationship_rules.maximum_affinity
    ):
        _fail(
            "invalid_relationship_range",
            f"{path}.maximum_affinity",
            "Predicate maximum affinity must fall within the Character relationship range.",
        )


def _validate_endings(
    raw_endings: object,
    story_path: str,
) -> dict[str, tuple[StoryEnding, str]]:
    endings = _require_tuple(raw_endings, f"{story_path}.endings")
    if not endings:
        _fail(
            "missing_ending",
            f"{story_path}.endings",
            "A ReviewedStory must contain at least one ending.",
        )
    ending_ids: dict[str, str] = {}
    ending_by_id: dict[str, tuple[StoryEnding, str]] = {}
    for ending_index, ending in enumerate(endings):
        ending_path = f"{story_path}.endings[{ending_index}]"
        _require_instance(ending, StoryEnding, ending_path)
        _record_id(ending_ids, ending.id, f"{ending_path}.id", "StoryEnding")
        _require_text(ending.title, f"{ending_path}.title")
        _require_text(ending.summary, f"{ending_path}.summary")
        if not isinstance(ending.post_ending_message_mode, PostEndingMessageMode):
            _fail(
                "invalid_post_ending_message_mode",
                f"{ending_path}.post_ending_message_mode",
                "Post-ending message mode must be llm, unanswered, or disabled.",
            )
        if ending.post_ending_message_mode is PostEndingMessageMode.UNANSWERED:
            _require_text(ending.unanswered_reply, f"{ending_path}.unanswered_reply")
        elif ending.unanswered_reply is not None:
            _fail(
                "unexpected_unanswered_reply",
                f"{ending_path}.unanswered_reply",
                "Only unanswered endings can define an unanswered reply.",
            )
        if ending.post_ending_message_mode is PostEndingMessageMode.LLM:
            if ending.post_ending_context is not None:
                _require_trimmed_text(
                    ending.post_ending_context,
                    f"{ending_path}.post_ending_context",
                )
        elif ending.post_ending_context is not None:
            _fail(
                "unexpected_post_ending_context",
                f"{ending_path}.post_ending_context",
                "Only llm endings can define post-ending prompt context.",
            )
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
    participant_ids: Mapping[str, str],
    story_path: str,
) -> tuple[
    tuple[StoryChapter, ...],
    dict[str, StoryNode],
    dict[str, str],
    tuple[tuple[str, str, StoryChoicePresentation], ...],
    tuple[tuple[str, str], ...],
]:
    chapters = _require_tuple(raw_chapters, f"{story_path}.chapters")
    if not chapters:
        _fail(
            "missing_chapter",
            f"{story_path}.chapters",
            "A ReviewedStory must contain at least one chapter.",
        )

    chapter_ids: dict[str, str] = {}
    node_ids: dict[str, str] = {}
    choice_ids: dict[str, str] = {}
    node_by_id: dict[str, StoryNode] = {}
    node_paths: dict[str, str] = {}
    choice_targets: list[tuple[str, str, StoryChoicePresentation]] = []
    terminal_endings: list[tuple[str, str]] = []

    for chapter_index, chapter in enumerate(chapters):
        chapter_path = f"{story_path}.chapters[{chapter_index}]"
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
            if not isinstance(node.presentation_kind, StoryNodePresentationKind):
                _fail(
                    "invalid_node_presentation",
                    f"{node_path}.presentation_kind",
                    "StoryNode presentation kind must be character, system, or action.",
                )
            if node.presentation_kind is StoryNodePresentationKind.CHARACTER:
                character_id = _require_id(node.character_id, f"{node_path}.character_id")
                if character_id not in participant_ids:
                    _fail(
                        "missing_reference",
                        f"{node_path}.character_id",
                        f"Node Character {character_id!r} does not participate in this ReviewedStory.",
                    )
            elif node.character_id is not None:
                _fail(
                    "invalid_node_character",
                    f"{node_path}.character_id",
                    "System and action nodes cannot be bound to a Character.",
                )
            _require_text(node.narration, f"{node_path}.narration")
            if not isinstance(node.choice_presentation, StoryChoicePresentation):
                _fail(
                    "invalid_choice_presentation",
                    f"{node_path}.choice_presentation",
                    "StoryNode choice presentation must be inline or permanent_decision.",
                )
            if node.choice_presentation is StoryChoicePresentation.PERMANENT_DECISION:
                if node.ending_id is not None:
                    _fail(
                        "invalid_choice_presentation",
                        f"{node_path}.choice_presentation",
                        "A terminal StoryNode cannot use permanent_decision presentation.",
                    )
                _require_text(
                    node.confirmation_prompt,
                    f"{node_path}.confirmation_prompt",
                )
            elif node.confirmation_prompt is not None:
                _fail(
                    "unexpected_confirmation_prompt",
                    f"{node_path}.confirmation_prompt",
                    "Inline StoryNodes cannot define a confirmation prompt.",
                )
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
                if (
                    node.choice_presentation
                    is StoryChoicePresentation.PERMANENT_DECISION
                    and not choice.is_key
                ):
                    _fail(
                        "permanent_decision_requires_key_choice",
                        f"{choice_path}.is_key",
                        "Every permanent_decision choice must be a key choice.",
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
                        participant_ids,
                        f"{choice_path}.relationship_effects[{effect_index}]",
                    )
                choice_targets.append(
                    (choice_path, choice.next_node_id, node.choice_presentation)
                )

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
    participant_ids: Mapping[str, str],
    path: str,
) -> None:
    """Validate one effect against both its StoryWorld and ReviewedStory scope."""

    _require_instance(effect, RelationshipEffect, path)
    _require_id(effect.character_id, f"{path}.character_id")
    character = character_by_id.get(effect.character_id)
    if character is None:
        _fail(
            "missing_reference",
            f"{path}.character_id",
            f"Relationship effect Character {effect.character_id!r} does not exist in this StoryWorld.",
        )
    if effect.character_id not in participant_ids:
        _fail(
            "missing_reference",
            f"{path}.character_id",
            f"Relationship effect Character {effect.character_id!r} does not participate in this ReviewedStory.",
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
    decision_targets: Mapping[str, tuple[str, ...]],
    story_path: str,
) -> None:
    reachable: set[str] = set()
    pending = [entry_node_id]
    while pending:
        node_id = pending.pop()
        if node_id in reachable:
            continue
        reachable.add(node_id)
        next_node_ids = tuple(
            choice.next_node_id for choice in node_by_id[node_id].choices
        ) + decision_targets.get(node_id, ())
        pending.extend(
            next_node_id
            for next_node_id in next_node_ids
            if next_node_id not in reachable
        )

    for node_id, node_path in node_paths.items():
        if node_id not in reachable:
            _fail(
                "unreachable_node",
                f"{node_path}.id",
                f"StoryNode {node_id!r} is unreachable from the ReviewedStory entry node.",
            )

    reachable_endings = {
        node_by_id[node_id].ending_id
        for node_id in reachable
        if node_by_id[node_id].ending_id is not None
    }
    if not reachable_endings:
        _fail(
            "unreachable_ending",
            f"{story_path}.endings",
            "The ReviewedStory entry node must reach at least one ending.",
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


def _validate_unique_ids(
    raw_ids: object,
    path: str,
    entity_name: str,
) -> tuple[str, ...]:
    """Validate raw_ids at path as unique IDs for entity_name and return their order."""
    identifiers = _require_tuple(raw_ids, path)
    seen: dict[str, str] = {}
    validated: list[str] = []
    for identifier_index, identifier in enumerate(identifiers):
        identifier_path = f"{path}[{identifier_index}]"
        validated.append(
            _record_id(seen, identifier, identifier_path, entity_name)
        )
    return tuple(validated)


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


def _require_trimmed_text(value: object, path: str) -> str:
    """Validate value at path as trimmed non-empty text and return it unchanged."""
    text = _require_text(value, path)
    if text != text.strip():
        _fail(
            "invalid_text",
            path,
            "Text must not contain surrounding whitespace.",
        )
    return text


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


def _require_boolean(value: object, path: str) -> bool:
    """Require a real boolean rather than a truthy scalar."""
    if not isinstance(value, bool):
        _fail(
            "invalid_boolean",
            path,
            "Decision predicate expected values must be booleans.",
        )
    return value


def _require_predicate_value(value: object, path: str) -> PredicateValue:
    """Require a finite JSON scalar supported by investigation predicates."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return _require_text(value, path)
    if isinstance(value, (int, float)):
        return _require_number(value, path)
    _fail(
        "invalid_predicate_value",
        path,
        "Investigation result predicates require a boolean, number, or non-empty string.",
    )


def _fail(code: str, path: str, message: str) -> NoReturn:
    raise StoryContentValidationError(code, path, message)


__all__ = [
    "CanonCategory",
    "CanonEntry",
    "Character",
    "CharacterDecision",
    "DecisionPredicate",
    "DecisionPredicateKind",
    "DecisionRule",
    "HistoricalReferenceUnlock",
    "PlayerRole",
    "PostEndingMessageMode",
    "PredicateValue",
    "PublicationStatus",
    "RelationshipEffect",
    "RelationshipRules",
    "RelationshipStage",
    "ReviewedStory",
    "StoryChapter",
    "StoryCharacterParticipation",
    "StoryChoice",
    "StoryChoicePresentation",
    "StoryContentValidationError",
    "StoryEnding",
    "StoryExperienceMode",
    "StoryKind",
    "StoryNode",
    "StoryNodePresentationKind",
    "StoryReplayPolicy",
    "StoryWorld",
    "StoryWorldRegistry",
]
