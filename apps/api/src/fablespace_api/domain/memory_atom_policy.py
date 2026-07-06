from __future__ import annotations

import uuid
from typing import Any

from fablespace_api.core.memory import (
    MEMORY_DIMENSIONS,
    MEMORY_HORIZONS,
    MEMORY_SCOPES,
    MEMORY_VISIBILITIES,
    MemoryAtom,
)

from .space_policy import is_space_owner


def memory_filter(value: Any, allowed: set[str]) -> str:
    normalized = str(value or "").strip()
    return normalized if normalized in allowed else ""


def memory_subject_user_ids(atom: MemoryAtom) -> set[str]:
    ids: set[str] = set()
    if atom.visitor_id:
        ids.add(atom.visitor_id)
    if atom.scope.startswith("visitor_") and atom.subject:
        ids.add(atom.subject)
    return ids


def memory_subject_matches(atom: MemoryAtom, user_id: str) -> bool:
    return bool(user_id and user_id in memory_subject_user_ids(atom))


def can_view_memory_atom(atom: MemoryAtom, tavern: Any, user_id: str) -> bool:
    if atom.visibility == "public":
        return True
    if atom.visibility == "owner":
        return is_space_owner(tavern, user_id) or memory_subject_matches(atom, user_id)
    return memory_subject_matches(atom, user_id)


def can_edit_memory_atom(atom: MemoryAtom, tavern: Any, user_id: str) -> bool:
    if atom.visibility == "private":
        return memory_subject_matches(atom, user_id)
    return is_space_owner(tavern, user_id) or bool(user_id and atom.created_by == user_id)


def memory_atom_matches_filters(
    atom: MemoryAtom,
    *,
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    visibility: str = "",
    visitor_id: str = "",
    character_id: str = "",
    place_id: str = "",
) -> bool:
    if scope and atom.scope != scope:
        return False
    if dimension and atom.dimension != dimension:
        return False
    if horizon and atom.horizon != horizon:
        return False
    if visibility and atom.visibility != visibility:
        return False
    if visitor_id and atom.visitor_id != visitor_id and atom.subject != visitor_id:
        return False
    if character_id and atom.character_id != character_id:
        return False
    if place_id and atom.place_id != place_id:
        return False
    return True


def clamp_memory_limit(value: Any, default: int = 100, maximum: int = 500) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(maximum, limit))


def memory_atom_filters(
    *,
    scope: Any = "",
    dimension: Any = "",
    horizon: Any = "",
    visibility: Any = "",
    visitor_id: Any = "",
    character_id: Any = "",
    place_id: Any = "",
) -> dict[str, str]:
    return {
        "scope": memory_filter(scope, MEMORY_SCOPES),
        "dimension": memory_filter(dimension, MEMORY_DIMENSIONS),
        "horizon": memory_filter(horizon, MEMORY_HORIZONS),
        "visibility": memory_filter(visibility, MEMORY_VISIBILITIES),
        "visitor_id": str(visitor_id or "").strip(),
        "character_id": str(character_id or "").strip(),
        "place_id": str(place_id or "").strip(),
    }


def memory_atom_from_payload(
    data: dict[str, Any],
    *,
    space_id: str,
    user_id: str,
    now: str,
    existing: MemoryAtom | None = None,
) -> MemoryAtom:
    payload = existing.to_dict() if existing else {
        "id": f"mem_{uuid.uuid4().hex[:12]}",
        "space_id": space_id,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id,
    }

    editable_fields = (
        "scope",
        "dimension",
        "horizon",
        "subject",
        "content",
        "importance",
        "confidence",
        "source_message_ids",
        "pinned",
        "visibility",
        "visitor_id",
        "character_id",
        "place_id",
        "metadata",
    )
    for key in editable_fields:
        if key in data:
            payload[key] = data[key]

    if not existing:
        payload["id"] = str(data.get("id") or payload["id"]).strip() or payload["id"]
        payload["created_by"] = user_id
        payload["created_at"] = now
    payload["space_id"] = space_id
    payload["updated_at"] = now

    scope = str(payload.get("scope") or "visitor_tavern").strip()
    visibility = str(payload.get("visibility") or "private").strip()
    if visibility == "private" and not str(payload.get("visitor_id") or "").strip():
        payload["visitor_id"] = user_id
    if scope.startswith("visitor_"):
        if not str(payload.get("visitor_id") or "").strip():
            payload["visitor_id"] = str(payload.get("subject") or user_id or "").strip()
        if not str(payload.get("subject") or "").strip():
            payload["subject"] = str(payload.get("visitor_id") or user_id or "").strip()

    atom = MemoryAtom.from_dict(payload)
    if not atom.content.strip():
        raise ValueError("记忆内容不能为空")
    return atom


def validate_memory_atom_create(atom: MemoryAtom, tavern: Any, user_id: str) -> str:
    owner = is_space_owner(tavern, user_id)
    if atom.visibility == "private" and not memory_subject_matches(atom, user_id):
        return "只能创建自己的私密记忆"
    if atom.visibility == "private" and atom.scope.startswith("visitor_"):
        private_ids = {value for value in (atom.subject, atom.visitor_id) if value}
        if private_ids != {user_id}:
            return "私密访客记忆只能属于当前访客"
    if atom.scope.startswith("visitor_") and atom.visitor_id and atom.visitor_id != user_id and not owner:
        return "不能为其他访客创建记忆"
    if atom.visibility != "private" and not owner and atom.scope not in {"visitor_character", "visitor_tavern"}:
        return "只有店主能创建整间空间或地点记忆"
    return ""


def validate_memory_atom_update(atom: MemoryAtom, tavern: Any, user_id: str) -> str:
    if atom.visibility == "private" and not memory_subject_matches(atom, user_id):
        return "私密记忆只能属于当前访客"
    if atom.visibility == "private" and atom.scope.startswith("visitor_"):
        private_ids = {value for value in (atom.subject, atom.visitor_id) if value}
        if private_ids != {user_id}:
            return "私密访客记忆只能属于当前访客"
    if atom.scope.startswith("visitor_") and atom.visitor_id and atom.visitor_id != user_id and not is_space_owner(tavern, user_id):
        return "不能把记忆转给其他访客"
    return ""
