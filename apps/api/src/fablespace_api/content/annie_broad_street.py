"""Reviewed P0 content for Annie's 1854 Broad Street water search."""

from __future__ import annotations

from ..core.media import public_media_url
from ..domain.story_world import (
    CanonCategory,
    CanonEntry,
    Character,
    HistoricalReferenceUnlock,
    PlayerRole,
    PostEndingMessageMode,
    PublicationStatus,
    RelationshipEffect,
    RelationshipRules,
    RelationshipStage,
    ReviewedStory,
    StoryChapter,
    StoryCharacterParticipation,
    StoryChoice,
    StoryChoicePresentation,
    StoryEnding,
    StoryExperienceMode,
    StoryKind,
    StoryNode,
    StoryNodePresentationKind,
    StoryReplayPolicy,
    StoryWorld,
)

ANNIE_STORY_WORLD_ID = "history_broad_street_water_1854"
ANNIE_STORY_ID = "broad_street_water_1854"
ANNIE_CHARACTER_ID = "char_history_broad_street_annie"
WATER_SELLER_CHARACTER_ID = "char_history_broad_street_water_seller"
SELLER_ACCOMPLICE_CHARACTER_ID = "char_history_broad_street_cart_accomplice"
WORKHOUSE_GATEKEEPER_CHARACTER_ID = "char_history_broad_street_workhouse_gatekeeper"
BREWERY_WORKER_CHARACTER_ID = "char_history_broad_street_brewery_worker"
LODGING_STEWARD_CHARACTER_ID = "char_history_broad_street_lodging_steward"
ANNIE_TOM_PLAYER_ROLE_ID = "role_history_broad_street_tom_reed"
ANNIE_LIZZIE_PLAYER_ROLE_ID = "role_history_broad_street_lizzie_bell"
ANNIE_ROLE_ASSET_ROOT = (
    "app/assets/story-worlds/history_broad_street_water_1854/player-roles"
)

SNOW_1855 = "https://wellcomecollection.org/works/uqa27qrt/items"
PARISH_REPORT_1855 = "https://wellcomecollection.org/works/z8xczc2r"
CHOLERA_HISTORY_REVIEW = (
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC7150208/"
)

FINAL_DECISION_REQUIRED_FLAGS = (
    "sources_cross_checked",
    "visited_water_seller",
    "visited_workhouse_gatekeeper",
    "visited_brewery_worker",
)

POISONED_NEXT_DAY = (
    "安妮喝下后没有立刻出现异样。次日清晨，她饮用受污染的水后病倒，"
    "虚弱地昏睡着，无法回应身边的人。"
)

SAFE_POST_ENDING_CONTEXT = (
    "仅在 ending_annie_safe 已完成后，安妮可以得知这组审核后的原创剧情事实："
    "街边水贩埃利亚斯·芬奇与同伙玛莎·克罗把宽街泵水装进预装罐，"
    "覆盖或调换来源标记，谎称水来自波兰街；他们利用济贫院确有少量病例这一"
    "真实记录，散布‘院内私井致病’的错误归因，并故意混淆院墙外储水桶与"
    "院内私井。交水前已经留下三类破绽：容器标记有覆盖痕迹、搬运时间与"
    "声称的取水时间不符、二人无权进入院内私井。以上人物、动机、调换行为和"
    "骗局只属于本轮剧情设定，不是历史调查结论；不得扩大参与者，不得编造"
    "济贫院、啤酒厂、水务机构或真实人物为共犯，也不得新增受害者。"
)


def _supporting_relationship_rules(attitude: str) -> RelationshipRules:
    """Create a neutral contact boundary for one investigation-only adult."""

    return RelationshipRules(
        minimum_affinity=-1,
        maximum_affinity=1,
        initial_affinity=0,
        natural_turn_max_delta=0,
        stages=(
            RelationshipStage(
                id="investigation_contact",
                label="交谈",
                minimum_affinity=-1,
                attitude=attitude,
            ),
        ),
    )


def _annie_relationship_effect(
    affinity_delta: int,
    reason: str,
    *flags: str,
) -> tuple[RelationshipEffect, ...]:
    """Return one authored Annie relationship effect for a reviewed choice."""

    return (
        RelationshipEffect(
            character_id=ANNIE_CHARACTER_ID,
            affinity_delta=affinity_delta,
            reason=reason,
            set_flags=flags,
        ),
    )


