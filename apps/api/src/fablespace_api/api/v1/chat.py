from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ...contracts.chat import ChatRequest, GroupChatRequest
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["chat"])


@router.get("/{space_id}/chat")
def get_chat_history(
    request: Request,
    space_id: str,
    visitor_id: str = "",
    character_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    user_id = get_user_id(request)
    if visitor_id and visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能读取其他玩家的对话")
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
        raise HTTPException(status_code=403, detail="不能代替其他玩家发送对话")
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


@router.post("/{space_id}/group-chat")
def send_group_chat(request: Request, space_id: str, data: GroupChatRequest) -> dict[str, Any]:
    user_id = get_user_id(request)
    visitor_id = str(data.visitor_id or user_id).strip()
    if visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能代替其他玩家发送群聊")
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
    user_id = get_user_id(request)
    if visitor_id and visitor_id != user_id:
        raise HTTPException(status_code=403, detail="不能读取其他玩家的群聊")
    return spaces_service(request).get_group_chat_history(
        space_id,
        visitor_id=visitor_id or user_id,
        user_id=user_id,
        limit=limit,
    )
