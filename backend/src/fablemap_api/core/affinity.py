"""
好感度系统 (Affinity System)

提供访客-NPC好感度计算、等级管理和Prompt注入。

Features:
- AffinityStage 枚举定义
- AffinityCalculator 好感度计算器
- AffinityPromptBuilder Prompt上下文生成器
- 向后兼容现有 relationship_strength/relationship_stage 字段
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class AffinityStage(str, Enum):
    """好感度阶段枚举（正向路线）"""

    STRANGER = "stranger"           # 陌生人
    ACQUAINTANCE = "acquaintance"   # 点头之交
    FAMILIAR = "familiar"           # 熟面孔
    FRIEND = "friend"              # 朋友
    CLOSE_FRIEND = "close_friend"   # 挚友
    BEST_FRIEND = "best_friend"     # 知己

    @classmethod
    def from_string(cls, value: str) -> "AffinityStage":
        """从字符串解析阶段（向后兼容）"""
        if not value:
            return cls.STRANGER
        value = value.lower()
        # 兼容旧名称映射
        legacy_mapping = {
            "regular": cls.FAMILIAR,
            "confidant": cls.CLOSE_FRIEND,
        }
        if value in legacy_mapping:
            return legacy_mapping[value]
        try:
            return cls(value)
        except ValueError:
            return cls.STRANGER

    @property
    def label_zh(self) -> str:
        """中文标签"""
        labels = {
            self.STRANGER: "陌生人",
            self.ACQUAINTANCE: "点头之交",
            self.FAMILIAR: "熟面孔",
            self.FRIEND: "朋友",
            self.CLOSE_FRIEND: "挚友",
            self.BEST_FRIEND: "知己",
        }
        return labels.get(self, self.value)

    @property
    def label_en(self) -> str:
        """英文标签"""
        return self.value.replace("_", " ").title()

    @property
    def greeting_style(self) -> str:
        """称呼风格"""
        styles = {
            self.STRANGER: "formal",       # 礼貌称呼
            self.ACQUAINTANCE: "formal",   # 直呼姓名
            self.FAMILIAR: "casual",       # 昵称
            self.FRIEND: "casual",         # 昵称+亲昵词
            self.CLOSE_FRIEND: "intimate", # 亲昵称呼
            self.BEST_FRIEND: "special",   # 特殊称呼
        }
        return styles.get(self, "formal")

    @property
    def tone(self) -> str:
        """UI tone/color class"""
        tones = {
            self.STRANGER: "neutral",
            self.ACQUAINTANCE: "cyan",
            self.FAMILIAR: "blue",
            self.FRIEND: "green",
            self.CLOSE_FRIEND: "violet",
            self.BEST_FRIEND: "gold",
        }
        return tones.get(self, "neutral")

    @property
    def strength_min(self) -> float:
        """该阶段的最低强度值"""
        thresholds = {
            self.STRANGER: 0.0,
            self.ACQUAINTANCE: 0.15,
            self.FAMILIAR: 0.30,
            self.FRIEND: 0.50,
            self.CLOSE_FRIEND: 0.70,
            self.BEST_FRIEND: 0.90,
        }
        return thresholds.get(self, 0.0)

    @property
    def strength_max(self) -> float:
        """该阶段的最高强度值"""
        thresholds = {
            self.STRANGER: 0.15,
            self.ACQUAINTANCE: 0.30,
            self.FAMILIAR: 0.50,
            self.FRIEND: 0.70,
            self.CLOSE_FRIEND: 0.90,
            self.BEST_FRIEND: 1.0,
        }
        return thresholds.get(self, 1.0)

    @property
    def description(self) -> str:
        """NPC-facing relationship description."""
        descriptions = {
            self.STRANGER: "初次接触，礼貌但保持距离",
            self.ACQUAINTANCE: "知道对方存在，偶有交流",
            self.FAMILIAR: "经常见面，开始闲聊",
            self.FRIEND: "可以分享日常，有一定信任",
            self.CLOSE_FRIEND: "无话不谈，互相关心",
            self.BEST_FRIEND: "最高羁绊，特殊待遇",
        }
        return descriptions.get(self, "")

    def to_definition(self) -> dict[str, Any]:
        """Return a public-safe API definition for this affinity stage."""
        return {
            "stage": self.value,
            "name_zh": self.label_zh,
            "name_en": self.label_en,
            "strength_min": self.strength_min,
            "strength_max": self.strength_max,
            "tone": self.tone,
            "greeting_style": self.greeting_style,
            "description": self.description,
        }


# ─── 情感分析关键词 ───────────────────────────────────────────────────────────────


POSITIVE_KEYWORDS = [
    "谢谢", "感谢", "你好", "嗨", "嘿", "早上好", "晚上好",
    "很高兴", "开心", "快乐", "太好了", "太棒了", "真棒",
    "喜欢", "爱", "关心", "想念", "好久不见",
    "真有趣", "哈哈哈", "哈哈", "笑死", "好可爱",
    "不错", "很好", "优秀", "厉害", "崇拜",
    "对不起", "抱歉", "不好意思", "请原谅",
    "期待", "希望", "愿意", "乐意",
]

NEGATIVE_KEYWORDS = [
    "滚", "讨厌", "烦", "无聊", "差劲", "垃圾",
    "不想", "不要", "别", "闭嘴",
    "生气", "愤怒", "讨厌", "怨恨", "恨",
    "难过", "伤心", "痛苦", "郁闷",
    "质疑", "不信", "怀疑", "骗子",
]

NEUTRAL_KEYWORDS = [
    "哦", "嗯", "啊", "呃", "这个", "那个",
    "然后", "所以", "但是", "因为",
]


# ─── 好感度计算结果 ───────────────────────────────────────────────────────────────


@dataclass
class AffinityChange:
    """好感度变化详情"""

    delta: float           # 变化量（正数增加，负数减少）
    reason: str            # 变化原因
    event_type: str        # 事件类型: "chat", "gameplay", "decay", "manual"
    new_strength: float    # 变化后的强度值


@dataclass
class AffinityCalculatorResult:
    """好感度计算结果"""

    current_strength: float
    previous_stage: AffinityStage
    new_stage: AffinityStage
    stage_changed: bool
    changes: list[AffinityChange]
    greeting_style: str
    unlocked_topics: list[str]
    milestone_triggered: str | None  # 触发的里程碑对话ID

    def to_dict(self) -> dict[str, Any]:
        return {
            "strength": self.current_strength,
            "previous_stage": self.previous_stage.value,
            "new_stage": self.new_stage.value,
            "stage_label_zh": self.new_stage.label_zh,
            "stage_changed": self.stage_changed,
            "greeting_style": self.greeting_style,
            "unlocked_topics": self.unlocked_topics,
            "milestone_triggered": self.milestone_triggered,
        }


# ─── 好感度计算器 ────────────────────────────────────────────────────────────────


class AffinityCalculator:
    """
    好感度计算器

    根据访客行为计算好感度变化。
    """

    # 每次对话基础变化量
    BASE_CHAT_CHANGE = 0.02

    # 情感分析变化量
    POSITIVE_SENTIMENT_BOOST = 0.03
    NEGATIVE_SENTIMENT_PENALTY = -0.05
    NEUTRAL_SENTIMENT_CHANGE = 0.0

    # 游戏/任务完成奖励
    GAMEPLAY_COMPLETE_BOOST = 0.08
    GAMEPLAY_ABANDON_PENALTY = -0.03

    # 衰减机制（每次访问间隔超过阈值时触发）
    DECAY_THRESHOLD_DAYS = 7
    DECAY_SMALL = -0.02
    DECAY_LARGE_DAYS = 30
    DECAY_LARGE = -0.05

    # 连续未回复惩罚
    MISSED_RESPONSE_THRESHOLD = 3
    MISSED_RESPONSE_PENALTY = -0.03

    # 强度范围
    MIN_STRENGTH = 0.0
    MAX_STRENGTH = 1.0

    # 里程碑阈值（每次达到新阶段时触发）
    STAGE_MILESTONES = {
        AffinityStage.ACQUAINTANCE: "milestone_first_chat",
        AffinityStage.FAMILIAR: "milestone_regular_visitor",
        AffinityStage.FRIEND: "milestone_friend",
        AffinityStage.CLOSE_FRIEND: "milestone_close_friend",
        AffinityStage.BEST_FRIEND: "milestone_best_friend",
    }

    def calculate_chat_affinity(
        self,
        current_strength: float,
        current_stage: AffinityStage,
        visitor_message: str,
        character_response: str,
        *,
        interaction_count: int = 0,
    ) -> AffinityCalculatorResult:
        """
        计算对话后的好感度变化

        Args:
            current_strength: 当前好感度强度 (0.0-1.0)
            current_stage: 当前好感度阶段
            visitor_message: 访客发送的消息
            character_response: 角色回复
            interaction_count: 互动次数

        Returns:
            AffinityCalculatorResult
        """
        changes: list[AffinityChange] = []

        # 1. 基础对话变化
        base_change = self.BASE_CHAT_CHANGE
        changes.append(AffinityChange(
            delta=base_change,
            reason="完成一次对话",
            event_type="chat",
            new_strength=current_strength + base_change,
        ))

        # 2. 情感分析
        sentiment_change = self._analyze_sentiment(visitor_message)
        if sentiment_change != 0:
            changes.append(AffinityChange(
                delta=sentiment_change,
                reason="情感分析调整",
                event_type="chat",
                new_strength=current_strength + base_change + sentiment_change,
            ))

        # 3. 计算最终强度
        total_delta = sum(c.delta for c in changes)
        new_strength = max(self.MIN_STRENGTH, min(self.MAX_STRENGTH, current_strength + total_delta))

        # 4. 计算新阶段
        new_stage = self._stage_for_strength(new_strength)

        # 5. 检查阶段变化和里程碑
        stage_changed = new_stage != current_stage
        milestone_triggered = None
        if stage_changed and new_stage in self.STAGE_MILESTONES:
            milestone_triggered = self.STAGE_MILESTONES[new_stage]

        return AffinityCalculatorResult(
            current_strength=new_strength,
            previous_stage=current_stage,
            new_stage=new_stage,
            stage_changed=stage_changed,
            changes=changes,
            greeting_style=new_stage.greeting_style,
            unlocked_topics=self._get_unlocked_topics(new_stage),
            milestone_triggered=milestone_triggered,
        )

    def calculate_decay(
        self,
        current_strength: float,
        current_stage: AffinityStage,
        days_since_last_visit: int,
    ) -> AffinityCalculatorResult:
        """
        计算因长时间未访问导致的好感度衰减

        Args:
            current_strength: 当前好感度强度
            current_stage: 当前好感度阶段
            days_since_last_visit: 距离上次访问的天数

        Returns:
            AffinityCalculatorResult
        """
        changes: list[AffinityChange] = []

        if days_since_last_visit >= self.DECAY_LARGE_DAYS:
            decay = self.DECAY_LARGE
            changes.append(AffinityChange(
                delta=decay,
                reason=f"超过{days_since_last_visit}天未访问（大幅衰减）",
                event_type="decay",
                new_strength=current_strength + decay,
            ))
        elif days_since_last_visit >= self.DECAY_THRESHOLD_DAYS:
            decay = self.DECAY_SMALL
            changes.append(AffinityChange(
                delta=decay,
                reason=f"超过{days_since_last_visit}天未访问",
                event_type="decay",
                new_strength=current_strength + decay,
            ))

        total_delta = sum(c.delta for c in changes)
        new_strength = max(self.MIN_STRENGTH, min(self.MAX_STRENGTH, current_strength + total_delta))
        new_stage = self._stage_for_strength(new_strength)

        return AffinityCalculatorResult(
            current_strength=new_strength,
            previous_stage=current_stage,
            new_stage=new_stage,
            stage_changed=new_stage != current_stage,
            changes=changes,
            greeting_style=new_stage.greeting_style,
            unlocked_topics=self._get_unlocked_topics(new_stage),
            milestone_triggered=None,
        )

    def calculate_gameplay_result(
        self,
        current_strength: float,
        current_stage: AffinityStage,
        completed: bool,
    ) -> AffinityCalculatorResult:
        """
        计算游戏/任务结果对好感度的影响

        Args:
            current_strength: 当前好感度强度
            current_stage: 当前好感度阶段
            completed: 是否完成

        Returns:
            AffinityCalculatorResult
        """
        if completed:
            delta = self.GAMEPLAY_COMPLETE_BOOST
            reason = "完成游戏/任务"
            event_type = "gameplay"
        else:
            delta = self.GAMEPLAY_ABANDON_PENALTY
            reason = "放弃游戏/任务"
            event_type = "gameplay"

        new_strength = max(self.MIN_STRENGTH, min(self.MAX_STRENGTH, current_strength + delta))
        new_stage = self._stage_for_strength(new_strength)

        return AffinityCalculatorResult(
            current_strength=new_strength,
            previous_stage=current_stage,
            new_stage=new_stage,
            stage_changed=new_stage != current_stage,
            changes=[AffinityChange(
                delta=delta,
                reason=reason,
                event_type=event_type,
                new_strength=new_strength,
            )],
            greeting_style=new_stage.greeting_style,
            unlocked_topics=self._get_unlocked_topics(new_stage),
            milestone_triggered=None,
        )

    def _analyze_sentiment(self, message: str) -> float:
        """
        简单情感分析

        基于关键词匹配计算情感得分。
        实际生产环境可以使用更复杂的 NLP 模型。
        """
        if not message:
            return self.NEUTRAL_SENTIMENT_CHANGE

        message_lower = message.lower()

        # 计算正负关键词匹配数
        positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in message_lower)
        negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in message_lower)
        neutral_count = sum(1 for kw in NEUTRAL_KEYWORDS if kw in message_lower)

        # 消息太短时降低权重
        if len(message) < 5:
            positive_count = max(0, positive_count - 1)
            negative_count = max(0, negative_count - 1)

        # 根据情感分析结果调整
        if positive_count > negative_count:
            return min(self.POSITIVE_SENTIMENT_BOOST, 0.01 * positive_count)
        elif negative_count > positive_count:
            return max(self.NEGATIVE_SENTIMENT_PENALTY, -0.02 * negative_count)
        else:
            return self.NEUTRAL_SENTIMENT_CHANGE

    def _stage_for_strength(self, strength: float) -> AffinityStage:
        """根据强度值确定阶段"""
        if strength >= AffinityStage.BEST_FRIEND.strength_min:
            return AffinityStage.BEST_FRIEND
        elif strength >= AffinityStage.CLOSE_FRIEND.strength_min:
            return AffinityStage.CLOSE_FRIEND
        elif strength >= AffinityStage.FRIEND.strength_min:
            return AffinityStage.FRIEND
        elif strength >= AffinityStage.FAMILIAR.strength_min:
            return AffinityStage.FAMILIAR
        elif strength >= AffinityStage.ACQUAINTANCE.strength_min:
            return AffinityStage.ACQUAINTANCE
        else:
            return AffinityStage.STRANGER

    def _get_unlocked_topics(self, stage: AffinityStage) -> list[str]:
        """根据阶段获取已解锁的话题"""
        topic_map = {
            AffinityStage.STRANGER: [],
            AffinityStage.ACQUAINTANCE: ["daily_weather", "tavern_news"],
            AffinityStage.FAMILIAR: ["hobbies", "recent_events"],
            AffinityStage.FRIEND: ["personal_stories", "childhood_memories"],
            AffinityStage.CLOSE_FRIEND: ["deep_secrets", "worries", "dreams"],
            AffinityStage.BEST_FRIEND: ["exclusive_stories", "special_requests"],
        }
        return topic_map.get(stage, [])

    def stage_definitions(self) -> list[dict[str, Any]]:
        """Return public stage metadata in ascending relationship order."""
        return affinity_stage_definitions()


# ─── Prompt 上下文生成器 ────────────────────────────────────────────────────────


@dataclass
class AffinityPromptContext:
    """好感度 Prompt 上下文"""

    stage: AffinityStage
    stage_label: str
    strength_percent: int
    greeting_style: str
    unlocked_topics: list[str]
    exclusive_greetings: list[str]
    behavior_hints: str

    def to_prompt_block(self) -> str:
        """生成 Prompt 块内容"""
        topics_str = "、".join(self.unlocked_topics) if self.unlocked_topics else "（暂无）"
        greetings_str = "\n".join(f"- {g}" for g in self.exclusive_greetings) if self.exclusive_greetings else ""

        return f"""【当前访客关系状态】
