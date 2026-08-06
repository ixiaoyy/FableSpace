"""Reviewed StoryWorld content for the 713 Xiantian palace coup."""

from __future__ import annotations

from ..core.media import public_media_url
from ..domain.story_world import (
    CanonCategory,
    CanonEntry,
    Character,
    PlayerRole,
    PublicationStatus,
    RelationshipRules,
    RelationshipStage,
    ReviewedStory,
    StoryChapter,
    StoryCharacterParticipation,
    StoryChoice,
    StoryEnding,
    StoryKind,
    StoryNode,
    StoryNodePresentationKind,
    StoryWorld,
)

PALACE_STORY_WORLD_ID = "story_palace_snow_edict"
PALACE_STORY_ID = "palace_snow_edict"
GAO_LISHI_CHARACTER_ID = "char_story_palace_eunuch_wei"
TAIPING_PRINCESS_CHARACTER_ID = "char_story_palace_princess_xiao"
PALACE_PLAYER_ROLE_ID = "role_story_palace_little_eunuch"
PALACE_MAID_PLAYER_ROLE_ID = "role_story_palace_little_maid"
PALACE_ASSET_ROOT = "app/assets/story-worlds/story_palace_snow_edict"
FIXED_XIANTIAN_OUTCOME = (
    "太平公主一方失败，公主随后被赐死；玄宗取得更完整的最高权力。"
)

OLD_TANG_XUANZONG = "https://zh.wikisource.org/zh/舊唐書/卷8"
OLD_TANG_GAO_LISHI = "https://zh.wikisource.org/zh/舊唐書/卷184"
NEW_TANG_TAIPING = "https://zh.wikisource.org/zh/新唐書/卷83"
TANG_WEN_2012 = "https://www.gdwx.fudan.edu.cn/tw/list.htm"
GAO_LISHI_STUDY = (
    "https://lishiwenhua.snnu.edu.cn/pucheng/uploadfile/2020/0422/"
    "202109282219.pdf"
)


def _historical_relationship_rules(attitude: str) -> RelationshipRules:
    """Keep real-person relationships immutable while satisfying the runtime contract."""

    return RelationshipRules(
        minimum_affinity=0,
        maximum_affinity=100,
        initial_affinity=50,
        natural_turn_max_delta=0,
        stages=(
            RelationshipStage(
                id="historical_distance",
                label="史料所见",
                minimum_affinity=0,
                attitude=attitude,
            ),
        ),
    )


GAO_LISHI_CURRENT_SITUATION = (
    "先天二年七月三日，史籍记高力士随玄宗一方出武德殿、入虔化门；"
    "具体逐句传令没有留存。"
)

GAO_LISHI_OPENING_LINE = (
    "剧情转述（非史料原话）：高力士只确认《旧唐书》记载的随行与入门，"
    "并要求来者把亲见、转述和后来的定性分开。"
)

GAO_LISHI = Character(
    id=GAO_LISHI_CHARACTER_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="高力士",
    identity=(
        "唐玄宗近侍、内给事；《旧唐书》记其在先天二年参与诛萧至忠、岑羲等人的行动。"
    ),
    age="成年；本故事不采用有争议的具体生年推算。",
    social_position=(
        "玄宗身边的内侍，可随行传命并参与七月三日的宫门行动；"
        "不能把他后来获得的高位倒置到事变发生之前。"
    ),
    motive=(
        "只依据公开行动呈现：协助玄宗一方执行七月三日的先制行动；"
        "不推断未被史料记录的私人动机。"
    ),
    secret=(
        "没有经核验的私人秘密；不得虚构他与太平公主私会、暗约、逐句密议或未载密令。"
    ),
    voice=(
        "只使用带固定标识的第三人称剧情转述，不生成高力士的第一人称原话。"
        "转述只谈已审核的行动、门次和消息来源；遇到史料空白时明确说无法证实。"
    ),
    relationship_rules=_historical_relationship_rules(
        "他只按史料边界核对你的记录，不产生可改写历史的私人好感或敌意。"
    ),
    portrait_url=public_media_url(
        f"{PALACE_ASSET_ROOT}/characters/gao-lishi/v1/portrait.webp"
    ),
)

