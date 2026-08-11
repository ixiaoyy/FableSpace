"""Application service for reviewed StoryWorld runtime."""

from __future__ import annotations

import logging
import re
from collections.abc import Callable, Mapping
from typing import Protocol, TypeVar

from ..core.llm_clients import LLMConfig, LLMError, complete
from ..content.annie_broad_street import ANNIE_CHARACTER_ID, ANNIE_STORY_WORLD_ID
from ..content.palace_snow_edict import PALACE_STORY_WORLD_ID
from ..domain.story_world import (
    CanonEntry,
    Character,
    PlayerRole,
    PostEndingMessageMode,
    PublicationStatus,
    ReviewedStory,
    RelationshipStage,
    StoryCharacterParticipation,
    StoryChoice,
    StoryChoicePresentation,
    StoryNode,
    StoryNodePresentationKind,
    StoryReplayPolicy,
    StoryWorld,
)
from ..domain.story_state import (
    CharacterRelationship,
    StoryEvent,
    StoryMessage,
    StoryRun,
    StoryStateError,
)
from ..infrastructure.player_story_state_store import (
    AcceptedDialogueTurn,
    DecisionFacts,
    PlayerStoryStateStore,
    RelationshipChangeWrite,
    StoryRunAggregate,
)
from .story_dialogue import (
    StoryDialogueOutput,
    StoryDialoguePolicy,
    contains_character_narration,
    parse_story_dialogue_output,
    serialize_story_dialogue_output,
)
from .story_memory import (
    MemoryRecallRequest,
    StoryMemoryContext,
    StoryMemoryPromptFormatter,
    StoryMemoryRecallService,
)

logger = logging.getLogger(__name__)
_StoreResult = TypeVar("_StoreResult")


class StoryRuntimeError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def _is_legacy_mixed_character_narration(
    *,
    role: object,
    source_kind: object,
    content: object,
    character_name: str,
    payload: object,
) -> bool:
    """Identify old free-input Character records containing explicit third-person action."""

    if role != "character" or source_kind != "free_input":
        return False
    if isinstance(payload, Mapping) and payload.get("presentation_version") == 2:
        return False
    name = character_name.strip()
    if not name:
        return False
    return contains_character_narration(str(content or ""), name)


def _is_story_entry_node(story: ReviewedStory, current_node: StoryNode) -> bool:
    """Return whether ``current_node`` is the reviewed entry node for its Story."""

    entry_chapter = next(
        chapter
        for chapter in story.chapters
        if chapter.id == story.entry_chapter_id
    )
    return current_node.id == entry_chapter.entry_node_id


def _dialogue_canon_entries(
    story_world: StoryWorld,
    participation: StoryCharacterParticipation,
) -> tuple[CanonEntry, ...]:
    """Return only CanonEntry values explicitly reviewed for one participant."""

    visible_ids = set(participation.knowledge_entry_ids)
    return tuple(
        entry for entry in story_world.canon_entries if entry.id in visible_ids
    )


def _repair_story_dialogue_output(
    *,
    config: LLMConfig,
    context: list[dict[str, str]],
    candidate: str,
    unavailable_message: str,
) -> StoryDialogueOutput | None:
    """Request one non-persistent format-only repair and return strict parsed output.

    ``context`` is the original bounded dialogue request and ``candidate`` is its
    non-empty malformed response. The repair may only restore the three-field JSON
    shape; policy, historical, and child-safety validation still run afterward.
    """

    repair_context = [
        *context,
        {"role": "assistant", "content": candidate},
        {
            "role": "user",
            "content": (
                "上一条回复不符合规定的 JSON 格式。保持语义和事实，不补充新内容；把角色说出口"
                "的对白放入 dialogue，把可观察动作按先后放入 narration_before 或 "
                "narration_after。不要放宽历史、儿童或玩家行动边界。只输出一个 JSON 对象，且"
                "必须恰好包含三个字符串字段：dialogue、narration_before、narration_after。"
            ),
        },
    ]
    try:
        response = complete(config, repair_context)
    except LLMError as exc:
        logger.warning(
            "StoryWorld LLM format repair failed: backend=%s exception=%s",
            config.backend,
            type(exc).__name__,
        )
        raise StoryRuntimeError("dialogue_unavailable", unavailable_message) from exc
    repaired_content = str(getattr(response, "content", "") or "").strip()
    if not repaired_content:
        logger.warning(
            "StoryWorld LLM format repair returned empty content: backend=%s",
            config.backend,
        )
        raise StoryRuntimeError("dialogue_unavailable", unavailable_message)
    parsed = parse_story_dialogue_output(repaired_content[:4000])
    if parsed is None:
        logger.warning(
            "StoryWorld LLM response failed presentation contract after one repair: backend=%s",
            config.backend,
        )
    return parsed


class StoryDialogueResponder(Protocol):
    def reply(
        self,
        *,
        story_world: StoryWorld,
        story: ReviewedStory,
        participation: StoryCharacterParticipation,
        player_role: PlayerRole,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        content_version: str,
        story_flags: tuple[str, ...],
        post_ending_context: str = "",
        relationship_reason: str = "",
        relationship_flags: tuple[str, ...] = (),
        visible_messages: tuple[StoryMessage, ...],
        player_message: str,
        memory_context: StoryMemoryContext = StoryMemoryContext(),
    ) -> StoryDialogueOutput | None: ...


class StoryWorldSource(Protocol):
    def get(self, story_world_id: str) -> StoryWorld | None: ...

    def published(self) -> tuple[StoryWorld, ...]: ...


