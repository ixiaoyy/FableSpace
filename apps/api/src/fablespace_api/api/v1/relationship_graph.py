from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces/{space_id}/relationship-edges", tags=["relationship-graph"])


class RelationshipEdgeWriteRequest(BaseModel):
    source_space_id: str | None = None
    source_node_type: str | None = None
    source_node_id: str | None = None
    target_space_id: str
    target_node_type: str | None = None
    target_node_id: str | None = None
    behavior_type: str
    display_name: str = ""
    description: str = ""
    strength_preset: str = "normal"
    status: str | None = None
    governance_mode: str = "manual"
    confirmed_by_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class RelationshipEdgeUpdateRequest(BaseModel):
    source_space_id: str | None = None
    source_node_type: str | None = None
    source_node_id: str | None = None
    target_space_id: str | None = None
    target_node_type: str | None = None
    target_node_id: str | None = None
    behavior_type: str | None = None
    display_name: str | None = None
    description: str | None = None
    strength_preset: str | None = None
    status: str | None = None
    governance_mode: str | None = None
    confirmed_by_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class RelationshipEdgeDecisionRequest(BaseModel):
    status: str
    confirmed_by_type: str | None = None
    note: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


@router.get("")
def list_relationship_edges(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_relationship_edges(space_id, get_user_id(request))


@router.post("")
def create_relationship_edge(
    request: Request,
    space_id: str,
    data: RelationshipEdgeWriteRequest,
) -> dict[str, Any]:
    return spaces_service(request).create_relationship_edge(space_id, data.to_payload(), get_user_id(request))


@router.put("/{edge_id}")
def update_relationship_edge(
    request: Request,
    space_id: str,
    edge_id: str,
    data: RelationshipEdgeUpdateRequest,
) -> dict[str, Any]:
    return spaces_service(request).update_relationship_edge(space_id, edge_id, data.to_payload(), get_user_id(request))


@router.post("/{edge_id}/decision")
def decide_relationship_edge(
    request: Request,
    space_id: str,
    edge_id: str,
    data: RelationshipEdgeDecisionRequest,
) -> dict[str, Any]:
    return spaces_service(request).decide_relationship_edge(space_id, edge_id, data.to_payload(), get_user_id(request))
