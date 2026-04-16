"""
Extension Framework — SillyTavern-style extension system.

SillyTavern extensions add capabilities via:
- Custom API endpoints
- UI modifications (injected HTML/CSS)
- Pre/post processing hooks
- Custom slash commands
- Custom TTS providers

This module provides the extension registry and hook system.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

# ─── Extension Types ────────────────────────────────────────────────────────────


@dataclass
class ExtensionManifest:
    """Extension manifest (mirrors SillyTavern's manifest.json)."""
    id: str = ""
    name: str = ""
    description: str = ""
    version: str = "1.0.0"
    author: str = ""
    homepage: str = ""
    # Lifecycle
    on_app_start: bool = False
    on_app_stop: bool = False
    on_chat_start: bool = False
    on_chat_end: bool = False
    on_message_send: bool = False
    on_message_receive: bool = False
    on_extension_settings: bool = False
    # UI
    js: str = ""  # JavaScript file
    css: str = ""  # CSS file
    settings_html: str = ""  # Settings panel HTML
    # Permissions
    permissions: list[str] = field(default_factory=list)  # "tts", "sd", "api", etc.


@dataclass
class Extension:
    """A loaded extension instance."""
    manifest: ExtensionManifest
    module: Any = None  # The extension module/object
    enabled: bool = False
    settings: dict = field(default_factory=dict)


# ─── Hook Types ─────────────────────────────────────────────────────────────────


@dataclass
class HookContext:
    """Context passed to extension hooks."""
    # Chat context
    tavern_id: str = ""
    character_id: str = ""
    user_id: str = ""
    messages: list = field(default_factory=list)
    # Current message
    message: str = ""
    role: str = "user"
    # Extra
    extra: dict = field(default_factory=dict)


# ─── Hook Handlers ─────────────────────────────────────────────────────────────


class ExtensionHook:
    """Base class for extension hooks."""

    def __init__(self, name: str):
        self.name = name
        self._handlers: list[Callable] = []

    def register(self, handler: Callable) -> None:
        """Register a hook handler."""
        self._handlers.append(handler)

    def unregister(self, handler: Callable) -> None:
        """Unregister a hook handler."""
        if handler in self._handlers:
            self._handlers.remove(handler)

    def emit(self, ctx: HookContext, *args, **kwargs) -> Any:
        """Emit the hook, calling all handlers in order."""
        result = None
        for handler in self._handlers:
            try:
                result = handler(ctx, *args, **kwargs)
            except Exception as e:
                logger.error(f"Hook {self.name} handler failed: {e}")
        return result


# ─── Extension Manager ─────────────────────────────────────────────────────────


class ExtensionManager:
    """
    Extension registry and lifecycle manager.

    Inspired by SillyTavern's extensions.js.
    """

    def __init__(self):
        self.extensions: dict[str, Extension] = {}
        # Hooks
        self.hooks: dict[str, ExtensionHook] = {
            "app_start": ExtensionHook("app_start"),
            "app_stop": ExtensionHook("app_stop"),
            "chat_start": ExtensionHook("chat_start"),
            "chat_end": ExtensionHook("chat_end"),
            "message_send": ExtensionHook("message_send"),
            "message_receive": ExtensionHook("message_receive"),
            "message_edit": ExtensionHook("message_edit"),
            "character_load": ExtensionHook("character_load"),
            "tavern_enter": ExtensionHook("tavern_enter"),
            "tavern_leave": ExtensionHook("tavern_leave"),
            "prompt_build": ExtensionHook("prompt_build"),
            "api_request": ExtensionHook("api_request"),
            "api_response": ExtensionHook("api_response"),
        }
        self._enabled_by_default: set[str] = set()

    def register(self, manifest: ExtensionManifest | dict, module: Any = None) -> str:
        """Register an extension from a manifest."""
        if isinstance(manifest, dict):
            manifest = ExtensionManifest(**manifest)

        ext = Extension(manifest=manifest, module=module)
        self.extensions[manifest.id] = ext

        # Register hooks
        if manifest.on_app_start:
            self.hooks["app_start"].register(self._make_hook(manifest.id, "onAppStart"))
        if manifest.on_app_stop:
            self.hooks["app_stop"].register(self._make_hook(manifest.id, "onAppStop"))
        if manifest.on_chat_start:
            self.hooks["chat_start"].register(self._make_hook(manifest.id, "onChatStart"))
        if manifest.on_chat_end:
            self.hooks["chat_end"].register(self._make_hook(manifest.id, "onChatEnd"))
        if manifest.on_message_send:
            self.hooks["message_send"].register(self._make_hook(manifest.id, "onMessageSend"))
        if manifest.on_message_receive:
            self.hooks["message_receive"].register(self._make_hook(manifest.id, "onMessageReceive"))

        return manifest.id

    def _make_hook(self, ext_id: str, method_name: str) -> Callable:
        """Create a hook handler from an extension method."""
        def handler(ctx: HookContext, *args, **kwargs):
            ext = self.extensions.get(ext_id)
            if not ext or not ext.enabled:
                return
            module = ext.module
            if module and hasattr(module, method_name):
                try:
                    return getattr(module, method_name)(ctx, *args, **kwargs)
                except Exception as e:
                    logger.error(f"Extension {ext_id}.{method_name} failed: {e}")
        return handler

    def enable(self, ext_id: str) -> None:
        """Enable an extension."""
        if ext_id in self.extensions:
            self.extensions[ext_id].enabled = True
            logger.info(f"Extension enabled: {ext_id}")

    def disable(self, ext_id: str) -> None:
        """Disable an extension."""
        if ext_id in self.extensions:
            self.extensions[ext_id].enabled = False
            logger.info(f"Extension disabled: {ext_id}")

    def get(self, ext_id: str) -> Optional[Extension]:
        """Get an extension by ID."""
        return self.extensions.get(ext_id)

    def list_all(self) -> list[Extension]:
        """List all registered extensions."""
        return list(self.extensions.values())

    def list_enabled(self) -> list[Extension]:
        """List enabled extensions."""
        return [e for e in self.extensions.values() if e.enabled]

    def emit(self, hook_name: str, ctx: HookContext, *args, **kwargs) -> Any:
        """Emit a hook."""
        hook = self.hooks.get(hook_name)
        if hook:
            return hook.emit(ctx, *args, **kwargs)
        return None

    def load_from_directory(self, ext_dir: Path | str) -> int:
        """
        Load extensions from a directory.

        Expected structure per extension:
        ext_dir/
          extension_id/
            manifest.json
            index.js (or index.py)
            settings.html
            style.css
        """
        ext_dir = Path(ext_dir)
        if not ext_dir.exists():
            return 0

        loaded = 0
        for subdir in ext_dir.iterdir():
            if not subdir.is_dir():
                continue

            manifest_file = subdir / "manifest.json"
            if not manifest_file.exists():
                continue

            import json
            try:
                manifest_data = json.loads(manifest_file.read_text("utf-8"))
                self.register(manifest_data)
                loaded += 1
                logger.info(f"Loaded extension: {manifest_data.get('name', subdir.name)}")
            except Exception as e:
                logger.error(f"Failed to load extension from {subdir}: {e}")

        return loaded

    def get_settings_html(self, ext_id: str) -> str:
        """Get the settings HTML for an extension."""
        ext = self.extensions.get(ext_id)
        if ext:
            return ext.manifest.settings_html
        return ""

    def save_settings(self, ext_id: str, settings: dict) -> None:
        """Save extension settings."""
        if ext_id in self.extensions:
            self.extensions[ext_id].settings = settings

    def get_settings(self, ext_id: str) -> dict:
        """Get extension settings."""
        ext = self.extensions.get(ext_id)
        if ext:
            return ext.settings
        return {}


# ─── Built-in Extensions ───────────────────────────────────────────────────────


def register_builtin_extensions(manager: ExtensionManager) -> None:
    """Register FableMap's built-in extensions."""

    # TTS extension
    manager.register({
        "id": "tts",
        "name": "Text-to-Speech",
        "description": "Read messages aloud using TTS providers",
        "version": "1.0.0",
        "author": "FableMap",
        "on_message_receive": True,
        "permissions": ["tts"],
    })

    # Image generation extension
    manager.register({
        "id": "image_gen",
        "name": "Image Generation",
        "description": "Generate images using Stable Diffusion",
        "version": "1.0.0",
        "author": "FableMap",
        "permissions": ["sd"],
    })

    # Translation extension
    manager.register({
        "id": "translate",
        "name": "Translation",
        "description": "Translate messages between languages",
        "version": "1.0.0",
        "author": "FableMap",
        "permissions": ["api"],
    })


# ─── Global instance ──────────────────────────────────────────────────────────


_extension_manager: Optional[ExtensionManager] = None


def get_extension_manager() -> ExtensionManager:
    """Get the global extension manager."""
    global _extension_manager
    if _extension_manager is None:
        _extension_manager = ExtensionManager()
        register_builtin_extensions(_extension_manager)
    return _extension_manager
