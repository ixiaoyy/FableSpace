from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Request

from ...contracts.gameplay import GameplaySessionRequest, GameplayWriteRequest
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["gameplay"])


@router.get("/{tavern_id}/gameplays")
def list_gameplays(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).list_gameplays(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/gameplays")
def save_gameplays(request: Request, tavern_id: str, data: GameplayWriteRequest) -> dict[str, Any]:
    return taverns_service(request).save_gameplays(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/gameplay-sessions")
def list_gameplay_sessions(
    request: Request,
    tavern_id: str,
    state: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    return taverns_service(request).list_gameplay_sessions(
        tavern_id,
        user_id=get_user_id(request),
        state=state,
        visitor_id=visitor_id,
    )


@router.post("/{tavern_id}/gameplay-sessions")
def start_gameplay_session(request: Request, tavern_id: str, data: GameplaySessionRequest) -> dict[str, Any]:
    return taverns_service(request).start_gameplay_session(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/gameplay-sessions/{session_id}/advance")
def advance_gameplay_session(
    request: Request,
    tavern_id: str,
    session_id: str,
    data: dict[str, Any] = Body(default_factory=dict),
) -> dict[str, Any]:
    return taverns_service(request).advance_gameplay_session(tavern_id, session_id, data, get_user_id(request))


@router.post("/{tavern_id}/gameplay-sessions/{session_id}/abandon")
def abandon_gameplay_session(request: Request, tavern_id: str, session_id: str) -> dict[str, Any]:
    return taverns_service(request).abandon_gameplay_session(tavern_id, session_id, get_user_id(request))
