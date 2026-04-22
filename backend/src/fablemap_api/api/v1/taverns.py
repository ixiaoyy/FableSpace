from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Request, Response

from ...application.taverns import TavernApplicationService
from ...contracts.taverns import (
    CharacterImportRequest,
    CharacterTalkativenessRequest,
    CharacterWriteRequest,
    ChatRequest,
    EnterTavernRequest,
    GameplaySessionRequest,
    GameplayWriteRequest,
    GroupChatConfigRequest,
    GroupChatRequest,
    LLMConfigTestRequest,
    MemoryAtomWriteRequest,
    OutputRulesTestRequest,
    OutputRulesWriteRequest,
    PromptBlocksPreviewRequest,
    PromptBlocksWriteRequest,
    RuntimePresetApplyRequest,
    RuntimePresetsWriteRequest,
    TTSRequest,
    TavernCreateRequest,
    TavernListResponse,
    TavernPackageImportRequest,
    TavernUpdateRequest,
    VoiceConfigRequest,
    WorldInfoTestRequest,
)

router = APIRouter(prefix="/taverns", tags=["taverns"])
packages_router = APIRouter(prefix="/tavern-packages", tags=["tavern-packages"])
llm_router = APIRouter(prefix="/llm", tags=["llm"])


def _taverns(request: Request) -> TavernApplicationService:
    return request.app.state.taverns


def _get_user_id(request: Request) -> str:
    return str(
        request.headers.get("X-User-Id")
        or request.query_params.get("user_id")
        or request.query_params.get("owner_id")
        or ""
    ).strip()


@router.get("", response_model=TavernListResponse)
def list_taverns(
    request: Request,
    lat: float | None = None,
    lon: float | None = None,
    radius: float = 5000,
    access: str | None = None,
    status: str | None = None,
    q: str = "",
    owner_id: str = "",
) -> dict[str, Any]:
    return _taverns(request).list_taverns(
        lat=lat,
        lon=lon,
        radius=radius,
        access=access,
        status=status,
        query=q,
        owner_id=owner_id,
    )


@router.post("")
def create_tavern(request: Request, data: TavernCreateRequest) -> dict[str, Any]:
    return _taverns(request).create_tavern(data.to_payload(), _get_user_id(request))


@packages_router.post("/import")
def import_tavern_package(request: Request, data: TavernPackageImportRequest) -> dict[str, Any]:
    return _taverns(request).import_tavern_package(data.to_payload(), _get_user_id(request))


@llm_router.post("/test-config")
def test_llm_config(request: Request, data: LLMConfigTestRequest) -> dict[str, Any]:
    return _taverns(request).test_llm_config(data.to_payload())


