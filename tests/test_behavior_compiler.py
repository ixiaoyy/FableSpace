"""Tests for AIO4 BehaviorCompiler"""
import pytest
from fablemap.behavior_compiler import (
    BehaviorCompiler, BehaviorEvent, BehaviorTrace, MeaningVector, build_trace
)


@pytest.fixture
def compiler():
    return BehaviorCompiler()


def _trace(player_id, raw):
    return build_trace(player_id, raw)


# ---------------------------------------------------------------------------
# 基础用例
# ---------------------------------------------------------------------------

def test_empty_trace_returns_wanderer(compiler):
    trace = BehaviorTrace(player_id="p0")
    mv = compiler.compile(trace)
    assert mv.dominant_meaning == "wanderer"
    assert mv.myth_entry == "unnamed_drifter"


def test_single_observe_returns_vector(compiler):
    trace = _trace("p1", [
        {"action": "observe", "target_id": "poi_1", "district_type": "commercial_core"}
    ])
    mv = compiler.compile(trace)
    assert isinstance(mv, MeaningVector)
    assert mv.player_id == "p1"
    assert 0.0 <= mv.explorer_score <= 1.0


# ---------------------------------------------------------------------------
# 维度触发验证
# ---------------------------------------------------------------------------

def test_repeated_observe_unique_targets_raises_explorer(compiler):
    events = [
        {"action": "observe", "target_id": f"poi_{i}", "district_type": "commercial_core"}
        for i in range(8)
    ]
    mv = compiler.compile(_trace("p2", events))
    assert mv.dominant_meaning == "explorer"
    assert mv.myth_entry == "ghost_cartographer"


def test_chronicle_lens_co_create_raises_chronicler(compiler):
    events = [
        {"action": "co_create", "target_id": "poi_x", "district_type": "memory_grove", "lens_id": "chronicle"}
        for _ in range(6)
    ]
    mv = compiler.compile(_trace("p3", events))
    assert mv.chronicler_score > 0.3
    assert mv.dominant_meaning == "chronicler"
    assert mv.myth_entry == "memory_keeper"


def test_mark_in_healing_oasis_raises_restorer(compiler):
    events = [
        {"action": "mark", "target_id": "poi_h", "district_type": "healing_oasis"}
        for _ in range(6)
    ]
    mv = compiler.compile(_trace("p4", events))
    assert mv.restorer_score > 0.3
    assert mv.dominant_meaning == "restorer"
    assert mv.myth_entry == "sanctuary_weaver"


def test_dwell_veil_lens_raises_recluse(compiler):
    events = [
        {"action": "dwell", "target_id": "poi_d", "district_type": "edge_rift", "lens_id": "veil"}
        for _ in range(6)
    ]
    mv = compiler.compile(_trace("p5", events))
    assert mv.recluse_score > 0.3
    assert mv.dominant_meaning == "recluse"
    assert mv.myth_entry == "void_walker"


def test_dwell_oracle_lens_raises_resonant(compiler):
    events = [
        {"action": "dwell", "target_id": "poi_o", "district_type": "memory_grove", "lens_id": "oracle"}
        for _ in range(6)
    ]
    mv = compiler.compile(_trace("p6", events))
    assert mv.resonant_score > 0.3
    assert mv.dominant_meaning == "resonant"
    assert mv.myth_entry == "echo_bearer"


# ---------------------------------------------------------------------------
# 混合行为：dominant 选最高分
# ---------------------------------------------------------------------------

def test_mixed_trace_picks_dominant(compiler):
    events = (
        [{"action": "observe", "target_id": f"poi_{i}", "district_type": "commercial_core"} for i in range(5)]
        + [{"action": "dwell", "target_id": "poi_z", "district_type": "edge_rift", "lens_id": "veil"} for _ in range(2)]
    )
    mv = compiler.compile(_trace("p7", events))
    assert mv.dominant_meaning in {"explorer", "chronicler", "restorer", "recluse", "resonant", "wanderer"}


# ---------------------------------------------------------------------------
# action_counts 与 dominant_district
# ---------------------------------------------------------------------------

def test_action_counts_correct(compiler):
    events = [
        {"action": "observe", "target_id": "a", "district_type": "commercial_core"},
        {"action": "observe", "target_id": "b", "district_type": "commercial_core"},
        {"action": "mark",    "target_id": "c", "district_type": "healing_oasis"},
    ]
    mv = compiler.compile(_trace("p8", events))
    assert mv.action_counts["observe"] == 2
    assert mv.action_counts["mark"] == 1


def test_dominant_district_is_most_frequent(compiler):
    events = [
        {"action": "observe", "target_id": "a", "district_type": "memory_grove"},
        {"action": "observe", "target_id": "b", "district_type": "memory_grove"},
        {"action": "dwell",   "target_id": "c", "district_type": "edge_rift"},
    ]
    mv = compiler.compile(_trace("p9", events))
    assert mv.dominant_district == "memory_grove"


# ---------------------------------------------------------------------------
# scores 边界验证
# ---------------------------------------------------------------------------

def test_all_scores_in_range(compiler):
    events = [
        {"action": "observe",    "target_id": "x", "district_type": "commercial_core", "lens_id": "drift"},
        {"action": "dwell",      "target_id": "y", "district_type": "healing_oasis",  "lens_id": "hearth"},
        {"action": "co_create",  "target_id": "z", "district_type": "memory_grove",   "lens_id": "oracle"},
    ]
    mv = compiler.compile(_trace("p10", events))
    for score in (mv.explorer_score, mv.chronicler_score, mv.restorer_score,
                  mv.recluse_score, mv.resonant_score):
        assert 0.0 <= score <= 1.0
