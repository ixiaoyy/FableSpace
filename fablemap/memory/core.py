# -*- coding: utf-8 -*-
"""
Memory / Summarization — chat history compression and memory management.

Features:
- Token-based history truncation
- Automatic summarization (via LLM)
- Memory graph (entity tracking)
- Long-term vs short-term memory
- Selective memory (important messages only)
"""

from __future__ import annotations

import logging
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Memory Types ───────────────────────────────────────────────────────────────

MEMORY_SCOPES = {"visitor_character", "visitor_tavern", "tavern_public", "place"}
MEMORY_DIMENSIONS = {"fact", "emotion", "event", "preference", "promise"}
MEMORY_HORIZONS = {"short", "mid", "long"}
MEMORY_VISIBILITIES = {"private", "owner", "public"}


def _choice(value: Any, allowed: set[str], default: str) -> str:
    candidate = str(value or "").strip()
    return candidate if candidate in allowed else default


def _bounded_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return max(0.0, min(1.0, parsed))


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _metadata(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


@dataclass
class MemoryAtom:
    """A structured tavern memory atom.

    This is the storage-neutral unit for the FM-VT-P2 memory system. It keeps
    the task-list contract fields and adds small routing metadata needed for
    tavern-level auth and filtering.
    """

    id: str = ""
    tavern_id: str = ""
    scope: str = "visitor_tavern"
    dimension: str = "fact"
    horizon: str = "short"
    subject: str = ""
    content: str = ""
    importance: float = 0.5
    confidence: float = 1.0
    source_message_ids: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
    pinned: bool = False
    visibility: str = "private"
    visitor_id: str = ""
    character_id: str = ""
    place_id: str = ""
    created_by: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "scope": self.scope,
            "dimension": self.dimension,
            "horizon": self.horizon,
            "subject": self.subject,
            "content": self.content,
            "importance": self.importance,
            "confidence": self.confidence,
            "source_message_ids": list(self.source_message_ids),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "pinned": self.pinned,
            "visibility": self.visibility,
            "visitor_id": self.visitor_id,
            "character_id": self.character_id,
            "place_id": self.place_id,
            "created_by": self.created_by,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "MemoryAtom":
        return cls(
            id=str(data.get("id") or "").strip(),
            tavern_id=str(data.get("tavern_id") or "").strip(),
            scope=_choice(data.get("scope"), MEMORY_SCOPES, "visitor_tavern"),
            dimension=_choice(data.get("dimension"), MEMORY_DIMENSIONS, "fact"),
            horizon=_choice(data.get("horizon"), MEMORY_HORIZONS, "short"),
            subject=str(data.get("subject") or "").strip(),
            content=str(data.get("content") or ""),
            importance=_bounded_float(data.get("importance"), 0.5),
            confidence=_bounded_float(data.get("confidence"), 1.0),
            source_message_ids=_string_list(data.get("source_message_ids")),
            created_at=str(data.get("created_at") or "").strip(),
            updated_at=str(data.get("updated_at") or "").strip(),
            pinned=bool(data.get("pinned", False)),
            visibility=_choice(data.get("visibility"), MEMORY_VISIBILITIES, "private"),
            visitor_id=str(data.get("visitor_id") or "").strip(),
            character_id=str(data.get("character_id") or "").strip(),
            place_id=str(data.get("place_id") or "").strip(),
            created_by=str(data.get("created_by") or "").strip(),
            metadata=_metadata(data.get("metadata")),
        )


@dataclass
class MemorySearchResult:
    """A ranked memory search hit."""

    atom: MemoryAtom
    score: float = 0.0
    reason: str = "keyword"

    def to_dict(self) -> dict[str, Any]:
        return {
            "memory_atom": self.atom.to_dict(),
            "score": max(0.0, min(1.0, float(self.score or 0.0))),
            "reason": self.reason,
        }


class MemoryStore(ABC):
    """Storage-neutral interface for structured tavern memories."""

    @abstractmethod
    def list_atoms(self, tavern_id: str, **filters: Any) -> list[MemoryAtom]:
        """List atoms for a tavern with optional metadata filters."""

    @abstractmethod
    def get_atom(self, tavern_id: str, memory_id: str) -> MemoryAtom | None:
        """Return one atom by id."""

    @abstractmethod
    def save_atom(self, tavern_id: str, atom: MemoryAtom) -> MemoryAtom:
        """Create or update one atom."""

    @abstractmethod
    def delete_atom(self, tavern_id: str, memory_id: str) -> bool:
        """Delete one atom."""

    @abstractmethod
    def search_atoms(
        self,
        tavern_id: str,
        query: str,
        *,
        limit: int = 10,
        **filters: Any,
    ) -> list[MemorySearchResult]:
        """Search atoms. Implementations may use keyword, vector, graph, or hybrid retrieval."""


class KeywordMemoryStore(MemoryStore):
    """Default MemoryStore backed by the current JSON TavernStore APIs.

    If no backend is provided, it uses an in-memory dictionary. That keeps tests
    and future adapters lightweight while preserving today's JSON store as the
    production path.
    """

    def __init__(self, backend: Any = None):
        self.backend = backend
        self._atoms: dict[str, dict[str, MemoryAtom]] = {}

    def list_atoms(self, tavern_id: str, **filters: Any) -> list[MemoryAtom]:
        atoms = self._backend_list(tavern_id)
        result = [atom for atom in atoms if self._matches_filters(atom, filters)]
        result.sort(
            key=lambda atom: (
                atom.pinned,
                float(atom.importance or 0.0),
                atom.updated_at or atom.created_at,
                atom.id,
            ),
            reverse=True,
        )
        return result

    def get_atom(self, tavern_id: str, memory_id: str) -> MemoryAtom | None:
        if self.backend and hasattr(self.backend, "get_memory_atom"):
            atom = self.backend.get_memory_atom(tavern_id, memory_id)
            return atom if isinstance(atom, MemoryAtom) else _coerce_memory_atom(atom)
        return self._atoms.get(tavern_id, {}).get(memory_id)

    def save_atom(self, tavern_id: str, atom: MemoryAtom) -> MemoryAtom:
        atom.tavern_id = tavern_id
        if not atom.id:
            atom.id = f"mem_{uuid.uuid4().hex[:12]}"
        now = _now_utc_iso()
        atom.created_at = atom.created_at or now
        atom.updated_at = now
        if self.backend and hasattr(self.backend, "save_memory_atom"):
            saved = self.backend.save_memory_atom(tavern_id, atom)
            return saved if isinstance(saved, MemoryAtom) else MemoryAtom.from_dict(saved)
        self._atoms.setdefault(tavern_id, {})[atom.id] = atom
        return atom

    def delete_atom(self, tavern_id: str, memory_id: str) -> bool:
        if self.backend and hasattr(self.backend, "delete_memory_atom"):
            return bool(self.backend.delete_memory_atom(tavern_id, memory_id))
        atoms = self._atoms.get(tavern_id, {})
        if memory_id not in atoms:
            return False
        del atoms[memory_id]
        return True

    def search_atoms(
        self,
        tavern_id: str,
        query: str,
        *,
        limit: int = 10,
        **filters: Any,
    ) -> list[MemorySearchResult]:
        atoms = self.list_atoms(tavern_id, **filters)
        query_text = str(query or "").strip().lower()
        query_tokens = _keyword_tokens(query_text)
        results: list[MemorySearchResult] = []
        for atom in atoms:
            score, reason = self._keyword_score(atom, query_text, query_tokens)
            if query_text and score <= 0:
                continue
            results.append(MemorySearchResult(atom=atom, score=score, reason=reason))
        results.sort(
            key=lambda result: (
                result.score,
                result.atom.pinned,
                float(result.atom.importance or 0.0),
                result.atom.updated_at or result.atom.created_at,
                result.atom.id,
            ),
            reverse=True,
        )
        return results[: max(1, int(limit or 1))]

    def _backend_list(self, tavern_id: str) -> list[MemoryAtom]:
        if self.backend and hasattr(self.backend, "list_memory_atoms"):
            values = self.backend.list_memory_atoms(tavern_id)
        else:
            values = list(self._atoms.get(tavern_id, {}).values())
        atoms: list[MemoryAtom] = []
        for value in values:
            atom = _coerce_memory_atom(value)
            if atom:
                atoms.append(atom)
        return atoms

    @staticmethod
    def _matches_filters(atom: MemoryAtom, filters: dict[str, Any]) -> bool:
        exact_fields = (
            "scope",
            "dimension",
            "horizon",
            "visibility",
            "visitor_id",
            "character_id",
            "place_id",
            "created_by",
        )
        for field_name in exact_fields:
            expected = str(filters.get(field_name) or "").strip()
            if expected and str(getattr(atom, field_name, "") or "") != expected:
                return False
        if "pinned" in filters and filters["pinned"] is not None:
            if bool(atom.pinned) is not bool(filters["pinned"]):
                return False
        if not bool(filters.get("include_flagged", False)):
            metadata = atom.metadata or {}
            if metadata.get("flagged_wrong") or metadata.get("archived"):
                return False
        return True

    @staticmethod
    def _keyword_score(atom: MemoryAtom, query_text: str, query_tokens: set[str]) -> tuple[float, str]:
        if not query_text:
            base = min(1.0, 0.25 + float(atom.importance or 0.0) * 0.5)
            return base, "recent"
        haystack = f"{atom.subject} {atom.content} {' '.join(atom.source_message_ids)}".lower()
        content_tokens = _keyword_tokens(haystack)
        overlap = len(query_tokens & content_tokens)
        substring_hit = query_text in haystack
        if not overlap and not substring_hit:
            return 0.0, "no_match"
        score = 0.35 if substring_hit else 0.0
        if query_tokens:
            score += min(0.45, overlap / max(1, len(query_tokens)) * 0.45)
        score += min(0.2, float(atom.importance or 0.0) * 0.2)
        if atom.pinned:
            score += 0.05
        return min(1.0, score), "keyword"


_PROMISE_MARKERS = {
    "promise", "swear", "will definitely", "i will", "i'll", "承诺", "发誓", "一定", "会记住", "会做到", "答应",
}
_PREFERENCE_MARKERS = {
    "prefer", "like", "dislike", "want", "wish", "favorite", "favourite", "hate",
    "喜欢", "讨厌", "想要", "希望", "不愿意", "宁愿", "偏好", "最爱", "总是", "从不",
}
_EVENT_MARKERS = {
    "yesterday", "tomorrow", "today", "happened", "occurred", "last night", "next week",
    "when i", "i once", "i used to", "went to", "met", "saw", "found",
    "昨天", "今天", "明天", "上周", "下周", "曾经", "记得", "遇见", "看见", "发生", "去了", "找到",
}
_EMOTION_MARKERS = {
    "happy", "sad", "angry", "excited", "worried", "love", "fear", "joy", "regret", "proud", "grateful",
    "开心", "难过", "生气", "担心", "害怕", "后悔", "骄傲", "感激", "哈哈", "呜呜", "555", "t_t",
}
_FACT_MARKERS = {
    "my name is", "i am", "i'm", "i have", "i live", "i work", "birthday",
    "我叫", "我的名字", "我是", "我有", "我住", "我在", "生日", "来自", "职业", "工作",
}
_FIRST_PERSON_MARKERS = {"i ", "i'", "my ", "me ", "我", "我的", "咱", "俺"}
_DIMENSION_LABELS = {
    "fact": "事实",
    "emotion": "情绪",
    "event": "事件",
    "preference": "偏好",
    "promise": "承诺",
}
_HORIZON_LABELS = {
    "short": "短期",
    "mid": "中期",
    "long": "长期",
}
_HORIZON_RANK = {"short": 1, "mid": 2, "long": 3}


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_memory_text(text: Any, max_chars: int = 500) -> str:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max_chars - 1].rstrip() + "…"


