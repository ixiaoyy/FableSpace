"""Tests for AIO6 SceneCapsuleGenerator"""
import pytest
from fablemap.behavior_compiler import MeaningVector
from fablemap.city_persona import CityPersona, CityPersonaAgent
from fablemap.lens_engine import LensOutput
from fablemap.scene_capsule import (
    CapsuleInput, CapsuleOutput, SceneCapsuleGenerator, evaluate_trigger
)


@pytest.fixture
def gen():
    return SceneCapsuleGenerator()


def _persona(dominant="wanderer", trust=0.5, bias=None):
    bias_map = {
        "explorer": "mystery", "chronicler": "story", "restorer": "repair",
        "recluse": "solitude", "resonant": "resonance", "wanderer": "drift",
    }
    return CityPersona(
        player_id="p",
        address={"explorer": "幽灵制图者", "chronicler": "记忆守护者",
                 "restorer": "圣域编织者", "recluse": "虚空行者",
                 "resonant": "回声承载者", "wanderer": "过路人"}.get(dominant, "过路人"),
        emotional_tone="curious",
        greeting="hi",
        response_bias=bias or bias_map.get(dominant, "drift"),
        trust_level=trust,
        dominant_meaning=dominant,
    )


def _lens(asset_hint="ruins_pack"):
    return LensOutput(
        lens_id="chronicle",
        tone="reflective",
        asset_pack_hint=asset_hint,
        visibility_bias="local_public",
        event_weight_modifiers={},
        ui_filter_hint="sepia",
    )


def _inp(
    dominant="wanderer",
    trust=0.5,
    dwell=0.0,
    visits=1,
    writeback=0,
    with_lens=False,
    **overrides,
):
    payload = dict(
        player_id="p1",
        poi_id="poi_test",
        district_type="memory_grove",
        persona=_persona(dominant, trust),
        lens=_lens() if with_lens else None,
        dwell_seconds=dwell,
        visit_count=visits,
        writeback_count=writeback,
    )
    payload.update(overrides)
    return CapsuleInput(**payload)


# ---------------------------------------------------------------------------
# 触发评估
# ---------------------------------------------------------------------------

def test_no_signal_no_trigger():
    trigger = evaluate_trigger(_inp("wanderer", trust=0.1, dwell=0.0, visits=1, writeback=0))
    assert not trigger.should_trigger


def test_dwell_triggers():
    trigger = evaluate_trigger(_inp("chronicler", trust=0.3, dwell=10.0, visits=1, writeback=0))
    assert trigger.should_trigger
    assert "dwell" in trigger.reason


def test_revisit_triggers():
    trigger = evaluate_trigger(_inp("explorer", trust=0.3, dwell=0.0, visits=3, writeback=0))
    assert trigger.should_trigger
    assert "visits" in trigger.reason


def test_writeback_triggers():
    trigger = evaluate_trigger(_inp("restorer", trust=0.3, dwell=0.0, visits=1, writeback=1))
    assert trigger.should_trigger
    assert "writeback" in trigger.reason


def test_high_trust_triggers():
    trigger = evaluate_trigger(_inp("resonant", trust=0.75, dwell=0.0, visits=1, writeback=0))
    assert trigger.should_trigger
    assert "trust" in trigger.reason


def test_drift_first_visit_no_trigger():
    trigger = evaluate_trigger(_inp("wanderer", trust=0.8, dwell=20.0, visits=1, writeback=5))
    # drift bias + first visit → rejected
    assert not trigger.should_trigger
    assert trigger.reason == "drift_bias_first_visit"


# ---------------------------------------------------------------------------
# 胶囊类型映射
# ---------------------------------------------------------------------------

def test_mystery_bias_gives_anomaly_glimpse(gen):
    out = gen.generate(_inp("explorer", trust=0.7, dwell=10.0))
    assert out.capsule_type == "anomaly_glimpse"
    assert out.narrative != ""


def test_story_bias_gives_legend_fragment(gen):
    out = gen.generate(_inp("chronicler", trust=0.7, dwell=10.0))
    assert out.capsule_type == "legend_fragment"


def test_repair_bias_gives_dwell_aura(gen):
    out = gen.generate(_inp("restorer", trust=0.7, dwell=10.0))
    assert out.capsule_type == "dwell_aura"


def test_solitude_bias_gives_persona_whisper(gen):
    out = gen.generate(_inp("recluse", trust=0.7, dwell=10.0))
    assert out.capsule_type == "persona_whisper"
    assert out.visibility == "private"


def test_resonance_bias_gives_broadcast_echo(gen):
    out = gen.generate(_inp("resonant", trust=0.7, dwell=10.0))
    assert out.capsule_type == "broadcast_echo"
    assert out.visibility == "global"


