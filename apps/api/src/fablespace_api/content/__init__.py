"""Versioned, reviewed StoryWorld content."""

from .annie_broad_street import ANNIE_CHARACTER_ID, ANNIE_STORY_WORLD, ANNIE_STORY_WORLD_ID
from .palace_snow_edict import (
    PALACE_STORY_WORLD,
    PALACE_STORY_WORLD_ID,
    WEI_CHARACTER_ID,
    XIAO_CHARACTER_ID,
)
from ..domain.story_world import StoryWorldRegistry

STORY_WORLD_REGISTRY = StoryWorldRegistry((ANNIE_STORY_WORLD, PALACE_STORY_WORLD))

__all__ = [
    "ANNIE_CHARACTER_ID",
    "ANNIE_STORY_WORLD",
    "ANNIE_STORY_WORLD_ID",
    "PALACE_STORY_WORLD",
    "PALACE_STORY_WORLD_ID",
    "STORY_WORLD_REGISTRY",
    "WEI_CHARACTER_ID",
    "XIAO_CHARACTER_ID",
]
