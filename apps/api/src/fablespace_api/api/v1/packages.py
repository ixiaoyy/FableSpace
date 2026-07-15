from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.packages import SpacePackageImportRequest
from .auth import CREATOR_CAPABILITY, require_session_capability
from .common import get_user_id, spaces_service

packages_router = APIRouter(prefix="/space-packages", tags=["space-packages"])
spaces_router = APIRouter(prefix="/spaces", tags=["packages"])


@packages_router.post("/import")
def import_space_package(request: Request, data: SpacePackageImportRequest) -> dict[str, Any]:
    """Import a Space package payload for the authenticated owner.

    Args:
        request: FastAPI request containing app state and user context.
        data: Package payload and optional placement overrides.

    Returns:
        Imported space payload plus compatibility fields for legacy callers.

    Side effects:
        Persists the imported space through the configured application service.
    """
    require_session_capability(request, CREATOR_CAPABILITY)
    return spaces_service(request).import_tavern_package(data.to_payload(), get_user_id(request))


@spaces_router.get("/{space_id}/package")
def export_space_package(request: Request, space_id: str) -> dict[str, Any]:
    """Export a Space package payload for the authenticated owner.

    Args:
        request: FastAPI request containing app state and user context.
        space_id: Space identifier to export.

    Returns:
        Portable package payload for the requested space.

    Side effects:
        None; this route only reads the configured store.
    """
    return spaces_service(request).export_tavern_package(space_id, get_user_id(request))


@spaces_router.get("/{space_id}/visitors")
def list_visitors(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).list_visitors(space_id, get_user_id(request))
