"""
MySQL TavernStore 实现

使用 SQLAlchemy + MySQL 实现与 JSON TavernStore 相同的接口。
"""

from __future__ import annotations

import json
import shutil
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from fablemap_api.core.tavern import (
    Tavern,
    TavernCharacter,
    TavernSpriteSet,
    WorldInfoEntry,
    LLMConfig,
    VoiceConfig,
    VisitorState,
    ChatMessage,
)
from fablemap_api.core.memory import MemoryAtom

from .database import Database
from .models import (
    TavernModel,
    CharacterModel,
    WorldInfoModel,
    VisitorModel,
    ChatMessageModel,
    MemoryAtomModel,
    GameplaySessionModel,
    LLMConfigModel,
)


def _utc_now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00").replace("+00:00", ""))
        except ValueError:
            pass
    return None


class MySQLTavernStore:
    """
    MySQL 版本的 TavernStore

    实现与 core/tavern.py 中 JSON TavernStore 相同的接口。
    """

    def __init__(self, database: Database):
        self.db = database
        self._output_root = Path(".fablemap-api/mysql_chat_history")

    # ── 辅助方法 ────────────────────────────────

    def _session(self) -> Session:
        return self.db.get_session()

    def _to_tavern(self, model: TavernModel) -> Tavern:
        """将 TavernModel 转换为领域对象 Tavern"""
        characters = [self._to_character(c) for c in model.characters]
        world_info = [self._to_world_info(w) for w in model.world_info_entries]
        llm_config = self._to_llm_config(model.llm_config) if model.llm_config else LLMConfig()
        voice_config = self._to_voice_config(model.voice_config) if model.voice_config else VoiceConfig()

        return Tavern(
            id=model.id,
            name=model.name,
            description=model.description or "",
            lat=model.lat,
            lon=model.lon,
            address=model.address or "",
            owner_id=model.owner_id,
            created_at=model.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.created_at else "",
            access=model.access or "public",
            password_hash=model.password_hash or "",
            status=model.status or "closed",
            roleplay_mode=model.roleplay_mode or "ai_only",
            characters=characters,
            character_claims=deepcopy(model.character_claims) if model.character_claims else [],
            world_info=world_info,
            groups=deepcopy(model.groups) if model.groups else [],
            bookmarks=deepcopy(model.bookmarks) if model.bookmarks else [],
            chat_templates=deepcopy(model.chat_templates) if model.chat_templates else [],
            gameplay_definitions=deepcopy(model.gameplay_definitions) if model.gameplay_definitions else [],
            output_rules=deepcopy(model.output_rules) if model.output_rules else [],
            prompt_blocks=deepcopy(model.prompt_blocks) if model.prompt_blocks else [],
            runtime_presets=deepcopy(model.runtime_presets) if model.runtime_presets else [],
            active_preset_id=model.active_preset_id or "",
            memory_policy=deepcopy(model.memory_policy) if model.memory_policy else {},
            scene_prompt=model.scene_prompt or "",
            llm_config=llm_config,
            voice_config=voice_config,
            visit_count=model.visit_count or 0,
            group_chat_enabled=bool(model.group_chat_enabled),
            group_chat_config=deepcopy(model.group_chat_config) if model.group_chat_config else {},
        )

    def _to_character(self, model: CharacterModel) -> TavernCharacter:
        """将 CharacterModel 转换为 TavernCharacter"""
        sprites = TavernSpriteSet(model.sprites) if model.sprites else None
        return TavernCharacter(
            id=model.id,
            tavern_id=model.tavern_id,
            name=model.name,
            description=model.description or "",
            personality=model.personality or "",
            scenario=model.scenario or "",
            system_prompt=model.system_prompt or "",
            first_mes=model.first_mes or "",
            mes_example=model.mes_example or "",
            alternate_greetings=list(model.alternate_greetings) if model.alternate_greetings else [],
            tags=list(model.tags) if model.tags else [],
            sprites=sprites,
            avatar=model.avatar or "",
            appearance=deepcopy(model.appearance) if model.appearance else {},
            talkativeness=model.talkativeness or 0.5,
        )

    def _to_world_info(self, model: WorldInfoModel) -> WorldInfoEntry:
        """将 WorldInfoModel 转换为 WorldInfoEntry"""
        return WorldInfoEntry(
            id=model.id,
            tavern_id=model.tavern_id,
            keys=list(model.keys) if model.keys else [],
            content=model.content or "",
            keys_secondary=list(model.keys_secondary) if model.keys_secondary else [],
            selective=bool(model.selective),
            constant=bool(model.constant),
            depth=model.depth or 4,
            order=model.order or 100,
            probability=model.probability or 100,
            disable=bool(model.disable),
        )

    def _to_llm_config(self, model: LLMConfigModel, *, include_api_key: bool = False) -> LLMConfig:
        """将 LLMConfigModel 转换为 LLMConfig"""
        return LLMConfig(
            backend=model.backend or "openai",
            model=model.model or "gpt-4o-mini",
            api_key=(model.api_key or "") if include_api_key else "",
            base_url=model.base_url or "",
            temperature=model.temperature or 0.8,
            max_tokens=model.max_tokens or 512,
            top_p=model.top_p or 1.0,
            token_used=model.token_used or 0,
        )

    @staticmethod
    def _token_usage_from_voice_config(tavern_model: TavernModel | None) -> int:
        if not tavern_model or not isinstance(tavern_model.voice_config, dict):
            return 0
        llm_config_data = tavern_model.voice_config.get("llm_config", {})
        if not isinstance(llm_config_data, dict):
            return 0
        try:
            return int(llm_config_data.get("token_used", 0) or 0)
        except (TypeError, ValueError):
            return 0

    def _to_voice_config(self, data: dict[str, Any]) -> VoiceConfig:
        """将字典转换为 VoiceConfig"""
        return VoiceConfig(
            enabled=data.get("enabled", False),
            tts_provider=data.get("tts_provider", "elevenlabs"),
            tts_voice=data.get("tts_voice", ""),
            tts_model=data.get("tts_model", ""),
            tts_speed=data.get("tts_speed", 1.0),
            tts_language=data.get("tts_language", ""),
            stt_provider=data.get("stt_provider", "browser"),
            stt_model=data.get("stt_model", "base"),
            auto_play=data.get("auto_play", False),
        )

    def _to_visitor_state(self, model: VisitorModel) -> VisitorState:
        """将 VisitorModel 转换为 VisitorState"""
        return VisitorState(
            visitor_id=model.visitor_id,
            tavern_id=model.tavern_id,
            visit_count=model.visit_count or 0,
            first_visit=model.first_visit.strftime("%Y-%m-%dT%H:%M:%SZ") if model.first_visit else None,
            last_visit=model.last_visit.strftime("%Y-%m-%dT%H:%M:%SZ") if model.last_visit else None,
            relationship_strength=model.relationship_strength or 0.0,
            relationship_stage=model.relationship_stage or "stranger",
        )

    def _to_chat_message(self, model: ChatMessageModel) -> ChatMessage:
        """将 ChatMessageModel 转换为 ChatMessage"""
        return ChatMessage(
            id=model.id,
            tavern_id=model.tavern_id,
            character_id=model.character_id,
            visitor_id=model.visitor_id,
            visitor_name=model.visitor_name or "",
            role=model.role,
            content=model.content,
            timestamp=model.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if model.timestamp else "",
            token_count=model.token_count or 0,
        )

    def _to_memory_atom(self, model: MemoryAtomModel) -> MemoryAtom:
        """将 MemoryAtomModel 转换为 MemoryAtom"""
        return MemoryAtom(
            id=model.id,
            tavern_id=model.tavern_id,
            scope=model.scope,
            dimension=model.dimension,
            horizon=model.horizon,
            subject=model.subject or "",
            content=model.content,
            importance=model.importance or 0.5,
            confidence=model.confidence or 0.5,
            source_message_ids=list(model.source_message_ids) if model.source_message_ids else [],
            created_at=model.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.created_at else "",
            updated_at=model.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.updated_at else "",
            pinned=bool(model.pinned),
            visibility=model.visibility or "tavern",
            visitor_id=model.visitor_id or "",
            character_id=model.character_id or "",
            place_id=model.place_id or "",
            created_by=model.created_by or "",
            metadata=deepcopy(model.metadata_) if model.metadata_ else {},
        )

    # ── Tavern CRUD ──────────────────────────────

    def list_taverns(self, include_private: bool = False, owner_id: str = "") -> list[Tavern]:
        """列出所有酒馆"""
        with self.db.session_scope() as session:
            query = session.query(TavernModel)
            if not include_private:
                query = query.filter(TavernModel.access == "public")
            elif owner_id:
                query = query.filter(
                    (TavernModel.access == "public") | (TavernModel.owner_id == owner_id)
                )

            models = query.all()
            taverns = [self._to_tavern(m) for m in models]

            # 填充 token_used
            for tavern in taverns:
                token_usage = self.get_token_usage(tavern.id)
                if token_usage:
                    tavern.llm_config.token_used = token_usage

            return taverns

    def get_tavern(self, tavern_id: str) -> Tavern | None:
        """获取酒馆"""
        with self.db.session_scope() as session:
            model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if not model:
                return None

            tavern = self._to_tavern(model)
            token_usage = self.get_token_usage(tavern_id)
            if token_usage:
                tavern.llm_config.token_used = token_usage
            return tavern

    def create_tavern(self, tavern: Tavern) -> Tavern:
        """创建酒馆"""
        with self.db.session_scope() as session:
            # 检查是否已存在
            existing = session.query(TavernModel).filter(TavernModel.id == tavern.id).first()
            if existing:
                from fastapi import HTTPException
                raise HTTPException(status_code=409, detail="酒馆 ID 已存在")

            model = TavernModel(
                id=tavern.id,
                name=tavern.name,
                description=tavern.description,
                lat=tavern.lat,
                lon=tavern.lon,
                address=tavern.address,
                owner_id=tavern.owner_id,
                created_at=_parse_datetime(tavern.created_at) or datetime.utcnow(),
                access=tavern.access,
                password_hash=tavern.password_hash,
                status=tavern.status,
                roleplay_mode=tavern.roleplay_mode,
                scene_prompt=tavern.scene_prompt,
                visit_count=tavern.visit_count,
                group_chat_enabled=tavern.group_chat_enabled,
                group_chat_config=tavern.group_chat_config,
                groups=tavern.groups,
                bookmarks=tavern.bookmarks,
                chat_templates=tavern.chat_templates,
                character_claims=tavern.character_claims,
                gameplay_definitions=tavern.gameplay_definitions,
                output_rules=tavern.output_rules,
                prompt_blocks=tavern.prompt_blocks,
                runtime_presets=tavern.runtime_presets,
                active_preset_id=tavern.active_preset_id,
                memory_policy=tavern.memory_policy,
                voice_config=tavern.voice_config.to_dict() if hasattr(tavern.voice_config, "to_dict") else {},
            )
            session.add(model)
            session.flush()

            # 保存角色
            for char in tavern.characters:
                char_model = CharacterModel(
                    id=char.id,
                    tavern_id=tavern.id,
                    name=char.name,
                    description=char.description,
                    personality=char.personality,
                    scenario=char.scenario,
                    system_prompt=char.system_prompt,
                    first_mes=char.first_mes,
                    mes_example=char.mes_example,
                    alternate_greetings=char.alternate_greetings,
                    tags=char.tags,
                    sprites=char.sprites.to_dict() if char.sprites else {},
                    avatar=char.avatar,
                    appearance=char.appearance,
                    talkativeness=char.talkativeness,
                )
                session.add(char_model)

            # 保存世界知识
            for wi in tavern.world_info:
                wi_model = WorldInfoModel(
                    id=wi.id,
                    tavern_id=tavern.id,
                    keys=wi.keys,
                    content=wi.content,
                    keys_secondary=wi.keys_secondary,
                    selective=wi.selective,
                    constant=wi.constant,
                    depth=wi.depth,
                    order=wi.order,
                    probability=wi.probability,
                    disable=wi.disable,
                )
                session.add(wi_model)

            return tavern

    def update_tavern(self, tavern: Tavern) -> Tavern:
        """更新酒馆"""
        with self.db.session_scope() as session:
            model = session.query(TavernModel).filter(TavernModel.id == tavern.id).first()
            if not model:
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="酒馆不存在")

            # 更新主表字段
            model.name = tavern.name
            model.description = tavern.description
            model.lat = tavern.lat
            model.lon = tavern.lon
            model.address = tavern.address
            model.owner_id = tavern.owner_id
            model.access = tavern.access
            model.password_hash = tavern.password_hash
            model.status = tavern.status
            model.roleplay_mode = tavern.roleplay_mode
            model.scene_prompt = tavern.scene_prompt
            model.visit_count = tavern.visit_count
            model.group_chat_enabled = tavern.group_chat_enabled
            model.group_chat_config = tavern.group_chat_config
            model.groups = tavern.groups
            model.bookmarks = tavern.bookmarks
            model.chat_templates = tavern.chat_templates
            model.character_claims = tavern.character_claims
            model.gameplay_definitions = tavern.gameplay_definitions
            model.output_rules = tavern.output_rules
            model.prompt_blocks = tavern.prompt_blocks
            model.runtime_presets = tavern.runtime_presets
            model.active_preset_id = tavern.active_preset_id
            model.memory_policy = tavern.memory_policy
            model.voice_config = tavern.voice_config.to_dict() if hasattr(tavern.voice_config, "to_dict") else {}

            # 删除旧角色，重新插入
            session.query(CharacterModel).filter(CharacterModel.tavern_id == tavern.id).delete()
            for char in tavern.characters:
                char_model = CharacterModel(
                    id=char.id,
                    tavern_id=tavern.id,
                    name=char.name,
                    description=char.description,
                    personality=char.personality,
                    scenario=char.scenario,
                    system_prompt=char.system_prompt,
                    first_mes=char.first_mes,
                    mes_example=char.mes_example,
                    alternate_greetings=char.alternate_greetings,
                    tags=char.tags,
                    sprites=char.sprites.to_dict() if char.sprites else {},
                    avatar=char.avatar,
                    appearance=char.appearance,
                    talkativeness=char.talkativeness,
                )
                session.add(char_model)

            # 删除旧世界知识，重新插入
            session.query(WorldInfoModel).filter(WorldInfoModel.tavern_id == tavern.id).delete()
            for wi in tavern.world_info:
                wi_model = WorldInfoModel(
                    id=wi.id,
                    tavern_id=tavern.id,
                    keys=wi.keys,
                    content=wi.content,
                    keys_secondary=wi.keys_secondary,
                    selective=wi.selective,
                    constant=wi.constant,
                    depth=wi.depth,
                    order=wi.order,
                    probability=wi.probability,
                    disable=wi.disable,
                )
                session.add(wi_model)

            return tavern

    def delete_tavern(self, tavern_id: str) -> None:
        """删除酒馆"""
        with self.db.session_scope() as session:
            model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if not model:
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="酒馆不存在")

            session.delete(model)

        # 删除聊天历史文件
        chat_dir = self._output_root / tavern_id
        if chat_dir.exists():
            shutil.rmtree(chat_dir)

    # ── LLM Config ───────────────────────────────

    def save_llm_config(self, tavern_id: str, config: LLMConfig) -> None:
        """保存 LLM 配置"""
        with self.db.session_scope() as session:
            model = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            if model:
                model.backend = config.backend
                model.model = config.model
                model.api_key = config.api_key
                model.base_url = config.base_url
                model.temperature = config.temperature
                model.max_tokens = config.max_tokens
                model.top_p = config.top_p
                model.token_used = config.token_used
            else:
                model = LLMConfigModel(
                    tavern_id=tavern_id,
                    backend=config.backend,
                    model=config.model,
                    api_key=config.api_key,
                    base_url=config.base_url,
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    top_p=config.top_p,
                    token_used=config.token_used,
                )
                session.add(model)

    def get_llm_config(self, tavern_id: str) -> LLMConfig | None:
        """获取 LLM 配置"""
        with self.db.session_scope() as session:
            model = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            if model:
                return self._to_llm_config(model)

            # 回退：从 tavern 表读取（公益酒馆配置）
            tavern_model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if tavern_model and tavern_model.voice_config:
                # voice_config 里没有 llm_config，回退到默认
                pass
            return None

    # ── Voice Config ─────────────────────────────

    def get_llm_config_private(self, tavern_id: str) -> LLMConfig | None:
        """Get internal LLM config including api_key."""
        with self.db.session_scope() as session:
            model = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            if model:
                return self._to_llm_config(model, include_api_key=True)
            return None

    def save_voice_config(self, tavern_id: str, config: VoiceConfig) -> None:
        """保存语音配置"""
        with self.db.session_scope() as session:
            model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if model:
                model.voice_config = config.to_dict()

    def get_voice_config(self, tavern_id: str) -> VoiceConfig | None:
        """获取语音配置"""
        with self.db.session_scope() as session:
            model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if model and model.voice_config:
                return self._to_voice_config(model.voice_config)
            return None

    # ── Visitors ────────────────────────────────

    def get_visitor_state(self, tavern_id: str, visitor_id: str) -> VisitorState | None:
        """获取访客状态"""
        with self.db.session_scope() as session:
            model = session.query(VisitorModel).filter(
                VisitorModel.tavern_id == tavern_id,
                VisitorModel.visitor_id == visitor_id,
            ).first()
            if model:
                return self._to_visitor_state(model)
            return None

    def list_visitor_states(self, tavern_id: str) -> list[VisitorState]:
        """列出所有访客状态"""
        with self.db.session_scope() as session:
            models = session.query(VisitorModel).filter(
                VisitorModel.tavern_id == tavern_id
            ).order_by(VisitorModel.last_visit.desc()).all()
            return [self._to_visitor_state(m) for m in models]

    def update_visitor_state(self, tavern_id: str, state: VisitorState) -> None:
        """更新访客状态"""
        with self.db.session_scope() as session:
            model = session.query(VisitorModel).filter(
                VisitorModel.tavern_id == tavern_id,
                VisitorModel.visitor_id == state.visitor_id,
            ).first()

            if model:
                model.visit_count = state.visit_count
                model.first_visit = _parse_datetime(state.first_visit)
                model.last_visit = _parse_datetime(state.last_visit)
                model.relationship_strength = state.relationship_strength
                model.relationship_stage = state.relationship_stage
            else:
                model = VisitorModel(
                    id=f"visitor_{uuid.uuid4().hex[:12]}",
                    tavern_id=tavern_id,
                    visitor_id=state.visitor_id,
                    visit_count=state.visit_count,
                    first_visit=_parse_datetime(state.first_visit),
                    last_visit=_parse_datetime(state.last_visit),
                    relationship_strength=state.relationship_strength,
                    relationship_stage=state.relationship_stage,
                )
                session.add(model)

    # ── Memory Atoms ─────────────────────────────

    def list_memory_atoms(self, tavern_id: str) -> list[MemoryAtom]:
        """列出所有记忆原子"""
        with self.db.session_scope() as session:
            models = session.query(MemoryAtomModel).filter(
                MemoryAtomModel.tavern_id == tavern_id
            ).order_by(
                MemoryAtomModel.pinned.desc(),
                MemoryAtomModel.updated_at.desc(),
            ).all()
            return [self._to_memory_atom(m) for m in models]

    def get_memory_atom(self, tavern_id: str, memory_id: str) -> MemoryAtom | None:
        """获取记忆原子"""
        with self.db.session_scope() as session:
            model = session.query(MemoryAtomModel).filter(
                MemoryAtomModel.tavern_id == tavern_id,
                MemoryAtomModel.id == memory_id,
            ).first()
            if model:
                return self._to_memory_atom(model)
            return None

    def save_memory_atom(self, tavern_id: str, atom: MemoryAtom) -> MemoryAtom:
        """保存记忆原子"""
        with self.db.session_scope() as session:
            model = session.query(MemoryAtomModel).filter(
                MemoryAtomModel.tavern_id == tavern_id,
                MemoryAtomModel.id == atom.id,
            ).first()

            now = datetime.utcnow()
            if model:
                model.scope = atom.scope
                model.dimension = atom.dimension
                model.horizon = atom.horizon
                model.subject = atom.subject
                model.content = atom.content
                model.importance = atom.importance
                model.confidence = atom.confidence
                model.source_message_ids = atom.source_message_ids
                model.updated_at = now
                model.pinned = atom.pinned
                model.visibility = atom.visibility
                model.visitor_id = atom.visitor_id
                model.character_id = atom.character_id
                model.place_id = atom.place_id
                model.created_by = atom.created_by
                model.metadata_ = atom.metadata
            else:
                model = MemoryAtomModel(
                    id=atom.id,
                    tavern_id=tavern_id,
                    scope=atom.scope,
                    dimension=atom.dimension,
                    horizon=atom.horizon,
                    subject=atom.subject,
                    content=atom.content,
                    importance=atom.importance,
                    confidence=atom.confidence,
                    source_message_ids=atom.source_message_ids,
                    created_at=_parse_datetime(atom.created_at) or now,
                    updated_at=now,
                    pinned=atom.pinned,
                    visibility=atom.visibility,
                    visitor_id=atom.visitor_id,
                    character_id=atom.character_id,
                    place_id=atom.place_id,
                    created_by=atom.created_by,
                    metadata_=atom.metadata,
                )
                session.add(model)

            return atom

    def delete_memory_atom(self, tavern_id: str, memory_id: str) -> bool:
        """删除记忆原子"""
        with self.db.session_scope() as session:
            result = session.query(MemoryAtomModel).filter(
                MemoryAtomModel.tavern_id == tavern_id,
                MemoryAtomModel.id == memory_id,
            ).delete()
            return result > 0

    # ── Gameplay Sessions ───────────────────────

    def list_gameplay_sessions(self, tavern_id: str) -> list[Any]:
        """列出玩法会话"""
        from fablemap_api.core.gameplay import GameplaySession

        with self.db.session_scope() as session:
            models = session.query(GameplaySessionModel).filter(
                GameplaySessionModel.tavern_id == tavern_id
            ).order_by(GameplaySessionModel.updated_at.desc()).all()

            sessions = []
            for model in models:
                session_obj = GameplaySession.from_dict({
                    "id": model.id,
                    "tavern_id": model.tavern_id,
                    "gameplay_id": model.gameplay_id,
                    "visitor_id": model.visitor_id,
                    "character_id": model.character_id,
                    "state": model.state,
                    "current_node_id": model.current_node_id,
                    "turn_count": model.turn_count,
                    "events": model.events or [],
                    "completion": model.completion,
                    "created_at": model.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.created_at else "",
                    "updated_at": model.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.updated_at else "",
                })
                sessions.append(session_obj)
            return sessions

    def get_gameplay_session(self, tavern_id: str, session_id: str) -> Any | None:
        """获取玩法会话"""
        from fablemap_api.core.gameplay import GameplaySession

        with self.db.session_scope() as session:
            model = session.query(GameplaySessionModel).filter(
                GameplaySessionModel.tavern_id == tavern_id,
                GameplaySessionModel.id == session_id,
            ).first()

            if model:
                return GameplaySession.from_dict({
                    "id": model.id,
                    "tavern_id": model.tavern_id,
                    "gameplay_id": model.gameplay_id,
                    "visitor_id": model.visitor_id,
                    "character_id": model.character_id,
                    "state": model.state,
                    "current_node_id": model.current_node_id,
                    "turn_count": model.turn_count,
                    "events": model.events or [],
                    "completion": model.completion,
                    "created_at": model.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.created_at else "",
                    "updated_at": model.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if model.updated_at else "",
                })
            return None

    def save_gameplay_session(self, tavern_id: str, session: Any) -> Any:
        """保存玩法会话"""
        with self.db.session_scope() as session_obj:
            model = session_obj.query(GameplaySessionModel).filter(
                GameplaySessionModel.tavern_id == tavern_id,
                GameplaySessionModel.id == session.id,
            ).first()

            now = datetime.utcnow()
            if model:
                model.gameplay_id = session.gameplay_id
                model.visitor_id = session.visitor_id
                model.character_id = session.character_id
                model.state = session.state
                model.current_node_id = session.current_node_id
                model.turn_count = session.turn_count
                model.events = session.events
                model.completion = session.completion
                model.updated_at = now
            else:
                model = GameplaySessionModel(
                    id=session.id,
                    tavern_id=tavern_id,
                    gameplay_id=session.gameplay_id,
                    visitor_id=session.visitor_id,
                    character_id=session.character_id,
                    state=session.state,
                    current_node_id=session.current_node_id,
                    turn_count=session.turn_count,
                    events=session.events,
                    completion=session.completion,
                    created_at=_parse_datetime(session.created_at) or now,
                    updated_at=now,
                )
                session_obj.add(model)

            return session

    # ── Chat History ────────────────────────────

    def get_chat_history(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> list[ChatMessage]:
        """获取聊天历史"""
        with self.db.session_scope() as session:
            query = session.query(ChatMessageModel).filter(
                ChatMessageModel.tavern_id == tavern_id,
                ChatMessageModel.visitor_id == visitor_id,
            )
            if character_id:
                query = query.filter(ChatMessageModel.character_id == character_id)

            models = query.order_by(ChatMessageModel.timestamp.desc()).limit(limit).all()
            messages = [self._to_chat_message(m) for m in models]
            messages.reverse()
            return messages

    def list_chat_sessions(
        self,
        tavern_id: str,
        visitor_id: str = "",
        character_id: str = "",
        limit: int | None = 50,
    ) -> list[dict[str, Any]]:
        """列出聊天会话"""
        with self.db.session_scope() as session:
            query = session.query(ChatMessageModel).filter(
                ChatMessageModel.tavern_id == tavern_id
            )
            if visitor_id:
                query = query.filter(ChatMessageModel.visitor_id == visitor_id)
            if character_id:
                query = query.filter(ChatMessageModel.character_id == character_id)

            models = query.order_by(ChatMessageModel.timestamp.desc()).all()

            # 按 visitor_id + character_id 分组
            sessions_map: dict[tuple, dict] = {}
            for model in models:
                key = (model.visitor_id, model.character_id)
                if key not in sessions_map:
                    sessions_map[key] = {
                        "tavern_id": tavern_id,
                        "visitor_id": model.visitor_id,
                        "visitor_name": model.visitor_name or "",
                        "character_id": model.character_id,
                        "message_count": 0,
                        "messages": [],
                        "last_message": None,
                        "updated_at": model.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if model.timestamp else "",
                    }
                sessions_map[key]["message_count"] += 1
                sessions_map[key]["messages"].append(self._to_chat_message(model))
                sessions_map[key]["last_message"] = self._to_chat_message(model)

            sessions = list(sessions_map.values())
            if limit:
                sessions = sessions[:limit]
            return sessions

    def add_chat_message(self, msg: ChatMessage) -> ChatMessage:
        """添加聊天消息"""
        with self.db.session_scope() as session:
            model = ChatMessageModel(
                id=msg.id,
                tavern_id=msg.tavern_id,
                character_id=msg.character_id,
                visitor_id=msg.visitor_id,
                visitor_name=msg.visitor_name,
                role=msg.role,
                content=msg.content,
                timestamp=_parse_datetime(msg.timestamp) or datetime.utcnow(),
                token_count=msg.token_count,
            )
            session.add(model)
            return msg

    def delete_chat_history(self, tavern_id: str, visitor_id: str = "", character_id: str = "") -> int:
        """删除聊天历史"""
        with self.db.session_scope() as session:
            query = session.query(ChatMessageModel).filter(
                ChatMessageModel.tavern_id == tavern_id
            )
            if visitor_id:
                query = query.filter(ChatMessageModel.visitor_id == visitor_id)
            if character_id:
                query = query.filter(ChatMessageModel.character_id == character_id)

            count = query.delete()
            return count

    def replace_chat_history(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str,
        messages: list[ChatMessage],
    ) -> int:
        """替换聊天历史"""
        with self.db.session_scope() as session:
            # 删除旧消息
            session.query(ChatMessageModel).filter(
                ChatMessageModel.tavern_id == tavern_id,
                ChatMessageModel.visitor_id == visitor_id,
                ChatMessageModel.character_id == character_id,
            ).delete()

            # 插入新消息
            for msg in messages:
                model = ChatMessageModel(
                    id=msg.id,
                    tavern_id=tavern_id,
                    character_id=character_id,
                    visitor_id=visitor_id,
                    visitor_name=msg.visitor_name,
                    role=msg.role,
                    content=msg.content,
                    timestamp=_parse_datetime(msg.timestamp) or datetime.utcnow(),
                    token_count=msg.token_count,
                )
                session.add(model)

            return len(messages)

    # ── Token Usage ─────────────────────────────

    def add_token_usage(self, tavern_id: str, tokens: int) -> None:
        """添加 token 使用量"""
        try:
            token_delta = int(tokens)
        except (TypeError, ValueError):
            return
        if token_delta <= 0:
            return

        with self.db.session_scope() as session:
            model = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            tavern_model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if model:
                model.token_used = (model.token_used or 0) + token_delta
            elif tavern_model:
                model = LLMConfigModel(
                    tavern_id=tavern_id,
                    token_used=token_delta,
                )
                session.add(model)

            # 同时更新 tavern 表
            if tavern_model:
                voice_config = deepcopy(tavern_model.voice_config) if isinstance(tavern_model.voice_config, dict) else {}
                if not isinstance(voice_config, dict):
                    voice_config = {}
                llm_config_data = voice_config.get("llm_config", {})
                if not isinstance(llm_config_data, dict):
                    llm_config_data = {}
                try:
                    current_usage = int(llm_config_data.get("token_used", 0) or 0)
                except (TypeError, ValueError):
                    current_usage = 0
                llm_config_data["token_used"] = current_usage + token_delta
                voice_config["llm_config"] = llm_config_data
                tavern_model.voice_config = voice_config

    def get_token_usage(self, tavern_id: str) -> int:
        """获取 token 使用量"""
        with self.db.session_scope() as session:
            model = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            config_usage = int(model.token_used or 0) if model else 0
            tavern_model = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            return max(config_usage, self._token_usage_from_voice_config(tavern_model))


def create_mysql_tables(database: Database) -> None:
    """创建所有 MySQL 表"""
    database.create_tables()
