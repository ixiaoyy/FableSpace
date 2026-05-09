"""Neighborhood Shared Knowledge — spatial social layer core."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class NeighborhoodKnowledge:
    """A piece of shared knowledge within a geographical neighborhood."""

    id: str
    content: str
    lat: float
    lon: float
    radius: float = 500.0
    importance: float = 0.5
    category: str = "general"  # general, news, gossip, event
    source_type: str = "system"  # owner, state_card, system
    source_id: str | None = None
    created_at: str = ""
    expires_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.id:
            self.id = f"knw_{uuid.uuid4().hex[:12]}"
        if not self.created_at:
            self.created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "lat": self.lat,
            "lon": self.lon,
            "radius": self.radius,
            "importance": self.importance,
            "category": self.category,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NeighborhoodKnowledge:
        return cls(
            id=str(data.get("id") or ""),
            content=str(data.get("content") or ""),
            lat=float(data.get("lat") or 0.0),
            lon=float(data.get("lon") or 0.0),
            radius=float(data.get("radius") or 500.0),
            importance=float(data.get("importance") or 0.5),
            category=str(data.get("category") or "general"),
            source_type=str(data.get("source_type") or "system"),
            source_id=data.get("source_id"),
            created_at=str(data.get("created_at") or ""),
            expires_at=data.get("expires_at"),
            metadata=dict(data.get("metadata") or {}),
        )
