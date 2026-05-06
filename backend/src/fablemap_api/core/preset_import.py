"""Preset import preview and owner-confirmed apply helpers.

Preview intentionally does not mutate Tavern state. Apply helpers only build a
safe, owner-selected diff plan; application services remain responsible for the
actual owner check and persistence.
"""

from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any


class PresetImportError(ValueError):
    """Raised when a preset preview payload cannot be parsed."""


SENSITIVE_KEYS = {
    "api_key",
    "apikey",
    "authorization",
    "password",
    "token",
    "secret",
    "bearer",
    "keyvault",
}

RUNTIME_PARAMETER_KEYS = {
    "temperature",
    "top_p",
    "top_k",
    "min_p",
    "max_tokens",
    "max_context",
    "context_size",
    "presence_penalty",
    "frequency_penalty",
    "repetition_penalty",
    "model",
    "backend",
    "provider",
    "world_info_depth",
    "depth",
}

MODULE_LIST_KEYS = {
    "prompts",
    "prompt_blocks",
    "promptBlocks",
    "prompt_modules",
    "promptModules",
    "modules",
    "messages",
    "world_info",
    "worldInfo",
    "entries",
}

APPLY_TARGETS = {"prompt_blocks", "world_info", "characters"}

TEXT_FIELD_KEYS = {
    "content",
    "prompt",
    "text",
    "template",
    "message",
    "system_prompt",
    "jailbreak_prompt",
    "persona",
    "style",
    "writing_style",
    "description",
    "scenario",
}

NAME_FIELD_KEYS = {"id", "identifier", "name", "title", "role"}

BLOCKED_PATTERNS: list[tuple[str, str, tuple[str, ...], str]] = [
    (
        "safety_bypass",
        "包含越狱、绝对服从或绕过安全限制指令",
        (
            "jailbreak",
            "ignore previous",
            "ignore all previous",
            "bypass safety",
            "bypass all safety",
            "safety restrictions",
            "absolute obedience",
            "obey any user",
            "developer mode",
            "无条件服从",
            "忽略之前",
            "绕过安全",
            "越狱",
        ),
        "blocked",
    ),
    (
        "chain_of_thought",
        "要求输出隐藏推理或 chain-of-thought",
        (
            "chain of thought",
            "hidden reasoning",
            "private reasoning",
            "show your reasoning",
            "reveal reasoning",
            "思维链",
            "隐藏推理",
            "内部推理",
        ),
        "blocked",
    ),
    (
        "user_impersonation",
        "要求代替用户发言或冒充用户",
        (
            "impersonate the user",
            "speak as the user",
            "write as the user",
            "user will say",
            "替用户",
            "冒充用户",
            "代替用户发言",
        ),
        "blocked",
    ),
    (
        "privacy",
        "要求收集私人地址、联系方式、证件或密钥等敏感信息",
        (
            "private address",
            "home address",
            "phone number",
            "social security",
            "passport",
            "api key",
            "身份证",
            "手机号",
            "私人地址",
            "家庭住址",
            "密钥",
        ),
        "blocked",
    ),
    (
        "explicit_sexual",
        "包含露骨色情、强迫性或非自愿性内容",
        (
            "explicit nsfw",
            "forced sexual",
            "non-consensual",
            "rape",
            "未成年性",
            "强迫性",
            "非自愿",
            "露骨色情",
        ),
        "blocked",
    ),
]

WARNING_PATTERNS: list[tuple[str, str, tuple[str, ...]]] = [
    (
        "model_specific",
        "包含模型/代理特定提示，应用前需要店主人工核对",
        ("claude", "openai", "proxy", "model", "provider", "context 200000", "max_context", "openaiproxy"),
    ),
    (
        "memory",
        "涉及记忆、摘要或长期状态，不能直接写入正史",
        ("memory", "summary", "persistent", "long-term", "记忆", "总结", "长期"),
    ),
]

SUPPORTED_PATTERNS: list[tuple[str, str, tuple[str, ...]]] = [
    (
        "world_info",
        "可作为世界书/关键词注入提示参考",
        ("world_info", "world info", "character_book", "keyword", "depth", "世界书", "关键词"),
    ),
    (
        "style",
        "可作为安全的风格、氛围或叙事视角参考",
        ("style", "tone", "atmosphere", "cinematic", "narrative", "pacing", "perspective", "风格", "氛围", "视角"),
    ),
    (
        "dialogue",
        "可作为对话密度、回复长度或互动节奏参考",
        ("dialogue", "reply", "brief", "concise", "density", "conversation", "对话", "简短", "回复"),
    ),
    (
        "role_consistency",
        "可作为角色口吻一致性参考",
        ("persona", "character", "stay in character", "角色", "人设", "口吻"),
    ),
]