@router.get("/{tavern_id}")
def get_tavern(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_tavern(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}")
def update_tavern(request: Request, tavern_id: str, data: TavernUpdateRequest) -> dict[str, Any]:
    return _taverns(request).update_tavern(tavern_id, data.to_payload(), _get_user_id(request))


@router.delete("/{tavern_id}")
def delete_tavern(request: Request, tavern_id: str) -> dict[str, str]:
    return _taverns(request).delete_tavern(tavern_id, _get_user_id(request))


@router.get("/{tavern_id}/package")
def export_tavern_package(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).export_tavern_package(tavern_id, _get_user_id(request))


@router.post("/{tavern_id}/enter")
def enter_tavern(request: Request, tavern_id: str, data: EnterTavernRequest | None = None) -> dict[str, Any]:
    return _taverns(request).enter_tavern(
        tavern_id,
        password=data.password if data else "",
        user_id=_get_user_id(request),
    )


@router.get("/{tavern_id}/visitors")
def list_visitors(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).list_visitors(tavern_id, _get_user_id(request))


@router.get("/{tavern_id}/characters")
def list_characters(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).list_characters(tavern_id, _get_user_id(request))


@router.post("/{tavern_id}/characters")
def add_character(request: Request, tavern_id: str, data: CharacterWriteRequest) -> dict[str, Any]:
    return _taverns(request).add_character(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/characters/import")
def import_character_card(request: Request, tavern_id: str, data: CharacterImportRequest) -> dict[str, Any]:
    return _taverns(request).import_character_card(tavern_id, data.to_payload(), _get_user_id(request))


@router.put("/{tavern_id}/characters/{character_id}")
def update_character(
    request: Request,
    tavern_id: str,
    character_id: str,
    data: CharacterWriteRequest,
) -> dict[str, Any]:
    return _taverns(request).update_character(tavern_id, character_id, data.to_payload(), _get_user_id(request))


@router.delete("/{tavern_id}/characters/{character_id}")
def delete_character(request: Request, tavern_id: str, character_id: str) -> dict[str, str]:
    return _taverns(request).delete_character(tavern_id, character_id, _get_user_id(request))


@router.get("/{tavern_id}/chat")
def get_chat_history(
    request: Request,
    tavern_id: str,
    visitor_id: str = "",
    character_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    return _taverns(request).chat_history(
        tavern_id,
        visitor_id=visitor_id or _get_user_id(request),
        character_id=character_id,
        user_id=_get_user_id(request),
        limit=limit,
    )


@router.post("/{tavern_id}/chat")
def send_chat(request: Request, tavern_id: str, data: ChatRequest) -> dict[str, Any]:
    user_id = _get_user_id(request)
    return _taverns(request).send_chat(
        tavern_id,
        character_id=data.character_id,
        message=data.message,
        visitor_id=data.visitor_id or user_id,
        visitor_name=data.visitor_name,
        user_id=user_id,
        extra_context=data.extra_context,
        display_message=data.display_message,
    )


@router.post("/{tavern_id}/test-llm")
def test_tavern_llm(request: Request, tavern_id: str, data: LLMConfigTestRequest) -> dict[str, Any]:
    return _taverns(request).test_tavern_llm(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/group-chat")
def get_group_chat_config(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_group_chat_config(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/group-chat/config")
def update_group_chat_config(request: Request, tavern_id: str, data: GroupChatConfigRequest) -> dict[str, Any]:
    return _taverns(request).update_group_chat_config(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/group-chat")
def send_group_chat(request: Request, tavern_id: str, data: GroupChatRequest) -> dict[str, Any]:
    user_id = _get_user_id(request)
    return _taverns(request).send_group_chat(
        tavern_id,
        message=data.message,
        visitor_id=data.visitor_id or user_id,
        visitor_name=data.visitor_name,
        user_id=user_id,
        display_message=data.display_message,
    )


@router.get("/{tavern_id}/group-chat/history")
def get_group_chat_history(
    request: Request,
    tavern_id: str,
    visitor_id: str = "",
    limit: int = 50,
) -> dict[str, Any]:
    return _taverns(request).get_group_chat_history(
        tavern_id,
        visitor_id=visitor_id,
        user_id=_get_user_id(request),
        limit=limit,
    )


@router.put("/{tavern_id}/characters/{character_id}/talkativeness")
def update_character_talkativeness(
    request: Request,
    tavern_id: str,
    character_id: str,
    data: CharacterTalkativenessRequest,
) -> dict[str, Any]:
    return _taverns(request).update_character_talkativeness(tavern_id, character_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/memories")
def list_memories(
    request: Request,
    tavern_id: str,
    visitor_id: str = "",
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    pinned: bool | None = None,
    keyword: str = "",
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    return _taverns(request).list_memories(
        tavern_id,
        user_id=_get_user_id(request),
        visitor_id=visitor_id,
        scope=scope,
        dimension=dimension,
        horizon=horizon,
        pinned=pinned,
        keyword=keyword,
        limit=limit,
        offset=offset,
    )


@router.get("/{tavern_id}/memory-atoms")
def list_memory_atoms(
    request: Request,
    tavern_id: str,
    scope: str = "",
    dimension: str = "",
    horizon: str = "",
    visibility: str = "",
    visitor_id: str = "",
    character_id: str = "",
    place_id: str = "",
    limit: int = 100,
) -> dict[str, Any]:
    return _taverns(request).list_memory_atoms(
        tavern_id,
        user_id=_get_user_id(request),
        scope=scope,
        dimension=dimension,
        horizon=horizon,
        visibility=visibility,
        visitor_id=visitor_id,
        character_id=character_id,
        place_id=place_id,
        limit=limit,
    )


@router.post("/{tavern_id}/memory-atoms")
def create_memory_atom(request: Request, tavern_id: str, data: MemoryAtomWriteRequest) -> dict[str, Any]:
    return _taverns(request).create_memory_atom(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/memory-atoms/{memory_id}")
def get_memory_atom(request: Request, tavern_id: str, memory_id: str) -> dict[str, Any]:
    return _taverns(request).get_memory_atom(tavern_id, memory_id, _get_user_id(request))


@router.put("/{tavern_id}/memory-atoms/{memory_id}")
def update_memory_atom(
    request: Request,
    tavern_id: str,
    memory_id: str,
    data: MemoryAtomWriteRequest,
) -> dict[str, Any]:
    return _taverns(request).update_memory_atom(tavern_id, memory_id, data.to_payload(), _get_user_id(request))


@router.delete("/{tavern_id}/memory-atoms/{memory_id}")
def delete_memory_atom(request: Request, tavern_id: str, memory_id: str) -> dict[str, Any]:
    return _taverns(request).delete_memory_atom(tavern_id, memory_id, _get_user_id(request))


@router.post("/{tavern_id}/world-info/test")
def test_world_info(request: Request, tavern_id: str, data: WorldInfoTestRequest) -> dict[str, Any]:
    return _taverns(request).test_world_info(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/output-rules")
def get_output_rules(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_output_rules(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/output-rules")
def save_output_rules(request: Request, tavern_id: str, data: OutputRulesWriteRequest) -> dict[str, Any]:
    return _taverns(request).save_output_rules(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/output-rules/test")
def test_output_rules(request: Request, tavern_id: str, data: OutputRulesTestRequest) -> dict[str, Any]:
    return _taverns(request).test_output_rules(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/prompt-blocks")
def get_prompt_blocks(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_prompt_blocks(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/prompt-blocks")
def save_prompt_blocks(request: Request, tavern_id: str, data: PromptBlocksWriteRequest) -> dict[str, Any]:
    return _taverns(request).save_prompt_blocks(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/prompt-blocks/preview")
def preview_prompt_blocks(request: Request, tavern_id: str, data: PromptBlocksPreviewRequest) -> dict[str, Any]:
    return _taverns(request).preview_prompt_blocks(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/runtime-presets")
def get_runtime_presets(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_runtime_presets(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/runtime-presets")
def save_runtime_presets(request: Request, tavern_id: str, data: RuntimePresetsWriteRequest) -> dict[str, Any]:
    return _taverns(request).save_runtime_presets(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/runtime-presets/apply")
def apply_runtime_preset(request: Request, tavern_id: str, data: RuntimePresetApplyRequest) -> dict[str, Any]:
    return _taverns(request).apply_runtime_preset(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/voice")
def get_voice_config(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).get_voice_config(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/voice")
def save_voice_config(request: Request, tavern_id: str, data: VoiceConfigRequest) -> dict[str, Any]:
    return _taverns(request).save_voice_config(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/tts")
def synthesize_voice(request: Request, tavern_id: str, data: TTSRequest) -> Response:
    audio = _taverns(request).synthesize_voice(tavern_id, data.to_payload(), _get_user_id(request))
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/{tavern_id}/stt")
async def transcribe_voice(request: Request, tavern_id: str, format: str = "webm") -> dict[str, Any]:
    body = await request.body()
    return _taverns(request).transcribe_voice(
        tavern_id,
        bytes(body),
        audio_format=format,
        user_id=_get_user_id(request),
    )


@router.get("/{tavern_id}/gameplays")
def list_gameplays(request: Request, tavern_id: str) -> dict[str, Any]:
    return _taverns(request).list_gameplays(tavern_id, _get_user_id(request))


@router.put("/{tavern_id}/gameplays")
def save_gameplays(request: Request, tavern_id: str, data: GameplayWriteRequest) -> dict[str, Any]:
    return _taverns(request).save_gameplays(tavern_id, data.to_payload(), _get_user_id(request))


@router.get("/{tavern_id}/gameplay-sessions")
def list_gameplay_sessions(
    request: Request,
    tavern_id: str,
    state: str = "",
    visitor_id: str = "",
) -> dict[str, Any]:
    return _taverns(request).list_gameplay_sessions(
        tavern_id,
        user_id=_get_user_id(request),
        state=state,
        visitor_id=visitor_id,
    )


@router.post("/{tavern_id}/gameplay-sessions")
def start_gameplay_session(request: Request, tavern_id: str, data: GameplaySessionRequest) -> dict[str, Any]:
    return _taverns(request).start_gameplay_session(tavern_id, data.to_payload(), _get_user_id(request))


@router.post("/{tavern_id}/gameplay-sessions/{session_id}/advance")
def advance_gameplay_session(
    request: Request,
    tavern_id: str,
    session_id: str,
    data: dict[str, Any] = Body(default_factory=dict),
) -> dict[str, Any]:
    return _taverns(request).advance_gameplay_session(tavern_id, session_id, data, _get_user_id(request))


@router.post("/{tavern_id}/gameplay-sessions/{session_id}/abandon")
def abandon_gameplay_session(request: Request, tavern_id: str, session_id: str) -> dict[str, Any]:
    return _taverns(request).abandon_gameplay_session(tavern_id, session_id, _get_user_id(request))
