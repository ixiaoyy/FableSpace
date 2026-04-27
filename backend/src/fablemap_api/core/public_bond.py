"""
NpcPublicBond — NPC 公开关系核心域模型

包含：
- PublicBondType 枚举（16 种系统内置关系类型）
- PublicBondStatus 枚举
- PublicBondCapacity 查询函数
- NpcPublicBond 数据类
- NpcPublicBondQueue 数据类
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, ClassVar


# ─── Enums ──────────────────────────────────────────────────────────────────────


class PublicBondType(str, Enum):
    """NPC 公开关系类型枚举（系统内置，MVP 不开放店主自定义）"""

    # 严格 1:1 排他
    SWEETHEART = "sweetheart"           # 情侣
    BROTHER = "brother"                  # 兄弟
    SISTER = "sister"                    # 姐妹
    BEST_FRIEND = "best_friend"          # 闺蜜 / 知己
    CONFIDANT = "confidant"              # 红颜知己
    MALE_CONFIDANT = "male_confidant"    # 蓝颜知己
    SIBLING_YOUNGER = "sibling_younger"  # 兄妹
    SIBLING_OLDER = "sibling_older"      # 姐弟
    SWORN_SIBLING = "sworn_sibling"      # 结拜兄妹

    # 非排他（可多人）
    MASTER = "master"                    # 师徒
    JUNIOR_SISTER = "junior_sister"      # 师姐
    JUNIOR_BROTHER = "junior_brother"    # 师兄
    DISCIPLE_SISTER = "disciple_sister"  # 师妹
    DISCIPLE_BROTHER = "disciple_brother"  # 师弟
    GUARDIAN = "guardian"                # 守护
    CONTRACT_BEAST = "contract_beast"    # 契约兽

    @classmethod
    def exclusive_types(cls) -> list["PublicBondType"]:
        return [
            cls.SWEETHEART,
            cls.BROTHER,
            cls.SISTER,
            cls.BEST_FRIEND,
            cls.CONFIDANT,
            cls.MALE_CONFIDANT,
            cls.SIBLING_YOUNGER,
            cls.SIBLING_OLDER,
            cls.SWORN_SIBLING,
        ]

    @classmethod
    def multi_types(cls) -> list["PublicBondType"]:
        return [
            cls.MASTER,
            cls.JUNIOR_SISTER,
            cls.JUNIOR_BROTHER,
            cls.DISCIPLE_SISTER,
            cls.DISCIPLE_BROTHER,
            cls.GUARDIAN,
            cls.CONTRACT_BEAST,
        ]

    def is_exclusive(self) -> bool:
        return self in self.exclusive_types()

    def display_name(self, lang: str = "zh") -> str:
        names: dict[str, dict[str, str]] = {
            "sweetheart": {"zh": "情侣", "en": "Sweetheart"},
            "brother": {"zh": "兄弟", "en": "Brother"},
            "sister": {"zh": "姐妹", "en": "Sister"},
            "best_friend": {"zh": "闺蜜", "en": "Best Friend"},
            "confidant": {"zh": "红颜知己", "en": "Confidante"},
            "male_confidant": {"zh": "蓝颜知己", "en": "Male Confidant"},
            "sibling_younger": {"zh": "兄妹", "en": "Older Brother"},
            "sibling_older": {"zh": "姐弟", "en": "Older Sister"},
            "sworn_sibling": {"zh": "结拜兄妹", "en": "Sworn Sibling"},
            "master": {"zh": "师徒", "en": "Master-Disciple"},
            "junior_sister": {"zh": "师姐", "en": "Junior Sister"},
            "junior_brother": {"zh": "师兄", "en": "Junior Brother"},
            "disciple_sister": {"zh": "师妹", "en": "Disciple Sister"},
            "disciple_brother": {"zh": "师弟", "en": "Disciple Brother"},
            "guardian": {"zh": "守护", "en": "Guardian"},
            "contract_beast": {"zh": "契约兽", "en": "Contract Beast"},
        }
        return names.get(self.value, {}).get(lang, self.value)

    def to_definition(self) -> dict[str, Any]:
        return {
            "type": self.value,
            "name_zh": self.display_name("zh"),
            "name_en": self.display_name("en"),
            "is_exclusive": self.is_exclusive(),
            "max_count": 1 if self.is_exclusive() else -1,
        }


class PublicBondStatus(str, Enum):
    PENDING = "pending"     # 等待审批
    ACTIVE = "active"      # 活跃生效
    REVOKED = "revoked"    # 已撤销
    EXPIRED = "expired"    # 已过期（MVP 不启用）


class QueueStatus(str, Enum):
    WAITING = "waiting"    # 等待中
    PROMOTED = "promoted"  # 已晋升为 active
    EXPIRED = "expired"    # 已过期


# ─── Public Bond Capacity ───────────────────────────────────────────────────────


def get_bond_capacity(bond_type: PublicBondType) -> dict[str, Any]:
    """返回给定关系类型的容量规则。"""
    return bond_type.to_definition()


def public_bond_type_definitions() -> list[dict[str, Any]]:
    """返回所有关系类型的定义列表（用于 API 暴露）。"""
    return [t.to_definition() for t in PublicBondType]


# ─── Core Domain Classes ───────────────────────────────────────────────────────


@dataclass
class NpcPublicBond:
    """NPC 公开关系核心实体。"""

    id: str
    tavern_id: str
    character_id: str
    visitor_id: str
    bond_type: PublicBondType
    status: PublicBondStatus
    created_at: datetime = field(default_factory=datetime.utcnow)
    approved_at: datetime | None = None
    revoked_at: datetime | None = None
    expires_at: datetime | None = None
    approved_by: str | None = None
    revoked_by: str | None = None
    visitor_note: str | None = None
    owner_note: str | None = None
    revoke_reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "character_id": self.character_id,
            "visitor_id": self.visitor_id,
            "bond_type": self.bond_type.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "approved_by": self.approved_by,
            "revoked_by": self.revoked_by,
            "visitor_note": self.visitor_note,
            "owner_note": self.owner_note,
            "revoke_reason": self.revoke_reason,
            "metadata": self.metadata,
        }

    def to_public_dict(self) -> dict[str, Any]:
        """对外公开的字典（不含访客隐私字段）。"""
        return {
            "id": self.id,
            "character_id": self.character_id,
            "bond_type": self.bond_type.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NpcPublicBond":
        bond_type_val = data.get("bond_type", "sweetheart")
        if isinstance(bond_type_val, str):
            try:
                bond_type = PublicBondType(bond_type_val)
            except ValueError:
                bond_type = PublicBondType.SWEETHEART
        else:
            bond_type = bond_type_val

        status_val = data.get("status", "pending")
        if isinstance(status_val, str):
            try:
                status = PublicBondStatus(status_val)
            except ValueError:
                status = PublicBondStatus.PENDING
        else:
            status = status_val

        def _parse_dt(v: Any) -> datetime | None:
            if v is None:
                return None
            if isinstance(v, datetime):
                return v
            if isinstance(v, str) and v:
                try:
                    return datetime.fromisoformat(v.replace("Z", "+00:00").replace("+00:00", ""))
                except ValueError:
                    return None
            return None

        return cls(
            id=data["id"],
            tavern_id=data["tavern_id"],
            character_id=data["character_id"],
            visitor_id=data["visitor_id"],
            bond_type=bond_type,
            status=status,
            created_at=_parse_dt(data.get("created_at")) or datetime.utcnow(),
            approved_at=_parse_dt(data.get("approved_at")),
            revoked_at=_parse_dt(data.get("revoked_at")),
            expires_at=_parse_dt(data.get("expires_at")),
            approved_by=data.get("approved_by"),
            revoked_by=data.get("revoked_by"),
            visitor_note=data.get("visitor_note"),
            owner_note=data.get("owner_note"),
            revoke_reason=data.get("revoke_reason"),
            metadata=data.get("metadata") or {},
        )


@dataclass
class NpcPublicBondQueue:
    """NPC 公开关系等待队列条目。"""

    id: str
    tavern_id: str
    character_id: str
    visitor_id: str
    bond_type: PublicBondType
    position: int
    status: QueueStatus
    created_at: datetime = field(default_factory=datetime.utcnow)
    promoted_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "character_id": self.character_id,
            "visitor_id": self.visitor_id,
            "bond_type": self.bond_type.value,
            "position": self.position,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "promoted_at": self.promoted_at.isoformat() if self.promoted_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NpcPublicBondQueue":
        bond_type_val = data.get("bond_type", "sweetheart")
        try:
            bond_type = PublicBondType(bond_type_val)
        except ValueError:
            bond_type = PublicBondType.SWEETHEART

        status_val = data.get("status", "waiting")
        try:
            status = QueueStatus(status_val)
        except ValueError:
            status = QueueStatus.WAITING

        def _parse_dt(v: Any) -> datetime | None:
            if v is None:
                return None
            if isinstance(v, datetime):
                return v
            if isinstance(v, str) and v:
                try:
                    return datetime.fromisoformat(v.replace("Z", "+00:00").replace("+00:00", ""))
                except ValueError:
                    return None
            return None

        return cls(
            id=data["id"],
            tavern_id=data["tavern_id"],
            character_id=data["character_id"],
            visitor_id=data["visitor_id"],
            bond_type=bond_type,
            position=int(data.get("position", 1)),
            status=status,
            created_at=_parse_dt(data.get("created_at")) or datetime.utcnow(),
            promoted_at=_parse_dt(data.get("promoted_at")),
        )


# ─── Constants ────────────────────────────────────────────────────────────────

# 触发申请的好感度阈值
AFFINITY_TRIGGER_THRESHOLD: float = 0.70
