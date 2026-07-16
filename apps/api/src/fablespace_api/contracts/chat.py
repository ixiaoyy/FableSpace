from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from .common import FlexibleBody


class ChatRequest(BaseModel):
    # character_id 为空时由后端自动路由到合适的 NPC
    character_id: str = Field(default="")
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    visitor_gender: str = ""
    play_identity_id: Literal["beggar"] | None = None
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
    visitor_gender: str = ""
    play_identity_id: Literal["beggar"] | None = None
    display_message: str = ""


class CharacterTalkativenessRequest(FlexibleBody):
    talkativeness: float | str | None = None
    value: float | str | None = None


class ChatExportRequest(FlexibleBody):
    character_id: str = ""
    visitor_id: str = ""
    format: str = "json"


class EpisodeExportRequest(FlexibleBody):
    visitor_id: str = ""
    character_id: str = ""
    title: str = ""
    include_pending: bool | str | int = False
    format: str = "markdown"
    limit: int | str = 200


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
    "EpisodeExportRequest",
    "GroupChatConfigRequest",
    "GroupChatRequest",
]
