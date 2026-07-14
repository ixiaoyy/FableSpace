from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from .api.response_envelope import add_api_response_envelope_middleware
from .application.clue_hunts import ClueHuntApplicationService
from .application.spaces import SpaceApplicationService
from .application.services.platform import configure_platform_cache
from .application.territories import TerritoryApplicationService
from .application.simulation_worker import SimulationWorker
from .api.v1.router import api_router
from .core.space import SpaceStore
from .core.clue_hunt import ClueHuntStore
from .infrastructure.settings import ApiSettings
from .infrastructure.generated_storage import GeneratedStorageError, create_generated_storage
from .infrastructure.storage import (
    configure_process_stores,
    create_owner_config_store,
    create_space_store,
    create_territory_store,
    create_visitor_note_store,
)

logger = logging.getLogger(__name__)


def create_store(settings: ApiSettings) -> SpaceStore:
    """Create the authoritative store backend from runtime settings."""
    return create_space_store(settings)


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Create the native enterprise FastAPI application."""

    resolved = settings or ApiSettings()
    configure_platform_cache(resolved.redis_url)
    generated_storage = create_generated_storage(resolved)

    # 根据配置选择存储后端
    store = create_store(resolved)
    configure_process_stores(resolved, store)
    territory_service = TerritoryApplicationService(
        create_territory_store(resolved, store)
    )

    spaces_service = SpaceApplicationService(
        store,
        create_owner_config_store(resolved, store),
        create_visitor_note_store(resolved, store),
        territory_service=territory_service,
    )
    clue_hunt_service = ClueHuntApplicationService(
        ClueHuntStore(resolved.output_root / "clue_hunts.json"),
        store,
    )

    # ── 仿真引擎启动 (v0.9) ───────────
    simulation_worker = SimulationWorker(store, interval_seconds=resolved.simulation_interval_seconds)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        simulation_worker.start()
        try:
            yield
        finally:
            simulation_worker.stop()

    app = FastAPI(title=resolved.app_name, version=resolved.api_version, lifespan=lifespan)
    app.state.settings = resolved
    app.state.territory_service = territory_service
    app.state.spaces = spaces_service
    app.state.clue_hunts = clue_hunt_service
    app.state.simulation_worker = simulation_worker
    app.state.generated_storage = generated_storage

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    add_api_response_envelope_middleware(app, path_prefixes=("/api/v1",))

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "服务暂时不可用"})

    app.include_router(api_router)

    @app.get("/generated/{file_path:path}")
    def get_generated_file(file_path: str):
        """Serve a local generated file or redirect to its prefixed CDN object."""
        try:
            public_url = generated_storage.public_url(file_path)
        except GeneratedStorageError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if public_url:
            return RedirectResponse(public_url, status_code=307)
        candidate = (resolved.output_root / file_path).resolve()
        try:
            candidate.relative_to(resolved.output_root.resolve())
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="generated file not found") from exc
        if not candidate.is_file():
            raise HTTPException(status_code=404, detail="generated file not found")
        return FileResponse(candidate)

    return app
