from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class TavernPackageImportRequest(FlexibleBody):
    package: dict[str, Any] | None = None
    lat: float | None = None
    lon: float | None = None
    name: str | None = None
    address: str | None = None
    access: str | None = None
    tavern_id: str | None = None


__all__ = ["TavernPackageImportRequest"]
