from __future__ import annotations

from typing import Any


SPACE_PACKAGE_TYPE = "fablespace_space_package"
LEGACY_SPACE_PACKAGE_TYPES = {"fablemap_tavern_package", "fablemap_space_package"}
SUPPORTED_SPACE_PACKAGE_TYPES = {SPACE_PACKAGE_TYPE, *LEGACY_SPACE_PACKAGE_TYPES}
TAVERN_PACKAGE_VERSION = "1.0"


def safe_llm_preset(value: Any) -> dict[str, Any]:
    """Return package-safe model settings without API keys or token usage."""

    if not isinstance(value, dict):
        return {}
    allowed = (
        "backend",
        "model",
        "base_url",
        "temperature",
        "max_tokens",
        "top_p",
        "frequency_penalty",
        "presence_penalty",
    )
    return {key: value[key] for key in allowed if key in value and value[key] not in (None, "")}


def safe_tavern_package_tavern(value: dict[str, Any]) -> dict[str, Any]:
    """Keep only shareable tavern metadata for export packages."""

    allowed = (
        "id",
        "name",
        "description",
        "lat",
        "lon",
        "address",
        "access",
        "status",
        "roleplay_mode",
        "scene_prompt",
    )
    tavern = {key: value.get(key) for key in allowed if key in value}
    tavern["llm_config"] = safe_llm_preset(value.get("llm_config"))
    return tavern


def package_list(package: dict[str, Any], space_payload: dict[str, Any], key: str) -> list[Any]:
    value = package.get(key)
    if isinstance(value, list):
        return value
    value = space_payload.get(key)
    return value if isinstance(value, list) else []


def package_dict(package: dict[str, Any], space_payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = package.get(key)
    if isinstance(value, dict):
        return value
    value = space_payload.get(key)
    return value if isinstance(value, dict) else {}
