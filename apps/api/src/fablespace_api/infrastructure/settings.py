from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[5]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablespace-api"
STORY_LLM_ENV_NAMES = (
    "FABLESPACE_LLM_BACKEND",
    "FABLESPACE_LLM_MODEL",
    "FABLESPACE_LLM_API_KEY",
    "FABLESPACE_LLM_BASE_URL",
    "FABLESPACE_LLM_TEMPERATURE",
    "FABLESPACE_LLM_MAX_TOKENS",
    "FABLESPACE_LLM_TOP_P",
)
ENVIRONMENT_VARIABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _env_value(name: str, default: str = "") -> str:
    """Return one trimmed environment value or its default."""

    return os.environ.get(name, "").strip() or default


def _any_env_value(names: tuple[str, ...]) -> bool:
    """Return whether deployment supplied any non-empty variable in one config group."""

    return any(bool(_env_value(name)) for name in names)


def _default_public_welfare_llm_api_key() -> str:
    """Resolve the existing server-side public-welfare key without exposing its value."""

    key_env_name = _env_value("FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV")
    if not ENVIRONMENT_VARIABLE_NAME.fullmatch(key_env_name):
        return ""
    return _env_value(key_env_name)


def _path_from_env(name: str, default: Path) -> Path:
    """Return a configured path or the supplied repository default."""

    value = _env_value(name)
    return Path(value) if value else default


def _default_output_root() -> Path:
    """Return the persisted runtime root used by SQLite and generated files."""

    return _path_from_env("FABLESPACE_OUTPUT_ROOT", DEFAULT_OUTPUT_ROOT)


