"""
Group Chat — multi-character chat with talkativeness control.

Inspired by SillyTavern's group-chats.js.

Features:
- Multiple characters in one chat
- Talkativeness per character (0.0-1.0)
- Round-robin speaking order
- Auto-selection based on relevance
- Name prefix in messages
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

GROUP_STRATEGIES = {"balanced", "weighted_random", "round_robin", "relevance"}


def _clamp_float(value, default: float = 0.5, minimum: float = 0.0, maximum: float = 1.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    if parsed != parsed:
        parsed = default
    return max(minimum, min(maximum, parsed))


def _clamp_int(value, default: int = 2, minimum: int = 1, maximum: int = 3) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _normalize_strategy(value) -> str:
    strategy = str(value or "").strip()
    return strategy if strategy in GROUP_STRATEGIES else "balanced"

# ─── Models ─────────────────────────────────────────────────────────────────────


@dataclass
class GroupMember:
    """A character in a group chat."""
    character_id: str
    name: str
    talkativeness: float = 0.5  # 0.0 (silent) to 1.0 (always speaks)
    avatar_url: str = ""
    is_narrator: bool = False  # Can narrate events
    is_user: bool = False  # Is the human user

    def __post_init__(self) -> None:
        self.character_id = str(self.character_id or "").strip()
        self.name = str(self.name or "").strip()
        self.talkativeness = _clamp_float(self.talkativeness)
        self.avatar_url = str(self.avatar_url or "").strip()
        self.is_narrator = bool(self.is_narrator)
        self.is_user = bool(self.is_user)


@dataclass
class GroupMessage:
    """A message in group chat."""
    id: str = ""
    role: str = "assistant"
    content: str = ""
    character_id: str = ""  # Which character sent this
    character_name: str = ""
    timestamp: str = ""


# ─── Talkativeness Selector ────────────────────────────────────────────────────


class TalkativenessSelector:
    """
    Select which character should speak next based on talkativeness.

    Strategies:
    - weighted_random: Random selection weighted by talkativeness
    - round_robin: Each character speaks in turn
    - relevance: Character most relevant to current topic speaks
    - balanced: Mix of talkativeness and rotation
    """

    def __init__(self):
        self._last_speaker: Optional[str] = None
        self._round_robin_index: int = 0

    def select(
        self,
        members: list[GroupMember],
        messages: list[GroupMessage],
        strategy: str = "balanced",
    ) -> Optional[GroupMember]:
        """Select the next character to speak."""
        active_members = [m for m in members if not m.is_user and m.talkativeness > 0]

        if not active_members:
            return None

        if strategy == "round_robin":
            return self._round_robin(active_members)
        elif strategy == "weighted_random":
            return self._weighted_random(active_members)
        elif strategy == "relevance":
            return self._relevance_based(active_members, messages)
        elif strategy == "balanced":
            return self._balanced(active_members, messages)
        else:
            return random.choice(active_members)

    def _round_robin(self, members: list[GroupMember]) -> GroupMember:
        """Round-robin selection."""
        member = members[self._round_robin_index % len(members)]
        self._round_robin_index += 1
        return member

    def _weighted_random(self, members: list[GroupMember]) -> GroupMember:
        """Weighted random based on talkativeness."""
        weights = [m.talkativeness for m in members]
        total = sum(weights)
        if total == 0:
            return random.choice(members)
        r = random.random() * total
        cumulative = 0
        for member, w in zip(members, weights):
            cumulative += w
            if cumulative >= r:
                return member
        return members[-1]

    def _relevance_based(
        self, members: list[GroupMember], messages: list[GroupMessage]
    ) -> GroupMember:
        """
        Select based on relevance to current conversation.
        Characters with lower recent message count are more likely to speak.
        """
        # Count recent messages per character
        counts: dict[str, int] = {m.character_id: 0 for m in members}
        for msg in messages[-20:]:
            if msg.character_id in counts:
                counts[msg.character_id] += 1

        # Inverse count + talkativeness
        scores = []
        for member in members:
            recency_score = 1.0 / (1 + counts[member.character_id])
            score = recency_score * member.talkativeness
            scores.append(score)

        total = sum(scores)
        if total == 0:
            return random.choice(members)
        r = random.random() * total
        cumulative = 0
        for member, s in zip(members, scores):
            cumulative += s
            if cumulative >= r:
                return member
        return members[-1]

    def _balanced(
        self, members: list[GroupMember], messages: list[GroupMessage]
    ) -> GroupMember:
        """
        Balanced approach: 50% round-robin, 50% weighted random,
        avoiding the same speaker twice in a row.
        """
        if self._last_speaker and len(members) > 1:
            # Don't repeat the same speaker
            non_last = [m for m in members if m.character_id != self._last_speaker]
            if non_last:
                members = non_last

        if random.random() < 0.5:
            result = self._round_robin(members)
        else:
            result = self._weighted_random(members)

        self._last_speaker = result.character_id
        return result


# ─── Group Chat Manager ───────────────────────────────────────────────────────


class GroupChatManager:
    """
    Manage a multi-character group chat.

    Flow:
    1. User sends a message
    2. Manager selects which character(s) should respond
    3. For each selected character, generate a response
    4. Return ordered group message(s)
    """

    def __init__(self):
        self.members: list[GroupMember] = []
        self.messages: list[GroupMessage] = []
        self.selector = TalkativenessSelector()
        self._strategy: str = "balanced"
        self.max_responses_per_turn: int = 2  # Max characters who respond per user message

    @property
    def strategy(self) -> str:
        return self._strategy

    @strategy.setter
    def strategy(self, value: str) -> None:
        self._strategy = _normalize_strategy(value)

    def set_max_responses_per_turn(self, value: int) -> None:
        """Set the per-turn response cap."""
        self.max_responses_per_turn = _clamp_int(value)

    def add_member(self, member: GroupMember) -> None:
        """Add a character to the group chat."""
        if member.character_id and member.character_id not in [m.character_id for m in self.members]:
            self.members.append(member)

    def remove_member(self, character_id: str) -> bool:
        """Remove a character from the group chat."""
        for i, m in enumerate(self.members):
            if m.character_id == character_id:
                self.members.pop(i)
                return True
        return False

    def get_member(self, character_id: str) -> Optional[GroupMember]:
        """Get a member by ID."""
        for m in self.members:
            if m.character_id == character_id:
                return m
        return None

    def set_talkativeness(self, character_id: str, value: float) -> bool:
        """Set talkativeness for a character (0.0-1.0)."""
        member = self.get_member(character_id)
        if member:
            member.talkativeness = _clamp_float(value)
            return True
        return False

    def select_next_speakers(self) -> list[GroupMember]:
        """Select which characters should respond next."""
        num_responses = self._calculate_response_count()
        speakers = []
        available = list(self.members)

        for _ in range(num_responses):
            if not available:
                break
            speaker = self.selector.select(
                available,
                self.messages,
                self.strategy,
            )
            if speaker:
                speakers.append(speaker)
                available = [m for m in available if m.character_id != speaker.character_id]

        return speakers

    def _calculate_response_count(self) -> int:
        """Calculate how many characters should respond."""
        # Average talkativeness of active members
        active = [m for m in self.members if not m.is_user and not m.is_narrator and m.talkativeness > 0]
        if not active:
            return 0

        avg_talk = sum(m.talkativeness for m in active) / len(active)

        # Higher average talkativeness = more responses, capped by tavern config.
        if avg_talk > 0.7:
            desired = 3
        elif avg_talk > 0.4:
            desired = 2
        elif avg_talk > 0.2:
            desired = 1
        else:
            return 0
        return min(desired, len(active), self.max_responses_per_turn)

    def add_message(self, message: GroupMessage) -> None:
        """Add a message to the chat history."""
        self.messages.append(message)

    def add_user_message(self, content: str) -> GroupMessage:
        """Add a user message."""
        msg = GroupMessage(
            id=str(len(self.messages)),
            role="user",
            content=content,
            character_id="user",
            character_name="旅人",
        )
        self.messages.append(msg)
        return msg

    def add_assistant_message(self, character_id: str, content: str, character_name: str = "") -> GroupMessage:
        """Add an assistant message from a group member."""
        normalized_character_id = str(character_id or "").strip()
        member = self.get_member(normalized_character_id)
        resolved_name = str(character_name or "").strip() or (member.name if member else "")
        msg = GroupMessage(
            id=str(len(self.messages)),
            role="assistant",
            content=str(content or ""),
            character_id=normalized_character_id,
            character_name=resolved_name,
        )
        self.messages.append(msg)
        return msg

    def format_for_llm(
        self,
        responding_character_id: str,
        include_names: bool = True,
    ) -> list[dict]:
        """
        Format group chat history for LLM consumption.

        Includes speaker names for group context.
        """
        result = []
        for msg in self.messages[-30:]:
            if msg.role == "system":
                result.append({"role": "system", "content": msg.content})
            elif msg.role == "user":
                if include_names:
                    result.append({
                        "role": "user",
                        "content": f"{msg.character_name}: {msg.content}",
                    })
                else:
                    result.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant":
                if include_names:
                    result.append({
                        "role": "assistant",
                        "content": f"{msg.character_name}: {msg.content}",
                    })
                else:
                    result.append({"role": "assistant", "content": msg.content})

        return result

    def format_group_context(self) -> str:
        """Format the group chat context for system prompt."""
        if not self.members:
            return ""

        lines = ["**Group Chat Members:**"]
        for m in self.members:
            role_desc = ""
            if m.is_user:
                role_desc = " (You)"
            elif m.is_narrator:
                role_desc = " (Narrator)"
            elif m.talkativeness > 0.7:
                role_desc = " (Very talkative)"
            elif m.talkativeness > 0.4:
                role_desc = " (Moderate)"
            elif m.talkativeness < 0.2:
                role_desc = " (Quiet)"
            lines.append(f"- {m.name}{role_desc}")

        return "\n".join(lines)

    def reset(self) -> None:
        """Reset the group chat."""
        self.messages.clear()
        self.selector = TalkativenessSelector()
