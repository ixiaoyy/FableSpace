"""Transitional player runtime storage used while StoryWorld persistence lands."""

from __future__ import annotations

import json
import os
import uuid
import threading
import time
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from fablespace_api.core.default_spaces import (
    DEFAULT_PUBLIC_WELFARE_MODEL,
    DEFAULT_PUBLIC_WELFARE_OWNER_ID,
    DEFAULT_PUBLIC_WELFARE_TAVERN_IDS,
    RETIRED_PUBLIC_WELFARE_TAVERN_IDS,
    default_public_welfare_spaces,
)
from fablespace_api.core.fixture_retirement import (
    HISTORICAL_FIXTURE_RETIREMENT_SIGNATURES,
    matches_historical_fixture,
)
from fablespace_api.core.memory import MemoryAtom
from fablespace_api.core.skill_packs import normalize_skill_pack_settings
from fablespace_api.core.visitor_play_identity import (
    merge_play_identity_metadata,
    validate_requested_play_identity,
)

# ─────────────────────────────────────────
# 类型别名
# ─────────────────────────────────────────

SpaceId = str
CharacterId = str
VisitorId = str
UserId = str

ROLEPLAY_MODES = {"ai_only", "hybrid"}
ROLEPLAY_CLAIM_STATUSES = {"pending", "approved", "rejected", "revoked"}
SPACE_LAYOUT_STYLES = {"lobby", "npc-chat", "quest-play", "hybrid-room"}
PLACE_TYPES = {
    "space",
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
PLACE_TYPE_ALIASES = {"tavern": "space"}
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
SYSTEM_SPACE_OWNER_PREFIX = "system_"
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

# 角色表情列表
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
class SpaceSpriteSet:
    """
    角色表情精灵图集合

    支持标准角色表情和自定义表情。
    每个表情对应一张立绘图片 URL。

    格式示例（JSON）：
    {
        "neutral": "https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/character/neutral.png",
        "joy": "https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/character/joy.png",
        "anger": "https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/character/anger.png",
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
class SpaceCharacter:
    """故事角色。"""
    id: str
    space_id: str
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
    
    traits: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "space_id": self.space_id,
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
            "traits": list(self.traits),
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
            space_id=d.get("space_id", ""),
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
            traits=d.get("traits", []),
        )


def _entry_character_payload(character: TavernCharacter) -> dict[str, Any]:
    """Public-safe character shape for the story entry page."""
    return {
        "id": character.id,
        "space_id": character.space_id,
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
    space_id: str
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
            "space_id": self.space_id,
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
            space_id=d.get("space_id", ""),
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


def _is_system_or_public_welfare_space_data(value: Any, *, space_id: str = "") -> bool:
    """Return true for current built-in/developed spaces that use system公益 LLM."""
    if isinstance(value, dict):
        owner_id = str(value.get("owner_id") or "").strip()
        candidate_id = str(value.get("id") or space_id or "").strip()
    else:
        owner_id = str(getattr(value, "owner_id", "") or "").strip()
        candidate_id = str(getattr(value, "id", "") or space_id or "").strip()
    return (
        owner_id == DEFAULT_PUBLIC_WELFARE_OWNER_ID
        or owner_id.startswith(SYSTEM_SPACE_OWNER_PREFIX)
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
    space_id: str = "",
    include_api_key: bool = True,
) -> LLMConfig:
    """Fill repo-versioned system公益 LLM credentials for built-in/public-welfare spaces."""
    if not _is_system_or_public_welfare_space_data(value, space_id=space_id):
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
    space_id: str = "",
    token_used: int = 0,
    include_api_key: bool = True,
) -> LLMConfig | None:
    if not _is_system_or_public_welfare_space_data(value, space_id=space_id):
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
    space_id: str
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
            "space_id": self.space_id,
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
            space_id=d.get("space_id", ""),
            gender=_normalize_gender(d.get("gender", d.get("visitor_gender"))),
            visit_count=d.get("visit_count", 0),
            first_visit=d.get("first_visit"),
            last_visit=d.get("last_visit"),
            relationship_strength=rel.get("strength", 0.0),
            relationship_stage=rel.get("stage", "stranger"),
            metadata=d.get("metadata", {}),
        )


@dataclass
class Space:
    """已发布故事的过渡存储模型。"""
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
    place_type: str = "space"  # 'space' | 'cafe' | ... | 'hospital' | 'home'
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
            space_id=self.id,
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

    def to_dict_entry(self) -> dict[str, Any]:
        """Return only the published player-facing story contract."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "access": self.access,
            "status": self.status,
            "scene_prompt": self.scene_prompt,
            "characters": [
                _entry_character_payload(character)
                for character in self.characters
            ],
            "gameplay_definitions": [
                _entry_gameplay_payload(gameplay)
                for gameplay in deepcopy(self.gameplay_definitions)
                if str((gameplay or {}).get("status") or "published") == "published"
            ],
            "group_chat_enabled": bool(self.group_chat_enabled),
            "response_view": "entry",
        }

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
            place_type=_normalize_place_type(d.get("place_type", "space")),
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
    space_id: str
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
            "space_id": self.space_id,
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
            space_id=d.get("space_id", ""),
            character_id=d.get("character_id", ""),
            visitor_id=d.get("visitor_id", ""),
            visitor_name=d.get("visitor_name", ""),
            role=d["role"],
            content=d["content"],
            timestamp=d.get("timestamp", ""),
            token_count=d.get("token_count", 0),
        )


