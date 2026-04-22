from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .application.taverns import TavernApplicationService
from .api.v1.router import api_router
from .core.tavern import TavernStore
from .infrastructure.database import Database, create_database_from_settings
from .infrastructure.mysql_store import MySQLTavernStore, create_mysql_tables
from .infrastructure.settings import ApiSettings

logger = logging.getLogger(__name__)


def create_store(settings: ApiSettings) -> TavernStore:
    """根据配置创建存储后端"""
    mysql_url = getattr(settings, "mysql_url", None) or ""

    if mysql_url:
        # 使用 MySQL 存储
        db = create_database_from_settings(settings)
        if db:
            logger.info(f"使用 MySQL 存储后端: {mysql_url.split('@')[-1] if '@' in mysql_url else mysql_url}")
            create_mysql_tables(db)
            return MySQLTavernStore(db)
        else:
            logger.warning("MySQL URL 配置无效，回退到 JSON 文件存储")

    # 回退到 JSON 文件存储
    output_root = getattr(settings, "output_root", None) or Path(".fablemap-api")
    logger.info(f"使用 JSON 文件存储: {output_root / 'taverns'}")
    return TavernStore(output_root / "taverns")


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Create the native enterprise FastAPI application."""

    resolved = settings or ApiSettings()
    app = FastAPI(title=resolved.app_name, version=resolved.api_version)
    app.state.settings = resolved

    # 根据配置选择存储后端
    store = create_store(resolved)
    app.state.taverns = TavernApplicationService(store)

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

    app.include_router(api_router)
    return app


app = create_app()
