from __future__ import annotations

import logging
import re
from math import isfinite
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from .api.response_envelope import add_api_response_envelope_middleware
from .api.v1.auth import ParallelLinesAccessVerifier, is_private_access_allowed
from .application.story_worlds import StoryWorldApplicationService, SystemStoryDialogueResponder
from .api.v1.router import api_router
from .content import STORY_WORLD_REGISTRY
from .core.llm_clients import LLMConfig, is_supported_backend
from .infrastructure.database import Database
from .infrastructure.storage import resolve_database_url
from .infrastructure.settings import ApiSettings
from .infrastructure.generated_storage import (
    GeneratedStorageError,
    create_admin_media_storage,
    create_generated_storage,
)
from .infrastructure.managed_story_content_store import (
    ManagedMediaAssetStore,
    ManagedStoryWorldStore,
)

logger = logging.getLogger(__name__)
PRIVATE_GATE_PUBLIC_PATHS = frozenset(
    {
        "/api/v1/health",
        "/api/v1/auth/parallellines/callback",
        "/api/v1/auth/parallellines/start",
        "/api/v1/auth/status",
        "/api/v1/auth/logout",
    }
)
PUBLIC_STORY_CHARACTER_PATH = re.compile(
    r"^/api/v1/story-worlds/[^/]+/characters/[^/]+$"
)


def _is_public_api_request(request: Request) -> bool:
    """Match only intentional public reads and authentication endpoints."""
    path = request.url.path
    if path in PRIVATE_GATE_PUBLIC_PATHS:
        return True
    if request.method != "GET":
        return False
    return bool(PUBLIC_STORY_CHARACTER_PATH.fullmatch(path))


def build_system_story_llm_config(settings: ApiSettings) -> LLMConfig | None:
    """Build the explicit override or existing public-welfare deployment config."""
    explicit_config = settings.llm_explicitly_configured or any(
        (
            settings.llm_backend.strip(),
            settings.llm_model.strip(),
            settings.llm_api_key.strip(),
            settings.llm_base_url.strip(),
            settings.llm_temperature is not None,
            settings.llm_max_tokens is not None,
            settings.llm_top_p is not None,
        )
    )
    if explicit_config:
        source = "fablespace"
        backend = settings.llm_backend.strip().lower()
        model = settings.llm_model.strip()
        api_key = settings.llm_api_key.strip()
        base_url = settings.llm_base_url.strip()
        temperature = settings.llm_temperature
        max_tokens = settings.llm_max_tokens
        top_p = settings.llm_top_p
        setting_names = {
            "backend": "FABLESPACE_LLM_BACKEND",
            "model": "FABLESPACE_LLM_MODEL",
            "api_key": "FABLESPACE_LLM_API_KEY",
            "base_url": "FABLESPACE_LLM_BASE_URL",
        }
    else:
        source = "public_welfare"
        backend = settings.public_welfare_llm_backend.strip().lower()
        model = settings.public_welfare_llm_model.strip()
        api_key = settings.public_welfare_llm_api_key.strip()
        base_url = settings.public_welfare_llm_base_url.strip()
        temperature = 0.8
        max_tokens = 1024
        top_p = 0.9
        setting_names = {
            "backend": "FABLEMAP_DEFAULT_FREE_LLM_BACKEND",
            "model": "FABLEMAP_DEFAULT_FREE_LLM_MODEL",
            "api_key": "FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV",
            "base_url": "FABLEMAP_DEFAULT_FREE_LLM_BASE_URL",
        }
    invalid: list[str] = []

    if not backend or not is_supported_backend(backend):
        invalid.append(setting_names["backend"])
    if not model:
        invalid.append(setting_names["model"])
    if not api_key:
        invalid.append(setting_names["api_key"])

    parsed_base_url = urlparse(base_url)
    if (
        not base_url
        or parsed_base_url.scheme not in {"http", "https"}
        or not parsed_base_url.netloc
    ):
        invalid.append(setting_names["base_url"])

    if explicit_config:
        if (
            isinstance(temperature, bool)
            or not isinstance(temperature, (int, float))
            or not isfinite(float(temperature))
            or not 0 <= float(temperature) <= 2
        ):
            invalid.append("FABLESPACE_LLM_TEMPERATURE")
        if (
            isinstance(max_tokens, bool)
            or not isinstance(max_tokens, int)
            or not 1 <= max_tokens <= 4096
        ):
            invalid.append("FABLESPACE_LLM_MAX_TOKENS")
        if (
            isinstance(top_p, bool)
            or not isinstance(top_p, (int, float))
            or not isfinite(float(top_p))
            or not 0 < float(top_p) <= 1
        ):
            invalid.append("FABLESPACE_LLM_TOP_P")

    if invalid:
        logger.warning(
            "StoryWorld dialogue is unavailable; source=%s missing or invalid settings: %s",
            source,
            ", ".join(invalid),
        )
        return None

    return LLMConfig(
        backend=backend,
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=float(temperature),
        max_tokens=max_tokens,
        top_p=float(top_p),
    )


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
    story_llm_config = build_system_story_llm_config(resolved)
    generated_storage = create_generated_storage(resolved)

    story_database_url = resolve_database_url(resolved)
    story_database = Database(
        url=story_database_url,
        pool_size=resolved.mysql_pool_size,
        max_overflow=resolved.mysql_max_overflow,
        echo=resolved.mysql_echo,
    )
    story_database.create_tables()
    managed_story_worlds = ManagedStoryWorldStore(
        story_database,
        STORY_WORLD_REGISTRY,
    )
    seeded_story_worlds = managed_story_worlds.seed_missing()
    if seeded_story_worlds:
        logger.info("Seeded %s managed StoryWorld documents", seeded_story_worlds)
    story_worlds_service = StoryWorldApplicationService(
        story_database,
        managed_story_worlds,
        SystemStoryDialogueResponder(story_llm_config),
    )

    app = FastAPI(title=resolved.app_name, version=resolved.api_version)
    app.state.settings = resolved
    app.state.story_worlds = story_worlds_service
    app.state.story_database = story_database
    app.state.managed_story_worlds = managed_story_worlds
    app.state.managed_media_assets = ManagedMediaAssetStore(story_database)
    app.state.admin_media_storage = create_admin_media_storage(resolved)
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
    async def private_api_access_gate(request: Request, call_next):
        """Validate linked-mode HTTP access, returning 401 or the downstream response."""
        protected_path = request.url.path.startswith(("/api/v1", "/generated/"))
        if (
            request.method != "OPTIONS"
            and protected_path
            and not _is_public_api_request(request)
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
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
            headers=exc.headers,
        )

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
