"""
FableSpace Visitor Notes — 访客反馈 API 合约
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class VisitorNoteCreateRequest(BaseModel):
    """访客创建反馈请求"""

    visitor_nickname: str = Field(
        default="匿名访客",
        max_length=50,
        description="访客昵称",
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="反馈内容",
    )


class VisitorNoteResponse(BaseModel):
    """访客反馈响应"""

    id: str
    space_id: str
    visitor_id: str
    visitor_nickname: str
    content: str
    created_at: str
    visibility: str = "owner_only"
    deleted_at: str | None = None


class VisitorNoteListResponse(BaseModel):
    """访客反馈列表响应"""

    notes: list[VisitorNoteResponse]
    count: int


class VisitorNoteCreateOkResponse(BaseModel):
    """访客反馈创建成功响应"""

    ok: bool = True
    note: VisitorNoteResponse


class VisitorNoteDeleteOkResponse(BaseModel):
    """访客反馈删除成功响应"""

    ok: bool = True
    note_id: str
