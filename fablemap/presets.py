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