def _default_public_welfare_seeding_enabled() -> bool:
    value = (
        os.environ.get("FABLESPACE_SEED_DEFAULT_SPACES", "").strip()
        or os.environ.get("FABLEMAP_SEED_DEFAULT_TAVERNS", "1").strip()
    ).lower()
    return value not in {"0", "false", "no", "off", "disabled"}


# ─────────────────────────────────────────
# 存储层
# ─────────────────────────────────────────


class _SpaceCache:
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


# Global cache instance shared across all space store instances.
_tavern_cache = _SpaceCache(ttl=5.0)

# Separate cache for chat session metadata (shorter TTL for freshness)
_chat_sessions_cache = _SpaceCache(ttl=3.0)


class SpaceStore:
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
        for tavern in default_public_welfare_spaces():
            space_id = str(tavern.get("id") or "").strip()
            if not space_id:
                continue
            if space_id not in data:
                data[space_id] = tavern
                changed = True
                continue
            existing = data.get(space_id)
            if self._merge_public_welfare_seed_defaults(existing, tavern):
                changed = True
        for retired_space_id in RETIRED_PUBLIC_WELFARE_TAVERN_IDS:
            if self._retire_public_welfare_seed_record(data.get(retired_space_id)):
                changed = True
        for signature in HISTORICAL_FIXTURE_RETIREMENT_SIGNATURES:
            existing = data.get(signature.space_id)
            if not matches_historical_fixture(existing, signature):
                continue
            existing["access"] = "private"
            existing["status"] = "closed"
            changed = True
        if changed:
            self._save_taverns(data)

    @staticmethod
    def _default_public_welfare_seed_data() -> dict[str, Any]:
        """Build a read-only fallback map for built-in public-welfare taverns."""
        if not _default_public_welfare_seeding_enabled():
            return {}
        seed_data: dict[str, Any] = {}
        for tavern in default_public_welfare_spaces():
            space_id = str(tavern.get("id") or "").strip()
            if space_id:
                seed_data[space_id] = deepcopy(tavern)
        return seed_data

    @staticmethod
    def _public_welfare_seed_record_needs_read_fallback(space_id: str, existing: dict[str, Any]) -> bool:
        if str(existing.get("id") or "").strip() != space_id:
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
        for space_id, default in seed_data.items():
            existing = result.get(space_id)
            if not isinstance(existing, dict):
                result[space_id] = deepcopy(default)
                continue
            if not self._public_welfare_seed_record_needs_read_fallback(space_id, existing):
                continue

            repaired = deepcopy(default)
            for key, value in existing.items():
                if key.startswith("_") or key == "visit_count":
                    repaired[key] = deepcopy(value)
            result[space_id] = repaired
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
    def _retire_public_welfare_seed_record(existing: Any) -> bool:
        """Hide an obsolete system seed while preserving its conversations and memories."""
        if not isinstance(existing, dict):
            return False
        if str(existing.get("owner_id") or "") != DEFAULT_PUBLIC_WELFARE_OWNER_ID:
            return False

        changed = False
        if existing.get("access") != "private":
            existing["access"] = "private"
            changed = True
        if existing.get("status") != "closed":
            existing["status"] = "closed"
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
    def _refresh_public_welfare_seed_items(existing: dict[str, Any], default: dict[str, Any], key: str) -> bool:
        default_items = default.get(key)
        existing_items = existing.get(key)
        if not isinstance(default_items, list) or not isinstance(existing_items, list):
            return False

        changed = False
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

    def _is_seed_fallback_tavern(self, space_id: str) -> bool:
        return space_id in self._default_public_welfare_seed_data()

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

    def list_spaces(self, include_private: bool = False, owner_id: str = "") -> list[Tavern]:
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

    def list_all_spaces(self) -> list[Tavern]:
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

    def get_space(self, space_id: str) -> Tavern | None:
        data = self._load_taverns(include_seed_fallback=True)
        d = data.get(space_id)
        if not d:
            return None
        tavern = Tavern.from_dict(d)
        # Inline token usage lookup (avoid another _load_taverns call)
        kv = self._load_keyvault()
        kv_usage = int(kv.get(space_id, {}).get("token_used", 0) or 0)
        tavern_usage = int(d.get("llm_config", {}).get("token_used", 0) or 0)
        if max(kv_usage, tavern_usage):
            tavern.llm_config.token_used = max(kv_usage, tavern_usage)
        return tavern

    def create_space(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id in data:
            raise HTTPException(status_code=409, detail="空间 ID 已存在")
        data[tavern.id] = tavern.to_dict()
        self._save_taverns(data)
        return tavern

    def update_space(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id not in data:
            if self._is_seed_fallback_tavern(tavern.id):
                return tavern
            raise HTTPException(status_code=404, detail="空间不存在")
        existing = data.get(tavern.id, {})
        updated = tavern.to_dict()
        # Preserve private extension buckets that are stored alongside the tavern
        # document but are not part of Tavern.to_dict(). Without this, simple
        # tavern metadata updates (e.g. visit_count after enter_space) can erase
        # VisitorState records.
        if isinstance(existing, dict):
            for key, value in existing.items():
                if key.startswith("_") and key not in updated:
                    updated[key] = value
        data[tavern.id] = updated
        self._save_taverns(data)
        return tavern

    def delete_space(self, space_id: str) -> None:
        data = self._load_taverns()
        if space_id not in data:
            raise HTTPException(status_code=404, detail="空间不存在")
        del data[space_id]
        self._save_taverns(data)
        # 同时删除 keyvault 中的记录
        kv = self._load_keyvault()
        if space_id in kv:
            del kv[space_id]
            self._save_keyvault(kv)
        # 删除聊天记录
        chat_dir = self.root / "chat_history" / space_id
        if chat_dir.exists():
            import shutil
            shutil.rmtree(chat_dir)

    # ── LLM Key Vault ────────────────────

    def save_llm_config(self, space_id: str, config: LLMConfig) -> None:
        """保存 LLM 配置（包含 api_key）"""
        kv = self._load_keyvault()
        kv[space_id] = config.to_dict_private()
        self._save_keyvault(kv)

    def get_llm_config(self, space_id: str) -> LLMConfig | None:
        """获取 LLM 配置（包含 api_key）"""
        kv = self._load_keyvault()
        d = kv.get(space_id)
        if d:
            config = LLMConfig.from_dict(d)
            space_data = self._load_taverns(include_seed_fallback=True).get(space_id, {})
            config = _hydrate_system_public_welfare_llm_config(space_data, config, space_id=space_id)
            if config.is_configured():
                return config
            res = _system_public_welfare_rules_fallback(
                space_data,
                space_id=space_id,
                token_used=config.token_used,
            ) or config
            return res

        # System-seeded public spaces can use a non-secret local backend that is
        # stored in taverns.json only. Never resurrect unconfigured remote keys.
        space_data = self._load_taverns(include_seed_fallback=True).get(space_id, {})
        fallback = space_data.get("llm_config", {}) if isinstance(space_data, dict) else {}
        if not isinstance(fallback, dict) or not fallback:
            return None
        config = LLMConfig.from_dict(fallback)
        config = _hydrate_system_public_welfare_llm_config(space_data, config, space_id=space_id)
        if config.is_configured():
            return config
        res = _system_public_welfare_rules_fallback(
            space_data,
            space_id=space_id,
            token_used=config.token_used,
        )
        return res

    # ── Voice Config ───────────────────────

    def save_voice_config(self, space_id: str, config: VoiceConfig) -> None:
        """保存语音配置（存储在空间数据中）"""
        data = self._load_taverns()
        if space_id not in data:
            return
        data[space_id]["voice_config"] = config.to_dict()
        self._save_taverns(data)

    def get_voice_config(self, space_id: str) -> VoiceConfig | None:
        """获取语音配置"""
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        vc = space_data.get("voice_config", {})
        if not vc:
            return None
        return VoiceConfig.from_dict(vc)

    # ── 访客状态 ────────────────────────

    def get_visitor_state(self, space_id: str, visitor_id: str) -> VisitorState | None:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        visitors = space_data.get("_visitors", {})
        v = visitors.get(visitor_id)
        if not v:
            return None
        return VisitorState.from_dict(v)

    def list_visitor_states(self, space_id: str) -> list[VisitorState]:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        visitors = space_data.get("_visitors", {})
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

    def update_visitor_state(self, space_id: str, state: VisitorState) -> None:
        data = self._load_taverns()
        if space_id not in data and self._is_seed_fallback_tavern(space_id):
            return
        space_data = data.setdefault(space_id, {})
        visitors = space_data.setdefault("_visitors", {})
        visitors[state.visitor_id] = state.to_dict()
        self._save_taverns(data)

    # ── 批量加载方法（优化 N+1 查询）─────────────────────────────

    def batch_list_visitor_states(self, space_ids: list[str]) -> dict[str, list[VisitorState]]:
        """批量加载多个 tavern 的访客状态，一次文件读取完成"""
        result: dict[str, list[VisitorState]] = {tid: [] for tid in space_ids}
        if not space_ids:
            return result

        data = self._load_taverns()
        for space_id in space_ids:
            space_data = data.get(space_id, {})
            visitors = space_data.get("_visitors", {})
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
            result[space_id] = states
        return result

    def batch_list_chat_sessions(
        self,
        space_ids: list[str],
        visitor_id: str = "",
        character_id: str = "",
    ) -> dict[str, list[dict[str, Any]]]:
        """批量加载多个 tavern 的聊天会话元数据，一次文件读取完成"""
        result: dict[str, list[dict[str, Any]]] = {tid: [] for tid in space_ids}
        if not space_ids:
            return result

        # 预加载所有 tavern 的访客名称
        tavern_data_map = self._load_taverns()

        for space_id in space_ids:
            chat_dir = self.root / "chat_history" / space_id
            if not chat_dir.exists():
                continue

            tavern_visitors = tavern_data_map.get(space_id, {}).get("_visitors", {})
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
                    "space_id": space_id,
                    "visitor_id": session_visitor_id,
                    "visitor_name": session_visitor_name,
                    "character_id": session_character_id,
                    "message_count": len(messages),
                    "last_message": last_message,
                    "updated_at": last_message.timestamp,
                })

            sessions.sort(key=lambda session: session.get("updated_at", ""), reverse=True)
            result[space_id] = sessions

        return result

    # ── 结构化记忆 ────────────────────────

    def list_memory_atoms(self, space_id: str) -> list[MemoryAtom]:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        atoms = space_data.get("_memory_atoms", {})
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

    def get_memory_atom(self, space_id: str, memory_id: str) -> MemoryAtom | None:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        atoms = space_data.get("_memory_atoms", {})
        if not isinstance(atoms, dict):
            return None
        value = atoms.get(memory_id)
        if not isinstance(value, dict):
            return None
        try:
            return MemoryAtom.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_memory_atom(self, space_id: str, atom: MemoryAtom) -> MemoryAtom:
        data = self._load_taverns()
        space_data = data.setdefault(space_id, {})
        atoms = space_data.setdefault("_memory_atoms", {})
        if not isinstance(atoms, dict):
            atoms = {}
            space_data["_memory_atoms"] = atoms
        atom.space_id = space_id
        atoms[atom.id] = atom.to_dict()
        self._save_taverns(data)
        return atom

    def delete_memory_atom(self, space_id: str, memory_id: str) -> bool:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        atoms = space_data.get("_memory_atoms", {})
        if not isinstance(atoms, dict) or memory_id not in atoms:
            return False
        del atoms[memory_id]
        self._save_taverns(data)
        return True

    # ── 连续性状态卡 / Canon Ledger ────────────────────────

    def list_state_cards(self, space_id: str) -> list[Any]:
        from fablespace_api.core.state_cards import StateCard

        data = self._load_taverns()
        space_data = data.get(space_id, {})
        cards = space_data.get("_state_cards", {})
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

    def get_state_card(self, space_id: str, card_id: str) -> Any | None:
        from fablespace_api.core.state_cards import StateCard

        data = self._load_taverns()
        space_data = data.get(space_id, {})
        cards = space_data.get("_state_cards", {})
        if not isinstance(cards, dict):
            return None
        value = cards.get(card_id)
        if not isinstance(value, dict):
            return None
        try:
            return StateCard.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_state_card(self, space_id: str, card: Any) -> Any:
        data = self._load_taverns()
        space_data = data.setdefault(space_id, {})
        cards = space_data.setdefault("_state_cards", {})
        if not isinstance(cards, dict):
            cards = {}
            space_data["_state_cards"] = cards
        card.space_id = space_id
        cards[card.id] = card.to_dict()
        self._save_taverns(data)
        return card

    def delete_state_card(self, space_id: str, card_id: str) -> bool:
        data = self._load_taverns()
        space_data = data.get(space_id, {})
        cards = space_data.get("_state_cards", {})
        if not isinstance(cards, dict) or card_id not in cards:
            return False
        del cards[card_id]
        self._save_taverns(data)
        return True

    # ── 玩法会话 ────────────────────────

    def list_gameplay_sessions(self, space_id: str) -> list[Any]:
        from fablespace_api.core.gameplay import GameplaySession

        data = self._load_taverns()
        space_data = data.get(space_id, {})
        sessions = space_data.get("_gameplay_sessions", {})
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

    def get_gameplay_session(self, space_id: str, session_id: str) -> Any | None:
        from fablespace_api.core.gameplay import GameplaySession

        data = self._load_taverns()
        space_data = data.get(space_id, {})
        sessions = space_data.get("_gameplay_sessions", {})
        if not isinstance(sessions, dict):
            return None
        value = sessions.get(session_id)
        if not isinstance(value, dict):
            return None
        try:
            return GameplaySession.from_dict(value)
        except (TypeError, ValueError):
            return None

    def save_gameplay_session(self, space_id: str, session: Any) -> Any:
        data = self._load_taverns()
        space_data = data.setdefault(space_id, {})
        sessions = space_data.setdefault("_gameplay_sessions", {})
        if not isinstance(sessions, dict):
            sessions = {}
            space_data["_gameplay_sessions"] = sessions
        session.space_id = space_id
        sessions[session.id] = session.to_dict()
        self._save_taverns(data)
        return session

    # ── Chat History ─────────────────────

    def get_chat_history(
        self,
        space_id: str,
        visitor_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> list[ChatMessage]:
        chat_dir = self.root / "chat_history" / space_id
        if not character_id:
            character_id = "_all"
        file_path = chat_dir / f"{visitor_id}_{character_id}.jsonl"
        if not file_path.exists():
            return []
        messages = self._read_chat_file(file_path)
        return messages[-limit:]

    def list_chat_sessions(
        self,
        space_id: str,
        visitor_id: str = "",
        character_id: str = "",
        limit: int | None = 50,
    ) -> list[dict[str, Any]]:
        # Try cache first (only for unfiltered queries)
        cache_key = f"sessions:{space_id}:{visitor_id}:{character_id}"
        if not visitor_id and not character_id:
            cached = _chat_sessions_cache.get(cache_key)
            if cached is not None:
                return cached

        chat_dir = self.root / "chat_history" / space_id
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
                "space_id": space_id,
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

    def delete_chat_history(self, space_id: str, visitor_id: str = "", character_id: str = "") -> int:
        chat_dir = self.root / "chat_history" / space_id
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
            _chat_sessions_cache.invalidate_prefix(f"sessions:{space_id}:")
        return deleted

    def replace_chat_history(
        self,
        space_id: str,
        visitor_id: str,
        character_id: str,
        messages: list[ChatMessage],
    ) -> int:
        chat_dir = self.root / "chat_history" / space_id
        chat_dir.mkdir(parents=True, exist_ok=True)
        file_path = chat_dir / f"{visitor_id}_{character_id}.jsonl"

        if not messages:
            if file_path.exists():
                file_path.unlink()
            _chat_sessions_cache.invalidate_prefix(f"sessions:{space_id}:")
            return 0

        normalized_messages = []
        for message in messages:
            message.space_id = space_id
            message.visitor_id = visitor_id
            message.character_id = character_id
            normalized_messages.append(message)

        with file_path.open("w", encoding="utf-8") as fh:
            for message in normalized_messages:
                fh.write(json.dumps(message.to_dict(), ensure_ascii=False) + "\n")
        _chat_sessions_cache.invalidate_prefix(f"sessions:{space_id}:")
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
        chat_dir = self.root / "chat_history" / msg.space_id
        chat_dir.mkdir(parents=True, exist_ok=True)
        file_path = chat_dir / f"{msg.visitor_id}_{msg.character_id}.jsonl"
        with file_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(msg.to_dict(), ensure_ascii=False) + "\n")
        _chat_sessions_cache.invalidate_prefix(f"sessions:{msg.space_id}:")
        return msg

    # ── Token 统计 ──────────────────────

    def add_token_usage(self, space_id: str, tokens: int) -> None:
        try:
            token_delta = int(tokens)
        except (TypeError, ValueError):
            return
        if token_delta <= 0:
            return

        kv = self._load_keyvault()
        if space_id in kv:
            current = int(kv[space_id].get("token_used", 0) or 0)
            kv[space_id]["token_used"] = current + token_delta
            self._save_keyvault(kv)

        data = self._load_taverns()
        if space_id in data:
            llm_config = data[space_id].setdefault("llm_config", {})
            current = int(llm_config.get("token_used", 0) or 0)
            llm_config["token_used"] = current + token_delta
            self._save_taverns(data)

    def get_token_usage(self, space_id: str) -> int:
        kv = self._load_keyvault()
        keyvault_usage = int(kv.get(space_id, {}).get("token_used", 0) or 0)

        data = self._load_taverns()
        tavern_usage = int(
            data.get(space_id, {})
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

class SpaceService:
    """空间服务 — 业务逻辑"""

    def __init__(self, store: TavernStore):
        self.store = store




    def get_space(self, space_id: str, user_id: str = "", view: str = "") -> dict[str, Any]:
        del view
        story = self.store.get_space(space_id)
        if not story or story.access != "public":
            raise HTTPException(status_code=404, detail="故事不存在")
        payload = story.to_dict_entry()
        if user_id:
            visitor_state = self.store.get_visitor_state(space_id, user_id)
            if visitor_state:
                payload["visitor_state"] = visitor_state.to_dict()
        return payload















    def enter_space(
        self,
        space_id: str,
        password: str = "",
        user_id: str = "",
        visitor_gender: str = "",
        play_identity_id: str | None = None,
    ) -> dict[str, Any]:
        """Enter one published system story and update only player state."""
        del password
        story = self.store.get_space(space_id)
        if not story or story.access != "public":
            raise HTTPException(status_code=404, detail="故事不存在")

        try:
            selected_identity_id, selected_gender = validate_requested_play_identity(
                play_identity_id,
                visitor_gender,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        now = _utc_now_iso()
        visitor_state = None
        if user_id:
            visitor_state = self.store.get_visitor_state(space_id, user_id) or VisitorState(
                visitor_id=user_id,
                space_id=space_id,
            )

            visitor_state.visit_count += 1
            if not visitor_state.first_visit:
                visitor_state.first_visit = now
            visitor_state.last_visit = now
            if selected_identity_id:
                visitor_state.gender = selected_gender
                visitor_state.metadata = merge_play_identity_metadata(
                    visitor_state.metadata,
                    selected_identity_id,
                )
            elif visitor_gender:
                visitor_state.gender = _normalize_gender(visitor_gender)
            visitor_state.relationship_stage = _visitor_relationship_stage(
                visitor_state.relationship_strength,
                visitor_state.visit_count,
            )
            self.store.update_visitor_state(space_id, visitor_state)

        return {
            "ok": True,
            "space_id": space_id,
            "visitor_id": user_id,
            "visit_count": visitor_state.visit_count if visitor_state else 0,
            "visitor_state": visitor_state.to_dict() if visitor_state else None,
            "status": story.status,
            "characters": [_entry_character_payload(character) for character in story.characters],
            "scene_prompt": story.scene_prompt,
            "first_mes": story.characters[0].first_mes if story.characters else "故事从这里开始。",
        }

    # ── 角色管理 ────────────────────────





    # ── 运营指标 ────────────────────────



# ─────────────────────────────────────────
# 角色数据辅助逻辑
# ─────────────────────────────────────────



# ─────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────





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
    return layout_style if layout_style in SPACE_LAYOUT_STYLES else "lobby"


def _normalize_special_type(value: Any) -> str:
    s = str(value or "").strip().lower()
    return s if s in SPECIAL_TYPES else ""






def _canonical_place_type(value: Any, default: str = "space") -> str:
    """Return the canonical place type for persistence and filtering.

    Args:
        value: Raw place type from API payloads, JSON stores, or database rows.
        default: Canonical fallback when the raw value is empty or unsupported.

    Returns:
        A supported place type string; legacy "tavern" is normalized to "space".

    Side effects:
        None. This helper only normalizes caller-provided values.
    """
    raw = str(value or default).strip().lower().replace("_", "-")
    place_type = PLACE_TYPE_ALIASES.get(raw, raw)
    return place_type if place_type in PLACE_TYPES else default


def _normalize_place_type(value: Any) -> str:
    return _canonical_place_type(value, default="space")




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




def _normalize_place_relationships(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    relationships: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        relationship_id = str(item.get("id") or "").strip()
        source_space_id = str(item.get("source_space_id") or item.get("home_space_id") or "").strip()
        source_member_id = str(item.get("source_member_id") or item.get("member_id") or "").strip()
        target_space_id = str(item.get("target_space_id") or item.get("school_tavern_id") or "").strip()
        if not relationship_id:
            relationship_id = f"rel_{uuid.uuid4().hex[:12]}"
        if not source_space_id or not source_member_id or not target_space_id or relationship_id in seen_ids:
            continue
        seen_ids.add(relationship_id)
        relationship: dict[str, Any] = {
            "id": relationship_id,
            "relation_type": _normalize_place_relationship_type(item.get("relation_type")),
            "source_space_id": source_space_id,
            "source_member_id": source_member_id,
            "target_space_id": target_space_id,
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










def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ─────────────────────────────────────────
# PNG tEXt chunk 提取（用于角色卡 PNG 导入）
# ─────────────────────────────────────────



# Backward-compatible aliases for persisted JSON keys, existing tests, and
# partially migrated modules. New code should prefer the Space* names above.
TavernSpriteSet = SpaceSpriteSet
TavernCharacter = SpaceCharacter
Tavern = Space
TavernStore = SpaceStore
TavernService = SpaceService
