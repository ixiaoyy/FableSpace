"""
访客关系重置 API 路由

提供：
- POST /api/v1/taverns/{tavern_id}/characters/{character_id}/relationship/reset
     → 访客重置自己与某 NPC 的私有关系（好感清零、记忆归档、public bond revoke）
- GET  /api/v1/taverns/{tavern_id}/characters/{character_id}/media-drafts
     → 获取 owner 媒体草稿队列（MVP stub，返回空列表）
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["relationship-reset"])


@router.post("/{tavern_id}/characters/{character_id}/relationship/reset")
async def reset_npc_relationship(
    request: Request,
    tavern_id: str,
    character_id: str,
) -> dict[str, Any]:
    """访客重置自己与某 NPC 的私有关系。

    操作顺序：
    1. 将 VisitorModel.relationship_strength 归零、relationship_stage 重置为 stranger；
    2. 删除 VisitorRelationshipProjectionModel 中该 visitor + character 的投影记录；
    3. 将该 visitor + character 范围内的 MemoryAtom 逻辑归档（visibility → "archived"）；
    4. 若存在 active NpcPublicBond，改状态为 revoked（revoke_reason = visitor_reset）。

    仅访客本人可调用（visitor_id 来自请求 Header）。
    不删除 owner 创作内容、全局 NPC 资产或其他访客数据。

    JSON Body（可选）：
    - reason: 离开原因（字符串，最长 500 字）
    """
    visitor_id = get_user_id(request)
    if not visitor_id:
        raise HTTPException(status_code=401, detail="缺少访客身份")

    body: dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass
    reason: str = str(body.get("reason") or "")[:500]

    service = taverns_service(request)
    return service.reset_npc_relationship(
        tavern_id=tavern_id,
        character_id=character_id,
        visitor_id=visitor_id,
        reason=reason,
    )


@router.get("/{tavern_id}/characters/{character_id}/media-drafts")
def list_media_drafts(
    request: Request,
    tavern_id: str,
    character_id: str,
) -> dict[str, Any]:
    """获取 NPC 媒体草稿队列（owner 可见）。

    MVP stub：返回空列表。
    后续任务实现 AI 草稿生成与 owner 审批流。

    Query 参数：
    - status: 草稿状态过滤（pending / approved / rejected），留空返回全部。
    """
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="缺少用户身份")

    # MVP：验证 owner 权限后返回空列表
    service = taverns_service(request)
    try:
        tavern = service._get_tavern_or_404(tavern_id)
        service._ensure_owner(tavern, user_id)
    except HTTPException:
        raise

    return {
        "drafts": [],
        "count": 0,
        "character_id": character_id,
        "note": "媒体草稿队列功能正在开发中",
    }