# ---------------------------------------------------------------------------
# 资源包透传
# ---------------------------------------------------------------------------

def test_lens_asset_hint_propagated(gen):
    out = gen.generate(_inp("chronicler", trust=0.7, dwell=10.0, with_lens=True))
    assert out.asset_pack_hint == "ruins_pack"


def test_no_lens_empty_asset_hint(gen):
    out = gen.generate(_inp("chronicler", trust=0.7, dwell=10.0, with_lens=False))
    assert out.asset_pack_hint == ""


# ---------------------------------------------------------------------------
# 输出字段完整性
# ---------------------------------------------------------------------------

def test_output_fields_complete(gen):
    out = gen.generate(_inp("restorer", trust=0.7, writeback=2))
    assert out.player_id == "p1"
    assert out.poi_id == "poi_test"
    assert isinstance(out.duration, float)
    assert out.visibility in {"private", "local_public", "global"}
    assert isinstance(out.is_fallback, bool)


def test_no_trigger_returns_null_capsule(gen):
    out = gen.generate(_inp("wanderer", trust=0.1, dwell=0.0, visits=1, writeback=0))
    assert out.capsule_type == "null"
    assert out.narrative == ""
    assert not out.is_fallback


# ---------------------------------------------------------------------------
# 协议扩展能力
# ---------------------------------------------------------------------------

def test_output_contains_protocol_fields(gen):
    out = gen.generate(_inp("chronicler", trust=0.7, dwell=10.0, with_lens=True, slice_id="slice_alpha"))
    assert out.ui_filter_hint == "sepia"
    assert out.cooldown_seconds == 90
    assert out.cache_key == "scene_capsule:p1:slice_alpha:poi_test:legend_fragment:chronicle:local_public"
    assert len(out.sound_hints) == 1
    assert out.sound_hints[0].hint_type == "crowd"


def test_safety_flags_force_deterministic_fallback(gen):
    out = gen.generate(
        _inp(
            "chronicler",
            trust=0.7,
            dwell=10.0,
            with_lens=True,
            safety_flags={"allow_generated_text": False},
            deterministic_fallbacks=["text_panel"],
        )
    )
    assert out.is_fallback
    assert out.fallback_reason == "deterministic_ui_fallback"
    assert out.title == "城市短暂沉默"
    assert out.confidence <= 0.54
    assert out.metadata["deterministic_fallbacks"] == ["text_panel"]


def test_persona_address_can_be_redacted(gen):
    out = gen.generate(
        _inp(
            "recluse",
            trust=0.7,
            dwell=10.0,
            safety_flags={"allow_persona_address": False},
        )
    )
    assert "旅人" in out.narrative
    assert "虚空行者" not in out.narrative


def test_mutual_exclusion_suppresses_conflicting_capsule(gen):
    out = gen.generate(
        _inp(
            "explorer",
            trust=0.7,
            dwell=10.0,
            active_capsule_types=["anomaly_glimpse"],
        )
    )
    assert out.capsule_type == "null"
    assert out.trigger_reason == "suppressed_by_protocol_guard"
    assert out.metadata["suppressed"] is True


def test_ambient_capsule_uses_extended_cooldown(gen):
    out = gen.generate(_inp("restorer", trust=0.7, dwell=10.0))
    assert out.capsule_type == "dwell_aura"
    assert out.cooldown_seconds == 180
    assert out.sound_hints[0].loop is True


def test_private_input_does_not_upgrade_to_more_public_visibility(gen):
    out = gen.generate(
        _inp(
            "chronicler",
            trust=0.7,
            dwell=10.0,
            visibility="private",
        )
    )
    assert out.capsule_type == "legend_fragment"
    assert out.visibility == "local_public"


@pytest.mark.parametrize(
    ("dominant", "requested_visibility", "expected_type", "expected_visibility"),
    [
        ("chronicler", "private", "legend_fragment", "local_public"),
        ("chronicler", "global", "legend_fragment", "global"),
        ("explorer", "global", "anomaly_glimpse", "local_public"),
        ("recluse", "local_public", "persona_whisper", "private"),
        ("resonant", "private", "broadcast_echo", "global"),
    ],
)
def test_capsule_visibility_follows_protocol_caps(dominant, requested_visibility, expected_type, expected_visibility, gen):
    out = gen.generate(
        _inp(
            dominant,
            trust=0.7,
            dwell=10.0,
            visibility=requested_visibility,
        )
    )
    assert out.capsule_type == expected_type
    assert out.visibility == expected_visibility
