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
from .packages import TavernPackageImportRequest
from .roleplay import RoleplayClaimDecisionRequest, RoleplayClaimRequest, RoleplayConfigRequest
from .runtime import LLMConfigTestRequest, TTSRequest, VoiceConfigRequest
from .utilities import TokenCountRequest, TokenMessagesCountRequest
from .worldinfo import WorldInfoGlobalTestRequest, WorldInfoWriteRequest


class TavernCreateRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    address: str | None = None
    access: str | None = None
    password: str | None = None
    scene_prompt: str | None = None
    roleplay_mode: str | None = None
    llm_config: dict[str, Any] | None = None


class TavernUpdateRequest(FlexibleBody):
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
    llm_config: dict[str, Any] | None = None


class TavernListResponse(BaseModel):
    taverns: list[dict[str, Any]]
    count: int


class EnterTavernRequest(BaseModel):
    password: str = ""


__all__ = [
    "CharacterCardExportRequest",
    "CharacterCardParseRequest",
    "CharacterImportRequest",
    "CharacterTalkativenessRequest",
    "CharacterWriteRequest",
    "ChatRequest",
    "EnterTavernRequest",
    "ExpressionInferRequest",
    "FlexibleBody",
    "GameplaySessionRequest",
    "GameplayWriteRequest",
    "GroupChatConfigRequest",
    "GroupChatRequest",
    "LLMConfigTestRequest",
    "MemoryAtomWriteRequest",
    "MemoryImportanceRequest",
    "MemorySummarizeRequest",
    "MemoryTruncateRequest",
    "OutputRulesTestRequest",
    "OutputRulesWriteRequest",
    "PromptBlocksPreviewRequest",
    "PromptBlocksWriteRequest",
    "RuntimePresetApplyRequest",
    "RuntimePresetsWriteRequest",
    "RoleplayClaimDecisionRequest",
    "RoleplayClaimRequest",
    "RoleplayConfigRequest",
    "SpriteMapWriteRequest",
    "TTSRequest",
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
