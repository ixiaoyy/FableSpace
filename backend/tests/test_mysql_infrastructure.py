"""
MySQL 基础设施单元测试

使用 SQLite 内存数据库进行测试。
"""

from __future__ import annotations

import json
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

pytest.importorskip("sqlalchemy", reason="optional MySQL infrastructure dependency")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 添加 src 到 path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fablemap_api.infrastructure.database import Database, Base
from fablemap_api.infrastructure.models import (
    TavernModel,
    CharacterModel,
    WorldInfoModel,
    VisitorModel,
    ChatMessageModel,
    MemoryAtomModel,
    GameplaySessionModel,
    LLMConfigModel,
)
from fablemap_api.infrastructure.mysql_store import MySQLTavernStore, create_mysql_tables


@pytest.fixture
def db() -> Database:
    """创建使用 SQLite 内存数据库的 Database 实例"""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_instance = Database.__new__(Database)
    db_instance.engine = engine
    db_instance.SessionLocal = SessionLocal
    db_instance.url = "sqlite:///:memory:"
    return db_instance


@pytest.fixture
def store(db: Database) -> MySQLTavernStore:
    """创建 MySQLTavernStore 实例"""
    create_mysql_tables(db)
    return MySQLTavernStore(db)


class TestDatabase:
    """Database 类的单元测试"""

    def test_session_scope_commit(self, db: Database):
        """测试 session_scope 正常提交"""
        with db.session_scope() as session:
            tavern = TavernModel(
                id="test_001",
                name="测试酒馆",
                lat=35.6581,
                lon=139.7016,
                created_at=datetime.utcnow(),
            )
            session.add(tavern)
        # 提交后查询验证
        with db.session_scope() as session:
            result = session.query(TavernModel).filter(TavernModel.id == "test_001").first()
            assert result is not None
            assert result.name == "测试酒馆"

    def test_session_scope_rollback(self, db: Database):
        """测试 session_scope 异常回滚"""
        with pytest.raises(Exception):
            with db.session_scope() as session:
                tavern = TavernModel(
                    id="test_002",
                    name="测试酒馆2",
                    lat=35.6581,
                    lon=139.7016,
                    created_at=datetime.utcnow(),
                )
                session.add(tavern)
                raise Exception("模拟错误")

        # 验证回滚
        with db.session_scope() as session:
            result = session.query(TavernModel).filter(TavernModel.id == "test_002").first()
            assert result is None


