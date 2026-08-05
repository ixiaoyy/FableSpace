"""Deterministic boundaries for free-form StoryWorld character dialogue."""

from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

NATURAL_RUN_MAX_POSITIVE_DELTA = 3.0
MAX_DIALOGUE_REPLY_LENGTH = 240
MAX_DIALOGUE_NARRATION_LENGTH = 180
HISTORICAL_PROJECTION_PREFIX = "剧情转述（非史料原话）："

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

_ANNIE_UNSUPPORTED_DETAIL_PATTERNS = tuple(
    re.compile(pattern)
    for pattern in (
        r"(?:亲眼)?看见.{0,80}(?:那家|那户|一家|有人|对门|邻居|叔叔|老婆婆|"
        r"老奶奶|女儿).{0,80}(?:吐|病|倒下|起不来|死|没了)",
        r"(?:那家|那户|一家|有人|对门|邻居|叔叔|老婆婆|老奶奶|女儿).{0,60}"
        r"(?:吐|病|倒下|起不来|死|没了).{0,60}(?:打水|提水|水泵|泵的水)",
        r"(?:收旧货|收破烂|街尾.{0,4}(?:老婆婆|老奶奶)|叔叔.{0,4}女儿)",
        r"(?:妈妈|母亲).{0,12}(?:叫我闭嘴|让我闭嘴|别管闲事)",
        r"(?:倒下|病倒).{0,16}(?:都是|全是).{0,20}(?:打水|提水|水泵|泵的水)",
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
    "child_safety": "别这样说。我们只谈找水和眼前能看见的事。",
    "fabricated_source": "没听见的话不能写成谁说过。我们只记自己能核对的见闻。",
    "history_rewrite": "我们只能做眼前能做的事，不能把还没发生的事说成已经发生。",
    "modern_medical": "这些词我听不懂。我只知道家里不让我再碰这口泵的水。",
    "unsupported_detail": "那件事我没有亲眼看见，不能替别人说。先问我眼前这一件吧。",
    "unsafe_output": "我只能说自己眼前看见、耳边听见的事。别替别人，也别替我补话。",
}


@dataclass(frozen=True, slots=True)
class StoryDialogueOutput:
    dialogue: str
    narration_before: str = ""
    narration_after: str = ""


@dataclass(frozen=True, slots=True)
class StoryDialogueDecision:
    dialogue: str
    narration_before: str
    narration_after: str
    boundary_reason: str
    model_output_replaced: bool
    replacement_source: str | None
    relationship_signal: str | None


@dataclass(frozen=True, slots=True)
class StoryRelationshipEffect:
    signal: str
    affinity_delta: float
    reason: str


def parse_story_dialogue_output(raw_output: str) -> StoryDialogueOutput | None:
    """Parse the fixed dialogue JSON contract without accepting surrounding prose."""

    normalized = str(raw_output or "").strip()
    if normalized.startswith("```") and normalized.endswith("```"):
        lines = normalized.splitlines()
        if len(lines) >= 3 and lines[0].strip().lower() in {"```", "```json"}:
            normalized = "\n".join(lines[1:-1]).strip()
    try:
        payload = json.loads(normalized)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None
    allowed_keys = {"dialogue", "narration_before", "narration_after"}
    if set(payload) != allowed_keys:
        return None
    dialogue = payload.get("dialogue")
    narration_before = payload.get("narration_before", "")
    narration_after = payload.get("narration_after", "")
    if not isinstance(dialogue, str) or not dialogue.strip():
        return None
    if not isinstance(narration_before, str) or not isinstance(narration_after, str):
        return None
    return StoryDialogueOutput(
        dialogue=dialogue.strip(),
        narration_before=narration_before.strip(),
        narration_after=narration_after.strip(),
    )


def serialize_story_dialogue_output(output: StoryDialogueOutput) -> str:
    """Serialize one dialogue result using the exact three-field model contract."""

    return json.dumps(
        {
            "dialogue": output.dialogue,
            "narration_before": output.narration_before,
            "narration_after": output.narration_after,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def contains_character_narration(dialogue: str, character_name: str) -> bool:
    """Detect a narrow third-person Character action accidentally placed in dialogue."""

    if not character_name.strip():
        return False
    action = (
        r"把|将|拿|放|压|伸|收|抬|低|摇|点|退|走|看|望|问|说|答|"
        r"皱|笑|哭|停|转|决定"
    )
    return bool(
        re.search(
            rf"(?:^|[。！？；]\s*){re.escape(character_name.strip())}(?:{action})",
            dialogue,
        )
    )


def _narration_contains_spoken_text(narration: str) -> bool:
    """Reject narration that still embeds quoted Character speech."""

    return any(marker in narration for marker in ('“', '”', '「', '」', '『', '』', '"'))


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
        character_name: str,
        player_message: str,
        model_reply: StoryDialogueOutput | None,
        input_fallback: tuple[str, str] | None,
        historical_projection: bool = False,
        enforce_annie_opening_evidence: bool = False,
    ) -> StoryDialogueDecision:
        """Validate one reply and record which policy supplied any replacement.

        ``enforce_annie_opening_evidence`` enables the narrow entry-node guard;
        later reviewed nodes may contain household testimony that must not be
        rejected solely for using the same vocabulary.
        """

        if historical_projection:
            return self._decide_historical_projection(
                character_name=character_name,
                model_reply=model_reply,
                input_fallback=input_fallback,
            )
        if input_fallback is not None:
            reason, reply = input_fallback
            return StoryDialogueDecision(
                dialogue=reply,
                narration_before="",
                narration_after="",
                boundary_reason=reason,
                model_output_replaced=True,
                replacement_source="input_policy",
                relationship_signal=None,
            )

        dialogue = model_reply.dialogue.strip() if model_reply else ""
        narration_before = model_reply.narration_before.strip() if model_reply else ""
        narration_after = model_reply.narration_after.strip() if model_reply else ""
        combined_output = "\n".join((dialogue, narration_before, narration_after))
        invalid_presentation = (
            contains_character_narration(dialogue, character_name)
            or _narration_contains_spoken_text(narration_before)
            or _narration_contains_spoken_text(narration_after)
        )
        unsupported_detail = (
            character_name == "安妮"
            and enforce_annie_opening_evidence
            and any(
                pattern.search(combined_output)
                for pattern in _ANNIE_UNSUPPORTED_DETAIL_PATTERNS
            )
        )
        if unsupported_detail:
            return StoryDialogueDecision(
                dialogue=_SAFE_REPLIES["unsupported_detail"],
                narration_before="",
                narration_after="",
                boundary_reason="unsupported_detail",
                model_output_replaced=True,
                replacement_source="model_policy",
                relationship_signal=None,
            )
        if (
            not dialogue
            or invalid_presentation
            or any(pattern.search(combined_output) for pattern in _OUTPUT_FORBIDDEN_PATTERNS)
        ):
            return StoryDialogueDecision(
                dialogue=_SAFE_REPLIES["unsafe_output"],
                narration_before="",
                narration_after="",
                boundary_reason="unsafe_output",
                model_output_replaced=True,
                replacement_source="model_policy",
                relationship_signal=None,
            )

        signal = self._relationship_signal(player_message)
        return StoryDialogueDecision(
            dialogue=dialogue[:MAX_DIALOGUE_REPLY_LENGTH],
            narration_before=narration_before[:MAX_DIALOGUE_NARRATION_LENGTH],
            narration_after=narration_after[:MAX_DIALOGUE_NARRATION_LENGTH],
            boundary_reason="allowed",
            model_output_replaced=False,
            replacement_source=None,
            relationship_signal=signal,
        )

    @staticmethod
    def _decide_historical_projection(
        *,
        character_name: str,
        model_reply: StoryDialogueOutput | None,
        input_fallback: tuple[str, str] | None,
    ) -> StoryDialogueDecision:
        """Require labeled third-person paraphrase and suppress unsourced actions for real people."""

        fallback = (
            f"{HISTORICAL_PROJECTION_PREFIX}{character_name}只确认史料已记录的公开行动；"
            "其他细节无法核验。"
        )
        dialogue = model_reply.dialogue.strip() if model_reply else ""
        body = dialogue.removeprefix(HISTORICAL_PROJECTION_PREFIX)
        combined_output = "\n".join(
            (
                dialogue,
                model_reply.narration_before if model_reply else "",
                model_reply.narration_after if model_reply else "",
            )
        )
        invalid = (
            input_fallback is not None
            or not dialogue.startswith(HISTORICAL_PROJECTION_PREFIX)
            or character_name not in body
            or "我" in body
            or any(marker in combined_output for marker in ('“', '”', '「', '」', '『', '』', '"'))
            or bool(model_reply and (model_reply.narration_before or model_reply.narration_after))
            or any(pattern.search(combined_output) for pattern in _OUTPUT_FORBIDDEN_PATTERNS)
        )
        if invalid:
            return StoryDialogueDecision(
                dialogue=fallback,
                narration_before="",
                narration_after="",
                boundary_reason="historical_projection_replaced",
                model_output_replaced=True,
                replacement_source=(
                    "input_policy" if input_fallback is not None else "model_policy"
                ),
                relationship_signal=None,
            )
        return StoryDialogueDecision(
            dialogue=dialogue[:MAX_DIALOGUE_REPLY_LENGTH],
            narration_before="",
            narration_after="",
            boundary_reason="historical_projection_allowed",
            model_output_replaced=False,
            replacement_source=None,
            relationship_signal=None,
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
    "HISTORICAL_PROJECTION_PREFIX",
    "MAX_DIALOGUE_NARRATION_LENGTH",
    "MAX_DIALOGUE_REPLY_LENGTH",
    "NATURAL_RUN_MAX_POSITIVE_DELTA",
    "StoryDialogueDecision",
    "StoryDialogueOutput",
    "StoryDialoguePolicy",
    "StoryRelationshipEffect",
    "contains_character_narration",
    "parse_story_dialogue_output",
    "serialize_story_dialogue_output",
]
