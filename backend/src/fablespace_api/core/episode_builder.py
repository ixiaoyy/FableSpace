from __future__ import annotations

import re
from typing import Any


EPISODE_EXPORT_FORMAT = "episode_markdown_v1"
VISIBLE_EXPORT_ROLES = {"user", "assistant"}


def build_episode_export(
    *,
    space_id: str,
    space_name: str = "",
    visitor_id: str,
    character_id: str = "",
    character_name: str = "",
    title: str = "",
    messages: list[Any] | None = None,
    state_cards: list[Any] | None = None,
) -> dict[str, Any]:
    """Build a deterministic episode export from observable chat and state cards.

    This helper does not call an LLM and does not persist the export. It formats
    existing records into a readable draft while filtering hidden/system prompt
    messages from the transcript.
    """

    safe_tavern_id = _text(space_id, max_length=120)
    safe_visitor_id = _text(visitor_id, max_length=120)
    safe_character_id = _text(character_id, max_length=120)
    safe_tavern_name = _text(space_name, max_length=120) or safe_tavern_id
    safe_character_name = _text(character_name, max_length=80) or "NPC"
    safe_title = _text(title, max_length=120) or f"{safe_tavern_name} 的一夜记录"

    visible_messages = [_message_payload(item, safe_character_name) for item in (messages or [])]
    visible_messages = [item for item in visible_messages if item]
    visible_cards = [_state_card_payload(item) for item in (state_cards or [])]
    visible_cards = [item for item in visible_cards if item]

    markdown = _markdown(
        title=safe_title,
        space_name=safe_tavern_name,
        visitor_id=safe_visitor_id,
        character_name=safe_character_name,
        messages=visible_messages,
        state_cards=visible_cards,
    )

    episode = {
        "title": safe_title,
        "summary": f"导出草稿：{len(visible_messages)} 条可见对话，{len(visible_cards)} 张状态卡。",
        "markdown": markdown,
        "messages": visible_messages,
        "state_cards": visible_cards,
        "message_count": len(visible_messages),
        "state_card_count": len(visible_cards),
    }
    return {
        "ok": True,
        "space_id": safe_tavern_id,
        "space_name": safe_tavern_name,
        "visitor_id": safe_visitor_id,
        "character_id": safe_character_id,
        "format": EPISODE_EXPORT_FORMAT,
        "persisted": False,
        "episode": episode,
    }


def _message_payload(value: Any, character_name: str) -> dict[str, Any]:
    data = value.to_dict() if hasattr(value, "to_dict") else (value if isinstance(value, dict) else {})
    role = _text(data.get("role"), max_length=40).lower()
    if role not in VISIBLE_EXPORT_ROLES:
        return {}
    content = _text(data.get("content"), max_length=1800)
    if not content:
        return {}
    speaker = _text(data.get("visitor_name"), max_length=80) if role == "user" else character_name
    if not speaker:
        speaker = "访客" if role == "user" else character_name
    return {
        "id": _text(data.get("id"), max_length=120),
        "role": role,
        "speaker": speaker,
        "content": content,
        "timestamp": _text(data.get("timestamp"), max_length=80),
    }


def _state_card_payload(value: Any) -> dict[str, Any]:
    data = value.to_dict() if hasattr(value, "to_dict") else (value if isinstance(value, dict) else {})
    title = _text(data.get("title"), max_length=120)
    summary = _text(data.get("summary"), max_length=600)
    if not title and not summary:
        return {}
    return {
        "id": _text(data.get("id"), max_length=120),
        "category": _text(data.get("category"), max_length=40) or "event_log",
        "status": _text(data.get("status"), max_length=40) or "confirmed",
        "title": title or "未命名状态卡",
        "summary": summary,
    }


def _markdown(
    *,
    title: str,
    space_name: str,
    visitor_id: str,
    character_name: str,
    messages: list[dict[str, Any]],
    state_cards: list[dict[str, Any]],
) -> str:
    lines = [
        f"# {title}",
        "",
        "> FableSpace 导出草稿：基于可见聊天记录与状态卡整理；不是平台自动创作的新剧情。",
        "",
        "## 导出范围",
        "",
        f"- 空间：{space_name}",
        f"- 访客：{visitor_id}",
        f"- NPC：{character_name}",
        f"- 可见对话：{len(messages)} 条",
        f"- 状态卡：{len(state_cards)} 张",
        "",
        "## 状态卡摘要",
        "",
    ]
    if state_cards:
        for card in state_cards:
            status = "已确认正史" if card["status"] == "confirmed" else "待确认候选"
            summary = f"：{card['summary']}" if card["summary"] else ""
            lines.append(f"- [{status} / {card['category']}] {card['title']}{summary}")
    else:
        lines.append("- 暂无可导出的已确认状态卡。")

    lines.extend(["", "## 对话记录", ""])
    if messages:
        for message in messages:
            timestamp = f"[{message['timestamp']}] " if message["timestamp"] else ""
            lines.append(f"- {timestamp}{message['speaker']}：{message['content']}")
    else:
        lines.append("- 暂无可见对话。")
    lines.append("")
    return "\n".join(lines)


def _text(value: Any, *, max_length: int = 600) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else "")).strip()
    return text[:max_length]