def _default_cors_origins() -> list[str]:
    """Return configured browser origins with local development defaults."""

    value = _env_value("FABLESPACE_CORS_ORIGINS")
    if not value:
        return ["http://127.0.0.1:5173", "http://localhost:5173"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _default_database_url() -> str:
    """Return the canonical SQLAlchemy URL; empty selects local SQLite."""

    return _env_value("FABLESPACE_DATABASE_URL")


def _default_generated_storage_backend() -> str:
    """Return the generated-file backend, restricted to supported values."""

    value = _env_value("FABLESPACE_GENERATED_STORAGE_BACKEND", "local").lower()
    return value if value in {"local", "s3"} else "local"


def _default_auth_mode() -> str:
    """Return the supported request-identity mode selected by deployment."""

    value = _env_value("FABLESPACE_AUTH_MODE", "legacy").lower()
    return value if value in {"legacy", "parallellines"} else "legacy"


def _int_from_env(name: str, default: int) -> int:
    """Return one integer environment value, falling back when invalid."""

    value = _env_value(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _optional_int_from_env(name: str) -> int | None:
    """Return one optional integer environment value or None when invalid."""

    value = _env_value(name)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _optional_float_from_env(name: str) -> float | None:
    """Return one optional finite-looking float value or None when invalid."""

    value = _env_value(name)
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _bool_from_env(name: str, default: bool = False) -> bool:
    """Return one boolean environment value using the supported truthy set."""

    value = _env_value(name).lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ApiSettings:
    app_name: str = "FableSpace API"
    api_version: str = "0.1.0-enterprise-native"
    cors_origins: list[str] = field(default_factory=_default_cors_origins)
    output_root: Path = field(default_factory=_default_output_root)

    # Authentication. `legacy` preserves standalone development; production can
    # require a signed session issued through ParallelLines SSO.
    auth_mode: str = field(default_factory=_default_auth_mode)
    parallellines_api_base_url: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_PARALLELLINES_API_BASE_URL",
            "http://127.0.0.1:8000/api/v1",
        )
    )
    parallellines_public_base_url: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_PARALLELLINES_PUBLIC_BASE_URL",
            "https://pingxingxian.space",
        )
    )
    parallellines_sso_service_secret: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_PARALLELLINES_SSO_SERVICE_SECRET"
        )
    )
    session_secret: str = field(
        default_factory=lambda: _env_value("FABLESPACE_SESSION_SECRET")
    )
    session_cookie_name: str = field(
        default_factory=lambda: _env_value(
            "FABLESPACE_SESSION_COOKIE_NAME",
            "fablespace_session",
        )
    )
    session_cookie_secure: bool = field(
        default_factory=lambda: _bool_from_env(
            "FABLESPACE_SESSION_COOKIE_SECURE",
            True,
        )
    )
    session_ttl_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_SESSION_TTL_SECONDS",
            3600,
        )
    )
    auth_introspection_cache_ttl_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS",
            30,
        )
    )
    auth_introspection_timeout_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_AUTH_INTROSPECTION_TIMEOUT_SECONDS",
            5,
        )
    )
    admin_media_max_bytes: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_ADMIN_MEDIA_MAX_BYTES",
            10 * 1024 * 1024,
        )
    )

    # Deployment-level StoryWorld dialogue configuration.
    llm_backend: str = field(
        default_factory=lambda: _env_value("FABLESPACE_LLM_BACKEND")
    )
    llm_model: str = field(
        default_factory=lambda: _env_value("FABLESPACE_LLM_MODEL")
    )
    llm_api_key: str = field(
        default_factory=lambda: _env_value("FABLESPACE_LLM_API_KEY"),
        repr=False,
    )
    llm_base_url: str = field(
        default_factory=lambda: _env_value("FABLESPACE_LLM_BASE_URL")
    )
    llm_temperature: float | None = field(
        default_factory=lambda: _optional_float_from_env(
            "FABLESPACE_LLM_TEMPERATURE"
        )
    )
    llm_max_tokens: int | None = field(
        default_factory=lambda: _optional_int_from_env(
            "FABLESPACE_LLM_MAX_TOKENS"
        )
    )
    llm_top_p: float | None = field(
        default_factory=lambda: _optional_float_from_env(
            "FABLESPACE_LLM_TOP_P"
        )
    )
    llm_proxy_url: str = field(
        default_factory=lambda: _env_value("FABLESPACE_LLM_PROXY_URL")
    )
    llm_explicitly_configured: bool = field(
        default_factory=lambda: _any_env_value(STORY_LLM_ENV_NAMES)
    )

    # Existing deployment-level public-welfare route. StoryWorld reuses this
    # only when the complete FABLESPACE_LLM_* override group is absent.
    public_welfare_llm_backend: str = field(
        default_factory=lambda: _env_value(
            "FABLEMAP_DEFAULT_FREE_LLM_BACKEND"
        )
    )
    public_welfare_llm_model: str = field(
        default_factory=lambda: _env_value(
            "FABLEMAP_DEFAULT_FREE_LLM_MODEL"
        )
    )
    public_welfare_llm_api_key: str = field(
        default_factory=_default_public_welfare_llm_api_key,
        repr=False,
    )
    public_welfare_llm_base_url: str = field(
        default_factory=lambda: _env_value(
            "FABLEMAP_DEFAULT_FREE_LLM_BASE_URL"
        )
    )

    # Database configuration. Empty `database_url` uses output_root/fablespace.sqlite3.
    database_url: str = field(default_factory=_default_database_url)
    mysql_pool_size: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_MYSQL_POOL_SIZE",
            5,
        )
    )
    mysql_max_overflow: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_MYSQL_MAX_OVERFLOW",
            10,
        )
    )
    mysql_echo: bool = field(
        default_factory=lambda: _bool_from_env(
            "FABLESPACE_MYSQL_ECHO",
            False,
        )
    )

    # S3-compatible generated-file storage.
    generated_storage_backend: str = field(
        default_factory=_default_generated_storage_backend
    )
    s3_bucket: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_BUCKET")
    )
    s3_region: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_REGION", "auto")
    )
    s3_endpoint_url: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_ENDPOINT_URL")
    )
    s3_access_key_id: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_ACCESS_KEY_ID")
    )
    s3_secret_access_key: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_SECRET_ACCESS_KEY")
    )
    s3_prefix: str = field(
        default_factory=lambda: _env_value("FABLESPACE_S3_PREFIX", "fablespace")
    )
    cdn_base_url: str = field(
        default_factory=lambda: _env_value("FABLESPACE_CDN_BASE_URL")
    )
    s3_request_timeout_seconds: int = field(
        default_factory=lambda: _int_from_env(
            "FABLESPACE_S3_REQUEST_TIMEOUT_SECONDS",
            20,
        )
    )
