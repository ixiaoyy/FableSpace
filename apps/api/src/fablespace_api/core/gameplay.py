from __future__ import annotations

import hashlib
import json
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable


GAMEPLAY_DEFINITION_STATUSES = {"draft", "published", "disabled"}
GAMEPLAY_SESSION_STATES = {"started", "in_progress", "completed", "abandoned"}
GAMEPLAY_ACTIONS = {"stay", "move", "complete"}


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _text(value: Any, *, default: str = "", max_length: int = 500) -> str:
    if value is None:
        return default
    normalized = " ".join(str(value).replace("\r\n", "\n").split())
    if not normalized:
        return default
    return normalized[:max_length]


def _string_list(value: Any, *, max_items: int = 12, max_length: int = 80) -> list[str]:
    if isinstance(value, str):
        raw_items = value.replace("，", ",").replace("；", ",").replace(";", ",").split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []

    result: list[str] = []
    for item in raw_items:
        text = _text(item, max_length=max_length)
        if text and text not in result:
            result.append(text)
        if len(result) >= max_items:
            break
    return result


def _normalize_owner_brief(value: Any) -> dict[str, Any]:
    source = value if isinstance(value, dict) else {}
    return {
        "goal": _text(source.get("goal"), max_length=300),
        "tone": _text(source.get("tone"), max_length=160),
        "materials": _string_list(source.get("materials"), max_items=16, max_length=60),
        "forbidden": _string_list(source.get("forbidden"), max_items=16, max_length=80),
    }


def _default_fallback_event(goal: str = "") -> dict[str, str]:
    hint = goal or "当前玩法目标"
    return {
        "id": "fallback-next",
        "text": f"主持人根据“{hint}”给出一个安全、老少皆宜的下一步。",
        "next_node_id": "progress",
    }


def _normalize_choice(value: Any, index: int) -> dict[str, Any]:
    source = value if isinstance(value, dict) else {}
    return {
        "id": _text(source.get("id"), default=f"choice-{index + 1}", max_length=48),
        "label": _text(source.get("label"), default=f"选项 {index + 1}", max_length=80),
        "next_node_id": _text(source.get("next_node_id"), max_length=80),
        "completes": bool(source.get("completes", False)),
    }


def _normalize_fallback_event(value: Any, index: int, *, next_node_id: str = "") -> dict[str, Any]:
    source = value if isinstance(value, dict) else {}
    return {
        "id": _text(source.get("id"), default=f"fallback-{index + 1}", max_length=48),
        "text": _text(source.get("text"), default="主持人给出一个安全的随机推进事件。", max_length=300),
        "next_node_id": _text(source.get("next_node_id"), default=next_node_id, max_length=80),
    }


def _normalize_node(value: Any, index: int, *, goal: str = "") -> dict[str, Any]:
    source = value if isinstance(value, dict) else {}
    node_id = _text(source.get("id"), default=f"node-{index + 1}", max_length=80)
    choices = [
        _normalize_choice(choice, choice_index)
        for choice_index, choice in enumerate(source.get("choices", []) if isinstance(source.get("choices"), list) else [])
    ]
    fallback_events = [
        _normalize_fallback_event(event, event_index, next_node_id=node_id)
        for event_index, event in enumerate(
            source.get("fallback_events", []) if isinstance(source.get("fallback_events"), list) else []
        )
    ]
    if not fallback_events:
        fallback_events = [
            _normalize_fallback_event(
                {
                    "id": "fallback-next",
                    "text": f"主持人根据“{goal or '当前玩法目标'}”给出一个安全、老少皆宜的下一步。",
                    "next_node_id": node_id,
                },
                0,
                next_node_id=node_id,
            )
        ]

    return {
        "id": node_id,
        "kind": _text(source.get("kind"), default="scene", max_length=40),
        "narration": _text(source.get("narration"), default="玩法开始，请选择下一步。", max_length=1200),
        "choices": choices,
        "fallback_events": fallback_events,
    }


