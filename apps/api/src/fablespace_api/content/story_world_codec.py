"""Explicit JSON codec for administrator-managed StoryWorld documents."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from math import isfinite
from typing import Any, NoReturn, TypeVar

from ..domain.story_world import (
    CanonCategory,
    CanonEntry,
    Character,
    CharacterDecision,
    DecisionPredicate,
    DecisionPredicateKind,
    DecisionRule,
    HistoricalReferenceUnlock,
    PlayerRole,
    PostEndingMessageMode,
    PredicateValue,
    PublicationStatus,
    RelationshipEffect,
    RelationshipRules,
    RelationshipStage,
    ReviewedStory,
    StoryChapter,
    StoryCharacterParticipation,
    StoryChoice,
    StoryChoicePresentation,
    StoryContentValidationError,
    StoryEnding,
    StoryExperienceMode,
    StoryKind,
    StoryNode,
    StoryNodePresentationKind,
    StoryReplayPolicy,
    StoryWorld,
)

_EnumValue = TypeVar(
    "_EnumValue",
    PublicationStatus,
    CanonCategory,
    StoryKind,
    StoryExperienceMode,
    StoryReplayPolicy,
    StoryChoicePresentation,
    PostEndingMessageMode,
    StoryNodePresentationKind,
    DecisionPredicateKind,
)


def story_world_to_payload(story_world: StoryWorld) -> dict[str, Any]:
    """Serialize one immutable StoryWorld without leaking dataclass internals."""
    return {
        "id": story_world.id,
        "title": story_world.title,
        "summary": story_world.summary,
        "genre": story_world.genre,
        "publication_status": story_world.publication_status.value,
        "content_version": story_world.content_version,
        "player_roles": [_player_role_to_payload(role) for role in story_world.player_roles],
        "characters": [_character_to_payload(character) for character in story_world.characters],
        "stories": [_story_to_payload(story) for story in story_world.stories],
        "canon_entries": [_canon_entry_to_payload(entry) for entry in story_world.canon_entries],
    }


def _player_role_to_payload(role: PlayerRole) -> dict[str, Any]:
    """Serialize one system-reviewed PlayerRole."""
    return {
        "id": role.id,
        "story_world_id": role.story_world_id,
        "name": role.name,
        "age": role.age,
        "social_position": role.social_position,
        "gender": role.gender,
        "background": role.background,
        "entry_reason": role.entry_reason,
        "character_visible_information": list(role.character_visible_information),
        "avatar_url": role.avatar_url,
    }


def _character_to_payload(character: Character) -> dict[str, Any]:
    """Serialize stable Character fields shared across ReviewedStory values."""
    rules = character.relationship_rules
    return {
        "id": character.id,
        "story_world_id": character.story_world_id,
        "name": character.name,
        "identity": character.identity,
        "age": character.age,
        "social_position": character.social_position,
        "motive": character.motive,
        "secret": character.secret,
        "voice": character.voice,
        "portrait_url": character.portrait_url,
        "relationship_rules": {
            "minimum_affinity": rules.minimum_affinity,
            "maximum_affinity": rules.maximum_affinity,
            "initial_affinity": rules.initial_affinity,
            "natural_turn_max_delta": rules.natural_turn_max_delta,
            "stages": [
                {
                    "id": stage.id,
                    "label": stage.label,
                    "minimum_affinity": stage.minimum_affinity,
                    "attitude": stage.attitude,
                }
                for stage in rules.stages
            ],
        },
    }


def _story_to_payload(story: ReviewedStory) -> dict[str, Any]:
    """Serialize one independently reviewed story and its scoped graph."""
    return {
        "id": story.id,
        "title": story.title,
        "summary": story.summary,
        "kind": story.kind.value,
        "experience_mode": story.experience_mode.value,
        "replay_policy": story.replay_policy.value,
        "publication_status": story.publication_status.value,
        "focus_character_id": story.focus_character_id,
        "participants": [
            {
                "character_id": participant.character_id,
                "current_situation": participant.current_situation,
                "opening_line": participant.opening_line,
                "can_start": participant.can_start,
                "location_label": participant.location_label,
                "arrival_narration": participant.arrival_narration,
                "visit_required_flags": list(participant.visit_required_flags),
                "visit_set_flags": list(participant.visit_set_flags),
                "knowledge_entry_ids": list(participant.knowledge_entry_ids),
            }
            for participant in story.participants
        ],
        "historical_reference_unlocks": [
            {
                "entry_id": unlock.entry_id,
                "required_flags": list(unlock.required_flags),
            }
            for unlock in story.historical_reference_unlocks
        ],
        "entry_chapter_id": story.entry_chapter_id,
        "chapters": [_chapter_to_payload(chapter) for chapter in story.chapters],
        "endings": [
            {
                "id": ending.id,
                "title": ending.title,
                "summary": ending.summary,
                "post_ending_message_mode": ending.post_ending_message_mode.value,
                "unanswered_reply": ending.unanswered_reply,
                "post_ending_context": ending.post_ending_context,
            }
            for ending in story.endings
        ],
        "character_decisions": [
            _character_decision_to_payload(decision)
            for decision in story.character_decisions
        ],
    }


def _chapter_to_payload(chapter: StoryChapter) -> dict[str, Any]:
    """Serialize one chapter while preserving declared node order."""
    return {
        "id": chapter.id,
        "title": chapter.title,
        "entry_node_id": chapter.entry_node_id,
        "nodes": [
            {
                "id": node.id,
                "presentation_kind": node.presentation_kind.value,
                "character_id": node.character_id,
                "narration": node.narration,
                "choice_presentation": node.choice_presentation.value,
                "confirmation_prompt": node.confirmation_prompt,
                "choices": [_choice_to_payload(choice) for choice in node.choices],
                "ending_id": node.ending_id,
            }
            for node in chapter.nodes
        ],
    }


def _choice_to_payload(choice: StoryChoice) -> dict[str, Any]:
    """Serialize one reviewed story choice and deterministic effects."""
    return {
        "id": choice.id,
        "label": choice.label,
        "next_node_id": choice.next_node_id,
        "is_key": choice.is_key,
        "required_flags": list(choice.required_flags),
        "blocked_flags": list(choice.blocked_flags),
        "set_flags": list(choice.set_flags),
        "relationship_effects": [
            _relationship_effect_to_payload(effect)
            for effect in choice.relationship_effects
        ],
    }


def _relationship_effect_to_payload(effect: RelationshipEffect) -> dict[str, Any]:
    """Serialize one audited long-term relationship effect."""
    return {
        "character_id": effect.character_id,
        "affinity_delta": effect.affinity_delta,
        "reason": effect.reason,
        "set_flags": list(effect.set_flags),
    }


def _character_decision_to_payload(decision: CharacterDecision) -> dict[str, Any]:
    """Serialize one ordered deterministic CharacterDecision."""
    return {
        "id": decision.id,
        "character_id": decision.character_id,
        "trigger_node_id": decision.trigger_node_id,
        "rules": [
            {
                "id": rule.id,
                "conditions": [
                    _decision_predicate_to_payload(condition)
                    for condition in rule.conditions
                ],
                "next_node_id": rule.next_node_id,
                "set_flags": list(rule.set_flags),
                "relationship_effects": [
                    _relationship_effect_to_payload(effect)
                    for effect in rule.relationship_effects
                ],
                "reason": rule.reason,
            }
            for rule in decision.rules
        ],
    }


def _decision_predicate_to_payload(predicate: DecisionPredicate) -> dict[str, Any]:
    """Serialize only fields allowed by the predicate's closed shape."""
    payload: dict[str, Any] = {"kind": predicate.kind.value}
    if predicate.kind is DecisionPredicateKind.STORY_FLAG:
        payload.update(flag=predicate.flag, expected=predicate.expected)
    elif predicate.kind is DecisionPredicateKind.INVESTIGATION_RESULT:
        payload.update(
            result_id=predicate.result_id,
            expected_value=predicate.expected_value,
        )
    elif predicate.kind is DecisionPredicateKind.PLAYER_COMMITMENT:
        payload.update(action_id=predicate.action_id, expected=predicate.expected)
    elif predicate.kind is DecisionPredicateKind.CURRENT_CHARACTER:
        payload.update(character_id=predicate.character_id)
    elif predicate.kind is DecisionPredicateKind.RELATIONSHIP_RANGE:
        payload.update(character_id=predicate.character_id)
        if predicate.minimum_affinity is not None:
            payload["minimum_affinity"] = predicate.minimum_affinity
        if predicate.maximum_affinity is not None:
            payload["maximum_affinity"] = predicate.maximum_affinity
    return payload


