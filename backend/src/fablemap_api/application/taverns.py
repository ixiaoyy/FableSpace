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
