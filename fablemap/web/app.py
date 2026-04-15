from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import ApiSettings
from .router import create_api_router
from .service import WebService


def create_web_app(settings: ApiSettings) -> FastAPI:
    service = WebService(settings)
    app = FastAPI(title="FableMap API", version="0.1.0")
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

    frontend_dir = service.frontend_static_dir()
    if frontend_dir:
        index_file = (frontend_dir / "index.html").resolve()

        @app.get("/")
        def get_frontend_index():
            return FileResponse(index_file)

        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

    return app
