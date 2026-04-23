from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class WorldInfoWriteRequest(FlexibleBody):
    tavern_id: str | None = None
    id: str | None = None
    uid: str | int | None = None
    keys: list[str] | str | None = None
    key: list[str] | str | None = None
    keys_secondary: list[str] | str | None = None
    secondary_keys: list[str] | str | None = None
    keysecondary: list[str] | str | None = None
    content: str | None = None
    constant: bool | str | int | None = None
    selective: bool | str | int | None = None
    insertion_order: int | str | None = None
    order: int | str | None = None
    depth: int | str | None = None
    probability: int | str | None = None
    disable: bool | str | int | None = None


class WorldInfoGlobalTestRequest(FlexibleBody):
    tavern_id: str | None = None
    text: str | None = None
    message: str | None = None
    recent_messages: list[Any] | None = None
    include_tavern_context: bool | None = None
    world_info: list[dict[str, Any]] | dict[str, Any] | None = None


__all__ = ["WorldInfoGlobalTestRequest", "WorldInfoWriteRequest"]
