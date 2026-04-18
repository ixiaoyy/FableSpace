"""
WorldInfo Injector — inject lorebook/WorldInfo entries into prompts.

Supports SillyTavern WorldInfo features:
- Keyword matching (primary + secondary)
- Regex patterns
- Selective mode (keyword must match)
- Constant entries (always injected)
- Depth (how far back in history to check)
- Probability (chance of injection)
- Insertion order
- Disable flag
- FIM (fill-in-the-middle) insertion
"""

from __future__ import annotations

import logging
import random
import re
from dataclasses import dataclass, field, fields
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Models ──────────────────────────────────────────────────────────────────────


@dataclass
class WorldInfoEntry:
    """WorldInfo entry — mirrors tavern.py WorldInfoEntry."""
    id: str = ""
    keys: list[str] = field(default_factory=list)
    keys_secondary: list[str] = field(default_factory=list)
    content: str = ""
    constant: bool = False
    selective: bool = True
    insertion_order: int = 50
    depth: int = 4
    probability: int = 100
    disable: bool = False
    # Regex support
    regex_scan: bool = False
    regex_pattern: str = ""

    def matches(self, text: str) -> bool:
        """Check if text matches this entry's keywords or regex."""
        if self.disable:
            return False

        # Constant entries always match
        if self.constant:
            return True

        # Check probability
        if self.probability < 100 and random.random() * 100 > self.probability:
            return False

        # Regex mode
        if self.regex_scan and self.regex_pattern:
            try:
                pattern = re.compile(self.regex_pattern, re.IGNORECASE)
                if pattern.search(text):
                    return True
            except re.error:
                pass

        # Keyword mode
        if self.selective:
            text_lower = text.lower()
            # Both primary and secondary keys must match
            all_keys = self.keys + self.keys_secondary
            if not all_keys:
                return False
            return any(k.lower() in text_lower for k in all_keys)
        else:
            # Non-selective: any primary key
            text_lower = text.lower()
            return any(k.lower() in text_lower for k in self.keys)


@dataclass
class InjectionContext:
    """Context for WorldInfo injection."""
    tavern_name: str = ""
    tavern_description: str = ""
    tavern_scene_prompt: str = ""
    character_name: str = ""
    character_personality: str = ""
    character_scenario: str = ""
    character_system_prompt: str = ""
    current_message: str = ""
    recent_messages: list[str] = field(default_factory=list)
    # SillyTavern-compatible fields
    jailbreak: str = ""
    author_note: str = ""
    author_note_depth: int = 3


# ─── Injector ───────────────────────────────────────────────────────────────────


