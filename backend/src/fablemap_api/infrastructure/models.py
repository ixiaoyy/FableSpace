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
    """空间模型"""

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
    roleplay_mode = Column(String(32), default="ai_only")
    layout_style = Column(String(32), nullable=False, default="lobby")
    place_type = Column(String(32), nullable=False, default="tavern")
    scene_prompt = Column(Text, default="")
    visit_count = Column(Integer, default=0)
    group_chat_enabled = Column(Boolean, default=False)
    group_chat_config = Column(JSON, default=dict)

    # JSON 字段存储复杂数据
    groups = Column(JSON, default=list)
    bookmarks = Column(JSON, default=list)
    chat_templates = Column(JSON, default=list)
    character_claims = Column(JSON, default=list)
    gameplay_definitions = Column(JSON, default=list)
    output_rules = Column(JSON, default=list)
    prompt_blocks = Column(JSON, default=list)
    runtime_presets = Column(JSON, default=list)
    skill_packs = Column(JSON, default=list)
    active_preset_id = Column(String(64), default="")
    memory_policy = Column(JSON, default=dict)
    voice_config = Column(JSON, default=dict)
    home_members = Column(JSON, default=list)
    place_relationships = Column(JSON, default=list)

    # 时间系统字段
    timezone = Column(String(64), nullable=True)  # IANA 时区，不填则自动推断
    operating_hours = Column(JSON, default=dict)  # 营业时间配置

    # 关系
    characters = relationship("CharacterModel", back_populates="tavern", cascade="all, delete-orphan")
    world_info_entries = relationship("WorldInfoModel", back_populates="tavern", cascade="all, delete-orphan")
    visitors = relationship("VisitorModel", back_populates="tavern", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessageModel", back_populates="tavern", cascade="all, delete-orphan")
    memory_atoms = relationship("MemoryAtomModel", back_populates="tavern", cascade="all, delete-orphan")
    gameplay_sessions = relationship("GameplaySessionModel", back_populates="tavern", cascade="all, delete-orphan")
    llm_config = relationship("LLMConfigModel", back_populates="tavern", uselist=False, cascade="all, delete-orphan")
    messages = relationship("TavernMessageModel", back_populates="tavern", cascade="all, delete-orphan")
    state_cards = relationship("StateCardModel", back_populates="tavern", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_owner_id", "owner_id"),
        Index("idx_access", "access"),
        Index("idx_place_type", "place_type"),
        Index("idx_location", "lat", "lon"),
        Index("idx_status", "status"),
    )


class CharacterModel(Base):
    """角色模型"""

    __tablename__ = "characters"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    personality = Column(Text, default="")
    scenario = Column(Text, default="")
    gender = Column(String(32), default="unspecified")
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
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), primary_key=True)
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
    gender = Column(String(32), default="unspecified")
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
    metadata_ = Column("metadata", JSON, default=dict)

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


class NpcPublicBondModel(Base):
    """NPC 公开关系模型"""

    __tablename__ = "npc_public_bonds"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    bond_type = Column(String(32), nullable=False)
    status = Column(String(16), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    approved_by = Column(String(64), nullable=True)
    revoked_by = Column(String(64), nullable=True)
    visitor_note = Column(Text, nullable=True)
    owner_note = Column(Text, nullable=True)
    revoke_reason = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("idx_npb_tavern_character", "tavern_id", "character_id", "status"),
        Index("idx_npb_visitor", "visitor_id"),
        Index("idx_npb_character_status", "character_id", "status"),
    )


class NpcPublicBondQueueModel(Base):
    """NPC 公开关系等待队列模型"""

    __tablename__ = "npc_public_bond_queues"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    bond_type = Column(String(32), nullable=False)
    position = Column(Integer, nullable=False, default=1)
    status = Column(String(16), nullable=False, default="waiting")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    promoted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_npbq_character_status_pos", "character_id", "status", "position"),
        Index("idx_npbq_visitor", "visitor_id"),
    )


class TavernMessageModel(Base):
    """空间留言模型"""

    __tablename__ = "tavern_messages"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visitor_nickname = Column(String(64), default="匿名")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_pinned = Column(Boolean, default=False)
    parent_id = Column(String(64), nullable=True)

    # 关系
    tavern = relationship("TavernModel")

    __table_args__ = (
        Index("idx_tm_tavern_created", "tavern_id", "created_at"),
        Index("idx_tm_parent", "parent_id"),
    )


class StateCardModel(Base):
    """Continuity state-card model."""

    __tablename__ = "state_cards"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(32), nullable=False, default="pending")
    category = Column(String(32), nullable=False, default="event_log")
    canon_scope = Column(String(32), nullable=False, default="visitor")
    visitor_id = Column(String(64), default="")
    character_id = Column(String(64), default="")
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    tavern = relationship("TavernModel", back_populates="state_cards")

    __table_args__ = (
        Index("idx_sc_tavern_status", "tavern_id", "status"),
        Index("idx_sc_tavern_visitor", "tavern_id", "visitor_id"),
        Index("idx_sc_updated", "updated_at"),
    )


