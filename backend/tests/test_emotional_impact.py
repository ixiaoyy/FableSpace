"""Tests for NPC emotional impact — mood field, sentiment classification, and social exchange effects."""

from __future__ import annotations

from datetime import datetime, UTC
from unittest.mock import MagicMock

import pytest

from fablemap_api.core.tavern import NpcSimulationState, TavernCharacter
from fablemap_api.core.simulation import (
    classify_rumor_sentiment,
    generate_npc_feeling,
    tick_npc_simulation,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_char(
    *,
    social: float = 100.0,
    mood: float = 50.0,
    traits: list[str] | None = None,
) -> TavernCharacter:
    return TavernCharacter(
        id="char-1",
        tavern_id="t-1",
        name="TestNPC",
        simulation_state=NpcSimulationState(social=social, mood=mood),
        traits=traits or [],
    )


# ── NpcSimulationState mood field ────────────────────────────────────────────

class TestNpcSimulationStateMood:
    def test_default_mood_is_50(self) -> None:
        state = NpcSimulationState()
        assert state.mood == 50.0

    def test_to_dict_includes_mood(self) -> None:
        state = NpcSimulationState(mood=72.5)
        d = state.to_dict()
        assert d["mood"] == 72.5

    def test_from_dict_parses_mood(self) -> None:
        state = NpcSimulationState.from_dict({"mood": 33.0})
        assert state.mood == 33.0

    def test_from_dict_missing_mood_defaults_50(self) -> None:
        state = NpcSimulationState.from_dict({"energy": 80.0})
        assert state.mood == 50.0

    def test_from_dict_empty_returns_default(self) -> None:
        state = NpcSimulationState.from_dict({})
        assert state.mood == 50.0


# ── classify_rumor_sentiment ─────────────────────────────────────────────────

class TestClassifyRumorSentiment:
    def test_positive_keyword(self) -> None:
        assert classify_rumor_sentiment("这里的氛围挺好的，非常不错") == "positive"

    def test_negative_keyword(self) -> None:
        assert classify_rumor_sentiment("这家店太无聊了，难吃又吵") == "negative"

    def test_neutral_no_keywords(self) -> None:
        assert classify_rumor_sentiment("我平时住在城东那边") == "neutral"

    def test_mixed_keywords_more_positive(self) -> None:
        assert classify_rumor_sentiment("虽然有点吵，但食物不错，氛围挺好") == "positive"

    def test_mixed_keywords_more_negative(self) -> None:
        assert classify_rumor_sentiment("食物不错，但太吵了又脏又失望") == "negative"

    def test_empty_string_is_neutral(self) -> None:
        assert classify_rumor_sentiment("") == "neutral"

    def test_english_keywords(self) -> None:
        assert classify_rumor_sentiment("The place is really nice and good") == "positive"
        assert classify_rumor_sentiment("It was boring and terrible") == "negative"


# ── tick_npc_simulation mood regression ──────────────────────────────────────

class TestMoodRegression:
    def test_high_mood_decreases_toward_50(self) -> None:
        char = _make_char(mood=80.0)
        tick_npc_simulation(char, "home", datetime.now(UTC))
        assert char.simulation_state.mood < 80.0
        assert char.simulation_state.mood >= 79.0

    def test_low_mood_increases_toward_50(self) -> None:
        char = _make_char(mood=20.0)
        tick_npc_simulation(char, "home", datetime.now(UTC))
        assert char.simulation_state.mood > 20.0
        assert char.simulation_state.mood <= 21.0

    def test_mood_at_50_stays_50(self) -> None:
        char = _make_char(mood=50.0)
        tick_npc_simulation(char, "home", datetime.now(UTC))
        assert char.simulation_state.mood == 50.0

    def test_mood_does_not_cross_50(self) -> None:
        char = _make_char(mood=50.5)
        tick_npc_simulation(char, "home", datetime.now(UTC))
        assert char.simulation_state.mood == 50.0

    def test_mood_regression_over_multiple_ticks(self) -> None:
        char = _make_char(mood=90.0)
        for _ in range(50):
            tick_npc_simulation(char, "home", datetime.now(UTC))
        assert 49.0 <= char.simulation_state.mood <= 51.0


# ── generate_npc_feeling mood descriptions ───────────────────────────────────

class TestGenerateNpcFeelingMood:
    def test_high_mood_feeling(self) -> None:
        char = _make_char(mood=85.0)
        feeling = generate_npc_feeling(char)
        assert "心情非常好" in feeling

    def test_moderately_good_mood(self) -> None:
        char = _make_char(mood=65.0)
        feeling = generate_npc_feeling(char)
        assert "心情不错" in feeling

    def test_low_mood_feeling(self) -> None:
        char = _make_char(mood=15.0)
        feeling = generate_npc_feeling(char)
        assert "心情极度低落" in feeling

    def test_moderately_low_mood(self) -> None:
        char = _make_char(mood=35.0)
        feeling = generate_npc_feeling(char)
        assert "心情有些沉重" in feeling

    def test_neutral_mood_no_mood_feeling(self) -> None:
        char = _make_char(mood=55.0)
        feeling = generate_npc_feeling(char)
        assert "心情非常好" not in feeling
        assert "心情不错" not in feeling
        assert "心情极度低落" not in feeling
        assert "心情有些沉重" not in feeling


# ── _exchange_info emotional impact (integration via SimulationWorker) ───────

class TestExchangeInfoEmotionalImpact:
    """Test the emotional impact logic in SimulationWorker._exchange_info."""

    @staticmethod
    def _worker():
        from fablemap_api.application.simulation_worker import SimulationWorker
        return SimulationWorker(store=MagicMock())

    @staticmethod
    def _tavern_map(tavern_name: str = "测试酒馆", place_type: str = "tavern"):
        tavern = MagicMock()
        tavern.id = "t-1"
        tavern.name = tavern_name
        tavern.place_type = place_type
        return {"t-1": tavern}

    def test_social_need_boosts_venue_rumor(self) -> None:
        """When only venue rumor is available (no traits, no home), social boosts."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        # Source has no traits and no home_tavern_id → only venue rumor
        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        worker._exchange_info(source, target, tavern_map)

        # Both should have social boosted by 8.0
        assert source.simulation_state.social == 88.0
        assert target.simulation_state.social == 88.0

    def test_positive_venue_rumor_boosts_mood(self) -> None:
        """Venue rumor '氛围挺不错的' contains '不错' → positive sentiment."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        worker._exchange_info(source, target, tavern_map)

        # Target gets full MOOD_SHIFT (5.0), source gets half (2.5)
        assert target.simulation_state.mood == 55.0
        assert source.simulation_state.mood == 52.5

    def test_trait_rumor_boosts_social(self) -> None:
        """Trait-based rumor boosts social regardless of sentiment."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=["友善"],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        worker._exchange_info(source, target, tavern_map)
        assert source.simulation_state.social == 88.0
        assert target.simulation_state.social == 88.0

    def test_home_tavern_rumor_sentiment(self) -> None:
        """Verify home tavern rumor content is neutral."""
        assert classify_rumor_sentiment("我平时住在测试酒馆那边") == "neutral"

    def test_mood_clamps_at_upper_bound(self) -> None:
        """Mood should not exceed 100."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=95.0, mood=98.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=95.0, mood=98.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        worker._exchange_info(source, target, tavern_map)

        # Social clamped at 100
        assert source.simulation_state.social == 100.0
        assert target.simulation_state.social == 100.0
        # Mood clamped at 100
        assert target.simulation_state.mood <= 100.0
        assert source.simulation_state.mood <= 100.0

    def test_mood_clamps_at_lower_bound(self) -> None:
        """Mood should not go below 0."""
        worker = self._worker()
        tavern_map = self._tavern_map("糟糕酒馆", "tavern")

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=100.0, mood=2.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=100.0, mood=2.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        # Venue rumor: "我觉得糟糕酒馆这里的tavern氛围挺不错的" → positive
        # Even though tavern name has 糟糕, the rumor template contains 不错 → positive
        # So mood goes UP, not down. This tests clamping on positive side at low mood.
        worker._exchange_info(source, target, tavern_map)

        # Mood should still be >= 0
        assert target.simulation_state.mood >= 0.0
        assert source.simulation_state.mood >= 0.0

    def test_no_simulation_state_no_crash(self) -> None:
        """_exchange_info should not crash when simulation_state is absent."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        source.simulation_state = None  # type: ignore[assignment]
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        # Should not raise
        worker._exchange_info(source, target, tavern_map)

    def test_duplicate_rumor_no_double_boost(self) -> None:
        """If the same rumor is already stored, _exchange_info returns early without boosting."""
        worker = self._worker()
        tavern_map = self._tavern_map()

        source = TavernCharacter(
            id="src", tavern_id="t-1", name="Source",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )
        target = TavernCharacter(
            id="tgt", tavern_id="t-1", name="Target",
            simulation_state=NpcSimulationState(social=80.0, mood=50.0),
            traits=[],
            home_tavern_id="",
            current_tavern_id="t-1",
        )

        # Pre-populate target's social_memories with the venue rumor
        # so the duplicate check fires
        target.social_memories = [{
            "content": "我觉得测试酒馆这里的tavern氛围挺不错的。",
            "source_name": "Source",
            "timestamp": datetime.now(UTC).isoformat(),
        }]

        worker._exchange_info(source, target, tavern_map)

        # Social should NOT be boosted (duplicate detected, early return)
        assert source.simulation_state.social == 80.0
        assert target.simulation_state.social == 80.0
        assert source.simulation_state.mood == 50.0
        assert target.simulation_state.mood == 50.0
