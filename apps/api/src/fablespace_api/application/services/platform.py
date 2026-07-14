from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fablespace_api.core.space import ChatMessage, Tavern
from fablespace_api.infrastructure.shared_cache import SharedJsonCache


PLATFORM_RECENT_MEMORY_DEFAULT_LIMIT = 5
PLATFORM_RECENT_MEMORY_MAX_LIMIT = 5
PLATFORM_RECENT_MEMORY_MAX_TEXT_LENGTH = 96

# Cache TTL in seconds
_CACHE_TTL_STATS = 10  # stats can be slightly stale
_CACHE_TTL_RECENT_MEMORIES = 30  # recent memories can be more stale


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# The module can be imported before apps/api/.env is loaded, so app factories
# reconfigure this cache after settings resolution.
_platform_cache = SharedJsonCache("platform", os.environ.get("FABLESPACE_REDIS_URL", ""))


def configure_platform_cache(redis_url: str) -> None:
    """Replace the platform cache with a Redis-aware instance for this process."""
    global _platform_cache
    _platform_cache = SharedJsonCache("platform", redis_url)


def _safe_int(value: Any) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, parsed)


def _has_real_coordinate(tavern: Tavern) -> bool:
    try:
        float(tavern.lat)
        float(tavern.lon)
    except (TypeError, ValueError):
        return False
    return True


def _is_public_platform_tavern(tavern: Tavern) -> bool:
    # The home page is a public discovery surface. Private spaces and Home
    # records are not included even if a legacy record accidentally marks a
    # Home as public.
    if tavern.access == "private":
        return False
    if tavern.place_type == "home":
        return False
    return _has_real_coordinate(tavern)


def _clamp_recent_memory_limit(limit: int | None) -> int:
    if limit is None:
        return PLATFORM_RECENT_MEMORY_DEFAULT_LIMIT
    return max(1, min(_safe_int(limit) or PLATFORM_RECENT_MEMORY_DEFAULT_LIMIT, PLATFORM_RECENT_MEMORY_MAX_LIMIT))


def _compact_public_memory_text(value: Any) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= PLATFORM_RECENT_MEMORY_MAX_TEXT_LENGTH:
        return text
    return f"{text[:PLATFORM_RECENT_MEMORY_MAX_TEXT_LENGTH].rstrip()}…"


def _is_public_memory_message(message: ChatMessage) -> bool:
    if message.role != "assistant":
        return False
    text = _compact_public_memory_text(message.content)
    if len(text) < 8:
        return False
    return True


def _character_name(tavern: Tavern, character_id: str) -> str:
    if not character_id:
        return ""
    for character in tavern.characters:
        if character.id == character_id:
            return character.name
    return ""


