from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .chat import CharacterTalkativenessRequest, ChatRequest, GroupChatConfigRequest, GroupChatRequest
from .characters import (
    CharacterCardExportRequest,
    CharacterCardParseRequest,
    CharacterImportRequest,
    CharacterWriteRequest,
    ExpressionInferRequest,
    SpriteMapWriteRequest,
)
from .common import FlexibleBody
from .gameplay import GameplaySessionRequest, GameplayWriteRequest
from .memories import MemoryAtomWriteRequest, MemoryImportanceRequest, MemorySummarizeRequest, MemoryTruncateRequest
from .owner_config import (
    OutputRulesTestRequest,
    OutputRulesWriteRequest,
    PromptBlocksPreviewRequest,
    PromptBlocksWriteRequest,
    RuntimePresetApplyRequest,
    RuntimePresetsWriteRequest,
    WorldInfoTestRequest,
)
from .packages import SpacePackageImportRequest, TavernPackageImportRequest
from .roleplay import RoleplayClaimDecisionRequest, RoleplayClaimRequest, RoleplayConfigRequest
from .runtime import LLMConfigTestRequest, TTSRequest, VoiceConfigRequest
from .utilities import TokenCountRequest, TokenMessagesCountRequest
from .worldinfo import WorldInfoGlobalTestRequest, WorldInfoWriteRequest


class SpaceCreateRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    address: str | None = None
    access: str | None = None
    password: str | None = None
    scene_prompt: str | None = None
    roleplay_mode: str | None = None
    layout_style: str | None = None
    place_type: str | None = None
    llm_config: dict[str, Any] | None = None
    timezone: str | None = None  # IANA 时区
    operating_hours: dict[str, Any] | None = None  # 营业时间配置
    home_members: list[dict[str, Any]] | None = None
    place_relationships: list[dict[str, Any]] | None = None


class SpaceUpdateRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    address: str | None = None
    access: str | None = None
    password: str | None = None
    status: str | None = None
    scene_prompt: str | None = None
    roleplay_mode: str | None = None
    layout_style: str | None = None
    place_type: str | None = None
    llm_config: dict[str, Any] | None = None
    timezone: str | None = None  # IANA 时区
    operating_hours: dict[str, Any] | None = None  # 营业时间配置
    home_members: list[dict[str, Any]] | None = None
    place_relationships: list[dict[str, Any]] | None = None


class SpaceListResponse(BaseModel):
    spaces: list[dict[str, Any]]
    taverns: list[dict[str, Any]] | None = None
    count: int
    total: int | None = None
    limit: int | None = None
    offset: int = 0
    has_more: bool = False


class SpaceStatusInfo(BaseModel):
    """空间时间状态信息"""
    timezone: str | None = None
    local_time_display: str | None = None  # "22:47"
    is_open: bool = True
    open_at: str | None = None
    close_at: str | None = None


class HomeMemberWriteRequest(FlexibleBody):
    id: str | None = None
    name: str | None = None
    display_name: str | None = None
    member_type: str | None = None
    speech_mode: str | None = None
    description: str | None = None
    avatar: str | None = None
    character_id: str | None = None
    metadata: dict[str, Any] | None = None


class SchoolEnrollmentRequest(FlexibleBody):
    member_id: str | None = None
    school_tavern_id: str | None = None
    display_name: str | None = None
    note: str | None = None


class PlaceRelationshipRequest(FlexibleBody):
    member_id: str | None = None
    target_space_id: str | None = None
    school_tavern_id: str | None = None
    relation_type: str | None = None
    display_name: str | None = None
    source_role: str | None = None
    target_role: str | None = None
    note: str | None = None


class RelationshipDecisionRequest(FlexibleBody):
    status: str | None = None
    note: str | None = None


class MetricsResponse(BaseModel):
    """空间运营数据指标"""
    space_id: str
    token_usage: int
    total_visits: int
    unique_visitors: int
    total_messages: int
    npc_rankings: list[dict[str, Any]]  # [{character_id, character_name, message_count, last_interaction}]
    peak_hours: list[int]  # 0-23 小时统计
    peak_days: list[dict[str, Any]]  # [{date, visit_count}]


class EnterSpaceRequest(BaseModel):
    password: str = ""
    visitor_gender: str = ""


class VisitorNoteCreateRequest(FlexibleBody):
    """创建给店主的访客反馈请求"""
    content: str
    visitor_nickname: str = "旅人"


class VisitorNoteListResponse(BaseModel):
    """店主可见访客反馈列表响应"""
    notes: list[dict[str, Any]]
    count: int


TavernCreateRequest = SpaceCreateRequest
TavernUpdateRequest = SpaceUpdateRequest
TavernListResponse = SpaceListResponse
TavernStatusInfo = SpaceStatusInfo
EnterTavernRequest = EnterSpaceRequest


__all__ = [
    "CharacterCardExportRequest",
    "CharacterCardParseRequest",
    "CharacterImportRequest",
    "CharacterTalkativenessRequest",
    "CharacterWriteRequest",
    "ChatRequest",
    "EnterSpaceRequest",
    "EnterTavernRequest",
    "ExpressionInferRequest",
    "FlexibleBody",
    "GameplaySessionRequest",
    "GameplayWriteRequest",
    "GroupChatConfigRequest",
    "GroupChatRequest",
    "HomeMemberWriteRequest",
    "LLMConfigTestRequest",
    "MemoryAtomWriteRequest",
    "MemoryImportanceRequest",
    "MemorySummarizeRequest",
    "MemoryTruncateRequest",
    "MetricsResponse",
    "OutputRulesWriteRequest",
    "PlaceRelationshipRequest",
    "PromptBlocksPreviewRequest",
    "PromptBlocksWriteRequest",
    "RuntimePresetApplyRequest",
    "RuntimePresetsWriteRequest",
    "RelationshipDecisionRequest",
    "RoleplayClaimDecisionRequest",
    "RoleplayClaimRequest",
    "RoleplayConfigRequest",
    "SpriteMapWriteRequest",
    "SchoolEnrollmentRequest",
    "SpaceStatusInfo",
    "TavernStatusInfo",
    "VisitorNoteCreateRequest",
    "VisitorNoteListResponse",
    "TTSRequest",
    "SpaceCreateRequest",
    "SpaceListResponse",
    "SpacePackageImportRequest",
    "SpaceUpdateRequest",
    "TavernCreateRequest",
    "TavernListResponse",
    "TavernPackageImportRequest",
    "TavernUpdateRequest",
    "TokenCountRequest",
    "TokenMessagesCountRequest",
    "VoiceConfigRequest",
    "WorldInfoGlobalTestRequest",
    "WorldInfoTestRequest",
    "WorldInfoWriteRequest",
]
