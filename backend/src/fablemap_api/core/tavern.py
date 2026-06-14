"""
FableMap Tavern — 空间 CRUD 核心

提供空间(Tavern)的创建、读取、更新、删除操作。
支持 SillyTavern Character Card V2 格式的角色导入。
"""

from __future__ import annotations

import json
import os
import uuid
import hashlib
import threading
import time
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from fablemap_api.core.default_taverns import (
    DEFAULT_PUBLIC_WELFARE_MODEL,
    DEFAULT_PUBLIC_WELFARE_OWNER_ID,
    DEFAULT_PUBLIC_WELFARE_TAVERN_IDS,
    default_public_welfare_taverns,
)
from fablemap_api.core.memory import MemoryAtom
from fablemap_api.core.skill_packs import normalize_skill_pack_settings
from fablemap_api.core.time_context import build_time_context
from fablemap_api.core.cultivation_logic import is_cultivation_tavern, calculate_cultivation_receipt_with_card

# ─────────────────────────────────────────
# 类型别名
# ─────────────────────────────────────────

TavernId = str
CharacterId = str
VisitorId = str
UserId = str

ROLEPLAY_MODES = {"ai_only", "hybrid"}
ROLEPLAY_CLAIM_STATUSES = {"pending", "approved", "rejected", "revoked"}
TAVERN_LAYOUT_STYLES = {"lobby", "npc-chat", "quest-play", "hybrid-room"}
PLACE_TYPES = {
    "tavern",
    "cafe",
    "milk-tea-shop",
    "restaurant",
    "convenience-store",
    "bookstore",
    "school",
    "hospital",
    "board-game",
    "home",
}
HOME_MEMBER_TYPES = {"conversational_character", "silent_member", "display_object"}
HOME_MEMBER_SPEECH_MODES = {"character", "silent", "display"}
PLACE_RELATIONSHIP_TYPES = {
    "school_enrollment",
    "care_link",
    "membership",
    "work_affiliation",
    "story_link",
}
PLACE_RELATIONSHIP_STATUSES = {"pending", "approved", "rejected", "revoked"}
GENDER_VALUES = {"unspecified", "female", "male", "nonbinary", "other"}
SPECIAL_TYPES = {"", "cultivation", "divination"}
SYSTEM_TAVERN_OWNER_PREFIX = "system_"
SYSTEM_PUBLIC_WELFARE_LLM_CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "system_public_welfare_llm.json"
SYSTEM_PUBLIC_WELFARE_MANAGED_FREE_MODELS = {
    "deepseek-v4-flash-free",
    "opencode/deepseek-v4-flash-free",
    "glm-4.7-flash",
    "kilo-auto/free",
}


# ─────────────────────────────────────────
# 数据模型
# ─────────────────────────────────────────

# SillyTavern 标准表情列表（27 个）
STANDARD_EXPRESSIONS = [
    "admiration",
    "amusement",
    "anger",
    "annoyance",
    "approval",
    "caring",
    "confusion",
    "curiosity",
    "desire",
    "disappointment",
    "disapproval",
    "disgust",
    "embarrassment",
    "excitement",
    "fear",
    "gratitude",
    "grief",
    "joy",
    "love",
    "nervousness",
    "optimism",
    "pride",
    "realization",
    "relief",
    "remorse",
    "sadness",
    "surprise",
    "neutral",
]

# 表情分类（用于 UI 展示）
EXPRESSION_CATEGORIES = {
    "positive": ["joy", "admiration", "amusement", "approval", "caring", "desire", "excitement", "gratitude", "love", "optimism", "pride", "relief"],
    "negative": ["anger", "annoyance", "confusion", "disappointment", "disapproval", "disgust", "embarrassment", "fear", "grief", "nervousness", "remorse", "sadness"],
    "neutral": ["curiosity", "realization", "surprise", "neutral"],
}


@dataclass
class TavernSpriteSet:
    """
    角色表情精灵图集合

    支持完整的 SillyTavern 27 个表情 + 自定义表情。
    每个表情对应一张立绘图片 URL。

    格式示例（JSON）：
    {
        "neutral": "/sprites/char1/neutral.png",
        "joy": "/sprites/char1/joy.png",
        "anger": "/sprites/char1/anger.png",
        ...
    }
    """

    def __init__(self, data: dict[str, str] | None = None):
        # 存储所有表情的 URL，key 为表情名，value 为 URL
        self._sprites: dict[str, str] = {}
        if data:
            for k, v in data.items():
                if v:  # 只存储非空 URL
                    self._sprites[k] = v

    def __getattr__(self, name: str) -> str | None:
        """支持 dict.key 访问"""
        if name.startswith("_"):
            raise AttributeError(name)
        return self._sprites.get(name)

    def __setattr__(self, name: str, value) -> None:
        if name.startswith("_"):
            object.__setattr__(self, name, value)
        else:
            self._sprites[name] = value

    def get(self, expression: str, default: str | None = None) -> str | None:
        """获取指定表情的图片 URL"""
        return self._sprites.get(expression, default)

    def set(self, expression: str, url: str) -> None:
        """设置表情图片"""
        self._sprites[expression] = url

    def remove(self, expression: str) -> None:
        """移除表情图片"""
        self._sprites.pop(expression, None)

    def list_expressions(self) -> list[str]:
        """列出所有已配置的表情"""
        return sorted(self._sprites.keys())

    def has_expression(self, expression: str) -> bool:
        """检查是否配置了某个表情"""
        return expression in self._sprites

    def get_default(self) -> tuple[str, str | None]:
        """获取默认表情（优先 joy，然后 neutral）"""
        for default in ("joy", "neutral"):
            if default in self._sprites:
                return default, self._sprites[default]
        if self._sprites:
            first_key = next(iter(self._sprites))
            return first_key, self._sprites[first_key]
        return "neutral", None

    def to_dict(self) -> dict[str, str]:
        """序列化为 dict"""
        return dict(self._sprites)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> TavernSpriteSet:
        return cls(d)

    def to_sprite_map(self) -> dict[str, str]:
        """返回完整的表情映射，包含所有标准表情（未配置的为 null）"""
        result = {}
        for expr in STANDARD_EXPRESSIONS:
            result[expr] = self._sprites.get(expr)
        return result


@dataclass
class NpcSimulationState:
    """NPC 仿真生理与心理状态"""
    energy: float = 100.0
    hunger: float = 100.0
    thirst: float = 100.0
    social: float = 100.0
    entertainment: float = 100.0
    mood: float = 50.0          # 0=极度沮丧 50=中性 100=非常开心
    last_tick_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "energy": self.energy,
            "hunger": self.hunger,
            "thirst": self.thirst,
            "social": self.social,
            "entertainment": self.entertainment,
            "mood": self.mood,
            "last_tick_at": self.last_tick_at,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> NpcSimulationState:
        if not d:
            return cls()
        return cls(
            energy=float(d.get("energy", 100.0)),
            hunger=float(d.get("hunger", 100.0)),
            thirst=float(d.get("thirst", 100.0)),
            social=float(d.get("social", 100.0)),
            entertainment=float(d.get("entertainment", 100.0)),
            mood=float(d.get("mood", 50.0)),
            last_tick_at=d.get("last_tick_at", ""),
        )


@dataclass
class TavernCharacter:
    """空间角色 — 兼容 SillyTavern Character Card V2"""
    id: str
    tavern_id: str
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    gender: str = "unspecified"
    system_prompt: str = ""
    first_mes: str = ""
    mes_example: str = ""
    alternate_greetings: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    sprites: TavernSpriteSet | None = None
    avatar: str = ""  # 默认立绘（用于聊天界面显示）
    appearance: dict[str, Any] = field(default_factory=dict)
    talkativeness: float = 0.5  # 0.0–1.0，群聊时说话频率
    hobbies: list[str] = field(default_factory=list)
    
    # ── 仿真与流动 (v0.9) ──────────────
    current_tavern_id: str = ""
    home_tavern_id: str = ""
    simulation_state: NpcSimulationState = field(default_factory=NpcSimulationState)
    traits: list[str] = field(default_factory=list)
    social_memories: list[dict] = field(default_factory=list) # [{content, source_name, timestamp}]
    is_visitor: bool = False  # 是否为外来访客（流动 NPC）
    # ── Mobility & Geo (v1.2) ──────────
    lat: float | None = None
    lon: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "name": self.name,
            "description": self.description,
            "personality": self.personality,
            "scenario": self.scenario,
            "gender": _normalize_gender(self.gender),
            "system_prompt": self.system_prompt,
            "first_mes": self.first_mes,
            "mes_example": self.mes_example,
            "alternate_greetings": self.alternate_greetings,
            "tags": self.tags,
            "sprites": self.sprites.to_dict() if self.sprites else {},
            "avatar": self.avatar or (self.sprites.get("neutral") if self.sprites else ""),
            "appearance": deepcopy(self.appearance) if isinstance(self.appearance, dict) else {},
            "talkativeness": _normalize_talkativeness(self.talkativeness),
            "hobbies": list(self.hobbies) if self.hobbies else [],
            "current_tavern_id": self.current_tavern_id or self.tavern_id,
            "home_tavern_id": self.home_tavern_id or self.tavern_id,
            "lat": self.lat,
            "lon": self.lon,
            "simulation_state": self.simulation_state.to_dict(),
            "traits": list(self.traits),
            "social_memories": self.social_memories,
            "is_visitor": self.is_visitor,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> TavernCharacter:
        sprites = None
        sprites_data = d.get("sprites", {})
        if sprites_data:
            if isinstance(sprites_data, dict):
                sprites = TavernSpriteSet(sprites_data)
            else:
                # 兼容旧格式（dataclass）
                sprites = TavernSpriteSet.from_dict(sprites_data)
        return cls(
            id=d["id"],
            tavern_id=d.get("tavern_id", ""),
            name=d["name"],
            description=d.get("description", ""),
            personality=d.get("personality", ""),
            scenario=d.get("scenario", ""),
            gender=_normalize_gender(d.get("gender")),
            system_prompt=d.get("system_prompt", ""),
            first_mes=d.get("first_mes", ""),
            mes_example=d.get("mes_example", ""),
            alternate_greetings=d.get("alternate_greetings", []),
            tags=d.get("tags", []),
            sprites=sprites,
            avatar=d.get("avatar", ""),
            appearance=_normalize_character_appearance(d.get("appearance")),
            talkativeness=_normalize_talkativeness(d.get("talkativeness", 0.5)),
            hobbies=d.get("hobbies", []),
            current_tavern_id=d.get("current_tavern_id", d.get("tavern_id", "")),
            home_tavern_id=d.get("home_tavern_id", d.get("tavern_id", "")),
            simulation_state=NpcSimulationState.from_dict(d.get("simulation_state", {})),
            traits=d.get("traits", []),
            social_memories=d.get("social_memories", []),
            is_visitor=bool(d.get("is_visitor", False)),
        )


def _entry_character_payload(character: TavernCharacter) -> dict[str, Any]:
    """Public-safe character shape for the tavern entry page."""
    return {
        "id": character.id,
        "tavern_id": character.tavern_id,
        "name": character.name,
        "description": character.description,
        "personality": character.personality,
        "scenario": character.scenario,
        "gender": _normalize_gender(character.gender),
        "first_mes": character.first_mes,
        "tags": list(character.tags),
        "sprites": character.sprites.to_dict() if character.sprites else {},
        "avatar": character.avatar or (character.sprites.get("neutral") if character.sprites else ""),
        "appearance": deepcopy(character.appearance) if isinstance(character.appearance, dict) else {},
        "talkativeness": _normalize_talkativeness(character.talkativeness),
        "hobbies": list(character.hobbies) if character.hobbies else [],
        "current_tavern_id": character.current_tavern_id or character.tavern_id,
        "is_visitor": character.is_visitor,
        "lat": character.lat,
        "lon": character.lon,
    }


def _entry_gameplay_payload(gameplay: dict[str, Any]) -> dict[str, Any]:
    """Small published gameplay summary for first-render task hints."""
    return {
        key: deepcopy(gameplay[key])
        for key in ("id", "name", "title", "description", "summary", "status", "icon")
        if key in gameplay
    }


@dataclass
class WorldInfoEntry:
    """世界知识条目 — 关键词触发的上下文注入"""
    id: str
    tavern_id: str
    keys: list[str]
    content: str = ""
    keys_secondary: list[str] = field(default_factory=list)
    selective: bool = True
    constant: bool = False
    depth: int = 4
    order: int = 100
    probability: int = 100
    disable: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "keys": self.keys,
            "content": self.content,
            "keys_secondary": self.keys_secondary,
            "selective": self.selective,
            "constant": self.constant,
            "depth": self.depth,
            "order": self.order,
            "insertion_order": self.order,
            "probability": self.probability,
            "disable": self.disable,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> WorldInfoEntry:
        return cls(
            id=d["id"],
            tavern_id=d.get("tavern_id", ""),
            keys=d.get("keys", []),
            content=d.get("content", ""),
            keys_secondary=d.get("keys_secondary", []),
            selective=d.get("selective", True),
            constant=d.get("constant", False),
            depth=d.get("depth", 4),
            order=d.get("order", d.get("insertion_order", 100)),
            probability=d.get("probability", 100),
            disable=d.get("disable", False),
        )


