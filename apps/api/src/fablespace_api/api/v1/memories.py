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
from .auth import CREATOR_CAPABILITY, require_session_capability
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
    payload = data.to_payload()
    user_id = get_user_id(request)
    scope = str(payload.get("scope") or "visitor_tavern").strip()
    visitor_id = str(payload.get("visitor_id") or payload.get("subject") or user_id).strip()
    owner_operation = scope in {"tavern_public", "place"} or (visitor_id and visitor_id != user_id)
    service = spaces_service(request)
    if owner_operation:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            service._ensure_owner(service._get_tavern_or_404(space_id), user_id)
    return service.create_memory_atom(space_id, payload, user_id)


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
    service = spaces_service(request)
    user_id = get_user_id(request)
    atom = service.store.get_memory_atom(space_id, memory_id)
    payload = data.to_payload()
    target_scope = str(payload.get("scope") or (atom.scope if atom else "")).strip()
    target_visibility = str(payload.get("visibility") or (atom.visibility if atom else "private")).strip()
    target_visitor_id = str(
        payload.get("visitor_id") if "visitor_id" in payload else (atom.visitor_id if atom else "")
    ).strip()
    if not target_visitor_id and target_visibility == "private":
        target_visitor_id = user_id
    if not target_visitor_id and target_scope.startswith("visitor_"):
        target_subject = payload.get("subject") if "subject" in payload else (atom.subject if atom else "")
        target_visitor_id = str(target_subject or user_id).strip()
    owner_operation = bool(atom) and (
        not atom.scope.startswith("visitor_")
        or ((atom.visitor_id or atom.subject) and (atom.visitor_id or atom.subject) != user_id)
    )
    owner_operation = owner_operation or target_scope in {"tavern_public", "place"}
    owner_operation = owner_operation or bool(target_visitor_id and target_visitor_id != user_id)
    if owner_operation:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            service._ensure_owner(service._get_tavern_or_404(space_id), user_id)
    return service.update_memory_atom(space_id, memory_id, payload, user_id)


@router.post("/{space_id}/memory-atoms/{memory_id}/feedback")
def feedback_memory_atom(
    request: Request,
    space_id: str,
    memory_id: str,
    data: MemoryAtomFeedbackRequest,
) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    atom = service.store.get_memory_atom(space_id, memory_id)
    owner_operation = bool(atom) and (
        not atom.scope.startswith("visitor_")
        or ((atom.visitor_id or atom.subject) and (atom.visitor_id or atom.subject) != user_id)
    )
    if owner_operation:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            service._ensure_owner(service._get_tavern_or_404(space_id), user_id)
    return service.feedback_memory_atom(space_id, memory_id, data.to_payload(), user_id)


@router.delete("/{space_id}/memory-atoms/{memory_id}")
def delete_memory_atom(request: Request, space_id: str, memory_id: str) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    atom = service.store.get_memory_atom(space_id, memory_id)
    owner_operation = bool(atom) and (
        not atom.scope.startswith("visitor_")
        or ((atom.visitor_id or atom.subject) and (atom.visitor_id or atom.subject) != user_id)
    )
    if owner_operation:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            service._ensure_owner(service._get_tavern_or_404(space_id), user_id)
    return service.delete_memory_atom(space_id, memory_id, user_id)
