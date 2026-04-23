from __future__ import annotations

from fastapi import APIRouter

from . import characters, chat, gameplay, memories, owner_config, runtime, utilities, worldinfo
from .packages import packages_router, taverns_router as package_taverns_router
from .system import router as system_router
from .taverns import router as taverns_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router, tags=["system"])
api_router.include_router(taverns_router)
api_router.include_router(characters.router)
api_router.include_router(characters.utilities_router)
api_router.include_router(chat.router)
api_router.include_router(chat.chat_router)
api_router.include_router(runtime.router)
api_router.include_router(runtime.llm_router)
api_router.include_router(memories.router)
api_router.include_router(memories.utilities_router)
api_router.include_router(owner_config.router)
api_router.include_router(gameplay.router)
api_router.include_router(packages_router)
api_router.include_router(package_taverns_router)
api_router.include_router(worldinfo.router)
api_router.include_router(utilities.router)
