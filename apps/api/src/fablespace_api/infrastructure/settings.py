from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[5]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablespace-api"
DEFAULT_FRONTEND_ROOT = REPO_ROOT / "apps" / "web"


def _env_value(primary: str, legacy: str = "", default: str = "") -> str:
    value = os.environ.get(primary, "").strip()
    if value:
        return value
    if legacy:
        legacy_value = os.environ.get(legacy, "").strip()
        if legacy_value:
            return legacy_value
    return default


def _path_from_env(primary: str, legacy: str, default: Path) -> Path:
    value = _env_value(primary, legacy)
    return Path(value) if value else default


def _optional_path_from_env(primary: str, legacy: str, default: Path | None) -> Path | None:
    value = os.environ.get(primary)
    if value is None and legacy:
        value = os.environ.get(legacy)
    if value is None:
        return default
    value = value.strip()
    return Path(value) if value else None


def _default_output_root() -> Path:
    return _path_from_env("FABLESPACE_OUTPUT_ROOT", "FABLEMAP_OUTPUT_ROOT", DEFAULT_OUTPUT_ROOT)


def _default_frontend_root() -> Path | None:
    return _optional_path_from_env("FABLESPACE_FRONTEND_ROOT", "FABLEMAP_FRONTEND_ROOT", DEFAULT_FRONTEND_ROOT)


def _default_cors_origins() -> list[str]:
    value = _env_value("FABLESPACE_CORS_ORIGINS", "FABLEMAP_CORS_ORIGINS")
    if not value:
        return ["http://127.0.0.1:5173", "http://localhost:5173"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _default_sillytavern_url() -> str:
    return _env_value(
        "FABLESPACE_SILLYTAVERN_URL",
        "FABLEMAP_SILLYTAVERN_URL",
        "http://127.0.0.1:8000",
    ) or "http://127.0.0.1:8000"


def _default_database_url() -> str:
    """Primary SQLAlchemy database URL. Empty means use the default SQLite file when storage_backend=database."""
    return _env_value("FABLESPACE_DATABASE_URL", "FABLEMAP_DATABASE_URL")


def _default_mysql_url() -> str:
    """Legacy alias for database URL. Kept for existing deployments."""
    return _env_value("FABLESPACE_MYSQL_URL", "FABLEMAP_MYSQL_URL")


def _default_storage_backend() -> str:
    value = _env_value("FABLESPACE_STORAGE_BACKEND", "FABLEMAP_STORAGE_BACKEND", "database").lower()
    return value if value in {"database", "json"} else "database"


def _default_generated_storage_backend() -> str:
    """Return the generated-file backend, restricted to supported values."""
    value = _env_value("FABLESPACE_GENERATED_STORAGE_BACKEND", default="local").lower()
    return value if value in {"local", "s3"} else "local"


def _default_auth_mode() -> str:
    """Return the supported request-identity mode selected by deployment configuration."""
    value = _env_value("FABLESPACE_AUTH_MODE", default="legacy").lower()
    return value if value in {"legacy", "parallellines"} else "legacy"


def _int_from_env(primary: str, legacy: str, default: int) -> int:
    value = _env_value(primary, legacy)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _bool_from_env(primary: str, legacy: str, default: bool = False) -> bool:
    value = _env_value(primary, legacy).lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ApiSettings:
    app_name: str = "FableSpace API"
    api_version: str = "0.1.0-enterprise-native"
    cors_origins: list[str] = field(default_factory=_default_cors_origins)
    output_root: Path = field(default_factory=_default_output_root)
    frontend_root: Path | None = field(default_factory=_default_frontend_root)
    sillytavern_url: str = field(default_factory=_default_sillytavern_url)

    # Authentication. `legacy` preserves standalone development; production can
    # require a signed session issued through ParallelLines SSO.
    auth_mode: str = field(default_factory=_default_auth_mode)
    parallellines_api_base_url: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_PARALLELLINES_API_BASE_URL",
            default="http://127.0.0.1:8000/api/v1",
        )
    )
    parallellines_public_base_url: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_PARALLELLINES_PUBLIC_BASE_URL",
            default="https://pingxingxian.space",
        )
    )
    parallellines_sso_service_secret: str = field(
        default_factory=lambda: _env_value("FABLESPACE_PARALLELLINES_SSO_SERVICE_SECRET")
    )
    session_secret: str = field(default_factory=lambda: _env_value("FABLESPACE_SESSION_SECRET"))
    session_cookie_name: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_SESSION_COOKIE_NAME",
            default="fablespace_session",
        )
    )
    session_cookie_secure: bool = field(
        default_factory=lambda: _bool_from_env("FABLESPACE_SESSION_COOKIE_SECURE", "", True)
    )
    session_ttl_seconds: int = field(
        default_factory=lambda: _int_from_env("FABLESPACE_SESSION_TTL_SECONDS", "", 3600)
    )
    auth_introspection_cache_ttl_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS",
            "",
            30,
        )
    )
    auth_introspection_timeout_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_AUTH_INTROSPECTION_TIMEOUT_SECONDS",
            "",
            5,
        )
    )

    # Database configuration. `mysql_url` is a legacy alias; `database_url` may also be sqlite:///...
    storage_backend: str = field(default_factory=_default_storage_backend)
    database_url: str = field(default_factory=_default_database_url)
    mysql_url: str = field(default_factory=_default_mysql_url)
    mysql_pool_size: int = field(default_factory=lambda: _int_from_env("FABLESPACE_MYSQL_POOL_SIZE", "FABLEMAP_MYSQL_POOL_SIZE", 5))
    mysql_max_overflow: int = field(default_factory=lambda: _int_from_env("FABLESPACE_MYSQL_MAX_OVERFLOW", "FABLEMAP_MYSQL_MAX_OVERFLOW", 10))
    mysql_echo: bool = field(default_factory=lambda: _bool_from_env("FABLESPACE_MYSQL_ECHO", "FABLEMAP_MYSQL_ECHO", False))
    simulation_interval_seconds: int = field(default_factory=lambda: _int_from_env("FABLESPACE_SIMULATION_INTERVAL_SECONDS", "FABLEMAP_SIMULATION_INTERVAL_SECONDS", 600))

    # Shared cache and S3-compatible generated-file storage.
    redis_url: str = field(default_factory=lambda: _env_value("FABLESPACE_REDIS_URL"))
    generated_storage_backend: str = field(default_factory=_default_generated_storage_backend)
    s3_bucket: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_BUCKET"))
    s3_region: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_REGION", default="auto"))
    s3_endpoint_url: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_ENDPOINT_URL"))
    s3_access_key_id: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_ACCESS_KEY_ID"))
    s3_secret_access_key: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_SECRET_ACCESS_KEY"))
    s3_prefix: str = field(default_factory=lambda: _env_value("FABLESPACE_S3_PREFIX", default="fablespace"))
    cdn_base_url: str = field(default_factory=lambda: _env_value("FABLESPACE_CDN_BASE_URL"))
    s3_request_timeout_seconds: int = field(default_factory=lambda: _int_from_env("FABLESPACE_S3_REQUEST_TIMEOUT_SECONDS", "", 20))
