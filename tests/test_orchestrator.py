"""Tests for orchestrator"""
import pytest
from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator

def test_observer_effect_calculation():
    orchestrator = RuleBasedOrchestrator()

    # Test low density
    world_state = {"observer_count": 1, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.observer_effect.world_density == 0.2
    assert result.observer_effect.rarity_level == "common"

def test_high_density_triggers_events():
    orchestrator = RuleBasedOrchestrator()

    world_state = {"observer_count": 25, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.observer_effect.world_density == 1.0
    assert result.observer_effect.rarity_level == "legendary"
    assert len(result.event_suggestions) > 0

def test_district_type_affects_broadcasts():
    orchestrator = RuleBasedOrchestrator()

    # Create office district
    pois = [{"fantasy_type": "power_tower"} for _ in range(6)]
    world_state = {"observer_count": 10, "slice_id": "office", "pois": pois}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    assert len(result.broadcast_suggestions) > 0
    assert any("秩序高塔" in b["text"] for b in result.broadcast_suggestions)

def test_night_edge_rift_anomaly():
    orchestrator = RuleBasedOrchestrator()

    # Edge rift at night
    pois = [{"name": "factory"} for _ in range(3)]
    world_state = {"observer_count": 5, "slice_id": "edge_night", "pois": pois}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    # Check if anomaly event is triggered
    anomaly_events = [e for e in result.event_suggestions if e.type == "anomaly_detected"]
    assert len(anomaly_events) > 0


def test_lens_output_present():
    orchestrator = RuleBasedOrchestrator()

    world_state = {"observer_count": 3, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.lens_output is not None
    assert result.lens_output.lens_id in {
        "drift", "chronicle", "surge", "veil", "hearth", "oracle"
    }
    assert result.lens_output.tone
    assert result.lens_output.asset_pack_hint
    assert isinstance(result.lens_output.event_weight_modifiers, dict)


def test_high_attunement_triggers_oracle_lens():
    orchestrator = RuleBasedOrchestrator()

    world_state = {"observer_count": 5, "slice_id": "test", "pois": []}
    player_state = {
        "player_id": "p1",
        "attunement": 0.8,
        "mark_count": 4,
        "echo_count": 3,
    }

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.lens_output.lens_id == "oracle"


def test_surge_lens_high_observer_count():
    orchestrator = RuleBasedOrchestrator()

    world_state = {"observer_count": 20, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.lens_output.lens_id == "surge"
