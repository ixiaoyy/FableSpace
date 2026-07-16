from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.chat import (
    CharacterTalkativenessRequest,
    ChatExportRequest,
    ChatRequest,
    ChatSearchRequest,
    EpisodeExportRequest,
    GroupChatConfigRequest,
    GroupChatRequest,
)
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["chat"])
chat_router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/{space_id}/chat")
def get_chat_history(
    request: Request,
    space_id: str,
    visitor_id: str = "",
    character_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    user_id = get_user_id(request)
    return spaces_service(request).chat_history(
        space_id,
        visitor_id=visitor_id or user_id,
        character_id=character_id,
        user_id=user_id,
        limit=limit,
    )


@router.post("/{space_id}/chat")
def send_chat(request: Request, space_id: str, data: ChatRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    visitor_id = str(data.visitor_id or user_id).strip()
    if visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).send_chat(
        space_id,
        character_id=data.character_id,
        message=data.message,
        visitor_id=visitor_id,
        visitor_name=data.visitor_name,
        visitor_gender=data.visitor_gender,
        play_identity_id=data.play_identity_id,
        user_id=user_id,
        extra_context=data.extra_context,
        display_message=data.display_message,
    )


@router.get("/{space_id}/group-chat")
def get_group_chat_config(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_group_chat_config(space_id, get_user_id(request))


@router.put("/{space_id}/group-chat/config")
def update_group_chat_config(request: Request, space_id: str, data: GroupChatConfigRequest) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_group_chat_config(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/group-chat")
def send_group_chat(request: Request, space_id: str, data: GroupChatRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    visitor_id = str(data.visitor_id or user_id).strip()
    if visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).send_group_chat(
        space_id,
        message=data.message,
        visitor_id=visitor_id,
        visitor_name=data.visitor_name,
        visitor_gender=data.visitor_gender,
        play_identity_id=data.play_identity_id,
        user_id=user_id,
        display_message=data.display_message,
    )


@router.get("/{space_id}/group-chat/history")
def get_group_chat_history(
    request: Request,
    space_id: str,
    visitor_id: str = "",
    limit: int = 50,
) -> dict[str, Any]:
    return spaces_service(request).get_group_chat_history(
        space_id,
        visitor_id=visitor_id,
        user_id=get_user_id(request),
        limit=limit,
    )


@router.put("/{space_id}/characters/{character_id}/talkativeness")
def update_character_talkativeness(
    request: Request,
    space_id: str,
    character_id: str,
    data: CharacterTalkativenessRequest,
) -> dict[str, Any]:
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).update_character_talkativeness(
        space_id,
        character_id,
        data.to_payload(),
        get_user_id(request),
    )


@router.get("/{space_id}/chat/sessions")
def list_chat_sessions(
    request: Request,
    space_id: str,
    character_id: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    user_id = get_user_id(request)
    return spaces_service(request).list_chat_sessions(
        space_id,
        user_id,
        character_id=character_id,
        visitor_id=visitor_id,
    )


@router.post("/{space_id}/chat/export")
def export_chat(request: Request, space_id: str, data: ChatExportRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    return spaces_service(request).export_chat(
        space_id,
        user_id,
        character_id=data.character_id,
        visitor_id=data.visitor_id,
        format=data.format,
    )


@router.post("/{space_id}/episodes/export")
def export_episode(request: Request, space_id: str, data: EpisodeExportRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    return spaces_service(request).export_episode(
        space_id,
        user_id,
        visitor_id=data.visitor_id,
        character_id=data.character_id,
        title=data.title,
        include_pending=data.include_pending,
        format=data.format,
        limit=data.limit,
    )


@router.post("/{space_id}/chat/search")
def search_chat(request: Request, space_id: str, data: ChatSearchRequest) -> dict[str, Any]:
    return spaces_service(request).search_chat_history(
        space_id,
        get_user_id(request),
        character_id=data.character_id,
        visitor_id=data.visitor_id,
        query=data.query,
        limit=data.limit,
    )


@chat_router.get("/sessions")
def list_global_chat_sessions(
    request: Request,
    character_id: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    return spaces_service(request).list_global_chat_sessions(
        get_user_id(request),
        character_id=character_id,
        visitor_id=visitor_id,
    )
