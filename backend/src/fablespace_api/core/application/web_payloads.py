from __future__ import annotations

from typing import Any

from fablespace_api.core.behavior_compiler import BehaviorCompiler, build_trace
from fablespace_api.core.city_persona import CityPersonaAgent
from fablespace_api.core.scene_capsule import CapsuleInput, SceneCapsuleGenerator


def record_memory_graph_event(memory_graph: Any, event: dict[str, Any]) -> None:
    """Write writeback event data into the memory graph."""
    event_type = str(event.get("event_type") or "observe")
    player_id = str(event.get("player_id") or "player_local")
    target = event.get("target") or {}
    poi_id = str(target.get("target_id") or "unknown_target")

    memory_graph.record_observation(player_id, poi_id)

    if event_type == "dwell":
        player_state = event.get("player_state") or {}
        duration = float(player_state.get("clarity") or event.get("duration") or 0.0)
        memory_graph.record_dwell(player_id, poi_id, duration)
    elif event_type == "mark":
        content = str(target.get("content") or "")
        emotion = str(target.get("emotion") or event.get("emotion") or "neutral")
        memory_graph.record_mark(player_id, poi_id, content, emotion)


def build_behavior_insights(*, payload: dict[str, Any], memory_graph: Any) -> dict[str, Any]:
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
    persona = CityPersonaAgent().generate(meaning)

    player_id_str = str(event.get("player_id") or "player_local")
    history = memory_graph.get_player_history(player_id_str, target_id)
    real_visit_count = history.visit_count if history else 1
    real_dwell_seconds = history.total_dwell_time if history else duration
    real_mark_count = len(history.marks) if history else (1 if action == "mark" else 0)
    poi_echoes = memory_graph.get_poi_echoes(target_id)
    real_echo_count = len(poi_echoes)

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


def build_orchestrate_payload(*, result: Any, relationship_strength: float) -> dict[str, Any]:
    return {
        "observer_effect": {
            "poi_id": result.observer_effect.poi_id,
            "observer_count": result.observer_effect.observer_count,
            "world_density": result.observer_effect.world_density,
            "rarity_level": result.observer_effect.rarity_level,
        },
        "broadcasts": result.broadcast_suggestions,
        "events": [{"type": event.type, "priority": event.priority} for event in result.event_suggestions],
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
        "relationship_strength": relationship_strength,
        "fallback_triggered": result.fallback_triggered,
    }
