from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from fablemap_api.core.tavern import LLMConfig, Tavern, TavernService, TavernStore

from ..domain.tavern_policy import can_view_tavern, is_tavern_owner
from ..infrastructure.owner_config_store import OwnerConfigStore
from ..infrastructure.settings import ApiSettings
from ..infrastructure.visitor_note_store import VisitorNoteStore
from .services.management import TavernManagementApplicationMixin
from .services.packages import PackageApplicationMixin
from .services.worldinfo import WorldInfoApplicationMixin
from .services.owner_config import OwnerConfigApplicationMixin
from .services.platform import PlatformApplicationMixin
from .services.memories import MemoryApplicationMixin
from .services.gameplay import GameplayApplicationMixin
from .services.runtime import RuntimeApplicationMixin
from .services.characters import CharacterApplicationMixin
from .services.utilities import UtilityApplicationMixin
from .services.roleplay import RoleplayApplicationMixin
from .services.public_bond import NpcPublicBondApplicationMixin
from .services.rumor import RumorApplicationMixin
from .services.skill_packs import SkillPackApplicationMixin
from .services.state_cards import StateCardApplicationMixin
from .services.relationship_graph import RelationshipGraphApplicationMixin
from .services.neighborhood import NeighborhoodKnowledgeService


class TavernApplicationService(
    TavernManagementApplicationMixin,
    PackageApplicationMixin,
    WorldInfoApplicationMixin,
    OwnerConfigApplicationMixin,
    PlatformApplicationMixin,
    MemoryApplicationMixin,
    GameplayApplicationMixin,
    RuntimeApplicationMixin,
    CharacterApplicationMixin,
    UtilityApplicationMixin,
    RoleplayApplicationMixin,
    NpcPublicBondApplicationMixin,
    RumorApplicationMixin,
    SkillPackApplicationMixin,
    StateCardApplicationMixin,
    RelationshipGraphApplicationMixin,
):
    """Application facade for native `/api/v1/taverns` use cases.

    This layer deliberately depends on the current tavern/gameplay/memory core
    modules rather than the current web router/service layer. That keeps HTTP
    contracts in `api/v1`, product orchestration here, and persistence/domain
    behavior in the core modules while the enterprise package is expanded.
    """

    def __init__(
        self,
        store: TavernStore,
        owner_config_store: OwnerConfigStore | None = None,
        visitor_note_store: VisitorNoteStore | None = None,
        neighborhood_service: NeighborhoodKnowledgeService | None = None,
        territory_service: Any | None = None,
    ):
        self.store = store
        self.taverns = TavernService(store)
        self.owner_config_store = owner_config_store
        self.visitor_note_store = visitor_note_store
        self.neighborhood_service = neighborhood_service
        self.territory_service = territory_service

    def _get_runtime_llm_config(self, tavern_id: str) -> LLMConfig | None:
        private_getter = getattr(self.store, "get_llm_config_private", None)
        if callable(private_getter):
            return private_getter(tavern_id)
        return self.store.get_llm_config(tavern_id)

    @classmethod
    def from_settings(cls, settings: ApiSettings) -> "TavernApplicationService":
        from ..infrastructure.storage import (
            create_neighborhood_knowledge_store,
            create_owner_config_store,
            create_tavern_store,
            create_visitor_note_store,
        )

        store = create_tavern_store(settings)
        neighborhood_store = create_neighborhood_knowledge_store(settings, store)
        territory_store = create_territory_store(settings, store)
        return cls(
            store,
            create_owner_config_store(settings, store),
            create_visitor_note_store(settings, store),
            neighborhood_service=NeighborhoodKnowledgeService(neighborhood_store),
            territory_service=TerritoryApplicationService(territory_store)
        )

    def _get_tavern_or_404(self, tavern_id: str) -> Tavern:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        return tavern

    def _is_owner(self, tavern: Tavern, user_id: str) -> bool:
        return is_tavern_owner(tavern, user_id)

    def _ensure_owner(self, tavern: Tavern, user_id: str) -> None:
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

    def _ensure_visible(self, tavern: Tavern, user_id: str) -> None:
        if not can_view_tavern(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")

    def _safe_int(self, value: Any, fallback: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback

    def _safe_float(self, value: Any, fallback: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return fallback

    def _require_user_id(self, user_id: str) -> str:
        safe_user_id = str(user_id or "").strip()
        if not safe_user_id:
            raise HTTPException(status_code=401, detail="用户身份不能为空")
        return safe_user_id

    def create_visitor_note(self, tavern_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        visitor_id = self._require_user_id(user_id)
        self._ensure_visible(tavern, visitor_id)
        if not self.visitor_note_store:
            raise HTTPException(status_code=500, detail="访客反馈存储不可用")
        content = str(data.get("content") or "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="反馈内容不能为空")
        if len(content) > 500:
            raise HTTPException(status_code=400, detail="反馈内容不能超过 500 字符")
        note = self.visitor_note_store.create_note(
            tavern_id,
            visitor_id,
            {
                "visitor_nickname": str(data.get("visitor_nickname") or "旅人").strip()[:64] or "旅人",
                "content": content,
            },
        )
        return {"ok": True, "note": note}

    def list_visitor_notes(self, tavern_id: str, user_id: str, limit: int = 20, offset: int = 0) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        self._ensure_owner(tavern, self._require_user_id(user_id))
        if not self.visitor_note_store:
            raise HTTPException(status_code=500, detail="访客反馈存储不可用")
        notes, total = self.visitor_note_store.list_notes(tavern_id, limit=limit, offset=offset)
        return {"notes": notes, "count": total}

    def delete_visitor_note(self, tavern_id: str, note_id: str, user_id: str) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(tavern_id)
        safe_user_id = self._require_user_id(user_id)
        if not self.visitor_note_store:
            raise HTTPException(status_code=500, detail="访客反馈存储不可用")
        note = self.visitor_note_store.get_note(tavern_id, note_id)
        if not note:
            raise HTTPException(status_code=404, detail="反馈不存在")
        is_owner = self._is_owner(tavern, safe_user_id)
        is_author = note.get("visitor_id") == safe_user_id
        if not is_owner and not is_author:
            raise HTTPException(status_code=403, detail="无权删除此反馈")
        self.visitor_note_store.delete_note(tavern_id, note_id)
        return {"ok": True, "note_id": note_id}

    def _get_public_bond_store(self) -> "PublicBondStore":
        """返回 PublicBondStore 实例（仅在 MySQL 后端时可用）。"""
        from .services.public_bond import MySQLPublicBondStore
        if hasattr(self.store, "_session"):
            db = self.store._session()
            return MySQLPublicBondStore(db)
        raise HTTPException(500, "Public bond store requires MySQL backend")
