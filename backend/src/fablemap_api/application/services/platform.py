from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fablemap_api.core.tavern import ChatMessage, Tavern


PLATFORM_RECENT_MEMORY_DEFAULT_LIMIT = 5
PLATFORM_RECENT_MEMORY_MAX_LIMIT = 5
PLATFORM_RECENT_MEMORY_MAX_TEXT_LENGTH = 96


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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
        return [tavern for tavern in self.store.list_taverns(include_private=False) if _is_public_platform_tavern(tavern)]

    def get_platform_stats(self) -> dict[str, Any]:
        taverns = self._public_platform_taverns()
        visits = 0
        chat_messages = 0

        for tavern in taverns:
            visitor_visits = sum(_safe_int(state.visit_count) for state in self.store.list_visitor_states(tavern.id))
            visits += max(_safe_int(tavern.visit_count), visitor_visits)
            chat_messages += sum(_safe_int(session.get("message_count")) for session in self.store.list_chat_sessions(tavern.id, limit=None))

        stats = {
            "coordinates": len(taverns),
            "characters": sum(len(tavern.characters) for tavern in taverns),
            "visits": visits,
            "encounters": visits,
            "chat_messages": chat_messages,
            "open": sum(1 for tavern in taverns if tavern.status == "open"),
        }
        return {"stats": stats, "updated_at": _utc_now_iso()}

    def get_platform_recent_memories(self, limit: int | None = None) -> dict[str, Any]:
        safe_limit = _clamp_recent_memory_limit(limit)
        candidates: list[dict[str, Any]] = []
        seen_texts: set[str] = set()

        for tavern in self._public_platform_taverns():
            for session in self.store.list_chat_sessions(tavern.id, limit=None):
                messages = session.get("messages", [])
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
                    candidates.append(
                        {
                            "id": message.id or f"{tavern.id}:{message.timestamp}",
                            "content": content,
                            "title": content,
                            "source": tavern.name,
                            "tavern_id": tavern.id,
                            "character_id": message.character_id,
                            "character_name": character_name,
                            "timestamp": message.timestamp,
                        }
                    )

        candidates.sort(key=lambda item: (str(item.get("timestamp") or ""), str(item.get("id") or "")), reverse=True)
        memories = candidates[:safe_limit]
        return {
            "memories": memories,
            "count": len(memories),
            "limit": safe_limit,
            "updated_at": _utc_now_iso(),
        }
