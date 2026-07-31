from __future__ import annotations

from pathlib import Path
from typing import Any


def resolve_database_url(settings: Any) -> str:
    """Return the canonical SQLAlchemy URL, defaulting to persisted local SQLite."""

    explicit = str(getattr(settings, "database_url", "") or "").strip()
    if explicit:
        return explicit
    output_root = Path(getattr(settings, "output_root", Path(".fablespace-api")))
    return f"sqlite:///{(output_root / 'fablespace.sqlite3').resolve().as_posix()}"


def redact_database_url(url: str) -> str:
    """Return a database URL with any credential prefix replaced."""

    if not url:
        return ""
    if "://" not in url or "@" not in url:
        return url
    scheme, rest = url.split("://", 1)
    return f"{scheme}://***@{rest.split('@', 1)[1]}"