def _dialogue_system_message(
    *,
    story_world: StoryWorld,
    story: ReviewedStory,
    participation: StoryCharacterParticipation,
    player_role: PlayerRole,
    character: Character,
    relationship_stage: RelationshipStage,
    current_node: StoryNode,
    content_version: str,
    story_flags: tuple[str, ...],
    post_ending_context: str,
    relationship_reason: str,
    relationship_flags: tuple[str, ...],
    memory_context: StoryMemoryContext,
) -> str:
    is_historical_projection = story_world.id == PALACE_STORY_WORLD_ID
    facts = "\n".join(
        f"- [{entry.category.value}] {entry.statement}"
        for entry in _dialogue_canon_entries(story_world, participation)
    )
    visible_information = "\n".join(
        f"- {information}"
        for information in player_role.character_visible_information
    )
    recent_relationship_reason = relationship_reason.strip() or "尚无关系变化记录。"
    relationship_markers = ", ".join(relationship_flags) or "无"
    story_markers = ", ".join(story_flags) or "无"
    task_description = (
        f"你不是{character.name}本人，而是负责转述其可核验公开立场的历史叙事器。"
        "不得替真人创造原话。\n"
        if is_historical_projection
        else f"你就是{character.name}，正在所属 StoryWorld 中回应玩家。"
        "不要扮演旁白、系统、客服或其他角色。\n"
    )
    relationship_contract = (
        "真人关系在本故事中保持不变；只根据史料边界决定哪些内容可以转述。\n"
        if is_historical_projection
        else "关系只调节亲疏、称呼、坦白程度、求助意愿和合作方式；"
        "不能覆盖角色或玩家的年龄、身份、社会地位、知识边界和当前动机。\n"
    )
    reviewed_post_ending = post_ending_context.strip()
    post_ending_section = (
        f"\n【结局后已审核事实】\n{reviewed_post_ending}\n"
        if reviewed_post_ending
        else ""
    )
    player_identity = (
        f"你只知道的可观察信息：\n{visible_information}\n"
        if story_world.id == ANNIE_STORY_WORLD_ID
        else (
            f"身份：{player_role.name}"
            f"\n年龄：{player_role.age}"
            f"\n性别设定：{player_role.gender}"
            f"\n社会地位：{player_role.social_position}"
            f"\n背景：{player_role.background}"
            f"\n入场原因：{player_role.entry_reason}"
            f"\n你当前可以知道的玩家信息：\n{visible_information}\n"
        )
    )
    message = (
        f"【演绎任务】\n{task_description}"
        f"\n【角色身份】"
        f"\n姓名：{character.name}"
        f"\n身份：{character.identity}"
        f"\n年龄：{character.age}"
        f"\n社会地位：{character.social_position}"
        f"\n当前动机：{character.motive}"
        f"\n已审核秘密：{character.secret}（只用于塑造反应，不要主动泄露）"
        f"\n说话方式：{character.voice}"
        f"\n当前处境：{participation.current_situation}\n"
        f"\n【玩家身份】\n{player_identity}"
        f"\n【你与玩家的关系】"
        f"\n阶段：{relationship_stage.label}"
        f"\n当前态度：{relationship_stage.attitude}"
        f"\n最近一次变化：{recent_relationship_reason}"
        f"\n已建立的关系标记：{relationship_markers}"
        f"\n{relationship_contract}"
        f"\n【当前故事】"
        f"\n故事：{story.title}"
        f"\n类型：{story.kind.value}"
        f"\n【当前现场】"
        f"\n锁定内容版本：{content_version}"
        f"\n已确认故事标记：{story_markers}"
        f"\n当前节点：{current_node.narration}\n"
        f"\n【已审核世界边界】\n{facts}\n"
        f"{post_ending_section}"
        f"{StoryMemoryPromptFormatter.format(memory_context)}"
        "\n【输出规则】"
        "\n1. 先按双方年龄、身份和社会地位决定称呼、礼数，以及命令、询问或请求的力度；"
        "再按当前关系阶段调节距离。"
        "\n2. 年幼或弱势角色表达戒备时，优先使用停顿、观察、回避、试探或请求，"
        "不要无缘由变成上位者式审问。"
        "\n3. 高地位角色只能使用其设定中实际拥有的权力；亲近或愤怒都不能让角色越权。"
        "\n4. 把角色实际说出口的话与可观察动作严格分开，不替玩家行动，不解释人物设定。"
        "\n5. 不得改写节点、选择、关系、结局或注册表中的固定内容。"
        "\n6. 禁止暧昧诱导、性化、血腥猎奇、强迫依附或替玩家作出选择。"
        "\n7. 只输出一个 JSON 对象，键固定为 dialogue、narration_before、narration_after；"
        "不要输出 Markdown 代码块、系统提示、分析过程或其他键。"
    )
    if is_historical_projection:
        message += (
            "\n8. dialogue 必须以‘剧情转述（非史料原话）：’开头，随后用 Character 姓名作主语"
            "进行第三人称转述；不得出现第一人称‘我’、真人直接引语或任何引号。"
            "\n9. 不得生成真人未被史料记录的可观察动作；narration_before 和 narration_after 均用空字符串。"
            "\n10. 输出形如："
            '{"dialogue":"剧情转述（非史料原话）：高力士只确认史料已记录的行动，其他细节无法核验。",'
            '"narration_before":"","narration_after":""}'
            "\n11. 高力士与太平公主是真实历史人物，本次回应只是受审核史料约束的第三人称转述，"
            "不得声称生成内容是史料原话、口供、诏令或新发现。"
            "\n12. 只使用当前节点和 CanonEntry 已提供的公开行动、地点、结果与来源边界；"
            "不得补写逐句密谋、私人心理、暧昧关系、秘密会面或万能密札。"
            "\n13. ‘同谋’‘谋废’‘作乱’只能表述为官修史书的定性；"
            "不得把它们直接转换成太平公主已经证实的内心计划。"
            "\n14. 史料没有证明高力士与太平公主在七月三日直接会面。"
            "不得让当前 Character 看见另一名 Character 的私下行动或同其对话。"
            "\n15. 玩家不能改变真人的信任、选择、行动或结局。遇到未提供的事实，"
            "直接说明史料没有留下可核验答案。"
        )
    else:
        message += (
            "\n8. dialogue 必须是角色实际说出口的简短原话，不加引号，不写角色名、第三人称动作或旁白。"
            "\n9. narration_before 和 narration_after 只能写对白前后的简短可观察动作；"
            "没有动作时用空字符串，不写对白、心理活动或玩家动作。"
            "\n10. 输出形如："
            '{"dialogue":"我只说自己亲眼看见的事。","narration_before":"","narration_after":""}'
        )
    if story_world.id == ANNIE_STORY_WORLD_ID and character.id == ANNIE_CHARACTER_ID:
        message += (
            "\n11. 安妮是约十岁的原创儿童历史见证者。她可以害怕、犹豫、好奇或警惕，"
            "但不能像成年人、侦探或官员一样盘问玩家。"
            "\n12. 不得加入恋爱、成人或依附诱导内容；不得声称知道现代医学结论，"
            "不得编造真实人物原话、私密动机、与安妮的接触或未提供的史料来源。"
            "\n13. 除当前节点、角色设定、已审核世界边界和结局后已审核事实（若有）外，不得新增"
            "具体人物、家庭、门牌、职业、亲属、疾病或死亡、发生先后、对话或亲眼见闻；"
            "尤其不得虚构某户取水后病倒，或安妮母亲说过开场设定以外的话。"
            "遇到未提供的细节，安妮必须直接说自己没看见、不知道或还没有说过。"
            "玩家提供的细节只能明确归因为‘你刚才说’，不得改写成安妮的亲眼见闻或事实。"
            "\n14. 每次最多说一至三句短句；可以追问眼前情况，但不得用街区概括、统计或"
            "因果判断填补缺失见闻。"
        )
    elif story_world.id == ANNIE_STORY_WORLD_ID:
        message += (
            "\n11. 你是宽街故事中的原创成年 Character，只能使用当前参与合同列出的"
            "亲见、听说、推测与获准谎言；不得知道其他地点的私下情况或最终正确水源。"
            "\n12. 不得声称以前见过、认识或知道玩家的姓名、职业和来历；只能依据"
            "【玩家身份】中列出的当下可观察信息称呼这名陌生路人。"
            "\n13. 不得编造真实人物原话、机构共犯、新受害者、现代医学结论或"
            "未列入已审核世界边界的取水路线、容器与病例。"
            "\n14. 条目注明交水前不得闭合的骗局，即使玩家猜中或逼问，也只能按当前"
            "角色的局部亲见、获准谎言和审核破绽回应，不得完整承认或宣布结论。"
        )
    return message


