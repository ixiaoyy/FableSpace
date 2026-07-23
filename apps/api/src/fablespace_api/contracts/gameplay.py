from __future__ import annotations

from .common import FlexibleBody


class GameplaySessionRequest(FlexibleBody):
    gameplay_id: str | None = None
    character_id: str | None = None


__all__ = ["GameplaySessionRequest"]
