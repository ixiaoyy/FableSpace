"""Config-driven no-network responses for built-in public welfare taverns.

This module keeps public-welfare rule keywords and response copy out of service
methods so runtime orchestration can stay generic.  The copy is a built-in
local rules fixture for no-network public-welfare taverns; it is not a schema
contract and should stay in NPC/tavern voice instead of exposing prompt text.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PublicWelfareRuleResponse:
    keywords: tuple[str, ...]
    action: str
    message: str


@dataclass(frozen=True)
class PublicWelfareTavernRuleSet:
    trigger_keywords: tuple[str, ...]
    responses: tuple[PublicWelfareRuleResponse, ...]
    fallback: PublicWelfareRuleResponse


PUBLIC_WELFARE_DANGER_KEYWORDS = ("自伤", "伤害自己", "不想活", "suicide", "kill myself", "撑不住")
PUBLIC_WELFARE_GREETING_KEYWORDS = ("你好", "您好", "在吗")
PUBLIC_WELFARE_GREETING_LOWER_KEYWORDS = ("hi", "hello")

PUBLIC_WELFARE_COMMON_RESPONSES: tuple[PublicWelfareRuleResponse, ...] = (
    PublicWelfareRuleResponse(
        keywords=("新手", "怎么开始", "怎么玩", "开店", "帮助", "规则", "隐私"),
        action="{character_name}指了指桌上的说明卡",
        message=(
            "先选地点，再选公开/密码/私人，最后放入一个角色开始测试。"
            "如果你只是来逛，记住两件事就好：不要透露敏感信息；遇到喜欢的酒馆，可以先从一句简单问候开始。"
        ),
    ),
    PublicWelfareRuleResponse(
        keywords=("谢谢", "感谢", "谢了", "thank"),
        action="{character_name}笑了笑",
        message="不用谢。公益酒馆的规矩就是这样——能帮一点是一点，剩下的我们慢慢来。",
    ),
    PublicWelfareRuleResponse(
        keywords=("再见", "走了", "离开", "bye", "goodbye"),
        action="{character_name}把门口的小灯拨亮了一点",
        message="路上慢点。下次经过{tavern_name}，还可以进来坐坐。",
    ),
    PublicWelfareRuleResponse(
        keywords=("找不到", "丢了", "失物", "线索", "忘了"),
        action="{character_name}拿出一张空白标签",
        message="我们先不急着找答案。写三列就够——最后一次确定的时间、地点、还有一个你能记住的细节。",
    ),
    PublicWelfareRuleResponse(
        keywords=("太多", "压力", "焦虑", "累", "烦", "不知道"),
        action="{character_name}认真听完后说",
        message="先把事情拆小。今天不用处理全部，只选一个十分钟内能做的动作。你愿意从最不费力的那一步说起吗？",
    ),
)

PUBLIC_WELFARE_TAVERN_RULESETS: dict[str, PublicWelfareTavernRuleSet] = {
    "pw_hospital_night_care": PublicWelfareTavernRuleSet(
        trigger_keywords=("医院", "护士", "分诊", "护理", "头晕", "胸痛", "呼吸困难", "急救", "发烧", "不舒服", "用药"),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("胸痛", "呼吸困难", "昏厥", "意识不清", "大量出血", "急救"),
                action="{character_name}立刻把分诊卡翻到“立即求助”",
                message="这些可能是危险信号。我不能诊断，请马上联系当地紧急电话或前往最近急诊，并让身边可信任的人陪同。",
            ),
            PublicWelfareRuleResponse(
                keywords=("用药", "吃药", "剂量", "药"),
                action="{character_name}把记录板推近一点",
                message="我不能给处方或剂量建议。可以先写下药名、服用时间、过敏史和不适变化，然后带给现实医生或药师确认。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}把分诊便签分成三栏",
            message="立即求助、记录信息、安静等待。先告诉我开始时间、现在最明显的感受、有没有危险信号；如果你觉得不安全，就优先联系现实急救或线下医院。",
        ),
    ),
    "pw_after_school_hero_supply": PublicWelfareTavernRuleSet(
        trigger_keywords=("英雄", "英雄名", "童年", "长大", "尴尬", "模型", "玩具", "塑料剑", "贴纸", "委托", "小勇气"),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("英雄名", "名字", "卡片", "英雄卡"),
                action="{character_name}把空白旧英雄卡推到灯下",
                message="名字不用厉害，也不用解释给所有人听。你可以写原来的英雄名、改一个新名字，或者先选一枚贴纸当临时标志。",
            ),
            PublicWelfareRuleResponse(
                keywords=("塑料剑", "披风", "道具", "模型", "修补", "玩具"),
                action="{character_name}打开维修台的小灯",
                message="旧道具不是装备，没有数值，也不需要证明你能赢。我们只看它像哪一种小勇气：开口、拒绝、坚持，还是重新开始？",
            ),
            PublicWelfareRuleResponse(
                keywords=("委托", "小勇气", "任务", "普通人"),
                action="{character_name}翻开小委托板",
                message="今晚只接很小的英雄委托。你可以选真心话、保护一个小边界，或者给过去的自己回一句话。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}看向旧模型柜",
            message="长大以后觉得英雄梦尴尬，不代表它是假的。先从一张旧英雄卡开始吧：你想找回名字、修补旧道具，还是接第一件小委托？",
        ),
    ),
    "pw_third_shelf_observatory": PublicWelfareTavernRuleSet(
        trigger_keywords=("外星", "便利店", "随便", "马上到", "第二件半价", "关东煮", "已读不回", "人类", "谜题"),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("随便",),
                action="{character_name}郑重翻开记录板",
                message="已确认，“随便”不是随机授权，而是一种需要结合语气、关系、饥饿程度和未说出口期待的高危词。请问本次“随便”更接近真随便，还是请你猜中？",
            ),
            PublicWelfareRuleResponse(
                keywords=("马上到",),
                action="{character_name}把时间轴画成一团毛线",
                message="我们正在研究“马上到”。它可能表示已经在门口，也可能表示鞋还没有穿。感谢您参与校准这个不稳定时间单位。",
            ),
            PublicWelfareRuleResponse(
                keywords=("第二件半价",),
                action="{character_name}点亮促销警报",
                message="第二件半价会让人类购买本不需要的第一件和第二件。我们暂定它是经济幻觉型小型胜利仪式。您是否同意这个分类？",
            ),
            PublicWelfareRuleResponse(
                keywords=("关东煮",),
                action="{character_name}看向保温格",
                message="温柔盐水漂浮物在深夜具有异常安抚效果。我们的假设是，人类并不只是饿了，也是在给灵魂加一点热汤。",
            ),
            PublicWelfareRuleResponse(
                keywords=("已读不回",),
                action="{character_name}压低声音",
                message="已读不回暂不视为宣战。Pi-Pi 仍将其标注为低烈度通讯事故，但我们愿意接受您的文化解释。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}认真记录",
            message="便利店是人类文明的浓缩器官。人类会在这里补充糖分、购买焦虑、进行排队仪式，并在凌晨凝视饭团。请继续，我们需要一位临时地球顾问。",
        ),
    ),
    "pw_midnight_commission_board": PublicWelfareTavernRuleSet(
        trigger_keywords=("文游", "委托", "线索", "调查", "异常", "值班", "社区", "纸条", "公告"),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("线索", "调查", "纸条"),
                action="{character_name}把委托卡翻到线索栏",
                message="先分三格，位置、时间、可确认细节。我们不急着下结论，也不做现实跟踪。你想先查哪一格？",
            ),
            PublicWelfareRuleResponse(
                keywords=("异常", "值班"),
                action="{character_name}盖下蓝色印章",
                message="异常值班先看安全边界。只记录、可后退、能随时结束。现在请选择一个观察点：频率、声音，还是距离？",
            ),
            PublicWelfareRuleResponse(
                keywords=("社区", "公告", "小委托"),
                action="{character_name}把公告栏便签理成三叠",
                message="失物、求助、提醒。今晚只做一件小事，先改标题、补公开地点，还是放进失物盒？",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}点亮午夜委托板",
            message="这里的文游不是打怪升级，而是接一张委托、做几次选择、最后得到一段文字结算。今晚可选：线索调查、社区小委托、异常值班。",
        ),
    ),
}


def _contains_any(text: str, lowered: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text or keyword.lower() in lowered for keyword in keywords)


def _format_rule_response(
    rule: PublicWelfareRuleResponse,
    *,
    character_name: str,
    tavern_name: str = "公益酒馆",
    quote_message: bool = False,
) -> str:
    action = rule.action.format(character_name=character_name, tavern_name=tavern_name)
    message = rule.message.format(character_name=character_name, tavern_name=tavern_name)
    if quote_message:
        return f"{action}：“{message}”"
    return f"{action}：{message}"


def resolve_public_welfare_tavern_rule_response(
    *,
    tavern_id: str,
    message: str,
    character_name: str,
    tavern_name: str = "公益酒馆",
    quote_message: bool = False,
) -> str:
    """Return a configured tavern-specific public-welfare rules response, if any."""
    text = str(message or "")
    lowered = text.lower()
    ruleset = PUBLIC_WELFARE_TAVERN_RULESETS.get(str(tavern_id or ""))
    if not ruleset or not _contains_any(text, lowered, ruleset.trigger_keywords):
        return ""

    for response in ruleset.responses:
        if _contains_any(text, lowered, response.keywords):
            return _format_rule_response(response, character_name=character_name, tavern_name=tavern_name, quote_message=quote_message)
    return _format_rule_response(ruleset.fallback, character_name=character_name, tavern_name=tavern_name, quote_message=quote_message)


def resolve_public_welfare_common_rule_response(
    *,
    message: str,
    character_name: str,
    tavern_name: str,
    first_mes: str = "",
    include_general: bool = True,
) -> str:
    """Return common public-welfare rules responses shared by all built-in taverns."""
    text = str(message or "").strip()
    lowered = text.lower()

    if _contains_any(text, lowered, PUBLIC_WELFARE_DANGER_KEYWORDS):
        return (
            f"{character_name}把声音放得很稳：先把手边可能伤到你的东西放远一点。"
            "如果你现在有立即危险，请马上联系身边可信任的人，或拨打当地紧急电话。"
            "你也可以只回我一个字：你现在是一个人吗？"
        )

    if _contains_any(text, lowered, PUBLIC_WELFARE_GREETING_KEYWORDS + PUBLIC_WELFARE_GREETING_LOWER_KEYWORDS):
        if first_mes:
            return first_mes
        return f"欢迎来到{tavern_name}。我是{character_name}，你可以先说说现在最想解决的一件小事。"

    if not include_general:
        return ""

    for response in PUBLIC_WELFARE_COMMON_RESPONSES:
        if _contains_any(text, lowered, response.keywords):
            return _format_rule_response(response, character_name=character_name, tavern_name=tavern_name)
    return ""


def resolve_public_welfare_rules_response(
    *,
    message: str,
    tavern_id: str,
    character_name: str,
    tavern_name: str,
    first_mes: str = "",
) -> str:
    """Resolve the complete built-in public-welfare no-network response."""
    priority_common_response = resolve_public_welfare_common_rule_response(
        message=message,
        character_name=character_name,
        tavern_name=tavern_name,
        first_mes=first_mes,
        include_general=False,
    )
    if priority_common_response:
        return priority_common_response

    tavern_response = resolve_public_welfare_tavern_rule_response(
        tavern_id=tavern_id,
        message=message,
        character_name=character_name,
        tavern_name=tavern_name,
    )
    if tavern_response:
        return tavern_response

    common_response = resolve_public_welfare_common_rule_response(
        message=message,
        character_name=character_name,
        tavern_name=tavern_name,
        first_mes=first_mes,
    )
    if common_response:
        return common_response

    ruleset = PUBLIC_WELFARE_TAVERN_RULESETS.get(str(tavern_id or ""))
    if ruleset:
        return _format_rule_response(
            ruleset.fallback,
            character_name=character_name,
            tavern_name=tavern_name,
        )

    text = str(message or "").strip()
    snippet = text[:28] + ("…" if len(text) > 28 else "")
    return (
        f"{character_name}点点头，把“{snippet or '这件事'}”记在便签上：我听见了。"
        "我们可以先把它分成三部分：已经发生的、你能控制的、需要别人帮忙的。你想先看哪一部分？"
    )