def _canon_entry_to_payload(entry: CanonEntry) -> dict[str, Any]:
    """Serialize one world-level canon entry."""
    return {
        "id": entry.id,
        "category": entry.category.value,
        "statement": entry.statement,
        "sources": list(entry.sources),
    }


def story_world_from_payload(raw_payload: object) -> StoryWorld:
    """Decode a target-shape JSON document without legacy-field fallback."""
    payload = _object(
        raw_payload,
        "story_world",
        required=(
            "id",
            "title",
            "summary",
            "genre",
            "publication_status",
            "content_version",
            "player_roles",
            "characters",
            "stories",
            "canon_entries",
        ),
    )
    story_world_id = _text(payload["id"], "story_world.id")
    return StoryWorld(
        id=story_world_id,
        title=_text(payload["title"], "story_world.title"),
        summary=_text(payload["summary"], "story_world.summary"),
        genre=_text(payload["genre"], "story_world.genre"),
        publication_status=_enum(
            PublicationStatus,
            payload["publication_status"],
            "story_world.publication_status",
        ),
        content_version=_text(payload["content_version"], "story_world.content_version"),
        player_roles=tuple(
            _player_role(item, index)
            for index, item in enumerate(
                _sequence(payload["player_roles"], "story_world.player_roles")
            )
        ),
        characters=tuple(
            _character(item, index)
            for index, item in enumerate(
                _sequence(payload["characters"], "story_world.characters")
            )
        ),
        stories=tuple(
            _story(item, index)
            for index, item in enumerate(
                _sequence(payload["stories"], "story_world.stories")
            )
        ),
        canon_entries=tuple(
            _canon_entry(item, index)
            for index, item in enumerate(
                _sequence(payload["canon_entries"], "story_world.canon_entries")
            )
        ),
    )


