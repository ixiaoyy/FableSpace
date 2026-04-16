"""Tests for memory graph"""
import pytest
from fablemap.memory_graph import WorldMemoryGraph

def test_record_observation():
    graph = WorldMemoryGraph()

    graph.record_observation("player1", "poi1")

    relation = graph.get_player_history("player1", "poi1")
    assert relation is not None
    assert relation.visit_count == 1

    memory = graph.get_poi_memory("poi1")
    assert memory is not None
    assert memory.total_observers == 1

def test_multiple_observations():
    graph = WorldMemoryGraph()

    # Same player visits multiple times
    for _ in range(5):
        graph.record_observation("player1", "poi1")

    relation = graph.get_player_history("player1", "poi1")
    assert relation.visit_count == 5

    memory = graph.get_poi_memory("poi1")
    assert memory.total_observers == 5

def test_record_dwell():
    graph = WorldMemoryGraph()

    graph.record_observation("player1", "poi1")
    graph.record_dwell("player1", "poi1", 300.0)  # 5 minutes

    relation = graph.get_player_history("player1", "poi1")
    assert relation.total_dwell_time == 300.0

def test_record_mark():
    graph = WorldMemoryGraph()

    graph.record_observation("player1", "poi1")
    graph.record_mark("player1", "poi1", "Beautiful place", "joy")

    relation = graph.get_player_history("player1", "poi1")
    assert len(relation.marks) == 1
    assert "joy" in relation.emotions

def test_relationship_strength():
    graph = WorldMemoryGraph()

    # New relationship
    strength = graph.calculate_relationship_strength("player1", "poi1")
    assert strength == 0.0

    # After observation
    graph.record_observation("player1", "poi1")
    strength = graph.calculate_relationship_strength("player1", "poi1")
    assert strength > 0.0

    # After multiple interactions
    for _ in range(10):
        graph.record_observation("player1", "poi1")
    graph.record_dwell("player1", "poi1", 1800.0)
    graph.record_mark("player1", "poi1", "Love this", "love")

    strength = graph.calculate_relationship_strength("player1", "poi1")
    assert strength > 0.5

def test_zone_familiarity():
    graph = WorldMemoryGraph()
    graph.record_zone_visit("player1", "zone1", duration=300.0)

    familiarity = graph.get_zone_familiarity("player1", "zone1")
    assert familiarity > 0.0

def test_route_tracking():
    graph = WorldMemoryGraph()
    waypoints = ["poi1", "poi2", "poi3"]

    graph.record_route("player1", waypoints)
    graph.record_route("player1", waypoints)

    routes = graph.get_player_routes("player1")
    assert len(routes) == 1
    assert routes[0].repeat_count == 2

def test_echo_recording():
    graph = WorldMemoryGraph()
    graph.record_echo("echo1", "poi1", "player1", "test echo", "private")

    echoes = graph.get_poi_echoes("poi1")
    assert len(echoes) == 1
    assert echoes[0].content == "test echo"

def test_faction_reputation():
    graph = WorldMemoryGraph()
    graph.update_faction_reputation("player1", "faction1", 0.3)

    rep = graph.get_faction_reputation("player1", "faction1")
    assert rep == 0.3
