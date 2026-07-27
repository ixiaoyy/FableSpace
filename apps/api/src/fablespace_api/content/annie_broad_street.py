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
)

ANNIE_STORY_WORLD_ID = "history_broad_street_water_1854"
ANNIE_CHARACTER_ID = "char_history_broad_street_annie"
ANNIE_PLAYER_ROLE_ID = "role_history_broad_street_beggar"

SNOW_1855 = "https://wellcomecollection.org/works/uqa27qrt/items"
PARISH_REPORT_1855 = "https://wellcomecollection.org/works/z8xczc2r"
WHITEHEAD_1862 = "https://wellcomecollection.org/works/pv2k6z8x/items"
UCLA_INVESTIGATION = "https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_d.html"
UCLA_HANDLE_REMOVAL = "https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_e.html"
LANCET_MAP_HISTORY = "https://doi.org/10.1016/S0140-6736(00)02442-9"

FIXED_HISTORY_RESULT = (
    "9 月 7 日晚，John Snow 向 St James 教区监护委员会陈述调查；次日，"
    "地方管理者移除了宽街水泵把手。Snow 自己说明，暴发在移除前已经开始"
    "减退。这段公共历史不由你们的纸页或选择决定。"
)

ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE = {
    "opening": (
        "fact_outbreak_intensified",
        "setting_annie_is_fictional",
        "setting_player_is_beggar",
    ),
    "investigation": (
        "fact_snow_investigation_method",
        "fact_comparison_water_sources",
        "setting_family_warning",
        "setting_testimony_paper",
    ),
    "outcome": (
        "fact_parish_statement_and_handle",
        "fact_outbreak_already_declining",
        "fact_map_not_discovery_origin",
        "setting_private_endings",
    ),
}


def _relationship_effect(
    affinity_delta: int,
    reason: str,
    *flags: str,
) -> tuple[RelationshipEffect, ...]:
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
    affinity_delta: int,
    reason: str,
    story_flags: tuple[str, ...] = (),
    relationship_flags: tuple[str, ...] = (),
) -> StoryChoice:
    return StoryChoice(
        id=choice_id,
        label=label,
        next_node_id=next_node_id,
        is_key=True,
        required_flags=(),
        blocked_flags=(),
        set_flags=story_flags,
        relationship_effects=_relationship_effect(
            affinity_delta,
            reason,
            *relationship_flags,
        ),
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
            attitude="安妮把纸页收回怀里，只肯说眼前能够确认的事。",
        ),
        RelationshipStage(
            id="watchful",
            label="试探",
            minimum_affinity=0,
            attitude="安妮愿意听你说完，但仍在核对你会不会把猜测当成事实。",
        ),
        RelationshipStage(
            id="walking_together",
            label="同行",
            minimum_affinity=4,
            attitude="安妮允许你陪在身边，一起核对门牌、取水处和亲眼所见。",
        ),
        RelationshipStage(
            id="trusting",
            label="信任",
            minimum_affinity=10,
            attitude="安妮相信你会尊重事实，也会让她用自己的话讲完见闻。",
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
    current_situation=(
        "1854 年 9 月 7 日下午，宽街下起了雨。你在水泵旁的屋檐下避雨，"
        "脚边的破碗里还剩一点水。安妮抱着缺口陶罐，在两步外停下；"
        "你们从未见过，她没有理由立刻相信你。"
    ),
    opening_line=(
        "“你碗里……还有一点水吗？”她看了一眼身后的水泵，没有再往前走。"
        "“妈妈只说，别再碰这口泵。可家里已经一点水也没有了。"
        "要是你的水不是从这里打的……能分我一点吗？”"
    ),
    relationship_rules=ANNIE_RELATIONSHIP_RULES,
)

