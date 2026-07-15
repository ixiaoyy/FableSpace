"""
NPC 公开关系 API 路由

提供：
- GET  /api/v1/spaces/{space_id}/characters/{character_id}/public-bond
     → 当前访客与 NPC 的关系状态（active/pending/queue/eligibility）
- GET  /api/v1/spaces/{space_id}/characters/{character_id}/public-bonds
     → NPC 所有公开关系（对外，无访客隐私）
- POST /api/v1/spaces/{space_id}/characters/{character_id}/public-bond/apply
     → 访客申请结缘
- POST /api/v1/spaces/{space_id}/characters/{character_id}/public-bonds/{bond_id}/approve
     → 店主/管理员审批
- POST /api/v1/spaces/{space_id}/characters/{character_id}/public-bonds/{bond_id}/reject
     → 店主/管理员拒绝
- POST /api/v1/spaces/{space_id}/characters/{character_id}/public-bonds/{bond_id}/revoke
     → 店主/管理员撤销
- GET  /api/v1/spaces/{space_id}/public-bond-queue
     → 获取等待队列（店主可见）
- DELETE /api/v1/spaces/{space_id}/public-bond-queue/{queue_id}
     → 访客取消等待位置
- GET  /api/v1/public-bond/types
     → 获取所有关系类型定义
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/spaces", tags=["public-bond"])
types_router = APIRouter(prefix="/public-bond", tags=["public-bond-types"])


# ─── 关系类型定义（无需空间上下文）────────────────────────────────────────

@types_router.get("/types")
def list_public_bond_types(request: Request) -> dict[str, Any]:
    """返回所有内置关系类型定义（用于前端下拉）。"""
    service = spaces_service(request)
    types = service.public_bond_types()
    return {"types": types, "count": len(types)}


# ─── 访客视角 ─────────────────────────────────────────────────────────────

@router.get("/{space_id}/characters/{character_id}/public-bond")
def get_visitor_bond(
    request: Request,
    space_id: str,
    character_id: str,
) -> dict[str, Any]:
    """获取当前访客与某 NPC 的关系状态。

    - active_bond: 当前活跃关系（若存在）
    - pending_bond: 待审批申请（若存在）
    - queue_entry: 等待位置（若存在）
    - can_apply: 是否有资格申请
    - reason: 无法申请的原因（如有）

    Query 参数：
    - visitor_id: 访客 ID（可选，默认从 header 获取）
    - visitor_strength: 访客对该 NPC 的好感度强度（可选，默认 0.0）
    """
    user_id = get_user_id(request)
    visitor_id = str(request.query_params.get("visitor_id") or user_id).strip()
    visitor_strength = float(request.query_params.get("visitor_strength", 0.0))

    if not visitor_id:
        raise HTTPException(401, "缺少访客身份")
    if visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            _check_owner_authority(request, space_id)

    service = spaces_service(request)
    return service.get_visitor_bond(space_id, character_id, visitor_id, visitor_strength)


@router.post("/{space_id}/characters/{character_id}/public-bond/apply")
def apply_public_bond(
    request: Request,
    space_id: str,
    character_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """访客申请与 NPC 建立公开关系。

    前置条件：visitor_strength >= 0.70（AffinityStage.close_friend）。
    1:1 排他关系若 NPC 已有活跃关系，自动进入等待队列。

    Query 参数：
    - visitor_id: 访客 ID（可选，默认从 header 获取）

    JSON Body：
    - bond_type: 关系类型枚举值（如 "sweetheart", "master"）
    - visitor_note: 申请留言（可选）
    - visitor_strength: 访客对该 NPC 的好感度强度
    - visitor_gender: 访客性别（可选）
    """
    user_id = get_user_id(request)
    visitor_id = str(request.query_params.get("visitor_id") or user_id).strip()

    if not visitor_id:
        raise HTTPException(401, "缺少访客身份")
    if visitor_id != user_id:
        require_session_capability(request, CREATOR_CAPABILITY)
        if request.app.state.settings.auth_mode == "parallellines":
            _check_owner_authority(request, space_id)

    body = data
    bond_type = body.get("bond_type")
    visitor_note = body.get("visitor_note")
    visitor_strength = float(body.get("visitor_strength", 0.0))
    visitor_gender = body.get("visitor_gender")

    if not bond_type:
        raise HTTPException(400, "缺少 bond_type 参数")

    service = spaces_service(request)
    return service.apply_public_bond(
        space_id=space_id,
        character_id=character_id,
        visitor_id=visitor_id,
        bond_type_str=bond_type,
        visitor_note=visitor_note,
        visitor_strength=visitor_strength,
        visitor_gender=visitor_gender,
    )


# ─── 公开端点（无需认证，用于 NPC 卡片展示）────────────────────────────────

@router.get("/{space_id}/characters/{character_id}/public-bonds")
def get_public_bonds_for_character(
    request: Request,
    space_id: str,
    character_id: str,
) -> dict[str, Any]:
    """获取 NPC 所有公开关系（对外，无访客隐私）。

    只返回 bond_type 和 status，不暴露 visitor_id。
    用于 NPC 卡片展示「已结缘」徽标。
    """
    service = spaces_service(request)
    return service.get_public_bonds_for_character(space_id, character_id)


# ─── 店主/管理员审批端点 ──────────────────────────────────────────────────

def _check_owner_authority(request: Request, space_id: str) -> str:
    """验证当前用户是否为空间主人；产品管理员也不能绕过资源归属。"""
    user_id = get_user_id(request)
    service = spaces_service(request)
    tavern = service._get_tavern_or_404(space_id)
    service._ensure_owner(tavern, user_id)
    return user_id


@router.post("/{space_id}/characters/{character_id}/public-bonds/{bond_id}/approve")
def approve_public_bond(
    request: Request,
    space_id: str,
    character_id: str,
    bond_id: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """店主审批通过一条申请。

    JSON Body：
    - owner_note: 审批备注（可选）
    """
    require_session_capability(request, CREATOR_CAPABILITY)
    approver_id = _check_owner_authority(request, space_id)
    body = data or {}
    owner_note = body.get("owner_note")

    service = spaces_service(request)
    return service.approve_public_bond(
        space_id=space_id,
        character_id=character_id,
        bond_id=bond_id,
        approver_id=approver_id,
        owner_note=owner_note,
    )


@router.post("/{space_id}/characters/{character_id}/public-bonds/{bond_id}/reject")
def reject_public_bond(
    request: Request,
    space_id: str,
    character_id: str,
    bond_id: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """店主拒绝一条申请。

    JSON Body：
    - owner_note: 拒绝原因（可选）
    """
    require_session_capability(request, CREATOR_CAPABILITY)
    approver_id = _check_owner_authority(request, space_id)
    body = data or {}
    owner_note = body.get("owner_note")

    service = spaces_service(request)
    return service.reject_public_bond(
        space_id=space_id,
        character_id=character_id,
        bond_id=bond_id,
        approver_id=approver_id,
        owner_note=owner_note,
    )


@router.post("/{space_id}/characters/{character_id}/public-bonds/{bond_id}/revoke")
def revoke_public_bond(
    request: Request,
    space_id: str,
    character_id: str,
    bond_id: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """店主撤销一条活跃关系。

    撤销后，若 NPC 有等待队列，第一个等待申请自动晋升为 active。

    JSON Body：
    - revoke_reason: 撤销原因（可选）
    """
    require_session_capability(request, CREATOR_CAPABILITY)
    revoker_id = _check_owner_authority(request, space_id)
    body = data or {}
    revoke_reason = body.get("revoke_reason")

    service = spaces_service(request)
    return service.revoke_public_bond(
        space_id=space_id,
        character_id=character_id,
        bond_id=bond_id,
        revoker_id=revoker_id,
        revoke_reason=revoke_reason,
    )


# ─── 队列管理 ─────────────────────────────────────────────────────────────

@router.get("/{space_id}/public-bond-queue")
def get_bond_queue(
    request: Request,
    space_id: str,
    character_id: str | None = None,
) -> dict[str, Any]:
    """获取等待队列（店主可见）。

    - 若传 character_id，返回该 NPC 的等待队列。
    - 若不传 character_id，返回该空间所有 NPC 的等待队列。
    """
    _check_owner_authority(request, space_id)
    service = spaces_service(request)

    if character_id:
        return service.get_bond_queue(space_id, character_id)

    # 返回该空间所有等待队列
    from fablespace_api.infrastructure.models import NpcPublicBondQueueModel
    from fablespace_api.core.public_bond import QueueStatus

    store = service._get_public_bond_store()
    with store._db.session_scope() as session:
        models = (
            session.query(NpcPublicBondQueueModel)
            .filter_by(
                space_id=space_id,
                status=QueueStatus.WAITING.value,
            )
            .order_by(
                NpcPublicBondQueueModel.character_id,
                NpcPublicBondQueueModel.position,
            )
            .all()
        )

        from fablespace_api.core.public_bond import NpcPublicBondQueue as DomainQueue

        def _to_dict(m: Any) -> dict[str, Any]:
            return {
                "id": m.id,
                "space_id": m.space_id,
                "character_id": m.character_id,
                "visitor_id": m.visitor_id,
                "bond_type": m.bond_type,
                "position": m.position,
                "status": m.status,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "promoted_at": m.promoted_at.isoformat() if m.promoted_at else None,
            }

        return {
            "queue": [_to_dict(m) for m in models],
            "count": len(models),
        }


@router.delete("/{space_id}/public-bond-queue/{queue_id}")
def cancel_queue_entry(
    request: Request,
    space_id: str,
    queue_id: str,
) -> dict[str, Any]:
    """访客取消自己的等待位置。"""
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "缺少访客身份")

    service = spaces_service(request)
    store = service._get_public_bond_store()

    # 验证队列条目属于当前用户
    from fablespace_api.infrastructure.models import NpcPublicBondQueueModel
    from fablespace_api.core.public_bond import QueueStatus

    with store._db.session_scope() as session:
        model = (
            session.query(NpcPublicBondQueueModel)
            .filter_by(id=queue_id, space_id=space_id, status=QueueStatus.WAITING.value)
            .first()
        )
        if not model:
            raise HTTPException(404, "未找到等待记录")
        if model.visitor_id != user_id:
            raise HTTPException(403, "只能取消自己的等待位置")

        character_id = model.character_id

    return service.cancel_queue_entry(space_id, character_id, user_id)
