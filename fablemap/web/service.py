from __future__ import annotations

import hashlib
import json
import logging
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _tavern_llm_config_to_client(tavern_config) -> "LLMConfig":
    """Convert tavern.py LLMConfig to llm_clients.LLMConfig."""
    from fablemap.llm_clients import LLMConfig
    return LLMConfig(
        backend=tavern_config.backend,
        model=tavern_config.model,
        api_key=tavern_config.api_key,
        base_url=tavern_config.base_url,
        temperature=tavern_config.temperature,
        max_tokens=tavern_config.max_tokens,
        top_p=tavern_config.top_p,
    )

logger = logging.getLogger(__name__)

from fablemap.api_service import build_health_payload, build_meta_payload, build_nearby_payload
from fablemap.llm_clients import create_client, LLMError
from fablemap.prompt_builder import PromptBuildConfig, PromptBuilder
from fablemap.application.web_payloads import build_behavior_insights, build_orchestrate_payload, record_memory_graph_event
from fablemap.nearby import generate_nearby_preview
from fablemap.writeback import WritebackEngine, WritebackStore
from fablemap.orchestrator.rule_engine import RuleBasedOrchestrator
from fablemap.memory_graph import WorldMemoryGraph
from fablemap.dynamic_signals import inject_disturbance, clear_disturbance, get_disturbance
from fablemap.tavern import TavernService as TavernServiceCore, TavernStore as TavernStoreCore

from .config import ApiSettings


