from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class GameplayWriteRequest(FlexibleBody):
    gameplays: list[dict[str, Any]] | None = None


class GameplaySessionRequest(FlexibleBody):
    gameplay_id: str | None = None
    character_id: str | None = None


__all__ = ["GameplaySessionRequest", "GameplayWriteRequest"]
