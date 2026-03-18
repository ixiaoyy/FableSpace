"""Rule-based Orchestrator Engine"""
from typing import List, Dict
from datetime import datetime
from .schemas import OrchestratorOutput, EventSuggestion, ObserverEffect
from ..dynamic_signals import get_time_signals, get_mock_signals
from ..district_classifier import identify_district_type, get_district_mood
from ..lens_engine import LensEngine, build_vibe_profile
from ..behavior_compiler import BehaviorCompiler, build_trace
from ..city_persona import CityPersonaAgent
from ..scene_capsule import SceneCapsuleGenerator, CapsuleInput

class RuleBasedOrchestrator:
    def __init__(self):
        self.rules = []

    def orchestrate(self, world_state: dict, player_state: dict) -> OrchestratorOutput:
        """Execute rule-based orchestration"""
        start_time = datetime.now()

        # Get dynamic signals
        signals = get_mock_signals(world_state.get("slice_id", "default"))

        # Identify district type
        pois = world_state.get("pois", [])
        district_type = identify_district_type(pois)
        district_mood = get_district_mood(district_type, signals.time_of_day)

        # Calculate observer effect
        observer_effect = self._calculate_observer_effect(world_state)

        # Generate event suggestions
        events = self._generate_events(world_state, player_state, observer_effect, district_type, signals)

        # Rank POIs
        poi_ranking = self._rank_pois(world_state, observer_effect)

        # Generate broadcasts
        broadcasts = self._generate_broadcasts(world_state, observer_effect, district_type, district_mood)

        # Compute lens output
        vibe = build_vibe_profile(
            district_type=district_type,
            time_of_day=signals.time_of_day,
            observer_density=observer_effect.world_density,
            player_attunement=float(player_state.get("attunement", 0.0)),
            weather=signals.weather,
            is_holiday=signals.is_holiday,
            mark_count=int(player_state.get("mark_count", 0)),
            echo_count=int(player_state.get("echo_count", 0)),
        )
        lens_output = LensEngine().resolve_lens(vibe)

        # Compile behavior trace into meaning vector
        raw_events = player_state.get("behavior_events", [])
        meaning_vector = None
        if raw_events:
            trace = build_trace(player_state.get("player_id", "unknown"), raw_events)
            meaning_vector = BehaviorCompiler().compile(trace)

        # Generate city persona from meaning vector
        city_persona = None
        if meaning_vector is not None:
            city_persona = CityPersonaAgent().generate(meaning_vector)

        # Generate scene capsule from current orchestration context
        capsule_input = CapsuleInput(
            player_id=player_state.get("player_id", "unknown"),
            poi_id=world_state.get("center_poi") or (pois[0].get("id") if pois else "unknown"),
            district_type=district_type,
            persona=city_persona,
            lens=lens_output,
            dwell_seconds=float(player_state.get("dwell_seconds", 0.0)),
            visit_count=int(player_state.get("visit_count", 1)),
            writeback_count=int(player_state.get("writeback_count", 0)),
            mark_count=int(player_state.get("mark_count", 0)),
            echo_count=int(player_state.get("echo_count", 0)),
            event_types=[event.type for event in events],
            visibility=str(player_state.get("capsule_visibility", "private")),
        )
        scene_capsule = SceneCapsuleGenerator().generate(capsule_input)

        fallback_triggered = bool(scene_capsule and scene_capsule.is_fallback)

        return OrchestratorOutput(
            event_suggestions=events,
            poi_ranking=poi_ranking,
            broadcast_suggestions=broadcasts,
            observer_effect=observer_effect,
            lens_output=lens_output,
            meaning_vector=meaning_vector,
            city_persona=city_persona,
            scene_capsule=scene_capsule,
            confidence_score=0.7,
            fallback_triggered=fallback_triggered,
            stage="orchestrate",
            status="completed",
            started_at=start_time,
            completed_at=datetime.now()
        )

    def _calculate_observer_effect(self, world_state: dict) -> ObserverEffect:
        """Calculate observer effect based on player count"""
        # Mock implementation
        observer_count = world_state.get("observer_count", 1)

        if observer_count == 1:
            density = 0.2
        elif observer_count <= 5:
            density = 0.4
        elif observer_count <= 10:
            density = 0.6
        elif observer_count <= 20:
            density = 0.8
        else:
            density = 1.0

        if density < 0.3:
            rarity = "common"
        elif density < 0.6:
            rarity = "uncommon"
        elif density < 0.8:
            rarity = "rare"
        else:
            rarity = "legendary"

        return ObserverEffect(
            poi_id=world_state.get("center_poi", "unknown"),
            observer_count=observer_count,
            world_density=density,
            rarity_level=rarity,
            density_change=0.0
        )

    def _generate_events(self, world_state: dict, player_state: dict,
                        observer_effect: ObserverEffect, district_type: str, signals) -> List[EventSuggestion]:
        """Generate event suggestions based on rules"""
        events = []

        # High density triggers special events
        if observer_effect.world_density > 0.6:
            events.append(EventSuggestion(
                type="special_event",
                target="global",
                priority=8,
                visibility="local_public"
            ))

        # Night + edge_rift = anomaly
        if signals.time_of_day == "night" and district_type == "edge_rift":
            events.append(EventSuggestion(
                type="anomaly_detected",
                target="district",
                priority=7,
                visibility="local_public"
            ))

        # Rainy + healing_oasis = spirit spawn
        if signals.weather == "rainy" and district_type == "healing_oasis":
            events.append(EventSuggestion(
                type="spirit_spawn",
                target="zone",
                priority=6,
                visibility="local_public"
            ))

        return events

    def _rank_pois(self, world_state: dict, observer_effect: ObserverEffect) -> List[dict]:
        """Rank POIs based on observer effect"""
        pois = world_state.get("pois", [])
        # Simple ranking by distance for now
        return [{"poi_id": poi.get("id"), "rank": i} for i, poi in enumerate(pois)]

    def _generate_broadcasts(self, world_state: dict,
                            observer_effect: ObserverEffect, district_type: str, district_mood: str) -> List[dict]:
        """Generate broadcast suggestions"""
        broadcasts = []

        if observer_effect.rarity_level == "legendary":
            broadcasts.append({
                "text": "世界浓度达到传说级别，稀有内容正在显现...",
                "mood": "mysterious"
            })

        # District-specific broadcasts
        district_texts = {
            "order_tower": "秩序高塔的权力在此刻达到顶峰",
            "memory_ruins": "记忆废墟中，过去的回声正在苏醒",
            "flowing_market": "流动市集的能量潮汐涌动不息",
            "healing_oasis": "治愈绿洲散发出宁静的光芒",
            "edge_rift": "边缘裂隙处，现实的边界正在模糊"
        }

        if district_type in district_texts and observer_effect.world_density > 0.4:
            broadcasts.append({
                "text": district_texts[district_type],
                "mood": district_mood
            })

        return broadcasts
