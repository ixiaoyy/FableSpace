from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from fablemap_api.api.v1.router import api_router
from fablemap_api.application.taverns import TavernApplicationService
from fablemap_api.infrastructure.settings import ApiSettings as NativeApiSettings

from .config import ApiSettings
from .router import create_api_router
from .service import WebService


class SpaStaticFiles(StaticFiles):
    """Serve built assets normally, but fall back to index.html for app routes."""

    def __init__(self, *args, index_file, **kwargs):
        super().__init__(*args, **kwargs)
        self.index_file = index_file

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            first_segment = path.strip("/").split("/", 1)[0]
            if first_segment == "api":
                raise
            if (
                exc.status_code == 404
                and scope.get("method") in {"GET", "HEAD"}
                and "." not in path.rsplit("/", 1)[-1]
            ):
                return FileResponse(self.index_file)
            raise


def create_web_app(settings: ApiSettings) -> FastAPI:
    service = WebService(settings)
    app = FastAPI(title="FableMap API", version="0.1.0")
    app.state.settings = NativeApiSettings(
        output_root=service.settings.output_root,
        fixture_file=service.settings.fixture_file,
        frontend_root=service.settings.frontend_root,
        sillytavern_url=settings.sillytavern_url,
    )
    app.state.taverns = TavernApplicationService(service.tavern_store)
    app.state.sillytavern_url = settings.sillytavern_url
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    app.include_router(create_api_router(service))
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

    frontend_dir = service.frontend_static_dir()
    if frontend_dir:
        index_file = (frontend_dir / "index.html").resolve()

        @app.get("/")
        def get_frontend_index():
            return FileResponse(index_file)

        app.mount("/", SpaStaticFiles(directory=frontend_dir, html=True, index_file=index_file), name="frontend")

    return app