PLAYER_ROLE = PlayerRole(
    id=ANNIE_PLAYER_ROLE_ID,
    story_world_id=ANNIE_STORY_WORLD_ID,
    name="乞丐",
    gender="未说明",
    background="你靠零工和施舍在苏活区街巷间过活，知道哪些门廊能避雨，也知道穷人的话常被忽视。",
    entry_reason="你在宽街水泵旁的屋檐下避雨，脚边的破碗里还剩一点水；安妮抱着陶罐，在两步外停下向你求助。",
    character_visible_information=(
        "安妮看得出你同样缺水、没有权势。",
        "她不知道你的姓名，也没有理由立刻信任你。",
    ),
)

CHAPTER = StoryChapter(
    id="chapter_water_testimony",
    title="一碗水从哪里来",
    entry_node_id="node_water_request",
    nodes=(
        StoryNode(
            id="node_water_request",
            narration=(
                "1854 年 9 月 7 日下午，宽街下起了雨。"
                "你靠零工和施舍在苏活区过活，此刻正坐在水泵旁的屋檐下避雨。"
                "脚边的破碗里，还剩着一点水。"
                "一个抱着缺口陶罐的女孩在两步外停下。她约莫十岁，裙角已经湿透。"
                "她没有向来往的店主和车夫开口，只看着同样一身雨水的你。"
                "你们从未见过。她也没有理由立刻相信你。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_share_clean_water",
                    "先说明取水处，再把能确认来路的水分给她",
                    "node_trace_water",
                    affinity_delta=2,
                    reason="你没有只凭水的样子作保证，而是先说明了取水处。",
                    story_flags=("offered_traceable_water",),
                    relationship_flags=("received_careful_help",),
                ),
                _choice(
                    "choice_ask_about_pump",
                    "问她为什么不去宽街水泵取水",
                    "node_ask_pump",
                    affinity_delta=1,
                    reason="你先询问她知道什么，没有替她下结论。",
                    story_flags=("asked_about_pump",),
                    relationship_flags=("asked_before_deciding",),
                ),
                _choice(
                    "choice_find_other_water",
                    "答应陪她绕开水泵，另找一处水源",
                    "node_walk_together",
                    affinity_delta=2,
                    reason="你在自己也缺水时仍愿意陪她寻找别处。",
                    story_flags=("offered_to_find_water",),
                    relationship_flags=("stayed_to_help",),
                ),
                _choice(
                    "choice_seek_adult_questioner",
                    "带她去找正在逐户询问饮水来源的成年人",
                    "node_doctor_list",
                    affinity_delta=1,
                    reason="你承认自己不能判断原因，选择把见闻交给正在核对的人。",
                    story_flags=("sought_questioner",),
                    relationship_flags=("sought_verification",),
                ),
                _choice(
                    "choice_refuse_and_leave",
                    "拒绝介入，独自离开水泵",
                    "node_distant_ending",
                    affinity_delta=-2,
                    reason="你没有回应她的求助，也没有留下核对水源。",
                    story_flags=("refused_and_left",),
                    relationship_flags=("left_alone",),
                ),
            ),
        ),
        StoryNode(
            id="node_ask_pump",
            narration=(
                "安妮朝街角看了一眼。她家一直在那里取水；这几天，楼上和对门都有人病倒。"
                "母亲只说不许再碰，却没有告诉她还能去哪里。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_ask_households",
                    "问她记得哪些人去过那口泵",
                    "node_doorstep",
                    affinity_delta=2,
                    reason="你请她区分亲眼看见的人和后来听说的事。",
                    story_flags=("asked_about_households",),
                    relationship_flags=("valued_observation",),
                ),
                _choice(
                    "choice_follow_mother_warning",
                    "先听她母亲的，陪她绕开水泵",
                    "node_walk_together",
                    affinity_delta=2,
                    reason="你尊重她家人的谨慎，没有逼她回到那口泵。",
                    story_flags=("respected_family_warning",),
                    relationship_flags=("respected_warning",),
                ),
                _choice(
                    "choice_find_questioner_after_pump",
                    "去找拿名单核对饮水来源的人",
                    "node_doctor_list",
                    affinity_delta=1,
                    reason="你没有宣布答案，而是去找正在收集证词的人。",
                    story_flags=("followed_investigation",),
                    relationship_flags=("sought_verification",),
                ),
            ),
        ),
        StoryNode(
            id="node_trace_water",
            narration="她的手伸到一半，又收了回去。水看起来都一样，她只肯先听你说清这碗水的来路。",
            ending_id=None,
            choices=(
                _choice(
                    "choice_admit_unknown_source",
                    "承认自己也说不准，先不让她喝",
                    "node_doorstep",
                    affinity_delta=2,
                    reason="你没有用一句保证掩盖自己不知道水的来路。",
                    story_flags=("admitted_unknown_source",),
                    relationship_flags=("admitted_uncertainty",),
                ),
                _choice(
                    "choice_verify_water_source",
                    "沿来路回找，核对自己取水的地方",
                    "node_trace_source",
                    affinity_delta=2,
                    reason="你愿意让自己的说法也接受核对。",
                    story_flags=("verified_own_water",),
                    relationship_flags=("verified_own_claim",),
                ),
                _choice(
                    "choice_push_unsafe_water",
                    "坚持水肯定没事，让她先喝",
                    "node_record_wary",
                    affinity_delta=-4,
                    reason="你在无法确认来路时仍催她饮水。",
                    story_flags=("pushed_unverified_water",),
                    relationship_flags=("ignored_water_risk",),
                ),
            ),
        ),
        StoryNode(
            id="node_walk_together",
            narration="安妮把陶罐抱回怀里，沿墙根避开排在水泵前的人。她问你愿意陪到哪一步。",
            ending_id=None,
            choices=(
                _choice(
                    "choice_visit_doorsteps",
                    "陪她逐户询问取水处",
                    "node_doorstep",
                    affinity_delta=2,
                    reason="你愿意花时间逐户核对，而不是给她一个好听的答案。",
                    story_flags=("visited_doorsteps",),
                    relationship_flags=("walked_door_to_door",),
                ),
                _choice(
                    "choice_find_questioner_together",
                    "陪她去找拿名单问话的人",
                    "node_doctor_list",
                    affinity_delta=1,
                    reason="你陪她走向正在进行的调查，没有把她单独推给陌生人。",
                    story_flags=("approached_questioner_together",),
                    relationship_flags=("stayed_beside_annie",),
                ),
                _choice(
                    "choice_leave_at_crossroads",
                    "告诉她只能帮到这里，在岔路口离开",
                    "node_distant_ending",
                    affinity_delta=-2,
                    reason="你在答应同行后仍把她独自留在岔路口。",
                    story_flags=("left_at_crossroads",),
                    relationship_flags=("left_before_safe_water",),
                ),
            ),
        ),
        StoryNode(
            id="node_doctor_list",
            narration=(
                "街的另一头，有人拿着死亡登记名单，逐户询问死者家里喝过哪里的水。"
                "Snow 的调查早已开始；安妮能做的，只是把自己确实知道的取水处说清。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_write_known_source",
                    "先把她确实知道的取水处写清",
                    "node_record_testimony",
                    affinity_delta=2,
                    reason="你没有替她推断，只帮她记下能够确认的取水处。",
                    story_flags=("wrote_known_sources",),
                    relationship_flags=("recorded_only_known",),
                ),
                _choice(
                    "choice_claim_we_solved_it",
                    "声称是你们先找到了答案",
                    "node_record_wary",
                    affinity_delta=-4,
                    reason="你把正在进行的调查说成了自己的发现。",
                    story_flags=("claimed_public_discovery",),
                    relationship_flags=("claimed_credit",),
                ),
                _choice(
                    "choice_keep_checking",
                    "先不打断问话，继续核对街坊",
                    "node_doorstep",
                    affinity_delta=1,
                    reason="你没有急着抢在调查前面，而是继续核对见闻。",
                    story_flags=("continued_checking",),
                    relationship_flags=("did_not_interrupt",),
                ),
            ),
        ),
        StoryNode(
            id="node_trace_source",
            narration=(
                "你们沿来路回找。安妮不认水色，也不认一句保证；她只认取得到的地点、"
                "看得见的门牌，以及谁亲手提过水。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_record_confirmed_source",
                    "只写自己能确认的取水处",
                    "node_record_testimony",
                    affinity_delta=2,
                    reason="你把能够确认的取水处和猜测分开。",
                    story_flags=("recorded_confirmed_source",),
                    relationship_flags=("kept_claim_precise",),
                ),
                _choice(
                    "choice_correct_water_source",
                    "承认记错了，划掉以后重新询问",
                    "node_record_testimony",
                    affinity_delta=2,
                    reason="你公开改正自己的错误，没有把墨迹藏起来。",
                    story_flags=("corrected_source",),
                    relationship_flags=("corrected_openly",),
                ),
                _choice(
                    "choice_invent_water_source",
                    "随便写一处取水点，赌大人不会查",
                    "node_record_wary",
                    affinity_delta=-5,
                    reason="你明知没有核对，仍想把猜测写成事实。",
                    story_flags=("invented_source",),
                    relationship_flags=("fabricated_evidence",),
                ),
            ),
        ),
        StoryNode(
            id="node_doorstep",
            narration=(
                "两扇门给出的说法并不一样：一户只记得病倒的人，另一户记得是谁去取过水。"
                "安妮蹲下来，把“亲眼看见”和“听人说”分成两边。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_separate_evidence",
                    "把门牌、取水处和亲眼所见分开记录",
                    "node_record_testimony",
                    affinity_delta=2,
                    reason="你帮助她把不同来源的说法分开，没有混成一个结论。",
                    story_flags=("separated_evidence",),
                    relationship_flags=("kept_evidence_separate",),
                ),
                _choice(
                    "choice_declare_pump_guilty",
                    "停止询问，断定肯定就是那口泵",
                    "node_record_wary",
                    affinity_delta=-3,
                    reason="你在证词仍有空缺时就宣布了结论。",
                    story_flags=("declared_unverified_cause",),
                    relationship_flags=("jumped_to_conclusion",),
                ),
                _choice(
                    "choice_ask_unaffected",
                    "再问没有病倒的人从哪里取水",
                    "node_contrast_sources",
                    affinity_delta=2,
                    reason="你愿意核对反例，而不是只挑支持自己猜测的话。",
                    story_flags=("asked_unaffected_households",),
                    relationship_flags=("checked_contrasts",),
                ),
            ),
        ),
        StoryNode(
            id="node_contrast_sources",
            narration=(
                "街坊提到附近济贫院有自己的水源，啤酒厂工人通常也不饮用街泵水。"
                "安妮在纸边写下“听说”，不肯把还没核对的话装成亲眼所见。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_mark_hearsay",
                    "把“听说”标清，再把纸交给核对的人",
                    "node_record_testimony",
                    affinity_delta=2,
                    reason="你保留了转述的来源边界，没有把它冒充亲眼证词。",
                    story_flags=("marked_hearsay",),
                    relationship_flags=("labeled_hearsay",),
                ),
                _choice(
                    "choice_promote_hearsay",
                    "听着合理，直接写成已经证实的事",
                    "node_record_wary",
                    affinity_delta=-4,
                    reason="你把尚未核对的转述写成了已经证实的事实。",
                    story_flags=("promoted_hearsay",),
                    relationship_flags=("misstated_hearsay",),
                ),
            ),
        ),
        StoryNode(
            id="node_record_testimony",
            narration=(
                "纸上有了三列：哪一扇门、从哪里取水、这句话是谁亲眼看见的。"
                "安妮把纸压在陶罐下面，决定最后由谁开口。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_let_annie_speak",
                    "让安妮自己说，你只在旁边补门牌",
                    "node_trust_ending",
                    affinity_delta=4,
                    reason="你让她用自己的话讲完见闻，只补充能够核对的门牌。",
                    story_flags=("annie_spoke_for_herself",),
                    relationship_flags=("respected_her_voice",),
                ),
                _choice(
                    "choice_deliver_together",
                    "和她一起把纸交给收集说法的人",
                    "node_safe_ending",
                    affinity_delta=3,
                    reason="你没有抢走纸页，也没有把她单独推到人群前。",
                    story_flags=("delivered_together",),
                    relationship_flags=("shared_the_delivery",),
                ),
                _choice(
                    "choice_take_over_story",
                    "拿走纸页，替她把故事说得更像真的",
                    "node_record_wary",
                    affinity_delta=-5,
                    reason="你想用更漂亮的说法取代她真正见到的事。",
                    story_flags=("took_over_testimony",),
                    relationship_flags=("overrode_her_voice",),
                ),
            ),
        ),
        StoryNode(
            id="node_record_wary",
            narration=(
                "安妮把纸抽了回去。她可以原谅弄错，却不肯让猜测冒充见过的事，"
                "也不肯把自己的话交给别人改。"
            ),
            ending_id=None,
            choices=(
                _choice(
                    "choice_repair_record",
                    "划掉猜测，只留下能够核对的事",
                    "node_repaired_ending",
                    affinity_delta=3,
                    reason="你留下了清楚的改痕，并把猜测从纸上划掉。",
                    story_flags=("repaired_record",),
                    relationship_flags=("repaired_after_harm",),
                ),
                _choice(
                    "choice_insist_on_story",
                    "坚持大人只听吓人的说法，不肯修改",
                    "node_wary_ending",
                    affinity_delta=-3,
                    reason="你坚持让吓人的说法压过能够核对的见闻。",
                    story_flags=("insisted_on_exaggeration",),
                    relationship_flags=("kept_exaggerating",),
                ),
            ),
        ),
        StoryNode(
            id="node_trust_ending",
            narration=(
                "安妮自己说完每一扇门和每一处取水点。她没有叫你恩人，只把你的门牌"
                "补在纸角：这是她愿意下次再来找的人。" + FIXED_HISTORY_RESULT
            ),
            choices=(),
            ending_id="ending_witness_heard",
        ),
        StoryNode(
            id="node_safe_ending",
            narration=(
                "你们并肩走到正在收集说法的人群边。那张纸只是许多住户见闻中的一张；"
                "安妮却记住了，你一路都没有替她把不知道的事说成知道。"
                + FIXED_HISTORY_RESULT
            ),
            choices=(),
            ending_id="ending_left_the_pump",
        ),
        StoryNode(
            id="node_repaired_ending",
            narration=(
                "你划掉了那句过头的话。安妮盯着墨痕看了一会儿，把纸重新递给你一角。"
                "她还没有完全信你，但愿意让你陪着把路走完。" + FIXED_HISTORY_RESULT
            ),
            choices=(),
            ending_id="ending_record_repaired",
        ),
        StoryNode(
            id="node_wary_ending",
            narration=(
                "安妮把纸折回自己口袋，不再让你替她开口。你们走向同一条街，却隔开了"
                "两步。她会记得你曾帮忙，也会记得你更想要一个漂亮答案。"
                + FIXED_HISTORY_RESULT
            ),
            choices=(),
            ending_id="ending_annie_wary",
        ),
        StoryNode(
            id="node_distant_ending",
            narration=(
                "你在岔路口停下。安妮没有追，也没有责怪，只抱着空陶罐继续贴墙往前走。"
                "故事不替你补写她之后找到什么。" + FIXED_HISTORY_RESULT
            ),
            choices=(),
            ending_id="ending_no_answer",
        ),
    ),
)

