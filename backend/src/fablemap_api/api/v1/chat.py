from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.chat import (
    CharacterTalkativenessRequest,
    ChatExportRequest,
    ChatRequest,
    ChatSearchRequest,
    GroupChatConfigRequest,
    GroupChatRequest,
)
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["chat"])
chat_router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/{tavern_id}/chat")
def get_chat_history(
    request: Request,
    tavern_id: str,
    visitor_id: str = "",
    character_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    user_id = get_user_id(request)
    return taverns_service(request).chat_history(
        tavern_id,
        visitor_id=visitor_id or user_id,
        character_id=character_id,
        user_id=user_id,
        limit=limit,
    )


@router.post("/{tavern_id}/chat")
def send_chat(request: Request, tavern_id: str, data: ChatRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    return taverns_service(request).send_chat(
        tavern_id,
        character_id=data.character_id,
        message=data.message,
        visitor_id=data.visitor_id or user_id,
        visitor_name=data.visitor_name,
        user_id=user_id,
        extra_context=data.extra_context,
        display_message=data.display_message,
    )


@router.get("/{tavern_id}/group-chat")
def get_group_chat_config(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_group_chat_config(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/group-chat/config")
def update_group_chat_config(request: Request, tavern_id: str, data: GroupChatConfigRequest) -> dict[str, Any]:
    return taverns_service(request).update_group_chat_config(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/group-chat")
def send_group_chat(request: Request, tavern_id: str, data: GroupChatRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    return taverns_service(request).send_group_chat(
        tavern_id,
        message=data.message,
        visitor_id=data.visitor_id or user_id,
        visitor_name=data.visitor_name,
        user_id=user_id,
        display_message=data.display_message,
    )


@router.get("/{tavern_id}/group-chat/history")
def get_group_chat_history(
    request: Request,
    tavern_id: str,
    visitor_id: str = "",
    limit: int = 50,
) -> dict[str, Any]:
    return taverns_service(request).get_group_chat_history(
        tavern_id,
        visitor_id=visitor_id,
        user_id=get_user_id(request),
        limit=limit,
    )


@router.put("/{tavern_id}/characters/{character_id}/talkativeness")
def update_character_talkativeness(
    request: Request,
    tavern_id: str,
    character_id: str,
    data: CharacterTalkativenessRequest,
) -> dict[str, Any]:
    return taverns_service(request).update_character_talkativeness(
        tavern_id,
        character_id,
        data.to_payload(),
        get_user_id(request),
    )


@router.get("/{tavern_id}/chat/sessions")
def list_chat_sessions(
    request: Request,
    tavern_id: str,
    character_id: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    user_id = get_user_id(request)
    return taverns_service(request).list_chat_sessions(
        tavern_id,
        user_id,
        character_id=character_id,
        visitor_id=visitor_id,
    )


@router.post("/{tavern_id}/chat/export")
def export_chat(request: Request, tavern_id: str, data: ChatExportRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    return taverns_service(request).export_chat(
        tavern_id,
        user_id,
        character_id=data.character_id,
        visitor_id=data.visitor_id,
        format=data.format,
    )


@router.post("/{tavern_id}/chat/search")
def search_chat(request: Request, tavern_id: str, data: ChatSearchRequest) -> dict[str, Any]:
    return taverns_service(request).search_chat_history(
        tavern_id,
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
    return taverns_service(request).list_global_chat_sessions(
        get_user_id(request),
        character_id=character_id,
        visitor_id=visitor_id,
    )
