"""Exercise story differentiation, revisit, and private-state contracts offline."""

import os
import tempfile
from pathlib import Path

from fablespace_api.core.default_spaces import default_public_welfare_spaces
from fablespace_api.core.memory import MemoryAtom
from fablespace_api.core.public_welfare_rules import resolve_public_welfare_rules_response
from fablespace_api.core.space import SpaceStore, VisitorState


os.environ["FABLESPACE_SEED_DEFAULT_SPACES"] = "1"

spaces = default_public_welfare_spaces()
assert len(spaces) == 3
assert all(len(space["characters"]) == 2 for space in spaces)
assert all(space["llm_config"]["backend"] == "rules" for space in spaces)

conversation_prompts = {
    "story_palace_snow_edict": ("怎么玩", "腰牌和封蜡是什么线索", "我从别的世界带来手机，可以叫警察开宫门"),
    "story_ghost_foxfire_debt": ("怎么玩", "狐丹救命的代价是什么", "我撒谎说宁怀书已经喝完药了"),
    "story_campus_last_class": ("怎么玩", "门禁和试卷能证明什么", "我是古代来的，学校应该让我用钱免错"),
}
progress_markers = {
    "story_palace_snow_edict": ("腰牌", "封蜡", "诏书", "五更"),
    "story_ghost_foxfire_debt": ("狐丹", "百年", "代价", "药"),
    "story_campus_last_class": ("门禁", "试卷", "证据", "替罪"),
}

for space in spaces:
    space_id = space["id"]
    space_name = space["name"]
    pair_openings = []
    for character in space["characters"]:
        for gender_label in ("男", "女"):
            response = resolve_public_welfare_rules_response(
                message=f"我是{gender_label}乞丐，怎么玩？",
                space_id=space_id,
                character_name=character["name"],
                space_name=space_name,
                first_mes=character["first_mes"],
            )
            assert response
        pair_openings.append(response)
    assert pair_openings[0] != pair_openings[1]

    lead_character = space["characters"][0]
    three_turn_responses = [
        resolve_public_welfare_rules_response(
            message=prompt,
            space_id=space_id,
            character_name=lead_character["name"],
            space_name=space_name,
            first_mes=lead_character["first_mes"],
        )
        for prompt in conversation_prompts[space_id]
    ]
    assert all(three_turn_responses)
    assert any(
        marker in response
        for marker in progress_markers[space_id]
        for response in three_turn_responses[:2]
    )
    assert "可以用手机" not in three_turn_responses[-1]
    assert "用钱免错" not in three_turn_responses[-1]

    for character in space["characters"]:
        first_greeting = resolve_public_welfare_rules_response(
            message="你好",
            space_id=space_id,
            character_name=character["name"],
            space_name=space_name,
            first_mes=character["first_mes"],
        )
        revisit_greeting = resolve_public_welfare_rules_response(
            message="你好，我又来了",
            space_id=space_id,
            character_name=character["name"],
            space_name=space_name,
            first_mes=character["first_mes"],
            is_revisit=True,
            revisit_cue="已确认的私有线索",
        )
        assert first_greeting == character["first_mes"]
        assert revisit_greeting != character["first_mes"]
        assert "已确认的私有线索" in revisit_greeting
        assert "继续" in revisit_greeting

with tempfile.TemporaryDirectory() as temporary_root:
    store = SpaceStore(Path(temporary_root))
    space_id = spaces[0]["id"]
    visitor_id = "visitor-continuity-check"
    character_id = spaces[0]["characters"][0]["id"]
    store.update_visitor_state(
        space_id,
        VisitorState(
            visitor_id=visitor_id,
            space_id=space_id,
            gender="female",
            visit_count=2,
            relationship_strength=0.35,
            relationship_stage="acquaintance",
            metadata={"play_identity_id": "beggar"},
        ),
    )
    store.save_memory_atom(
        space_id,
        MemoryAtom(
            id="memory-continuity-check",
            space_id=space_id,
            subject="private-clue",
            content="访客已经确认半枚腰牌来自冷宫水门。",
            visibility="private",
            visitor_id=visitor_id,
            character_id=character_id,
        ),
    )

    reopened_store = SpaceStore(Path(temporary_root))
    persisted_state = reopened_store.get_visitor_state(space_id, visitor_id)
    persisted_memories = reopened_store.list_memory_atoms(space_id)
    assert persisted_state is not None
    assert persisted_state.visit_count == 2
    assert persisted_state.metadata["play_identity_id"] == "beggar"
    assert any(
        memory.id == "memory-continuity-check"
        and memory.visitor_id == visitor_id
        and memory.visibility == "private"
        for memory in persisted_memories
    )

print("story-continuity-contract-ok")
print("offline-rules-verdict=PASS")
print("real-llm-verdict=BLOCKED:not-configured; all launch seeds use rules backend")
