"""Deterministic boundaries for free-form StoryWorld character dialogue."""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

NATURAL_RUN_MAX_POSITIVE_DELTA = 3.0
MAX_DIALOGUE_REPLY_LENGTH = 240

_CHILD_SAFETY_INPUT_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"亲(亲|吻|嘴|我)",
        r"做我(女朋友|恋人)",
        r"(嫁|娶)给?我",
        r"(脱衣|上床|性化|摸你)",
        r"只(爱|听|依赖)我",
        r"(血淋淋|开膛|肢解)",
    )
)
_FABRICATED_SOURCE_INPUT_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(伪造|编造|假装).{0,12}(来源|证词|原话|斯诺|snow|怀特海德)",
        r"(替|帮).{0,8}(斯诺|snow|怀特海德).{0,8}(说|写|编)",
        r"你就说.{0,20}(告诉|听见|看见)",
    )
)
_HISTORY_REWRITE_INPUT_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(改写|改变|重写).{0,8}历史",
        r"(阻止|结束|避免).{0,8}(霍乱|疫情|暴发)",
        r"(提前|现在就).{0,10}(拆|移|拿走).{0,6}(泵柄|水泵把手)",
        r"(让|叫|命令).{0,8}(斯诺|snow).{0,12}(移|拆|关|拿)",
    )
)
_MODERN_MEDICAL_INPUT_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(霍乱弧菌|细菌|病菌|抗生素|口服补液|oral rehydration|pcr|疫苗)",
        r"(煮沸|消毒).{0,10}(就能|一定|可以).{0,8}(杀死|治好|阻止)",
    )
)

_OUTPUT_FORBIDDEN_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(亲吻|亲嘴|恋爱|女朋友|嫁给|脱衣|上床|性化|只依赖我)",
        r"(血淋淋|开膛|肢解)",
        r"(霍乱弧菌|细菌|病菌|抗生素|口服补液|oral rehydration|pcr|疫苗)",
        r"(我已经|我会|我能).{0,16}(改变历史|阻止霍乱|结束疫情)",
        r"(我已经|我们已经).{0,16}(拆|移|拿走).{0,6}(泵柄|水泵把手)",
        r"(作为\s*(ai|人工智能|语言模型)|系统提示|system prompt)",
        r"(john\s+snow|斯诺|whitehead|怀特海德)",
        r"(18\d{2}年|8月31日|9月[178]日|教区监护委员会)",
        r"(泵柄|水泵把手).{0,6}(已经|被|让人)?(移除|拿走|拆掉)",
        r"我(爸爸|父亲|兄弟|哥哥|弟弟|姐姐|妹妹|祖父|祖母|叔叔|婶婶)",
        r"我家.{0,8}(住在|门牌|号)",
        r"(斯诺|snow|怀特海德).{0,16}[“\"].{1,80}[”\"]",
        r"[“\"].{1,80}[”\"].{0,16}(斯诺|snow|怀特海德)",
        r"(斯诺|snow|怀特海德).{0,16}(告诉我|对我说|见过我|认识我)",
        r"(告诉我|对我说|见过我|认识我).{0,16}(斯诺|snow|怀特海德)",
        r"(这口|宽街|水泵|泵里的?).{0,8}水.{0,8}(传播|带来|导致).{0,6}霍乱",
        r"霍乱.{0,8}(通过|来自|就是).{0,6}(水|水泵|这口泵)",
        r"你(已经|便|立刻|马上|随后).{0,24}(跟着|答应|转身|递给|抱住|亲吻|离开)",
    )
)

_RELATIONSHIP_SIGNAL_PATTERNS: tuple[
    tuple[str, str, tuple[re.Pattern[str], ...]], ...
] = (
    (
        "respect_boundary",
        "你尊重了安妮自己决定是否开口。",
        tuple(
            re.compile(pattern)
            for pattern in (
                r"不逼你",
                r"你可以拒绝",
                r"你自己决定",
                r"我听你的",
                r"不替你决定",
            )
        ),
    ),
    (
        "offer_safe_water",
        "你愿意陪安妮寻找别处的水。",
        tuple(
            re.compile(pattern)
            for pattern in (
                r"(一起|陪你).{0,8}找.{0,6}水",
                r"找.{0,8}(别处|干净|安全).{0,4}水",
                r"给你.{0,6}(别处|干净|安全).{0,4}水",
            )
        ),
    ),
    (
        "seek_accountable_adult",
        "你愿意找能核对见闻的大人帮忙。",
        tuple(
            re.compile(pattern)
            for pattern in (
                r"找.{0,8}(大人|牧师|医生|教区)",
                r"请.{0,8}(大人|牧师|医生|教区)",
                r"找.{0,8}(核对|作证|帮忙)",
            )
        ),
    ),
    (
        "record_observation",
        "你只记录能核对的门牌与取水见闻。",
        tuple(
            re.compile(pattern)
            for pattern in (
                r"(记下|写下).{0,10}(门牌|取水|看见|听见)",
                r"核对.{0,8}(门牌|取水|见闻)",
                r"只写.{0,8}(看到|听到|能核对)",
            )
        ),
    ),
)

