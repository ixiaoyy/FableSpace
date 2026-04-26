"""
FableMap Tavern — 赛博酒馆 CRUD 核心

提供酒馆(Tavern)的创建、读取、更新、删除操作。
支持 SillyTavern Character Card V2 格式的角色导入。
"""

from __future__ import annotations

import json
import os
import uuid
import hashlib
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from fablemap_api.core.default_taverns import (
    DEFAULT_PUBLIC_WELFARE_OWNER_ID,
    default_public_welfare_taverns,
)
from fablemap_api.core.memory import MemoryAtom

# ─────────────────────────────────────────
# 类型别名
# ─────────────────────────────────────────

TavernId = str
CharacterId = str
VisitorId = str
UserId = str

ROLEPLAY_MODES = {"ai_only", "hybrid"}
ROLEPLAY_CLAIM_STATUSES = {"pending", "approved", "rejected", "revoked"}


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
class TavernCharacter:
    """酒馆角色 — 兼容 SillyTavern Character Card V2"""
    id: str
    tavern_id: str
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    system_prompt: str = ""
    first_mes: str = ""
    mes_example: str = ""
    alternate_greetings: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    sprites: TavernSpriteSet | None = None
    avatar: str = ""  # 默认立绘（用于聊天界面显示）
    appearance: dict[str, Any] = field(default_factory=dict)
    talkativeness: float = 0.5  # 0.0–1.0，群聊时说话频率

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "name": self.name,
            "description": self.description,
            "personality": self.personality,
            "scenario": self.scenario,
            "system_prompt": self.system_prompt,
            "first_mes": self.first_mes,
            "mes_example": self.mes_example,
            "alternate_greetings": self.alternate_greetings,
            "tags": self.tags,
            "sprites": self.sprites.to_dict() if self.sprites else {},
            "avatar": self.avatar or (self.sprites.get("neutral") if self.sprites else ""),
            "appearance": deepcopy(self.appearance) if isinstance(self.appearance, dict) else {},
            "talkativeness": _normalize_talkativeness(self.talkativeness),
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
            system_prompt=d.get("system_prompt", ""),
            first_mes=d.get("first_mes", ""),
            mes_example=d.get("mes_example", ""),
            alternate_greetings=d.get("alternate_greetings", []),
            tags=d.get("tags", []),
            sprites=sprites,
            avatar=d.get("avatar", ""),
            appearance=_normalize_character_appearance(d.get("appearance")),
            talkativeness=_normalize_talkativeness(d.get("talkativeness", 0.5)),
        )


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
    """LLM 配置 — 酒馆主人提供的 AI 后端配置"""
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
        if self.backend in no_external_backend:
            return True
        local_no_key_backends = {"ollama", "local", "localai"}
        if not self.backend:
            return False
        if self.api_key:
            return True
        return self.backend in local_no_key_backends and bool(self.base_url)


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
    """访客状态 — 访客与酒馆的关系"""
    visitor_id: str
    tavern_id: str
    visit_count: int = 0
    first_visit: str | None = None
    last_visit: str | None = None
    relationship_strength: float = 0.0
    relationship_stage: str = "stranger"

    def to_dict(self) -> dict[str, Any]:
        return {
            "visitor_id": self.visitor_id,
            "tavern_id": self.tavern_id,
            "visit_count": self.visit_count,
            "first_visit": self.first_visit,
            "last_visit": self.last_visit,
            "relationship": {
                "strength": self.relationship_strength,
                "stage": self.relationship_stage,
            },
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> VisitorState:
        rel = d.get("relationship", {})
        return cls(
            visitor_id=d["visitor_id"],
            tavern_id=d.get("tavern_id", ""),
            visit_count=d.get("visit_count", 0),
            first_visit=d.get("first_visit"),
            last_visit=d.get("last_visit"),
            relationship_strength=rel.get("strength", 0.0),
            relationship_stage=rel.get("stage", "stranger"),
        )


@dataclass
class Tavern:
    """酒馆 — 地图上的一个可进入场所"""
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
    status: str = "closed"  # 'open' | 'closed'
    roleplay_mode: str = "ai_only"  # 'ai_only' | 'hybrid'
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
    active_preset_id: str = ""
    memory_policy: dict[str, Any] = field(default_factory=dict)
    scene_prompt: str = ""
    llm_config: LLMConfig = field(default_factory=LLMConfig)
    voice_config: VoiceConfig = field(default_factory=VoiceConfig)
    visit_count: int = 0
    group_chat_enabled: bool = False  # 是否启用群聊模式
    group_chat_config: dict[str, Any] = field(default_factory=dict)  # { strategy, max_responses_per_turn, min_interval, ... }

    def to_dict(self) -> dict[str, Any]:
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
            "active_preset_id": self.active_preset_id,
            "memory_policy": deepcopy(self.memory_policy),
            "scene_prompt": self.scene_prompt,
            "llm_config": self.llm_config.to_dict(),  # 不包含 api_key
            "voice_config": self.voice_config.to_dict(),
            "visit_count": self.visit_count,
            "group_chat_enabled": self.group_chat_enabled,
            "group_chat_config": deepcopy(self.group_chat_config),
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
        result["llm_config"] = self.llm_config.to_dict()
        result.pop("voice_config", None)
        result["character_claims"] = [
            deepcopy(claim)
            for claim in self.character_claims
            if str(claim.get("status") or "") == "approved"
        ]
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
            status=d.get("status", "closed"),
            roleplay_mode=_normalize_roleplay_mode(d.get("roleplay_mode", "ai_only")),
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
            active_preset_id=str(d.get("active_preset_id") or ""),
            memory_policy=deepcopy(d.get("memory_policy", {})) if isinstance(d.get("memory_policy"), dict) else {},
            scene_prompt=d.get("scene_prompt", ""),
            llm_config=llm,
            voice_config=voice,
            visit_count=d.get("visit_count", 0),
            group_chat_enabled=_normalize_bool(d.get("group_chat_enabled", False)),
            group_chat_config=_normalize_group_chat_config(d.get("group_chat_config", {})),
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

class TavernStore:
    """酒馆数据存储 — JSON 文件持久化"""

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
    def _merge_public_welfare_seed_defaults(existing: Any, default: dict[str, Any]) -> bool:
        """Append missing built-in child records without overwriting store edits."""
        if not isinstance(existing, dict):
            return False
        if str(existing.get("owner_id") or "") != DEFAULT_PUBLIC_WELFARE_OWNER_ID:
            return False

        changed = False
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
            for item in default_items:
                if not isinstance(item, dict):
                    continue
                item_id = str(item.get("id") or "").strip()
                if not item_id or item_id in existing_ids:
                    continue
                existing_items.append(deepcopy(item))
                existing_ids.add(item_id)
                changed = True
        return changed

    def _load_taverns(self) -> dict[str, Any]:
        try:
            return json.loads(self.taverns_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _save_taverns(self, data: dict[str, Any]) -> None:
        self.taverns_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )

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
        """列出所有酒馆"""
        data = self._load_taverns()
        result = []
        for d in data.values():
            tavern = Tavern.from_dict(d)
            token_usage = self.get_token_usage(tavern.id)
            if token_usage:
                tavern.llm_config.token_used = token_usage
            if tavern.access == "private":
                if include_private and tavern.owner_id == owner_id:
                    result.append(tavern)
                continue
            result.append(tavern)
        return result

    def get_tavern(self, tavern_id: str) -> Tavern | None:
        data = self._load_taverns()
        d = data.get(tavern_id)
        if not d:
            return None
        tavern = Tavern.from_dict(d)
        token_usage = self.get_token_usage(tavern_id)
        if token_usage:
            tavern.llm_config.token_used = token_usage
        return tavern

    def create_tavern(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id in data:
            raise HTTPException(status_code=409, detail="酒馆 ID 已存在")
        data[tavern.id] = tavern.to_dict()
        self._save_taverns(data)
        return tavern

    def update_tavern(self, tavern: Tavern) -> Tavern:
        data = self._load_taverns()
        if tavern.id not in data:
            raise HTTPException(status_code=404, detail="酒馆不存在")
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
            raise HTTPException(status_code=404, detail="酒馆不存在")
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
            return LLMConfig.from_dict(d)

        # Built-in/public demo taverns can use a non-secret local backend that is
        # stored in taverns.json only. Never resurrect unconfigured remote keys.
        tavern_data = self._load_taverns().get(tavern_id, {})
        fallback = tavern_data.get("llm_config", {}) if isinstance(tavern_data, dict) else {}
        if not isinstance(fallback, dict) or not fallback:
            return None
        config = LLMConfig.from_dict(fallback)
        return config if config.is_configured() else None

    # ── Voice Config ───────────────────────

    def save_voice_config(self, tavern_id: str, config: VoiceConfig) -> None:
        """保存语音配置（存储在酒馆数据中）"""
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
        tavern_data = data.setdefault(tavern_id, {})
        visitors = tavern_data.setdefault("_visitors", {})
        visitors[state.visitor_id] = state.to_dict()
        self._save_taverns(data)

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
    """酒馆服务 — 业务逻辑"""

    def __init__(self, store: TavernStore):
        self.store = store

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
        query: str = "",
        owner_id: str = "",
    ) -> list[dict[str, Any]]:
        """列出酒馆，支持位置过滤"""
        taverns = self.store.list_taverns(include_private=bool(owner_id), owner_id=owner_id)
        normalized_query = (query or "").strip()
        normalized_status = (status or "").strip()

        result = []
        for t in taverns:
            if owner_id and t.owner_id != owner_id:
                continue
            if access and t.access != access:
                continue
            if normalized_status and t.status != normalized_status:
                continue
            if normalized_query and not _matches_tavern_query(t, normalized_query):
                continue

            tavern_dict = t.to_dict_public()
            tavern_dict["_distance"] = None
            if lat is not None and lon is not None:
                dist = _haversine_distance(lat, lon, t.lat, t.lon)
                tavern_dict["_distance"] = dist
                if dist > radius:
                    continue

            result.append(tavern_dict)

        # 按距离排序
        result.sort(key=lambda x: x["_distance"] if x["_distance"] is not None else float("inf"))
        return result

    def get_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此酒馆是私人的")

        if tavern.owner_id and tavern.owner_id == user_id:
            return tavern.to_dict_private(user_id)
        return tavern.to_dict_public()

    def create_tavern(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        """创建酒馆"""
        tavern_id = data.get("id") or f"tavern_{uuid.uuid4().hex[:12]}"
        now = _utc_now_iso()

        tavern = Tavern(
            id=tavern_id,
            name=data.get("name", "未命名酒馆"),
            description=data.get("description", ""),
            lat=float(data.get("lat", 0)),
            lon=float(data.get("lon", 0)),
            address=data.get("address", ""),
            owner_id=owner_id or data.get("owner_id", ""),
            created_at=now,
            access=data.get("access", "public"),
            password_hash="",
            status="closed",
            roleplay_mode=_normalize_roleplay_mode(data.get("roleplay_mode", "ai_only")),
            character_claims=_normalize_character_claims(data.get("character_claims", [])),
            gameplay_definitions=_normalize_metadata_list(data.get("gameplay_definitions", [])),
            output_rules=_normalize_metadata_list(data.get("output_rules", [])),
            prompt_blocks=_normalize_metadata_list(data.get("prompt_blocks", [])),
            runtime_presets=_normalize_metadata_list(data.get("runtime_presets", [])),
            active_preset_id=str(data.get("active_preset_id") or ""),
            memory_policy=deepcopy(data.get("memory_policy", {})) if isinstance(data.get("memory_policy"), dict) else {},
            scene_prompt=data.get("scene_prompt", ""),
            group_chat_enabled=_normalize_bool(data.get("group_chat_enabled", False)),
            group_chat_config=_normalize_group_chat_config(data.get("group_chat_config", {})),
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
        if llm_config and llm_config.is_configured():
            self.store.save_llm_config(tavern_id, llm_config)
            # 更新 status
            tavern.llm_config = llm_config
            tavern.status = "open"
            tavern = self.store.update_tavern(tavern)

        return tavern.to_dict_private(owner_id)

    def update_tavern(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """更新酒馆"""
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

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
        if "access" in data:
            tavern.access = data["access"]
        if "scene_prompt" in data:
            tavern.scene_prompt = data["scene_prompt"]
        if "status" in data:
            tavern.status = data["status"]
        if "roleplay_mode" in data:
            tavern.roleplay_mode = _normalize_roleplay_mode(data.get("roleplay_mode"))
        if "character_claims" in data:
            tavern.character_claims = _normalize_character_claims(data.get("character_claims"))
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
        if "active_preset_id" in data:
            tavern.active_preset_id = str(data.get("active_preset_id") or "").strip()
        if "memory_policy" in data:
            tavern.memory_policy = deepcopy(data["memory_policy"]) if isinstance(data["memory_policy"], dict) else {}
        if "group_chat_enabled" in data:
            tavern.group_chat_enabled = _normalize_bool(data.get("group_chat_enabled"))
        if "group_chat_config" in data:
            tavern.group_chat_config = _normalize_group_chat_config(data.get("group_chat_config"))

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
            if llm_config.is_configured():
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
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

        self.store.delete_tavern(tavern_id)
        return {"ok": True, "tavern_id": tavern_id}

    def enter_tavern(self, tavern_id: str, password: str = "", user_id: str = "") -> dict[str, Any]:
        """进入酒馆（验证密码）"""
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        # 密码验证
        if tavern.access == "password":
            if not password:
                raise HTTPException(status_code=401, detail="此酒馆需要密码")
            if not _verify_password(password, tavern.password_hash):
                raise HTTPException(status_code=401, detail="密码错误")

        # 私人酒馆只允许主人进入
        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此酒馆是私人的")

        # 更新访客状态。有明确访客身份时才写入，避免匿名空 ID 污染回访面板。
        now = _utc_now_iso()
        visitor_state = None
        if user_id:
            visitor_state = self.store.get_visitor_state(tavern_id, user_id) or VisitorState(
                visitor_id=user_id,
                tavern_id=tavern_id,
            )
            visitor_state.visit_count += 1
            if not visitor_state.first_visit:
                visitor_state.first_visit = now
            visitor_state.last_visit = now
            visitor_state.relationship_stage = _visitor_relationship_stage(
                visitor_state.relationship_strength,
                visitor_state.visit_count,
            )
            self.store.update_visitor_state(tavern_id, visitor_state)

        # 更新酒馆访问计数
        tavern.visit_count += 1
        self.store.update_tavern(tavern)

        return {
            "ok": True,
            "tavern_id": tavern_id,
            "visitor_id": user_id,
            "visit_count": visitor_state.visit_count if visitor_state else 0,
            "visitor_state": visitor_state.to_dict() if visitor_state else None,
            "status": tavern.status,
            "characters": [c.to_dict() for c in tavern.characters],
            "scene_prompt": tavern.scene_prompt,
            "first_mes": tavern.characters[0].first_mes if tavern.characters else "欢迎光临。",
        }

    # ── 角色管理 ────────────────────────

    def add_character(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

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
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

        char = next((c for c in tavern.characters if c.id == char_id), None)
        if not char:
            raise HTTPException(status_code=404, detail="角色不存在")

        # 更新字段
        for key in ("name", "description", "personality", "scenario", "system_prompt", "first_mes", "mes_example"):
            if key in data:
                setattr(char, key, data[key])
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
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.owner_id and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此酒馆的主人")

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
        "system_prompt": data.get("system_prompt", ""),
        "first_mes": data.get("first_mes", ""),
        "mes_example": data.get("mes_example", ""),
        "alternate_greetings": data.get("alternate_greetings", []),
        "tags": data.get("tags", []),
        "avatar": data.get("avatar", ""),
        "appearance": data.get("appearance", {}),
        "talkativeness": data.get("talkativeness", 0.5),
        "sprites": data.get("sprites", {}),
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
        system_prompt=data.get("system_prompt", ""),
        first_mes=data.get("first_mes", ""),
        mes_example=data.get("mes_example", ""),
        alternate_greetings=_normalize_string_list(data.get("alternate_greetings", [])),
        tags=_normalize_string_list(data.get("tags", []), split_commas=True),
        sprites=TavernSpriteSet(sprite_map) if sprite_map else None,
        avatar=str(data.get("avatar") or "").strip(),
        appearance=_normalize_character_appearance(data.get("appearance")),
        talkativeness=_normalize_talkativeness(data.get("talkativeness", 0.5)),
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
        tavern.scene_prompt,
    ]

    for character in tavern.characters:
        fields.extend([
            character.name,
            character.description,
            character.personality,
            character.scenario,
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
