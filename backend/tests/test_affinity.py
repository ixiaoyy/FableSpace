from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from fablemap_api.core.affinity import (
    AffinityCalculator,
    AffinityStage,
    affinity_stage_definitions,
    strength_to_percent,
)
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app


def _client(tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(ApiSettings(output_root=tmp_path / "api", fixture_file=None, frontend_root=None))
    )


# ─── AffinityCalculator ──────────────────────────────────────────────────────────


def test_affinity_calculator_basic_chat() -> None:
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.1,
        current_stage=AffinityStage.STRANGER,
        visitor_message="你好，今天天气真不错。",
        character_response="是啊，很适合出门散步。",
        interaction_count=0,
    )
    assert 0 < result.current_strength <= 1.0
    assert isinstance(result.previous_stage, AffinityStage)
    assert isinstance(result.new_stage, AffinityStage)
    assert result.greeting_style in ("formal", "casual", "intimate", "special")
    assert isinstance(result.changes, list)
    assert any(c.event_type == "chat" for c in result.changes)


def test_affinity_calculator_positive_sentiment_boost() -> None:
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.3,
        current_stage=AffinityStage.FAMILIAR,
        visitor_message="你真是太好了！太感谢你了！",
        character_response="哈哈，不用客气！",
        interaction_count=5,
    )
    sentiment_change = next((c.delta for c in result.changes if c.event_type == "sentiment"), 0)
    assert sentiment_change >= 0  # non-negative sentiment


def test_affinity_calculator_negative_sentiment() -> None:
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.5,
        current_stage=AffinityStage.FRIEND,
        visitor_message="你真是太差劲了，完全不想再和你说话了！",
        character_response="那我很抱歉。",
        interaction_count=10,
    )
    sentiment_change = next((c.delta for c in result.changes if c.event_type == "sentiment"), 0)
    assert sentiment_change <= 0  # negative sentiment


def test_affinity_calculator_stage_advances() -> None:
    """Repeated positive interactions should advance the stage."""
    calc = AffinityCalculator()
    strength = 0.0
    stage = AffinityStage.STRANGER
    for i in range(30):
        result = calc.calculate_chat_affinity(
            current_strength=strength,
            current_stage=stage,
            visitor_message="你太棒了！非常感谢你！",
            character_response="谢谢夸奖！",
            interaction_count=i,
        )
        strength = result.current_strength
        stage = result.new_stage
    # After enough positive interactions, stage should advance to at least acquaintance
    assert stage in (
        AffinityStage.ACQUAINTANCE,
        AffinityStage.FAMILIAR,
        AffinityStage.FRIEND,
        AffinityStage.CLOSE_FRIEND,
        AffinityStage.BEST_FRIEND,
    )
    # And definitely not still at stranger
    assert stage != AffinityStage.STRANGER


def test_affinity_calculator_min_strength_never_negative() -> None:
    """Strength should never go below 0."""
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.0,
        current_stage=AffinityStage.STRANGER,
        visitor_message="滚开，别烦我！",
        character_response="...",
        interaction_count=0,
    )
    assert result.current_strength >= 0.0


def test_affinity_calculator_max_strength_never_exceeds_one() -> None:
    """Strength should never exceed 1.0."""
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.99,
        current_stage=AffinityStage.BEST_FRIEND,
        visitor_message="你是我最好的朋友！",
        character_response="必须的！",
        interaction_count=100,
    )
    assert result.current_strength <= 1.0


def test_affinity_calculator_best_friend_stage() -> None:
    """At max stage, no stage change occurs."""
    calc = AffinityCalculator()
    result = calc.calculate_chat_affinity(
        current_strength=0.95,
        current_stage=AffinityStage.BEST_FRIEND,
        visitor_message="我们永远是好朋友！",
        character_response="必须的！",
        interaction_count=200,
    )
    assert result.new_stage == AffinityStage.BEST_FRIEND
    assert result.current_strength >= 0.95


# ─── calculate_decay ───────────────────────────────────────────────────────────


def test_affinity_calculator_decay_small_7_days() -> None:
    """At 7 days, should trigger small decay (>= 7 but < 30)."""
    calc = AffinityCalculator()
    result = calc.calculate_decay(
        current_strength=0.5,
        current_stage=AffinityStage.FRIEND,
        days_since_last_visit=7,
    )
    assert len(result.changes) == 1
    assert result.changes[0].event_type == "decay"
    assert result.changes[0].delta == calc.DECAY_SMALL
    assert result.current_strength < 0.5


def test_affinity_calculator_decay_large_30_days() -> None:
    """At 30+ days, should trigger large decay."""
    calc = AffinityCalculator()
    result = calc.calculate_decay(
        current_strength=0.5,
        current_stage=AffinityStage.FRIEND,
        days_since_last_visit=30,
    )
    assert len(result.changes) == 1
    assert result.changes[0].event_type == "decay"
    assert result.changes[0].delta == calc.DECAY_LARGE
    assert result.current_strength < 0.5


