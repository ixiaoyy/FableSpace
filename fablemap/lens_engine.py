"""AIO2 Lens Engine - vibe_profile -> LensOutput mapping"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class VibeProfile:
    district_type: str
    time_of_day: str
    observer_density: float = 0.2
    player_attunement: float = 0.0
    weather: Optional[str] = None
    is_holiday: bool = False
    mark_count: int = 0
    echo_count: int = 0


@dataclass
class LensSchema:
    lens_id: str
    label: str
    tone: str
    asset_pack_hint: str
    visibility_bias: str
    event_weight_modifiers: Dict[str, float]
    ui_filter_hint: str


@dataclass
class LensOutput:
    lens_id: str
    label: str = ""
    tone: str = ""
    asset_pack_hint: str = ""
    visibility_bias: str = "private"
    event_weight_modifiers: Dict[str, float] = field(default_factory=dict)
    ui_filter_hint: str = ""
    trigger_reason: str = ""
    confidence: float = 0.0
    fallback: bool = False


_LENS_CATALOG: Dict[str, LensSchema] = {
    "drift": LensSchema(
        lens_id="drift",
        label="漂流者",
        tone="sparse_poetic",
        asset_pack_hint="pack_b_night",
        visibility_bias="private",
        event_weight_modifiers={"anomaly_detected": 1.4, "special_event": 0.6, "memory_echo": 1.2},
        ui_filter_hint="desaturate_edges",
    ),
    "chronicle": LensSchema(
        lens_id="chronicle",
        label="编年者",
        tone="calm_archival",
        asset_pack_hint="pack_a_day",
        visibility_bias="local_public",
        event_weight_modifiers={"memory_echo": 1.6, "time_fold": 1.5, "special_event": 0.8},
        ui_filter_hint="sepia_overlay",
    ),
    "surge": LensSchema(
        lens_id="surge",
        label="共振者",
        tone="energetic_collective",
        asset_pack_hint="pack_a_day",
        visibility_bias="global",
        event_weight_modifiers={"special_event": 1.8, "broadcast": 1.5, "anomaly_detected": 0.7},
        ui_filter_hint="saturation_boost",
    ),
    "veil": LensSchema(
        lens_id="veil",
        label="隐匿者",
        tone="terse_liminal",
        asset_pack_hint="pack_b_night",
        visibility_bias="private",
        event_weight_modifiers={"anomaly_detected": 1.6, "memory_echo": 1.3, "special_event": 0.5},
        ui_filter_hint="blur_edges_dark",
    ),
    "hearth": LensSchema(
        lens_id="hearth",
        label="庇护者",
        tone="warm_intimate",
        asset_pack_hint="pack_a_day",
        visibility_bias="private",
        event_weight_modifiers={"memory_echo": 1.4, "special_event": 1.2, "anomaly_detected": 0.4},
        ui_filter_hint="warm_vignette",
    ),
    "oracle": LensSchema(
        lens_id="oracle",
        label="先知者",
        tone="prophetic_dense",
        asset_pack_hint="pack_b_night",
        visibility_bias="local_public",
        event_weight_modifiers={"time_fold": 2.0, "memory_echo": 1.8, "broadcast": 1.4, "special_event": 1.3},
        ui_filter_hint="prismatic_glow",
    ),
}

_FALLBACK_LENS = "drift"


class LensEngine:
    """Resolves a VibeProfile into a LensOutput."""

    def resolve_lens(self, vibe: VibeProfile) -> LensOutput:
        lens_id, reason, confidence = self._match_rule(vibe)
        schema = _LENS_CATALOG[lens_id]
        return LensOutput(
            lens_id=schema.lens_id,
            label=schema.label,
            tone=schema.tone,
            asset_pack_hint=schema.asset_pack_hint,
            visibility_bias=schema.visibility_bias,
            event_weight_modifiers=dict(schema.event_weight_modifiers),
            ui_filter_hint=schema.ui_filter_hint,
            trigger_reason=reason,
            confidence=confidence,
            fallback=(lens_id == _FALLBACK_LENS and confidence < 0.5),
        )

    def _match_rule(self, vibe: VibeProfile) -> tuple[str, str, float]:
        # Rule 1: oracle - high attunement + marks/echoes accumulated
        if vibe.player_attunement >= 0.7 and (vibe.mark_count + vibe.echo_count) >= 3:
            return "oracle", "high_attunement_with_marks", 0.92

        # Rule 2: surge - high observer density
        if vibe.observer_density >= 0.75:
            return "surge", "high_observer_density", 0.90

        # Rule 3: surge - holiday + daytime + commercial
        if vibe.is_holiday and vibe.time_of_day in ("morning", "afternoon") and vibe.district_type in ("commercial", "mixed"):
            return "surge", "holiday_daytime_commercial", 0.85

        # Rule 4: chronicle - historic district
        if vibe.district_type == "historic":
            return "chronicle", "historic_district", 0.88

        # Rule 5: chronicle - time fold signals (many echoes)
        if vibe.echo_count >= 5:
            return "chronicle", "echo_accumulation", 0.80

        # Rule 6: hearth - park/residential + daytime/morning
        if vibe.district_type in ("park", "residential") and vibe.time_of_day in ("morning", "afternoon"):
            return "hearth", "park_residential_daytime", 0.82

        # Rule 7: veil - night + industrial/mixed + non-trivial density
        if vibe.time_of_day == "night" and vibe.district_type in ("industrial", "mixed", "commercial") and vibe.observer_density >= 0.2:
            return "veil", "night_non_residential", 0.78

        # Rule 8: drift - night + low density + non-historic
        if vibe.time_of_day in ("night", "late_night") and vibe.observer_density < 0.3:
            return "drift", "night_low_density", 0.75

        # Rule 9: drift - rain + low density
        if vibe.weather == "rain" and vibe.observer_density < 0.4:
            return "drift", "rain_low_density", 0.72

        # Fallback
        return _FALLBACK_LENS, "no_rule_matched", 0.40


def build_vibe_profile(
    district_type: str,
    time_of_day: str,
    observer_density: float = 0.2,
    player_attunement: float = 0.0,
    weather: Optional[str] = None,
    is_holiday: bool = False,
    mark_count: int = 0,
    echo_count: int = 0,
) -> VibeProfile:
    return VibeProfile(
        district_type=district_type,
        time_of_day=time_of_day,
        observer_density=observer_density,
        player_attunement=player_attunement,
        weather=weather,
        is_holiday=is_holiday,
        mark_count=mark_count,
        echo_count=echo_count,
    )