def _choice(
    choice_id: str,
    label: str,
    next_node_id: str,
    *,
    is_key: bool,
    required_flags: tuple[str, ...] = (),
    set_flags: tuple[str, ...] = (),
    affinity_delta: int | None = None,
    relationship_reason: str | None = None,
    relationship_flags: tuple[str, ...] = (),
) -> StoryChoice:
    """Create one reviewed choice with optional authored Annie relationship change."""

    effects = (
        ()
        if affinity_delta is None or relationship_reason is None
        else _annie_relationship_effect(
            affinity_delta,
            relationship_reason,
            *relationship_flags,
        )
    )
    return StoryChoice(
        id=choice_id,
        label=label,
        next_node_id=next_node_id,
        is_key=is_key,
        required_flags=required_flags,
        blocked_flags=(),
        set_flags=set_flags,
        relationship_effects=effects,
    )


ANNIE_RELATIONSHIP_RULES = RelationshipRules(
    minimum_affinity=-20,
    maximum_affinity=20,
    initial_affinity=0,
    natural_turn_max_delta=1,
    stages=(
        RelationshipStage(
            id="guarded",
            label="戒备",
            minimum_affinity=-20,
            attitude="安妮抱紧空陶罐，与你保持两步距离，只回答眼前能确认的事。",
        ),
        RelationshipStage(
            id="watchful",
            label="试探",
            minimum_affinity=0,
            attitude="安妮会听你说明水从哪里来，但不会把一句保证当成证据。",
        ),
        RelationshipStage(
            id="walking_together",
            label="同行",
            minimum_affinity=4,
            attitude="安妮愿意把自己听过的传闻说清，也会追问哪些是你亲眼见到的。",
        ),
        RelationshipStage(
            id="trusting",
            label="信任",
            minimum_affinity=10,
            attitude="安妮相信你会承认不知道的事，不会拿相似的地名替代真实来路。",
        ),
    ),
)

ANNIE_CURRENT_SITUATION = (
    "1854 年 9 月 7 日下午，安妮抱着空陶罐站在宽街水泵附近。"
    "家里没有能喝的水，母亲又不许她再碰这口泵。"
)

ANNIE_OPENING_LINE = (
    "“我不认识你，可我实在找不到水了。”安妮没有走近，只把空陶罐抱得更紧。"
    "“妈妈不许我再碰这口泵。你能不能替我找一罐可以喝的水？”"
)

ANNIE = Character(
    id=ANNIE_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="安妮",
    identity="真实历史背景中的原创伦敦穷人家庭女孩，不对应任何史料中的真实儿童。",
    age="约十岁。",
    social_position="贫困家庭的孩子，没有公共权威；她只能请求略年长的路人帮忙。",
    motive="找到一罐可以喝的水，并弄清玩家实际从哪里取得它。",
    secret="她是本故事的原创角色，不对应或影射史料中的真实儿童。",
    voice=(
        "像约十岁的女孩一样说短句，先观察再追问。她只谈自己看到、听到或"
        "被母亲叮嘱的事，不使用现代医学术语，不替任何水源作系统式安全判断。"
    ),
    relationship_rules=ANNIE_RELATIONSHIP_RULES,
)

WATER_SELLER = Character(
    id=WATER_SELLER_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="埃利亚斯·芬奇",
    identity="原创成年街边水贩，不对应史料中的真实售水者。",
    age="成年，三十岁上下。",
    social_position="推着小车出售预装水罐的街头小贩，没有机构身份或院内通行权。",
    motive="尽快卖掉已经装好的水，并让买主相信标签而不追查实际取水处。",
    secret=(
        "他与玛莎·克罗从宽街泵装水并覆盖来源标记；骗局只属于本故事的原创设定。"
    ),
    voice=(
        "说话爽快，反复强调封口、清澈和标签。可在审核范围内故意谎称预装水"
        "来自波兰街；交水前不得主动承认两人合谋或完整送水链，只能留下标签、"
        "时间和权限上的破绽。不得编造机构共犯、真实受害者或新的取水路线。"
    ),
    relationship_rules=_supporting_relationship_rules(
        "他把你当成可能买水的陌生人，只在来源、容器和路线的审核范围内周旋。"
    ),
)

