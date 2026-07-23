"""Application service for Annie's reviewed StoryWorld vertical slice."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from sqlalchemy import func, select

from ..core.llm_clients import LLMConfig, LLMError, complete
from ..domain.story_world import (
    Character,
    RelationshipStage,
    StoryChoice,
    StoryNode,
    StoryWorld,
    StoryWorldRegistry,
)
from ..infrastructure.database import Database
from ..infrastructure.story_state_models import (
    CharacterRelationshipModel,
    PlayerStoryStateModel,
    StoryEventModel,
    StoryRunModel,
)


class StoryRuntimeError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


class StoryDialogueResponder(Protocol):
    def reply(
        self,
        *,
        story_world: StoryWorld,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        events: list[dict[str, object]],
        player_message: str,
    ) -> str: ...


class SystemStoryDialogueResponder:
    """Use the deployment-level public-welfare LLM for bounded character dialogue."""

    def __init__(self, config_path: Path | None = None) -> None:
        self.config_path = config_path or (
            Path(__file__).resolve().parents[3] / "config" / "system_public_welfare_llm.json"
        )

    def reply(
        self,
        *,
        story_world: StoryWorld,
        character: Character,
        relationship_stage: RelationshipStage,
        current_node: StoryNode,
        events: list[dict[str, object]],
        player_message: str,
    ) -> str:
        config = self._load_config()
        facts = "\n".join(
            f"- [{entry.category.value}] {entry.statement}"
            for entry in story_world.canon_entries
        )
        system_message = (
            f"你扮演历史剧情中的原创儿童角色{character.name}。"
            f"\n角色动机：{character.motive}"
            f"\n说话方式：{character.voice}"
            f"\n当前处境：{character.current_situation}"
            f"\n玩家固定身份：{story_world.player_role.name}；{story_world.player_role.background}"
            f"\n当前关系态度：{relationship_stage.attitude}"
            f"\n当前节点：{current_node.narration}"
            f"\n审核边界：\n{facts}"
            "\n只回复角色当下可观察的短对白或动作，不替玩家行动。"
            "\n不得改写节点、选择、关系、结局或固定史实，不声称知道现代医学结论。"
            "\n这是儿童角色与成人玩家的非恋爱历史互动；禁止暧昧、依附诱导、性化、血腥猎奇。"
        )
        context = [{"role": "system", "content": system_message}]
        for event in events[-8:]:
            role = "assistant" if event.get("role") == "character" else "user"
            if event.get("role") in {"character", "player"}:
                context.append({"role": role, "content": str(event.get("content") or "")})
        context.append({"role": "user", "content": player_message})
        try:
            response = complete(config, context)
        except LLMError as exc:
            raise StoryRuntimeError("dialogue_unavailable", "安妮暂时没有回应，请稍后再试。") from exc
        content = str(getattr(response, "content", "") or "").strip()
        if not content:
            raise StoryRuntimeError("dialogue_unavailable", "安妮暂时没有回应，请稍后再试。")
        return content[:1200]

    def _load_config(self) -> LLMConfig:
        try:
            payload = json.loads(self.config_path.read_text(encoding="utf-8"))
            raw = payload["llm_config"]
        except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
            raise StoryRuntimeError("dialogue_unavailable", "故事对话配置暂不可用。") from exc
        api_key = str(raw.get("api_key") or "").strip()
        api_key_env = str(raw.get("api_key_env") or "").strip()
        if not api_key and api_key_env:
            api_key = os.environ.get(api_key_env, "").strip()
        if not api_key:
            raise StoryRuntimeError("dialogue_unavailable", "安妮暂时没有回应，请稍后再试。")
        return LLMConfig(
            backend=str(raw.get("backend") or "custom"),
            model=str(raw.get("model") or ""),
            api_key=api_key,
            base_url=str(raw.get("base_url") or ""),
            temperature=float(raw.get("temperature", 0.8)),
            max_tokens=int(raw.get("max_tokens", 1024)),
            top_p=float(raw.get("top_p", 0.9)),
        )


class StoryWorldApplicationService:
    def __init__(
        self,
        database: Database,
        registry: StoryWorldRegistry,
        responder: StoryDialogueResponder,
    ) -> None:
        self.database = database
        self.registry = registry
        self.responder = responder

    def detail(self, story_world_id: str, character_id: str) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = self._character(world, character_id)
        stage = self._stage_for(character, character.relationship_rules.initial_affinity)
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
                "current_situation": character.current_situation,
                "opening_preview": character.opening_line,
                "relationship_stage": {
                    "id": stage.id,
                    "label": stage.label,
                    "attitude": stage.attitude,
                },
            },
            "player_role": {
                "id": world.player_role.id,
                "name": world.player_role.name,
                "gender": world.player_role.gender,
                "background": world.player_role.background,
                "entry_reason": world.player_role.entry_reason,
                "character_visible_information": list(
                    world.player_role.character_visible_information
                ),
            },
        }

    def current(self, player_id: str, story_world_id: str) -> dict[str, object] | None:
        world = self._published_world(story_world_id)
        with self.database.session_scope() as session:
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            if state is None:
                return None
            run = None
            if state.active_story_run_id:
                run = session.get(StoryRunModel, state.active_story_run_id)
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
            return self._run_projection(session, world, run, state) if run else None

    def start(self, player_id: str, story_world_id: str) -> dict[str, object]:
        world = self._published_world(story_world_id)
        with self.database.session_scope() as session:
            state = self._state_for_update(session, player_id, world)
            if state.active_story_run_id:
                active = session.get(StoryRunModel, state.active_story_run_id)
                if active and active.status == "active":
                    return self._run_projection(session, world, active, state)
            run = self._create_run(session, state, world)
            session.flush()
            return self._run_projection(session, world, run, state)

    def restart(self, player_id: str, story_world_id: str) -> dict[str, object]:
        world = self._published_world(story_world_id)
        with self.database.session_scope() as session:
            state = self._state_for_update(session, player_id, world)
            if state.active_story_run_id:
                active = session.get(StoryRunModel, state.active_story_run_id)
                if active and active.status == "active":
                    raise StoryRuntimeError("active_run_exists", "当前故事尚未结束。")
            run = self._create_run(session, state, world)
            session.flush()
            return self._run_projection(session, world, run, state)

    def message(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        player_message: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        character = world.characters[0]
        with self.database.session_scope() as session:
            run = self._owned_active_run(session, player_id, world.id, run_id)
            relationship = session.get(
                CharacterRelationshipModel,
                (run.id, character.id),
            )
            if relationship is None:
                raise StoryRuntimeError("invalid_runtime_state", "角色关系状态不存在。")
            events = self._events(session, run.id)
            node = self._node(world, run.current_node_id)
            stage = self._stage_for(character, relationship.affinity)
        reply = self.responder.reply(
            story_world=world,
            character=character,
            relationship_stage=stage,
            current_node=node,
            events=events,
            player_message=player_message,
        )
        with self.database.session_scope() as session:
            run = self._owned_active_run(session, player_id, world.id, run_id)
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            if state is None:
                raise StoryRuntimeError("invalid_runtime_state", "玩家故事状态不存在。")
            self._append_event(
                session,
                run.id,
                event_type="message",
                role="player",
                content=player_message,
                source_kind="free_input",
            )
            self._append_event(
                session,
                run.id,
                event_type="message",
                role="character",
                character_id=character.id,
                content=reply,
                source_kind="free_input",
            )
            session.flush()
            return self._run_projection(session, world, run, state)

    def choose(
        self,
        player_id: str,
        story_world_id: str,
        run_id: str,
        choice_id: str,
    ) -> dict[str, object]:
        world = self._published_world(story_world_id)
        with self.database.session_scope() as session:
            run = self._owned_run(session, player_id, world.id, run_id)
            state = session.get(PlayerStoryStateModel, (player_id, world.id))
            if state is None:
                raise StoryRuntimeError("invalid_runtime_state", "玩家故事状态不存在。")
            prior = session.scalar(
                select(StoryEventModel).where(
                    StoryEventModel.story_run_id == run.id,
                    StoryEventModel.source_kind == "reviewed_choice",
                    StoryEventModel.source_id == choice_id,
                )
            )
            if prior is not None:
                return self._run_projection(session, world, run, state)
            if run.status != "active":
                raise StoryRuntimeError("run_completed", "这个故事轮次已经结束。")
            node = self._node(world, run.current_node_id)
            choice = next((item for item in node.choices if item.id == choice_id), None)
            if choice is None or not self._choice_available(choice, set(run.story_flags or [])):
                raise StoryRuntimeError("choice_unavailable", "这个选择当前不可用。")
            self._append_event(
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
                character = self._character(world, effect.character_id)
                relationship.affinity = max(
                    character.relationship_rules.minimum_affinity,
                    min(
                        character.relationship_rules.maximum_affinity,
                        relationship.affinity + effect.affinity_delta,
                    ),
                )
                relationship.stage = self._stage_for(character, relationship.affinity).id
                relationship.last_change_reason = effect.reason
                relationship.flags = list(dict.fromkeys([*(relationship.flags or []), *effect.set_flags]))
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
            return self._run_projection(session, world, run, state)

    def _create_run(self, session, state: PlayerStoryStateModel, world: StoryWorld):
        chapter = self._chapter(world, world.entry_chapter_id)
        node = self._node(world, chapter.entry_node_id)
        run = StoryRunModel(
            id=str(uuid4()),
            player_id=state.player_id,
            story_world_id=world.id,
            content_version=world.content_version,
            status="active",
            current_chapter_id=chapter.id,
            current_node_id=node.id,
            key_choices=[],
            story_flags=[],
            private_memories=[],
        )
        session.add(run)
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
            character_id=world.characters[0].id,
            content=world.characters[0].opening_line,
            source_kind="authored",
            source_id="opening_line",
        )
        return run

    def _state_for_update(self, session, player_id: str, world: StoryWorld):
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
                player_role_id=world.player_role.id,
                active_story_run_id=None,
                visit_count=0,
                completed_run_summaries=[],
            )
            session.add(state)
            session.flush()
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

    def _run_projection(self, session, world, run, state):
        node = self._node(world, run.current_node_id)
        character = world.characters[0]
        relationship = session.get(CharacterRelationshipModel, (run.id, character.id))
        stage = self._stage_for(character, relationship.affinity)
        ending = self._ending(world, run.ending_id) if run.ending_id else None
        return {
            "id": run.id,
            "status": run.status,
            "content_version": run.content_version,
            "current_node": {
                "id": node.id,
                "narration": node.narration,
                "choices": [
                    {"id": choice.id, "label": choice.label, "is_key": choice.is_key}
                    for choice in node.choices
                    if self._choice_available(choice, set(run.story_flags or []))
                ] if run.status == "active" else [],
            },
            "events": self._events(session, run.id),
            "relationship": {
                "stage": stage.id,
                "label": stage.label,
                "attitude": stage.attitude,
                "last_change_reason": relationship.last_change_reason,
            },
            "ending": (
                {"id": ending.id, "title": ending.title, "summary": run.ending_summary}
                if ending
                else None
            ),
            "completed_run_summaries": list(state.completed_run_summaries or []),
        }

    def _events(self, session, run_id: str) -> list[dict[str, object]]:
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
    ) -> None:
        sequence = session.scalar(
            select(func.coalesce(func.max(StoryEventModel.sequence), 0)).where(
                StoryEventModel.story_run_id == run_id
            )
        )
        session.add(
            StoryEventModel(
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
        )
        session.flush()

    def _published_world(self, story_world_id: str) -> StoryWorld:
        world = self.registry.get(story_world_id)
        if world is None or world not in self.registry.published():
            raise StoryRuntimeError("story_world_not_found", "没有找到这个故事世界。")
        return world

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
