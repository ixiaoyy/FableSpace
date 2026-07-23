from __future__ import annotations

from collections.abc import Mapping
from dataclasses import FrozenInstanceError, fields, is_dataclass, replace
from typing import Callable

from fablespace_api.domain.story_world import (
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
    StoryWorldRegistry,
)


def _relationship_rules() -> RelationshipRules:
    return RelationshipRules(
        minimum_affinity=-10,
        maximum_affinity=10,
        initial_affinity=0,
        natural_turn_max_delta=1,
        stages=(
            RelationshipStage(
                id="wary",
                label="警惕",
                minimum_affinity=-10,
                attitude="保持距离，只回应必要问题。",
            ),
            RelationshipStage(
                id="open",
                label="愿意交谈",
                minimum_affinity=0,
                attitude="愿意说明自己的处境。",
            ),
        ),
    )


def _build_example_world(
    *,
    world_id: str,
    publication_status: PublicationStatus,
    canon_entry: CanonEntry,
) -> StoryWorld:
    character_id = f"{world_id}_character"
    role_id = f"{world_id}_role"
    ending_id = f"{world_id}_ending"
    end_node_id = f"{world_id}_end"
    start_choice = StoryChoice(
        id=f"{world_id}_choice",
        label="留下来听完",
        next_node_id=end_node_id,
        is_key=True,
        required_flags=(),
        blocked_flags=(),
        set_flags=(f"{world_id}_listened",),
        relationship_effects=(
            RelationshipEffect(
                character_id=character_id,
                affinity_delta=2,
                reason="玩家愿意听角色说明处境。",
                set_flags=(f"{world_id}_trusted_listener",),
            ),
        ),
    )
    return StoryWorld(
        id=world_id,
        title=f"{world_id} 标题",
        summary="一个只用于领域合同验证的最小故事。",
        genre="contract-example",
        publication_status=publication_status,
        content_version="1.0.0",
        entry_chapter_id=f"{world_id}_chapter",
        player_role=PlayerRole(
            id=role_id,
            story_world_id=world_id,
            name="旅人",
            gender="未说明",
            background="玩家以经过审核的旅人身份进入。",
            entry_reason="玩家需要听取角色的请求。",
            character_visible_information=("独自到来", "愿意回应请求"),
        ),
        characters=(
            Character(
                id=character_id,
                story_world_id=world_id,
                name="守候者",
                motive="确认玩家是否愿意听完。",
                secret="角色知道一条尚未公开的私人线索。",
                voice="克制、简短，不替玩家作决定。",
                current_situation="正在等待一个可信的倾听者。",
                opening_line="你愿意先听我把话说完吗？",
                relationship_rules=_relationship_rules(),
            ),
        ),
        chapters=(
            StoryChapter(
                id=f"{world_id}_chapter",
                title="相遇",
                entry_node_id=f"{world_id}_start",
                nodes=(
                    StoryNode(
                        id=f"{world_id}_start",
                        narration="角色提出一个具体请求。",
                        choices=(start_choice,),
                        ending_id=None,
                    ),
                    StoryNode(
                        id=end_node_id,
                        narration="角色记住了玩家的选择。",
                        choices=(),
                        ending_id=ending_id,
                    ),
                ),
            ),
        ),
        endings=(
            StoryEnding(
                id=ending_id,
                title="听完请求",
                summary="玩家听完了角色的请求。",
            ),
        ),
        canon_entries=(canon_entry,),
    )


def _replace_node(
    story_world: StoryWorld,
    node_id: str,
    replacement: StoryNode,
) -> StoryWorld:
    chapters = tuple(
        replace(
            chapter,
            nodes=tuple(
                replacement if node.id == node_id else node
                for node in chapter.nodes
            ),
        )
        for chapter in story_world.chapters
    )
    return replace(story_world, chapters=chapters)


def _expect_error(
    name: str,
    expected_code: str,
    build_registry: Callable[[], StoryWorldRegistry],
    expected_path: str,
) -> None:
    try:
        build_registry()
    except StoryContentValidationError as exc:
        assert exc.code == expected_code, (
            f"{name}: expected {expected_code!r}, received {exc.code!r}: {exc}"
        )
        assert expected_path in exc.path, (
            f"{name}: expected path containing {expected_path!r}, "
            f"received {exc.path!r}"
        )
    else:
        raise AssertionError(f"{name}: invalid content was accepted")


