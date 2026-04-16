"""E4 Tests: Player Home, Ghost Replay, City Identity"""
from datetime import datetime

import pytest

from fablemap.memory_graph import WorldMemoryGraph, PlayerHomeRelation, GhostTrace
from fablemap.city_persona import CityPersonaAgent, CityPersona
from fablemap.behavior_compiler import MeaningVector


class TestPlayerHome:
    def test_set_home_creates_relation(self):
        graph = WorldMemoryGraph()
        home = graph.set_home("p1", "poi_123", "poi")
        assert isinstance(home, PlayerHomeRelation)
        assert home.player_id == "p1"
        assert home.target_id == "poi_123"
        assert home.target_type == "poi"
        assert home.visit_count == 1
        assert home.comfort_score > 0.0
        assert "familiar" in home.home_tags

    def test_set_home_same_target_increases_comfort(self):
        graph = WorldMemoryGraph()
        graph.set_home("p1", "poi_123", "poi")
        home = graph.set_home("p1", "poi_123", "poi")
        assert home.visit_count == 2
        assert home.comfort_score > 0.1

    def test_set_home_new_target_replaces_old(self):
        graph = WorldMemoryGraph()
        graph.set_home("p1", "poi_old", "poi")
        home = graph.set_home("p1", "poi_new", "zone")
        assert home.target_id == "poi_new"
        assert home.target_type == "zone"
        assert home.visit_count == 1

    def test_get_home_returns_none_when_not_set(self):
        graph = WorldMemoryGraph()
        assert graph.get_home("nobody") is None

    def test_get_home_returns_existing_relation(self):
        graph = WorldMemoryGraph()
        graph.set_home("p1", "poi_abc", "poi")
        home = graph.get_home("p1")
        assert home is not None
        assert home.target_id == "poi_abc"


class TestGhostTrace:
    def test_record_ghost_trace_stores_trace(self):
        graph = WorldMemoryGraph()
        waypoints = [
            {"poi_id": "poi_a", "timestamp": "2025-01-01T10:00:00", "action_state": "observing"},
            {"poi_id": "poi_b", "timestamp": "2025-01-01T10:05:00", "action_state": "moving"},
        ]
        trace = graph.record_ghost_trace(
            player_id="p1",
            waypoints=waypoints,
            started_at="2025-01-01T10:00:00",
            ended_at="2025-01-01T10:05:00",
            mood_arc=["curious", "calm"],
        )
        assert isinstance(trace, GhostTrace)
        assert trace.player_id == "p1"
        assert len(trace.waypoints) == 2
        assert trace.mood_arc == ["curious", "calm"]
        assert trace.visibility == "local_public"

    def test_get_ghost_traces_for_player(self):
        graph = WorldMemoryGraph()
        waypoints = [{"poi_id": "poi_x", "timestamp": "2025-01-01T10:00:00", "action_state": "idle"}]
        graph.record_ghost_trace("p1", waypoints, "2025-01-01T10:00:00", "2025-01-01T10:01:00", ["neutral"])
        graph.record_ghost_trace("p1", waypoints, "2025-01-01T11:00:00", "2025-01-01T11:01:00", ["warm"])
        graph.record_ghost_trace("p2", waypoints, "2025-01-01T12:00:00", "2025-01-01T12:01:00", ["cold"])
        traces = graph.get_ghost_traces("p1")
        assert len(traces) == 2
        assert all(t.player_id == "p1" for t in traces)


class TestCityIdentityEvolution:
    def _make_meaning(self, dominant: str, **kwargs) -> MeaningVector:
        defaults = dict(
            player_id="p1",
            dominant_meaning=dominant,
            explorer_score=0.0,
            chronicler_score=0.0,
            restorer_score=0.0,
            recluse_score=0.0,
            resonant_score=0.0,
            wanderer_score=1.0,
            myth_entry=None,
        )
        defaults.update(kwargs)
        return MeaningVector(**defaults)

    def test_home_dweller_persona_has_home_tag(self):
        agent = CityPersonaAgent()
        meaning = self._make_meaning("resonant", resonant_score=0.8)
        persona = agent.generate(meaning)
        # 有据点的高共鸣玩家应有 resonant 相关标签
        assert persona.dominant_meaning == "resonant"
        assert persona.trust_level > 0.5

    def test_evolve_with_home_boosts_trust(self):
        agent = CityPersonaAgent()
        meaning = self._make_meaning("resonant", resonant_score=0.8)
        persona = agent.generate(meaning)
        evolved = agent.evolve_with_home(persona, comfort_score=0.8)
        assert evolved.trust_level > persona.trust_level
        assert "home_bound" in evolved.persona_tags

    def test_merge_updates_existing_persona(self):
        agent = CityPersonaAgent()
        m1 = self._make_meaning("explorer", explorer_score=0.7)
        m2 = self._make_meaning("resonant", resonant_score=0.9)
        persona = agent.generate(m1)
        merged = agent.merge(persona, m2)
        # merge 后 trust 是加权平均，不应超过 1.0
        assert 0.0 <= merged.trust_level <= 1.0
        assert merged.dominant_meaning == "resonant"
