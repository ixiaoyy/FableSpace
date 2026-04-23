from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.packages import TavernPackageImportRequest
from .common import get_user_id, taverns_service

packages_router = APIRouter(prefix="/tavern-packages", tags=["tavern-packages"])
taverns_router = APIRouter(prefix="/taverns", tags=["packages"])


@packages_router.post("/import")
def import_tavern_package(request: Request, data: TavernPackageImportRequest) -> dict[str, Any]:
    return taverns_service(request).import_tavern_package(data.to_payload(), get_user_id(request))


@taverns_router.get("/{tavern_id}/package")
def export_tavern_package(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).export_tavern_package(tavern_id, get_user_id(request))


@taverns_router.get("/{tavern_id}/visitors")
def list_visitors(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).list_visitors(tavern_id, get_user_id(request))
