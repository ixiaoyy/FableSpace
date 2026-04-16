"""Tests for AIO2 Lens Engine"""
import pytest
from fablemap.lens_engine import LensEngine, VibeProfile, build_vibe_profile


@pytest.fixture
def engine():
    return LensEngine()


def test_drift_lens_lonely_night(engine):
    vibe = VibeProfile(
        district_type="industrial",
        time_of_day="night",
        observer_density=0.05,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "drift"
    assert result.fallback is False
    assert "desaturate" in result.ui_filter_hint


def test_chronicle_lens_historic(engine):
    vibe = VibeProfile(
        district_type="historic",
        time_of_day="morning",
        observer_density=0.3,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "chronicle"
    assert result.visibility_bias == "local_public"


def test_surge_lens_high_density(engine):
    vibe = VibeProfile(
        district_type="commercial",
        time_of_day="afternoon",
        observer_density=0.85,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "surge"
    assert result.event_weight_modifiers.get("special_event", 1.0) > 1.0


def test_veil_lens_night_industrial(engine):
    vibe = VibeProfile(
        district_type="industrial",
        time_of_day="night",
        observer_density=0.35,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "veil"
    assert result.event_weight_modifiers.get("anomaly_detected", 1.0) > 1.0


def test_hearth_lens_park(engine):
    vibe = VibeProfile(
        district_type="park",
        time_of_day="afternoon",
        observer_density=0.3,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "hearth"
    assert result.visibility_bias == "private"


def test_oracle_lens_high_attunement(engine):
    vibe = VibeProfile(
        district_type="residential",
        time_of_day="evening",
        player_attunement=0.8,
        mark_count=5,
        echo_count=3,
    )
    result = engine.resolve_lens(vibe)
    assert result.lens_id == "oracle"
    assert result.event_weight_modifiers.get("memory_echo", 1.0) > 1.0


def test_fallback_unknown_district(engine):
    vibe = VibeProfile(
        district_type="unknown_xyz",
        time_of_day="morning",
        observer_density=0.3,
    )
    result = engine.resolve_lens(vibe)
    # Should still return a valid lens (fallback)
    assert result.lens_id in {"drift", "chronicle", "surge", "veil", "hearth", "oracle"}
    assert result.fallback is True


def test_build_vibe_profile_helper():
    vibe = build_vibe_profile(
        district_type="commercial",
        time_of_day="afternoon",
        observer_density=0.9,
        player_attunement=0.1,
        weather="rain",
        is_holiday=True,
        mark_count=0,
        echo_count=0,
    )
    assert isinstance(vibe, VibeProfile)
    assert vibe.observer_density == 0.9
    assert vibe.is_holiday is True


def test_lens_output_has_trigger_reason(engine):
    vibe = VibeProfile(district_type="park", time_of_day="morning")
    result = engine.resolve_lens(vibe)
    assert result.trigger_reason
    assert isinstance(result.confidence, float)
    assert 0.0 <= result.confidence <= 1.0


def test_orchestrator_includes_lens_output():
    from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator
    orchestrator = RuleBasedOrchestrator()
    world_state = {
        "slice_id": "test_slice",
        "pois": [{"tags": {"leisure": "park"}}],
        "observer_count": 3,
        "center_poi": "poi_001",
    }
    player_state = {"attunement": 0.2, "mark_count": 1, "echo_count": 0}
    output = orchestrator.orchestrate(world_state, player_state)
    assert output.lens_output is not None
    assert output.lens_output.lens_id in {"drift", "chronicle", "surge", "veil", "hearth", "oracle"}
