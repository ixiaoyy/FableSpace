from __future__ import annotations

from fastapi import APIRouter, Body, Form, Request
from fastapi.responses import FileResponse

from .service import WebService


def create_api_router(service: WebService) -> APIRouter:
    router = APIRouter()

    @router.get("/api/health")
    def get_health() -> dict:
        return service.health_payload()

    @router.get("/api/meta")
    def get_meta(request: Request) -> dict:
        return service.meta_payload(base_url=_request_base_url(request))

    @router.post("/api/nearby")
    def post_nearby(
        request: Request,
        lat: float = Form(...),
        lon: float = Form(...),
        radius: int = Form(300),
        mode: str = Form("live"),
        seed: str = Form(""),
        refresh: bool = Form(False),
    ) -> dict:
        return service.nearby_payload(
            lat=lat,
            lon=lon,
            radius=radius,
            mode=mode,
            seed=seed,
            refresh=refresh,
            base_url=_request_base_url(request),
        )

    @router.post("/api/world/event")
    def post_world_event(event: dict = Body(...)) -> dict:
        return service.writeback_event_payload(event)

    @router.post("/api/world/orchestrate")
    def post_world_orchestrate(
        slice_id: str = Body(...),
        player_id: str = Body(...),
        lat: float = Body(...),
        lon: float = Body(...),
    ) -> dict:
        return service.orchestrate_world(slice_id, player_id, lat, lon)

    @router.get("/generated/{file_path:path}")
    def get_generated_file(file_path: str):
        return FileResponse(service.generated_file_path(file_path))

    return router


def _request_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")
