from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class TokenCountRequest(FlexibleBody):
    text: str | None = None
    backend: str | None = None


class TokenMessagesCountRequest(FlexibleBody):
    messages: list[dict[str, Any]] | None = None
    backend: str | None = None


__all__ = ["TokenCountRequest", "TokenMessagesCountRequest"]
