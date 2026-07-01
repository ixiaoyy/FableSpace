"""
LLM Presets — save and manage LLM configuration presets.

Inspired by SillyTavern's presets.js.
Each preset contains:
- LLM backend configuration (model, temperature, etc.)
- Prompt template settings
- Generation parameters
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional


@dataclass
class LLMDefaultPreset:
    """LLM preset — a saved configuration for a specific backend."""
    id: str = ""
    name: str = ""
    description: str = ""
    # LLM config
    backend: str = "openai"
    model: str = "gpt-4o-mini"
    api_key: str = ""  # Not persisted in shared presets
    base_url: str = ""
    # Generation params
    temperature: float = 1.0
    max_tokens: int = 2048
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    seed: int = -1
    # Prompt settings
    system_prompt: str = ""
    jailbreak_prompt: str = ""
    # Context
    context_threshold: int = 8192
    # Metadata
    created_at: str = ""
    updated_at: str = ""
    is_default: bool = False
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "backend": self.backend,
            "model": self.model,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "frequency_penalty": self.frequency_penalty,
            "presence_penalty": self.presence_penalty,
            "seed": self.seed,
            "system_prompt": self.system_prompt,
            "jailbreak_prompt": self.jailbreak_prompt,
            "context_threshold": self.context_threshold,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_default": self.is_default,
            "tags": self.tags,
        }
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "LLMDefaultPreset":
        # Filter out api_key for safety
        d = {k: v for k, v in d.items() if k != "api_key"}
        return cls(**d)


# ─── Built-in presets ───────────────────────────────────────────────────────────


def get_default_presets() -> list[LLMDefaultPreset]:
    """Get built-in presets for common configurations."""
    from datetime import datetime

    now = datetime.now().isoformat()

    return [
        LLMDefaultPreset(
            id="openai-gpt4o",
            name="GPT-4o",
            description="OpenAI GPT-4o — balanced performance",
            backend="openai",
            model="gpt-4o",
            temperature=1.0,
            max_tokens=4096,
            top_p=1.0,
            created_at=now,
            is_default=True,
            tags=["openai", "balanced"],
        ),
        LLMDefaultPreset(
            id="openai-gpt4o-mini",
            name="GPT-4o Mini",
            description="OpenAI GPT-4o Mini — fast and cheap",
            backend="openai",
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=2048,
            top_p=1.0,
            created_at=now,
            is_default=True,
            tags=["openai", "fast", "cheap"],
        ),
        LLMDefaultPreset(
            id="claude-sonnet",
            name="Claude Sonnet 4",
            description="Anthropic Claude Sonnet 4 — high quality",
            backend="claude",
            model="claude-sonnet-4-6iop_250928",
            temperature=1.0,
            max_tokens=4096,
            top_p=1.0,
            created_at=now,
            is_default=True,
            tags=["claude", "high-quality"],
        ),
        LLMDefaultPreset(
            id="claude-haiku",
            name="Claude Haiku",
            description="Anthropic Claude Haiku — fast and cheap",
            backend="claude",
            model="claude-haiku-4-250507",
            temperature=0.7,
            max_tokens=2048,
            top_p=1.0,
            created_at=now,
            is_default=True,
            tags=["claude", "fast"],
        ),
        LLMDefaultPreset(
            id="ollama-llama3",
            name="Ollama Llama 3",
            description="Local Ollama Llama 3 70B",
            backend="ollama",
            model="llama3:70b",
            base_url="http://localhost:11434",
            temperature=0.8,
            max_tokens=2048,
            top_p=0.9,
            created_at=now,
            tags=["local", "ollama"],
        ),
        LLMDefaultPreset(
            id="deepseek-chat",
            name="DeepSeek Chat",
            description="DeepSeek V3 — efficient and capable",
            backend="openai",
            model="deepseek-chat",
            base_url="https://api.deepseek.com",
            temperature=0.7,
            max_tokens=4096,
            top_p=1.0,
            created_at=now,
            tags=["deepseek", "efficient"],
        ),
        LLMDefaultPreset(
            id="openrouter-mixtral",
            name="OpenRouter Mixtral",
            description="Mixtral via OpenRouter",
            backend="openai",
            model="mistralai/mixtral-8x7b-instruct",
            base_url="https://openrouter.ai/api/v1",
            api_key="",
            temperature=0.8,
            max_tokens=2048,
            top_p=1.0,
            created_at=now,
            tags=["openrouter", "mixtral"],
        ),
    ]


# ─── Preset Manager ────────────────────────────────────────────────────────────


class PresetManager:
    """Manage LLM presets."""

    def __init__(self, storage_path: Path | str = None):
        self.storage_path = Path(storage_path) if storage_path else Path("data/presets.json")
        self.presets: dict[str, LLMDefaultPreset] = {}
        self._load()

    def _load(self) -> None:
        """Load presets from storage."""
        # Load defaults first
        for preset in get_default_presets():
            self.presets[preset.id] = preset

        # Override with user presets
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text("utf-8"))
                for p_data in data.get("presets", []):
                    preset = LLMDefaultPreset.from_dict(p_data)
                    self.presets[preset.id] = preset
            except Exception:
                pass

    def save(self) -> None:
        """Save presets to storage."""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "presets": [
                p.to_dict() for p in self.presets.values()
                if not p.is_default  # Don't save defaults
            ]
        }
        self.storage_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, preset_id: str) -> Optional[LLMDefaultPreset]:
        """Get a preset by ID."""
        return self.presets.get(preset_id)

    def list_all(self) -> list[LLMDefaultPreset]:
        """List all presets."""
        return sorted(self.presets.values(), key=lambda p: p.name)

    def create(self, preset: LLMDefaultPreset) -> str:
        """Create a new preset."""
        if not preset.id:
            preset.id = str(uuid.uuid4())
        from datetime import datetime
        preset.created_at = datetime.now().isoformat()
        preset.updated_at = preset.created_at
        preset.is_default = False
        self.presets[preset.id] = preset
        self.save()
        return preset.id

    def update(self, preset_id: str, updates: dict) -> bool:
        """Update an existing preset."""
        if preset_id not in self.presets:
            return False
        preset = self.presets[preset_id]
        for key, value in updates.items():
            if key not in ("id", "is_default", "created_at"):
                setattr(preset, key, value)
        from datetime import datetime
        preset.updated_at = datetime.now().isoformat()
        self.save()
        return True

    def delete(self, preset_id: str) -> bool:
        """Delete a preset."""
        if preset_id not in self.presets:
            return False
        if self.presets[preset_id].is_default:
            return False  # Can't delete defaults
        del self.presets[preset_id]
        self.save()
        return True

# ─── Runtime presets (Tavern role-play bundles) ────────────────────────────────

from copy import deepcopy as _deepcopy

from .output_rules import default_output_rules, normalize_output_rules
from .prompt_blocks import default_prompt_blocks, normalize_prompt_blocks


RUNTIME_PRESET_VERSION = "1.0"


def _coerce_float(value: Any, fallback: float, *, minimum: float, maximum: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, number))


def _coerce_int(value: Any, fallback: int, *, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, number))


def safe_llm_preset_config(value: Any) -> dict[str, Any]:
    """Return model settings that are safe to serialize/share.

    API keys, token usage, and unknown provider-specific fields are omitted.
    """

    if not isinstance(value, dict):
        return {}

    config: dict[str, Any] = {}
    backend = str(value.get("backend") or "").strip()
    model = str(value.get("model") or "").strip()
    base_url = str(value.get("base_url") or "").strip()
    if backend:
        config["backend"] = backend
    if model:
        config["model"] = model
    if base_url:
        config["base_url"] = base_url
    if "temperature" in value:
        config["temperature"] = _coerce_float(value.get("temperature"), 0.8, minimum=0.0, maximum=2.0)
    if "max_tokens" in value:
        config["max_tokens"] = _coerce_int(value.get("max_tokens"), 4096, minimum=256, maximum=200000)
    if "top_p" in value:
        config["top_p"] = _coerce_float(value.get("top_p"), 0.95, minimum=0.01, maximum=1.0)
    return config


def safe_memory_policy(value: Any) -> dict[str, Any]:
    """Normalize memory policy metadata without forcing a storage strategy yet."""

    if not isinstance(value, dict):
        return {}

    allowed_modes = {"off", "visitor_state", "structured", "balanced", "long_context"}
    mode = str(value.get("mode") or "visitor_state").strip()
    if mode not in allowed_modes:
        mode = "visitor_state"
    return {
        "mode": mode,
        "short_term": bool(value.get("short_term", True)),
        "mid_term": bool(value.get("mid_term", mode in {"structured", "balanced", "long_context"})),
        "long_term": bool(value.get("long_term", mode in {"balanced", "long_context"})),
        "budget_tokens": _coerce_int(value.get("budget_tokens"), 1200, minimum=0, maximum=200000),
        "notes": str(value.get("notes") or "").strip()[:1000],
    }


def _runtime_preset(
    *,
    preset_id: str,
    name: str,
    description: str,
    model_hint: str,
    llm_config: dict[str, Any],
    memory_policy: dict[str, Any],
    prompt_blocks: list[dict[str, Any]] | None = None,
    output_rules: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "id": preset_id,
        "name": name,
        "description": description,
        "version": RUNTIME_PRESET_VERSION,
        "built_in": True,
        "model_hint": model_hint,
        "llm_config": safe_llm_preset_config(llm_config),
        "prompt_blocks": normalize_prompt_blocks(prompt_blocks if prompt_blocks is not None else default_prompt_blocks()),
        "memory_policy": safe_memory_policy(memory_policy),
        "output_rules": normalize_output_rules(output_rules if output_rules is not None else default_output_rules()),
    }


def _blocks_with_disabled(*block_ids: str) -> list[dict[str, Any]]:
    disabled = set(block_ids)
    blocks = default_prompt_blocks()
    for block in blocks:
        if block.get("id") in disabled:
            block["enabled"] = False
    return blocks


def default_runtime_presets() -> list[dict[str, Any]]:
    """Built-in runtime presets shown to tavern owners."""

    return [
        _runtime_preset(
            preset_id="balanced-roleplay",
            name="平衡剧情",
            description="适合多数中文角色扮演：保留世界书、访客关系和基础护栏，成本与稳定性平衡。",
            model_hint="DeepSeek / OpenAI 兼容",
            llm_config={
                "backend": "openai",
                "model": "gpt-4o-mini",
                "temperature": 0.9,
                "max_tokens": 4096,
                "top_p": 0.95,
            },
            memory_policy={
                "mode": "visitor_state",
                "short_term": True,
                "mid_term": False,
                "long_term": False,
                "budget_tokens": 900,
                "notes": "使用当前访客关系和最近会话事实，不启用复杂记忆。",
            },
        ),
        _runtime_preset(
            preset_id="low-cost-fast",
            name="低成本快速",
            description="更短回复预算，关闭作者备注，适合公开空间的轻量接待。",
            model_hint="DeepSeek / 本地小模型",
            llm_config={
                "backend": "deepseek",
                "model": "deepseek-chat",
                "base_url": "https://api.deepseek.com/v1",
                "temperature": 1.0,
                "max_tokens": 2048,
                "top_p": 0.92,
            },
            memory_policy={
                "mode": "visitor_state",
                "short_term": True,
                "mid_term": False,
                "long_term": False,
                "budget_tokens": 600,
                "notes": "优先省 token，只保留轻量访客连续性。",
            },
            prompt_blocks=_blocks_with_disabled("author_note"),
        ),
        _runtime_preset(
            preset_id="long-context-lore",
            name="长上下文世界书",
            description="提高回复预算并保留完整世界书段落，适合设定较多、剧情推进较慢的空间。",
            model_hint="Claude / Gemini / OpenRouter 长上下文",
            llm_config={
                "backend": "openai-compatible",
                "model": "anthropic/claude-3.5-haiku",
                "base_url": "https://openrouter.ai/api/v1",
                "temperature": 0.85,
                "max_tokens": 12000,
                "top_p": 0.9,
            },
            memory_policy={
                "mode": "long_context",
                "short_term": True,
                "mid_term": True,
                "long_term": True,
                "budget_tokens": 2400,
                "notes": "为后续结构化长期记忆和更多世界书预算预留空间。",
            },
        ),
    ]


def normalize_runtime_presets(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    presets: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, raw_preset in enumerate(value):
        if not isinstance(raw_preset, dict):
            continue

        preset_id = str(raw_preset.get("id") or f"runtime_preset_{index + 1}").strip()
        if not preset_id:
            preset_id = f"runtime_preset_{index + 1}"
        if preset_id in seen:
            preset_id = f"{preset_id}_{index + 1}"
        seen.add(preset_id)

        name = str(raw_preset.get("name") or raw_preset.get("title") or preset_id).strip() or "未命名预设"
        presets.append(
            {
                "id": preset_id,
                "name": name,
                "description": str(raw_preset.get("description") or "").strip(),
                "version": str(raw_preset.get("version") or RUNTIME_PRESET_VERSION).strip() or RUNTIME_PRESET_VERSION,
                "built_in": bool(raw_preset.get("built_in", False)),
                "model_hint": str(raw_preset.get("model_hint") or raw_preset.get("best_for") or "").strip(),
                "llm_config": safe_llm_preset_config(raw_preset.get("llm_config") or raw_preset.get("config")),
                "prompt_blocks": normalize_prompt_blocks(raw_preset.get("prompt_blocks")),
                "memory_policy": safe_memory_policy(raw_preset.get("memory_policy")),
                "output_rules": normalize_output_rules(raw_preset.get("output_rules")),
            }
        )

    return presets


def custom_runtime_presets(value: Any) -> list[dict[str, Any]]:
    """Normalize and keep only owner-created presets."""

    return [preset for preset in normalize_runtime_presets(value) if not preset.get("built_in")]


def combine_runtime_presets(custom_presets: Any) -> list[dict[str, Any]]:
    """Return built-ins followed by owner-created presets."""

    return [*default_runtime_presets(), *custom_runtime_presets(custom_presets)]


def find_runtime_preset(presets: list[dict[str, Any]], preset_id: str) -> dict[str, Any] | None:
    needle = str(preset_id or "").strip()
    if not needle:
        return None
    for preset in presets:
        if preset.get("id") == needle:
            return _deepcopy(preset)
    return None
