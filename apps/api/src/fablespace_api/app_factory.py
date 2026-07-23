from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from .api.response_envelope import add_api_response_envelope_middleware
from .api.v1.auth import ParallelLinesAccessVerifier, is_private_access_allowed
from .application.spaces import SpaceApplicationService
from .api.v1.router import api_router
from .core.space import SpaceStore
from .infrastructure.settings import ApiSettings
from .infrastructure.generated_storage import GeneratedStorageError, create_generated_storage
from .infrastructure.storage import create_space_store

logger = logging.getLogger(__name__)
PRIVATE_GATE_PUBLIC_PATHS = frozenset(
    {
        "/api/v1/health",
        "/api/v1/auth/parallellines/callback",
        "/api/v1/auth/status",
        "/api/v1/auth/logout",
    }
)


def create_store(settings: ApiSettings) -> SpaceStore:
    """Create the authoritative store backend from runtime settings."""
    return create_space_store(settings)


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Create the native enterprise FastAPI application."""

    resolved = settings or ApiSettings()
    if resolved.auth_mode == "parallellines" and (
        len(resolved.parallellines_sso_service_secret.strip()) < 32
        or len(resolved.session_secret.strip()) < 32
    ):
        raise RuntimeError(
            "ParallelLines authentication requires both the SSO service secret and session secret"
        )
    if (
        resolved.auth_mode == "parallellines"
        and resolved.generated_storage_backend != "local"
    ):
        raise RuntimeError(
            "ParallelLines private mode requires local generated storage to prevent public CDN bypass"
        )
    generated_storage = create_generated_storage(resolved)

    store = create_store(resolved)
    spaces_service = SpaceApplicationService(store)

    app = FastAPI(title=resolved.app_name, version=resolved.api_version)
    app.state.settings = resolved
    app.state.spaces = spaces_service
    app.state.generated_storage = generated_storage
    app.state.access_verifier = ParallelLinesAccessVerifier(resolved)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    add_api_response_envelope_middleware(app, path_prefixes=("/api/v1",))

    @app.middleware("http")
    async def private_space_access_gate(request: Request, call_next):
        """Validate linked-mode HTTP access, returning 401 or the downstream response."""
        protected_path = request.url.path.startswith(("/api/v1", "/generated/"))
        if (
            request.method != "OPTIONS"
            and protected_path
            and request.url.path not in PRIVATE_GATE_PUBLIC_PATHS
            and not await is_private_access_allowed(request)
        ):
            return JSONResponse(
                status_code=401,
                content={"error": "FableSpace 访问资格无效或已过期"},
                headers={"Cache-Control": "no-store"},
            )
        return await call_next(request)

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
