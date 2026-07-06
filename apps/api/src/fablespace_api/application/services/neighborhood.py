"""Neighborhood Shared Knowledge application service."""

from __future__ import annotations

from typing import Any
from fastapi import HTTPException

from fablespace_api.core.neighborhood import NeighborhoodKnowledge
from fablespace_api.core.space import Tavern


class NeighborhoodKnowledgeService:
    """Service for managing neighborhood shared knowledge."""

    def __init__(self, store: Any):
        self.store = store

    def list_nearby_knowledge(
        self, 
        lat: float, 
        lon: float, 
        radius_m: float = 500.0, 
        limit: int = 10
    ) -> list[dict[str, Any]]:
        entries = self.store.list_nearby_knowledge(lat, lon, radius_m=radius_m, limit=limit)
        return [e.to_dict() for e in entries]

    def create_knowledge(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Manually create neighborhood knowledge (Owner or System)."""
        # In a real scenario, we would check if user_id is the owner of a tavern near lat/lon
        try:
            knowledge = NeighborhoodKnowledge.from_dict(data)
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
            
        saved = self.store.save_knowledge(knowledge)
        return saved.to_dict()

    def sync_from_state_card(self, tavern: Tavern, card: Any) -> NeighborhoodKnowledge | None:
        """Create neighborhood knowledge from a public tavern-scoped state card."""
        if card.canon_scope != "tavern" or card.status != "confirmed":
            return None
            
        # Check if is_public is in metadata
        if not card.metadata.get("is_public"):
            return None
            
        knowledge = NeighborhoodKnowledge(
            id=f"knw_sc_{card.id}",
            content=card.summary,
            lat=tavern.lat,
            lon=tavern.lon,
            radius=1000.0, # Tavern events usually have wider reach
            importance=0.7,
            category="event",
            source_type="state_card",
            source_id=card.id,
            metadata={
                "space_id": tavern.id,
                "space_name": tavern.name,
                "card_category": card.category
            }
        )
        return self.store.save_knowledge(knowledge)
