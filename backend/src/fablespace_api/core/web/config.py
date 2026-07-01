from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[5]
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8950
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablespace-api"
DEFAULT_FIXTURE_FILE = REPO_ROOT / "tests" / "fixtures" / "overpass_sample.json"
DEFAULT_FRONTEND_ROOT = REPO_ROOT / "frontend"
DEFAULT_FRONTEND_BUILD_CLIENT_DIR = Path("build") / "client"
DEFAULT_FRONTEND_PUBLIC_DIRNAME = "public"


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


def _default_fixture_file() -> Path | None:
    return _optional_path_from_env("FABLESPACE_FIXTURE_FILE", "FABLEMAP_FIXTURE_FILE", DEFAULT_FIXTURE_FILE)


def _default_frontend_root() -> Path | None:
    return _optional_path_from_env("FABLESPACE_FRONTEND_ROOT", "FABLEMAP_FRONTEND_ROOT", DEFAULT_FRONTEND_ROOT)


def _default_sillytavern_url() -> str:
    return _env_value(
        "FABLESPACE_SILLYTAVERN_URL",
        "FABLEMAP_SILLYTAVERN_URL",
        "http://127.0.0.1:8000",
    ) or "http://127.0.0.1:8000"


def _default_database_url() -> str:
    return _env_value("FABLESPACE_DATABASE_URL", "FABLEMAP_DATABASE_URL")


def _default_mysql_url() -> str:
    return _env_value("FABLESPACE_MYSQL_URL", "FABLEMAP_MYSQL_URL")


def _default_storage_backend() -> str:
    value = _env_value("FABLESPACE_STORAGE_BACKEND", "FABLEMAP_STORAGE_BACKEND", "database").lower()
    return value if value in {"database", "json"} else "database"


@dataclass(frozen=True)
class ApiSettings:
    output_root: Path = field(default_factory=_default_output_root)
    fixture_file: Path | None = field(default_factory=_default_fixture_file)
    frontend_root: Path | None = field(default_factory=_default_frontend_root)
    frontend_dist: Path | None = None
    frontend_public: Path | None = None
    sillytavern_url: str = field(default_factory=_default_sillytavern_url)
    storage_backend: str = field(default_factory=_default_storage_backend)
    database_url: str = field(default_factory=_default_database_url)
    mysql_url: str = field(default_factory=_default_mysql_url)

    def resolved(self) -> "ApiSettings":
        resolved_frontend_root = self.frontend_root.resolve() if self.frontend_root else None
        resolved_frontend_dist = self.frontend_dist.resolve() if self.frontend_dist else None
        resolved_frontend_public = self.frontend_public.resolve() if self.frontend_public else None
        if resolved_frontend_dist is None and resolved_frontend_root is not None:
            resolved_frontend_dist = resolved_frontend_root / DEFAULT_FRONTEND_BUILD_CLIENT_DIR
        if resolved_frontend_public is None and resolved_frontend_root is not None:
            resolved_frontend_public = resolved_frontend_root / DEFAULT_FRONTEND_PUBLIC_DIRNAME
        return ApiSettings(
            output_root=self.output_root.resolve(),
            fixture_file=self.fixture_file.resolve() if self.fixture_file else None,
            frontend_root=resolved_frontend_root,
            frontend_dist=resolved_frontend_dist,
            frontend_public=resolved_frontend_public,
            sillytavern_url=self.sillytavern_url,
            storage_backend=self.storage_backend,
            database_url=self.database_url,
            mysql_url=self.mysql_url,
        )
