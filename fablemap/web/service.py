from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from fablemap.api_service import build_health_payload, build_meta_payload, build_nearby_payload
from fablemap.nearby import generate_nearby_preview
from fablemap.writeback import WritebackEngine, WritebackStore
from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator
from fablemap.memory_graph import WorldMemoryGraph
from fablemap.behavior_compiler import BehaviorCompiler, build_trace

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
            payload["behavior_insights"] = self._build_behavior_insights(payload)
            return payload
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def _build_behavior_insights(self, payload: dict[str, Any]) -> dict[str, Any]:
        event = payload.get("event") or {}
        target = event.get("target") or {}
        world_feedback = payload.get("world_feedback") or {}
        place_state = payload.get("place_state") or {}
        player_state = payload.get("player_state") or {}

        action = str(event.get("event_type") or "observe")
        target_id = str(target.get("target_id") or "unknown_target")
        district_type = "memory_grove" if action == "mark" else "healing_oasis" if action == "dwell" else "commercial_core"
        lens_id = "oracle" if event.get("visibility") == "global" else "chronicle" if event.get("visibility") == "local_public" else "hearth"
        duration = float(player_state.get("clarity") or 0.0)

        compiler = BehaviorCompiler()
        trace = build_trace(
            str(event.get("player_id") or "player_local"),
            [{
                "action": "co_create" if action == "mark" and event.get("visibility") != "private" else action,
                "target_id": target_id,
                "district_type": district_type,
                "duration": duration,
                "lens_id": lens_id,
                "timestamp": 0.0,
            }],
        )
        meaning = compiler.compile(trace)
        return {
            "dominant_meaning": meaning.dominant_meaning,
            "myth_entry": meaning.myth_entry,
            "dominant_district": meaning.dominant_district,
            "explorer_score": meaning.explorer_score,
            "chronicler_score": meaning.chronicler_score,
            "restorer_score": meaning.restorer_score,
            "recluse_score": meaning.recluse_score,
            "resonant_score": meaning.resonant_score,
            "action_counts": meaning.action_counts,
            "feedback_summary": world_feedback.get("summary"),
            "familiarity": place_state.get("familiarity"),
        }

    def orchestrate_world(self, slice_id: str, player_id: str, lat: float, lon: float) -> dict[str, Any]:
        """Orchestrate world based on player state"""
        try:
            # Get POI memory
            poi_memory = self.memory_graph.get_poi_memory(slice_id)
            observer_count = poi_memory.total_observers if poi_memory else 1

            world_state = {"slice_id": slice_id, "observer_count": observer_count, "pois": []}
            player_state = {"player_id": player_id, "lat": lat, "lon": lon}

            # Record observation
            self.memory_graph.record_observation(player_id, slice_id)

            # Run orchestration
            result = self.orchestrator.orchestrate(world_state, player_state)

            # Get relationship strength
            relationship = self.memory_graph.calculate_relationship_strength(player_id, slice_id)

            return {
                "observer_effect": {
                    "poi_id": result.observer_effect.poi_id,
                    "observer_count": result.observer_effect.observer_count,
                    "world_density": result.observer_effect.world_density,
                    "rarity_level": result.observer_effect.rarity_level,
                },
                "broadcasts": result.broadcast_suggestions,
                "events": [{"type": e.type, "priority": e.priority} for e in result.event_suggestions],
                "relationship_strength": relationship,
            }
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



def _is_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False
