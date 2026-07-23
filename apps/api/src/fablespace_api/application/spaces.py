from __future__ import annotations

from fastapi import HTTPException

from fablespace_api.core.space import LLMConfig, Space, SpaceService, SpaceStore

from ..domain.public_reference import parse_public_reference_code, public_reference_code
from ..domain.space_policy import can_view_space
from ..infrastructure.settings import ApiSettings
from .services.gameplay import GameplayApplicationMixin
from .services.management import SpaceAccessApplicationMixin
from .services.runtime import RuntimeApplicationMixin


class SpaceApplicationService(
    SpaceAccessApplicationMixin,
    GameplayApplicationMixin,
    RuntimeApplicationMixin,
):
    """Temporary runtime facade while StoryWorld APIs replace old Space storage."""

    def __init__(self, store: SpaceStore):
        self.store = store
        self.taverns = SpaceService(store)

    def _get_runtime_llm_config(self, space_id: str) -> LLMConfig | None:
        private_getter = getattr(self.store, "get_llm_config_private", None)
        if callable(private_getter):
            return private_getter(space_id)
        return self.store.get_llm_config(space_id)

    @classmethod
    def from_settings(cls, settings: ApiSettings) -> "SpaceApplicationService":
        from ..infrastructure.storage import create_space_store

        return cls(create_space_store(settings))

    def _get_tavern_or_404(self, space_id: str) -> Space:
        space = self.store.get_space(space_id)
        if not space:
            raise HTTPException(status_code=404, detail="故事不存在")
        return space

    def _resolve_public_space_reference_or_404(self, space_reference: str) -> Space:
        code = parse_public_reference_code(space_reference)
        if code:
            list_all_spaces = getattr(self.store, "list_all_spaces", None)
            candidates = list_all_spaces() if callable(list_all_spaces) else []
            matches = [
                space
                for space in candidates
                if public_reference_code("space", space.id) == code
            ]
            if len(matches) > 1:
                raise HTTPException(status_code=409, detail="故事引用冲突")
            if not matches:
                raise HTTPException(status_code=404, detail="故事不存在")
            return matches[0]

        exact = self.store.get_space(space_reference)
        if exact:
            return exact
        raise HTTPException(status_code=404, detail="故事不存在")

    def _ensure_visible(self, space: Space, user_id: str) -> None:
        if not can_view_space(space, user_id):
            raise HTTPException(status_code=403, detail="故事不可见")

    @staticmethod
    def _safe_int(value, fallback: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback
