"""Config-driven no-network responses for built-in public welfare taverns.

This module keeps public-welfare rule keywords and response copy out of service
methods so runtime orchestration can stay generic.  The copy is a built-in
deterministic local fallback for public-welfare taverns; it is not a schema
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
        keywords=("新手", "怎么开始", "怎么玩", "帮助", "规则"),
        action="{character_name}指了指桌上的说明卡",
        message=(
            "先看清此刻发生的事件、在场角色和逼近的后果，再选一个人追问或一条线索行动。"
            "没有唯一正确路线；你可以拒绝、撒谎、换边或离开，但选择会留在这座 Space 的后续故事里。"
        ),
    ),
    PublicWelfareRuleResponse(
        keywords=("隐私", "公开吗", "会不会公开"),
        action="{character_name}把说明卡翻到私密一面",
        message="游玩身份、自声明性别、对话和回访记忆都是访客私有状态，不会进入公开角色资料或空间发现信息。",
    ),
    PublicWelfareRuleResponse(
        keywords=("谢谢", "感谢", "谢了", "thank"),
        action="{character_name}笑了笑",
        message="不用谢。你可以继续追问、换一条线索，或者先把选择停在这里。",
    ),
    PublicWelfareRuleResponse(
        keywords=("再见", "走了", "离开", "bye", "goodbye"),
        action="{character_name}替你留住了刚才那句话",
        message="路上慢点。下次回到{space_name}，故事会从你留下的选择继续。",
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
    "history_broad_street_water_1854": PublicWelfareTavernRuleSet(
        trigger_keywords=(
            "水", "给你", "给水", "不给", "拒绝", "水泵", "宽街", "妈妈", "母亲",
            "邻居", "街坊", "医生", "地图", "病例", "John Snow", "约翰", "雪诺",
            "名单", "门牌", "取水处", "亲眼", "听说", "核对", "猜测", "证据",
            "一起", "陪你", "离开", "只能帮到这里", "开始", "怎么玩", "帮助", "规则",
        ),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="安妮把缺口陶罐放到脚边",
                message="先回答我一件事：你碗里的水从哪来。说不准也没关系，我们还可以问邻居，或找那个拿着名单挨家问水源的医生。",
            ),
            PublicWelfareRuleResponse(
                keywords=("不给", "拒绝", "没有水", "空的", "不帮"),
                action="安妮抿住嘴，没有再伸手",
                message="那也行，我不拿你的。你若还愿意走几步，就陪我找别处，或找那个拿着死亡名单逐户问水源的医生。",
            ),
            PublicWelfareRuleResponse(
                keywords=("给你", "给水", "喝吧", "分你", "可以给"),
                action="安妮伸手伸到一半，又把陶罐抱紧",
                message="谢谢，可它是从哪儿来的？要也是宽街那口泵，我不能带回去。先查清水源，再决定给谁喝。",
            ),
            PublicWelfareRuleResponse(
                keywords=("水泵", "宽街", "井", "水源"),
                action="安妮朝街角那口手压泵看了一眼",
                message="我们家一直从那里打水。楼上和对门也去过，后来好几家都病了。妈妈只说别碰它，却没人肯告诉我还能去哪儿取水。",
            ),
            PublicWelfareRuleResponse(
                keywords=("妈妈", "母亲", "家里", "家人"),
                action="安妮把陶罐的缺口转到掌心里",
                message="妈妈没有让我来讨，她只说不能再碰那口泵。你若想帮，就先帮我弄清楚：病倒的几家是不是都从同一个地方取水。",
            ),
            PublicWelfareRuleResponse(
                keywords=("医生", "地图", "病例", "John Snow", "约翰", "雪诺", "画图"),
                action="安妮朝那个拿着死亡登记名单的人看去",
                message="他已经问过好些家，只问人喝过哪里的水。纸上有门牌和记号，可不是我们画一张图才让他想到水泵；我只能把自己确实知道的取水处说清。",
            ),
            PublicWelfareRuleResponse(
                keywords=("猜测", "随便写", "肯定就是", "我们先找到", "更像真的", "吓人的"),
                action="安妮把纸抽回自己手里",
                message="弄错可以划掉，猜的不能装成见过。我不要一个漂亮答案；你若愿意改，我们就只留下能核对的事。",
            ),
            PublicWelfareRuleResponse(
                keywords=("一起", "陪你", "自己说"),
                action="安妮把纸的一角递给你",
                message="那就一起走。我的话让我自己说；门牌若漏了，你在旁边补上。",
            ),
            PublicWelfareRuleResponse(
                keywords=("门牌", "取水处", "亲眼", "听说", "核对", "证据"),
                action="安妮把纸压在陶罐下面，分出三列",
                message="门牌写一边，取水处写一边。亲眼见的就说见过，只听人讲的就写‘听说’；这样大人才查得回去。",
            ),
            PublicWelfareRuleResponse(
                keywords=("离开", "只能帮到这里"),
                action="安妮把陶罐抱回怀里",
                message="好。你不用欠我，也不用让我欠你。我会贴着墙走，不碰那口泵。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="安妮守着空陶罐，没有催你",
            message="你可以不给水。可若愿意再做一件事，就帮我查清：你碗里的水、我家的水，还有病倒街坊的水，分别从哪儿来。",
        ),
    ),
    "story_palace_snow_edict": PublicWelfareTavernRuleSet(
        trigger_keywords=(
            "诏书", "皇帝", "太监", "公主", "宫门", "水门", "腰牌", "封蜡",
            "五更", "乞丐", "线索", "开始", "怎么玩", "帮助", "规则",
        ),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="{character_name}看向紧闭的寝殿门",
                message="五更前只做三件事：查半枚腰牌、问诏书为何重新封蜡、决定这扇门由魏观海还是萧明珠打开。你先选一件。",
            ),
            PublicWelfareRuleResponse(
                keywords=("魏观海", "太监", "掌印", "权力"),
                action="{character_name}把未宣诏书压在掌下",
                message="魏观海掌宫门和玉玺，开价从不白给；可他最怕的未必是公主闯门，而是诏书一宣，自己的掌印就要交出去。",
            ),
            PublicWelfareRuleResponse(
                keywords=("萧明珠", "公主", "任性", "闯"),
                action="{character_name}看向公主袖中露出的半枚腰牌",
                message="萧明珠敢闯，却已经连累一名小内侍被扣。若帮她，先问清她愿不愿意救出被自己拖下水的人。",
            ),
            PublicWelfareRuleResponse(
                keywords=("腰牌", "封蜡", "水门", "线索"),
                action="{character_name}把现有痕迹一一摆开",
                message="半枚水门腰牌、重新烘过的封蜡、后廊太医脚印。先查一处；它只能逼人说真话，不能自动证明谁想害皇帝。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}听见远处五更鼓又近了一刻",
            message="今夜只有两个人值得问：魏观海为什么不敢宣诏，萧明珠愿意为闯门付什么代价。你想先听哪一个？",
        ),
    ),
    "story_ghost_foxfire_debt": PublicWelfareTavernRuleSet(
        trigger_keywords=(
            "狐狸", "狐狸精", "狐妖", "绯月", "书生", "宁怀书", "报恩", "狐丹",
            "药", "月光", "破碗", "天亮", "开始", "怎么玩", "帮助", "规则",
        ),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="{character_name}看向窗外正在变淡的月色",
                message="天亮前要决定一碗药怎么处理。你可以帮绯月盛月光水、听宁怀书拒绝的理由，或逼两个人先把各自隐瞒的事说清楚。",
            ),
            PublicWelfareRuleResponse(
                keywords=("狐丹", "药", "救命", "代价"),
                action="{character_name}让狐火在药碗边亮了一圈",
                message="狐丹能救书生，却会让绯月退回普通狐狸并逐渐忘记人形记忆。借命必须知情同意，谁也不能偷偷替另一个人答应。",
            ),
            PublicWelfareRuleResponse(
                keywords=("绯月", "狐狸精", "狐妖", "报恩"),
                action="{character_name}看见月光下的影子轻轻晃出狐尾",
                message="绯月把十年前的一次救命背成了十年的债。先问她：若宁怀书不要这份牺牲，她还知不知道自己想过怎样的人生？",
            ),
            PublicWelfareRuleResponse(
                keywords=("宁怀书", "书生", "恩人", "认出"),
                action="{character_name}摸到枕边那把剪过猎夹的旧书刀",
                message="宁怀书早已认出绯月，却装作不知道。他不是不想活，而是不肯让她用百年修行为自己那一刻善意付账。",
            ),
            PublicWelfareRuleResponse(
                keywords=("月光", "破碗", "第三条路"),
                action="{character_name}把破碗放到窗下",
                message="月光水只能让药效延后一个时辰，不能取消代价。它能买来谈清楚的时间，不能凭空制造圆满结局。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}听着狐火在药碗里轻响",
            message="两个人都在说‘为你好’，也都没有问对方真正想要什么。你可以先问我：我隐瞒了什么，或者我最舍不得谁。",
        ),
    ),
    "story_campus_last_class": PublicWelfareTavernRuleSet(
        trigger_keywords=(
            "老师", "学生", "沈清禾", "顾野", "富二代", "试卷", "停职", "认错",
            "监控", "门禁", "替罪", "明早", "开始", "怎么玩", "帮助", "规则",
        ),
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="{character_name}把停职说明和门禁截图放在同一张桌上",
                message="明早八点前只查三件事：谁进了办公室、谁要替顾野顶罪、沈清禾为什么已经签字。你可以先听老师，或先听学生开价。",
            ),
            PublicWelfareRuleResponse(
                keywords=("沈清禾", "老师", "温柔", "停职"),
                action="{character_name}把停职说明翻到签名页",
                message="沈清禾知道顾野进去过，却给他一夜自己坦白。她的温柔不是没有底线；真正的问题是，她替学生承担是否也在纵容他逃避。",
            ),
            PublicWelfareRuleResponse(
                keywords=("顾野", "富二代", "学生", "有钱"),
                action="{character_name}看向那串被转得飞快的车钥匙",
                message="顾野能花钱删监控，也能让临时保洁顶罪。他嘴上说是在救老师，其实最怕亲口承认自己做不到用钱买回她的尊重。",
            ),
            PublicWelfareRuleResponse(
                keywords=("试卷", "监控", "门禁", "证据"),
                action="{character_name}把湿试卷、门禁截图和替罪短信排成一列",
                message="证据能证明顾野擅闯，也能证明有人准备让无辜者顶责。你可以公开它、拿它逼顾野自述，或先问沈清禾愿意等到什么时候。",
            ),
            PublicWelfareRuleResponse(
                keywords=("乞丐", "古代", "手机", "学校"),
                action="{character_name}先把现代校园的规矩说得尽量简单",
                message="这里不用跪，也不能因为有钱就合法免错。你可以吃面包、拒绝作证，再决定要不要评价他们口中的‘替别人承担’。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="{character_name}看了一眼离纪律会议越来越近的时间",
            message="这间教室只有两个问题：沈清禾为什么宁可停职，顾野为什么宁可花钱也不肯认错。你想先问哪一个？",
        ),
    ),
}


PUBLIC_WELFARE_CHARACTER_RULESETS: dict[tuple[str, str], PublicWelfareTavernRuleSet] = {
    ("history_broad_street_water_1854", "安妮"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["history_broad_street_water_1854"].trigger_keywords,
        responses=PUBLIC_WELFARE_TAVERN_RULESETS["history_broad_street_water_1854"].responses,
        fallback=PUBLIC_WELFARE_TAVERN_RULESETS["history_broad_street_water_1854"].fallback,
    ),
    ("story_palace_snow_edict", "魏观海"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_palace_snow_edict"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="魏观海把一碟未动的御膳推近半寸",
                message="先替咱家认一认后廊那件披风。说准了，饭和出宫的路都给你；说完再决定，要不要替公主送半枚腰牌。",
            ),
            PublicWelfareRuleResponse(
                keywords=("公主", "萧明珠", "腰牌", "封蜡", "水门", "线索"),
                action="魏观海用指节轻点未宣的诏书",
                message="公主敢闯门，却未必敢认被她连累的人。你可以替她传话，也可以拿半枚腰牌来换真诏书的一句话——先想清楚谁欠谁。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="魏观海仍带着客气的笑",
            message="宫里没有白问的话。你告诉咱家寝殿后廊是谁走过，咱家便告诉你今夜哪扇门能活着出去。",
        ),
    ),
    ("story_palace_snow_edict", "萧明珠"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_palace_snow_edict"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="萧明珠把两锭银子拍在半枚腰牌旁",
                message="先带我找水门，再去救被我连累的小内侍。银子可以买路，买不了你的命；你若看见不送命的办法，现在就顶嘴。",
            ),
            PublicWelfareRuleResponse(
                keywords=("魏观海", "太监", "腰牌", "封蜡", "水门", "线索"),
                action="萧明珠攥紧腰牌又慢慢松手",
                message="魏观海最会拿规矩吓人。可这腰牌确实害人被扣了。你替我查封蜡，我先把人救出来，然后再闯门。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="萧明珠不耐烦地把金簪拔下一半",
            message="要钱就开价，要我不连累人就直说。别替我磕头——替我找一条能进去、也能把人带出来的路。",
        ),
    ),
    ("story_ghost_foxfire_debt", "绯月"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_ghost_foxfire_debt"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="绯月让狐火绕着破碗转了一圈",
                message="替我盛月光、看住药碗，再当面逼我把狐丹的代价说全。三天饱饭照给；若我想瞒他，你就砸碗。",
            ),
            PublicWelfareRuleResponse(
                keywords=("宁怀书", "书生", "狐丹", "药", "月光", "报恩"),
                action="绯月的狐尾影在门缝后停住",
                message="我想救他，也怕他不要我救。你可以替我问，但不能替他答应；若他拒绝，先把买来的这一时辰用来听完理由。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="绯月把热饭推到你面前，却没碰药碗",
            message="饭不是封口费。你吃完只替我做一件事：我若把牺牲说成报恩，你就当场拆穿我。",
        ),
    ),
    ("story_ghost_foxfire_debt", "宁怀书"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_ghost_foxfire_debt"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="宁怀书把藏起的药碗放回桌上",
                message="先请她把代价亲口说完，再问她若我不喝，想怎样活。你不必劝我求生，只替我们拦住任何一方替另一方决定。",
            ),
            PublicWelfareRuleResponse(
                keywords=("绯月", "狐狸", "狐妖", "狐丹", "药", "月光", "报恩"),
                action="宁怀书按住枕边剪过猎夹的旧书刀",
                message="我早认出她了。救一只狐狸只花一刻钟，不该换她百年；可若我只会拒绝，也是在把死后的愧疚全留给她。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="宁怀书咳了一声，仍把椅子让给你",
            message="不用替谁报恩。请你做个局外人，问我们一句都不敢问的话：除了牺牲，还有没有能共同承担的代价。",
        ),
    ),
    ("story_campus_last_class", "沈清禾"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_campus_last_class"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="沈清禾把面包和水放在门禁截图旁",
                message="先吃，不欠我什么。之后你可以拒绝作证；若愿意帮忙，只说你亲眼看见的，再问我为什么给顾野等到明早。",
            ),
            PublicWelfareRuleResponse(
                keywords=("顾野", "学生", "富二代", "试卷", "监控", "门禁", "证据"),
                action="沈清禾盖住停职说明上的签名",
                message="证据能保住我，却不能替顾野学会负责。你不必替我撒谎，也别替他顶罪；到八点前，我只等他自己说一次。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="沈清禾把问题说得很慢",
            message="你可以不站任何一边。只帮我分清三件事：谁做了、谁承担、谁正在被推去替罪。",
        ),
    ),
    ("story_campus_last_class", "顾野"): PublicWelfareTavernRuleSet(
        trigger_keywords=PUBLIC_WELFARE_TAVERN_RULESETS["story_campus_last_class"].trigger_keywords,
        responses=(
            PublicWelfareRuleResponse(
                keywords=("开始", "怎么玩", "做什么", "帮助", "规则"),
                action="顾野转着车钥匙，报出一串条件",
                message="钱、饭、住处，你挑一样，替我让沈老师别去开会。你也可以拒绝，然后告诉我：为什么你什么都没有，反而比我更敢认一句错。",
            ),
            PublicWelfareRuleResponse(
                keywords=("沈清禾", "老师", "试卷", "监控", "门禁", "证据", "替罪"),
                action="顾野把没删干净的门禁截图扣在桌上",
                message="证据指向我，解决方案却要保洁背锅。我能花钱保住老师，但她会因此更看不起我。你拿走截图，或逼我自己交。",
            ),
        ),
        fallback=PublicWelfareRuleResponse(
            keywords=(),
            action="顾野第一次没把价码往上加",
            message="别讲大道理。你只告诉我，认错会失去什么；如果答案只是钱，我现在就能付。",
        ),
    ),
}


def _contains_any(text: str, lowered: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text or keyword.lower() in lowered for keyword in keywords)


def _format_rule_response(
    rule: PublicWelfareRuleResponse,
    *,
    character_name: str,
    space_name: str = "小馆",
    quote_message: bool = False,
) -> str:
    action = rule.action.format(character_name=character_name, space_name=space_name)
    message = rule.message.format(character_name=character_name, space_name=space_name)
    if quote_message:
        return f"{action}：“{message}”"
    return f"{action}：{message}"


def resolve_public_welfare_tavern_rule_response(
    *,
    space_id: str,
    message: str,
    character_name: str,
    space_name: str = "小馆",
    quote_message: bool = False,
) -> str:
    """Return a configured tavern-specific public-welfare rules response, if any."""
    text = str(message or "")
    lowered = text.lower()
    normalized_space_id = str(space_id or "")
    character_ruleset = PUBLIC_WELFARE_CHARACTER_RULESETS.get((normalized_space_id, str(character_name or "")))
    if character_ruleset and _contains_any(text, lowered, character_ruleset.trigger_keywords):
        for response in character_ruleset.responses:
            if _contains_any(text, lowered, response.keywords):
                return _format_rule_response(response, character_name=character_name, space_name=space_name, quote_message=quote_message)
        return _format_rule_response(character_ruleset.fallback, character_name=character_name, space_name=space_name, quote_message=quote_message)

    ruleset = PUBLIC_WELFARE_TAVERN_RULESETS.get(normalized_space_id)
    if not ruleset or not _contains_any(text, lowered, ruleset.trigger_keywords):
        return ""

    for response in ruleset.responses:
        if _contains_any(text, lowered, response.keywords):
            return _format_rule_response(response, character_name=character_name, space_name=space_name, quote_message=quote_message)
    return _format_rule_response(ruleset.fallback, character_name=character_name, space_name=space_name, quote_message=quote_message)


def resolve_public_welfare_common_rule_response(
    *,
    message: str,
    character_name: str,
    space_name: str,
    first_mes: str = "",
    include_general: bool = True,
    is_revisit: bool = False,
    revisit_cue: str = "",
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
        if is_revisit:
            remembered = str(revisit_cue or "上次留下的选择").strip()
            return f"{character_name}认出了你：{remembered}还在这里。我们从它之后继续，不必重新自我介绍。"
        if first_mes:
            return first_mes
        return f"欢迎来到{space_name}。我是{character_name}，你可以先说说现在最想解决的一件小事。"

    if not include_general:
        return ""

    for response in PUBLIC_WELFARE_COMMON_RESPONSES:
        if _contains_any(text, lowered, response.keywords):
            return _format_rule_response(response, character_name=character_name, space_name=space_name)
    return ""


def resolve_public_welfare_rules_response(
    *,
    message: str,
    space_id: str,
    character_name: str,
    space_name: str,
    first_mes: str = "",
    is_revisit: bool = False,
    revisit_cue: str = "",
) -> str:
    """Resolve the complete built-in public-welfare no-network response."""
    priority_common_response = resolve_public_welfare_common_rule_response(
        message=message,
        character_name=character_name,
        space_name=space_name,
        first_mes=first_mes,
        include_general=False,
        is_revisit=is_revisit,
        revisit_cue=revisit_cue,
    )
    if priority_common_response:
        return priority_common_response

    tavern_response = resolve_public_welfare_tavern_rule_response(
        space_id=space_id,
        message=message,
        character_name=character_name,
        space_name=space_name,
    )
    if tavern_response:
        return tavern_response

    common_response = resolve_public_welfare_common_rule_response(
        message=message,
        character_name=character_name,
        space_name=space_name,
        first_mes=first_mes,
        is_revisit=is_revisit,
        revisit_cue=revisit_cue,
    )
    if common_response:
        return common_response

    ruleset = PUBLIC_WELFARE_TAVERN_RULESETS.get(str(space_id or ""))
    if ruleset:
        return _format_rule_response(
            ruleset.fallback,
            character_name=character_name,
            space_name=space_name,
        )

    return ""