def preview_preset_import(payload: Any) -> dict[str, Any]:
    """Return a preview-only risk report for a preset-like payload."""

    preset = _coerce_preset_payload(payload)
    preset_name = _preset_name(preset)
    modules = _extract_modules(preset)
    runtime_parameters = _extract_runtime_parameters(preset)

    supported: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    blocked: list[dict[str, Any]] = []

    for index, module in enumerate(modules, start=1):
        item = _classify_module(module, index)
        if item["severity"] == "blocked":
            blocked.append(item)
        elif item["severity"] == "warning":
            warnings.append(item)
        else:
            supported.append(item)

    for item in _runtime_warnings(runtime_parameters):
        warnings.append(item)

    notes = [
        "preview only：本报告不会写入 Tavern.runtime_presets、prompt_blocks、world_info 或 characters。",
        "blocked 项仅供店主识别风险，不会被转换为可用 Prompt。",
    ]
    if not modules and not runtime_parameters:
        notes.append("未识别到可预览的 prompt 模块或运行参数。")

    return {
        "ok": True,
        "preview_only": True,
        "applied": False,
        "preset_name": preset_name,
        "summary": {
            "total_modules": len(modules),
            "supported": len(supported),
            "warning": len(warnings),
            "blocked": len(blocked),
            "runtime_parameters": len(runtime_parameters),
        },
        "supported": supported,
        "warnings": warnings,
        "blocked": blocked,
        "runtime_parameters": runtime_parameters,
        "notes": notes,
    }


def build_preset_import_apply_plan(
    payload: Any,
    *,
    selected_ids: Any = None,
    target_map: Any = None,
    include_runtime_parameters: bool = False,
) -> dict[str, Any]:
    """Build a safe diff plan for owner-confirmed preset import apply.

    The plan accepts only explicitly selected ``supported`` preview items.
    Warning/blocked modules are kept visible in the returned report but are
    rejected if selected. The returned ``diff`` is safe to display before a
    separate confirm step; this function itself performs no persistence.
    """

    preset = _coerce_preset_payload(payload)
    preset_name = _preset_name(preset)
    modules = _extract_modules(preset)
    runtime_parameters = _extract_runtime_parameters(preset)

    supported: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    blocked: list[dict[str, Any]] = []
    module_content_by_id: dict[str, str] = {}
    item_by_id: dict[str, dict[str, Any]] = {}

    for index, module in enumerate(modules, start=1):
        item = _classify_module(module, index)
        item_by_id[item["id"]] = item
        module_content_by_id[item["id"]] = _redact_sample(str(module.get("content") or ""))[:4000]
        if item["severity"] == "blocked":
            blocked.append(item)
        elif item["severity"] == "warning":
            warnings.append(item)
        else:
            supported.append(item)

    for item in _runtime_warnings(runtime_parameters):
        warnings.append(item)
        item_by_id[item["id"]] = item

    selected = _normalize_selected_ids(selected_ids)
    invalid: list[str] = []
    for selected_id in selected:
        item = item_by_id.get(selected_id)
        if not item:
            invalid.append(f"{selected_id}: unknown")
        elif item.get("severity") != "supported":
            invalid.append(f"{selected_id}: {item.get('severity')}")
    if invalid:
        raise PresetImportError(f"Apply 仅允许 selected supported 项；已拒绝：{', '.join(invalid)}")

    targets = target_map if isinstance(target_map, dict) else {}
    diff: dict[str, list[dict[str, Any]]] = {
        "prompt_blocks": [],
        "world_info": [],
        "characters": [],
        "runtime_presets": [],
    }
    for selected_id in selected:
        item = item_by_id[selected_id]
        target = _apply_target_for_item(item, targets.get(selected_id))
        content = module_content_by_id.get(selected_id, item.get("sample", ""))
        if target == "world_info":
            diff["world_info"].append(_world_info_entry_from_item(item, content))
        elif target == "characters":
            diff["characters"].append(_character_from_item(item, content))
        else:
            diff["prompt_blocks"].append(_prompt_block_from_item(item, content))

    if include_runtime_parameters and runtime_parameters:
        runtime_preset = _runtime_preset_from_parameters(preset_name, runtime_parameters)
        if runtime_preset:
            diff["runtime_presets"].append(runtime_preset)

    return {
        "ok": True,
        "preview_only": False,
        "applied": False,
        "confirm_required": True,
        "preset_name": preset_name,
        "summary": {
            "total_modules": len(modules),
            "supported": len(supported),
            "warning": len(warnings),
            "blocked": len(blocked),
            "runtime_parameters": len(runtime_parameters),
            "selected": len(selected),
        },
        "selected_ids": selected,
        "supported": supported,
        "warnings": warnings,
        "blocked": blocked,
        "runtime_parameters": runtime_parameters,
        "diff": diff,
        "applied_counts": _diff_counts(diff),
        "notes": [
            "confirm_required=true：这是导入影响预览，不会写入 Tavern。",
            "Apply 只接受店主选择的 supported 项；warning / blocked 不会被应用。",
        ],
    }


