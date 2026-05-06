from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fablemap_api.domain.owner_llm_policy import normalize_owner_llm_config


class OwnerConfigStore:
    """JSON-backed owner-level configuration store for explicit local/dev fallback."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _read_all(self) -> dict[str, Any]:
        if not self.path.exists():
            return {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _write_all(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def get_default_llm_config(self, owner_id: str) -> dict[str, Any]:
        safe_owner = str(owner_id or "").strip()
        if not safe_owner:
            return {}
        data = self._read_all()
        owner_data = data.get(safe_owner) if isinstance(data.get(safe_owner), dict) else {}
        config = owner_data.get("default_llm") if isinstance(owner_data, dict) else {}
        return normalize_owner_llm_config(config) if isinstance(config, dict) and config else {}

    def save_default_llm_config(self, owner_id: str, config: dict[str, Any]) -> dict[str, Any]:
        safe_owner = str(owner_id or "").strip()
        if not safe_owner:
            raise ValueError("owner_id is required")
        data = self._read_all()
        owner_data = data.get(safe_owner) if isinstance(data.get(safe_owner), dict) else {}
        owner_data["default_llm"] = normalize_owner_llm_config(config)
        data[safe_owner] = owner_data
        self._write_all(data)
        return owner_data["default_llm"]


class SQLAlchemyOwnerConfigStore:
    """Database-backed owner-level configuration store."""

    def __init__(self, database: Any):
        self.database = database

    def get_default_llm_config(self, owner_id: str) -> dict[str, Any]:
        safe_owner = str(owner_id or "").strip()
        if not safe_owner:
            return {}
        from fablemap_api.infrastructure.models import OwnerConfigModel

        with self.database.session_scope() as session:
            model = session.query(OwnerConfigModel).filter_by(owner_id=safe_owner).first()
            if not model or not isinstance(model.default_llm, dict):
                return {}
            return normalize_owner_llm_config(model.default_llm) if model.default_llm else {}

    def save_default_llm_config(self, owner_id: str, config: dict[str, Any]) -> dict[str, Any]:
        safe_owner = str(owner_id or "").strip()
        if not safe_owner:
            raise ValueError("owner_id is required")
        from datetime import datetime
        from fablemap_api.infrastructure.models import OwnerConfigModel

        normalized = normalize_owner_llm_config(config)
        now = datetime.utcnow()
        with self.database.session_scope() as session:
            model = session.query(OwnerConfigModel).filter_by(owner_id=safe_owner).first()
            if model:
                model.default_llm = normalized
                model.updated_at = now
            else:
                session.add(OwnerConfigModel(
                    owner_id=safe_owner,
                    default_llm=normalized,
                    created_at=now,
                    updated_at=now,
                ))
        return normalized