def _player_role(raw_value: object, index: int) -> PlayerRole:
    path = f"story_world.player_roles[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "story_world_id",
            "name",
            "age",
            "social_position",
            "gender",
            "background",
            "entry_reason",
            "character_visible_information",
        ),
        optional=("avatar_url",),
    )
    return PlayerRole(
        id=_text(value["id"], f"{path}.id"),
        story_world_id=_text(value["story_world_id"], f"{path}.story_world_id"),
        name=_text(value["name"], f"{path}.name"),
        age=_text(value["age"], f"{path}.age"),
        social_position=_text(value["social_position"], f"{path}.social_position"),
        gender=_text(value["gender"], f"{path}.gender"),
        background=_text(value["background"], f"{path}.background"),
        entry_reason=_text(value["entry_reason"], f"{path}.entry_reason"),
        character_visible_information=_text_tuple(
            value["character_visible_information"],
            f"{path}.character_visible_information",
        ),
        avatar_url=_optional_text(value.get("avatar_url"), f"{path}.avatar_url"),
    )


def _character(raw_value: object, index: int) -> Character:
    path = f"story_world.characters[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "story_world_id",
            "name",
            "identity",
            "age",
            "social_position",
            "motive",
            "secret",
            "voice",
            "relationship_rules",
        ),
        optional=("portrait_url",),
    )
    rules_path = f"{path}.relationship_rules"
    rules = _object(
        value["relationship_rules"],
        rules_path,
        required=(
            "minimum_affinity",
            "maximum_affinity",
            "initial_affinity",
            "natural_turn_max_delta",
            "stages",
        ),
    )
    return Character(
        id=_text(value["id"], f"{path}.id"),
        story_world_id=_text(value["story_world_id"], f"{path}.story_world_id"),
        name=_text(value["name"], f"{path}.name"),
        identity=_text(value["identity"], f"{path}.identity"),
        age=_text(value["age"], f"{path}.age"),
        social_position=_text(value["social_position"], f"{path}.social_position"),
        motive=_text(value["motive"], f"{path}.motive"),
        secret=_text(value["secret"], f"{path}.secret"),
        voice=_text(value["voice"], f"{path}.voice"),
        relationship_rules=RelationshipRules(
            minimum_affinity=_number(
                rules["minimum_affinity"], f"{rules_path}.minimum_affinity"
            ),
            maximum_affinity=_number(
                rules["maximum_affinity"], f"{rules_path}.maximum_affinity"
            ),
            initial_affinity=_number(
                rules["initial_affinity"], f"{rules_path}.initial_affinity"
            ),
            natural_turn_max_delta=_number(
                rules["natural_turn_max_delta"],
                f"{rules_path}.natural_turn_max_delta",
            ),
            stages=tuple(
                _relationship_stage(stage, stage_index, rules_path)
                for stage_index, stage in enumerate(
                    _sequence(rules["stages"], f"{rules_path}.stages")
                )
            ),
        ),
        portrait_url=_optional_text(value.get("portrait_url"), f"{path}.portrait_url"),
    )


