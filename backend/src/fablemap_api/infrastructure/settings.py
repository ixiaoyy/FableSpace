from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablemap-api"
DEFAULT_FIXTURE_FILE = REPO_ROOT / "tests" / "fixtures" / "overpass_sample.json"
DEFAULT_FRONTEND_ROOT = REPO_ROOT / "frontend"


def _path_from_env(name: str, default: Path) -> Path:
    value = os.environ.get(name, "").strip()
    return Path(value) if value else default


def _optional_path_from_env(name: str, default: Path | None) -> Path | None:
    value = os.environ.get(name)
    if value is None:
        return default
    value = value.strip()
    return Path(value) if value else None


def _default_output_root() -> Path:
    return _path_from_env("FABLEMAP_OUTPUT_ROOT", DEFAULT_OUTPUT_ROOT)


def _default_fixture_file() -> Path | None:
    return _optional_path_from_env("FABLEMAP_FIXTURE_FILE", DEFAULT_FIXTURE_FILE)


def _default_frontend_root() -> Path | None:
    return _optional_path_from_env("FABLEMAP_FRONTEND_ROOT", DEFAULT_FRONTEND_ROOT)


def _default_cors_origins() -> list[str]:
    value = os.environ.get("FABLEMAP_CORS_ORIGINS", "").strip()
    if not value:
        return ["http://127.0.0.1:5173", "http://localhost:5173"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _default_sillytavern_url() -> str:
    return os.environ.get("FABLEMAP_SILLYTAVERN_URL", "http://127.0.0.1:8000").strip() or "http://127.0.0.1:8000"


def _default_database_url() -> str:
    """Primary SQLAlchemy database URL. Empty means use the default SQLite file when storage_backend=database."""
    return os.environ.get("FABLEMAP_DATABASE_URL", "").strip()


def _default_mysql_url() -> str:
    """Legacy alias for database URL. Kept for existing deployments."""
    return os.environ.get("FABLEMAP_MYSQL_URL", "").strip()


def _default_storage_backend() -> str:
    value = os.environ.get("FABLEMAP_STORAGE_BACKEND", "database").strip().lower()
    return value if value in {"database", "json"} else "database"


def _int_from_env(name: str, default: int) -> int:
    value = os.environ.get(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _bool_from_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name, "").strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ApiSettings:
    app_name: str = "FableMap API"
    api_version: str = "0.1.0-enterprise-native"
    cors_origins: list[str] = field(default_factory=_default_cors_origins)
    output_root: Path = field(default_factory=_default_output_root)
    fixture_file: Path | None = field(default_factory=_default_fixture_file)
    frontend_root: Path | None = field(default_factory=_default_frontend_root)
    sillytavern_url: str = field(default_factory=_default_sillytavern_url)

    # Database configuration. `mysql_url` is a legacy alias; `database_url` may also be sqlite:///...
    storage_backend: str = field(default_factory=_default_storage_backend)
    database_url: str = field(default_factory=_default_database_url)
    mysql_url: str = field(default_factory=_default_mysql_url)
    mysql_pool_size: int = field(default_factory=lambda: _int_from_env("FABLEMAP_MYSQL_POOL_SIZE", 5))
    mysql_max_overflow: int = field(default_factory=lambda: _int_from_env("FABLEMAP_MYSQL_MAX_OVERFLOW", 10))
    mysql_echo: bool = field(default_factory=lambda: _bool_from_env("FABLEMAP_MYSQL_ECHO", False))
