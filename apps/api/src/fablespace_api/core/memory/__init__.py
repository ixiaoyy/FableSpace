# -*- coding: utf-8 -*-
"""
fablespace_api.core.memory — re-export from core.py so the package directory is transparent.
All existing code that does `from fablespace_api.core.memory import X` continues to work.
"""
from fablespace_api.core.memory.core import (
    MEMORY_SCOPES,
    MEMORY_DIMENSIONS,
    MEMORY_HORIZONS,
    MEMORY_VISIBILITIES,
    MemoryAtom,
    MemorySearchResult,
    MemoryStore,
    KeywordMemoryStore,
    ImportanceScorer,
    auto_create_memories_from_chat,
    select_memory_atoms_for_prompt,
    format_memory_atoms_for_prompt,
    infer_memory_dimension,
    memory_atom_prompt_line,
    ChatSummarizer,
    HistoryTruncator,
    MemoryManager,
    MemoryEntry,
    ChatMemory,
)
__all__ = [
    "MEMORY_SCOPES",
    "MEMORY_DIMENSIONS",
    "MEMORY_HORIZONS",
    "MEMORY_VISIBILITIES",
    "MemoryAtom",
    "MemorySearchResult",
    "MemoryStore",
    "KeywordMemoryStore",
    "ImportanceScorer",
    "auto_create_memories_from_chat",
    "select_memory_atoms_for_prompt",
    "format_memory_atoms_for_prompt",
    "infer_memory_dimension",
    "memory_atom_prompt_line",
    "ChatSummarizer",
    "HistoryTruncator",
    "MemoryManager",
    "MemoryEntry",
    "ChatMemory",
]
