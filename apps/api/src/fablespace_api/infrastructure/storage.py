from __future__ import annotations

from pathlib import Path
from typing import Any


def _storage_backend(settings: Any) -> str:
    return str(getattr(settings, "storage_backend", "database") or "database").strip().lower()


def resolve_database_url(settings: Any) -> str:
    """Resolve the configured SQLAlchemy URL.

    `FABLESPACE_DATABASE_URL` is the primary setting. `FABLEMAP_DATABASE_URL`
    and the MySQL aliases remain deployment fallbacks. When database storage is selected and neither
    is set, use a local SQLite database under the configured output root so the
    default runtime is still a real database rather than JSON files.
    """

    explicit = str(getattr(settings, "database_url", "") or "").strip()
    legacy = str(getattr(settings, "mysql_url", "") or "").strip()
    if explicit:
        return explicit
    if legacy:
        return legacy
    if _storage_backend(settings) != "database":
        return ""
    output_root = Path(getattr(settings, "output_root", Path(".fablespace-api")))
    return f"sqlite:///{(output_root / 'fablespace.sqlite3').resolve().as_posix()}"


def redact_database_url(url: str) -> str:
    if not url:
        return ""
    if "://" not in url or "@" not in url:
        return url
    scheme, rest = url.split("://", 1)
    return f"{scheme}://***@{rest.split('@', 1)[1]}"
