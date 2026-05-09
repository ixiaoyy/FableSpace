"""SQLAlchemy-backed neighborhood knowledge storage."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from fablemap_api.core.neighborhood import NeighborhoodKnowledge
from fablemap_api.infrastructure.models import NeighborhoodKnowledgeModel


class SQLAlchemyNeighborhoodKnowledgeStore:
    """Persistent storage for neighborhood shared knowledge."""

    def __init__(self, session_factory: Any):
        self.session_factory = session_factory

    def save_knowledge(self, knowledge: NeighborhoodKnowledge) -> NeighborhoodKnowledge:
        with self.session_factory() as session:
            existing = session.query(NeighborhoodKnowledgeModel).filter_by(id=knowledge.id).first()
            payload = knowledge.to_dict()
            payload.pop("id", None)
            
            # Convert ISO timestamps to datetime objects for SQLAlchemy
            if payload.get("created_at"):
                payload["created_at"] = datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            if payload.get("expires_at"):
                payload["expires_at"] = datetime.fromisoformat(payload["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            
            # Handle metadata_ field name mismatch
            meta = payload.pop("metadata", {})
            payload["metadata_"] = meta

            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
            else:
                session.add(NeighborhoodKnowledgeModel(id=knowledge.id, **payload))
            session.commit()
            return knowledge

    def get_knowledge(self, knowledge_id: str) -> NeighborhoodKnowledge | None:
        with self.session_factory() as session:
            model = session.query(NeighborhoodKnowledgeModel).filter_by(id=str(knowledge_id)).first()
            if not model:
                return None
            return self._model_to_entity(model)

    def list_nearby_knowledge(
        self, 
        lat: float, 
        lon: float, 
        radius_m: float = 1000.0, 
        limit: int = 20,
        include_expired: bool = False
    ) -> list[NeighborhoodKnowledge]:
        """Find knowledge entries whose coverage radius intersects with the query point."""
        with self.session_factory() as session:
            # Simple bounding box filter for performance before exact distance check
            # 1 degree lat ~ 111km. 1000m ~ 0.009 degrees.
            margin = (radius_m + 1000) / 111000.0 
            
            query = session.query(NeighborhoodKnowledgeModel).filter(
                NeighborhoodKnowledgeModel.lat.between(lat - margin, lat + margin),
                NeighborhoodKnowledgeModel.lon.between(lon - margin, lon + margin)
            )
            
            if not include_expired:
                now = datetime.utcnow()
                query = query.filter(
                    (NeighborhoodKnowledgeModel.expires_at == None) | 
                    (NeighborhoodKnowledgeModel.expires_at > now)
                )

            models = query.all()
            
            # Refine with actual distance check and relevance (radius)
            results: list[tuple[float, NeighborhoodKnowledgeModel]] = []
            for model in models:
                dist = self._haversine_distance(lat, lon, model.lat, model.lon)
                # Entry matches if point is within entry's radius
                if dist <= (model.radius or 500.0):
                    results.append((dist, model))
            
            # Sort by importance and then distance
            results.sort(key=lambda x: (-x[1].importance, x[0]))
            
            return [self._model_to_entity(m) for _, m in results[:limit]]

    def delete_knowledge(self, knowledge_id: str) -> bool:
        with self.session_factory() as session:
            return session.query(NeighborhoodKnowledgeModel).filter_by(id=str(knowledge_id)).delete() > 0

    def _model_to_entity(self, model: NeighborhoodKnowledgeModel) -> NeighborhoodKnowledge:
        data = {
            "id": model.id,
            "content": model.content,
            "lat": model.lat,
            "lon": model.lon,
            "radius": model.radius,
            "importance": model.importance,
            "category": model.category,
            "source_type": model.source_type,
            "source_id": model.source_id,
            "created_at": model.created_at.replace(microsecond=0).isoformat() + "Z" if model.created_at else "",
            "expires_at": model.expires_at.replace(microsecond=0).isoformat() + "Z" if model.expires_at else None,
            "metadata": model.metadata_ or {},
        }
        return NeighborhoodKnowledge.from_dict(data)

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        import math
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
