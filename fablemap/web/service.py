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
            # AIO3: write event into WorldMemoryGraph
            self._record_memory_graph_event(event)
            payload["behavior_insights"] = self._build_behavior_insights(payload)
            return payload
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def _record_memory_graph_event(self, event: dict[str, Any]) -> None:
        """Write event data into WorldMemoryGraph (AIO3 write-through)"""
        event_type = str(event.get("event_type") or "observe")
        player_id = str(event.get("player_id") or "player_local")
        target = event.get("target") or {}
        poi_id = str(target.get("target_id") or "unknown_target")

        # Always record the observation/visit
        self.memory_graph.record_observation(player_id, poi_id)

        if event_type == "dwell":
            player_state = event.get("player_state") or {}
            duration = float(player_state.get("clarity") or event.get("duration") or 0.0)
            self.memory_graph.record_dwell(player_id, poi_id, duration)

        elif event_type == "mark":
            content = str(target.get("content") or "")
            emotion = str(target.get("emotion") or event.get("emotion") or "neutral")
            self.memory_graph.record_mark(player_id, poi_id, content, emotion)

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

        # AIO5: city persona
        from ..city_persona import CityPersonaAgent
        persona = CityPersonaAgent().generate(meaning)

        # AIO3: read real accumulated state from memory graph
        player_id_str = str(event.get("player_id") or "player_local")
        history = self.memory_graph.get_player_history(player_id_str, target_id)
        real_visit_count = history.visit_count if history else 1
        real_dwell_seconds = history.total_dwell_time if history else duration
        real_mark_count = len(history.marks) if history else (1 if action == "mark" else 0)
        poi_echoes = self.memory_graph.get_poi_echoes(target_id)
        real_echo_count = len(poi_echoes)

        # AIO6: scene capsule
        from ..scene_capsule import SceneCapsuleGenerator, CapsuleInput
        capsule_input = CapsuleInput(
            player_id=player_id_str,
            poi_id=target_id,
            district_type=district_type,
            persona=persona,
            dwell_seconds=real_dwell_seconds,
            visit_count=real_visit_count,
            mark_count=real_mark_count,
            echo_count=real_echo_count,
            writeback_count=int(place_state.get("stored_events") or 1),
        )
        capsule = SceneCapsuleGenerator().generate(capsule_input)

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
            "visit_count": real_visit_count,
            "total_dwell_seconds": real_dwell_seconds,
            "mark_count": real_mark_count,
            "echo_count": real_echo_count,
            "city_persona": {
                "address": persona.address,
                "emotional_tone": persona.emotional_tone,
                "greeting": persona.greeting,
                "response_bias": persona.response_bias,
                "trust_level": round(persona.trust_level, 3),
                "persona_tags": persona.persona_tags,
            },
            "scene_capsule": {
                "capsule_type": capsule.capsule_type,
                "title": capsule.title,
                "narrative": capsule.narrative,
                "summary": capsule.summary,
                "trigger_source": capsule.trigger_source,
                "asset_pack_hint": capsule.asset_pack_hint,
                "render_mode": capsule.render_mode,
                "visibility": capsule.visibility,
                "ttl_seconds": capsule.ttl_seconds,
                "confidence": capsule.confidence,
                "is_fallback": capsule.is_fallback,
            } if capsule.capsule_type != "null" else None,
        }

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

            return {
                "observer_effect": {
                    "poi_id": result.observer_effect.poi_id,
                    "observer_count": result.observer_effect.observer_count,
                    "world_density": result.observer_effect.world_density,
                    "rarity_level": result.observer_effect.rarity_level,
                },
                "broadcasts": result.broadcast_suggestions,
                "events": [{"type": e.type, "priority": e.priority} for e in result.event_suggestions],
                "lens_output": {
                    "lens_id": result.lens_output.lens_id,
                    "label": result.lens_output.label,
                    "tone": result.lens_output.tone,
                    "asset_pack_hint": result.lens_output.asset_pack_hint,
                    "visibility_bias": result.lens_output.visibility_bias,
                    "ui_filter_hint": result.lens_output.ui_filter_hint,
                } if result.lens_output else None,
                "city_persona": {
                    "address": result.city_persona.address,
                    "emotional_tone": result.city_persona.emotional_tone,
                    "greeting": result.city_persona.greeting,
                    "response_bias": result.city_persona.response_bias,
                    "trust_level": result.city_persona.trust_level,
                    "persona_tags": result.city_persona.persona_tags,
                } if result.city_persona else None,
                "scene_capsule": {
                    "capsule_type": result.scene_capsule.capsule_type,
                    "title": result.scene_capsule.title,
                    "narrative": result.scene_capsule.narrative,
                    "summary": result.scene_capsule.summary,
                    "trigger_source": result.scene_capsule.trigger_source,
                    "render_mode": result.scene_capsule.render_mode,
                    "asset_pack_hint": result.scene_capsule.asset_pack_hint,
                    "visibility": result.scene_capsule.visibility,
                    "ttl_seconds": result.scene_capsule.ttl_seconds,
                    "confidence": result.scene_capsule.confidence,
                    "is_fallback": result.scene_capsule.is_fallback,
                    "text_blocks": [
                        {"role": block.role, "text": block.text, "tone": block.tone}
                        for block in result.scene_capsule.text_blocks
                    ],
                    "visual_hints": [
                        {"hint_type": hint.hint_type, "intensity": hint.intensity, "anchor": hint.anchor}
                        for hint in result.scene_capsule.visual_hints
                    ],
                    "interaction_hooks": [
                        {"action_id": hook.action_id, "label": hook.label, "target_ref": hook.target_ref}
                        for hook in result.scene_capsule.interaction_hooks
                    ],
                } if result.scene_capsule and result.scene_capsule.capsule_type != "null" else None,
                "relationship_strength": relationship,
                "fallback_triggered": result.fallback_triggered,
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