class PlatformApplicationMixin:
    """Public platform-level aggregates used by the homepage.

    These endpoints intentionally return only public, non-secret summaries.
    They do not expose visitor identifiers, owner LLM config, hidden prompts,
    private Home records, or raw user messages.
    """

    def _public_platform_taverns(self) -> list[Tavern]:
        return [tavern for tavern in self.store.list_spaces(include_private=False) if _is_public_platform_tavern(tavern)]

    def _load_all_visitor_states(self, space_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        """Load all visitor states for multiple taverns with batch loading."""
        result: dict[str, list[dict[str, Any]]] = {tid: [] for tid in space_ids}
        if not space_ids:
            return result

        # Try batch loading first (MySQLTavernStore has this method)
        if hasattr(self.store, 'batch_list_visitor_states'):
            batch_result = self.store.batch_list_visitor_states(space_ids)
            for tid in space_ids:
                states = batch_result.get(tid, [])
                result[tid] = [s.to_dict() if hasattr(s, 'to_dict') else s for s in states]
            return result

        # Fallback for JSON store
        if not hasattr(self.store, '_load_taverns'):
            for space_id in space_ids:
                states = self.store.list_visitor_states(space_id)
                result[space_id] = [s.to_dict() if hasattr(s, 'to_dict') else s for s in states]
            return result

        data = self.store._load_taverns(include_seed_fallback=True)
        for space_id in space_ids:
            space_data = data.get(space_id, {})
            visitors = space_data.get("_visitors", {})
            if not isinstance(visitors, dict):
                continue
            for value in visitors.values():
                if not isinstance(value, dict):
                    continue
                result[space_id].append(value)

        return result

    def _load_all_chat_sessions(self, space_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        """Load all chat sessions for multiple taverns with minimal file I/O."""
        result: dict[str, list[dict[str, Any]]] = {tid: [] for tid in space_ids}
        if not space_ids:
            return result

        # Try batch loading first (MySQLTavernStore has this method)
        if hasattr(self.store, 'batch_list_chat_sessions'):
            batch_result = self.store.batch_list_chat_sessions(space_ids)
            for tid in space_ids:
                sessions = batch_result.get(tid, [])
                result[tid] = sessions
            return result

        # Fallback for JSON store
        # Try both 'root' (JSON store) and '_output_root' (MySQL store) attributes
        file_root = getattr(self.store, 'root', None) or getattr(self.store, '_output_root', None)
        if not file_root:
            # No file root: use existing method
            for space_id in space_ids:
                result[space_id] = self.store.list_chat_sessions(space_id, limit=None)
            return result

        for space_id in space_ids:
            chat_dir = file_root / "chat_history" / space_id
            if not chat_dir.exists():
                continue

            try:
                for file_path in sorted(chat_dir.glob("*.jsonl")):
                    messages = self.store._read_chat_file(file_path)
                    if not messages:
                        continue
                    last_message = messages[-1]
                    session_visitor_id = last_message.visitor_id or messages[0].visitor_id
                    session_visitor_name = last_message.visitor_name or messages[0].visitor_name
                    session_character_id = last_message.character_id or messages[0].character_id

                    # Store only metadata, not all messages (for stats)
                    result[space_id].append({
                        "space_id": space_id,
                        "visitor_id": session_visitor_id,
                        "visitor_name": session_visitor_name,
                        "character_id": session_character_id,
                        "message_count": len(messages),
                        "last_message": last_message,
                    })
            except OSError:
                continue

        return result

    def get_platform_stats(self) -> dict[str, Any]:
        """Get platform stats with caching and optimized single-pass loading."""
        # Check cache first
        cached = _platform_cache.get("stats")
        if cached is not None:
            return cached

        taverns = self._public_platform_taverns()
        if not taverns:
            result = {"stats": {"coordinates": 0, "characters": 0, "visits": 0, "encounters": 0, "chat_messages": 0, "open": 0}, "updated_at": _utc_now_iso()}
            _platform_cache.set("stats", result, _CACHE_TTL_STATS)
            return result

        space_ids = [t.id for t in taverns]

        # Batch load all visitor states in one _load_taverns call
        all_visitor_states = self._load_all_visitor_states(space_ids)

        # Batch load all chat session metadata
        all_chat_sessions = self._load_all_chat_sessions(space_ids)

        visits = 0
        chat_messages = 0

        for tavern in taverns:
            # Sum visit counts from visitor states for this tavern
            visitor_states = all_visitor_states.get(tavern.id, [])
            visitor_visits = sum(_safe_int(state.get("visit_count", 0)) for state in visitor_states)
            # visits += max(tavern.visit_count, visitor_visits)
            visits += max(_safe_int(tavern.visit_count), visitor_visits)

            # Sum message counts from chat sessions (no need to load full messages)
            sessions = all_chat_sessions.get(tavern.id, [])
            for session in sessions:
                chat_messages += _safe_int(session.get("message_count", 0))

        stats = {
            "coordinates": len(taverns),
            "characters": sum(len(tavern.characters) for tavern in taverns),
            "visits": visits,
            "encounters": visits,
            "chat_messages": chat_messages,
            "open": sum(1 for tavern in taverns if tavern.status == "open"),
        }
        result = {"stats": stats, "updated_at": _utc_now_iso()}
        _platform_cache.set("stats", result, _CACHE_TTL_STATS)
        return result

    def get_platform_recent_memories(self, limit: int | None = None) -> dict[str, Any]:
        """Get recent public memories with caching and optimized loading."""
        safe_limit = _clamp_recent_memory_limit(limit)

        # Check cache first (key includes limit to allow different page sizes)
        cache_key = f"recent_memories:{safe_limit}"
        cached = _platform_cache.get(cache_key)
        if cached is not None:
            return cached

        candidates: list[dict[str, Any]] = []
        seen_texts: set[str] = set()

        taverns = self._public_platform_taverns()
        if not taverns:
            result = {"memories": [], "count": 0, "limit": safe_limit, "updated_at": _utc_now_iso()}
            _platform_cache.set(cache_key, result, _CACHE_TTL_RECENT_MEMORIES)
            return result

        space_ids = [t.id for t in taverns]

        # Try optimized batch loading first
        if hasattr(self.store, 'batch_get_recent_public_messages'):
            # Use optimized MySQL batch loading
            recent_messages = self.store.batch_get_recent_public_messages(space_ids, limit_per_tavern=50)

            for tavern in taverns:
                messages = recent_messages.get(tavern.id, [])
                for message in messages:
                    if not isinstance(message, dict):
                        continue
                    content = _compact_public_memory_text(message.get("content", ""))
                    if len(content) < 8:
                        continue
                    dedupe_key = content.lower()
                    if dedupe_key in seen_texts:
                        continue
                    seen_texts.add(dedupe_key)
                    character_name = _character_name(tavern, message.get("character_id", ""))
                    candidates.append({
                        "id": message.get("id") or f"{tavern.id}:{message.get('timestamp')}",
                        "content": content,
                        "title": content,
                        "source": tavern.name,
                        "space_id": tavern.id,
                        "character_id": message.get("character_id", ""),
                        "character_name": character_name,
                        "timestamp": message.get("timestamp", ""),
                    })
        else:
            # Fallback: file-based chat history
            file_root = getattr(self.store, 'root', None) or getattr(self.store, '_output_root', None)
            has_file_chat = file_root is not None and (file_root / "chat_history").exists()

            if has_file_chat:
                for tavern in taverns:
                    chat_dir = file_root / "chat_history" / tavern.id
                    if not chat_dir.exists():
                        continue

                    try:
                        for file_path in sorted(chat_dir.glob("*.jsonl")):
                            messages = self.store._read_chat_file(file_path)
                            if not messages:
                                continue

                            for message in messages:
                                if not isinstance(message, ChatMessage):
                                    continue
                                if not _is_public_memory_message(message):
                                    continue
                                content = _compact_public_memory_text(message.content)
                                dedupe_key = content.lower()
                                if dedupe_key in seen_texts:
                                    continue
                                seen_texts.add(dedupe_key)
                                character_name = _character_name(tavern, message.character_id)
                                candidates.append({
                                    "id": message.id or f"{tavern.id}:{message.timestamp}",
                                    "content": content,
                                    "title": content,
                                    "source": tavern.name,
                                    "space_id": tavern.id,
                                    "character_id": message.character_id,
                                    "character_name": character_name,
                                    "timestamp": message.timestamp,
                                })
                    except OSError:
                        continue
            else:
                # Fallback for stores without file or batch methods
                for tavern in taverns:
                    sessions = self.store.list_chat_sessions(tavern.id, limit=None)
                    messages = sessions[0].get("messages", []) if sessions else []
                    if not isinstance(messages, list):
                        continue
                    for message in messages:
                        if not isinstance(message, ChatMessage):
                            continue
                        if not _is_public_memory_message(message):
                            continue
                        content = _compact_public_memory_text(message.content)
                        dedupe_key = content.lower()
                        if dedupe_key in seen_texts:
                            continue
                        seen_texts.add(dedupe_key)
                        character_name = _character_name(tavern, message.character_id)
                        candidates.append({
                            "id": message.id or f"{tavern.id}:{message.timestamp}",
                            "content": content,
                            "title": content,
                            "source": tavern.name,
                            "space_id": tavern.id,
                            "character_id": message.character_id,
                            "character_name": character_name,
                            "timestamp": message.timestamp,
                        })

        candidates.sort(key=lambda item: (str(item.get("timestamp") or ""), str(item.get("id") or "")), reverse=True)
        memories = candidates[:safe_limit]
        result = {
            "memories": memories,
            "count": len(memories),
            "limit": safe_limit,
            "updated_at": _utc_now_iso(),
        }
        _platform_cache.set(cache_key, result, _CACHE_TTL_RECENT_MEMORIES)
        return result
