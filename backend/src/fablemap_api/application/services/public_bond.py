"""
NpcPublicBond 应用服务 Mixin

提供 NPC 公开关系的所有业务逻辑：
- 申请（apply）
- 审批（approve / reject）
- 撤销（revoke）
- 查询（访客状态、公开列表、队列）
- 队列晋升（revoke 后自动 promote）
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException

from fablemap_api.core.public_bond import (
    AFFINITY_TRIGGER_THRESHOLD,
    NpcPublicBond,
    NpcPublicBondQueue,
    PublicBondStatus,
    PublicBondType,
    QueueStatus,
    get_bond_capacity,
    public_bond_type_definitions,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


SYSTEM_OWNER_PREFIX = "system_"
PLATFORM_ADMIN_ID = "platform_admin"


def _gen_id(prefix: str) -> str:
    import secrets
    return f"{prefix}_{secrets.token_hex(8)}"


def _utc_now() -> datetime:
    return datetime.utcnow()


# ─── Store Interface ────────────────────────────────────────────────────────────

class PublicBondStore:
    """NpcPublicBond 数据访问接口。

    实现类负责具体数据库操作（MySQL / JSON / mock）。
    """

    def get_bond(self, bond_id: str) -> NpcPublicBond | None:
        raise NotImplementedError

    def get_active_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
        bond_type: PublicBondType,
    ) -> NpcPublicBond | None:
        raise NotImplementedError

    def get_bond_by_visitor(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> list[NpcPublicBond]:
        raise NotImplementedError

    def get_active_bonds_for_character(
        self,
        tavern_id: str,
        character_id: str,
    ) -> list[NpcPublicBond]:
        raise NotImplementedError

    def get_pending_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> NpcPublicBond | None:
        raise NotImplementedError

    def save_bond(self, bond: NpcPublicBond) -> NpcPublicBond:
        raise NotImplementedError

    def get_queue_for_character(
        self,
        tavern_id: str,
        character_id: str,
    ) -> list[NpcPublicBondQueue]:
        raise NotImplementedError

    def get_queue_entry(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> NpcPublicBondQueue | None:
        raise NotImplementedError

    def save_queue_entry(self, entry: NpcPublicBondQueue) -> NpcPublicBondQueue:
        raise NotImplementedError

    def delete_queue_entry(self, queue_id: str) -> None:
        raise NotImplementedError

    def get_exclusive_active_bond_count(
        self,
        tavern_id: str,
        character_id: str,
    ) -> int:
        """返回该 NPC 当前活跃的排他关系数量。"""
        raise NotImplementedError


class MySQLPublicBondStore(PublicBondStore):
    """基于 SQLAlchemy 的 MySQL 实现。"""

    def __init__(self, db: Any):
        self._db = db

    def _model_to_bond(self, model: Any) -> NpcPublicBond:
        return NpcPublicBond.from_dict({
            "id": model.id,
            "tavern_id": model.tavern_id,
            "character_id": model.character_id,
            "visitor_id": model.visitor_id,
            "bond_type": model.bond_type,
            "status": model.status,
            "created_at": model.created_at,
            "approved_at": model.approved_at,
            "revoked_at": model.revoked_at,
            "expires_at": model.expires_at,
            "approved_by": model.approved_by,
            "revoked_by": model.revoked_by,
            "visitor_note": model.visitor_note,
            "owner_note": model.owner_note,
            "revoke_reason": model.revoke_reason,
            "metadata": model.metadata_ or {},
        })

    def _model_to_queue(self, model: Any) -> NpcPublicBondQueue:
        return NpcPublicBondQueue.from_dict({
            "id": model.id,
            "tavern_id": model.tavern_id,
            "character_id": model.character_id,
            "visitor_id": model.visitor_id,
            "bond_type": model.bond_type,
            "position": model.position,
            "status": model.status,
            "created_at": model.created_at,
            "promoted_at": model.promoted_at,
        })

    def get_bond(self, bond_id: str) -> NpcPublicBond | None:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            model = session.query(NpcPublicBondModel).filter_by(id=bond_id).first()
            if not model:
                return None
            return self._model_to_bond(model)

    def get_active_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
        bond_type: PublicBondType,
    ) -> NpcPublicBond | None:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            model = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    bond_type=bond_type.value,
                    status=PublicBondStatus.ACTIVE.value,
                )
                .first()
            )
            if not model:
                return None
            return self._model_to_bond(model)

    def get_bond_by_visitor(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> list[NpcPublicBond]:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            models = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                )
                .order_by(NpcPublicBondModel.created_at.desc())
                .all()
            )
            return [self._model_to_bond(m) for m in models]

    def get_active_bonds_for_character(
        self,
        tavern_id: str,
        character_id: str,
    ) -> list[NpcPublicBond]:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            models = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    status=PublicBondStatus.ACTIVE.value,
                )
                .all()
            )
            return [self._model_to_bond(m) for m in models]

    def get_pending_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> NpcPublicBond | None:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            model = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    status=PublicBondStatus.PENDING.value,
                )
                .first()
            )
            if not model:
                return None
            return self._model_to_bond(model)

    def save_bond(self, bond: NpcPublicBond) -> NpcPublicBond:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        with self._db.session_scope() as session:
            existing = session.query(NpcPublicBondModel).filter_by(id=bond.id).first()
            now = _utc_now()
            if existing:
                existing.bond_type = bond.bond_type.value
                existing.status = bond.status.value
                existing.approved_at = bond.approved_at
                existing.revoked_at = bond.revoked_at
                existing.approved_by = bond.approved_by
                existing.revoked_by = bond.revoked_by
                existing.visitor_note = bond.visitor_note
                existing.owner_note = bond.owner_note
                existing.revoke_reason = bond.revoke_reason
                existing.metadata_ = bond.metadata
            else:
                existing = NpcPublicBondModel(
                    id=bond.id,
                    tavern_id=bond.tavern_id,
                    character_id=bond.character_id,
                    visitor_id=bond.visitor_id,
                    bond_type=bond.bond_type.value,
                    status=bond.status.value,
                    created_at=bond.created_at or now,
                    approved_at=bond.approved_at,
                    revoked_at=bond.revoked_at,
                    expires_at=bond.expires_at,
                    approved_by=bond.approved_by,
                    revoked_by=bond.revoked_by,
                    visitor_note=bond.visitor_note,
                    owner_note=bond.owner_note,
                    revoke_reason=bond.revoke_reason,
                    metadata_=bond.metadata,
                )
                session.add(existing)
            session.commit()
            session.refresh(existing)
            return self._model_to_bond(existing)

    def get_queue_for_character(
        self,
        tavern_id: str,
        character_id: str,
    ) -> list[NpcPublicBondQueue]:
        from fablemap_api.infrastructure.models import NpcPublicBondQueueModel
        with self._db.session_scope() as session:
            models = (
                session.query(NpcPublicBondQueueModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    status=QueueStatus.WAITING.value,
                )
                .order_by(NpcPublicBondQueueModel.position.asc())
                .all()
            )
            return [self._model_to_queue(m) for m in models]

    def get_queue_entry(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> NpcPublicBondQueue | None:
        from fablemap_api.infrastructure.models import NpcPublicBondQueueModel
        with self._db.session_scope() as session:
            model = (
                session.query(NpcPublicBondQueueModel)
                .filter_by(
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    status=QueueStatus.WAITING.value,
                )
                .first()
            )
            if not model:
                return None
            return self._model_to_queue(model)

    def save_queue_entry(self, entry: NpcPublicBondQueue) -> NpcPublicBondQueue:
        from fablemap_api.infrastructure.models import NpcPublicBondQueueModel
        with self._db.session_scope() as session:
            existing = session.query(NpcPublicBondQueueModel).filter_by(id=entry.id).first()
            now = _utc_now()
            if existing:
                existing.position = entry.position
                existing.status = entry.status.value
                existing.promoted_at = entry.promoted_at
            else:
                existing = NpcPublicBondQueueModel(
                    id=entry.id,
                    tavern_id=entry.tavern_id,
                    character_id=entry.character_id,
                    visitor_id=entry.visitor_id,
                    bond_type=entry.bond_type.value,
                    position=entry.position,
                    status=entry.status.value,
                    created_at=entry.created_at or now,
                    promoted_at=entry.promoted_at,
                )
                session.add(existing)
            session.commit()
            session.refresh(existing)
            return self._model_to_queue(existing)

    def delete_queue_entry(self, queue_id: str) -> None:
        from fablemap_api.infrastructure.models import NpcPublicBondQueueModel
        with self._db.session_scope() as session:
            session.query(NpcPublicBondQueueModel).filter_by(id=queue_id).delete()
            session.commit()

    def get_exclusive_active_bond_count(
        self,
        tavern_id: str,
        character_id: str,
    ) -> int:
        from fablemap_api.infrastructure.models import NpcPublicBondModel
        exclusive_types = [t.value for t in PublicBondType.exclusive_types()]
        with self._db.session_scope() as session:
            return (
                session.query(NpcPublicBondModel)
                .filter(
                    NpcPublicBondModel.tavern_id == tavern_id,
                    NpcPublicBondModel.character_id == character_id,
                    NpcPublicBondModel.status == PublicBondStatus.ACTIVE.value,
                    NpcPublicBondModel.bond_type.in_(exclusive_types),
                )
                .count()
            )


# ─── Application Mixin ──────────────────────────────────────────────────────────


class NpcPublicBondApplicationMixin:
    """NPC 公开关系应用服务 Mixin。"""

    def public_bond_types(self) -> list[dict[str, Any]]:
        """返回所有关系类型定义（用于前端下拉）。"""
        return public_bond_type_definitions()

    def check_bond_eligibility(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
        visitor_strength: float,
    ) -> dict[str, Any]:
        """检查访客是否有资格申请结缘。

        Returns:
            { can_apply: bool, reason?: str }
        """
        if visitor_strength < AFFINITY_TRIGGER_THRESHOLD:
            return {
                "can_apply": False,
                "reason": f"好感度不足，需要达到 close_friend（{AFFINITY_TRIGGER_THRESHOLD:.0%}）以上",
                "current_strength": visitor_strength,
                "required_strength": AFFINITY_TRIGGER_THRESHOLD,
            }
        return {"can_apply": True, "current_strength": visitor_strength}

    def apply_public_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
        bond_type_str: str,
        visitor_note: str | None = None,
        visitor_strength: float = 0.0,
        visitor_gender: str | None = None,
    ) -> dict[str, Any]:
        """申请 NPC 公开关系。

        Args:
            bond_type_str: PublicBondType 枚举值
            visitor_strength: 访客对该 NPC 的当前好感度强度
        """
        try:
            bond_type = PublicBondType(bond_type_str)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"未知的关系类型：{bond_type_str}")

        now = _utc_now()

        # 1. 权限校验（访客必须有足够好感度）
        eligibility = self.check_bond_eligibility(
            tavern_id, character_id, visitor_id, visitor_strength
        )
        if not eligibility["can_apply"]:
            raise HTTPException(status_code=403, detail=eligibility["reason"])

        store = self._get_public_bond_store()
        bond_store = store if isinstance(store, PublicBondStore) else None
        if bond_store is None:
            raise HTTPException(status_code=500, detail="Public bond store 未配置")

        # 2. 检查是否已有 pending 或 active 记录
        existing_pending = bond_store.get_pending_bond(tavern_id, character_id, visitor_id)
        if existing_pending:
            raise HTTPException(status_code=409, detail="已有待审批的申请，请等待审批结果")

        active_bonds = bond_store.get_bond_by_visitor(tavern_id, character_id, visitor_id)
        active_same = [b for b in active_bonds if b.status == PublicBondStatus.ACTIVE and b.bond_type == bond_type]
        if active_same:
            raise HTTPException(status_code=409, detail="您已与该 NPC 建立此关系")

        # 3. 判断是否需要入队
        is_exclusive = bond_type.is_exclusive()
        queue_position: int | None = None

        if is_exclusive:
            # 检查是否已有活跃排他关系
            exclusive_count = bond_store.get_exclusive_active_bond_count(tavern_id, character_id)
            if exclusive_count > 0:
                # 入队
                existing_queue = bond_store.get_queue_entry(tavern_id, character_id, visitor_id)
                if existing_queue:
                    queue_position = existing_queue.position
                    return {
                        "bond": None,
                        "queue_position": queue_position,
                        "status": "queued",
                        "message": "该 NPC 已有活跃关系，已进入等待队列",
                    }

                # 获取当前最大 position
                queue = bond_store.get_queue_for_character(tavern_id, character_id)
                next_position = max((q.position for q in queue), default=0) + 1

                queue_entry = NpcPublicBondQueue(
                    id=_gen_id("queue"),
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    bond_type=bond_type,
                    position=next_position,
                    status=QueueStatus.WAITING,
                    created_at=now,
                )
                bond_store.save_queue_entry(queue_entry)
                queue_position = next_position

                # 同时创建一条 pending bond 记录（方便审批时直接 approve）
                bond = NpcPublicBond(
                    id=_gen_id("bond"),
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    bond_type=bond_type,
                    status=PublicBondStatus.PENDING,
                    created_at=now,
                    visitor_note=visitor_note,
                    metadata={"queue_position": next_position, "queued_at": now.isoformat()},
                )
                bond_store.save_bond(bond)
                return {
                    "bond": bond.to_dict(),
                    "queue_position": queue_position,
                    "status": "queued",
                    "message": "该 NPC 已有活跃关系，已进入等待队列",
                }

        # 4. 直接创建 pending bond
        bond = NpcPublicBond(
            id=_gen_id("bond"),
            tavern_id=tavern_id,
            character_id=character_id,
            visitor_id=visitor_id,
            bond_type=bond_type,
            status=PublicBondStatus.PENDING,
            created_at=now,
            visitor_note=visitor_note,
        )
        bond_store.save_bond(bond)
        return {
            "bond": bond.to_dict(),
            "queue_position": None,
            "status": "pending",
            "message": "申请已提交，等待审批",
        }

    def approve_public_bond(
        self,
        tavern_id: str,
        character_id: str,
        bond_id: str,
        approver_id: str,
        owner_note: str | None = None,
    ) -> dict[str, Any]:
        """审批通过一条 bond 申请。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        bond = bond_store.get_bond(bond_id)
        if not bond:
            raise HTTPException(status_code=404, detail="申请不存在")
        if bond.status != PublicBondStatus.PENDING:
            raise HTTPException(status_code=409, detail=f"该申请状态为 {bond.status.value}，无法审批")

        now = _utc_now()
        bond.status = PublicBondStatus.ACTIVE
        bond.approved_at = now
        bond.approved_by = approver_id
        bond.owner_note = owner_note
        saved = bond_store.save_bond(bond)

        # 若是从队列晋升而来，更新队列状态
        queue_entry = bond_store.get_queue_entry(tavern_id, character_id, bond.visitor_id)
        if queue_entry:
            queue_entry.status = QueueStatus.PROMOTED
            queue_entry.promoted_at = now
            bond_store.save_queue_entry(queue_entry)

        return {"bond": saved.to_dict()}

    def reject_public_bond(
        self,
        tavern_id: str,
        character_id: str,
        bond_id: str,
        approver_id: str,
        owner_note: str | None = None,
    ) -> dict[str, Any]:
        """审批拒绝一条 bond 申请。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        bond = bond_store.get_bond(bond_id)
        if not bond:
            raise HTTPException(status_code=404, detail="申请不存在")
        if bond.status != PublicBondStatus.PENDING:
            raise HTTPException(status_code=409, detail=f"该申请状态为 {bond.status.value}，无法拒绝")

        now = _utc_now()
        bond.status = PublicBondStatus.REVOKED
        bond.revoked_at = now
        bond.revoked_by = approver_id
        bond.owner_note = owner_note
        saved = bond_store.save_bond(bond)

        # 清除排队记录
        queue_entry = bond_store.get_queue_entry(tavern_id, character_id, bond.visitor_id)
        if queue_entry:
            bond_store.delete_queue_entry(queue_entry.id)

        return {"bond": saved.to_dict()}

    def revoke_public_bond(
        self,
        tavern_id: str,
        character_id: str,
        bond_id: str,
        revoker_id: str,
        revoke_reason: str | None = None,
    ) -> dict[str, Any]:
        """撤销一条活跃的 bond。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        bond = bond_store.get_bond(bond_id)
        if not bond:
            raise HTTPException(status_code=404, detail="关系记录不存在")
        if bond.status != PublicBondStatus.ACTIVE:
            raise HTTPException(status_code=409, detail=f"该关系状态为 {bond.status.value}，无法撤销")

        now = _utc_now()
        bond.status = PublicBondStatus.REVOKED
        bond.revoked_at = now
        bond.revoked_by = revoker_id
        bond.revoke_reason = revoke_reason
        saved = bond_store.save_bond(bond)

        # 晋升等待队列中的第一个
        if bond.bond_type.is_exclusive():
            queue = bond_store.get_queue_for_character(tavern_id, character_id)
            if queue:
                first_in_queue = queue[0]
                first_in_queue.status = QueueStatus.PROMOTED
                first_in_queue.promoted_at = now
                bond_store.save_queue_entry(first_in_queue)

                # 将队列第一个的 pending bond 晋升为 active
                pending_bond = bond_store.get_bond_by_visitor(
                    tavern_id, character_id, first_in_queue.visitor_id
                )
                pending_pending = next(
                    (b for b in pending_bond if b.status == PublicBondStatus.PENDING),
                    None,
                )
                if pending_pending:
                    pending_pending.status = PublicBondStatus.ACTIVE
                    pending_pending.approved_at = now
                    pending_pending.approved_by = "system_queue_promote"
                    pending_pending.owner_note = "自动晋升（前任撤销）"
                    bond_store.save_bond(pending_pending)

        return {"bond": saved.to_dict()}

    def get_visitor_bond(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
        visitor_strength: float = 0.0,
    ) -> dict[str, Any]:
        """获取当前访客与某 NPC 的关系状态。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        bonds = bond_store.get_bond_by_visitor(tavern_id, character_id, visitor_id)
        eligibility = self.check_bond_eligibility(
            tavern_id, character_id, visitor_id, visitor_strength
        )

        # 找 active 或 pending
        active = next(
            (b for b in bonds if b.status == PublicBondStatus.ACTIVE),
            None,
        )
        pending = next(
            (b for b in bonds if b.status == PublicBondStatus.PENDING),
            None,
        )
        queue_entry = bond_store.get_queue_entry(tavern_id, character_id, visitor_id)

        return {
            "active_bond": active.to_dict() if active else None,
            "pending_bond": pending.to_dict() if pending else None,
            "queue_entry": queue_entry.to_dict() if queue_entry else None,
            "can_apply": eligibility["can_apply"],
            "reason": eligibility.get("reason"),
            "current_strength": visitor_strength,
            "required_strength": AFFINITY_TRIGGER_THRESHOLD,
        }

    def get_public_bonds_for_character(
        self,
        tavern_id: str,
        character_id: str,
    ) -> dict[str, Any]:
        """获取 NPC 所有公开关系（对外，只含 bond_type，不含访客隐私）。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        bonds = bond_store.get_active_bonds_for_character(tavern_id, character_id)
        # 只暴露公开字典（无 visitor_id）
        return {
            "bonds": [b.to_public_dict() for b in bonds],
            "count": len(bonds),
            "has_bond": len(bonds) > 0,
        }

    def get_bond_queue(
        self,
        tavern_id: str,
        character_id: str,
    ) -> dict[str, Any]:
        """获取 NPC 的等待队列（店主可见）。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        queue = bond_store.get_queue_for_character(tavern_id, character_id)
        return {"queue": [q.to_dict() for q in queue], "count": len(queue)}

    def cancel_queue_entry(
        self,
        tavern_id: str,
        character_id: str,
        visitor_id: str,
    ) -> dict[str, Any]:
        """访客取消自己的等待位置。"""
        store = self._get_public_bond_store()
        if not isinstance(store, PublicBondStore):
            raise HTTPException(status_code=500, detail="Public bond store 未配置")
        bond_store = store

        queue_entry = bond_store.get_queue_entry(tavern_id, character_id, visitor_id)
        if not queue_entry:
            raise HTTPException(status_code=404, detail="未找到等待记录")

        bond_store.delete_queue_entry(queue_entry.id)

        # 同时删除对应的 pending bond 记录
        pending_bond = bond_store.get_pending_bond(tavern_id, character_id, visitor_id)
        if pending_bond:
            pending_bond.status = PublicBondStatus.REVOKED
            pending_bond.revoked_at = _utc_now()
            pending_bond.revoke_reason = "访客取消申请"
            bond_store.save_bond(pending_bond)

        return {"cancelled": True, "visitor_id": visitor_id}

    def _get_public_bond_store(self) -> PublicBondStore:
        """子类需要覆盖此方法以提供实际的 store 实例。"""
        raise NotImplementedError
