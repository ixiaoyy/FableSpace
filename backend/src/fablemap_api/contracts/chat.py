from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from .common import FlexibleBody


class ChatRequest(BaseModel):
    character_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    extra_context: list[dict[str, Any]] | None = None
    display_message: str = ""


class GroupChatConfigRequest(FlexibleBody):
    group_chat_enabled: bool | str | int | None = None
    group_chat_config: dict[str, Any] | None = None
    character_talkativeness: dict[str, Any] | None = None


class GroupChatRequest(BaseModel):
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    display_message: str = ""


class CharacterTalkativenessRequest(FlexibleBody):
    talkativeness: float | str | None = None
    value: float | str | None = None


class ChatExportRequest(FlexibleBody):
    character_id: str = ""
    visitor_id: str = ""
    format: str = "json"


class ChatSearchRequest(FlexibleBody):
    character_id: str = ""
    visitor_id: str = ""
    query: str = ""
    limit: int | str = 50


__all__ = [
    "CharacterTalkativenessRequest",
    "ChatExportRequest",
    "ChatRequest",
    "ChatSearchRequest",
    "GroupChatConfigRequest",
    "GroupChatRequest",
]
