from __future__ import annotations

import hashlib
import json
import logging
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import HTTPException

from fablemap_api.domain.tavern_share_policy import build_tavern_share_payload

logger = logging.getLogger(__name__)


def _tavern_llm_config_to_client(tavern_config) -> "LLMConfig":
    """Convert tavern.py LLMConfig to llm_clients.LLMConfig."""
    from fablemap_api.core.llm_clients import LLMConfig
    return LLMConfig(
        backend=tavern_config.backend,
        model=tavern_config.model,
        api_key=tavern_config.api_key,
        base_url=tavern_config.base_url,
        temperature=tavern_config.temperature,
        max_tokens=tavern_config.max_tokens,
        top_p=tavern_config.top_p,
        frequency_penalty=getattr(tavern_config, 'frequency_penalty', 0.0),
        presence_penalty=getattr(tavern_config, 'presence_penalty', 0.0),
    )


def _normalize_visitor_name(value: Any, *, max_length: int = 24) -> str:
    """Normalize a visitor-provided display name before storing or prompt use."""
    if not isinstance(value, str):
        return ""
    normalized = " ".join(value.split())
    return normalized[:max_length]


def _relationship_stage_for(strength: float, visit_count: int) -> str:
    if strength >= 0.75 or visit_count >= 8:
        return "confidant"
    if strength >= 0.45 or visit_count >= 4:
        return "regular"
    if strength >= 0.15 or visit_count >= 2:
        return "acquaintance"
    return "stranger"


def _clamp_chat_history_limit(value: Any, *, default: int = 50, maximum: int = 500) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(maximum, limit))


def _world_info_keywords(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.replace("，", ",").replace("；", ",").replace(";", ",").split(",") if item.strip()]
    return []


def _world_info_order(entry: dict[str, Any]) -> int:
    try:
        return int(entry.get("order", entry.get("insertion_order", 100)))
    except (TypeError, ValueError):
        return 100


def _world_info_probability(entry: dict[str, Any]) -> int:
    try:
        value = int(entry.get("probability", 100))
    except (TypeError, ValueError):
        value = 100
    return max(0, min(100, value))


def _world_info_depth(entry: dict[str, Any]) -> int:
    try:
        value = int(entry.get("depth", 4))
    except (TypeError, ValueError):
        value = 4
    return max(0, value)


def _world_info_title(entry: dict[str, Any]) -> str:
    keys = _world_info_keywords(entry.get("keys"))
    secondary = _world_info_keywords(entry.get("keys_secondary"))
    if entry.get("constant") and not keys:
        return "常驻设定"
    return (keys or secondary or [entry.get("id") or "未命名条目"])[0]


TAVERN_PACKAGE_TYPE = "fablemap_tavern_package"
TAVERN_PACKAGE_VERSION = "1.0"


