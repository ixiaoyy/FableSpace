from __future__ import annotations

import json
import uuid
from copy import deepcopy
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException

_ALLOWED_EVENT_TYPES = {"observe", "dwell", "mark", "repair"}
_ALLOWED_TARGET_TYPES = {"poi", "zone", "route", "home", "world", "landmark"}
_ALLOWED_VISIBILITY = {"private", "local_public", "global"}
_ALLOWED_MARK_TAGS = {"safe", "uncanny", "warm_corner", "return_again", "rain_friendly"}
_ALLOWED_ACTION_STATES = {"idle", "moving", "observing", "interacting", "collecting", "listening", "tracing", "returning_home"}
_CHAT_HISTORY_MAX = 50
_DEFAULT_PLAYER_STATE = {
    "action_state": "idle",
    "clarity": 0,
    "tension": 0,
    "attunement": 0,
    "zone_familiarity": {},
    "poi_familiarity": {},
    "route_familiarity": {},
}


@dataclass(frozen=True)
class WritebackStoragePaths:
    root: Path
    state_file: Path


class WritebackStore:
    def __init__(self, root: Path):
        resolved_root = root.resolve()
        self.paths = WritebackStoragePaths(
            root=resolved_root,
            state_file=resolved_root / "writeback-state.json",
        )
        self.paths.root.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict[str, Any]:
        if not self.paths.state_file.exists():
            return _default_store_state()
        try:
            return json.loads(self.paths.state_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail="writeback state file is invalid JSON") from exc

    def save(self, state: dict[str, Any]) -> None:
        self.paths.state_file.write_text(
            json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    def get_taverns(self) -> dict[str, dict[str, Any]]:
        """Get all managed taverns."""
        state = self.load()
        return state.get("taverns", {})

    def get_chat_history(
        self,
        player_id: str,
        poi_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Load chat messages for a player + POI (optionally filtered by character)."""
        state = self.load()
        messages: list[dict[str, Any]] = state.get("chat_messages", [])
        filtered = [
            m for m in messages
            if m.get("player_id") == player_id
            and m.get("poi_id") == poi_id
            and (character_id is None or m.get("character_id") == character_id)
        ]
        # Return newest last, trim to limit
        return filtered[-limit:]

    def add_chat_message(
        self,
        player_id: str,
        poi_id: str,
        character_id: str,
        role: str,
        content: str,
        timestamp: str,
    ) -> dict[str, Any]:
        """Append a chat message and persist to disk."""
        msg = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "player_id": player_id,
            "poi_id": poi_id,
            "character_id": character_id,
            "role": role,
            "content": content,
            "timestamp": timestamp,
        }
        state = self.load()
        messages: list[dict[str, Any]] = state.setdefault("chat_messages", [])
        messages.append(msg)
        # Keep last _CHAT_HISTORY_MAX messages total
        if len(messages) > _CHAT_HISTORY_MAX:
            del messages[:-_CHAT_HISTORY_MAX]
        self.save(state)
        return msg


class WritebackEngine:
    def __init__(self, store: WritebackStore):
        self.store = store

    def process_event(self, event: dict[str, Any]) -> dict[str, Any]:
        normalized = _normalize_event(event)
        store_state = self.store.load()

        player_id = normalized["player_id"]
        slice_id = normalized["target"]["slice_id"]
        target_type = normalized["target"]["target_type"]
        target_id = normalized["target"]["target_id"]
        event_type = normalized["event_type"]

        players = store_state.setdefault("players", {})
        player_bucket = players.setdefault(player_id, _default_player_bucket())
        player_state = player_bucket.setdefault("state", deepcopy(_DEFAULT_PLAYER_STATE))

        slices = store_state.setdefault("slices", {})
        slice_bucket = slices.setdefault(slice_id, _default_slice_bucket())
        slice_bucket.setdefault("slice_id", slice_id)
        slice_bucket.setdefault("familiarity", {})
        slice_bucket.setdefault("marks", [])
        slice_bucket.setdefault("recent_echoes", [])
        targets = slice_bucket.setdefault("targets", {})
        target_bucket = targets.setdefault(target_id, _default_target_bucket(target_type=target_type))
        target_bucket["target_type"] = target_type
        target_bucket.setdefault("familiarity", 0)
        target_bucket.setdefault("mark_count", 0)
        target_bucket.setdefault("last_event_type", None)
        target_bucket.setdefault("last_event_at", None)

        result = _apply_event(
            normalized,
            player_state=player_state,
            player_bucket=player_bucket,
            slice_bucket=slice_bucket,
            target_bucket=target_bucket,
        )

        events = store_state.setdefault("events", [])
        events.append(result["event_record"])
        if len(events) > 100:
            del events[:-100]

        player_events = player_bucket.setdefault("recent_events", [])
        player_events.append(result["event_record"])
        if len(player_events) > 20:
            del player_events[:-20]

        self.store.save(store_state)
        return {
            "ok": True,
            "event": result["event_record"],
            "player_state": deepcopy(player_state),
            "place_state": result["place_state"],
            "world_feedback": result["world_feedback"],
            "persistence": {
                "storage": "json-file",
                "state_file": str(self.store.paths.state_file),
                "player_id": player_id,
                "slice_id": slice_id,
                "stored_event_count": len(events),
            },
        }

    # ─── Chat history methods ──────────────────────────────────────────────────

    def get_chat_history(
        self,
        player_id: str,
        poi_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Get chat history for a player + POI (optionally filtered by character)."""
        return self.store.get_chat_history(player_id, poi_id, character_id, limit)

    def add_chat_message(
        self,
        player_id: str,
        poi_id: str,
        character_id: str,
        role: str,
        content: str,
        timestamp: str | None = None,
    ) -> dict[str, Any]:
        """Add a chat message to history."""
        if timestamp is None:
            timestamp = _utc_now_iso()
        return self.store.add_chat_message(player_id, poi_id, character_id, role, content, timestamp)


def _normalize_event(event: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="event payload must be a JSON object")

    event_type = str(event.get("event_type") or "").strip().lower()
    if event_type not in _ALLOWED_EVENT_TYPES:
        raise HTTPException(status_code=400, detail="event_type must be one of observe, dwell, mark, repair")

    player_id = str(event.get("player_id") or "player_local").strip()
    if not player_id:
        raise HTTPException(status_code=400, detail="player_id must be a non-empty string")

    visibility = str(event.get("visibility") or "private").strip().lower()
    if visibility not in _ALLOWED_VISIBILITY:
        raise HTTPException(status_code=400, detail="visibility must be one of private, local_public, global")

    target = event.get("target")
    if not isinstance(target, dict):
        raise HTTPException(status_code=400, detail="target must be an object")

    target_type = str(target.get("target_type") or "").strip().lower()
    if target_type not in _ALLOWED_TARGET_TYPES:
        raise HTTPException(status_code=400, detail="target.target_type must be one of poi, zone, route, home, world")

    target_id = str(target.get("target_id") or "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="target.target_id must be a non-empty string")

    slice_id = str(target.get("slice_id") or "").strip()
    if not slice_id:
        raise HTTPException(status_code=400, detail="target.slice_id must be a non-empty string")

    payload = event.get("payload")
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be an object")

    source = event.get("source")
    if source is None:
        source = {"client": "web", "surface": "writeback_panel", "version": "v0.1"}
    if not isinstance(source, dict):
        raise HTTPException(status_code=400, detail="source must be an object")

    context = event.get("context")
    if context is None:
        context = {}
    if not isinstance(context, dict):
        raise HTTPException(status_code=400, detail="context must be an object")

    timestamp = event.get("timestamp") or _utc_now_iso()

    normalized = {
        "event_id": str(event.get("event_id") or f"evt_{uuid.uuid4().hex[:12]}"),
        "event_type": event_type,
        "player_id": player_id,
        "timestamp": str(timestamp),
        "target": {
            "target_type": target_type,
            "target_id": target_id,
            "slice_id": slice_id,
            "coordinates": target.get("coordinates"),
        },
        "payload": payload,
        "visibility": visibility,
        "source": source,
        "context": context,
    }

    _validate_event_semantics(normalized)
    return normalized


def _validate_event_semantics(event: dict[str, Any]) -> None:
    event_type = event["event_type"]
    payload = event["payload"]

    if event_type == "observe":
        intensity = payload.get("intensity", 1)
        try:
            intensity_value = int(intensity)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="observe payload.intensity must be an integer") from exc
        if intensity_value < 1 or intensity_value > 3:
            raise HTTPException(status_code=400, detail="observe payload.intensity must be between 1 and 3")

    if event_type == "mark":
        tag = str(payload.get("tag") or "").strip().lower()
        if tag not in _ALLOWED_MARK_TAGS:
            raise HTTPException(
                status_code=400,
                detail="mark payload.tag must be one of safe, uncanny, warm_corner, return_again, rain_friendly",
            )


def _apply_event(
    event: dict[str, Any],
    *,
    player_state: dict[str, Any],
    player_bucket: dict[str, Any],
    slice_bucket: dict[str, Any],
    target_bucket: dict[str, Any],
) -> dict[str, Any]:
    event_type = event["event_type"]
    player_id = event["player_id"]
    target = event["target"]
    payload = event["payload"]
    context = event["context"]
    visibility = event["visibility"]
    target_type = target["target_type"]
    target_id = target["target_id"]
    slice_id = target["slice_id"]

    player_effects: dict[str, Any] = {}
    place_effects: dict[str, Any] = {}
    world_effects: dict[str, Any] = {}
    echo_entries: list[dict[str, Any]] = []
    broadcast_hints: list[str] = []
    revealed_fields: list[str] = []
    ui_state_changes: dict[str, Any] = {}

    _ensure_player_state_defaults(player_state)

    if event_type == "observe":
        intensity = int(payload.get("intensity", 1))
        player_state["action_state"] = "observing"
        player_state["attunement"] += intensity
        _increment_nested_counter(player_state, "poi_familiarity", target_id, 1)
        _increment_target_familiarity(target_bucket, 1)
        note = {
            "entry_type": "observation",
            "target_id": target_id,
            "target_type": target_type,
            "text": f"你观察了 {target_id}，世界的纹理稍微清晰了一层。",
            "visibility": visibility,
            "timestamp": event["timestamp"],
        }
        slice_bucket["recent_echoes"].append(note)
        _trim_list(slice_bucket["recent_echoes"], 20)
        echo_entries.append(note)
        broadcast_hints.append(f"{target_id} 留下了一次新的观察痕迹。")
        revealed_fields.extend(["attunement", f"poi_familiarity.{target_id}"])
        ui_state_changes["action_state"] = "observing"
        player_effects = {
            "action_state": "observing",
            "attunement_delta": intensity,
            "poi_familiarity_delta": {target_id: 1},
        }
        place_effects = {
            "target_familiarity_delta": 1,
            "recent_echo_added": True,
        }
    elif event_type == "dwell":
        zone_id = str(context.get("current_zone_id") or payload.get("zone_id") or target_id)
        player_state["action_state"] = "idle"
        player_state["clarity"] += 1
        player_state["tension"] = max(0, int(player_state["tension"]) - 1)
        _increment_nested_counter(player_state, "zone_familiarity", zone_id, 1)
        _increment_target_familiarity(target_bucket, 1)
        note = {
            "entry_type": "local_echo",
            "target_id": target_id,
            "target_type": target_type,
            "text": f"你在 {zone_id} 停留片刻，这片区域开始记住你的步频。",
            "visibility": visibility,
            "timestamp": event["timestamp"],
        }
        slice_bucket["recent_echoes"].append(note)
        _trim_list(slice_bucket["recent_echoes"], 20)
        echo_entries.append(note)
        broadcast_hints.append(f"{zone_id} 的空气稍微安静了一些。")
        revealed_fields.extend(["clarity", "tension", f"zone_familiarity.{zone_id}"])
        ui_state_changes["action_state"] = "idle"
        player_effects = {
            "action_state": "idle",
            "clarity_delta": 1,
            "tension_delta": -1,
            "zone_familiarity_delta": {zone_id: 1},
        }
        place_effects = {
            "target_familiarity_delta": 1,
            "local_echo_added": True,
        }
    elif event_type == "mark":
        tag = str(payload.get("tag") or "").strip().lower()
        note = str(payload.get("note") or "").strip()
        player_state["action_state"] = "interacting"
        mark_record = {
            "event_id": event["event_id"],
            "target_id": target_id,
            "target_type": target_type,
            "slice_id": slice_id,
            "tag": tag,
            "note": note,
            "visibility": visibility,
            "timestamp": event["timestamp"],
        }
        slice_bucket["marks"].append(mark_record)
        _trim_list(slice_bucket["marks"], 30)
        target_bucket["mark_count"] = int(target_bucket.get("mark_count", 0)) + 1
        broadcast_hints.append(f"{target_id} 收到了一枚新的私人标记：{tag}。")
        revealed_fields.append("place_marks")
        ui_state_changes["action_state"] = "interacting"
        player_effects = {
            "action_state": "interacting",
        }
        place_effects = {
            "place_mark_added": True,
            "tag": tag,
            "visibility": visibility,
        }
        world_effects = {
            "mark_catalog_updated": True,
        }
        place_legend = _build_place_legend(target_id, slice_bucket.get("marks", []))
        if place_legend:
            target_bucket["place_legend"] = place_legend

    elif event_type == "repair":
        note = str(payload.get("note") or "").strip()
        repair_count = int(target_bucket.get("repair_count", 0)) + 1
        target_bucket["repair_count"] = repair_count
        contributions = target_bucket.setdefault("player_contributions", {})
        contributions[player_id] = int(contributions.get(player_id, 0)) + 1
        broadcast_hints.append(f"{target_id} 收到了一次修复贡献，当前总修复次数：{repair_count}。")
        revealed_fields.append("repair_count")
        ui_state_changes["action_state"] = "interacting"
        player_effects = {"action_state": "interacting", "clarity_delta": 1}
        place_effects = {"repair_contributed": True, "repair_count": repair_count}
        world_effects = {"honor_board_updated": True}
        if repair_count >= 2:
            sorted_contributors = sorted(contributions.items(), key=lambda x: -x[1])
            target_bucket["honor_board"] = [
                {"player_id": pid, "contributions": cnt} for pid, cnt in sorted_contributors
            ]

    target_bucket["last_event_type"] = event_type
    target_bucket["last_event_at"] = event["timestamp"]

    slice_bucket["familiarity"][target_id] = int(target_bucket.get("familiarity", 0))
    slice_bucket["last_updated_at"] = event["timestamp"]
    player_bucket["last_active_at"] = event["timestamp"]

    event_record = {
        "event_id": event["event_id"],
        "event_type": event_type,
        "player_id": event["player_id"],
        "timestamp": event["timestamp"],
        "target": deepcopy(target),
        "payload": deepcopy(payload),
        "visibility": visibility,
        "source": deepcopy(event["source"]),
        "context": deepcopy(context),
    }

    place_state = {
        "slice_id": slice_id,
        "target_id": target_id,
        "target_type": target_type,
        "familiarity": int(target_bucket.get("familiarity", 0)),
        "mark_count": int(target_bucket.get("mark_count", 0)),
        "recent_echoes": deepcopy(slice_bucket.get("recent_echoes", [])[-3:]),
        "marks": deepcopy([item for item in slice_bucket.get("marks", []) if item.get("target_id") == target_id][-5:]),
        "last_event_type": target_bucket.get("last_event_type"),
        "last_event_at": target_bucket.get("last_event_at"),
        "place_legend": deepcopy(target_bucket.get("place_legend")),
        "repair_count": int(target_bucket.get("repair_count", 0)),
        "honor_board": deepcopy(target_bucket.get("honor_board", [])),
    }

    world_feedback = {
        "summary": _build_feedback_summary(event_type=event_type, target_id=target_id),
        "broadcast_hints": broadcast_hints,
        "echo_entries": echo_entries,
        "revealed_fields": revealed_fields,
        "ui_state_changes": ui_state_changes,
        "home_updates": [],
        "effects": {
            "player_effects": player_effects,
            "place_effects": place_effects,
            "world_effects": world_effects,
        },
    }

    return {
        "event_record": event_record,
        "place_state": place_state,
        "world_feedback": world_feedback,
    }


def _default_store_state() -> dict[str, Any]:
    return {
        "players": {},
        "slices": {},
        "events": [],
        "taverns": {},
    }


def _default_player_bucket() -> dict[str, Any]:
    return {
        "state": deepcopy(_DEFAULT_PLAYER_STATE),
        "recent_events": [],
        "last_active_at": None,
    }


def _default_slice_bucket() -> dict[str, Any]:
    return {
        "slice_id": None,
        "familiarity": {},
        "marks": [],
        "recent_echoes": [],
        "targets": {},
        "last_updated_at": None,
    }


def _default_target_bucket(*, target_type: str) -> dict[str, Any]:
    return {
        "target_type": target_type,
        "familiarity": 0,
        "mark_count": 0,
        "last_event_type": None,
        "last_event_at": None,
    }


def _ensure_player_state_defaults(player_state: dict[str, Any]) -> None:
    for key, value in _DEFAULT_PLAYER_STATE.items():
        if key not in player_state:
            player_state[key] = deepcopy(value)
    action_state = str(player_state.get("action_state") or "idle")
    if action_state not in _ALLOWED_ACTION_STATES:
        player_state["action_state"] = "idle"
    for key in ("clarity", "tension", "attunement"):
        try:
            player_state[key] = int(player_state.get(key, 0))
        except (TypeError, ValueError):
            player_state[key] = 0
    for key in ("zone_familiarity", "poi_familiarity", "route_familiarity"):
        if not isinstance(player_state.get(key), dict):
            player_state[key] = {}


def _increment_nested_counter(player_state: dict[str, Any], bucket: str, target_id: str, amount: int) -> None:
    values = player_state.setdefault(bucket, {})
    values[target_id] = int(values.get(target_id, 0)) + amount


def _increment_target_familiarity(target_bucket: dict[str, Any], amount: int) -> None:
    target_bucket["familiarity"] = int(target_bucket.get("familiarity", 0)) + amount


def _trim_list(values: list[Any], max_items: int) -> None:
    if len(values) > max_items:
        del values[:-max_items]


def _build_feedback_summary(*, event_type: str, target_id: str) -> str:
    if event_type == "observe":
        return f"你观察了 {target_id}，一层新的语义被记录下来。"
    if event_type == "dwell":
        return f"你在 {target_id} 驻足，区域熟悉度与清明度发生了轻微变化。"
    return f"你为 {target_id} 留下了一枚私人标记。"


_TAG_VIBE_LABELS: dict[str, str] = {
    "safe": "安全感",
    "uncanny": "诡异气息",
    "warm_corner": "温暖角落",
    "return_again": "值得回访",
    "rain_friendly": "雨天友好",
}

_LEGEND_THRESHOLDS = (3, 5, 10)


def _build_place_legend(target_id: str, marks: list[dict[str, Any]]) -> dict[str, Any] | None:
    poi_marks = [m for m in marks if m.get("target_id") == target_id]
    if len(poi_marks) < _LEGEND_THRESHOLDS[0]:
        return None
    tag_counts: dict[str, int] = {}
    for m in poi_marks:
        tag = m.get("tag", "")
        if tag:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    if not tag_counts:
        return None
    dominant_tag = max(tag_counts, key=lambda t: tag_counts[t])
    dominant_vibe = _TAG_VIBE_LABELS.get(dominant_tag, dominant_tag)
    total = len(poi_marks)
    tier = "碎片" if total < _LEGEND_THRESHOLDS[1] else "传说" if total < _LEGEND_THRESHOLDS[2] else "史诗"
    vibe_summary = "、".join(
        f"{_TAG_VIBE_LABELS.get(t, t)}×{c}" for t, c in sorted(tag_counts.items(), key=lambda x: -x[1])
    )
    narrative = f"来往于此处的人们留下了 {total} 枚印记，这里散发着{dominant_vibe}的气息。"
    return {
        "target_id": target_id,
        "tier": tier,
        "dominant_vibe": dominant_vibe,
        "tag_counts": tag_counts,
        "vibe_summary": vibe_summary,
        "narrative": narrative,
        "mark_count": total,
    }


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
