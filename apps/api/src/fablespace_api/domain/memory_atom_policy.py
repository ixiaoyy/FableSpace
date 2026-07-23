from __future__ import annotations

from typing import Any

from fablespace_api.core.memory import MemoryAtom


def memory_subject_user_ids(atom: MemoryAtom) -> set[str]:
    """Return the player identities allowed to read one private memory."""

    return {
        value
        for value in (atom.visitor_id, atom.subject)
        if value
    }


def can_view_memory_atom(atom: MemoryAtom, story: Any, user_id: str) -> bool:
    """Keep runtime memories private to their player identity."""

    del story
    return bool(user_id and user_id in memory_subject_user_ids(atom))


__all__ = ["can_view_memory_atom", "memory_subject_user_ids"]
