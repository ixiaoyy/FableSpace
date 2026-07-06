"""
Engagement Store — persistence of engagement config and visitor progress.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from ..core.space import VisitorState


ENGAGEMENT_PROGRESS_KEY = "_engagement_progress"


class EngagementStore:
    """
    Persists engagement config and per-visitor engagement progress.

    Uses the same private bucket pattern as other visitor data:
    - config stored as _engagement_config in tavern data
    - progress stored as _engagement_progress in tavern data under _visitors
    """

    def __init__(self, space_store: Any):
        self._tavern_store = space_store

    def get_space(self, space_id: str) -> Any:
        return self._tavern_store.get_space(space_id)

    def load_config(self, space_id: str) -> dict[str, Any]:
        tavern = self.get_space(space_id)
        config = getattr(tavern, "engagement_config", {}) if tavern else {}
        return deepcopy(config) if isinstance(config, dict) else {}

    def save_config(self, space_id: str, config: dict[str, Any]) -> None:
        tavern = self.get_space(space_id)
        if not tavern:
            return
        tavern.engagement_config = deepcopy(config) if isinstance(config, dict) else {}
        self._tavern_store.update_space(tavern)

    def load_progress(self, space_id: str, visitor_id: str) -> dict[str, Any]:
        state = self._tavern_store.get_visitor_state(space_id, visitor_id)
        metadata = getattr(state, "metadata", {}) if state else {}
        if not isinstance(metadata, dict):
            return {}
        progress = metadata.get(ENGAGEMENT_PROGRESS_KEY, {})
        return deepcopy(progress) if isinstance(progress, dict) else {}

    def save_progress(self, space_id: str, visitor_id: str, progress: dict[str, Any]) -> None:
        state = self._tavern_store.get_visitor_state(space_id, visitor_id)
        if not state:
            state = VisitorState(visitor_id=visitor_id, space_id=space_id)
        metadata = deepcopy(state.metadata) if isinstance(state.metadata, dict) else {}
        metadata[ENGAGEMENT_PROGRESS_KEY] = deepcopy(progress) if isinstance(progress, dict) else {}
        state.metadata = metadata
        self._tavern_store.update_visitor_state(space_id, state)

    def get_gameplay_session(self, space_id: str, session_id: str) -> Any | None:
        getter = getattr(self._tavern_store, "get_gameplay_session", None)
        if callable(getter):
            return getter(space_id, session_id)
        return None
