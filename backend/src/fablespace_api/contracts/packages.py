from __future__ import annotations

from typing import Any

from .common import FlexibleBody


class SpacePackageImportRequest(FlexibleBody):
    package: dict[str, Any] | None = None
    lat: float | None = None
    lon: float | None = None
    name: str | None = None
    address: str | None = None
    access: str | None = None
    space_id: str | None = None


TavernPackageImportRequest = SpacePackageImportRequest


__all__ = ["SpacePackageImportRequest", "TavernPackageImportRequest"]
