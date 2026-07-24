"""Public detail and authenticated private runtime routes for StoryWorlds."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ...application.story_worlds import StoryRuntimeError, StoryWorldApplicationService
from .auth import require_story_session_identity

router = APIRouter(prefix="/story-worlds", tags=["story-worlds"])


class MessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class ChoiceRequest(BaseModel):
    choice_id: str = Field(min_length=1, max_length=128)


def _service(request: Request) -> StoryWorldApplicationService:
    return request.app.state.story_worlds


def _player_id(request: Request) -> str:
    return require_story_session_identity(request).id


def _raise_http(exc: StoryRuntimeError) -> None:
    if exc.code in {"story_world_not_found", "character_not_found", "run_not_found"}:
        status = 404
    elif exc.code == "dialogue_unavailable":
        status = 503
    elif exc.code in {"choice_unavailable", "run_completed", "active_run_exists"}:
        status = 409
    else:
        status = 500
    raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.get("/{story_world_id}/characters/{character_id}")
def get_character_detail(story_world_id: str, character_id: str, request: Request):
    try:
        return _service(request).detail(story_world_id, character_id)
    except StoryRuntimeError as exc:
        _raise_http(exc)


@router.get("/{story_world_id}/runs/current")
def get_current_run(story_world_id: str, request: Request):
    player_id = _player_id(request)
    try:
        return {"run": _service(request).current(player_id, story_world_id)}
    except StoryRuntimeError as exc:
        _raise_http(exc)


@router.post("/{story_world_id}/runs")
def start_run(story_world_id: str, request: Request):
    player_id = _player_id(request)
    try:
        return {"run": _service(request).start(player_id, story_world_id)}
    except StoryRuntimeError as exc:
        _raise_http(exc)


@router.post("/{story_world_id}/runs/restart")
def restart_run(story_world_id: str, request: Request):
    player_id = _player_id(request)
    try:
        return {"run": _service(request).restart(player_id, story_world_id)}
    except StoryRuntimeError as exc:
        _raise_http(exc)


@router.post("/{story_world_id}/runs/{run_id}/messages")
def post_message(
    story_world_id: str,
    run_id: str,
    payload: MessageRequest,
    request: Request,
):
    player_id = _player_id(request)
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="回应不能为空。")
    try:
        return {
            "run": _service(request).message(
                player_id,
                story_world_id,
                run_id,
                content,
            )
        }
    except StoryRuntimeError as exc:
        _raise_http(exc)


@router.post("/{story_world_id}/runs/{run_id}/choices")
def post_choice(
    story_world_id: str,
    run_id: str,
    payload: ChoiceRequest,
    request: Request,
):
    player_id = _player_id(request)
    try:
        return {
            "run": _service(request).choose(
                player_id,
                story_world_id,
                run_id,
                payload.choice_id,
            )
        }
    except StoryRuntimeError as exc:
        _raise_http(exc)
