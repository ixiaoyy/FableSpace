from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _text(value: Any, *, limit: int = 500) -> str:
    return str(value or "").strip()[:limit]


class VisitorNoteStore:
    """JSON-backed owner-visible visitor notes store for explicit local/dev fallback.

    This store is intentionally separate from Tavern public payloads so visitor
    feedback cannot leak into public tavern responses or become a social feed.
    """

    def __init__(self, path: Path):
        self.path = path

    def _read_all(self) -> dict[str, list[dict[str, Any]]]:
        if not self.path.exists():
            return {}
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _write_all(self, payload: dict[str, list[dict[str, Any]]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def create_note(self, tavern_id: str, visitor_id: str, data: dict[str, Any]) -> dict[str, Any]:
        note = {
            "id": f"note_{secrets.token_hex(8)}",
            "tavern_id": _text(tavern_id, limit=128),
            "visitor_id": _text(visitor_id, limit=128),
            "visitor_nickname": _text(data.get("visitor_nickname") or "旅人", limit=64) or "旅人",
            "content": _text(data.get("content"), limit=500),
            "created_at": _now_iso(),
            "visibility": "owner_only",
        }
        all_notes = self._read_all()
        all_notes.setdefault(note["tavern_id"], []).append(note)
        self._write_all(all_notes)
        return dict(note)

    def list_notes(self, tavern_id: str, *, limit: int = 20, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
        notes = [dict(item) for item in self._read_all().get(str(tavern_id), [])]
        notes.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        total = len(notes)
        safe_limit = max(1, min(int(limit or 20), 100))
        safe_offset = max(0, int(offset or 0))
        return notes[safe_offset : safe_offset + safe_limit], total

    def get_note(self, tavern_id: str, note_id: str) -> dict[str, Any] | None:
        for note in self._read_all().get(str(tavern_id), []):
            if note.get("id") == note_id:
                return dict(note)
        return None

    def delete_note(self, tavern_id: str, note_id: str) -> bool:
        all_notes = self._read_all()
        notes = all_notes.get(str(tavern_id), [])
        kept = [note for note in notes if note.get("id") != note_id]
        if len(kept) == len(notes):
            return False
        all_notes[str(tavern_id)] = kept
        self._write_all(all_notes)
        return True

class SQLAlchemyVisitorNoteStore:
    """Database-backed owner-visible visitor notes store."""

    def __init__(self, database: Any):
        self.database = database

    @staticmethod
    def _to_dict(model: Any) -> dict[str, Any]:
        created_at = model.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.created_at else ""
        return {
            "id": model.id,
            "tavern_id": model.tavern_id,
            "visitor_id": model.visitor_id,
            "visitor_nickname": model.visitor_nickname or "旅人",
            "content": model.content or "",
            "created_at": created_at,
            "visibility": model.visibility or "owner_only",
        }

    def create_note(self, tavern_id: str, visitor_id: str, data: dict[str, Any]) -> dict[str, Any]:
        from datetime import UTC, datetime
        from fablemap_api.infrastructure.models import VisitorNoteModel

        note = {
            "id": f"note_{secrets.token_hex(8)}",
            "tavern_id": _text(tavern_id, limit=128),
            "visitor_id": _text(visitor_id, limit=128),
            "visitor_nickname": _text(data.get("visitor_nickname") or "旅人", limit=64) or "旅人",
            "content": _text(data.get("content"), limit=500),
            "created_at": datetime.now(UTC).replace(tzinfo=None),
            "visibility": "owner_only",
        }
        with self.database.session_scope() as session:
            session.add(VisitorNoteModel(**note))
        public = dict(note)
        public["created_at"] = note["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        return public

    def list_notes(self, tavern_id: str, *, limit: int = 20, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
        from fablemap_api.infrastructure.models import VisitorNoteModel

        safe_limit = max(1, min(int(limit or 20), 100))
        safe_offset = max(0, int(offset or 0))
        with self.database.session_scope() as session:
            query = session.query(VisitorNoteModel).filter_by(tavern_id=str(tavern_id))
            total = query.count()
            models = query.order_by(VisitorNoteModel.created_at.desc()).offset(safe_offset).limit(safe_limit).all()
            return [self._to_dict(model) for model in models], total

    def get_note(self, tavern_id: str, note_id: str) -> dict[str, Any] | None:
        from fablemap_api.infrastructure.models import VisitorNoteModel

        with self.database.session_scope() as session:
            model = session.query(VisitorNoteModel).filter_by(tavern_id=str(tavern_id), id=str(note_id)).first()
            return self._to_dict(model) if model else None

    def delete_note(self, tavern_id: str, note_id: str) -> bool:
        from fablemap_api.infrastructure.models import VisitorNoteModel

        with self.database.session_scope() as session:
            count = session.query(VisitorNoteModel).filter_by(tavern_id=str(tavern_id), id=str(note_id)).delete()
            return count > 0
