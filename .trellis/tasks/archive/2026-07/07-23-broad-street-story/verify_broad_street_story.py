from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

REPO_ROOT = next(
    parent
    for parent in Path(__file__).resolve().parents
    if (parent / "apps" / "api" / "src").is_dir()
)
API_SRC = REPO_ROOT / "apps" / "api" / "src"
sys.path.insert(0, str(API_SRC))

from fablespace_api.content.annie_broad_street import (  # noqa: E402
    ANNIE_CHARACTER_ID,
    ANNIE_STORY_WORLD,
    STORY_WORLD_REGISTRY,
)
from fablespace_api.domain.story_world import CanonCategory  # noqa: E402


def main() -> None:
    world = STORY_WORLD_REGISTRY.require(ANNIE_STORY_WORLD.id)
    chapter = world.chapters[0]
    nodes = {node.id: node for node in chapter.nodes}
    choices = {
        choice.id: choice
        for node in chapter.nodes
        for choice in node.choices
    }

    assert world.content_version == "annie-broad-street-2026-07-27.1"
    assert len(world.characters) == 1
    assert world.characters[0].id == ANNIE_CHARACTER_ID
    assert world.player_role.name == "乞丐"
    assert len(nodes) == 15
    assert len(choices) == 30
    assert len(world.endings) == 5

    entry_choices = {choice.id for choice in nodes[chapter.entry_node_id].choices}
    assert entry_choices == {
        "choice_share_clean_water",
        "choice_ask_about_pump",
        "choice_find_other_water",
        "choice_seek_adult_questioner",
        "choice_refuse_and_leave",
    }

    reachable: set[str] = set()
    pending = deque([chapter.entry_node_id])
    while pending:
        node_id = pending.popleft()
        if node_id in reachable:
            continue
        reachable.add(node_id)
        pending.extend(choice.next_node_id for choice in nodes[node_id].choices)
    assert reachable == set(nodes)

    terminal_nodes = [node for node in nodes.values() if node.ending_id]
    assert len(terminal_nodes) == 5
    assert {node.ending_id for node in terminal_nodes} == {
        ending.id for ending in world.endings
    }
    assert {"node_trust_ending", "node_safe_ending", "node_distant_ending"} <= {
        node.id for node in terminal_nodes
    }
    assert {"ending_witness_heard", "ending_left_the_pump", "ending_no_answer"} <= {
        ending.id for ending in world.endings
    }
    required_history_fragments = (
        "9 月 7 日晚",
        "次日",
        "暴发在移除前已经开始减退",
        "不由你们的纸页或选择决定",
    )
    for node in terminal_nodes:
        assert not node.choices
        assert all(fragment in node.narration for fragment in required_history_fragments)

    def reachable_endings(start_node_id: str) -> set[str]:
        endings: set[str] = set()
        branch_pending = deque([start_node_id])
        branch_seen: set[str] = set()
        while branch_pending:
            node_id = branch_pending.popleft()
            if node_id in branch_seen:
                continue
            branch_seen.add(node_id)
            node = nodes[node_id]
            if node.ending_id:
                endings.add(node.ending_id)
            branch_pending.extend(choice.next_node_id for choice in node.choices)
        return endings

    for choice in nodes[chapter.entry_node_id].choices:
        assert reachable_endings(choice.next_node_id), choice.id

    stages = world.characters[0].relationship_rules.stages
    assert [(stage.id, stage.minimum_affinity) for stage in stages] == [
        ("guarded", -20),
        ("watchful", 0),
        ("walking_together", 4),
        ("trusting", 10),
    ]
    max_single_positive = max(
        effect.affinity_delta
        for choice in choices.values()
        for effect in choice.relationship_effects
    )
    assert world.characters[0].relationship_rules.initial_affinity + max_single_positive < 10

    trusted_path = (
        "choice_share_clean_water",
        "choice_verify_water_source",
        "choice_record_confirmed_source",
        "choice_let_annie_speak",
    )
    trusted_affinity = sum(
        choices[choice_id].relationship_effects[0].affinity_delta
        for choice_id in trusted_path
    )
    assert trusted_affinity >= 10

    assert all(
        entry.category is not CanonCategory.NEEDS_VERIFICATION
        for entry in world.canon_entries
    )
    fixed_facts = [
        entry
        for entry in world.canon_entries
        if entry.category is CanonCategory.FIXED_FACT
    ]
    assert len(fixed_facts) == 6
    assert all(len(set(entry.sources)) >= 2 for entry in fixed_facts)

    print(
        "PASS: "
        f"version={world.content_version} "
        f"nodes={len(nodes)} choices={len(choices)} endings={len(world.endings)} "
        f"trusted_affinity={trusted_affinity}"
    )


if __name__ == "__main__":
    main()