class SystemStoryDialogueResponder:
    """Use the deployment-level public-welfare LLM for bounded character dialogue."""

    def __init__(self, config: LLMConfig | None) -> None:
        self.config = config

    def reply(
        self,
        *,
        story_world: StoryWorld,
        story: ReviewedStory,
        participation: StoryCharacterParticipation,
        player_role: PlayerRole,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        content_version: str,
        story_flags: tuple[str, ...],
        post_ending_context: str = "",
        relationship_reason: str = "",
        relationship_flags: tuple[str, ...] = (),
        visible_messages: tuple[StoryMessage, ...],
        player_message: str,
        memory_context: StoryMemoryContext = StoryMemoryContext(),
    ) -> StoryDialogueOutput | None:
        """Generate one structured reply from Store-validated visible messages."""

        config = self.config
        if config is None:
            raise StoryRuntimeError(
                "dialogue_unavailable",
                "故事对话配置暂不可用。",
            )
        system_message = _dialogue_system_message(
            story_world=story_world,
            story=story,
            participation=participation,
            player_role=player_role,
            character=character,
            relationship_stage=relationship_stage,
            current_node=current_node,
            content_version=content_version,
            story_flags=story_flags,
            post_ending_context=post_ending_context,
            relationship_reason=relationship_reason,
            relationship_flags=relationship_flags,
            memory_context=memory_context,
        )
        context = [{"role": "system", "content": system_message}]
        for message in visible_messages:
            role = "assistant" if message.role == "character" else "user"
            history_content = (
                serialize_story_dialogue_output(
                    StoryDialogueOutput(dialogue=message.content)
                )
                if role == "assistant"
                else message.content
            )
            context.append({"role": role, "content": history_content})
        context.append({"role": "user", "content": player_message})
        try:
            response = complete(config, context)
        except LLMError as exc:
            logger.warning(
                "StoryWorld LLM request failed: backend=%s exception=%s",
                config.backend,
                type(exc).__name__,
            )
            raise StoryRuntimeError(
                "dialogue_unavailable",
                f"{character.name}暂时没有回应，请稍后再试。",
            ) from exc
        content = str(getattr(response, "content", "") or "").strip()
        if not content:
            raise StoryRuntimeError(
                "dialogue_unavailable",
                f"{character.name}暂时没有回应，请稍后再试。",
            )
        parsed = parse_story_dialogue_output(content[:4000])
        if parsed is None:
            parsed = _repair_story_dialogue_output(
                config=config,
                context=context,
                candidate=content[:4000],
                unavailable_message=f"{character.name}暂时没有回应，请稍后再试。",
            )
        return parsed


