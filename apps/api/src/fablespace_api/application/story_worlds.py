"""Application service for reviewed StoryWorld runtime."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from datetime import datetime
from typing import Protocol
from uuid import uuid4

from sqlalchemy import func, select

from ..core.llm_clients import LLMConfig, LLMError, complete
from ..content.annie_broad_street import (
    ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE,
    ANNIE_STORY_WORLD_ID,
)
from ..content.palace_snow_edict import PALACE_STORY_WORLD_ID
from ..domain.story_world import (
    Character,
    PlayerRole,
    PublicationStatus,
    RelationshipStage,
    StoryChoice,
    StoryNode,
    StoryWorld,
)
from ..infrastructure.database import Database
from ..infrastructure.story_state_models import (
    CharacterRelationshipModel,
    PlayerStoryStateModel,
    StoryEventModel,
    StoryRunModel,
)
from .story_dialogue import (
    StoryDialogueOutput,
    StoryDialoguePolicy,
    contains_character_narration,
    parse_story_dialogue_output,
)

logger = logging.getLogger(__name__)


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


class StoryDialogueResponder(Protocol):
    def reply(
        self,
        *,
        story_world: StoryWorld,
        player_role: PlayerRole,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        content_version: str,
        story_flags: tuple[str, ...],
        relationship_reason: str = "",
        relationship_flags: tuple[str, ...] = (),
        events: list[dict[str, object]],
        player_message: str,
    ) -> StoryDialogueOutput | None: ...


class StoryWorldSource(Protocol):
    def get(self, story_world_id: str) -> StoryWorld | None: ...

    def published(self) -> tuple[StoryWorld, ...]: ...


def _dialogue_system_message(
    *,
    story_world: StoryWorld,
    player_role: PlayerRole,
    character: Character,
    relationship_stage: RelationshipStage,
    current_node: StoryNode,
    content_version: str,
    story_flags: tuple[str, ...],
    relationship_reason: str,
    relationship_flags: tuple[str, ...],
) -> str:
    is_historical_projection = story_world.id == PALACE_STORY_WORLD_ID
    facts = "\n".join(
        f"- [{entry.category.value}] {entry.statement}"
        for entry in story_world.canon_entries
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
        f"\n当前处境：{character.current_situation}\n"
        f"\n【玩家身份】"
        f"\n身份：{player_role.name}"
        f"\n年龄：{player_role.age}"
        f"\n性别设定：{player_role.gender}"
        f"\n社会地位：{player_role.social_position}"
        f"\n背景：{player_role.background}"
        f"\n入场原因：{player_role.entry_reason}"
        f"\n你当前可以知道的玩家信息：\n{visible_information}\n"
        f"\n【你与玩家的关系】"
        f"\n阶段：{relationship_stage.label}"
        f"\n当前态度：{relationship_stage.attitude}"
        f"\n最近一次变化：{recent_relationship_reason}"
        f"\n已建立的关系标记：{relationship_markers}"
        f"\n{relationship_contract}"
        f"\n【当前现场】"
        f"\n锁定内容版本：{content_version}"
        f"\n已确认故事标记：{story_markers}"
        f"\n当前节点：{current_node.narration}\n"
        f"\n【已审核世界边界】\n{facts}\n"
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
    if story_world.id == ANNIE_STORY_WORLD_ID:
        message += (
            "\n11. 安妮是约十岁的原创儿童历史见证者。她可以害怕、犹豫、好奇或警惕，"
            "但不能像成年人、侦探或官员一样盘问玩家。"
            "\n12. 不得加入恋爱、成人或依附诱导内容；不得声称知道现代医学结论，"
            "不得编造真实人物原话、私密动机、与安妮的接触或未提供的史料来源。"
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
        player_role: PlayerRole,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        content_version: str,
        story_flags: tuple[str, ...],
        relationship_reason: str = "",
        relationship_flags: tuple[str, ...] = (),
        events: list[dict[str, object]],
        player_message: str,
    ) -> StoryDialogueOutput | None:
        config = self.config
        if config is None:
            raise StoryRuntimeError(
                "dialogue_unavailable",
                "故事对话配置暂不可用。",
            )
        system_message = _dialogue_system_message(
            story_world=story_world,
            player_role=player_role,
            character=character,
            relationship_stage=relationship_stage,
            current_node=current_node,
            content_version=content_version,
            story_flags=story_flags,
            relationship_reason=relationship_reason,
            relationship_flags=relationship_flags,
        )
        context = [{"role": "system", "content": system_message}]
        dialogue_history = [
            event
            for event in events
            if event.get("role") in {"character", "player"}
            and not _is_legacy_mixed_character_narration(
                role=event.get("role"),
                source_kind=event.get("source_kind"),
                content=event.get("content"),
                character_name=character.name,
                payload=event.get("payload"),
            )
        ]
        for event in dialogue_history[-8:]:
            role = "assistant" if event.get("role") == "character" else "user"
            context.append({"role": role, "content": str(event.get("content") or "")})
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
            logger.warning(
                "StoryWorld LLM response failed presentation contract: backend=%s",
                config.backend,
            )
        return parsed


class StoryWorldApplicationService:
    def __init__(
        self,
        database: Database,
        registry: StoryWorldSource,
        responder: StoryDialogueResponder,
        dialogue_policy: StoryDialoguePolicy | None = None,
    ) -> None:
        self.database = database
        self.registry = registry
        self.responder = responder
        self.dialogue_policy = dialogue_policy or StoryDialoguePolicy()

    def detail(self, story_world_id: str, character_id: str) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        stage = self._stage_for(character, character.relationship_rules.initial_affinity)
        characters = []
        for candidate in world.characters:
            candidate_stage = self._stage_for(
                candidate,
                candidate.relationship_rules.initial_affinity,
            )
            characters.append(
                {
                    "id": candidate.id,
                    "name": candidate.name,
                    "portrait_url": candidate.portrait_url,
                    "current_situation": candidate.current_situation,
                    "relationship_stage": {
                        "id": candidate_stage.id,
                        "label": candidate_stage.label,
                        "attitude": candidate_stage.attitude,
                    },
                }
            )
        return {
            "story_world": {
                "id": world.id,
                "title": world.title,
                "summary": world.summary,
                "genre": world.genre,
                "content_version": world.content_version,
            },
            "character": {
                "id": character.id,
                "name": character.name,
                "portrait_url": character.portrait_url,
                "current_situation": character.current_situation,
                "opening_preview": character.opening_line,
                "relationship_stage": {
                    "id": stage.id,
                    "label": stage.label,
                    "attitude": stage.attitude,
                },
            },
            "characters": characters,
            "player_roles": [
                self._player_role_projection(player_role)
                for player_role in world.player_roles
            ],
        }

    def current(
        self,
        player_id: str,
        story_world_id: str,
        character_id: str,
    ) -> dict[str, object] | None:
        """Read a resumable current run without refreshing or rewriting private state."""
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        with self.database.session_scope() as session:
            state = session.scalar(
                select(PlayerStoryStateModel)
                .where(
                    PlayerStoryStateModel.player_id == player_id,
                    PlayerStoryStateModel.story_world_id == world.id,
                )
            )
            if state is None:
                return None
            run = None
            if state.active_story_run_id:
                run = session.get(StoryRunModel, state.active_story_run_id)
                if run is not None and (
                    run.player_id != player_id or run.story_world_id != world.id
                ):
                    raise StoryRuntimeError(
                        "invalid_runtime_state",
                        "活动故事轮次不属于当前玩家与故事世界。",
                    )
            if run is None:
                run = session.scalar(
                    select(StoryRunModel)
                    .where(
                        StoryRunModel.player_id == player_id,
                        StoryRunModel.story_world_id == world.id,
                        StoryRunModel.status == "completed",
                    )
                    .order_by(StoryRunModel.completed_at.desc())
                    .limit(1)
                )
            if run is None:
                return None
            if run.status not in {"active", "completed"}:
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "故事轮次状态无效。",
                )
            if run.status == "active" and state.player_role_id != run.player_role_id:
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "玩家状态与活动轮次锁定的身份不一致。",
                )
            if not self._run_uses_current_content(world, run):
                return None
            return self._run_projection(session, world, character, run, state)

    def continuity(
        self,
        player_id: str,
        story_world_id: str,
    ) -> dict[str, object] | None:
        """Return a read-only recent-run summary for private homepage continuity."""
        world = self._published_world(story_world_id)
        with self.database.session_scope() as session:
            state = session.scalar(
                select(PlayerStoryStateModel).where(
                    PlayerStoryStateModel.player_id == player_id,
                    PlayerStoryStateModel.story_world_id == world.id,
                )
            )
            if state is None:
                return None

            run = None
            if state.active_story_run_id:
                run = session.get(StoryRunModel, state.active_story_run_id)
                if run is not None and (
                    run.player_id != player_id or run.story_world_id != world.id
                ):
                    raise StoryRuntimeError(
                        "invalid_runtime_state",
                        "活动故事轮次不属于当前玩家与故事世界。",
                    )
            if run is None:
                run = session.scalar(
                    select(StoryRunModel)
                    .where(
                        StoryRunModel.player_id == player_id,
                        StoryRunModel.story_world_id == world.id,
                        StoryRunModel.status == "completed",
                    )
                    .order_by(StoryRunModel.completed_at.desc())
                    .limit(1)
                )
            if run is None:
                return None
            if run.status not in {"active", "completed"}:
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "故事轮次状态无效。",
                )

            recent_character_messages = [
                {
                    "character_id": event["character_id"],
                    "content": event["content"],
                }
                for event in reversed(self._events(session, world, run.id))
                if event["type"] == "message"
                and event["role"] == "character"
                and event["character_id"]
            ][:10]
            return {
                "id": run.id,
                "status": run.status,
                "content_version": run.content_version,
                "player_role_id": run.player_role_id,
                "can_resume": (
                    run.status == "active"
                    and self._run_uses_current_content(world, run)
                ),
                "recent_character_messages": recent_character_messages,
                "ending_summary": (
                    run.ending_summary if run.status == "completed" else None
                ),
            }

    def start(
        self,
        player_id: str,
        story_world_id: str,
        character_id: str,
        player_role_id: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        player_role = self._player_role(world, player_role_id)
        with self.database.session_scope() as session:
            state = self._state_for_update(session, player_id, world, player_role)
            if state.active_story_run_id:
                active = session.get(StoryRunModel, state.active_story_run_id)
                if active and active.status == "active":
                    if (
                        active.player_role_id != player_role.id
                        and self._run_uses_current_content(world, active)
                    ):
                        raise StoryRuntimeError(
                            "player_role_locked",
                            "当前轮次已经锁定了另一个身份。",
                        )
                    active = self._refresh_active_run(
                        session,
                        state,
                        world,
                        character,
                        active,
                        replacement_player_role=player_role,
                        allow_replacement=True,
                    )
                    if active is not None:
                        session.flush()
                        return self._run_projection(
                            session,
                            world,
                            character,
                            active,
                            state,
                        )
            run = self._create_run(session, state, world, character, player_role)
            session.flush()
            return self._run_projection(session, world, character, run, state)

    def restart(
        self,
        player_id: str,
        story_world_id: str,
        character_id: str,
        player_role_id: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        player_role = self._player_role(world, player_role_id)
        with self.database.session_scope() as session:
            state = self._state_for_update(session, player_id, world, player_role)
            if state.active_story_run_id:
                active = session.get(StoryRunModel, state.active_story_run_id)
                if active and active.status == "active":
                    raise StoryRuntimeError("active_run_exists", "当前故事尚未结束。")
            run = self._create_run(session, state, world, character, player_role)
            session.flush()
            return self._run_projection(session, world, character, run, state)

    def message(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        character_id: str,
        player_message: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        with self.database.session_scope() as session:
            run = self._owned_active_run(session, player_id, world.id, run_id)
            state = self._active_state_for_update(
                session,
                player_id,
                world.id,
                run.id,
            )
            original_run_id = run.id
            run = self._refresh_active_run(
                session,
                state,
                world,
                character,
                run,
            )
            if run is None:
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "活动故事轮次不存在。",
                )
            if run.id != original_run_id or run.status != "active":
                session.flush()
                return self._run_projection(
                    session,
                    world,
                    character,
                    run,
                    state,
                )
            relationship = session.get(
                CharacterRelationshipModel,
                (run.id, character.id),
            )
            if relationship is None:
                raise StoryRuntimeError("invalid_runtime_state", "角色关系状态不存在。")
            events = self._dialogue_events(session, run.id)
            node = self._node(world, run.current_node_id)
            player_role = self._player_role(world, run.player_role_id)
            stage = self._stage_for(character, relationship.affinity)
            snapshot_node_id = run.current_node_id
            snapshot_content_version = run.content_version
            snapshot_story_flags = tuple(run.story_flags or ())
            snapshot_relationship_reason = relationship.last_change_reason or ""
            snapshot_relationship_flags = tuple(relationship.flags or ())
        input_fallback = self.dialogue_policy.input_fallback(player_message)
        model_reply = None
        if input_fallback is None:
            model_reply = self.responder.reply(
                story_world=world,
                player_role=player_role,
                character=character,
                relationship_stage=stage,
                current_node=node,
                content_version=snapshot_content_version,
                story_flags=snapshot_story_flags,
                relationship_reason=snapshot_relationship_reason,
                relationship_flags=snapshot_relationship_flags,
                events=events,
                player_message=player_message,
            )
        decision = self.dialogue_policy.decide(
            character_name=character.name,
            player_message=player_message,
            model_reply=model_reply,
            input_fallback=input_fallback,
            historical_projection=world.id == PALACE_STORY_WORLD_ID,
        )
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        with self.database.session_scope() as session:
            run = self._owned_active_run(session, player_id, world.id, run_id)
            state = self._active_state_for_update(
                session,
                player_id,
                world.id,
                run.id,
            )
            original_run_id = run.id
            run = self._refresh_active_run(
                session,
                state,
                world,
                character,
                run,
            )
            if run is None:
                raise StoryRuntimeError(
                    "invalid_runtime_state",
                    "活动故事轮次不存在。",
                )
            if (
                run.id != original_run_id
                or run.status != "active"
                or run.content_version != snapshot_content_version
            ):
                session.flush()
                return self._run_projection(
                    session,
                    world,
                    character,
                    run,
                    state,
                )
            if run.current_node_id != snapshot_node_id:
                raise StoryRuntimeError(
                    "dialogue_state_changed",
                    "故事已经进入下一段，请基于当前情节重新回应。",
                )
            relationship = session.get(
                CharacterRelationshipModel,
                (run.id, character.id),
            )
            if relationship is None:
                raise StoryRuntimeError("invalid_runtime_state", "角色关系状态不存在。")
            player_event = self._append_event(
                session,
                run.id,
                event_type="message",
                role="player",
                content=player_message,
                source_kind="free_input",
                payload={"boundary_reason": decision.boundary_reason},
            )
            if decision.narration_before:
                self._append_event(
                    session,
                    run.id,
                    event_type="narration",
                    role="system",
                    character_id=character.id,
                    content=decision.narration_before,
                    source_kind="free_input",
                    source_id=player_event.id,
                    payload={
                        "boundary_reason": decision.boundary_reason,
                        "presentation_version": 2,
                        "placement": "before_dialogue",
                    },
                )
            character_event = self._append_event(
                session,
                run.id,
                event_type="message",
                role="character",
                character_id=character.id,
                content=decision.dialogue,
                source_kind="free_input",
                source_id=player_event.id,
                payload={
                    "boundary_reason": decision.boundary_reason,
                    "model_output_replaced": decision.model_output_replaced,
                    "presentation_version": 2,
                    "historical_projection": world.id == PALACE_STORY_WORLD_ID,
                },
            )
            if decision.narration_after:
                self._append_event(
                    session,
                    run.id,
                    event_type="narration",
                    role="system",
                    character_id=character.id,
                    content=decision.narration_after,
                    source_kind="free_input",
                    source_id=character_event.id,
                    payload={
                        "boundary_reason": decision.boundary_reason,
                        "presentation_version": 2,
                        "placement": "after_dialogue",
                    },
                )
            highest_stage_minimum = character.relationship_rules.stages[-1].minimum_affinity
            effect = self.dialogue_policy.relationship_effect(
                signal=decision.relationship_signal,
                events=self._dialogue_events(session, run.id),
                current_affinity=relationship.affinity,
                highest_stage_minimum=highest_stage_minimum,
                natural_turn_max_delta=character.relationship_rules.natural_turn_max_delta,
            )
            if effect is not None:
                relationship.affinity = min(
                    character.relationship_rules.maximum_affinity,
                    relationship.affinity + effect.affinity_delta,
                )
                relationship.stage = self._stage_for(character, relationship.affinity).id
                relationship.last_change_reason = effect.reason
                self._append_event(
                    session,
                    run.id,
                    event_type="relationship_changed",
                    role="system",
                    character_id=character.id,
                    content=effect.reason,
                    source_kind="free_input",
                    source_id=player_event.id,
                    payload={
                        "signal": effect.signal,
                        "affinity_delta": effect.affinity_delta,
                        "reason": effect.reason,
                        "source_event_id": player_event.id,
                    },
                )
            session.flush()
            return self._run_projection(session, world, character, run, state)

    def choose(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        character_id: str,
        choice_id: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, world.id, run_id)
            if run.status == "active":
                state = self._active_state_for_update(
                    session,
                    player_id,
                    world.id,
                    run.id,
                )
                original_run_id = run.id
                run = self._refresh_active_run(
                    session,
                    state,
                    world,
                    character,
                    run,
                )
                if run is None:
                    raise StoryRuntimeError(
                        "invalid_runtime_state",
                        "活动故事轮次不存在。",
                    )
                if run.id != original_run_id or run.status != "active":
                    session.flush()
                    return self._run_projection(
                        session,
                        world,
                        character,
                        run,
                        state,
                    )
            else:
                state = session.get(
                    PlayerStoryStateModel,
                    (player_id, world.id),
                )
                if state is None:
                    raise StoryRuntimeError(
                        "invalid_runtime_state",
                        "玩家故事状态不存在。",
                    )
                if not self._run_uses_current_content(world, run):
                    raise StoryRuntimeError(
                        "story_content_changed",
                        "故事内容已更新，请重新进入当前故事。",
                    )
            prior = session.scalar(
                select(StoryEventModel).where(
                    StoryEventModel.story_run_id == run.id,
                    StoryEventModel.source_kind == "reviewed_choice",
                    StoryEventModel.source_id == choice_id,
                )
            )
            if prior is not None:
                return self._run_projection(session, world, character, run, state)
            if run.status != "active":
                raise StoryRuntimeError("run_completed", "这个故事轮次已经结束。")
            node = self._node(world, run.current_node_id)
            choice = next((item for item in node.choices if item.id == choice_id), None)
            if choice is None or not self._choice_available(choice, set(run.story_flags or [])):
                raise StoryRuntimeError("choice_unavailable", "这个选择当前不可用。")
            choice_event = self._append_event(
                session,
                run.id,
                event_type="choice",
                role="player",
                content=choice.label,
                source_kind="reviewed_choice",
                source_id=choice.id,
                payload={"choice_id": choice.id},
            )
            flags = list(run.story_flags or [])
            for flag in choice.set_flags:
                if flag not in flags:
                    flags.append(flag)
            run.story_flags = flags
            if choice.is_key:
                run.key_choices = [*(run.key_choices or []), choice.id]
            for effect in choice.relationship_effects:
                relationship = session.get(
                    CharacterRelationshipModel,
                    (run.id, effect.character_id),
                )
                if relationship is None:
                    raise StoryRuntimeError("invalid_runtime_state", "角色关系状态不存在。")
                affected_character = self._character(world, effect.character_id)
                relationship.affinity = max(
                    affected_character.relationship_rules.minimum_affinity,
                    min(
                        affected_character.relationship_rules.maximum_affinity,
                        relationship.affinity + effect.affinity_delta,
                    ),
                )
                relationship.stage = self._stage_for(
                    affected_character,
                    relationship.affinity,
                ).id
                relationship.last_change_reason = effect.reason
                relationship.flags = list(dict.fromkeys([*(relationship.flags or []), *effect.set_flags]))
                self._append_event(
                    session,
                    run.id,
                    event_type="relationship_changed",
                    role="system",
                    character_id=affected_character.id,
                    content=effect.reason,
                    source_kind="reviewed_choice",
                    source_id=choice_event.id,
                    payload={
                        "character_id": affected_character.id,
                        "affinity_delta": effect.affinity_delta,
                        "reason": effect.reason,
                        "source_event_id": choice_event.id,
                        "source_choice_id": choice.id,
                    },
                )
            next_node = self._node(world, choice.next_node_id)
            run.current_node_id = next_node.id
            self._append_event(
                session,
                run.id,
                event_type="narration",
                role="system",
                content=next_node.narration,
                source_kind="authored",
                source_id=next_node.id,
            )
            if next_node.ending_id:
                ending = self._ending(world, next_node.ending_id)
                run.status = "completed"
                run.ending_id = ending.id
                run.ending_summary = ending.summary
                run.completed_at = datetime.utcnow()
                state.active_story_run_id = None
                state.completed_run_summaries = [
                    *(state.completed_run_summaries or []),
                    {
                        "story_run_id": run.id,
                        "ending_id": ending.id,
                        "title": ending.title,
                        "summary": ending.summary,
                    },
                ][-10:]
            session.flush()
            return self._run_projection(session, world, character, run, state)

    def _create_run(
        self,
        session,
        state: PlayerStoryStateModel,
        world: StoryWorld,
        entry_character: Character,
        player_role: PlayerRole,
    ):
        chapter = self._chapter(world, world.entry_chapter_id)
        node = self._node(world, chapter.entry_node_id)
        run = StoryRunModel(
            id=str(uuid4()),
            player_id=state.player_id,
            story_world_id=world.id,
            content_version=world.content_version,
            player_role_id=player_role.id,
            status="active",
            current_chapter_id=chapter.id,
            current_node_id=node.id,
            key_choices=[],
            story_flags=[],
        )
        session.add(run)
        # Persist the FK parent before separately mapped relationship and event rows.
        session.flush()
        for character in world.characters:
            stage = self._stage_for(character, character.relationship_rules.initial_affinity)
            session.add(
                CharacterRelationshipModel(
                    story_run_id=run.id,
                    character_id=character.id,
                    affinity=character.relationship_rules.initial_affinity,
                    stage=stage.id,
                    last_change_reason="",
                    flags=[],
                )
            )
        state.player_role_id = player_role.id
        state.active_story_run_id = run.id
        state.visit_count += 1
        state.last_visited_at = datetime.utcnow()
        self._append_event(
            session,
            run.id,
            event_type="narration",
            role="system",
            content=node.narration,
            source_kind="authored",
            source_id=node.id,
        )
        self._append_event(
            session,
            run.id,
            event_type="message",
            role="character",
            character_id=entry_character.id,
            content=entry_character.opening_line,
            source_kind="authored",
            source_id="opening_line",
            payload={
                "historical_projection": world.id == PALACE_STORY_WORLD_ID,
            },
        )
        return run

    def _refresh_active_run(
        self,
        session,
        state: PlayerStoryStateModel,
        world: StoryWorld,
        entry_character: Character,
        run: StoryRunModel | None,
        *,
        replacement_player_role: PlayerRole | None = None,
        allow_replacement: bool = False,
    ) -> StoryRunModel | None:
        """Validate an active run and replace stale content only after explicit start."""
        if run is None or run.status != "active":
            state.active_story_run_id = None
            return None
        if self._run_uses_current_content(world, run):
            state.player_role_id = run.player_role_id
            self._ensure_current_relationships(session, run, world)
            node = self._node(world, run.current_node_id)
            if node.ending_id:
                self._complete_current_terminal(session, state, run, world, node.ending_id)
            return run

        if not allow_replacement:
            raise StoryRuntimeError(
                "story_content_changed",
                "故事内容已更新，请重新进入当前故事。",
            )

        run.status = "completed"
        run.ending_id = None
        run.ending_summary = None
        run.completed_at = datetime.utcnow()
        state.active_story_run_id = None
        current_role = next(
            (
                player_role
                for player_role in world.player_roles
                if player_role.id == run.player_role_id
            ),
            None,
        )
        player_role = replacement_player_role or current_role or world.player_roles[0]
        return self._create_run(
            session,
            state,
            world,
            entry_character,
            player_role,
        )

    def _ensure_current_relationships(
        self,
        session,
        run: StoryRunModel,
        world: StoryWorld,
    ) -> None:
        """Add new Character relationships and remap retained values to current rules."""
        for character in world.characters:
            relationship = session.get(
                CharacterRelationshipModel,
                (run.id, character.id),
            )
            if relationship is None:
                stage = self._stage_for(
                    character,
                    character.relationship_rules.initial_affinity,
                )
                session.add(
                    CharacterRelationshipModel(
                        story_run_id=run.id,
                        character_id=character.id,
                        affinity=character.relationship_rules.initial_affinity,
                        stage=stage.id,
                        last_change_reason="",
                        flags=[],
                    )
                )
                continue
            first_threshold = character.relationship_rules.stages[0].minimum_affinity
            relationship.affinity = max(
                first_threshold,
                min(
                    character.relationship_rules.maximum_affinity,
                    max(
                        character.relationship_rules.minimum_affinity,
                        relationship.affinity,
                    ),
                ),
            )
            relationship.stage = self._stage_for(
                character,
                relationship.affinity,
            ).id

    def _complete_current_terminal(
        self,
        session,
        state: PlayerStoryStateModel,
        run: StoryRunModel,
        world: StoryWorld,
        ending_id: str,
    ) -> None:
        ending = self._ending(world, ending_id)
        run.status = "completed"
        run.ending_id = ending.id
        run.ending_summary = ending.summary
        run.completed_at = datetime.utcnow()
        state.active_story_run_id = None
        summaries = list(state.completed_run_summaries or [])
        if not any(
            isinstance(item, dict) and item.get("story_run_id") == run.id
            for item in summaries
        ):
            summaries.append(
                {
                    "story_run_id": run.id,
                    "ending_id": ending.id,
                    "title": ending.title,
                    "summary": ending.summary,
                }
            )
        state.completed_run_summaries = summaries[-10:]

    @staticmethod
    def _run_uses_current_content(
        world: StoryWorld,
        run: StoryRunModel,
    ) -> bool:
        if run.content_version != world.content_version:
            return False
        if not any(role.id == run.player_role_id for role in world.player_roles):
            return False
        chapter = next(
            (
                candidate
                for candidate in world.chapters
                if candidate.id == run.current_chapter_id
            ),
            None,
        )
        if chapter is None or not any(
            node.id == run.current_node_id for node in chapter.nodes
        ):
            return False
        if run.ending_id and not any(
            ending.id == run.ending_id for ending in world.endings
        ):
            return False
        return True

    def _state_for_update(
        self,
        session,
        player_id: str,
        world: StoryWorld,
        player_role: PlayerRole,
    ):
        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == player_id,
                PlayerStoryStateModel.story_world_id == world.id,
            )
            .with_for_update()
        )
        if state is None:
            state = PlayerStoryStateModel(
                player_id=player_id,
                story_world_id=world.id,
                player_role_id=player_role.id,
                active_story_run_id=None,
                visit_count=0,
                completed_run_summaries=[],
            )
            session.add(state)
            session.flush()
        else:
            state.player_role_id = player_role.id
        return state

    @staticmethod
    def _active_state_for_update(
        session,
        player_id: str,
        story_world_id: str,
        run_id: str,
    ) -> PlayerStoryStateModel:
        state = session.scalar(
            select(PlayerStoryStateModel)
            .where(
                PlayerStoryStateModel.player_id == player_id,
                PlayerStoryStateModel.story_world_id == story_world_id,
            )
            .with_for_update()
        )
        if state is None or state.active_story_run_id != run_id:
            raise StoryRuntimeError(
                "invalid_runtime_state",
                "玩家状态与活动故事轮次不一致。",
            )
        return state

    def _owned_run(self, session, player_id: str, story_world_id: str, run_id: str):
        run = session.get(StoryRunModel, run_id)
        if run is None or run.player_id != player_id or run.story_world_id != story_world_id:
            raise StoryRuntimeError("run_not_found", "没有找到这个故事轮次。")
        return run

    def _owned_active_run(self, session, player_id: str, story_world_id: str, run_id: str):
        run = self._owned_run(session, player_id, story_world_id, run_id)
        if run.status != "active":
            raise StoryRuntimeError("run_completed", "这个故事轮次已经结束。")
        return run

    def _run_projection(self, session, world, character, run, state):
        node = self._node(world, run.current_node_id)
        relationship = session.get(CharacterRelationshipModel, (run.id, character.id))
        if relationship is None:
            raise StoryRuntimeError("invalid_runtime_state", "角色关系状态不存在。")
        stage = self._stage_for(character, relationship.affinity)
        ending = self._ending(world, run.ending_id) if run.ending_id else None
        player_role = self._player_role(world, run.player_role_id)
        return {
            "id": run.id,
            "status": run.status,
            "content_version": run.content_version,
            "player_role": self._player_role_projection(player_role),
            "current_node": {
                "id": node.id,
                "narration": node.narration,
                "choices": [
                    {"id": choice.id, "label": choice.label, "is_key": choice.is_key}
                    for choice in node.choices
                    if self._choice_available(choice, set(run.story_flags or []))
                ] if run.status == "active" else [],
            },
            "events": self._events(session, world, run.id),
            "relationship": {
                "stage": stage.id,
                "label": stage.label,
                "attitude": stage.attitude,
                "last_change_reason": relationship.last_change_reason,
            },
            "historical_reference": self._historical_reference(world, run),
            "ending": (
                {"id": ending.id, "title": ending.title, "summary": run.ending_summary}
                if ending
                else None
            ),
            "completed_run_summaries": list(state.completed_run_summaries or []),
        }

    @staticmethod
    def _historical_reference(world: StoryWorld, run: StoryRunModel) -> dict[str, object]:
        entry_chapter = next(
            chapter
            for chapter in world.chapters
            if chapter.id == world.entry_chapter_id
        )
        stage = (
            "outcome"
            if run.status == "completed"
            else "opening"
            if run.current_node_id == entry_chapter.entry_node_id
            else "investigation"
        )
        if world.id != ANNIE_STORY_WORLD_ID:
            entries = [
                {
                    "id": entry.id,
                    "category": entry.category.value,
                    "statement": entry.statement,
                    "sources": list(entry.sources),
                }
                for entry in world.canon_entries
            ]
            return {
                "stage": stage,
                "unlocked_count": len(entries),
                "total_count": len(entries),
                "entries": entries,
            }
        stage_order = ("opening", "investigation", "outcome")
        unlocked_ids = {
            entry_id
            for candidate_stage in stage_order[: stage_order.index(stage) + 1]
            for entry_id in ANNIE_REFERENCE_ENTRY_IDS_BY_STAGE[candidate_stage]
        }
        entries = [
            {
                "id": entry.id,
                "category": entry.category.value,
                "statement": entry.statement,
                "sources": list(entry.sources),
            }
            for entry in world.canon_entries
            if entry.id in unlocked_ids
        ]
        return {
            "stage": stage,
            "unlocked_count": len(entries),
            "total_count": len(world.canon_entries),
            "entries": entries,
        }

    def _events(
        self,
        session,
        world: StoryWorld,
        run_id: str,
    ) -> list[dict[str, object]]:
        character_names = {character.id: character.name for character in world.characters}
        projected_events: list[dict[str, object]] = []
        for event in self._dialogue_events(session, run_id):
            character_name = character_names.get(event["character_id"])
            legacy_narration = _is_legacy_mixed_character_narration(
                role=event["role"],
                source_kind=event["source_kind"],
                content=event["content"],
                character_name=character_name or "",
                payload=event["payload"],
            )
            projected_events.append({
                "id": event["id"],
                "sequence": event["sequence"],
                "type": "narration" if legacy_narration else event["type"],
                "role": "system" if legacy_narration else event["role"],
                "character_id": event["character_id"],
                "character_name": character_name,
                "content": event["content"],
            })
        return projected_events

    def _dialogue_events(self, session, run_id: str) -> list[dict[str, object]]:
        events = session.scalars(
            select(StoryEventModel)
            .where(StoryEventModel.story_run_id == run_id)
            .order_by(StoryEventModel.sequence)
        ).all()
        return [
            {
                "id": event.id,
                "sequence": event.sequence,
                "type": event.event_type,
                "role": event.role,
                "character_id": event.character_id,
                "content": event.content,
                "source_kind": event.source_kind,
                "source_id": event.source_id,
                "payload": dict(event.payload or {}),
            }
            for event in events
        ]

    def _append_event(
        self,
        session,
        run_id: str,
        *,
        event_type: str,
        role: str | None,
        content: str,
        source_kind: str,
        character_id: str | None = None,
        source_id: str | None = None,
        payload: dict[str, object] | None = None,
    ) -> StoryEventModel:
        sequence = session.scalar(
            select(func.coalesce(func.max(StoryEventModel.sequence), 0)).where(
                StoryEventModel.story_run_id == run_id
            )
        )
        event = StoryEventModel(
            id=str(uuid4()),
            story_run_id=run_id,
            sequence=int(sequence or 0) + 1,
            event_type=event_type,
            character_id=character_id,
            role=role,
            content=content,
            source_kind=source_kind,
            source_id=source_id,
            payload=payload or {},
        )
        session.add(event)
        session.flush()
        return event

    def _published_world(self, story_world_id: str) -> StoryWorld:
        world = self.registry.get(story_world_id)
        if (
            world is None
            or world.publication_status is not PublicationStatus.PUBLISHED
        ):
            raise StoryRuntimeError("story_world_not_found", "没有找到这个故事世界。")
        return world

    @staticmethod
    def _player_role(world: StoryWorld, player_role_id: str) -> PlayerRole:
        resolved_id = str(player_role_id or "").strip()
        if not resolved_id:
            raise StoryRuntimeError(
                "player_role_required",
                "开始故事前请选择一个身份。",
            )
        player_role = next(
            (item for item in world.player_roles if item.id == resolved_id),
            None,
        )
        if player_role is None:
            raise StoryRuntimeError(
                "player_role_not_found",
                "这个身份不属于当前故事。",
            )
        return player_role

    @staticmethod
    def _player_role_projection(player_role: PlayerRole) -> dict[str, object]:
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
    def _character(world: StoryWorld, character_id: str) -> Character:
        character = next((item for item in world.characters if item.id == character_id), None)
        if character is None:
            raise StoryRuntimeError("character_not_found", "没有找到这个角色。")
        return character

    @staticmethod
    def _chapter(world: StoryWorld, chapter_id: str):
        chapter = next((item for item in world.chapters if item.id == chapter_id), None)
        if chapter is None:
            raise StoryRuntimeError("invalid_story_content", "故事章节不存在。")
        return chapter

    @staticmethod
    def _node(world: StoryWorld, node_id: str):
        for chapter in world.chapters:
            node = next((item for item in chapter.nodes if item.id == node_id), None)
            if node:
                return node
        raise StoryRuntimeError("invalid_story_content", "故事节点不存在。")

    @staticmethod
    def _ending(world: StoryWorld, ending_id: str):
        ending = next((item for item in world.endings if item.id == ending_id), None)
        if ending is None:
            raise StoryRuntimeError("invalid_story_content", "故事结局不存在。")
        return ending

    @staticmethod
    def _stage_for(character: Character, affinity: float):
        eligible = [
            stage
            for stage in character.relationship_rules.stages
            if affinity >= stage.minimum_affinity
        ]
        return eligible[-1]

    @staticmethod
    def _choice_available(choice: StoryChoice, flags: set[str]) -> bool:
        return set(choice.required_flags).issubset(flags) and not set(choice.blocked_flags) & flags
