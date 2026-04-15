"""
Prompt Builder — build prompts for LLM chat completions.

Features:
- 6-layer prompt structure (inspired by SillyTavern's prompt-converters.js)
- Macro substitution
- WorldInfo injection
- Author's Note
- Jailbreak prompt
- Chat history formatting
- Claude / OpenAI / TextGen output format conversion
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from .world_info_injector import WorldInfoInjector, InjectionContext, MacroSubstitutor
from .char_card_parser import ParsedCharacter

logger = logging.getLogger(__name__)

# ─── Models ──────────────────────────────────────────────────────────────────────


@dataclass
class ChatMessage:
    """Chat message in FableMap's internal format."""
    id: str = ""
    role: str = "user"  # "user" | "assistant" | "system"
    content: str = ""
    name: str = ""  # character name for group chats
    timestamp: str = ""


@dataclass
class PromptBuildConfig:
    """Configuration for prompt building."""
    # Character info
    char_name: str = ""
    char_personality: str = ""
    char_scenario: str = ""
    char_first_mes: str = ""
    char_system_prompt: str = ""
    # Tavern info
    tavern_name: str = ""
    tavern_scene_prompt: str = ""
    # User info
    user_name: str = "旅人"
    user_persona: str = ""
    # WorldInfo
    world_info_entries: list[dict] = field(default_factory=list)
    # Author's note
    author_note: str = ""
    author_note_depth: int = 3
    # Jailbreak
    jailbreak: str = ""
    # Format
    output_format: str = "openai"  # "openai" | "claude" | "textgen"
    # History
    history_max_messages: int = 30
    include_system_in_history: bool = False
    # Extra
    extra_macros: dict = field(default_factory=dict)


# ─── Prompt Builder ──────────────────────────────────────────────────────────────


class PromptBuilder:
    """
    Build prompts from tavern chat context.

    Layer structure (inspired by SillyTavern):
    0. Jailbreak (optional)
    1. Tavern scene prompt (system)
    2. Character system prompt (system)
    3. Character info — name, personality, scenario (system)
    4. WorldInfo injection (system)
    5. Author's Note (system, inserted before last N messages)
    6. Chat history (messages)
    7. Current user message (user)
    """

    def __init__(self, config: PromptBuildConfig):
        self.config = config
        self.injector = WorldInfoInjector(config.world_info_entries)
        self.macro = MacroSubstitutor()

    def build(
        self,
        messages: list[ChatMessage],
        new_message: str,
    ) -> dict[str, Any]:
        """
        Build prompt from messages + new message.

        Returns:
            dict with "messages" (list of role/content dicts),
            "prompt_string" (for text completion),
            "context" (for injection)
        """
        config = self.config
        result_messages: list[dict[str, str]] = []

        # ── Layer 0: Jailbreak ──────────────────────────────────────────────
        if config.jailbreak:
            result_messages.append({
                "role": "system",
                "content": config.jailbreak,
            })

        # ── Layer 1: Tavern scene prompt ────────────────────────────────────
        if config.tavern_scene_prompt:
            scene = self.macro.substitute(
                config.tavern_scene_prompt,
                char_name=config.char_name,
                user_name=config.user_name,
                persona=config.user_persona,
                extra=config.extra_macros,
            )
            result_messages.append({
                "role": "system",
                "content": f"【场景：{config.tavern_name}】\n{scene}",
            })

        # ── Layer 2: Character system prompt ────────────────────────────────
        if config.char_system_prompt:
            sys_prompt = self.macro.substitute(
                config.char_system_prompt,
                char_name=config.char_name,
                user_name=config.user_name,
                persona=config.user_persona,
                extra=config.extra_macros,
            )
            result_messages.append({
                "role": "system",
                "content": sys_prompt,
            })

        # ── Layer 3: Character info ────────────────────────────────────────
        char_info_parts = [f"角色姓名：{config.char_name}"]
        if config.char_personality:
            char_info_parts.append(f"性格设定：{config.char_personality}")
        if config.char_scenario:
            char_info_parts.append(f"场景设定：{config.char_scenario}")
        if config.char_first_mes:
            char_info_parts.append(f"开场白：{config.char_first_mes}")

        char_info = self.macro.substitute(
            "\n".join(char_info_parts),
            char_name=config.char_name,
            user_name=config.user_name,
            persona=config.user_persona,
            extra=config.extra_macros,
        )
        result_messages.append({
            "role": "system",
            "content": f"【角色信息】\n{char_info}",
        })

        # ── Build injection context ─────────────────────────────────────────
        recent_texts = [
            m.content for m in messages[-config.history_max_messages:]
        ]
        ctx = InjectionContext(
            tavern_name=config.tavern_name,
            tavern_description="",
            tavern_scene_prompt=config.tavern_scene_prompt,
            character_name=config.char_name,
            character_personality=config.char_personality,
            character_scenario=config.char_scenario,
            character_system_prompt=config.char_system_prompt,
            current_message=new_message,
            recent_messages=recent_texts,
            jailbreak=config.jailbreak,
            author_note=config.author_note,
            author_note_depth=config.author_note_depth,
        )

        # ── Layer 4: WorldInfo injection ────────────────────────────────────
        wi_injected = self.injector.inject(ctx, [m for m in messages])
        result_messages.extend(wi_injected)

        # ── Layer 5: Chat history ──────────────────────────────────────────
        history_msgs = self._format_history(messages)
        result_messages.extend(history_msgs)

        # ── Layer 6: Author's Note ─────────────────────────────────────────
        if config.author_note:
            auth_note = self.macro.substitute(
                config.author_note,
                char_name=config.char_name,
                user_name=config.user_name,
                persona=config.user_persona,
                extra=config.extra_macros,
            )
            depth = config.author_note_depth
            if depth > 0 and len(result_messages) >= depth:
                insert_pos = len(result_messages) - depth
                result_messages.insert(insert_pos, {
                    "role": "system",
                    "content": f"[Author's Note]\n{auth_note}",
                })
            else:
                result_messages.append({
                    "role": "system",
                    "content": f"[Author's Note]\n{auth_note}",
                })

        # ── Layer 7: New message ────────────────────────────────────────────
        new_msg_content = self.macro.substitute(
            new_message,
            char_name=config.char_name,
            user_name=config.user_name,
            persona=config.user_persona,
            extra=config.extra_macros,
        )
        result_messages.append({
            "role": "user",
            "content": new_msg_content,
        })

        # ── Convert to target format ───────────────────────────────────────
        if config.output_format == "claude":
            result_messages = self._to_claude_format(result_messages)
        elif config.output_format == "textgen":
            prompt_string = self._to_textgen_prompt(result_messages)
            return {
                "messages": result_messages,
                "prompt_string": prompt_string,
                "model": config.char_name,
            }

        return {
            "messages": result_messages,
            "prompt_string": "",
            "model": config.char_name,
        }

    def _format_history(self, messages: list[ChatMessage]) -> list[dict[str, str]]:
        """Format chat history as messages."""
        result = []
        for msg in messages[-self.config.history_max_messages:]:
            if msg.role == "system":
                continue  # skip embedded system messages
            role = "assistant" if msg.role == "assistant" else "user"
            content = msg.content
            # Format as: Character: content
            if msg.name and msg.name != self.config.char_name:
                content = f"{msg.name}: {content}"
            result.append({"role": role, "content": content})
        return result

    def _to_claude_format(self, messages: list[dict[str, str]]) -> list[dict]:
        """Convert to Claude message format."""
        result = []
        system_parts = []
        for msg in messages:
            if msg["role"] == "system":
                system_parts.append(msg["content"])
            elif msg["role"] == "user":
                result.append({"role": "user", "content": [{"type": "text", "text": msg["content"]}]})
            elif msg["role"] == "assistant":
                result.append({"role": "assistant", "content": [{"type": "text", "text": msg["content"]}]})
        # Prepend system as first user message
        if system_parts:
            result.insert(0, {
                "role": "user",
                "content": [{"type": "text", "text": "System context:\n" + "\n".join(system_parts)}],
            })
        return result

    def _to_textgen_prompt(self, messages: list[dict[str, str]]) -> str:
        """Convert to text completion prompt string."""
        parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                parts.append(f"### System:\n{content}\n")
            elif role == "user":
                parts.append(f"### User:\n{content}\n")
            elif role == "assistant":
                parts.append(f"### Assistant:\n{content}\n")
        parts.append("### Assistant:\n")
        return "\n".join(parts)


