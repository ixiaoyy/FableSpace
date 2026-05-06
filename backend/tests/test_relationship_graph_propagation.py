from __future__ import annotations

import pytest

pytest.importorskip("sqlalchemy", reason="optional SQLAlchemy infrastructure dependency")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from fablemap_api.application.services.relationship_graph import RelationshipGraphService
from fablemap_api.core.relationship_graph import RelationshipEdge, RelationshipProjection, RelationshipPropagationEvent
from fablemap_api.infrastructure.database import Base, Database
from fablemap_api.infrastructure.relationship_graph_store import SQLAlchemyRelationshipGraphStore


@pytest.fixture
def store() -> SQLAlchemyRelationshipGraphStore:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Database.__new__(Database)
    db.engine = engine
    db.SessionLocal = session_local
    db.url = "sqlite:///:memory:"
    return SQLAlchemyRelationshipGraphStore(db)


@pytest.fixture
def service(store: SQLAlchemyRelationshipGraphStore) -> RelationshipGraphService:
    return RelationshipGraphService(store)


def _edge(edge_id: str, source: str, target: str, behavior: str, *, strength: str = "normal", status: str = "confirmed", owner: str = "owner_a", target_owner: str | None = None) -> RelationshipEdge:
    return RelationshipEdge(
        id=edge_id,
        source_owner_id=owner,
        source_tavern_id=source,
        source_node_type="tavern",
        source_node_id=source,
        target_owner_id=target_owner or owner,
        target_tavern_id=target,
        target_node_type="tavern",
        target_node_id=target,
        behavior_type=behavior,
        strength_preset=strength,
        status=status,
    )


def _event(node_id: str, *, owner: str = "owner_a", amount: float = 0.2, node_type: str = "tavern", tavern_id: str | None = None, influence: float = 0.0) -> RelationshipPropagationEvent:
    return RelationshipPropagationEvent(
        visitor_id="visitor_a",
        source_owner_id=owner,
        source_node_type=node_type,
        source_node_id=node_id,
        source_tavern_id=tavern_id or node_id,
        delta_axis="affinity",
        delta_amount=amount,
        character_influence_weight=influence,
        source_event_id="evt_1",
    )


def test_friendly_allied_and_neutral_effects(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(_edge("edge_friendly", "tavern_a", "tavern_b", "friendly"))
    store.save_edge(_edge("edge_allied", "tavern_a", "tavern_c", "allied", strength="strong"))
    store.save_edge(_edge("edge_neutral", "tavern_a", "tavern_d", "neutral"))

    results = service.propagate_event(_event("tavern_a"))

    assert {result.edge_id for result in results} == {"edge_friendly", "edge_allied"}
    assert store.get_projection("visitor_a", "tavern", "tavern_b").affinity == 0.1
    assert store.get_projection("visitor_a", "tavern", "tavern_c").affinity == 0.16
    assert store.get_projection("visitor_a", "tavern", "tavern_d") is None


def test_rival_and_hostile_effects_drain_affinity_before_hostility(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(_edge("edge_rival", "tavern_a", "tavern_b", "rival"))
    store.save_edge(_edge("edge_hostile", "tavern_a", "tavern_c", "hostile", strength="strong"))
    store.upsert_projection(RelationshipProjection("visitor_a", "tavern", "tavern_b", affinity=0.05))
    store.upsert_projection(RelationshipProjection("visitor_a", "tavern", "tavern_c", affinity=0.05))

    service.propagate_event(_event("tavern_a"))

    rival = store.get_projection("visitor_a", "tavern", "tavern_b")
    hostile = store.get_projection("visitor_a", "tavern", "tavern_c")
    assert rival.affinity == 0.0
    assert round(rival.hostility, 4) == 0.05
    assert hostile.affinity == 0.0
    assert round(hostile.hostility, 4) == 0.15


def test_one_hop_only_does_not_cascade_to_second_degree_neighbor(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(_edge("edge_a_b", "tavern_a", "tavern_b", "friendly"))
    store.save_edge(_edge("edge_b_c", "tavern_b", "tavern_c", "friendly", owner="owner_b"))

    service.propagate_event(_event("tavern_a"))

    assert store.get_projection("visitor_a", "tavern", "tavern_b") is not None
    assert store.get_projection("visitor_a", "tavern", "tavern_c") is None


def test_cross_owner_perspective_reacts_to_visitor_relationship_with_target(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(
        _edge(
            "edge_a_dislikes_b",
            "tavern_a",
            "tavern_b",
            "hostile",
            strength="normal",
            owner="owner_a",
            target_owner="owner_b",
        )
    )
    store.upsert_projection(RelationshipProjection("visitor_a", "tavern", "tavern_a", affinity=0.05))

    results = service.propagate_event(_event("tavern_b", owner="owner_b"))

    assert [result.target_node_id for result in results] == ["tavern_a"]
    projection_a = store.get_projection("visitor_a", "tavern", "tavern_a")
    assert projection_a.affinity == 0.0
    assert round(projection_a.hostility, 4) == 0.075
    assert projection_a.metadata["propagation_direction"] == "target_to_source"


def test_same_owner_relationship_is_mutually_effective_from_target_side(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(_edge("edge_same_owner_allies", "tavern_a", "tavern_b", "allied", owner="owner_a"))

    service.propagate_event(_event("tavern_b", owner="owner_a"))

    projection_a = store.get_projection("visitor_a", "tavern", "tavern_a")
    assert projection_a.affinity == 0.1


def test_character_specific_edge_overrides_tavern_wide_edge(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    store.save_edge(_edge("edge_tavern_hostile", "tavern_a", "tavern_b", "hostile", strength="strong"))
    store.save_edge(
        RelationshipEdge(
            id="edge_character_friend",
            source_owner_id="owner_a",
            source_tavern_id="tavern_a",
            source_node_type="character",
            source_node_id="char_a",
            target_owner_id="owner_b",
            target_tavern_id="tavern_b",
            target_node_type="character",
            target_node_id="char_b",
            behavior_type="friendly",
            strength_preset="weak",
            status="confirmed",
        )
    )

    results = service.propagate_event(_event("char_a", node_type="character", tavern_id="tavern_a"))

    assert [result.edge_id for result in results] == ["edge_character_friend"]
    assert store.get_projection("visitor_a", "character", "char_b").affinity == 0.05
    assert store.get_projection("visitor_a", "tavern", "tavern_b") is None


def test_character_relationship_change_rolls_up_to_parent_tavern_with_weight(service: RelationshipGraphService, store: SQLAlchemyRelationshipGraphStore) -> None:
    results = service.propagate_event(
        _event("char_a", node_type="character", tavern_id="tavern_a", influence=0.5, amount=0.2)
    )

    assert [result.reason for result in results] == ["character_rollup"]
    tavern_projection = store.get_projection("visitor_a", "tavern", "tavern_a")
    assert tavern_projection.affinity == 0.02
    assert tavern_projection.metadata["source_character_id"] == "char_a"
