"""Tests for orchestrator"""
import json

import pytest

from fablemap.orchestrator.ai_engine import AIOrchestrator
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
    pois = [{"name": "factory", "fantasy_type": "industrial_ruin"} for _ in range(3)]
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


def test_scene_capsule_generated_from_behavior_and_revisit_signals():
    orchestrator = RuleBasedOrchestrator()

    world_state = {
        "observer_count": 4,
        "slice_id": "memory_slice",
        "center_poi": "poi_clocktower",
        "pois": [{"id": "poi_clocktower", "fantasy_type": "archive_stack"}],
    }
    player_state = {
        "player_id": "p1",
        "attunement": 72,
        "behavior_events": [
            {
                "action": "observe",
                "target_id": "poi_clocktower",
                "district_type": "memory_ruins",
                "timestamp": 1710752400.0,
            },
            {
                "action": "mark",
                "target_id": "poi_clocktower",
                "district_type": "memory_ruins",
                "timestamp": 1710752460.0,
            },
        ],
        "visit_count": 3,
        "writeback_count": 2,
        "echo_count": 2,
        "mark_count": 1,
        "dwell_seconds": 12,
    }

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.scene_capsule is not None
    assert result.scene_capsule.capsule_type == "memory_reveal"
    assert result.scene_capsule.trigger_source == "revisit_driven"
    assert result.scene_capsule.title
    assert result.scene_capsule.text_blocks
    assert result.scene_capsule.visual_hints
    assert result.scene_capsule.interaction_hooks
    assert 0.0 < result.scene_capsule.confidence <= 0.98


def test_scene_capsule_can_generate_without_persona_when_events_exist():
    orchestrator = RuleBasedOrchestrator()

    world_state = {
        "observer_count": 25,
        "slice_id": "festival_slice",
        "center_poi": "poi_square",
        "pois": [{"id": "poi_square", "fantasy_type": "market_gate"}],
    }
    player_state = {
        "player_id": "p1",
        "writeback_count": 1,
        "visit_count": 1,
        "echo_count": 0,
        "mark_count": 0,
    }

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.city_persona is None
    assert result.scene_capsule is not None
    assert result.scene_capsule.capsule_type == "broadcast_echo"
    assert result.scene_capsule.trigger_source == "event_driven"
    assert result.scene_capsule.visibility in {"private", "local_public", "global"}


def test_scene_capsule_suppressed_when_no_signals():
    orchestrator = RuleBasedOrchestrator()

    world_state = {
        "observer_count": 1,
        "slice_id": "quiet_slice",
        "center_poi": "poi_lane",
        "pois": [{"id": "poi_lane", "fantasy_type": "corner_shop"}],
    }
    player_state = {
        "player_id": "p1",
        "visit_count": 1,
        "writeback_count": 0,
        "echo_count": 0,
        "mark_count": 0,
        "dwell_seconds": 0,
    }

    result = orchestrator.orchestrate(world_state, player_state)

    assert result.scene_capsule is not None
    assert result.scene_capsule.capsule_type == "null"
    assert result.scene_capsule.metadata["suppressed"] is True
    assert result.fallback_triggered is False


class StubLLM:
    def __init__(self, response: str):
        self.response = response

    def generate(self, prompt: str, temperature: float, max_tokens: int) -> str:
        return self.response


def test_ai_orchestrator_parses_structured_llm_output():
    llm_response = json.dumps(
        {
            "event_suggestions": [
                {
                    "type": "special_event",
                    "target": "global",
                    "priority": 9,
                    "visibility": "local_public",
                }
            ],
            "poi_ranking": [{"poi_id": "poi_1", "rank": 0}],
            "broadcast_suggestions": [{"text": "LLM broadcast", "mood": "mysterious"}],
            "observer_effect": {
                "poi_id": "poi_1",
                "observer_count": 12,
                "world_density": 0.8,
                "rarity_level": "legendary",
                "density_change": 0.2,
            },
            "confidence_score": 0.93,
            "warnings": ["model_synthesized"],
        }
    )
    orchestrator = AIOrchestrator(llm_client=StubLLM(llm_response))

    result = orchestrator.orchestrate(
        {"slice_id": "test", "observer_count": 12, "pois": [{"id": "poi_1"}]},
        {"player_id": "p1", "lat": 0.0, "lon": 0.0},
    )

    assert result.fallback_triggered is False
    assert result.confidence_score == 0.93
    assert result.event_suggestions[0].type == "special_event"
    assert result.observer_effect is not None
    assert result.observer_effect.rarity_level == "legendary"
    assert result.broadcast_suggestions[0]["text"] == "LLM broadcast"
    assert result.warnings == ["model_synthesized"]


def test_ai_orchestrator_falls_back_on_invalid_json_response():
    orchestrator = AIOrchestrator(llm_client=StubLLM("not-json"))

    result = orchestrator.orchestrate(
        {"slice_id": "fallback_slice", "observer_count": 1, "pois": []},
        {"player_id": "p1"},
    )

    assert result.fallback_triggered is True
    assert result.observer_effect is not None
    assert result.observer_effect.world_density == 0.2
