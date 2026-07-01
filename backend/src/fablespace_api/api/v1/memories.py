from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.memories import (
    MemoryAtomFeedbackRequest,
    MemoryAtomWriteRequest,
    MemoryImportanceRequest,
    MemorySummarizeRequest,
    MemoryTruncateRequest,
)
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["memories"])
utilities_router = APIRouter(tags=["memory-utilities"])


@utilities_router.post("/memory/summarize")
def summarize_memory(request: Request, data: MemorySummarizeRequest) -> dict[str, Any]:
    return spaces_service(request).summarize_memory(data.to_payload())


@utilities_router.post("/memory/truncate")
def truncate_memory(request: Request, data: MemoryTruncateRequest) -> dict[str, Any]:
    return spaces_service(request).truncate_memory(data.to_payload())


@utilities_router.post("/memory/importance")
def score_memory_importance(request: Request, data: MemoryImportanceRequest) -> dict[str, Any]:
    return spaces_service(request).score_memory_importance(data.to_payload())


@router.get("/{space_id}/memories")
def list_memories(
    request: Request,
    space_id: str,
    visitor_id: str = "",
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    pinned: bool | None = None,
    keyword: str = "",
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    return spaces_service(request).list_memories(
        space_id,
        user_id=get_user_id(request),
        visitor_id=visitor_id,
        scope=scope,
        dimension=dimension,
        horizon=horizon,
        pinned=pinned,
        keyword=keyword,
        limit=limit,
        offset=offset,
    )


@router.get("/{space_id}/memory-atoms")
def list_memory_atoms(
    request: Request,
    space_id: str,
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    visibility: str = "",
    visitor_id: str = "",
    character_id: str = "",
    place_id: str = "",
    limit: int = 100,
) -> dict[str, Any]:
    return spaces_service(request).list_memory_atoms(
        space_id,
        user_id=get_user_id(request),
        scope=scope,
        dimension=dimension,
        horizon=horizon,
        visibility=visibility,
        visitor_id=visitor_id,
        character_id=character_id,
        place_id=place_id,
        limit=limit,
    )


@router.post("/{space_id}/memory-atoms")
def create_memory_atom(request: Request, space_id: str, data: MemoryAtomWriteRequest) -> dict[str, Any]:
    return spaces_service(request).create_memory_atom(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/memory-atoms/{memory_id}")
def get_memory_atom(request: Request, space_id: str, memory_id: str) -> dict[str, Any]:
    return spaces_service(request).get_memory_atom(space_id, memory_id, get_user_id(request))


@router.put("/{space_id}/memory-atoms/{memory_id}")
def update_memory_atom(
    request: Request,
    space_id: str,
    memory_id: str,
    data: MemoryAtomWriteRequest,
) -> dict[str, Any]:
    return spaces_service(request).update_memory_atom(space_id, memory_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/memory-atoms/{memory_id}/feedback")
def feedback_memory_atom(
    request: Request,
    space_id: str,
    memory_id: str,
    data: MemoryAtomFeedbackRequest,
) -> dict[str, Any]:
    return spaces_service(request).feedback_memory_atom(space_id, memory_id, data.to_payload(), get_user_id(request))


@router.delete("/{space_id}/memory-atoms/{memory_id}")
def delete_memory_atom(request: Request, space_id: str, memory_id: str) -> dict[str, Any]:
    return spaces_service(request).delete_memory_atom(space_id, memory_id, get_user_id(request))
