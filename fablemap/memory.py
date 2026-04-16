"""
Memory / Summarization — chat history compression and memory management.

Features:
- Token-based history truncation
- Automatic summarization (via LLM)
- Memory graph (entity tracking)
- Long-term vs short-term memory
- Selective memory (important messages only)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Memory Types ───────────────────────────────────────────────────────────────


@dataclass
class MemoryEntry:
    """A single memory entry."""
    id: str = ""
    content: str = ""
    importance: float = 1.0  # 0.0 - 1.0
    timestamp: str = ""
    source: str = ""  # "summary" | "manual" | "auto" | "entity"
    tags: list[str] = field(default_factory=list)
    entities: list[str] = field(default_factory=list)  # character names, places, etc.


@dataclass
class ChatMemory:
    """Manages chat memory with summarization."""
    entries: list[MemoryEntry] = field(default_factory=list)
    summary: str = ""
    max_entries: int = 50
    last_summary_time: str = ""

    def add_entry(self, entry: MemoryEntry) -> None:
        """Add a memory entry."""
        self.entries.append(entry)
        # Keep under max
        if len(self.entries) > self.max_entries:
            # Remove lowest importance entries
            self.entries.sort(key=lambda e: e.importance)
            self.entries = self.entries[int(self.max_entries * 0.8):]

    def set_summary(self, summary: str, timestamp: str = "") -> None:
        """Set the memory summary."""
        self.summary = summary
        from datetime import datetime
        self.last_summary_time = timestamp or datetime.now().isoformat()

    def get_recent(self, n: int = 10) -> list[MemoryEntry]:
        """Get the N most recent entries."""
        return sorted(self.entries, key=lambda e: e.timestamp, reverse=True)[:n]

    def get_important(self, threshold: float = 0.7) -> list[MemoryEntry]:
        """Get entries above importance threshold."""
        return [e for e in self.entries if e.importance >= threshold]


# ─── Summarizer ────────────────────────────────────────────────────────────────


class ChatSummarizer:
    """
    Summarize chat history using LLM.

    Supports different summarization strategies:
    - full: summarize entire history
    - incremental: summarize new messages since last summary
    - entity-focused: extract entities and relationships
    """

    def __init__(self, llm_client=None):
        self.llm_client = llm_client

    def summarize(
        self,
        messages: list[dict],
        strategy: str = "incremental",
        previous_summary: str = "",
        **kwargs,
    ) -> str:
        """
        Summarize a chat history.

        Args:
            messages: list of {"role": ..., "content": ...} messages
            strategy: "full" | "incremental" | "entity_focused"
            previous_summary: previous summary for incremental summarization

        Returns:
            Summary string
        """
        if not self.llm_client:
            raise ValueError("LLM client not configured for summarization")

        if strategy == "incremental":
            return self._summarize_incremental(messages, previous_summary, **kwargs)
        elif strategy == "entity_focused":
            return self._summarize_entities(messages, **kwargs)
        else:
            return self._summarize_full(messages, **kwargs)

    def _summarize_full(self, messages: list[dict], **kwargs) -> str:
        """Full history summarization."""
        history_text = self._format_messages(messages)
        prompt = f"""Summarize the following conversation. Focus on:
1. Key events and decisions
2. Character relationships and dynamics
3. Important facts established
4. Emotional tone and progression

Conversation:
{history_text}

Provide a concise but comprehensive summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _summarize_incremental(
        self, messages: list[dict], previous_summary: str, **kwargs
    ) -> str:
        """Incremental summarization — update existing summary with new messages."""
        new_messages = self._format_messages(messages)
        prompt = f"""Previous conversation summary:
{previous_summary}

New messages since last summary:
{new_messages}

Update the summary by:
1. Adding new important events, facts, or relationship changes
2. Maintaining the overall structure of the summary
3. Keeping the summary concise

Updated summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _summarize_entities(self, messages: list[dict], **kwargs) -> str:
        """Entity-focused summarization — extract characters, places, items."""
        history_text = self._format_messages(messages)
        prompt = f"""Extract and organize key entities from this conversation.

Format as:
**Characters**: (name, personality, role)
**Places**: (name, description, significance)
**Objects/Items**: (name, description, significance)
**Relationships**: (character1 <-> character2: relationship type)
**Key Events**: (brief description)

Conversation:
{history_text}