class TestTavernCRUD:
    """Tavern CRUD 操作测试"""

    def test_create_and_get_tavern(self, store: MySQLTavernStore):
        """测试创建和获取酒馆"""
        from fablemap_api.core.tavern import Tavern

        tavern = Tavern(
            id="tavern_001",
            name="测试酒馆",
            description="这是一个测试酒馆",
            lat=35.6581,
            lon=139.7016,
            address="测试地址",
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
            access="public",
            status="open",
        )

        # 创建
        created = store.create_tavern(tavern)
        assert created.id == "tavern_001"
        assert created.name == "测试酒馆"

        # 获取
        retrieved = store.get_tavern("tavern_001")
        assert retrieved is not None
        assert retrieved.id == "tavern_001"
        assert retrieved.name == "测试酒馆"
        assert retrieved.description == "这是一个测试酒馆"

    def test_list_taverns(self, store: MySQLTavernStore):
        """测试列出酒馆"""
        from fablemap_api.core.tavern import Tavern

        # 创建多个酒馆
        for i in range(3):
            tavern = Tavern(
                id=f"tavern_{i:03d}",
                name=f"酒馆 {i}",
                description="",
                lat=35.6581 + i * 0.001,
                lon=139.7016,
                owner_id="owner_001",
                created_at="2026-04-22T10:00:00Z",
            )
            store.create_tavern(tavern)

        # 列出所有
        taverns = store.list_taverns()
        assert len(taverns) >= 3

    def test_update_tavern(self, store: MySQLTavernStore):
        """测试更新酒馆"""
        from fablemap_api.core.tavern import Tavern

        tavern = Tavern(
            id="tavern_update",
            name="原始名称",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 更新
        tavern.name = "新名称"
        tavern.status = "closed"
        updated = store.update_tavern(tavern)

        assert updated.name == "新名称"
        assert updated.status == "closed"

        # 验证持久化
        retrieved = store.get_tavern("tavern_update")
        assert retrieved.name == "新名称"
        assert retrieved.status == "closed"

    def test_delete_tavern(self, store: MySQLTavernStore):
        """测试删除酒馆"""
        from fablemap_api.core.tavern import Tavern

        tavern = Tavern(
            id="tavern_delete",
            name="待删除酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 删除
        store.delete_tavern("tavern_delete")

        # 验证删除
        retrieved = store.get_tavern("tavern_delete")
        assert retrieved is None


class TestCharacterCRUD:
    """Character CRUD 操作测试"""

    def test_create_tavern_with_characters(self, store: MySQLTavernStore):
        """测试创建带角色的酒馆"""
        from fablemap_api.core.tavern import Tavern, TavernCharacter

        character = TavernCharacter(
            id="char_001",
            tavern_id="tavern_chars",
            name="测试角色",
            description="这是一个测试角色",
            personality="友好、热情",
            system_prompt="你是一个友好的角色",
        )

        tavern = Tavern(
            id="tavern_chars",
            name="角色测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
            characters=[character],
        )

        created = store.create_tavern(tavern)

        assert len(created.characters) == 1
        assert created.characters[0].name == "测试角色"

    def test_add_character_to_existing_tavern(self, store: MySQLTavernStore):
        """测试向已有酒馆添加角色"""
        from fablemap_api.core.tavern import Tavern, TavernCharacter

        # 创建酒馆
        tavern = Tavern(
            id="tavern_add_char",
            name="添加角色酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 获取酒馆并添加角色
        tavern = store.get_tavern("tavern_add_char")
        new_character = TavernCharacter(
            id="char_new",
            tavern_id="tavern_add_char",
            name="新角色",
            description="",
        )
        tavern.characters.append(new_character)
        store.update_tavern(tavern)

        # 验证
        updated = store.get_tavern("tavern_add_char")
        assert len(updated.characters) == 1
        assert updated.characters[0].name == "新角色"


class TestVisitorState:
    """访客状态测试"""

    def test_update_and_get_visitor_state(self, store: MySQLTavernStore):
        """测试更新和获取访客状态"""
        from fablemap_api.core.tavern import Tavern, VisitorState

        # 创建酒馆
        tavern = Tavern(
            id="tavern_visitor",
            name="访客测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 创建访客状态
        visitor_state = VisitorState(
            visitor_id="visitor_001",
            tavern_id="tavern_visitor",
            visit_count=1,
            first_visit="2026-04-22T10:00:00Z",
            last_visit="2026-04-22T10:00:00Z",
            relationship_strength=0.1,
            relationship_stage="stranger",
        )
        store.update_visitor_state("tavern_visitor", visitor_state)

        # 获取访客状态
        retrieved = store.get_visitor_state("tavern_visitor", "visitor_001")
        assert retrieved is not None
        assert retrieved.visitor_id == "visitor_001"
        assert retrieved.visit_count == 1

        # 更新访客状态
        visitor_state.visit_count = 2
        visitor_state.relationship_strength = 0.3
        store.update_visitor_state("tavern_visitor", visitor_state)

        # 验证更新
        updated = store.get_visitor_state("tavern_visitor", "visitor_001")
        assert updated.visit_count == 2
        assert updated.relationship_strength == 0.3

    def test_list_visitor_states(self, store: MySQLTavernStore):
        """测试列出访客状态"""
        from fablemap_api.core.tavern import Tavern, VisitorState

        # 创建酒馆
        tavern = Tavern(
            id="tavern_list_visitors",
            name="列表访客酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 添加多个访客
        for i in range(3):
            state = VisitorState(
                visitor_id=f"visitor_{i}",
                tavern_id="tavern_list_visitors",
                visit_count=i + 1,
            )
            store.update_visitor_state("tavern_list_visitors", state)

        # 列出访客
        visitors = store.list_visitor_states("tavern_list_visitors")
        assert len(visitors) == 3


class TestChatMessages:
    """聊天消息测试"""

    def test_add_and_get_chat_messages(self, store: MySQLTavernStore):
        """测试添加和获取聊天消息"""
        from fablemap_api.core.tavern import Tavern, ChatMessage

        # 创建酒馆
        tavern = Tavern(
            id="tavern_chat",
            name="聊天测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 添加用户消息
        user_msg = ChatMessage(
            id="msg_001",
            tavern_id="tavern_chat",
            character_id="char_001",
            visitor_id="visitor_001",
            visitor_name="访客甲",
            role="user",
            content="你好！",
            timestamp="2026-04-22T10:00:00Z",
        )
        store.add_chat_message(user_msg)

        # 添加助手回复
        assistant_msg = ChatMessage(
            id="msg_002",
            tavern_id="tavern_chat",
            character_id="char_001",
            visitor_id="visitor_001",
            visitor_name="访客甲",
            role="assistant",
            content="你好！欢迎来到测试酒馆。",
            timestamp="2026-04-22T10:00:01Z",
        )
        store.add_chat_message(assistant_msg)

        # 获取聊天历史
        history = store.get_chat_history("tavern_chat", "visitor_001")
        assert len(history) == 2
        assert history[0].role == "user"
        assert history[1].role == "assistant"


class TestLLMConfig:
    """LLM 配置测试"""

    def test_save_and_get_llm_config(self, store: MySQLTavernStore):
        """测试保存和获取 LLM 配置"""
        from fablemap_api.core.tavern import Tavern, LLMConfig

        # 创建酒馆
        tavern = Tavern(
            id="tavern_llm",
            name="LLM 测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 保存 LLM 配置
        llm_config = LLMConfig(
            backend="openai",
            model="gpt-4o-mini",
            api_key="sk-test-key",
            base_url="https://api.openai.com",
            temperature=0.8,
            max_tokens=512,
            top_p=1.0,
            token_used=100,
        )
        store.save_llm_config("tavern_llm", llm_config)

        # 获取 LLM 配置
        retrieved = store.get_llm_config("tavern_llm")
        assert retrieved is not None
        assert retrieved.backend == "openai"
        assert retrieved.model == "gpt-4o-mini"
        # api_key 应该被隐藏
        assert retrieved.api_key == ""  # MySQLTavernStore.get_llm_config 从 keyvault 获取

    def test_token_usage(self, store: MySQLTavernStore):
        """测试 Token 使用量"""
        from fablemap_api.core.tavern import Tavern

        # 创建酒馆
        tavern = Tavern(
            id="tavern_token",
            name="Token 测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 初始 token 使用量
        initial = store.get_token_usage("tavern_token")
        assert initial == 0

        # 添加 token 使用
        store.add_token_usage("tavern_token", 100)
        after_add = store.get_token_usage("tavern_token")
        assert after_add == 100

        # 再次添加
        store.add_token_usage("tavern_token", 50)
        final = store.get_token_usage("tavern_token")
        assert final == 150


class TestMemoryAtoms:
    """记忆原子测试"""

    def test_save_and_get_memory_atom(self, store: MySQLTavernStore):
        """测试保存和获取记忆原子"""
        from fablemap_api.core.tavern import Tavern
        from fablemap_api.core.memory import MemoryAtom

        # 创建酒馆
        tavern = Tavern(
            id="tavern_memory",
            name="记忆测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 创建记忆原子
        atom = MemoryAtom(
            id="atom_001",
            tavern_id="tavern_memory",
            scope="tavern",
            dimension="general",
            horizon="short_term",
            subject="visitor_001",
            content="访客喜欢询问关于酒馆历史的问题",
            importance=0.7,
            confidence=0.8,
            created_at="2026-04-22T10:00:00Z",
            updated_at="2026-04-22T10:00:00Z",
        )
        saved = store.save_memory_atom("tavern_memory", atom)

        assert saved.id == "atom_001"

        # 获取记忆原子
        retrieved = store.get_memory_atom("tavern_memory", "atom_001")
        assert retrieved is not None
        assert retrieved.content == "访客喜欢询问关于酒馆历史的问题"
        assert retrieved.importance == 0.7

    def test_list_memory_atoms(self, store: MySQLTavernStore):
        """测试列出记忆原子"""
        from fablemap_api.core.tavern import Tavern
        from fablemap_api.core.memory import MemoryAtom

        # 创建酒馆
        tavern = Tavern(
            id="tavern_list_memories",
            name="列表记忆酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
        )
        store.create_tavern(tavern)

        # 添加多个记忆
        for i in range(3):
            atom = MemoryAtom(
                id=f"atom_{i}",
                tavern_id="tavern_list_memories",
                scope="tavern",
                dimension="general",
                horizon="short_term",
                content=f"记忆 {i}",
                created_at="2026-04-22T10:00:00Z",
                updated_at="2026-04-22T10:00:00Z",
            )
            store.save_memory_atom("tavern_list_memories", atom)

        # 列出记忆
        atoms = store.list_memory_atoms("tavern_list_memories")
        assert len(atoms) == 3


class TestWorldInfo:
    """世界知识测试"""

    def test_create_tavern_with_world_info(self, store: MySQLTavernStore):
        """测试创建带世界知识的酒馆"""
        from fablemap_api.core.tavern import Tavern, WorldInfoEntry

        world_info = WorldInfoEntry(
            id="wi_001",
            tavern_id="tavern_worldinfo",
            keys=["酒馆历史", "创建者"],
            content="这家酒馆建于 2026 年，由一位热爱故事的老猎人创建。",
            order=10,
            depth=4,
        )

        tavern = Tavern(
            id="tavern_worldinfo",
            name="世界知识测试酒馆",
            description="",
            lat=35.6581,
            lon=139.7016,
            owner_id="owner_001",
            created_at="2026-04-22T10:00:00Z",
            world_info=[world_info],
        )

        created = store.create_tavern(tavern)

        assert len(created.world_info) == 1
        assert created.world_info[0].keys == ["酒馆历史", "创建者"]
        assert "老猎人" in created.world_info[0].content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
