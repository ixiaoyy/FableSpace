from __future__ import annotations

from fastapi import APIRouter

from . import affinity, characters, chat, clue_hunts, engagement, gameplay, memories, notifications, owner_config, owners, platform, public_bond, relationship_graph, relationship_reset, roleplay, runtime, skill_packs, state_cards, utilities, worldinfo
from .packages import packages_router, taverns_router as package_taverns_router
from .system import router as system_router
from .taverns import router as taverns_router
from . import rumors, homes
from .territories import router as territories_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router, tags=["system"])
api_router.include_router(affinity.router)
api_router.include_router(taverns_router)
api_router.include_router(engagement.router)
api_router.include_router(characters.router)
api_router.include_router(characters.utilities_router)
api_router.include_router(chat.router)
api_router.include_router(chat.chat_router)
api_router.include_router(clue_hunts.router)
api_router.include_router(runtime.router)
api_router.include_router(runtime.llm_router)
api_router.include_router(roleplay.router)
api_router.include_router(memories.router)
api_router.include_router(memories.utilities_router)
api_router.include_router(owner_config.router)
api_router.include_router(owners.router)
api_router.include_router(platform.router)
api_router.include_router(gameplay.router)
api_router.include_router(skill_packs.router)
api_router.include_router(state_cards.router)
api_router.include_router(relationship_graph.router)
api_router.include_router(packages_router)
api_router.include_router(package_taverns_router)
api_router.include_router(public_bond.router)
api_router.include_router(public_bond.types_router)
api_router.include_router(worldinfo.router)
api_router.include_router(utilities.router)
api_router.include_router(notifications.router)
api_router.include_router(rumors.router)
api_router.include_router(homes.router)
api_router.include_router(territories_router)
api_router.include_router(relationship_reset.router)
