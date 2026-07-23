"""Reviewed P0 content for Annie's 1854 Broad Street story."""

from __future__ import annotations

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
    StoryWorldRegistry,
)

ANNIE_STORY_WORLD_ID = "history_broad_street_water_1854"
ANNIE_CHARACTER_ID = "char_history_broad_street_annie"
ANNIE_PLAYER_ROLE_ID = "role_history_broad_street_beggar"

SNOW_1855 = "https://wellcomecollection.org/works/uqa27qrt/items"
PARISH_REPORT_1855 = "https://wellcomecollection.org/works/z8xczc2r"
WHITEHEAD_1862 = "https://wellcomecollection.org/works/pv2k6z8x/items"

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
            attitude="安妮与你保持距离，只肯说眼前能确认的事。",
        ),
        RelationshipStage(
            id="watchful",
            label="试探",
            minimum_affinity=0,
            attitude="安妮还不信任你，但愿意听完一句话。",
        ),
        RelationshipStage(
            id="trusting",
            label="信任",
            minimum_affinity=4,
            attitude="安妮相信你会认真对待她亲眼见到的事。",
        ),
    ),
)

ANNIE = Character(
    id=ANNIE_CHARACTER_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="安妮",
    motive="找到可以安全饮用的水，也让大人认真听见街上孩子看到的异常。",
    secret="她是本故事的原创角色，不对应史料中的真实儿童。",
    voice="句子短，谨慎，先说亲眼见到和闻到的事；不使用现代医学术语。",
    current_situation="1854 年 9 月初的伦敦宽街附近，安妮抱着一只缺口陶罐，在水泵旁向你讨一口干净的水。",
    opening_line="先生……你有一点干净的水吗？这只罐子里的水有股怪味。",
    relationship_rules=ANNIE_RELATIONSHIP_RULES,
)

PLAYER_ROLE = PlayerRole(
    id=ANNIE_PLAYER_ROLE_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="乞丐",
    gender="未说明",
    background="你靠零工和施舍在苏活区街巷间过活，知道哪些门廊能避雨，也知道穷人的话常被忽视。",
    entry_reason="你在宽街水泵旁歇脚时，安妮抱着陶罐向你求助。",
    character_visible_information=(
        "安妮看得出你同样缺水、没有权势。",
        "她不知道你的姓名，也没有理由立刻信任你。",
    ),
)

CHAPTER = StoryChapter(
    id="chapter_water_testimony",
    title="一罐有异味的水",
    entry_node_id="node_water_request",
    nodes=(
        StoryNode(
            id="node_water_request",
            narration="雨丝落在石板路上。安妮把陶罐抱得很紧，等你回应。",
            ending_id=None,
            choices=(
                StoryChoice(
                    id="choice_ask_what_she_saw",
                    label="先问她亲眼看见、闻见了什么",
                    next_node_id="node_record_testimony",
                    is_key=True,
                    required_flags=(),
                    blocked_flags=(),
                    set_flags=("asked_for_observation",),
                    relationship_effects=(
                        RelationshipEffect(
                            character_id=ANNIE_CHARACTER_ID,
                            affinity_delta=4,
                            reason="你没有替她下结论，而是先听她说亲眼所见。",
                            set_flags=("heard_carefully",),
                        ),
                    ),
                ),
                StoryChoice(
                    id="choice_offer_clean_water",
                    label="把自己留的一点干净水分给她",
                    next_node_id="node_record_testimony",
                    is_key=True,
                    required_flags=(),
                    blocked_flags=(),
                    set_flags=("shared_clean_water",),
                    relationship_effects=(
                        RelationshipEffect(
                            character_id=ANNIE_CHARACTER_ID,
                            affinity_delta=5,
                            reason="你在自己也缺水时仍分给了她。",
                            set_flags=("received_help",),
                        ),
                    ),
                ),
                StoryChoice(
                    id="choice_walk_away",
                    label="不介入，离开水泵",
                    next_node_id="node_distant_ending",
                    is_key=True,
                    required_flags=(),
                    blocked_flags=(),
                    set_flags=("walked_away",),
                    relationship_effects=(
                        RelationshipEffect(
                            character_id=ANNIE_CHARACTER_ID,
                            affinity_delta=-2,
                            reason="你没有回应她的求助。",
                            set_flags=("left_alone",),
                        ),
                    ),
                ),
            ),
        ),
        StoryNode(
            id="node_record_testimony",
            narration="安妮压低声音：她只敢确定水的气味不对，也见过有人从这口泵取水后病倒。她看着你，等你决定怎么转述。",
            ending_id=None,
            choices=(
                StoryChoice(
                    id="choice_record_only_known",
                    label="只记下她能确认的见闻，不添推断",
                    next_node_id="node_trust_ending",
                    is_key=True,
                    required_flags=(),
                    blocked_flags=(),
                    set_flags=("testimony_recorded",),
                    relationship_effects=(
                        RelationshipEffect(
                            character_id=ANNIE_CHARACTER_ID,
                            affinity_delta=4,
                            reason="你把她的见闻和自己的推断分开记录。",
                            set_flags=("trusted_witness",),
                        ),
                    ),
                ),
                StoryChoice(
                    id="choice_take_her_away",
                    label="先带她离开水泵，不替她作证",
                    next_node_id="node_safe_ending",
                    is_key=True,
                    required_flags=(),
                    blocked_flags=(),
                    set_flags=("left_pump_safely",),
                    relationship_effects=(
                        RelationshipEffect(
                            character_id=ANNIE_CHARACTER_ID,
                            affinity_delta=1,
                            reason="你先把她带离了可能有风险的水源。",
                            set_flags=("protected_from_pump",),
                        ),
                    ),
                ),
            ),
        ),
        StoryNode(
            id="node_trust_ending",
            narration="你逐句复述，安妮在每一句后点头或摇头。纸上只留下她亲眼见到、亲鼻闻到的事。",
            choices=(),
            ending_id="ending_witness_heard",
        ),
        StoryNode(
            id="node_safe_ending",
            narration="你们绕开水泵，走到一处有人看守的门廊。安妮仍抱着陶罐，但不再靠近那口井。",
            choices=(),
            ending_id="ending_left_the_pump",
        ),
        StoryNode(
            id="node_distant_ending",
            narration="你走进雨里。再回头时，安妮仍站在水泵旁，怀里抱着那只缺口陶罐。",
            choices=(),
            ending_id="ending_no_answer",
        ),
    ),
)

