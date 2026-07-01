from __future__ import annotations

from typing import Any


def world_info_keywords(value: Any) -> list[str]:
    """Normalize comma/list keyword payloads for deterministic WorldInfo checks."""

    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [
            item.strip()
            for item in value.replace("，", ",").replace("；", ",").replace(";", ",").split(",")
            if item.strip()
        ]
    return []


def world_info_primary_keywords(entry: dict[str, Any]) -> list[str]:
    return world_info_keywords(entry.get("keys", entry.get("key")))


def world_info_secondary_keywords(entry: dict[str, Any]) -> list[str]:
    return world_info_keywords(
        entry.get("keys_secondary", entry.get("secondary_keys", entry.get("keysecondary")))
    )


def world_info_entry_id(entry: dict[str, Any], fallback: str = "") -> str:
    return str(entry.get("id") or entry.get("uid") or fallback).strip()


def world_info_source_entries(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        entries = value.get("entries")
        if isinstance(entries, list):
            return entries
        if isinstance(entries, dict):
            return list(entries.values())
    return []


def world_info_order(entry: dict[str, Any]) -> int:
    try:
        return int(entry.get("order", entry.get("insertion_order", 100)))
    except (TypeError, ValueError):
        return 100


def world_info_probability(entry: dict[str, Any]) -> int:
    try:
        value = int(entry.get("probability", 100))
    except (TypeError, ValueError):
        value = 100
    return max(0, min(100, value))


def world_info_depth(entry: dict[str, Any]) -> int:
    try:
        value = int(entry.get("depth", 4))
    except (TypeError, ValueError):
        value = 4
    return max(0, value)


def world_info_title(entry: dict[str, Any]) -> str:
    keys = world_info_primary_keywords(entry)
    secondary = world_info_secondary_keywords(entry)
    if entry.get("constant") and not keys:
        return "常驻设定"
    return str((keys or secondary or [entry.get("id") or "未命名条目"])[0])


def test_world_info_entries(
    *,
    space_id: str,
    space_name: str,
    tavern_description: str,
    tavern_scene_prompt: str,
    tavern_world_info: list[Any],
    data: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return deterministic WorldInfo hit diagnostics without persistence or LLM calls."""

    payload = data or {}
    message = str(payload.get("message") or "")
    recent_messages = payload.get("recent_messages") or []
    if not isinstance(recent_messages, list):
        recent_messages = []

    base_parts: list[str] = [message]
    include_tavern_context = bool(payload.get("include_tavern_context"))
    if include_tavern_context:
        base_parts.extend([str(space_name or ""), str(tavern_description or ""), str(tavern_scene_prompt or "")])

    recent_parts: list[str] = []
    for item in recent_messages:
        if isinstance(item, dict):
            recent_parts.append(str(item.get("content") or item.get("message") or ""))
        else:
            recent_parts.append(str(item))

    source_entries = world_info_source_entries(payload.get("world_info"))
    if not source_entries:
        source_entries = tavern_world_info

    entries: list[dict[str, Any]] = []
    for index, raw_entry in enumerate(source_entries):
        entry = _entry_dict(raw_entry)
        if not entry:
            continue

        keys = world_info_primary_keywords(entry)
        keys_secondary = world_info_secondary_keywords(entry)
        depth = world_info_depth(entry)
        entry_parts = [*base_parts, *(recent_parts[-depth:] if depth else [])]
        search_text = "\n".join(part for part in entry_parts if part).casefold()
        primary_hits = [key for key in keys if key.casefold() in search_text]
        secondary_hits = [key for key in keys_secondary if key.casefold() in search_text]
        constant = bool(entry.get("constant"))
        disabled = bool(entry.get("disable"))
        selective = bool(entry.get("selective", True))
        probability = world_info_probability(entry)

        keyword_matched = constant or bool(primary_hits or (secondary_hits if selective else []))
        if not selective and not constant:
            keyword_matched = bool(primary_hits)

        matched = (not disabled) and keyword_matched and probability > 0
        if disabled:
            status = "disabled"
        elif not keyword_matched:
            status = "not_matched"
        elif probability <= 0:
            status = "probability_zero"
        elif probability < 100:
            status = "matched_with_probability"
        else:
            status = "matched"

        content = str(entry.get("content") or "")
        order = world_info_order(entry)
        entries.append(
            {
                "id": world_info_entry_id(entry, f"world_info_{index}"),
                "title": world_info_title(entry),
                "matched": matched,
                "keyword_matched": keyword_matched,
                "matched_keys": primary_hits,
                "matched_secondary_keys": secondary_hits,
                "keys": keys,
                "keys_secondary": keys_secondary,
                "constant": constant,
                "selective": selective,
                "disable": disabled,
                "depth": depth,
                "order": order,
                "insertion_order": order,
                "probability": probability,
                "status": status,
                "content_preview": content[:160],
            }
        )

    entries.sort(key=lambda item: (not item["matched"], item["order"], str(item["title"])))
    matches = [entry for entry in entries if entry["matched"]]
    return {
        "space_id": space_id,
        "message": message,
        "entry_count": len(entries),
        "matched_count": len(matches),
        "matches": matches,
        "entries": entries,
        "scanned_recent_count": len(recent_messages),
        "include_tavern_context": include_tavern_context,
    }


def _entry_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        result = to_dict()
        return result if isinstance(result, dict) else {}
    return {}
