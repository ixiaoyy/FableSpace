"""
SQLAlchemy ORM 模型定义

对应 MySQL 数据库表结构。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    JSON,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship

from .database import Base


class TavernModel(Base):
    """酒馆模型"""

    __tablename__ = "taverns"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    address = Column(String(500), default="")
    owner_id = Column(String(64), nullable=False, default="system_public_welfare")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    access = Column(SQLEnum("public", "password", "private", name="access_type"), default="public")
    password_hash = Column(String(128), default="")
    status = Column(SQLEnum("open", "closed", name="status_type"), default="closed")
    scene_prompt = Column(Text, default="")
    visit_count = Column(Integer, default=0)
    group_chat_enabled = Column(Boolean, default=False)
    group_chat_config = Column(JSON, default=dict)

    # JSON 字段存储复杂数据
    groups = Column(JSON, default=list)
    bookmarks = Column(JSON, default=list)
    chat_templates = Column(JSON, default=list)
    gameplay_definitions = Column(JSON, default=list)
    output_rules = Column(JSON, default=list)
    prompt_blocks = Column(JSON, default=list)
    runtime_presets = Column(JSON, default=list)
    active_preset_id = Column(String(64), default="")
    memory_policy = Column(JSON, default=dict)
    voice_config = Column(JSON, default=dict)

    # 关系
    characters = relationship("CharacterModel", back_populates="tavern", cascade="all, delete-orphan")
    world_info_entries = relationship("WorldInfoModel", back_populates="tavern", cascade="all, delete-orphan")
    visitors = relationship("VisitorModel", back_populates="tavern", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessageModel", back_populates="tavern", cascade="all, delete-orphan")
    memory_atoms = relationship("MemoryAtomModel", back_populates="tavern", cascade="all, delete-orphan")
    gameplay_sessions = relationship("GameplaySessionModel", back_populates="tavern", cascade="all, delete-orphan")
    llm_config = relationship("LLMConfigModel", back_populates="tavern", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_owner_id", "owner_id"),
        Index("idx_access", "access"),
        Index("idx_location", "lat, lon"),
        Index("idx_status", "status"),
    )


class CharacterModel(Base):
    """角色模型"""

    __tablename__ = "characters"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    personality = Column(Text, default="")
    scenario = Column(Text, default="")
    system_prompt = Column(Text, default="")
    first_mes = Column(Text, default="")
    mes_example = Column(Text, default="")
    alternate_greetings = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    sprites = Column(JSON, default=dict)
    avatar = Column(String(500), default="")
    appearance = Column(JSON, default=dict)
    talkativeness = Column(Float, default=0.5)

    # 关系
    tavern = relationship("TavernModel", back_populates="characters")

    __table_args__ = (Index("idx_char_tavern_id", "tavern_id"),)


class WorldInfoModel(Base):
    """世界知识模型"""

    __tablename__ = "world_info"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    keys = Column(JSON, nullable=False)
    content = Column(Text, nullable=False)
    keys_secondary = Column(JSON, default=list)
    selective = Column(Boolean, default=True)
    constant = Column(Boolean, default=False)
    depth = Column(Integer, default=4)
    order = Column(Integer, default=100)
    probability = Column(Integer, default=100)
    disable = Column(Boolean, default=False)

    # 关系
    tavern = relationship("TavernModel", back_populates="world_info_entries")

    __table_args__ = (Index("idx_wi_tavern_id", "tavern_id"),)


class VisitorModel(Base):
    """访客状态模型"""

    __tablename__ = "visitors"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visit_count = Column(Integer, default=0)
    first_visit = Column(DateTime, nullable=True)
    last_visit = Column(DateTime, nullable=True)
    relationship_strength = Column(Float, default=0.0)
    relationship_stage = Column(String(32), default="stranger")

    # 关系
    tavern = relationship("TavernModel", back_populates="visitors")

    __table_args__ = (
        Index("uk_tavern_visitor", "tavern_id", "visitor_id", unique=True),
        Index("idx_visitor_id", "visitor_id"),
    )


class ChatMessageModel(Base):
    """聊天消息模型"""

    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visitor_name = Column(String(64), default="")
    role = Column(SQLEnum("user", "assistant", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    token_count = Column(Integer, default=0)

    # 关系
    tavern = relationship("TavernModel", back_populates="chat_messages")

    __table_args__ = (
        Index("idx_cm_tavern_visitor", "tavern_id", "visitor_id"),
        Index("idx_cm_tavern_character", "tavern_id", "character_id"),
        Index("idx_cm_timestamp", "timestamp"),
    )


class MemoryAtomModel(Base):
    """记忆原子模型"""

    __tablename__ = "memory_atoms"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    scope = Column(String(32), nullable=False)
    dimension = Column(String(32), nullable=False)
    horizon = Column(String(32), nullable=False)
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    importance = Column(Float, default=0.5)
    confidence = Column(Float, default=0.5)
    source_message_ids = Column(JSON, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    pinned = Column(Boolean, default=False)
    visibility = Column(String(32), default="tavern")
    visitor_id = Column(String(64), nullable=True)
    character_id = Column(String(64), nullable=True)
    place_id = Column(String(64), nullable=True)
    created_by = Column(String(64), nullable=True)
    metadata = Column(JSON, default=dict)

    # 关系
    tavern = relationship("TavernModel", back_populates="memory_atoms")

    __table_args__ = (
        Index("idx_ma_tavern_id", "tavern_id"),
        Index("idx_ma_subject", "subject"),
        Index("idx_ma_horizon", "horizon"),
    )


class GameplaySessionModel(Base):
    """玩法会话模型"""

    __tablename__ = "gameplay_sessions"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    gameplay_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    character_id = Column(String(64), nullable=True)
    state = Column(SQLEnum("started", "in_progress", "completed", "abandoned", name="session_state"), default="started")
    current_node_id = Column(String(64), nullable=True)
    turn_count = Column(Integer, default=0)
    events = Column(JSON, default=list)
    completion = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # 关系
    tavern = relationship("TavernModel", back_populates="gameplay_sessions")

    __table_args__ = (
        Index("idx_gs_tavern_visitor", "tavern_id", "visitor_id"),
        Index("idx_gs_state", "state"),
    )


class LLMConfigModel(Base):
    """LLM 配置模型（密钥库）"""

    __tablename__ = "llm_configs"

    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), primary_key=True)
    backend = Column(String(32), nullable=False, default="openai")
    model = Column(String(128), default="gpt-4o-mini")
    api_key = Column(String(512), nullable=True)
    base_url = Column(String(512), nullable=True)
    temperature = Column(Float, default=0.8)
    max_tokens = Column(Integer, default=512)
    top_p = Column(Float, default=1.0)
    token_used = Column(Integer, default=0)

    # 关系
    tavern = relationship("TavernModel", back_populates="llm_config")