def _default_nodes(title: str, owner_brief: dict[str, Any]) -> list[dict[str, Any]]:
    goal = owner_brief.get("goal") or title or "完成本局玩法"
    return [
        {
            "id": "start",
            "kind": "scene",
            "narration": f"玩法《{title}》开始。主持人先确认目标：{goal}",
            "choices": [{"id": "begin", "label": "开始第一步", "next_node_id": "progress"}],
            "fallback_events": [
                {"id": "opening-hint", "text": "主持人先给出一个安全、清楚的第一步。", "next_node_id": "progress"}
            ],
        },
        {
            "id": "progress",
            "kind": "scene",
            "narration": "玩法正在推进。你可以选择继续、补充细节，或让主持人给出随机事件。",
            "choices": [{"id": "finish", "label": "完成这局", "next_node_id": "complete", "completes": True}],
            "fallback_events": [
                {"id": "progress-hint", "text": "主持人抽到一个低风险的小事件，请你用一句话回应。", "next_node_id": "progress"}
            ],
        },
        {
            "id": "complete",
            "kind": "complete",
            "narration": "这局玩法完成了。主持人给出简短结算和文字奖励。",
            "choices": [],
            "fallback_events": [
                {"id": "complete-note", "text": "主持人把本局结果整理成一句结算。", "next_node_id": "complete"}
            ],
        },
    ]


def _validate_node_links(nodes: list[dict[str, Any]]) -> None:
    node_ids = {node["id"] for node in nodes}
    for node in nodes:
        for choice in node.get("choices", []):
            target = choice.get("next_node_id")
            if target and target not in node_ids:
                raise ValueError(f"玩法选项指向不存在的节点: {target}")
        for event in node.get("fallback_events", []):
            target = event.get("next_node_id")
            if target and target not in node_ids:
                raise ValueError(f"玩法随机事件指向不存在的节点: {target}")


def normalize_gameplay_definition(value: Any) -> dict[str, Any]:
    source = value if isinstance(value, dict) else {}
    title = _text(source.get("title"), default="未命名玩法", max_length=48)
    owner_brief = _normalize_owner_brief(source.get("owner_brief"))
    raw_status = _text(source.get("status"), default="draft", max_length=32)
    status = raw_status if raw_status in GAMEPLAY_DEFINITION_STATUSES else "draft"

    raw_nodes = source.get("nodes") if isinstance(source.get("nodes"), list) else []
    nodes = (
        [_normalize_node(node, index, goal=owner_brief.get("goal", "")) for index, node in enumerate(raw_nodes)]
        if raw_nodes
        else deepcopy(_default_nodes(title, owner_brief))
    )
    _validate_node_links(nodes)

    node_ids = {node["id"] for node in nodes}
    completion_source = source.get("completion") if isinstance(source.get("completion"), dict) else {}
    complete_node_ids = _string_list(completion_source.get("complete_node_ids"), max_items=20, max_length=80)
    if not complete_node_ids:
        complete_node_ids = [node["id"] for node in nodes if node.get("kind") == "complete"] or [nodes[-1]["id"]]
    complete_node_ids = [node_id for node_id in complete_node_ids if node_id in node_ids] or [nodes[-1]["id"]]
    memory_atom = completion_source.get("memory_atom") if isinstance(completion_source.get("memory_atom"), dict) else {}

    return {
        "id": _text(source.get("id"), default=f"gp_{uuid.uuid4().hex[:12]}", max_length=80),
        "title": title,
        "status": status,
        "summary": _text(source.get("summary"), max_length=180),
        "entry_label": _text(source.get("entry_label"), default="开始玩法", max_length=40),
        "mode": _text(source.get("mode"), default="ai_directed_branch", max_length=60),
        "owner_brief": owner_brief,
        "nodes": nodes,
        "completion": {
            "complete_node_ids": complete_node_ids,
            "reward_text": _text(completion_source.get("reward_text"), default="你完成了这局玩法。", max_length=200),
            "memory_atom": {"enabled": bool(memory_atom.get("enabled", False))},
        },
    }


