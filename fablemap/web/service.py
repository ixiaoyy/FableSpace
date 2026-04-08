from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

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


def _is_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False
