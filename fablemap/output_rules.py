"""Deterministic output cleanup rules for tavern role-play responses.

The rules here are intentionally lightweight and non-blocking: invalid regular
expressions are reported but never allowed to break a chat response.
"""

from __future__ import annotations

from copy import deepcopy
import re
from typing import Any


DEFAULT_OUTPUT_RULES: list[dict[str, Any]] = [
    {
        "id": "anti_ai_disclaimer",
        "name": "去除 AI 自称",
        "description": "移除回复开头的“作为 AI/人工智能……”等出戏表达。",
        "enabled": True,
        "kind": "regex",
        "pattern": r"^\s*(?:作为\s*(?:一个|一名)?\s*(?:AI|人工智能)\s*(?:语言模型|助手)?[，,：:\s]*)+",
        "replacement": "",
        "flags": {"ignore_case": True, "multiline": False, "dotall": False},
        "built_in": True,
    },
    {
        "id": "remove_ooc_prefix",
        "name": "去除 OOC 开头",
        "description": "移除回复开头的（OOC）、（旁白）、（系统）等元叙事前缀。",
        "enabled": True,
        "kind": "regex",
        "pattern": r"^\s*[\(（]\s*(?:OOC|旁白|系统|作者)(?:[:：][^\)）]*)?[\)）]\s*",
        "replacement": "",
        "flags": {"ignore_case": True, "multiline": False, "dotall": False},
        "built_in": True,
    },
    {
        "id": "remove_meta_heading",
        "name": "去除总结式标题",
        "description": "移除“剧情总结：”“AI 回复：”等容易让文本像报告的标题。",
        "enabled": True,
        "kind": "regex",
        "pattern": r"^\s*(?:剧情总结|本章总结|总结|回复|角色回应|AI\s*回复)\s*[:：]\s*",
        "replacement": "",
        "flags": {"ignore_case": True, "multiline": True, "dotall": False},
        "built_in": True,
    },
    {
        "id": "collapse_blank_lines",
        "name": "压缩多余空行",
        "description": "把连续 3 个以上换行压缩为 2 个，避免回复显得松散。",
        "enabled": True,
        "kind": "regex",
        "pattern": r"\n{3,}",
        "replacement": "\n\n",
        "flags": {"ignore_case": False, "multiline": False, "dotall": False},
        "built_in": True,
    },
    {
        "id": "player_agency_sample",
        "name": "玩家主导权示例（默认关闭）",
        "description": "示例规则：可复制后改写，用于减少模型替玩家做决定的句式。",
        "enabled": False,
        "kind": "regex",
        "pattern": r"你(?:决定|意识到|感到|想要)([^。！？\n]*[。！？]?)",
        "replacement": "你可以$1",
        "flags": {"ignore_case": False, "multiline": True, "dotall": False},
        "built_in": True,
    },
]


def default_output_rules() -> list[dict[str, Any]]:
    """Return a deep copy of the built-in rule set."""

    return deepcopy(DEFAULT_OUTPUT_RULES)


def _normalize_flags(value: Any) -> dict[str, bool]:
    flags = value if isinstance(value, dict) else {}
    return {
        "ignore_case": bool(flags.get("ignore_case", False)),
        "multiline": bool(flags.get("multiline", False)),
        "dotall": bool(flags.get("dotall", False)),
    }


def normalize_output_rules(value: Any) -> list[dict[str, Any]]:
    """Normalize arbitrary rule payloads into a stable serializable shape."""

    if value is None:
        return []
    if not isinstance(value, list):
        return []

    rules: list[dict[str, Any]] = []
    for index, raw_rule in enumerate(value):
        if not isinstance(raw_rule, dict):
            continue

        rule_id = str(raw_rule.get("id") or f"output_rule_{index + 1}").strip()
        rule_name = str(raw_rule.get("name") or rule_id or "未命名规则").strip()
        kind = str(raw_rule.get("kind") or "regex").strip().lower()
        if kind not in {"regex", "literal"}:
            kind = "regex"

        rules.append(
            {
                "id": rule_id or f"output_rule_{index + 1}",
                "name": rule_name or "未命名规则",
                "description": str(raw_rule.get("description") or "").strip(),
                "enabled": bool(raw_rule.get("enabled", True)),
                "kind": kind,
                "pattern": str(raw_rule.get("pattern") or ""),
                "replacement": str(raw_rule.get("replacement") or ""),
                "flags": _normalize_flags(raw_rule.get("flags")),
                "built_in": bool(raw_rule.get("built_in", False)),
            }
        )

    return rules


def _compile_flags(flags: dict[str, bool]) -> int:
    compiled_flags = 0
    if flags.get("ignore_case"):
        compiled_flags |= re.IGNORECASE
    if flags.get("multiline"):
        compiled_flags |= re.MULTILINE
    if flags.get("dotall"):
        compiled_flags |= re.DOTALL
    return compiled_flags


def apply_output_rules(text: Any, rules: Any = None) -> dict[str, Any]:
    """Apply output cleanup rules and return a diagnostic payload.

    Empty or missing rules fall back to ``DEFAULT_OUTPUT_RULES``. Invalid regex
    rules are collected in ``errors`` and skipped.
    """

    original_text = "" if text is None else str(text)
    current_text = original_text
    normalized_rules = normalize_output_rules(rules)
    if not normalized_rules:
        normalized_rules = default_output_rules()

    applied: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for rule in normalized_rules:
        if not rule.get("enabled", True):
            continue
        pattern = str(rule.get("pattern") or "")
        if not pattern:
            continue
        replacement = str(rule.get("replacement") or "")
        regex_pattern = re.escape(pattern) if rule.get("kind") == "literal" else pattern
        try:
            next_text, count = re.subn(
                regex_pattern,
                replacement,
                current_text,
                flags=_compile_flags(rule.get("flags") or {}),
            )
        except re.error as exc:
            errors.append(
                {
                    "id": rule.get("id") or "",
                    "name": rule.get("name") or "",
                    "error": str(exc),
                }
            )
            continue

        if count:
            current_text = next_text
            applied.append(
                {
                    "id": rule.get("id") or "",
                    "name": rule.get("name") or "",
                    "count": count,
                }
            )

    return {
        "original_text": original_text,
        "text": current_text,
        "changed": current_text != original_text,
        "applied": applied,
        "errors": errors,
        "rule_count": len(normalized_rules),
        "enabled_count": len([rule for rule in normalized_rules if rule.get("enabled", True)]),
    }
