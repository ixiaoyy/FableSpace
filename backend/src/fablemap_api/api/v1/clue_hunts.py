from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from .common import get_user_id

router = APIRouter(prefix="/clue-hunts", tags=["clue-hunts"])


def clue_hunts_service(request: Request):
    return request.app.state.clue_hunts


@router.get("/routes")
def list_clue_hunt_routes(request: Request, owner_id: str = "") -> dict[str, Any]:
    return clue_hunts_service(request).list_routes(owner_id=owner_id or get_user_id(request))


@router.post("/routes")
def create_clue_hunt_route(request: Request, data: dict[str, Any]) -> dict[str, Any]:
    return clue_hunts_service(request).create_route(data, get_user_id(request))


@router.get("/routes/{route_id}")
def get_public_clue_hunt_route(request: Request, route_id: str) -> dict[str, Any]:
    return clue_hunts_service(request).get_public_route(route_id)


@router.put("/routes/{route_id}")
def update_clue_hunt_route(request: Request, route_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return clue_hunts_service(request).update_route(route_id, data, get_user_id(request))


@router.post("/routes/{route_id}/sessions")
def start_clue_hunt_session(request: Request, route_id: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    return clue_hunts_service(request).start_or_resume_session(route_id, data or {}, get_user_id(request))


@router.get("/routes/{route_id}/sessions/{session_id}")
def get_clue_hunt_session(request: Request, route_id: str, session_id: str) -> dict[str, Any]:
    return clue_hunts_service(request).get_session(route_id, session_id, get_user_id(request))


@router.post("/routes/{route_id}/sessions/{session_id}/answer")
def submit_clue_hunt_answer(request: Request, route_id: str, session_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return clue_hunts_service(request).submit_answer(route_id, session_id, data, get_user_id(request))


@router.post("/routes/{route_id}/sessions/{session_id}/reward")
def claim_clue_hunt_reward(request: Request, route_id: str, session_id: str) -> dict[str, Any]:
    return clue_hunts_service(request).claim_reward(route_id, session_id, get_user_id(request))
