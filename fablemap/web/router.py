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

    @router.post("/api/map/snapshot/{snapshot_id}")
    def post_map_snapshot(snapshot_id: str, payload: dict = Body(...)) -> dict:
        return service.map_snapshot_payload(snapshot_id, payload)

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

    @router.post("/api/ghost/trace")
    def post_ghost_trace(
        player_id: str = Body(...),
        waypoints: list = Body(...),
        mood_arc: list = Body(...),
        visibility: str = Body("local_public"),
    ) -> dict:
        return service.record_ghost_trace_payload(player_id, waypoints, mood_arc, visibility)

    @router.get("/api/ghost/traces/{player_id}")
    def get_ghost_traces(player_id: str) -> dict:
        return service.get_ghost_traces_payload(player_id)

    @router.get("/api/world/landmark/honor/{slice_id}")
    def get_landmark_honor(slice_id: str) -> dict:
        return service.landmark_honor_payload(slice_id)

    @router.post("/api/world/disturbance")
    def post_disturbance(
        slice_id: str = Body(...),
        weather: str | None = Body(None),
        traffic_level: float | None = Body(None),
        crowd_density: float | None = Body(None),
        is_holiday: bool | None = Body(None),
        event_tag: str | None = Body(None),
    ) -> dict:
        return service.inject_disturbance_payload(slice_id, weather, traffic_level, crowd_density, is_holiday, event_tag)

    @router.delete("/api/world/disturbance/{slice_id}")
    def delete_disturbance(slice_id: str) -> dict:
        return service.clear_disturbance_payload(slice_id)

    @router.get("/api/world/disturbance/{slice_id}")
    def get_disturbance(slice_id: str) -> dict:
        return service.get_disturbance_payload(slice_id)

    @router.post("/api/chat")
    def post_chat(
        character_id: str = Body(...),
        message: str = Body(...),
        world_id: str = Body(...),
        poi_id: str = Body(...),
        player_id: str = Body(...),
        history: list = Body([]),
    ) -> dict:
        return service.chat_response_payload(
            character_id, message, world_id, poi_id, player_id, history
        )

    @router.get("/generated/{file_path:path}")
    def get_generated_file(file_path: str):
        return FileResponse(service.generated_file_path(file_path))

    return router


def _request_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")
