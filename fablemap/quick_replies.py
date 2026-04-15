"""
Quick Replies — saved response templates with variable substitution.

Features:
- Variable substitution (character name, user name, etc.)
- Categories / folders
- Keyboard shortcuts
- One-click send
- Random selection
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ─── Data Models ───────────────────────────────────────────────────────────────


@dataclass
class QuickReply:
    """A quick reply template."""
    id: str = ""
    title: str = ""  # Display title
    content: str = ""  # Template content with variables
    category: str = "General"
    shortcut: str = ""  # e.g., "/greet"
    position: int = 0  # Sort order
    variable_fields: list[str] = field(default_factory=list)  # Names of variables
    metadata: dict = field(default_factory=dict)

    def render(self, **kwargs) -> str:
        """Render the quick reply with variable substitution."""
        result = self.content

        # Standard variables
        result = result.replace("{{char}}", kwargs.get("char_name", ""))
        result = result.replace("{{user}}", kwargs.get("user_name", "旅人"))
        result = result.replace("{{input}}", kwargs.get("input_text", ""))

        # Custom variables from variable_fields
        for field_name in self.variable_fields:
            result = result.replace(f"{{{{{field_name}}}}}", kwargs.get(field_name, ""))

        # Random macro: {{random:opt1|opt2|opt3}}
        result = self._sub_random(result)

        return result

    def _sub_random(self, text: str) -> str:
        """Handle {{random:...}} macro."""
        pattern = re.compile(r"\{\{random:([^*]+)\|([^}]+)\}\}")
        import random
        for match in pattern.finditer(text):
            options = [o.strip() for o in match.group(2).split("|")]
            chosen = random.choice(options)
            text = text.replace(match.group(0), chosen)
        return text


@dataclass
class QuickReplyCategory:
    """Category of quick replies."""
    name: str = "General"
    position: int = 0
    replies: list[QuickReply] = field(default_factory=list)


# ─── Quick Reply Manager ───────────────────────────────────────────────────────


class QuickReplyManager:
    """Manage quick replies with categories and shortcuts."""

    def __init__(self):
        self.categories: list[QuickReplyCategory] = [
            QuickReplyCategory(name="General", position=0),
        ]

    def add_reply(self, reply: QuickReply, category: str = "General") -> None:
        """Add a quick reply to a category."""
        cat = self.get_or_create_category(category)
        if not reply.id:
            import uuid
            reply.id = str(uuid.uuid4())
        cat.replies.append(reply)

    def get_by_shortcut(self, shortcut: str) -> Optional[QuickReply]:
        """Get a quick reply by its shortcut."""
        for cat in self.categories:
            for reply in cat.replies:
                if reply.shortcut == shortcut or reply.shortcut == f"/{shortcut}":
                    return reply
        return None

    def get_by_id(self, reply_id: str) -> Optional[QuickReply]:
        """Get a quick reply by ID."""
        for cat in self.categories:
            for reply in cat.replies:
                if reply.id == reply_id:
                    return reply
        return None

    def get_all(self) -> list[QuickReplyCategory]:
        """Get all categories with their replies."""
        return sorted(self.categories, key=lambda c: c.position)

    def delete(self, reply_id: str) -> bool:
        """Delete a quick reply by ID."""
        for cat in self.categories:
            for i, reply in enumerate(cat.replies):
                if reply.id == reply_id:
                    del cat.replies[i]
                    return True
        return False

    def get_or_create_category(self, name: str) -> QuickReplyCategory:
        """Get or create a category."""
        for cat in self.categories:
            if cat.name == name:
                return cat
        cat = QuickReplyCategory(name=name, position=len(self.categories))
        self.categories.append(cat)
        return cat

    def render_by_shortcut(
        self, shortcut: str, char_name: str = "", user_name: str = "旅人", **kwargs
    ) -> Optional[str]:
        """Render a quick reply by shortcut."""
        reply = self.get_by_shortcut(shortcut)
        if reply:
            return reply.render(char_name=char_name, user_name=user_name, **kwargs)
        return None

    def render_by_id(
        self, reply_id: str, char_name: str = "", user_name: str = "旅人", **kwargs
    ) -> Optional[str]:
        """Render a quick reply by ID."""
        reply = self.get_by_id(reply_id)
        if reply:
            return reply.render(char_name=char_name, user_name=user_name, **kwargs)
        return None

    def save_to_file(self, path: Path | str) -> None:
        """Save quick replies to JSON file."""
        import json
        path = Path(path)
        data = {
            "categories": [
                {
                    "name": cat.name,
                    "position": cat.position,
                    "replies": [
                        {
                            "id": r.id,
                            "title": r.title,
                            "content": r.content,
                            "category": r.category,
                            "shortcut": r.shortcut,
                            "position": r.position,
                            "variable_fields": r.variable_fields,
                        }
                        for r in cat.replies
                    ],
                }
                for cat in self.categories
            ]
        }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def load_from_file(self, path: Path | str) -> None:
        """Load quick replies from JSON file."""
        import json
        path = Path(path)
        if not path.exists():
            return

        data = json.loads(path.read_text("utf-8"))
        self.categories = []
        for cat_data in data.get("categories", []):
            cat = QuickReplyCategory(
                name=cat_data.get("name", "General"),
                position=cat_data.get("position", 0),
            )
            for r_data in cat_data.get("replies", []):
                cat.replies.append(QuickReply(
                    id=r_data.get("id", ""),
                    title=r_data.get("title", ""),
                    content=r_data.get("content", ""),
                    category=r_data.get("category", cat.name),
                    shortcut=r_data.get("shortcut", ""),
                    position=r_data.get("position", 0),
                    variable_fields=r_data.get("variable_fields", []),
                ))
            self.categories.append(cat)


# ─── Built-in quick replies ─────────────────────────────────────────────────────


def get_default_quick_replies() -> list[QuickReply]:
    """Get default quick reply templates."""
    return [
        QuickReply(
            title="Greeting",
            content="Hello, {{char}}!",
            category="Greetings",
            shortcut="/hello",
        ),
        QuickReply(
            title="Farewell",
            content="Goodbye, {{char}}! It was nice talking to you.",
            category="Greetings",
            shortcut="/bye",
        ),
        QuickReply(
            title="Affection",
            content="{{random:I love you|I really appreciate you|You mean a lot to me}}!",
            category="Emotions",
            shortcut="/love",
        ),
        QuickReply(
            title="Curious",
            content="Tell me more about {{input:topic}}?",
            category="Conversation",
            shortcut="/more",
            variable_fields=["topic"],
        ),
    ]
