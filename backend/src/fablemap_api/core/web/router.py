from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path
from fastapi import APIRouter, Body, Form, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from .service import WebService

# Lazy-loaded async HTTP client for proxying to SillyTavern
_httpx_client = None


def _get_httpx():
    global _httpx_client
    if _httpx_client is None:
        import httpx
        _httpx_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            follow_redirects=True,
            headers={"user-agent": "FableMap/1.0"},
        )
    return _httpx_client


async def _proxy_to_sillytavern(request: Request, path: str) -> JSONResponse:
    """Forward a request to SillyTavern backend and return the response."""
    httpx_client = _get_httpx()

    st_url = getattr(request.app.state, "sillytavern_url", "http://127.0.0.1:8000")
    target_url = f"{st_url}/{path}"

    # Forward relevant headers (skip host and content-length)
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length", "connection")
    }

    body = await request.body()

    try:
        st_response = await httpx_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body if body else None,
            params=request.query_params,
        )
        return JSONResponse(
            content=st_response.json() if st_response.headers.get("content-type", "").startswith("application/json") else {},
            status_code=st_response.status_code,
        )
    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={"error": f"SillyTavern proxy error: {str(exc)}"},
        )


def create_api_router(service: WebService) -> APIRouter:
    router = APIRouter()

    @router.get("/api/health")
    def get_health() -> dict:
        return service.health_payload()

    @router.get("/api/meta")
    def get_meta(request: Request) -> dict:
        return service.meta_payload(base_url=_request_base_url(request))

    @router.post("/api/nearby")
    def post_nearby(
        request: Request,
        lat: float = Form(...),
        lon: float = Form(...),
        radius: int = Form(300),
        mode: str = Form("fixture"),
        seed: str = Form(""),
        refresh: bool = Form(False),
    ) -> dict:
        return service.nearby_payload(
            lat=lat,
            lon=lon,
            radius=radius,
            mode=mode,
            seed=seed,
            refresh=refresh,
            base_url=_request_base_url(request),
        )

    @router.post("/api/map/snapshot/{snapshot_id}")
    def post_map_snapshot(snapshot_id: str, payload: dict = Body(...)) -> dict:
        return service.map_snapshot_payload(snapshot_id, payload)

    @router.post("/api/world/event")
    def post_world_event(event: dict = Body(...)) -> dict:
        return service.writeback_event_payload(event)

    @router.post("/api/world/orchestrate")
    def post_world_orchestrate(
        slice_id: str = Body(...),
        player_id: str = Body(...),
        lat: float = Body(...),
        lon: float = Body(...),
    ) -> dict:
        return service.orchestrate_world(slice_id, player_id, lat, lon)

    @router.post("/api/ghost/trace")
    def post_ghost_trace(
        player_id: str = Body(...),
        waypoints: list = Body(...),
        mood_arc: list = Body(...),
        visibility: str = Body("local_public"),
    ) -> dict:
        return service.record_ghost_trace_payload(player_id, waypoints, mood_arc, visibility)

    @router.get("/api/ghost/traces/{player_id}")
    def get_ghost_traces(player_id: str) -> dict:
        return service.get_ghost_traces_payload(player_id)

    @router.get("/api/world/landmark/honor/{slice_id}")
    def get_landmark_honor(slice_id: str) -> dict:
        return service.landmark_honor_payload(slice_id)

    @router.post("/api/world/disturbance")
    def post_disturbance(
        slice_id: str = Body(...),
        weather: str | None = Body(None),
        traffic_level: float | None = Body(None),
        crowd_density: float | None = Body(None),
        is_holiday: bool | None = Body(None),
        event_tag: str | None = Body(None),
    ) -> dict:
        return service.inject_disturbance_payload(slice_id, weather, traffic_level, crowd_density, is_holiday, event_tag)

    @router.delete("/api/world/disturbance/{slice_id}")
    def delete_disturbance(slice_id: str) -> dict:
        return service.clear_disturbance_payload(slice_id)

    @router.get("/api/world/disturbance/{slice_id}")
    def get_disturbance(slice_id: str) -> dict:
        return service.get_disturbance_payload(slice_id)

    # ─── Tavern Routes ────────────────────────────────────────────────────

    @router.get("/api/taverns")
    def list_taverns(
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        status: str | None = None,
        q: str = "",
        owner_id: str = "",
    ) -> dict:
        """List all taverns with optional location filter"""
        return service.list_taverns_payload(
            lat=lat, lon=lon, radius=radius, access=access, status=status, query=q, owner_id=owner_id
        )

    @router.post("/api/taverns")
    def create_tavern(request: Request, data: dict = Body(...)) -> dict:
        """Create a new tavern"""
        user_id = _get_user_id(request)
        return service.create_tavern_payload(data, user_id)

    @router.get("/api/taverns/{tavern_id}")
    def get_tavern(request: Request, tavern_id: str) -> dict:
        """Get a specific tavern"""
        user_id = _get_user_id(request)
        return service.get_tavern_payload(tavern_id, user_id)

    @router.get("/api/taverns/{tavern_id}/share")
    def get_tavern_share(request: Request, tavern_id: str) -> dict:
        """Get shareable info for a tavern (public data only)."""
        base_url = _request_base_url(request)
        user_id = _get_user_id(request)
        return service.get_share_payload(tavern_id, base_url, user_id)

    @router.put("/api/taverns/{tavern_id}")
    def update_tavern(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Update a tavern"""
        user_id = _get_user_id(request)
        return service.update_tavern_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/world-info/test")
    def test_world_info(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Test which WorldInfo entries would match a message."""
        user_id = _get_user_id(request)
        return service.test_world_info_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/output-rules")
    def get_output_rules(request: Request, tavern_id: str) -> dict:
        """Get deterministic output cleanup rules for a tavern."""
        user_id = _get_user_id(request)
        return service.get_output_rules_payload(tavern_id, user_id)

    @router.put("/api/taverns/{tavern_id}/output-rules")
    def save_output_rules(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Save deterministic output cleanup rules for a tavern."""
        user_id = _get_user_id(request)
        return service.save_output_rules_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/output-rules/test")
    def test_output_rules(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Preview output cleanup rules without saving."""
        user_id = _get_user_id(request)
        return service.test_output_rules_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/prompt-blocks")
    def get_prompt_blocks(request: Request, tavern_id: str) -> dict:
        """Get Prompt Blocks for a tavern."""
        user_id = _get_user_id(request)
        return service.get_prompt_blocks_payload(tavern_id, user_id)

    @router.put("/api/taverns/{tavern_id}/prompt-blocks")
    def save_prompt_blocks(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Save Prompt Blocks for a tavern."""
        user_id = _get_user_id(request)
        return service.save_prompt_blocks_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/prompt-blocks/preview")
    def preview_prompt_blocks(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Preview Prompt Blocks without calling an LLM."""
        user_id = _get_user_id(request)
        return service.preview_prompt_blocks_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/runtime-presets")
    def get_runtime_presets(request: Request, tavern_id: str) -> dict:
        """Get built-in and owner-created runtime presets for a tavern."""
        user_id = _get_user_id(request)
        return service.get_runtime_presets_payload(tavern_id, user_id)

    @router.put("/api/taverns/{tavern_id}/runtime-presets")
    def save_runtime_presets(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Save owner-created runtime presets for a tavern."""
        user_id = _get_user_id(request)
        return service.save_runtime_presets_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/runtime-presets/apply")
    def apply_runtime_preset(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Apply a runtime preset to tavern runtime configuration."""
        user_id = _get_user_id(request)
        return service.apply_runtime_preset_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/package")
    def export_tavern_package(request: Request, tavern_id: str) -> dict:
        """Export a shareable tavern package without secrets or visitor data."""
        user_id = _get_user_id(request)
        return service.export_tavern_package_payload(tavern_id, user_id)

    @router.post("/api/tavern-packages/import")
    def import_tavern_package(request: Request, data: dict = Body(...)) -> dict:
        """Import a tavern package as a new tavern at a chosen coordinate."""
        user_id = _get_user_id(request)
        return service.import_tavern_package_payload(data, user_id)

    @router.delete("/api/taverns/{tavern_id}")
    def delete_tavern(request: Request, tavern_id: str) -> dict:
        """Delete a tavern"""
        user_id = _get_user_id(request)
        return service.delete_tavern_payload(tavern_id, user_id)

    @router.post("/api/taverns/{tavern_id}/enter")
    def enter_tavern(request: Request, tavern_id: str, password: str = "") -> dict:
        """Enter a tavern (verify password)"""
        user_id = _get_user_id(request)
        return service.enter_tavern_payload(tavern_id, password, user_id)

    @router.get("/api/taverns/{tavern_id}/visitors")
    def list_tavern_visitors(request: Request, tavern_id: str) -> dict:
        """List visitor states for a tavern (owner view)."""
        user_id = _get_user_id(request)
        return service.list_tavern_visitors_payload(tavern_id, user_id)

    @router.get("/api/taverns/{tavern_id}/gameplays")
    def list_gameplays(request: Request, tavern_id: str) -> dict:
        """List gameplay definitions visible to the current user."""
        user_id = _get_user_id(request)
        return service.get_gameplays_payload(tavern_id, user_id)

    @router.put("/api/taverns/{tavern_id}/gameplays")
    def save_gameplays(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Save owner-managed gameplay definitions."""
        user_id = _get_user_id(request)
        return service.save_gameplays_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/gameplay-sessions")
    def list_gameplay_sessions(
        request: Request,
        tavern_id: str,
        state: str = "",
        visitor_id: str = "",
    ) -> dict:
        """List gameplay sessions for the current visitor or owner."""
        user_id = _get_user_id(request)
        return service.list_gameplay_sessions_payload(tavern_id, user_id, state=state, visitor_id=visitor_id)

    @router.post("/api/taverns/{tavern_id}/gameplay-sessions")
    def start_gameplay_session(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Start or resume a gameplay session."""
        user_id = _get_user_id(request)
        return service.start_gameplay_session_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/gameplay-sessions/{session_id}/advance")
    def advance_gameplay_session(request: Request, tavern_id: str, session_id: str, data: dict = Body(...)) -> dict:
        """Advance a gameplay session."""
        user_id = _get_user_id(request)
        return service.advance_gameplay_session_payload(tavern_id, session_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/gameplay-sessions/{session_id}/abandon")
    def abandon_gameplay_session(request: Request, tavern_id: str, session_id: str) -> dict:
        """Abandon a gameplay session."""
        user_id = _get_user_id(request)
        return service.abandon_gameplay_session_payload(tavern_id, session_id, user_id)

    @router.get("/api/taverns/{tavern_id}/memory-atoms")
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
    ) -> dict:
        """List structured memory atoms visible to the current user."""
        user_id = _get_user_id(request)
        return service.list_memory_atoms_payload(
            tavern_id,
            user_id,
            scope=scope,
            dimension=dimension,
            horizon=horizon,
            visibility=visibility,
            visitor_id=visitor_id,
            character_id=character_id,
            place_id=place_id,
            limit=limit,
        )

    @router.post("/api/taverns/{tavern_id}/memory-atoms")
    def create_memory_atom(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Create a structured memory atom."""
        user_id = _get_user_id(request)
        return service.create_memory_atom_payload(tavern_id, data, user_id)

    @router.get("/api/taverns/{tavern_id}/memory-atoms/{memory_id}")
    def get_memory_atom(request: Request, tavern_id: str, memory_id: str) -> dict:
        """Get one structured memory atom if visible."""
        user_id = _get_user_id(request)
        return service.get_memory_atom_payload(tavern_id, memory_id, user_id)

    @router.put("/api/taverns/{tavern_id}/memory-atoms/{memory_id}")
    def update_memory_atom(request: Request, tavern_id: str, memory_id: str, data: dict = Body(...)) -> dict:
        """Update a structured memory atom."""
        user_id = _get_user_id(request)
        return service.update_memory_atom_payload(tavern_id, memory_id, data, user_id)

    @router.delete("/api/taverns/{tavern_id}/memory-atoms/{memory_id}")
    def delete_memory_atom(request: Request, tavern_id: str, memory_id: str) -> dict:
        """Delete a structured memory atom."""
        user_id = _get_user_id(request)
        return service.delete_memory_atom_payload(tavern_id, memory_id, user_id)

    # ─── Character Routes ────────────────────────────────────────────────

    @router.get("/api/taverns/{tavern_id}/characters")
    def get_characters(request: Request, tavern_id: str) -> dict:
        """List characters in a tavern"""
        user_id = _get_user_id(request)
        tavern = service.get_tavern_payload(tavern_id, user_id)
        return {"characters": tavern.get("characters", [])}

    @router.post("/api/taverns/{tavern_id}/characters")
    def add_character(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Add a character to a tavern"""
        user_id = _get_user_id(request)
        return service.add_character_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/characters/import")
    def import_character_card(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Import a SillyTavern character card"""
        user_id = _get_user_id(request)
        return service.import_character_card_payload(tavern_id, data, user_id)

    @router.put("/api/taverns/{tavern_id}/characters/{char_id}")
    def update_character(request: Request, tavern_id: str, char_id: str, data: dict = Body(...)) -> dict:
        """Update a character"""
        user_id = _get_user_id(request)
        return service.update_character_payload(tavern_id, char_id, data, user_id)

    @router.delete("/api/taverns/{tavern_id}/characters/{char_id}")
    def delete_character(request: Request, tavern_id: str, char_id: str) -> dict:
        """Delete a character"""
        user_id = _get_user_id(request)
        return service.delete_character_payload(tavern_id, char_id, user_id)

    # ─── Chat Routes ────────────────────────────────────────────────────

    @router.get("/api/taverns/{tavern_id}/chat")
    def get_tavern_chat_history(
        request: Request,
        tavern_id: str,
        visitor_id: str,
        character_id: str | None = None,
        limit: int = 50,
    ) -> dict:
        """Get chat history for a tavern"""
        user_id = _get_user_id(request)
        return service.tavern_chat_history_payload(tavern_id, visitor_id, character_id, user_id, limit)

    @router.post("/api/taverns/{tavern_id}/chat")
    def post_tavern_chat(
        request: Request,
        tavern_id: str,
        character_id: str = Body(...),
        message: str = Body(...),
        visitor_id: str = Body(...),
        visitor_name: str = Body(""),
        extra_context: list[dict] | None = Body(None),
        display_message: str = Body(""),
    ) -> dict:
        """Send a chat message and get AI response"""
        user_id = _get_user_id(request)
        return service.tavern_chat_payload(
            tavern_id,
            character_id,
            message,
            visitor_id,
            visitor_name,
            user_id,
            extra_context=extra_context,
            display_message=display_message,
        )

    @router.post("/api/taverns/{tavern_id}/test-llm")
    def test_llm(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Test LLM configuration"""
        return service.test_llm_payload(tavern_id, data)

    @router.post("/api/llm/test-config")
    def test_llm_config(request: Request, data: dict = Body(...)) -> dict:
        """Test LLM configuration directly, without requiring a tavern_id."""
        return service.test_llm_config_payload(data)

    # ─── Expression Routes ──────────────────────────────────────────────

    @router.get("/api/expressions")
    def list_expressions() -> dict:
        """List all standard SillyTavern expressions"""
        from fablemap_api.core.tavern import STANDARD_EXPRESSIONS, EXPRESSION_CATEGORIES
        return {
            "expressions": STANDARD_EXPRESSIONS,
            "categories": EXPRESSION_CATEGORIES,
            "count": len(STANDARD_EXPRESSIONS),
        }

    @router.get("/api/taverns/{tavern_id}/characters/{char_id}/sprites")
    def get_character_sprites(
        request: Request,
        tavern_id: str,
        char_id: str,
    ) -> dict:
        """Get all sprites for a character"""
        user_id = _get_user_id(request)
        tavern = service.get_tavern_payload(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        char = next((c for c in tavern.get("characters", []) if c.get("id") == char_id), None)
        if char is None:
            return JSONResponse(status_code=404, content={"error": "Character not found"})

        from fablemap_api.core.tavern import TavernSpriteSet
        sprites_data = char.get("sprites", {})
        sprites = TavernSpriteSet(sprites_data)
        return {
            "character_id": char_id,
            "character_name": char.get("name", ""),
            "sprites": sprites.to_dict(),
            "sprite_map": sprites.to_sprite_map(),
            "default_expression": sprites.get_default()[0],
            "default_url": sprites.get_default()[1],
        }

    @router.put("/api/taverns/{tavern_id}/characters/{char_id}/sprites")
    def update_character_sprites(
        request: Request,
        tavern_id: str,
        char_id: str,
        data: dict = Body(...),
    ) -> dict:
        """Update sprites for a character"""
        user_id = _get_user_id(request)
        tavern = service.get_tavern_payload(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        char = next((c for c in tavern.get("characters", []) if c.get("id") == char_id), None)
        if char is None:
            return JSONResponse(status_code=404, content={"error": "Character not found"})

        # Update sprites
        new_sprites = data.get("sprites", {})
        char["sprites"] = new_sprites
        service.update_tavern_payload(tavern_id, {"characters": tavern.get("characters", [])}, user_id)
        return {"ok": True, "sprites": new_sprites}

    @router.post("/api/expression/infer")
    def infer_expression(data: dict = Body(...)) -> dict:
        """
        Infer expression from text using LLM.
        Returns the most appropriate SillyTavern expression label.
        """
        text = data.get("text", "")
        character_name = data.get("character_name", "")
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")

        if not text:
            return JSONResponse(status_code=400, content={"error": "text is required"})

        from fablemap_api.core.tavern import STANDARD_EXPRESSIONS
        labels_str = ", ".join(STANDARD_EXPRESSIONS)

        prompt = f"""You are an emotion classifier. Given a character's response, classify the emotion.
Character name: {character_name}
Response: {text}

Output ONLY one word from this list: {labels_str}

Do not explain. Just output the single emotion word."""

        # Try to use tavern's LLM config
        llm_config = None
        if tavern_id:
            llm_config = service.tavern_store.get_llm_config(tavern_id)

        if llm_config and llm_config.is_configured():
            try:
                from fablemap_api.core.llm_clients import create_client, LLMConfig
                client_config = LLMConfig(
                    backend=llm_config.backend,
                    model=llm_config.model,
                    api_key=llm_config.api_key,
                    base_url=llm_config.base_url,
                    temperature=0.1,
                    max_tokens=20,
                )
                client = create_client(client_config)
                response = client.chat([{"role": "user", "content": prompt}])
                expression = response.strip().lower()

                # Validate expression is in our list
                if expression not in STANDARD_EXPRESSIONS:
                    # Try fuzzy match
                    for std in STANDARD_EXPRESSIONS:
                        if std in expression or expression in std:
                            expression = std
                            break
                    else:
                        expression = "neutral"
                return {"expression": expression, "source": "llm", "text": text}
            except Exception as e:
                # Fall through to keyword-based fallback
                pass

        # Keyword-based fallback (no LLM needed)
        expression = _infer_expression_keyword(text)
        return {"expression": expression, "source": "keyword", "text": text}

    # ─── Compatibility Routes (backward compatibility) ─────────────────────────

    @router.get("/api/chat/history")
    def get_chat_history(
        player_id: str,
        poi_id: str,
        character_id: str | None = None,
    ) -> dict:
        return service.chat_history_payload(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
        )

    @router.post("/api/chat")
    def post_chat(
        character_id: str = Body(...),
        message: str = Body(...),
        world_id: str = Body(...),
        poi_id: str = Body(...),
        player_id: str = Body(...),
        history: list = Body([]),
    ) -> dict:
        return service.chat_response_payload(
            character_id, message, world_id, poi_id, player_id, history
        )

    @router.get("/generated/{file_path:path}")
    def get_generated_file(file_path: str):
        return FileResponse(service.generated_file_path(file_path))

    # ─── SillyTavern proxy routes ────────────────────────────────────────────

    @router.get("/sillytavern")
    @router.get("/sillytavern/")
    def get_sillytavern_index(request: Request) -> RedirectResponse:
        """Redirect to the configured SillyTavern instance."""
        st_url = getattr(request.app.state, "sillytavern_url", "http://127.0.0.1:8000")
        return RedirectResponse(url=f"{st_url}/", status_code=302)

    @router.api_route("/sillytavern/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def proxy_sillytavern_api(request: Request, path: str):
        """Proxy API calls to SillyTavern backend."""
        return await _proxy_to_sillytavern(request, f"api/{path}")

    @router.api_route("/sillytavern/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def proxy_sillytavern_catchall(request: Request, path: str):
        """Proxy all other SillyTavern requests (for completeness)."""
        return await _proxy_to_sillytavern(request, path)

    # ─── TTS Routes ────────────────────────────────────────────────────────

    @router.post("/api/tts/voices")
    def list_tts_voices(provider: str = Body("elevenlabs"), api_key: str = Body("")) -> dict:
        """List available voices for a TTS provider."""
        from fablemap_api.core.tts_clients import TTSConfig, list_provider_voices
        config = TTSConfig(provider=provider, api_key=api_key)
        try:
            voices = list_provider_voices(provider, api_key)
            return {"voices": [{"id": v.id, "name": v.name, "gender": v.gender, "language": v.language} for v in voices]}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    @router.post("/api/tts/synthesize")
    def synthesize_speech(request: Request, data: dict = Body(...)) -> FileResponse:
        """Synthesize speech from text."""
        from fablemap_api.core.tts_clients import TTSConfig, create_tts_provider

        provider = data.get("provider", "elevenlabs")
        api_key = data.get("api_key", "")
        text = data.get("text", "")
        voice = data.get("voice", "")
        model = data.get("model", "")

        if not text:
            return JSONResponse(status_code=400, content={"error": "No text provided"})

        config = TTSConfig(provider=provider, api_key=api_key, voice=voice, model=model)
        try:
            tts_provider = create_tts_provider(config)
            response = tts_provider.synthesize(text, voice=voice, model=model)
            # Return audio as a file
            import tempfile
            import os
            suffix = ".mp3"
            if provider in ("silero", "coqui"):
                suffix = ".wav"
            fd, tmp_path = tempfile.mkstemp(suffix=suffix)
            os.write(fd, response.audio)
            os.close(fd)
            return FileResponse(tmp_path, media_type="audio/mpeg", filename="speech.mp3")
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @router.get("/api/tts/providers")
    def list_tts_providers() -> dict:
        """List all available TTS providers."""
        from fablemap_api.core.tts_clients import list_available_providers
        return {"providers": list_available_providers()}

    # ─── Tavern Voice Routes ─────────────────────────────────────────────────

    @router.get("/api/taverns/{tavern_id}/voice")
    def get_voice_config(request: Request, tavern_id: str) -> dict:
        """Get voice config for a tavern."""
        user_id = _get_user_id(request)
        return service.get_voice_config_payload(tavern_id, user_id)

    @router.put("/api/taverns/{tavern_id}/voice")
    def save_voice_config(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Save voice config (TTS/STT settings)."""
        user_id = _get_user_id(request)
        return service.save_voice_config_payload(tavern_id, data, user_id)

    @router.post("/api/taverns/{tavern_id}/tts")
    def synthesize_voice(request: Request, tavern_id: str, data: dict = Body(...)) -> FileResponse:
        """Synthesize speech using the tavern's TTS config."""
        text = data.get("text", "")
        character_id = data.get("character_id", "")
        if not text:
            return JSONResponse(status_code=400, content={"error": "No text provided"})

        user_id = _get_user_id(request)
        audio_bytes = service.synthesize_voice_payload(tavern_id, text, character_id, user_id)

        import tempfile, os
        suffix = ".mp3"
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.write(fd, audio_bytes)
        os.close(fd)
        return FileResponse(tmp_path, media_type="audio/mpeg", filename="speech.mp3")

    @router.post("/api/taverns/{tavern_id}/stt")
    async def transcribe_voice(request: Request, tavern_id: str) -> dict:
        """Transcribe uploaded audio using the tavern's STT config."""
        from fastapi import UploadFile, File

        # Read audio data from request body
        try:
            body = await request.body()
            if not body:
                return JSONResponse(status_code=400, content={"error": "No audio data"})

            user_id = _get_user_id(request)
            # Assume webm format by default
            result = service.transcribe_voice_payload(
                tavern_id, bytes(body), "webm", user_id
            )
            return result
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Memory Routes ─────────────────────────────────────────────────────

    @router.post("/api/memory/summarize")
    def summarize_chat(request: Request, data: dict = Body(...)) -> dict:
        """Summarize chat history."""
        from fablemap_api.core.memory import ChatSummarizer

        messages = data.get("messages", [])
        strategy = data.get("strategy", "incremental")
        previous_summary = data.get("previous_summary", "")
        # Note: llm_client needs to be injected via service for actual summarization
        try:
            summarizer = ChatSummarizer(llm_client=None)
            if not summarizer.llm_client:
                return JSONResponse(
                    status_code=501,
                    content={"error": "LLM client not configured for summarization"}
                )
            summary = summarizer.summarize(messages, strategy, previous_summary)
            return {"summary": summary}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @router.post("/api/memory/truncate")
    def truncate_history(data: dict = Body(...)) -> dict:
        """Truncate chat history to fit token budget."""
        from fablemap_api.core.memory import HistoryTruncator
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 8192)

        try:
            truncator = HistoryTruncator()
            truncated = truncator.truncate(messages, max_tokens)
            return {"messages": truncated, "count": len(truncated)}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @router.post("/api/memory/importance")
    def score_importance(data: dict = Body(...)) -> dict:
        """Score message importance."""
        from fablemap_api.core.memory import ImportanceScorer
        messages = data.get("messages", [])

        scorer = ImportanceScorer()
        scores = [{"index": i, "importance": scorer.score(msg)} for i, msg in enumerate(messages)]
        return {"scores": scores}

    # ─── Chats API ──────────────────────────────────────────────────────────
    @router.get("/api/chats")
    def list_chats(request: Request, tavern_id: str = "", character_id: str = "", visitor_id: str = "") -> dict:
        """List all chat sessions."""
        user_id = _get_user_id(request)

        def _chat_row(session: dict, tavern_data: dict) -> dict:
            character = next(
                (char for char in tavern_data.get("characters", []) if char.get("id") == session.get("character_id")),
                {},
            )
            last_message = session.get("last_message")
            last_payload = last_message.to_dict() if hasattr(last_message, "to_dict") else (last_message or {})
            visitor_name = session.get("visitor_name") or last_payload.get("visitor_name", "")
            return {
                "tavern_id": session.get("tavern_id", tavern_data.get("id", "")),
                "tavern_name": tavern_data.get("name", ""),
                "visitor_id": session.get("visitor_id", ""),
                "visitor_name": visitor_name,
                "character_id": session.get("character_id", ""),
                "character_name": character.get("name", ""),
                "message_count": session.get("message_count", 0),
                "last_message": str(last_payload.get("content", ""))[:100],
                "last_role": last_payload.get("role", ""),
                "updated_at": last_payload.get("timestamp", ""),
            }

        def _visitor_filter_for(tavern_data: dict) -> str:
            if visitor_id:
                _ensure_chat_scope(tavern_data, user_id, visitor_id)
                return visitor_id
            if user_id and tavern_data.get("owner_id") == user_id:
                return ""  # owner view: all visitor sessions for this tavern
            return user_id or "__anonymous_without_visitor_id__"

        if tavern_id:
            tavern = service.get_tavern(tavern_id, user_id)
            sessions = service.tavern_store.list_chat_sessions(
                tavern_id,
                visitor_id=_visitor_filter_for(tavern),
                character_id=character_id,
            )
            chats = [_chat_row(session, tavern) for session in sessions]
            return {"chats": chats}

        all_taverns = service.list_taverns(user_id)
        all_chats = []
        for t in all_taverns:
            t_data = service.get_tavern(t["id"], user_id)
            if visitor_id:
                # Owner global filter should only scan owned taverns; visitors can scan their own sessions.
                if visitor_id != user_id and t_data.get("owner_id") != user_id:
                    continue
            elif t_data.get("owner_id") != user_id:
                continue
            sessions = service.tavern_store.list_chat_sessions(
                t["id"],
                visitor_id=_visitor_filter_for(t_data),
                character_id=character_id,
            )
            all_chats.extend(_chat_row(session, t_data) for session in sessions)
        return {"chats": all_chats}

    @router.post("/api/chats")
    def save_chat(request: Request, data: dict = Body(...)) -> dict:
        """Save chat history."""
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        messages = data.get("messages", [])
        user_id = _get_user_id(request)

        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        from fablemap_api.core.tavern import ChatMessage
        resolved_visitor_id = data.get("visitor_id", "") or user_id
        if resolved_visitor_id:
            _ensure_chat_scope(
                tavern,
                user_id,
                resolved_visitor_id,
                compatibility_body_visitor_allowed=True,
            )
        for msg_data in messages:
            message_visitor_id = msg_data.get("visitor_id") or resolved_visitor_id
            _ensure_chat_scope(
                tavern,
                user_id,
                message_visitor_id,
                compatibility_body_visitor_allowed=True,
            )
            msg = ChatMessage.from_dict({
                **msg_data,
                "id": msg_data.get("id") or f"msg_{uuid.uuid4().hex[:12]}",
                "tavern_id": msg_data.get("tavern_id") or tavern_id,
                "character_id": msg_data.get("character_id") or character_id,
                "visitor_id": message_visitor_id,
                "role": msg_data.get("role") or "user",
                "content": msg_data.get("content") or "",
                "timestamp": msg_data.get("timestamp") or _utc_timestamp(),
            })
            service.tavern_store.add_chat_message(msg)

        return {"ok": True, "saved": len(messages)}

    @router.get("/api/chats/{tavern_id}/{character_id}")
    def get_chat(request: Request, tavern_id: str, character_id: str, visitor_id: str = "") -> dict:
        """Get chat history for a character."""
        user_id = _get_user_id(request)
        tavern = service.get_tavern(tavern_id, user_id)
        resolved_visitor_id = visitor_id or ("" if _is_tavern_owner_payload(tavern, user_id) else user_id)
        if resolved_visitor_id:
            _ensure_chat_scope(tavern, user_id, resolved_visitor_id)
            history = service.tavern_store.get_chat_history(tavern_id, resolved_visitor_id, character_id)
        else:
            _ensure_chat_scope(tavern, user_id, "", allow_owner_all=True)
            sessions = service.tavern_store.list_chat_sessions(tavern_id, character_id=character_id)
            history = [message for session in sessions for message in session.get("messages", [])]
        return {"messages": [m.to_dict() if hasattr(m, "to_dict") else m for m in history]}

    @router.delete("/api/chats/{tavern_id}/{character_id}")
    def delete_chat(request: Request, tavern_id: str, character_id: str, visitor_id: str = "") -> dict:
        """Delete chat history for a character."""
        user_id = _get_user_id(request)
        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        resolved_visitor_id = visitor_id or ("" if _is_tavern_owner_payload(tavern, user_id) else user_id)
        _ensure_chat_scope(tavern, user_id, resolved_visitor_id, allow_owner_all=True)
        deleted = service.tavern_store.delete_chat_history(
            tavern_id,
            visitor_id=resolved_visitor_id,
            character_id=character_id,
        )
        return {"ok": True, "deleted": deleted}

    # ─── Character Card Routes ──────────────────────────────────────────────

    @router.post("/api/characters/parse")
    def parse_character_card(data: dict = Body(...)) -> dict:
        """Parse a character card from JSON or base64."""
        from fablemap_api.core.char_card_parser import parse_character_card, CharacterCardParser
        import json

        source = data
        if "json" in data:
            source = data["json"]
        elif "base64" in data:
            import base64
            decoded = base64.b64decode(data["base64"])
            # Try as PNG first
            if decoded[:4] == b"\x89PNG":
                parser = CharacterCardParser()
                result = parser.parse_png(decoded)
                if result:
                    return {
                        "name": result.name,
                        "description": result.description,
                        "personality": result.personality,
                        "scenario": result.scenario,
                        "system_prompt": result.system_prompt,
                        "first_mes": result.first_mes,
                        "mes_example": result.mes_example,
                        "alternate_greetings": result.alternate_greetings,
                        "tags": result.tags,
                        "sprites": result.sprites,
                        "world_info": result.world_info,
                        "source_format": result.source_format,
                    }
            else:
                source = json.loads(decoded.decode("utf-8"))

        try:
            char = parse_character_card(source)
            return {
                "name": char.name,
                "description": char.description,
                "personality": char.personality,
                "scenario": char.scenario,
                "system_prompt": char.system_prompt,
                "first_mes": char.first_mes,
                "mes_example": char.mes_example,
                "alternate_greetings": char.alternate_greetings,
                "tags": char.tags,
                "sprites": char.sprites,
                "world_info": char.world_info,
                "source_format": char.source_format,
            }
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    @router.post("/api/characters/export")
    def export_character_card(data: dict = Body(...)) -> dict:
        """Export a character to SillyTavern format."""
        from fablemap_api.core.char_card_parser import parse_character_card, export_character_card

        char_data = data.get("character", {})
        format_type = data.get("format", "v2")
        try:
            char = parse_character_card(char_data)
            result = export_character_card(char, format_type)
            return result
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    # ===== WorldInfo API =====
    @router.get("/api/worldinfo")
    def list_worldinfos(request: Request) -> dict:
        """List all WorldInfo entries."""
        user_id = _get_user_id(request)
        taverns = service.list_taverns(user_id)
        all_entries = []
        for tavern in taverns:
            tavern_data = service.get_tavern(tavern["id"], user_id)
            world_info = tavern_data.get("world_info", [])
            for entry in world_info:
                entry["tavern_id"] = tavern["id"]
                all_entries.append(entry)
        return {"world_info": all_entries}

    @router.post("/api/worldinfo")
    def create_worldinfo(request: Request, data: dict = Body(...)) -> dict:
        """Create a new WorldInfo entry."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        entry_data = {
            "id": data.get("id", f"wi_{uuid.uuid4().hex[:8]}"),
            "keys": data.get("keys", []),
            "keys_secondary": data.get("keys_secondary", []),
            "content": data.get("content", ""),
            "constant": data.get("constant", False),
            "selective": data.get("selective", True),
            "insertion_order": data.get("insertion_order", 50),
            "depth": data.get("depth", 4),
            "probability": data.get("probability", 100),
            "disable": data.get("disable", False),
        }
        tavern_data = service.get_tavern(tavern_id, user_id)
        world_info = tavern_data.get("world_info", [])
        world_info.append(entry_data)
        service.update_tavern(tavern_id, {"world_info": world_info}, user_id)
        return {"ok": True, "entry": entry_data}

    @router.put("/api/worldinfo/{entry_id}")
    def update_worldinfo(request: Request, entry_id: str, data: dict = Body(...)) -> dict:
        """Update a WorldInfo entry."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern_data = service.get_tavern(tavern_id, user_id)
        world_info = tavern_data.get("world_info", [])
        for i, entry in enumerate(world_info):
            if entry.get("id") == entry_id:
                world_info[i].update(data)
                break
        service.update_tavern(tavern_id, {"world_info": world_info}, user_id)
        return {"ok": True}

    @router.delete("/api/worldinfo/{entry_id}")
    def delete_worldinfo(request: Request, entry_id: str, data: dict = Body(...)) -> dict:
        """Delete a WorldInfo entry."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern_data = service.get_tavern(tavern_id, user_id)
        world_info = tavern_data.get("world_info", [])
        world_info = [e for e in world_info if e.get("id") != entry_id]
        service.update_tavern(tavern_id, {"world_info": world_info}, user_id)
        return {"ok": True}

    @router.post("/api/worldinfo/test")
    def test_worldinfo_hit(request: Request, data: dict = Body(...)) -> dict:
        """
        Test which WorldInfo entries match a given message.
        No LLM involved — pure keyword/regex matching.
        """
        import re as _re

        tavern_id = data.get("tavern_id", "")
        test_text = data.get("text", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})
        if not test_text.strip():
            return JSONResponse(status_code=400, content={"error": "text is required"})

        user_id = _get_user_id(request)
        tavern_data = service.get_tavern(tavern_id, user_id)
        world_info = tavern_data.get("world_info", [])

        text_lower = test_text.lower()
        results = []

        for entry in world_info:
            entry_id = entry.get("id", "")
            keys = entry.get("keys", [])
            keys_secondary = entry.get("keys_secondary", [])
            constant = entry.get("constant", False)
            selective = entry.get("selective", True)
            regex_scan = entry.get("regex_scan", False)
            regex_pattern = entry.get("regex_pattern", "")
            depth = entry.get("depth", 4)
            insertion_order = entry.get("insertion_order", entry.get("order", 50))
            probability = entry.get("probability", 100)
            disable = entry.get("disable", False)
            content_preview = str(entry.get("content", "") or "").strip()
            if content_preview and len(content_preview) > 120:
                content_preview = content_preview[:120] + "..."

            if disable:
                results.append({
                    "id": entry_id,
                    "title": keys[0] if keys else ("常驻设定" if constant else "未命名条目"),
                    "matched": False,
                    "reason": "已暂停",
                    "constant": constant,
                    "order": insertion_order,
                    "depth": depth,
                    "probability": probability,
                    "content_preview": content_preview,
                    "matched_keys": [],
                })
                continue

            matched = False
            matched_keys = []
            matched_secondary = []
            reason = ""

            if constant:
                matched = True
                reason = "常驻条目，每轮都注入"
            elif regex_scan and regex_pattern:
                try:
                    pattern = _re.compile(regex_pattern, _re.IGNORECASE)
                    if pattern.search(test_text):
                        matched = True
                        matched_keys.append(f"regex:{regex_pattern[:40]}")
                        reason = f"正则匹配 {regex_pattern[:40]}"
                except _re.error as ex:
                    reason = f"正则表达式错误: {ex}"
            else:
                all_keys = keys + keys_secondary
                primary_keys = keys

                if selective:
                    # All keys must match
                    all_matched = True
                    for k in all_keys:
                        kl = k.lower()
                        if kl in text_lower:
                            if k in primary_keys:
                                matched_keys.append(k)
                            else:
                                matched_secondary.append(k)
                        else:
                            all_matched = False
                            break
                    if all_matched:
                        matched = True
                        reason = f"全部关键词命中（{len(all_keys)} 个）"
                else:
                    # Any primary key matches
                    for k in primary_keys:
                        kl = k.lower()
                        if kl in text_lower:
                            matched = True
                            matched_keys.append(k)
                            break
                    if matched:
                        reason = f"主关键词命中"

            results.append({
                "id": entry_id,
                "title": keys[0] if keys else ("常驻设定" if constant else "未命名条目"),
                "matched": matched,
                "reason": reason or ("未命中" if not matched else ""),
                "constant": constant,
                "order": insertion_order,
                "depth": depth,
                "probability": probability,
                "content_preview": content_preview,
                "matched_keys": matched_keys,
                "matched_secondary": matched_secondary,
            })

        # Sort: matched first, then by insertion order
        results.sort(key=lambda r: (-int(r["matched"]), r["order"]))

        return {
            "text": test_text,
            "total": len(results),
            "matched_count": sum(1 for r in results if r["matched"]),
            "results": results,
        }

    # ===== Tokenizer API =====
    @router.get("/api/tokenizers")
    def list_tokenizers() -> dict:
        """List available tokenizers."""
        from fablemap_api.core.token_counter import TokenCounter

        tokenizers = ["cl100k_base", "o200k_base", "p50k_base", "p50k_edit", "r50k_base"]
        return {"tokenizers": tokenizers}

    @router.post("/api/tokenizers/count")
    def count_tokens(data: dict = Body(...)) -> dict:
        """Count tokens in text."""
        from fablemap_api.core.token_counter import TokenCounter

        text = data.get("text", "")
        backend = data.get("backend", "cl100k_base")
        try:
            counter = TokenCounter(backend)
            tokens = counter.encode(text)
            return {"count": len(tokens), "backend": backend}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    @router.post("/api/tokenizers/count_messages")
    def count_message_tokens(data: dict = Body(...)) -> dict:
        """Count tokens in messages."""
        from fablemap_api.core.token_counter import TokenCounter

        messages = data.get("messages", [])
        backend = data.get("backend", "cl100k_base")
        try:
            counter = TokenCounter(backend)
            total = 0
            for msg in messages:
                content = msg.get("content", "")
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict):
                            content = c.get("text", str(c))
                total += len(counter.encode(str(content)))
            return {"count": total, "backend": backend}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    return router


def _request_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _get_user_id(request: Request) -> str:
    """Extract user ID from request headers. For now returns empty string (anonymous)."""
    return request.headers.get("X-User-Id", "") or ""


def _is_tavern_owner_payload(tavern_data: dict | None, user_id: str) -> bool:
    return bool(tavern_data and user_id and tavern_data.get("owner_id") == user_id)


def _ensure_chat_scope(
    tavern_data: dict | None,
    user_id: str,
    visitor_id: str,
    *,
    allow_owner_all: bool = False,
    compatibility_body_visitor_allowed: bool = False,
) -> None:
    """Allow chat access only for the session visitor or the tavern owner."""
    if not tavern_data:
        raise HTTPException(status_code=404, detail="Tavern not found")
    if _is_tavern_owner_payload(tavern_data, user_id):
        if visitor_id or allow_owner_all:
            return
    if user_id and visitor_id and user_id == visitor_id:
        return
    if compatibility_body_visitor_allowed and visitor_id and not user_id:
        return
    raise HTTPException(status_code=403, detail="不能访问其他访客的聊天记录")


def _utc_timestamp() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ─── Expression Inference (keyword-based fallback) ─────────────────────────

def _infer_expression_keyword(text: str) -> str:
    """Infer expression from text using keyword matching (fallback when no LLM)"""
    text_lower = text.lower()

    # 正面情绪关键词
    positive_keywords = {
        "joy": ["开心", "高兴", "快乐", "太好了", "棒", "喜欢", "幸福", "哈哈", "真好", "joy", "happy", "glad", "wonderful"],
        "admiration": ["佩服", "钦佩", "羡慕", "崇拜", "厉害", "优秀", "棒极了", "admire", "respect", "impressive"],
        "amusement": ["好玩", "有趣", "逗", "笑", "有意思", "amusing", "funny", "laugh", "haha"],
        "approval": ["好", "对", "不错", "可以", "赞同", "同意", "approve", "good", "right", "agree"],
        "caring": ["关心", "担心", "照顾", "心疼", "关爱", "care", "worry", "concerned", "love"],
        "desire": ["想要", "希望", "想", "渴望", "期盼", "desire", "want", "wish", "hope", "miss"],
        "excitement": ["激动", "兴奋", "期待", "太棒了", "excited", "exciting", "thrilled", "eager"],
        "gratitude": ["谢谢", "感谢", "感激", "帮大忙", "thank", "thanks", "grateful", "appreciate"],
        "love": ["爱", "喜欢", "心", "想你", "love", "adore", "fond"],
        "optimism": ["一定会", "相信", "希望", "没问题", "乐观", "optimistic", "hopefully", "sure"],
        "pride": ["骄傲", "自豪", "得意", "厉害", "proud", "pride", "accomplished"],
        "relief": ["终于", "松口气", "放心", "安心", "relieved", "relief", "whew"],
    }

    # 负面情绪关键词
    negative_keywords = {
        "anger": ["生气", "愤怒", "讨厌", "滚", "气", "怒", "angry", "mad", "furious", "hate"],
        "annoyance": ["烦", "讨厌", "麻烦", "无聊", "annoyed", "irritated", "boring", "annoying"],
        "confusion": ["疑惑", "不懂", "奇怪", "怎么回事", "迷茫", "confused", "puzzled", "what"],
        "disappointment": ["失望", "可惜", "遗憾", "没希望", "disappointed", "sad", "unfortunate"],
        "disapproval": ["不对", "不行", "不同意", "反对", "disapprove", "wrong", "bad"],
        "disgust": ["恶心", "讨厌", "反感", "恶心", "disgusted", "gross", "nasty"],
        "embarrassment": ["尴尬", "不好意思", "丢脸", "脸红", "embarrassed", "awkward", "shy"],
        "fear": ["害怕", "担心", "恐惧", "怕", "恐怖", "fear", "afraid", "scared", "worried"],
        "grief": ["悲伤", "难过", "伤心", "哭", "悲痛", "grief", "sad", "cry", "upset"],
        "nervousness": ["紧张", "不安", "忐忑", "害怕", "nervous", "anxious", "tense"],
        "remorse": ["抱歉", "对不起", "后悔", "自责", "remorse", "sorry", "regret", "guilt"],
        "sadness": ["难过", "伤心", "悲伤", "痛苦", "sad", "unhappy", "depressed", "sorrow"],
    }

    # 中性情绪关键词
    neutral_keywords = {
        "curiosity": ["好奇", "想知道", "问问", "什么意思", "curious", "wonder", "ask"],
        "realization": ["原来", "竟然", "原来如此", "明白了", "realize", "oh", "now"],
        "surprise": ["惊讶", "意外", "吃惊", "没想到", "surprised", "amazing", "unexpected"],
        "neutral": ["嗯", "哦", "好的", "明白", "okay", "ok", "yes", "alright"],
    }

    # 检测情绪类别（优先顺序：正面 > 负面 > 中性）
    for emotion, keywords in positive_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                return emotion

    for emotion, keywords in negative_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                return emotion

    for emotion, keywords in neutral_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                return emotion

    # 默认返回 neutral
    return "neutral"
