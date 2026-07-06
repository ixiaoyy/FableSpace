from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.owner_config import (
    OwnerDefaultLLMRequest,
    SpaceDraftGenerateRequest,
)
from .common import get_user_id, spaces_service

router = APIRouter(prefix="/owners", tags=["owners"])


@router.get("/me/default-llm")
def get_owner_default_llm(request: Request) -> dict[str, Any]:
    return spaces_service(request).get_owner_default_llm(get_user_id(request))


@router.put("/me/default-llm")
def save_owner_default_llm(
    request: Request,
    data: OwnerDefaultLLMRequest,
) -> dict[str, Any]:
    return spaces_service(request).save_owner_default_llm(data.to_payload(), get_user_id(request))


@router.post("/me/space-drafts/generate")
def generate_space_draft(
    request: Request,
    data: SpaceDraftGenerateRequest,
) -> dict[str, Any]:
    """Generate an AI-assisted Space draft for the current owner.

    Args:
        request: FastAPI request containing app state and user context.
        data: Location and style constraints for draft generation.

    Returns:
        Draft payload for a Space and its initial NPC setup.

    Side effects:
        May call the configured owner LLM through the application service.
    """
    return spaces_service(request).generate_tavern_draft(data.to_payload(), get_user_id(request))