关系阶段：{self.stage_label}
好感度：{self.strength_percent}%
已解锁话题：{topics_str}

【角色行为指引】
称呼风格：{self.greeting_style}
{self.behavior_hints}
{f'\n【专属问候语】（可选择使用）\n{greetings_str}' if greetings_str else ''}"""


class AffinityPromptBuilder:
    """
    好感度 Prompt 上下文生成器

    根据访客好感度状态生成 NPC 行为提示。
    """

    GREETING_TEMPLATES = {
        "formal": [
            "你好，欢迎光临。",
            "欢迎，有什么需要帮忙的吗？",
            "您好，请随意看看。",
        ],
        "casual": [
            "嘿，你来啦！",
            "哟，今天来得挺早啊！",
            "哈喽！又见面了！",
        ],
        "intimate": [
            "嘿，老朋友！今天怎么样？",
            "你来啦！我一直在等你呢~",
            "太好了，你来了！今天想聊什么？",
        ],
        "special": [
            "（眼睛一亮）你终于来了！快坐快坐！",
            "（热情地迎上去）我的好朋友！今天有什么新鲜事？",
            "（笑容满面）就知道你会来！来，位置都给你留着呢！",
        ],
    }

    BEHAVIOR_HINTS = {
        "formal": "保持礼貌和适当距离，使用正式的称呼和用语。",
        "casual": "语气轻松随意，可以称呼对方名字或简单昵称。",
        "intimate": "语气亲切温暖，表现出关心和熟络感。",
        "special": "表现出特别的热情和亲近，把对方当做最重要的人。",
    }

    def build_context(
        self,
        stage: AffinityStage,
        strength: float,
        *,
        interaction_count: int = 0,
    ) -> AffinityPromptContext:
        """
        构建好感度 Prompt 上下文

        Args:
            stage: 好感度阶段
            strength: 好感度强度 (0.0-1.0)
            interaction_count: 互动次数

        Returns:
            AffinityPromptContext
        """
        greeting_style = stage.greeting_style
        exclusive_greetings = self.GREETING_TEMPLATES.get(greeting_style, self.GREETING_TEMPLATES["formal"])
        behavior_hints = self.BEHAVIOR_HINTS.get(greeting_style, self.BEHAVIOR_HINTS["formal"])

        # 根据互动次数调整问候语选择
        if interaction_count > 10 and greeting_style in ("casual", "intimate"):
            # 老朋友使用更热情的问候
            exclusive_greetings = self.GREETING_TEMPLATES.get("intimate", exclusive_greetings)

        return AffinityPromptContext(
            stage=stage,
            stage_label=stage.label_zh,
            strength_percent=max(0, min(100, round(strength * 100))),
            greeting_style=greeting_style,
            unlocked_topics=AffinityCalculator()._get_unlocked_topics(stage),
            exclusive_greetings=exclusive_greetings,
            behavior_hints=behavior_hints,
        )

    def build_prompt_block(
        self,
        stage: AffinityStage,
        strength: float,
        *,
        interaction_count: int = 0,
    ) -> str:
        """直接生成 Prompt 块内容"""
        ctx = self.build_context(stage, strength, interaction_count=interaction_count)
        return ctx.to_prompt_block()


# ─── 工具函数 ──────────────────────────────────────────────────────────────────


def relationship_stage_for_affinity(strength: float, visit_count: int = 0) -> str:
    """
    兼容旧 API 的阶段计算函数

    使用新的 AffinityStage 枚举，但返回字符串以保持向后兼容。
    """
    calculator = AffinityCalculator()
    stage = calculator._stage_for_strength(strength)
    return stage.value


def affinity_stage_definitions() -> list[dict[str, Any]]:
    """Public API stage definitions for UI display."""
    return [
        stage.to_definition()
        for stage in (
            AffinityStage.STRANGER,
            AffinityStage.ACQUAINTANCE,
            AffinityStage.FAMILIAR,
            AffinityStage.FRIEND,
            AffinityStage.CLOSE_FRIEND,
            AffinityStage.BEST_FRIEND,
        )
    ]


def strength_to_percent(strength: float) -> int:
    """将强度值转换为百分比"""
    return max(0, min(100, round(strength * 100)))


def percent_to_strength(percent: int) -> float:
    """将百分比转换为强度值"""
    return max(0.0, min(1.0, percent / 100.0))
