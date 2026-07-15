from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Request

from ...contracts.gameplay import GameplaySessionRequest, GameplayWriteRequest
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["gameplay"])


@router.get("/{space_id}/gameplays")
def list_gameplays(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_gameplays(space_id, get_user_id(request))


@router.put("/{space_id}/gameplays")
def save_gameplays(request: Request, space_id: str, data: GameplayWriteRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).save_gameplays(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/gameplay-sessions")
def list_gameplay_sessions(
    request: Request,
    space_id: str,
    state: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    return spaces_service(request).list_gameplay_sessions(
        space_id,
        user_id=get_user_id(request),
        state=state,
        visitor_id=visitor_id,
    )


@router.post("/{space_id}/gameplay-sessions")
def start_gameplay_session(request: Request, space_id: str, data: GameplaySessionRequest) -> dict[str, Any]:
    return spaces_service(request).start_gameplay_session(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/gameplay-sessions/{session_id}/advance")
def advance_gameplay_session(
    request: Request,
    space_id: str,
    session_id: str,
    data: dict[str, Any] = Body(default_factory=dict),
) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    session = service.store.get_gameplay_session(space_id, session_id)
    if session and session.visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
    return service.advance_gameplay_session(space_id, session_id, data, user_id)


@router.post("/{space_id}/gameplay-sessions/{session_id}/abandon")
def abandon_gameplay_session(request: Request, space_id: str, session_id: str) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    session = service.store.get_gameplay_session(space_id, session_id)
    if session and session.visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
    return service.abandon_gameplay_session(space_id, session_id, user_id)
