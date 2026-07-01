"""
Slash Commands — custom commands in chat.

Inspired by SillyTavern's slash-commands.js.
Commands like /exit, /reset, /history, /retry, /swap, etc.

Each command:
- Has a trigger (e.g., "/reset")
- Has a handler function
- May have arguments
- Can modify chat state or return a response
"""

from __future__ import annotations

import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Command Types ─────────────────────────────────────────────────────────────


@dataclass
class CommandResult:
    """Result of executing a slash command."""
    success: bool = True
    message: str = ""  # Response message to show
    action: str = ""  # "send" | "replace" | "system" | "abort" | "ignore"
    data: Any = None  # Additional data (e.g., new message content)


class Command(ABC):
    """Base slash command."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Command name (without leading /)."""
        ...

    @property
    def aliases(self) -> list[str]:
        """Alternative names."""
        return []

    @property
    def description(self) -> str:
        """Help text."""
        return ""

    @property
    def usage(self) -> str:
        """Usage syntax."""
        return f"/{self.name}"

    @abstractmethod
    def execute(self, args: str, context: dict) -> CommandResult:
        """Execute the command."""
        ...


# ─── Built-in Commands ────────────────────────────────────────────────────────


class ExitCommand(Command):
    """Exit the tavern / end the session."""

    @property
    def name(self) -> str:
        return "exit"

    @property
    def aliases(self) -> list[str]:
        return ["quit", "bye", "离开"]

    @property
    def description(self) -> str:
        return "End the conversation and exit the tavern"

    @property
    def usage(self) -> str:
        return "/exit [optional message]"

    def execute(self, args: str, context: dict) -> CommandResult:
        return CommandResult(
            success=True,
            message=args or "Goodbye!",
            action="abort",
        )


class ResetCommand(Command):
    """Reset the conversation / start over."""

    @property
    def name(self) -> str:
        return "reset"

    @property
    def aliases(self) -> list[str]:
        return ["restart", "刷新"]

    @property
    def description(self) -> str:
        return "Reset the conversation history and start fresh"

    @property
    def usage(self) -> str:
        return "/reset"

    def execute(self, args: str, context: dict) -> CommandResult:
        return CommandResult(
            success=True,
            message="Conversation reset.",
            action="system",
            data={"type": "reset"},
        )


class RetryCommand(Command):
    """Retry the last AI response."""

    @property
    def name(self) -> str:
        return "retry"

    @property
    def aliases(self) -> list[str]:
        return ["regenerate", "重试"]

    @property
    def description(self) -> str:
        return "Regenerate the last AI response"

    @property
    def usage(self) -> str:
        return "/retry [modified prompt]"

    def execute(self, args: str, context: dict) -> CommandResult:
        return CommandResult(
            success=True,
            action="send",
            data={"type": "retry", "args": args},
        )


class SwapCommand(Command):
    """Swap user and character roles."""

    @property
    def name(self) -> str:
        return "swap"

    @property
    def aliases(self) -> list[str]:
        return ["switch", "交换"]

    @property
    def description(self) -> str:
        return "Swap roles — you become the character, character becomes you"

    def execute(self, args: str, context: dict) -> CommandResult:
        return CommandResult(
            success=True,
            message="Roles swapped!",
            action="system",
            data={"type": "swap"},
        )


class RollCommand(Command):
    """Roll dice or random numbers."""

    @property
    def name(self) -> str:
        return "roll"

    @property
    def aliases(self) -> list[str]:
        return ["dice", "掷骰"]

    @property
    def description(self) -> str:
        return "Roll dice or generate random numbers"

    @property
    def usage(self) -> str:
        return "/roll [NdN] — e.g., /roll 2d6, /roll d20, /roll 100"

    def execute(self, args: str, context: dict) -> CommandResult:
        import random

        args = args.strip()
        if not args:
            result = random.randint(1, 20)
            return CommandResult(
                success=True,
                message=f"🎲 Rolled d20: **{result}**",
                action="send",
            )

        # Parse dice notation like "2d6", "d20", "3d8+2"
        match = re.match(r"(\d*)d(\d+)([+-]\d+)?", args, re.IGNORECASE)
        if match:
            num_dice = int(match.group(1) or "1")
            sides = int(match.group(2))
            modifier = int(match.group(3) or "0")

            rolls = [random.randint(1, sides) for _ in range(num_dice)]
            total = sum(rolls) + modifier

            if modifier != 0:
                result_text = f"{' + '.join(map(str, rolls))} {'+' if modifier > 0 else ''}{modifier} = **{total}**"
            else:
                result_text = f"{' + '.join(map(str, rolls))} = **{total}**"

            return CommandResult(
                success=True,
                message=f"🎲 {args}: {result_text}",
                action="send",
            )

        # Plain number
        try:
            max_val = int(args)
            result = random.randint(1, max_val)
            return CommandResult(
                success=True,
                message=f"Random (1-{max_val}): **{result}**",
                action="send",
            )
        except ValueError:
            return CommandResult(
                success=False,
                message=f"Invalid roll format: {args}. Use /roll NdN (e.g., 2d6) or /roll N",
            )


class HistoryCommand(Command):
    """Show conversation history summary."""

    @property
    def name(self) -> str:
        return "history"

    @property
    def aliases(self) -> list[str]:
        return ["hist", "记录"]

    @property
    def description(self) -> str:
        return "Show conversation history summary"

    @property
    def usage(self) -> str:
        return "/history [n] — show last N messages"

    def execute(self, args: str, context: dict) -> CommandResult:
        n = 10
        try:
            n = int(args.strip()) if args.strip() else 10
        except ValueError:
            pass

        messages = context.get("messages", [])
        summary_lines = []
        for i, msg in enumerate(messages[-n:]):
            role = msg.get("role", "?")
            content = msg.get("content", "")[:100]
            summary_lines.append(f"{role}: {content}...")

        return CommandResult(
            success=True,
            message="**Recent Messages:**\n" + "\n".join(summary_lines),
            action="system",
        )


