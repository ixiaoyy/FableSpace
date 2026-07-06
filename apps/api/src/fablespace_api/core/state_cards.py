from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


STATE_CARD_CATEGORIES = {"character", "task", "resource", "conflict", "event_log"}
STATE_CARD_STATUSES = {"pending", "confirmed", "rejected", "superseded"}
STATE_CARD_SCOPES = {"visitor", "tavern"}
STATE_CARD_SOURCES = {"chat", "group_chat", "gameplay", "manual", "system"}


def _now_utc_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _choice(value: Any, allowed: set[str], default: str) -> str:
    candidate = str(value or "").strip()
    return candidate if candidate in allowed else default


def _text(value: Any, *, default: str = "", max_length: int = 600) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else default)).strip()
    return text[:max_length]


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _metadata(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


@dataclass
class StateCard:
    """A pending or confirmed continuity card for tavern canon review."""

    id: str = ""
    space_id: str = ""
    category: str = "event_log"
    status: str = "pending"
    canon_scope: str = "visitor"
    title: str = ""
    summary: str = ""
    visitor_id: str = ""
    character_id: str = ""
    source: str = "chat"
    source_message_ids: list[str] = field(default_factory=list)
    proposed_by: str = ""
    confirmed_by: str = ""
    created_at: str = ""
    updated_at: str = ""
    fixed_canon: bool = False
    entity_id: str = ""  # For grouping related cards
    supersedes_id: str = ""  # ID of the card this one replaces
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "space_id": self.space_id,
            "category": self.category,
            "status": self.status,
            "canon_scope": self.canon_scope,
            "title": self.title,
            "summary": self.summary,
            "visitor_id": self.visitor_id,
            "character_id": self.character_id,
            "source": self.source,
            "source_message_ids": list(self.source_message_ids),
            "proposed_by": self.proposed_by,
            "confirmed_by": self.confirmed_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "fixed_canon": bool(self.fixed_canon),
            "entity_id": self.entity_id,
            "supersedes_id": self.supersedes_id,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StateCard":
        return cls(
            id=_text(data.get("id"), max_length=120),
            space_id=_text(data.get("space_id"), max_length=120),
            category=_choice(data.get("category"), STATE_CARD_CATEGORIES, "event_log"),
            status=_choice(data.get("status"), STATE_CARD_STATUSES, "pending"),
            canon_scope=_choice(data.get("canon_scope"), STATE_CARD_SCOPES, "visitor"),
            title=_text(data.get("title"), default="待确认连续性变化", max_length=80),
            summary=_text(data.get("summary"), max_length=600),
            visitor_id=_text(data.get("visitor_id"), max_length=120),
            character_id=_text(data.get("character_id"), max_length=120),
            source=_choice(data.get("source"), STATE_CARD_SOURCES, "chat"),
            source_message_ids=_string_list(data.get("source_message_ids")),
            proposed_by=_text(data.get("proposed_by"), max_length=120),
            confirmed_by=_text(data.get("confirmed_by"), max_length=120),
            created_at=_text(data.get("created_at"), max_length=80),
            updated_at=_text(data.get("updated_at"), max_length=80),
            fixed_canon=bool(data.get("fixed_canon", False)),
            entity_id=_text(data.get("entity_id"), max_length=120),
            supersedes_id=_text(data.get("supersedes_id"), max_length=120),
            metadata=_metadata(data.get("metadata")),
        )


def state_card_from_payload(
    payload: dict[str, Any],
    *,
    space_id: str,
    user_id: str,
    now: str | None = None,
    existing: StateCard | None = None,
) -> StateCard:
    base = existing.to_dict() if existing else {}
    data = {**base, **(payload or {})}
    timestamp = now or _now_utc_iso()
    data.setdefault("id", f"card_{uuid.uuid4().hex[:12]}")
    data["space_id"] = space_id
    data.setdefault("created_at", timestamp)
    data["updated_at"] = timestamp
    data.setdefault("proposed_by", user_id)
    card = StateCard.from_dict(data)
    if not card.id:
        card.id = f"card_{uuid.uuid4().hex[:12]}"
    if not card.title:
        card.title = _default_title(card.category)
    if not card.summary:
        raise ValueError("状态卡摘要不能为空")
    return card


def state_card_matches_filters(
    card: StateCard,
    *,
    status: str = "",
    category: str = "",
    canon_scope: str = "",
    visitor_id: str = "",
    character_id: str = "",
) -> bool:
    if status and card.status != status:
        return False
    if category and card.category != category:
        return False
    if canon_scope and card.canon_scope != canon_scope:
        return False
    if visitor_id and card.visitor_id != visitor_id:
        return False
    if character_id and card.character_id != character_id:
        return False
    return True


def extract_state_card_candidates_from_turn(
    *,
    space_id: str,
    visitor_id: str,
    character_id: str = "",
    user_message: str = "",
    assistant_message: str = "",
    source_message_ids: list[str] | None = None,
    proposed_by: str = "",
    source: str = "chat",
    now: str | None = None,
) -> list[StateCard]:
    """Extract pending continuity candidates from observable chat text.

    This is deliberately conservative and rule-based. It records only a short
    observable summary; it never treats a model response as confirmed canon and
    never mutates owner-authored tavern fields.
    """

    combined = _text(f"{user_message}\n{assistant_message}", max_length=1200)
    if not combined:
        return []

    timestamp = now or _now_utc_iso()
    source_ids = _string_list(source_message_ids)
    cards: list[StateCard] = []

    for category, markers in (
        ("task", _TASK_MARKERS),
        ("resource", _RESOURCE_MARKERS),
        ("conflict", _CONFLICT_MARKERS),
    ):
        if _contains_marker(combined, markers):
            cards.append(
                _candidate_card(
                    space_id=space_id,
                    visitor_id=visitor_id,
                    character_id=character_id,
                    category=category,
                    text=combined,
                    source_message_ids=source_ids,
                    proposed_by=proposed_by or visitor_id,
                    source=source,
                    now=timestamp,
                )
            )

    if cards or _contains_marker(combined, _EVENT_MARKERS):
        cards.append(
            _candidate_card(
                space_id=space_id,
                visitor_id=visitor_id,
                character_id=character_id,
                category="event_log",
                text=combined,
                source_message_ids=source_ids,
                proposed_by=proposed_by or visitor_id,
                source=source,
                now=timestamp,
            )
        )

    return cards[:4]


_TASK_MARKERS = {
    "任务", "委托", "目标", "待办", "回访", "调查", "线索", "quest", "task", "todo", "promise",
    "承诺", "答应", "下次", "完成", "接下",
}
_RESOURCE_MARKERS = {
    "资源", "物品", "道具", "钥匙", "照片", "合照", "纪念品", "线索", "茶", "票据", "地图",
    "拿到", "获得", "找到", "保存", "resource", "item", "clue", "key",
}
_CONFLICT_MARKERS = {
    "冲突", "风险", "阻碍", "敌人", "强敌", "债务", "竞争者", "麻烦", "威胁", "机会",
    "conflict", "risk", "rival", "debt", "danger",
}
_EVENT_MARKERS = {
    "发生", "今晚", "今天", "昨天", "刚才", "记录", "变化", "event", "happened", "tonight",
}
_CONTRADICTION_MARKERS = {"之前", "已经", "仍然", "继续", "那把", "那个", "原来", "again", "already", "still"}


def _contains_marker(text: str, markers: set[str]) -> bool:
    lowered = text.lower()
    return any(marker.lower() in lowered for marker in markers)


def _default_title(category: str) -> str:
    return {
        "character": "待确认角色事实",
        "task": "待确认任务变化",
        "resource": "待确认资源/线索",
        "conflict": "待确认冲突/机会",
        "event_log": "本轮事件摘要",
    }.get(category, "待确认连续性变化")


def _candidate_card(
    *,
    space_id: str,
    visitor_id: str,
    character_id: str,
    category: str,
    text: str,
    source_message_ids: list[str],
    proposed_by: str,
    source: str,
    now: str,
) -> StateCard:
    summary = _summary_for_category(category, text)
    metadata = {
        "contradiction_candidate": _contains_marker(text, _CONTRADICTION_MARKERS) and category != "event_log",
        "extraction": "rule_based_v1",
        "requires_confirmation": True,
    }
    return StateCard(
        id=f"card_{uuid.uuid4().hex[:12]}",
        space_id=space_id,
        category=category,
        status="pending",
        canon_scope="visitor",
        title=_default_title(category),
        summary=summary,
        visitor_id=visitor_id,
        character_id=character_id,
        source=source,
        source_message_ids=list(source_message_ids),
        proposed_by=proposed_by,
        confirmed_by="",
        created_at=now,
        updated_at=now,
        fixed_canon=False,
        metadata=metadata,
    )


def _summary_for_category(category: str, text: str) -> str:
    prefix = {
        "task": "任务/委托候选：",
        "resource": "资源/线索候选：",
        "conflict": "冲突/机会候选：",
        "event_log": "本轮可观察事件：",
    }.get(category, "连续性候选：")
    return _text(f"{prefix}{text}", max_length=600)


_CATEGORY_LABELS = {
    "character": "角色",
    "task": "任务",
    "resource": "资源/线索",
    "conflict": "冲突/机会",
    "event_log": "事件",
}


def format_state_cards_for_prompt(cards: list[StateCard]) -> str:
    """Format confirmed + fixed_canon state cards as a readable system prompt section."""
    if not cards:
        return ""
    prompt_cards = [
        card
        for card in cards
        if getattr(card, "status", "") == "confirmed" and bool(getattr(card, "fixed_canon", False))
    ]
    if not prompt_cards:
        return ""
    category_order = ["character", "task", "resource", "conflict", "event_log"]
    lines = []
    for card in sorted(prompt_cards, key=lambda c: (category_order.index(c.category) if c.category in category_order else 99, c.created_at)):
        cat_label = _CATEGORY_LABELS.get(card.category, card.category)
        scope_mark = "[正史] " if card.fixed_canon else "[空间] "
        lines.append(f"- {scope_mark}**{card.title}**（{cat_label}）：{card.summary}")
    header = "## 剧情正史（已确认）\n"
    footer = f"\n---\n已确认剧情卡共 {len(prompt_cards)} 张。如有矛盾，以正史为准。"
    return header + "\n".join(lines) + footer
