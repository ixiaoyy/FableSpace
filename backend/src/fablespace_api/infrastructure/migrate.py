"""
数据迁移脚本：将旧 JSON/file runtime 数据定向迁移到 MySQL/SQLAlchemy 数据库

用法：
    python -m fablespace_api.infrastructure.migrate \
        --output-root .fablespace-api \
        --database-url "mysql+pymysql://user:pass@localhost:3306/fablespace"

或设置环境变量：
    export FABLESPACE_DATABASE_URL="mysql+pymysql://user:pass@localhost:3306/fablespace"
    python -m fablespace_api.infrastructure.migrate --output-root .fablespace-api
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

from fablespace_api.core.default_spaces import default_public_welfare_spaces
from fablespace_api.infrastructure.database import Database
from fablespace_api.infrastructure.models import (
    TavernModel,
    CharacterModel,
    WorldInfoModel,
    VisitorModel,
    ChatMessageModel,
    MemoryAtomModel,
    GameplaySessionModel,
    LLMConfigModel,
    OwnerConfigModel,
    VisitorNoteModel,
    HomeModel,
    HomeVisitModel,
    WritebackStateModel,
    StateCardModel,
)
from fablespace_api.infrastructure.mysql_space_store import create_mysql_tables
from fablespace_api.infrastructure.storage import redact_database_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def _parse_datetime(value: Any) -> Any:
    """解析 ISO 格式的日期时间字符串"""
    if not value:
        return None
    from datetime import datetime
    if isinstance(value, datetime):
        return value
    try:
        # 2026-04-20T00:00:00Z -> datetime
        value = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(value.replace("+00:00", ""))
    except (ValueError, AttributeError):
        return None


def _dt_or_now(value: Any) -> Any:
    from datetime import datetime
    return _parse_datetime(value) or datetime.utcnow()


def _load_json_file(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        logger.warning("跳过无效 JSON 文件 %s: %s", path, exc)
        return default


def _tavern_store_root(output_root: Path, json_root: Path | None = None) -> Path:
    return json_root or output_root / "taverns"


def _resolve_output_root(json_root: Path, output_root: Path | None) -> Path:
    if output_root is not None:
        return output_root
    if json_root.name == "taverns":
        return json_root.parent
    return json_root


def _state_card_payload(space_id: str, card_id: str, value: Any) -> dict[str, Any]:
    payload = dict(value) if isinstance(value, dict) else {}
    payload.setdefault("id", card_id)
    payload.setdefault("space_id", space_id)
    return payload


def _json_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _json_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _apply_fields(model: Any, fields: dict[str, Any]) -> None:
    for key, value in fields.items():
        setattr(model, key, value)


def load_json_taverns(json_root: Path) -> dict[str, dict[str, Any]]:
    """从 JSON 文件加载空间数据"""
    taverns_file = json_root / "taverns.json"
    if not taverns_file.exists():
        logger.error(f"JSON 文件不存在: {taverns_file}")
        return {}

    try:
        data = json.loads(taverns_file.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
        logger.error("JSON 数据格式错误，期望 dict")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析错误: {e}")
        return {}


def load_keyvault(json_root: Path) -> dict[str, dict[str, Any]]:
    """加载密钥库数据"""
    keyvault_file = json_root / "taverns_keyvault.json"
    if not keyvault_file.exists():
        return {}

    try:
        data = json.loads(keyvault_file.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
        return {}
    except json.JSONDecodeError:
        return {}


def migrate_taverns(db: Database, taverns_data: dict[str, dict[str, Any]]) -> int:
    """迁移/回填空间主数据与私有 runtime 桶。"""
    migrated = 0
    for raw_tavern_id, tavern_dict in taverns_data.items():
        if not isinstance(tavern_dict, dict):
            continue
        space_id = str(tavern_dict.get("id") or raw_tavern_id).strip()
        if not space_id:
            continue

        with db.session_scope() as session:
            tavern_fields = {
                "name": tavern_dict.get("name", "未命名空间"),
                "description": tavern_dict.get("description", ""),
                "lat": tavern_dict.get("lat", 0.0),
                "lon": tavern_dict.get("lon", 0.0),
                "address": tavern_dict.get("address", ""),
                "owner_id": tavern_dict.get("owner_id", "system_public_welfare"),
                "created_at": _dt_or_now(tavern_dict.get("created_at")),
                "access": tavern_dict.get("access", "public"),
                "password_hash": tavern_dict.get("password_hash", ""),
                "status": tavern_dict.get("status", "closed"),
                "roleplay_mode": tavern_dict.get("roleplay_mode", "ai_only"),
                "layout_style": tavern_dict.get("layout_style", "lobby"),
                "place_type": tavern_dict.get("place_type", "space"),
                "scene_prompt": tavern_dict.get("scene_prompt", ""),
                "visit_count": tavern_dict.get("visit_count", 0),
                "group_chat_enabled": tavern_dict.get("group_chat_enabled", False),
                "group_chat_config": _json_dict(tavern_dict.get("group_chat_config")),
                "groups": _json_list(tavern_dict.get("groups")),
                "bookmarks": _json_list(tavern_dict.get("bookmarks")),
                "chat_templates": _json_list(tavern_dict.get("chat_templates")),
                "character_claims": _json_list(tavern_dict.get("character_claims")),
                "gameplay_definitions": _json_list(tavern_dict.get("gameplay_definitions")),
                "output_rules": _json_list(tavern_dict.get("output_rules")),
                "prompt_blocks": _json_list(tavern_dict.get("prompt_blocks")),
                "runtime_presets": _json_list(tavern_dict.get("runtime_presets")),
                "skill_packs": _json_list(tavern_dict.get("skill_packs")),
                "active_preset_id": tavern_dict.get("active_preset_id", ""),
                "memory_policy": _json_dict(tavern_dict.get("memory_policy")),
                "voice_config": _json_dict(tavern_dict.get("voice_config")),
                "home_members": _json_list(tavern_dict.get("home_members")),
                "place_relationships": _json_list(tavern_dict.get("place_relationships")),
                "timezone": tavern_dict.get("timezone"),
                "operating_hours": _json_dict(tavern_dict.get("operating_hours")),
            }
            existing = session.query(TavernModel).filter(TavernModel.id == space_id).first()
            if existing:
                _apply_fields(existing, tavern_fields)
                logger.debug("回填已存在空间: %s", space_id)
            else:
                session.add(TavernModel(id=space_id, **tavern_fields))
                migrated += 1
                logger.info("迁移空间: %s (%s)", space_id, tavern_dict.get("name", "未命名"))

            inline_llm = tavern_dict.get("llm_config")
            if isinstance(inline_llm, dict) and str(inline_llm.get("backend") or "").lower() in {"rules", "rule_based", "public_welfare"}:
                existing_llm = session.query(LLMConfigModel).filter(LLMConfigModel.space_id == space_id).first()
                llm_fields = {
                    "backend": inline_llm.get("backend", "rules"),
                    "model": inline_llm.get("model", "rules"),
                    "api_key": inline_llm.get("api_key", ""),
                    "base_url": inline_llm.get("base_url", ""),
                    "temperature": inline_llm.get("temperature", 0.8),
                    "max_tokens": inline_llm.get("max_tokens", 512),
                    "top_p": inline_llm.get("top_p", 1.0),
                    "token_used": inline_llm.get("token_used", 0),
                }
                if not existing_llm:
                    session.add(LLMConfigModel(space_id=space_id, **llm_fields))

            for char_dict in _json_list(tavern_dict.get("characters")):
                if not isinstance(char_dict, dict):
                    continue
                char_id = str(char_dict.get("id") or f"char_{space_id}_{char_dict.get('name', 'unknown')}")
                char_fields = {
                    "name": char_dict.get("name", "未命名角色"),
                    "description": char_dict.get("description", ""),
                    "personality": char_dict.get("personality", ""),
                    "scenario": char_dict.get("scenario", ""),
                    "gender": char_dict.get("gender", "unspecified"),
                    "system_prompt": char_dict.get("system_prompt", ""),
                    "first_mes": char_dict.get("first_mes", ""),
                    "mes_example": char_dict.get("mes_example", ""),
                    "alternate_greetings": _json_list(char_dict.get("alternate_greetings")),
                    "tags": _json_list(char_dict.get("tags")),
                    "sprites": _json_dict(char_dict.get("sprites")),
                    "avatar": char_dict.get("avatar", ""),
                    "appearance": _json_dict(char_dict.get("appearance")),
                    "talkativeness": char_dict.get("talkativeness", 0.5),
                }
                existing_char = session.query(CharacterModel).filter_by(id=char_id, space_id=space_id).first()
                if existing_char:
                    _apply_fields(existing_char, char_fields)
                else:
                    session.add(CharacterModel(id=char_id, space_id=space_id, **char_fields))

            for index, wi_dict in enumerate(_json_list(tavern_dict.get("world_info"))):
                if not isinstance(wi_dict, dict):
                    continue
                wi_id = str(wi_dict.get("id") or f"wi_{space_id}_{index}")
                wi_fields = {
                    "keys": _json_list(wi_dict.get("keys")),
                    "content": wi_dict.get("content", ""),
                    "keys_secondary": _json_list(wi_dict.get("keys_secondary")),
                    "selective": wi_dict.get("selective", True),
                    "constant": wi_dict.get("constant", False),
                    "depth": wi_dict.get("depth", 4),
                    "order": wi_dict.get("order", 100),
                    "probability": wi_dict.get("probability", 100),
                    "disable": wi_dict.get("disable", False),
                }
                existing_wi = session.query(WorldInfoModel).filter_by(id=wi_id, space_id=space_id).first()
                if existing_wi:
                    _apply_fields(existing_wi, wi_fields)
                else:
                    session.add(WorldInfoModel(id=wi_id, space_id=space_id, **wi_fields))

            visitors_data = tavern_dict.get("_visitors", {})
            if isinstance(visitors_data, dict):
                for visitor_id, visitor_dict in visitors_data.items():
                    if not isinstance(visitor_dict, dict):
                        continue
                    safe_visitor_id = str(visitor_id)
                    rel = _json_dict(visitor_dict.get("relationship"))
                    visitor_pk = f"visitor_{safe_visitor_id}_{space_id}"
                    visitor_fields = {
                        "visitor_id": safe_visitor_id,
                        "gender": visitor_dict.get("gender", visitor_dict.get("visitor_gender", "unspecified")),
                        "visit_count": visitor_dict.get("visit_count", 0),
                        "first_visit": _parse_datetime(visitor_dict.get("first_visit")),
                        "last_visit": _parse_datetime(visitor_dict.get("last_visit")),
                        "relationship_strength": rel.get("strength", 0.0),
                        "relationship_stage": rel.get("stage", "stranger"),
                    }
                    existing_visitor = session.query(VisitorModel).filter_by(space_id=space_id, visitor_id=safe_visitor_id).first()
                    if existing_visitor:
                        _apply_fields(existing_visitor, visitor_fields)
                    else:
                        session.add(VisitorModel(id=visitor_pk, space_id=space_id, **visitor_fields))

            memory_atoms_data = tavern_dict.get("_memory_atoms", {})
            if isinstance(memory_atoms_data, dict):
                for atom_id, atom_dict in memory_atoms_data.items():
                    if not isinstance(atom_dict, dict):
                        continue
                    atom_id = str(atom_id)
                    atom_fields = {
                        "scope": atom_dict.get("scope", "tavern"),
                        "dimension": atom_dict.get("dimension", "general"),
                        "horizon": atom_dict.get("horizon", "short_term"),
                        "subject": atom_dict.get("subject", ""),
                        "content": atom_dict.get("content", ""),
                        "importance": atom_dict.get("importance", 0.5),
                        "confidence": atom_dict.get("confidence", 0.5),
                        "source_message_ids": _json_list(atom_dict.get("source_message_ids")),
                        "created_at": _dt_or_now(atom_dict.get("created_at")),
                        "updated_at": _dt_or_now(atom_dict.get("updated_at")),
                        "pinned": atom_dict.get("pinned", False),
                        "visibility": atom_dict.get("visibility", "tavern"),
                        "visitor_id": atom_dict.get("visitor_id", ""),
                        "character_id": atom_dict.get("character_id", ""),
                        "place_id": atom_dict.get("place_id", ""),
                        "created_by": atom_dict.get("created_by", ""),
                        "metadata_": _json_dict(atom_dict.get("metadata")),
                    }
                    existing_atom = session.query(MemoryAtomModel).filter_by(id=atom_id).first()
                    if existing_atom:
                        _apply_fields(existing_atom, {"space_id": space_id, **atom_fields})
                    else:
                        session.add(MemoryAtomModel(id=atom_id, space_id=space_id, **atom_fields))

            sessions_data = tavern_dict.get("_gameplay_sessions", {})
            if isinstance(sessions_data, dict):
                for session_id, session_dict in sessions_data.items():
                    if not isinstance(session_dict, dict):
                        continue
                    session_id = str(session_id)
                    gameplay_fields = {
                        "gameplay_id": session_dict.get("gameplay_id", ""),
                        "visitor_id": session_dict.get("visitor_id", ""),
                        "character_id": session_dict.get("character_id"),
                        "state": session_dict.get("state", "started"),
                        "current_node_id": session_dict.get("current_node_id"),
                        "turn_count": session_dict.get("turn_count", 0),
                        "events": _json_list(session_dict.get("events")),
                        "completion": session_dict.get("completion") if isinstance(session_dict.get("completion"), dict) else None,
                        "created_at": _dt_or_now(session_dict.get("created_at")),
                        "updated_at": _dt_or_now(session_dict.get("updated_at")),
                    }
                    existing_gameplay = session.query(GameplaySessionModel).filter_by(id=session_id).first()
                    if existing_gameplay:
                        _apply_fields(existing_gameplay, {"space_id": space_id, **gameplay_fields})
                    else:
                        session.add(GameplaySessionModel(id=session_id, space_id=space_id, **gameplay_fields))

            state_cards_data = tavern_dict.get("_state_cards", {})
            if isinstance(state_cards_data, dict):
                for card_id, card_value in state_cards_data.items():
                    payload = _state_card_payload(space_id, str(card_id), card_value)
                    card_id = str(payload.get("id") or card_id)
                    card_fields = {
                        "status": payload.get("status", "pending"),
                        "category": payload.get("category", "event_log"),
                        "canon_scope": payload.get("canon_scope", "visitor"),
                        "visitor_id": payload.get("visitor_id", ""),
                        "character_id": payload.get("character_id", ""),
                        "payload": payload,
                        "created_at": _dt_or_now(payload.get("created_at")),
                        "updated_at": _dt_or_now(payload.get("updated_at")),
                    }
                    existing_card = session.query(StateCardModel).filter_by(id=card_id, space_id=space_id).first()
                    if existing_card:
                        _apply_fields(existing_card, card_fields)
                    else:
                        session.add(StateCardModel(id=card_id, space_id=space_id, **card_fields))

    return migrated

def migrate_llm_configs(db: Database, keyvault: dict[str, dict[str, Any]]) -> int:
    """迁移 LLM 配置"""
    migrated = 0
    for space_id, config_dict in keyvault.items():
        if not isinstance(config_dict, dict):
            continue
        with db.session_scope() as session:
            # 检查空间是否存在
            tavern = session.query(TavernModel).filter(TavernModel.id == space_id).first()
            if not tavern:
                logger.debug(f"跳过未知空间的 LLM 配置: {space_id}")
                continue

            existing = session.query(LLMConfigModel).filter(LLMConfigModel.space_id == space_id).first()
            if existing:
                # Keyvault is the authoritative private source.  Update rows
                # that were created from redacted/public inline config.
                existing.backend = config_dict.get("backend", existing.backend)
                existing.model = config_dict.get("model", existing.model)
                existing.api_key = config_dict.get("api_key", existing.api_key or "")
                existing.base_url = config_dict.get("base_url", existing.base_url or "")
                existing.temperature = config_dict.get("temperature", existing.temperature)
                existing.max_tokens = config_dict.get("max_tokens", existing.max_tokens)
                existing.top_p = config_dict.get("top_p", existing.top_p)
                existing.token_used = config_dict.get("token_used", existing.token_used)
            else:
                llm_model = LLMConfigModel(
                    space_id=space_id,
                    backend=config_dict.get("backend", "openai"),
                    model=config_dict.get("model", "gpt-4o-mini"),
                    api_key=config_dict.get("api_key", ""),
                    base_url=config_dict.get("base_url", ""),
                    temperature=config_dict.get("temperature", 0.8),
                    max_tokens=config_dict.get("max_tokens", 512),
                    top_p=config_dict.get("top_p", 1.0),
                    token_used=config_dict.get("token_used", 0),
                )
                session.add(llm_model)
            migrated += 1
            logger.info(f"迁移 LLM 配置: {space_id}")

    return migrated


def migrate_chat_history(db: Database, json_root: Path) -> int:
    """迁移聊天历史（JSONL 文件）"""
    chat_dir = json_root / "chat_history"
    if not chat_dir.exists():
        logger.info("没有聊天历史目录")
        return 0

    migrated = 0
    for tavern_dir in chat_dir.iterdir():
        if not tavern_dir.is_dir():
            continue
        space_id = tavern_dir.name

        with db.session_scope() as session:
            # 检查空间是否存在
            tavern = session.query(TavernModel).filter(TavernModel.id == space_id).first()
            if not tavern:
                logger.debug(f"跳过未知空间的聊天记录: {space_id}")
                continue

            for jsonl_file in tavern_dir.glob("*.jsonl"):
                # 解析文件名: visitor_id_character_id.jsonl
                parts = jsonl_file.stem.split("_", 1)
                if len(parts) != 2:
                    continue
                visitor_id, character_id = parts

                # 读取并解析 JSONL
                for line in jsonl_file.read_text(encoding="utf-8").strip().split("\n"):
                    if not line.strip():
                        continue
                    try:
                        msg_dict = json.loads(line)
                        msg_id = msg_dict.get("id", f"msg_{migrated}")
                        if session.query(ChatMessageModel).filter_by(id=msg_id).first():
                            continue
                        msg_model = ChatMessageModel(
                            id=msg_id,
                            space_id=space_id,
                            character_id=msg_dict.get("character_id", character_id),
                            visitor_id=msg_dict.get("visitor_id", visitor_id),
                            visitor_name=msg_dict.get("visitor_name", ""),
                            role=msg_dict.get("role", "user"),
                            content=msg_dict.get("content", ""),
                            timestamp=_dt_or_now(msg_dict.get("timestamp")),
                            token_count=msg_dict.get("token_count", 0),
                        )
                        session.add(msg_model)
                        migrated += 1
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"跳过无效消息: {e}")

            logger.info(f"迁移聊天记录: {space_id}")

    return migrated


def migrate_owner_configs(db: Database, output_root: Path) -> int:
    """迁移 owner-level 默认 LLM 配置。"""
    data = _load_json_file(output_root / "owner_configs.json", {})
    if not isinstance(data, dict):
        return 0
    migrated = 0
    with db.session_scope() as session:
        for owner_id, owner_data in data.items():
            safe_owner_id = str(owner_id or "").strip()
            if not safe_owner_id or not isinstance(owner_data, dict):
                continue
            existing = session.query(OwnerConfigModel).filter_by(owner_id=safe_owner_id).first()
            if existing:
                continue
            session.add(OwnerConfigModel(
                owner_id=safe_owner_id,
                default_llm=owner_data.get("default_llm") if isinstance(owner_data.get("default_llm"), dict) else {},
                created_at=_dt_or_now(owner_data.get("created_at")),
                updated_at=_dt_or_now(owner_data.get("updated_at")),
            ))
            migrated += 1
    logger.info("迁移 owner configs: %s", migrated)
    return migrated


def migrate_visitor_notes(db: Database, output_root: Path) -> int:
    """迁移 owner-only 访客回访反馈。"""
    data = _load_json_file(output_root / "visitor_notes.json", {})
    if not isinstance(data, dict):
        return 0
    migrated = 0
    with db.session_scope() as session:
        for space_id, notes in data.items():
            if not isinstance(notes, list):
                continue
            for note in notes:
                if not isinstance(note, dict):
                    continue
                note_id = str(note.get("id") or "").strip()
                if not note_id:
                    continue
                if session.query(VisitorNoteModel).filter_by(id=note_id).first():
                    continue
                session.add(VisitorNoteModel(
                    id=note_id,
                    space_id=str(note.get("space_id") or space_id),
                    visitor_id=str(note.get("visitor_id") or ""),
                    visitor_nickname=str(note.get("visitor_nickname") or "旅人")[:64] or "旅人",
                    content=str(note.get("content") or ""),
                    created_at=_dt_or_now(note.get("created_at")),
                    visibility=str(note.get("visibility") or "owner_only"),
                ))
                migrated += 1
    logger.info("迁移 visitor notes: %s", migrated)
    return migrated


def migrate_homes(db: Database, output_root: Path) -> tuple[int, int]:
    """迁移 Home / HomeVisit 文件存储。"""
    homes_root = output_root / "homes"
    homes_data = _load_json_file(homes_root / "homes.json", {})
    visits_data = _load_json_file(homes_root / "visits.json", {})
    migrated_homes = 0
    migrated_visits = 0
    with db.session_scope() as session:
        if isinstance(homes_data, dict):
            for home_id, home in homes_data.items():
                if not isinstance(home, dict):
                    continue
                safe_home_id = str(home.get("id") or home_id)
                if session.query(HomeModel).filter_by(id=safe_home_id).first():
                    continue
                session.add(HomeModel(
                    id=safe_home_id,
                    owner_id=str(home.get("owner_id") or ""),
                    name=str(home.get("name") or "未命名空间"),
                    description=str(home.get("description") or ""),
                    avatar=str(home.get("avatar") or ""),
                    cover_image=str(home.get("cover_image") or ""),
                    theme=str(home.get("theme") or "cozy"),
                    visit_settings=home.get("visit_settings") if isinstance(home.get("visit_settings"), dict) else {},
                    members=home.get("members") if isinstance(home.get("members"), list) else [],
                    status=str(home.get("status") or "hidden"),
                    created_at=_dt_or_now(home.get("created_at")),
                    updated_at=_dt_or_now(home.get("updated_at")),
                    metadata_=home.get("metadata") if isinstance(home.get("metadata"), dict) else {},
                ))
                migrated_homes += 1

        if isinstance(visits_data, dict):
            for home_id, visits in visits_data.items():
                if not isinstance(visits, list):
                    continue
                for visit in visits:
                    if not isinstance(visit, dict):
                        continue
                    visit_id = str(visit.get("id") or "").strip()
                    if not visit_id:
                        continue
                    if session.query(HomeVisitModel).filter_by(id=visit_id).first():
                        continue
                    session.add(HomeVisitModel(
                        id=visit_id,
                        home_id=str(visit.get("home_id") or home_id),
                        visitor_id=str(visit.get("visitor_id") or ""),
                        visited_at=_dt_or_now(visit.get("visited_at")),
                        stay_duration=int(visit.get("stay_duration") or 0),
                        left_message=visit.get("left_message"),
                        metadata_=visit.get("metadata") if isinstance(visit.get("metadata"), dict) else {},
                    ))
                    migrated_visits += 1
    logger.info("迁移 homes: %s, visits: %s", migrated_homes, migrated_visits)
    return migrated_homes, migrated_visits


def migrate_writeback_state(db: Database, output_root: Path, *, key: str = "default") -> int:
    """迁移 legacy writeback-state.json。"""
    state = _load_json_file(output_root / "writeback" / "writeback-state.json", None)
    if not isinstance(state, dict):
        return 0
    with db.session_scope() as session:
        existing = session.query(WritebackStateModel).filter_by(key=key).first()
        if existing:
            return 0
        session.add(WritebackStateModel(
            key=key,
            state=state,
            updated_at=_dt_or_now(state.get("last_updated_at")),
        ))
    logger.info("迁移 writeback state: %s", key)
    return 1


def seed_default_taverns(db: Database) -> int:
    """播种默认内置小馆"""
    migrated = 0
    for tavern_dict in default_public_welfare_spaces():
        space_id = tavern_dict.get("id", "")
        with db.session_scope() as session:
            existing = session.query(TavernModel).filter(TavernModel.id == space_id).first()
            if existing:
                continue

            tavern_model = TavernModel(
                id=space_id,
                name=tavern_dict.get("name", "未命名空间"),
                description=tavern_dict.get("description", ""),
                lat=tavern_dict.get("lat", 0.0),
                lon=tavern_dict.get("lon", 0.0),
                address=tavern_dict.get("address", ""),
                owner_id=tavern_dict.get("owner_id", "system_public_welfare"),
                created_at=_dt_or_now(tavern_dict.get("created_at")),
                access=tavern_dict.get("access", "public"),
                password_hash=tavern_dict.get("password_hash", ""),
                status=tavern_dict.get("status", "closed"),
                roleplay_mode=tavern_dict.get("roleplay_mode", "ai_only"),
                layout_style=tavern_dict.get("layout_style", "lobby"),
                place_type=tavern_dict.get("place_type", "space"),
                scene_prompt=tavern_dict.get("scene_prompt", ""),
                visit_count=tavern_dict.get("visit_count", 0),
                group_chat_enabled=tavern_dict.get("group_chat_enabled", False),
                group_chat_config=tavern_dict.get("group_chat_config", {}),
                groups=tavern_dict.get("groups", []),
                bookmarks=tavern_dict.get("bookmarks", []),
                chat_templates=tavern_dict.get("chat_templates", []),
                character_claims=tavern_dict.get("character_claims", []),
                gameplay_definitions=tavern_dict.get("gameplay_definitions", []),
                output_rules=tavern_dict.get("output_rules", []),
                prompt_blocks=tavern_dict.get("prompt_blocks", []),
                runtime_presets=tavern_dict.get("runtime_presets", []),
                skill_packs=tavern_dict.get("skill_packs", []),
                active_preset_id=tavern_dict.get("active_preset_id", ""),
                memory_policy=tavern_dict.get("memory_policy", {}),
                voice_config=tavern_dict.get("voice_config", {}),
                home_members=tavern_dict.get("home_members", []),
                place_relationships=tavern_dict.get("place_relationships", []),
                timezone=tavern_dict.get("timezone"),
                operating_hours=tavern_dict.get("operating_hours", {}),
            )
            session.add(tavern_model)

            inline_llm = tavern_dict.get("llm_config")
            if isinstance(inline_llm, dict):
                session.add(LLMConfigModel(
                    space_id=space_id,
                    backend=inline_llm.get("backend", "rules"),
                    model=inline_llm.get("model", "rules"),
                    api_key=inline_llm.get("api_key", ""),
                    base_url=inline_llm.get("base_url", ""),
                    temperature=inline_llm.get("temperature", 0.8),
                    max_tokens=inline_llm.get("max_tokens", 512),
                    top_p=inline_llm.get("top_p", 1.0),
                    token_used=inline_llm.get("token_used", 0),
                ))

            # 迁移角色
            for char_dict in tavern_dict.get("characters", []):
                char_model = CharacterModel(
                    id=char_dict.get("id", f"char_{space_id}"),
                    space_id=space_id,
                    name=char_dict.get("name", "未命名角色"),
                    description=char_dict.get("description", ""),
                    personality=char_dict.get("personality", ""),
                    scenario=char_dict.get("scenario", ""),
                    gender=char_dict.get("gender", "unspecified"),
                    system_prompt=char_dict.get("system_prompt", ""),
                    first_mes=char_dict.get("first_mes", ""),
                    mes_example=char_dict.get("mes_example", ""),
                    alternate_greetings=char_dict.get("alternate_greetings", []),
                    tags=char_dict.get("tags", []),
                    sprites=char_dict.get("sprites", {}),
                    avatar=char_dict.get("avatar", ""),
                    appearance=char_dict.get("appearance", {}),
                    talkativeness=char_dict.get("talkativeness", 0.5),
                )
                session.add(char_model)

            # 迁移世界知识
            for wi_dict in tavern_dict.get("world_info", []):
                wi_model = WorldInfoModel(
                    id=wi_dict.get("id", f"wi_{space_id}"),
                    space_id=space_id,
                    keys=wi_dict.get("keys", []),
                    content=wi_dict.get("content", ""),
                    keys_secondary=wi_dict.get("keys_secondary", []),
                    selective=wi_dict.get("selective", True),
                    constant=wi_dict.get("constant", False),
                    depth=wi_dict.get("depth", 4),
                    order=wi_dict.get("order", 100),
                    probability=wi_dict.get("probability", 100),
                    disable=wi_dict.get("disable", False),
                )
                session.add(wi_model)

            migrated += 1
            logger.info(f"播种默认内置小馆: {space_id} ({tavern_dict.get('name')})")

    return migrated


def run_migration(
    json_root: str | None,
    mysql_url: str,
    drop_existing: bool = False,
    *,
    output_root: str | None = None,
) -> dict[str, int]:
    """运行定向迁移。

    Args:
        json_root: 旧 TavernStore JSON 目录；为空时使用 `<output_root>/taverns`。
        mysql_url: SQLAlchemy 数据库 URL。名称保留 `mysql_url` 兼容旧调用，实际可为
            `mysql+pymysql://...` 或测试/本地 SQLite URL。
        drop_existing: 是否先删除已有表。只应用于用户显式传入的目标库。
        output_root: 旧运行时输出根目录，用于迁移 side stores：
            owner_configs.json、visitor_notes.json、homes/*、writeback/*。
    """
    if not mysql_url:
        raise ValueError("需要提供数据库 URL（优先 FABLESPACE_DATABASE_URL，FABLEMAP_DATABASE_URL 为旧别名）")

    output_path = Path(output_root or ".fablespace-api")
    json_path = _tavern_store_root(output_path, Path(json_root) if json_root else None)
    output_path = _resolve_output_root(json_path, output_path if output_root else None)
    if not json_path.exists():
        logger.warning("Tavern JSON 目录不存在，将只迁移 side stores/播种默认空间: %s", json_path)

    # 创建数据库连接
    logger.info("目标数据库: %s", redact_database_url(mysql_url))
    db = Database(mysql_url)

    # 创建表
    if drop_existing:
        logger.warning("删除现有表...")
        db.drop_tables()

    logger.info("创建表结构...")
    create_mysql_tables(db)

    # 迁移空间数据
    logger.info("迁移空间数据...")
    taverns_data = load_json_taverns(json_path) if json_path.exists() else {}
    migrated_taverns = migrate_taverns(db, taverns_data)
    logger.info(f"迁移了 {migrated_taverns} 个空间")

    # 迁移密钥库
    logger.info("迁移 LLM 配置...")
    keyvault = load_keyvault(json_path) if json_path.exists() else {}
    migrated_llm = migrate_llm_configs(db, keyvault)
    logger.info(f"迁移了 {migrated_llm} 个 LLM 配置")

    # 迁移聊天历史
    logger.info("迁移聊天历史...")
    migrated_chat = migrate_chat_history(db, json_path) if json_path.exists() else 0
    logger.info(f"迁移了 {migrated_chat} 条聊天消息")

    # 迁移 runtime side stores，避免 owner/default LLM、回访反馈、Home、writeback
    # 继续停留在文件缓存层。
    migrated_owner_configs = migrate_owner_configs(db, output_path)
    migrated_visitor_notes = migrate_visitor_notes(db, output_path)
    migrated_homes, migrated_home_visits = migrate_homes(db, output_path)
    migrated_writeback = migrate_writeback_state(db, output_path)

    # 播种默认空间
    logger.info("播种默认内置小馆...")
    seeded = seed_default_taverns(db)
    logger.info(f"播种了 {seeded} 个默认空间")

    summary = {
        "taverns": migrated_taverns,
        "llm_configs": migrated_llm,
        "chat_messages": migrated_chat,
        "owner_configs": migrated_owner_configs,
        "visitor_notes": migrated_visitor_notes,
        "homes": migrated_homes,
        "home_visits": migrated_home_visits,
        "writeback_states": migrated_writeback,
        "seeded_default_taverns": seeded,
    }

    # 关闭连接池
    db.dispose()

    logger.info("迁移完成: %s", summary)
    return summary


def main():
    parser = argparse.ArgumentParser(description="将旧 JSON/file runtime 数据迁移到数据库（生产目标 MySQL）")
    parser.add_argument(
        "--output-root",
        type=str,
        default=".fablespace-api",
        help="旧运行时输出根目录；用于定位 taverns/、owner_configs.json、homes/、writeback/ 等",
    )
    parser.add_argument(
        "--json-root",
        type=str,
        default="",
        help="旧 TavernStore JSON 文件目录路径；默认使用 <output-root>/taverns",
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default="",
        help="SQLAlchemy 数据库 URL；生产建议 mysql+pymysql://user:pass@host:port/db",
    )
    parser.add_argument(
        "--mysql-url",
        type=str,
        default="",
        help="旧参数别名，同 --database-url",
    )
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="删除现有表并重建",
    )

    args = parser.parse_args()

    database_url = (
        args.database_url
        or args.mysql_url
        or os.environ.get("FABLESPACE_DATABASE_URL", "")
        or os.environ.get("FABLEMAP_DATABASE_URL", "")
        or os.environ.get("FABLESPACE_MYSQL_URL", "")
        or os.environ.get("FABLEMAP_MYSQL_URL", "")
    )
    if not database_url:
        logger.error("需要通过 --database-url / FABLESPACE_DATABASE_URL 提供数据库 URL（FABLEMAP_DATABASE_URL 仅为旧别名）")
        sys.exit(1)

    run_migration(
        args.json_root or None,
        database_url,
        args.drop_existing,
        output_root=args.output_root,
    )


if __name__ == "__main__":
    main()