def _safe_llm_preset(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    allowed = (
        "backend",
        "model",
        "base_url",
        "temperature",
        "max_tokens",
        "top_p",
        "frequency_penalty",
        "presence_penalty",
    )
    return {key: value[key] for key in allowed if key in value and value[key] not in (None, "")}


def _safe_tavern_package_tavern(value: dict[str, Any]) -> dict[str, Any]:
    allowed = (
        "id",
        "name",
        "description",
        "lat",
        "lon",
        "address",
        "access",
        "status",
        "scene_prompt",
    )
    tavern = {key: value.get(key) for key in allowed if key in value}
    tavern["llm_config"] = _safe_llm_preset(value.get("llm_config"))
    return tavern


def _package_list(package: dict[str, Any], tavern_payload: dict[str, Any], key: str) -> list[Any]:
    value = package.get(key)
    if isinstance(value, list):
        return value
    value = tavern_payload.get(key)
    return value if isinstance(value, list) else []


def _package_dict(package: dict[str, Any], tavern_payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = package.get(key)
    if isinstance(value, dict):
        return value
    value = tavern_payload.get(key)
    return value if isinstance(value, dict) else {}


def _memory_filter(value: Any, allowed: set[str]) -> str:
    normalized = str(value or "").strip()
    return normalized if normalized in allowed else ""


def _is_tavern_owner_obj(tavern: Any, user_id: str) -> bool:
    return bool(user_id and getattr(tavern, "owner_id", "") and getattr(tavern, "owner_id", "") == user_id)


def _memory_subject_user_ids(atom: MemoryAtom) -> set[str]:
    ids: set[str] = set()
    if atom.visitor_id:
        ids.add(atom.visitor_id)
    if atom.scope.startswith("visitor_") and atom.subject:
        ids.add(atom.subject)
    return ids


def _memory_subject_matches(atom: MemoryAtom, user_id: str) -> bool:
    return bool(user_id and user_id in _memory_subject_user_ids(atom))


def _memory_atom_is_visible(atom: MemoryAtom, tavern: Any, user_id: str) -> bool:
    if atom.visibility == "public":
        return True
    if atom.visibility == "owner":
        return _is_tavern_owner_obj(tavern, user_id) or _memory_subject_matches(atom, user_id)
    return _memory_subject_matches(atom, user_id)


def _memory_atom_is_editable(atom: MemoryAtom, tavern: Any, user_id: str) -> bool:
    if atom.visibility == "private":
        return _memory_subject_matches(atom, user_id)
    return _is_tavern_owner_obj(tavern, user_id) or bool(user_id and atom.created_by == user_id)


def _memory_atom_matches_filters(
    atom: MemoryAtom,
    *,
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    visibility: str = "",
    visitor_id: str = "",
    character_id: str = "",
    place_id: str = "",
) -> bool:
    if scope and atom.scope != scope:
        return False
    if dimension and atom.dimension != dimension:
        return False
    if horizon and atom.horizon != horizon:
        return False
    if visibility and atom.visibility != visibility:
        return False
    if visitor_id and atom.visitor_id != visitor_id and atom.subject != visitor_id:
        return False
    if character_id and atom.character_id != character_id:
        return False
    if place_id and atom.place_id != place_id:
        return False
    return True


def _clamp_memory_limit(value: Any, default: int = 100, maximum: int = 500) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(maximum, limit))


def _memory_atom_from_payload(
    data: dict[str, Any],
    *,
    tavern_id: str,
    user_id: str,
    existing: MemoryAtom | None = None,
) -> MemoryAtom:
    now = _utc_now_iso()
    if existing:
        payload = existing.to_dict()
    else:
        payload = {
            "id": f"mem_{uuid.uuid4().hex[:12]}",
            "tavern_id": tavern_id,
            "created_at": now,
            "updated_at": now,
            "created_by": user_id,
        }

    editable_fields = (
        "scope",
        "dimension",
        "horizon",
        "subject",
        "content",
        "importance",
        "confidence",
        "source_message_ids",
        "pinned",
        "visibility",
        "visitor_id",
        "character_id",
        "place_id",
        "metadata",
    )
    for key in editable_fields:
        if key in data:
            payload[key] = data[key]

    if not existing:
        payload["id"] = str(data.get("id") or payload["id"]).strip() or payload["id"]
        payload["created_by"] = user_id
        payload["created_at"] = now
    payload["tavern_id"] = tavern_id
    payload["updated_at"] = now

    scope = str(payload.get("scope") or "visitor_tavern").strip()
    visibility = str(payload.get("visibility") or "private").strip()
    if visibility == "private" and not str(payload.get("visitor_id") or "").strip():
        payload["visitor_id"] = user_id
    if scope.startswith("visitor_"):
        if not str(payload.get("visitor_id") or "").strip():
            payload["visitor_id"] = str(payload.get("subject") or user_id or "").strip()
        if not str(payload.get("subject") or "").strip():
            payload["subject"] = str(payload.get("visitor_id") or user_id or "").strip()

    atom = MemoryAtom.from_dict(payload)
    if not atom.content.strip():
        raise HTTPException(status_code=400, detail="记忆内容不能为空")
    return atom

from fablemap_api.core.api_service import build_health_payload, build_meta_payload, build_nearby_payload
from fablemap_api.core.llm_clients import create_client, LLMError
from fablemap_api.core.gameplay import (
    AIDirector,
    GameplaySession,
    completion_payload,
    fallback_result,
    is_complete_node,
    new_event,
    node_by_id,
    normalize_gameplay_definition,
    normalize_gameplay_definitions,
    scene_for_node,
)
from fablemap_api.core.memory import (
    MEMORY_DIMENSIONS,
    MEMORY_HORIZONS,
    MEMORY_SCOPES,
    MEMORY_VISIBILITIES,
    MemoryAtom,
    auto_create_memories_from_chat,
    select_memory_atoms_for_prompt,
)
from fablemap_api.core.output_rules import apply_output_rules, default_output_rules, normalize_output_rules
from fablemap_api.core.presets import (
    combine_runtime_presets,
    custom_runtime_presets,
    default_runtime_presets,
    find_runtime_preset,
    normalize_runtime_presets,
    safe_llm_preset_config,
    safe_memory_policy,
)
from fablemap_api.core.prompt_blocks import default_prompt_blocks, normalize_prompt_blocks
from fablemap_api.core.prompt_builder import ChatMessage as PromptChatMessage, PromptBuildConfig, PromptBuilder
from fablemap_api.core.application.web_payloads import build_behavior_insights, build_orchestrate_payload, record_memory_graph_event
from fablemap_api.core.nearby import generate_nearby_preview
from fablemap_api.core.overpass import OverpassError
from fablemap_api.core.writeback import WritebackEngine, WritebackStore
from fablemap_api.core.orchestrator.rule_engine import RuleBasedOrchestrator
from fablemap_api.core.memory_graph import WorldMemoryGraph
from fablemap_api.core.dynamic_signals import inject_disturbance, clear_disturbance, get_disturbance
from fablemap_api.core.tavern import (
    TavernService as TavernServiceCore,
    TavernStore as TavernStoreCore,
    _is_system_or_public_welfare_tavern_data,
    _normalize_bool,
    _normalize_group_chat_config,
    _normalize_talkativeness,
)

from .config import ApiSettings, DEFAULT_FRONTEND_BUILD_CLIENT_DIR


def _compact_prompt_context_text(value: Any, *, max_chars: int = 1200) -> str:
    if not isinstance(value, str):
        return ""
    normalized = "\n".join(line.strip() for line in value.replace("\r\n", "\n").splitlines() if line.strip())
    return normalized[:max_chars]


def _strip_context_speaker_prefix(value: str) -> str:
    text = str(value or "").strip()
    for separator in ("：", ":"):
        if separator in text:
            prefix, rest = text.split(separator, 1)
            if 0 < len(prefix.strip()) <= 32 and rest.strip():
                return rest.strip()
    return text


def _same_prompt_context_user_message(content: str, current_message: str) -> bool:
    expected = " ".join(str(current_message or "").split())
    if not expected:
        return False
    candidate = " ".join(_strip_context_speaker_prefix(content).split())
    return candidate == expected


def _sanitize_prompt_extra_context(extra_context: Any, current_message: str) -> list[PromptChatMessage]:
    """Convert caller-provided group context into safe prompt history messages."""
    if not isinstance(extra_context, list):
        return []

    result: list[PromptChatMessage] = []
    for raw_message in extra_context[-30:]:
        if not isinstance(raw_message, dict):
            continue
        role = str(raw_message.get("role") or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue
        content = _compact_prompt_context_text(raw_message.get("content"))
        if not content:
            continue
        if role == "user" and _same_prompt_context_user_message(content, current_message):
            continue
        result.append(
            PromptChatMessage(
                role=role,
                content=content,
                name=_normalize_visitor_name(raw_message.get("name"), max_length=32),
            )
        )
    return result


class WebService:
    def __init__(
        self,
        settings: ApiSettings,
        *,
        tavern_store: Any | None = None,
        writeback_store: Any | None = None,
    ):
        self.settings = settings.resolved()
        self.settings.output_root.mkdir(parents=True, exist_ok=True)
        self.writeback = WritebackEngine(writeback_store or WritebackStore(self.settings.output_root / "writeback"))
        self.orchestrator = RuleBasedOrchestrator()
        self.memory_graph = WorldMemoryGraph()
        # Tavern service (new)
        self.tavern_store = tavern_store or TavernStoreCore(self.settings.output_root / "taverns")
        self.tavern_service = TavernServiceCore(self.tavern_store)

    def health_payload(self) -> dict[str, Any]:
        return build_health_payload(
            fixture_file=self.settings.fixture_file,
            frontend_root=self.settings.frontend_root,
            output_root=self.settings.output_root,
        )

    def meta_payload(self, *, base_url: str) -> dict[str, Any]:
        return build_meta_payload(base_url=base_url)

    def _state_cards_for_prompt(self, tavern_id: str) -> list[dict[str, Any]]:
        """Load tavern state cards for PromptBuilder; builder applies visibility/status filters."""
        try:
            return [
                card.to_dict() if hasattr(card, "to_dict") else card
                for card in self.tavern_store.list_state_cards(tavern_id)
            ]
        except Exception:
            return []

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

        def _build_payload(effective_mode: str, source_path: Path | None, fallback_meta: dict[str, Any] | None = None) -> dict[str, Any]:
            run_id = f"run-{uuid.uuid4().hex[:12]}"
            result = generate_nearby_preview(
                lat=lat,
                lon=lon,
                radius=radius,
                output_dir=self.settings.output_root / run_id,
                seed=seed or None,
                source_file=source_path,
                refresh=refresh,
            )
            payload = build_nearby_payload(
                result=result,
                base_url=base_url,
                mode=effective_mode,
                run_id=run_id,
            )
            if fallback_meta:
                payload.update(fallback_meta)
            self._inject_managed_taverns(payload, lat, lon, radius)
            return payload

        try:
            return _build_payload(normalized_mode, source_file)
        except OverpassError as exc:
            if normalized_mode != "live":
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            if not self.settings.fixture_file or not self.settings.fixture_file.exists():
                raise HTTPException(
                    status_code=502,
                    detail=f"{exc} Fixture fallback is unavailable because the fixture file is missing.",
                ) from exc

            logger.warning("Live Overpass request failed; falling back to fixture preview: %s", exc)
            fallback_meta = {
                "requested_mode": "live",
                "fallback_mode": "fixture",
                "fallback_reason": str(exc),
                "fallback_notice": "实时 OSM 暂时不可用，已使用离线演示样例生成。",
            }
            try:
                return _build_payload("fixture", self.settings.fixture_file, fallback_meta)
            except ValueError as fallback_exc:
                raise HTTPException(status_code=400, detail=str(fallback_exc)) from fallback_exc
            except HTTPException:
                raise
            except Exception as fallback_exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"{exc} Fixture fallback also failed: {fallback_exc}",
                ) from fallback_exc
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

        snapshot_dir = (frontend_public / "assets" / "map-snapshots" / normalized_snapshot_id).resolve()
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
                    "file": f"/assets/map-snapshots/{normalized_snapshot_id}/{filename}",
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
        candidates = []
        if self.settings.frontend_dist:
            candidates.append(self.settings.frontend_dist)
        if self.settings.frontend_root:
            candidates.append(self.settings.frontend_root / DEFAULT_FRONTEND_BUILD_CLIENT_DIR)

        seen: set[Path] = set()
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            if (resolved / "index.html").is_file():
                return resolved
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

    # ─── Tavern Service (based on tavern.py) ─────────────────────────────

    def list_taverns_payload(
        self,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        status: str | None = None,
        query: str = "",
        owner_id: str = "",
    ) -> dict[str, Any]:
        """List all taverns with optional location filter"""
        taverns = self.tavern_service.list_taverns(
            lat=lat, lon=lon, radius=radius, access=access, status=status, query=query, owner_id=owner_id
        )
        return {"taverns": taverns, "count": len(taverns)}

    def list_taverns(self, user_id: str = "", **filters: Any) -> list[dict[str, Any]]:
        """Compatibility wrapper for compatibility router endpoints."""
        return self.tavern_service.list_taverns(owner_id=user_id, **filters)

    def get_tavern_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Get a specific tavern by ID"""
        return self.tavern_service.get_tavern(tavern_id, user_id)

    def get_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Compatibility wrapper for compatibility router endpoints."""
        return self.get_tavern_payload(tavern_id, user_id)

    def create_tavern_payload(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        """Create a new tavern"""
        owner_id = str(owner_id or "").strip()
        if not owner_id:
            raise HTTPException(status_code=401, detail="创建空间需要明确店主身份")
        return self.tavern_service.create_tavern(data, owner_id)

    def update_tavern_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Update a tavern"""
        return self.tavern_service.update_tavern(tavern_id, data, user_id)

    def update_tavern(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Compatibility wrapper for compatibility router endpoints."""
        return self.update_tavern_payload(tavern_id, data, user_id)

    def get_share_payload(self, tavern_id: str, base_url: str = "", user_id: str = "") -> dict[str, Any]:
        """Get shareable info for a tavern (public data only)."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.access == "private" and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")
        return build_tavern_share_payload(tavern, base_url=base_url)

    # ─── Gameplay System ────────────────────────────────────────────────

    def _ensure_gameplay_tavern_visible(self, tavern: Any, user_id: str) -> None:
        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

    def _ensure_gameplay_owner(self, tavern: Any, user_id: str) -> None:
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="只有空间主人可以编辑玩法")

    def _gameplay_definition_for_user(self, gameplay: dict[str, Any], *, owner: bool) -> dict[str, Any]:
        if owner:
            return deepcopy(gameplay)
        return {
            "id": gameplay.get("id", ""),
            "title": gameplay.get("title", ""),
            "status": gameplay.get("status", ""),
            "summary": gameplay.get("summary", ""),
            "entry_label": gameplay.get("entry_label", "开始玩法"),
            "mode": gameplay.get("mode", "ai_directed_branch"),
        }

    def get_gameplays_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        self._ensure_gameplay_tavern_visible(tavern, user_id)
        owner = bool(user_id and tavern.owner_id == user_id)
        gameplays = normalize_gameplay_definitions(tavern.gameplay_definitions)
        if not owner:
            gameplays = [gameplay for gameplay in gameplays if gameplay.get("status") == "published"]
        return {
            "tavern_id": tavern_id,
            "gameplays": [
                self._gameplay_definition_for_user(gameplay, owner=owner)
                for gameplay in gameplays
            ],
        }

    def save_gameplays_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        self._ensure_gameplay_owner(tavern, user_id)
        payload = data or {}
        try:
            gameplays = normalize_gameplay_definitions(payload.get("gameplays", []))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        tavern.gameplay_definitions = gameplays
        self.tavern_store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "gameplays": gameplays,
        }

    def _find_gameplay_definition(self, tavern: Any, gameplay_id: str, *, owner: bool = False) -> dict[str, Any]:
        for gameplay in normalize_gameplay_definitions(tavern.gameplay_definitions):
            if gameplay.get("id") != gameplay_id:
                continue
            if gameplay.get("status") == "published" or owner:
                return gameplay
            raise HTTPException(status_code=404, detail="玩法不存在或未发布")
        raise HTTPException(status_code=404, detail="玩法不存在")

    def _session_payload(self, session: GameplaySession, *, include_events: bool = True) -> dict[str, Any]:
        payload = session.to_dict()
        if not include_events:
            payload.pop("events", None)
        return payload

    def _ensure_gameplay_session_access(self, tavern: Any, session: GameplaySession, user_id: str) -> None:
        if user_id and tavern.owner_id == user_id:
            return
        if user_id and session.visitor_id == user_id:
            return
        raise HTTPException(status_code=403, detail="不能访问其他访客的玩法会话")

    def list_gameplay_sessions_payload(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        state: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        self._ensure_gameplay_tavern_visible(tavern, user_id)

        owner = bool(user_id and tavern.owner_id == user_id)
        requested_visitor_id = str(visitor_id or "").strip()
        sessions = self.tavern_store.list_gameplay_sessions(tavern_id)
        if not owner:
            sessions = [session for session in sessions if session.visitor_id == user_id]
        elif requested_visitor_id:
            sessions = [session for session in sessions if session.visitor_id == requested_visitor_id]

        normalized_state = str(state or "").strip()
        if normalized_state == "active":
            sessions = [session for session in sessions if session.state in {"started", "in_progress"}]
        elif normalized_state:
            sessions = [session for session in sessions if session.state == normalized_state]

        return {
            "tavern_id": tavern_id,
            "sessions": [self._session_payload(session, include_events=False) for session in sessions],
        }

    def start_gameplay_session_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少访客身份")
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        self._ensure_gameplay_tavern_visible(tavern, user_id)

        payload = data or {}
        gameplay_id = str(payload.get("gameplay_id") or payload.get("gameplayId") or "").strip()
        if not gameplay_id:
            raise HTTPException(status_code=400, detail="缺少玩法 ID")
        owner = bool(user_id and tavern.owner_id == user_id)
        gameplay = self._find_gameplay_definition(tavern, gameplay_id, owner=owner)
        character_id = str(payload.get("character_id") or payload.get("characterId") or "").strip()
        if not character_id and tavern.characters:
            character_id = tavern.characters[0].id

        for session in self.tavern_store.list_gameplay_sessions(tavern_id):
            if (
                session.visitor_id == user_id
                and session.gameplay_id == gameplay_id
                and session.state in {"started", "in_progress"}
            ):
                return {
                    "ok": True,
                    "resumed": True,
                    "session": self._session_payload(session),
                    "scene": scene_for_node(gameplay, session.current_node_id),
                }

        first_node_id = (gameplay.get("nodes") or [{"id": "start"}])[0].get("id", "start")
        session = GameplaySession.new(
            tavern_id=tavern_id,
            gameplay_id=gameplay_id,
            visitor_id=user_id,
            character_id=character_id,
            current_node_id=first_node_id,
        )
        session.add_event(new_event(
            "started",
            narration=scene_for_node(gameplay, first_node_id).get("narration", ""),
            to_node_id=first_node_id,
            source="system",
        ))
        self.tavern_store.save_gameplay_session(tavern_id, session)
        return {
            "ok": True,
            "resumed": False,
            "session": self._session_payload(session),
            "scene": scene_for_node(gameplay, session.current_node_id),
        }

    def _ai_director_result(
        self,
        tavern: Any,
        gameplay: dict[str, Any],
        session: GameplaySession,
        message: str,
        choice_id: str,
    ) -> dict[str, Any] | None:
        llm_config = self.tavern_store.get_llm_config(tavern.id)
        if not llm_config or not llm_config.is_configured():
            return None
        if str(llm_config.backend or "").lower() in {"rules", "rule_based", "public_welfare"}:
            return None

        def _complete(payload: dict[str, Any]) -> str:
            client = create_client(_tavern_llm_config_to_client(llm_config))
            prompt = [
                {
                    "role": "system",
                    "content": (
                        "你是 FableMap 空间玩法的 AI Director。只返回 JSON，字段包括 "
                        "action(stay/move/complete), next_node_id, event_type, narration, completed。"
                        "不要索取隐私，不给医疗、法律或金融结论，不要求真实危险行动。"
                    ),
                },
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ]
            return client.complete(prompt).content

        try:
            return AIDirector(_complete).advance(gameplay, session, message=message, choice_id=choice_id)
        except Exception:
            logger.exception("AI Director failed for gameplay session %s", session.id)
            return None

    def _apply_gameplay_result(
        self,
        gameplay: dict[str, Any],
        session: GameplaySession,
        result: dict[str, Any],
    ) -> GameplaySession:
        event = new_event(
            result["event"].get("type", "event"),
            narration=result["event"].get("narration", ""),
            from_node_id=result["event"].get("from_node_id", session.current_node_id),
            to_node_id=result.get("next_node_id") or result["event"].get("to_node_id", session.current_node_id),
            choice_id=result["event"].get("choice_id", ""),
            seed=result["event"].get("seed", ""),
            source=result.get("source", result["event"].get("source", "")),
            metadata=result["event"].get("metadata", {}),
        )
        session.turn_count += 1
        session.current_node_id = result.get("next_node_id") or event.to_node_id or session.current_node_id
        session.add_event(event)
        if result.get("completed") or is_complete_node(gameplay, session.current_node_id):
            session.state = "completed"
            session.completion = completion_payload(gameplay, session, event.narration)
        else:
            session.state = "in_progress"
        return session

    def _choice_gameplay_result(
        self,
        gameplay: dict[str, Any],
        session: GameplaySession,
        choice_id: str,
    ) -> dict[str, Any] | None:
        node = node_by_id(gameplay, session.current_node_id) or {}
        choice = next((item for item in node.get("choices", []) if item.get("id") == choice_id), None)
        if not choice:
            return None
        next_node_id = choice.get("next_node_id") or session.current_node_id
        completed = is_complete_node(gameplay, next_node_id, choice=choice)
        event = new_event(
            "completed" if completed else "node_changed",
            narration=choice.get("label", ""),
            from_node_id=session.current_node_id,
            to_node_id=next_node_id,
            choice_id=choice_id,
            source="choice",
        )
        return {
            "source": "choice",
            "event": event.to_dict(),
            "next_node_id": next_node_id,
            "completed": completed,
            "scene": scene_for_node(gameplay, next_node_id),
        }

    def advance_gameplay_session_payload(
        self,
        tavern_id: str,
        session_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        session = self.tavern_store.get_gameplay_session(tavern_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="玩法会话不存在")
        self._ensure_gameplay_session_access(tavern, session, user_id)
        if session.state in {"completed", "abandoned"}:
            return {
                "ok": True,
                "source": "state",
                "event": session.events[-1].to_dict() if session.events else {},
                "session": self._session_payload(session),
                "scene": {},
            }

        gameplay = self._find_gameplay_definition(tavern, session.gameplay_id, owner=bool(user_id and tavern.owner_id == user_id))
        payload = data or {}
        choice_id = str(payload.get("choice_id") or payload.get("choiceId") or "").strip()
        message = str(payload.get("message") or "").strip()

        result = self._choice_gameplay_result(gameplay, session, choice_id) if choice_id else None
        if result is None and message:
            result = self._ai_director_result(tavern, gameplay, session, message, choice_id)
        if result is None:
            result = fallback_result(gameplay, session)

        session = self._apply_gameplay_result(gameplay, session, result)
        self.tavern_store.save_gameplay_session(tavern_id, session)
        return {
            "ok": True,
            "source": result.get("source", ""),
            "event": session.events[-1].to_dict() if session.events else {},
            "session": self._session_payload(session),
            "scene": scene_for_node(gameplay, session.current_node_id) if session.state != "completed" else {},
        }

    def abandon_gameplay_session_payload(self, tavern_id: str, session_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        session = self.tavern_store.get_gameplay_session(tavern_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="玩法会话不存在")
        self._ensure_gameplay_session_access(tavern, session, user_id)
        session.state = "abandoned"
        session.add_event(new_event("abandoned", narration="访客放弃了这局玩法。", source="system"))
        self.tavern_store.save_gameplay_session(tavern_id, session)
        return {"ok": True, "session": self._session_payload(session)}

    def test_world_info_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Deterministically test which WorldInfo entries a message would hit.

        This does not call an LLM and does not persist anything. The caller may
        pass a temporary ``world_info`` list to test unsaved editor changes.
        """
        tavern = self.get_tavern_payload(tavern_id, user_id)
        if tavern.get("owner_id") and tavern.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")
        payload = data or {}
        message = str(payload.get("message") or "")
        recent_messages = payload.get("recent_messages") or []
        if not isinstance(recent_messages, list):
            recent_messages = []

        base_parts: list[str] = [message]
        if payload.get("include_tavern_context"):
            base_parts.extend([
                str(tavern.get("name") or ""),
                str(tavern.get("description") or ""),
                str(tavern.get("scene_prompt") or ""),
            ])
        recent_parts: list[str] = []
        for item in recent_messages:
            if isinstance(item, dict):
                recent_parts.append(str(item.get("content") or item.get("message") or ""))
            else:
                recent_parts.append(str(item))

        source_entries = payload.get("world_info")
        if not isinstance(source_entries, list):
            source_entries = tavern.get("world_info") or []

        entries: list[dict[str, Any]] = []
        for index, raw_entry in enumerate(source_entries):
            if not isinstance(raw_entry, dict):
                continue
            keys = _world_info_keywords(raw_entry.get("keys"))
            keys_secondary = _world_info_keywords(raw_entry.get("keys_secondary"))
            depth = _world_info_depth(raw_entry)
            entry_parts = [*base_parts, *(recent_parts[-depth:] if depth else [])]
            search_text = "\n".join(part for part in entry_parts if part).lower()
            primary_hits = [key for key in keys if key.lower() in search_text]
            secondary_hits = [key for key in keys_secondary if key.lower() in search_text]
            constant = bool(raw_entry.get("constant"))
            disabled = bool(raw_entry.get("disable"))
            selective = bool(raw_entry.get("selective", True))
            probability = _world_info_probability(raw_entry)
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

            content = str(raw_entry.get("content") or "")
            order = _world_info_order(raw_entry)
            entries.append({
                "id": raw_entry.get("id") or f"world_info_{index}",
                "title": _world_info_title(raw_entry),
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
            })

        entries.sort(key=lambda item: (not item["matched"], item["order"], str(item["title"])))
        matches = [entry for entry in entries if entry["matched"]]
        return {
            "tavern_id": tavern_id,
            "message": message,
            "entry_count": len(entries),
            "matched_count": len(matches),
            "matches": matches,
            "entries": entries,
            "scanned_recent_count": len(recent_messages),
            "include_tavern_context": bool(payload.get("include_tavern_context")),
        }

    def get_output_rules_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Return owner-editable output cleanup rules for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        rules = normalize_output_rules(tavern.output_rules)
        if not rules:
            rules = default_output_rules()
        return {
            "tavern_id": tavern_id,
            "rules": rules,
            "default_rules": default_output_rules(),
        }

    def save_output_rules_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Persist output cleanup rules for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        source_rules = payload.get("rules", payload.get("output_rules"))
        rules = normalize_output_rules(source_rules)
        tavern.output_rules = rules
        tavern = self.tavern_store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "rules": tavern.output_rules,
            "tavern": tavern.to_dict_private(user_id),
        }

    def test_output_rules_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Apply output cleanup rules to a sample text without saving."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        source_rules = payload.get("rules", payload.get("output_rules", tavern.output_rules))
        result = apply_output_rules(payload.get("text", ""), source_rules)
        return {
            "tavern_id": tavern_id,
            **result,
        }

    def get_prompt_blocks_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Return owner-editable Prompt Blocks for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        blocks = normalize_prompt_blocks(tavern.prompt_blocks)
        if not blocks:
            blocks = default_prompt_blocks()
        return {
            "tavern_id": tavern_id,
            "blocks": blocks,
            "default_blocks": default_prompt_blocks(),
        }

    def save_prompt_blocks_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Persist Prompt Blocks for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        blocks = normalize_prompt_blocks(payload.get("blocks", payload.get("prompt_blocks")))
        tavern.prompt_blocks = blocks
        tavern = self.tavern_store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "blocks": tavern.prompt_blocks,
            "tavern": tavern.to_dict_private(user_id),
        }

    def preview_prompt_blocks_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Build a prompt preview with Prompt Blocks without calling an LLM."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        blocks = normalize_prompt_blocks(payload.get("blocks", payload.get("prompt_blocks", tavern.prompt_blocks)))
        if not blocks:
            blocks = default_prompt_blocks()

        character_id = str(payload.get("character_id") or "").strip()
        character = next((c for c in tavern.characters if c.id == character_id), None)
        if not character:
            character = tavern.characters[0] if tavern.characters else None
        if not character:
            raise HTTPException(status_code=400, detail="请先为空间添加角色")

        message = str(payload.get("message") or "我想了解这里。")
        visitor_name = _normalize_visitor_name(payload.get("visitor_name")) or "旅人"
        config = PromptBuildConfig(
            tavern_name=tavern.name,
            tavern_scene_prompt=tavern.scene_prompt or "",
            char_name=character.name,
            char_description=character.description or "",
            char_personality=character.personality or "",
            char_scenario=character.scenario or "",
            char_first_mes=character.first_mes or "",
            char_system_prompt=character.system_prompt or "",
            char_mes_example=character.mes_example or "",
            char_gender=character.gender or "",
            char_tags=character.tags or [],
            char_hobbies=character.hobbies or [],
            char_traits=character.traits or [],
            user_name=visitor_name,
            visitor_visit_count=int(payload.get("visitor_visit_count") or 0),
            visitor_relationship_stage=str(payload.get("visitor_relationship_stage") or ""),
            visitor_relationship_strength=float(payload.get("visitor_relationship_strength") or 0.0),
            visitor_message_count=int(payload.get("visitor_message_count") or 0),
            world_info_entries=[e.to_dict() if hasattr(e, "to_dict") else e for e in tavern.world_info],
            state_cards=self._state_cards_for_prompt(tavern_id),
            prompt_blocks=blocks,
            history_max_messages=8,
        )
        builder = PromptBuilder(config)
        prompt_result = builder.build([], message)
        messages = prompt_result.get("messages", [])
        return {
            "tavern_id": tavern_id,
            "character_id": character.id,
            "character_name": character.name,
            "blocks": blocks,
            "messages": messages,
            "message_count": len(messages),
        }

    def get_runtime_presets_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Return built-in and owner-created runtime presets for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        custom_presets = custom_runtime_presets(tavern.runtime_presets)
        return {
            "tavern_id": tavern_id,
            "active_preset_id": tavern.active_preset_id,
            "presets": combine_runtime_presets(custom_presets),
            "custom_presets": custom_presets,
            "default_presets": default_runtime_presets(),
            "memory_policy": safe_memory_policy(tavern.memory_policy),
        }

    def save_runtime_presets_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Persist owner-created runtime presets for a tavern."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        custom_presets = custom_runtime_presets(payload.get("presets", payload.get("runtime_presets")))
        tavern.runtime_presets = custom_presets
        if "active_preset_id" in payload:
            tavern.active_preset_id = str(payload.get("active_preset_id") or "").strip()
        tavern = self.tavern_store.update_tavern(tavern)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "active_preset_id": tavern.active_preset_id,
            "presets": combine_runtime_presets(tavern.runtime_presets),
            "custom_presets": custom_runtime_presets(tavern.runtime_presets),
            "tavern": tavern.to_dict_private(user_id),
        }

    def apply_runtime_preset_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Apply a runtime preset to LLM params, Prompt Blocks, memory policy, and output rules."""

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        payload = data or {}
        preset: dict[str, Any] | None = None
        if isinstance(payload.get("preset"), dict):
            normalized = normalize_runtime_presets([payload["preset"]])
            preset = normalized[0] if normalized else None
        if preset is None:
            preset = find_runtime_preset(
                combine_runtime_presets(tavern.runtime_presets),
                str(payload.get("preset_id") or payload.get("id") or ""),
            )
        if preset is None:
            raise HTTPException(status_code=404, detail="运行预设不存在")

        llm_config = safe_llm_preset_config(preset.get("llm_config"))
        if llm_config:
            current_private = tavern.llm_config.to_dict_private()
            preset_backend = llm_config.get("backend") or current_private.get("backend")
            preserve_key = preset_backend == current_private.get("backend")
            llm_config = {
                **current_private,
                **llm_config,
                "api_key": current_private.get("api_key", "") if preserve_key else "",
                "token_used": current_private.get("token_used", 0),
            }

        update_payload: dict[str, Any] = {
            "active_preset_id": preset.get("id") or "",
            "memory_policy": safe_memory_policy(preset.get("memory_policy")),
        }
        if llm_config:
            update_payload["llm_config"] = llm_config
        prompt_blocks = normalize_prompt_blocks(preset.get("prompt_blocks"))
        if prompt_blocks:
            update_payload["prompt_blocks"] = prompt_blocks
        output_rules = normalize_output_rules(preset.get("output_rules"))
        if output_rules:
            update_payload["output_rules"] = output_rules

        tavern_payload = self.update_tavern_payload(tavern_id, update_payload, user_id)
        return {
            "ok": True,
            "tavern_id": tavern_id,
            "active_preset_id": preset.get("id") or "",
            "preset": preset,
            "tavern": tavern_payload,
        }

    def delete_tavern_payload(self, tavern_id: str, user_id: str = "") -> dict[str, str]:
        """Delete a tavern"""
        return self.tavern_service.delete_tavern(tavern_id, user_id)

    # ── Voice Config ───────────────────────────────────────────────────

    def save_voice_config_payload(
        self, tavern_id: str, data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Save voice config (TTS/STT settings)"""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        from fablemap_api.core.tavern import VoiceConfig
        voice_config = VoiceConfig.from_dict(data)
        self.tavern_store.save_voice_config(tavern_id, voice_config)
        # Also update the in-memory tavern object
        tavern.voice_config = voice_config
        self.tavern_store.update_tavern(tavern)
        return {"ok": True, "voice_config": voice_config.to_dict()}

    def get_voice_config_payload(
        self, tavern_id: str, user_id: str = ""
    ) -> dict[str, Any]:
        """Get voice config — owner sees full config, others see public config"""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        vc = self.tavern_store.get_voice_config(tavern_id)
        if vc:
            return {"voice_config": vc.to_dict()}

        # Return default empty config
        from fablemap_api.core.tavern import VoiceConfig
        default_vc = VoiceConfig()
        return {"voice_config": default_vc.to_dict()}

    def synthesize_voice_payload(
        self,
        tavern_id: str,
        text: str,
        character_id: str = "",
        user_id: str = "",
    ) -> bytes:
        """Synthesize speech for a tavern using its TTS config."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        vc = self.tavern_store.get_voice_config(tavern_id)
        if not vc or not vc.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")

        # Get TTS provider credentials from LLM config (same api_key works)
        llm_config = self.tavern_store.get_llm_config(tavern_id)
        api_key = llm_config.api_key if llm_config else ""
        base_url = llm_config.base_url if llm_config else ""

        # Build TTS config
        from fablemap_api.core.tts_clients import TTSConfig, create_tts_provider
        tts_cfg = TTSConfig(
            provider=vc.tts_provider,
            api_key=api_key,
            base_url=base_url,
            voice=vc.tts_voice,
            model=vc.tts_model,
            speed=vc.tts_speed,
            language=vc.tts_language,
        )

        try:
            provider = create_tts_provider(tts_cfg)
            result = provider.synthesize(text, voice=vc.tts_voice or None)
            return result.audio
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"语音合成失败: {e}")

    def transcribe_voice_payload(
        self,
        tavern_id: str,
        audio_bytes: bytes,
        audio_format: str = "webm",
        user_id: str = "",
    ) -> dict[str, Any]:
        """Transcribe uploaded audio using the tavern's STT config (Whisper/FasterWhisper)."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        vc = self.tavern_store.get_voice_config(tavern_id)
        if not vc or not vc.enabled:
            raise HTTPException(status_code=400, detail="语音未启用")
        if vc.stt_provider == "browser":
            raise HTTPException(status_code=400, detail="浏览器 STT 无需上传到后端")

        # Import STT service
        from fablemap_api.core.stt_service import transcribe_bytes

        try:
            text = transcribe_bytes(
                audio_bytes,
                format=audio_format,
                provider=vc.stt_provider,
                model=vc.stt_model or "base",
                language="",  # auto-detect
            )
            return {"text": text, "provider": vc.stt_provider}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"语音转写失败: {e}")

    def enter_tavern_payload(
        self, tavern_id: str, password: str = "", user_id: str = "", visitor_gender: str = ""
    ) -> dict[str, Any]:
        """Enter a tavern (verify password)"""
        return self.tavern_service.enter_tavern(tavern_id, password, user_id, visitor_gender)

    def list_tavern_visitors_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """List visitor states for a tavern. Owner-only."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="Tavern not found")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        visitor_names: dict[str, str] = {}
        message_counts: dict[str, int] = {}
        for session in self.tavern_store.list_chat_sessions(tavern_id, limit=None):
            visitor_id = session.get("visitor_id", "")
            if not visitor_id:
                continue
            visitor_name = session.get("visitor_name", "")
            if visitor_name and not visitor_names.get(visitor_id):
                visitor_names[visitor_id] = visitor_name
            message_counts[visitor_id] = message_counts.get(visitor_id, 0) + int(session.get("message_count", 0) or 0)

        visitors = []
        for state in self.tavern_store.list_visitor_states(tavern_id):
            payload = state.to_dict()
            payload["visitor_name"] = visitor_names.get(state.visitor_id, "")
            payload["message_count"] = message_counts.get(state.visitor_id, 0)
            visitors.append(payload)

        return {"visitors": visitors, "count": len(visitors)}

    def list_memory_atoms_payload(
        self,
        tavern_id: str,
        user_id: str = "",
        *,
        scope: str = "",
        dimension: str = "",
        horizon: str = "",
        visibility: str = "",
        visitor_id: str = "",
        character_id: str = "",
        place_id: str = "",
        limit: int = 100,
    ) -> dict[str, Any]:
        """List structured memory atoms visible to the current user."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.access == "private" and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")

        filters = {
            "scope": _memory_filter(scope, MEMORY_SCOPES),
            "dimension": _memory_filter(dimension, MEMORY_DIMENSIONS),
            "horizon": _memory_filter(horizon, MEMORY_HORIZONS),
            "visibility": _memory_filter(visibility, MEMORY_VISIBILITIES),
            "visitor_id": str(visitor_id or "").strip(),
            "character_id": str(character_id or "").strip(),
            "place_id": str(place_id or "").strip(),
        }
        max_items = _clamp_memory_limit(limit)

        atoms = []
        for atom in self.tavern_store.list_memory_atoms(tavern_id):
            if not _memory_atom_is_visible(atom, tavern, user_id):
                continue
            if not _memory_atom_matches_filters(atom, **filters):
                continue
            atoms.append(atom.to_dict())
            if len(atoms) >= max_items:
                break

        return {
            "tavern_id": tavern_id,
            "memory_atoms": atoms,
            "count": len(atoms),
            "filters": filters,
        }

    def get_memory_atom_payload(self, tavern_id: str, memory_id: str, user_id: str = "") -> dict[str, Any]:
        """Return a single structured memory atom if visible to the current user."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.access == "private" and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")

        atom = self.tavern_store.get_memory_atom(tavern_id, memory_id)
        if not atom:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not _memory_atom_is_visible(atom, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能访问这条记忆")
        return {"tavern_id": tavern_id, "memory_atom": atom.to_dict()}

    def create_memory_atom_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Create a structured memory atom with tavern and visitor visibility rules."""
        if not user_id:
            raise HTTPException(status_code=401, detail="创建记忆需要明确用户身份")

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        owner = _is_tavern_owner_obj(tavern, user_id)
        if tavern.access == "private" and not owner:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        atom = _memory_atom_from_payload(data or {}, tavern_id=tavern_id, user_id=user_id)
        if atom.visibility == "private" and not _memory_subject_matches(atom, user_id):
            raise HTTPException(status_code=403, detail="只能创建自己的私密记忆")
        if atom.visibility == "private" and atom.scope.startswith("visitor_"):
            private_ids = {value for value in (atom.subject, atom.visitor_id) if value}
            if private_ids != {user_id}:
                raise HTTPException(status_code=403, detail="私密访客记忆只能属于当前访客")
        if atom.scope.startswith("visitor_") and atom.visitor_id and atom.visitor_id != user_id and not owner:
            raise HTTPException(status_code=403, detail="不能为其他访客创建记忆")
        if atom.visibility != "private" and not owner and atom.scope not in {"visitor_character", "visitor_tavern"}:
            raise HTTPException(status_code=403, detail="只有店主能创建公共空间或地点记忆")

        created = self.tavern_store.save_memory_atom(tavern_id, atom)
        return {"ok": True, "tavern_id": tavern_id, "memory_atom": created.to_dict()}

    def update_memory_atom_payload(
        self,
        tavern_id: str,
        memory_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        """Update a structured memory atom if the current user can edit it."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.access == "private" and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")

        existing = self.tavern_store.get_memory_atom(tavern_id, memory_id)
        if not existing:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not _memory_atom_is_editable(existing, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能修改这条记忆")

        updated = _memory_atom_from_payload(data or {}, tavern_id=tavern_id, user_id=user_id, existing=existing)
        if updated.visibility == "private" and not _memory_subject_matches(updated, user_id):
            raise HTTPException(status_code=403, detail="私密记忆只能属于当前访客")
        if updated.visibility == "private" and updated.scope.startswith("visitor_"):
            private_ids = {value for value in (updated.subject, updated.visitor_id) if value}
            if private_ids != {user_id}:
                raise HTTPException(status_code=403, detail="私密访客记忆只能属于当前访客")
        if updated.scope.startswith("visitor_") and updated.visitor_id and updated.visitor_id != user_id and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能把记忆转给其他访客")

        saved = self.tavern_store.save_memory_atom(tavern_id, updated)
        return {"ok": True, "tavern_id": tavern_id, "memory_atom": saved.to_dict()}

    def delete_memory_atom_payload(self, tavern_id: str, memory_id: str, user_id: str = "") -> dict[str, Any]:
        """Delete a structured memory atom if the current user can edit it."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.access == "private" and not _is_tavern_owner_obj(tavern, user_id):
            raise HTTPException(status_code=403, detail="此空间是私人的")
        atom = self.tavern_store.get_memory_atom(tavern_id, memory_id)
        if not atom:
            raise HTTPException(status_code=404, detail="记忆不存在")
        if not _memory_atom_is_editable(atom, tavern, user_id):
            raise HTTPException(status_code=403, detail="不能删除这条记忆")

        deleted = self.tavern_store.delete_memory_atom(tavern_id, memory_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="记忆不存在")
        return {"ok": True, "tavern_id": tavern_id, "memory_id": memory_id}

    def add_character_payload(
        self, tavern_id: str, data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Add a character to a tavern"""
        return self.tavern_service.add_character(tavern_id, data, user_id)

    def update_character_payload(
        self, tavern_id: str, char_id: str, data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Update a character"""
        return self.tavern_service.update_character(tavern_id, char_id, data, user_id)

    def delete_character_payload(
        self, tavern_id: str, char_id: str, user_id: str = ""
    ) -> dict[str, str]:
        """Delete a character"""
        return self.tavern_service.delete_character(tavern_id, char_id, user_id)

    def import_character_card_payload(
        self, tavern_id: str, card_data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Import a SillyTavern character card"""
        return self.tavern_service.import_character_card(tavern_id, card_data, user_id)

    def export_tavern_package_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Export a shareable tavern package without credentials or visitor data."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        tavern_payload = tavern.to_dict()
        safe_tavern = _safe_tavern_package_tavern(tavern_payload)
        safe_tavern.pop("password_hash", None)
        llm_preset = _safe_llm_preset(tavern_payload.get("llm_config"))
        return {
            "type": TAVERN_PACKAGE_TYPE,
            "version": TAVERN_PACKAGE_VERSION,
            "exported_at": _utc_now_iso(),
            "source": {
                "tavern_id": tavern.id,
                "author_id": tavern.owner_id,
            },
            "tavern": safe_tavern,
            "characters": tavern_payload.get("characters", []),
            "world_info": tavern_payload.get("world_info", []),
            "groups": tavern_payload.get("groups", []),
            "bookmarks": tavern_payload.get("bookmarks", []),
            "chat_templates": tavern_payload.get("chat_templates", []),
            "gameplay_definitions": tavern_payload.get("gameplay_definitions", []),
            "output_rules": tavern_payload.get("output_rules") or default_output_rules(),
            "prompt_blocks": tavern_payload.get("prompt_blocks") or default_prompt_blocks(),
            "runtime_presets": custom_runtime_presets(tavern_payload.get("runtime_presets")),
            "skill_packs": tavern_payload.get("skill_packs", []),
            "default_runtime_presets": default_runtime_presets(),
            "active_preset_id": tavern_payload.get("active_preset_id", ""),
            "prompt_preset": {
                "llm_config": llm_preset,
            },
            "memory_policy": safe_memory_policy(tavern_payload.get("memory_policy")),
            "voice_config": tavern_payload.get("voice_config", {}),
            "cover": tavern_payload.get("cover", ""),
        }

    def import_tavern_package_payload(self, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Import a shareable tavern package as a new tavern at a chosen coordinate."""
        payload = data or {}
        package = payload.get("package") if isinstance(payload.get("package"), dict) else payload
        if not isinstance(package, dict):
            raise HTTPException(status_code=400, detail="package is required")
        if package.get("type") != TAVERN_PACKAGE_TYPE:
            raise HTTPException(status_code=400, detail="不支持的空间包类型")

        tavern_payload = package.get("tavern") if isinstance(package.get("tavern"), dict) else {}
        if not tavern_payload:
            raise HTTPException(status_code=400, detail="空间包缺少 tavern 数据")

        try:
            lat = float(payload.get("lat", tavern_payload.get("lat")))
            lon = float(payload.get("lon", tavern_payload.get("lon")))
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="导入空间包时需要有效坐标") from exc

        source_name = str(tavern_payload.get("name") or "导入空间").strip() or "导入空间"
        tavern_id = str(payload.get("tavern_id") or f"tavern_{uuid.uuid4().hex[:12]}").strip()
        raw_access = str(payload.get("access") or tavern_payload.get("access") or "private").strip()
        access = raw_access if raw_access in {"public", "private", "password"} else "private"
        if access == "password":
            access = "private"

        create_payload = {
            "id": tavern_id,
            "name": str(payload.get("name") or source_name).strip() or source_name,
            "description": tavern_payload.get("description", ""),
            "lat": lat,
            "lon": lon,
            "address": payload.get("address", tavern_payload.get("address", "")),
            "access": access,
            "scene_prompt": tavern_payload.get("scene_prompt", ""),
        }
        llm_preset = _safe_llm_preset(
            _package_dict(package, tavern_payload, "prompt_preset").get("llm_config")
            or tavern_payload.get("llm_config")
        )
        if llm_preset:
            create_payload["llm_config"] = llm_preset

        created = self.create_tavern_payload(create_payload, owner_id=user_id)

        update_payload = {
            "characters": _package_list(package, tavern_payload, "characters"),
            "world_info": _package_list(package, tavern_payload, "world_info"),
            "groups": _package_list(package, tavern_payload, "groups"),
            "bookmarks": _package_list(package, tavern_payload, "bookmarks"),
            "chat_templates": _package_list(package, tavern_payload, "chat_templates"),
            "gameplay_definitions": _package_list(package, tavern_payload, "gameplay_definitions"),
            "output_rules": _package_list(package, tavern_payload, "output_rules"),
            "prompt_blocks": _package_list(package, tavern_payload, "prompt_blocks"),
            "runtime_presets": _package_list(package, tavern_payload, "runtime_presets"),
            "skill_packs": _package_list(package, tavern_payload, "skill_packs"),
            "active_preset_id": str(package.get("active_preset_id") or tavern_payload.get("active_preset_id") or ""),
            "memory_policy": _package_dict(package, tavern_payload, "memory_policy"),
        }
        if llm_preset:
            update_payload["llm_config"] = llm_preset

        imported = self.update_tavern_payload(created["id"], update_payload, user_id)
        voice_config = _package_dict(package, tavern_payload, "voice_config")
        if voice_config:
            try:
                self.save_voice_config_payload(imported["id"], voice_config, user_id)
                imported = self.get_tavern_payload(imported["id"], user_id)
            except HTTPException:
                raise
            except Exception:
                logger.exception("Failed to import voice_config for tavern package %s", imported["id"])

        return {
            "ok": True,
            "tavern_id": imported["id"],
            "tavern": imported,
            "characters": len(imported.get("characters", [])),
            "world_info": len(imported.get("world_info", [])),
        }

    def list_tavern_backups(self, tavern_id: str = "") -> dict[str, Any]:
        backup_dir = self.settings.output_root / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(backup_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)[:50]
        backups = []
        for file_path in files:
            if tavern_id and tavern_id not in file_path.name:
                continue
            backups.append({
                "name": file_path.name,
                "path": str(file_path),
                "size": file_path.stat().st_size,
                "modified": file_path.stat().st_mtime,
            })
        return {"backups": backups}

    def create_tavern_backup(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="Tavern not found")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        chat_sessions = self.tavern_store.list_chat_sessions(tavern_id, limit=None)
        payload = {
            "version": 1,
            "created_at": _utc_now_iso(),
            "tavern": tavern.to_dict_private(user_id),
            "chat_sessions": [
                {
                    "visitor_id": session.get("visitor_id", ""),
                    "character_id": session.get("character_id", ""),
                    "messages": [
                        message.to_dict() if hasattr(message, "to_dict") else message
                        for message in session.get("messages", [])
                    ],
                }
                for session in chat_sessions
            ],
        }

        backup_dir = self.settings.output_root / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_name = f"backup_{_sanitize_snapshot_id(tavern_id)}_{_now_ms()}.json"
        backup_file = backup_dir / backup_name
        backup_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return {
            "ok": True,
            "backup_file": str(backup_file),
            "backup_name": backup_name,
            "tavern_id": tavern_id,
            "chat_sessions": len(payload["chat_sessions"]),
        }

    def restore_tavern_backup(
        self,
        backup_path: str,
        tavern_id: str = "",
        user_id: str = "",
        replace_chats: bool = True,
    ) -> dict[str, Any]:
        if not backup_path:
            raise HTTPException(status_code=400, detail="backup_path is required")

        backup_file = self._resolve_backup_file(backup_path)
        try:
            backup_data = json.loads(backup_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid backup file: {exc}") from exc

        tavern_payload = backup_data.get("tavern", backup_data)
        target_tavern_id = tavern_id or tavern_payload.get("id", "")
        if not target_tavern_id:
            raise HTTPException(status_code=400, detail="tavern_id is required")

        existing = self.tavern_store.get_tavern(target_tavern_id)
        if existing:
            if existing.owner_id and existing.owner_id != user_id:
                raise HTTPException(status_code=403, detail="你不是此空间的主人")
            self.tavern_service.update_tavern(target_tavern_id, tavern_payload, user_id)
        else:
            from fablemap_api.core.tavern import Tavern
            restored_tavern = Tavern.from_dict({**tavern_payload, "id": target_tavern_id})
            if restored_tavern.owner_id and restored_tavern.owner_id != user_id:
                raise HTTPException(status_code=403, detail="你不是此空间的主人")
            restored_tavern.owner_id = restored_tavern.owner_id or user_id
            self.tavern_store.create_tavern(restored_tavern)

        if replace_chats:
            self.tavern_store.delete_chat_history(target_tavern_id)

        restored_messages = 0
        from fablemap_api.core.tavern import ChatMessage
        for session in backup_data.get("chat_sessions", []):
            if not isinstance(session, dict):
                continue
            visitor_id = session.get("visitor_id", "")
            character_id = session.get("character_id", "")
            if not visitor_id or not character_id:
                continue
            messages = []
            for message_data in session.get("messages", []):
                if not isinstance(message_data, dict):
                    continue
                messages.append(ChatMessage.from_dict({
                    **message_data,
                    "tavern_id": target_tavern_id,
                    "visitor_id": message_data.get("visitor_id") or visitor_id,
                    "character_id": message_data.get("character_id") or character_id,
                    "role": message_data.get("role") or "user",
                    "content": message_data.get("content") or "",
                    "timestamp": message_data.get("timestamp") or _utc_now_iso(),
                }))
            restored_messages += self.tavern_store.replace_chat_history(
                target_tavern_id,
                visitor_id,
                character_id,
                messages,
            )

        return {
            "ok": True,
            "tavern_id": target_tavern_id,
            "restored_messages": restored_messages,
        }

    def _resolve_backup_file(self, backup_path: str) -> Path:
        backup_dir = (self.settings.output_root / "backups").resolve()
        candidate = Path(backup_path)
        if not candidate.is_absolute():
            candidate = backup_dir / candidate
        candidate = candidate.resolve()
        if not _is_within_root(candidate, backup_dir):
            raise HTTPException(status_code=400, detail="backup_path must be inside backups directory")
        if not candidate.exists() or not candidate.is_file():
            raise HTTPException(status_code=404, detail="Backup file not found")
        return candidate

    def _build_tavern_character_prompt(
        self,
        *,
        tavern: Any,
        character: Any,
        llm_config: Any,
        message: str,
        visitor_id: str,
        visitor_display_name: str = "",
        extra_context: list[dict[str, Any]] | None = None,
        history_messages: list[Any] | None = None,
    ) -> dict[str, Any]:
        """Build the same prompt stack for single chat and tavern-level group chat."""
        tavern_id = getattr(tavern, "id", "")
        character_id = getattr(character, "id", "")
        prompt_user_name = visitor_display_name or visitor_id[:16] or "旅人"
        messages = history_messages if history_messages is not None else self.tavern_store.get_chat_history(
            tavern_id, visitor_id, character_id, limit=20
        )
        prompt_visitor_state = self.tavern_store.get_visitor_state(tavern_id, visitor_id) if visitor_id else None
        visitor_message_count = len(messages)
        if visitor_id:
            try:
                visitor_message_count = sum(
                    int(session.get("message_count", 0) or 0)
                    for session in self.tavern_store.list_chat_sessions(
                        tavern_id,
                        visitor_id=visitor_id,
                        limit=None,
                    )
                )
            except Exception:
                visitor_message_count = len(messages)

        character_names = {c.id: c.name for c in getattr(tavern, "characters", [])}
        prompt_messages_obj = [
            PromptChatMessage(
                id=m.id,
                role=m.role,
                content=m.content,
                name=(
                    (m.visitor_name or visitor_display_name or prompt_user_name)
                    if m.role == "user"
                    else character_names.get(m.character_id, getattr(character, "name", ""))
                ),
                timestamp=m.timestamp or "",
            )
            for m in messages
        ] + _sanitize_prompt_extra_context(extra_context, message)

        output_format = "openai"
        backend = str(getattr(llm_config, "backend", "") or "").lower()
        if backend in ("claude",):
            output_format = "claude"
        elif backend in (
            "ooba",
            "mancer",
            "vllm",
            "tabby",
            "koboldcpp",
            "togetherai",
            "llamacpp",
            "infermaticai",
            "dreamgen",
            "featherless",
            "huggingface",
            "generic",
            "ollama",
        ):
            output_format = "textgen"

        memory_policy = safe_memory_policy(getattr(tavern, "memory_policy", {}))
        prompt_memory_atoms: list[MemoryAtom] = []
        if memory_policy.get("mode") in {"structured", "balanced", "long_context"}:
            try:
                visible_atoms = [
                    atom for atom in self.tavern_store.list_memory_atoms(tavern_id)
                    if _memory_atom_is_visible(atom, tavern, visitor_id)
                ]
                prompt_memory_atoms = select_memory_atoms_for_prompt(
                    visible_atoms,
                    visitor_id=visitor_id,
                    character_id=character_id,
                    current_message=message,
                    budget_tokens=memory_policy.get("budget_tokens", 1200),
                    include_short=bool(memory_policy.get("short_term", True)),
                    include_mid=bool(memory_policy.get("mid_term", True)),
                    include_long=bool(memory_policy.get("long_term", True)),
                )
            except Exception:
                prompt_memory_atoms = []

        config = PromptBuildConfig(
            tavern_name=getattr(tavern, "name", ""),
            tavern_scene_prompt=getattr(tavern, "scene_prompt", "") or "",
            char_name=getattr(character, "name", ""),
            char_description=getattr(character, "description", "") or "",
            char_personality=getattr(character, "personality", "") or "",
            char_scenario=getattr(character, "scenario", "") or "",
            char_first_mes=getattr(character, "first_mes", "") or "",
            char_system_prompt=getattr(character, "system_prompt", "") or "",
            char_mes_example=getattr(character, "mes_example", "") or "",
            char_gender=getattr(character, "gender", "") or "",
            char_tags=getattr(character, "tags", []) or [],
            char_hobbies=getattr(character, "hobbies", []) or [],
            char_traits=getattr(character, "traits", []) or [],
            user_name=prompt_user_name,
            visitor_visit_count=prompt_visitor_state.visit_count if prompt_visitor_state else 0,
            visitor_relationship_stage=prompt_visitor_state.relationship_stage if prompt_visitor_state else "",
            visitor_relationship_strength=prompt_visitor_state.relationship_strength if prompt_visitor_state else 0.0,
            visitor_first_visit=prompt_visitor_state.first_visit if prompt_visitor_state else "",
            visitor_last_visit=prompt_visitor_state.last_visit if prompt_visitor_state else "",
            visitor_message_count=visitor_message_count,
            memory_atoms=[atom.to_dict() for atom in prompt_memory_atoms],
            memory_budget_tokens=int(memory_policy.get("budget_tokens", 0) or 0),
            world_info_entries=[e.to_dict() if hasattr(e, "to_dict") else e for e in getattr(tavern, "world_info", [])],
            state_cards=self._state_cards_for_prompt(tavern_id),
            prompt_blocks=normalize_prompt_blocks(getattr(tavern, "prompt_blocks", [])),
            output_format=output_format,
            history_max_messages=20,
        )
        builder = PromptBuilder(config)
        return {
            "prompt_result": builder.build(prompt_messages_obj, message),
            "history_messages": messages,
            "visitor_state": prompt_visitor_state,
            "visitor_message_count": visitor_message_count,
            "memory_atoms": prompt_memory_atoms,
        }

    # Chat methods using tavern service
    def tavern_chat_payload(
        self,
        tavern_id: str,
        character_id: str,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        user_id: str = "",
        visitor_gender: str = "",
        extra_context: list[dict[str, Any]] | None = None,
        display_message: str = "",
    ) -> dict[str, Any]:
        """Send a chat message and get AI response"""
        from fablemap_api.core.tavern import ChatMessage as TavernChatMessage, VisitorState, _normalize_gender

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        if user_id and user_id != visitor_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="不能代替其他访客发送消息")
        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        visitor_display_name = _normalize_visitor_name(visitor_name)
        prompt_user_name = visitor_display_name or visitor_id[:16] or "旅人"
        display_message = str(display_message or "").strip()
        saved_user_content = display_message or message

        # Find character
        character = next((c for c in tavern.characters if c.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")

        # Check if tavern is open
        if tavern.status != "open":
            return self._degraded_chat_payload(
                character_id=character_id,
                character_name=character.name,
                response_text="",
                reason="tavern_closed",
                title="空间正在歇业",
                message="店主暂时关闭了这间空间。等它重新营业后，就可以继续和角色对话。",
                action="稍后再来，或请店主在控制台重新开放空间。",
                tavern_status=tavern.status,
            )

        # Get LLM config
        llm_config = self.tavern_store.get_llm_config(tavern_id)
        if not llm_config or not llm_config.is_configured():
            self._mark_tavern_closed(tavern)
            return self._degraded_chat_payload(
                character_id=character_id,
                character_name=character.name,
                response_text="",
                reason="llm_not_configured",
                title="AI 后端还没配置",
                message="这间空间还没有可用的 API Key 或 Base URL。",
                action="店主可以在 AI 配置里补全连接信息并测试通过。",
                tavern_status="closed",
            )

        prompt_bundle = self._build_tavern_character_prompt(
            tavern=tavern,
            character=character,
            llm_config=llm_config,
            message=message,
            visitor_id=visitor_id,
            visitor_display_name=visitor_display_name,
            extra_context=extra_context,
        )
        prompt_result = prompt_bundle["prompt_result"]

        # Call LLM using the new llm_clients. NPC chat is LLM-only:
        # rules/public_welfare markers are configuration sentinels, not a local reply engine.
        response = None
        degradation: dict[str, Any] | None = None
        if str(llm_config.backend or "").lower() in {"rules", "rule_based", "public_welfare"}:
            return self._degraded_chat_payload(
                character_id=character_id,
                character_name=character.name,
                response_text="",
                reason="llm_not_configured",
                title="AI 后端还没配置",
                message="规则后端不是可用的 NPC LLM；这间空间需要外部模型或系统公益 LLM。",
                action="店主可以在 AI 配置里补全连接信息并测试通过。",
                tavern_status="closed",
            )
        else:
            try:
                llm_client_config = _tavern_llm_config_to_client(llm_config)
                llm_client = create_client(llm_client_config)
                response = llm_client.complete(prompt_result["messages"])
                response_text = str(getattr(response, "content", "") or "").strip()
                if not response_text:
                    raise LLMError("LLM returned an empty response")
            except LLMError as e:
                logger.warning("LLM call failed for tavern=%s character=%s: %s", tavern_id, character_id, e)
                return self._degraded_chat_payload(
                    character_id=character_id,
                    character_name=character.name,
                    response_text="",
                    reason="llm_error",
                    title="AI 后端暂时不可用",
                    message="模型调用失败，本轮没有生成 NPC 回复。",
                    action="店主可以在 AI 配置里测试连接，确认 API Key、模型名称或 Base URL。",
                    technical_detail=str(e),
                    tavern_status=tavern.status,
                    llm_config=llm_config,
                    tavern=tavern,
                )
            except Exception as e:
                logger.error(f"Unexpected error during LLM call: {e}")
                return self._degraded_chat_payload(
                    character_id=character_id,
                    character_name=character.name,
                    response_text="",
                    reason="llm_unexpected_error",
                    title="AI 回应暂时中断",
                    message="空间后端遇到异常，本轮没有生成 NPC 回复。",
                    action="稍后重试；如果持续出现，请店主重新测试 AI 配置。",
                    technical_detail=str(e),
                    tavern_status=tavern.status,
                    llm_config=llm_config,
                    tavern=tavern,
                )

        output_rule_result = apply_output_rules(response_text, tavern.output_rules)
        response_text = output_rule_result["text"]
        if output_rule_result.get("errors"):
            logger.warning(
                "Output rule errors for tavern %s: %s",
                tavern_id,
                output_rule_result.get("errors"),
            )

        # Save messages
        now = _utc_now_iso()
        user_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        self.tavern_store.add_chat_message(
            TavernChatMessage(
                id=user_message_id,
                tavern_id=tavern_id,
                character_id=character_id,
                visitor_id=visitor_id,
                visitor_name=visitor_display_name,
                role="user",
                content=saved_user_content,
                timestamp=now,
            )
        )
        self.tavern_store.add_chat_message(
            TavernChatMessage(
                id=assistant_message_id,
                tavern_id=tavern_id,
                character_id=character_id,
                visitor_id=visitor_id,
                visitor_name=visitor_display_name,
                role="assistant",
                content=response_text,
                timestamp=now,
            )
        )

        # Record token usage
        token_count = self._count_tokens(llm_config.backend, llm_config.model, message, response_text, response)
        self.tavern_store.add_token_usage(tavern_id, token_count)

        updated_visitor_state = None
        if visitor_id:
            visitor_state = self.tavern_store.get_visitor_state(tavern_id, visitor_id) or VisitorState(
                visitor_id=visitor_id,
                tavern_id=tavern_id,
                first_visit=now,
            )
            if not visitor_state.first_visit:
                visitor_state.first_visit = now
            visitor_state.last_visit = now
            if visitor_gender:
                visitor_state.gender = _normalize_gender(visitor_gender)
            visitor_state.relationship_strength = min(
                1.0,
                float(visitor_state.relationship_strength or 0.0) + 0.05,
            )
            visitor_state.relationship_stage = _relationship_stage_for(
                visitor_state.relationship_strength,
                visitor_state.visit_count,
            )
            self.tavern_store.update_visitor_state(tavern_id, visitor_state)
            updated_visitor_state = visitor_state

        # Auto-create structured memories from this chat turn
        created_memories: list[dict] = []
        if visitor_id and tavern_id:
            try:
                atoms = auto_create_memories_from_chat(
                    self.tavern_store,
                    tavern_id,
                    visitor_id,
                    character_id,
                    character.name if character else "",
                    saved_user_content,
                    response_text,
                    user_message_id=user_message_id,
                    assistant_message_id=assistant_message_id,
                    importance_threshold=0.5,
                )
                created_memories = [m.to_dict() for m in atoms]
            except Exception:
                pass  # Never interrupt chat for memory errors

        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response_text,
            "mood": "curious",
            "degraded": bool(degradation),
            "degradation": degradation,
            "response_mode": self._chat_response_mode(
                llm_config,
                tavern=tavern,
                reason=str((degradation or {}).get("reason") or ""),
            ),
            "output_rules": {
                "changed": output_rule_result.get("changed", False),
                "applied": output_rule_result.get("applied", []),
                "errors": output_rule_result.get("errors", []),
            },
            "tavern_status": "closed" if degradation else tavern.status,
            "visitor_state": updated_visitor_state.to_dict() if updated_visitor_state else None,
            "created_memories": created_memories,
            "timestamp": _now_ms(),
        }

    def _build_degradation(
        self,
        *,
        reason: str,
        title: str,
        message: str,
        action: str,
        technical_detail: str = "",
    ) -> dict[str, str]:
        detail = (technical_detail or "").strip()
        if len(detail) > 180:
            detail = f"{detail[:177]}..."
        return {
            "reason": reason,
            "title": title,
            "message": message,
            "action": action,
            "technical_detail": detail,
        }

    def _degraded_chat_payload(
        self,
        *,
        character_id: str,
        character_name: str,
        response_text: str,
        reason: str,
        title: str,
        message: str,
        action: str,
        tavern_status: str,
        technical_detail: str = "",
        llm_config: Any | None = None,
        tavern: Any | None = None,
    ) -> dict[str, Any]:
        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": response_text,
            "mood": "neutral",
            "degraded": True,
            "degradation": self._build_degradation(
                reason=reason,
                title=title,
                message=message,
                action=action,
                technical_detail=technical_detail,
            ),
            "response_mode": self._chat_response_mode(llm_config, tavern=tavern, reason=reason),
            "tavern_status": tavern_status,
            "timestamp": _now_ms(),
        }

    def _chat_response_mode(
        self,
        llm_config: Any | None = None,
        *,
        tavern: Any | None = None,
        reason: str = "",
    ) -> dict[str, Any]:
        if reason == "llm_not_configured":
            return {
                "kind": "llm_not_configured",
                "label": "AI 后端未配置",
                "message": "这间空间还没有可用模型配置；店主需要在 AI 配置页补全连接并测试通过后，NPC 才会以外部 LLM 接待。",
                "requires_owner_llm": True,
            }
        if reason in {"llm_error", "llm_unexpected_error"}:
            public_welfare_runtime = bool(tavern and _is_system_or_public_welfare_tavern_data(tavern))
            return {
                "kind": "llm_unavailable",
                "label": "AI 后端不可用",
                "message": (
                    "系统公益 LLM 调用失败，本轮没有生成 NPC 回复；请稍后重试。"
                    if public_welfare_runtime
                    else "模型调用失败，本轮没有生成 NPC 回复；请稍后重试或请店主检查模型配置。"
                ),
                "requires_owner_llm": not public_welfare_runtime,
            }
        if tavern and _is_system_or_public_welfare_tavern_data(tavern):
            return {
                "kind": "system_public_welfare_llm",
                "label": "公益 LLM",
                "message": "公益空间由系统 LLM 驱动。",
                "requires_owner_llm": False,
            }
        if llm_config and str(getattr(llm_config, "backend", "") or "").lower() in {"rules", "rule_based", "public_welfare"}:
            return self._chat_response_mode(reason="llm_not_configured")
        if reason:
            return {
                "kind": "unavailable",
                "label": "暂不可用",
                "message": "当前不能以 AI NPC 接待；请稍后再来，或联系店主检查营业状态与模型配置。",
                "requires_owner_llm": True,
            }
        return {
            "kind": "owner_llm",
            "label": "外部 LLM 模式",
            "message": "当前由店主配置的外部 LLM 驱动 NPC 对话。",
            "requires_owner_llm": True,
        }

    def _mark_tavern_closed(self, tavern) -> None:
        if not tavern or tavern.status == "closed":
            return
        tavern.status = "closed"
        try:
            self.tavern_store.update_tavern(tavern)
        except Exception as exc:
            logger.warning(f"Failed to mark tavern closed after LLM degradation: {exc}")

    def _count_tokens(
        self,
        backend: str,
        model: str,
        input_text: str,
        output_text: str,
        response,
    ) -> int:
        """
        Count tokens for input and output text.
        Uses LLM API usage data when available, falls back to TokenCounter.
        """
        if str(backend or "").lower() in {"rules", "rule_based", "public_welfare"}:
            return 0

        from fablemap_api.core.token_counter import get_counter

        total = 0
        # Try to use LLM API usage data
        if response and hasattr(response, "usage") and response.usage:
            usage = response.usage
            if isinstance(usage, dict):
                # OpenAI format: total_tokens
                if "total_tokens" in usage:
                    return usage["total_tokens"]
                # Anthropic format: input_tokens + output_tokens
                if "input_tokens" in usage:
                    total += usage["input_tokens"]
                    total += usage.get("output_tokens", 0)
                    if total > 0:
                        return total
                # Try prompt/completion tokens
                total += usage.get("prompt_tokens", 0)
                total += usage.get("completion_tokens", 0)
                if total > 0:
                    return total
            elif isinstance(usage, (int, float)):
                return int(usage)

        # Fallback: use TokenCounter
        counter = get_counter(backend)
        if backend == "claude":
            # Claude uses cl100k_base equivalent
            counter = get_counter("cl100k_base")
        total = counter.count(input_text) + counter.count(output_text)
        return total

    def test_llm_payload(
        self,
        tavern_id: str,
        llm_config_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Test LLM configuration by sending a simple prompt."""
        from fablemap_api.core.llm_clients import create_client, LLMConfig, LLMError
        from fablemap_api.core.tavern import LLMConfig as TavernLLMConfig
        from fablemap_api.core.tavern import _hydrate_system_public_welfare_llm_config

        try:
            tavern = self.tavern_store.get_tavern(tavern_id)
            if tavern:
                llm_config_data = _hydrate_system_public_welfare_llm_config(
                    tavern,
                    TavernLLMConfig.from_dict(llm_config_data),
                    tavern_id=tavern_id,
                ).to_dict_private()
            cfg = LLMConfig(
                backend=llm_config_data.get("backend", "openai"),
                model=llm_config_data.get("model", ""),
                api_key=llm_config_data.get("api_key", ""),
                base_url=llm_config_data.get("base_url", ""),
                temperature=float(llm_config_data.get("temperature", 0.8)),
                max_tokens=int(llm_config_data.get("max_tokens", 256)),
                top_p=float(llm_config_data.get("top_p", 1.0)),
                frequency_penalty=float(llm_config_data.get("frequency_penalty", 0.0)),
                presence_penalty=float(llm_config_data.get("presence_penalty", 0.0)),
            )

            if str(cfg.backend or "").strip().lower() in {"rules", "rule_based", "public_welfare"}:
                return {"ok": False, "message": "规则后端不是可用的 NPC LLM；请配置外部模型或使用系统公益 LLM。"}
            if not cfg.api_key and not cfg.base_url:
                return {"ok": False, "message": "请提供 API Key 或 Base URL"}

            client = create_client(cfg)
            test_messages = [
                {"role": "user", "content": "你好，请回复一个简单的问候。"},
            ]
            response = client.complete(test_messages)
            return {
                "ok": True,
                "message": "连接成功",
                "model": response.model,
                "preview": response.content[:200],
            }
        except LLMError as e:
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}
        except Exception as e:
            logger.error(f"test_llm failed: {e}")
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}

    def test_llm_config_payload(
        self,
        llm_config_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Test LLM configuration directly, without requiring a tavern_id."""
        from fablemap_api.core.llm_clients import create_client, LLMConfig, LLMError

        try:
            cfg = LLMConfig(
                backend=llm_config_data.get("backend", "openai"),
                model=llm_config_data.get("model", ""),
                api_key=llm_config_data.get("api_key", ""),
                base_url=llm_config_data.get("base_url", ""),
                temperature=float(llm_config_data.get("temperature", 0.8)),
                max_tokens=int(llm_config_data.get("max_tokens", 256)),
                top_p=float(llm_config_data.get("top_p", 1.0)),
                frequency_penalty=float(llm_config_data.get("frequency_penalty", 0.0)),
                presence_penalty=float(llm_config_data.get("presence_penalty", 0.0)),
            )

            if str(cfg.backend or "").strip().lower() in {"rules", "rule_based", "public_welfare"}:
                return {"ok": False, "message": "规则后端不是可用的 NPC LLM；请配置外部模型或使用系统公益 LLM。"}
            if not cfg.api_key and not cfg.base_url:
                return {"ok": False, "message": "请提供 API Key 或 Base URL"}

            client = create_client(cfg)
            test_messages = [
                {"role": "user", "content": "你好，请回复一个简单的问候。"},
            ]
            response = client.complete(test_messages)
            return {
                "ok": True,
                "message": "连接成功",
                "model": response.model,
                "preview": response.content[:200],
            }
        except LLMError as e:
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}
        except Exception as e:
            logger.error(f"test_llm_config failed: {e}")
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}

    def tavern_chat_history_payload(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str | None = None,
        user_id: str = "",
        limit: int = 50,
    ) -> dict[str, Any]:
        """Get chat history for a tavern"""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        visitor_id = str(visitor_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")

        is_owner = bool(user_id and tavern.owner_id == user_id)
        is_visitor = bool(user_id and user_id == visitor_id)
        if not is_owner and not is_visitor:
            raise HTTPException(status_code=403, detail="不能读取其他访客的聊天记录")

        if tavern.access == "private" and not is_owner:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        history_limit = _clamp_chat_history_limit(limit)
        messages = self.tavern_store.get_chat_history(
            tavern_id, visitor_id, character_id, limit=history_limit
        )
        character = next((c for c in tavern.characters if c.id == character_id), None) if character_id else None
        visitor_name = next((m.visitor_name for m in reversed(messages) if getattr(m, "visitor_name", "")), "")
        return {
            "tavern_id": tavern_id,
            "tavern_name": tavern.name,
            "visitor_id": visitor_id,
            "visitor_name": visitor_name,
            "character_id": character_id,
            "character_name": character.name if character else "",
            "messages": [m.to_dict() for m in messages],
            "count": len(messages),
            "limit": history_limit,
        }

    def _inject_managed_taverns(self, payload: dict[str, Any], center_lat: float, center_lon: float, radius: int):
        """Inject managed taverns into the POI list of a nearby result."""
        managed_taverns = self.writeback.store.get_taverns()
        if not managed_taverns:
            return

        world = payload.get("world")
        if not world or not isinstance(world, dict):
            return

        pois = world.setdefault("pois", [])
        
        # Simple distance check for injection (radius is in meters, but we use degree expansion for speed)
        # 1 deg approx 111000 meters
        deg_radius = radius / 111000.0
        
        for tid, data in managed_taverns.items():
            t_lat = data.get("lat")
            t_lon = data.get("lon")
            if t_lat is None or t_lon is None:
                continue
            
            if abs(t_lat - center_lat) <= deg_radius and abs(t_lon - center_lon) <= deg_radius:
                # Convert managed tavern to POI format
                poi = {
                    "id": data["id"],
                    "osm_type": "managed_tavern",
                    "real_name": data["name"],
                    "fantasy_name": data["name"],
                    "fantasy_type": "managed_tavern",
                    "position": {"lat": t_lat, "lon": t_lon},
                    "description": data.get("description", ""),
                    "faction_alignment": "neutral",
                    "managed": True,
                    "visual_hint": {
                        "style": "managed_gold",
                        "palette": "gold_and_black",
                    }
                }
                # Check if already exists by ID
                if not any(p.get("id") == poi["id"] for p in pois):
                    pois.append(poi)

    def chat_response_payload(
        self,
        character_id: str,
        message: str,
        world_id: str,
        poi_id: str,
        player_id: str,
        history: list,
    ) -> dict[str, Any]:
        """Generate a character response and persist the chat exchange to writeback."""
        from ..writeback import _utc_now_iso

        # Save player's message to writeback
        self.writeback.add_chat_message(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            role="player",
            content=message,
        )

        # Determine character archetype and mood from the message
        archetype, mood, character_name, character_description = self._derive_character_info(
            character_id, world_id
        )

        # Generate response based on archetype
        response = _generate_response(archetype, mood, message, character_description)

        # Save character's response to writeback
        char_msg = self.writeback.add_chat_message(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            role="character",
            content=response,
        )

        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": response,
            "mood": mood,
            "archetype": archetype,
            "poi_id": poi_id,
            "timestamp": _now_ms(),
            "character_message": char_msg,
        }

    def chat_history_payload(
        self,
        player_id: str,
        poi_id: str,
        character_id: str | None = None,
    ) -> dict[str, Any]:
        """Get chat history for a player + POI (optionally filtered by character)."""
        messages = self.writeback.get_chat_history(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            limit=50,
        )
        return {
            "player_id": player_id,
            "poi_id": poi_id,
            "character_id": character_id,
            "messages": messages,
            "count": len(messages),
        }

    def _derive_character_info(self, character_id: str, world_id: str) -> tuple[str, str, str, str]:
        """Derive archetype, mood, name, and description from faction data."""
        import json
        from ..writeback import _utc_now_iso

        world = {}
        try:
            # Try to find world JSON in output root
            for f in self.settings.output_root.glob(f"{world_id}/*.json"):
                try:
                    data = json.loads(f.read_text("utf-8"))
                    if data.get("world_id") == world_id or data.get("world_id"):
                        world = data
                        break
                except Exception:
                    continue
        except Exception:
            pass

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

        # If character_id looks like a POI-based character (not faction)
        if character_id.startswith("char_") or character_id.startswith("npc_"):
            archetype = "wanderer"
            mood = "mysterious"
            character_name = "旅人"
            character_description = ""

        return archetype, mood, character_name, character_description

    # ─── Quick Reply Manager ──────────────────────────────────────────────

    def get_quick_reply_manager(self):
        """Get the quick reply manager (lazy initialization)."""
        if not hasattr(self, "_quick_reply_manager"):
            from fablemap_api.core.quick_replies import QuickReplyManager
            self._quick_reply_manager = QuickReplyManager()
            # Load from storage if available
            storage_path = self.settings.output_root / "quick_replies.json"
            self._quick_reply_manager.load_from_file(storage_path)
        return self._quick_reply_manager

    # ─── Command Manager ──────────────────────────────────────────────────

    def get_command_manager(self):
        """Get the slash command manager (lazy initialization)."""
        if not hasattr(self, "_command_manager"):
            from fablemap_api.core.slash_commands import get_command_manager
            self._command_manager = get_command_manager()
        return self._command_manager

    # ─── Extension Manager ────────────────────────────────────────────────

    def get_extension_manager(self):
        """Get the extension manager (lazy initialization)."""
        if not hasattr(self, "_extension_manager"):
            from fablemap_api.core.extensions import get_extension_manager
            self._extension_manager = get_extension_manager()
        return self._extension_manager

    # ─── Group Chat API ──────────────────────────────────────────────────

    def get_group_chat_config_payload(
        self,
        tavern_id: str,
        user_id: str = "",
    ) -> dict[str, Any]:
        """Get group chat status and config for a tavern."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        return {
            "tavern_id": tavern_id,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": tavern.group_chat_config,
            "characters": [
                {
                    "id": c.id,
                    "name": c.name,
                    "talkativeness": c.talkativeness,
                    "avatar": c.avatar or (c.sprites.get("neutral") if c.sprites else ""),
                }
                for c in tavern.characters
            ],
            "character_count": len(tavern.characters),
        }

    def update_group_chat_config_payload(
        self,
        tavern_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        """Update group chat config (owner only)."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        data = data or {}

        # Update group chat enabled
        if "group_chat_enabled" in data:
            tavern.group_chat_enabled = _normalize_bool(data["group_chat_enabled"])

        # Update group chat config
        if "group_chat_config" in data and isinstance(data["group_chat_config"], dict):
            config = {**(tavern.group_chat_config or {}), **data["group_chat_config"]}
            tavern.group_chat_config = _normalize_group_chat_config(config)

        # Update character talkativeness
        if "character_talkativeness" in data and isinstance(data["character_talkativeness"], dict):
            for char_id, talkativeness in data["character_talkativeness"].items():
                char = next((c for c in tavern.characters if c.id == char_id), None)
                if char:
                    char.talkativeness = _normalize_talkativeness(talkativeness)

        self.tavern_store.update_tavern(tavern)

        return {
            "ok": True,
            "group_chat_enabled": tavern.group_chat_enabled,
            "group_chat_config": tavern.group_chat_config,
            "characters": [
                {
                    "id": c.id,
                    "name": c.name,
                    "talkativeness": c.talkativeness,
                    "avatar": c.avatar or (c.sprites.get("neutral") if c.sprites else ""),
                }
                for c in tavern.characters
            ],
        }

    def _ensure_group_chat_visitor_scope(
        self,
        tavern: Any,
        user_id: str,
        visitor_id: str,
        *,
        allow_owner_all: bool = False,
    ) -> None:
        """Enforce the same visitor/owner boundary used by single chat."""
        user_id = str(user_id or "").strip()
        visitor_id = str(visitor_id or "").strip()
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少访客身份")
        if getattr(tavern, "owner_id", "") == user_id:
            if visitor_id or allow_owner_all:
                return
        if visitor_id and visitor_id == user_id:
            return
        raise HTTPException(status_code=403, detail="不能访问其他访客的群聊会话")

    def _parse_group_chat_timestamp(self, value: str):
        from datetime import UTC, datetime

        text = str(value or "").strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)

    def _group_chat_cooled_character_ids(
        self,
        history: list[Any],
        *,
        cooldown_seconds: int,
        now_iso: str,
    ) -> set[str]:
        if cooldown_seconds <= 0:
            return set()
        now_dt = self._parse_group_chat_timestamp(now_iso)
        if now_dt is None:
            return set()
        cooled: set[str] = set()
        for message in reversed(history):
            if getattr(message, "role", "") != "assistant":
                continue
            message_dt = self._parse_group_chat_timestamp(getattr(message, "timestamp", ""))
            if message_dt is None:
                continue
            elapsed = (now_dt - message_dt).total_seconds()
            if 0 <= elapsed < cooldown_seconds:
                cooled.add(str(getattr(message, "character_id", "") or ""))
            elif elapsed >= cooldown_seconds:
                break
        return cooled

    def _seed_group_round_robin_selector(self, manager: Any, active_character_ids: list[str], history: list[Any]) -> None:
        if getattr(manager, "strategy", "") != "round_robin" or not active_character_ids:
            return
        for message in reversed(history):
            character_id = str(getattr(message, "character_id", "") or "")
            if getattr(message, "role", "") == "assistant" and character_id in active_character_ids:
                manager.selector._round_robin_index = (active_character_ids.index(character_id) + 1) % len(active_character_ids)
                return

    def send_group_chat_payload(
        self,
        tavern_id: str,
        message: str,
        visitor_id: str,
        visitor_name: str = "",
        user_id: str = "",
        display_message: str = "",
    ) -> dict[str, Any]:
        """Send a group chat message and get responses from multiple characters."""
        from fablemap_api.core.group_chat import GroupChatManager, GroupMember
        from fablemap_api.core.tavern import ChatMessage as TavernChatMessage, VisitorState

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        visitor_id = str(visitor_id or user_id or "").strip()
        user_id = str(user_id or "").strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="缺少访客身份")
        self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id)

        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        # Check if group chat is enabled
        if not tavern.group_chat_enabled:
            raise HTTPException(status_code=400, detail="群聊未启用")

        if not tavern.characters:
            raise HTTPException(status_code=400, detail="空间没有角色")

        # Check if tavern is open
        if tavern.status != "open":
            return {
                "messages": [],
                "error": "空间正在歇业",
                "degraded": True,
            }

        # Get LLM config
        llm_config = self.tavern_store.get_llm_config(tavern_id)
        if not llm_config or not llm_config.is_configured():
            return {
                "messages": [],
                "error": "AI 后端还没配置",
                "degraded": True,
            }

        # Create group chat manager
        manager = GroupChatManager()
        manager.strategy = tavern.group_chat_config.get("strategy", "balanced")
        manager.set_max_responses_per_turn(tavern.group_chat_config.get("max_responses_per_turn", 2))

        now = _utc_now_iso()
        display_message = str(display_message or "").strip()
        saved_user_content = display_message or message

        # Get persisted group-visible history before saving the current user
        # message. PromptBuilder receives the current message separately, so this
        # avoids duplicating the latest visitor turn while still preserving prior
        # group replies for speaker selection and context.
        history = self._group_chat_history_messages(tavern, visitor_id, limit=30)

        cooldown_seconds = int((tavern.group_chat_config or {}).get("response_cooldown_seconds", 0) or 0)
        cooled_character_ids = self._group_chat_cooled_character_ids(
            history,
            cooldown_seconds=cooldown_seconds,
            now_iso=now,
        )

        # Add characters as members
        for char in tavern.characters:
            manager.add_member(GroupMember(
                character_id=char.id,
                name=char.name,
                talkativeness=0.0 if char.id in cooled_character_ids else char.talkativeness,
                avatar_url=char.avatar or (char.sprites.get("neutral") if char.sprites else ""),
            ))

        # Add user as member
        visitor_display_name = _normalize_visitor_name(visitor_name) or "旅人"
        manager.add_member(GroupMember(
            character_id="user",
            name=visitor_display_name,
            talkativeness=1.0,
            is_user=True,
        ))

        # Add user message to selector-local context and persisted group history.
        manager.add_user_message(message)
        current_user_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        self.tavern_store.add_chat_message(TavernChatMessage(
            id=current_user_message_id,
            tavern_id=tavern_id,
            character_id="_group",
            visitor_id=visitor_id,
            role="user",
            content=saved_user_content,
            timestamp=now,
            visitor_name=visitor_display_name,
            token_count=0,
        ))

        # Select speakers
        active_character_ids = [
            member.character_id
            for member in manager.members
            if not member.is_user and not member.is_narrator and member.talkativeness > 0
        ]
        self._seed_group_round_robin_selector(manager, active_character_ids, history)
        speakers = manager.select_next_speakers()
        responses = []
        total_token_count = 0
        turn_degraded = False

        for speaker in speakers:
            if speaker.is_user:
                continue

            # Find character in tavern
            char = next((c for c in tavern.characters if c.id == speaker.character_id), None)
            if not char:
                continue

            response = None
            degradation: dict[str, Any] | None = None
            try:
                prompt_bundle = self._build_tavern_character_prompt(
                    tavern=tavern,
                    character=char,
                    llm_config=llm_config,
                    message=(
                        f"{visitor_display_name}: {message}"
                        if tavern.group_chat_config.get("require_name_prefix", True)
                        else message
                    ),
                    visitor_id=visitor_id,
                    visitor_display_name=visitor_display_name,
                    history_messages=history[-30:],
                )
                prompt_result = prompt_bundle["prompt_result"]

                if str(llm_config.backend or "").lower() in {"rules", "rule_based", "public_welfare"}:
                    turn_degraded = True
                    degradation = self._build_degradation(
                        reason="llm_not_configured",
                        title="AI 后端还没配置",
                        message="规则后端不是可用的 NPC LLM；本轮该 NPC 没有生成回复。",
                        action="店主可以在 AI 配置里补全连接信息并测试通过。",
                    )
                    continue
                client = create_client(_tavern_llm_config_to_client(llm_config))
                response = client.complete(prompt_result["messages"])
                response_text = str(getattr(response, "content", "") or "").strip()
                if not response_text:
                    raise LLMError("LLM returned an empty response")
            except LLMError as e:
                logger.warning(f"Group chat LLM error for {speaker.character_id}: {e}")
                turn_degraded = True
                degradation = self._build_degradation(
                    reason="llm_error",
                    title="AI 后端暂时不可用",
                    message="模型调用失败，本轮该 NPC 没有生成回复。",
                    action="店主可以在 AI 配置里测试连接，确认 API Key、模型名称或 Base URL。",
                    technical_detail=str(e),
                )
                continue
            except Exception as e:
                logger.error(f"Unexpected group chat error for {speaker.character_id}: {e}")
                turn_degraded = True
                degradation = self._build_degradation(
                    reason="llm_unexpected_error",
                    title="AI 回应暂时中断",
                    message="群聊后端遇到异常，本轮该 NPC 没有生成回复。",
                    action="稍后重试；如果持续出现，请店主重新测试 AI 配置。",
                    technical_detail=str(e),
                )
                continue

            output_rule_result = apply_output_rules(response_text, tavern.output_rules)
            response_text = output_rule_result["text"]
            if output_rule_result.get("errors"):
                logger.warning(
                    "Group chat output rule errors for tavern %s: %s",
                    tavern_id,
                    output_rule_result.get("errors"),
                )

            token_count = self._count_tokens(llm_config.backend, llm_config.model, message, response_text, response)
            total_token_count += token_count

            # Add response to manager and collect
            manager.add_assistant_message(speaker.character_id, response_text, speaker.name)
            response_timestamp = _utc_now_iso()

            # Save to chat history
            assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
            tavern_msg = TavernChatMessage(
                id=assistant_message_id,
                tavern_id=tavern_id,
                character_id=speaker.character_id,
                visitor_id=visitor_id,
                role="assistant",
                content=response_text,
                timestamp=response_timestamp,
                visitor_name=visitor_display_name,
                token_count=token_count,
            )
            self.tavern_store.add_chat_message(tavern_msg)
            history.append(tavern_msg)

            response_payload = {
                "id": assistant_message_id,
                "character_id": speaker.character_id,
                "character_name": speaker.name,
                "avatar": speaker.avatar_url,
                "content": response_text,
                "timestamp": response_timestamp,
                "degraded": bool(degradation),
                "output_rules": {
                    "changed": output_rule_result.get("changed", False),
                    "applied": output_rule_result.get("applied", []),
                    "errors": output_rule_result.get("errors", []),
                },
            }
            if degradation:
                response_payload["degradation"] = degradation
            responses.append(response_payload)

        # Update token usage
        if total_token_count > 0:
            self.tavern_store.add_token_usage(tavern_id, total_token_count)

        updated_visitor_state = None
        if visitor_id:
            visitor_state = self.tavern_store.get_visitor_state(tavern_id, visitor_id) or VisitorState(
                visitor_id=visitor_id,
                tavern_id=tavern_id,
                first_visit=now,
            )
            if not visitor_state.first_visit:
                visitor_state.first_visit = now
            visitor_state.last_visit = now
            visitor_state.relationship_strength = min(
                1.0,
                float(visitor_state.relationship_strength or 0.0) + 0.05,
            )
            visitor_state.relationship_stage = _relationship_stage_for(
                visitor_state.relationship_strength,
                visitor_state.visit_count,
            )
            self.tavern_store.update_visitor_state(tavern_id, visitor_state)
            updated_visitor_state = visitor_state

        if not responses:
            return {
                "messages": [],
                "speaker_count": 0,
                "strategy": manager.strategy,
                "error": "群聊角色暂时没有回应",
                "degraded": True,
                "visitor_state": updated_visitor_state.to_dict() if updated_visitor_state else None,
                "created_memories": [],
            }

        created_memories: list[dict] = []
        if visitor_id and tavern_id:
            try:
                assistant_text = "\n".join(
                    f"{response.get('character_name') or '群聊角色'}: {response.get('content') or ''}".strip()
                    for response in responses
                    if response.get("content")
                )
                assistant_message_ids = [str(response.get("id") or "") for response in responses if response.get("id")]
                atoms = auto_create_memories_from_chat(
                    self.tavern_store,
                    tavern_id,
                    visitor_id,
                    "",
                    "群聊",
                    saved_user_content,
                    assistant_text,
                    user_message_id=current_user_message_id,
                    assistant_message_id=assistant_message_ids[0] if assistant_message_ids else "",
                    importance_threshold=0.5,
                )
                created_memories = [m.to_dict() for m in atoms]
            except Exception:
                pass  # Never interrupt group chat for memory errors

        return {
            "messages": responses,
            "speaker_count": len(responses),
            "strategy": manager.strategy,
            "degraded": turn_degraded,
            "visitor_state": updated_visitor_state.to_dict() if updated_visitor_state else None,
            "created_memories": created_memories,
        }

    def _group_chat_history_messages(self, tavern: Any, visitor_id: str, *, limit: int = 50) -> list[Any]:
        """Return recent group-chat-visible messages across character files."""
        character_ids = {c.id for c in getattr(tavern, "characters", [])}
        character_ids.add("_group")
        sessions = self.tavern_store.list_chat_sessions(
            tavern.id,
            visitor_id=visitor_id,
            limit=None,
        )
        messages: list[Any] = []
        for session in sessions:
            for message in session.get("messages", []):
                if message.character_id in character_ids:
                    messages.append(message)
        messages.sort(key=lambda item: (item.timestamp or "", item.id or ""))
        return messages[-limit:]

    def get_group_chat_history_payload(
        self,
        tavern_id: str,
        visitor_id: str = "",
        user_id: str = "",
        limit: int = 50,
    ) -> dict[str, Any]:
        """Get group chat history."""
        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        requested_visitor_id = str(visitor_id or "").strip()
        user_id = str(user_id or "").strip()
        if requested_visitor_id:
            visitor_id = requested_visitor_id
            self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id, allow_owner_all=True)
        elif getattr(tavern, "owner_id", "") == user_id:
            visitor_id = ""
            self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id, allow_owner_all=True)
        else:
            visitor_id = user_id
            self._ensure_group_chat_visitor_scope(tavern, user_id, visitor_id)

        # Check access
        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        # Get chat history
        history = self._group_chat_history_messages(
            tavern,
            visitor_id,
            limit=_clamp_chat_history_limit(limit),
        )

        messages = []
        for m in history:
            char = next((c for c in tavern.characters if c.id == m.character_id), None)
            if m.character_id == "_group":
                char_name = m.visitor_name or "旅人"
            else:
                char_name = char.name if char else m.character_id

            messages.append({
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "character_id": m.character_id,
                "character_name": char_name,
                "visitor_name": m.visitor_name,
                "timestamp": m.timestamp,
            })

        return {
            "messages": messages,
            "message_count": len(messages),
        }

    # ─── Preset Manager ───────────────────────────────────────────────────

    def get_preset_manager(self):
        """Get the LLM preset manager (lazy initialization)."""
        if not hasattr(self, "_preset_manager"):
            from fablemap_api.core.presets import PresetManager
            storage_path = self.settings.output_root / "presets.json"
            self._preset_manager = PresetManager(storage_path)
        return self._preset_manager


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





def _utc_now_iso() -> str:
    from datetime import UTC, datetime
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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
