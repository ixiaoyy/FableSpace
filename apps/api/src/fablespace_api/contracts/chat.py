from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    character_id: str = ""
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    visitor_gender: str = ""
    play_identity_id: Literal["beggar"] | None = None
    extra_context: list[dict[str, Any]] | None = None
    display_message: str = ""


class GroupChatRequest(BaseModel):
    message: str = Field(min_length=1)
    visitor_id: str = ""
    visitor_name: str = ""
    visitor_gender: str = ""
    play_identity_id: Literal["beggar"] | None = None
    display_message: str = ""


__all__ = ["ChatRequest", "GroupChatRequest"]