def _relationship_stage(
    raw_value: object,
    index: int,
    rules_path: str,
) -> RelationshipStage:
    path = f"{rules_path}.stages[{index}]"
    value = _object(
        raw_value,
        path,
        required=("id", "label", "minimum_affinity", "attitude"),
    )
    return RelationshipStage(
        id=_text(value["id"], f"{path}.id"),
        label=_text(value["label"], f"{path}.label"),
        minimum_affinity=_number(
            value["minimum_affinity"], f"{path}.minimum_affinity"
        ),
        attitude=_text(value["attitude"], f"{path}.attitude"),
    )


def _story(raw_value: object, index: int) -> ReviewedStory:
    """Decode the indexed story object into an immutable ReviewedStory."""
    path = f"story_world.stories[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "title",
            "summary",
            "kind",
            "experience_mode",
            "replay_policy",
            "publication_status",
            "focus_character_id",
            "participants",
            "historical_reference_unlocks",
            "entry_chapter_id",
            "chapters",
            "endings",
            "character_decisions",
        ),
    )
    return ReviewedStory(
        id=_text(value["id"], f"{path}.id"),
        title=_text(value["title"], f"{path}.title"),
        summary=_text(value["summary"], f"{path}.summary"),
        kind=_enum(StoryKind, value["kind"], f"{path}.kind"),
        experience_mode=_enum(
            StoryExperienceMode,
            value["experience_mode"],
            f"{path}.experience_mode",
        ),
        replay_policy=_enum(
            StoryReplayPolicy,
            value["replay_policy"],
            f"{path}.replay_policy",
        ),
        publication_status=_enum(
            PublicationStatus,
            value["publication_status"],
            f"{path}.publication_status",
        ),
        focus_character_id=_optional_text(
            value["focus_character_id"], f"{path}.focus_character_id"
        ),
        participants=tuple(
            _story_participant(item, participant_index, path)
            for participant_index, item in enumerate(
                _sequence(value["participants"], f"{path}.participants")
            )
        ),
        historical_reference_unlocks=tuple(
            _historical_reference_unlock(item, unlock_index, path)
            for unlock_index, item in enumerate(
                _sequence(
                    value["historical_reference_unlocks"],
                    f"{path}.historical_reference_unlocks",
                )
            )
        ),
        entry_chapter_id=_text(value["entry_chapter_id"], f"{path}.entry_chapter_id"),
        chapters=tuple(
            _chapter(item, chapter_index, path)
            for chapter_index, item in enumerate(
                _sequence(value["chapters"], f"{path}.chapters")
            )
        ),
        endings=tuple(
            _ending(item, ending_index, path)
            for ending_index, item in enumerate(
                _sequence(value["endings"], f"{path}.endings")
            )
        ),
        character_decisions=tuple(
            _character_decision(item, decision_index, path)
            for decision_index, item in enumerate(
                _sequence(
                    value["character_decisions"], f"{path}.character_decisions"
                )
            )
        ),
    )


def _story_participant(
    raw_value: object,
    index: int,
    story_path: str,
) -> StoryCharacterParticipation:
    """Decode one indexed story participant and its reviewed entry text."""
    path = f"{story_path}.participants[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "character_id",
            "current_situation",
            "opening_line",
            "can_start",
            "location_label",
            "arrival_narration",
            "visit_required_flags",
            "visit_set_flags",
            "knowledge_entry_ids",
        ),
    )
    return StoryCharacterParticipation(
        character_id=_text(value["character_id"], f"{path}.character_id"),
        current_situation=_text(
            value["current_situation"], f"{path}.current_situation"
        ),
        opening_line=_text(value["opening_line"], f"{path}.opening_line"),
        can_start=_boolean(value["can_start"], f"{path}.can_start"),
        location_label=_text(value["location_label"], f"{path}.location_label"),
        arrival_narration=_text(
            value["arrival_narration"], f"{path}.arrival_narration"
        ),
        visit_required_flags=_text_tuple(
            value["visit_required_flags"], f"{path}.visit_required_flags"
        ),
        visit_set_flags=_text_tuple(
            value["visit_set_flags"], f"{path}.visit_set_flags"
        ),
        knowledge_entry_ids=_text_tuple(
            value["knowledge_entry_ids"], f"{path}.knowledge_entry_ids"
        ),
    )


