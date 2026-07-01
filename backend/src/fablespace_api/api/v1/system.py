from __future__ import annotations

from fastapi import APIRouter, Request

from ...application.system_status import build_system_status
from ...contracts.health import HealthResponse, MetaResponse
from ...infrastructure.settings import ApiSettings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    settings: ApiSettings = request.app.state.settings
    return build_system_status(settings)


@router.get("/meta", response_model=MetaResponse)
def meta(request: Request) -> MetaResponse:
    settings: ApiSettings = request.app.state.settings
    return MetaResponse(
        app_name=settings.app_name,
        api_version=settings.api_version,
        architecture="frontend-backend-separated",
        product="cyber-tavern-ugc-platform",
    )
