from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from fablespace_api.core.space import Space, SpaceStore

logger = logging.getLogger(__name__)


def _env_value(primary: str, legacy: str = "", default: str = "") -> str:
    value = os.environ.get(primary, "").strip()
    if value:
        return value
    if legacy:
        legacy_value = os.environ.get(legacy, "").strip()
        if legacy_value:
            return legacy_value
    return default


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


def _seed_default_public_welfare_enabled() -> bool:
    value = _env_value("FABLESPACE_SEED_DEFAULT_SPACES", "FABLEMAP_SEED_DEFAULT_TAVERNS", "1").lower()
    return value not in {"0", "false", "no", "off"}


def _seed_database_default_public_welfare_taverns(store: Any) -> int:
    if not _seed_default_public_welfare_enabled():
        return 0
    from fablespace_api.core.default_spaces import (
        RETIRED_PUBLIC_WELFARE_TAVERN_IDS,
        default_public_welfare_spaces,
    )

    seeded = 0
    refreshed = 0
    retired = 0
    for payload in default_public_welfare_spaces():
        space_id = str(payload.get("id") or "").strip()
        if not space_id:
            continue

        existing = store.get_space(space_id)
        if existing:
            existing_payload = existing.to_dict()
            if SpaceStore._merge_public_welfare_seed_defaults(existing_payload, payload):
                store.update_space(Space.from_dict(existing_payload))
                refreshed += 1
            continue

        tavern = Space.from_dict(payload)
        store.create_space(tavern)
        if tavern.llm_config and tavern.llm_config.is_configured():
            store.save_llm_config(tavern.id, tavern.llm_config)
            tavern.status = "open"
            store.update_space(tavern)
        seeded += 1
    for retired_space_id in RETIRED_PUBLIC_WELFARE_TAVERN_IDS:
        existing = store.get_space(retired_space_id)
        if not existing:
            continue
        existing_payload = existing.to_dict()
        if not SpaceStore._retire_public_welfare_seed_record(existing_payload):
            continue
        store.update_space(Space.from_dict(existing_payload))
        retired += 1
    if seeded or refreshed or retired:
        logger.info(
            "Seeded %s, refreshed %s, and retired %s default public welfare taverns in database storage",
            seeded,
            refreshed,
            retired,
        )
    return seeded


def create_space_store(settings: Any):
    """Create the authoritative space store for the runtime.

    Database storage is the default.  JSON storage remains available only when
    `FABLESPACE_STORAGE_BACKEND=json` (or ApiSettings.storage_backend="json") is
    selected explicitly for development/backward-compat tests.
    """

    output_root = Path(getattr(settings, "output_root", Path(".fablespace-api")))
    if _storage_backend(settings) == "json":
        logger.info("Using explicit JSON storage backend: %s", output_root / "taverns")
        return SpaceStore(output_root / "taverns")

    database_url = resolve_database_url(settings)
    try:
        from fablespace_api.infrastructure.database import Database
        from fablespace_api.infrastructure.mysql_space_store import MySQLSpaceStore, create_mysql_tables

        database = Database(url=database_url)
        create_mysql_tables(database)
        logger.info("Using database storage backend: %s", redact_database_url(database_url))
        store = MySQLSpaceStore(database)
        _seed_database_default_public_welfare_taverns(store)
        return store
    except Exception as exc:
        logger.error("Database storage initialization failed for %s: %s", redact_database_url(database_url), exc)
        raise


# Backward-compatible factory name for modules not yet fully renamed.
create_tavern_store = create_space_store


def store_database(store: Any):
    getter = getattr(store, "_session", None)
    if callable(getter):
        return getter()
    return None



def create_owner_config_store(settings: Any, space_store: Any):
    database = store_database(space_store)
    if database is not None:
        from fablespace_api.infrastructure.owner_config_store import SQLAlchemyOwnerConfigStore
        return SQLAlchemyOwnerConfigStore(database)
    from fablespace_api.infrastructure.owner_config_store import OwnerConfigStore
    return OwnerConfigStore(Path(getattr(settings, "output_root", Path(".fablespace-api"))) / "owner_configs.json")


def create_visitor_note_store(settings: Any, space_store: Any):
    database = store_database(space_store)
    if database is not None:
        from fablespace_api.infrastructure.visitor_note_store import SQLAlchemyVisitorNoteStore
        return SQLAlchemyVisitorNoteStore(database)
    from fablespace_api.infrastructure.visitor_note_store import VisitorNoteStore
    return VisitorNoteStore(Path(getattr(settings, "output_root", Path(".fablespace-api"))) / "visitor_notes.json")


def create_territory_store(settings: Any, space_store: Any):
    database = store_database(space_store)
    if database is not None:
        from fablespace_api.infrastructure.territory_store import SQLAlchemyTerritoryStore
        return SQLAlchemyTerritoryStore(database)
    from fablespace_api.infrastructure.territory_store import TerritoryStore
    return TerritoryStore(Path(getattr(settings, "output_root", Path(".fablespace-api"))) / "territories")


def create_writeback_store(settings: Any, space_store: Any):
    database = store_database(space_store)
    if database is not None:
        from fablespace_api.core.writeback import SQLAlchemyWritebackStore
        return SQLAlchemyWritebackStore(database)
    from fablespace_api.core.writeback import WritebackStore
    return WritebackStore(Path(getattr(settings, "output_root", Path(".fablespace-api"))) / "writeback")


def create_neighborhood_knowledge_store(settings: Any, space_store: Any):
    database = store_database(space_store)
    if database is not None:
        from fablespace_api.infrastructure.neighborhood_store import SQLAlchemyNeighborhoodKnowledgeStore
        return SQLAlchemyNeighborhoodKnowledgeStore(database)
    from fablespace_api.core.rumor import RumorStore
    # Fallback to rumor store if needed, or implement a separate JSON store
    return RumorStore(Path(getattr(settings, "output_root", Path(".fablespace-api"))) / "neighborhood_knowledge")


def configure_process_stores(settings: Any, space_store: Any) -> None:
    """Configure legacy/global route stores to match the selected backend."""

    database = store_database(space_store)
    if database is not None:
        from fablespace_api.core.notifications import SQLAlchemyNotificationStore, set_notification_store
        from fablespace_api.infrastructure.home_store import SQLAlchemyHomeStore, set_home_store

        set_notification_store(SQLAlchemyNotificationStore(database))
        set_home_store(SQLAlchemyHomeStore(database))
        return

    from fablespace_api.core.notifications import NotificationStore, set_notification_store
    from fablespace_api.infrastructure.home_store import HomeStore, set_home_store

    output_root = Path(getattr(settings, "output_root", Path(".fablespace-api")))
    set_notification_store(NotificationStore())
    set_home_store(HomeStore(output_root / "homes"))