class WorldInfoInjector:
    """
    Inject WorldInfo entries into prompts.

    Inspired by SillyTavern's world-info.js.
    """

    def __init__(self, entries: list[dict | WorldInfoEntry] = None):
        self.entries: list[WorldInfoEntry] = []
        if entries:
            for e in entries:
                if isinstance(e, dict):
                    entry_data = dict(e)
                    if "insertion_order" not in entry_data and "order" in entry_data:
                        entry_data["insertion_order"] = entry_data.get("order")
                    allowed_fields = {item.name for item in fields(WorldInfoEntry)}
                    self.entries.append(
                        WorldInfoEntry(**{key: value for key, value in entry_data.items() if key in allowed_fields})
                    )
                else:
                    self.entries.append(e)

    def add_entry(self, entry: dict | WorldInfoEntry) -> None:
        """Add a WorldInfo entry."""
        if isinstance(entry, dict):
            self.entries.append(WorldInfoEntry(**entry))
        else:
            self.entries.append(entry)

    def inject(
        self,
        context: InjectionContext,
        messages: list[dict[str, str]] = None,
    ) -> list[dict[str, str]]:
        """
        Inject WorldInfo into a messages array.

        Returns a new list of system messages with injected WorldInfo content.
        """
        injected: list[dict[str, str]] = []
        order_map: dict[int, list[dict]] = {}

        # Check each entry
        for entry in self.entries:
            if entry.disable:
                continue

            # Try to match against search text
            search_text = self._build_search_text(context, entry.depth)
            if entry.matches(search_text):
                # Group by insertion order
                if entry.insertion_order not in order_map:
                    order_map[entry.insertion_order] = []
                order_map[entry.insertion_order].append({
                    "role": "system",
                    "content": f"[WorldInfo: {', '.join(entry.keys)}]\n{entry.content}",
                    "_wi_entry_id": entry.id,
                    "_wi_keys": entry.keys,
                })

        # Sort by insertion order
        for order in sorted(order_map.keys()):
            injected.extend(order_map[order])

        return injected

    def inject_with_author_note(
        self,
        context: InjectionContext,
        messages: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        """
        Inject WorldInfo + Author's Note (inspired by SillyTavern's authors-note.js).
        Author's note is inserted before the last N messages.
        """
        result = list(messages)
        injected_wi = self.inject(context, result)
        result.extend(injected_wi)

        # Author's note injection
        if context.author_note:
            depth = context.author_note_depth
            if depth > 0 and len(result) >= depth:
                insert_pos = len(result) - depth
                result.insert(insert_pos, {
                    "role": "system",
                    "content": f"[Author's Note]\n{context.author_note}",
                    "_is_authors_note": True,
                })
            else:
                result.append({
                    "role": "system",
                    "content": f"[Author's Note]\n{context.author_note}",
                    "_is_authors_note": True,
                })

        return result

    def inject_prompt_string(
        self,
        context: InjectionContext,
        system_prompt: str,
    ) -> str:
        """
        Inject WorldInfo into a single system prompt string.
        Used for text completion backends.
        """
        injected = self.inject(context)
        if not injected:
            return system_prompt

        parts = [system_prompt]
        for msg in injected:
            parts.append(f"\n{msg['content']}")

        return "\n".join(parts)

    def _build_search_text(self, context: InjectionContext, depth: int | None = None) -> str:
        """Build text to search against from context."""
        if depth is None:
            recent_messages = context.recent_messages
        else:
            try:
                max_recent = max(0, int(depth))
            except (TypeError, ValueError):
                max_recent = 4
            recent_messages = context.recent_messages[-max_recent:] if max_recent else []

        parts = [
            context.current_message,
            context.character_name,
            context.character_personality,
            context.character_scenario,
            context.tavern_name,
            context.tavern_description,
            context.tavern_scene_prompt,
        ]
        parts.extend(recent_messages)
        return "\n".join(p for p in parts if p)

    def get_matching_entries(self, context: InjectionContext) -> list[WorldInfoEntry]:
        """Get list of entries that would match the current context."""
        return [e for e in self.entries if e.matches(self._build_search_text(context, e.depth))]


# ─── Macro system (inspired by SillyTavern's macro system) ────────────────────


class MacroSubstitutor:
    """
    Substitute macros in prompts — inspired by SillyTavern's macro.js.

    Supported macros:
    {{char}}         — character name
    {{user}}         — user name
    {{input}}        — current message
    {{random}}       — random line from a list
    {{select:*|...}} — select one of options
    {{date}}         — current date
    {{time}}         — current time
    {{datetime}}     — full datetime
    {{persona}}      — user's current persona
    {{agent}}        — AI agent name
    {{jailbreak}}    — jailbreak prompt
    {{history}}     — last N messages summary
    """

    def __init__(self):
        self._rng = random.Random()

    def substitute(
        self,
        template: str,
        *,
        char_name: str = "",
        user_name: str = "旅人",
        input_text: str = "",
        persona: str = "",
        agent: str = "FableMap",
        jailbreak: str = "",
        extra: dict = None,
    ) -> str:
        """Substitute all macros in a template string."""
        if not template:
            return template

        result = template

        # Basic macros
        result = result.replace("{{char}}", char_name or "Unknown")
        result = result.replace("{{user}}", user_name)
        result = result.replace("{{input}}", input_text)
        result = result.replace("{{agent}}", agent)
        result = result.replace("{{persona}}", persona or user_name)
        result = result.replace("{{jailbreak}}", jailbreak)

        # Date/time macros
        from datetime import datetime
        now = datetime.now()
        result = result.replace("{{date}}", now.strftime("%Y-%m-%d"))
        result = result.replace("{{time}}", now.strftime("%H:%M"))
        result = result.replace("{{datetime}}", now.strftime("%Y-%m-%d %H:%M:%S"))

        # Random macro: {{random:*|option1|option2|option3}}
        result = self._sub_random(result)

        # Select macro: {{select:*|a|b|c}}
        result = self._sub_select(result)

        # Extra macros from dict
        if extra:
            for key, value in extra.items():
                result = result.replace(f"{{{{{key}}}}}", str(value))

        return result

    def _sub_random(self, text: str) -> str:
        """Handle {{random:*|...}} macro."""
        pattern = re.compile(r"\{\{random:([^*]+)\|([^}]+)\}\}")
        for match in pattern.finditer(text):
            options_str = match.group(2)
            options = [o.strip() for o in options_str.split("|")]
            if options:
                chosen = self._rng.choice(options)
                text = text.replace(match.group(0), chosen)
        return text

    def _sub_select(self, text: str) -> str:
        """Handle {{select:*|...}} macro (alias for random)."""
        pattern = re.compile(r"\{\{select:([^*]+)\|([^}]+)\}\}")
        for match in pattern.finditer(text):
            options_str = match.group(2)
            options = [o.strip() for o in options_str.split("|")]
            if options:
                chosen = self._rng.choice(options)
                text = text.replace(match.group(0), chosen)
        return text


# ─── Convenience ────────────────────────────────────────────────────────────────


def create_injector(entries: list[dict]) -> WorldInfoInjector:
    """Create a WorldInfoInjector from a list of dict entries."""
    return WorldInfoInjector(entries)
