from __future__ import annotations

from fastapi import APIRouter

from .system import router as system_router
from .taverns import llm_router, packages_router, router as taverns_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router, tags=["system"])
api_router.include_router(taverns_router)
api_router.include_router(packages_router)
api_router.include_router(llm_router)