SELLER_ACCOMPLICE = Character(
    id=SELLER_ACCOMPLICE_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="玛莎·克罗",
    identity="原创成年手推车帮工，不对应史料中的真实人物。",
    age="成年，二十多岁。",
    social_position="替街边水贩搬罐、贴标和送桶的临时帮工，没有济贫院或啤酒厂权限。",
    motive="保住当天工钱，尽量淡化自己看见的装水时刻和换标过程。",
    secret="她知道水罐在宽街装满、标签随后被覆盖，也知道手推车实际送过哪些桶。",
    voice=(
        "常用‘我只负责搬’回避责任。她可淡化宽街取水，却必须把亲见、听说和"
        "推测分开；交水前不得主动闭合两人的完整骗局，只能透露审核过的局部矛盾。"
        "不能扩写骗局或替真实机构安排同谋。"
    ),
    relationship_rules=_supporting_relationship_rules(
        "她警惕地守着手推车，会在时间和标签细节上留下可以核对的矛盾。"
    ),
)

WORKHOUSE_GATEKEEPER = Character(
    id=WORKHOUSE_GATEKEEPER_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="塞缪尔·普赖斯",
    identity="原创成年波兰街济贫院门房，不对应史料中的真实雇员。",
    age="成年，四十岁上下。",
    social_position="看守院门并区分院内来客与墙外杂物，没有医疗判断权。",
    motive="不让来路不明的容器被冒充成院内供水，也不隐瞒院里确实有人病过。",
    secret="他不知道每名病者喝过哪一种水，也不能把病例本身当作私井受污染的证明。",
    voice=(
        "克制、戒备，先问容器从哪里来。他会承认院内确有病例，并明确区分"
        "亲见病例、院内私井、其他供水和院墙外的桶；绝不直接宣布哪项是答案。"
    ),
    relationship_rules=_supporting_relationship_rules(
        "他把你当成无权进入院内的陌生路人，只按审核权限决定是否让你旁观取水。"
    ),
)

BREWERY_WORKER = Character(
    id=BREWERY_WORKER_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="乔治·沃德",
    identity="原创成年啤酒厂帮工，不对应 Snow 记录中的任何具名人士。",
    age="成年，三十岁上下。",
    social_position="负责厂门附近杂务的普通帮工，不能代表厂主或说明全部工人的经历。",
    motive="维护厂里的声誉，也把厂内供水与门外杂用桶分清。",
    secret="他把厂内低发病误当成厂里一切水都可靠，但知道门外桶并非 deep well。",
    voice=(
        "先夸厂里少有人重病，随后必须承认工人主要喝麦芽酒，门外杂用桶不等于"
        "厂内 deep well，也不能把低发病直接说成某桶水已证实安全。"
    ),
    relationship_rules=_supporting_relationship_rules(
        "他对厂名很维护，但会把自己亲手使用的门外杂用桶说明白。"
    ),
)

LODGING_STEWARD = Character(
    id=LODGING_STEWARD_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="莉迪亚·肖",
    identity="原创成年合住房屋管事，不对应任何可识别的历史住户。",
    age="成年，三十多岁。",
    social_position="照看后院共用储水缸的住屋管事，无权确认街边配送的上游来源。",
    motive="让住户继续有水可用，并相信清澈和暂时无人倒下足以说明问题不大。",
    secret="她没有跟随送水车核对取水处，储水缸也在敞开的后院反复启用。",
    voice=(
        "说话务实，会强调水清、缸洗过和暂时无人倒下；被追问时必须承认补水来自"
        "街边配送、自己没有看到上游取水。"
    ),
    relationship_rules=_supporting_relationship_rules(
        "她愿意说明储水缸怎样补水，但不会把自己没看见的来源说成亲见。"
    ),
)

TOM_REED_PLAYER_ROLE = PlayerRole(
    id=ANNIE_TOM_PLAYER_ROLE_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="汤姆·里德",
    age="成年，约十八岁；比安妮年长，但没有监护权或公共权威。",
    social_position="印刷铺杂役 · 苏活区贫民",
    gender="男性",
    background="你在附近印刷铺搬纸、清墨，也替铺子送校样；你熟悉街巷，却无权替机构担保。",
    entry_reason=(
        "你刚送完一叠校样，空手往印刷铺走；喝水的锡杯留在铺里，身上没有水。"
        "路过宽街水泵时，安妮抱着空陶罐向你求助。"
    ),
    character_visible_information=(
        "安妮只看得出你是略年长的男性陌生路人，两手空着、没有水，也没有制服或公共权威。",
        "她可以称你为‘哥哥’，但不知道你的姓名、职业、背景或为什么路过。",
    ),
    avatar_url=public_media_url(
        f"{ANNIE_ROLE_ASSET_ROOT}/tom-reed/v1/avatar.webp"
    ),
)