def _coerce_preset_payload(payload: Any) -> dict[str, Any]:
    value = payload
    if isinstance(value, dict):
        for key in ("preset", "preset_json", "json", "content"):
            nested = value.get(key)
            if isinstance(nested, dict):
                value = nested
                break
            if isinstance(nested, str) and nested.strip():
                value = nested
                break

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise PresetImportError(f"Preset JSON 解析失败：{exc.msg}") from exc
        value = parsed

    if not isinstance(value, dict):
        raise PresetImportError("Preset JSON 必须是对象")

    return _without_sensitive_fields(value)


def _without_sensitive_fields(value: Any) -> Any:
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            if _is_sensitive_key(key):
                continue
            clean[key] = _without_sensitive_fields(item)
        return clean
    if isinstance(value, list):
        return [_without_sensitive_fields(item) for item in value]
    return deepcopy(value)


def _is_sensitive_key(key: Any) -> bool:
    normalized = str(key or "").strip().lower().replace("-", "_")
    return normalized in SENSITIVE_KEYS or normalized.endswith("_secret") or normalized.endswith("_token")


def _preset_name(payload: dict[str, Any]) -> str:
    for key in ("name", "preset_name", "title", "display_name"):
        value = str(payload.get(key) or "").strip()
        if value:
            return value[:120]
    return "未命名预设"


def _extract_runtime_parameters(payload: dict[str, Any]) -> dict[str, Any]:
    runtime: dict[str, Any] = {}
    candidates: list[dict[str, Any]] = [payload]
    for key in ("settings", "parameters", "sampler", "runtime", "llm_config"):
        nested = payload.get(key)
        if isinstance(nested, dict):
            candidates.append(nested)

    for source in candidates:
        for key, value in source.items():
            normalized_key = str(key or "").strip()
            if normalized_key in RUNTIME_PARAMETER_KEYS and not _is_sensitive_key(normalized_key):
                runtime[normalized_key] = _safe_runtime_value(value)
    return runtime


def _safe_runtime_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, list):
        return [item for item in value if isinstance(item, (str, int, float, bool))][:12]
    return str(value)[:120]


def _extract_modules(payload: dict[str, Any]) -> list[dict[str, Any]]:
    modules: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add(name: str, content: str, source: str, enabled: bool = True) -> None:
        clean_content = _clean_text(content)
        clean_name = _clean_text(name) or source
        if not clean_content:
            return
        key = (clean_name.casefold(), clean_content.casefold())
        if key in seen:
            return
        seen.add(key)
        modules.append(
            {
                "name": clean_name[:120],
                "content": clean_content,
                "source": source,
                "enabled": bool(enabled),
            }
        )

    def visit(value: Any, source: str) -> None:
        if isinstance(value, list):
            for index, item in enumerate(value, start=1):
                visit(item, f"{source}[{index}]")
            return
        if not isinstance(value, dict):
            return

        text = _module_text(value)
        if text:
            add(_module_name(value), text, source, _module_enabled(value))

        character_book = value.get("character_book")
        if isinstance(character_book, dict):
            visit(character_book.get("entries", []), f"{source}.character_book.entries")

        for key, item in value.items():
            if _is_sensitive_key(key):
                continue
            if key in MODULE_LIST_KEYS:
                visit(item, f"{source}.{key}")

    for key, item in payload.items():
        if _is_sensitive_key(key):
            continue
        if key in MODULE_LIST_KEYS:
            visit(item, key)
        elif key in TEXT_FIELD_KEYS and isinstance(item, str):
            add(key, item, key, True)

    return modules


