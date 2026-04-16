"""Tests for AIO5 CityPersonaAgent"""
import pytest
from fablemap.behavior_compiler import MeaningVector
from fablemap.city_persona import CityPersona, CityPersonaAgent


@pytest.fixture
def agent():
    return CityPersonaAgent()


def _mv(dominant, **kwargs):
    """快速构造 MeaningVector。"""
    defaults = dict(
        player_id="test_player",
        explorer_score=0.0,
        chronicler_score=0.0,
        restorer_score=0.0,
        recluse_score=0.0,
        resonant_score=0.0,
        dominant_meaning=dominant,
        myth_entry="unnamed_drifter",
    )
    defaults.update(kwargs)
    return MeaningVector(**defaults)


# ---------------------------------------------------------------------------
# 基础生成
# ---------------------------------------------------------------------------

def test_wanderer_default(agent):
    mv = _mv("wanderer")
    persona = agent.generate(mv)
    assert persona.address == "过路人"
    assert persona.emotional_tone == "curious"
    assert persona.response_bias == "drift"
    assert 0.0 <= persona.trust_level <= 1.0


def test_explorer_persona(agent):
    mv = _mv("explorer", explorer_score=0.8, myth_entry="ghost_cartographer")
    persona = agent.generate(mv)
    assert persona.address == "幽灵制图者"
    assert persona.response_bias == "mystery"
    assert persona.emotional_tone == "curious"


def test_chronicler_persona(agent):
    mv = _mv("chronicler", chronicler_score=0.7, myth_entry="memory_keeper")
    persona = agent.generate(mv)
    assert persona.address == "记忆守护者"
    assert persona.response_bias == "story"
    assert persona.emotional_tone == "respectful"


def test_restorer_persona(agent):
    mv = _mv("restorer", restorer_score=0.75, myth_entry="sanctuary_weaver")
    persona = agent.generate(mv)
    assert persona.address == "圣域编织者"
    assert persona.response_bias == "repair"
    assert persona.emotional_tone == "warm"


def test_recluse_persona(agent):
    mv = _mv("recluse", recluse_score=0.7, myth_entry="void_walker")
    persona = agent.generate(mv)
    assert persona.address == "虚空行者"
    assert persona.response_bias == "solitude"
    assert persona.emotional_tone == "wary"


def test_resonant_persona(agent):
    mv = _mv("resonant", resonant_score=0.85, myth_entry="echo_bearer")
    persona = agent.generate(mv)
    assert persona.address == "回声承载者"
    assert persona.response_bias == "resonance"
    assert persona.emotional_tone == "warm"


# ---------------------------------------------------------------------------
# 信任度规则
# ---------------------------------------------------------------------------

def test_high_resonant_score_raises_trust(agent):
    low = agent.generate(_mv("resonant", resonant_score=0.1))
    high = agent.generate(_mv("resonant", resonant_score=0.9))
    assert high.trust_level > low.trust_level


def test_high_recluse_lowers_trust(agent):
    low_recluse = agent.generate(_mv("recluse", recluse_score=0.1))
    high_recluse = agent.generate(_mv("recluse", recluse_score=0.9))
    assert high_recluse.trust_level < low_recluse.trust_level


def test_trust_always_in_range(agent):
    for dominant in ["explorer", "chronicler", "restorer", "recluse", "resonant", "wanderer"]:
        mv = _mv(dominant, resonant_score=1.0, recluse_score=1.0)
        persona = agent.generate(mv)
        assert 0.0 <= persona.trust_level <= 1.0


# ---------------------------------------------------------------------------
# myth_entry 标签
# ---------------------------------------------------------------------------

def test_high_trust_adds_myth_tag(agent):
    mv = _mv("resonant", resonant_score=0.9, myth_entry="echo_bearer")
    persona = agent.generate(mv)
    assert any("myth:echo_bearer" in t for t in persona.persona_tags)


def test_low_trust_no_myth_tag(agent):
    mv = _mv("recluse", recluse_score=0.9, myth_entry="void_walker")
    persona = agent.generate(mv)
    myth_tags = [t for t in persona.persona_tags if t.startswith("myth:")]
    assert len(myth_tags) == 0


# ---------------------------------------------------------------------------
# greeting 非空
# ---------------------------------------------------------------------------

def test_greeting_nonempty(agent):
    for dominant in ["explorer", "chronicler", "restorer", "recluse", "resonant", "wanderer"]:
        persona = agent.generate(_mv(dominant))
        assert len(persona.greeting) > 0


# ---------------------------------------------------------------------------
# merge 滑动更新
# ---------------------------------------------------------------------------

def test_merge_trust_is_ema(agent):
    existing = agent.generate(_mv("wanderer"))
    existing.trust_level = 0.8
    new_mv = _mv("restorer", restorer_score=0.6, myth_entry="sanctuary_weaver")
    merged = agent.merge(existing, new_mv)
    fresh_trust = agent.generate(new_mv).trust_level
    expected = round(0.3 * fresh_trust + 0.7 * 0.8, 3)
    assert merged.trust_level == expected


def test_merge_updates_dominant(agent):
    existing = agent.generate(_mv("wanderer"))
    merged = agent.merge(existing, _mv("chronicler", chronicler_score=0.7))
    assert merged.dominant_meaning == "chronicler"
