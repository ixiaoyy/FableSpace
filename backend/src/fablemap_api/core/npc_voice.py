"""NPC identity and voice prompt helpers.

The helpers in this module do not invent or persist character content. They
only turn already-authored TavernCharacter fields into a compact runtime
contract so every chat prompt keeps the active NPC's identity and speaking
style distinct.
"""

from __future__ import annotations

from typing import Any


GENDER_LABELS = {
    "female": "女性",
    "male": "男性",
    "nonbinary": "非二元",
    "other": "其它/自定义",
    "unspecified": "未指定",
}


def _compact_text(value: Any, *, max_length: int = 420) -> str:
    text = " ".join(str(value or "").strip().split())
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 1]}…"


def _compact_list(values: Any, *, max_items: int = 8, max_item_length: int = 40) -> list[str]:
    if values is None:
        return []
    if isinstance(values, str):
        candidates = [item.strip() for item in values.replace("，", ",").split(",")]
    elif isinstance(values, (list, tuple, set)):
        candidates = [str(item or "").strip() for item in values]
    else:
        candidates = [str(values or "").strip()]

    result: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        text = _compact_text(item, max_length=max_item_length)
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        result.append(text)
        if len(result) >= max_items:
            break
    return result


def _gender_label(value: Any) -> str:
    key = str(value or "unspecified").strip().lower() or "unspecified"
    return GENDER_LABELS.get(key, key)


def build_npc_identity_block(
    *,
    name: Any = "",
    description: Any = "",
    personality: Any = "",
    scenario: Any = "",
    system_prompt: Any = "",
    first_mes: Any = "",
    mes_example: Any = "",
    gender: Any = "",
    tags: Any = None,
    hobbies: Any = None,
    traits: Any = None,
) -> str:
    """Render owner-authored NPC fields as identity/style facts."""

    npc_name = _compact_text(name, max_length=80) or "NPC"
    lines = [f"角色姓名：{npc_name}"]
    if description_text := _compact_text(description):
        lines.append(f"身份/公开描述：{description_text}")
    if personality_text := _compact_text(personality):
        lines.append(f"性格与说话底色：{personality_text}")
    if scenario_text := _compact_text(scenario):
        lines.append(f"当前处境/舞台：{scenario_text}")
    if system_prompt_text := _compact_text(system_prompt):
        lines.append(f"店主角色指令：{system_prompt_text}")

    gender_label = _gender_label(gender)
    if gender_label and gender_label != "未指定":
        lines.append(f"自声明性别/称呼参考：{gender_label}")

    tag_values = _compact_list(tags)
    if tag_values:
        lines.append(f"身份标签：{'、'.join(tag_values)}")

    hobby_values = _compact_list(hobbies)
    if hobby_values:
        lines.append(f"兴趣与偏好：{'、'.join(hobby_values)}")

    trait_values = _compact_list(traits)
    if trait_values:
        lines.append(f"行为特质：{'、'.join(trait_values)}")

    if first_mes_text := _compact_text(first_mes):
        lines.append(f"开场白/语气锚点：{first_mes_text}")
    if example_text := _compact_text(mes_example, max_length=700):
        lines.append(f"示例话术/节奏参考：{example_text}")

    if len(lines) == 1:
        lines.append("身份基线：店主至少登记了这个角色名；即使资料很少，也必须保持该角色第一人称/角色视角，不要退化成通用 AI 助手。")
    return "\n".join(lines)


def build_npc_voice_contract(
    *,
    name: Any = "",
    description: Any = "",
    personality: Any = "",
    scenario: Any = "",
    system_prompt: Any = "",
    first_mes: Any = "",
    mes_example: Any = "",
    gender: Any = "",
    tags: Any = None,
    hobbies: Any = None,
    traits: Any = None,
) -> str:
    """Build the non-optional prompt guard that keeps an NPC's voice distinct."""

    npc_name = _compact_text(name, max_length=80) or "NPC"
    identity = build_npc_identity_block(
        name=npc_name,
        description=description,
        personality=personality,
        scenario=scenario,
        system_prompt=system_prompt,
        first_mes=first_mes,
        mes_example=mes_example,
        gender=gender,
        tags=tags,
        hobbies=hobbies,
        traits=traits,
    )
    return (
        "【NPC身份与口吻底线】\n"
        f"你现在只能作为「{npc_name}」回应；以下内容是你的自我身份与说话风格来源，"
        "不要把它改写成平台说明或通用助手口吻。\n"
        f"{identity}\n"
        "回复要求：\n"
        f"- 始终以「{npc_name}」的角色视角接话；不要自称 AI、助手、系统或模型。\n"
        "- 先回应访客当前这句话，再自然带出你的身份、性格、动作或地点感；不要一上来解释产品规则。\n"
        "- 沿用上面的性格、标签、兴趣、开场白和示例话术形成独立语气，避免和其它 NPC 说成同一种客服腔。\n"
        "- 群聊时只代表自己发言，不替其它 NPC、店主或访客做决定，也不要替他们总结内心。\n"
        "- 信息不足时可以追问或承认不知道，但仍保持角色身份和当前空间氛围。"
    )


def build_rules_identity_phrase(
    *,
    description: Any = "",
    personality: Any = "",
    tags: Any = None,
) -> str:
    """A short in-character identity phrase for deterministic rules fallbacks."""

    tag_values = _compact_list(tags, max_items=2, max_item_length=18)
    if tag_values:
        return f"带着{'、'.join(tag_values)}的身份感"
    if description_text := _compact_text(description, max_length=36):
        return f"记着自己是{description_text}"
    if personality_text := _compact_text(personality, max_length=24):
        return f"保持{personality_text}的语气"
    return ""
