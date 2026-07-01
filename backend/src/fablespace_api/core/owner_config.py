"""
FableSpace Owner Config — 店主配置存储（JSON 文件实现）

存储每个店主的配置信息，包括默认 LLM 配置。
MVP 使用 JSON 文件，保留后续扩展到数据库的接口。

Owner 配置存储路径: fablespace_data/owner_configs.json
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# 数据目录
DATA_DIR = Path("fablespace_data")
OWNER_CONFIGS_FILE = DATA_DIR / "owner_configs.json"


@dataclass
class OwnerLLMConfig:
    """店主默认 LLM 配置"""
    backend: str = "openai"
    model: str = "gpt-4o-mini"
    api_key: str = ""
    base_url: str = ""
    temperature: float = 0.8
    max_tokens: int = 1024
    top_p: float = 1.0

    def is_configured(self) -> bool:
        """检查是否已配置（有 api_key 或 base_url）"""
        return bool(self.api_key or self.base_url)

    def to_dict(self) -> dict[str, Any]:
        return {
            "backend": self.backend,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
        }

    def to_safe_dict(self) -> dict[str, Any]:
        """返回安全摘要（不包含 api_key 明文）"""
        return {
            "backend": self.backend,
            "model": self.model,
            "api_key_configured": bool(self.api_key),
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OwnerLLMConfig":
        return cls(
            backend=data.get("backend", "openai"),
            model=data.get("model", "gpt-4o-mini"),
            api_key=data.get("api_key", ""),
            base_url=data.get("base_url", ""),
            temperature=data.get("temperature", 0.8),
            max_tokens=data.get("max_tokens", 1024),
            top_p=data.get("top_p", 1.0),
        )


@dataclass
class OwnerConfig:
    """店主完整配置"""
    owner_id: str
    default_llm: OwnerLLMConfig = field(default_factory=OwnerLLMConfig)
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "owner_id": self.owner_id,
            "default_llm": self.default_llm.to_dict(),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OwnerConfig":
        llm_data = data.get("default_llm", {})
        return cls(
            owner_id=data.get("owner_id", ""),
            default_llm=OwnerLLMConfig.from_dict(llm_data) if llm_data else OwnerLLMConfig(),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )


class OwnerConfigStore:
    """
    店主配置存储（内存 + 文件持久化）

    MVP 使用内存存储，文件作为持久化备份。
    后续可以扩展到数据库。
    """

    def __init__(self):
        self._configs: dict[str, OwnerConfig] = {}
        self._load_from_file()

    def _load_from_file(self) -> None:
        """从文件加载配置"""
        if not OWNER_CONFIGS_FILE.exists():
            return
        try:
            with open(OWNER_CONFIGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for owner_id, config_data in data.items():
                self._configs[owner_id] = OwnerConfig.from_dict(config_data)
            logger.info(f"Loaded {len(self._configs)} owner configs from file")
        except Exception as e:
            logger.warning(f"Failed to load owner configs: {e}")

    def _save_to_file(self) -> None:
        """保存配置到文件"""
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            data = {owner_id: config.to_dict() for owner_id, config in self._configs.items()}
            with open(OWNER_CONFIGS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save owner configs: {e}")

    def get_config(self, owner_id: str) -> OwnerConfig | None:
        """获取店主配置"""
        return self._configs.get(owner_id)

    def get_default_llm(self, owner_id: str) -> OwnerLLMConfig | None:
        """获取店主默认 LLM 配置"""
        config = self._configs.get(owner_id)
        return config.default_llm if config else None

    def get_default_llm_safe(self, owner_id: str) -> dict[str, Any]:
        """获取店主默认 LLM 配置的安全摘要"""
        config = self._configs.get(owner_id)
        if not config:
            return {"configured": False, "llm_config": None}
        return {
            "configured": config.default_llm.is_configured(),
            "llm_config": config.default_llm.to_safe_dict(),
        }

    def save_default_llm(self, owner_id: str, llm_config: OwnerLLMConfig) -> OwnerConfig:
        """保存店主默认 LLM 配置"""
        from datetime import UTC, datetime

        if owner_id not in self._configs:
            self._configs[owner_id] = OwnerConfig(
                owner_id=owner_id,
                default_llm=llm_config,
                created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                updated_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            )
        else:
            self._configs[owner_id].default_llm = llm_config
            self._configs[owner_id].updated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")

        self._save_to_file()
        return self._configs[owner_id]

    def delete_config(self, owner_id: str) -> bool:
        """删除店主配置"""
        if owner_id in self._configs:
            del self._configs[owner_id]
            self._save_to_file()
            return True
        return False


# 全局单例
_owner_config_store: OwnerConfigStore | None = None


def get_owner_config_store() -> OwnerConfigStore:
    """获取店主配置存储单例"""
    global _owner_config_store
    if _owner_config_store is None:
        _owner_config_store = OwnerConfigStore()
    return _owner_config_store