def _module_name(value: dict[str, Any]) -> str:
    for key in NAME_FIELD_KEYS:
        text = str(value.get(key) or "").strip()
        if text:
            return text
    return "未命名模块"


def _module_text(value: dict[str, Any]) -> str:
    chunks: list[str] = []
    for key in TEXT_FIELD_KEYS:
        item = value.get(key)
        if isinstance(item, str) and item.strip():
            chunks.append(item)
    return "\n".join(chunks)


def _module_enabled(value: dict[str, Any]) -> bool:
    raw = value.get("enabled", value.get("enable", True))
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        return raw.strip().lower() not in {"0", "false", "off", "disabled"}
    return bool(raw)


def _classify_module(module: dict[str, Any], index: int) -> dict[str, Any]:
    haystack = f"{module.get('name', '')}\n{module.get('source', '')}\n{module.get('content', '')}".casefold()

    for category, reason, needles, severity in BLOCKED_PATTERNS:
        if _contains_any(haystack, needles):
            return _preview_item(module, index, category, severity, reason)

    for category, reason, needles in WARNING_PATTERNS:
        if _contains_any(haystack, needles):
            return _preview_item(module, index, category, "warning", reason)

    for category, reason, needles in SUPPORTED_PATTERNS:
        if _contains_any(haystack, needles):
            return _preview_item(module, index, category, "supported", reason)

    return _preview_item(module, index, "manual_review", "warning", "未识别的预设模块，需要店主人工核对后再手动迁移")


def _preview_item(module: dict[str, Any], index: int, category: str, severity: str, reason: str) -> dict[str, Any]:
    return {
        "id": f"module_{index}",
        "name": _redact_sample(str(module.get("name") or f"模块 {index}"))[:120],
        "category": category,
        "severity": severity,
        "reason": reason,
        "source": str(module.get("source") or "")[:120],
        "sample": _redact_sample(str(module.get("content") or ""))[:240],
        "enabled": bool(module.get("enabled", True)),
    }


def _runtime_warnings(runtime: dict[str, Any]) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []
    temperature = _float(runtime.get("temperature"))
    if temperature is not None and temperature > 1.2:
        warnings.append(
            {
                "id": "runtime_temperature",
                "name": "temperature",
                "category": "runtime",
                "severity": "warning",
                "reason": "temperature 较高，可能显著改变 NPC 口吻，需要人工核对",
                "source": "runtime",
                "sample": str(runtime.get("temperature")),
                "enabled": True,
            }
        )
    model_text = " ".join(str(runtime.get(key) or "") for key in ("model", "backend", "provider"))
    if model_text and _contains_any(model_text.casefold(), ("claude", "openai", "proxy", "model")):
        warnings.append(
            {
                "id": "runtime_model",
                "name": "model/backend",
                "category": "model_specific",
                "severity": "warning",
                "reason": "运行参数包含模型/提供商信息，不能当作跨模型通用安全设置",
                "source": "runtime",
                "sample": _redact_sample(model_text)[:160],
                "enabled": True,
            }
        )
    return warnings


