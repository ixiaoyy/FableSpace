from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response

from ...contracts.runtime import (
    LLMConfigTestRequest,
    TTSRequest,
    VoiceConfigRequest,
    VoiceGreetingPreviewRequest,
    VisualSouvenirPreviewRequest,
)
from .common import get_user_id, spaces_service

llm_router = APIRouter(prefix="/llm", tags=["llm"])
router = APIRouter(prefix="/spaces", tags=["runtime"])


@llm_router.post("/test-config")
def test_llm_config(request: Request, data: LLMConfigTestRequest) -> dict[str, Any]:
    return spaces_service(request).test_llm_config(data.to_payload())


@router.post("/{space_id}/test-llm")
def test_space_llm(request: Request, space_id: str, data: LLMConfigTestRequest) -> dict[str, Any]:
    """Test a Space-specific LLM configuration for the current owner.

    Args:
        request: FastAPI request containing app state and user context.
        space_id: Space whose runtime configuration is being tested.
        data: Candidate LLM configuration payload.

    Returns:
        Test result and safe provider metadata from the application service.

    Side effects:
        May send a short validation request to the selected LLM provider.
    """
    return spaces_service(request).test_tavern_llm(space_id, data.to_payload(), get_user_id(request))


@router.get("/{space_id}/voice")
def get_voice_config(request: Request, space_id: str) -> dict[str, Any]:
    return spaces_service(request).get_voice_config(space_id, get_user_id(request))


@router.put("/{space_id}/voice")
def save_voice_config(request: Request, space_id: str, data: VoiceConfigRequest) -> dict[str, Any]:
    return spaces_service(request).save_voice_config(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/tts")
def synthesize_voice(request: Request, space_id: str, data: TTSRequest) -> Response:
    audio = spaces_service(request).synthesize_voice(space_id, data.to_payload(), get_user_id(request))
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/{space_id}/voice-greeting/preview")
def preview_voice_greeting(request: Request, space_id: str, data: VoiceGreetingPreviewRequest) -> dict[str, Any]:
    return spaces_service(request).preview_voice_greeting(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/visual-souvenir/preview")
def preview_visual_souvenir(request: Request, space_id: str, data: VisualSouvenirPreviewRequest) -> dict[str, Any]:
    return spaces_service(request).preview_visual_souvenir(space_id, data.to_payload(), get_user_id(request))


@router.post("/{space_id}/stt")
async def transcribe_voice(request: Request, space_id: str, format: str = "webm") -> dict[str, Any]:
    body = await request.body()
    return spaces_service(request).transcribe_voice(
        space_id,
        bytes(body),
        audio_format=format,
        user_id=get_user_id(request),
    )