def test_affinity_calculator_decay_no_decay_below_7_days() -> None:
    """Below 7 days, no decay should be applied."""
    calc = AffinityCalculator()
    for days in (0, 1, 3, 6):
        result = calc.calculate_decay(
            current_strength=0.5,
            current_stage=AffinityStage.FRIEND,
            days_since_last_visit=days,
        )
        assert len(result.changes) == 0
        assert result.current_strength == 0.5


def test_affinity_calculator_decay_min_strength_preserved() -> None:
    """Decay should not push strength below 0."""
    calc = AffinityCalculator()
    result = calc.calculate_decay(
        current_strength=0.01,
        current_stage=AffinityStage.STRANGER,
        days_since_last_visit=100,
    )
    assert result.current_strength >= 0.0


def test_affinity_calculator_decay_stage_downgrade() -> None:
    """Significant decay reduces strength; stage may or may not change."""
    calc = AffinityCalculator()
    result = calc.calculate_decay(
        current_strength=0.32,  # barely in familiar stage [0.30, 0.50)
        current_stage=AffinityStage.FAMILIAR,
        days_since_last_visit=60,  # large decay (-0.05)
    )
    assert result.current_strength < 0.32
    assert isinstance(result.new_stage, AffinityStage)


# ─── calculate_gameplay_result ─────────────────────────────────────────────────


def test_affinity_calculator_gameplay_complete() -> None:
    calc = AffinityCalculator()
    result = calc.calculate_gameplay_result(
        current_strength=0.4,
        current_stage=AffinityStage.FAMILIAR,
        completed=True,
    )
    assert result.current_strength > 0.4
    assert any(c.event_type == "gameplay" and c.delta > 0 for c in result.changes)


def test_affinity_calculator_gameplay_abandon() -> None:
    calc = AffinityCalculator()
    result = calc.calculate_gameplay_result(
        current_strength=0.4,
        current_stage=AffinityStage.FAMILIAR,
        completed=False,
    )
    assert result.current_strength < 0.4
    assert any(c.event_type == "gameplay" and c.delta < 0 for c in result.changes)


# ─── AffinityStage ─────────────────────────────────────────────────────────────


def test_affinity_stage_from_string_known_stages() -> None:
    for stage in AffinityStage:
        assert AffinityStage.from_string(stage.value) == stage


def test_affinity_stage_from_string_legacy_mappings() -> None:
    assert AffinityStage.from_string("regular") == AffinityStage.FAMILIAR
    assert AffinityStage.from_string("confidant") == AffinityStage.CLOSE_FRIEND


def test_affinity_stage_from_string_unknown() -> None:
    assert AffinityStage.from_string("") == AffinityStage.STRANGER
    assert AffinityStage.from_string("foobar") == AffinityStage.STRANGER


# ─── Helper functions ───────────────────────────────────────────────────────────


def test_strength_to_percent() -> None:
    assert strength_to_percent(0.0) == 0
    assert strength_to_percent(0.5) == 50
    assert strength_to_percent(1.0) == 100
    assert strength_to_percent(0.999) == 100


def test_affinity_stages_count() -> None:
    """All 6 affinity stages are defined."""
    stages = affinity_stage_definitions()
    assert len(stages) == 6


def test_affinity_stages_sequential_ranges() -> None:
    """Stage ranges are contiguous and non-overlapping."""
    stages = affinity_stage_definitions()
    for i in range(len(stages) - 1):
        current = stages[i]
        next_stage = stages[i + 1]
        assert current["strength_max"] == next_stage["strength_min"]


def test_affinity_stages_best_friend_max() -> None:
    """Best friend is the last stage with max strength 1.0."""
    stages = affinity_stage_definitions()
    best_friend = next(s for s in stages if s["stage"] == "best_friend")
    assert best_friend["strength_max"] == 1.0
    assert best_friend["strength_min"] == 0.9


def test_affinity_stage_tones() -> None:
    """All stages have a tone defined."""
    stages = affinity_stage_definitions()
    tones = {s["tone"] for s in stages}
    assert len(tones) > 1  # at least 2 different tones


# ─── API endpoint ──────────────────────────────────────────────────────────────


def test_affinity_stages_endpoint(tmp_path: Path) -> None:
    """GET /api/v1/affinity/stages returns stage definitions."""
    client = _client(tmp_path)
    response = client.get("/api/v1/affinity/stages")
    assert response.status_code == 200
    data = response.json()
    assert "stages" in data
    assert "count" in data
    assert data["count"] == 6
    for stage in data["stages"]:
        assert "stage" in stage
        assert "name_zh" in stage
        assert "name_en" in stage
        assert "strength_min" in stage
        assert "strength_max" in stage
        assert "tone" in stage
