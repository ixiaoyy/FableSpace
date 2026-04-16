"""Protocol regression tests - prevent protocol drift"""
import pytest
from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator
from fablemap.orchestrator.schemas import OrchestratorOutput

def test_orchestrator_output_structure():
    """Guard A: Ensure orchestrator output structure is stable"""
    orchestrator = RuleBasedOrchestrator()
    world_state = {"observer_count": 5, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    # Required fields must exist
    assert hasattr(result, 'event_suggestions')
    assert hasattr(result, 'poi_ranking')
    assert hasattr(result, 'broadcast_suggestions')
    assert hasattr(result, 'observer_effect')
    assert hasattr(result, 'confidence_score')
    assert hasattr(result, 'fallback_triggered')

    # Task metadata must exist
    assert hasattr(result, 'stage')
    assert hasattr(result, 'status')
    assert hasattr(result, 'started_at')
    assert hasattr(result, 'warnings')

def test_observer_effect_structure():
    """Guard B: Observer effect structure is stable"""
    orchestrator = RuleBasedOrchestrator()
    world_state = {"observer_count": 10, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)
    effect = result.observer_effect

    assert hasattr(effect, 'world_density')
    assert hasattr(effect, 'rarity_level')
    assert 0.0 <= effect.world_density <= 1.0
    assert effect.rarity_level in ["common", "uncommon", "rare", "legendary"]

def test_event_suggestion_structure():
    """Guard C: Event suggestion structure is stable"""
    orchestrator = RuleBasedOrchestrator()
    world_state = {"observer_count": 25, "slice_id": "test", "pois": []}
    player_state = {"player_id": "p1"}

    result = orchestrator.orchestrate(world_state, player_state)

    if result.event_suggestions:
        event = result.event_suggestions[0]
        assert hasattr(event, 'type')
        assert hasattr(event, 'target')
        assert hasattr(event, 'priority')
        assert hasattr(event, 'visibility')