Entity summary:"""

        response = self.llm_client.complete([{"role": "user", "content": prompt}])
        return response.content

    def _format_messages(self, messages: list[dict], max_chars: int = 8000) -> str:
        """Format messages for summarization prompt."""
        parts = []
        total = 0
        for msg in messages[-50:]:  # Last 50 messages max
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if len(content) > 500:
                content = content[:500] + "..."
            line = f"{role}: {content}"
            if total + len(line) > max_chars:
                break
            parts.append(line)
            total += len(line)
        return "\n".join(parts)


# ─── Token Truncation ──────────────────────────────────────────────────────────


class HistoryTruncator:
    """
    Truncate chat history based on token limits.

    SillyTavern's power-user feature: intelligently truncate history
    while preserving important context.
    """

    def __init__(self, token_counter=None):
        self.token_counter = token_counter

    def truncate(
        self,
        messages: list[dict],
        max_tokens: int,
        preserve_system: bool = True,
        preserve_recent: int = 2,
    ) -> list[dict]:
        """
        Truncate messages to fit within max_tokens.

        Strategy:
        1. Count tokens from the end (newest messages)
        2. Remove oldest messages until under limit
        3. Preserve system message if preserve_system=True
        """
        if not self.token_counter:
            # Fallback: simple character-based estimate
            return self._truncate_fallback(messages, max_tokens * 4)

        result = []
        system_msg = None
        if preserve_system and messages and messages[0].get("role") == "system":
            system_msg = messages[0]
            messages = messages[1:]

        # Count from newest to oldest
        total_tokens = 0
        included = []

        # Always include the last N messages
        recent = messages[-preserve_recent:] if preserve_recent > 0 else []
        older = messages[:-preserve_recent] if preserve_recent > 0 else messages

        for msg in reversed(older):
            tokens = self.token_counter.count_messages([msg])
            if total_tokens + tokens <= max_tokens - 200:  # Leave buffer
                included.insert(0, msg)
                total_tokens += tokens
            else:
                break

        # Prepend system message
        if system_msg:
            result.append(system_msg)
        result.extend(included)
        result.extend(recent)

        return result

    def _truncate_fallback(
        self, messages: list[dict], max_chars: int
    ) -> list[dict]:
        """Fallback: truncate by character count."""
        result = []
        total = 0
        for msg in messages:
            content = msg.get("content", "")
            if total + len(content) > max_chars:
                break
            result.append(msg)
            total += len(content)
        return result


# ─── Importance Scorer ─────────────────────────────────────────────────────────


class ImportanceScorer:
    """
    Score message importance for selective memory.

    Heuristics:
    - Contains character names → high importance
    - Contains emotional markers → medium importance
    - Contains new facts → high importance
    - Contains questions → medium importance
    """

    EMOTION_MARKERS = [
        "happy", "sad", "angry", "excited", "worried", "love", "hate",
        "喜欢", "生气", "开心", "难过", "担心", "爱", "恨",
        "哈哈", "呜呜", "啊啊啊",
    ]
    FACT_MARKERS = [
        "is", "are", "was", "were", "has", "have", "will", "would",
        "是", "有", "在", "去", "来", "做",
    ]

    def score(self, message: dict) -> float:
        """Score a message's importance (0.0 - 1.0)."""
        content = message.get("content", "").lower()
        score = 0.3  # Base score

        # Emotional markers
        for marker in self.EMOTION_MARKERS:
            if marker.lower() in content:
                score += 0.1
                break

        # Fact markers (establishing information)
        for marker in self.FACT_MARKERS:
            if marker.lower() in content:
                score += 0.15
                break

        # Length bonus (longer messages may be more important)
        if len(content) > 200:
            score += 0.1

        # Question bonus
        if "?" in content or "？" in content:
            score += 0.05

        return min(score, 1.0)


# ─── Memory Manager ────────────────────────────────────────────────────────────


class MemoryManager:
    """
    Complete memory management system.

    Combines summarization, truncation, and importance scoring
    to manage chat memory efficiently.
    """

    def __init__(self, llm_client=None, token_counter=None):
        self.summarizer = ChatSummarizer(llm_client)
        self.truncator = HistoryTruncator(token_counter)
        self.scorer = ImportanceScorer()
        self.memory = ChatMemory()

    def process_messages(
        self,
        messages: list[dict],
        max_tokens: int,
        should_summarize: bool = False,
    ) -> tuple[list[dict], str]:
        """
        Process messages through the memory pipeline.

        Returns:
            (processed_messages, summary)
        """
        # Score importance
        for msg in messages:
            importance = self.scorer.score(msg)
            if importance > 0.5:
                entry = MemoryEntry(
                    content=msg.get("content", ""),
                    importance=importance,
                    source="auto",
                    entities=self._extract_entities(msg),
                )
                self.memory.add_entry(entry)

        # Truncate
        truncated = self.truncator.truncate(messages, max_tokens)

        # Summarize if needed
        summary = self.memory.summary
        if should_summarize and self.summarizer.llm_client:
            summary = self.summarizer.summarize(
                messages,
                strategy="incremental",
                previous_summary=summary,
            )
            self.memory.set_summary(summary)

        return truncated, summary

    def _extract_entities(self, message: dict) -> list[str]:
        """Extract named entities from a message."""
        content = message.get("content", "")
        # Simple entity extraction: capitalized words and quoted strings
        import re
        entities = []

        # Quoted strings
        entities.extend(re.findall(r'"([^"]+)"', content))

        # Capitalized words (simple heuristic)
        entities.extend(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content))

        # Chinese names (heuristic: consecutive Chinese characters)
        entities.extend(re.findall(r'[\u4e00-\u9fff]{2,4}', content))

        return list(set(entities))

    def get_context_for_prompt(self, max_entries: int = 5) -> str:
        """Get memory context for injection into prompts."""
        entries = self.memory.get_recent(max_entries)
        if not entries and not self.memory.summary:
            return ""

        parts = []
        if self.memory.summary:
            parts.append(f"[Memory Summary]\n{self.memory.summary}")
        if entries:
            parts.append("[Recent Memories]")
            for e in entries:
                parts.append(f"- {e.content[:200]}")

        return "\n".join(parts)
