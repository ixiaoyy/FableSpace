"""
访客关系重置应用服务 Mixin

提供 reset_npc_relationship：访客主动结束与某 NPC 的私有关系。

操作范围（仅限请求访客的私有数据）：
  1. VisitorModel → relationship_strength = 0.0, relationship_stage = "stranger"
  2. VisitorRelationshipProjectionModel → 删除该 visitor + character 节点的投影记录
  3. MemoryAtomModel → visitor_id + character_id 范围内改 visibility = "archived"
  4. NpcPublicBondModel → active 记录改 status = "revoked"，写 revoke_reason

不触及：
  - owner 创作的 TavernCharacter、NPC 资产、TavernModel
  - 其他访客的任何数据
  - ChatMessageModel（历史消息只读，不归档/删除）
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException


def _utc_now() -> datetime:
    return datetime.utcnow()


class RelationshipResetApplicationMixin:
    """访客关系重置 Mixin。"""

    def reset_npc_relationship(
        self,
        space_id: str,
        character_id: str,
        visitor_id: str,
        reason: str = "",
    ) -> dict[str, Any]:
        """访客重置自己与某 NPC 的私有关系。

        Args:
            space_id: 空间 ID。
            character_id: NPC ID。
            visitor_id: 访客 ID（已在路由层校验身份）。
            reason: 访客填写的离开原因（可选，最长 500 字）。

        Returns:
            {
              "reset": True,
              "visitor_strength_before": float,
              "memories_archived": int,
              "bond_revoked": bool,
              "bond_id": str | None,
            }
        """
        # 需要 MySQL 后端
        if not hasattr(self.store, "_db"):
            raise HTTPException(
                status_code=500,
                detail="关系重置需要 MySQL 后端",
            )

        db = self.store._db
        now = _utc_now()
        result: dict[str, Any] = {
            "reset": True,
            "visitor_strength_before": 0.0,
            "memories_archived": 0,
            "bond_revoked": False,
            "bond_id": None,
        }

        from fablespace_api.infrastructure.models import (
            MemoryAtomModel,
            NpcPublicBondModel,
            VisitorModel,
            VisitorRelationshipProjectionModel,
        )

        with db.session_scope() as session:
            # ── 1. 重置 VisitorModel 好感数据 ──────────────────────────────
            visitor_record = (
                session.query(VisitorModel)
                .filter_by(space_id=space_id, visitor_id=visitor_id)
                .first()
            )
            if visitor_record:
                result["visitor_strength_before"] = float(
                    visitor_record.relationship_strength or 0.0
                )
                visitor_record.relationship_strength = 0.0
                visitor_record.relationship_stage = "stranger"

            # ── 2. 删除 VisitorRelationshipProjection（该访客 + 该角色节点）──
            (
                session.query(VisitorRelationshipProjectionModel)
                .filter_by(
                    visitor_id=visitor_id,
                    node_type="character",
                    node_id=character_id,
                )
                .delete(synchronize_session=False)
            )

            # ── 3. 归档 MemoryAtom（visitor + character 范围，私有）──────────
            archived_count = (
                session.query(MemoryAtomModel)
                .filter(
                    MemoryAtomModel.space_id == space_id,
                    MemoryAtomModel.visitor_id == visitor_id,
                    MemoryAtomModel.character_id == character_id,
                    MemoryAtomModel.visibility != "archived",
                )
                .update(
                    {"visibility": "archived"},
                    synchronize_session=False,
                )
            )
            result["memories_archived"] = archived_count

            # ── 4. Revoke 活跃的 NpcPublicBond ──────────────────────────────
            active_bond = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    space_id=space_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    status="active",
                )
                .first()
            )
            if active_bond:
                active_bond.status = "revoked"
                active_bond.revoked_at = now
                active_bond.revoked_by = visitor_id
                active_bond.revoke_reason = (
                    f"visitor_reset: {reason}" if reason else "visitor_reset"
                )
                result["bond_revoked"] = True
                result["bond_id"] = active_bond.id

            # ── 5. 取消 pending bond 申请（若有）───────────────────────────
            pending_bond = (
                session.query(NpcPublicBondModel)
                .filter_by(
                    space_id=space_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    status="pending",
                )
                .first()
            )
            if pending_bond:
                pending_bond.status = "revoked"
                pending_bond.revoked_at = now
                pending_bond.revoked_by = visitor_id
                pending_bond.revoke_reason = (
                    f"visitor_reset: {reason}" if reason else "visitor_reset"
                )
                if not result["bond_revoked"]:
                    result["bond_id"] = pending_bond.id

            session.commit()

        return result