# ─── Conversions ────────────────────────────────────────────────────────────────


def convert_claude_to_openai(claude_messages: list[dict]) -> list[dict]:
    """Convert Claude message format to OpenAI format."""
    result = []
    for msg in claude_messages:
        role = msg["role"]
        # Extract text content from blocks
        content = ""
        blocks = msg.get("content", [])
        if isinstance(blocks, str):
            content = blocks
        elif isinstance(blocks, list):
            for block in blocks:
                if block.get("type") == "text":
                    content += block.get("text", "")
        if content:
            result.append({"role": role, "content": content})
    return result


def convert_openai_to_textgen(
    messages: list[dict],
    prompt_start: str = "### User:\n",
    prompt_end: str = "### Assistant:\n",
) -> str:
    """Convert OpenAI messages to text completion prompt."""
    parts = []
    for msg in messages:
        role = msg["role"]
        content = msg.get("content", "")
        if role == "system":
            parts.append(f"### System:\n{content}\n")
        elif role == "user":
            parts.append(f"### User:\n{content}\n")
        elif role == "assistant":
            parts.append(f"### Assistant:\n{content}\n")
    parts.append(prompt_end)
    return "\n".join(parts)


# ─── Convenience ────────────────────────────────────────────────────────────────


def build_tavern_prompt(
    tavern_name: str,
    tavern_scene: str,
    character: dict,
    world_info: list[dict],
    messages: list[ChatMessage],
    new_message: str,
    user_name: str = "旅人",
    config: PromptBuildConfig = None,
) -> dict[str, Any]:
    """Convenience function to build a tavern chat prompt."""
    if config is None:
        config = PromptBuildConfig()

    config.tavern_name = tavern_name
    config.tavern_scene_prompt = tavern_scene
    config.char_name = character.get("name", "")
    config.char_personality = character.get("personality", "")
    config.char_scenario = character.get("scenario", "")
    config.char_first_mes = character.get("first_mes", "")
    config.char_system_prompt = character.get("system_prompt", "")
    config.user_name = user_name
    config.world_info_entries = world_info

    builder = PromptBuilder(config)
    return builder.build(messages, new_message)
