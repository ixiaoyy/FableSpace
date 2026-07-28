"""Reviewed StoryWorld content for the fictional Snow Edict palace story."""

from __future__ import annotations

from ..core.media import public_media_url
from ..domain.story_world import (
    CanonCategory,
    CanonEntry,
    Character,
    PlayerRole,
    PublicationStatus,
    RelationshipEffect,
    RelationshipRules,
    RelationshipStage,
    StoryChapter,
    StoryChoice,
    StoryEnding,
    StoryNode,
    StoryWorld,
)

PALACE_STORY_WORLD_ID = "story_palace_snow_edict"
WEI_CHARACTER_ID = "char_story_palace_eunuch_wei"
XIAO_CHARACTER_ID = "char_story_palace_princess_xiao"
PALACE_PLAYER_ROLE_ID = "role_story_palace_little_eunuch"
PALACE_MAID_PLAYER_ROLE_ID = "role_story_palace_little_maid"
PALACE_ROLE_ASSET_ROOT = (
    "app/assets/story-worlds/story_palace_snow_edict/player-roles"
)


def _relationship_rules(
    *,
    initial_affinity: int,
    wary_attitude: str,
    open_attitude: str,
    trusted_attitude: str,
) -> RelationshipRules:
    return RelationshipRules(
        minimum_affinity=0,
        maximum_affinity=100,
        initial_affinity=initial_affinity,
        natural_turn_max_delta=3,
        stages=(
            RelationshipStage(
                id="wary",
                label="仍有戒心",
                minimum_affinity=0,
                attitude=wary_attitude,
            ),
            RelationshipStage(
                id="open",
                label="愿意听你",
                minimum_affinity=45,
                attitude=open_attitude,
            ),
            RelationshipStage(
                id="trusted",
                label="把后背交给你",
                minimum_affinity=70,
                attitude=trusted_attitude,
            ),
        ),
    )


WEI_GUANHAI = Character(
    id=WEI_CHARACTER_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="魏观海",
    identity="长明宫掌印太监，皇帝近侍，负责守住寝殿、玉玺与未宣诏书。",
    age="未明确；只确定为资深成年内侍，不得自行给出具体岁数。",
    social_position="宫中高阶内侍，能约束低阶内侍并调度宫门事务，但仍受皇权、诏书与宫规制约。",
    motive="在五更朝会前稳住长明宫，也守住自己最后一次忠诚。",
    secret="皇帝短暂醒过，并命他暂时不见公主；同一封诏书也要收回他的掌印。",
    voice="慢而稳，礼数周全，常以规矩施压；真正动怒时反而更温和。",
    current_situation="皇帝昏迷，魏观海守着寝殿、玉玺与一封未宣诏书，五更前谁也不准入内。",
    opening_line="小崽子，抬头。咱家只问一句：方才水门边那半枚腰牌，是谁交到你手里的？",
    relationship_rules=_relationship_rules(
        initial_affinity=35,
        wary_attitude="他把你当作宫册之外的一枚活棋，问得客气，却一句也没有放松。",
        open_attitude="他开始把你说的话当作证词，而不只是可以利用的口信。",
        trusted_attitude="他肯让你站在诏书旁边，见证自己最不愿承认的代价。",
    ),
)

XIAO_MINGZHU = Character(
    id=XIAO_CHARACTER_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="萧明珠",
    identity="皇帝之女、长明宫公主。",
    age="未明确；不得自行给出具体岁数。",
    social_position="皇族公主，地位远高于低阶内侍；习惯发号施令，但不能越过封宫、诏书和宫规直接决定正史。",
    motive="亲眼确认父皇安危，也把被自己连累的小内侍带出来。",
    secret="她命人偷了半枚水门腰牌，混乱中一名小内侍因此被扣作同谋。",
    voice="语速快、命令多，情绪写在脸上；被说中软处先发火，冷静后会承担。",
    current_situation="萧明珠被拦在父皇寝殿外，袖中藏着半枚腰牌，正准备从冷宫水门闯入。",
    opening_line="别跪了。你熟水门，也没人会防你。先替我把被扣的小内侍找出来，再带我去见父皇。",
    relationship_rules=_relationship_rules(
        initial_affinity=40,
        wary_attitude="她把你当临时随从，急着要答案，还没有准备听你的反对。",
        open_attitude="她开始先问你的判断，再决定要不要把命令说出口。",
        trusted_attitude="她愿意把自己的错交给你当面指出，也肯为你的选择挡下一次宫规。",
    ),
)