def _normalize_selected_ids(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        items = [value]
    elif isinstance(value, list):
        items = value
    else:
        items = []

    selected: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = str(item or "").strip()
        if text and text not in seen:
            selected.append(text)
            seen.add(text)
    return selected


def _apply_target_for_item(item: dict[str, Any], requested_target: Any = None) -> str:
    target = str(requested_target or "").strip()
    if target:
        if target not in APPLY_TARGETS:
            raise PresetImportError(f"不支持的 apply target：{target}")
        return target
    if item.get("category") == "world_info":
        return "world_info"
    return "prompt_blocks"


def _prompt_block_from_item(item: dict[str, Any], content: str) -> dict[str, Any]:
    return {
        "id": _safe_import_id("preset_prompt", item),
        "name": f"{item.get('name') or 'Imported Prompt'}",
        "enabled": bool(item.get("enabled", True)),
        "type": "custom",
        "order": 120,
        "template": str(content or item.get("sample") or "")[:4000],
        "token_budget": 800,
        "built_in": False,
    }


def _world_info_entry_from_item(item: dict[str, Any], content: str) -> dict[str, Any]:
    return {
        "id": _safe_import_id("preset_world", item),
        "tavern_id": "",
        "keys": [_keyword_from_item(item, content)],
        "content": str(content or item.get("sample") or "")[:4000],
        "keys_secondary": [],
        "selective": True,
        "constant": False,
        "depth": 4,
        "order": 120,
        "probability": 100,
        "disable": False,
    }


def _character_from_item(item: dict[str, Any], content: str) -> dict[str, Any]:
    text = str(content or item.get("sample") or "")[:4000]
    return {
        "id": _safe_import_id("preset_character", item),
        "tavern_id": "",
        "name": _character_name_from_item(item),
        "description": "由店主确认的预设 supported 项导入。",
        "personality": text[:1200],
        "scenario": "",
        "system_prompt": text,
        "first_mes": "",
        "mes_example": "",
        "alternate_greetings": [],
        "tags": ["preset-import"],
        "sprites": {},
        "avatar": "",
        "appearance": {},
        "talkativeness": 0.5,
    }


def _runtime_preset_from_parameters(preset_name: str, runtime: dict[str, Any]) -> dict[str, Any]:
    llm_config = _safe_runtime_llm_config(runtime)
    if not llm_config:
        return {}
    return {
        "id": _safe_id(f"preset_runtime_{preset_name}"),
        "name": f"{preset_name} · 导入运行参数",
        "description": "由预设导入工具识别的安全运行参数；不包含 API Key 或密钥。",
        "version": "1.0",
        "built_in": False,
        "model_hint": " / ".join(
            str(runtime.get(key) or "").strip()
            for key in ("backend", "provider", "model")
            if str(runtime.get(key) or "").strip()
        )[:160],
        "llm_config": llm_config,
        "prompt_blocks": [],
        "memory_policy": {},
        "output_rules": [],
    }


def _safe_runtime_llm_config(runtime: dict[str, Any]) -> dict[str, Any]:
    config: dict[str, Any] = {}
    backend = str(runtime.get("backend") or runtime.get("provider") or "").strip()
    model = str(runtime.get("model") or "").strip()
    if backend:
        config["backend"] = backend[:80]
    if model:
        config["model"] = model[:120]
    if "temperature" in runtime:
        number = _float(runtime.get("temperature"))
        if number is not None:
            config["temperature"] = max(0.0, min(2.0, number))
    if "top_p" in runtime:
        number = _float(runtime.get("top_p"))
        if number is not None:
            config["top_p"] = max(0.01, min(1.0, number))
    if "max_tokens" in runtime:
        try:
            config["max_tokens"] = max(256, min(200000, int(runtime.get("max_tokens"))))
        except (TypeError, ValueError):
            pass
    return config


def _keyword_from_item(item: dict[str, Any], content: str) -> str:
    text = f"{item.get('name', '')} {content or ''}"
    match = re.search(r"(?:keyword|关键词)\s*[:：]?\s*([A-Za-z0-9_\-\u4e00-\u9fff]{1,32})", text, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    name = re.sub(r"\s+", " ", str(item.get("name") or "")).strip()
    return name[:32] or "imported-preset"


def _character_name_from_item(item: dict[str, Any]) -> str:
    name = re.sub(r"\s+", " ", str(item.get("name") or "")).strip()
    if name:
        return name[:32]
    return "导入角色"


def _safe_import_id(prefix: str, item: dict[str, Any]) -> str:
    return _safe_id(f"{prefix}_{item.get('id')}_{item.get('name')}")


def _safe_id(value: str) -> str:
    slug = re.sub(r"[^\w\-]+", "_", str(value or "").strip(), flags=re.UNICODE).strip("_").lower()
    return (slug or "preset_import")[:96]


def _diff_counts(diff: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    return {
        "prompt_blocks": len(diff.get("prompt_blocks", [])),
        "world_info": len(diff.get("world_info", [])),
        "characters": len(diff.get("characters", [])),
        "runtime_presets": len(diff.get("runtime_presets", [])),
    }


def _contains_any(text: str, needles: tuple[str, ...]) -> bool:
    return any(needle.casefold() in text for needle in needles)


def _float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _redact_sample(value: str) -> str:
    redacted = re.sub(r"sk-[A-Za-z0-9_\-]{6,}", "[redacted-key]", value)
    redacted = re.sub(r"(api[_-]?key\s*[:=]\s*)\S+", r"\1[redacted]", redacted, flags=re.IGNORECASE)
    return redacted


__all__ = ["PresetImportError", "build_preset_import_apply_plan", "preview_preset_import"]
