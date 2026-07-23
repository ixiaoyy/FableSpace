from __future__ import annotations

import logging
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from fablespace_api.api.response_envelope import add_api_response_envelope_middleware
from fablespace_api.api.v1.router import api_router
from fablespace_api.application.spaces import SpaceApplicationService
from fablespace_api.infrastructure.settings import ApiSettings as NativeApiSettings
from fablespace_api.infrastructure.storage import create_space_store

from .config import ApiSettings

logger = logging.getLogger(__name__)


class SpaStaticFiles(StaticFiles):
    """Serve built assets and only the three supported player routes."""

    def __init__(self, *args, index_file, **kwargs):
        super().__init__(*args, **kwargs)
        self.index_file = index_file

    async def get_response(self, path: str, scope):
        normalized_path = path.replace("\\", "/").strip("/")
        supported_route = (
            normalized_path in {"", "characters"}
            or re.fullmatch(r"stories/[^/]+", normalized_path) is not None
        )
        try:
            response = await super().get_response(path, scope)
            if (
                response.status_code == 404
                and scope.get("method") in {"GET", "HEAD"}
                and supported_route
            ):
                return FileResponse(self.index_file)
            return response
        except StarletteHTTPException as exc:
            first_segment = normalized_path.split("/", 1)[0]
            if first_segment == "api":
                raise
            if (
                exc.status_code == 404
                and scope.get("method") in {"GET", "HEAD"}
                and supported_route
            ):
                return FileResponse(self.index_file)
            raise


def _frontend_static_dir(settings: ApiSettings):
    candidates = [settings.frontend_dist]
    if settings.frontend_root:
        candidates.append(settings.frontend_root / "build" / "client")
    seen = set()
    for candidate in candidates:
        if candidate is None:
            continue
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if (resolved / "index.html").is_file():
            return resolved
    return None


def create_web_app(settings: ApiSettings) -> FastAPI:
    resolved = settings.resolved()
    native_settings = NativeApiSettings(
        output_root=resolved.output_root,
        frontend_root=resolved.frontend_root,
        storage_backend=resolved.storage_backend,
        database_url=resolved.database_url,
        mysql_url=resolved.mysql_url,
        generated_storage_backend=resolved.generated_storage_backend,
        s3_bucket=resolved.s3_bucket,
        s3_region=resolved.s3_region,
        s3_endpoint_url=resolved.s3_endpoint_url,
        s3_access_key_id=resolved.s3_access_key_id,
        s3_secret_access_key=resolved.s3_secret_access_key,
        s3_prefix=resolved.s3_prefix,
        cdn_base_url=resolved.cdn_base_url,
        s3_request_timeout_seconds=resolved.s3_request_timeout_seconds,
    )
    space_store = create_space_store(native_settings)
    app = FastAPI(title="FableSpace API", version="0.1.0")
    app.state.settings = native_settings
    app.state.spaces = SpaceApplicationService(space_store)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    add_api_response_envelope_middleware(app, path_prefixes=("/api",))

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "服务暂时不可用"})

    app.include_router(api_router)

    @app.api_route(
        "/api",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    @app.api_route(
        "/api/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    def api_not_found() -> JSONResponse:
        return JSONResponse(status_code=404, content={"error": "API endpoint not found"})

    frontend_dir = _frontend_static_dir(resolved)
    if frontend_dir:
        index_file = (frontend_dir / "index.html").resolve()

        @app.get("/")
        def get_frontend_index():
            return FileResponse(index_file)

        app.mount("/", SpaStaticFiles(directory=frontend_dir, html=True, index_file=index_file), name="frontend")

    return app