class ConfigCommand(Command):
    """Show or change current configuration."""

    @property
    def name(self) -> str:
        return "config"

    @property
    def aliases(self) -> list[str]:
        return ["cfg", "配置"]

    @property
    def description(self) -> str:
        return "Show or change configuration"

    @property
    def usage(self) -> str:
        return "/config [key=value] — e.g., /config temperature=0.8"

    def execute(self, args: str, context: dict) -> CommandResult:
        if not args.strip():
            # Show current config
            cfg = context.get("config", {})
            lines = [f"**Current Config:**"]
            for k, v in cfg.items():
                lines.append(f"  {k}: {v}")
            return CommandResult(success=True, message="\n".join(lines), action="system")

        # Parse key=value
        match = re.match(r"(\w+)\s*=\s*(.+)", args)
        if match:
            key, value = match.group(1), match.group(2)
            return CommandResult(
                success=True,
                message=f"Config updated: {key} = {value}",
                action="system",
                data={"type": "config_set", "key": key, "value": value},
            )

        return CommandResult(success=False, message="Invalid config format. Use /config key=value")


class HelpCommand(Command):
    """Show help for all commands."""

    @property
    def name(self) -> str:
        return "help"

    @property
    def aliases(self) -> list[str]:
        return ["h", "?"]

    @property
    def description(self) -> str:
        return "Show this help message"

    def execute(self, args: str, context: dict) -> CommandResult:
        commands = context.get("available_commands", [])
        lines = ["**Available Commands:**"]
        for cmd in commands:
            usage = cmd.get("usage") or f"/{cmd.get('name', '?')}"
            lines.append(f"  `{usage}` — {cmd.get('description', '')}")
        return CommandResult(success=True, message="\n".join(lines), action="system")


class PromptCommand(Command):
    """Inject a custom prompt or instruction."""

    @property
    def name(self) -> str:
        return "prompt"

    @property
    def aliases(self) -> list[str]:
        return ["instruct", "指令"]

    @property
    def description(self) -> str:
        return "Add a custom instruction to the next response"

    @property
    def usage(self) -> str:
        return "/prompt [instruction]"

    def execute(self, args: str, context: dict) -> CommandResult:
        if not args.strip():
            return CommandResult(success=False, message="Usage: /prompt [instruction]")

        return CommandResult(
            success=True,
            message=f"Prompt injected: {args[:100]}",
            action="system",
            data={"type": "injected_prompt", "content": args},
        )


# ─── Command Manager ──────────────────────────────────────────────────────────


class CommandManager:
    """Manage and execute slash commands."""

    def __init__(self):
        self._commands: dict[str, Command] = {}
        self._register_builtins()

    def _register_builtins(self) -> None:
        """Register built-in commands."""
        builtins = [
            ExitCommand(),
            ResetCommand(),
            RetryCommand(),
            SwapCommand(),
            RollCommand(),
            HistoryCommand(),
            ConfigCommand(),
            HelpCommand(),
            PromptCommand(),
        ]
        for cmd in builtins:
            self.register(cmd)

    def register(self, command: Command) -> None:
        """Register a command."""
        self._commands[command.name] = command
        for alias in command.aliases:
            self._commands[alias] = command

    def unregister(self, name: str) -> bool:
        """Unregister a command by name or alias."""
        if name in self._commands:
            cmd = self._commands[name]
            # Remove all aliases
            to_remove = [k for k, v in self._commands.items() if v is cmd]
            for k in to_remove:
                del self._commands[k]
            return True
        return False

    def get(self, name: str) -> Optional[Command]:
        """Get a command by name or alias."""
        return self._commands.get(name)

    def execute(self, text: str, context: dict = None) -> CommandResult:
        """
        Execute a slash command from text.

        If text does not start with /, returns None (not a command).
        """
        if context is None:
            context = {}

        if not text.startswith("/"):
            return CommandResult(success=False, action="ignore")

        # Parse: /command arg1 arg2
        parts = text[1:].split(None, 1)
        cmd_name = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""

        cmd = self.get(cmd_name)
        if not cmd:
            return CommandResult(
                success=False,
                message=f"Unknown command: /{cmd_name}. Use /help for available commands.",
            )

        try:
            result = cmd.execute(args, context)
            return result
        except Exception as e:
            logger.error(f"Command /{cmd_name} failed: {e}")
            return CommandResult(
                success=False,
                message=f"Command /{cmd_name} failed: {e}",
            )

    def list_all(self) -> list[dict]:
        """List all registered commands."""
        seen = set()
        commands = []
        for cmd in self._commands.values():
            if id(cmd) in seen:
                continue
            seen.add(id(cmd))
            commands.append({
                "name": cmd.name,
                "aliases": cmd.aliases,
                "description": cmd.description,
                "usage": cmd.usage,
            })
        return commands

    def is_command(self, text: str) -> bool:
        """Check if text is a slash command."""
        return text.startswith("/")


# ─── Global instance ──────────────────────────────────────────────────────────


_command_manager: Optional[CommandManager] = None


def get_command_manager() -> CommandManager:
    """Get the global command manager."""
    global _command_manager
    if _command_manager is None:
        _command_manager = CommandManager()
    return _command_manager
