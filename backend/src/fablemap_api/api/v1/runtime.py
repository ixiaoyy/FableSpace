from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response

from ...contracts.runtime import (
    LLMConfigTestRequest,
    TTSRequest,
    VoiceConfigRequest,
)
from .common import get_user_id, taverns_service

llm_router = APIRouter(prefix="/llm", tags=["llm"])
router = APIRouter(prefix="/taverns", tags=["runtime"])


@llm_router.post("/test-config")
def test_llm_config(request: Request, data: LLMConfigTestRequest) -> dict[str, Any]:
    return taverns_service(request).test_llm_config(data.to_payload())


@router.post("/{tavern_id}/test-llm")
def test_tavern_llm(request: Request, tavern_id: str, data: LLMConfigTestRequest) -> dict[str, Any]:
    return taverns_service(request).test_tavern_llm(tavern_id, data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}/voice")
def get_voice_config(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_voice_config(tavern_id, get_user_id(request))


@router.put("/{tavern_id}/voice")
def save_voice_config(request: Request, tavern_id: str, data: VoiceConfigRequest) -> dict[str, Any]:
    return taverns_service(request).save_voice_config(tavern_id, data.to_payload(), get_user_id(request))


@router.post("/{tavern_id}/tts")
def synthesize_voice(request: Request, tavern_id: str, data: TTSRequest) -> Response:
    audio = taverns_service(request).synthesize_voice(tavern_id, data.to_payload(), get_user_id(request))
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/{tavern_id}/stt")
async def transcribe_voice(request: Request, tavern_id: str, format: str = "webm") -> dict[str, Any]:
    body = await request.body()
    return taverns_service(request).transcribe_voice(
        tavern_id,
        bytes(body),
        audio_format=format,
        user_id=get_user_id(request),
    )
