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


def __getattr__(name):
    if name == "GraphMemoryStore":
        from fablespace_api.core.memory_graph import GraphMemoryStore
        return GraphMemoryStore
    if name == "VectorMemoryStore":
        from fablespace_api.core.vectors import VectorMemoryStore
        return VectorMemoryStore
    raise AttributeError(f"module 'fablespace_api.core.memory' has no attribute {name!r}")

__all__ = [
    "MEMORY_SCOPES",
    "MEMORY_DIMENSIONS",
    "MEMORY_HORIZONS",
    "MEMORY_VISIBILITIES",
    "MemoryAtom",
    "MemorySearchResult",
    "MemoryStore",
    "KeywordMemoryStore",
    "VectorMemoryStore",
    "GraphMemoryStore",
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