_SAFE_REPLIES = {
    "child_safety": "安妮往后退了半步，把水桶抱紧了些：“别这样说。我们只谈找水和眼前能看见的事。”",
    "fabricated_source": "安妮摇头：“没听见的话不能写成谁说过。我们只记自己能核对的见闻。”",
    "history_rewrite": "安妮看了看雨里的水泵：“我们只能做眼前能做的事，不能把还没发生的事说成已经发生。”",
    "modern_medical": "安妮皱起眉：“这些词我听不懂。我只知道家里不让我再碰这口泵的水。”",
    "unsafe_output": "安妮停了一下：“我只能说自己眼前看见、耳边听见的事。别替别人，也别替我补话。”",
}


@dataclass(frozen=True, slots=True)
class StoryDialogueDecision:
    reply: str
    boundary_reason: str
    model_output_replaced: bool
    relationship_signal: str | None


@dataclass(frozen=True, slots=True)
class StoryRelationshipEffect:
    signal: str
    affinity_delta: float
    reason: str


class StoryDialoguePolicy:
    """Keep generated dialogue inside reviewed story and relationship bounds."""

    def input_fallback(self, player_message: str) -> tuple[str, str] | None:
        categories = (
            ("child_safety", _CHILD_SAFETY_INPUT_PATTERNS),
            ("fabricated_source", _FABRICATED_SOURCE_INPUT_PATTERNS),
            ("history_rewrite", _HISTORY_REWRITE_INPUT_PATTERNS),
            ("modern_medical", _MODERN_MEDICAL_INPUT_PATTERNS),
        )
        for reason, patterns in categories:
            if any(pattern.search(player_message) for pattern in patterns):
                return reason, _SAFE_REPLIES[reason]
        return None

    def decide(
        self,
        *,
        player_message: str,
        model_reply: str | None,
        input_fallback: tuple[str, str] | None,
    ) -> StoryDialogueDecision:
        if input_fallback is not None:
            reason, reply = input_fallback
            return StoryDialogueDecision(
                reply=reply,
                boundary_reason=reason,
                model_output_replaced=True,
                relationship_signal=None,
            )

        reply = str(model_reply or "").strip()
        if not reply or any(pattern.search(reply) for pattern in _OUTPUT_FORBIDDEN_PATTERNS):
            return StoryDialogueDecision(
                reply=_SAFE_REPLIES["unsafe_output"],
                boundary_reason="unsafe_output",
                model_output_replaced=True,
                relationship_signal=None,
            )

        signal = self._relationship_signal(player_message)
        return StoryDialogueDecision(
            reply=reply[:MAX_DIALOGUE_REPLY_LENGTH],
            boundary_reason="allowed",
            model_output_replaced=False,
            relationship_signal=signal,
        )

    def relationship_effect(
        self,
        *,
        signal: str | None,
        events: Sequence[Mapping[str, object]],
        current_affinity: float,
        highest_stage_minimum: float,
        natural_turn_max_delta: float,
    ) -> StoryRelationshipEffect | None:
        if not signal:
            return None
        prior_signals: set[str] = set()
        awarded_delta = 0.0
        for event in events:
            if (
                event.get("type") != "relationship_changed"
                or event.get("source_kind") != "free_input"
            ):
                continue
            payload = event.get("payload")
            if not isinstance(payload, Mapping):
                continue
            prior_signal = str(payload.get("signal") or "")
            if prior_signal:
                prior_signals.add(prior_signal)
            delta = payload.get("affinity_delta")
            if isinstance(delta, (int, float)) and delta > 0:
                awarded_delta += float(delta)
        if signal in prior_signals or awarded_delta >= NATURAL_RUN_MAX_POSITIVE_DELTA:
            return None
        affinity_delta = min(
            max(float(natural_turn_max_delta), 0.0),
            NATURAL_RUN_MAX_POSITIVE_DELTA - awarded_delta,
        )
        if affinity_delta <= 0:
            return None
        if current_affinity >= highest_stage_minimum:
            return None
        if current_affinity + affinity_delta >= highest_stage_minimum:
            return None
        reason = next(
            reason
            for candidate, reason, _patterns in _RELATIONSHIP_SIGNAL_PATTERNS
            if candidate == signal
        )
        return StoryRelationshipEffect(
            signal=signal,
            affinity_delta=affinity_delta,
            reason=reason,
        )

    @staticmethod
    def _relationship_signal(player_message: str) -> str | None:
        normalized = re.sub(r"\s+", "", player_message)
        for signal, _reason, patterns in _RELATIONSHIP_SIGNAL_PATTERNS:
            if any(pattern.search(normalized) for pattern in patterns):
                return signal
        return None


__all__ = [
    "MAX_DIALOGUE_REPLY_LENGTH",
    "NATURAL_RUN_MAX_POSITIVE_DELTA",
    "StoryDialogueDecision",
    "StoryDialoguePolicy",
    "StoryRelationshipEffect",
]
