"""Explicit JSON codec for administrator-managed StoryWorld documents."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, TypeVar

from ..domain.story_world import (
    CanonCategory,
    CanonEntry,
    Character,
    PlayerRole,
    PublicationStatus,
    RelationshipEffect,
    RelationshipRules,
    RelationshipStage,
    StoryChapter,
    StoryChoice,
    StoryContentValidationError,
    StoryEnding,
    StoryNode,
    StoryWorld,
)

_EnumValue = TypeVar("_EnumValue", PublicationStatus, CanonCategory)


def story_world_to_payload(story_world: StoryWorld) -> dict[str, Any]:
    """Serialize one immutable StoryWorld without leaking dataclass internals."""
    return {
        "id": story_world.id,
        "title": story_world.title,
        "summary": story_world.summary,
        "genre": story_world.genre,
        "publication_status": story_world.publication_status.value,
        "content_version": story_world.content_version,
        "entry_chapter_id": story_world.entry_chapter_id,
        "player_roles": [
            {
                "id": role.id,
                "story_world_id": role.story_world_id,
                "name": role.name,
                "age": role.age,
                "social_position": role.social_position,
                "gender": role.gender,
                "background": role.background,
                "entry_reason": role.entry_reason,
                "character_visible_information": list(
                    role.character_visible_information
                ),
                "avatar_url": role.avatar_url,
            }
            for role in story_world.player_roles
        ],
        "characters": [
            {
                "id": character.id,
                "story_world_id": character.story_world_id,
                "name": character.name,
                "identity": character.identity,
                "age": character.age,
                "social_position": character.social_position,
                "motive": character.motive,
                "secret": character.secret,
                "voice": character.voice,
                "current_situation": character.current_situation,
                "opening_line": character.opening_line,
                "portrait_url": character.portrait_url,
                "relationship_rules": {
                    "minimum_affinity": (
                        character.relationship_rules.minimum_affinity
                    ),
                    "maximum_affinity": (
                        character.relationship_rules.maximum_affinity
                    ),
                    "initial_affinity": (
                        character.relationship_rules.initial_affinity
                    ),
                    "natural_turn_max_delta": (
                        character.relationship_rules.natural_turn_max_delta
                    ),
                    "stages": [
                        {
                            "id": stage.id,
                            "label": stage.label,
                            "minimum_affinity": stage.minimum_affinity,
                            "attitude": stage.attitude,
                        }
                        for stage in character.relationship_rules.stages
                    ],
                },
            }
            for character in story_world.characters
        ],
        "chapters": [
            {
                "id": chapter.id,
                "title": chapter.title,
                "entry_node_id": chapter.entry_node_id,
                "nodes": [
                    {
                        "id": node.id,
                        "narration": node.narration,
                        "ending_id": node.ending_id,
                        "choices": [
                            {
                                "id": choice.id,
                                "label": choice.label,
                                "next_node_id": choice.next_node_id,
                                "is_key": choice.is_key,
                                "required_flags": list(choice.required_flags),
                                "blocked_flags": list(choice.blocked_flags),
                                "set_flags": list(choice.set_flags),
                                "relationship_effects": [
                                    {
                                        "character_id": effect.character_id,
                                        "affinity_delta": effect.affinity_delta,
                                        "reason": effect.reason,
                                        "set_flags": list(effect.set_flags),
                                    }
                                    for effect in choice.relationship_effects
                                ],
                            }
                            for choice in node.choices
                        ],
                    }
                    for node in chapter.nodes
                ],
            }
            for chapter in story_world.chapters
        ],
        "endings": [
            {
                "id": ending.id,
                "title": ending.title,
                "summary": ending.summary,
            }
            for ending in story_world.endings
        ],
        "canon_entries": [
            {
                "id": entry.id,
                "category": entry.category.value,
                "statement": entry.statement,
                "sources": list(entry.sources),
            }
            for entry in story_world.canon_entries
        ],
    }


def story_world_from_payload(raw_payload: object) -> StoryWorld:
    """Decode untrusted JSON into the strict StoryWorld domain structure."""
    payload = _mapping(raw_payload, "story_world")
    story_world_id = _text(payload.get("id"), "story_world.id")
    return StoryWorld(
        id=story_world_id,
        title=_text(payload.get("title"), "story_world.title"),
        summary=_text(payload.get("summary"), "story_world.summary"),
        genre=_text(payload.get("genre"), "story_world.genre"),
        publication_status=_enum(
            PublicationStatus,
            payload.get("publication_status"),
            "story_world.publication_status",
        ),
        content_version=_text(
            payload.get("content_version"),
            "story_world.content_version",
        ),
        entry_chapter_id=_text(
            payload.get("entry_chapter_id"),
            "story_world.entry_chapter_id",
        ),
        player_roles=tuple(
            _player_role(item, index)
            for index, item in enumerate(
                _sequence(payload.get("player_roles"), "story_world.player_roles")
            )
        ),
        characters=tuple(
            _character(item, index)
            for index, item in enumerate(
                _sequence(payload.get("characters"), "story_world.characters")
            )
        ),
        chapters=tuple(
            _chapter(item, index)
            for index, item in enumerate(
                _sequence(payload.get("chapters"), "story_world.chapters")
            )
        ),
        endings=tuple(
            _ending(item, index)
            for index, item in enumerate(
                _sequence(payload.get("endings"), "story_world.endings")
            )
        ),
        canon_entries=tuple(
            _canon_entry(item, index)
            for index, item in enumerate(
                _sequence(
                    payload.get("canon_entries"),
                    "story_world.canon_entries",
                )
            )
        ),
    )


def _player_role(raw_value: object, index: int) -> PlayerRole:
    path = f"story_world.player_roles[{index}]"
    value = _mapping(raw_value, path)
    return PlayerRole(
        id=_text(value.get("id"), f"{path}.id"),
        story_world_id=_text(
            value.get("story_world_id"),
            f"{path}.story_world_id",
        ),
        name=_text(value.get("name"), f"{path}.name"),
        age=_text(value.get("age"), f"{path}.age"),
        social_position=_text(
            value.get("social_position"),
            f"{path}.social_position",
        ),
        gender=_text(value.get("gender"), f"{path}.gender"),
        background=_text(value.get("background"), f"{path}.background"),
        entry_reason=_text(value.get("entry_reason"), f"{path}.entry_reason"),
        character_visible_information=_text_tuple(
            value.get("character_visible_information"),
            f"{path}.character_visible_information",
        ),
        avatar_url=_optional_text(value.get("avatar_url"), f"{path}.avatar_url"),
    )


def _character(raw_value: object, index: int) -> Character:
    path = f"story_world.characters[{index}]"
    value = _mapping(raw_value, path)
    rules_path = f"{path}.relationship_rules"
    rules = _mapping(value.get("relationship_rules"), rules_path)
    return Character(
        id=_text(value.get("id"), f"{path}.id"),
        story_world_id=_text(
            value.get("story_world_id"),
            f"{path}.story_world_id",
        ),
        name=_text(value.get("name"), f"{path}.name"),
        identity=_text(value.get("identity"), f"{path}.identity"),
        age=_text(value.get("age"), f"{path}.age"),
        social_position=_text(
            value.get("social_position"),
            f"{path}.social_position",
        ),
        motive=_text(value.get("motive"), f"{path}.motive"),
        secret=_text(value.get("secret"), f"{path}.secret"),
        voice=_text(value.get("voice"), f"{path}.voice"),
        current_situation=_text(
            value.get("current_situation"),
            f"{path}.current_situation",
        ),
        opening_line=_text(value.get("opening_line"), f"{path}.opening_line"),
        relationship_rules=RelationshipRules(
            minimum_affinity=_number(
                rules.get("minimum_affinity"),
                f"{rules_path}.minimum_affinity",
            ),
            maximum_affinity=_number(
                rules.get("maximum_affinity"),
                f"{rules_path}.maximum_affinity",
            ),
            initial_affinity=_number(
                rules.get("initial_affinity"),
                f"{rules_path}.initial_affinity",
            ),
            natural_turn_max_delta=_number(
                rules.get("natural_turn_max_delta"),
                f"{rules_path}.natural_turn_max_delta",
            ),
            stages=tuple(
                _relationship_stage(stage, stage_index, rules_path)
                for stage_index, stage in enumerate(
                    _sequence(rules.get("stages"), f"{rules_path}.stages")
                )
            ),
        ),
        portrait_url=_optional_text(
            value.get("portrait_url"),
            f"{path}.portrait_url",
        ),
    )


def _relationship_stage(
    raw_value: object,
    index: int,
    rules_path: str,
) -> RelationshipStage:
    path = f"{rules_path}.stages[{index}]"
    value = _mapping(raw_value, path)
    return RelationshipStage(
        id=_text(value.get("id"), f"{path}.id"),
        label=_text(value.get("label"), f"{path}.label"),
        minimum_affinity=_number(
            value.get("minimum_affinity"),
            f"{path}.minimum_affinity",
        ),
        attitude=_text(value.get("attitude"), f"{path}.attitude"),
    )


def _chapter(raw_value: object, index: int) -> StoryChapter:
    path = f"story_world.chapters[{index}]"
    value = _mapping(raw_value, path)
    return StoryChapter(
        id=_text(value.get("id"), f"{path}.id"),
        title=_text(value.get("title"), f"{path}.title"),
        entry_node_id=_text(
            value.get("entry_node_id"),
            f"{path}.entry_node_id",
        ),
        nodes=tuple(
            _node(item, node_index, path)
            for node_index, item in enumerate(
                _sequence(value.get("nodes"), f"{path}.nodes")
            )
        ),
    )


def _node(raw_value: object, index: int, chapter_path: str) -> StoryNode:
    path = f"{chapter_path}.nodes[{index}]"
    value = _mapping(raw_value, path)
    return StoryNode(
        id=_text(value.get("id"), f"{path}.id"),
        narration=_text(value.get("narration"), f"{path}.narration"),
        choices=tuple(
            _choice(item, choice_index, path)
            for choice_index, item in enumerate(
                _sequence(value.get("choices"), f"{path}.choices")
            )
        ),
        ending_id=_optional_text(value.get("ending_id"), f"{path}.ending_id"),
    )


def _choice(raw_value: object, index: int, node_path: str) -> StoryChoice:
    path = f"{node_path}.choices[{index}]"
    value = _mapping(raw_value, path)
    return StoryChoice(
        id=_text(value.get("id"), f"{path}.id"),
        label=_text(value.get("label"), f"{path}.label"),
        next_node_id=_text(
            value.get("next_node_id"),
            f"{path}.next_node_id",
        ),
        is_key=_boolean(value.get("is_key"), f"{path}.is_key"),
        required_flags=_text_tuple(
            value.get("required_flags"),
            f"{path}.required_flags",
        ),
        blocked_flags=_text_tuple(
            value.get("blocked_flags"),
            f"{path}.blocked_flags",
        ),
        set_flags=_text_tuple(value.get("set_flags"), f"{path}.set_flags"),
        relationship_effects=tuple(
            _relationship_effect(item, effect_index, path)
            for effect_index, item in enumerate(
                _sequence(
                    value.get("relationship_effects"),
                    f"{path}.relationship_effects",
                )
            )
        ),
    )


def _relationship_effect(
    raw_value: object,
    index: int,
    choice_path: str,
) -> RelationshipEffect:
    path = f"{choice_path}.relationship_effects[{index}]"
    value = _mapping(raw_value, path)
    return RelationshipEffect(
        character_id=_text(
            value.get("character_id"),
            f"{path}.character_id",
        ),
        affinity_delta=_number(
            value.get("affinity_delta"),
            f"{path}.affinity_delta",
        ),
        reason=_text(value.get("reason"), f"{path}.reason"),
        set_flags=_text_tuple(value.get("set_flags"), f"{path}.set_flags"),
    )


def _ending(raw_value: object, index: int) -> StoryEnding:
    path = f"story_world.endings[{index}]"
    value = _mapping(raw_value, path)
    return StoryEnding(
        id=_text(value.get("id"), f"{path}.id"),
        title=_text(value.get("title"), f"{path}.title"),
        summary=_text(value.get("summary"), f"{path}.summary"),
    )


def _canon_entry(raw_value: object, index: int) -> CanonEntry:
    path = f"story_world.canon_entries[{index}]"
    value = _mapping(raw_value, path)
    return CanonEntry(
        id=_text(value.get("id"), f"{path}.id"),
        category=_enum(
            CanonCategory,
            value.get("category"),
            f"{path}.category",
        ),
        statement=_text(value.get("statement"), f"{path}.statement"),
        sources=_text_tuple(value.get("sources"), f"{path}.sources"),
    )


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
    return value.strip()


def _optional_text(value: object, path: str) -> str | None:
    if value is None or value == "":
        return None
    return _text(value, path)


def _text_tuple(value: object, path: str) -> tuple[str, ...]:
    return tuple(
        _text(item, f"{path}[{index}]")
        for index, item in enumerate(_sequence(value, path))
    )


def _number(value: object, path: str) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        _invalid(path, "必须是数字。")
    return value


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


def _invalid(path: str, message: str) -> None:
    raise StoryContentValidationError("invalid_payload", path, message)


__all__ = ["story_world_from_payload", "story_world_to_payload"]
