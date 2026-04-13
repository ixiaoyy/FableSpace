from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import HTTPException

from fablemap.api_service import build_health_payload, build_meta_payload, build_nearby_payload
from fablemap.application.web_payloads import build_behavior_insights, build_orchestrate_payload, record_memory_graph_event
from fablemap.nearby import generate_nearby_preview
from fablemap.writeback import WritebackEngine, WritebackStore
from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator
from fablemap.memory_graph import WorldMemoryGraph
from fablemap.dynamic_signals import inject_disturbance, clear_disturbance, get_disturbance

from .config import ApiSettings


class WebService:
    def __init__(self, settings: ApiSettings):
        self.settings = settings.resolved()
        self.settings.output_root.mkdir(parents=True, exist_ok=True)
        self.writeback = WritebackEngine(WritebackStore(self.settings.output_root / "writeback"))
        self.orchestrator = RuleBasedOrchestrator()
        self.memory_graph = WorldMemoryGraph()

    def health_payload(self) -> dict[str, Any]:
        return build_health_payload(
            fixture_file=self.settings.fixture_file,
            frontend_root=self.settings.frontend_root,
            output_root=self.settings.output_root,
        )

    def meta_payload(self, *, base_url: str) -> dict[str, Any]:
        return build_meta_payload(base_url=base_url)

    def nearby_payload(
        self,
        *,
        lat: float,
        lon: float,
        radius: int,
        mode: str,
        seed: str,
        refresh: bool,
        base_url: str,
    ) -> dict[str, Any]:
        if radius <= 0:
            raise HTTPException(status_code=400, detail="radius must be a positive integer")

        normalized_mode = mode.lower()
        if normalized_mode not in {"fixture", "live"}:
            raise HTTPException(status_code=400, detail="mode must be 'fixture' or 'live'")

        source_file = None
        if normalized_mode == "fixture":
            if not self.settings.fixture_file or not self.settings.fixture_file.exists():
                raise HTTPException(status_code=400, detail="fixture mode is unavailable because the fixture file is missing")
            source_file = self.settings.fixture_file

        try:
            run_id = f"run-{uuid.uuid4().hex[:12]}"
            result = generate_nearby_preview(
                lat=lat,
                lon=lon,
                radius=radius,
                output_dir=self.settings.output_root / run_id,
                seed=seed or None,
                source_file=source_file,
                refresh=refresh,
            )
            return build_nearby_payload(
                result=result,
                base_url=base_url,
                mode=normalized_mode,
                run_id=run_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def map_snapshot_payload(self, snapshot_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        normalized_snapshot_id = _sanitize_snapshot_id(snapshot_id)
        if not normalized_snapshot_id:
            raise HTTPException(status_code=400, detail="snapshot id is required")

        frontend_public = self.settings.frontend_public
        if frontend_public is None:
            raise HTTPException(status_code=500, detail="frontend public directory is unavailable")

        tiles = payload.get("tiles") or []
        if not isinstance(tiles, list) or not tiles:
            raise HTTPException(status_code=400, detail="tiles payload is required")

        snapshot_dir = (frontend_public / "map-snapshots" / normalized_snapshot_id).resolve()
        if not _is_within_root(snapshot_dir, frontend_public.resolve()):
            raise HTTPException(status_code=400, detail="invalid snapshot path")
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        stored_tiles: list[dict[str, Any]] = []
        for index, tile in enumerate(tiles):
            if not isinstance(tile, dict):
                continue
            src = str(tile.get("src") or "").strip()
            if not src.startswith(("http://", "https://")):
                continue

            extension = _guess_tile_extension(src)
            digest = hashlib.sha1(src.encode("utf-8")).hexdigest()[:12]
            filename = f"tile-{index:03d}-{digest}{extension}"
            target_path = snapshot_dir / filename
            _download_remote_file(src, target_path)

            stored_tiles.append(
                {
                    "left": int(tile.get("left") or 0),
                    "top": int(tile.get("top") or 0),
                    "width": int(tile.get("width") or 0),
                    "height": int(tile.get("height") or 0),
                    "file": f"/map-snapshots/{normalized_snapshot_id}/{filename}",
                    "source": src,
                }
            )

        if not stored_tiles:
            raise HTTPException(status_code=400, detail="no downloadable tiles found in payload")

        manifest = {
            "snapshot_id": normalized_snapshot_id,
            "provider": "amap-static-snapshot",
            "captured_from": payload.get("captured_from") or "amap-dom",
            "world_id": payload.get("world_id") or normalized_snapshot_id,
            "origin_label": payload.get("origin_label") or "",
            "center": payload.get("center") or {},
            "zoom": payload.get("zoom"),
            "captured_at": payload.get("captured_at"),
            "viewport": {
                "width": int(payload.get("width") or 0),
                "height": int(payload.get("height") or 0),
            },
            "tiles": stored_tiles,
        }
        (snapshot_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        return manifest

    def writeback_event_payload(self, event: dict[str, Any]) -> dict[str, Any]:
        try:
            payload = self.writeback.process_event(event)
            record_memory_graph_event(self.memory_graph, event)
            payload["behavior_insights"] = build_behavior_insights(payload=payload, memory_graph=self.memory_graph)
            return payload
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def orchestrate_world(self, slice_id: str, player_id: str, lat: float, lon: float) -> dict[str, Any]:
        """Orchestrate world based on player state"""
        try:
            # Get POI memory
            poi_memory = self.memory_graph.get_poi_memory(slice_id)
            observer_count = poi_memory.total_observers if poi_memory else 1

            # AIO3: read real accumulated player state from memory graph
            history = self.memory_graph.get_player_history(player_id, slice_id)
            real_visit_count = history.visit_count if history else 1
            real_dwell_seconds = history.total_dwell_time if history else 0.0
            real_mark_count = len(history.marks) if history else 0
            poi_echoes = self.memory_graph.get_poi_echoes(slice_id)
            real_echo_count = len(poi_echoes)

            world_state = {
                "slice_id": slice_id,
                "observer_count": observer_count,
                "center_poi": slice_id,
                "pois": [{"id": slice_id, "name": slice_id}],
            }
            player_state = {
                "player_id": player_id,
                "lat": lat,
                "lon": lon,
                "visit_count": max(1, real_visit_count),
                "writeback_count": max(0, observer_count - 1),
                "echo_count": real_echo_count,
                "mark_count": real_mark_count,
                "dwell_seconds": real_dwell_seconds,
            }

            # Record observation
            self.memory_graph.record_observation(player_id, slice_id)

            # Run orchestration
            result = self.orchestrator.orchestrate(world_state, player_state)

            # Get relationship strength
            relationship = self.memory_graph.calculate_relationship_strength(player_id, slice_id)

            return build_orchestrate_payload(result=result, relationship_strength=relationship)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def generated_file_path(self, file_path: str) -> Path:
        candidate = (self.settings.output_root / Path(file_path)).resolve()
        if not _is_within_root(candidate, self.settings.output_root) or not candidate.is_file():
            raise HTTPException(status_code=404, detail="generated file not found")
        return candidate

    def frontend_static_dir(self) -> Path | None:
        preferred = self.settings.frontend_dist
        if preferred and preferred.exists():
            return preferred
        fallback = self.settings.frontend_root
        if fallback and fallback.exists():
            return fallback
        return None

    def record_ghost_trace_payload(self, player_id: str, waypoints: list, mood_arc: list, visibility: str = "local_public") -> dict[str, Any]:
        try:
            trace = self.memory_graph.record_ghost_trace(player_id, waypoints, mood_arc=mood_arc, visibility=visibility)
            return {
                "trace_id": trace.trace_id,
                "player_id": trace.player_id,
                "waypoints": trace.waypoints,
                "started_at": trace.started_at,
                "ended_at": trace.ended_at,
                "mood_arc": trace.mood_arc,
                "visibility": trace.visibility,
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def get_ghost_traces_payload(self, player_id: str) -> dict[str, Any]:
        try:
            traces = self.memory_graph.get_ghost_traces(player_id)
            return {
                "player_id": player_id,
                "traces": [
                    {
                        "trace_id": t.trace_id,
                        "waypoints": t.waypoints,
                        "started_at": t.started_at,
                        "ended_at": t.ended_at,
                        "mood_arc": t.mood_arc,
                        "visibility": t.visibility,
                    }
                    for t in traces
                ],
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def landmark_honor_payload(self, slice_id: str) -> dict[str, Any]:
        try:
            store_state = self.writeback.store.load()
            slice_bucket = store_state.get("slices", {}).get(slice_id, {})
            targets = slice_bucket.get("targets", {})
            board = []
            for target_id, bucket in targets.items():
                if bucket.get("target_type") == "landmark" and bucket.get("repair_count", 0) > 0:
                    board.append({
                        "landmark_id": target_id,
                        "repair_count": bucket["repair_count"],
                        "honor_board": bucket.get("honor_board", []),
                    })
            board.sort(key=lambda x: -x["repair_count"])
            return {"slice_id": slice_id, "landmarks": board}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def inject_disturbance_payload(self, slice_id: str, weather: str | None, traffic_level: float | None, crowd_density: float | None, is_holiday: bool | None, event_tag: str | None) -> dict[str, Any]:
        inject_disturbance(slice_id, weather=weather, traffic_level=traffic_level, crowd_density=crowd_density, is_holiday=is_holiday, event_tag=event_tag)
        return {"slice_id": slice_id, "active": get_disturbance(slice_id)}

    def clear_disturbance_payload(self, slice_id: str) -> dict[str, Any]:
        clear_disturbance(slice_id)
        return {"slice_id": slice_id, "active": {}}

    def get_disturbance_payload(self, slice_id: str) -> dict[str, Any]:
        return {"slice_id": slice_id, "active": get_disturbance(slice_id)}

    def chat_response_payload(
        self,
        character_id: str,
        message: str,
        world_id: str,
        poi_id: str,
        player_id: str,
        history: list,
    ) -> dict[str, Any]:
        """Generate a simple character response based on archetype and mood."""
        from ..writeback import _session_path

        # Load world to get character data
        world = {}
        session_file = _session_path(world_id, player_id)
        if session_file and session_file.exists():
            try:
                world = json.loads(session_file.read_text("utf-8"))
            except Exception:
                pass

        # Determine character archetype and mood from world data
        archetype = "wanderer"
        mood = "curious"
        character_name = "未知角色"
        character_description = "这个角色还没有被赋予身份。"

        factions = world.get("factions", [])
        for faction in factions:
            if f"faction-{faction.get('id', '')}" == character_id:
                archetype = _archetype_from_faction(faction)
                mood = faction.get("emotional_tone", "curious")
                character_name = faction.get("name", "未知势力")
                character_description = faction.get("doctrine", "")
                break

        # Generate response based on archetype
        response = _generate_response(archetype, mood, message, character_description)

        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": response,
            "mood": mood,
            "archetype": archetype,
            "poi_id": poi_id,
            "timestamp": _now_ms(),
        }


def _archetype_from_faction(faction: dict) -> str:
    """Map faction archetype to character archetype."""
    mapping = {
        "trade_guild": "merchant",
        "order_bureau": "guardian",
        "clinic_circle": "healer",
        "memory_collective": "scholar",
        "night_bloom": "wanderer",
    }
    faction_id = faction.get("id", "")
    return mapping.get(faction_id, "wanderer")


# ─── Simple rule-based response generator ────────────────────────────────────

_CHARACTER_GREETINGS = {
    "merchant": ["交易？你来得正好。", "补给的时间到了？", "欢迎来到交易站。"],
    "guardian": ["请说明你来意。", "这片区域在我的守护之下。", "来者何人？"],
    "healer": ["这里是疗愈之所。", "你受伤了吗？", "让我看看你的状况。"],
    "scholar": ["有什么值得记录的？", "知识是最宝贵的财富。", "这座城市的记忆在我这里。"],
    "wanderer": ["你来了。", "又一个过路人。", "这里没有什么特别的事。"],
}

_CHARACTER_RESPONSES = {
    "merchant": [
        "贸易是这座城市的血脉。每一笔交易都在改变着什么。",
        "我这里有各种物品和信息。你想要什么？",
        "价格公道，童叟无欺。但如果你付不起，那就另说了。",
    ],
    "guardian": [
        "我会守护这片区域，直到最后一人离开。",
        "秩序是这里的基石。没有秩序，就只有混乱。",
        "这片土地见证过太多故事。我只是其中之一。",
    ],
    "healer": [
        "伤痛总会留下痕迹，无论身体还是心灵。",
        "每一次疗愈都是一次重建。希望是最强的药剂。",
        "这里不评判来者，只治愈需要被治愈的人。",
    ],
    "scholar": [
        "这座城市的每一块砖都有自己的故事。",
        "记忆是最容易被遗忘的东西。但我不会忘。",
        "让我告诉你一些你不知道的事。",
    ],
    "wanderer": [
        "我来过这里很多次了。每次都不一样。",
        "城市在变，但某些东西永远不会变。",
        "我没有固定的身份。我是这座城市的一部分。",
    ],
}


def _generate_response(archetype: str, mood: str, message: str, description: str) -> str:
    """Generate a simple response based on archetype and mood."""
    import random

    responses = _CHARACTER_RESPONSES.get(archetype, _CHARACTER_RESPONSES["wanderer"])

    if not message.strip():
        greetings = _CHARACTER_GREETINGS.get(archetype, _CHARACTER_GREETINGS["wanderer"])
        return random.choice(greetings)

    # Check for specific keywords
    msg_lower = message.lower()
    if any(k in msg_lower for k in ["你好", "hi", "hello", "hi!"]):
        if mood == "warm":
            return "你好，欢迎来到这里。"
        elif mood == "wary":
            return "你好。你来这里做什么？"
        else:
            return "你好。有什么事？"

    if any(k in msg_lower for k in ["再见", "bye", "走", "离开"]):
        return "后会有期。"

    if any(k in msg_lower for k in ["谢谢", "thank"]):
        return "不必言谢。这是我的职责。"

    # Default: random response from archetype pool
    base = random.choice(responses)

    # Add description flavor occasionally
    if description and random.random() < 0.3:
        return f"{base}\n\n这座{archetype}的教义说：{description}"

    return base


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)


def _sanitize_snapshot_id(value: str) -> str:
    allowed = [ch.lower() if ch.isalnum() else "-" for ch in (value or "").strip()]
    normalized = "".join(allowed).strip("-")
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized[:80]


def _guess_tile_extension(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        return suffix
    return ".png"


def _download_remote_file(url: str, target_path: Path) -> None:
    request = Request(
        url,
        headers={
            "User-Agent": "FableMapSnapshot/1.0",
            "Referer": "https://webapi.amap.com/",
        },
    )
    with urlopen(request, timeout=20) as response:
        target_path.write_bytes(response.read())


def _is_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False
