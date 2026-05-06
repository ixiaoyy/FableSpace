"""Infrastructure adapters and runtime settings.

Keep this package initializer lightweight: database-backed storage is the
runtime default, but models/SQLAlchemy are imported lazily so utilities that
only need settings do not initialize a database at import time.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

from .settings import ApiSettings

__all__ = [
    "ApiSettings",
    "Database",
    "Base",
    "create_database_from_settings",
    "TavernModel",
    "CharacterModel",
    "WorldInfoModel",
    "VisitorModel",
    "ChatMessageModel",
    "MemoryAtomModel",
    "GameplaySessionModel",
    "LLMConfigModel",
    "HomeVisitModel",
    "HomeModel",
    "NeighborhoodRumorModel",
    "NotificationModel",
    "VisitorNoteModel",
    "OwnerConfigModel",
    "StateCardModel",
    "WritebackStateModel",
    "MySQLTavernStore",
    "create_mysql_tables",
]

_DATABASE_EXPORTS = {"Database", "Base", "create_database_from_settings"}
_MODEL_EXPORTS = {
    "TavernModel",
    "CharacterModel",
    "WorldInfoModel",
    "VisitorModel",
    "ChatMessageModel",
    "MemoryAtomModel",
    "GameplaySessionModel",
    "LLMConfigModel",
    "HomeVisitModel",
    "HomeModel",
    "NeighborhoodRumorModel",
    "NotificationModel",
    "VisitorNoteModel",
    "OwnerConfigModel",
    "StateCardModel",
    "WritebackStateModel",
}
_MYSQL_STORE_EXPORTS = {"MySQLTavernStore", "create_mysql_tables"}


def __getattr__(name: str) -> Any:
    if name in _DATABASE_EXPORTS:
        module = import_module(f"{__name__}.database")
        return getattr(module, name)
    if name in _MODEL_EXPORTS:
        module = import_module(f"{__name__}.models")
        return getattr(module, name)
    if name in _MYSQL_STORE_EXPORTS:
        module = import_module(f"{__name__}.mysql_store")
        return getattr(module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
