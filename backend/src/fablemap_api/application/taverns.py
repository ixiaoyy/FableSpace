from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from fablemap_api.core.tavern import LLMConfig, Tavern, TavernService, TavernStore

from ..domain.tavern_policy import can_view_tavern, is_tavern_owner
from ..infrastructure.settings import ApiSettings
from .services.management import TavernManagementApplicationMixin
from .services.packages import PackageApplicationMixin
from .services.worldinfo import WorldInfoApplicationMixin
from .services.owner_config import OwnerConfigApplicationMixin
from .services.memories import MemoryApplicationMixin
from .services.gameplay import GameplayApplicationMixin
from .services.runtime import RuntimeApplicationMixin
from .services.characters import CharacterApplicationMixin
from .services.utilities import UtilityApplicationMixin
from .services.roleplay import RoleplayApplicationMixin
from .services.public_bond import NpcPublicBondApplicationMixin


class TavernApplicationService(
    TavernManagementApplicationMixin,
    PackageApplicationMixin,
    WorldInfoApplicationMixin,
    OwnerConfigApplicationMixin,
    MemoryApplicationMixin,
    GameplayApplicationMixin,
    RuntimeApplicationMixin,
    CharacterApplicationMixin,
    UtilityApplicationMixin,
    RoleplayApplicationMixin,
    NpcPublicBondApplicationMixin,
):
    """Application facade for native `/api/v1/taverns` use cases.

    This layer deliberately depends on the current tavern/gameplay/memory core
    modules rather than the current web router/service layer. That keeps HTTP
    contracts in `api/v1`, product orchestration here, and persistence/domain
    behavior in the core modules while the enterprise package is expanded.
    """

    def __init__(self, store: TavernStore):
        self.store = store
        self.taverns = TavernService(store)

    def _get_runtime_llm_config(self, tavern_id: str) -> LLMConfig | None:
        private_getter = getattr(self.store, "get_llm_config_private", None)
        if callable(private_getter):
            return private_getter(tavern_id)
        return self.store.get_llm_config(tavern_id)

    @classmethod
    def from_settings(cls, settings: ApiSettings) -> "TavernApplicationService":
        return cls(TavernStore(settings.output_root / "taverns"))

    def _get_tavern_or_404(self, tavern_id: str) -> Tavern:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")
        return tavern

    def _is_owner(self, tavern: Tavern, user_id: str) -> bool:
        return is_tavern_owner(tavern, user_id)

    def _ensure_owner(self, tavern: Tavern, user_id: str) -> None:
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

    def _ensure_visible(self, tavern: Tavern, user_id: str) -> None:
        if not can_view_tavern(tavern, user_id):
            raise HTTPException(status_code=403, detail="此酒馆是私人的")

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

    def _get_public_bond_store(self) -> "PublicBondStore":
        """返回 PublicBondStore 实例（仅在 MySQL 后端时可用）。"""
        from .services.public_bond import MySQLPublicBondStore
        if hasattr(self.store, "_session"):
            db = self.store._session()
            return MySQLPublicBondStore(db)
        raise HTTPException(500, "Public bond store requires MySQL backend")

    # ── Tavern Messages ──────────────────────────

    def list_tavern_messages(self, tavern_id: str, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        """列出酒馆留言"""
        tavern = self._get_tavern_or_404(tavern_id)

        # 检查是否可访问
        self._ensure_visible(tavern, "")

        # 检查 store 是否支持 messages
        if not hasattr(self.store, "list_tavern_messages"):
            raise HTTPException(500, "Message board not available. Please enable MySQL backend.")

        messages, total, pinned_count = self.store.list_tavern_messages(tavern_id, limit, offset)
        return {
            "messages": messages,
            "count": total,
            "pinned_count": pinned_count,
        }

    def create_tavern_message(self, tavern_id: str, message_data: dict, user_id: str) -> dict[str, Any]:
        """创建留言"""
        tavern = self._get_tavern_or_404(tavern_id)

        # 检查是否可访问
        self._ensure_visible(tavern, user_id)

        # 检查 store 是否支持 messages
        if not hasattr(self.store, "create_tavern_message"):
            raise HTTPException(500, "Message board not available. Please enable MySQL backend.")

        # 验证内容
        content = message_data.get("content", "").strip()
        if not content:
            raise HTTPException(400, "留言内容不能为空")
        if len(content) > 500:
            raise HTTPException(400, "留言内容不能超过 500 字符")

        # 使用用户 ID 作为访客 ID
        visitor_id = user_id or message_data.get("visitor_id", "anonymous")
        visitor_nickname = message_data.get("visitor_nickname", "匿名")

        # 如果有 parent_id，检查父留言是否存在
        parent_id = message_data.get("parent_id")
        if parent_id:
            parent = self.store.get_tavern_message(tavern_id, parent_id)
            if not parent:
                raise HTTPException(404, "父留言不存在")

        result = self.store.create_tavern_message(tavern_id, {
            "visitor_id": visitor_id,
            "visitor_nickname": visitor_nickname,
            "content": content,
            "parent_id": parent_id,
        })

        return result

    def delete_tavern_message(self, tavern_id: str, message_id: str, user_id: str) -> dict[str, Any]:
        """删除留言"""
        tavern = self._get_tavern_or_404(tavern_id)

        # 检查 store 是否支持 messages
        if not hasattr(self.store, "delete_tavern_message"):
            raise HTTPException(500, "Message board not available. Please enable MySQL backend.")

        # 获取留言
        message = self.store.get_tavern_message(tavern_id, message_id)
        if not message:
            raise HTTPException(404, "留言不存在")

        # 检查权限：只有留言者或酒馆主人可以删除
        is_owner = self._is_owner(tavern, user_id)
        is_author = message.get("visitor_id") == user_id

        if not is_owner and not is_author:
            raise HTTPException(403, "无权删除此留言")

        self.store.delete_tavern_message(tavern_id, message_id)
        return {"ok": True, "message_id": message_id}

    def toggle_tavern_message_pin(self, tavern_id: str, message_id: str, user_id: str) -> dict[str, Any]:
        """切换留言置顶状态"""
        tavern = self._get_tavern_or_404(tavern_id)

        # 检查权限：只有酒馆主人可以置顶
        self._ensure_owner(tavern, user_id)

        # 检查 store 是否支持 messages
        if not hasattr(self.store, "toggle_tavern_message_pin"):
            raise HTTPException(500, "Message board not available. Please enable MySQL backend.")

        result = self.store.toggle_tavern_message_pin(tavern_id, message_id)
        if not result:
            raise HTTPException(404, "留言不存在")

        return result

    def reply_tavern_message(self, tavern_id: str, message_id: str, reply_data: dict, user_id: str) -> dict[str, Any]:
        """回复留言"""
        tavern = self._get_tavern_or_404(tavern_id)

        # 检查是否可访问
        self._ensure_visible(tavern, user_id)

        # 检查 store 是否支持 messages
        if not hasattr(self.store, "create_tavern_message"):
            raise HTTPException(500, "Message board not available. Please enable MySQL backend.")

        # 获取父留言
        parent = self.store.get_tavern_message(tavern_id, message_id)
        if not parent:
            raise HTTPException(404, "父留言不存在")

        # 验证内容
        content = reply_data.get("content", "").strip()
        if not content:
            raise HTTPException(400, "回复内容不能为空")
        if len(content) > 500:
            raise HTTPException(400, "回复内容不能超过 500 字符")

        # 回复者的昵称
        is_owner = self._is_owner(tavern, user_id)
        visitor_nickname = reply_data.get("visitor_nickname", "酒馆主人") if is_owner else "访客"

        result = self.store.create_tavern_message(tavern_id, {
            "visitor_id": user_id or "owner",
            "visitor_nickname": visitor_nickname,
            "content": content,
            "parent_id": message_id,
        })

        return result