class RelationshipEdgeModel(Base):
    """Owner-governed relationship graph edge.

    Cross-owner edges are stored as source-side perspectives.  The target owner
    is not forced to accept or display the relation unless they create/confirm
    their own edge.
    """

    __tablename__ = "relationship_edges"

    id = Column(String(64), primary_key=True)
    source_owner_id = Column(String(64), nullable=False, default="")
    source_tavern_id = Column(String(64), nullable=False, default="")
    source_node_type = Column(String(32), nullable=False)
    source_node_id = Column(String(64), nullable=False)
    target_owner_id = Column(String(64), nullable=False, default="")
    target_tavern_id = Column(String(64), nullable=False, default="")
    target_node_type = Column(String(32), nullable=False)
    target_node_id = Column(String(64), nullable=False)
    behavior_type = Column(String(32), nullable=False)
    display_name = Column(String(255), default="")
    description = Column(Text, default="")
    strength_preset = Column(String(32), nullable=False, default="normal")
    status = Column(String(32), nullable=False, default="pending")
    governance_mode = Column(String(32), nullable=False, default="manual")
    confirmed_by = Column(String(64), default="")
    confirmed_by_type = Column(String(32), default="")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("idx_rel_edge_source", "source_node_type", "source_node_id", "status"),
        Index("idx_rel_edge_target", "target_node_type", "target_node_id", "status"),
        Index("idx_rel_edge_source_owner", "source_owner_id", "status"),
        Index("idx_rel_edge_behavior", "behavior_type", "strength_preset"),
    )


class VisitorRelationshipProjectionModel(Base):
    """Visitor-private dual-axis relationship projection for one graph node."""

    __tablename__ = "visitor_relationship_projections"

    visitor_id = Column(String(64), primary_key=True)
    node_type = Column(String(32), primary_key=True)
    node_id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), nullable=False, default="")
    affinity = Column(Float, nullable=False, default=0.0)
    hostility = Column(Float, nullable=False, default=0.0)
    last_event_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("idx_rel_projection_tavern", "tavern_id"),
        Index("idx_rel_projection_node", "node_type", "node_id"),
    )


class OwnerConfigModel(Base):
    """Owner-level private configuration."""

    __tablename__ = "owner_configs"

    owner_id = Column(String(64), primary_key=True)
    default_llm = Column(JSON, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class VisitorNoteModel(Base):
    """Owner-visible visitor feedback, not a public message board."""

    __tablename__ = "visitor_notes"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visitor_nickname = Column(String(64), default="旅人")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    visibility = Column(String(32), nullable=False, default="owner_only")

    __table_args__ = (
        Index("idx_vn_tavern_created", "tavern_id", "created_at"),
        Index("idx_vn_visitor", "visitor_id"),
    )


class NotificationModel(Base):
    """Persistent user notification."""

    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), nullable=False)
    notification_type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    read = Column(Boolean, nullable=False, default=False)
    tavern_id = Column(String(64), nullable=True)
    tavern_name = Column(String(255), nullable=True)

    __table_args__ = (
        Index("idx_notif_user_created", "user_id", "created_at"),
        Index("idx_notif_user_read", "user_id", "read"),
    )


class NeighborhoodRumorModel(Base):
    """Persistent neighborhood rumor."""

    __tablename__ = "neighborhood_rumors"

    id = Column(String(64), primary_key=True)
    source_tavern_id = Column(String(64), nullable=False)
    target_tavern_id = Column(String(64), nullable=False)
    target_tavern_name = Column(String(255), default="")
    character_id = Column(String(64), nullable=False)
    character_name = Column(String(255), default="")
    rumor_text = Column(Text, nullable=False)
    trigger_type = Column(String(32), nullable=False, default="keyword")
    trigger_keywords = Column(JSON, default=list)
    weight = Column(Float, default=1.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_rumor_source", "source_tavern_id", "is_active"),
        Index("idx_rumor_target", "target_tavern_id"),
        Index("idx_rumor_created", "created_at"),
    )


class HomeModel(Base):
    """Legacy Home API persistence model."""

    __tablename__ = "homes"

    id = Column(String(64), primary_key=True)
    owner_id = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    avatar = Column(String(500), default="")
    cover_image = Column(String(500), default="")
    theme = Column(String(64), default="cozy")
    visit_settings = Column(JSON, default=dict)
    members = Column(JSON, default=list)
    status = Column(String(32), nullable=False, default="hidden")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("idx_home_owner", "owner_id"),
        Index("idx_home_status", "status"),
    )


class HomeVisitModel(Base):
    """Legacy Home visit/message persistence model."""

    __tablename__ = "home_visits"

    id = Column(String(64), primary_key=True)
    home_id = Column(String(64), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visited_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    stay_duration = Column(Integer, default=0)
    left_message = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("idx_home_visit_home", "home_id", "visited_at"),
        Index("idx_home_visit_visitor", "visitor_id"),
    )


class WritebackStateModel(Base):
    """Persistent legacy writeback world state.

    The old writeback surface stores a dynamic nested state document.  Keep the
    document shape intact for compatibility, but persist it in the configured
    database instead of a JSON file.
    """

    __tablename__ = "writeback_states"

    key = Column(String(64), primary_key=True)
    state = Column(JSON, default=dict)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class TerritoryModel(Base):
    """领地模型"""

    __tablename__ = "territories"

    id = Column(String(64), primary_key=True)
    owner_id = Column(String(64), nullable=False)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(32), nullable=False)  # TerritoryType
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    radius = Column(Float, nullable=False)  # 米
    status = Column(String(32), nullable=False, default="claimed")  # TerritoryStatus
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_territory_owner", "owner_id"),
        Index("idx_territory_tavern", "tavern_id"),
        Index("idx_territory_type", "type"),
        Index("idx_territory_status", "status"),
        Index("idx_territory_location", "center_lat", "center_lon"),
    )