@dataclass
class LLMConfig:
    """LLM 配置 — 空间主人提供的 AI 后端配置"""
    backend: str = "openai"
    model: str = "gpt-4o-mini"
    api_key: str = ""
    base_url: str = ""
    temperature: float = 0.8
    max_tokens: int = 512
    top_p: float = 1.0
    token_used: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "backend": self.backend,
            "model": self.model,
            "api_key": "",  # 不返回给前端
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "token_used": self.token_used,
        }

    def to_dict_private(self) -> dict[str, Any]:
        """包含 api_key 的私有版本，仅用于内部存储"""
        return {
            "backend": self.backend,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "token_used": self.token_used,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> LLMConfig:
        return cls(
            backend=d.get("backend", "openai"),
            model=d.get("model", "gpt-4o-mini"),
            api_key=d.get("api_key", ""),
            base_url=d.get("base_url", ""),
            temperature=d.get("temperature", 0.8),
            max_tokens=d.get("max_tokens", 512),
            top_p=d.get("top_p", 1.0),
            token_used=d.get("token_used", 0),
        )

    def is_configured(self) -> bool:
        """检查是否已配置有效的 LLM"""
        no_external_backend = {"rules", "rule_based", "public_welfare"}
        if str(self.backend or "").strip().lower() in no_external_backend:
            return False
        local_no_key_backends = {"ollama", "local", "localai"}
        if not self.backend:
            return False
        if self.api_key:
            return True
        return str(self.backend or "").strip().lower() in local_no_key_backends and bool(self.base_url)


def _is_system_or_public_welfare_tavern_data(value: Any, *, tavern_id: str = "") -> bool:
    """Return true for current built-in/developed spaces that use system公益 LLM."""
    if isinstance(value, dict):
        owner_id = str(value.get("owner_id") or "").strip()
        candidate_id = str(value.get("id") or tavern_id or "").strip()
    else:
        owner_id = str(getattr(value, "owner_id", "") or "").strip()
        candidate_id = str(getattr(value, "id", "") or tavern_id or "").strip()
    return (
        owner_id == DEFAULT_PUBLIC_WELFARE_OWNER_ID
        or owner_id.startswith(SYSTEM_TAVERN_OWNER_PREFIX)
        or candidate_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS
    )


def _public_welfare_rules_fallback_llm_config(*, token_used: int = 0) -> LLMConfig:
    """Local no-key fallback for system/public-welfare taverns."""
    return LLMConfig(
        backend="rules",
        model=DEFAULT_PUBLIC_WELFARE_MODEL,
        api_key="",
        base_url="",
        temperature=0.0,
        max_tokens=512,
        top_p=1.0,
        token_used=token_used,
    )


def _versioned_system_public_welfare_llm_config(
    *,
    include_api_key: bool = True,
    token_used: int = 0,
) -> LLMConfig | None:
    """Load the repo-versioned early-test LLM config for system/public-welfare taverns."""
    try:
        payload = json.loads(SYSTEM_PUBLIC_WELFARE_LLM_CONFIG_PATH.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or payload.get("enabled") is False:
        return None
    llm_payload = payload.get("llm_config")
    if not isinstance(llm_payload, dict):
        return None
    llm_payload = dict(llm_payload)
    api_key_env = str(llm_payload.get("api_key_env") or "").strip()
    if api_key_env and not str(llm_payload.get("api_key") or "").strip():
        llm_payload["api_key"] = os.getenv(api_key_env, "")
    config = LLMConfig.from_dict(llm_payload)
    if not config.is_configured():
        return None
    if not include_api_key:
        config.api_key = ""
    config.token_used = token_used
    return config


def _should_hydrate_system_public_welfare_llm_choice(candidate: LLMConfig, versioned: LLMConfig) -> bool:
    """Hydrate public-welfare rules/unconfigured markers or the explicit versioned model."""
    builtin_rules_backends = {"rules", "rule_based", "public_welfare"}
    candidate_backend = str(candidate.backend or "").strip().lower()
    if candidate_backend in builtin_rules_backends or not candidate.is_configured():
        return True
    candidate_model = str(candidate.model or "").strip().lower()
    versioned_model = str(versioned.model or "").strip().lower()
    if (
        candidate_model in SYSTEM_PUBLIC_WELFARE_MANAGED_FREE_MODELS
        and versioned_model in SYSTEM_PUBLIC_WELFARE_MANAGED_FREE_MODELS
    ):
        return True
    return bool(candidate_model and versioned_model and candidate_model == versioned_model)


def _hydrate_system_public_welfare_llm_config(
    value: Any,
    candidate: LLMConfig,
    *,
    tavern_id: str = "",
    include_api_key: bool = True,
) -> LLMConfig:
    """Fill repo-versioned system公益 LLM credentials for built-in/public-welfare spaces."""
    if not _is_system_or_public_welfare_tavern_data(value, tavern_id=tavern_id):
        return candidate
    versioned = _versioned_system_public_welfare_llm_config(
        include_api_key=include_api_key,
        token_used=candidate.token_used,
    )
    if not versioned or not _should_hydrate_system_public_welfare_llm_choice(candidate, versioned):
        return candidate
    hydrated = deepcopy(versioned)
    hydrated.temperature = candidate.temperature
    hydrated.max_tokens = candidate.max_tokens
    hydrated.top_p = candidate.top_p
    hydrated.token_used = candidate.token_used
    return hydrated


def _system_public_welfare_rules_fallback(
    value: Any,
    *,
    tavern_id: str = "",
    token_used: int = 0,
    include_api_key: bool = True,
) -> LLMConfig | None:
    if not _is_system_or_public_welfare_tavern_data(value, tavern_id=tavern_id):
        return None
    versioned = _versioned_system_public_welfare_llm_config(
        include_api_key=include_api_key,
        token_used=token_used,
    )
    if versioned:
        return versioned
    return _public_welfare_rules_fallback_llm_config(token_used=token_used)


@dataclass
class VoiceConfig:
    """语音配置 — TTS/STT 语音合成与识别配置"""
    enabled: bool = False
    tts_provider: str = "elevenlabs"
    tts_voice: str = ""
    tts_model: str = ""
    tts_speed: float = 1.0
    tts_language: str = ""
    stt_provider: str = "browser"  # 'browser' | 'whisper' | 'fasterwhisper'
    stt_model: str = "base"
    auto_play: bool = False  # 自动播放 AI 语音

    def to_dict(self) -> dict[str, Any]:
        """公开版本，不包含敏感信息"""
        return {
            "enabled": self.enabled,
            "tts_provider": self.tts_provider,
            "tts_voice": self.tts_voice,
            "tts_model": self.tts_model,
            "tts_speed": self.tts_speed,
            "tts_language": self.tts_language,
            "stt_provider": self.stt_provider,
            "stt_model": self.stt_model,
            "auto_play": self.auto_play,
        }

    def to_dict_private(self) -> dict[str, Any]:
        """私有版本"""
        return self.to_dict()

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> VoiceConfig:
        return cls(
            enabled=d.get("enabled", False),
            tts_provider=d.get("tts_provider", "elevenlabs"),
            tts_voice=d.get("tts_voice", ""),
            tts_model=d.get("tts_model", ""),
            tts_speed=d.get("tts_speed", 1.0),
            tts_language=d.get("tts_language", ""),
            stt_provider=d.get("stt_provider", "browser"),
            stt_model=d.get("stt_model", "base"),
            auto_play=d.get("auto_play", False),
        )


@dataclass
class VisitorState:
    """访客状态 — 访客与空间的关系"""
    visitor_id: str
    tavern_id: str
    gender: str = "unspecified"
    visit_count: int = 0
    first_visit: str | None = None
    last_visit: str | None = None
    relationship_strength: float = 0.0
    relationship_stage: str = "stranger"
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "visitor_id": self.visitor_id,
            "tavern_id": self.tavern_id,
            "gender": _normalize_gender(self.gender),
            "visit_count": self.visit_count,
            "first_visit": self.first_visit,
            "last_visit": self.last_visit,
            "relationship": {
                "strength": self.relationship_strength,
                "stage": self.relationship_stage,
            },
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> VisitorState:
        rel = d.get("relationship", {})
        return cls(
            visitor_id=d["visitor_id"],
            tavern_id=d.get("tavern_id", ""),
            gender=_normalize_gender(d.get("gender", d.get("visitor_gender"))),
            visit_count=d.get("visit_count", 0),
            first_visit=d.get("first_visit"),
            last_visit=d.get("last_visit"),
            relationship_strength=rel.get("strength", 0.0),
            relationship_stage=rel.get("stage", "stranger"),
            metadata=d.get("metadata", {}),
        )


@dataclass
class Tavern:
    """空间 — 地图上的一个可进入场所"""
    id: str
    name: str
    description: str
    lat: float
    lon: float
    address: str = ""
    owner_id: str = ""
    created_at: str = ""
    access: str = "public"  # 'public' | 'password' | 'private'
    password_hash: str = ""
    status: str = "open"  # 'open' | 'closed'
    roleplay_mode: str = "ai_only"  # 'ai_only' | 'hybrid'
    layout_style: str = "lobby"  # 'lobby' | 'npc-chat' | 'quest-play' | 'hybrid-room'
    place_type: str = "tavern"  # 'tavern' | 'cafe' | ... | 'hospital' | 'home'
    special_type: str = ""  # '' | 'cultivation'
    characters: list[TavernCharacter] = field(default_factory=list)
    character_claims: list[dict[str, Any]] = field(default_factory=list)
    world_info: list[WorldInfoEntry] = field(default_factory=list)
    groups: list[dict[str, Any]] = field(default_factory=list)
    bookmarks: list[dict[str, Any]] = field(default_factory=list)
    chat_templates: list[dict[str, Any]] = field(default_factory=list)
    gameplay_definitions: list[dict[str, Any]] = field(default_factory=list)
    output_rules: list[dict[str, Any]] = field(default_factory=list)
    prompt_blocks: list[dict[str, Any]] = field(default_factory=list)
    runtime_presets: list[dict[str, Any]] = field(default_factory=list)
    skill_packs: list[dict[str, Any]] = field(default_factory=list)
    engagement_config: dict[str, Any] = field(default_factory=dict)
    active_preset_id: str = ""
    memory_policy: dict[str, Any] = field(default_factory=dict)
    scene_prompt: str = ""
    llm_config: LLMConfig = field(default_factory=LLMConfig)
    voice_config: VoiceConfig = field(default_factory=VoiceConfig)
    visit_count: int = 0
    group_chat_enabled: bool = False  # 是否启用群聊模式
    group_chat_config: dict[str, Any] = field(default_factory=dict)  # { strategy, max_responses_per_turn, min_interval, ... }
    # 时间系统字段
    timezone: str | None = None  # IANA 时区，不填则从 lat/lon 推断
    operating_hours: dict[str, Any] = field(default_factory=dict)  # 营业时间配置
    home_members: list[dict[str, Any]] = field(default_factory=list)
    place_relationships: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.roleplay_mode = _normalize_roleplay_mode(self.roleplay_mode)
        self.layout_style = _normalize_tavern_layout_style(self.layout_style)
        self.place_type = _normalize_place_type(self.place_type)
        self.special_type = _normalize_special_type(self.special_type)
        if self.place_type == "home":
            self.access = _normalize_home_access(self.access)
        self.home_members = _normalize_home_members(self.home_members, self.id)
        self.place_relationships = _normalize_place_relationships(self.place_relationships)
        self.skill_packs = normalize_skill_pack_settings(self.skill_packs)
        self.engagement_config = deepcopy(self.engagement_config) if isinstance(self.engagement_config, dict) else {}

    def to_dict(self) -> dict[str, Any]:
        visible_llm_config = _hydrate_system_public_welfare_llm_config(
            self,
            self.llm_config,
            tavern_id=self.id,
            include_api_key=False,
        )
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "lat": self.lat,
            "lon": self.lon,
            "address": self.address,
            "owner_id": self.owner_id,
            "created_at": self.created_at,
            "access": self.access,
            "password_hash": self.password_hash,
            "status": self.status,
            "roleplay_mode": self.roleplay_mode,
            "layout_style": self.layout_style,
            "place_type": self.place_type,
            "special_type": self.special_type,
            "characters": [c.to_dict() for c in self.characters],
            "character_claims": deepcopy(self.character_claims),
            "world_info": [w.to_dict() for w in self.world_info],
            "groups": deepcopy(self.groups),
            "bookmarks": deepcopy(self.bookmarks),
            "chat_templates": deepcopy(self.chat_templates),
            "gameplay_definitions": deepcopy(self.gameplay_definitions),
            "output_rules": deepcopy(self.output_rules),
            "prompt_blocks": deepcopy(self.prompt_blocks),
            "runtime_presets": deepcopy(self.runtime_presets),
            "skill_packs": deepcopy(self.skill_packs),
            "engagement_config": deepcopy(self.engagement_config),
            "active_preset_id": self.active_preset_id,
            "memory_policy": deepcopy(self.memory_policy),
            "scene_prompt": self.scene_prompt,
            "llm_config": visible_llm_config.to_dict(),  # 不包含 api_key
            "voice_config": self.voice_config.to_dict(),
            "visit_count": self.visit_count,
            "group_chat_enabled": self.group_chat_enabled,
            "group_chat_config": deepcopy(self.group_chat_config),
            # 时间系统字段
            "timezone": self.timezone,
            "operating_hours": deepcopy(self.operating_hours),
            "home_members": deepcopy(self.home_members),
            "place_relationships": deepcopy(self.place_relationships),
        }

    def to_dict_private(self, user_id: str) -> dict[str, Any]:
        """包含敏感信息的版本，仅 owner 可见"""
        result = self.to_dict()
        if user_id == self.owner_id:
            result["llm_config"] = self.llm_config.to_dict_private()
            result["voice_config"] = self.voice_config.to_dict_private()
        return result

    def to_dict_public(self) -> dict[str, Any]:
        """公开版本，不包含敏感信息"""
        result = self.to_dict()
        result.pop("password_hash", None)
        result.pop("voice_config", None)
        result.pop("engagement_config", None)
        result["character_claims"] = [
            deepcopy(claim)
            for claim in self.character_claims
            if str(claim.get("status") or "") == "approved"
        ]
        result.pop("home_members", None)
        result.pop("place_relationships", None)
        return result

    def to_dict_entry(self) -> dict[str, Any]:
        """Slim public-safe payload for visitor tavern entry/detail pages."""
        result = self.to_dict_public()
        for key in (
            "world_info",
            "groups",
            "bookmarks",
            "chat_templates",
            "output_rules",
            "prompt_blocks",
            "runtime_presets",
            "active_preset_id",
            "memory_policy",
            "group_chat_config",
        ):
            result.pop(key, None)

        visible_llm_config = _hydrate_system_public_welfare_llm_config(
            self,
            self.llm_config,
            tavern_id=self.id,
            include_api_key=False,
        )
        result["llm_config"] = {"backend": visible_llm_config.backend}
        result["characters"] = [_entry_character_payload(character) for character in self.characters]
        result["gameplay_definitions"] = [
            _entry_gameplay_payload(gameplay)
            for gameplay in deepcopy(self.gameplay_definitions)
            if str((gameplay or {}).get("status") or "published") == "published"
        ]
        result["response_view"] = "entry"
        return result

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Tavern:
        characters = [TavernCharacter.from_dict(c) for c in d.get("characters", [])]
        world_info = [WorldInfoEntry.from_dict(w) for w in d.get("world_info", [])]
        llm = LLMConfig.from_dict(d.get("llm_config", {}))
        voice = VoiceConfig.from_dict(d.get("voice_config", {}))
        return cls(
            id=d["id"],
            name=d["name"],
            description=d.get("description", ""),
            lat=d.get("lat", 0.0),
            lon=d.get("lon", 0.0),
            address=d.get("address", ""),
            owner_id=d.get("owner_id", ""),
            created_at=d.get("created_at", ""),
            access=d.get("access", "public"),
            password_hash=d.get("password_hash", ""),
            status=d.get("status", "open"),
            roleplay_mode=_normalize_roleplay_mode(d.get("roleplay_mode", "ai_only")),
            layout_style=_normalize_tavern_layout_style(d.get("layout_style", "lobby")),
            place_type=_normalize_place_type(d.get("place_type", "tavern")),
            special_type=_normalize_special_type(d.get("special_type", "")),
            characters=characters,
            character_claims=_normalize_character_claims(d.get("character_claims", [])),
            world_info=world_info,
            groups=_normalize_metadata_list(d.get("groups", [])),
            bookmarks=_normalize_metadata_list(d.get("bookmarks", [])),
            chat_templates=_normalize_metadata_list(d.get("chat_templates", [])),
            gameplay_definitions=_normalize_metadata_list(d.get("gameplay_definitions", [])),
            output_rules=_normalize_metadata_list(d.get("output_rules", [])),
            prompt_blocks=_normalize_metadata_list(d.get("prompt_blocks", [])),
            runtime_presets=_normalize_metadata_list(d.get("runtime_presets", [])),
            skill_packs=normalize_skill_pack_settings(d.get("skill_packs", [])),
            engagement_config=deepcopy(d.get("engagement_config", {})) if isinstance(d.get("engagement_config"), dict) else {},
            active_preset_id=str(d.get("active_preset_id") or ""),
            memory_policy=deepcopy(d.get("memory_policy", {})) if isinstance(d.get("memory_policy"), dict) else {},
            scene_prompt=d.get("scene_prompt", ""),
            llm_config=llm,
            voice_config=voice,
            visit_count=d.get("visit_count", 0),
            group_chat_enabled=_normalize_bool(d.get("group_chat_enabled", False)),
            group_chat_config=_normalize_group_chat_config(d.get("group_chat_config", {})),
            timezone=d.get("timezone"),
            operating_hours=deepcopy(d.get("operating_hours", {})) if isinstance(d.get("operating_hours"), dict) else {},
            home_members=_normalize_home_members(d.get("home_members", []), str(d.get("id") or "")),
            place_relationships=_normalize_place_relationships(d.get("place_relationships", [])),
        )


@dataclass
class ChatMessage:
    """对话消息"""
    id: str
    tavern_id: str
    character_id: str
    visitor_id: str
    role: str  # 'user' | 'assistant'
    content: str
    timestamp: str
    visitor_name: str = ""
    token_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "character_id": self.character_id,
            "visitor_id": self.visitor_id,
            "visitor_name": self.visitor_name,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "token_count": self.token_count,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ChatMessage:
        return cls(
            id=d["id"],
            tavern_id=d.get("tavern_id", ""),
            character_id=d.get("character_id", ""),
            visitor_id=d.get("visitor_id", ""),
            visitor_name=d.get("visitor_name", ""),
            role=d["role"],
            content=d["content"],
            timestamp=d.get("timestamp", ""),
            token_count=d.get("token_count", 0),
        )


def _default_public_welfare_seeding_enabled() -> bool:
    value = os.environ.get("FABLEMAP_SEED_DEFAULT_TAVERNS", "1").strip().lower()
    return value not in {"0", "false", "no", "off", "disabled"}


# ─────────────────────────────────────────
# 存储层
# ─────────────────────────────────────────


class _TavernCache:
    """Thread-safe in-memory cache with TTL for tavern data."""

    def __init__(self, ttl: float = 5.0):
        """Create an empty cache with a per-entry TTL in seconds."""
        self._lock = threading.Lock()
        self._ttl = ttl
        self._data: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        """Return a cached value when it exists and is still fresh."""
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            data, timestamp = entry
            if time.time() - timestamp > self._ttl:
                del self._data[key]
                return None
            return data

    def set(self, key: str, data: Any) -> None:
        """Store a value under a cache key using the cache TTL."""
        with self._lock:
            self._data[key] = (data, time.time())

    def invalidate(self, key: str) -> None:
        """Remove one exact cache key if it exists."""
        with self._lock:
            self._data.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        """Remove all cache entries whose keys start with the given prefix."""
        with self._lock:
            for key in [key for key in self._data if key.startswith(prefix)]:
                del self._data[key]

    def clear(self) -> None:
        """Remove all cached values."""
        with self._lock:
            self._data.clear()


# Global cache instance (shared across all TavernStore instances)
_tavern_cache = _TavernCache(ttl=5.0)

# Separate cache for chat session metadata (shorter TTL for freshness)
_chat_sessions_cache = _TavernCache(ttl=3.0)


class TavernStore:
    """空间数据存储 — JSON 文件持久化"""

    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.taverns_file = self.root / "taverns.json"
        self.keyvault_file = self.root / "taverns_keyvault.json"
        self._ensure_files()

    def _ensure_files(self) -> None:
        created_taverns_file = not self.taverns_file.exists()
        if not self.taverns_file.exists():
            self.taverns_file.write_text("{}", encoding="utf-8")
        if not self.keyvault_file.exists():
            self.keyvault_file.write_text("{}", encoding="utf-8")
        if _default_public_welfare_seeding_enabled():
            self._seed_default_public_welfare_taverns(created_taverns_file=created_taverns_file)

    def _seed_default_public_welfare_taverns(self, *, created_taverns_file: bool = False) -> None:
        """Idempotently add platform public-welfare taverns to fresh stores."""
        try:
            loaded = json.loads(self.taverns_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            # Do not overwrite a damaged or temporarily inaccessible data file
            # during construction. Recovery tools should decide what to do.
            return
        if not isinstance(loaded, dict):
            if created_taverns_file:
                loaded = {}
            else:
                return

        data = loaded
        changed = False
        for tavern in default_public_welfare_taverns():
            tavern_id = str(tavern.get("id") or "").strip()
            if not tavern_id:
                continue
            if tavern_id not in data:
                data[tavern_id] = tavern
                changed = True
                continue
            existing = data.get(tavern_id)
            if self._merge_public_welfare_seed_defaults(existing, tavern):
                changed = True
        if changed:
            self._save_taverns(data)

    @staticmethod
    def _default_public_welfare_seed_data() -> dict[str, Any]:
        """Build a read-only fallback map for built-in public-welfare taverns."""
        if not _default_public_welfare_seeding_enabled():
            return {}
        seed_data: dict[str, Any] = {}
        for tavern in default_public_welfare_taverns():
            tavern_id = str(tavern.get("id") or "").strip()
            if tavern_id:
                seed_data[tavern_id] = deepcopy(tavern)
        return seed_data

    @staticmethod
    def _public_welfare_seed_record_needs_read_fallback(tavern_id: str, existing: dict[str, Any]) -> bool:
        if str(existing.get("id") or "").strip() != tavern_id:
            return True
        for key in ("name", "description", "owner_id", "access", "status"):
            if not str(existing.get(key) or "").strip():
                return True
        for key in ("lat", "lon"):
            try:
                float(existing.get(key))
            except (TypeError, ValueError):
                return True
        for key in ("characters", "world_info", "gameplay_definitions"):
            if not isinstance(existing.get(key), list):
                return True
        if not isinstance(existing.get("llm_config"), dict):
            return True
        return False

    def _apply_public_welfare_seed_read_fallbacks(self, data: dict[str, Any]) -> dict[str, Any]:
        """Overlay canonical built-in seed data for missing/partial seed records on read only."""
        seed_data = self._default_public_welfare_seed_data()
        if not seed_data:
            return data

        result = deepcopy(data)
        for tavern_id, default in seed_data.items():
            existing = result.get(tavern_id)
            if not isinstance(existing, dict):
                result[tavern_id] = deepcopy(default)
                continue
            if not self._public_welfare_seed_record_needs_read_fallback(tavern_id, existing):
                continue

            repaired = deepcopy(default)
            for key, value in existing.items():
                if key.startswith("_") or key == "visit_count":
                    repaired[key] = deepcopy(value)
            result[tavern_id] = repaired
        return result

    @staticmethod
    def _merge_public_welfare_seed_defaults(existing: Any, default: dict[str, Any]) -> bool:
        """Keep built-in seed records current without touching runtime/private state."""
        if not isinstance(existing, dict):
            return False
        if str(existing.get("owner_id") or "") != DEFAULT_PUBLIC_WELFARE_OWNER_ID:
            return False

        changed = False
        if TavernStore._refresh_public_welfare_seed_copy(existing, default):
            changed = True
        for key in ("characters", "world_info", "bookmarks", "gameplay_definitions"):
            default_items = default.get(key)
            if not isinstance(default_items, list) or not default_items:
                continue
            existing_items = existing.get(key)
            if not isinstance(existing_items, list):
                existing_items = []
                existing[key] = existing_items
                changed = True
            existing_ids = {
                str(item.get("id") or "").strip()
                for item in existing_items
                if isinstance(item, dict)
            }
            existing_by_id = {
                str(item.get("id") or "").strip(): item
                for item in existing_items
                if isinstance(item, dict)
            }
            for item in default_items:
                if not isinstance(item, dict):
                    continue
                item_id = str(item.get("id") or "").strip()
                if not item_id:
                    continue
                if item_id in existing_ids:
                    if key == "characters" and TavernStore._merge_public_welfare_character_assets(
                        existing_by_id.get(item_id),
                        item,
                    ):
                        changed = True
                    continue
                existing_items.append(deepcopy(item))
                existing_ids.add(item_id)
                existing_by_id[item_id] = existing_items[-1]
                changed = True
        return changed

    @staticmethod
    def _refresh_public_welfare_seed_copy(existing: dict[str, Any], default: dict[str, Any]) -> bool:
        """Refresh canonical user-facing copy for system-owned built-in seeds.

        Existing runtime state such as visits, LLM config, chat history side buckets,
        and custom art overrides are intentionally preserved. The default seed copy is
        not owner-authored content, so product wording updates should backfill older
        local stores instead of leaving stale public labels visible.
        """
        changed = False
        for key in ("name", "description", "address", "scene_prompt"):
            default_value = default.get(key)
            if default_value is not None and existing.get(key) != default_value:
                existing[key] = deepcopy(default_value)
                changed = True

        default_memory_policy = default.get("memory_policy")
        existing_memory_policy = existing.get("memory_policy")
        if isinstance(default_memory_policy, dict) and isinstance(existing_memory_policy, dict):
            default_note = default_memory_policy.get("note")
            if default_note is not None and existing_memory_policy.get("note") != default_note:
                existing_memory_policy["note"] = deepcopy(default_note)
                changed = True

        for key in ("world_info", "bookmarks", "gameplay_definitions"):
            if TavernStore._refresh_public_welfare_seed_items(existing, default, key):
                changed = True
        if TavernStore._refresh_public_welfare_seed_characters(existing, default):
            changed = True
        return changed

    @staticmethod
    def _deprecated_public_welfare_seed_item_ids(tavern_id: str, key: str) -> set[str]:
        """Return stale built-in seed item ids that should be removed on refresh.

        This is intentionally tavern-specific and only applies to system-owned
        public-welfare records. It lets a renamed/repositioned built-in space
        stop exposing old gameplay/world-info entries without deleting unknown
        locally-added items from other taverns.
        """
        deprecated_by_tavern_and_key = {
            ("pw_community_repair", "world_info"): {
                "wi_pw_repair_notice",
                "wi_pw_repair_toolbox",
            },
            ("pw_community_repair", "bookmarks"): {
                "bm_pw_repair",
            },
            ("pw_community_repair", "gameplay_definitions"): {
                "gp_pw_repair_one_small_fix",
                "gp_pw_repair_role_triage",
            },
        }
        return set(deprecated_by_tavern_and_key.get((tavern_id, key), set()))

    @staticmethod
    def _refresh_public_welfare_seed_items(existing: dict[str, Any], default: dict[str, Any], key: str) -> bool:
        default_items = default.get(key)
        existing_items = existing.get(key)
        if not isinstance(default_items, list) or not isinstance(existing_items, list):
            return False

        changed = False
        tavern_id = str(existing.get("id") or default.get("id") or "").strip()
        deprecated_ids = TavernStore._deprecated_public_welfare_seed_item_ids(tavern_id, key)
        if deprecated_ids:
            filtered_items = [
                item
                for item in existing_items
                if not (
                    isinstance(item, dict)
                    and str(item.get("id") or "").strip() in deprecated_ids
                )
            ]
            if len(filtered_items) != len(existing_items):
                existing[key] = filtered_items
                existing_items = filtered_items
                changed = True

        default_by_id = {
            str(item.get("id") or "").strip(): item
            for item in default_items
            if isinstance(item, dict) and str(item.get("id") or "").strip()
        }
        for index, item in enumerate(existing_items):
            if not isinstance(item, dict):
                continue
            default_item = default_by_id.get(str(item.get("id") or "").strip())
            if default_item is None:
                continue
            if item != default_item:
                existing_items[index] = deepcopy(default_item)
                changed = True
        return changed

    @staticmethod
    def _refresh_public_welfare_seed_characters(existing: dict[str, Any], default: dict[str, Any]) -> bool:
        default_items = default.get("characters")
        existing_items = existing.get("characters")
        if not isinstance(default_items, list) or not isinstance(existing_items, list):
            return False

        changed = False
        default_by_id = {
            str(item.get("id") or "").strip(): item
            for item in default_items
            if isinstance(item, dict) and str(item.get("id") or "").strip()
        }
        text_keys = (
            "name",
            "description",
            "personality",
            "scenario",
            "gender",
            "system_prompt",
            "first_mes",
            "mes_example",
            "alternate_greetings",
            "tags",
            "appearance",
            "talkativeness",
        )
        for item in existing_items:
            if not isinstance(item, dict):
                continue
            default_item = default_by_id.get(str(item.get("id") or "").strip())
            if default_item is None:
                continue
            for key in text_keys:
                if key in default_item and item.get(key) != default_item.get(key):
                    item[key] = deepcopy(default_item[key])
                    changed = True
        return changed

    @staticmethod
    def _merge_public_welfare_character_assets(existing: Any, default: dict[str, Any]) -> bool:
        """Fill missing built-in character art without replacing local edits."""
        if not isinstance(existing, dict):
            return False

        changed = False
        default_avatar = str(default.get("avatar") or "").strip()
        if default_avatar and not str(existing.get("avatar") or "").strip():
            existing["avatar"] = default_avatar
            changed = True

        default_sprites = default.get("sprites")
        if not isinstance(default_sprites, dict) or not default_sprites:
            return changed

        existing_sprites = existing.get("sprites")
        if not isinstance(existing_sprites, dict):
            existing_sprites = {}
            existing["sprites"] = existing_sprites
            changed = True

        for expression, sprite_url in default_sprites.items():
            sprite_url = str(sprite_url or "").strip()
            if sprite_url and not str(existing_sprites.get(expression) or "").strip():
                existing_sprites[expression] = sprite_url
                changed = True

        return changed

    def _load_taverns(self, *, include_seed_fallback: bool = False) -> dict[str, Any]:
        cache_key = f"taverns:{include_seed_fallback}"
        cached = _tavern_cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            loaded = json.loads(self.taverns_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            if include_seed_fallback:
                result = self._default_public_welfare_seed_data()
                _tavern_cache.set(cache_key, result)
                return result
            _tavern_cache.set(cache_key, {})
            return {}
        if not isinstance(loaded, dict):
            _tavern_cache.set(cache_key, {})
            return {}
        if include_seed_fallback:
            result = self._apply_public_welfare_seed_read_fallbacks(loaded)
        else:
            result = loaded
        _tavern_cache.set(cache_key, result)
        return result

    def _save_taverns(self, data: dict[str, Any]) -> None:
        self.taverns_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        # Invalidate cache when data changes
        _tavern_cache.clear()

    def _is_seed_fallback_tavern(self, tavern_id: str) -> bool:
        return tavern_id in self._default_public_welfare_seed_data()

    def _load_keyvault(self) -> dict[str, Any]:
        try:
            return json.loads(self.keyvault_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _save_keyvault(self, data: dict[str, Any]) -> None:
        self.keyvault_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    # ── Tavern CRUD ──────────────────────

    def list_taverns(self, include_private: bool = False, owner_id: str = "") -> list[Tavern]:
        """列出所有空间"""
        data = self._load_taverns(include_seed_fallback=True)
        # Pre-load keyvault once to avoid N+1 file reads in get_token_usage
        keyvault = self._load_keyvault()
        result = []
        for d in data.values():
            tavern = Tavern.from_dict(d)
            # Inline token usage lookup with pre-loaded data
            kv_usage = int(keyvault.get(tavern.id, {}).get("token_used", 0) or 0)
            tavern_usage = int(d.get("llm_config", {}).get("token_used", 0) or 0)
            if max(kv_usage, tavern_usage):
                tavern.llm_config.token_used = max(kv_usage, tavern_usage)
            if tavern.access == "private":
                if include_private and tavern.owner_id == owner_id:
                    result.append(tavern)
                continue
            result.append(tavern)
        return result

    def list_all_taverns(self) -> list[Tavern]:
        """Internal full scan including private Home records for relationship resolution."""
        data = self._load_taverns(include_seed_fallback=True)
        # Pre-load keyvault once to avoid N+1 file reads
        keyvault = self._load_keyvault()
        result: list[Tavern] = []
        for value in data.values():
            if not isinstance(value, dict):
                continue
            try:
                tavern = Tavern.from_dict(value)
                # Inline token usage lookup
                kv_usage = int(keyvault.get(tavern.id, {}).get("token_used", 0) or 0)
                tavern_usage = int(value.get("llm_config", {}).get("token_used", 0) or 0)
                if max(kv_usage, tavern_usage):
                    tavern.llm_config.token_used = max(kv_usage, tavern_usage)
                result.append(tavern)
            except (KeyError, TypeError, ValueError):
                continue
        return result

    def get_tavern(self, tavern_id: str) -> Tavern | None:
        data = self._load_taverns(include_seed_fallback=True)
        d = data.get(tavern_id)
        if not d:
            return None
        tavern = Tavern.from_dict(d)
        # Inline token usage lookup (avoid another _load_taverns call)
        kv = self._load_keyvault()
        kv_usage = int(kv.get(tavern_id, {}).get("token_used", 0) or 0)
        tavern_usage = int(d.get("llm_config", {}).get("token_used", 0) or 0)
        if max(kv_usage, tavern_usage):
            tavern.llm_config.token_used = max(kv_usage, tavern_usage)
        return tavern

    def create_tavern(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id in data:
            raise HTTPException(status_code=409, detail="空间 ID 已存在")
        data[tavern.id] = tavern.to_dict()
        self._save_taverns(data)
        return tavern

    def update_tavern(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id not in data:
            if self._is_seed_fallback_tavern(tavern.id):
                return tavern
            raise HTTPException(status_code=404, detail="空间不存在")
        existing = data.get(tavern.id, {})
        updated = tavern.to_dict()
        # Preserve private extension buckets that are stored alongside the tavern
        # document but are not part of Tavern.to_dict(). Without this, simple
        # tavern metadata updates (e.g. visit_count after enter_tavern) can erase
        # VisitorState records.
        if isinstance(existing, dict):
            for key, value in existing.items():
                if key.startswith("_") and key not in updated:
                    updated[key] = value
        data[tavern.id] = updated
        self._save_taverns(data)
        return tavern

    def delete_tavern(self, tavern_id: str) -> None:
        data = self._load_taverns()
        if tavern_id not in data:
            raise HTTPException(status_code=404, detail="空间不存在")
        del data[tavern_id]
        self._save_taverns(data)
        # 同时删除 keyvault 中的记录
        kv = self._load_keyvault()
        if tavern_id in kv:
            del kv[tavern_id]
            self._save_keyvault(kv)
        # 删除聊天记录
        chat_dir = self.root / "chat_history" / tavern_id
        if chat_dir.exists():
            import shutil
            shutil.rmtree(chat_dir)

    # ── LLM Key Vault ────────────────────

    def save_llm_config(self, tavern_id: str, config: LLMConfig) -> None:
        """保存 LLM 配置（包含 api_key）"""
        kv = self._load_keyvault()
        kv[tavern_id] = config.to_dict_private()
        self._save_keyvault(kv)

    def get_llm_config(self, tavern_id: str) -> LLMConfig | None:
        """获取 LLM 配置（包含 api_key）"""
        kv = self._load_keyvault()
        d = kv.get(tavern_id)
        if d:
            config = LLMConfig.from_dict(d)
            tavern_data = self._load_taverns(include_seed_fallback=True).get(tavern_id, {})
            config = _hydrate_system_public_welfare_llm_config(tavern_data, config, tavern_id=tavern_id)
            if config.is_configured():
                return config
            res = _system_public_welfare_rules_fallback(
                tavern_data,
                tavern_id=tavern_id,
                token_used=config.token_used,
            ) or config
            return res

        # Built-in/public demo taverns can use a non-secret local backend that is
        # stored in taverns.json only. Never resurrect unconfigured remote keys.
        tavern_data = self._load_taverns(include_seed_fallback=True).get(tavern_id, {})
        fallback = tavern_data.get("llm_config", {}) if isinstance(tavern_data, dict) else {}
        if not isinstance(fallback, dict) or not fallback:
            return None
        config = LLMConfig.from_dict(fallback)
        config = _hydrate_system_public_welfare_llm_config(tavern_data, config, tavern_id=tavern_id)
        if config.is_configured():
            return config
        res = _system_public_welfare_rules_fallback(
            tavern_data,
            tavern_id=tavern_id,
            token_used=config.token_used,
        )
        return res

    # ── Voice Config ───────────────────────

    def save_voice_config(self, tavern_id: str, config: VoiceConfig) -> None:
        """保存语音配置（存储在空间数据中）"""
        data = self._load_taverns()
        if tavern_id not in data:
            return
        data[tavern_id]["voice_config"] = config.to_dict()
        self._save_taverns(data)

    def get_voice_config(self, tavern_id: str) -> VoiceConfig | None:
        """获取语音配置"""
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        vc = tavern_data.get("voice_config", {})
        if not vc:
            return None
        return VoiceConfig.from_dict(vc)

    # ── 访客状态 ────────────────────────

    def get_visitor_state(self, tavern_id: str, visitor_id: str) -> VisitorState | None:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        visitors = tavern_data.get("_visitors", {})
        v = visitors.get(visitor_id)
        if not v:
            return None
        return VisitorState.from_dict(v)

    def list_visitor_states(self, tavern_id: str) -> list[VisitorState]:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        visitors = tavern_data.get("_visitors", {})
        if not isinstance(visitors, dict):
            return []

        states = []
        for value in visitors.values():
            if not isinstance(value, dict):
                continue
            try:
                states.append(VisitorState.from_dict(value))
            except (KeyError, TypeError, ValueError):
                continue
        states.sort(key=lambda state: state.last_visit or "", reverse=True)
        return states

    def update_visitor_state(self, tavern_id: str, state: VisitorState) -> None:
        data = self._load_taverns()
        if tavern_id not in data and self._is_seed_fallback_tavern(tavern_id):
            return
        tavern_data = data.setdefault(tavern_id, {})
        visitors = tavern_data.setdefault("_visitors", {})
        visitors[state.visitor_id] = state.to_dict()
        self._save_taverns(data)

    # ── 批量加载方法（优化 N+1 查询）─────────────────────────────

    def batch_list_visitor_states(self, tavern_ids: list[str]) -> dict[str, list[VisitorState]]:
        """批量加载多个 tavern 的访客状态，一次文件读取完成"""
        result: dict[str, list[VisitorState]] = {tid: [] for tid in tavern_ids}
        if not tavern_ids:
            return result

        data = self._load_taverns()
        for tavern_id in tavern_ids:
            tavern_data = data.get(tavern_id, {})
            visitors = tavern_data.get("_visitors", {})
            if not isinstance(visitors, dict):
                continue
            states = []
            for value in visitors.values():
                if not isinstance(value, dict):
                    continue
                try:
                    states.append(VisitorState.from_dict(value))
                except (KeyError, TypeError, ValueError):
                    continue
            states.sort(key=lambda state: state.last_visit or "", reverse=True)
            result[tavern_id] = states
        return result

    def batch_list_chat_sessions(
        self,
        tavern_ids: list[str],
        visitor_id: str = "",
        character_id: str = "",
    ) -> dict[str, list[dict[str, Any]]]:
        """批量加载多个 tavern 的聊天会话元数据，一次文件读取完成"""
        result: dict[str, list[dict[str, Any]]] = {tid: [] for tid in tavern_ids}
        if not tavern_ids:
            return result

        # 预加载所有 tavern 的访客名称
        tavern_data_map = self._load_taverns()

        for tavern_id in tavern_ids:
            chat_dir = self.root / "chat_history" / tavern_id
            if not chat_dir.exists():
                continue

            tavern_visitors = tavern_data_map.get(tavern_id, {}).get("_visitors", {})
            sessions = []
            for file_path in sorted(chat_dir.glob("*.jsonl")):
                messages = self._read_chat_file(file_path)
                if not messages:
                    continue
                last_message = messages[-1]
                session_visitor_id = last_message.visitor_id or messages[0].visitor_id
                session_visitor_name = last_message.visitor_name or messages[0].visitor_name

                # 从 tavern 数据中获取访客名称（如果文件没有）
                if not session_visitor_name and session_visitor_id:
                    visitor_data = tavern_visitors.get(session_visitor_id, {})
                    session_visitor_name = visitor_data.get("display_name", "")

                session_character_id = last_message.character_id or messages[0].character_id
                if visitor_id and session_visitor_id != visitor_id:
                    continue
                if character_id and session_character_id != character_id:
                    continue
                sessions.append({
                    "tavern_id": tavern_id,
                    "visitor_id": session_visitor_id,
                    "visitor_name": session_visitor_name,
                    "character_id": session_character_id,
                    "message_count": len(messages),
                    "last_message": last_message,
                    "updated_at": last_message.timestamp,
                })

            sessions.sort(key=lambda session: session.get("updated_at", ""), reverse=True)
            result[tavern_id] = sessions

        return result

    # ── 结构化记忆 ────────────────────────

    def list_memory_atoms(self, tavern_id: str) -> list[MemoryAtom]:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        atoms = tavern_data.get("_memory_atoms", {})
        if not isinstance(atoms, dict):
            return []

        result = []
        for value in atoms.values():
            if not isinstance(value, dict):
                continue
            try:
                result.append(MemoryAtom.from_dict(value))
            except (TypeError, ValueError):
                continue
        result.sort(
            key=lambda atom: (
                atom.pinned,
                atom.updated_at or atom.created_at,
                atom.id,
            ),
            reverse=True,
        )
        return result

    def get_memory_atom(self, tavern_id: str, memory_id: str) -> MemoryAtom | None:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        atoms = tavern_data.get("_memory_atoms", {})
        if not isinstance(atoms, dict):
            return None
        value = atoms.get(memory_id)
        if not isinstance(value, dict):
            return None
        try:
            return MemoryAtom.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_memory_atom(self, tavern_id: str, atom: MemoryAtom) -> MemoryAtom:
        data = self._load_taverns()
        tavern_data = data.setdefault(tavern_id, {})
        atoms = tavern_data.setdefault("_memory_atoms", {})
        if not isinstance(atoms, dict):
            atoms = {}
            tavern_data["_memory_atoms"] = atoms
        atom.tavern_id = tavern_id
        atoms[atom.id] = atom.to_dict()
        self._save_taverns(data)
        return atom

    def delete_memory_atom(self, tavern_id: str, memory_id: str) -> bool:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        atoms = tavern_data.get("_memory_atoms", {})
        if not isinstance(atoms, dict) or memory_id not in atoms:
            return False
        del atoms[memory_id]
        self._save_taverns(data)
        return True

    # ── 连续性状态卡 / Canon Ledger ────────────────────────

    def list_state_cards(self, tavern_id: str) -> list[Any]:
        from fablemap_api.core.state_cards import StateCard

        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        cards = tavern_data.get("_state_cards", {})
        if not isinstance(cards, dict):
            return []

        result = []
        for value in cards.values():
            if not isinstance(value, dict):
                continue
            try:
                result.append(StateCard.from_dict(value))
            except (TypeError, ValueError):
                continue
        result.sort(
            key=lambda card: (
                card.status == "pending",
                card.updated_at or card.created_at,
                card.id,
            ),
            reverse=True,
        )
        return result

    def get_state_card(self, tavern_id: str, card_id: str) -> Any | None:
        from fablemap_api.core.state_cards import StateCard

        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        cards = tavern_data.get("_state_cards", {})
        if not isinstance(cards, dict):
            return None
        value = cards.get(card_id)
        if not isinstance(value, dict):
            return None
        try:
            return StateCard.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_state_card(self, tavern_id: str, card: Any) -> Any:
        data = self._load_taverns()
        tavern_data = data.setdefault(tavern_id, {})
        cards = tavern_data.setdefault("_state_cards", {})
        if not isinstance(cards, dict):
            cards = {}
            tavern_data["_state_cards"] = cards
        card.tavern_id = tavern_id
        cards[card.id] = card.to_dict()
        self._save_taverns(data)
        return card

    def delete_state_card(self, tavern_id: str, card_id: str) -> bool:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        cards = tavern_data.get("_state_cards", {})
        if not isinstance(cards, dict) or card_id not in cards:
            return False
        del cards[card_id]
        self._save_taverns(data)
        return True

    # ── 玩法会话 ────────────────────────

    def list_gameplay_sessions(self, tavern_id: str) -> list[Any]:
        from fablemap_api.core.gameplay import GameplaySession

        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        sessions = tavern_data.get("_gameplay_sessions", {})
        if not isinstance(sessions, dict):
            return []
        result = []
        for value in sessions.values():
            if not isinstance(value, dict):
                continue
            try:
                result.append(GameplaySession.from_dict(value))
            except (TypeError, ValueError):
                continue
        result.sort(key=lambda session: session.updated_at or session.created_at, reverse=True)
        return result

    def get_gameplay_session(self, tavern_id: str, session_id: str) -> Any | None:
        from fablemap_api.core.gameplay import GameplaySession

        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        sessions = tavern_data.get("_gameplay_sessions", {})
        if not isinstance(sessions, dict):
            return None
        value = sessions.get(session_id)
        if not isinstance(value, dict):
            return None
        try:
            return GameplaySession.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_gameplay_session(self, tavern_id: str, session: Any) -> Any:
        data = self._load_taverns()
        tavern_data = data.setdefault(tavern_id, {})
        sessions = tavern_data.setdefault("_gameplay_sessions", {})
        if not isinstance(sessions, dict):
            sessions = {}
            tavern_data["_gameplay_sessions"] = sessions
        session.tavern_id = tavern_id
        sessions[session.id] = session.to_dict()
        self._save_taverns(data)
        return session

    # ── Chat History ─────────────────────

    def get_chat_history(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> list[ChatMessage]:
        chat_dir = self.root / "chat_history" / tavern_id
        if not character_id:
            character_id = "_all"
        file_path = chat_dir / f"{visitor_id}_{character_id}.jsonl"
        if not file_path.exists():
            return []
        messages = self._read_chat_file(file_path)
        return messages[-limit:]

    def list_chat_sessions(
        self,
        tavern_id: str,
        visitor_id: str = "",
        character_id: str = "",
        limit: int | None = 50,
    ) -> list[dict[str, Any]]:
        # Try cache first (only for unfiltered queries)
        cache_key = f"sessions:{tavern_id}:{visitor_id}:{character_id}"
        if not visitor_id and not character_id:
            cached = _chat_sessions_cache.get(cache_key)
            if cached is not None:
                return cached

        chat_dir = self.root / "chat_history" / tavern_id
        if not chat_dir.exists():
            return []

        sessions = []
        for file_path in sorted(chat_dir.glob("*.jsonl")):
            messages = self._read_chat_file(file_path)
            if not messages:
                continue
            last_message = messages[-1]
            session_visitor_id = last_message.visitor_id or messages[0].visitor_id
            session_visitor_name = last_message.visitor_name or messages[0].visitor_name
            session_character_id = last_message.character_id or messages[0].character_id
            if visitor_id and session_visitor_id != visitor_id:
                continue
            if character_id and session_character_id != character_id:
                continue
            visible_messages = messages if limit is None else messages[-limit:]
            sessions.append({
                "tavern_id": tavern_id,
                "visitor_id": session_visitor_id,
                "visitor_name": session_visitor_name,
                "character_id": session_character_id,
                "message_count": len(messages),
                "messages": visible_messages,
                "last_message": last_message,
                "updated_at": last_message.timestamp,
            })

        sessions.sort(key=lambda session: session.get("updated_at", ""), reverse=True)

        # Cache unfiltered results
        if not visitor_id and not character_id:
            _chat_sessions_cache.set(cache_key, sessions)

        return sessions

    def delete_chat_history(self, tavern_id: str, visitor_id: str = "", character_id: str = "") -> int:
        chat_dir = self.root / "chat_history" / tavern_id
        if not chat_dir.exists():
            return 0

        deleted = 0
        for file_path in sorted(chat_dir.glob("*.jsonl")):
            messages = self._read_chat_file(file_path)
            if not messages:
                continue
            last_message = messages[-1]
            session_visitor_id = last_message.visitor_id or messages[0].visitor_id
            session_character_id = last_message.character_id or messages[0].character_id
            if visitor_id and session_visitor_id != visitor_id:
                continue
            if character_id and session_character_id != character_id:
                continue
            try:
                file_path.unlink()
                deleted += 1
            except OSError:
                continue
        if deleted:
            _chat_sessions_cache.invalidate_prefix(f"sessions:{tavern_id}:")
        return deleted

    def replace_chat_history(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str,
        messages: list[ChatMessage],
    ) -> int:
        chat_dir = self.root / "chat_history" / tavern_id
        chat_dir.mkdir(parents=True, exist_ok=True)
        file_path = chat_dir / f"{visitor_id}_{character_id}.jsonl"

        if not messages:
            if file_path.exists():
                file_path.unlink()
            _chat_sessions_cache.invalidate_prefix(f"sessions:{tavern_id}:")
            return 0

        normalized_messages = []
        for message in messages:
            message.tavern_id = tavern_id
            message.visitor_id = visitor_id
            message.character_id = character_id
            normalized_messages.append(message)

        with file_path.open("w", encoding="utf-8") as fh:
            for message in normalized_messages:
                fh.write(json.dumps(message.to_dict(), ensure_ascii=False) + "\n")
        _chat_sessions_cache.invalidate_prefix(f"sessions:{tavern_id}:")
        return len(normalized_messages)

    def _read_chat_file(self, file_path: Path) -> list[ChatMessage]:
        messages = []
        try:
            for line in file_path.read_text(encoding="utf-8").strip().split("\n"):
                if line.strip():
                    d = json.loads(line)
                    messages.append(ChatMessage.from_dict(d))
        except (json.JSONDecodeError, OSError):
            return []
        return messages

    def add_chat_message(self, msg: ChatMessage) -> ChatMessage:
        chat_dir = self.root / "chat_history" / msg.tavern_id
        chat_dir.mkdir(parents=True, exist_ok=True)
        file_path = chat_dir / f"{msg.visitor_id}_{msg.character_id}.jsonl"
        with file_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(msg.to_dict(), ensure_ascii=False) + "\n")
        _chat_sessions_cache.invalidate_prefix(f"sessions:{msg.tavern_id}:")
        return msg

    # ── Token 统计 ──────────────────────

    def add_token_usage(self, tavern_id: str, tokens: int) -> None:
        try:
            token_delta = int(tokens)
        except (TypeError, ValueError):
            return
        if token_delta <= 0:
            return

        kv = self._load_keyvault()
        if tavern_id in kv:
            current = int(kv[tavern_id].get("token_used", 0) or 0)
            kv[tavern_id]["token_used"] = current + token_delta
            self._save_keyvault(kv)

        data = self._load_taverns()
        if tavern_id in data:
            llm_config = data[tavern_id].setdefault("llm_config", {})
            current = int(llm_config.get("token_used", 0) or 0)
            llm_config["token_used"] = current + token_delta
            self._save_taverns(data)

    def get_token_usage(self, tavern_id: str) -> int:
        kv = self._load_keyvault()
        keyvault_usage = int(kv.get(tavern_id, {}).get("token_used", 0) or 0)

        data = self._load_taverns()
        tavern_usage = int(
            data.get(tavern_id, {})
            .get("llm_config", {})
            .get("token_used", 0)
            or 0
        )
        return max(keyvault_usage, tavern_usage)


# ─────────────────────────────────────────
# 服务层
# ─────────────────────────────────────────

def _visitor_relationship_stage(strength: float, visit_count: int) -> str:
    if strength >= 0.75 or visit_count >= 8:
        return "confidant"
    if strength >= 0.45 or visit_count >= 4:
        return "regular"
    if strength >= 0.15 or visit_count >= 2:
        return "acquaintance"
    return "stranger"

class TavernService:
    """空间服务 — 业务逻辑"""

    def __init__(self, store: TavernStore):
        self.store = store

    def _enrich_time_status(self, tavern_dict: dict[str, Any], tavern: Tavern) -> None:
        time_ctx = build_time_context(
            lat=tavern.lat,
            lon=tavern.lon,
            timezone_str=tavern.timezone,
            operating_hours=tavern.operating_hours,
        )
        local_time_display = time_ctx.local_time.strftime("%H:%M")
        tavern_dict.update({
            "timezone": time_ctx.timezone,
            "local_time_display": local_time_display,
            "is_open": time_ctx.is_open,
            "time_status": {
                "timezone": time_ctx.timezone,
                "local_time_display": local_time_display,
                "is_open": time_ctx.is_open,
                "local_date": time_ctx.local_time.strftime("%Y-%m-%d"),
                "local_season": time_ctx.season,
                "local_day_of_week": time_ctx.day_of_week,
                "local_hour": time_ctx.local_hour,
            },
        })

    def _get_private_llm_config(self, tavern_id: str) -> LLMConfig | None:
        private_getter = getattr(self.store, "get_llm_config_private", None)
        if callable(private_getter):
            return private_getter(tavern_id)
        return self.store.get_llm_config(tavern_id)

    def list_taverns(
        self,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        status: str | None = None,
        place_type: str = "",
        special_type: str = "",
        query: str = "",
        owner_id: str = "",
    ) -> list[dict[str, Any]]:
        """列出空间，支持位置过滤"""
        taverns = self.store.list_taverns(include_private=bool(owner_id), owner_id=owner_id)
        normalized_query = (query or "").strip()
        normalized_status = (status or "").strip()
        normalized_place_type = _normalize_tavern_list_place_type_filter(place_type)
        normalized_special_type = _normalize_tavern_list_special_type_filter(special_type)

        result = []
        for t in taverns:
            if owner_id and t.owner_id != owner_id:
                continue
            if t.place_type == "home" and not (owner_id and t.owner_id == owner_id):
                continue
            if access and t.access != access:
                continue
            if normalized_status and t.status != normalized_status:
                continue
            if normalized_place_type and t.place_type != normalized_place_type:
                continue
            if normalized_special_type and t.special_type != normalized_special_type:
                continue
            if normalized_query and not _matches_tavern_query(t, normalized_query):
                continue

            tavern_dict = t.to_dict_private(owner_id) if owner_id and t.owner_id == owner_id else t.to_dict_public()
            tavern_dict["_distance"] = None
            if lat is not None and lon is not None:
                dist = _haversine_distance(lat, lon, t.lat, t.lon)
                tavern_dict["_distance"] = dist
                if dist > radius:
                    continue

            # 添加时间状态信息
            self._enrich_time_status(tavern_dict, t)

            result.append(tavern_dict)

        # 按距离排序
        result.sort(key=lambda x: x["_distance"] if x["_distance"] is not None else float("inf"))
        return result

    def get_tavern(self, tavern_id: str, user_id: str = "", view: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        # 添加时间状态信息
        entry_view = str(view or "").strip().lower() == "entry"
        if entry_view:
            tavern_dict = tavern.to_dict_entry()
        else:
            tavern_dict = tavern.to_dict_private(user_id) if tavern.owner_id and tavern.owner_id == user_id else tavern.to_dict_public()
        self._enrich_time_status(tavern_dict, tavern)
        if tavern.place_type == "school":
            tavern_dict["school_members"] = self.list_school_members(tavern_id, user_id=user_id)["members"]
            if not entry_view and tavern.owner_id and tavern.owner_id == user_id:
                tavern_dict["pending_school_enrollments"] = self._school_relationships(tavern_id, statuses={"pending"})
        if not entry_view and tavern.owner_id and tavern.owner_id == user_id:
            tavern_dict["target_place_relationships"] = self._target_relationships(tavern_id)
            tavern_dict["pending_place_relationships"] = self._target_relationships(tavern_id, statuses={"pending"})

        if user_id:
            visitor_state = self.store.get_visitor_state(tavern_id, user_id)
            if visitor_state:
                tavern_dict["visitor_state"] = visitor_state.to_dict()

        return tavern_dict

    def create_tavern(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        """创建空间"""
        owner_id = str(owner_id or "").strip()
        if not owner_id:
            raise HTTPException(status_code=401, detail="创建空间需要明确店主身份")
        tavern_id = data.get("id") or f"tavern_{uuid.uuid4().hex[:12]}"
        now = _utc_now_iso()
        place_type = _require_valid_place_type(data["place_type"]) if "place_type" in data else "tavern"
        access = data.get("access", "public")
        if place_type == "home":
            access = _normalize_home_access(access)

        tavern = Tavern(
            id=tavern_id,
            name=data.get("name", "未命名空间"),
            description=data.get("description", ""),
            lat=float(data.get("lat", 0)),
            lon=float(data.get("lon", 0)),
            address=data.get("address", ""),
            owner_id=owner_id or data.get("owner_id", ""),
            created_at=now,
            access=access,
            password_hash="",
            status="open",
            roleplay_mode=_normalize_roleplay_mode(data.get("roleplay_mode", "ai_only")),
            layout_style=_normalize_tavern_layout_style(data.get("layout_style", "lobby")),
            place_type=place_type,
            special_type=_normalize_special_type(data.get("special_type", "")),
            character_claims=_normalize_character_claims(data.get("character_claims", [])),
            gameplay_definitions=_normalize_metadata_list(data.get("gameplay_definitions", [])),
            output_rules=_normalize_metadata_list(data.get("output_rules", [])),
            prompt_blocks=_normalize_metadata_list(data.get("prompt_blocks", [])),
            runtime_presets=_normalize_metadata_list(data.get("runtime_presets", [])),
            skill_packs=normalize_skill_pack_settings(data.get("skill_packs", [])),
            active_preset_id=str(data.get("active_preset_id") or ""),
            memory_policy=deepcopy(data.get("memory_policy", {})) if isinstance(data.get("memory_policy"), dict) else {},
            scene_prompt=data.get("scene_prompt", ""),
            group_chat_enabled=_normalize_bool(data.get("group_chat_enabled", False)),
            group_chat_config=_normalize_group_chat_config(data.get("group_chat_config", {})),
            llm_config=LLMConfig.from_dict(data.get("llm_config", {})),
            timezone=data.get("timezone"),
            operating_hours=deepcopy(data.get("operating_hours", {})) if isinstance(data.get("operating_hours"), dict) else {},
            home_members=_normalize_home_members(data.get("home_members", []), tavern_id),
            place_relationships=_normalize_place_relationships(data.get("place_relationships", [])),
        )

        # 处理密码
        password = data.get("password", "")
        if tavern.access == "password" and password:
            tavern.password_hash = _hash_password(password)

        tavern = self.store.create_tavern(tavern)

        # 保存 LLM 配置（包含 api_key；本地后端可仅凭 base_url 配置）
        llm_data = data.get("llm_config", {})
        if llm_data:
            llm_config = LLMConfig.from_dict(llm_data)
        else:
            llm_config = None
        if llm_config:
            llm_config = _hydrate_system_public_welfare_llm_config(tavern, llm_config, tavern_id=tavern_id)
        if llm_config and (llm_config.is_configured() or str(llm_config.backend or "").strip().lower() in {"rules", "rule_based", "public_welfare"}):
            self.store.save_llm_config(tavern_id, llm_config)
            # 更新 status
            tavern.llm_config = llm_config
            tavern.status = "open"
            tavern = self.store.update_tavern(tavern)
        elif llm_config and _is_system_or_public_welfare_tavern_data(tavern):
            self.store.save_llm_config(tavern_id, llm_config)
            tavern.llm_config = llm_config
            tavern.status = "open"
            tavern = self.store.update_tavern(tavern)
        elif _is_system_or_public_welfare_tavern_data(tavern):
            # System/public-welfare shops remain normally open without a
            # configured external provider; runtime uses the local rules
            # fallback until the owner explicitly saves a working model.
            tavern.status = "open"
            tavern = self.store.update_tavern(tavern)

        return tavern.to_dict_private(owner_id)

    def update_tavern(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """更新空间"""
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        # 更新字段
        if "name" in data:
            tavern.name = data["name"]
        if "description" in data:
            tavern.description = data["description"]
        if "lat" in data:
            tavern.lat = float(data["lat"])
        if "lon" in data:
            tavern.lon = float(data["lon"])
        if "address" in data:
            tavern.address = data["address"]
        if "scene_prompt" in data:
            tavern.scene_prompt = data["scene_prompt"]
        if "status" in data:
            tavern.status = data["status"]
        if "roleplay_mode" in data:
            tavern.roleplay_mode = _normalize_roleplay_mode(data.get("roleplay_mode"))
        if "layout_style" in data:
            tavern.layout_style = _normalize_tavern_layout_style(data.get("layout_style"))
        if "place_type" in data:
            tavern.place_type = _require_valid_place_type(data.get("place_type"))
            if tavern.place_type == "home":
                tavern.access = _normalize_home_access(tavern.access)
        if "special_type" in data:
            tavern.special_type = _normalize_special_type(data.get("special_type"))
        if "access" in data:
            tavern.access = _normalize_home_access(data["access"]) if tavern.place_type == "home" else data["access"]
        if "character_claims" in data:
            tavern.character_claims = _normalize_character_claims(data.get("character_claims"))
        if "home_members" in data:
            tavern.home_members = _normalize_home_members(data.get("home_members"), tavern.id)
        if "place_relationships" in data:
            tavern.place_relationships = _normalize_place_relationships(data.get("place_relationships"))
        if "characters" in data and isinstance(data["characters"], list):
            tavern.characters = [
                _character_from_payload(character_data, tavern_id)
                for character_data in data["characters"]
                if isinstance(character_data, dict)
            ]
        if "world_info" in data and isinstance(data["world_info"], list):
            tavern.world_info = [
                _world_info_from_payload(entry_data, tavern_id)
                for entry_data in data["world_info"]
                if isinstance(entry_data, dict)
            ]
        for metadata_key in ("groups", "bookmarks", "chat_templates", "gameplay_definitions", "output_rules", "prompt_blocks", "runtime_presets"):
            if metadata_key in data:
                setattr(tavern, metadata_key, _normalize_metadata_list(data[metadata_key]))
        if "skill_packs" in data:
            tavern.skill_packs = normalize_skill_pack_settings(data.get("skill_packs"))
        if "active_preset_id" in data:
            tavern.active_preset_id = str(data.get("active_preset_id") or "").strip()
        if "memory_policy" in data:
            tavern.memory_policy = deepcopy(data["memory_policy"]) if isinstance(data["memory_policy"], dict) else {}
        if "group_chat_enabled" in data:
            tavern.group_chat_enabled = _normalize_bool(data.get("group_chat_enabled"))
        if "group_chat_config" in data:
            tavern.group_chat_config = _normalize_group_chat_config(data.get("group_chat_config"))
        if "timezone" in data:
            tavern.timezone = data.get("timezone")
        if "operating_hours" in data:
            tavern.operating_hours = deepcopy(data["operating_hours"]) if isinstance(data["operating_hours"], dict) else {}

        # 处理密码更新
        if "password" in data:
            password = data["password"]
            if password:
                tavern.password_hash = _hash_password(password)
            else:
                tavern.password_hash = ""

        # 更新 LLM 配置
        llm_data = data.get("llm_config")
        if llm_data:
            preserved_token_usage = self.store.get_token_usage(tavern_id) or tavern.llm_config.token_used
            stored_llm_config = self._get_private_llm_config(tavern_id)
            llm_config = LLMConfig.from_dict(
                {
                    **llm_data,
                    "token_used": llm_data.get("token_used", preserved_token_usage),
                }
            )
            if (
                not llm_config.api_key
                and stored_llm_config
                and stored_llm_config.backend == llm_config.backend
            ):
                llm_config.api_key = stored_llm_config.api_key
            llm_config = _hydrate_system_public_welfare_llm_config(tavern, llm_config, tavern_id=tavern_id)
            if llm_config.is_configured():
                self.store.save_llm_config(tavern_id, llm_config)
                tavern.llm_config = llm_config
                tavern.status = "open"
            elif _is_system_or_public_welfare_tavern_data(tavern):
                self.store.save_llm_config(tavern_id, llm_config)
                tavern.llm_config = llm_config
                tavern.status = "open"
            else:
                tavern.llm_config = llm_config
                tavern.status = "closed"

        # 更新语音配置
        voice_data = data.get("voice_config")
        if voice_data:
            voice_config = VoiceConfig.from_dict(voice_data)
            tavern.voice_config = voice_config
            self.store.save_voice_config(tavern_id, voice_config)

        tavern = self.store.update_tavern(tavern)
        return tavern.to_dict_private(user_id)

    def delete_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, str]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        self.store.delete_tavern(tavern_id)
        return {"ok": True, "tavern_id": tavern_id}

    def add_home_member(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此 Home 的主人")
        if tavern.place_type != "home":
            raise HTTPException(status_code=400, detail="只有 Home 可以添加家庭成员")

        member_payload = {
            **data,
            "id": data.get("id") or f"member_{uuid.uuid4().hex[:12]}",
            "home_id": tavern_id,
            "created_at": data.get("created_at") or _utc_now_iso(),
        }
        members = _normalize_home_members([member_payload], tavern_id)
        if not members:
            raise HTTPException(status_code=400, detail="家庭成员名称不能为空")
        member = members[0]
        tavern.home_members.append(member)
        tavern.home_members = _normalize_home_members(tavern.home_members, tavern_id)
        self.store.update_tavern(tavern)
        return {"ok": True, "tavern_id": tavern_id, "member": member, "members": deepcopy(tavern.home_members)}

    def create_school_enrollment(self, home_tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        school_tavern_id = str(data.get("school_tavern_id") or data.get("target_tavern_id") or "").strip()
        school = self.store.get_tavern(school_tavern_id)
        if not school:
            raise HTTPException(status_code=404, detail="学校地点不存在")
        if school.place_type != "school":
            raise HTTPException(status_code=400, detail="目标地点不是学校")
        return self.create_place_relationship(
            home_tavern_id,
            {
                **data,
                "target_tavern_id": school_tavern_id,
                "relation_type": "school_enrollment",
                "target_role": data.get("target_role") or "school",
                "source_role": data.get("source_role") or "student",
            },
            user_id,
        )

    def create_place_relationship(self, home_tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        home = self.store.get_tavern(home_tavern_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home 不存在")
        if home.owner_id and home.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此 Home 的主人")
        if home.place_type != "home":
            raise HTTPException(status_code=400, detail="只能从 Home 发起地点关系")

        member_id = str(data.get("member_id") or "").strip()
        target_tavern_id = str(data.get("target_tavern_id") or data.get("school_tavern_id") or "").strip()
        relation_type = _require_valid_place_relationship_type(data.get("relation_type") or "school_enrollment")
        member = next((item for item in home.home_members if item.get("id") == member_id), None)
        if not member:
            raise HTTPException(status_code=404, detail="家庭成员不存在")
        target = self.store.get_tavern(target_tavern_id)
        if not target:
            raise HTTPException(status_code=404, detail="目标地点不存在")
        if relation_type == "school_enrollment" and target.place_type != "school":
            raise HTTPException(status_code=400, detail="学生-学校关系的目标地点必须是学校")

        status = "approved" if target.owner_id and target.owner_id == home.owner_id else "pending"
        relationship = {
            "id": f"rel_{uuid.uuid4().hex[:12]}",
            "relation_type": relation_type,
            "source_tavern_id": home.id,
            "source_member_id": member_id,
            "target_tavern_id": target.id,
            "status": status,
            "display_name": str(data.get("display_name") or member.get("display_name") or member.get("name") or "").strip()[:80],
            "visibility": "target_summary",
            "requested_by": user_id,
            "created_at": _utc_now_iso(),
            "source_role": str(data.get("source_role") or "").strip()[:60],
            "target_role": str(data.get("target_role") or "").strip()[:60],
        }
        if status == "approved":
            relationship["decided_by"] = target.owner_id or user_id
            relationship["decided_at"] = relationship["created_at"]
        note = str(data.get("note") or "").strip()
        if note:
            relationship["note"] = note[:240]

        relationship = {key: value for key, value in relationship.items() if value != ""}
        home.place_relationships.append(relationship)
        home.place_relationships = _normalize_place_relationships(home.place_relationships)
        self.store.update_tavern(home)
        return {"ok": True, "relationship": relationship}

    def decide_place_relationship(
        self,
        target_tavern_id: str,
        relationship_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        target = self.store.get_tavern(target_tavern_id)
        if not target:
            raise HTTPException(status_code=404, detail="目标地点不存在")
        if target.owner_id and target.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是目标地点的主人")

        next_status = _normalize_place_relationship_status(data.get("status"))
        if next_status == "pending":
            raise HTTPException(status_code=400, detail="审批结果不能是 pending")

        source_tavern, relationship = self._find_relationship(relationship_id, target_tavern_id=target_tavern_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="关系记录不存在")

        relationship["status"] = next_status
        relationship["decided_by"] = user_id
        relationship["decided_at"] = _utc_now_iso()
        note = str(data.get("note") or "").strip()
        if note:
            relationship["note"] = note[:240]
        source_tavern.place_relationships = _normalize_place_relationships(source_tavern.place_relationships)
        self.store.update_tavern(source_tavern)
        return {"ok": True, "relationship": relationship}

    def list_school_members(self, school_tavern_id: str, user_id: str = "") -> dict[str, Any]:
        school = self.store.get_tavern(school_tavern_id)
        if not school:
            raise HTTPException(status_code=404, detail="学校地点不存在")
        if school.access == "private" and school.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此学校地点是私人的")
        members = []
        for home, relationship in self._school_relationships_with_sources(school_tavern_id, statuses={"approved"}):
            member = next((item for item in home.home_members if item.get("id") == relationship.get("source_member_id")), None)
            if not member:
                continue
            members.append({
                "relationship_id": relationship.get("id", ""),
                "home_tavern_id": home.id,
                "member_id": member.get("id", ""),
                "display_name": relationship.get("display_name") or member.get("display_name") or member.get("name", ""),
                "member_type": member.get("member_type", "silent_member"),
                "avatar": member.get("avatar", ""),
                "speech_mode": member.get("speech_mode", "silent"),
            })
        members.sort(key=lambda item: (str(item.get("display_name") or ""), str(item.get("relationship_id") or "")))
        return {"tavern_id": school_tavern_id, "members": members, "count": len(members)}

    def _all_taverns_for_relationships(self) -> list[Tavern]:
        getter = getattr(self.store, "list_all_taverns", None)
        if callable(getter):
            return getter()
        return self.store.list_taverns(include_private=True)

    def _find_relationship(
        self,
        relationship_id: str,
        target_tavern_id: str = "",
    ) -> tuple[Tavern | None, dict[str, Any] | None]:
        for tavern in self._all_taverns_for_relationships():
            for relationship in tavern.place_relationships:
                if relationship.get("id") != relationship_id:
                    continue
                if target_tavern_id and relationship.get("target_tavern_id") != target_tavern_id:
                    continue
                return tavern, relationship
        return None, None

    def _target_relationships(self, target_tavern_id: str, statuses: set[str] | None = None) -> list[dict[str, Any]]:
        return [
            deepcopy(relationship)
            for _, relationship in self._target_relationships_with_sources(target_tavern_id, statuses=statuses)
        ]

    def _target_relationships_with_sources(
        self,
        target_tavern_id: str,
        statuses: set[str] | None = None,
    ) -> list[tuple[Tavern, dict[str, Any]]]:
        matches: list[tuple[Tavern, dict[str, Any]]] = []
        for tavern in self._all_taverns_for_relationships():
            for relationship in tavern.place_relationships:
                if relationship.get("target_tavern_id") != target_tavern_id:
                    continue
                if statuses and relationship.get("status") not in statuses:
                    continue
                matches.append((tavern, relationship))
        return matches

    def _school_relationships(self, school_tavern_id: str, statuses: set[str] | None = None) -> list[dict[str, Any]]:
        return [
            deepcopy(relationship)
            for _, relationship in self._school_relationships_with_sources(school_tavern_id, statuses=statuses)
        ]

    def _school_relationships_with_sources(
        self,
        school_tavern_id: str,
        statuses: set[str] | None = None,
    ) -> list[tuple[Tavern, dict[str, Any]]]:
        matches: list[tuple[Tavern, dict[str, Any]]] = []
        for tavern in self._all_taverns_for_relationships():
            for relationship in tavern.place_relationships:
                if relationship.get("relation_type") != "school_enrollment":
                    continue
                if relationship.get("target_tavern_id") != school_tavern_id:
                    continue
                if statuses and relationship.get("status") not in statuses:
                    continue
                matches.append((tavern, relationship))
        return matches

    def enter_tavern(
        self,
        tavern_id: str,
        password: str = "",
        user_id: str = "",
        visitor_gender: str = "",
    ) -> dict[str, Any]:
        """进入空间（验证密码）"""
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        # 密码验证
        if tavern.access == "password":
            if not password:
                raise HTTPException(status_code=401, detail="此空间需要密码")
            if not _verify_password(password, tavern.password_hash):
                raise HTTPException(status_code=401, detail="密码错误")

        # 私人空间只允许主人进入
        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此空间是私人的")

        # 更新访客状态。有明确访客身份时才写入，避免匿名空 ID 污染回访面板。
        now = _utc_now_iso()
        visitor_state = None
        if user_id:
            visitor_state = self.store.get_visitor_state(tavern_id, user_id) or VisitorState(
                visitor_id=user_id,
                tavern_id=tavern_id,
            )

            # 修行空间离线结算逻辑
            if is_cultivation_tavern(tavern):
                cultivation_receipt = calculate_cultivation_receipt_with_card(tavern, visitor_state, now)

            visitor_state.visit_count += 1
            if not visitor_state.first_visit:
                visitor_state.first_visit = now
            visitor_state.last_visit = now
            if visitor_gender:
                visitor_state.gender = _normalize_gender(visitor_gender)
            visitor_state.relationship_stage = _visitor_relationship_stage(
                visitor_state.relationship_strength,
                visitor_state.visit_count,
            )
            self.store.update_visitor_state(tavern_id, visitor_state)

        # 更新空间访问计数
        tavern.visit_count += 1
        self.store.update_tavern(tavern)

        return {
            "ok": True,
            "tavern_id": tavern_id,
            "visitor_id": user_id,
            "visit_count": visitor_state.visit_count if visitor_state else 0,
            "visitor_state": visitor_state.to_dict() if visitor_state else None,
            "cultivation_receipt": cultivation_receipt if 'cultivation_receipt' in locals() else None,
            "status": tavern.status,
            "characters": [c.to_dict() for c in tavern.characters],
            "scene_prompt": tavern.scene_prompt,
            "first_mes": tavern.characters[0].first_mes if tavern.characters else "欢迎光临。",
        }

    # ── 角色管理 ────────────────────────

    def add_character(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        character = _character_from_payload(data, tavern_id)
        tavern.characters.append(character)
        world_info_payload = data.get("_world_info") or data.get("world_info")
        if isinstance(world_info_payload, list):
            tavern.world_info.extend(
                _world_info_from_payload(entry_data, tavern_id)
                for entry_data in world_info_payload
                if isinstance(entry_data, dict)
            )
        self.store.update_tavern(tavern)
        return character.to_dict()

    def update_character(self, tavern_id: str, char_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        char = next((c for c in tavern.characters if c.id == char_id), None)
        if not char:
            raise HTTPException(status_code=404, detail="角色不存在")

        # 更新字段
        for key in ("name", "description", "personality", "scenario", "system_prompt", "first_mes", "mes_example"):
            if key in data:
                setattr(char, key, data[key])
        if "hobbies" in data:
            char.hobbies = _normalize_string_list(data["hobbies"], split_commas=True)
        if "gender" in data:
            char.gender = _normalize_gender(data.get("gender"))
        if "alternate_greetings" in data:
            char.alternate_greetings = _normalize_string_list(data["alternate_greetings"])
        if "tags" in data:
            char.tags = _normalize_string_list(data["tags"], split_commas=True)
        if "avatar" in data:
            char.avatar = str(data.get("avatar") or "").strip()
        if "appearance" in data:
            char.appearance = _normalize_character_appearance(data.get("appearance"))
        if "talkativeness" in data:
            char.talkativeness = _normalize_talkativeness(data.get("talkativeness"))
        if "sprites" in data:
            sprite_map = _normalize_sprite_map(data["sprites"])
            char.sprites = TavernSpriteSet(sprite_map) if sprite_map else None

        self.store.update_tavern(tavern)
        return char.to_dict()

    def delete_character(self, tavern_id: str, char_id: str, user_id: str = "") -> dict[str, str]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        tavern.characters = [c for c in tavern.characters if c.id != char_id]
        self.store.update_tavern(tavern)
        return {"ok": True, "character_id": char_id}

    def import_character_card(
        self,
        tavern_id: str,
        card_data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        """从 SillyTavern Character Card V2 格式导入角色"""
        # 解析 SillyTavern V2 格式
        parsed = _parse_sillytavern_card(card_data)
        return self.add_character(tavern_id, parsed, user_id)

    # ── 运营指标 ────────────────────────

    def get_tavern_metrics(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """获取空间运营指标"""
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="空间不存在")

        # 验证访问权限（只有空间主人可以看到完整指标）
        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此空间的主人")

        # Token 用量
        token_usage = self.store.get_token_usage(tavern_id)

        # 从访客状态获取访问统计
        visitor_states = self.store.list_visitor_states(tavern_id)
        total_visits = sum(vs.visit_count for vs in visitor_states)
        unique_visitors = len(visitor_states)

        # 从聊天历史获取消息统计和 NPC 排行
        sessions = self.store.list_chat_sessions(tavern_id, limit=None)
        total_messages = sum(s.get("message_count", 0) for s in sessions)

        # NPC 互动排行：按 character_id 聚合消息数
        npc_stats: dict[str, dict[str, Any]] = {}
        for session in sessions:
            char_id = session.get("character_id", "")
            if not char_id:
                continue
            if char_id not in npc_stats:
                # 查找角色名称
                char_name = next(
                    (c.name for c in tavern.characters if c.id == char_id),
                    char_id,
                )
                npc_stats[char_id] = {
                    "character_id": char_id,
                    "character_name": char_name,
                    "message_count": 0,
                    "last_interaction": "",
                }
            npc_stats[char_id]["message_count"] += session.get("message_count", 0)
            last_msg_time = session.get("updated_at", "")
            if last_msg_time and npc_stats[char_id]["last_interaction"] < last_msg_time:
                npc_stats[char_id]["last_interaction"] = last_msg_time

        # 按消息数排序
        npc_rankings = sorted(
            npc_stats.values(),
            key=lambda x: x["message_count"],
            reverse=True,
        )

        # 热门时段分析：从所有消息时间戳提取小时分布
        hourly_counts = [0] * 24
        daily_counts: dict[str, int] = {}
        for session in sessions:
            last_time = session.get("updated_at", "")
            if not last_time:
                continue
            try:
                # 解析 ISO 时间格式
                from datetime import datetime
                dt = datetime.fromisoformat(last_time.replace("Z", "+00:00"))
                hour = dt.hour
                hourly_counts[hour] += session.get("message_count", 0)
                date_key = dt.strftime("%Y-%m-%d")
                daily_counts[date_key] = daily_counts.get(date_key, 0) + session.get("message_count", 0)
            except (ValueError, TypeError):
                continue

        # 峰值时段：找出消息最多的 3 个小时
        peak_hours = sorted(
            range(24),
            key=lambda h: hourly_counts[h],
            reverse=True,
        )[:3]

        # 最近 7 天的日期统计
        peak_days = [
            {"date": date, "visit_count": count}
            for date, count in sorted(
                daily_counts.items(),
                key=lambda x: x[0],
                reverse=True,
            )
        ][:7]

        return {
            "tavern_id": tavern_id,
            "token_usage": token_usage,
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "total_messages": total_messages,
            "npc_rankings": npc_rankings,
            "peak_hours": peak_hours,
            "peak_days": peak_days,
        }


# ─────────────────────────────────────────
# SillyTavern 角色卡解析
# ─────────────────────────────────────────

def _parse_sillytavern_card(card: dict[str, Any]) -> dict[str, Any]:
    """
    解析 SillyTavern Character Card V2 格式

    字段映射：
    data.name → name
    data.description → description
    data.personality → personality
    data.scenario → scenario
    data.system_prompt → system_prompt
    data.first_mes → first_mes
    data.mes_example → mes_example
    data.alternate_greetings → alternate_greetings
    data.tags → tags
    data.character_book.entries → world_info
    """
    # 支持两种格式：直接传入 data 对象，或传入完整的 card 对象
    data = card.get("data", card)

    result = {
        "name": data.get("name", "未命名角色"),
        "description": data.get("description", ""),
        "personality": data.get("personality", ""),
        "scenario": data.get("scenario", ""),
        "gender": data.get("gender", ""),
        "system_prompt": data.get("system_prompt", ""),
        "first_mes": data.get("first_mes", ""),
        "mes_example": data.get("mes_example", ""),
        "alternate_greetings": data.get("alternate_greetings", []),
        "tags": data.get("tags", []),
        "avatar": data.get("avatar", ""),
        "appearance": data.get("appearance", {}),
        "talkativeness": data.get("talkativeness", 0.5),
        "sprites": data.get("sprites", {}),
        "hobbies": data.get("hobbies", []),
    }

    # 解析 character_book (WorldInfo)
    char_book = data.get("character_book", {})
    entries = char_book.get("entries", [])
    world_info = []
    for entry in entries:
        world_info.append({
            "keys": entry.get("keys", []),
            "content": entry.get("content", ""),
            "selective": entry.get("selective", True),
            "constant": entry.get("constant", False),
            "depth": entry.get("depth", 4),
            "order": entry.get("order", 100),
        })

    if world_info:
        result["_world_info"] = world_info

    return result


# ─────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────

def _hash_password(password: str) -> str:
    """简单密码 hash（生产环境建议用 bcrypt）"""
    return hashlib.sha256(password.encode()).hexdigest()


def _verify_password(password: str, hashed: str) -> bool:
    return _hash_password(password) == hashed


def _normalize_string_list(value: Any, split_commas: bool = False) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []

    text = str(value)
    if split_commas:
        for separator in (",", "，", "\r", "\n"):
            text = text.replace(separator, "\n")
    return [item.strip() for item in text.splitlines() if item.strip()]


def _normalize_sprite_map(value: Any) -> dict[str, str]:
    if isinstance(value, TavernSpriteSet):
        value = value.to_dict()
    if not isinstance(value, dict):
        return {}

    sprite_map: dict[str, str] = {}
    for key, url in value.items():
        normalized_key = str(key).strip()
        normalized_url = str(url or "").strip()
        if normalized_key and normalized_url:
            sprite_map[normalized_key] = normalized_url
    return sprite_map


def _normalize_gender(value: Any) -> str:
    """Normalize visitor/NPC gender into the canonical WORLD_SCHEMA enum."""
    raw = str(value or "").strip().lower()
    if not raw:
        return "unspecified"
    normalized = raw.replace("_", "-").replace(" ", "-")
    aliases = {
        "unspecified": "unspecified",
        "unknown": "unspecified",
        "none": "unspecified",
        "not-specified": "unspecified",
        "未说明": "unspecified",
        "不透露": "unspecified",
        "保密": "unspecified",
        "female": "female",
        "woman": "female",
        "girl": "female",
        "f": "female",
        "女": "female",
        "女性": "female",
        "女生": "female",
        "male": "male",
        "man": "male",
        "boy": "male",
        "m": "male",
        "男": "male",
        "男性": "male",
        "男生": "male",
        "nonbinary": "nonbinary",
        "non-binary": "nonbinary",
        "nb": "nonbinary",
        "非二元": "nonbinary",
        "非二元性别": "nonbinary",
        "other": "other",
        "其他": "other",
        "其它": "other",
    }
    gender = aliases.get(normalized, normalized)
    return gender if gender in GENDER_VALUES else "unspecified"


def _normalize_talkativeness(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.5
    if parsed != parsed:
        return 0.5
    return max(0.0, min(1.0, parsed))


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}
    return bool(value)


def _normalize_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def _normalize_group_chat_config(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        value = {}

    allowed_strategies = {"balanced", "weighted_random", "round_robin", "relevance"}
    strategy = str(value.get("strategy") or "balanced").strip()
    if strategy not in allowed_strategies:
        strategy = "balanced"

    return {
        "strategy": strategy,
        "max_responses_per_turn": _normalize_int(value.get("max_responses_per_turn", 2), 2, 1, 3),
        "response_cooldown_seconds": _normalize_int(value.get("response_cooldown_seconds", 0), 0, 0, 30),
        "require_name_prefix": _normalize_bool(value.get("require_name_prefix", True)),
    }


def _normalize_roleplay_mode(value: Any) -> str:
    mode = str(value or "ai_only").strip().lower()
    return mode if mode in ROLEPLAY_MODES else "ai_only"


def _normalize_tavern_layout_style(value: Any) -> str:
    layout_style = str(value or "lobby").strip().lower()
    return layout_style if layout_style in TAVERN_LAYOUT_STYLES else "lobby"


def _normalize_special_type(value: Any) -> str:
    s = str(value or "").strip().lower()
    return s if s in SPECIAL_TYPES else ""


def _normalize_tavern_list_special_type_filter(value: Any) -> str:
    special_type = str(value or "").strip().lower().replace("_", "-")
    return special_type if special_type in SPECIAL_TYPES and special_type else ""


def _normalize_tavern_list_place_type_filter(value: Any) -> str:
    place_type = str(value or "").strip().lower().replace("_", "-")
    return place_type if place_type in PLACE_TYPES else ""


def _normalize_place_type(value: Any) -> str:
    place_type = str(value or "tavern").strip().lower().replace("_", "-")
    return place_type if place_type in PLACE_TYPES else "tavern"


def _require_valid_place_type(value: Any) -> str:
    place_type = str(value or "").strip().lower().replace("_", "-")
    if place_type in PLACE_TYPES:
        return place_type
    raise HTTPException(status_code=400, detail="地点类型不受支持")


def _normalize_home_access(value: Any) -> str:
    access = str(value or "private").strip().lower()
    return access if access in {"private", "password"} else "private"


def _normalize_home_member_type(value: Any) -> str:
    member_type = str(value or "silent_member").strip().lower()
    return member_type if member_type in HOME_MEMBER_TYPES else "silent_member"


def _normalize_home_member_speech_mode(value: Any, member_type: str) -> str:
    speech_mode = str(value or "").strip().lower()
    if member_type == "conversational_character":
        return "character" if speech_mode in {"", "character"} else "character"
    if member_type == "display_object":
        return "display"
    return "silent"


def _normalize_home_members(value: Any, home_id: str = "") -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    members: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        member_id = str(item.get("id") or "").strip()
        name = str(item.get("name") or item.get("display_name") or "").strip()
        if not name:
            continue
        if not member_id:
            member_id = f"member_{uuid.uuid4().hex[:12]}"
        if member_id in seen_ids:
            continue
        seen_ids.add(member_id)
        member_type = _normalize_home_member_type(item.get("member_type"))
        speech_mode = _normalize_home_member_speech_mode(item.get("speech_mode"), member_type)
        member: dict[str, Any] = {
            "id": member_id,
            "home_id": str(item.get("home_id") or home_id or "").strip(),
            "name": name[:80],
            "display_name": str(item.get("display_name") or name).strip()[:80],
            "member_type": member_type,
            "speech_mode": speech_mode,
            "description": str(item.get("description") or "").strip()[:500],
            "avatar": str(item.get("avatar") or "").strip(),
            "created_at": str(item.get("created_at") or "").strip(),
        }
        character_id = str(item.get("character_id") or "").strip()
        if member_type == "conversational_character" and character_id:
            member["character_id"] = character_id
        metadata = item.get("metadata")
        if isinstance(metadata, dict):
            member["metadata"] = deepcopy(metadata)
        members.append(member)
    return members


def _normalize_place_relationship_status(value: Any) -> str:
    status = str(value or "pending").strip().lower()
    return status if status in PLACE_RELATIONSHIP_STATUSES else "pending"


def _normalize_place_relationship_type(value: Any) -> str:
    relation_type = str(value or "school_enrollment").strip().lower().replace("-", "_")
    return relation_type if relation_type in PLACE_RELATIONSHIP_TYPES else "school_enrollment"


def _require_valid_place_relationship_type(value: Any) -> str:
    relation_type = str(value or "").strip().lower().replace("-", "_")
    if relation_type in PLACE_RELATIONSHIP_TYPES:
        return relation_type
    raise HTTPException(status_code=400, detail="关系类型不受支持")


def _normalize_place_relationships(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    relationships: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        relationship_id = str(item.get("id") or "").strip()
        source_tavern_id = str(item.get("source_tavern_id") or item.get("home_tavern_id") or "").strip()
        source_member_id = str(item.get("source_member_id") or item.get("member_id") or "").strip()
        target_tavern_id = str(item.get("target_tavern_id") or item.get("school_tavern_id") or "").strip()
        if not relationship_id:
            relationship_id = f"rel_{uuid.uuid4().hex[:12]}"
        if not source_tavern_id or not source_member_id or not target_tavern_id or relationship_id in seen_ids:
            continue
        seen_ids.add(relationship_id)
        relationship: dict[str, Any] = {
            "id": relationship_id,
            "relation_type": _normalize_place_relationship_type(item.get("relation_type")),
            "source_tavern_id": source_tavern_id,
            "source_member_id": source_member_id,
            "target_tavern_id": target_tavern_id,
            "status": _normalize_place_relationship_status(item.get("status")),
            "display_name": str(item.get("display_name") or "").strip()[:80],
            "visibility": str(item.get("visibility") or "target_summary").strip()[:40],
            "requested_by": str(item.get("requested_by") or "").strip(),
            "decided_by": str(item.get("decided_by") or "").strip(),
            "created_at": str(item.get("created_at") or "").strip(),
            "decided_at": str(item.get("decided_at") or "").strip(),
            "note": str(item.get("note") or "").strip()[:240],
            "source_role": str(item.get("source_role") or "").strip()[:60],
            "target_role": str(item.get("target_role") or "").strip()[:60],
        }
        relationships.append({key: value for key, value in relationship.items() if value != ""})
    return relationships


def _normalize_character_claim_status(value: Any) -> str:
    status = str(value or "pending").strip().lower()
    return status if status in ROLEPLAY_CLAIM_STATUSES else "pending"


def _normalize_character_claims(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    claims: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        claim_id = str(item.get("id") or "").strip()
        character_id = str(item.get("character_id") or "").strip()
        player_id = str(item.get("player_id") or "").strip()
        if not claim_id or not character_id or not player_id or claim_id in seen_ids:
            continue
        seen_ids.add(claim_id)
        claim: dict[str, Any] = {
            "id": claim_id,
            "character_id": character_id,
            "player_id": player_id,
            "player_name": str(item.get("player_name") or "").strip()[:80],
            "status": _normalize_character_claim_status(item.get("status")),
            "requested_at": str(item.get("requested_at") or "").strip(),
        }
        decided_at = str(item.get("decided_at") or "").strip()
        note = str(item.get("note") or "").strip()
        if decided_at:
            claim["decided_at"] = decided_at
        if note:
            claim["note"] = note[:240]
        claims.append(claim)
    return claims


def _normalize_character_appearance(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}

    active_preset_id = str(
        value.get("active_preset_id")
        or value.get("active")
        or ""
    ).strip()

    wardrobe_source = value.get("wardrobe_ids", value.get("wardrobe", []))
    if isinstance(wardrobe_source, list):
        wardrobe_ids = []
        for item in wardrobe_source:
            preset_id = str(item or "").strip()
            if preset_id and preset_id not in wardrobe_ids:
                wardrobe_ids.append(preset_id)
    else:
        wardrobe_ids = _normalize_string_list(wardrobe_source, split_commas=True)

    if active_preset_id and active_preset_id not in wardrobe_ids:
        wardrobe_ids.insert(0, active_preset_id)

    normalized: dict[str, Any] = {}
    if active_preset_id:
        normalized["active_preset_id"] = active_preset_id
    if wardrobe_ids:
        normalized["wardrobe_ids"] = wardrobe_ids[:8]

    note = str(value.get("note") or "").strip()
    if note:
        normalized["note"] = note[:200]
    return normalized


def _normalize_metadata_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [deepcopy(item) for item in value if isinstance(item, dict)]


def _character_from_payload(data: dict[str, Any], tavern_id: str) -> TavernCharacter:
    sprite_map = _normalize_sprite_map(data.get("sprites", {}))
    return TavernCharacter(
        id=data.get("id") or f"char_{uuid.uuid4().hex[:12]}",
        tavern_id=tavern_id,
        name=data.get("name", "未命名角色"),
        description=data.get("description", ""),
        personality=data.get("personality", ""),
        scenario=data.get("scenario", ""),
        gender=_normalize_gender(data.get("gender")),
        system_prompt=data.get("system_prompt", ""),
        first_mes=data.get("first_mes", ""),
        mes_example=data.get("mes_example", ""),
        alternate_greetings=_normalize_string_list(data.get("alternate_greetings", [])),
        tags=_normalize_string_list(data.get("tags", []), split_commas=True),
        sprites=TavernSpriteSet(sprite_map) if sprite_map else None,
        avatar=str(data.get("avatar") or "").strip(),
        appearance=_normalize_character_appearance(data.get("appearance")),
        talkativeness=_normalize_talkativeness(data.get("talkativeness", 0.5)),
        hobbies=_normalize_string_list(data.get("hobbies", []), split_commas=True),
    )


def _world_info_from_payload(data: dict[str, Any], tavern_id: str) -> WorldInfoEntry:
    entry = deepcopy(data)
    entry["id"] = entry.get("id") or f"wi_{uuid.uuid4().hex[:12]}"
    entry["tavern_id"] = tavern_id
    if "order" not in entry and "insertion_order" in entry:
        entry["order"] = entry.get("insertion_order")
    if not isinstance(entry.get("keys"), list):
        entry["keys"] = _normalize_string_list(entry.get("keys", []), split_commas=True)
    if not isinstance(entry.get("keys_secondary"), list):
        entry["keys_secondary"] = _normalize_string_list(entry.get("keys_secondary", []), split_commas=True)
    return WorldInfoEntry.from_dict(entry)


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """计算两点间的 Haversine 距离（米）"""
    import math
    R = 6371000  # 地球半径（米）
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _matches_tavern_query(tavern: Tavern, query: str) -> bool:
    """Match a tavern against visitor-facing discovery text."""
    needle = query.casefold()
    fields: list[Any] = [
        tavern.id,
        tavern.name,
        tavern.description,
        tavern.address,
        tavern.access,
        tavern.status,
        tavern.place_type,
        tavern.special_type,
        tavern.scene_prompt,
    ]

    for character in tavern.characters:
        fields.extend([
            character.name,
            character.description,
            character.personality,
            character.scenario,
            character.gender,
            *character.tags,
        ])

    for entry in tavern.world_info:
        fields.extend([*entry.keys, *entry.keys_secondary, entry.content])

    return any(needle in str(value).casefold() for value in fields if value)


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ─────────────────────────────────────────
# PNG tEXt chunk 提取（用于角色卡 PNG 导入）
# ─────────────────────────────────────────

def extract_char_card_from_png(png_bytes: bytes) -> dict[str, Any] | None:
    """从 SillyTavern 角色卡 PNG 中提取 tEXt chunk"""
    try:
        import zlib
        import struct

        # PNG 签名检查
        if png_bytes[:8] != b"\x89PNG\r\n\x1a\n":
            return None

        pos = 8
        while pos < len(png_bytes):
            length = struct.unpack(">I", png_bytes[pos:pos + 4])[0]
            chunk_type = png_bytes[pos + 4:pos + 8].decode("latin-1")
            chunk_data = png_bytes[pos + 8:pos + 8 + length]
            pos += 12 + length

            if chunk_type == "tEXt":
                # 解析 tEXt chunk: keyword\0text
                null_pos = chunk_data.index(b"\x00")
                keyword = chunk_data[:null_pos].decode("latin-1")
                text = chunk_data[null_pos + 1:].decode("utf-8", errors="replace")

                # 查找 chara 或 ccv3 关键字（两者都是 SillyTavern 角色卡标识）
                if keyword in ("chara", "ccv3"):
                    import base64
                    json_str = base64.b64decode(text).decode("utf-8")
                    return json.loads(json_str)

            if chunk_type == "IEND":
                break

        return None
    except Exception:
        return None