ANNIE_STORY_WORLD = StoryWorld(
    id=ANNIE_STORY_WORLD_ID,
    title="1854 年宽街",
    summary="在不可改写的宽街历史中，帮助原创儿童见证者把饮水来源和亲眼所见分开说清。",
    genre="历史剧情",
    publication_status=PublicationStatus.PUBLISHED,
    content_version="annie-broad-street-2026-07-27.2",
    entry_chapter_id=CHAPTER.id,
    player_role=PLAYER_ROLE,
    characters=(ANNIE,),
    chapters=(CHAPTER,),
    endings=(
        StoryEnding(
            id="ending_witness_heard",
            title="被认真听见",
            summary="你让安妮用自己的话讲完见闻，只补充能核对的门牌。她愿意在以后再次来找你。",
        ),
        StoryEnding(
            id="ending_left_the_pump",
            title="离开水泵",
            summary="你们共同交出一张普通的住户见闻。它没有改变公共历史，却让安妮记住你没有替她编造答案。",
        ),
        StoryEnding(
            id="ending_record_repaired",
            title="留下改痕",
            summary="你公开划掉了猜测。安妮仍有保留，但愿意让你陪着把剩下的路走完。",
        ),
        StoryEnding(
            id="ending_annie_wary",
            title="隔着两步",
            summary="你坚持用更吓人的说法代替可核对见闻。安妮带走纸页，也收回了让你替她开口的信任。",
        ),
        StoryEnding(
            id="ending_no_answer",
            title="雨中的背影",
            summary="你拒绝继续介入。安妮独自离开，故事不替你补写她之后的命运。",
        ),
    ),
    canon_entries=(
        CanonEntry(
            id="fact_outbreak_intensified",
            category=CanonCategory.FIXED_FACT,
            statement="1854 年宽街一带的霍乱暴发在 8 月 31 日夜至 9 月 1 日显著加剧。",
            sources=(SNOW_1855, UCLA_INVESTIGATION),
        ),
        CanonEntry(
            id="fact_snow_investigation_method",
            category=CanonCategory.FIXED_FACT,
            statement="John Snow 获取死亡登记资料，并逐户询问死者家庭实际使用的饮水来源。",
            sources=(SNOW_1855, PARISH_REPORT_1855),
        ),
        CanonEntry(
            id="fact_parish_statement_and_handle",
            category=CanonCategory.FIXED_FACT,
            statement="Snow 于 9 月 7 日晚向 St James 教区监护委员会陈述，宽街水泵把手于次日被移除。",
            sources=(SNOW_1855, UCLA_HANDLE_REMOVAL),
        ),
        CanonEntry(
            id="fact_outbreak_already_declining",
            category=CanonCategory.FIXED_FACT,
            statement="Snow 自己说明，在泵柄移除前暴发已经开始减退，不能把疫情结束归因于单一动作。",
            sources=(SNOW_1855, WHITEHEAD_1862),
        ),
        CanonEntry(
            id="fact_comparison_water_sources",
            category=CanonCategory.FIXED_FACT,
            statement="宽街附近济贫院有自己的水源，附近啤酒厂工人通常也不饮用街泵水；这些记录用于比较饮水来源。",
            sources=(SNOW_1855, PARISH_REPORT_1855),
        ),
        CanonEntry(
            id="fact_map_not_discovery_origin",
            category=CanonCategory.FIXED_FACT,
            statement="后来广为流传的点图用于呈现和分析证据，但不是 Snow 首次形成水传播假设或开始调查的原因。",
            sources=(SNOW_1855, LANCET_MAP_HISTORY),
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
            id="setting_family_warning",
            category=CanonCategory.STORY_SETTING,
            statement="安妮的母亲禁止她继续使用宽街水泵，是虚构家庭的谨慎，不代表当时居民普遍接受水传播解释。",
            sources=(),
        ),
        CanonEntry(
            id="setting_testimony_paper",
            category=CanonCategory.STORY_SETTING,
            statement="安妮与玩家逐户核对门牌、取水处并整理纸页的过程属于原创剧情，只是众多地方见闻之一。",
            sources=(),
        ),
        CanonEntry(
            id="setting_private_endings",
            category=CanonCategory.STORY_SETTING,
            statement="五个结局只记录安妮是否信任玩家、是否同行及是否让玩家替她开口，不改变公共历史。",
            sources=(),
        ),
    ),
)