TAIPING_PRINCESS_CURRENT_SITUATION = (
    "史籍记宫城行动发生后她闻变入南山，三日后出；"
    "她在七月三日的精确位置与逐句反应均未获核验。"
)

TAIPING_PRINCESS_OPENING_LINE = (
    "剧情转述（非史料原话）：太平公主要求来者说明同谋、谋废、作乱"
    "分别出自哪类记录，而不是把后来的定性冒充亲见。"
)

TAIPING_PRINCESS = Character(
    id=TAIPING_PRINCESS_CHARACTER_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="太平公主",
    identity=(
        "唐高宗与武则天之女、唐睿宗之妹、唐玄宗之姑；"
        "713 年先天政变中失败一方的核心真实人物。"
    ),
    age="成年；史料不能支持一个无争议的具体生年，剧情不指定岁数。",
    social_position=(
        "拥有公主府、政治网络和显著朝廷影响力的成年公主；"
        "她的公开结局固定，玩家无权替她调兵、废立或改变处置。"
    ),
    motive=(
        "只呈现可见政治立场：反对玄宗独掌权力；"
        "关于是否预定举兵、如何谋划，按史书指控和研究争议分别记录。"
    ),
    secret=(
        "没有经核验的私人秘密；不得把正史的“同谋”“谋废”“作乱”直接改写成她的内心独白。"
    ),
    voice=(
        "只使用带固定标识的第三人称剧情转述，不生成太平公主的第一人称原话。"
        "转述克制而有地位感，只追问记录依据，不补写密谋、心理或私下会面。"
    ),
    relationship_rules=_historical_relationship_rules(
        "她只质询证词如何形成；玩家不能改变真实人物的私人关系或历史选择。"
    ),
    portrait_url=public_media_url(
        f"{PALACE_ASSET_ROOT}/characters/taiping-princess/v1/portrait.webp"
    ),
)

PALACE_PLAYER_ROLE = PlayerRole(
    id=PALACE_PLAYER_ROLE_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="内侍小使",
    age="成年，约十八岁；“小使”表示低阶与资历浅，不得称为儿童。",
    social_position=(
        "宫城中的低阶内侍，只能传递日常口信、核对门次和抄录名单，"
        "没有调动禁军、传诏或处置真实人物的权力。"
    ),
    gender="男性",
    background=(
        "你在宫门与内廷之间做杂务，认得门次、值名与传话格式；"
        "具体官署属于剧情设定，不冒充唐代确切品秩。"
    ),
    entry_reason=(
        "七月三日，几份互相矛盾的口信同时经过宫门。你被要求把亲见、转述和后来定性分栏抄清。"
    ),
    character_visible_information=(
        "你是成年低阶内侍，可以核对谁在何处传过话，但不能证明传话内容必然属实。",
        "你知道史籍后来记高力士随行进入虔化门；具体逐句命令没有保存。",
        "你不得替玄宗、高力士或太平公主作出历史决定。",
    ),
    avatar_url=public_media_url(
        f"{PALACE_ASSET_ROOT}/player-roles/inner-attendant/v1/avatar.webp"
    ),
)

PALACE_MAID_PLAYER_ROLE = PlayerRole(
    id=PALACE_MAID_PLAYER_ROLE_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="宫人",
    age="成年，约十八岁；不得称为儿童。",
    social_position=(
        "宫城中的普通宫人，只能整理值次、递送抄本和区分消息来源，"
        "没有出入禁地、调动禁军或替公主发令的权力。"
    ),
    gender="女性",
    background=(
        "你负责整理宫人值次与出入抄本；"
        "具体职名属于剧情设定，不宣称对应一个已经核验的唐代女官品秩。"
    ),
    entry_reason=(
        "宫城异动后，几份把“听说”写成“亲见”的抄本混在一起。你被要求先分清它们从哪里来。"
    ),
    character_visible_information=(
        "你是成年普通宫人，可以比对抄本和传话来源，但没有一份能证明全部密谋的万能文书。",
        "你知道正史对太平公主一方有明确指控，也知道后世研究质疑官方叙事的删改。",
        "你不得替真实人物补写私会、心理或未被记录的逐句对白。",
    ),
    avatar_url=public_media_url(
        f"{PALACE_ASSET_ROOT}/player-roles/palace-woman/v1/avatar.webp"
    ),
)