PALACE_PLAYER_ROLE = PlayerRole(
    id=PALACE_PLAYER_ROLE_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="小太监",
    age="成年，约十八岁；“小”表示低阶与资历浅，不得称为儿童。",
    social_position="长明宫最低阶的内侍杂役，能传话、跑腿和查证，没有开门、宣诏或替上位者决策的权力。",
    gender="男性",
    background="你在长明宫做最不起眼的杂役，熟悉水门、药房后廊和宫门名册，却没有替任何一方开门的权力。",
    entry_reason="送炭途中，你捡到半枚水门腰牌，也听见被扣的小内侍在值房里喊冤。",
    character_visible_information=(
        "你是长明宫低阶内侍，能在外廊和水门之间走动。",
        "你捡到了半枚水门腰牌，但尚未交给任何人。",
        "你可以传话、查证、拒绝站队，也必须承担被发现后的后果。",
    ),
    avatar_url=public_media_url(
        f"{PALACE_ROLE_ASSET_ROOT}/little-eunuch/v1/avatar.webp"
    ),
)

PALACE_MAID_PLAYER_ROLE = PlayerRole(
    id=PALACE_MAID_PLAYER_ROLE_ID,
    story_world_id=PALACE_STORY_WORLD_ID,
    name="小宫女",
    age="成年，约十八岁；“小”表示低阶与资历浅，不得称为儿童。",
    social_position="长明宫最低阶的宫女杂役，能递话、送物和查证，没有进入禁地、传旨或替上位者决策的权力。",
    gender="女性",
    background="你在承香殿与尚食局之间递送物件，熟悉女官值次、药房后廊和各宫夜灯，却没有替任何一方开门的权力。",
    entry_reason="送回空药匣时，你捡到半枚水门腰牌，也听见被扣的小内侍在值房里喊冤。",
    character_visible_information=(
        "你是长明宫低阶宫女，能在承香殿、尚食局和外廊之间走动。",
        "你捡到了半枚水门腰牌，但尚未交给任何人。",
        "你可以递话、查证、拒绝站队，也必须承担被发现后的后果。",
    ),
    avatar_url=public_media_url(
        f"{PALACE_ROLE_ASSET_ROOT}/little-palace-maid/v1/avatar.webp"
    ),
)


def _effect(
    character_id: str,
    affinity_delta: int,
    reason: str,
    *flags: str,
) -> RelationshipEffect:
    return RelationshipEffect(
        character_id=character_id,
        affinity_delta=affinity_delta,
        reason=reason,
        set_flags=tuple(flags),
    )


def _choice(
    choice_id: str,
    label: str,
    next_node_id: str,
    *,
    is_key: bool = False,
    set_flags: tuple[str, ...] = (),
    effects: tuple[RelationshipEffect, ...] = (),
) -> StoryChoice:
    return StoryChoice(
        id=choice_id,
        label=label,
        next_node_id=next_node_id,
        is_key=is_key,
        required_flags=(),
        blocked_flags=(),
        set_flags=set_flags,
        relationship_effects=effects,
    )