def _historical_reference_unlock(
    raw_value: object,
    index: int,
    story_path: str,
) -> HistoricalReferenceUnlock:
    """Decode one indexed story unlock and return its authored entry and flag IDs."""
    path = f"{story_path}.historical_reference_unlocks[{index}]"
    value = _object(
        raw_value,
        path,
        required=("entry_id", "required_flags"),
    )
    return HistoricalReferenceUnlock(
        entry_id=_text(value["entry_id"], f"{path}.entry_id"),
        required_flags=_text_tuple(
            value["required_flags"], f"{path}.required_flags"
        ),
    )


def _chapter(raw_value: object, index: int, story_path: str) -> StoryChapter:
    path = f"{story_path}.chapters[{index}]"
    value = _object(
        raw_value,
        path,
        required=("id", "title", "entry_node_id", "nodes"),
    )
    return StoryChapter(
        id=_text(value["id"], f"{path}.id"),
        title=_text(value["title"], f"{path}.title"),
        entry_node_id=_text(value["entry_node_id"], f"{path}.entry_node_id"),
        nodes=tuple(
            _node(item, node_index, path)
            for node_index, item in enumerate(
                _sequence(value["nodes"], f"{path}.nodes")
            )
        ),
    )


def _node(raw_value: object, index: int, chapter_path: str) -> StoryNode:
    path = f"{chapter_path}.nodes[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "presentation_kind",
            "character_id",
            "narration",
            "choice_presentation",
            "confirmation_prompt",
            "choices",
            "ending_id",
        ),
    )
    return StoryNode(
        id=_text(value["id"], f"{path}.id"),
        presentation_kind=_enum(
            StoryNodePresentationKind,
            value["presentation_kind"],
            f"{path}.presentation_kind",
        ),
        character_id=_optional_text(value["character_id"], f"{path}.character_id"),
        narration=_text(value["narration"], f"{path}.narration"),
        choice_presentation=_enum(
            StoryChoicePresentation,
            value["choice_presentation"],
            f"{path}.choice_presentation",
        ),
        confirmation_prompt=_optional_text(
            value["confirmation_prompt"], f"{path}.confirmation_prompt"
        ),
        choices=tuple(
            _choice(item, choice_index, path)
            for choice_index, item in enumerate(
                _sequence(value["choices"], f"{path}.choices")
            )
        ),
        ending_id=_optional_text(value["ending_id"], f"{path}.ending_id"),
    )


def _choice(raw_value: object, index: int, node_path: str) -> StoryChoice:
    path = f"{node_path}.choices[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "label",
            "next_node_id",
            "is_key",
            "required_flags",
            "blocked_flags",
            "set_flags",
            "relationship_effects",
        ),
    )
    return StoryChoice(
        id=_text(value["id"], f"{path}.id"),
        label=_text(value["label"], f"{path}.label"),
        next_node_id=_text(value["next_node_id"], f"{path}.next_node_id"),
        is_key=_boolean(value["is_key"], f"{path}.is_key"),
        required_flags=_text_tuple(value["required_flags"], f"{path}.required_flags"),
        blocked_flags=_text_tuple(value["blocked_flags"], f"{path}.blocked_flags"),
        set_flags=_text_tuple(value["set_flags"], f"{path}.set_flags"),
        relationship_effects=tuple(
            _relationship_effect(item, effect_index, f"{path}.relationship_effects")
            for effect_index, item in enumerate(
                _sequence(
                    value["relationship_effects"], f"{path}.relationship_effects"
                )
            )
        ),
    )


