from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class MemoryAtomWriteRequest(FlexibleBody):
    scope: str | None = None
    dimension: str | None = None
    horizon: str | None = None
    subject: str | None = None
    content: str | None = None
    importance: float | None = None
    confidence: float | None = None
    source_message_ids: list[str] | None = None
    pinned: bool | None = None
    visibility: str | None = None
    visitor_id: str | None = None
    character_id: str | None = None
    place_id: str | None = None
    metadata: dict[str, Any] | None = None


class MemorySummarizeRequest(FlexibleBody):
    messages: list[dict[str, Any]] | None = None
    strategy: str | None = None
    previous_summary: str | None = None


class MemoryTruncateRequest(FlexibleBody):
    messages: list[dict[str, Any]] | None = None
    max_tokens: int | str | None = None


class MemoryImportanceRequest(FlexibleBody):
    messages: list[dict[str, Any]] | None = None


__all__ = [
    "MemoryAtomWriteRequest",
    "MemoryImportanceRequest",
    "MemorySummarizeRequest",
    "MemoryTruncateRequest",
]