PALACE_CHAPTER = StoryChapter(
    id="chapter_fifth_watch",
    title="五更前开门",
    entry_node_id="node_snow_gate",
    nodes=(
        StoryNode(
            id="node_snow_gate",
            narration="大雪压住宫墙。寝殿门内，魏观海守着玉玺和未宣诏书；门外，萧明珠攥着半枚水门腰牌。五更鼓响前，你只能先接住一边的话。",
            choices=(
                _choice(
                    "choice_hear_wei",
                    "先问魏观海：为什么不敢宣诏？",
                    "node_wei_terms",
                    effects=(
                        _effect(WEI_CHARACTER_ID, 5, "你没有急着定罪，而是先逼他把规矩说清。"),
                    ),
                ),
                _choice(
                    "choice_hear_xiao",
                    "先问萧明珠：被扣的小内侍怎么办？",
                    "node_xiao_debt",
                    effects=(
                        _effect(XIAO_CHARACTER_ID, 5, "你没有顺着她闯门，先问她愿不愿承担后果。"),
                    ),
                ),
                _choice(
                    "choice_check_guardroom",
                    "谁也不帮，先去值房找被扣的小内侍",
                    "node_guardroom",
                    effects=(
                        _effect(WEI_CHARACTER_ID, 2, "你先查人证，没有替任何一方传未经核实的话。"),
                        _effect(XIAO_CHARACTER_ID, 4, "你先去救她连累的人，让她无法继续回避。"),
                    ),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_wei_terms",
            narration="魏观海没有否认重新封过诏书，只把一盏冷透的御膳推到你面前：皇帝醒过一次，留下了两句互相撕扯的命令。",
            choices=(
                _choice(
                    "choice_ask_edict_witness",
                    "要求当着公主与值守官的面拆封",
                    "node_confrontation",
                    set_flags=("demanded_joint_witness",),
                    effects=(
                        _effect(WEI_CHARACTER_ID, 7, "你给他留了守住真话的程序，而不是逼他私下投降。"),
                        _effect(XIAO_CHARACTER_ID, 2, "你替她争到见证，却没有把诏书直接交给她。"),
                    ),
                ),
                _choice(
                    "choice_carry_wei_message",
                    "替他传话，但不隐瞒诏书会收回掌印",
                    "node_confrontation",
                    set_flags=("carried_full_message",),
                    effects=(
                        _effect(WEI_CHARACTER_ID, 5, "你答应传话，却拒绝替他删掉最痛的一句。"),
                        _effect(XIAO_CHARACTER_ID, 4, "你把完整代价带到她面前，没有拿半句话哄她。"),
                    ),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_xiao_debt",
            narration="萧明珠先发了火，随后把金簪和半枚腰牌一同放下。她承认小内侍是替她取牌才被扣，却仍坚持父皇的门必须在今夜打开。",
            choices=(
                _choice(
                    "choice_release_attendant_first",
                    "先让她用自己的名义放出小内侍",
                    "node_confrontation",
                    set_flags=("attendant_released",),
                    effects=(
                        _effect(XIAO_CHARACTER_ID, 8, "你逼她先为已经发生的伤害负责。"),
                        _effect(WEI_CHARACTER_ID, 3, "你先补上名册里的罪责，再谈破门。"),
                    ),
                ),
                _choice(
                    "choice_verify_badge",
                    "拿腰牌去对宫门名册，不替她硬闯",
                    "node_confrontation",
                    set_flags=("badge_verified",),
                    effects=(
                        _effect(XIAO_CHARACTER_ID, 5, "你肯替她查证，却没有把忠诚变成服从。"),
                        _effect(WEI_CHARACTER_ID, 4, "你按名册查腰牌，让事情回到可追溯的证据上。"),
                    ),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_guardroom",
            narration="值房里，小内侍说腰牌只剩半枚，另一半在药房后廊。名册还记着一个本不该在雪夜入宫的太医名字。",
            choices=(
                _choice(
                    "choice_bring_witness",
                    "带着小内侍和名册回到寝殿",
                    "node_confrontation",
                    set_flags=("brought_witness",),
                    effects=(
                        _effect(WEI_CHARACTER_ID, 5, "你带回可核对的人证，没有拿传闻逼宫。"),
                        _effect(XIAO_CHARACTER_ID, 5, "你救出被她连累的人，也没有替她抹掉责任。"),
                    ),
                ),
                _choice(
                    "choice_find_second_badge",
                    "先去药房后廊找另一半腰牌",
                    "node_confrontation",
                    set_flags=("badge_completed",),
                    effects=(
                        _effect(WEI_CHARACTER_ID, 3, "你补全了宫门记录，让他的规矩经得起查。"),
                        _effect(XIAO_CHARACTER_ID, 4, "你替她找到进门的证据，却没有偷偷使用。"),
                    ),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_confrontation",
            narration="五更前最后一遍更鼓从雪里传来。魏观海把诏书放在灯下，萧明珠站在寝殿门前。现在必须有人决定：门怎样开，诏书怎样见光。",
            choices=(
                _choice(
                    "choice_joint_opening",
                    "让两人共同验印，由值守官记录后开门",
                    "node_ending_joint",
                    is_key=True,
                    effects=(
                        _effect(WEI_CHARACTER_ID, 12, "你让他能以见证人的身份交出权力。", "shared_witness"),
                        _effect(XIAO_CHARACTER_ID, 12, "你让她先承担记录，再获得开门的资格。", "shared_witness"),
                    ),
                ),
                _choice(
                    "choice_publish_edict",
                    "不开寝殿，先在五更朝会上宣读完整诏书",
                    "node_ending_edict",
                    is_key=True,
                    effects=(
                        _effect(WEI_CHARACTER_ID, 10, "你选择让完整诏书先于流言见光。", "edict_published"),
                        _effect(XIAO_CHARACTER_ID, 3, "你没有替她破门，但让她听见父皇留下的全部命令。"),
                    ),
                ),
                _choice(
                    "choice_force_gate",
                    "把完整腰牌交给萧明珠，强行开门",
                    "node_ending_breach",
                    is_key=True,
                    effects=(
                        _effect(WEI_CHARACTER_ID, -10, "你越过了他守住的程序，也让他再不能独占真相。"),
                        _effect(XIAO_CHARACTER_ID, 7, "你帮她见到父皇，却要求她亲自承担破门罪责。", "gate_forced"),
                    ),
                ),
                _choice(
                    "choice_walk_away",
                    "交回腰牌，拒绝替任何人做最后决定",
                    "node_ending_silence",
                    is_key=True,
                    effects=(
                        _effect(WEI_CHARACTER_ID, -2, "你拒绝成为他手里不留名的棋子。"),
                        _effect(XIAO_CHARACTER_ID, -2, "你拒绝让她把自己的选择交给一个小内侍承担。"),
                    ),
                ),
            ),
            ending_id=None,
        ),
        StoryNode(
            id="node_ending_joint",
            narration="值守官落下第一笔记录。魏观海交出诏书，萧明珠亲手补上腰牌名册。寝殿门在两个人都不能独占的见证下打开。",
            choices=(),
            ending_id="ending_joint_witness",
        ),
        StoryNode(
            id="node_ending_edict",
            narration="五更朝会先听见完整诏书：收回掌印，也暂缓公主入殿。魏观海失去权柄，却没有让最后一道命令死在自己手里。",
            choices=(),
            ending_id="ending_edict_first",
        ),
        StoryNode(
            id="node_ending_breach",
            narration="完整腰牌合上，宫门应声而开。萧明珠终于见到昏睡的父皇，也在名册末页写下自己的名字，承认这是她下的令。",
            choices=(),
            ending_id="ending_forced_gate",
        ),
        StoryNode(
            id="node_ending_silence",
            narration="你把腰牌放回灯下，退出争执。五更鼓响后，两个人只能用自己的名字作决定，再也不能把后果藏在一个无名小太监身上。",
            choices=(),
            ending_id="ending_refused_burden",
        ),
    ),
)

PALACE_STORY_WORLD = StoryWorld(
    id=PALACE_STORY_WORLD_ID,
    title="长明宫·雪夜诏书",
    summary="皇帝昏迷、寝殿封锁。魏观海与萧明珠必须在五更前决定谁来开门，谁来承担诏书见光后的代价。",
    genre="架空宫廷",
    publication_status=PublicationStatus.PUBLISHED,
    content_version="palace-snow-edict-2026-07-28.1",
    entry_chapter_id=PALACE_CHAPTER.id,
    player_roles=(PALACE_PLAYER_ROLE, PALACE_MAID_PLAYER_ROLE),
    characters=(WEI_GUANHAI, XIAO_MINGZHU),
    chapters=(PALACE_CHAPTER,),
    endings=(
        StoryEnding(
            id="ending_joint_witness",
            title="共同见证",
            summary="诏书、腰牌与开门都留下记录。魏观海交出权力，萧明珠承担责任，两人共同见证寝殿开门。",
        ),
        StoryEnding(
            id="ending_edict_first",
            title="诏书先见光",
            summary="寝殿暂未开启，完整诏书先被宣读。魏观海失去掌印，萧明珠也第一次听完一道不偏爱她的命令。",
        ),
        StoryEnding(
            id="ending_forced_gate",
            title="破门之后",
            summary="萧明珠强行开门并署名承担后果；魏观海失去控制，却也再不能把真相锁在门内。",
        ),
        StoryEnding(
            id="ending_refused_burden",
            title="把名字还给他们",
            summary="你拒绝替任何一方背负最后决定。五更到来时，魏观海与萧明珠只能用自己的名字面对后果。",
        ),
    ),
    canon_entries=(
        CanonEntry(
            id="setting_fictional_dynasty",
            category=CanonCategory.STORY_SETTING,
            statement="长明宫、曜宁朝及本故事全部人物与事件均为原创架空设定。",
            sources=(),
        ),
        CanonEntry(
            id="setting_snow_edict",
            category=CanonCategory.STORY_SETTING,
            statement="皇帝服药后昏迷；魏观海封锁寝殿，一封未宣诏书必须在五更前处理。",
            sources=(),
        ),
        CanonEntry(
            id="setting_gate_rules",
            category=CanonCategory.STORY_SETTING,
            statement="寝殿只能凭掌印、完整腰牌或可核验口谕开启；使用腰牌会在宫门名册留下记录。",
            sources=(),
        ),
        CanonEntry(
            id="setting_player_roles",
            category=CanonCategory.STORY_SETTING,
            statement="玩家每轮从长明宫小太监或小宫女中选择一个身份，可传话、查证、站队或拒绝参与，但不能开门、宣诏或改写人物既有秘密。",
            sources=(),
        ),
    ),
)


__all__ = [
    "PALACE_MAID_PLAYER_ROLE_ID",
    "PALACE_PLAYER_ROLE_ID",
    "PALACE_STORY_WORLD",
    "PALACE_STORY_WORLD_ID",
    "WEI_CHARACTER_ID",
    "XIAO_CHARACTER_ID",
]
