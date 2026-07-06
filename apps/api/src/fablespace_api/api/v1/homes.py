"""
FableSpace Home API — 个人主页 API 端点
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.homes import (
    HomeChatRequest,
    HomeChatResponse,
    HomeCreateRequest,
    HomeListRequest,
    HomeListResponse,
    HomeMemberWriteRequest,
    HomeUpdateRequest,
    HomeVisitMessageRequest,
    HomeVisitRequest,
    HomeVisitResponse,
)
from ...infrastructure.home_store import get_home_store
from .common import get_user_id

router = APIRouter(prefix="/homes", tags=["homes"])


def _get_store():
    return get_home_store()


# ── Home CRUD ────────────────────────────────


@router.get("/me", response_model=dict[str, Any] | None)
def get_my_home(request: Request):
    """获取当前用户的 Home"""
    user_id = get_user_id(request)
    home = _get_store().get_home_by_owner(user_id)
    return home.to_dict() if home else None


@router.post("", response_model=dict[str, Any])
def create_home(request: Request, data: HomeCreateRequest):
    """创建 Home"""
    user_id = get_user_id(request)
    home = _get_store().create_home(
        owner_id=user_id,
        name=data.name or f"{user_id}的小窝",
        description=data.description or "",
        avatar=data.avatar or "",
        cover_image=data.cover_image or "",
        theme=data.theme or "cozy",
        visit_settings=data.visit_settings,
        members=data.members,
    )
    return home.to_dict()


@router.get("/{home_id}", response_model=dict[str, Any] | None)
def get_home(request: Request, home_id: str):
    """获取 Home 详情"""
    home = _get_store().get_home(home_id)
    return home.to_dict() if home else None


@router.patch("/{home_id}", response_model=dict[str, Any] | None)
def update_home(request: Request, home_id: str, data: HomeUpdateRequest):
    """更新 Home"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return None

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    updates = {}
    for field in ["name", "description", "avatar", "cover_image", "theme", "status"]:
        value = getattr(data, field, None)
        if value is not None:
            updates[field] = value
    if data.visit_settings:
        updates["visit_settings"] = data.visit_settings

    updated = _get_store().update_home(home_id, updates)
    return updated.to_dict() if updated else None


@router.delete("/{home_id}")
def delete_home(request: Request, home_id: str):
    """删除 Home"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return {"success": False, "message": "Home not found"}

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    success = _get_store().delete_home(home_id)
    return {"success": success}


@router.get("", response_model=HomeListResponse)
def list_homes(request: Request):
    """获取公开 Home 列表"""
    homes, total = _get_store().list_public_homes()
    return HomeListResponse(
        homes=[h.to_dict() for h in homes],
        count=total,
    )


# ── Home 成员管理 ──────────────────────────


@router.post("/{home_id}/members", response_model=dict[str, Any] | None)
def add_member(request: Request, home_id: str, data: HomeMemberWriteRequest):
    """添加 Home 成员"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return None

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    member_data = data.model_dump(exclude_none=True)
    member = _get_store().add_member(home_id, member_data)
    return member.to_dict() if member else None


@router.patch("/{home_id}/members/{member_id}", response_model=dict[str, Any] | None)
def update_member(request: Request, home_id: str, member_id: str, data: HomeMemberWriteRequest):
    """更新 Home 成员"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return None

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    updates = data.model_dump(exclude_none=True)
    member = _get_store().update_member(home_id, member_id, updates)
    return member.to_dict() if member else None


@router.delete("/{home_id}/members/{member_id}")
def remove_member(request: Request, home_id: str, member_id: str):
    """移除 Home 成员"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return {"success": False, "message": "Home not found"}

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    success = _get_store().remove_member(home_id, member_id)
    return {"success": success}


# ── Home 拜访 ──────────────────────────────


@router.post("/{home_id}/visit", response_model=HomeVisitResponse)
def visit_home(request: Request, home_id: str, data: HomeVisitRequest):
    """拜访 Home"""
    visitor_id = data.visitor_id or get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return HomeVisitResponse(
            home_id=home_id,
            owner_id="",
            name="",
            status="not_found",
            can_enter=False,
            message="Home not found",
        )

    # 检查是否可以进入
    can_enter = home.status == "open"
    message = None

    if not can_enter:
        if home.status == "hidden":
            message = "这个 Home 隐藏了，无法进入"
        else:
            message = "这个 Home 暂时不对外开放"

    # 记录拜访
    if can_enter:
        _get_store().record_visit(home_id, visitor_id)

    return HomeVisitResponse(
        home_id=home_id,
        owner_id=home.owner_id,
        name=home.name,
        status=home.status,
        can_enter=can_enter,
        message=message,
    )


@router.post("/{home_id}/visit/message")
def leave_message(request: Request, home_id: str, data: HomeVisitMessageRequest):
    """留下访客留言"""
    user_id = get_user_id(request)
    success = _get_store().add_visit_message(
        home_id=home_id,
        visitor_id=user_id,
        message=data.content,
        visitor_nickname=data.visitor_nickname,
    )
    return {"success": success}


@router.get("/{home_id}/visits", response_model=list[dict[str, Any]])
def get_visits(request: Request, home_id: str):
    """获取 Home 拜访记录（仅 Home 主人可见）"""
    user_id = get_user_id(request)
    home = _get_store().get_home(home_id)

    if not home:
        return []

    # 验证权限
    if home.owner_id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    visits = _get_store().get_visits(home_id)
    return [v.to_dict() for v in visits]


# ── Home 对话 ──────────────────────────────


@router.post("/{home_id}/chat", response_model=HomeChatResponse)
def chat_with_member(request: Request, home_id: str, data: HomeChatRequest):
    """与 Home 成员对话"""
    message = _get_store().chat_with_member(home_id, data.member_id, data.message)

    if message is None:
        return HomeChatResponse(
            member_id=data.member_id,
            message="成员不存在",
            is_silent=True,
        )

    member = _get_store().get_member(home_id, data.member_id)
    is_silent = member and not member.can_speak if member else False

    return HomeChatResponse(
        member_id=data.member_id,
        message=message,
        is_silent=is_silent,
    )
