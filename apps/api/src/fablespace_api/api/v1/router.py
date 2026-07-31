from __future__ import annotations

from fastapi import APIRouter

from . import admin, auth, story_worlds
from .system import router as system_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router, tags=["system"])
api_router.include_router(auth.router)
api_router.include_router(story_worlds.router)
api_router.include_router(admin.router)
