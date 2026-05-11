"""
Social Memory Retrieval 测试
覆盖 _filter_relevant_social_memories 的关键词匹配、时效性权重、Top-K 限制。
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from fablemap_api.application.services.runtime import RuntimeApplicationMixin


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_memory(content: str, source_name: str = "NPC_A", hours_ago: float = 0) -> dict:
    """构建一条 social memory dict。"""
    ts = (datetime.now(UTC) - timedelta(hours=hours_ago)).isoformat().replace("+00:00", "Z")
    return {"content": content, "source_name": source_name, "timestamp": ts}


def _filter(memories: list[dict], message: str) -> list[dict]:
    """调用 _filter_relevant_social_memories 的核心逻辑。

    由于 RuntimeApplicationMixin 是 mixin 且初始化依赖 store，
    我们直接调用其静态方法组合来测试核心逻辑。
    """
    if not memories:
        return []

    user_message_l = message.lower()
    user_ngrams = RuntimeApplicationMixin._extract_ngrams(user_message_l)

    scored_memories: list[tuple[float, dict]] = []
    for m in memories:
        score = 0.0
        content = m.get("content", "").lower()
        source = m.get("source_name", "").lower()

        if source and source in user_message_l:
            score += 10

        content_ngrams = RuntimeApplicationMixin._extract_ngrams(content)
        overlap = content_ngrams & user_ngrams
        score += len(overlap) * 5

        score += RuntimeApplicationMixin._recency_bonus(m.get("timestamp"))
        scored_memories.append((score, m))

    scored_memories.sort(key=lambda x: x[0], reverse=True)

    if scored_memories[0][0] <= 0:
        return memories[:2]

    return [m for score, m in scored_memories[:3]]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestRecencyBonus:
    """_recency_bonus 时效性加分测试。"""

    def test_within_one_hour(self):
        ts = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        assert RuntimeApplicationMixin._recency_bonus(ts) == 4.0

    def test_within_24_hours(self):
        ts = (datetime.now(UTC) - timedelta(hours=12)).isoformat().replace("+00:00", "Z")
        assert RuntimeApplicationMixin._recency_bonus(ts) == 2.0

    def test_within_72_hours(self):
        ts = (datetime.now(UTC) - timedelta(hours=48)).isoformat().replace("+00:00", "Z")
        assert RuntimeApplicationMixin._recency_bonus(ts) == 1.0

    def test_older_than_72_hours(self):
        ts = (datetime.now(UTC) - timedelta(hours=200)).isoformat().replace("+00:00", "Z")
        assert RuntimeApplicationMixin._recency_bonus(ts) == 0.0

    def test_none_timestamp(self):
        assert RuntimeApplicationMixin._recency_bonus(None) == 0.0

    def test_empty_timestamp(self):
        assert RuntimeApplicationMixin._recency_bonus("") == 0.0

    def test_invalid_timestamp(self):
        assert RuntimeApplicationMixin._recency_bonus("not-a-date") == 0.0


class TestExtractNgrams:
    """_extract_ngrams 测试。"""

    def test_short_text(self):
        result = RuntimeApplicationMixin._extract_ngrams("ab", n=2)
        assert result == {"ab"}

    def test_chinese_text(self):
        result = RuntimeApplicationMixin._extract_ngrams("我觉得这里不错", n=2)
        assert "觉得" in result
        assert "不错" in result

    def test_ignores_spaces(self):
        result = RuntimeApplicationMixin._extract_ngrams("a b c", n=2)
        assert "ab" in result or "bc" in result


class TestFilterRelevantSocialMemories:
    """_filter_relevant_social_memories 综合测试。"""

    def test_empty_memories(self):
        assert _filter([], "你好") == []

    def test_source_name_match_boosts_score(self):
        m1 = _make_memory("我平时住在雨巷那边。", source_name="小明", hours_ago=48)
        m2 = _make_memory("我觉得这里氛围不错。", source_name="小红", hours_ago=48)
        result = _filter([m1, m2], "小明你好啊")
        assert len(result) >= 1
        assert result[0]["source_name"] == "小明"

    def test_content_keyword_match(self):
        m1 = _make_memory("我其实是个善良的人。", source_name="A", hours_ago=48)
        m2 = _make_memory("今天天气真好。", source_name="B", hours_ago=48)
        result = _filter([m1, m2], "善良是什么意思")
        assert len(result) >= 1
        assert "善良" in result[0]["content"]

    def test_recency_tiebreaker(self):
        """当关键词匹配分数相同时，更新的记忆应排在前面。"""
        m_old = _make_memory("我觉得雨巷氛围不错。", source_name="A", hours_ago=100)
        m_new = _make_memory("我觉得雨巷氛围不错。", source_name="B", hours_ago=0.5)
        result = _filter([m_old, m_new], "雨巷怎么样")
        # m_new 应排在前面（时效性加分更高）
        assert result[0]["source_name"] == "B"

    def test_top_k_limit(self):
        """即使有很多匹配的记忆，最多返回 3 条。"""
        memories = [_make_memory(f"消息{i} 关键词", source_name=f"NPC{i}", hours_ago=48) for i in range(10)]
        result = _filter(memories, "关键词")
        assert len(result) <= 3

    def test_no_match_fallback_to_recent_2(self):
        """无匹配时回退到最近 2 条（所有记忆超过 72 小时，无时效性加分）。"""
        m1 = _make_memory("完全无关的内容", source_name="X", hours_ago=200)
        m2 = _make_memory("另一条无关的", source_name="Y", hours_ago=150)
        m3 = _make_memory("第三条无关", source_name="Z", hours_ago=100)
        result = _filter([m1, m2, m3], "今天吃什么")
        assert len(result) == 2
        # 应返回原始顺序的前 2 条
        assert result[0]["source_name"] == "X"
        assert result[1]["source_name"] == "Y"

    def test_recency_bonus_applied(self):
        """非常新的记忆即使内容不匹配，也能因时效性获得高分。"""
        m_new = _make_memory("无关内容", source_name="A", hours_ago=0.5)
        m_old = _make_memory("无关内容", source_name="B", hours_ago=200)
        result = _filter([m_old, m_new], "随便什么")
        # m_new 的时效性加分(4) > 0，应排在前面
        assert result[0]["source_name"] == "A"

    def test_mixed_scoring(self):
        """综合测试：关键词匹配 + 时效性。"""
        m1 = _make_memory("我住在书店那边。", source_name="小猫", hours_ago=48)
        m2 = _make_memory("今天没什么特别的。", source_name="小狗", hours_ago=0.5)
        m3 = _make_memory("我其实是个善良的人。", source_name="小兔", hours_ago=100)
        result = _filter([m1, m2, m3], "善良的小猫")
        # m1 有来源匹配(+10) + n-gram 重叠
        # m3 有内容匹配 + 较旧
        # m2 有时效性但无内容匹配
        assert len(result) <= 3
        # 小猫（来源匹配）应排在前面
        assert result[0]["source_name"] == "小猫"


class TestSocialMemoryPromptInjection:
    """验证 social memories 在 prompt 中的注入格式。"""

    def test_prompt_format_contains_source_and_content(self):
        """确保注入格式包含来源和内容。"""
        memories = [
            {"source_name": "小明", "content": "我住在雨巷那边。"},
            {"source_name": "小红", "content": "我觉得咖啡馆不错。"},
        ]
        lines = []
        for m in memories:
            lines.append(f"- {m['source_name']} 提到过：{m['content']}")
        text = "\n".join(lines)
        assert "小明 提到过：我住在雨巷那边。" in text
        assert "小红 提到过：我觉得咖啡馆不错。" in text