def _assert_no_mutable_collections(value: object) -> None:
    if isinstance(value, (list, dict, set, bytearray)):
        raise AssertionError(f"mutable collection leaked from content contract: {type(value)}")
    if isinstance(value, tuple):
        for item in value:
            _assert_no_mutable_collections(item)
        return
    if isinstance(value, Mapping):
        for key, item in value.items():
            _assert_no_mutable_collections(key)
            _assert_no_mutable_collections(item)
        return
    if is_dataclass(value) and not isinstance(value, type):
        for field in fields(value):
            _assert_no_mutable_collections(getattr(value, field.name))


def main() -> None:
    assert tuple(status.value for status in PublicationStatus) == (
        "draft",
        "published",
        "archived",
    )
    assert tuple(category.value for category in CanonCategory) == (
        "fixed_fact",
        "story_setting",
        "needs_verification",
    )
    assert tuple(field.name for field in fields(StoryWorld)) == (
        "id",
        "title",
        "summary",
        "genre",
        "publication_status",
        "content_version",
        "entry_chapter_id",
        "player_role",
        "characters",
        "chapters",
        "endings",
        "canon_entries",
    )

    historical = _build_example_world(
        world_id="example_historical",
        publication_status=PublicationStatus.PUBLISHED,
        canon_entry=CanonEntry(
            id="example_historical_fact",
            category=CanonCategory.FIXED_FACT,
            statement="本条仅用于验证固定史实来源合同。",
            sources=("Example archive catalogue", "Example university publication"),
        ),
    )
    original = _build_example_world(
        world_id="example_original",
        publication_status=PublicationStatus.DRAFT,
        canon_entry=CanonEntry(
            id="example_original_setting",
            category=CanonCategory.STORY_SETTING,
            statement="这是一条经过审核的原创世界设定。",
            sources=(),
        ),
    )

    source_worlds = [historical, original]
    registry = StoryWorldRegistry(iter(source_worlds))
    source_worlds.clear()
    assert registry.all() == (historical, original)
    assert registry.get(historical.id) is historical
    assert registry.get("missing") is None
    assert registry.require(original.id) is original
    assert registry.published() == (historical,)
    try:
        registry.require("missing")
    except KeyError:
        pass
    else:
        raise AssertionError("require() must reject unknown StoryWorld IDs")

    _assert_no_mutable_collections(registry)
    for target, field_name, value in (
        (historical, "title", "changed"),
        (registry, "_story_worlds", ()),
    ):
        try:
            setattr(target, field_name, value)
        except FrozenInstanceError:
            pass
        else:
            raise AssertionError(f"{type(target).__name__} must be immutable")
    for method_name in ("add", "update", "delete", "remove"):
        assert not hasattr(registry, method_name)

    start_node = historical.chapters[0].nodes[0]
    terminal_node = historical.chapters[0].nodes[1]
    start_choice = start_node.choices[0]

    wrong_character_choice = replace(
        start_choice,
        relationship_effects=(
            replace(
                start_choice.relationship_effects[0],
                character_id="missing_character",
            ),
        ),
    )
    wrong_character_world = _replace_node(
        historical,
        start_node.id,
        replace(start_node, choices=(wrong_character_choice,)),
    )
    _expect_error(
        "wrong Character reference",
        "missing_reference",
        lambda: StoryWorldRegistry((wrong_character_world,)),
        "relationship_effects[0].character_id",
    )

    _expect_error(
        "duplicate StoryWorld ID",
        "duplicate_id",
        lambda: StoryWorldRegistry((historical, historical)),
        "story_worlds[1].id",
    )
    duplicate_character_world = replace(
        original,
        characters=(
            replace(
                original.characters[0],
                id=historical.characters[0].id,
            ),
        ),
    )
    _expect_error(
        "duplicate Character ID across StoryWorlds",
        "duplicate_id",
        lambda: StoryWorldRegistry((historical, duplicate_character_world)),
        "story_worlds[1].characters[0].id",
    )
    duplicate_player_role_world = replace(
        original,
        player_role=replace(
            original.player_role,
            id=historical.player_role.id,
        ),
    )
    _expect_error(
        "duplicate PlayerRole ID across StoryWorlds",
        "duplicate_id",
        lambda: StoryWorldRegistry((historical, duplicate_player_role_world)),
        "story_worlds[1].player_role.id",
    )
    duplicate_node_world = _replace_node(
        historical,
        terminal_node.id,
        replace(terminal_node, id=start_node.id),
    )
    _expect_error(
        "duplicate StoryNode ID inside StoryWorld",
        "duplicate_id",
        lambda: StoryWorldRegistry((duplicate_node_world,)),
        "nodes[1].id",
    )
    _expect_error(
        "missing PlayerRole",
        "missing_player_role",
        lambda: StoryWorldRegistry((replace(historical, player_role=None),)),
        "player_role",
    )
    _expect_error(
        "invalid publication status",
        "invalid_publication_status",
        lambda: StoryWorldRegistry(
            (replace(historical, publication_status="released"),)
        ),
        "publication_status",
    )

    invalid_rules_world = replace(
        historical,
        characters=(
            replace(
                historical.characters[0],
                relationship_rules=replace(
                    historical.characters[0].relationship_rules,
                    natural_turn_max_delta=21,
                ),
            ),
        ),
    )
    _expect_error(
        "invalid relationship range",
        "invalid_relationship_range",
        lambda: StoryWorldRegistry((invalid_rules_world,)),
        "natural_turn_max_delta",
    )

    missing_node_choice = replace(start_choice, next_node_id="missing_node")
    missing_node_world = _replace_node(
        historical,
        start_node.id,
        replace(start_node, choices=(missing_node_choice,)),
    )
    _expect_error(
        "missing next node",
        "missing_reference",
        lambda: StoryWorldRegistry((missing_node_world,)),
        "next_node_id",
    )

    missing_ending_world = _replace_node(
        historical,
        terminal_node.id,
        replace(terminal_node, ending_id="missing_ending"),
    )
    _expect_error(
        "missing ending",
        "missing_reference",
        lambda: StoryWorldRegistry((missing_ending_world,)),
        "ending_id",
    )

    unreachable_node = StoryNode(
        id="example_historical_unreachable",
        narration="这个节点没有从入口进入的路径。",
        choices=(),
        ending_id=historical.endings[0].id,
    )
    unreachable_world = replace(
        historical,
        chapters=(
            replace(
                historical.chapters[0],
                nodes=historical.chapters[0].nodes + (unreachable_node,),
            ),
        ),
    )
    _expect_error(
        "unreachable node",
        "unreachable_node",
        lambda: StoryWorldRegistry((unreachable_world,)),
        "nodes[2].id",
    )

    dead_end_world = _replace_node(
        historical,
        start_node.id,
        replace(start_node, choices=(), ending_id=None),
    )
    _expect_error(
        "non-terminal dead end",
        "dead_end",
        lambda: StoryWorldRegistry((dead_end_world,)),
        "choices",
    )

    terminal_with_choices_world = _replace_node(
        historical,
        terminal_node.id,
        replace(terminal_node, choices=(replace(start_choice, next_node_id=start_node.id),)),
    )
    _expect_error(
        "terminal node with choices",
        "terminal_has_choices",
        lambda: StoryWorldRegistry((terminal_with_choices_world,)),
        "choices",
    )

    unverified_world = replace(
        historical,
        canon_entries=(
            CanonEntry(
                id="example_needs_verification",
                category=CanonCategory.NEEDS_VERIFICATION,
                statement="这条内容尚未完成核验。",
                sources=("Example research note",),
            ),
        ),
    )
    _expect_error(
        "published unverified canon",
        "unverified_canon",
        lambda: StoryWorldRegistry((unverified_world,)),
        "canon_entries[0].category",
    )

    insufficient_sources_world = replace(
        historical,
        canon_entries=(
            replace(historical.canon_entries[0], sources=("Only one source",)),
        ),
    )
    _expect_error(
        "fixed fact source minimum",
        "insufficient_sources",
        lambda: StoryWorldRegistry((insufficient_sources_world,)),
        "canon_entries[0].sources",
    )

    extra_ending_world = replace(
        historical,
        endings=historical.endings
        + (
            StoryEnding(
                id="example_historical_unused_ending",
                title="未引用结局",
                summary="这个结局没有被任何可达终局节点引用。",
            ),
        ),
    )
    _expect_error(
        "unreferenced ending",
        "unreferenced_ending",
        lambda: StoryWorldRegistry((extra_ending_world,)),
        "endings[1].id",
    )

    mutable_collection_world = replace(historical, characters=list(historical.characters))
    _expect_error(
        "mutable nested collection",
        "invalid_collection",
        lambda: StoryWorldRegistry((mutable_collection_world,)),
        "characters",
    )

    print("story-content-model-contract-ok")


if __name__ == "__main__":
    main()
