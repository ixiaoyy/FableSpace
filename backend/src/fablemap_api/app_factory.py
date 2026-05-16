from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.response_envelope import add_api_response_envelope_middleware
from .application.clue_hunts import ClueHuntApplicationService
from .application.taverns import TavernApplicationService
from .application.territories import TerritoryApplicationService
from .application.simulation_worker import SimulationWorker
from .api.v1.router import api_router
from .core.tavern import TavernStore
from .core.clue_hunt import ClueHuntStore
from .infrastructure.settings import ApiSettings
from .infrastructure.storage import (
    configure_process_stores,
    create_owner_config_store,
    create_tavern_store,
    create_territory_store,
    create_visitor_note_store,
)

logger = logging.getLogger(__name__)


def create_store(settings: ApiSettings) -> TavernStore:
    """Create the authoritative store backend from runtime settings."""
    return create_tavern_store(settings)


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Create the native enterprise FastAPI application."""

    resolved = settings or ApiSettings()

    # 根据配置选择存储后端
    store = create_store(resolved)
    configure_process_stores(resolved, store)
    territory_service = TerritoryApplicationService(
        create_territory_store(resolved, store)
    )

    taverns_service = TavernApplicationService(
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
    app.state.taverns = taverns_service
    app.state.clue_hunts = clue_hunt_service
    app.state.simulation_worker = simulation_worker

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

    return app