def _contains_any(content_lower: str, markers: set[str]) -> bool:
    return any(marker in content_lower for marker in markers)


def _content_fingerprint(text: str) -> str:
    normalized = re.sub(r"[\s\W_]+", "", str(text or "").lower(), flags=re.UNICODE)
    return normalized[:240]


def _keyword_tokens(text: str) -> set[str]:
    content = str(text or "").lower()
    latin = set(re.findall(r"[a-z0-9]{3,}", content))
    cjk = set(re.findall(r"[\u4e00-\u9fff]{2,6}", content))
    return latin | cjk


def _approx_token_count(text: str) -> int:
    content = str(text or "")
    if not content:
        return 0
    return max(1, (len(content) + 3) // 4)


def infer_memory_dimension(content: str) -> str:
    """Infer the structured memory dimension from a candidate sentence."""

    content_lower = str(content or "").lower()
    if _contains_any(content_lower, _PROMISE_MARKERS):
        return "promise"
    if _contains_any(content_lower, _PREFERENCE_MARKERS):
        return "preference"
    if _contains_any(content_lower, _EVENT_MARKERS):
        return "event"
    if _contains_any(content_lower, _EMOTION_MARKERS):
        return "emotion"
    if _contains_any(content_lower, _FACT_MARKERS):
        return "fact"
    return "fact"


def _horizon_for_importance(importance: float) -> str:
    if importance >= 0.75:
        return "long"
    if importance >= 0.55:
        return "mid"
    return "short"


# ─── Importance Scorer ─────────────────────────────────────────────────────────


class ImportanceScorer:
    """
    Score message importance for selective memory.

    Heuristics:
    - Contains character names → high importance
    - Contains emotional markers → medium importance
    - Contains new facts → high importance
    - Contains questions → medium importance
    """

    EMOTION_MARKERS = [
        "happy", "sad", "angry", "excited", "worried", "love", "hate",
        "喜欢", "生气", "开心", "难过", "担心", "爱", "恨",
        "哈哈", "呜呜", "啊啊啊",
    ]
    FACT_MARKERS = [
        "is", "are", "was", "were", "has", "have", "will", "would",
        "是", "有", "在", "去", "来", "做",
    ]

    def score(self, message: dict) -> float:
        """Score a message's importance (0.0 - 1.0)."""
        content = message.get("content", "").lower()
        score = 0.3  # Base score

        for marker in self.EMOTION_MARKERS:
            if marker.lower() in content:
                score += 0.1
                break

        for marker in self.FACT_MARKERS:
            if marker.lower() in content:
                score += 0.15
                break

        if len(content) > 200:
            score += 0.1

        if "?" in content or "？" in content:
            score += 0.05

        return min(score, 1.0)


def _score_memory_candidate(content: str, *, role: str = "visitor") -> float:
    text = _clean_memory_text(content, max_chars=800)
    if len(text) < 4:
        return 0.0

    content_lower = text.lower()
    question_like = "?" in text or "？" in text
    first_person = _contains_any(content_lower, _FIRST_PERSON_MARKERS)
    dimension = infer_memory_dimension(text)
    score = ImportanceScorer().score({"content": text})

    if dimension == "promise":
        score = max(score, 0.75)
    elif dimension == "preference":
        score = max(score, 0.68)
    elif dimension == "event":
        score = max(score, 0.62)
    elif dimension == "emotion":
        score = max(score, 0.56)
    elif _contains_any(content_lower, _FACT_MARKERS):
        score = max(score, 0.58)

    if first_person:
        score += 0.08
    if role == "assistant" and dimension == "promise":
        score += 0.05
    if question_like and not first_person and dimension != "promise":
        score -= 0.18
    if len(text) > 120:
        score += 0.05

    return max(0.0, min(1.0, score))


def _split_memory_candidates(text: str, *, max_candidates: int = 4) -> list[str]:
    content = str(text or "").strip()
    if not content:
        return []

    raw_parts = re.split(r"[\n。！？!?；;]+", content)
    candidates: list[str] = []
    for part in raw_parts:
        cleaned = _clean_memory_text(part)
        if not cleaned:
            continue
        if _content_fingerprint(cleaned) in {_content_fingerprint(item) for item in candidates}:
            continue
        candidates.append(cleaned)
        if len(candidates) >= max_candidates:
            break
    return candidates


def _build_auto_memory_atom(
    *,
    tavern_id: str,
    visitor_id: str,
    character_id: str,
    character_name: str,
    content: str,
    role: str,
    importance: float,
    source_message_id: str = "",
) -> MemoryAtom:
    dimension = infer_memory_dimension(content)
    now = _now_utc_iso()
    fingerprint = _content_fingerprint(content)
    return MemoryAtom(
        id=f"mem_{uuid.uuid4().hex[:12]}",
        tavern_id=tavern_id,
        scope="visitor_character" if character_id else "visitor_tavern",
        dimension=dimension,
        horizon=_horizon_for_importance(importance),
        subject=character_name if role == "assistant" else visitor_id,
        content=_clean_memory_text(content),
        importance=importance,
        confidence=0.82 if role == "visitor" else 0.72,
        source_message_ids=[source_message_id] if source_message_id else [],
        created_at=now,
        updated_at=now,
        pinned=False,
        visibility="private",
        visitor_id=visitor_id,
        character_id=character_id,
        created_by="auto_memory",
        metadata={
            "source": "auto_chat",
            "source_role": role,
            "memory_fingerprint": fingerprint,
            "hit_count": 1,
            "flagged_wrong": False,
        },
    )


def _merge_memory_atom(existing: MemoryAtom, candidate: MemoryAtom) -> MemoryAtom:
    metadata = dict(existing.metadata or {})
    metadata["hit_count"] = int(metadata.get("hit_count") or 1) + 1
    metadata.setdefault("source", "auto_chat")
    metadata.setdefault("memory_fingerprint", _content_fingerprint(existing.content))
    source_roles = set(_string_list(metadata.get("source_roles")))
    if candidate.metadata.get("source_role"):
        source_roles.add(str(candidate.metadata["source_role"]))
    if source_roles:
        metadata["source_roles"] = sorted(source_roles)

    existing.importance = max(float(existing.importance or 0.0), float(candidate.importance or 0.0))
    existing.confidence = max(float(existing.confidence or 0.0), float(candidate.confidence or 0.0))
    if _HORIZON_RANK.get(candidate.horizon, 0) > _HORIZON_RANK.get(existing.horizon, 0):
        existing.horizon = candidate.horizon
    existing.source_message_ids = sorted(set(existing.source_message_ids) | set(candidate.source_message_ids))
    existing.updated_at = candidate.updated_at or _now_utc_iso()
    existing.metadata = metadata
    return existing


def auto_create_memories_from_chat(
    tavern_store: Any,
    tavern_id: str,
    visitor_id: str,
    character_id: str,
    character_name: str,
    user_message: str,
    assistant_message: str,
    *,
    user_message_id: str = "",
    assistant_message_id: str = "",
    importance_threshold: float = 0.5,
) -> list[MemoryAtom]:
    """Extract, dedupe, and persist MemoryAtom entries from one chat turn."""

    if not tavern_store or not tavern_id or not visitor_id:
        return []

    existing_atoms = []
    try:
        existing_atoms = tavern_store.list_memory_atoms(tavern_id)
    except Exception:
        existing_atoms = []

    created_or_updated: list[MemoryAtom] = []
    existing_by_fingerprint: dict[tuple[str, str, str, str], MemoryAtom] = {}
    for atom in existing_atoms:
        if atom.visitor_id and atom.visitor_id != visitor_id:
            continue
        if character_id and atom.character_id and atom.character_id != character_id:
            continue
        metadata = atom.metadata or {}
        fingerprint = str(metadata.get("memory_fingerprint") or _content_fingerprint(atom.content))
        if fingerprint:
            existing_by_fingerprint[(atom.scope, atom.dimension, atom.character_id, fingerprint)] = atom

    messages = [
        ("visitor", user_message, user_message_id),
        ("assistant", assistant_message, assistant_message_id),
    ]
    for role, message_text, message_id in messages:
        for candidate_text in _split_memory_candidates(message_text):
            score = _score_memory_candidate(candidate_text, role=role)
            if score < importance_threshold:
                continue
            candidate = _build_auto_memory_atom(
                tavern_id=tavern_id,
                visitor_id=visitor_id,
                character_id=character_id,
                character_name=character_name,
                content=candidate_text,
                role=role,
                importance=score,
                source_message_id=message_id,
            )
            key = (
                candidate.scope,
                candidate.dimension,
                candidate.character_id,
                str(candidate.metadata.get("memory_fingerprint") or ""),
            )
            atom_to_save = _merge_memory_atom(existing_by_fingerprint[key], candidate) if key in existing_by_fingerprint else candidate
            try:
                saved = tavern_store.save_memory_atom(tavern_id, atom_to_save)
            except Exception:
                continue
            existing_by_fingerprint[key] = saved
            created_or_updated.append(saved)

    return created_or_updated


def _coerce_memory_atom(value: MemoryAtom | dict[str, Any]) -> MemoryAtom | None:
    if isinstance(value, MemoryAtom):
        return value
    if isinstance(value, dict):
        try:
            return MemoryAtom.from_dict(value)
        except (TypeError, ValueError):
            return None
    return None


def memory_atom_prompt_line(atom: MemoryAtom, *, max_chars: int = 180) -> str:
    horizon = _HORIZON_LABELS.get(atom.horizon, atom.horizon or "短期")
    dimension = _DIMENSION_LABELS.get(atom.dimension, atom.dimension or "事实")
    pin = "置顶/" if atom.pinned else ""
    content = _clean_memory_text(atom.content, max_chars=max_chars)
    return f"- [{pin}{horizon}/{dimension}] {content}"


def format_memory_atoms_for_prompt(atoms: list[MemoryAtom | dict[str, Any]], *, max_chars: int = 180) -> str:
    lines = []
    for value in atoms:
        atom = _coerce_memory_atom(value)
        if atom and atom.content.strip():
            lines.append(memory_atom_prompt_line(atom, max_chars=max_chars))
    return "\n".join(lines)


def select_memory_atoms_for_prompt(
    atoms: list[MemoryAtom | dict[str, Any]],
    *,
    visitor_id: str = "",
    character_id: str = "",
    place_id: str = "",
    current_message: str = "",
    budget_tokens: int = 1200,
    include_short: bool = True,
    include_mid: bool = True,
    include_long: bool = True,
    limit: int = 24,
) -> list[MemoryAtom]:
    """Select memory atoms for prompt injection with priority and token budget."""

    try:
        budget = max(0, int(budget_tokens))
    except (TypeError, ValueError):
        budget = 1200
    if budget <= 0:
        return []

    allowed_horizons = set()
    if include_short:
        allowed_horizons.add("short")
    if include_mid:
        allowed_horizons.add("mid")
    if include_long:
        allowed_horizons.add("long")
    if not allowed_horizons:
        return []

    query_tokens = _keyword_tokens(current_message)
    candidates: list[MemoryAtom] = []
    for value in atoms:
        atom = _coerce_memory_atom(value)
        if not atom or not atom.content.strip():
            continue
        metadata = atom.metadata or {}
        if metadata.get("flagged_wrong") or metadata.get("archived") or metadata.get("excluded_from_prompt"):
            continue
        if atom.horizon not in allowed_horizons:
            continue
        if visitor_id and atom.visitor_id and atom.visitor_id != visitor_id:
            continue
        if place_id and atom.place_id and atom.place_id != place_id:
            continue
        candidates.append(atom)

    def score(atom: MemoryAtom) -> tuple[Any, ...]:
        content_tokens = _keyword_tokens(atom.content)
        overlap = len(query_tokens & content_tokens)
        character_weight = 2 if character_id and atom.character_id == character_id else 0
        scope_weight = {
            "visitor_character": 3,
            "visitor_tavern": 2,
            "tavern_public": 1,
            "place": 0,
        }.get(atom.scope, 0)
        return (
            1 if atom.pinned else 0,
            _HORIZON_RANK.get(atom.horizon, 0),
            character_weight,
            scope_weight,
            overlap,
            float(atom.importance or 0.0),
            float(atom.confidence or 0.0),
            atom.updated_at or atom.created_at or "",
            atom.id,
        )

    selected: list[MemoryAtom] = []
    used_tokens = 0
    for atom in sorted(candidates, key=score, reverse=True):
        line = memory_atom_prompt_line(atom)
        line_tokens = _approx_token_count(line)
        if selected and used_tokens + line_tokens > budget:
            continue
        selected.append(atom)
        used_tokens += line_tokens
        if len(selected) >= max(1, int(limit or 1)):
            break

    return selected


@dataclass
class MemoryEntry:
    """A single memory entry."""
    id: str = ""
    content: str = ""
    importance: float = 1.0  # 0.0 - 1.0
    timestamp: str = ""
    source: str = ""  # "summary" | "manual" | "auto" | "entity"
    tags: list[str] = field(default_factory=list)
    entities: list[str] = field(default_factory=list)  # character names, places, etc.


@dataclass
class ChatMemory:
    """Manages chat memory with summarization."""
    entries: list[MemoryEntry] = field(default_factory=list)
    summary: str = ""
    max_entries: int = 50
    last_summary_time: str = ""

    def add_entry(self, entry: MemoryEntry) -> None:
        """Add a memory entry."""
        self.entries.append(entry)
        if len(self.entries) > self.max_entries:
            self.entries.sort(key=lambda e: e.importance)
            self.entries = self.entries[int(self.max_entries * 0.8):]

    def set_summary(self, summary: str, timestamp: str = "") -> None:
        """Set the memory summary."""
        self.summary = summary
        from datetime import datetime
        self.last_summary_time = timestamp or datetime.now().isoformat()

    def get_recent(self, n: int = 10) -> list[MemoryEntry]:
        """Get the N most recent entries."""
        return sorted(self.entries, key=lambda e: e.timestamp, reverse=True)[:n]

    def get_important(self, threshold: float = 0.7) -> list[MemoryEntry]:
        """Get entries above importance threshold."""
        return [e for e in self.entries if e.importance >= threshold]


# ─── Summarizer ────────────────────────────────────────────────────────────────


class ChatSummarizer:
    """
    Summarize chat history using LLM.

    Supports different summarization strategies:
    - full: summarize entire history
    - incremental: summarize new messages since last summary
    - entity-focused: extract entities and relationships
    """

    def __init__(self, llm_client=None):
        self.llm_client = llm_client

    def summarize(
        self,
        messages: list[dict],
        strategy: str = "incremental",
        previous_summary: str = "",
        **kwargs,
    ) -> str:
        if not self.llm_client:
            raise ValueError("LLM client not configured for summarization")

        if strategy == "incremental":
            return self._summarize_incremental(messages, previous_summary, **kwargs)
        elif strategy == "entity_focused":
            return self._summarize_entities(messages, **kwargs)
        else:
            return self._summarize_full(messages, **kwargs)

    def _summarize_full(self, messages: list[dict], **kwargs) -> str:
        """Full history summarization."""
        history_text = self._format_messages(messages)
        prompt = f"""Summarize the following conversation. Focus on:
1. Key events and decisions
2. Character relationships and dynamics
3. Important facts established
4. Emotional tone and progression

Conversation:
{history_text}

Provide a concise but comprehensive summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _summarize_incremental(
        self, messages: list[dict], previous_summary: str, **kwargs
    ) -> str:
        """Incremental summarization — update existing summary with new messages."""
        new_messages = self._format_messages(messages)
        prompt = f"""Previous conversation summary:
{previous_summary}

New messages since last summary:
{new_messages}

Update the summary by:
1. Adding new important events, facts, or relationship changes
2. Maintaining the overall structure of the summary
3. Keeping the summary concise

Updated summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _summarize_entities(self, messages: list[dict], **kwargs) -> str:
        """Entity-focused summarization — extract characters, places, items."""
        history_text = self._format_messages(messages)
        prompt = f"""Extract and organize key entities from this conversation.

Format as:
**Characters**: (name, personality, role)
**Places**: (name, description, significance)
**Objects/Items**: (name, description, significance)
**Relationships**: (character1 <-> character2: relationship type)
**Key Events**: (brief description)

Conversation:
{history_text}

Entity summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _format_messages(self, messages: list[dict], max_chars: int = 8000) -> str:
        """Format messages for summarization prompt."""
        parts = []
        total = 0
        for msg in messages[-50:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if len(content) > 500:
                content = content[:500] + "..."
            line = f"{role}: {content}"
            if total + len(line) > max_chars:
                break
            parts.append(line)
            total += len(line)
        return "\n".join(parts)


# ─── Token Truncation ──────────────────────────────────────────────────────────


class HistoryTruncator:
    """
    Truncate chat history based on token limits.

    SillyTavern's power-user feature: intelligently truncate history
    while preserving important context.
    """

    def __init__(self, token_counter=None):
        self.token_counter = token_counter

    def truncate(
        self,
        messages: list[dict],
        max_tokens: int,
        preserve_system: bool = True,
        preserve_recent: int = 2,
    ) -> list[dict]:
        if not self.token_counter:
            return self._truncate_fallback(messages, max_tokens * 4)

        result = []
        system_msg = None
        if preserve_system and messages and messages[0].get("role") == "system":
            system_msg = messages[0]
            messages = messages[1:]

        total_tokens = 0
        included = []

        recent = messages[-preserve_recent:] if preserve_recent > 0 else []
        older = messages[:-preserve_recent] if preserve_recent > 0 else messages

        for msg in reversed(older):
            tokens = self.token_counter.count_messages([msg])
            if total_tokens + tokens <= max_tokens - 200:
                included.insert(0, msg)
                total_tokens += tokens
            else:
                break

        if system_msg:
            result.append(system_msg)
        result.extend(included)
        result.extend(recent)

        return result

    def _truncate_fallback(
        self, messages: list[dict], max_chars: int
    ) -> list[dict]:
        """Fallback: truncate by character count."""
        result = []
        total = 0
        for msg in messages:
            content = msg.get("content", "")
            if total + len(content) > max_chars:
                break
            result.append(msg)
            total += len(content)
        return result


# ─── Memory Manager ────────────────────────────────────────────────────────────


class MemoryManager:
    """
    Complete memory management system.

    Combines summarization, truncation, and importance scoring
    to manage chat memory efficiently.
    """

    def __init__(self, llm_client=None, token_counter=None):
        self.summarizer = ChatSummarizer(llm_client)
        self.truncator = HistoryTruncator(token_counter)
        self.scorer = ImportanceScorer()
        self.memory = ChatMemory()

    def process_messages(
        self,
        messages: list[dict],
        max_tokens: int,
        should_summarize: bool = False,
    ) -> tuple[list[dict], str]:
        for msg in messages:
            importance = self.scorer.score(msg)
            if importance > 0.5:
                entry = MemoryEntry(
                    content=msg.get("content", ""),
                    importance=importance,
                    source="auto",
                    entities=self._extract_entities(msg),
                )
                self.memory.add_entry(entry)

        truncated = self.truncator.truncate(messages, max_tokens)

        summary = self.memory.summary
        if should_summarize and self.summarizer.llm_client:
            summary = self.summarizer.summarize(
                messages,
                strategy="incremental",
                previous_summary=summary,
            )
            self.memory.set_summary(summary)

        return truncated, summary

    def _extract_entities(self, message: dict) -> list[str]:
        """Extract named entities from a message."""
        content = message.get("content", "")
        entities = []

        entities.extend(re.findall(r'"([^"]+)"', content))
        entities.extend(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content))
        entities.extend(re.findall(r'[\u4e00-\u9fff]{2,4}', content))

        return list(set(entities))

    def get_context_for_prompt(self, max_entries: int = 5) -> str:
        """Get memory context for injection into prompts."""
        entries = self.memory.get_recent(max_entries)
        if not entries and not self.memory.summary:
            return ""

        parts = []
        if self.memory.summary:
            parts.append(f"[Memory Summary]\n{self.memory.summary}")
        if entries:
            parts.append("[Recent Memories]")
            for e in entries:
                parts.append(f"- {e.content[:200]}")

        return "\n".join(parts)