def _relationship_effect(
    raw_value: object,
    index: int,
    collection_path: str,
) -> RelationshipEffect:
    path = f"{collection_path}[{index}]"
    value = _object(
        raw_value,
        path,
        required=("character_id", "affinity_delta", "reason", "set_flags"),
    )
    return RelationshipEffect(
        character_id=_text(value["character_id"], f"{path}.character_id"),
        affinity_delta=_number(value["affinity_delta"], f"{path}.affinity_delta"),
        reason=_text(value["reason"], f"{path}.reason"),
        set_flags=_text_tuple(value["set_flags"], f"{path}.set_flags"),
    )


def _ending(raw_value: object, index: int, story_path: str) -> StoryEnding:
    path = f"{story_path}.endings[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "title",
            "summary",
            "post_ending_message_mode",
            "unanswered_reply",
            "post_ending_context",
        ),
    )
    return StoryEnding(
        id=_text(value["id"], f"{path}.id"),
        title=_text(value["title"], f"{path}.title"),
        summary=_text(value["summary"], f"{path}.summary"),
        post_ending_message_mode=_enum(
            PostEndingMessageMode,
            value["post_ending_message_mode"],
            f"{path}.post_ending_message_mode",
        ),
        unanswered_reply=_optional_text(
            value["unanswered_reply"], f"{path}.unanswered_reply"
        ),
        post_ending_context=_optional_trimmed_text(
            value["post_ending_context"], f"{path}.post_ending_context"
        ),
    )


def _character_decision(
    raw_value: object,
    index: int,
    story_path: str,
) -> CharacterDecision:
    """Decode one indexed deterministic decision within a story."""
    path = f"{story_path}.character_decisions[{index}]"
    value = _object(
        raw_value,
        path,
        required=("id", "character_id", "trigger_node_id", "rules"),
    )
    return CharacterDecision(
        id=_text(value["id"], f"{path}.id"),
        character_id=_text(value["character_id"], f"{path}.character_id"),
        trigger_node_id=_text(value["trigger_node_id"], f"{path}.trigger_node_id"),
        rules=tuple(
            _decision_rule(item, rule_index, path)
            for rule_index, item in enumerate(
                _sequence(value["rules"], f"{path}.rules")
            )
        ),
    )


def _decision_rule(raw_value: object, index: int, decision_path: str) -> DecisionRule:
    """Decode one indexed rule while preserving its declared order."""
    path = f"{decision_path}.rules[{index}]"
    value = _object(
        raw_value,
        path,
        required=(
            "id",
            "conditions",
            "next_node_id",
            "set_flags",
            "relationship_effects",
            "reason",
        ),
    )
    return DecisionRule(
        id=_text(value["id"], f"{path}.id"),
        conditions=tuple(
            _decision_predicate(item, condition_index, path)
            for condition_index, item in enumerate(
                _sequence(value["conditions"], f"{path}.conditions")
            )
        ),
        next_node_id=_text(value["next_node_id"], f"{path}.next_node_id"),
        set_flags=_text_tuple(value["set_flags"], f"{path}.set_flags"),
        relationship_effects=tuple(
            _relationship_effect(item, effect_index, f"{path}.relationship_effects")
            for effect_index, item in enumerate(
                _sequence(
                    value["relationship_effects"], f"{path}.relationship_effects"
                )
            )
        ),
        reason=_text(value["reason"], f"{path}.reason"),
    )