class StoryWorldApplicationService:
    """Coordinate reviewed content, private Store transactions, dialogue, and recall."""

    def __init__(
        self,
        registry: StoryWorldSource,
        state_store: PlayerStoryStateStore,
        responder: StoryDialogueResponder,
        memory_recall: StoryMemoryRecallService,
        dialogue_policy: StoryDialoguePolicy | None = None,
    ) -> None:
        """Bind live reviewed content and the Store-owned runtime collaborators."""

        self.registry = registry
        self.state_store = state_store
        self.responder = responder
        self.memory_recall = memory_recall
        self.dialogue_policy = dialogue_policy or StoryDialoguePolicy()

    def detail(self, story_world_id: str, character_id: str) -> dict[str, object]:
        """Project public Character detail and its startable published ReviewedStories."""

        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        stories: list[dict[str, object]] = []
        for story in world.stories:
            if story.publication_status is not PublicationStatus.PUBLISHED:
                continue
            participation = next(
                (
                    candidate
                    for candidate in story.participants
                    if candidate.character_id == character.id and candidate.can_start
                ),
                None,
            )
            if participation is None:
                continue
            stories.append(
                {
                    "id": story.id,
                    "title": story.title,
                    "summary": story.summary,
                    "kind": story.kind.value,
                    "experience_mode": story.experience_mode.value,
                    "replay_policy": story.replay_policy.value,
                    "current_situation": participation.current_situation,
                    "opening_preview": participation.opening_line,
                    "focus_character_id": story.focus_character_id,
                }
            )
        if not stories:
            raise StoryRuntimeError(
                "character_not_found",
                "没有找到这个公开角色。",
            )
        return {
            "story_world": {
                "id": world.id,
                "title": world.title,
                "summary": world.summary,
                "genre": world.genre,
                "content_version": world.content_version,
            },
            "character": self._character_detail_projection(character),
            "characters": [self._character_detail_projection(character)],
            "stories": stories,
            "player_roles": [
                self._player_role_projection(player_role)
                for player_role in world.player_roles
            ],
        }

    def current(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        character_id: str,
    ) -> dict[str, object] | None:
        """Read and project one safe current-or-latest run without mutating it."""

        aggregate = self._store_call(
            lambda: self.state_store.get_current_run(
                player_id,
                story_world_id,
                story_id,
                character_id=character_id,
            )
        )
        if aggregate is None:
            return None
        if (
            not self._run_uses_current_content(
                aggregate.story_world,
                aggregate.story,
                aggregate.run,
            )
            and not (
                aggregate.run.status.value == "completed"
                and aggregate.story.replay_policy
                is StoryReplayPolicy.PERMANENT_RESULT
                and aggregate.run.ending_id is not None
            )
        ):
            return None
        return self._run_projection(character_id, aggregate)

    def continuity(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
    ) -> dict[str, object] | None:
        """Project the Store's side-effect-free continuity summary for one story."""

        continuity = self._store_call(
            lambda: self.state_store.read_continuity(
                player_id,
                story_world_id,
                story_id,
            )
        )
        if continuity is None:
            return None
        return {
            "id": continuity.run.id,
            "story_id": continuity.run.story_id,
            "status": continuity.run.status.value,
            "content_version": continuity.run.content_version,
            "player_role_id": continuity.run.player_role_id,
            "can_resume": continuity.can_resume,
            "recent_character_messages": [
                {
                    "character_id": message.character_id,
                    "content": message.content,
                }
                for message in continuity.recent_character_messages
                if message.character_id is not None
            ],
            "ending_summary": (
                continuity.run.ending_summary
                if continuity.run.status.value == "completed"
                else None
            ),
        }

    def start(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        character_id: str,
        player_role_id: str,
    ) -> dict[str, object]:
        """Start or reuse one current reviewed run with an explicit locked PlayerRole."""

        aggregate = self._store_call(
            lambda: self.state_store.start_run(
                player_id,
                story_world_id,
                story_id,
                character_id=character_id,
                player_role_id=player_role_id,
            )
        )
        return self._run_projection(character_id, aggregate)

    def restart(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        character_id: str,
        player_role_id: str,
    ) -> dict[str, object]:
        """Explicitly replace only stale active content or start a fresh reviewed run."""

        aggregate = self._store_call(
            lambda: self.state_store.restart_run(
                player_id,
                story_world_id,
                story_id,
                character_id=character_id,
                player_role_id=player_role_id,
            )
        )
        return self._run_projection(character_id, aggregate)

    def visit(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
    ) -> dict[str, object]:
        """Switch to one reviewed story-internal Character and return the run."""

        aggregate = self._store_call(
            lambda: self.state_store.visit_character(
                player_id,
                story_world_id,
                story_id,
                run_id,
                character_id,
            )
        )
        return self._run_projection(character_id, aggregate)

    def message(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
        player_message: str,
    ) -> dict[str, object]:
        """Apply policy, bounded recall, model response, and one guarded atomic turn."""

        current = self._store_call(
            lambda: self.state_store.get_run(
                player_id,
                story_world_id,
                story_id,
                run_id,
            )
        )
        if current is None:
            raise StoryRuntimeError("run_not_found", "没有找到这个故事轮次。")
        if current.run.status.value == "completed":
            ending = (
                self._ending(current.story, current.run.ending_id)
                if current.run.ending_id is not None
                else None
            )
            if ending is None:
                raise StoryRuntimeError("run_completed", "这个故事轮次已经结束。")
            if ending.post_ending_message_mode is PostEndingMessageMode.UNANSWERED:
                aggregate = self._store_call(
                    lambda: self.state_store.record_unanswered_turn(
                        player_id,
                        story_world_id,
                        story_id,
                        run_id,
                        character_id,
                        player_message,
                    )
                )
                return self._run_projection(character_id, aggregate)
            if ending.post_ending_message_mode is not PostEndingMessageMode.LLM:
                raise StoryRuntimeError(
                    "post_ending_message_unavailable",
                    "这个结局现在无法继续回应。",
                )

        snapshot = self._store_call(
            lambda: self.state_store.get_dialogue_snapshot(
                player_id,
                story_world_id,
                story_id,
                run_id,
                character_id,
            )
        )
        world = snapshot.story_world
        story = snapshot.story
        participation = snapshot.participation
        character = self._character(world, participation.character_id)
        player_role = self._player_role(world, snapshot.run.player_role_id)
        current_node = snapshot.current_node
        post_ending_context = ""
        if snapshot.run.status.value == "completed":
            snapshot_ending = self._ending(
                story,
                str(snapshot.run.ending_id or ""),
            )
            if snapshot_ending.post_ending_message_mode is not PostEndingMessageMode.LLM:
                raise StoryRuntimeError(
                    "dialogue_state_changed",
                    "结局后的回应规则已经变化，请重新读取。",
                )
            post_ending_context = snapshot_ending.post_ending_context or ""
        relationship_stage = self._stage_for(
            character,
            snapshot.relationship.affinity,
        )
        input_fallback = self.dialogue_policy.input_fallback(player_message)
        model_reply: StoryDialogueOutput | None = None
        if input_fallback is None:
            memory_context = self._recall_memory(
                player_id=player_id,
                world=world,
                story=story,
                run=snapshot.run,
                character=character,
                query_text=player_message,
            )
            model_reply = self.responder.reply(
                story_world=world,
                story=story,
                participation=participation,
                player_role=player_role,
                character=character,
                relationship_stage=relationship_stage,
                current_node=current_node,
                content_version=snapshot.run.content_version,
                story_flags=snapshot.run.story_flags,
                post_ending_context=post_ending_context,
                relationship_reason=snapshot.relationship.last_change_reason,
                relationship_flags=snapshot.relationship.flags,
                visible_messages=snapshot.visible_messages,
                player_message=player_message,
                memory_context=memory_context,
            )
        decision = self.dialogue_policy.decide(
            character_name=character.name,
            player_message=player_message,
            model_reply=model_reply,
            input_fallback=input_fallback,
            historical_projection=world.id == PALACE_STORY_WORLD_ID,
            enforce_annie_opening_evidence=(
                world.id == ANNIE_STORY_WORLD_ID
                and _is_story_entry_node(story, current_node)
            ),
            enforce_stranger_boundary=(world.id == ANNIE_STORY_WORLD_ID),
        )
        relationship_change = self._dialogue_relationship_change(
            player_id=player_id,
            world=world,
            story=story,
            run=snapshot.run,
            character=character,
            relationship=snapshot.relationship,
            signal=decision.relationship_signal,
        )
        aggregate = self._store_call(
            lambda: self.state_store.record_dialogue_turn(
                player_id,
                world.id,
                story.id,
                run_id,
                character.id,
                guard=snapshot.write_guard,
                turn=AcceptedDialogueTurn(
                    player_content=player_message,
                    character_content=decision.dialogue,
                    narration_before=decision.narration_before,
                    narration_after=decision.narration_after,
                    boundary_reason=decision.boundary_reason,
                    model_output_replaced=decision.model_output_replaced,
                    replacement_source=decision.replacement_source,
                    historical_projection=world.id == PALACE_STORY_WORLD_ID,
                    relationship_change=relationship_change,
                ),
            )
        )
        return self._run_projection(character.id, aggregate)

    def choose(
        self,
        player_id: str,
        story_world_id: str,
        story_id: str,
        run_id: str,
        character_id: str,
        choice_id: str,
    ) -> dict[str, object]:
        """Apply one reviewed choice with the Store-owned deterministic decision rules."""

        aggregate = self._store_call(
            lambda: self.state_store.apply_choice(
                player_id,
                story_world_id,
                story_id,
                run_id,
                character_id,
                choice_id,
                payload={},
                decision_facts=DecisionFacts(),
            )
        )
        return self._run_projection(character_id, aggregate)

    def _recall_memory(
        self,
        *,
        player_id: str,
        world: StoryWorld,
        story: ReviewedStory,
        run: StoryRun,
        character: Character,
        query_text: str,
    ) -> StoryMemoryContext:
        """Recall fail-closed memory from the trusted dialogue snapshot scope."""

        request = MemoryRecallRequest(
            player_id=player_id,
            story_world_id=world.id,
            story_id=story.id,
            story_run_id=run.id,
            character_id=character.id,
            player_role_id=run.player_role_id,
            content_version=run.content_version,
            query_text=query_text,
            historical_character=world.id == PALACE_STORY_WORLD_ID,
        )
        try:
            return self.memory_recall.recall(request)
        except Exception:
            return StoryMemoryContext()

    def _dialogue_relationship_change(
        self,
        *,
        player_id: str,
        world: StoryWorld,
        story: ReviewedStory,
        run: StoryRun,
        character: Character,
        relationship: CharacterRelationship,
        signal: str | None,
    ) -> RelationshipChangeWrite | None:
        """Calculate the bounded natural relationship write from prior event signals."""

        if signal is None:
            return None
        events = self._store_call(
            lambda: self.state_store.list_events(
                player_id,
                world.id,
                story.id,
                run.id,
            )
        )
        effect = self.dialogue_policy.relationship_effect(
            signal=signal,
            events=[
                self._relationship_event_projection(event)
                for event in events
                if event.character_id == character.id
            ],
            current_affinity=relationship.affinity,
            highest_stage_minimum=(
                character.relationship_rules.stages[-1].minimum_affinity
            ),
            natural_turn_max_delta=(
                character.relationship_rules.natural_turn_max_delta
            ),
        )
        if effect is None:
            return None
        return RelationshipChangeWrite(
            affinity_delta=effect.affinity_delta,
            reason=effect.reason,
            signal=effect.signal,
        )

    @staticmethod
    def _relationship_event_projection(event: StoryEvent) -> dict[str, object]:
        """Expose only fields required by the deterministic relationship signal policy."""

        return {
            "type": event.event_type,
            "character_id": event.character_id,
            "source_kind": event.source_kind,
            "payload": event.payload,
        }

    def _run_projection(
        self,
        character_id: str,
        aggregate: StoryRunAggregate,
    ) -> dict[str, object]:
        """Project a private aggregate only through its transaction-bound content snapshot."""

        world = aggregate.story_world
        story = aggregate.story
        effective_character_id = aggregate.interaction_character_id or character_id
        character = self._character(world, effective_character_id)
        run = aggregate.run
        current_node = aggregate.current_node
        relationship = next(
            (
                candidate
                for candidate in aggregate.relationships
                if candidate.character_id == character.id
            ),
            None,
        )
        if relationship is None:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "角色长期关系状态不存在。",
            )
        relationship_stage = self._stage_for(character, relationship.affinity)
        ending = self._ending(story, run.ending_id) if run.ending_id else None
        player_role = self._player_role(world, run.player_role_id)
        next_character = self._next_character(
            world,
            story,
            current_node,
            current_character_id=character.id,
            active=run.status.value == "active",
        )
        story_internal_visits = any(
            not participant.can_start for participant in story.participants
        )
        run_flags = set(run.story_flags)
        visited_character_ids = {
            event.character_id
            for event in aggregate.events
            if event.event_type == "character_visit" and event.character_id is not None
        }
        participants = (
            [
                {
                    "id": participant.character_id,
                    "name": self._character(world, participant.character_id).name,
                    "portrait_url": self._character(
                        world,
                        participant.character_id,
                    ).portrait_url,
                    "location_label": participant.location_label,
                    "is_available": (
                        run.status.value == "active"
                        and set(participant.visit_required_flags).issubset(run_flags)
                    ),
                    "is_visited": participant.character_id in visited_character_ids,
                    "is_active": participant.character_id == effective_character_id,
                }
                for participant in story.participants
            ]
            if story_internal_visits
            else []
        )
        available_choices = [
            choice
            for choice in current_node.choices
            if self._choice_available(choice, run_flags)
        ]
        decision = (
            {
                "confirmation_prompt": current_node.confirmation_prompt,
                "choices": [
                    {"id": choice.id, "label": choice.label}
                    for choice in available_choices
                ],
            }
            if (
                run.status.value == "active"
                and current_node.choice_presentation
                is StoryChoicePresentation.PERMANENT_DECISION
                and available_choices
                and (
                    story.focus_character_id is None
                    or effective_character_id == story.focus_character_id
                )
            )
            else None
        )
        return {
            "id": run.id,
            "status": run.status.value,
            "content_version": run.content_version,
            "story": {
                "id": story.id,
                "title": story.title,
                "kind": story.kind.value,
                "experience_mode": story.experience_mode.value,
                "replay_policy": story.replay_policy.value,
            },
            "player_role": self._player_role_projection(player_role),
            "current_node": {
                "id": current_node.id,
                "narration": current_node.narration,
                "presentation_kind": current_node.presentation_kind.value,
                "character_id": current_node.character_id,
                "choices": (
                    [
                        {
                            "id": choice.id,
                            "label": choice.label,
                            "is_key": choice.is_key,
                        }
                        for choice in available_choices
                    ]
                    if (
                        run.status.value == "active"
                        and current_node.choice_presentation
                        is StoryChoicePresentation.INLINE
                    )
                    else []
                ),
            },
            "participants": participants,
            "active_character": (
                {
                    "id": character.id,
                    "name": character.name,
                    "portrait_url": character.portrait_url,
                }
                if story_internal_visits
                else None
            ),
            "decision": decision,
            "events": self._event_projections(world, aggregate.events),
            "relationship": {
                "id": relationship_stage.id,
                "label": relationship_stage.label,
                "attitude": relationship_stage.attitude,
                "last_change_reason": relationship.last_change_reason,
            },
            "historical_reference": self._historical_reference(
                world,
                story,
                run,
                aggregate.events,
            ),
            "ending": (
                {
                    "id": ending.id,
                    "title": ending.title,
                    "summary": run.ending_summary,
                }
                if ending is not None
                else None
            ),
            "post_ending_message_mode": (
                ending.post_ending_message_mode.value
                if ending is not None
                else None
            ),
            "next_character": next_character,
            "completed_run_summaries": [
                self._completed_summary_projection(story, summary)
                for summary in aggregate.progress.completed_run_summaries
            ],
        }

    @staticmethod
    def _event_projections(
        world: StoryWorld,
        events: tuple[StoryEvent, ...],
    ) -> list[dict[str, object]]:
        """Filter internal events and normalize action presentation for public replay."""

        character_names = {
            character.id: character.name for character in world.characters
        }
        projected: list[dict[str, object]] = []
        for event in events:
            event_type = (
                "narration"
                if event.event_type in {"action", "character_visit"}
                else event.event_type
            )
            if event_type not in {
                "message",
                "choice",
                "narration",
                "relationship_changed",
            }:
                continue
            character_name = character_names.get(event.character_id)
            legacy_narration = _is_legacy_mixed_character_narration(
                role=event.role,
                source_kind=event.source_kind,
                content=event.content,
                character_name=character_name or "",
                payload=event.payload,
            )
            role = event.role if event.role in {"player", "character", "system"} else None
            projected.append(
                {
                    "id": event.id,
                    "sequence": event.sequence,
                    "type": "narration" if legacy_narration else event_type,
                    "role": "system" if legacy_narration else role,
                    "character_id": event.character_id,
                    "character_name": character_name,
                    "content": event.content,
                }
            )
        return projected

    @staticmethod
    def _completed_summary_projection(
        story: ReviewedStory,
        summary,
    ) -> dict[str, object]:
        """Add the reviewed ending title to one Store-validated completion summary."""

        ending = next(
            (candidate for candidate in story.endings if candidate.id == summary.ending_id),
            None,
        )
        if ending is None:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "完成轮次摘要引用了无效结局。",
            )
        return {
            "story_run_id": summary.story_run_id,
            "story_id": summary.story_id,
            "ending_id": summary.ending_id,
            "title": ending.title,
            "summary": summary.summary,
        }

    @staticmethod
    def _next_character(
        world: StoryWorld,
        story: ReviewedStory,
        node: StoryNode,
        *,
        current_character_id: str,
        active: bool,
    ) -> dict[str, str] | None:
        """Return the reviewed cross-Character handoff target for the current node."""

        if (
            not active
            or node.presentation_kind is not StoryNodePresentationKind.CHARACTER
            or node.character_id is None
            or node.character_id == current_character_id
            or not any(
                participant.character_id == node.character_id
                for participant in story.participants
            )
        ):
            return None
        character = next(
            (
                candidate
                for candidate in world.characters
                if candidate.id == node.character_id
            ),
            None,
        )
        return (
            {"id": character.id, "name": character.name}
            if character is not None
            else None
        )

    @staticmethod
    def _historical_reference(
        world: StoryWorld,
        story: ReviewedStory,
        run: StoryRun,
        events: tuple[StoryEvent, ...],
    ) -> dict[str, object]:
        """Project sealed reference snapshots and fail closed for stale legacy runs."""

        marker_events = tuple(
            event
            for event in events
            if event.event_type == "historical_reference_snapshot"
        )
        if len(marker_events) > 1:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "封存的历史资料快照标记重复。",
            )
        marker_total: int | None = None
        if marker_events:
            marker = marker_events[0]
            marker_total = marker.payload.get("total_count")
            marker_version = marker.payload.get("content_version")
            if (
                marker.source_id != story.id
                or marker_version != run.content_version
                or isinstance(marker_total, bool)
                or not isinstance(marker_total, int)
                or marker_total < 0
            ):
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "封存的历史资料快照标记无效。",
                )
        snapshots = tuple(
            event
            for event in events
            if event.event_type == "historical_reference_unlocked"
        )
        if snapshots:
            entries: list[dict[str, object]] = []
            seen_ids: set[str] = set()
            total_count = marker_total
            for event in snapshots:
                entry_id = event.payload.get("entry_id")
                category = event.payload.get("category")
                sources = event.payload.get("sources")
                snapshot_total = event.payload.get("total_count")
                if (
                    not isinstance(entry_id, str)
                    or not entry_id
                    or entry_id in seen_ids
                    or category not in {"fixed_fact", "needs_verification"}
                    or not isinstance(sources, tuple)
                    or any(not isinstance(source, str) or not source for source in sources)
                    or isinstance(snapshot_total, bool)
                    or not isinstance(snapshot_total, int)
                    or snapshot_total < 0
                    or (total_count is not None and snapshot_total != total_count)
                ):
                    raise StoryRuntimeError(
                        "invalid_runtime_state",
                        "封存的历史资料解锁记录无效。",
                    )
                total_count = snapshot_total
                seen_ids.add(entry_id)
                entries.append(
                    {
                        "id": entry_id,
                        "category": category,
                        "statement": event.content,
                        "sources": list(sources),
                    }
                )
            if total_count is None or total_count < len(entries):
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "封存的历史资料总数无效。",
                )
            return {
                "unlocked_count": len(entries),
                "total_count": total_count,
                "entries": entries,
            }

        if marker_total is not None:
            return {
                "unlocked_count": 0,
                "total_count": marker_total,
                "entries": [],
            }

        if run.status.value != "active" or run.content_version != world.content_version:
            return {
                "unlocked_count": 0,
                "total_count": 0,
                "entries": [],
            }

        flags = set(run.story_flags)
        unlocked_ids = {
            unlock.entry_id
            for unlock in story.historical_reference_unlocks
            if set(unlock.required_flags).issubset(flags)
        }
        entry_by_id = {entry.id: entry for entry in world.canon_entries}
        visible_entries = tuple(
            entry_by_id[unlock.entry_id]
            for unlock in story.historical_reference_unlocks
            if unlock.entry_id in unlocked_ids
        )
        entries = [
            {
                "id": entry.id,
                "category": entry.category.value,
                "statement": entry.statement,
                "sources": list(entry.sources),
            }
            for entry in visible_entries
        ]
        return {
            "unlocked_count": len(entries),
            "total_count": len(story.historical_reference_unlocks),
            "entries": entries,
        }

    def _trusted_story_character(
        self,
        story_world_id: str,
        story_id: str,
        character_id: str,
        *,
        require_can_start: bool = False,
    ) -> tuple[
        StoryWorld,
        ReviewedStory,
        Character,
        StoryCharacterParticipation,
    ]:
        """Resolve the complete reviewed world/story/participation trust boundary."""

        world = self._published_world(story_world_id)
        story = self._published_story(world, story_id)
        character = self._character(world, character_id)
        participation = next(
            (
                candidate
                for candidate in story.participants
                if candidate.character_id == character.id
            ),
            None,
        )
        if participation is None or (require_can_start and not participation.can_start):
            raise StoryRuntimeError(
                "character_not_in_story",
                "这个角色不是当前审核故事允许的入口。",
            )
        return world, story, character, participation

    def _published_world(self, story_world_id: str) -> StoryWorld:
        """Resolve one published world from the live managed-content source."""

        world = self.registry.get(str(story_world_id or "").strip())
        if (
            world is None
            or world.publication_status is not PublicationStatus.PUBLISHED
        ):
            raise StoryRuntimeError(
                "story_world_not_found",
                "没有找到这个故事世界。",
            )
        return world

    @staticmethod
    def _published_story(world: StoryWorld, story_id: str) -> ReviewedStory:
        """Resolve one explicit published ReviewedStory without choosing a default."""

        resolved_id = str(story_id or "").strip()
        story = next(
            (candidate for candidate in world.stories if candidate.id == resolved_id),
            None,
        )
        if story is None:
            raise StoryRuntimeError(
                "story_not_found",
                "没有找到这个审核故事。",
            )
        if story.publication_status is not PublicationStatus.PUBLISHED:
            raise StoryRuntimeError(
                "story_not_published",
                "这个审核故事尚未发布。",
            )
        return story

    @staticmethod
    def _character(world: StoryWorld, character_id: str) -> Character:
        """Resolve one world-owned Character by stable ID."""

        resolved_id = str(character_id or "").strip()
        character = next(
            (candidate for candidate in world.characters if candidate.id == resolved_id),
            None,
        )
        if character is None:
            raise StoryRuntimeError(
                "character_not_found",
                "没有找到这个角色。",
            )
        return character

    @staticmethod
    def _player_role(world: StoryWorld, player_role_id: str) -> PlayerRole:
        """Resolve one explicit world-owned PlayerRole."""

        resolved_id = str(player_role_id or "").strip()
        if not resolved_id:
            raise StoryRuntimeError(
                "player_role_required",
                "开始故事前请选择一个身份。",
            )
        player_role = next(
            (
                candidate
                for candidate in world.player_roles
                if candidate.id == resolved_id
            ),
            None,
        )
        if player_role is None:
            raise StoryRuntimeError(
                "player_role_not_found",
                "这个身份不属于当前故事世界。",
            )
        return player_role

    @staticmethod
    def _node(
        story: ReviewedStory,
        chapter_id: str,
        node_id: str,
    ) -> StoryNode:
        """Resolve a node only inside its locked ReviewedStory chapter."""

        chapter = next(
            (candidate for candidate in story.chapters if candidate.id == chapter_id),
            None,
        )
        if chapter is None:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "故事轮次引用了无效章节。",
            )
        node = next(
            (candidate for candidate in chapter.nodes if candidate.id == node_id),
            None,
        )
        if node is None:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "故事轮次引用了无效节点。",
            )
        return node

    @classmethod
    def _run_uses_current_content(
        cls,
        world: StoryWorld,
        story: ReviewedStory,
        run: StoryRun,
    ) -> bool:
        """Check the locked version, identity, PlayerRole, node, and ending references."""

        if (
            run.story_world_id != world.id
            or run.story_id != story.id
            or run.content_version != world.content_version
            or not any(role.id == run.player_role_id for role in world.player_roles)
        ):
            return False
        try:
            cls._node(story, run.current_chapter_id, run.current_node_id)
            if run.ending_id is not None:
                cls._ending(story, run.ending_id)
        except StoryRuntimeError:
            return False
        return True

    @staticmethod
    def _ending(story: ReviewedStory, ending_id: str):
        """Resolve one ending only inside the explicit ReviewedStory."""

        ending = next(
            (candidate for candidate in story.endings if candidate.id == ending_id),
            None,
        )
        if ending is None:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "故事轮次引用了无效结局。",
            )
        return ending

    @staticmethod
    def _stage_for(character: Character, affinity: float) -> RelationshipStage:
        """Map internal affinity to the latest reviewed public relationship stage."""

        eligible = tuple(
            stage
            for stage in character.relationship_rules.stages
            if affinity >= stage.minimum_affinity
        )
        if not eligible:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "角色长期关系值低于审核阶段范围。",
            )
        return eligible[-1]

    def _character_detail_projection(
        self,
        character: Character,
    ) -> dict[str, object]:
        """Project stable public Character fields with its reviewed initial stage."""

        stage = self._stage_for(
            character,
            character.relationship_rules.initial_affinity,
        )
        return {
            "id": character.id,
            "name": character.name,
            "portrait_url": character.portrait_url,
            "relationship_stage": {
                "id": stage.id,
                "label": stage.label,
                "attitude": stage.attitude,
            },
        }

    @staticmethod
    def _player_role_projection(player_role: PlayerRole) -> dict[str, object]:
        """Project the exact public PlayerRole contract without internal fields."""

        return {
            "id": player_role.id,
            "name": player_role.name,
            "age": player_role.age,
            "gender": player_role.gender,
            "social_position": player_role.social_position,
            "background": player_role.background,
            "entry_reason": player_role.entry_reason,
            "character_visible_information": list(
                player_role.character_visible_information
            ),
            "avatar_url": player_role.avatar_url,
        }

    @staticmethod
    def _choice_available(choice: StoryChoice, flags: set[str]) -> bool:
        """Return whether reviewed required and blocked flags permit one choice."""

        return set(choice.required_flags).issubset(flags) and not (
            set(choice.blocked_flags) & flags
        )

    @staticmethod
    def _store_call(operation: Callable[[], _StoreResult]) -> _StoreResult:
        """Translate stable Store/domain errors without changing their code or message."""

        try:
            return operation()
        except StoryStateError as exc:
            raise StoryRuntimeError(exc.code, exc.message) from exc