def _choice(
    choice_id: str,
    label: str,
    next_node_id: str,
    *,
    is_key: bool = False,
    set_flags: tuple[str, ...] = (),
) -> StoryChoice:
    """Create one reviewed choice that changes records, never historical people."""

    return StoryChoice(
        id=choice_id,
        label=label,
        next_node_id=next_node_id,
        is_key=is_key,
        required_flags=(),
        blocked_flags=(),
        set_flags=set_flags,
        relationship_effects=(),
    )


PALACE_CHAPTER = StoryChapter(
    id="chapter_seventh_month_third",
    title="七月三日",
    entry_node_id="node_wude_palace",
    nodes=(
        StoryNode(
            id="node_wude_palace",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "先天二年七月三日，武德殿外传令骤密。正史后来写下太平公主一方原定次日举兵；"
                "眼下你能核对的只有人名、门次和每句话的来源。无论你怎样选择，宫门内的先制行动已经开始。"
            ),
            choices=(
                _choice(
                    "choice_check_gate_sequence",
                    "先核对武德殿到虔化门的门次",
                    "node_gate_sequence",
                    set_flags=("checked_gate_sequence",),
                ),
                _choice(
                    "choice_trace_accusation",
                    "先追查“同谋”“谋废”从哪份口信而来",
                    "node_accusation_wording",
                    set_flags=("traced_accusation",),
                ),
                _choice(
                    "choice_check_attendants",
                    "先把普通宫人与被指控者的名单分开",
                    "node_attendant_list",
                    set_flags=("checked_attendant_list",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_gate_sequence",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "后来的本纪列出高力士等人出武德殿、入虔化门的路线。"
                "你手里的门次抄本是剧情设定：它能核对先后，却不能证明每个人当时心里所想。"
            ),
            choices=(
                _choice(
                    "choice_record_seen_only",
                    "只登记亲见的人名与门次",
                    "node_record_decision",
                    set_flags=("separated_observation",),
                ),
                _choice(
                    "choice_mark_message_source",
                    "把每条转述标上最早可追到的来源",
                    "node_record_decision",
                    set_flags=("attributed_message",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_accusation_wording",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "同一阵营在不同记载里被写作“同谋”“谋废”或“作乱”。"
                "这些字能改变后世怎样理解人，却不是一份保存完整的口供。"
            ),
            choices=(
                _choice(
                    "choice_attribute_charge",
                    "保留指控，但注明是谁、依据什么提出",
                    "node_record_decision",
                    set_flags=("attributed_charge",),
                ),
                _choice(
                    "choice_hold_unverified_detail",
                    "把无法核验的逐句密谋留作空白",
                    "node_record_decision",
                    set_flags=("withheld_unverified_detail",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_attendant_list",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "被传唤、守门和递送抄本的普通宫人挤在一张临时名单里。"
                "他们是剧情中的原创普通人，不该因为靠近宫门就被写成史籍中没有的同党。"
            ),
            choices=(
                _choice(
                    "choice_separate_attendants",
                    "把普通当值者另列，不并入被指控名单",
                    "node_record_decision",
                    set_flags=("separated_attendants",),
                ),
                _choice(
                    "choice_preserve_parallel_lists",
                    "保留两份原始次序，不替任何一方合并",
                    "node_record_decision",
                    set_flags=("preserved_parallel_lists",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_record_decision",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "虔化门一线的控制已经改变，史籍记萧至忠、岑羲等随后被处置。"
                "你不能让这一切发生或不发生，只能决定自己的抄本是否把行动、指控和未知混成同一句话。"
            ),
            choices=(
                _choice(
                    "choice_end_sequence",
                    "只写行动顺序，不替真人判定内心",
                    "node_ending_sequence",
                    is_key=True,
                    set_flags=("ending_sequence_only",),
                ),
                _choice(
                    "choice_end_attributed",
                    "记下正史指控，同时注明出处与立场",
                    "node_ending_attributed",
                    is_key=True,
                    set_flags=("ending_attributed_charge",),
                ),
                _choice(
                    "choice_end_parallel",
                    "把相互冲突的说法并列保留",
                    "node_ending_parallel",
                    is_key=True,
                    set_flags=("ending_parallel_accounts",),
                ),
                _choice(
                    "choice_end_attendants",
                    "只带走普通宫人的交接名单",
                    "node_ending_attendants",
                    is_key=True,
                    set_flags=("ending_attendant_record",),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_ending_sequence",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你的抄本止于可核对的门次和人名。"
                f"{FIXED_XIANTIAN_OUTCOME}"
                "你没有替任何真人补写一个无人能证实的念头。"
            ),
            choices=(),
            ending_id="ending_sequence_only",
        ),
        StoryNode(
            id="node_ending_attributed",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "“同谋”“谋废”“作乱”都留在纸上，旁边也留下各自出处。"
                f"{FIXED_XIANTIAN_OUTCOME}"
                "但定性不再冒充你亲眼见过的密谋。"
            ),
            choices=(),
            ending_id="ending_attributed_charge",
        ),
        StoryNode(
            id="node_ending_parallel",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "两份互相冲突的记录没有被强行抹平。"
                f"{FIXED_XIANTIAN_OUTCOME}"
                "而后来读到这页的人仍能看见正史之外存在证据缺口。"
            ),
            choices=(),
            ending_id="ending_parallel_accounts",
        ),
        StoryNode(
            id="node_ending_attendants",
            presentation_kind=StoryNodePresentationKind.SYSTEM,
            character_id=None,
            narration=(
                "你只保住了普通宫人的交接名单，没有把他们填进胜负双方的罪名里。"
                f"{FIXED_XIANTIAN_OUTCOME}"
                "这些原创小人物却不必被你虚构成同党。"
            ),
            choices=(),
            ending_id="ending_attendant_record",
        ),
    ),
)

PALACE_STORY_WORLD = StoryWorld(
    id=PALACE_STORY_WORLD_ID,
    title="先天二年·虔化门",
    summary=(
        "713 年七月三日，玄宗一方先制入宫。高力士与太平公主分处史书两端，"
        "玩家只能核对记录如何形成，不能改写政变结局。"
    ),
    genre="历史宫廷",
    publication_status=PublicationStatus.PUBLISHED,
    content_version="palace-xiantian-coup-2026-08-05.1",
    player_roles=(PALACE_PLAYER_ROLE, PALACE_MAID_PLAYER_ROLE),
    characters=(GAO_LISHI, TAIPING_PRINCESS),
    stories=(
        ReviewedStory(
            id=PALACE_STORY_ID,
            title="先天二年·虔化门",
            summary=(
                "713 年七月三日，玄宗一方先制入宫。高力士与太平公主分处史书两端，"
                "玩家只能核对记录如何形成，不能改写政变结局。"
            ),
            kind=StoryKind.ENSEMBLE,
            publication_status=PublicationStatus.PUBLISHED,
            focus_character_id=None,
            participants=(
                StoryCharacterParticipation(
                    character_id=GAO_LISHI_CHARACTER_ID,
                    current_situation=GAO_LISHI_CURRENT_SITUATION,
                    opening_line=GAO_LISHI_OPENING_LINE,
                    can_start=True,
                ),
                StoryCharacterParticipation(
                    character_id=TAIPING_PRINCESS_CHARACTER_ID,
                    current_situation=TAIPING_PRINCESS_CURRENT_SITUATION,
                    opening_line=TAIPING_PRINCESS_OPENING_LINE,
                    can_start=True,
                ),
            ),
            entry_chapter_id=PALACE_CHAPTER.id,
            chapters=(PALACE_CHAPTER,),
            endings=(
                StoryEnding(
                    id="ending_sequence_only",
                    title="只记所见",
                    summary=(
                        "你只保存可核对的行动顺序。"
                        f"{FIXED_XIANTIAN_OUTCOME}"
                        "公开历史没有改变。"
                    ),
                ),
                StoryEnding(
                    id="ending_attributed_charge",
                    title="指控有源",
                    summary=(
                        "正史指控被保留，也被注明来源与立场。"
                        f"{FIXED_XIANTIAN_OUTCOME}"
                    ),
                ),
                StoryEnding(
                    id="ending_parallel_accounts",
                    title="两说并存",
                    summary=(
                        "冲突记录被并列保存，没有被合成一个万能真相。"
                        f"{FIXED_XIANTIAN_OUTCOME}"
                    ),
                ),
                StoryEnding(
                    id="ending_attendant_record",
                    title="无名者的名单",
                    summary=(
                        "你只保护原创普通宫人的记录，不改变任何真人行动。"
                        f"{FIXED_XIANTIAN_OUTCOME}"
                    ),
                ),
            ),
            character_decisions=(),
        ),
    ),
    canon_entries=(
        CanonEntry(
            id="fact_xiantian_action_date",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "先天二年七月三日，玄宗一方先制行动；正史称太平公主相关人员原定次日举兵。"
            ),
            sources=(OLD_TANG_XUANZONG, NEW_TANG_TAIPING),
        ),
        CanonEntry(
            id="fact_gao_lishi_participated",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "高力士是玄宗一方参与行动的内侍；《旧唐书》本纪、传记与《新唐书》均记其参与。"
            ),
            sources=(OLD_TANG_XUANZONG, OLD_TANG_GAO_LISHI, GAO_LISHI_STUDY),
        ),
        CanonEntry(
            id="fact_action_route",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "史籍把武德殿、虔化门、北阙、内客省与朝堂列入七月三日行动路线。"
            ),
            sources=(OLD_TANG_XUANZONG, NEW_TANG_TAIPING),
        ),
        CanonEntry(
            id="fact_taiping_outcome",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "太平公主一方失败；《新唐书》记她闻变入南山、三日后出并被赐死于宅第。"
            ),
            sources=(NEW_TANG_TAIPING, TANG_WEN_2012),
        ),
        CanonEntry(
            id="fact_power_transfer",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "事变后玄宗取得更完整的最高权力，睿宗交出军国政刑裁决；同年改元开元。"
            ),
            sources=(OLD_TANG_XUANZONG, TANG_WEN_2012),
        ),
        CanonEntry(
            id="fact_official_accusations_are_contested",
            category=CanonCategory.FIXED_FACT,
            statement=(
                "“同谋”“谋废”“作乱”是官修史书对太平公主一方的定性；"
                "同行评审研究指出相关国史叙述存在政治遮蔽与人物重塑。"
                "本条只确认两类来源及其立场，不确认指控等同完整内心真相。"
            ),
            sources=(OLD_TANG_XUANZONG, NEW_TANG_TAIPING, TANG_WEN_2012),
        ),
        CanonEntry(
            id="setting_player_roles",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "内侍小使与宫人均为原创成年 PlayerRole，只能核对门次、抄本和消息来源，"
                "没有调兵、传诏或处置真人的权力。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_record_devices",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "玩家接触的门次抄本、临时名单和具体口信是玩法装置，不冒充已发现的唐代原件。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_dramatized_projection",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "高力士与太平公主的开场和自由回应使用带固定标识的第三人称剧情转述，"
                "不是史料原话；"
                "二人不在无同场证据的原创场景里直接会面。"
            ),
            sources=(),
        ),
        CanonEntry(
            id="setting_private_endings",
            category=CanonCategory.STORY_SETTING,
            statement=(
                "四个结局只改变玩家留下记录的方式；太平公主失败与死亡、玄宗掌权等公共结果始终一致。"
            ),
            sources=(),
        ),
    ),
)


__all__ = [
    "GAO_LISHI_CHARACTER_ID",
    "PALACE_MAID_PLAYER_ROLE_ID",
    "PALACE_PLAYER_ROLE_ID",
    "PALACE_STORY_WORLD",
    "PALACE_STORY_WORLD_ID",
    "TAIPING_PRINCESS_CHARACTER_ID",
]
