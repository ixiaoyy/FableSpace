from __future__ import annotations

from fastapi import APIRouter

from . import auth, chat, gameplay, story_worlds
from .system import router as system_router
from .spaces import router as spaces_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router, tags=["system"])
api_router.include_router(auth.router)
api_router.include_router(spaces_router)
api_router.include_router(chat.router)
api_router.include_router(gameplay.router)
api_router.include_router(story_worlds.router)
