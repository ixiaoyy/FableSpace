from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.utilities import TokenCountRequest, TokenMessagesCountRequest
from .common import taverns_service

router = APIRouter(tags=["utilities"])


@router.get("/tokenizers")
def list_tokenizers(request: Request) -> dict[str, Any]:
    return taverns_service(request).list_tokenizers()


@router.post("/tokenizers/count")
def count_tokens(request: Request, data: TokenCountRequest) -> dict[str, Any]:
    return taverns_service(request).count_tokens(data.to_payload())


@router.post("/tokenizers/count_messages")
def count_message_tokens(request: Request, data: TokenMessagesCountRequest) -> dict[str, Any]:
    return taverns_service(request).count_message_tokens(data.to_payload())
