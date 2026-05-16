from __future__ import annotations

import hashlib
import json
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


SYSTEM_PUBLIC_WELFARE_OWNER_ID = "system_public_welfare"
CLUE_HUNT_ANSWER_SALT = "fablemap-clue-hunt-answer-v1"


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_answer(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def hash_answer(value: Any) -> str:
    normalized = normalize_answer(value)
    return hashlib.sha256(f"{CLUE_HUNT_ANSWER_SALT}:{normalized}".encode("utf-8")).hexdigest()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _text(value: Any, default: str = "", *, max_length: int = 500) -> str:
    text = " ".join(str(value or default).strip().split())
    return text[:max_length]


@dataclass
class ClueHuntNode:
    id: str
    tavern_id: str
    clue: str
    answer_hash: str
    hint: str = ""
    unlocked_summary: str = ""

    @classmethod
    def from_payload(cls, payload: dict[str, Any], index: int = 0) -> "ClueHuntNode":
        answer_hash = _text(payload.get("answer_hash"), max_length=96)
        answer = payload.get("answer")
        if not answer_hash and answer is not None:
            answer_hash = hash_answer(answer)
        return cls(
            id=_text(payload.get("id") or f"node_{index + 1}", max_length=64),
            tavern_id=_text(payload.get("tavern_id"), max_length=128),
            clue=_text(payload.get("clue"), max_length=800),
            answer_hash=answer_hash,
            hint=_text(payload.get("hint"), max_length=500),
            unlocked_summary=_text(payload.get("unlocked_summary"), max_length=300),
        )

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "clue": self.clue,
            "answer_hash": self.answer_hash,
            "hint": self.hint,
            "unlocked_summary": self.unlocked_summary,
        }


@dataclass
class ClueHuntRoute:
    id: str
    owner_id: str
    title: str
    description: str
    nodes: list[ClueHuntNode]
    reward_text: str
    reward_coin_amount: int = 0
    status: str = "draft"
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)

    @classmethod
    def from_payload(cls, payload: dict[str, Any], *, owner_id: str = "") -> "ClueHuntRoute":
        now = utc_now_iso()
        route_owner = _text(payload.get("owner_id") or owner_id, max_length=128)
        nodes = [
            ClueHuntNode.from_payload(node, index)
            for index, node in enumerate(payload.get("nodes") or [])
            if isinstance(node, dict)
        ]
        status = _text(payload.get("status") or "draft", max_length=32)
        if status not in {"draft", "published", "archived"}:
            status = "draft"
        return cls(
            id=_text(payload.get("id") or f"clue_{uuid.uuid4().hex[:12]}", max_length=128),
            owner_id=route_owner,
            title=_text(payload.get("title") or "未命名寻宝路线", max_length=120),
            description=_text(payload.get("description"), max_length=600),
            nodes=nodes,
            reward_text=_text(payload.get("reward_text") or "你找到了一段只属于这条路线的纪念文字。", max_length=600),
            reward_coin_amount=max(0, min(_safe_int(payload.get("reward_coin_amount"), 0), 99)),
            status=status,
            created_at=_text(payload.get("created_at") or now, max_length=64),
            updated_at=now,
        )

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "title": self.title,
            "description": self.description,
            "nodes": [node.to_internal_dict() for node in self.nodes],
            "reward_text": self.reward_text,
            "reward_coin_amount": self.reward_coin_amount,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class ClueHuntSession:
    id: str
    route_id: str
    visitor_id: str
    current_index: int = 0
    solved_node_ids: list[str] = field(default_factory=list)
    status: str = "active"
    attempts: dict[str, int] = field(default_factory=dict)
    reward_claimed_at: str = ""
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)
    completed_at: str = ""

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ClueHuntSession":
        return cls(
            id=_text(payload.get("id"), max_length=128),
            route_id=_text(payload.get("route_id"), max_length=128),
            visitor_id=_text(payload.get("visitor_id"), max_length=128),
            current_index=max(0, _safe_int(payload.get("current_index"), 0)),
            solved_node_ids=[_text(item, max_length=64) for item in payload.get("solved_node_ids", []) if item],
            status=_text(payload.get("status") or "active", max_length=32),
            attempts={str(k): _safe_int(v) for k, v in (payload.get("attempts") or {}).items()},
            reward_claimed_at=_text(payload.get("reward_claimed_at"), max_length=64),
            created_at=_text(payload.get("created_at") or utc_now_iso(), max_length=64),
            updated_at=_text(payload.get("updated_at") or utc_now_iso(), max_length=64),
            completed_at=_text(payload.get("completed_at"), max_length=64),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "route_id": self.route_id,
            "visitor_id": self.visitor_id,
            "current_index": self.current_index,
            "solved_node_ids": list(self.solved_node_ids),
            "status": self.status,
            "attempts": dict(self.attempts),
            "reward_claimed_at": self.reward_claimed_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "completed_at": self.completed_at,
        }


class ClueHuntStore:
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self.file_path.write_text(json.dumps({"routes": {}, "sessions": {}}, ensure_ascii=False, indent=2), encoding="utf-8")

    def _load(self) -> dict[str, Any]:
        try:
            payload = json.loads(self.file_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        return {
            "routes": deepcopy(payload.get("routes") if isinstance(payload.get("routes"), dict) else {}),
            "sessions": deepcopy(payload.get("sessions") if isinstance(payload.get("sessions"), dict) else {}),
        }

    def _save(self, payload: dict[str, Any]) -> None:
        self.file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    def save_route(self, route: ClueHuntRoute) -> ClueHuntRoute:
        payload = self._load()
        payload["routes"][route.id] = route.to_internal_dict()
        self._save(payload)
        return route

    def get_route(self, route_id: str) -> ClueHuntRoute | None:
        payload = self._load()
        raw = payload["routes"].get(route_id)
        if not isinstance(raw, dict):
            return None
        return ClueHuntRoute.from_payload(raw, owner_id=str(raw.get("owner_id") or ""))

    def list_routes(self, owner_id: str = "") -> list[ClueHuntRoute]:
        payload = self._load()
        routes = [
            ClueHuntRoute.from_payload(raw, owner_id=str(raw.get("owner_id") or ""))
            for raw in payload["routes"].values()
            if isinstance(raw, dict)
        ]
        if owner_id:
            routes = [route for route in routes if route.owner_id == owner_id]
        return sorted(routes, key=lambda route: route.updated_at, reverse=True)

    def save_session(self, session: ClueHuntSession) -> ClueHuntSession:
        payload = self._load()
        payload["sessions"][session.id] = session.to_dict()
        self._save(payload)
        return session

    def get_session(self, session_id: str) -> ClueHuntSession | None:
        payload = self._load()
        raw = payload["sessions"].get(session_id)
        if not isinstance(raw, dict):
            return None
        return ClueHuntSession.from_dict(raw)

    def get_session_for_visitor(self, route_id: str, visitor_id: str) -> ClueHuntSession | None:
        payload = self._load()
        for raw in payload["sessions"].values():
            if not isinstance(raw, dict):
                continue
            if raw.get("route_id") == route_id and raw.get("visitor_id") == visitor_id:
                return ClueHuntSession.from_dict(raw)
        return None
