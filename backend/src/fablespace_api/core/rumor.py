"""
FableSpace Neighborhood Rumor System — 邻里传闻系统

NPC 会分享关于其他空间的传闻，为访客推荐其他空间，增加探索动力。
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class NeighborhoodRumor:
    """
    邻里传闻

    当访客在某个空间聊天时，NPC 可能会分享关于其他空间的传闻，
    帮助访客发现新的地点。

    触发机制：
    1. 关键词触发 - 访客聊到特定话题，NPC 联想到相关空间
    2. 随机触发 - 对话 N 轮后随机分享一条传闻
    3. 访问触发 - 访客首次进入某空间时，NPC 提及其他访客去过的空间
    """

    id: str
    source_space_id: str  # 消息来源空间
    target_space_id: str  # 推荐目标空间
    target_tavern_name: str  # 推荐目标空间名称（冗余存储便于展示）
    character_id: str  # 发言 NPC
    character_name: str  # NPC 名称
    rumor_text: str  # 传闻内容（AI 生成）
    trigger_type: str  # 触发类型: keyword, random, visit
    trigger_keywords: list[str] = field(default_factory=list)  # 触发关键词
    weight: float = 1.0  # 随机权重
    created_at: str = field(default_factory=_utc_now_iso)
    expires_at: str | None = None  # 可选过期时间
    view_count: int = 0  # 浏览次数
    click_count: int = 0  # 点击次数（点击跳转到目标空间）
    is_active: bool = True  # 是否激活

    @classmethod
    def create(
        cls,
        source_space_id: str,
        target_space_id: str,
        target_tavern_name: str,
        character_id: str,
        character_name: str,
        rumor_text: str,
        trigger_type: str = "keyword",
        trigger_keywords: list[str] | None = None,
        weight: float = 1.0,
        expires_at: str | None = None,
    ) -> NeighborhoodRumor:
        return cls(
            id=str(uuid.uuid4()),
            source_space_id=source_space_id,
            target_space_id=target_space_id,
            target_tavern_name=target_tavern_name,
            character_id=character_id,
            character_name=character_name,
            rumor_text=rumor_text,
            trigger_type=trigger_type,
            trigger_keywords=trigger_keywords or [],
            weight=weight,
            expires_at=expires_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "source_space_id": self.source_space_id,
            "target_space_id": self.target_space_id,
            "target_tavern_name": self.target_tavern_name,
            "character_id": self.character_id,
            "character_name": self.character_name,
            "rumor_text": self.rumor_text,
            "trigger_type": self.trigger_type,
            "trigger_keywords": self.trigger_keywords,
            "weight": self.weight,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "view_count": self.view_count,
            "click_count": self.click_count,
            "is_active": self.is_active,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NeighborhoodRumor:
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            source_space_id=data["source_space_id"],
            target_space_id=data["target_space_id"],
            target_tavern_name=data.get("target_tavern_name", ""),
            character_id=data["character_id"],
            character_name=data.get("character_name", ""),
            rumor_text=data["rumor_text"],
            trigger_type=data.get("trigger_type", "keyword"),
            trigger_keywords=data.get("trigger_keywords", []),
            weight=data.get("weight", 1.0),
            created_at=data.get("created_at", _utc_now_iso()),
            expires_at=data.get("expires_at"),
            view_count=data.get("view_count", 0),
            click_count=data.get("click_count", 0),
            is_active=data.get("is_active", True),
        )

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        try:
            expires = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
            return datetime.now(UTC) > expires
        except (ValueError, TypeError):
            return False


class RumorStore:
    """
    传闻存储（显式本地/dev fallback 的内存实现）

    默认运行时应由 `SQLAlchemyRumorStore` 接管。
    """

    def __init__(self):
        self._rumors: dict[str, NeighborhoodRumor] = {}
        # 按来源空间索引
        self._by_source: dict[str, list[str]] = {}
        # 按目标空间索引
        self._by_target: dict[str, list[str]] = {}

    def add(self, rumor: NeighborhoodRumor) -> NeighborhoodRumor:
        self._rumors[rumor.id] = rumor
        # 更新索引
        if rumor.source_space_id not in self._by_source:
            self._by_source[rumor.source_space_id] = []
        if rumor.id not in self._by_source[rumor.source_space_id]:
            self._by_source[rumor.source_space_id].append(rumor.id)
        if rumor.target_space_id not in self._by_target:
            self._by_target[rumor.target_space_id] = []
        if rumor.id not in self._by_target[rumor.target_space_id]:
            self._by_target[rumor.target_space_id].append(rumor.id)
        return rumor

    def get(self, rumor_id: str) -> NeighborhoodRumor | None:
        return self._rumors.get(rumor_id)

    def list_by_source(
        self,
        source_space_id: str,
        limit: int = 10,
        include_expired: bool = False,
    ) -> list[NeighborhoodRumor]:
        rumor_ids = self._by_source.get(source_space_id, [])
        results = []
        for rid in rumor_ids:
            rumor = self._rumors.get(rid)
            if rumor and (include_expired or (rumor.is_active and not rumor.is_expired())):
                results.append(rumor)
        # 按权重排序
        results.sort(key=lambda r: r.weight, reverse=True)
        return results[:limit]

    def list_recent(
        self,
        limit: int = 20,
        exclude_tavern_id: str | None = None,
    ) -> list[NeighborhoodRumor]:
        """获取最近的传闻"""
        results = [r for r in self._rumors.values() if r.is_active and not r.is_expired()]
        if exclude_tavern_id:
            results = [r for r in results if r.source_space_id != exclude_tavern_id]
        # 按时间倒序
        results.sort(key=lambda r: r.created_at, reverse=True)
        return results[:limit]

    def delete(self, rumor_id: str) -> bool:
        rumor = self._rumors.pop(rumor_id, None)
        if rumor:
            # 从索引中移除
            if rumor.source_space_id in self._by_source:
                self._by_source[rumor.source_space_id] = [
                    rid for rid in self._by_source[rumor.source_space_id] if rid != rumor_id
                ]
            if rumor.target_space_id in self._by_target:
                self._by_target[rumor.target_space_id] = [
                    rid for rid in self._by_target[rumor.target_space_id] if rid != rumor_id
                ]
            return True
        return False

    def record_view(self, rumor_id: str) -> None:
        rumor = self._rumors.get(rumor_id)
        if rumor:
            rumor.view_count += 1

    def record_click(self, rumor_id: str) -> None:
        rumor = self._rumors.get(rumor_id)
        if rumor:
            rumor.click_count += 1

    def count(self) -> int:
        return len(self._rumors)


class SQLAlchemyRumorStore(RumorStore):
    """Database-backed rumor store."""

    def __init__(self, database: Any):
        self.database = database

    @staticmethod
    def _parse_dt(value: str | None):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _model_to_rumor(model: Any) -> NeighborhoodRumor:
        created = model.created_at.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z") if model.created_at else _utc_now_iso()
        expires = model.expires_at.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z") if model.expires_at else None
        return NeighborhoodRumor.from_dict({
            "id": model.id,
            "source_space_id": model.source_space_id,
            "target_space_id": model.target_space_id,
            "target_tavern_name": model.target_tavern_name or "",
            "character_id": model.character_id,
            "character_name": model.character_name or "",
            "rumor_text": model.rumor_text,
            "trigger_type": model.trigger_type or "keyword",
            "trigger_keywords": model.trigger_keywords or [],
            "weight": model.weight or 1.0,
            "created_at": created,
            "expires_at": expires,
            "view_count": model.view_count or 0,
            "click_count": model.click_count or 0,
            "is_active": bool(model.is_active),
        })

    def add(self, rumor: NeighborhoodRumor) -> NeighborhoodRumor:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            existing = session.query(NeighborhoodRumorModel).filter_by(id=rumor.id).first()
            payload = {
                "source_space_id": rumor.source_space_id,
                "target_space_id": rumor.target_space_id,
                "target_tavern_name": rumor.target_tavern_name,
                "character_id": rumor.character_id,
                "character_name": rumor.character_name,
                "rumor_text": rumor.rumor_text,
                "trigger_type": rumor.trigger_type,
                "trigger_keywords": rumor.trigger_keywords,
                "weight": rumor.weight,
                "created_at": self._parse_dt(rumor.created_at) or datetime.utcnow(),
                "expires_at": self._parse_dt(rumor.expires_at),
                "view_count": rumor.view_count,
                "click_count": rumor.click_count,
                "is_active": rumor.is_active,
            }
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
            else:
                session.add(NeighborhoodRumorModel(id=rumor.id, **payload))
        return rumor

    def get(self, rumor_id: str) -> NeighborhoodRumor | None:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            model = session.query(NeighborhoodRumorModel).filter_by(id=str(rumor_id)).first()
            return self._model_to_rumor(model) if model else None

    def list_by_source(self, source_space_id: str, limit: int = 10, include_expired: bool = False) -> list[NeighborhoodRumor]:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            query = session.query(NeighborhoodRumorModel).filter_by(source_space_id=str(source_space_id))
            if not include_expired:
                query = query.filter_by(is_active=True)
            models = query.order_by(NeighborhoodRumorModel.weight.desc()).limit(max(1, int(limit or 10))).all()
            rumors = [self._model_to_rumor(model) for model in models]
            return [r for r in rumors if include_expired or not r.is_expired()]

    def list_recent(self, limit: int = 20, exclude_tavern_id: str | None = None) -> list[NeighborhoodRumor]:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            query = session.query(NeighborhoodRumorModel).filter_by(is_active=True)
            if exclude_tavern_id:
                query = query.filter(NeighborhoodRumorModel.source_space_id != str(exclude_tavern_id))
            models = query.order_by(NeighborhoodRumorModel.created_at.desc()).limit(max(1, int(limit or 20))).all()
            return [r for r in (self._model_to_rumor(model) for model in models) if not r.is_expired()]

    def delete(self, rumor_id: str) -> bool:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            return session.query(NeighborhoodRumorModel).filter_by(id=str(rumor_id)).delete() > 0

    def record_view(self, rumor_id: str) -> None:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            model = session.query(NeighborhoodRumorModel).filter_by(id=str(rumor_id)).first()
            if model:
                model.view_count = (model.view_count or 0) + 1

    def record_click(self, rumor_id: str) -> None:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            model = session.query(NeighborhoodRumorModel).filter_by(id=str(rumor_id)).first()
            if model:
                model.click_count = (model.click_count or 0) + 1

    def count(self) -> int:
        from fablespace_api.infrastructure.models import NeighborhoodRumorModel

        with self.database.session_scope() as session:
            return session.query(NeighborhoodRumorModel).count()
