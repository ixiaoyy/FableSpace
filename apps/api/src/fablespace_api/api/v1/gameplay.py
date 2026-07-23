from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from ...contracts.gameplay import GameplaySessionRequest
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["gameplay"])


@router.get("/{space_id}/gameplays")
def list_gameplays(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_gameplays(space_id, get_user_id(request))


@router.get("/{space_id}/gameplay-sessions")
def list_gameplay_sessions(
    request: Request,
    space_id: str,
    state: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    user_id = get_user_id(request)
    if visitor_id and visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能读取其他玩家的故事进度")
    return spaces_service(request).list_gameplay_sessions(
        space_id,
        user_id=user_id,
        state=state,
        visitor_id=visitor_id or user_id,
    )


@router.post("/{space_id}/gameplay-sessions")
def start_gameplay_session(request: Request, space_id: str, data: GameplaySessionRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    payload = data.to_payload()
    visitor_id = str(payload.get("visitor_id") or user_id).strip()
    if visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能代替其他玩家开始故事")
    payload["visitor_id"] = user_id
    return spaces_service(request).start_gameplay_session(space_id, payload, user_id)


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
        raise HTTPException(status_code=403, detail="不能推进其他玩家的故事")
    return service.advance_gameplay_session(space_id, session_id, data, user_id)


@router.post("/{space_id}/gameplay-sessions/{session_id}/abandon")
def abandon_gameplay_session(request: Request, space_id: str, session_id: str) -> dict[str, Any]:
    service = spaces_service(request)
    user_id = get_user_id(request)
    session = service.store.get_gameplay_session(space_id, session_id)
    if session and session.visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能结束其他玩家的故事")
    return service.abandon_gameplay_session(space_id, session_id, user_id)
