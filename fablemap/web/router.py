from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Body, Form, Request
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
        mode: str = Form("live"),
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
        owner_id: str = "",
    ) -> dict:
        """List all taverns with optional location filter"""
        return service.list_taverns_payload(
            lat=lat, lon=lon, radius=radius, access=access, owner_id=owner_id
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

    @router.put("/api/taverns/{tavern_id}")
    def update_tavern(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Update a tavern"""
        user_id = _get_user_id(request)
        return service.update_tavern_payload(tavern_id, data, user_id)

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
    ) -> dict:
        """Get chat history for a tavern"""
        return service.tavern_chat_history_payload(tavern_id, visitor_id, character_id)

    @router.post("/api/taverns/{tavern_id}/chat")
    def post_tavern_chat(
        request: Request,
        tavern_id: str,
        character_id: str = Body(...),
        message: str = Body(...),
        visitor_id: str = Body(...),
    ) -> dict:
        """Send a chat message and get AI response"""
        return service.tavern_chat_payload(tavern_id, character_id, message, visitor_id)

    @router.post("/api/taverns/{tavern_id}/test-llm")
    def test_llm(request: Request, tavern_id: str, data: dict = Body(...)) -> dict:
        """Test LLM configuration"""
        return service.test_llm_payload(tavern_id, data)

    # ─── Expression Routes ──────────────────────────────────────────────

    @router.get("/api/expressions")
    def list_expressions() -> dict:
        """List all standard SillyTavern expressions"""
        from fablemap.tavern import STANDARD_EXPRESSIONS, EXPRESSION_CATEGORIES
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
        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        char = next((c for c in tavern.get("characters", []) if c.get("id") == char_id), None)
        if char is None:
            return JSONResponse(status_code=404, content={"error": "Character not found"})

        from fablemap.tavern import TavernSpriteSet
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
        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        char = next((c for c in tavern.get("characters", []) if c.get("id") == char_id), None)
        if char is None:
            return JSONResponse(status_code=404, content={"error": "Character not found"})

        # Update sprites
        new_sprites = data.get("sprites", {})
        char["sprites"] = new_sprites
        service.update_tavern(tavern_id, {"characters": tavern.get("characters", [])}, user_id)
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

        from fablemap.tavern import STANDARD_EXPRESSIONS
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
                from fablemap.llm_clients import create_client, LLMConfig
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

    # ─── Legacy Routes (backward compatibility) ─────────────────────────

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
        from fablemap.tts_clients import TTSConfig, list_provider_voices
        config = TTSConfig(provider=provider, api_key=api_key)
        try:
            voices = list_provider_voices(provider, api_key)
            return {"voices": [{"id": v.id, "name": v.name, "gender": v.gender, "language": v.language} for v in voices]}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    @router.post("/api/tts/synthesize")
    def synthesize_speech(request: Request, data: dict = Body(...)) -> FileResponse:
        """Synthesize speech from text."""
        from fablemap.tts_clients import TTSConfig, create_tts_provider

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
        from fablemap.tts_clients import list_available_providers
        return {"providers": list_available_providers()}

    # ─── Image Generation Routes ─────────────────────────────────────────────

    @router.post("/api/image/generate")
    def generate_image(request: Request, data: dict = Body(...)) -> dict:
        """Generate an image from text prompt."""
        from fablemap.sd_clients import ImageGenConfig, create_image_client

        provider = data.get("provider", "automatic1111")
        base_url = data.get("base_url", "http://127.0.0.1:7860")
        prompt = data.get("prompt", "")
        negative_prompt = data.get("negative_prompt", "")
        steps = data.get("steps", 25)
        cfg_scale = data.get("cfg_scale", 7.0)
        width = data.get("width", 512)
        height = data.get("height", 512)
        seed = data.get("seed", -1)
        sampler = data.get("sampler", "Euler a")

        if not prompt:
            return JSONResponse(status_code=400, content={"error": "No prompt provided"})

        config = ImageGenConfig(
            provider=provider,
            base_url=base_url,
            negative_prompt=negative_prompt,
            steps=steps,
            cfg_scale=cfg_scale,
            width=width,
            height=height,
            seed=seed,
            sampler=sampler,
        )
        try:
            client = create_image_client(config)
            if hasattr(client, "txt2img"):
                result = client.txt2img(prompt)
            else:
                result = client.generate(prompt)

            # Encode images as base64
            import base64
            images_b64 = [base64.b64encode(img).decode("utf-8") for img in result.images]
            return {
                "images": images_b64,
                "seed": result.seed,
                "provider": result.provider,
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @router.get("/api/image/models")
    def list_image_models(base_url: str = "http://127.0.0.1:7860") -> dict:
        """List available SD models from Automatic1111."""
        from fablemap.sd_clients import Automatic1111Client, ImageGenConfig
        config = ImageGenConfig(provider="automatic1111", base_url=base_url)
        try:
            client = Automatic1111Client(config)
            models = client.get_models()
            samplers = client.get_samplers()
            return {"models": models, "samplers": samplers}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Translation Routes ─────────────────────────────────────────────────

    @router.post("/api/translate")
    def translate_text(data: dict = Body(...)) -> dict:
        """Translate text between languages."""
        from fablemap.translate import create_translator, translate

        text = data.get("text", "")
        source = data.get("source_lang", "auto")
        target = data.get("target_lang", "en")
        provider = data.get("provider", "google")
        api_key = data.get("api_key", "")

        if not text:
            return JSONResponse(status_code=400, content={"error": "No text provided"})

        try:
            result = translate(text, source, target, provider, api_key)
            return {
                "translated_text": result.translated_text,
                "source_language": result.source_language,
                "target_language": result.target_language,
                "provider": result.provider,
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @router.post("/api/translate/detect")
    def detect_language(data: dict = Body(...)) -> dict:
        """Detect the language of text."""
        from fablemap.translate import create_translator
        text = data.get("text", "")
        provider = data.get("provider", "google")
        api_key = data.get("api_key", "")

        try:
            t = create_translator(provider, api_key)
            lang = t.detect_language(text)
            return {"detected_language": lang}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Vector Embedding Routes ────────────────────────────────────────────

    @router.post("/api/embed")
    def embed_texts(data: dict = Body(...)) -> dict:
        """Generate embeddings for texts."""
        from fablemap.vectors import EmbeddingConfig, create_embedder

        texts = data.get("texts", [])
        provider = data.get("provider", "openai")
        api_key = data.get("api_key", "")
        model = data.get("model", "text-embedding-3-small")

        if not texts:
            return JSONResponse(status_code=400, content={"error": "No texts provided"})

        config = EmbeddingConfig(provider=provider, api_key=api_key, model=model)
        try:
            embedder = create_embedder(config)
            embeddings = embedder.embed(texts)
            return {"embeddings": embeddings, "model": model}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Memory Routes ─────────────────────────────────────────────────────

    @router.post("/api/memory/summarize")
    def summarize_chat(request: Request, data: dict = Body(...)) -> dict:
        """Summarize chat history."""
        from fablemap.memory import ChatSummarizer

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
        from fablemap.memory import HistoryTruncator
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
        from fablemap.memory import ImportanceScorer
        messages = data.get("messages", [])

        scorer = ImportanceScorer()
        scores = [{"index": i, "importance": scorer.score(msg)} for i, msg in enumerate(messages)]
        return {"scores": scores}

    # ─── Groups API ─────────────────────────────────────────────────────────
    @router.post("/api/groups")
    def create_group(request: Request, data: dict = Body(...)) -> dict:
        """Create a new group chat."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        group_id = f"grp_{uuid.uuid4().hex[:8]}"
        group_data = {
            "id": group_id,
            "name": data.get("name", "New Group"),
            "description": data.get("description", ""),
            "member_ids": data.get("member_ids", []),
            "strategy": data.get("strategy", "balanced"),
            "created_at": data.get("created_at", ""),
            "created_by": user_id,
        }
        tavern_data = service.get_tavern(tavern_id, user_id)
        groups = tavern_data.get("groups", [])
        groups.append(group_data)
        service.update_tavern(tavern_id, {"groups": groups}, user_id)
        return {"ok": True, "group": group_data}

    @router.get("/api/groups")
    def list_groups(request: Request, tavern_id: str = "") -> dict:
        """List all groups."""
        user_id = _get_user_id(request)
        if tavern_id:
            tavern = service.get_tavern(tavern_id, user_id)
            groups = tavern.get("groups", []) if tavern else []
        else:
            all_taverns = service.list_taverns(user_id)
            groups = []
            for t in all_taverns:
                t_data = service.get_tavern(t["id"], user_id)
                groups.extend([{**g, "tavern_id": t["id"]} for g in t_data.get("groups", [])])
        return {"groups": groups}

    @router.get("/api/groups/{group_id}")
    def get_group(request: Request, group_id: str) -> dict:
        """Get a group by ID."""
        user_id = _get_user_id(request)
        all_taverns = service.list_taverns(user_id)
        for t in all_taverns:
            t_data = service.get_tavern(t["id"], user_id)
            for g in t_data.get("groups", []):
                if g.get("id") == group_id:
                    g["tavern_id"] = t["id"]
                    return {"group": g}
        return JSONResponse(status_code=404, content={"error": "Group not found"})

    @router.put("/api/groups/{group_id}")
    def update_group(request: Request, group_id: str, data: dict = Body(...)) -> dict:
        """Update a group."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern_data = service.get_tavern(tavern_id, user_id)
        groups = tavern_data.get("groups", [])
        for i, g in enumerate(groups):
            if g.get("id") == group_id:
                groups[i].update(data)
                groups[i]["id"] = group_id
                break
        service.update_tavern(tavern_id, {"groups": groups}, user_id)
        return {"ok": True}

    @router.delete("/api/groups/{group_id}")
    def delete_group(request: Request, group_id: str, data: dict = Body(...)) -> dict:
        """Delete a group."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern_data = service.get_tavern(tavern_id, user_id)
        groups = tavern_data.get("groups", [])
        groups = [g for g in groups if g.get("id") != group_id]
        service.update_tavern(tavern_id, {"groups": groups}, user_id)
        return {"ok": True}

    # ─── Chats API ──────────────────────────────────────────────────────────
    @router.get("/api/chats")
    def list_chats(request: Request, tavern_id: str = "", character_id: str = "") -> dict:
        """List all chat sessions."""
        user_id = _get_user_id(request)
        if tavern_id:
            tavern = service.get_tavern(tavern_id, user_id)
            chats = []
            for char in tavern.get("characters", []):
                char_id = char.get("id", "")
                history = service.tavern_store.get_chat_history(tavern_id, char_id)
                if history:
                    chats.append({
                        "tavern_id": tavern_id,
                        "character_id": char_id,
                        "character_name": char.get("name", ""),
                        "message_count": len(history),
                        "last_message": history[-1].get("content", "")[:100] if history else "",
                        "updated_at": history[-1].get("timestamp", "") if history else "",
                    })
            return {"chats": chats}
        else:
            all_taverns = service.list_taverns(user_id)
            all_chats = []
            for t in all_taverns:
                t_data = service.get_tavern(t["id"], user_id)
                for char in t_data.get("characters", []):
                    history = service.tavern_store.get_chat_history(t["id"], char.get("id", ""))
                    if history:
                        all_chats.append({
                            "tavern_id": t["id"],
                            "character_id": char.get("id", ""),
                            "character_name": char.get("name", ""),
                            "message_count": len(history),
                            "last_message": history[-1].get("content", "")[:100] if history else "",
                        })
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

        from fablemap.tavern import ChatMessage
        for msg_data in messages:
            msg = ChatMessage.from_dict(msg_data)
            service.tavern_store.add_chat_message(msg)

        return {"ok": True, "saved": len(messages)}

    @router.get("/api/chats/{tavern_id}/{character_id}")
    def get_chat(request: Request, tavern_id: str, character_id: str) -> dict:
        """Get chat history for a character."""
        user_id = _get_user_id(request)
        history = service.tavern_store.get_chat_history(tavern_id, character_id)
        return {"messages": [m.to_dict() if hasattr(m, "to_dict") else m for m in history]}

    @router.delete("/api/chats/{tavern_id}/{character_id}")
    def delete_chat(request: Request, tavern_id: str, character_id: str) -> dict:
        """Delete chat history for a character."""
        user_id = _get_user_id(request)
        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        tavern_data = service.get_tavern(tavern_id, user_id)
        history = service.tavern_store.get_chat_history(tavern_id, character_id)
        # Clear by saving empty
        from fablemap.tavern import ChatMessage
        service.tavern_store.chat_history = {}
        return {"ok": True}

    @router.post("/api/chats/import")
    def import_chat(request: Request, data: dict = Body(...)) -> dict:
        """Import chat history."""
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        messages = data.get("messages", [])
        user_id = _get_user_id(request)

        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        from fablemap.tavern import ChatMessage
        count = 0
        for msg_data in messages:
            msg = ChatMessage.from_dict(msg_data)
            service.tavern_store.add_chat_message(msg)
            count += 1

        return {"ok": True, "imported": count}

    @router.post("/api/chats/export")
    def export_chat(request: Request, data: dict = Body(...)) -> dict:
        """Export chat history."""
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        format_type = data.get("format", "json")

        history = service.tavern_store.get_chat_history(tavern_id, character_id)
        if format_type == "json":
            return {"messages": [m.to_dict() if hasattr(m, "to_dict") else m for m in history]}
        elif format_type == "text":
            lines = []
            for m in history:
                d = m.to_dict() if hasattr(m, "to_dict") else m
                role = d.get("role", "?")
                content = d.get("content", "")
                lines.append(f"{role}: {content}")
            return {"text": "\n".join(lines)}
        return JSONResponse(status_code=400, content={"error": "Unknown format"})

    @router.post("/api/chats/search")
    def search_chats(request: Request, data: dict = Body(...)) -> dict:
        """Search chat history."""
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        query = data.get("query", "").lower()

        history = service.tavern_store.get_chat_history(tavern_id, character_id)
        results = []
        for i, m in enumerate(history):
            d = m.to_dict() if hasattr(m, "to_dict") else m
            content = str(d.get("content", "")).lower()
            if query in content:
                results.append({"index": i, "message": d})
        return {"results": results, "count": len(results)}

    # ─── Bookmarks API ─────────────────────────────────────────────────────
    @router.get("/api/bookmarks")
    def list_bookmarks(request: Request, tavern_id: str = "") -> dict:
        """List all bookmarks."""
        user_id = _get_user_id(request)
        if tavern_id:
            tavern = service.get_tavern(tavern_id, user_id)
            return {"bookmarks": tavern.get("bookmarks", []) if tavern else []}
        else:
            all_taverns = service.list_taverns(user_id)
            all_bookmarks = []
            for t in all_taverns:
                t_data = service.get_tavern(t["id"], user_id)
                for bm in t_data.get("bookmarks", []):
                    bm["tavern_id"] = t["id"]
                    all_bookmarks.append(bm)
            return {"bookmarks": all_bookmarks}

    @router.post("/api/bookmarks")
    def create_bookmark(request: Request, data: dict = Body(...)) -> dict:
        """Create a bookmark."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        bookmark = {
            "id": f"bm_{uuid.uuid4().hex[:8]}",
            "message_id": data.get("message_id", ""),
            "character_id": data.get("character_id", ""),
            "content": data.get("content", ""),
            "note": data.get("note", ""),
            "tags": data.get("tags", []),
            "created_at": data.get("created_at", ""),
        }
        if tavern_id:
            tavern_data = service.get_tavern(tavern_id, user_id)
            bookmarks = tavern_data.get("bookmarks", [])
            bookmarks.append(bookmark)
            service.update_tavern(tavern_id, {"bookmarks": bookmarks}, user_id)
        return {"ok": True, "bookmark": bookmark}

    @router.delete("/api/bookmarks/{bookmark_id}")
    def delete_bookmark(request: Request, bookmark_id: str, data: dict = Body(...)) -> dict:
        """Delete a bookmark."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})
        tavern_data = service.get_tavern(tavern_id, user_id)
        bookmarks = tavern_data.get("bookmarks", [])
        bookmarks = [b for b in bookmarks if b.get("id") != bookmark_id]
        service.update_tavern(tavern_id, {"bookmarks": bookmarks}, user_id)
        return {"ok": True}

    # ─── Chat Templates API ────────────────────────────────────────────────
    @router.get("/api/templates")
    def list_templates(request: Request) -> dict:
        """List all chat templates."""
        user_id = _get_user_id(request)
        tavern_id = request.query_params.get("tavern_id", "")
        if tavern_id:
            tavern = service.get_tavern(tavern_id, user_id)
            return {"templates": tavern.get("chat_templates", []) if tavern else []}
        return {"templates": []}

    @router.post("/api/templates")
    def create_template(request: Request, data: dict = Body(...)) -> dict:
        """Create a chat template."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        template = {
            "id": f"tmpl_{uuid.uuid4().hex[:8]}",
            "name": data.get("name", "New Template"),
            "prompt": data.get("prompt", ""),
            "variables": data.get("variables", []),
            "created_at": data.get("created_at", ""),
        }
        if tavern_id:
            tavern_data = service.get_tavern(tavern_id, user_id)
            templates = tavern_data.get("chat_templates", [])
            templates.append(template)
            service.update_tavern(tavern_id, {"chat_templates": templates}, user_id)
        return {"ok": True, "template": template}

    @router.delete("/api/templates/{template_id}")
    def delete_template(request: Request, template_id: str, data: dict = Body(...)) -> dict:
        """Delete a chat template."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})
        tavern_data = service.get_tavern(tavern_id, user_id)
        templates = tavern_data.get("chat_templates", [])
        templates = [t for t in templates if t.get("id") != template_id]
        service.update_tavern(tavern_id, {"chat_templates": templates}, user_id)
        return {"ok": True}

    # ─── Backups API ──────────────────────────────────────────────────────
    @router.get("/api/backups")
    def list_backups(request: Request, tavern_id: str = "") -> dict:
        """List chat backups."""
        user_id = _get_user_id(request)
        backup_dir = service.settings.output_root / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(backup_dir.glob("*.json"), reverse=True)[:20]
        return {"backups": [{"name": f.name, "size": f.stat().st_size, "modified": f.stat().st_mtime} for f in files]}

    @router.post("/api/backups/create")
    def create_backup(request: Request, data: dict = Body(...)) -> dict:
        """Create a backup of a tavern's chat history."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        if not tavern_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id is required"})

        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        backup_dir = service.settings.output_root / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"backup_{tavern_id}_{timestamp}.json"
        import json
        backup_file.write_text(json.dumps(tavern, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"ok": True, "backup_file": str(backup_file)}

    @router.post("/api/backups/restore")
    def restore_backup(request: Request, data: dict = Body(...)) -> dict:
        """Restore from a backup."""
        user_id = _get_user_id(request)
        backup_path = data.get("backup_path", "")
        tavern_id = data.get("tavern_id", "")
        import json
        try:
            content = Path(backup_path).read_text(encoding="utf-8")
            backup_data = json.loads(content)
            if tavern_id:
                service.update_tavern(tavern_id, backup_data, user_id)
            return {"ok": True}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    # ─── Autocomplete API ─────────────────────────────────────────────────
    @router.post("/api/autocomplete")
    def autocomplete(data: dict = Body(...)) -> dict:
        """Autocomplete macro or world info entry."""
        query = data.get("query", "")
        category = data.get("category", "all")

        results = []
        if category in ("all", "macro"):
            from fablemap.world_info_injector import MacroSubstitutor
            substitutor = MacroSubstitutor({})
            macros = substitutor.get_all_macros()
            for name, desc in macros:
                if query.lower() in name.lower():
                    results.append({"type": "macro", "name": name, "description": desc})

        if category in ("all", "worldinfo"):
            if category == "all":
                results.append({"type": "worldinfo", "note": "Add tavern_id parameter for world info search"})
            else:
                tavern_id = data.get("tavern_id", "")
                if tavern_id:
                    tavern = service.get_tavern(tavern_id, "")
                    for entry in tavern.get("world_info", []):
                        for key in entry.get("keys", []):
                            if query.lower() in key.lower():
                                results.append({"type": "worldinfo", "key": key, "content": entry.get("content", "")[:50]})

        return {"results": results[:20]}

    # ─── STT (Speech-to-Text) API ─────────────────────────────────────────
    @router.post("/api/speech/transcribe")
    def transcribe_audio(request: Request, data: dict = Body(...)) -> dict:
        """Transcribe audio to text using Whisper."""
        audio_data = data.get("audio_data", "")
        model = data.get("model", "base")
        language = data.get("language", "")

        if not audio_data:
            return JSONResponse(status_code=400, content={"error": "audio_data is required (base64)"})

        try:
            import base64
            audio_bytes = base64.b64decode(audio_data)
            import tempfile, os
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(audio_bytes)
                audio_path = f.name

            try:
                from fablemap.stt_service import transcribe_audio
                text = transcribe_audio(audio_path, model=model, language=language or None)
                return {"text": text, "model": model}
            finally:
                os.unlink(audio_path)
        except ImportError:
            return JSONResponse(status_code=501, content={"error": "STT service not available (install openai-whisper)"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Caption (Image-to-Text) API ──────────────────────────────────────
    @router.post("/api/caption")
    def caption_image(data: dict = Body(...)) -> dict:
        """Generate a caption/description for an image."""
        image_data = data.get("image_data", "")
        model = data.get("model", "gpt-4o-mini")
        prompt = data.get("prompt", "Describe this image in detail for use in an AI roleplay context.")

        if not image_data:
            return JSONResponse(status_code=400, content={"error": "image_data is required (base64 or URL)"})

        try:
            from fablemap.llm_clients import create_client, LLMConfig
            llm_config = LLMConfig(backend="openai", model=model)
            client = create_client(llm_config)

            # Build image message
            content = [{"type": "text", "text": prompt}]
            if image_data.startswith("http"):
                content.append({"type": "image_url", "image_url": {"url": image_data}})
            else:
                import base64
                content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"})

            response = client.chat([{"role": "user", "content": content}])
            return {"caption": response, "model": model}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Chat Generation API ───────────────────────────────────────────────
    @router.post("/api/generate")
    def generate_response(request: Request, data: dict = Body(...)) -> dict:
        """Generate an AI response given a prompt."""
        user_id = _get_user_id(request)
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        messages = data.get("messages", [])
        preset_id = data.get("preset_id", "")

        if not tavern_id or not character_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id and character_id are required"})

        tavern = service.get_tavern(tavern_id, user_id)
        if tavern is None:
            return JSONResponse(status_code=404, content={"error": "Tavern not found"})

        character = None
        for c in tavern.get("characters", []):
            if c.get("id") == character_id:
                character = c
                break
        if character is None:
            return JSONResponse(status_code=404, content={"error": "Character not found"})

        # Get LLM config
        llm_config = service.tavern_store.get_llm_config(tavern_id)
        if llm_config is None:
            return JSONResponse(status_code=400, content={"error": "LLM not configured for this tavern"})

        from fablemap.llm_clients import create_client
        client = create_client(llm_config)

        # Build system prompt from character
        system_prompt = character.get("system_prompt", "")
        if not system_prompt:
            name = character.get("name", "Character")
            personality = character.get("personality", "")
            scenario = character.get("scenario", "")
            system_prompt = f"You are {name}. {personality} {scenario}".strip()

        # Inject WorldInfo
        from fablemap.world_info_injector import WorldInfoInjector
        last_message = messages[-1]["content"] if messages else ""
        injector = WorldInfoInjector(tavern.get("world_info", []))
        world_context = injector.inject(last_message)

        full_system = system_prompt
        if world_context:
            full_system += f"\n\n## World Context:\n{world_context}"

        # Build messages
        from fablemap.prompt_builder import PromptBuilder, PromptBuildConfig
        pb = PromptBuilder()
        config = PromptBuildConfig(
            system_prompt=full_system,
            char_name=character.get("name", "Character"),
            user_name="旅人",
        )
        formatted_messages = pb.format_messages(messages, config)

        # Add system prompt
        formatted_messages = [{"role": "system", "content": full_system}] + formatted_messages

        try:
            response = client.chat(formatted_messages)
            return {"response": response, "model": llm_config.model}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    # ─── Bulk Edit API ─────────────────────────────────────────────────────
    @router.post("/api/bulkedit")
    def bulk_edit_messages(data: dict = Body(...)) -> dict:
        """Bulk edit messages in a chat history."""
        tavern_id = data.get("tavern_id", "")
        character_id = data.get("character_id", "")
        operations = data.get("operations", [])

        if not tavern_id or not character_id:
            return JSONResponse(status_code=400, content={"error": "tavern_id and character_id are required"})

        history = service.tavern_store.get_chat_history(tavern_id, character_id)
        from fablemap.tavern import ChatMessage

        updated = 0
        for op in operations:
            index = op.get("index")
            action = op.get("action")
            if action == "replace":
                content = op.get("content")
                if 0 <= index < len(history):
                    msg = history[index]
                    msg_dict = msg.to_dict() if hasattr(msg, "to_dict") else msg
                    msg_dict["content"] = content
                    history[index] = ChatMessage.from_dict(msg_dict)
                    updated += 1
            elif action == "delete":
                if 0 <= index < len(history):
                    history.pop(index)
                    updated += 1

        return {"ok": True, "updated": updated}

    # ─── Quick Reply Routes ────────────────────────────────────────────────

    @router.get("/api/quickreplies")
    def list_quick_replies(request: Request) -> dict:
        """List all quick replies."""
        qrm = service.get_quick_reply_manager()
        categories = []
        for cat in qrm.get_all():
            categories.append({
                "name": cat.name,
                "replies": [
                    {
                        "id": r.id,
                        "title": r.title,
                        "content": r.content,
                        "shortcut": r.shortcut,
                    }
                    for r in cat.replies
                ],
            })
        return {"categories": categories}

    @router.post("/api/quickreplies")
    def create_quick_reply(request: Request, data: dict = Body(...)) -> dict:
        """Create a new quick reply."""
        from fablemap.quick_replies import QuickReply
        qrm = service.get_quick_reply_manager()
        reply = QuickReply(
            title=data.get("title", ""),
            content=data.get("content", ""),
            category=data.get("category", "General"),
            shortcut=data.get("shortcut", ""),
            variable_fields=data.get("variable_fields", []),
        )
        qrm.add_reply(reply, reply.category)
        return {"id": reply.id, "created": True}

    @router.post("/api/quickreplies/render")
    def render_quick_reply(data: dict = Body(...)) -> dict:
        """Render a quick reply with variable substitution."""
        qrm = service.get_quick_reply_manager()
        shortcut = data.get("shortcut", "")
        reply_id = data.get("id", "")
        char_name = data.get("char_name", "")
        user_name = data.get("user_name", "旅人")

        if reply_id:
            result = qrm.render_by_id(reply_id, char_name, user_name)
        elif shortcut:
            result = qrm.render_by_shortcut(shortcut, char_name, user_name)
        else:
            return JSONResponse(status_code=400, content={"error": "Need shortcut or id"})

        if result is None:
            return JSONResponse(status_code=404, content={"error": "Quick reply not found"})
        return {"rendered": result}

    # ─── Slash Commands Routes ──────────────────────────────────────────────

    @router.get("/api/commands")
    def list_commands() -> dict:
        """List all available slash commands."""
        cm = service.get_command_manager()
        return {"commands": cm.list_all()}

    @router.post("/api/commands/execute")
    def execute_command(request: Request, data: dict = Body(...)) -> dict:
        """Execute a slash command."""
        cm = service.get_command_manager()
        text = data.get("text", "")
        context = {
            "messages": data.get("messages", []),
            "character": data.get("character", {}),
            "user_name": data.get("user_name", "旅人"),
        }

        result = cm.execute(text, context)
        return {
            "success": result.success,
            "message": result.message,
            "action": result.action,
            "data": result.data,
        }

    # ─── Extension Routes ──────────────────────────────────────────────────

    @router.get("/api/extensions")
    def list_extensions() -> dict:
        """List all registered extensions."""
        em = service.get_extension_manager()
        extensions = []
        for ext in em.list_all():
            extensions.append({
                "id": ext.manifest.id,
                "name": ext.manifest.name,
                "description": ext.manifest.description,
                "version": ext.manifest.version,
                "enabled": ext.enabled,
                "settings_html": ext.manifest.settings_html,
            })
        return {"extensions": extensions}

    @router.post("/api/extensions/{ext_id}/enable")
    def enable_extension(ext_id: str) -> dict:
        """Enable an extension."""
        em = service.get_extension_manager()
        em.enable(ext_id)
        return {"enabled": True}

    @router.post("/api/extensions/{ext_id}/disable")
    def disable_extension(ext_id: str) -> dict:
        """Disable an extension."""
        em = service.get_extension_manager()
        em.disable(ext_id)
        return {"disabled": True}

    @router.get("/api/extensions/{ext_id}/settings")
    def get_extension_settings(ext_id: str) -> dict:
        """Get extension settings."""
        em = service.get_extension_manager()
        return {"settings": em.get_settings(ext_id)}

    @router.post("/api/extensions/{ext_id}/settings")
    def save_extension_settings(ext_id: str, data: dict = Body(...)) -> dict:
        """Save extension settings."""
        em = service.get_extension_manager()
        em.save_settings(ext_id, data)
        return {"saved": True}

    # ─── Group Chat Routes ─────────────────────────────────────────────────

    @router.post("/api/group/create")
    def create_group_chat(request: Request, data: dict = Body(...)) -> dict:
        """Create a new group chat session."""
        from fablemap.group_chat import GroupChatManager, GroupMember

        group_manager = GroupChatManager()
        for member_data in data.get("members", []):
            group_manager.add_member(GroupMember(
                character_id=member_data.get("character_id", ""),
                name=member_data.get("name", ""),
                talkativeness=member_data.get("talkativeness", 0.5),
                is_user=member_data.get("is_user", False),
                is_narrator=member_data.get("is_narrator", False),
            ))
        group_manager.strategy = data.get("strategy", "balanced")
        session_id = service.create_group_chat_session(group_manager)
        return {"session_id": session_id}

    @router.get("/api/group/{session_id}")
    def get_group_chat(session_id: str) -> dict:
        """Get a group chat session."""
        gm = service.get_group_chat_session(session_id)
        if not gm:
            return JSONResponse(status_code=404, content={"error": "Session not found"})
        return {
            "members": [{"id": m.character_id, "name": m.name, "talkativeness": m.talkativeness} for m in gm.members],
            "strategy": gm.strategy,
            "message_count": len(gm.messages),
        }

    @router.post("/api/group/{session_id}/add_member")
    def add_group_member(session_id: str, data: dict = Body(...)) -> dict:
        """Add a member to a group chat."""
        from fablemap.group_chat import GroupMember
        gm = service.get_group_chat_session(session_id)
        if not gm:
            return JSONResponse(status_code=404, content={"error": "Session not found"})
        gm.add_member(GroupMember(
            character_id=data.get("character_id", ""),
            name=data.get("name", ""),
            talkativeness=data.get("talkativeness", 0.5),
        ))
        return {"added": True}

    @router.post("/api/group/{session_id}/talkativeness")
    def set_talkativeness(session_id: str, data: dict = Body(...)) -> dict:
        """Set talkativeness for a member."""
        gm = service.get_group_chat_session(session_id)
        if not gm:
            return JSONResponse(status_code=404, content={"error": "Session not found"})
        gm.set_talkativeness(data.get("character_id", ""), data.get("value", 0.5))
        return {"updated": True}

    @router.post("/api/group/{session_id}/send")
    def send_group_message(session_id: str, request: Request, data: dict = Body(...)) -> dict:
        """Send a message in group chat and get responses."""
        from fablemap.group_chat import GroupMessage
        gm = service.get_group_chat_session(session_id)
        if not gm:
            return JSONResponse(status_code=404, content={"error": "Session not found"})

        content = data.get("message", "")
        user_id = _get_user_id(request)
        gm.add_user_message(content)

        # Select speakers and prepare context
        speakers = gm.select_next_speakers()
        responses = []
        for speaker in speakers:
            context = gm.format_for_llm(speaker.character_id)
            responses.append({
                "character_id": speaker.character_id,
                "name": speaker.name,
                "context": context,
            })

        return {"responses": responses, "speakers": [s.name for s in speakers]}

    # ─── Preset Routes ─────────────────────────────────────────────────────

    @router.get("/api/presets")
    def list_presets() -> dict:
        """List all LLM presets."""
        pm = service.get_preset_manager()
        presets = []
        for p in pm.list_all():
            presets.append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "backend": p.backend,
                "model": p.model,
                "temperature": p.temperature,
                "max_tokens": p.max_tokens,
                "is_default": p.is_default,
                "tags": p.tags,
            })
        return {"presets": presets}

    @router.post("/api/presets")
    def create_preset(data: dict = Body(...)) -> dict:
        """Create a new preset."""
        from fablemap.presets import LLMDefaultPreset
        pm = service.get_preset_manager()
        preset = LLMDefaultPreset(
            name=data.get("name", ""),
            description=data.get("description", ""),
            backend=data.get("backend", "openai"),
            model=data.get("model", ""),
            temperature=data.get("temperature", 1.0),
            max_tokens=data.get("max_tokens", 2048),
            top_p=data.get("top_p", 1.0),
            frequency_penalty=data.get("frequency_penalty", 0.0),
            presence_penalty=data.get("presence_penalty", 0.0),
        )
        preset_id = pm.create(preset)
        return {"id": preset_id, "created": True}

    @router.get("/api/presets/{preset_id}")
    def get_preset(preset_id: str) -> dict:
        """Get a preset by ID."""
        pm = service.get_preset_manager()
        p = pm.get(preset_id)
        if not p:
            return JSONResponse(status_code=404, content={"error": "Preset not found"})
        return p.to_dict()

    @router.delete("/api/presets/{preset_id}")
    def delete_preset(preset_id: str) -> dict:
        """Delete a preset."""
        pm = service.get_preset_manager()
        deleted = pm.delete(preset_id)
        if not deleted:
            return JSONResponse(status_code=400, content={"error": "Cannot delete preset"})
        return {"deleted": True}

    # ─── Character Card Routes ──────────────────────────────────────────────

    @router.post("/api/characters/parse")
    def parse_character_card(data: dict = Body(...)) -> dict:
        """Parse a character card from JSON or base64."""
        from fablemap.char_card_parser import parse_character_card, CharacterCardParser
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
        from fablemap.char_card_parser import parse_character_card, export_character_card

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

    # ===== Tokenizer API =====
    @router.get("/api/tokenizers")
    def list_tokenizers() -> dict:
        """List available tokenizers."""
        from fablemap.token_counter import TokenCounter

        tokenizers = ["cl100k_base", "o200k_base", "p50k_base", "p50k_edit", "r50k_base"]
        return {"tokenizers": tokenizers}

    @router.post("/api/tokenizers/count")
    def count_tokens(data: dict = Body(...)) -> dict:
        """Count tokens in text."""
        from fablemap.token_counter import TokenCounter

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
        from fablemap.token_counter import TokenCounter

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

    # ===== Vector Search API =====
    @router.post("/api/vectors/add")
    def add_vectors(data: dict = Body(...)) -> dict:
        """Add texts to vector store."""
        from fablemap.vectors import VectorStore, EmbeddingConfig

        texts = data.get("texts", [])
        collection = data.get("collection", "default")
        provider = data.get("provider", "openai")
        model = data.get("model", "text-embedding-3-small")

        try:
            config = EmbeddingConfig(provider=provider, model=model)
            store = VectorStore(collection=collection)
            ids = store.add_texts(texts, config)
            return {"ok": True, "ids": ids, "count": len(ids)}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    @router.post("/api/vectors/search")
    def search_vectors(data: dict = Body(...)) -> dict:
        """Search vectors."""
        from fablemap.vectors import VectorStore, EmbeddingConfig

        query = data.get("query", "")
        collection = data.get("collection", "default")
        top_k = data.get("top_k", 5)
        provider = data.get("provider", "openai")
        model = data.get("model", "text-embedding-3-small")

        try:
            config = EmbeddingConfig(provider=provider, model=model)
            store = VectorStore(collection=collection)
            results = store.search(query, top_k, config)
            return {"results": [{"id": r["id"], "text": r["text"], "score": r["score"]} for r in results]}
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

    return router


def _request_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _get_user_id(request: Request) -> str:
    """Extract user ID from request headers. For now returns empty string (anonymous)."""
    return request.headers.get("X-User-Id", "") or ""


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
