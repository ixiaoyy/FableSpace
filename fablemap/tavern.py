"""
FableMap Tavern — 赛博酒馆 CRUD 核心

提供酒馆(Tavern)的创建、读取、更新、删除操作。
支持 SillyTavern Character Card V2 格式的角色导入。
"""

from __future__ import annotations

import json
import uuid
import hashlib
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException

# ─────────────────────────────────────────
# 类型别名
# ─────────────────────────────────────────

TavernId = str
CharacterId = str
VisitorId = str
UserId = str


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
            order=d.get("order", 100),
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
        return bool(self.api_key and self.backend)


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
    characters: list[TavernCharacter] = field(default_factory=list)
    world_info: list[WorldInfoEntry] = field(default_factory=list)
    scene_prompt: str = ""
    llm_config: LLMConfig = field(default_factory=LLMConfig)
    visit_count: int = 0

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
            "characters": [c.to_dict() for c in self.characters],
            "world_info": [w.to_dict() for w in self.world_info],
            "scene_prompt": self.scene_prompt,
            "llm_config": self.llm_config.to_dict(),  # 不包含 api_key
            "visit_count": self.visit_count,
        }

    def to_dict_private(self, user_id: str) -> dict[str, Any]:
        """包含敏感信息的版本，仅 owner 可见"""
        result = self.to_dict()
        if user_id == self.owner_id:
            result["llm_config"] = self.llm_config.to_dict_private()
        return result

    def to_dict_public(self) -> dict[str, Any]:
        """公开版本，不包含敏感信息"""
        result = self.to_dict()
        result.pop("password_hash", None)
        result["llm_config"] = self.llm_config.to_dict()
        return result

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Tavern:
        characters = [TavernCharacter.from_dict(c) for c in d.get("characters", [])]
        world_info = [WorldInfoEntry.from_dict(w) for w in d.get("world_info", [])]
        llm = LLMConfig.from_dict(d.get("llm_config", {}))
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
            characters=characters,
            world_info=world_info,
            scene_prompt=d.get("scene_prompt", ""),
            llm_config=llm,
            visit_count=d.get("visit_count", 0),
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
    token_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tavern_id": self.tavern_id,
            "character_id": self.character_id,
            "visitor_id": self.visitor_id,
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
            role=d["role"],
            content=d["content"],
            timestamp=d.get("timestamp", ""),
            token_count=d.get("token_count", 0),
        )


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
        if not self.taverns_file.exists():
            self.taverns_file.write_text("{}", encoding="utf-8")
        if not self.keyvault_file.exists():
            self.keyvault_file.write_text("{}", encoding="utf-8")

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
        return Tavern.from_dict(d)

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
        data[tavern.id] = tavern.to_dict()
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
        if not d:
            return None
        return LLMConfig.from_dict(d)

    # ── 访客状态 ────────────────────────

    def get_visitor_state(self, tavern_id: str, visitor_id: str) -> VisitorState | None:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        visitors = tavern_data.get("_visitors", {})
        v = visitors.get(visitor_id)
        if not v:
            return None
        return VisitorState.from_dict(v)

    def update_visitor_state(self, tavern_id: str, state: VisitorState) -> None:
        data = self._load_taverns()
        tavern_data = data.setdefault(tavern_id, {})
        visitors = tavern_data.setdefault("_visitors", {})
        visitors[state.visitor_id] = state.to_dict()
        self._save_taverns(data)

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
        messages = []
        try:
            for line in file_path.read_text(encoding="utf-8").strip().split("\n"):
                if line.strip():
                    d = json.loads(line)
                    messages.append(ChatMessage.from_dict(d))
        except (json.JSONDecodeError, OSError):
            return []
        return messages[-limit:]

    def add_chat_message(self, msg: ChatMessage) -> ChatMessage:
        chat_dir = self.root / "chat_history" / msg.tavern_id
        chat_dir.mkdir(parents=True, exist_ok=True)
        file_path = chat_dir / f"{msg.visitor_id}_{msg.character_id}.jsonl"
        file_path.append_text(
            json.dumps(msg.to_dict(), ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        return msg

    # ── Token 统计 ──────────────────────

    def add_token_usage(self, tavern_id: str, tokens: int) -> None:
        kv = self._load_keyvault()
        if tavern_id not in kv:
            return
        current = kv[tavern_id].get("token_used", 0)
        kv[tavern_id]["token_used"] = current + tokens
        self._save_keyvault(kv)

    def get_token_usage(self, tavern_id: str) -> int:
        kv = self._load_keyvault()
        return kv.get(tavern_id, {}).get("token_used", 0)


# ─────────────────────────────────────────
# 服务层
# ─────────────────────────────────────────

class TavernService:
    """酒馆服务 — 业务逻辑"""

    def __init__(self, store: TavernStore):
        self.store = store

    def list_taverns(
        self,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        owner_id: str = "",
    ) -> list[dict[str, Any]]:
        """列出酒馆，支持位置过滤"""
        taverns = self.store.list_taverns(owner_id=owner_id)

        result = []
        for t in taverns:
            if access and t.access != access:
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
        result.sort(key=lambda x: x["_distance"] or float("inf"))
        return result

    def get_tavern(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self.store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        if tavern.access == "private" and tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="此酒馆是私人的")

        return tavern.to_dict_private(user_id)

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
            scene_prompt=data.get("scene_prompt", ""),
        )

        # 处理密码
        password = data.get("password", "")
        if tavern.access == "password" and password:
            tavern.password_hash = _hash_password(password)

        tavern = self.store.create_tavern(tavern)

        # 保存 LLM 配置（包含 api_key）
        llm_data = data.get("llm_config", {})
        if llm_data.get("api_key"):
            llm_config = LLMConfig.from_dict(llm_data)
            self.store.save_llm_config(tavern_id, llm_config)
            # 更新 status
            tavern.llm_config = llm_config
            if llm_config.is_configured():
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
            llm_config = LLMConfig.from_dict(llm_data)
            if llm_config.api_key:
                self.store.save_llm_config(tavern_id, llm_config)
                tavern.llm_config = llm_config
                if llm_config.is_configured():
                    tavern.status = "open"
                else:
                    tavern.status = "closed"

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

        # 更新访客状态
        now = _utc_now_iso()
        visitor_state = self.store.get_visitor_state(tavern_id, user_id) or VisitorState(
            visitor_id=user_id,
            tavern_id=tavern_id,
        )
        visitor_state.visit_count += 1
        if not visitor_state.first_visit:
            visitor_state.first_visit = now
        visitor_state.last_visit = now
        self.store.update_visitor_state(tavern_id, visitor_state)

        # 更新酒馆访问计数
        tavern.visit_count += 1
        self.store.update_tavern(tavern)

        return {
            "ok": True,
            "tavern_id": tavern_id,
            "visitor_id": user_id,
            "visit_count": visitor_state.visit_count,
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

        char_id = data.get("id") or f"char_{uuid.uuid4().hex[:12]}"
        character = TavernCharacter(
            id=char_id,
            tavern_id=tavern_id,
            name=data.get("name", "未命名角色"),
            description=data.get("description", ""),
            personality=data.get("personality", ""),
            scenario=data.get("scenario", ""),
            system_prompt=data.get("system_prompt", ""),
            first_mes=data.get("first_mes", ""),
            mes_example=data.get("mes_example", ""),
            alternate_greetings=data.get("alternate_greetings", []),
            tags=data.get("tags", []),
        )
        tavern.characters.append(character)
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
        for key in ("name", "description", "personality", "scenario", "system_prompt",
                    "first_mes", "mes_example", "alternate_greetings", "tags"):
            if key in data:
                setattr(char, key, data[key])

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
