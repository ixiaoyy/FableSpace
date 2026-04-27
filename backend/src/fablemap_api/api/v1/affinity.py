from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ...core.affinity import affinity_stage_definitions

router = APIRouter(prefix="/affinity", tags=["affinity"])


@router.get("/stages")
def get_affinity_stages() -> dict[str, Any]:
    stages = affinity_stage_definitions()
    return {
        "stages": stages,
        "count": len(stages),
    }