def normalize_gameplay_definitions(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        normalized = normalize_gameplay_definition(item)
        if normalized["id"] in seen:
            normalized["id"] = f"{normalized['id']}-{len(seen) + 1}"
        seen.add(normalized["id"])
        result.append(normalized)
    return result


def node_by_id(gameplay: dict[str, Any], node_id: str) -> dict[str, Any] | None:
    for node in gameplay.get("nodes", []):
        if node.get("id") == node_id:
            return node
    return None


def scene_for_node(gameplay: dict[str, Any], node_id: str) -> dict[str, Any]:
    node = node_by_id(gameplay, node_id) or (gameplay.get("nodes") or [{}])[0]
    return {
        "node_id": node.get("id", node_id),
        "narration": node.get("narration", ""),
        "choices": [
            {"id": choice.get("id", ""), "label": choice.get("label", "")}
            for choice in node.get("choices", [])
            if choice.get("id")
        ],
    }


@dataclass
class GameplayEvent:
    id: str
    type: str
    timestamp: str
    narration: str = ""
    from_node_id: str = ""
    to_node_id: str = ""
    choice_id: str = ""
    seed: str = ""
    source: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "timestamp": self.timestamp,
            "narration": self.narration,
            "from_node_id": self.from_node_id,
            "to_node_id": self.to_node_id,
            "choice_id": self.choice_id,
            "seed": self.seed,
            "source": self.source,
            "metadata": deepcopy(self.metadata),
        }

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "GameplayEvent":
        return cls(
            id=_text(value.get("id"), default=f"gpe_{uuid.uuid4().hex[:12]}", max_length=80),
            type=_text(value.get("type"), default="event", max_length=80),
            timestamp=_text(value.get("timestamp"), default=_utc_now_iso(), max_length=40),
            narration=_text(value.get("narration"), max_length=1200),
            from_node_id=_text(value.get("from_node_id"), max_length=80),
            to_node_id=_text(value.get("to_node_id"), max_length=80),
            choice_id=_text(value.get("choice_id"), max_length=80),
            seed=_text(value.get("seed"), max_length=120),
            source=_text(value.get("source"), max_length=40),
            metadata=deepcopy(value.get("metadata", {})) if isinstance(value.get("metadata"), dict) else {},
        )


@dataclass
class GameplaySession:
    id: str
    space_id: str
    gameplay_id: str
    visitor_id: str
    character_id: str = ""
    state: str = "in_progress"
    current_node_id: str = "start"
    turn_count: int = 0
    variables: dict[str, Any] = field(default_factory=dict)
    events: list[GameplayEvent] = field(default_factory=list)
    completion: dict[str, Any] | None = None
    created_at: str = field(default_factory=_utc_now_iso)
    updated_at: str = field(default_factory=_utc_now_iso)

    @classmethod
    def new(
        cls,
        *,
        space_id: str,
        gameplay_id: str,
        visitor_id: str,
        character_id: str = "",
        session_id: str | None = None,
        current_node_id: str = "start",
    ) -> "GameplaySession":
        now = _utc_now_iso()
        return cls(
            id=session_id or f"gps_{uuid.uuid4().hex[:12]}",
            space_id=space_id,
            gameplay_id=gameplay_id,
            visitor_id=visitor_id,
            character_id=character_id,
            state="in_progress",
            current_node_id=current_node_id,
            created_at=now,
            updated_at=now,
        )

    def add_event(self, event: GameplayEvent) -> None:
        self.events.append(event)
        self.updated_at = event.timestamp

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "space_id": self.space_id,
            "gameplay_id": self.gameplay_id,
            "visitor_id": self.visitor_id,
            "character_id": self.character_id,
            "state": self.state,
            "current_node_id": self.current_node_id,
            "turn_count": self.turn_count,
            "variables": deepcopy(self.variables),
            "events": [event.to_dict() for event in self.events],
            "completion": deepcopy(self.completion),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "GameplaySession":
        raw_state = _text(value.get("state"), default="in_progress", max_length=32)
        state = raw_state if raw_state in GAMEPLAY_SESSION_STATES else "in_progress"
        return cls(
            id=_text(value.get("id"), default=f"gps_{uuid.uuid4().hex[:12]}", max_length=80),
            space_id=_text(value.get("space_id"), max_length=120),
            gameplay_id=_text(value.get("gameplay_id"), max_length=120),
            visitor_id=_text(value.get("visitor_id"), max_length=120),
            character_id=_text(value.get("character_id"), max_length=120),
            state=state,
            current_node_id=_text(value.get("current_node_id"), default="start", max_length=80),
            turn_count=max(0, int(value.get("turn_count", 0) or 0)),
            variables=deepcopy(value.get("variables", {})) if isinstance(value.get("variables"), dict) else {},
            events=[
                GameplayEvent.from_dict(event)
                for event in value.get("events", [])
                if isinstance(event, dict)
            ],
            completion=deepcopy(value.get("completion")) if isinstance(value.get("completion"), dict) else None,
            created_at=_text(value.get("created_at"), default=_utc_now_iso(), max_length=40),
            updated_at=_text(value.get("updated_at"), default=_utc_now_iso(), max_length=40),
        )


def new_event(
    event_type: str,
    *,
    narration: str = "",
    from_node_id: str = "",
    to_node_id: str = "",
    choice_id: str = "",
    seed: str = "",
    source: str = "",
    metadata: dict[str, Any] | None = None,
) -> GameplayEvent:
    return GameplayEvent(
        id=f"gpe_{uuid.uuid4().hex[:12]}",
        type=event_type,
        timestamp=_utc_now_iso(),
        narration=_text(narration, max_length=1200),
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        choice_id=choice_id,
        seed=seed,
        source=source,
        metadata=deepcopy(metadata or {}),
    )