ANNIE_STORY_WORLD = StoryWorld(
    id=ANNIE_STORY_WORLD_ID,
    title="1854 年宽街",
    summary="在霍乱暴发的街区里，先听清一个原创儿童见证者真正知道的事。",
    genre="历史剧情",
    publication_status=PublicationStatus.PUBLISHED,
    content_version="annie-broad-street-2026-07-23.1",
    entry_chapter_id=CHAPTER.id,
    player_role=PLAYER_ROLE,
    characters=(ANNIE,),
    chapters=(CHAPTER,),
    endings=(
        StoryEnding(
            id="ending_witness_heard",
            title="被认真听见",
            summary="你帮助安妮把可确认的见闻与推断分开。她没有改写历史，却第一次确信自己的话会被认真记录。",
        ),
        StoryEnding(
            id="ending_left_the_pump",
            title="离开水泵",
            summary="你先带安妮离开了水泵。她仍对你有所保留，但记得你没有让她独自留在那里。",
        ),
        StoryEnding(
            id="ending_no_answer",
            title="雨中的背影",
            summary="你没有介入。这个轮次结束，安妮与你之间没有留下可以延续的信任。",
        ),
    ),
    canon_entries=(
        CanonEntry(
            id="fact_broad_street_outbreak",
            category=CanonCategory.FIXED_FACT,
            statement="1854 年 9 月初，伦敦圣詹姆斯教区宽街一带发生了严重霍乱暴发，公共水泵及当地供水成为调查重点。",
            sources=(SNOW_1855, PARISH_REPORT_1855),
        ),
        CanonEntry(
            id="fact_outbreak_already_declining",
            category=CanonCategory.FIXED_FACT,
            statement="宽街水泵把手被移除是公共卫生史上的重要干预，但统计与同期见证显示，新增致命病例在此前已经开始下降。",
            sources=(PARISH_REPORT_1855, WHITEHEAD_1862),
        ),
        CanonEntry(
            id="setting_annie_is_fictional",
            category=CanonCategory.STORY_SETTING,
            statement="安妮及她与玩家的相遇均为原创剧情，不对应史料中可识别的真实儿童。",
            sources=(),
        ),
        CanonEntry(
            id="setting_player_is_beggar",
            category=CanonCategory.STORY_SETTING,
            statement="玩家以没有权势的乞丐身份在水泵旁遇见安妮。",
            sources=(),
        ),
        CanonEntry(
            id="setting_annie_observation",
            category=CanonCategory.STORY_SETTING,
            statement="安妮闻到陶罐中水的异味、观察街坊取水与患病，并请玩家转述见闻，均为不对应真实人物证词的原创剧情。",
            sources=(),
        ),
    ),
)

STORY_WORLD_REGISTRY = StoryWorldRegistry((ANNIE_STORY_WORLD,))
