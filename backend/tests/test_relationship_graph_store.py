from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("sqlalchemy", reason="optional SQLAlchemy infrastructure dependency")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from fablemap_api.core.relationship_graph import RelationshipEdge, RelationshipProjection
from fablemap_api.infrastructure.database import Base, Database
from fablemap_api.infrastructure.relationship_graph_store import SQLAlchemyRelationshipGraphStore


@pytest.fixture
def db() -> Database:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_instance = Database.__new__(Database)
    db_instance.engine = engine
    db_instance.SessionLocal = session_local
    db_instance.url = "sqlite:///:memory:"
    return db_instance


@pytest.fixture
def store(db: Database) -> SQLAlchemyRelationshipGraphStore:
    return SQLAlchemyRelationshipGraphStore(db)


def test_confirmed_edge_round_trips_with_owner_perspective_metadata(store: SQLAlchemyRelationshipGraphStore) -> None:
    edge = RelationshipEdge(
        id="edge_owner_a_b",
        source_owner_id="owner_a",
        source_tavern_id="tavern_a",
        source_node_type="tavern",
        source_node_id="tavern_a",
        target_owner_id="owner_b",
        target_tavern_id="tavern_b",
        target_node_type="tavern",
        target_node_id="tavern_b",
        behavior_type="friendly",
        display_name="姐妹店",
        description="A owner sees B as a friendly sister shop.",
        strength_preset="strong",
        status="confirmed",
        governance_mode="manual",
        confirmed_by="owner_a",
        confirmed_by_type="owner",
        metadata={"perspective_scope": "source_owner"},
    )

    saved = store.save_edge(edge)
    assert saved.id == edge.id

    by_source = store.list_edges_for_source("tavern", "tavern_a")
    assert [item.id for item in by_source] == ["edge_owner_a_b"]
    assert by_source[0].display_name == "姐妹店"
    assert by_source[0].metadata["perspective_scope"] == "source_owner"

    confirmed_from_source = store.list_confirmed_edges_for_node("tavern", "tavern_a")
    confirmed_from_target = store.list_confirmed_edges_for_node("tavern", "tavern_b")
    assert [item.id for item in confirmed_from_source] == ["edge_owner_a_b"]
    assert [item.id for item in confirmed_from_target] == ["edge_owner_a_b"]


def test_pending_and_disabled_edges_are_excluded_from_confirmed_queries(store: SQLAlchemyRelationshipGraphStore) -> None:
    for edge_id, status in [
        ("edge_pending", "pending"),
        ("edge_disabled", "disabled"),
        ("edge_confirmed", "confirmed"),
    ]:
        store.save_edge(
            RelationshipEdge(
                id=edge_id,
                source_owner_id="owner_a",
                source_tavern_id="tavern_a",
                source_node_type="tavern",
                source_node_id="tavern_a",
                target_owner_id="owner_b",
                target_tavern_id="tavern_b",
                target_node_type="tavern",
                target_node_id="tavern_b",
                behavior_type="hostile",
                status=status,
            )
        )

    confirmed = store.list_confirmed_edges_for_node("tavern", "tavern_a")

    assert [edge.id for edge in confirmed] == ["edge_confirmed"]


def test_projection_upsert_round_trips_dual_axis_and_provenance(store: SQLAlchemyRelationshipGraphStore) -> None:
    projection = RelationshipProjection(
        visitor_id="visitor_a",
        node_type="character",
        node_id="char_b",
        tavern_id="tavern_b",
        affinity=0.42,
        hostility=0.11,
        metadata={"source_edge_id": "edge_owner_a_b", "reason": "A perspective reaction"},
    )

    saved = store.upsert_projection(projection)
    assert saved.affinity == 0.42
    assert saved.hostility == 0.11

    projection.affinity = 0.5
    projection.hostility = 0.2
    projection.metadata["last_event"] = "chat"
    store.upsert_projection(projection)

    reloaded = store.get_projection("visitor_a", "character", "char_b")
    assert reloaded is not None
    assert reloaded.affinity == 0.5
    assert reloaded.hostility == 0.2
    assert reloaded.tavern_id == "tavern_b"
    assert reloaded.metadata["source_edge_id"] == "edge_owner_a_b"
    assert reloaded.metadata["last_event"] == "chat"


def test_missing_projection_returns_none(store: SQLAlchemyRelationshipGraphStore) -> None:
    assert store.get_projection("visitor_missing", "tavern", "tavern_missing") is None
