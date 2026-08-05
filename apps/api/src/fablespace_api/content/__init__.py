"""Versioned, reviewed StoryWorld content."""

from .annie_broad_street import ANNIE_CHARACTER_ID, ANNIE_STORY_WORLD, ANNIE_STORY_WORLD_ID
from .palace_snow_edict import (
    GAO_LISHI_CHARACTER_ID,
    PALACE_STORY_WORLD,
    PALACE_STORY_WORLD_ID,
    TAIPING_PRINCESS_CHARACTER_ID,
)
from ..domain.story_world import StoryWorldRegistry

STORY_WORLD_REGISTRY = StoryWorldRegistry((ANNIE_STORY_WORLD, PALACE_STORY_WORLD))

__all__ = [
    "ANNIE_CHARACTER_ID",
    "ANNIE_STORY_WORLD",
    "ANNIE_STORY_WORLD_ID",
    "GAO_LISHI_CHARACTER_ID",
    "PALACE_STORY_WORLD",
    "PALACE_STORY_WORLD_ID",
    "STORY_WORLD_REGISTRY",
    "TAIPING_PRINCESS_CHARACTER_ID",
]
