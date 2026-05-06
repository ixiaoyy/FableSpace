from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from fablemap_api.core.tavern import Tavern, TavernStore

logger = logging.getLogger(__name__)


def _storage_backend(settings: Any) -> str:
    return str(getattr(settings, "storage_backend", "database") or "database").strip().lower()


def resolve_database_url(settings: Any) -> str:
    """Resolve the configured SQLAlchemy URL.

    `FABLEMAP_DATABASE_URL` is the primary setting.  `FABLEMAP_MYSQL_URL` is
    retained as a legacy alias.  When database storage is selected and neither
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
    output_root = Path(getattr(settings, "output_root", Path(".fablemap-api")))
    return f"sqlite:///{(output_root / 'fablemap.sqlite3').resolve().as_posix()}"


def redact_database_url(url: str) -> str:
    if not url:
        return ""
    if "://" not in url or "@" not in url:
        return url
    scheme, rest = url.split("://", 1)
    return f"{scheme}://***@{rest.split('@', 1)[1]}"


def _seed_default_public_welfare_enabled() -> bool:
    value = os.environ.get("FABLEMAP_SEED_DEFAULT_TAVERNS", "1").strip().lower()
    return value not in {"0", "false", "no", "off"}


def _seed_database_default_public_welfare_taverns(store: Any) -> int:
    if not _seed_default_public_welfare_enabled():
        return 0
    from fablemap_api.core.default_taverns import default_public_welfare_taverns

    seeded = 0
    for payload in default_public_welfare_taverns():
        tavern_id = str(payload.get("id") or "").strip()
        if not tavern_id or store.get_tavern(tavern_id):
            continue
        tavern = Tavern.from_dict(payload)
        store.create_tavern(tavern)
        if tavern.llm_config and tavern.llm_config.is_configured():
            store.save_llm_config(tavern.id, tavern.llm_config)
            tavern.status = "open"
            store.update_tavern(tavern)
        seeded += 1
    if seeded:
        logger.info("Seeded %s default public welfare taverns into database storage", seeded)
    return seeded


def create_tavern_store(settings: Any):
    """Create the authoritative tavern store for the runtime.

    Database storage is the default.  JSON storage remains available only when
    `FABLEMAP_STORAGE_BACKEND=json` (or ApiSettings.storage_backend="json") is
    selected explicitly for development/backward-compat tests.
    """

    output_root = Path(getattr(settings, "output_root", Path(".fablemap-api")))
    if _storage_backend(settings) == "json":
        logger.info("Using explicit JSON storage backend: %s", output_root / "taverns")
        return TavernStore(output_root / "taverns")

    database_url = resolve_database_url(settings)
    try:
        from fablemap_api.infrastructure.database import Database
        from fablemap_api.infrastructure.mysql_store import MySQLTavernStore, create_mysql_tables

        database = Database(url=database_url)
        create_mysql_tables(database)
        logger.info("Using database storage backend: %s", redact_database_url(database_url))
        store = MySQLTavernStore(database)
        _seed_database_default_public_welfare_taverns(store)
        return store
    except Exception as exc:
        logger.error("Database storage initialization failed for %s: %s", redact_database_url(database_url), exc)
        raise


def store_database(store: Any):
    getter = getattr(store, "_session", None)
    if callable(getter):
        return getter()
    return None



def create_owner_config_store(settings: Any, tavern_store: Any):
    database = store_database(tavern_store)
    if database is not None:
        from fablemap_api.infrastructure.owner_config_store import SQLAlchemyOwnerConfigStore
        return SQLAlchemyOwnerConfigStore(database)
    from fablemap_api.infrastructure.owner_config_store import OwnerConfigStore
    return OwnerConfigStore(Path(getattr(settings, "output_root", Path(".fablemap-api"))) / "owner_configs.json")


def create_visitor_note_store(settings: Any, tavern_store: Any):
    database = store_database(tavern_store)
    if database is not None:
        from fablemap_api.infrastructure.visitor_note_store import SQLAlchemyVisitorNoteStore
        return SQLAlchemyVisitorNoteStore(database)
    from fablemap_api.infrastructure.visitor_note_store import VisitorNoteStore
    return VisitorNoteStore(Path(getattr(settings, "output_root", Path(".fablemap-api"))) / "visitor_notes.json")


def create_writeback_store(settings: Any, tavern_store: Any):
    database = store_database(tavern_store)
    if database is not None:
        from fablemap_api.core.writeback import SQLAlchemyWritebackStore
        return SQLAlchemyWritebackStore(database)
    from fablemap_api.core.writeback import WritebackStore
    return WritebackStore(Path(getattr(settings, "output_root", Path(".fablemap-api"))) / "writeback")


def configure_process_stores(settings: Any, tavern_store: Any) -> None:
    """Configure legacy/global route stores to match the selected backend."""

    database = store_database(tavern_store)
    if database is not None:
        from fablemap_api.core.notifications import SQLAlchemyNotificationStore, set_notification_store
        from fablemap_api.infrastructure.home_store import SQLAlchemyHomeStore, set_home_store

        set_notification_store(SQLAlchemyNotificationStore(database))
        set_home_store(SQLAlchemyHomeStore(database))
        return

    from fablemap_api.core.notifications import NotificationStore, set_notification_store
    from fablemap_api.infrastructure.home_store import HomeStore, set_home_store

    output_root = Path(getattr(settings, "output_root", Path(".fablemap-api")))
    set_notification_store(NotificationStore())
    set_home_store(HomeStore(output_root / "homes"))
