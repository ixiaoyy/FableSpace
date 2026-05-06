from __future__ import annotations

import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .application.taverns import TavernApplicationService
from .api.v1.router import api_router
from .core.tavern import TavernStore
from .infrastructure.settings import ApiSettings
from .infrastructure.storage import (
    configure_process_stores,
    create_owner_config_store,
    create_tavern_store,
    create_visitor_note_store,
)

logger = logging.getLogger(__name__)


def create_store(settings: ApiSettings) -> TavernStore:
    """Create the authoritative store backend from runtime settings."""
    return create_tavern_store(settings)


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Create the native enterprise FastAPI application."""

    resolved = settings or ApiSettings()
    app = FastAPI(title=resolved.app_name, version=resolved.api_version)
    app.state.settings = resolved

    # 根据配置选择存储后端
    store = create_store(resolved)
    configure_process_stores(resolved, store)
    app.state.taverns = TavernApplicationService(
        store,
        create_owner_config_store(resolved, store),
        create_visitor_note_store(resolved, store),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "服务暂时不可用"})

    app.include_router(api_router)
    return app


app = create_app()
