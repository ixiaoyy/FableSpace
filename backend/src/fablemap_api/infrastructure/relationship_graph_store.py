"""SQLAlchemy store for the owner-governed relationship graph."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import or_

from fablemap_api.core.relationship_graph import RelationshipEdge, RelationshipProjection
from fablemap_api.infrastructure.database import Database
from fablemap_api.infrastructure.models import RelationshipEdgeModel, VisitorRelationshipProjectionModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dt_to_iso(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def _parse_datetime(value: str | datetime | None) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    text = str(value).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed


class SQLAlchemyRelationshipGraphStore:
    """Database-backed relationship edge/projection store."""

    def __init__(self, database: Database):
        self.database = database

    def save_edge(self, edge: RelationshipEdge) -> RelationshipEdge:
        """Create or update a relationship edge by ID."""

        with self.database.session_scope() as session:
            model = session.get(RelationshipEdgeModel, edge.id)
            now = _utcnow()
            if model is None:
                model = RelationshipEdgeModel(id=edge.id, created_at=_parse_datetime(edge.created_at) or now)
                session.add(model)
            self._apply_edge_to_model(model, edge, now)
            session.flush()
            return self._edge_from_model(model)

    def list_edges_for_source(
        self,
        node_type: str,
        node_id: str,
        *,
        source_owner_id: str | None = None,
    ) -> list[RelationshipEdge]:
        """List all edge records whose source node matches the supplied node."""

        with self.database.session_scope() as session:
            query = session.query(RelationshipEdgeModel).filter(
                RelationshipEdgeModel.source_node_type == node_type,
                RelationshipEdgeModel.source_node_id == node_id,
            )
            if source_owner_id is not None:
                query = query.filter(RelationshipEdgeModel.source_owner_id == source_owner_id)
            rows = query.order_by(RelationshipEdgeModel.id.asc()).all()
            return [self._edge_from_model(row) for row in rows]

    def get_edge(self, edge_id: str) -> RelationshipEdge | None:
        """Return one edge by ID."""

        with self.database.session_scope() as session:
            model = session.get(RelationshipEdgeModel, edge_id)
            return self._edge_from_model(model) if model is not None else None

    def list_confirmed_edges_for_node(
        self,
        node_type: str,
        node_id: str,
        *,
        source_owner_id: str | None = None,
    ) -> list[RelationshipEdge]:
        """List confirmed/enabled edges touching a node as source or target."""

        with self.database.session_scope() as session:
            query = session.query(RelationshipEdgeModel).filter(
                RelationshipEdgeModel.status == "confirmed",
                or_(
                    (
                        (RelationshipEdgeModel.source_node_type == node_type)
                        & (RelationshipEdgeModel.source_node_id == node_id)
                    ),
                    (
                        (RelationshipEdgeModel.target_node_type == node_type)
                        & (RelationshipEdgeModel.target_node_id == node_id)
                    ),
                ),
            )
            if source_owner_id is not None:
                query = query.filter(RelationshipEdgeModel.source_owner_id == source_owner_id)
            rows = query.order_by(RelationshipEdgeModel.id.asc()).all()
            return [self._edge_from_model(row) for row in rows]

    def get_projection(self, visitor_id: str, node_type: str, node_id: str) -> RelationshipProjection | None:
        """Return a visitor projection or None when it has not been created."""

        with self.database.session_scope() as session:
            model = session.get(
                VisitorRelationshipProjectionModel,
                {"visitor_id": visitor_id, "node_type": node_type, "node_id": node_id},
            )
            return self._projection_from_model(model) if model is not None else None

    def upsert_projection(self, projection: RelationshipProjection) -> RelationshipProjection:
        """Create or update a visitor relationship projection."""

        with self.database.session_scope() as session:
            identity = {
                "visitor_id": projection.visitor_id,
                "node_type": projection.node_type,
                "node_id": projection.node_id,
            }
            model = session.get(VisitorRelationshipProjectionModel, identity)
            if model is None:
                model = VisitorRelationshipProjectionModel(**identity)
                session.add(model)
            model.tavern_id = projection.tavern_id or ""
            model.affinity = projection.affinity
            model.hostility = projection.hostility
            model.last_event_at = _parse_datetime(projection.last_event_at)
            model.updated_at = _parse_datetime(projection.updated_at) or _utcnow()
            model.metadata_ = dict(projection.metadata or {})
            session.flush()
            return self._projection_from_model(model)

    @staticmethod
    def _apply_edge_to_model(model: RelationshipEdgeModel, edge: RelationshipEdge, now: datetime) -> None:
        model.source_owner_id = edge.source_owner_id
        model.source_tavern_id = edge.source_tavern_id
        model.source_node_type = edge.source_node_type
        model.source_node_id = edge.source_node_id
        model.target_owner_id = edge.target_owner_id
        model.target_tavern_id = edge.target_tavern_id
        model.target_node_type = edge.target_node_type
        model.target_node_id = edge.target_node_id
        model.behavior_type = edge.behavior_type
        model.display_name = edge.display_name
        model.description = edge.description
        model.strength_preset = edge.strength_preset
        model.status = edge.status
        model.governance_mode = edge.governance_mode
        model.confirmed_by = edge.confirmed_by
        model.confirmed_by_type = edge.confirmed_by_type
        model.updated_at = _parse_datetime(edge.updated_at) or now
        model.metadata_ = dict(edge.metadata or {})

    @staticmethod
    def _edge_from_model(model: RelationshipEdgeModel) -> RelationshipEdge:
        return RelationshipEdge(
            id=model.id,
            source_owner_id=model.source_owner_id or "",
            source_tavern_id=model.source_tavern_id or "",
            source_node_type=model.source_node_type,
            source_node_id=model.source_node_id,
            target_owner_id=model.target_owner_id or "",
            target_tavern_id=model.target_tavern_id or "",
            target_node_type=model.target_node_type,
            target_node_id=model.target_node_id,
            behavior_type=model.behavior_type,
            display_name=model.display_name or "",
            description=model.description or "",
            strength_preset=model.strength_preset or "normal",
            status=model.status or "pending",
            governance_mode=model.governance_mode or "manual",
            confirmed_by=model.confirmed_by or "",
            confirmed_by_type=model.confirmed_by_type or "",
            created_at=_dt_to_iso(model.created_at),
            updated_at=_dt_to_iso(model.updated_at),
            metadata=dict(model.metadata_ or {}),
        )

    @staticmethod
    def _projection_from_model(model: VisitorRelationshipProjectionModel) -> RelationshipProjection:
        return RelationshipProjection(
            visitor_id=model.visitor_id,
            node_type=model.node_type,
            node_id=model.node_id,
            tavern_id=model.tavern_id or "",
            affinity=model.affinity or 0.0,
            hostility=model.hostility or 0.0,
            last_event_at=_dt_to_iso(model.last_event_at),
            updated_at=_dt_to_iso(model.updated_at),
            metadata=dict(model.metadata_ or {}),
        )