def choose_fallback_event(gameplay: dict[str, Any], session: GameplaySession) -> dict[str, Any]:
    node = node_by_id(gameplay, session.current_node_id) or {}
    events = node.get("fallback_events") or [_default_fallback_event(gameplay.get("title", ""))]
    seed = f"{session.id}:{session.turn_count}:{session.current_node_id}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(events)
    selected = deepcopy(events[index])
    selected["seed"] = seed
    return selected


def completion_payload(gameplay: dict[str, Any], session: GameplaySession, narration: str = "") -> dict[str, Any]:
    completion = gameplay.get("completion") or {}
    reward_text = _text(completion.get("reward_text"), default="你完成了这局玩法。", max_length=200)
    summary = _text(narration, default=f"完成《{gameplay.get('title', '玩法')}》。", max_length=300)
    return {
        "summary": summary,
        "reward_text": reward_text,
        "completed_at": _utc_now_iso(),
        "turn_count": session.turn_count,
        "memory_atom": deepcopy(completion.get("memory_atom", {"enabled": False})),
    }


def is_complete_node(gameplay: dict[str, Any], node_id: str, *, choice: dict[str, Any] | None = None) -> bool:
    if choice and choice.get("completes"):
        return True
    if node_id in set((gameplay.get("completion") or {}).get("complete_node_ids") or []):
        return True
    node = node_by_id(gameplay, node_id) or {}
    return node.get("kind") == "complete"


def fallback_result(gameplay: dict[str, Any], session: GameplaySession) -> dict[str, Any]:
    event_data = choose_fallback_event(gameplay, session)
    from_node = session.current_node_id
    to_node = event_data.get("next_node_id") or from_node
    event = new_event(
        "random_event",
        narration=event_data.get("text", ""),
        from_node_id=from_node,
        to_node_id=to_node,
        seed=event_data.get("seed", ""),
        source="fallback",
        metadata={"fallback_event_id": event_data.get("id", "")},
    )
    return {
        "source": "fallback",
        "event": event.to_dict(),
        "next_node_id": to_node,
        "completed": is_complete_node(gameplay, to_node),
        "scene": scene_for_node(gameplay, to_node),
    }


class AIDirector:
    def __init__(self, responder: Callable[[dict[str, Any]], str]):
        self.responder = responder

    def advance(
        self,
        gameplay: dict[str, Any],
        session: GameplaySession,
        *,
        message: str = "",
        choice_id: str = "",
    ) -> dict[str, Any]:
        payload = {
            "gameplay": {
                "id": gameplay.get("id"),
                "title": gameplay.get("title"),
                "owner_brief": gameplay.get("owner_brief"),
            },
            "session": session.to_dict(),
            "current_scene": scene_for_node(gameplay, session.current_node_id),
            "message": _text(message, max_length=1000),
            "choice_id": _text(choice_id, max_length=80),
        }
        try:
            parsed = json.loads(self.responder(payload))
        except Exception:
            return fallback_result(gameplay, session)
        if not isinstance(parsed, dict):
            return fallback_result(gameplay, session)

        action = _text(parsed.get("action"), default="stay", max_length=20)
        if action not in GAMEPLAY_ACTIONS:
            return fallback_result(gameplay, session)

        current_node_id = session.current_node_id
        next_node_id = current_node_id if action == "stay" else _text(parsed.get("next_node_id"), max_length=80)
        if action == "complete" and not next_node_id:
            next_node_id = ((gameplay.get("completion") or {}).get("complete_node_ids") or [current_node_id])[0]
        if not node_by_id(gameplay, next_node_id):
            return fallback_result(gameplay, session)

        narration = _text(parsed.get("narration"), max_length=1200)
        completed = bool(parsed.get("completed")) or action == "complete" or is_complete_node(gameplay, next_node_id)
        event = new_event(
            _text(parsed.get("event_type"), default="node_changed" if next_node_id != current_node_id else "ai_director", max_length=80),
            narration=narration,
            from_node_id=current_node_id,
            to_node_id=next_node_id,
            choice_id=choice_id,
            source="ai",
        )
        return {
            "source": "ai",
            "event": event.to_dict(),
            "next_node_id": next_node_id,
            "completed": completed,
            "scene": scene_for_node(gameplay, next_node_id),
        }