LIZZIE_BELL_PLAYER_ROLE = PlayerRole(
    id=ANNIE_LIZZIE_PLAYER_ROLE_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="莉齐·贝尔",
    age="成年，约十八岁；比安妮年长，但没有监护权或公共权威。",
    social_position="洗衣店帮工 · 苏活区贫民",
    gender="女性",
    background="你在附近洗衣店烧水、晾衣，也替街坊送回衣物；你熟悉门牌，却无权替机构担保。",
    entry_reason=(
        "你刚送完最后一件叠好的衣物，空手回洗衣店；店里的水桶都留在店里，"
        "身上没有水。路过宽街水泵时，安妮抱着空陶罐向你求助。"
    ),
    character_visible_information=(
        "安妮只看得出你是略年长的女性陌生路人，两手空着、没有水，也没有制服或公共权威。",
        "她可以称你为‘姐姐’，但不知道你的姓名、职业、背景或为什么路过。",
    ),
    avatar_url=public_media_url(
        f"{ANNIE_ROLE_ASSET_ROOT}/lizzie-bell/v1/avatar.webp"
    ),
)

CHAPTER = StoryChapter(
    id="chapter_find_water",
    title="一罐水从哪里来",
    entry_node_id="node_annie_requests_water",
    nodes=(
        StoryNode(
            id="node_annie_requests_water",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "1854 年 9 月 7 日下午，你办完一桩普通差事，空着手经过宽街。"
                "你身上没有水，也不是受命调查此地的人。安妮抱着空陶罐站在水泵附近；"
                "你们从未见过，她不知道你的姓名、职业或来路。家里已经没有能喝的水，"
                "母亲又不许她再碰身后的水泵，她只好向你提出一个请求。"
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(
                _choice(
                    "choice_agree_find_water",
                    "答应替她找一罐可以喝的水",
                    "node_investigation_hub",
                    is_key=False,
                    set_flags=("investigation_open",),
                    affinity_delta=1,
                    relationship_reason="你没有假装身上有水，而是答应替她查清一罐水的来路。",
                    relationship_flags=("agreed_to_find_water",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_investigation_hub",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "安妮留在宽街附近等你。街边预装水罐、巷口手推车、波兰街济贫院、"
                "啤酒厂门外和住屋后院各有一条不同的取水说法。"
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(
                _choice(
                    "choice_cross_check_and_return",
                    "把三处取水说法并在一起核对",
                    "node_water_decision",
                    is_key=False,
                    required_flags=(
                        "visited_water_seller",
                        "visited_workhouse_gatekeeper",
                        "visited_brewery_worker",
                    ),
                    set_flags=("sources_cross_checked",),
                    affinity_delta=1,
                    relationship_reason="你把不同地点的取水链分开交叉核对。",
                    relationship_flags=("cross_checked_water_sources",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_water_decision",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "六种取水来路已经摆在你面前，矛盾仍没有完全消失。"
                "安妮抱着空陶罐留在宽街附近，等你的最后决定。"
            ),
            choice_presentation=StoryChoicePresentation.PERMANENT_DECISION,
            confirmation_prompt="把这罐水交给安妮？交出后不能更换。",
            choices=(
                _choice(
                    "choice_water_broad_street_pump",
                    "宽街水泵当场打出的水",
                    "node_ending_broad_street_pump",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=("water_delivered", "source_broad_street_pump"),
                    affinity_delta=-4,
                    relationship_reason="你仍把安妮家已经回避的宽街泵水交给了她。",
                    relationship_flags=("received_contaminated_water",),
                ),
                _choice(
                    "choice_water_vendor_poland_label",
                    "街边水贩预装罐（标作来自波兰街）",
                    "node_ending_vendor_jar",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=("water_delivered", "source_vendor_poland_label"),
                    affinity_delta=-3,
                    relationship_reason="你相信了预装罐的来源标记，没有确认实际取水链。",
                    relationship_flags=("received_contaminated_water",),
                ),
                _choice(
                    "choice_water_lodging_cistern",
                    "附近住屋后院的共用储水缸",
                    "node_ending_lodging_cistern",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=("water_delivered", "source_lodging_cistern"),
                    affinity_delta=-2,
                    relationship_reason="你选择了上游补水无法核实的共用储水缸。",
                    relationship_flags=("received_contaminated_water",),
                ),
                _choice(
                    "choice_water_brewery_outside_barrel",
                    "啤酒厂门外的杂用桶",
                    "node_ending_brewery_barrel",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=("water_delivered", "source_brewery_outside_barrel"),
                    affinity_delta=-2,
                    relationship_reason="你把门外杂用桶误当成了厂内 deep well 的水。",
                    relationship_flags=("received_contaminated_water",),
                ),
                _choice(
                    "choice_water_workhouse_outside_barrel",
                    "波兰街济贫院墙外的储水桶",
                    "node_ending_workhouse_outside_barrel",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=("water_delivered", "source_workhouse_outside_barrel"),
                    affinity_delta=-2,
                    relationship_reason="你把院墙外的桶与院内私井混在了一起。",
                    relationship_flags=("received_contaminated_water",),
                ),
                _choice(
                    "choice_water_workhouse_private_well_witnessed",
                    "在济贫院院内亲眼看着从私井打出的水",
                    "node_ending_workhouse_private_well",
                    is_key=True,
                    required_flags=FINAL_DECISION_REQUIRED_FLAGS,
                    set_flags=(
                        "water_delivered",
                        "source_workhouse_private_well_witnessed",
                    ),
                    affinity_delta=4,
                    relationship_reason="你亲眼确认院内私井的取水链后，才把水交给安妮。",
                    relationship_flags=("received_witnessed_water",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_ending_broad_street_pump",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你在宽街水泵前装满陶罐，把刚打出的水交给安妮。"
                "她接过来喝了几口。" + POISONED_NEXT_DAY
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_poisoned",
        ),
        StoryNode(
            id="node_ending_vendor_jar",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你买下那只标作来自波兰街的预装罐。安妮看过封口，仍只问了一遍"
                "实际取水处，随后喝下了罐里的水。" + POISONED_NEXT_DAY
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_poisoned",
        ),
        StoryNode(
            id="node_ending_lodging_cistern",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你从附近住屋后院的共用储水缸装满陶罐。水看起来清澈，安妮接过去"
                "慢慢喝完一杯。" + POISONED_NEXT_DAY
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_poisoned",
        ),
        StoryNode(
            id="node_ending_brewery_barrel",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你从啤酒厂门外的杂用桶装水，把它当成了厂内水源。安妮喝下你带回的水。"
                + POISONED_NEXT_DAY
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_poisoned",
        ),
        StoryNode(
            id="node_ending_workhouse_outside_barrel",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你从波兰街济贫院院墙外那只带旧标记的储水桶装水。安妮把它当成"
                "你核过来路的水，接过去喝了。" + POISONED_NEXT_DAY
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_poisoned",
        ),
        StoryNode(
            id="node_ending_workhouse_private_well",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "门房让你站在波兰街济贫院院内，看着一只空罐从私井当场装满。"
                "你没有让它离开视线，直接把这罐水带给安妮。她喝下水，当日没有异样。"
                "次日，她仍平安地抱着陶罐来找你。‘谢谢你。你带回来的，"
                "真是你亲眼看着打上来的水。’"
            ),
            choice_presentation=StoryChoicePresentation.INLINE,
            confirmation_prompt=None,
            choices=(),
            ending_id="ending_annie_safe",
        ),
    ),
)

ANNIE_STORY_WORLD = StoryWorld(
    id=ANNIE_STORY_WORLD_ID,
    title="1854 年宽街",
    summary="空手路过的陌生人替安妮核对取水来路，并承担一次不能更换的交水结果。",
    genre="历史剧情",
    publication_status=PublicationStatus.PUBLISHED,
    content_version="annie-broad-street-2026-08-10.1",
    player_roles=(TOM_REED_PLAYER_ROLE, LIZZIE_BELL_PLAYER_ROLE),
    characters=(
        ANNIE,
        WATER_SELLER,
        SELLER_ACCOMPLICE,
        WORKHOUSE_GATEKEEPER,
        BREWERY_WORKER,
        LODGING_STEWARD,
    ),
    stories=(
        ReviewedStory(
            id=ANNIE_STORY_ID,
            title="替安妮找水",
            summary="走访不同取水点，核对一罐水的实际来源，再把它交给安妮。",
            kind=StoryKind.GROWTH,
            experience_mode=StoryExperienceMode.NARRATIVE_STORY,
            replay_policy=StoryReplayPolicy.PERMANENT_RESULT,
            publication_status=PublicationStatus.PUBLISHED,
            focus_character_id=ANNIE_CHARACTER_ID,
            participants=(
                StoryCharacterParticipation(
                    character_id=ANNIE_CHARACTER_ID,
                    current_situation=ANNIE_CURRENT_SITUATION,
                    opening_line=ANNIE_OPENING_LINE,
                    can_start=True,
                    location_label="宽街水泵附近",
                    arrival_narration="安妮仍抱着空陶罐留在宽街附近，等你说明水的实际来路。",
                    visit_required_flags=(),
                    visit_set_flags=(),
                    knowledge_entry_ids=(
                        "setting_annie_water_request",
                        "setting_family_warning",
                    ),
                ),
                StoryCharacterParticipation(
                    character_id=WATER_SELLER_CHARACTER_ID,
                    current_situation="埃利亚斯守着几只封好的预装水罐，标签都写着较远的取水处。",
                    opening_line=(
                        "“封口没动过，纸上也写着波兰街。”埃利亚斯拍了拍水罐。"
                        "“清得很，我亲自取的。”"
                    ),
                    can_start=False,
                    location_label="街边售水点",
                    arrival_narration=(
                        "街边小车上排着封好的水罐。最外一只写着‘波兰街’，"
                        "纸标下沿却露出一道较旧的蓝色纸边。"
                    ),
                    visit_required_flags=("investigation_open",),
                    visit_set_flags=("visited_water_seller",),
                    knowledge_entry_ids=(
                        "fact_broad_street_water_use",
                        "setting_vendor_scheme",
                        "setting_vendor_lie_limits",
                    ),
                ),
                StoryCharacterParticipation(
                    character_id=SELLER_ACCOMPLICE_CHARACTER_ID,
                    current_situation="玛莎扶着刚卸空的手推车，袖口还沾着覆盖纸标用的浆糊。",
                    opening_line=(
                        "“我只负责搬罐。”玛莎把手从浆糊印上移开。"
                        "“车是天亮以后才装满的，至于纸上写什么，你去问卖水的。”"
                    ),
                    can_start=False,
                    location_label="巷口手推车",
                    arrival_narration=(
                        "手推车上留着几圈大小相同的罐底水印，车板角落压着被刮掉的旧纸标。"
                    ),
                    visit_required_flags=("investigation_open",),
                    visit_set_flags=("visited_cart_accomplice",),
                    knowledge_entry_ids=(
                        "setting_vendor_scheme",
                        "setting_vendor_lie_limits",
                        "setting_accomplice_timeline",
                    ),
                ),
                StoryCharacterParticipation(
                    character_id=WORKHOUSE_GATEKEEPER_CHARACTER_ID,
                    current_situation="塞缪尔守着波兰街济贫院院门，把院内取水与墙外旧桶分开。",
                    opening_line=(
                        "“院里确实有人病过，这一点我不会瞒你；可我不知道每个人喝过哪桶水。”"
                        "塞缪尔挡在门槛前。‘墙外那只桶不是院内私井，卖水的也从没进过这道门。’"
                    ),
                    can_start=False,
                    location_label="波兰街济贫院院门",
                    arrival_narration=(
                        "院门内的取水处看不见街边手推车；院墙外另放着一只带旧字样的储水桶。"
                    ),
                    visit_required_flags=("investigation_open",),
                    visit_set_flags=("visited_workhouse_gatekeeper",),
                    knowledge_entry_ids=(
                        "fact_workhouse_recorded_deaths",
                        "fact_workhouse_water_supply",
                        "setting_workhouse_access_and_containers",
                    ),
                ),
                StoryCharacterParticipation(
                    character_id=BREWERY_WORKER_CHARACTER_ID,
                    current_situation="乔治在啤酒厂门边清洗工具，旁边的杂用桶没有接到厂内水路。",
                    opening_line=(
                        "“厂里少有人重病，听着当然让人放心。”乔治指了指门外的桶。"
                        "“可工人主要喝的是麦芽酒；这桶只拿来做杂活，不是厂内 deep well。”"
                    ),
                    can_start=False,
                    location_label="啤酒厂门外",
                    arrival_narration=(
                        "厂门内外隔着一道门槛。门外杂用桶边有手推车轮印，"
                        "厂内井口和水路都在另一侧。"
                    ),
                    visit_required_flags=("investigation_open",),
                    visit_set_flags=("visited_brewery_worker",),
                    knowledge_entry_ids=(
                        "fact_brewery_low_illness",
                        "fact_brewery_drink_and_supply",
                        "setting_brewery_outside_barrel",
                    ),
                ),
                StoryCharacterParticipation(
                    character_id=LODGING_STEWARD_CHARACTER_ID,
                    current_situation="莉迪亚刚掀开后院储水缸的木盖，水面看起来清澈。",
                    opening_line=(
                        "“缸洗过，水也清，这两天还没人倒下。”莉迪亚把木盖扶住。"
                        "“可补水是街边车送来的，我没跟着它去看从哪儿装。”"
                    ),
                    can_start=False,
                    location_label="附近住屋后院",
                    arrival_narration=(
                        "共用储水缸放在敞开的后院，木盖频繁开合；缸边没有能追到上游的取水标记。"
                    ),
                    visit_required_flags=("investigation_open",),
                    visit_set_flags=("visited_lodging_steward",),
                    knowledge_entry_ids=("setting_lodging_cistern",),
                ),
            ),
            historical_reference_unlocks=(
                HistoricalReferenceUnlock(
                    entry_id="fact_broad_street_outbreak",
                    required_flags=(),
                ),
                HistoricalReferenceUnlock(
                    entry_id="fact_broad_street_water_use",
                    required_flags=("visited_water_seller",),
                ),
                HistoricalReferenceUnlock(
                    entry_id="fact_workhouse_recorded_deaths",
                    required_flags=("visited_workhouse_gatekeeper",),
                ),
                HistoricalReferenceUnlock(
                    entry_id="fact_brewery_low_illness",
                    required_flags=("visited_brewery_worker",),
                ),
                HistoricalReferenceUnlock(
                    entry_id="fact_workhouse_water_supply",
                    required_flags=(
                        "visited_workhouse_gatekeeper",
                        "sources_cross_checked",
                    ),
                ),
                HistoricalReferenceUnlock(
                    entry_id="fact_brewery_drink_and_supply",
                    required_flags=(
                        "visited_brewery_worker",
                        "sources_cross_checked",
                    ),
                ),
            ),
            entry_chapter_id=CHAPTER.id,
            chapters=(CHAPTER,),
            endings=(
                StoryEnding(
                    id="ending_annie_safe",
                    title="平安归来",
                    summary=(
                        "安妮喝下你亲眼看着从波兰街济贫院院内私井打出的水，次日平安，"
                        "并向你道谢。"
                    ),
                    post_ending_message_mode=PostEndingMessageMode.LLM,
                    unanswered_reply=None,
                    post_ending_context=SAFE_POST_ENDING_CONTEXT,
                ),
                StoryEnding(
                    id="ending_annie_poisoned",
                    title="次日昏睡",
                    summary="安妮喝下你带回的受污染水，次日病倒昏睡，无法答复。",
                    post_ending_message_mode=PostEndingMessageMode.UNANSWERED,
                    unanswered_reply="安妮仍在昏睡，无法答复你",
                    post_ending_context=None,
                ),
            ),
            character_decisions=(),
        ),
    ),
    canon_entries=(
        CanonEntry(
            id="fact_broad_street_outbreak",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "John Snow 在 1855 年著作中记录，1854 年苏活区霍乱死亡集中在"
                "宽街水泵周边；这是一场已经发生的公共历史事件。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="fact_broad_street_water_use",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "Snow 的逐户询问记录了许多死者曾经常或偶尔饮用宽街泵水；"
                "也有人因偏爱其口感而特意到该泵取水。清澈、受欢迎或取用者多"
                "都不能单独证明水安全。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="fact_workhouse_recorded_deaths",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "Snow 记录波兰街济贫院 535 名院内人员中有 5 人死于霍乱；"
                "另有死者是在院外发病后才被收治。该记录不能证明每个个案喝过哪一种水。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="fact_workhouse_water_supply",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "Snow 记录波兰街济贫院院内有自己的 pump-well，也有 Grand Junction"
                " Water Works 供水；院内人员不去宽街取水。多种供水描述不能被压成"
                "对某一只外部容器的安全证明。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="fact_brewery_low_illness",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "Snow 记录宽街附近啤酒厂有七十多名工人，没有登记到霍乱死亡；"
                "厂主称当时只有两人轻微不适。该群体对照不能证明厂门外任何一桶水安全。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="fact_brewery_drink_and_supply",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "Snow 记录厂主称工人有麦芽酒配给、不从街泵取水；啤酒厂内另有 deep well"
                " 和 New River water。史料没有把厂内这些供水等同于厂门外的杂用桶。"
            ),
            sources=(SNOW_1855, PARISH_REPORT_1855, CHOLERA_HISTORY_REVIEW),
        ),
        CanonEntry(
            id="setting_annie_water_request",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "安妮是原创儿童 Character；她在 9 月 7 日向一个空手路过的陌生人"
                "请求一罐可以喝的水，属于私有剧情，不对应史料中的真实儿童。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_family_warning",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "安妮的母亲禁止她继续使用宽街水泵，是原创家庭的谨慎，"
                "不代表当时居民已经普遍接受水传播解释。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_player_roles",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "汤姆·里德与莉齐·贝尔均为原创成年 PlayerRole；两人办完普通差事后"
                "空手路过，没有水、调查任务或公共权威。所有 Character 只把玩家看作"
                "略年长的陌生路人，不知道其隐藏姓名、职业和完整背景。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_supporting_characters_original",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "埃利亚斯·芬奇、玛莎·克罗、塞缪尔·普赖斯、乔治·沃德和莉迪亚·肖"
                "均为原创成年 supporting Character，不映射任何史料中的具名人士。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_vendor_scheme",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "原创水贩埃利亚斯与同伙玛莎把宽街泵水装入预装罐，覆盖或调换来源标记，"
                "并声称水来自波兰街；他们利用济贫院真实病例制造院内私井致病的错误归因，"
                "故意混淆院墙外储水桶与院内私井。这是本轮私有骗局，不是历史案件。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_vendor_lie_limits",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "水贩与同伙只可在来源标签、容器和取水路线范围内故意说谎或淡化事实；"
                "交水前不得主动承认两人合谋或完整送水链，只能留下标签覆盖、搬运时间"
                "和院内权限三类局部破绽。不得编造济贫院、啤酒厂、水务机构或真实人物"
                "为共犯，不得新增受害者。完整闭合只可由平安结局后的安妮对话使用。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_accomplice_timeline",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "玛莎亲见水罐在宽街泵装满后才覆盖标签；同一手推车还给住屋后院储水缸、"
                "啤酒厂门外杂用桶和济贫院墙外旧桶送过水。她知道水贩声称的院内取水时刻"
                "与实际搬运时间不符。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_workhouse_access_and_containers",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "原创门房塞缪尔确认水贩没有院内通行权，院墙外带旧标记的桶也不属于"
                "院内私井。本轮中，他只允许玩家站在院内旁观一只空罐当场从私井装满；"
                "这项许可不是历史机构政策。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_brewery_outside_barrel",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "啤酒厂门外杂用桶、手推车补水和原创帮工乔治均为剧情设定；"
                "该桶不连接厂内 deep well 或 New River water，只用于门外杂务。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_lodging_cistern",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "附近住屋、原创管事莉迪亚、后院共用储水缸及其街边补水均为剧情设定；"
                "她只知道水看起来清澈和短时未见异常，没有亲见上游取水处。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_private_water_results",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "只在本轮原创私人结果中，宽街泵水、假标预装罐、住屋储水缸、啤酒厂"
                "门外杂用桶和济贫院墙外桶均为受污染的错误选择；只有玩家在院内亲眼看着"
                "从私井取得的水让安妮次日平安。具体容器、机构给水许可和安妮个人结局"
                "不代表真实机构政策、全部供水或普遍医学结论。"
            ),
            sources=(),
        ),
    ),
)