class WebService:
    def __init__(self, settings: ApiSettings):
        self.settings = settings.resolved()
        self.settings.output_root.mkdir(parents=True, exist_ok=True)
        self.writeback = WritebackEngine(WritebackStore(self.settings.output_root / "writeback"))
        self.orchestrator = RuleBasedOrchestrator()
        self.memory_graph = WorldMemoryGraph()
        # Tavern service (new)
        self.tavern_store = TavernStoreCore(self.settings.output_root / "taverns")
        self.tavern_service = TavernServiceCore(self.tavern_store)

    def health_payload(self) -> dict[str, Any]:
        return build_health_payload(
            fixture_file=self.settings.fixture_file,
            frontend_root=self.settings.frontend_root,
            output_root=self.settings.output_root,
        )

    def meta_payload(self, *, base_url: str) -> dict[str, Any]:
        return build_meta_payload(base_url=base_url)

    def nearby_payload(
        self,
        *,
        lat: float,
        lon: float,
        radius: int,
        mode: str,
        seed: str,
        refresh: bool,
        base_url: str,
    ) -> dict[str, Any]:
        if radius <= 0:
            raise HTTPException(status_code=400, detail="radius must be a positive integer")

        normalized_mode = mode.lower()
        if normalized_mode not in {"fixture", "live"}:
            raise HTTPException(status_code=400, detail="mode must be 'fixture' or 'live'")

        source_file = None
        if normalized_mode == "fixture":
            if not self.settings.fixture_file or not self.settings.fixture_file.exists():
                raise HTTPException(status_code=400, detail="fixture mode is unavailable because the fixture file is missing")
            source_file = self.settings.fixture_file

        try:
            run_id = f"run-{uuid.uuid4().hex[:12]}"
            result = generate_nearby_preview(
                lat=lat,
                lon=lon,
                radius=radius,
                output_dir=self.settings.output_root / run_id,
                seed=seed or None,
                source_file=source_file,
                refresh=refresh,
            )
            
            # Inject managed taverns
            payload = build_nearby_payload(
                result=result,
                base_url=base_url,
                mode=normalized_mode,
                run_id=run_id,
            )
            self._inject_managed_taverns(payload, lat, lon, radius)
            return payload
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def map_snapshot_payload(self, snapshot_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        normalized_snapshot_id = _sanitize_snapshot_id(snapshot_id)
        if not normalized_snapshot_id:
            raise HTTPException(status_code=400, detail="snapshot id is required")

        frontend_public = self.settings.frontend_public
        if frontend_public is None:
            raise HTTPException(status_code=500, detail="frontend public directory is unavailable")

        tiles = payload.get("tiles") or []
        if not isinstance(tiles, list) or not tiles:
            raise HTTPException(status_code=400, detail="tiles payload is required")

        snapshot_dir = (frontend_public / "map-snapshots" / normalized_snapshot_id).resolve()
        if not _is_within_root(snapshot_dir, frontend_public.resolve()):
            raise HTTPException(status_code=400, detail="invalid snapshot path")
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        stored_tiles: list[dict[str, Any]] = []
        for index, tile in enumerate(tiles):
            if not isinstance(tile, dict):
                continue
            src = str(tile.get("src") or "").strip()
            if not src.startswith(("http://", "https://")):
                continue

            extension = _guess_tile_extension(src)
            digest = hashlib.sha1(src.encode("utf-8")).hexdigest()[:12]
            filename = f"tile-{index:03d}-{digest}{extension}"
            target_path = snapshot_dir / filename
            _download_remote_file(src, target_path)

            stored_tiles.append(
                {
                    "left": int(tile.get("left") or 0),
                    "top": int(tile.get("top") or 0),
                    "width": int(tile.get("width") or 0),
                    "height": int(tile.get("height") or 0),
                    "file": f"/map-snapshots/{normalized_snapshot_id}/{filename}",
                    "source": src,
                }
            )

        if not stored_tiles:
            raise HTTPException(status_code=400, detail="no downloadable tiles found in payload")

        manifest = {
            "snapshot_id": normalized_snapshot_id,
            "provider": "amap-static-snapshot",
            "captured_from": payload.get("captured_from") or "amap-dom",
            "world_id": payload.get("world_id") or normalized_snapshot_id,
            "origin_label": payload.get("origin_label") or "",
            "center": payload.get("center") or {},
            "zoom": payload.get("zoom"),
            "captured_at": payload.get("captured_at"),
            "viewport": {
                "width": int(payload.get("width") or 0),
                "height": int(payload.get("height") or 0),
            },
            "tiles": stored_tiles,
        }
        (snapshot_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        return manifest

    def writeback_event_payload(self, event: dict[str, Any]) -> dict[str, Any]:
        try:
            payload = self.writeback.process_event(event)
            record_memory_graph_event(self.memory_graph, event)
            payload["behavior_insights"] = build_behavior_insights(payload=payload, memory_graph=self.memory_graph)
            return payload
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def orchestrate_world(self, slice_id: str, player_id: str, lat: float, lon: float) -> dict[str, Any]:
        """Orchestrate world based on player state"""
        try:
            # Get POI memory
            poi_memory = self.memory_graph.get_poi_memory(slice_id)
            observer_count = poi_memory.total_observers if poi_memory else 1

            # AIO3: read real accumulated player state from memory graph
            history = self.memory_graph.get_player_history(player_id, slice_id)
            real_visit_count = history.visit_count if history else 1
            real_dwell_seconds = history.total_dwell_time if history else 0.0
            real_mark_count = len(history.marks) if history else 0
            poi_echoes = self.memory_graph.get_poi_echoes(slice_id)
            real_echo_count = len(poi_echoes)

            world_state = {
                "slice_id": slice_id,
                "observer_count": observer_count,
                "center_poi": slice_id,
                "pois": [{"id": slice_id, "name": slice_id}],
            }
            player_state = {
                "player_id": player_id,
                "lat": lat,
                "lon": lon,
                "visit_count": max(1, real_visit_count),
                "writeback_count": max(0, observer_count - 1),
                "echo_count": real_echo_count,
                "mark_count": real_mark_count,
                "dwell_seconds": real_dwell_seconds,
            }

            # Record observation
            self.memory_graph.record_observation(player_id, slice_id)

            # Run orchestration
            result = self.orchestrator.orchestrate(world_state, player_state)

            # Get relationship strength
            relationship = self.memory_graph.calculate_relationship_strength(player_id, slice_id)

            return build_orchestrate_payload(result=result, relationship_strength=relationship)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def generated_file_path(self, file_path: str) -> Path:
        candidate = (self.settings.output_root / Path(file_path)).resolve()
        if not _is_within_root(candidate, self.settings.output_root) or not candidate.is_file():
            raise HTTPException(status_code=404, detail="generated file not found")
        return candidate

    def frontend_static_dir(self) -> Path | None:
        preferred = self.settings.frontend_dist
        if preferred and preferred.exists():
            return preferred
        fallback = self.settings.frontend_root
        if fallback and fallback.exists():
            return fallback
        return None

    def record_ghost_trace_payload(self, player_id: str, waypoints: list, mood_arc: list, visibility: str = "local_public") -> dict[str, Any]:
        try:
            trace = self.memory_graph.record_ghost_trace(player_id, waypoints, mood_arc=mood_arc, visibility=visibility)
            return {
                "trace_id": trace.trace_id,
                "player_id": trace.player_id,
                "waypoints": trace.waypoints,
                "started_at": trace.started_at,
                "ended_at": trace.ended_at,
                "mood_arc": trace.mood_arc,
                "visibility": trace.visibility,
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def get_ghost_traces_payload(self, player_id: str) -> dict[str, Any]:
        try:
            traces = self.memory_graph.get_ghost_traces(player_id)
            return {
                "player_id": player_id,
                "traces": [
                    {
                        "trace_id": t.trace_id,
                        "waypoints": t.waypoints,
                        "started_at": t.started_at,
                        "ended_at": t.ended_at,
                        "mood_arc": t.mood_arc,
                        "visibility": t.visibility,
                    }
                    for t in traces
                ],
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def landmark_honor_payload(self, slice_id: str) -> dict[str, Any]:
        try:
            store_state = self.writeback.store.load()
            slice_bucket = store_state.get("slices", {}).get(slice_id, {})
            targets = slice_bucket.get("targets", {})
            board = []
            for target_id, bucket in targets.items():
                if bucket.get("target_type") == "landmark" and bucket.get("repair_count", 0) > 0:
                    board.append({
                        "landmark_id": target_id,
                        "repair_count": bucket["repair_count"],
                        "honor_board": bucket.get("honor_board", []),
                    })
            board.sort(key=lambda x: -x["repair_count"])
            return {"slice_id": slice_id, "landmarks": board}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def inject_disturbance_payload(self, slice_id: str, weather: str | None, traffic_level: float | None, crowd_density: float | None, is_holiday: bool | None, event_tag: str | None) -> dict[str, Any]:
        inject_disturbance(slice_id, weather=weather, traffic_level=traffic_level, crowd_density=crowd_density, is_holiday=is_holiday, event_tag=event_tag)
        return {"slice_id": slice_id, "active": get_disturbance(slice_id)}

    def clear_disturbance_payload(self, slice_id: str) -> dict[str, Any]:
        clear_disturbance(slice_id)
        return {"slice_id": slice_id, "active": {}}

    def get_disturbance_payload(self, slice_id: str) -> dict[str, Any]:
        return {"slice_id": slice_id, "active": get_disturbance(slice_id)}

    # ─── Tavern Service (based on tavern.py) ─────────────────────────────

    def list_taverns_payload(
        self,
        lat: float | None = None,
        lon: float | None = None,
        radius: float = 5000,
        access: str | None = None,
        owner_id: str = "",
    ) -> dict[str, Any]:
        """List all taverns with optional location filter"""
        taverns = self.tavern_service.list_taverns(
            lat=lat, lon=lon, radius=radius, access=access, owner_id=owner_id
        )
        return {"taverns": taverns, "count": len(taverns)}

    def get_tavern_payload(self, tavern_id: str, user_id: str = "") -> dict[str, Any]:
        """Get a specific tavern by ID"""
        return self.tavern_service.get_tavern(tavern_id, user_id)

    def create_tavern_payload(self, data: dict[str, Any], owner_id: str = "") -> dict[str, Any]:
        """Create a new tavern"""
        return self.tavern_service.create_tavern(data, owner_id)

    def update_tavern_payload(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        """Update a tavern"""
        return self.tavern_service.update_tavern(tavern_id, data, user_id)

    def delete_tavern_payload(self, tavern_id: str, user_id: str = "") -> dict[str, str]:
        """Delete a tavern"""
        return self.tavern_service.delete_tavern(tavern_id, user_id)

    def enter_tavern_payload(
        self, tavern_id: str, password: str = "", user_id: str = ""
    ) -> dict[str, Any]:
        """Enter a tavern (verify password)"""
        return self.tavern_service.enter_tavern(tavern_id, password, user_id)

    def add_character_payload(
        self, tavern_id: str, data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Add a character to a tavern"""
        return self.tavern_service.add_character(tavern_id, data, user_id)

    def update_character_payload(
        self, tavern_id: str, char_id: str, data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Update a character"""
        return self.tavern_service.update_character(tavern_id, char_id, data, user_id)

    def delete_character_payload(
        self, tavern_id: str, char_id: str, user_id: str = ""
    ) -> dict[str, str]:
        """Delete a character"""
        return self.tavern_service.delete_character(tavern_id, char_id, user_id)

    def import_character_card_payload(
        self, tavern_id: str, card_data: dict[str, Any], user_id: str = ""
    ) -> dict[str, Any]:
        """Import a SillyTavern character card"""
        return self.tavern_service.import_character_card(tavern_id, card_data, user_id)

    # Chat methods using tavern service
    def tavern_chat_payload(
        self,
        tavern_id: str,
        character_id: str,
        message: str,
        visitor_id: str,
    ) -> dict[str, Any]:
        """Send a chat message and get AI response"""
        from .tavern import ChatMessage

        tavern = self.tavern_store.get_tavern(tavern_id)
        if not tavern:
            raise HTTPException(status_code=404, detail="酒馆不存在")

        # Find character
        character = next((c for c in tavern.characters if c.id == character_id), None)
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")

        # Check if tavern is open
        if tavern.status != "open":
            return {
                "character_id": character_id,
                "character_name": character.name,
                "response": "此店暂时歇业中。",
                "mood": "neutral",
            }

        # Get LLM config
        llm_config = self.tavern_store.get_llm_config(tavern_id)
        if not llm_config or not llm_config.is_configured():
            return {
                "character_id": character_id,
                "character_name": character.name,
                "response": "此店暂未配置 AI，无法回应。",
                "mood": "neutral",
            }

        # Build messages using PromptBuilder
        messages = self.tavern_store.get_chat_history(
            tavern_id, visitor_id, character_id, limit=20
        )

        # Convert to prompt_builder.ChatMessage format
        prompt_messages = [
            {"id": m.id, "role": m.role, "content": m.content, "name": "", "timestamp": m.timestamp or ""}
            for m in messages
        ]
        prompt_messages_obj = [
            ChatMessage(id=m.id, role=m.role, content=m.content)
            for m in messages
        ]

        # Determine output format based on backend
        output_format = "openai"
        if llm_config.backend in ("claude",):
            output_format = "claude"
        elif llm_config.backend in ("ooba", "mancer", "vllm", "tabby", "koboldcpp", "togetherai", "llamacpp", "infermaticai", "dreamgen", "featherless", "huggingface", "generic", "ollama"):
            output_format = "textgen"

        # Build prompt
        config = PromptBuildConfig(
            tavern_name=tavern.name,
            tavern_scene_prompt=tavern.scene_prompt or "",
            char_name=character.name,
            char_personality=character.personality or "",
            char_scenario=character.scenario or "",
            char_first_mes=character.first_mes or "",
            char_system_prompt=character.system_prompt or "",
            user_name=visitor_id[:16] or "旅人",
            world_info_entries=[e.to_dict() if hasattr(e, "to_dict") else e for e in tavern.world_info],
            output_format=output_format,
            history_max_messages=20,
        )
        builder = PromptBuilder(config)
        prompt_result = builder.build(prompt_messages_obj, message)

        # Call LLM using the new llm_clients
        try:
            llm_config_obj = _tavern_llm_config_to_client(llm_config)
            llm_config_obj = create_client(llm_config_obj)
            response = llm_config_obj.complete(prompt_result["messages"])
            response_text = response.content
        except LLMError as e:
            logger.warning(f"LLM call failed: {e}, falling back to rule-based response")
            response_text = self._fallback_response(message, character.name)
        except Exception as e:
            logger.error(f"Unexpected error during LLM call: {e}")
            response_text = self._fallback_response(message, character.name)

        # Save messages
        now = _utc_now_iso()
        self.tavern_store.add_chat_message(
            ChatMessage(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                tavern_id=tavern_id,
                character_id=character_id,
                visitor_id=visitor_id,
                role="user",
                content=message,
                timestamp=now,
            )
        )
        self.tavern_store.add_chat_message(
            ChatMessage(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                tavern_id=tavern_id,
                character_id=character_id,
                visitor_id=visitor_id,
                role="assistant",
                content=response_text,
                timestamp=now,
            )
        )

        # Record token usage
        token_count = self._count_tokens(llm_config.backend, llm_config.model, message, response_text, response)
        self.tavern_store.add_token_usage(tavern_id, token_count)

        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response_text,
            "mood": "curious",
            "timestamp": _now_ms(),
        }

    def _count_tokens(
        self,
        backend: str,
        model: str,
        input_text: str,
        output_text: str,
        response,
    ) -> int:
        """
        Count tokens for input and output text.
        Uses LLM API usage data when available, falls back to TokenCounter.
        """
        from fablemap.token_counter import get_counter

        total = 0
        # Try to use LLM API usage data
        if response and hasattr(response, "usage") and response.usage:
            usage = response.usage
            if isinstance(usage, dict):
                # OpenAI format: total_tokens
                if "total_tokens" in usage:
                    return usage["total_tokens"]
                # Anthropic format: input_tokens + output_tokens
                if "input_tokens" in usage:
                    total += usage["input_tokens"]
                    total += usage.get("output_tokens", 0)
                    if total > 0:
                        return total
                # Try prompt/completion tokens
                total += usage.get("prompt_tokens", 0)
                total += usage.get("completion_tokens", 0)
                if total > 0:
                    return total
            elif isinstance(usage, (int, float)):
                return int(usage)

        # Fallback: use TokenCounter
        counter = get_counter(backend)
        if backend == "claude":
            # Claude uses cl100k_base equivalent
            counter = get_counter("cl100k_base")
        total = counter.count(input_text) + counter.count(output_text)
        return total

    def _fallback_response(self, message: str, char_name: str) -> str:
        """Rule-based fallback when LLM is unavailable."""
        msg_lower = message.lower()
        if any(k in msg_lower for k in ["你好", "hi", "hello"]):
            return "你好，欢迎光临。"
        if any(k in msg_lower for k in ["再见", "bye", "离开"]):
            return "后会有期，有空再来。"
        if any(k in msg_lower for k in ["谢谢", "thank"]):
            return "不客气。"
        import random
        responses = [
            "我明白了。让我想想……",
            "嗯，这很有趣。",
            "你说的这些，我倒是有所耳闻。",
            "这里每天都有新故事。你想聊什么？",
        ]
        return random.choice(responses)

    def test_llm_payload(
        self,
        tavern_id: str,
        llm_config_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Test LLM configuration by sending a simple prompt."""
        from fablemap.llm_clients import create_client, LLMConfig, LLMError

        try:
            cfg = LLMConfig(
                backend=llm_config_data.get("backend", "openai"),
                model=llm_config_data.get("model", ""),
                api_key=llm_config_data.get("api_key", ""),
                base_url=llm_config_data.get("base_url", ""),
                temperature=float(llm_config_data.get("temperature", 0.8)),
                max_tokens=int(llm_config_data.get("max_tokens", 256)),
                top_p=float(llm_config_data.get("top_p", 1.0)),
            )

            if not cfg.api_key and not cfg.base_url:
                return {"ok": False, "message": "请提供 API Key 或 Base URL"}

            client = create_client(cfg)
            test_messages = [
                {"role": "user", "content": "你好，请回复一个简单的问候。"},
            ]
            response = client.complete(test_messages)
            return {
                "ok": True,
                "message": "连接成功",
                "model": response.model,
                "preview": response.content[:200],
            }
        except LLMError as e:
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}
        except Exception as e:
            logger.error(f"test_llm failed: {e}")
            return {"ok": False, "message": f"连接失败：{str(e)[:200]}"}

    def tavern_chat_history_payload(
        self,
        tavern_id: str,
        visitor_id: str,
        character_id: str | None = None,
    ) -> dict[str, Any]:
        """Get chat history for a tavern"""
        messages = self.tavern_store.get_chat_history(
            tavern_id, visitor_id, character_id, limit=50
        )
        return {
            "tavern_id": tavern_id,
            "visitor_id": visitor_id,
            "character_id": character_id,
            "messages": [m.to_dict() for m in messages],
            "count": len(messages),
        }

    def _inject_managed_taverns(self, payload: dict[str, Any], center_lat: float, center_lon: float, radius: int):
        """Inject managed taverns into the POI list of a nearby result."""
        managed_taverns = self.writeback.store.get_taverns()
        if not managed_taverns:
            return

        world = payload.get("world")
        if not world or not isinstance(world, dict):
            return

        pois = world.setdefault("pois", [])
        
        # Simple distance check for injection (radius is in meters, but we use degree expansion for speed)
        # 1 deg approx 111000 meters
        deg_radius = radius / 111000.0
        
        for tid, data in managed_taverns.items():
            t_lat = data.get("lat")
            t_lon = data.get("lon")
            if t_lat is None or t_lon is None:
                continue
            
            if abs(t_lat - center_lat) <= deg_radius and abs(t_lon - center_lon) <= deg_radius:
                # Convert managed tavern to POI format
                poi = {
                    "id": data["id"],
                    "osm_type": "managed_tavern",
                    "real_name": data["name"],
                    "fantasy_name": data["name"],
                    "fantasy_type": "managed_tavern",
                    "position": {"lat": t_lat, "lon": t_lon},
                    "description": data.get("description", ""),
                    "faction_alignment": "neutral",
                    "managed": True,
                    "visual_hint": {
                        "style": "managed_gold",
                        "palette": "gold_and_black",
                    }
                }
                # Check if already exists by ID
                if not any(p.get("id") == poi["id"] for p in pois):
                    pois.append(poi)

    def chat_response_payload(
        self,
        character_id: str,
        message: str,
        world_id: str,
        poi_id: str,
        player_id: str,
        history: list,
    ) -> dict[str, Any]:
        """Generate a character response and persist the chat exchange to writeback."""
        from ..writeback import _utc_now_iso

        # Save player's message to writeback
        self.writeback.add_chat_message(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            role="player",
            content=message,
        )

        # Determine character archetype and mood from the message
        archetype, mood, character_name, character_description = self._derive_character_info(
            character_id, world_id
        )

        # Generate response based on archetype
        response = _generate_response(archetype, mood, message, character_description)

        # Save character's response to writeback
        char_msg = self.writeback.add_chat_message(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            role="character",
            content=response,
        )

        return {
            "character_id": character_id,
            "character_name": character_name,
            "response": response,
            "mood": mood,
            "archetype": archetype,
            "poi_id": poi_id,
            "timestamp": _now_ms(),
            "character_message": char_msg,
        }

    def chat_history_payload(
        self,
        player_id: str,
        poi_id: str,
        character_id: str | None = None,
    ) -> dict[str, Any]:
        """Get chat history for a player + POI (optionally filtered by character)."""
        messages = self.writeback.get_chat_history(
            player_id=player_id,
            poi_id=poi_id,
            character_id=character_id,
            limit=50,
        )
        return {
            "player_id": player_id,
            "poi_id": poi_id,
            "character_id": character_id,
            "messages": messages,
            "count": len(messages),
        }

    def _derive_character_info(self, character_id: str, world_id: str) -> tuple[str, str, str, str]:
        """Derive archetype, mood, name, and description from faction data."""
        import json
        from ..writeback import _utc_now_iso

        world = {}
        try:
            # Try to find world JSON in output root
            for f in self.settings.output_root.glob(f"{world_id}/*.json"):
                try:
                    data = json.loads(f.read_text("utf-8"))
                    if data.get("world_id") == world_id or data.get("world_id"):
                        world = data
                        break
                except Exception:
                    continue
        except Exception:
            pass

        archetype = "wanderer"
        mood = "curious"
        character_name = "未知角色"
        character_description = "这个角色还没有被赋予身份。"

        factions = world.get("factions", [])
        for faction in factions:
            if f"faction-{faction.get('id', '')}" == character_id:
                archetype = _archetype_from_faction(faction)
                mood = faction.get("emotional_tone", "curious")
                character_name = faction.get("name", "未知势力")
                character_description = faction.get("doctrine", "")
                break

        # If character_id looks like a POI-based character (not faction)
        if character_id.startswith("char_") or character_id.startswith("npc_"):
            archetype = "wanderer"
            mood = "mysterious"
            character_name = "旅人"
            character_description = ""

        return archetype, mood, character_name, character_description

    # ─── Quick Reply Manager ──────────────────────────────────────────────

    def get_quick_reply_manager(self):
        """Get the quick reply manager (lazy initialization)."""
        if not hasattr(self, "_quick_reply_manager"):
            from fablemap.quick_replies import QuickReplyManager
            self._quick_reply_manager = QuickReplyManager()
            # Load from storage if available
            storage_path = self.settings.output_root / "quick_replies.json"
            self._quick_reply_manager.load_from_file(storage_path)
        return self._quick_reply_manager

    # ─── Command Manager ──────────────────────────────────────────────────

    def get_command_manager(self):
        """Get the slash command manager (lazy initialization)."""
        if not hasattr(self, "_command_manager"):
            from fablemap.slash_commands import get_command_manager
            self._command_manager = get_command_manager()
        return self._command_manager

    # ─── Extension Manager ────────────────────────────────────────────────

    def get_extension_manager(self):
        """Get the extension manager (lazy initialization)."""
        if not hasattr(self, "_extension_manager"):
            from fablemap.extensions import get_extension_manager
            self._extension_manager = get_extension_manager()
        return self._extension_manager

    # ─── Group Chat Sessions ─────────────────────────────────────────────

    def create_group_chat_session(self, group_manager) -> str:
        """Create a new group chat session and return its ID."""
        if not hasattr(self, "_group_chat_sessions"):
            self._group_chat_sessions = {}
        session_id = str(uuid.uuid4())
        self._group_chat_sessions[session_id] = group_manager
        return session_id

    def get_group_chat_session(self, session_id: str):
        """Get a group chat session by ID."""
        return getattr(self, "_group_chat_sessions", {}).get(session_id)

    # ─── Preset Manager ───────────────────────────────────────────────────

    def get_preset_manager(self):
        """Get the LLM preset manager (lazy initialization)."""
        if not hasattr(self, "_preset_manager"):
            from fablemap.presets import PresetManager
            storage_path = self.settings.output_root / "presets.json"
            self._preset_manager = PresetManager(storage_path)
        return self._preset_manager


def _archetype_from_faction(faction: dict) -> str:
    """Map faction archetype to character archetype."""
    mapping = {
        "trade_guild": "merchant",
        "order_bureau": "guardian",
        "clinic_circle": "healer",
        "memory_collective": "scholar",
        "night_bloom": "wanderer",
    }
    faction_id = faction.get("id", "")
    return mapping.get(faction_id, "wanderer")


# ─── Simple rule-based response generator ────────────────────────────────────

_CHARACTER_GREETINGS = {
    "merchant": ["交易？你来得正好。", "补给的时间到了？", "欢迎来到交易站。"],
    "guardian": ["请说明你来意。", "这片区域在我的守护之下。", "来者何人？"],
    "healer": ["这里是疗愈之所。", "你受伤了吗？", "让我看看你的状况。"],
    "scholar": ["有什么值得记录的？", "知识是最宝贵的财富。", "这座城市的记忆在我这里。"],
    "wanderer": ["你来了。", "又一个过路人。", "这里没有什么特别的事。"],
}

_CHARACTER_RESPONSES = {
    "merchant": [
        "贸易是这座城市的血脉。每一笔交易都在改变着什么。",
        "我这里有各种物品和信息。你想要什么？",
        "价格公道，童叟无欺。但如果你付不起，那就另说了。",
    ],
    "guardian": [
        "我会守护这片区域，直到最后一人离开。",
        "秩序是这里的基石。没有秩序，就只有混乱。",
        "这片土地见证过太多故事。我只是其中之一。",
    ],
    "healer": [
        "伤痛总会留下痕迹，无论身体还是心灵。",
        "每一次疗愈都是一次重建。希望是最强的药剂。",
        "这里不评判来者，只治愈需要被治愈的人。",
    ],
    "scholar": [
        "这座城市的每一块砖都有自己的故事。",
        "记忆是最容易被遗忘的东西。但我不会忘。",
        "让我告诉你一些你不知道的事。",
    ],
    "wanderer": [
        "我来过这里很多次了。每次都不一样。",
        "城市在变，但某些东西永远不会变。",
        "我没有固定的身份。我是这座城市的一部分。",
    ],
}


def _generate_response(archetype: str, mood: str, message: str, description: str) -> str:
    """Generate a simple response based on archetype and mood."""
    import random

    responses = _CHARACTER_RESPONSES.get(archetype, _CHARACTER_RESPONSES["wanderer"])

    if not message.strip():
        greetings = _CHARACTER_GREETINGS.get(archetype, _CHARACTER_GREETINGS["wanderer"])
        return random.choice(greetings)

    # Check for specific keywords
    msg_lower = message.lower()
    if any(k in msg_lower for k in ["你好", "hi", "hello", "hi!"]):
        if mood == "warm":
            return "你好，欢迎来到这里。"
        elif mood == "wary":
            return "你好。你来这里做什么？"
        else:
            return "你好。有什么事？"

    if any(k in msg_lower for k in ["再见", "bye", "走", "离开"]):
        return "后会有期。"

    if any(k in msg_lower for k in ["谢谢", "thank"]):
        return "不必言谢。这是我的职责。"

    # Default: random response from archetype pool
    base = random.choice(responses)

    # Add description flavor occasionally
    if description and random.random() < 0.3:
        return f"{base}\n\n这座{archetype}的教义说：{description}"

    return base





def _utc_now_iso() -> str:
    from datetime import UTC, datetime
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)


def _sanitize_snapshot_id(value: str) -> str:
    allowed = [ch.lower() if ch.isalnum() else "-" for ch in (value or "").strip()]
    normalized = "".join(allowed).strip("-")
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized[:80]


def _guess_tile_extension(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        return suffix
    return ".png"


def _download_remote_file(url: str, target_path: Path) -> None:
    request = Request(
        url,
        headers={
            "User-Agent": "FableMapSnapshot/1.0",
            "Referer": "https://webapi.amap.com/",
        },
    )
    with urlopen(request, timeout=20) as response:
        target_path.write_bytes(response.read())


def _is_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False
