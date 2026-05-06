"""Deterministic one-hop relationship graph propagation service."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import uuid
from typing import Any

from fastapi import HTTPException

from fablemap_api.core.relationship_graph import (
    RelationshipEdge,
    RelationshipProjection,
    RelationshipPropagationEvent,
    RelationshipPropagationResult,
    apply_negative_effect,
    apply_positive_effect,
    specificity_rank,
    strength_multiplier,
)
from fablemap_api.infrastructure.relationship_graph_store import SQLAlchemyRelationshipGraphStore
from fablemap_api.infrastructure.storage import store_database

_POSITIVE_CAPS = {
    "friendly": 0.6,
    "allied": 0.8,
}
_NEGATIVE_MULTIPLIERS = {
    "rival": 1.0,
    "hostile": 1.25,
}
_CHARACTER_TO_TAVERN_MULTIPLIER = 0.2
_CHARACTER_TO_TAVERN_CAP = 0.4


@dataclass(slots=True)
class _CandidateEdge:
    edge: RelationshipEdge
    direction: str
    affected_node_type: str
    affected_node_id: str
    affected_tavern_id: str


class RelationshipGraphService:
    """Apply confirmed relationship graph edges to visitor projections.

    This service is deliberately one-hop only: it updates projections that are
    directly explained by edges touching the original event node, then stops.
    """

    def __init__(self, store: SQLAlchemyRelationshipGraphStore):
        self.store = store

    def propagate_event(self, event: RelationshipPropagationEvent) -> list[RelationshipPropagationResult]:
        results: list[RelationshipPropagationResult] = []
        candidates = self._select_effective_candidates(self._candidate_edges(event))
        for candidate in candidates:
            result = self._apply_candidate(event, candidate)
            if result is not None:
                results.append(result)

        rollup = self._apply_character_rollup(event)
        if rollup is not None:
            results.append(rollup)
        return results

    def _candidate_edges(self, event: RelationshipPropagationEvent) -> list[_CandidateEdge]:
        edges: dict[str, RelationshipEdge] = {}
        lookup_nodes = [(event.source_node_type, event.source_node_id)]
        if event.source_node_type == "character" and event.source_tavern_id:
            lookup_nodes.append(("tavern", event.source_tavern_id))

        for node_type, node_id in lookup_nodes:
            for edge in self.store.list_confirmed_edges_for_node(node_type, node_id):
                edges[edge.id] = edge

        candidates: list[_CandidateEdge] = []
        for edge in edges.values():
            if self._matches_source(edge, event):
                candidates.append(
                    _CandidateEdge(
                        edge=edge,
                        direction="source_to_target",
                        affected_node_type=edge.target_node_type,
                        affected_node_id=edge.target_node_id,
                        affected_tavern_id=edge.target_tavern_id or edge.target_node_id,
                    )
                )
            if self._matches_target(edge, event):
                candidates.append(
                    _CandidateEdge(
                        edge=edge,
                        direction="target_to_source",
                        affected_node_type=edge.source_node_type,
                        affected_node_id=edge.source_node_id,
                        affected_tavern_id=edge.source_tavern_id or edge.source_node_id,
                    )
                )
        return candidates

    @staticmethod
    def _matches_source(edge: RelationshipEdge, event: RelationshipPropagationEvent) -> bool:
        exact = edge.source_node_type == event.source_node_type and edge.source_node_id == event.source_node_id
        parent = (
            event.source_node_type == "character"
            and edge.source_node_type == "tavern"
            and edge.source_node_id == event.source_tavern_id
        )
        return exact or parent

    @staticmethod
    def _matches_target(edge: RelationshipEdge, event: RelationshipPropagationEvent) -> bool:
        exact = edge.target_node_type == event.source_node_type and edge.target_node_id == event.source_node_id
        parent = (
            event.source_node_type == "character"
            and edge.target_node_type == "tavern"
            and edge.target_node_id == event.source_tavern_id
        )
        return exact or parent

    @staticmethod
    def _select_effective_candidates(candidates: list[_CandidateEdge]) -> list[_CandidateEdge]:
        selected: list[_CandidateEdge] = []
        for candidate in candidates:
            candidate_rank = specificity_rank(candidate.edge)
            has_more_specific_same_target_scope = any(
                other.direction == candidate.direction
                and other.affected_tavern_id == candidate.affected_tavern_id
                and specificity_rank(other.edge) > candidate_rank
                for other in candidates
            )
            if not has_more_specific_same_target_scope:
                selected.append(candidate)
        return sorted(selected, key=lambda item: item.edge.id)

    def _apply_candidate(
        self,
        event: RelationshipPropagationEvent,
        candidate: _CandidateEdge,
    ) -> RelationshipPropagationResult | None:
        edge = candidate.edge
        if edge.behavior_type == "neutral":
            return None

        amount = self._effect_amount(event, edge)
        if amount <= 0:
            return None

        current = self.store.get_projection(
            event.visitor_id,
            candidate.affected_node_type,
            candidate.affected_node_id,
        ) or RelationshipProjection(
            visitor_id=event.visitor_id,
            node_type=candidate.affected_node_type,
            node_id=candidate.affected_node_id,
            tavern_id=candidate.affected_tavern_id,
        )

        if edge.behavior_type in _POSITIVE_CAPS:
            updated = apply_positive_effect(current, amount, cap=_POSITIVE_CAPS[edge.behavior_type])
        else:
            updated = apply_negative_effect(current, amount)

        updated.tavern_id = candidate.affected_tavern_id
        updated.metadata.update(
            {
                "source_edge_id": edge.id,
                "source_event_id": event.source_event_id,
                "source_node_type": event.source_node_type,
                "source_node_id": event.source_node_id,
                "source_tavern_id": event.source_tavern_id,
                "propagation_direction": candidate.direction,
                "behavior_type": edge.behavior_type,
                "strength_preset": edge.strength_preset,
            }
        )
        saved = self.store.upsert_projection(updated)
        return RelationshipPropagationResult(
            edge_id=edge.id,
            target_node_type=saved.node_type,
            target_node_id=saved.node_id,
            affinity=saved.affinity,
            hostility=saved.hostility,
        )

    @staticmethod
    def _effect_amount(event: RelationshipPropagationEvent, edge: RelationshipEdge) -> float:
        base = event.delta_amount * strength_multiplier(edge.strength_preset)
        if edge.behavior_type in _NEGATIVE_MULTIPLIERS:
            base *= _NEGATIVE_MULTIPLIERS[edge.behavior_type]
        return round(base, 10)

    def _apply_character_rollup(
        self,
        event: RelationshipPropagationEvent,
    ) -> RelationshipPropagationResult | None:
        if event.source_node_type != "character" or not event.source_tavern_id:
            return None
        if event.character_influence_weight <= 0 or event.delta_amount <= 0:
            return None

        amount = round(
            event.delta_amount * _CHARACTER_TO_TAVERN_MULTIPLIER * event.character_influence_weight,
            10,
        )
        if amount <= 0:
            return None

        current = self.store.get_projection(event.visitor_id, "tavern", event.source_tavern_id) or RelationshipProjection(
            visitor_id=event.visitor_id,
            node_type="tavern",
            node_id=event.source_tavern_id,
            tavern_id=event.source_tavern_id,
        )
        if event.delta_axis == "affinity":
            updated = apply_positive_effect(current, amount, cap=_CHARACTER_TO_TAVERN_CAP)
        else:
            updated = apply_negative_effect(current, amount)
        updated.metadata.update(
            {
                "source_event_id": event.source_event_id,
                "source_character_id": event.source_node_id,
                "reason": "character_rollup",
                "character_influence_weight": event.character_influence_weight,
            }
        )
        saved = self.store.upsert_projection(updated)
        return RelationshipPropagationResult(
            edge_id="",
            target_node_type="tavern",
            target_node_id=event.source_tavern_id,
            affinity=saved.affinity,
            hostility=saved.hostility,
            reason="character_rollup",
        )


class RelationshipGraphApplicationMixin:
    """Owner/system governance use cases for relationship edges."""

    def _relationship_graph_store(self) -> SQLAlchemyRelationshipGraphStore:
        existing = getattr(self, "_relationship_graph_store_instance", None)
        if existing is not None:
            return existing
        database = store_database(self.store)
        if database is None:
            raise HTTPException(status_code=500, detail="关系图谱需要数据库存储")
        store = SQLAlchemyRelationshipGraphStore(database)
        self._relationship_graph_store_instance = store
        return store

    def list_relationship_edges(self, tavern_id: str, user_id: str) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        owner_id = self._require_user_id(user_id)
        self._ensure_owner(tavern, owner_id)
        edges = self._relationship_graph_store().list_edges_for_source("tavern", tavern_id)
        return {"edges": [self._relationship_edge_payload(edge) for edge in edges], "count": len(edges)}

    def create_relationship_edge(self, tavern_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        owner_id = self._require_user_id(user_id)
        self._ensure_owner(tavern, owner_id)
        payload = data or {}
        source_tavern_id = str(payload.get("source_tavern_id") or tavern_id).strip()
        if source_tavern_id != tavern_id:
            raise HTTPException(status_code=400, detail="只能创建当前酒馆 source-side 关系")

        target_tavern_id = str(payload.get("target_tavern_id") or "").strip()
        if not target_tavern_id:
            raise HTTPException(status_code=400, detail="target_tavern_id 不能为空")
        target_tavern = self._get_tavern_or_404(target_tavern_id)

        edge = RelationshipEdge(
            id=str(payload.get("id") or f"rel_{uuid.uuid4().hex[:12]}"),
            source_owner_id=tavern.owner_id,
            source_tavern_id=tavern_id,
            source_node_type=str(payload.get("source_node_type") or "tavern"),
            source_node_id=str(payload.get("source_node_id") or tavern_id),
            target_owner_id=target_tavern.owner_id,
            target_tavern_id=target_tavern_id,
            target_node_type=str(payload.get("target_node_type") or "tavern"),
            target_node_id=str(payload.get("target_node_id") or target_tavern_id),
            behavior_type=str(payload.get("behavior_type") or ""),
            display_name=str(payload.get("display_name") or ""),
            description=str(payload.get("description") or ""),
            strength_preset=str(payload.get("strength_preset") or "normal"),
            status=self._initial_relationship_edge_status(payload),
            governance_mode=str(payload.get("governance_mode") or "manual"),
            confirmed_by=owner_id if self._initial_relationship_edge_status(payload) == "confirmed" else "",
            confirmed_by_type=self._confirmed_by_type(payload) if self._initial_relationship_edge_status(payload) == "confirmed" else "",
            metadata=self._relationship_metadata(payload),
        )
        saved = self._relationship_graph_store().save_edge(edge)
        return {"ok": True, "edge": self._relationship_edge_payload(saved)}

    def update_relationship_edge(
        self,
        tavern_id: str,
        edge_id: str,
        data: dict[str, Any],
        user_id: str,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        owner_id = self._require_user_id(user_id)
        self._ensure_owner(tavern, owner_id)
        edge = self._get_source_edge_or_404(tavern_id, edge_id)
        payload = data or {}

        if "source_tavern_id" in payload and str(payload.get("source_tavern_id") or "") != tavern_id:
            raise HTTPException(status_code=400, detail="不能把关系改写到其他 source tavern")
        target_tavern_id = str(payload.get("target_tavern_id") or edge.target_tavern_id).strip()
        target_tavern = self._get_tavern_or_404(target_tavern_id)

        updated = RelationshipEdge(
            id=edge.id,
            source_owner_id=tavern.owner_id,
            source_tavern_id=tavern_id,
            source_node_type=str(payload.get("source_node_type") or edge.source_node_type),
            source_node_id=str(payload.get("source_node_id") or edge.source_node_id),
            target_owner_id=target_tavern.owner_id,
            target_tavern_id=target_tavern_id,
            target_node_type=str(payload.get("target_node_type") or edge.target_node_type),
            target_node_id=str(payload.get("target_node_id") or edge.target_node_id),
            behavior_type=str(payload.get("behavior_type") or edge.behavior_type),
            display_name=str(payload.get("display_name") if "display_name" in payload else edge.display_name),
            description=str(payload.get("description") if "description" in payload else edge.description),
            strength_preset=str(payload.get("strength_preset") or edge.strength_preset),
            status=str(payload.get("status") or edge.status),
            governance_mode=str(payload.get("governance_mode") or edge.governance_mode),
            confirmed_by=edge.confirmed_by,
            confirmed_by_type=edge.confirmed_by_type,
            created_at=edge.created_at,
            metadata={**edge.metadata, **self._relationship_metadata(payload)},
        )
        saved = self._relationship_graph_store().save_edge(updated)
        return {"ok": True, "edge": self._relationship_edge_payload(saved)}

    def decide_relationship_edge(
        self,
        tavern_id: str,
        edge_id: str,
        data: dict[str, Any],
        user_id: str,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        owner_id = self._require_user_id(user_id)
        self._ensure_owner(tavern, owner_id)
        edge = self._get_source_edge_or_404(tavern_id, edge_id)
        payload = data or {}
        status = str(payload.get("status") or "").strip()
        if status not in {"confirmed", "rejected", "disabled", "pending"}:
            raise HTTPException(status_code=400, detail="关系决策状态无效")
        confirmed_by_type = self._confirmed_by_type(payload) if status == "confirmed" else ""
        decided = RelationshipEdge(
            **{
                **asdict(edge),
                "status": status,
                "confirmed_by": owner_id if status == "confirmed" else "",
                "confirmed_by_type": confirmed_by_type,
                "metadata": {
                    **edge.metadata,
                    **self._relationship_metadata(payload),
                    "decision_note": str(payload.get("note") or ""),
                },
            }
        )
        saved = self._relationship_graph_store().save_edge(decided)
        return {"ok": True, "edge": self._relationship_edge_payload(saved)}

    def _get_source_edge_or_404(self, tavern_id: str, edge_id: str) -> RelationshipEdge:
        edge = self._relationship_graph_store().get_edge(edge_id)
        if edge is None or edge.source_tavern_id != tavern_id:
            raise HTTPException(status_code=404, detail="关系不存在")
        return edge

    @staticmethod
    def _relationship_metadata(payload: dict[str, Any]) -> dict[str, Any]:
        value = payload.get("metadata")
        return dict(value) if isinstance(value, dict) else {}

    @staticmethod
    def _confirmed_by_type(payload: dict[str, Any]) -> str:
        requested = str(payload.get("confirmed_by_type") or "owner").strip() or "owner"
        if requested not in {"owner", "delegated_ai", "system_ai"}:
            raise HTTPException(status_code=400, detail="confirmed_by_type 无效")
        return requested

    def _initial_relationship_edge_status(self, payload: dict[str, Any]) -> str:
        status = str(payload.get("status") or "").strip()
        if not status:
            return "confirmed"
        if status not in {"pending", "confirmed", "rejected", "disabled"}:
            raise HTTPException(status_code=400, detail="关系状态无效")
        return status

    @staticmethod
    def _relationship_edge_payload(edge: RelationshipEdge) -> dict[str, Any]:
        return {
            "id": edge.id,
            "source_owner_id": edge.source_owner_id,
            "source_tavern_id": edge.source_tavern_id,
            "source_node_type": edge.source_node_type,
            "source_node_id": edge.source_node_id,
            "target_owner_id": edge.target_owner_id,
            "target_tavern_id": edge.target_tavern_id,
            "target_node_type": edge.target_node_type,
            "target_node_id": edge.target_node_id,
            "behavior_type": edge.behavior_type,
            "display_name": edge.display_name,
            "description": edge.description,
            "strength_preset": edge.strength_preset,
            "status": edge.status,
            "governance_mode": edge.governance_mode,
            "confirmed_by": edge.confirmed_by,
            "confirmed_by_type": edge.confirmed_by_type,
            "perspective_scope": "source_owner",
            "created_at": edge.created_at,
            "updated_at": edge.updated_at,
            "metadata": edge.metadata,
        }