def _decision_predicate(
    raw_value: object,
    index: int,
    rule_path: str,
) -> DecisionPredicate:
    """Decode one indexed predicate using only its kind-specific fields."""
    path = f"{rule_path}.conditions[{index}]"
    raw_mapping = _mapping(raw_value, path)
    if "kind" not in raw_mapping:
        _invalid(path, "缺少必需字段: kind。")
    kind = _enum(DecisionPredicateKind, raw_mapping["kind"], f"{path}.kind")

    if kind is DecisionPredicateKind.STORY_FLAG:
        value = _object(raw_value, path, required=("kind", "flag", "expected"))
        return DecisionPredicate(
            kind=kind,
            flag=_text(value["flag"], f"{path}.flag"),
            expected=_boolean(value["expected"], f"{path}.expected"),
        )
    if kind is DecisionPredicateKind.INVESTIGATION_RESULT:
        value = _object(
            raw_value,
            path,
            required=("kind", "result_id", "expected_value"),
        )
        return DecisionPredicate(
            kind=kind,
            result_id=_text(value["result_id"], f"{path}.result_id"),
            expected_value=_predicate_value(
                value["expected_value"], f"{path}.expected_value"
            ),
        )
    if kind is DecisionPredicateKind.PLAYER_COMMITMENT:
        value = _object(raw_value, path, required=("kind", "action_id", "expected"))
        return DecisionPredicate(
            kind=kind,
            action_id=_text(value["action_id"], f"{path}.action_id"),
            expected=_boolean(value["expected"], f"{path}.expected"),
        )
    if kind is DecisionPredicateKind.CURRENT_CHARACTER:
        value = _object(raw_value, path, required=("kind", "character_id"))
        return DecisionPredicate(
            kind=kind,
            character_id=_text(value["character_id"], f"{path}.character_id"),
        )

    value = _object(
        raw_value,
        path,
        required=("kind", "character_id"),
        optional=("minimum_affinity", "maximum_affinity"),
    )
    return DecisionPredicate(
        kind=kind,
        character_id=_text(value["character_id"], f"{path}.character_id"),
        minimum_affinity=(
            None
            if "minimum_affinity" not in value
            else _number(value["minimum_affinity"], f"{path}.minimum_affinity")
        ),
        maximum_affinity=(
            None
            if "maximum_affinity" not in value
            else _number(value["maximum_affinity"], f"{path}.maximum_affinity")
        ),
    )


def _canon_entry(raw_value: object, index: int) -> CanonEntry:
    path = f"story_world.canon_entries[{index}]"
    value = _object(
        raw_value,
        path,
        required=("id", "category", "statement", "sources"),
    )
    return CanonEntry(
        id=_text(value["id"], f"{path}.id"),
        category=_enum(CanonCategory, value["category"], f"{path}.category"),
        statement=_text(value["statement"], f"{path}.statement"),
        sources=_text_tuple(value["sources"], f"{path}.sources"),
    )


def _object(
    value: object,
    path: str,
    *,
    required: tuple[str, ...],
    optional: tuple[str, ...] = (),
) -> Mapping[str, object]:
    """Require an object with exactly the declared target-schema fields."""
    mapping = _mapping(value, path)
    missing = [field for field in required if field not in mapping]
    if missing:
        _invalid(path, "缺少必需字段: " + ", ".join(missing) + "。")
    allowed = set(required).union(optional)
    unknown = [key for key in mapping if not isinstance(key, str) or key not in allowed]
    if unknown:
        _invalid(path, "包含未支持字段: " + ", ".join(repr(key) for key in unknown) + "。")
    return mapping


def _mapping(value: object, path: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        _invalid(path, "必须是对象。")
    return value


def _sequence(value: object, path: str) -> Sequence[object]:
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        _invalid(path, "必须是数组。")
    return value


def _text(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        _invalid(path, "不能为空。")
    return value


def _optional_text(value: object, path: str) -> str | None:
    if value is None:
        return None
    return _text(value, path)


def _optional_trimmed_text(value: object, path: str) -> str | None:
    """Decode nullable text at path and return it only when non-empty and trimmed."""
    if value is None:
        return None
    text = _text(value, path)
    if text != text.strip():
        _invalid(path, "不能包含首尾空白。")
    return text


def _text_tuple(value: object, path: str) -> tuple[str, ...]:
    return tuple(
        _text(item, f"{path}[{index}]")
        for index, item in enumerate(_sequence(value, path))
    )


def _number(value: object, path: str) -> int | float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or (isinstance(value, float) and not isfinite(value))
    ):
        _invalid(path, "必须是有限数字。")
    return value


def _predicate_value(value: object, path: str) -> PredicateValue:
    """Decode the finite JSON scalar accepted by investigation predicates."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return _text(value, path)
    if isinstance(value, (int, float)):
        return _number(value, path)
    _invalid(path, "必须是布尔值、有限数字或非空字符串。")


def _boolean(value: object, path: str) -> bool:
    if not isinstance(value, bool):
        _invalid(path, "必须是布尔值。")
    return value


def _enum(
    enum_type: type[_EnumValue],
    value: object,
    path: str,
) -> _EnumValue:
    raw_value = _text(value, path)
    try:
        return enum_type(raw_value)
    except ValueError:
        _invalid(path, "不在允许范围内。")


def _invalid(path: str, message: str) -> NoReturn:
    raise StoryContentValidationError("invalid_payload", path, message)


__all__ = ["story_world_from_payload", "story_world_to_payload"]
