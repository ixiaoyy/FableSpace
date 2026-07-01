"""
Home API contracts - 个人主页系统请求/响应模型
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .common import FlexibleBody


class HomeCreateRequest(FlexibleBody):
    """创建 Home 请求"""
    name: str | None = None
    description: str | None = None
    avatar: str | None = None
    cover_image: str | None = None
    theme: str | None = None
    visit_settings: dict[str, Any] | None = None
    members: list[dict[str, Any]] | None = None


class HomeUpdateRequest(FlexibleBody):
    """更新 Home 请求"""
    name: str | None = None
    description: str | None = None
    avatar: str | None = None
    cover_image: str | None = None
    theme: str | None = None
    status: str | None = None
    visit_settings: dict[str, Any] | None = None


class HomeMemberWriteRequest(FlexibleBody):
    """Home 成员写入请求"""
    id: str | None = None
    name: str | None = None
    display_name: str | None = None
    member_type: str | None = None
    speech_mode: str | None = None
    description: str | None = None
    avatar: str | None = None
    is_speaking: bool | None = None
    is_living: bool | None = None
    nonliving_note: str | None = None
    character_id: str | None = None
    metadata: dict[str, Any] | None = None


class HomeVisitSettingsRequest(FlexibleBody):
    """Home 访问设置请求"""
    public: bool | None = None
    approval_required: bool | None = None
    friends_only: bool | None = None
    max_daily_visitors: int | None = None


class HomeListRequest(FlexibleBody):
    """Home 列表查询请求"""
    owner_id: str | None = None
    status: str | None = None
    theme: str | None = None
    limit: int = 20
    offset: int = 0


class HomeListResponse(BaseModel):
    """Home 列表响应"""
    homes: list[dict[str, Any]]
    count: int


class HomeVisitRequest(FlexibleBody):
    """拜访 Home 请求"""
    visitor_id: str | None = None
    visitor_nickname: str = "旅人"


class HomeVisitMessageRequest(FlexibleBody):
    """Home 访客留言请求"""
    content: str
    visitor_nickname: str = "旅人"


class HomeChatRequest(FlexibleBody):
    """Home 对话请求"""
    member_id: str
    message: str
    visitor_id: str | None = None
    visitor_name: str = "旅人"


class HomeChatResponse(BaseModel):
    """Home 对话响应"""
    member_id: str
    message: str
    is_silent: bool = False


class HomeVisitResponse(BaseModel):
    """Home 拜访响应"""
    home_id: str
    owner_id: str
    name: str
    status: str
    can_enter: bool
    message: str | None = None


__all__ = [
    "HomeChatRequest",
    "HomeChatResponse",
    "HomeCreateRequest",
    "HomeListRequest",
    "HomeListResponse",
    "HomeMemberWriteRequest",
    "HomeUpdateRequest",
    "HomeVisitMessageRequest",
    "HomeVisitRequest",
    "HomeVisitResponse",
    "HomeVisitSettingsRequest",
]
