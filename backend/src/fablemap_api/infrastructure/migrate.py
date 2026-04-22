"""
数据迁移脚本：将 JSON 文件数据迁移到 MySQL

用法：
    python -m fablemap_api.infrastructure.migrate \
        --json-root .fablemap-api/taverns \
        --mysql-url "mysql+pymysql://user:pass@localhost:3306/fablemap"

或设置环境变量：
    export FABLEMAP_MYSQL_URL="mysql+pymysql://user:pass@localhost:3306/fablemap"
    python -m fablemap_api.infrastructure.migrate --json-root .fablemap-api/taverns
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

from fablemap_api.core.default_taverns import default_public_welfare_taverns
from fablemap_api.infrastructure.database import Database
from fablemap_api.infrastructure.models import (
    TavernModel,
    CharacterModel,
    WorldInfoModel,
    VisitorModel,
    ChatMessageModel,
    MemoryAtomModel,
    GameplaySessionModel,
    LLMConfigModel,
    Base,
)
from fablemap_api.infrastructure.mysql_store import create_mysql_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def _parse_datetime(value: str | None) -> Any:
    """解析 ISO 格式的日期时间字符串"""
    if not value:
        return None
    from datetime import datetime
    try:
        # 2026-04-20T00:00:00Z -> datetime
        value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value.replace("+00:00", ""))
    except (ValueError, AttributeError):
        return None


def load_json_taverns(json_root: Path) -> dict[str, dict[str, Any]]:
    """从 JSON 文件加载酒馆数据"""
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
    """迁移酒馆数据"""
    migrated = 0
    for tavern_id, tavern_dict in taverns_data.items():
        with db.session_scope() as session:
            # 检查是否已存在
            existing = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if existing:
                logger.debug(f"跳过已存在的酒馆: {tavern_id}")
                continue

            # 创建酒馆记录
            tavern_model = TavernModel(
                id=tavern_id,
                name=tavern_dict.get("name", "未命名酒馆"),
                description=tavern_dict.get("description", ""),
                lat=tavern_dict.get("lat", 0.0),
                lon=tavern_dict.get("lon", 0.0),
                address=tavern_dict.get("address", ""),
                owner_id=tavern_dict.get("owner_id", "system_public_welfare"),
                created_at=_parse_datetime(tavern_dict.get("created_at")),
                access=tavern_dict.get("access", "public"),
                password_hash=tavern_dict.get("password_hash", ""),
                status=tavern_dict.get("status", "closed"),
                scene_prompt=tavern_dict.get("scene_prompt", ""),
                visit_count=tavern_dict.get("visit_count", 0),
                group_chat_enabled=tavern_dict.get("group_chat_enabled", False),
                group_chat_config=tavern_dict.get("group_chat_config", {}),
                groups=tavern_dict.get("groups", []),
                bookmarks=tavern_dict.get("bookmarks", []),
                chat_templates=tavern_dict.get("chat_templates", []),
                gameplay_definitions=tavern_dict.get("gameplay_definitions", []),
                output_rules=tavern_dict.get("output_rules", []),
                prompt_blocks=tavern_dict.get("prompt_blocks", []),
                runtime_presets=tavern_dict.get("runtime_presets", []),
                active_preset_id=tavern_dict.get("active_preset_id", ""),
                memory_policy=tavern_dict.get("memory_policy", {}),
                voice_config=tavern_dict.get("voice_config", {}),
            )
            session.add(tavern_model)

            # 迁移角色
            for char_dict in tavern_dict.get("characters", []):
                char_model = CharacterModel(
                    id=char_dict.get("id", f"char_{tavern_id}_{char_dict.get('name', 'unknown')}"),
                    tavern_id=tavern_id,
                    name=char_dict.get("name", "未命名角色"),
                    description=char_dict.get("description", ""),
                    personality=char_dict.get("personality", ""),
                    scenario=char_dict.get("scenario", ""),
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
                    id=wi_dict.get("id", f"wi_{tavern_id}_{len(tavern_dict.get('world_info', []))}"),
                    tavern_id=tavern_id,
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

            # 迁移访客状态
            visitors_data = tavern_dict.get("_visitors", {})
            if isinstance(visitors_data, dict):
                for visitor_id, visitor_dict in visitors_data.items():
                    rel = visitor_dict.get("relationship", {})
                    visitor_model = VisitorModel(
                        id=f"visitor_{visitor_id}_{tavern_id}",
                        tavern_id=tavern_id,
                        visitor_id=visitor_id,
                        visit_count=visitor_dict.get("visit_count", 0),
                        first_visit=_parse_datetime(visitor_dict.get("first_visit")),
                        last_visit=_parse_datetime(visitor_dict.get("last_visit")),
                        relationship_strength=rel.get("strength", 0.0),
                        relationship_stage=rel.get("stage", "stranger"),
                    )
                    session.add(visitor_model)

            # 迁移记忆原子
            memory_atoms_data = tavern_dict.get("_memory_atoms", {})
            if isinstance(memory_atoms_data, dict):
                for atom_id, atom_dict in memory_atoms_data.items():
                    atom_model = MemoryAtomModel(
                        id=atom_id,
                        tavern_id=tavern_id,
                        scope=atom_dict.get("scope", "tavern"),
                        dimension=atom_dict.get("dimension", "general"),
                        horizon=atom_dict.get("horizon", "short_term"),
                        subject=atom_dict.get("subject", ""),
                        content=atom_dict.get("content", ""),
                        importance=atom_dict.get("importance", 0.5),
                        confidence=atom_dict.get("confidence", 0.5),
                        source_message_ids=atom_dict.get("source_message_ids", []),
                        created_at=_parse_datetime(atom_dict.get("created_at")),
                        updated_at=_parse_datetime(atom_dict.get("updated_at")),
                        pinned=atom_dict.get("pinned", False),
                        visibility=atom_dict.get("visibility", "tavern"),
                        visitor_id=atom_dict.get("visitor_id", ""),
                        character_id=atom_dict.get("character_id", ""),
                        place_id=atom_dict.get("place_id", ""),
                        created_by=atom_dict.get("created_by", ""),
                        metadata=atom_dict.get("metadata", {}),
                    )
                    session.add(atom_model)

            # 迁移玩法会话
            sessions_data = tavern_dict.get("_gameplay_sessions", {})
            if isinstance(sessions_data, dict):
                for session_id, session_dict in sessions_data.items():
                    gameplay_model = GameplaySessionModel(
                        id=session_id,
                        tavern_id=tavern_id,
                        gameplay_id=session_dict.get("gameplay_id", ""),
                        visitor_id=session_dict.get("visitor_id", ""),
                        character_id=session_dict.get("character_id"),
                        state=session_dict.get("state", "started"),
                        current_node_id=session_dict.get("current_node_id"),
                        turn_count=session_dict.get("turn_count", 0),
                        events=session_dict.get("events", []),
                        completion=session_dict.get("completion"),
                        created_at=_parse_datetime(session_dict.get("created_at")),
                        updated_at=_parse_datetime(session_dict.get("updated_at")),
                    )
                    session.add(gameplay_model)

            migrated += 1
            logger.info(f"迁移酒馆: {tavern_id} ({tavern_dict.get('name', '未命名')})")

    return migrated


def migrate_llm_configs(db: Database, keyvault: dict[str, dict[str, Any]]) -> int:
    """迁移 LLM 配置"""
    migrated = 0
    for tavern_id, config_dict in keyvault.items():
        with db.session_scope() as session:
            # 检查酒馆是否存在
            tavern = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if not tavern:
                logger.debug(f"跳过未知酒馆的 LLM 配置: {tavern_id}")
                continue

            # 检查是否已存在
            existing = session.query(LLMConfigModel).filter(LLMConfigModel.tavern_id == tavern_id).first()
            if existing:
                logger.debug(f"跳过已存在的 LLM 配置: {tavern_id}")
                continue

            llm_model = LLMConfigModel(
                tavern_id=tavern_id,
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
            logger.info(f"迁移 LLM 配置: {tavern_id}")

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
        tavern_id = tavern_dir.name

        with db.session_scope() as session:
            # 检查酒馆是否存在
            tavern = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if not tavern:
                logger.debug(f"跳过未知酒馆的聊天记录: {tavern_id}")
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
                        msg_model = ChatMessageModel(
                            id=msg_dict.get("id", f"msg_{migrated}"),
                            tavern_id=tavern_id,
                            character_id=msg_dict.get("character_id", character_id),
                            visitor_id=msg_dict.get("visitor_id", visitor_id),
                            visitor_name=msg_dict.get("visitor_name", ""),
                            role=msg_dict.get("role", "user"),
                            content=msg_dict.get("content", ""),
                            timestamp=_parse_datetime(msg_dict.get("timestamp")),
                            token_count=msg_dict.get("token_count", 0),
                        )
                        session.add(msg_model)
                        migrated += 1
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"跳过无效消息: {e}")

            logger.info(f"迁移聊天记录: {tavern_id}")

    return migrated


def seed_default_taverns(db: Database) -> int:
    """播种默认公益酒馆"""
    migrated = 0
    for tavern_dict in default_public_welfare_taverns():
        tavern_id = tavern_dict.get("id", "")
        with db.session_scope() as session:
            existing = session.query(TavernModel).filter(TavernModel.id == tavern_id).first()
            if existing:
                continue

            tavern_model = TavernModel(
                id=tavern_id,
                name=tavern_dict.get("name", "未命名酒馆"),
                description=tavern_dict.get("description", ""),
                lat=tavern_dict.get("lat", 0.0),
                lon=tavern_dict.get("lon", 0.0),
                address=tavern_dict.get("address", ""),
                owner_id=tavern_dict.get("owner_id", "system_public_welfare"),
                created_at=_parse_datetime(tavern_dict.get("created_at")),
                access=tavern_dict.get("access", "public"),
                password_hash=tavern_dict.get("password_hash", ""),
                status=tavern_dict.get("status", "closed"),
                scene_prompt=tavern_dict.get("scene_prompt", ""),
                visit_count=tavern_dict.get("visit_count", 0),
                group_chat_enabled=tavern_dict.get("group_chat_enabled", False),
                group_chat_config=tavern_dict.get("group_chat_config", {}),
                groups=tavern_dict.get("groups", []),
                bookmarks=tavern_dict.get("bookmarks", []),
                chat_templates=tavern_dict.get("chat_templates", []),
                gameplay_definitions=tavern_dict.get("gameplay_definitions", []),
                output_rules=tavern_dict.get("output_rules", []),
                prompt_blocks=tavern_dict.get("prompt_blocks", []),
                runtime_presets=tavern_dict.get("runtime_presets", []),
                active_preset_id=tavern_dict.get("active_preset_id", ""),
                memory_policy=tavern_dict.get("memory_policy", {}),
                voice_config=tavern_dict.get("voice_config", {}),
            )
            session.add(tavern_model)

            # 迁移角色
            for char_dict in tavern_dict.get("characters", []):
                char_model = CharacterModel(
                    id=char_dict.get("id", f"char_{tavern_id}"),
                    tavern_id=tavern_id,
                    name=char_dict.get("name", "未命名角色"),
                    description=char_dict.get("description", ""),
                    personality=char_dict.get("personality", ""),
                    scenario=char_dict.get("scenario", ""),
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
                    id=wi_dict.get("id", f"wi_{tavern_id}"),
                    tavern_id=tavern_id,
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
            logger.info(f"播种公益酒馆: {tavern_id} ({tavern_dict.get('name')})")

    return migrated


def run_migration(json_root: str, mysql_url: str, drop_existing: bool = False) -> None:
    """运行迁移"""
    if not mysql_url:
        logger.error("需要提供 MySQL URL")
        sys.exit(1)

    json_path = Path(json_root)
    if not json_path.exists():
        logger.error(f"JSON 目录不存在: {json_path}")
        sys.exit(1)

    # 创建数据库连接
    db = Database(mysql_url)

    # 创建表
    if drop_existing:
        logger.warning("删除现有表...")
        db.drop_tables()

    logger.info("创建表结构...")
    create_mysql_tables(db)

    # 迁移酒馆数据
    logger.info("迁移酒馆数据...")
    taverns_data = load_json_taverns(json_path)
    migrated_taverns = migrate_taverns(db, taverns_data)
    logger.info(f"迁移了 {migrated_taverns} 个酒馆")

    # 迁移密钥库
    logger.info("迁移 LLM 配置...")
    keyvault = load_keyvault(json_path)
    migrated_llm = migrate_llm_configs(db, keyvault)
    logger.info(f"迁移了 {migrated_llm} 个 LLM 配置")

    # 迁移聊天历史
    logger.info("迁移聊天历史...")
    migrated_chat = migrate_chat_history(db, json_path)
    logger.info(f"迁移了 {migrated_chat} 条聊天消息")

    # 播种默认酒馆
    logger.info("播种默认公益酒馆...")
    seeded = seed_default_taverns(db)
    logger.info(f"播种了 {seeded} 个默认酒馆")

    # 关闭连接池
    db.dispose()

    logger.info("迁移完成!")


def main():
    parser = argparse.ArgumentParser(description="将 JSON 数据迁移到 MySQL")
    parser.add_argument(
        "--json-root",
        type=str,
        default=".fablemap-api/taverns",
        help="JSON 文件目录路径",
    )
    parser.add_argument(
        "--mysql-url",
        type=str,
        default="",
        help="MySQL 连接 URL (mysql+pymysql://user:pass@host:port/db)",
    )
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="删除现有表并重建",
    )

    args = parser.parse_args()

    # 从环境变量获取 MySQL URL
    mysql_url = args.mysql_url or __import__("os").environ.get("FABLEMAP_MYSQL_URL", "")
    if not mysql_url:
        logger.error("需要通过 --mysql-url 或 FABLEMAP_MYSQL_URL 环境变量提供 MySQL URL")
        sys.exit(1)

    run_migration(args.json_root, mysql_url, args.drop_existing)


if __name__ == "__main__":
    main()
