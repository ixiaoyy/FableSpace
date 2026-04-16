from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any
import unicodedata

from .overpass import fetch_overpass_data

RULES: list[tuple[str, str, dict[str, Any]]] = [
    (
        "leisure",
        "park",
        {
            "fantasy_type": "whispering_grove",
            "suffix": "Grove",
            "theme": "verdant_district",
            "faction": "night_bloom",
            "satire": "green relief survives beside commuter pressure.",
            "emotion": "A calm pocket where private memories can settle.",
            "vibe": "ghibli_town",
            "palette": "moss_and_gold",
            "secret_slot": True,
            "sprite_spawn_hint": True,
        },
    ),
    (
        "amenity",
        "hospital",
        {
            "fantasy_type": "healing_sanctum",
            "suffix": "Sanctum",
            "theme": "healing_quarter",
            "faction": "clinic_circle",
            "satire": "Care feels sacred, but access is still rationed.",
            "emotion": "Anxious hope lingers around the doors.",
            "vibe": "quiet_rain",
            "palette": "ceramic_white",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "shop",
        "convenience",
        {
            "fantasy_type": "supply_outpost",
            "suffix": "Outpost",
            "theme": "market_quarter",
            "faction": "trade_guild",
            "satire": "Everything is available, just not equally affordable.",
            "emotion": "Small routines make the district feel survivable.",
            "vibe": "neon_nostalgia",
            "palette": "soda_neon",
            "secret_slot": False,
            "sprite_spawn_hint": True,
        },
    ),
    (
        "amenity",
        "police",
        {
            "fantasy_type": "judgement_tower",
            "suffix": "Tower",
            "theme": "bureau_district",
            "faction": "order_bureau",
            "satire": "Order is visible everywhere, comfort much less so.",
            "emotion": "You are watched before you are welcomed.",
            "vibe": "iron_blue",
            "palette": "steel_and_ash",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "amenity",
        "cafe",
        {
            "fantasy_type": "ember_parlor",
            "suffix": "Parlor",
            "theme": "market_quarter",
            "faction": "memory_collective",
            "satire": "Conversation is cozy, but time is always for sale.",
            "emotion": "Warmth, gossip and waiting quietly overlap here.",
            "vibe": "amber_evening",
            "palette": "coffee_and_rose",
            "secret_slot": True,
            "sprite_spawn_hint": True,
        },
    ),
    (
        "amenity",
        "school",
        {
            "fantasy_type": "lore_academy",
            "suffix": "Academy",
            "theme": "scholar_quarter",
            "faction": "memory_collective",
            "satire": "Knowledge promises mobility while reproducing hierarchy.",
            "emotion": "Ambition and fatigue share the same corridors.",
            "vibe": "chalk_dawn",
            "palette": "paper_and_ink",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    # --- 新增 9 种 OSM → fantasy_type 映射规则 ---
    (
        "amenity",
        "bank",
        {
            "fantasy_type": "debt_cathedral",
            "suffix": "Cathedral",
            "theme": "bureau_district",
            "faction": "order_bureau",
            "satire": "Wealth is worshipped here, in columns and queues.",
            "emotion": "A low hum of obligation never fully lifts.",
            "vibe": "iron_blue",
            "palette": "slate_and_silver",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "amenity",
        "restaurant",
        {
            "fantasy_type": "feast_hall",
            "suffix": "Hall",
            "theme": "market_quarter",
            "faction": "trade_guild",
            "satire": "Pleasure is always available, just priced for the right crowd.",
            "emotion": "Hunger and celebration share the same table.",
            "vibe": "amber_evening",
            "palette": "spice_and_ember",
            "secret_slot": False,
            "sprite_spawn_hint": True,
        },
    ),
    (
        "amenity",
        "fast_food",
        {
            "fantasy_type": "refuel_station",
            "suffix": "Station",
            "theme": "market_quarter",
            "faction": "trade_guild",
            "satire": "Speed and convenience disguise what is lost in the trade.",
            "emotion": "Efficiency colonises every pause.",
            "vibe": "neon_nostalgia",
            "palette": "chrome_yellow",
            "secret_slot": False,
            "sprite_spawn_hint": True,
        },
    ),
    (
        "amenity",
        "library",
        {
            "fantasy_type": "memory_archive",
            "suffix": "Archive",
            "theme": "scholar_quarter",
            "faction": "memory_collective",
            "satire": "Public memory is kept here, awaiting someone who still cares.",
            "emotion": "Quiet, deliberate, slightly dusty with accumulated care.",
            "vibe": "chalk_dawn",
            "palette": "ink_and_teal",
            "secret_slot": True,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "amenity",
        "place_of_worship",
        {
            "fantasy_type": "spirit_sanctum",
            "suffix": "Sanctum",
            "theme": "healing_quarter",
            "faction": "night_bloom",
            "satire": "The sacred persists even when the congregation shrinks.",
            "emotion": "Something older than the city watches from here.",
            "vibe": "quiet_rain",
            "palette": "violet_and_gold",
            "secret_slot": True,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "amenity",
        "parking",
        {
            "fantasy_type": "dormant_lot",
            "suffix": "Lot",
            "theme": "threshold_district",
            "faction": "order_bureau",
            "satire": "Space is allocated for machines before people.",
            "emotion": "An absence shaped like expectation.",
            "vibe": "iron_blue",
            "palette": "ash_and_concrete",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "amenity",
        "pharmacy",
        {
            "fantasy_type": "remedy_post",
            "suffix": "Post",
            "theme": "healing_quarter",
            "faction": "clinic_circle",
            "satire": "Relief is available, at a price the body keeps paying.",
            "emotion": "Small urgency, chronic patience.",
            "vibe": "quiet_rain",
            "palette": "mint_and_white",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        },
    ),
    (
        "leisure",
        "fitness_centre",
        {
            "fantasy_type": "labor_forge",
            "suffix": "Forge",
            "theme": "market_quarter",
            "faction": "trade_guild",
            "satire": "The body is optimised like a production unit.",
            "emotion": "Effort and exhaustion are performed in public.",
            "vibe": "iron_blue",
            "palette": "red_and_iron",
            "secret_slot": False,
            "sprite_spawn_hint": True,
        },
    ),
]

ROAD_ROLES = {
    "motorway": "iron_lane",
    "primary": "trade_route",
    "secondary": "trade_route",
    "tertiary": "market_street",
    "residential": "lantern_lane",
    "footway": "ritual_path",
}

FACTION_DETAILS = {
    "trade_guild": ("Trade Guild", "trade_guild", "Secures supply, price and passage."),
    "order_bureau": ("Order Bureau", "order_bureau", "Turns circulation into a managed system."),
    "clinic_circle": ("Clinic Circle", "clinic_circle", "Protects fragile life and triage rituals."),
    "memory_collective": ("Memory Collective", "memory_collective", "Collects stories, grief and local rituals."),
    "night_bloom": ("Night Bloom", "night_bloom", "Protects hidden beauty and after-hours growth."),
}


def build_world(
    lat: float,
    lon: float,
    radius: int = 300,
    seed: str | None = None,
    source_data: dict[str, Any] | None = None,
    provider: str = "overpass",
    fetch_timeout_seconds: int = 30,
    fetch_max_retries: int = 1,
    fetch_cache_dir: str | Path | None = None,
    refresh_cache: bool = False,
) -> dict[str, Any]:
    payload = source_data if source_data is not None else fetch_overpass_data(
        lat,
        lon,
        radius,
        timeout_seconds=fetch_timeout_seconds,
        max_retries=fetch_max_retries,
        cache_dir=fetch_cache_dir,
        refresh=refresh_cache,
    )
    elements = payload.get("elements", [])
    fallback = {"lat": lat, "lon": lon}
    world_id = f"world-{_digest(f'{lat:.5f}', f'{lon:.5f}', radius)[:12]}"
    stable_seed = seed or _digest(world_id, radius)[:12]

    prefer_zh = _should_prefer_simplified_chinese(lat=lat, lon=lon, elements=elements)

    pois = _build_pois(elements, fallback, prefer_zh=prefer_zh)
    roads = _build_roads(elements, fallback)
    landmarks = _build_landmarks(elements, fallback, prefer_zh=prefer_zh)
    theme = _pick_theme(pois)
    dominant_faction = _pick_faction(theme, pois)
    commerce_flux = round(min(1.0, len([p for p in pois if p["faction_alignment"] == "trade_guild"]) * 0.2 + len(roads) * 0.08), 2)
    anomaly_pressure = round(min(1.0, len(landmarks) * 0.25 + len([p for p in pois if p["secret_slot"]]) * 0.1), 2)
    comfort_level = round(min(1.0, len([p for p in pois if p["secret_slot"]]) * 0.18 + 0.2), 2)
    control_score = round(min(1.0, 0.25 + len(roads) * 0.08 + len(pois) * 0.03), 2)
    region_name = _region_name(world_id, pois, prefer_zh=prefer_zh)
    vibe_profile = _pick_vibe(pois)

    region = {
        "name": region_name,
        "theme": theme,
        "atmosphere": "charged" if len(roads) >= 3 else "quiet",
        "dominant_landuse": _dominant_landuse(elements),
        "narrative_summary": _region_summary(region_name, theme, len(pois), len(roads), prefer_zh=prefer_zh),
        "visual_style": vibe_profile,
        "social_tension": round(min(1.0, 0.2 + len(roads) * 0.06), 2),
        "commerce_flux": commerce_flux,
        "anomaly_pressure": anomaly_pressure,
        "class_tone": "working" if commerce_flux >= 0.4 else "mixed",
        "satire_profile": _pick_satire(pois),
        "vibe_profile": vibe_profile,
        "palette_hint": _pick_palette(pois),
        "comfort_level": comfort_level,
        "dominant_faction": dominant_faction,
        "control_score": control_score,
        "strategic_value": round(min(1.0, 0.3 + len(roads) * 0.07 + len(landmarks) * 0.1), 2),
    }

    factions = _build_factions(dominant_faction, world_id, control_score)
    memory_anchors = _build_memory_anchors(pois)
    sprites = _build_sprites(pois)
    historical_echoes = _build_historical_echoes(landmarks)
    disturbance_metrics = _build_disturbance_metrics(
        social_tension=region["social_tension"],
        commerce_flux=commerce_flux,
        anomaly_pressure=anomaly_pressure,
        comfort_level=comfort_level,
        control_score=control_score,
        roads=roads,
        pois=pois,
    )
    map2d = _build_map2d_layout(
        world_id=world_id,
        pois=pois,
        roads=roads,
        landmarks=landmarks,
        sprites=sprites,
        memory_anchors=memory_anchors,
        vibe_profile=vibe_profile,
    )
    co_creation = _build_co_creation_layer(
        world_id=world_id,
        dominant_faction=dominant_faction,
        pois=pois,
        memory_anchors=memory_anchors,
        historical_echoes=historical_echoes,
        comfort_level=comfort_level,
    )

    return {
        "world_id": world_id,
        "seed": stable_seed,
        "source": {
            "lat": lat,
            "lon": lon,
            "radius_m": radius,
            "provider": provider,
        },
        "region": region,
        "map2d": map2d,
        "pois": pois,
        "roads": roads,
        "landmarks": landmarks,
        "factions": factions,
        "historical_echoes": historical_echoes,
        "memory_anchors": memory_anchors,
        "sprites": sprites,
        "co_creation": co_creation,
        "state": {
            "version": "0.1",
            "visited": False,
            "poi_states": {
                poi["id"]: {
                    "status": (
                        "anomaly" if poi.get("secret_slot")
                        else "active" if poi.get("faction_alignment") == "trade_guild"
                        else "idle"
                    )
                }
                for poi in pois
            },
            "flags": [],
            "story_events": [],
            "faction_states": [{"faction_id": dominant_faction, "control_score": control_score}],
            "economy_state": {
                "market_pressure": commerce_flux,
                "price_mood": "strained" if commerce_flux >= 0.45 else "steady",
                "informal_trade_index": round(min(1.0, len([poi for poi in pois if poi["sprite_spawn_hint"]]) * 0.08), 2),
            },
            "disturbance_level": anomaly_pressure,
            "signal_snapshot": {
                "source_element_count": len(elements),
                "mapped_poi_count": len(pois),
                "road_count": len(roads),
                "tile_columns": map2d["tile_grid"]["columns"],
                "tile_rows": map2d["tile_grid"]["rows"],
            },
            "disturbance_metrics": disturbance_metrics,
            "spawn_window": (
                "rare" if anomaly_pressure >= 0.7
                else "active" if anomaly_pressure >= 0.4
                else "stable"
            ),
            "mystery_progress": 0,
            "active_lens": vibe_profile,
            "collection_progress": {},
            "home_inventory": [],
            "home_style": (
                "verdant_nest" if comfort_level >= 0.6
                else "warm_corner" if comfort_level >= 0.3
                else "blank_slate"
            ),
            "private_marks": _build_private_marks(pois),
            "reputation": {dominant_faction: 0},
            "route_impact": {
                "road_count": len(roads),
                "dominant_flow": roads[0]["fantasy_role"] if roads else "threshold_path",
                "walkability_mood": "porous" if len(roads) <= 2 else "pressured",
            },
            "daily_cycle": {
                "peak_phase": "dusk" if vibe_profile in {"amber_evening", "neon_nostalgia"} else "morning",
                "curfew_pressure": round(min(1.0, control_score + region["social_tension"] * 0.3), 2),
            },
            "resource_transfers": [],
            "navigation_state": {
                "spawn_node": map2d["navigation"]["spawn_node"],
                "walkable_paths": len(map2d["navigation"]["walkable_paths"]),
                "camera_zoom": map2d["camera"]["zoom"],
            },
        },
    }


def write_world(output_path: str | Path, world: dict[str, Any]) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(world, ensure_ascii=False, indent=2), encoding="utf-8")


def _build_pois(
    elements: list[dict[str, Any]],
    fallback: dict[str, float],
    *,
    prefer_zh: bool = False,
) -> list[dict[str, Any]]:
    pois: list[dict[str, Any]] = []
    for element in elements:
        tags = element.get("tags") or {}
        mapping = _match_mapping(tags)
        if mapping is None:
            continue
        poi_id = f"{element.get('type', 'item')}-{element.get('id', 'unknown')}"
        real_name = _preferred_real_name(tags, prefer_zh=prefer_zh)
        real_type = _infer_osm_type(tags)
        district_role = _district_role(mapping["fantasy_type"], real_type)
        pois.append(
            {
                "id": poi_id,
                "osm_type": real_type,
                "real_name": real_name,
                "fantasy_name": _fantasy_name(real_name, mapping["suffix"], mapping["fantasy_type"], prefer_zh=prefer_zh),
                "fantasy_type": mapping["fantasy_type"],
                "position": _extract_position(element, fallback),
                "description": (
                    f"一个被转译为{mapping['fantasy_type']}的{real_type}。"
                    if prefer_zh
                    else f"A {real_type} recast as {mapping['fantasy_type']}."
                ),
                "tags": _compact_tags(tags),
                "visual_hint": {
                    "style": mapping["vibe"],
                    "palette": mapping["palette"],
                },
                "state_ref": poi_id,
                "satire_hook": _localized_satire(mapping["fantasy_type"], mapping["satire"], prefer_zh=prefer_zh),
                "faction_alignment": mapping["faction"],
                "emotion_hook": _localized_emotion(mapping["fantasy_type"], mapping["emotion"], prefer_zh=prefer_zh),
                "district_role": district_role,
                "ritual_affordances": _ritual_affordances(mapping["fantasy_type"], mapping["secret_slot"], mapping["sprite_spawn_hint"]),
                "rumor_hook": _rumor_hook(real_name, mapping["fantasy_type"], district_role, prefer_zh=prefer_zh),
                "map_icon": _map_icon(mapping["fantasy_type"]),
                "collision_radius": _collision_radius(mapping["fantasy_type"]),
                "secret_slot": mapping["secret_slot"],
                "sprite_spawn_hint": mapping["sprite_spawn_hint"],
            }
        )
    return sorted(pois, key=lambda item: item["id"])[:12]


def _build_map2d_layout(
    *,
    world_id: str,
    pois: list[dict[str, Any]],
    roads: list[dict[str, Any]],
    landmarks: list[dict[str, Any]],
    sprites: list[dict[str, Any]],
    memory_anchors: list[dict[str, Any]],
    vibe_profile: str,
) -> dict[str, Any]:
    points = [poi["position"] for poi in pois] + [landmark["visual_hint"]["position"] for landmark in landmarks]
    bounds = _geo_bounds(points)
    tile_grid = _tile_grid(bounds, poi_count=len(pois), road_count=len(roads))
    road_nodes = [_road_to_map_path(road, bounds, tile_grid) for road in roads]
    poi_nodes = [_poi_to_map_node(index, poi, bounds, tile_grid) for index, poi in enumerate(pois)]
    landmark_nodes = [_landmark_to_map_node(index, landmark, bounds, tile_grid) for index, landmark in enumerate(landmarks)]
    spawn_node = poi_nodes[0]["id"] if poi_nodes else (landmark_nodes[0]["id"] if landmark_nodes else "spawn-origin")
    return {
        "map_id": f"map-{world_id[-8:]}",
        "projection": "topdown_2d",
        "theme_skin": _map_theme_skin(vibe_profile),
        "tile_grid": tile_grid,
        "bounds": bounds,
        "camera": {
            "mode": "follow_player",
            "anchor": _camera_anchor(poi_nodes, landmark_nodes, tile_grid),
            "zoom": 1.15 if tile_grid["columns"] <= 32 else 0.9,
        },
        "layers": [
            {"id": "ground", "z_index": 0, "tile_role": "base_floor"},
            {"id": "roads", "z_index": 1, "tile_role": "walkable_path"},
            {"id": "structures", "z_index": 2, "tile_role": "poi_shell"},
            {"id": "overlays", "z_index": 3, "tile_role": "effects_and_markers"},
        ],
        "navigation": {
            "spawn_node": spawn_node,
            "walkable_paths": road_nodes,
            "poi_nodes": [node["id"] for node in poi_nodes],
            "landmark_nodes": [node["id"] for node in landmark_nodes],
        },
        "encounter_zones": _encounter_zones(poi_nodes, landmark_nodes, sprites, memory_anchors),
        "renderables": {
            "pois": poi_nodes,
            "landmarks": landmark_nodes,
            "roads": road_nodes,
        },
    }



def _build_roads(elements: list[dict[str, Any]], fallback: dict[str, float]) -> list[dict[str, Any]]:
    roads = []
    for element in elements:
        tags = element.get("tags") or {}
        highway = tags.get("highway")
        if not highway:
            continue
        fantasy_role = ROAD_ROLES.get(highway, "threshold_path")
        roads.append(
            {
                "id": f"{element.get('type', 'way')}-{element.get('id', 'unknown')}",
                "kind": highway,
                "points": _extract_points(element, fallback),
                "fantasy_role": fantasy_role,
                "flow_intensity": "high" if highway in {"motorway", "primary", "secondary"} else "medium" if highway in {"tertiary", "residential"} else "low",
                "travel_mood": _road_travel_mood(fantasy_role),
                "tile_stroke": _road_tile_stroke(fantasy_role),
            }
        )
    return sorted(roads, key=lambda item: item["id"])[:12]


def _build_landmarks(
    elements: list[dict[str, Any]],
    fallback: dict[str, float],
    *,
    prefer_zh: bool = False,
) -> list[dict[str, Any]]:
    landmarks = []
    for element in elements:
        tags = element.get("tags") or {}
        if not (tags.get("tourism") or tags.get("historic")):
            continue
        landmarks.append(
            {
                "id": f"landmark-{element.get('type', 'item')}-{element.get('id', 'unknown')}",
                "name": _preferred_real_name(tags, prefer_zh=prefer_zh) or ("未命名地标" if prefer_zh else "Unnamed Landmark"),
                "type": tags.get("tourism") or tags.get("historic"),
                "description": (
                    "一个让城区官方叙事显得略微不稳定的地点。"
                    if prefer_zh
                    else "A place where the district's official story feels slightly unstable."
                ),
                "visual_hint": {
                    "position": _extract_position(element, fallback),
                    "style": "memory_spire",
                },
            }
        )
    return sorted(landmarks, key=lambda item: item["id"])[:6]


def _build_factions(faction_id: str, world_id: str, control_score: float) -> list[dict[str, Any]]:
    name, archetype, doctrine = FACTION_DETAILS.get(
        faction_id,
        ("Memory Collective", "memory_collective", "Guards what the district refuses to forget."),
    )
    return [
        {
            "id": faction_id,
            "name": name,
            "archetype": archetype,
            "doctrine": doctrine,
            "influence": control_score,
            "resource_focus": ["attention", "movement"],
            "territories": [world_id],
            "relations": [
                {
                    "target": _counter_faction(faction_id),
                    "status": "contested",
                    "intensity": round(min(1.0, control_score + 0.15), 2),
                }
            ],
        }
    ]


def _build_memory_anchors(pois: list[dict[str, Any]]) -> list[dict[str, Any]]:
    anchors = []
    for poi in pois:
        if not poi["secret_slot"]:
            continue
        anchors.append(
            {
                "id": f"anchor-{poi['id']}",
                "anchor_type": "secret_garden_slot",
                "tone": "tender",
                "visibility": "private",
                "linked_pois": [poi["id"]],
                "unlock_conditions": ["visit_poi"],
                "resonance": round(min(1.0, 0.45 + len(poi.get("ritual_affordances", [])) * 0.12), 2),
                "prompt": f"What feeling does {poi['fantasy_name']} let you keep without explanation?",
            }
        )
    return anchors[:3]


def _build_sprites(pois: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sprites = []
    for poi in pois:
        if not poi["sprite_spawn_hint"]:
            continue
        sprites.append(
            {
                "id": f"sprite-{poi['id']}",
                "species": f"{poi['fantasy_type']}_sprite",
                "rarity": "common",
                "spawn_conditions": ["visit_poi"],
                "linked_poi": poi["id"],
                "drop_tags": [poi["fantasy_type"]],
                "temperament": "shy" if poi.get("secret_slot") else "curious",
                "active_hours": "dusk" if poi["visual_hint"]["style"] in {"amber_evening", "neon_nostalgia"} else "all_day",
            }
        )
    return sprites[:3]


def _build_private_marks(pois: list[dict[str, Any]]) -> list[dict[str, Any]]:
    marks = []
    for poi in pois:
        if not poi.get("secret_slot"):
            continue
        marks.append(
            {
                "id": f"mark-{poi['id']}",
                "linked_poi": poi["id"],
                "emotion": poi.get("emotion_hook") or "A quiet moment lingers here.",
                "capsule_type": "emotion",
                "visibility": "private",
                "stability": "fragile" if poi["faction_alignment"] == "trade_guild" else "settled",
            }
        )
    return marks[:3]


def _build_historical_echoes(landmarks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    echoes = []
    for landmark in landmarks:
        echoes.append(
            {
                "id": f"echo-{landmark['id']}",
                "linked_landmark": landmark["id"],
                "era": "unspecified",
                "tone": "melancholic",
                "fragment": "Something important happened here, though few remember exactly what.",
                "visibility": "public",
                "trigger_hint": "pause_and_observe",
                "severity": "medium",
            }
        )
    return echoes[:3]


def _build_co_creation_layer(
    *,
    world_id: str,
    dominant_faction: str,
    pois: list[dict[str, Any]],
    memory_anchors: list[dict[str, Any]],
    historical_echoes: list[dict[str, Any]],
    comfort_level: float,
) -> dict[str, Any]:
    seed_poi = pois[0] if pois else {}
    private_mark_capacity = min(3, len(memory_anchors))
    local_legend_capacity = min(2, max(1, len(historical_echoes) or len(pois)))
    ritual_capacity = min(2, max(1, len([poi for poi in pois if poi.get("secret_slot")]) or 1))
    participation_modes = [
        {
            "id": "private_capsules",
            "name": "Private Capsules",
            "visibility": "private",
            "player_action": "leave_emotion_capsule",
            "capacity_hint": private_mark_capacity,
            "status": "open" if private_mark_capacity else "limited",
            "lens_hint": "hearth",
        },
        {
            "id": "street_legends",
            "name": "Street Legends",
            "visibility": "local_public",
            "player_action": "add_place_legend",
            "capacity_hint": local_legend_capacity,
            "status": "open",
            "lens_hint": "chronicle",
        },
        {
            "id": "repair_rituals",
            "name": "Repair Rituals",
            "visibility": "global",
            "player_action": "contribute_repair_trace",
            "capacity_hint": ritual_capacity,
            "status": "open" if comfort_level >= 0.3 else "fragile",
            "lens_hint": "oracle",
        },
    ]
    return {
        "city_myth_stage": "seeded",
        "writing_rights": {
            "private": ["emotion_capsule", "memory_anchor_note"],
            "local_public": ["place_legend", "route_note"],
            "global": ["repair_trace", "district_broadcast_vote"],
        },
        "participation_modes": participation_modes,
        "memory_policy": {
            "district_memory_open": True,
            "retention_model": "layered_echo",
            "echo_sources": len(historical_echoes),
            "anchor_sources": len(memory_anchors),
            "max_public_legends": min(3, max(1, len(pois))),
        },
        "open_threads": [
            {
                "id": f"thread-{world_id}-capsule",
                "title": f"Leave a private capsule near {seed_poi.get('fantasy_name') or 'the district edge'}.",
                "visibility": "private",
                "goal": "Turn a passing feeling into a recoverable local memory.",
            },
            {
                "id": f"thread-{world_id}-legend",
                "title": "Add a street legend that future visitors can inherit.",
                "visibility": "local_public",
                "goal": f"Expand the district myth beyond {dominant_faction} control.",
            },
            {
                "id": f"thread-{world_id}-repair",
                "title": "Leave a repair trace the whole district can remember.",
                "visibility": "global",
                "goal": "Make care accumulate as visible civic mythology.",
            },
        ],
    }


def _pick_theme(pois: list[dict[str, Any]]) -> str:
    scores: dict[str, int] = {}
    theme_map = {
        "whispering_grove": "verdant_district",
        "healing_sanctum": "healing_quarter",
        "supply_outpost": "market_quarter",
        "judgement_tower": "bureau_district",
        "ember_parlor": "market_quarter",
        "lore_academy": "scholar_quarter",
        "debt_cathedral": "bureau_district",
        "feast_hall": "market_quarter",
        "refuel_station": "market_quarter",
        "memory_archive": "scholar_quarter",
        "spirit_sanctum": "healing_quarter",
        "dormant_lot": "threshold_district",
        "remedy_post": "healing_quarter",
        "labor_forge": "market_quarter",
        "contract_spire": "bureau_district",
    }
    for poi in pois:
        theme = theme_map.get(poi["fantasy_type"], "threshold_district")
        scores[theme] = scores.get(theme, 0) + 1
    return max(scores, key=scores.get) if scores else "threshold_district"


def _pick_faction(theme: str, pois: list[dict[str, Any]]) -> str:
    if pois:
        return max(
            {poi["faction_alignment"]: sum(1 for item in pois if item["faction_alignment"] == poi["faction_alignment"]) for poi in pois},
            key=lambda key: sum(1 for item in pois if item["faction_alignment"] == key),
        )
    return {
        "verdant_district": "night_bloom",
        "healing_quarter": "clinic_circle",
        "market_quarter": "trade_guild",
        "bureau_district": "order_bureau",
        "scholar_quarter": "memory_collective",
    }.get(theme, "memory_collective")


def _pick_vibe(pois: list[dict[str, Any]]) -> str:
    if not pois:
        return "quiet_rain"
    counts: dict[str, int] = {}
    for poi in pois:
        v = poi["visual_hint"]["style"]
        counts[v] = counts.get(v, 0) + 1
    return max(counts, key=counts.get)


def _pick_palette(pois: list[dict[str, Any]]) -> str:
    if not pois:
        return "paper_and_ink"
    counts: dict[str, int] = {}
    for poi in pois:
        p = poi["visual_hint"]["palette"]
        counts[p] = counts.get(p, 0) + 1
    return max(counts, key=counts.get)


def _pick_satire(pois: list[dict[str, Any]]) -> str:
    return pois[0]["satire_hook"] if pois else "Daily circulation shapes the district more than any single monument."


def _region_name(world_id: str, pois: list[dict[str, Any]], *, prefer_zh: bool = False) -> str:
    named_poi = next((poi for poi in pois if poi["real_name"]), None)
    if named_poi:
        return f"{named_poi['real_name']}周边" if prefer_zh else f"Around {named_poi['real_name']}"
    return f"城区片段{world_id[-6:]}" if prefer_zh else f"Sector {world_id[-6:]}"


def _region_summary(region_name: str, theme: str, poi_count: int, road_count: int, *, prefer_zh: bool = False) -> str:
    if prefer_zh:
        return f"{region_name} 被转译为 {theme}，映射了 {poi_count} 个地点与 {road_count} 条可通行路径。"
    return f"{region_name} is rendered as a {theme} with {poi_count} mapped POIs and {road_count} traversable routes."


def _dominant_landuse(elements: list[dict[str, Any]]) -> str:
    counts: dict[str, int] = {}
    for element in elements:
        landuse = (element.get("tags") or {}).get("landuse")
        if landuse:
            counts[landuse] = counts.get(landuse, 0) + 1
    return max(counts, key=counts.get) if counts else "mixed_use"


def _match_mapping(tags: dict[str, Any]) -> dict[str, Any] | None:
    for key, value, mapping in RULES:
        if tags.get(key) == value:
            return mapping
    # office 通配：任何 office=* 标签均映射为 contract_spire（置于精确匹配之后）
    if "office" in tags:
        return next((mapping for key, value, mapping in RULES if key == "office"), {
            "fantasy_type": "contract_spire",
            "suffix": "Spire",
            "theme": "bureau_district",
            "faction": "order_bureau",
            "satire": "Hierarchy is expressed in floor count and badge colour.",
            "emotion": "Ambition circulates here under fluorescent light.",
            "vibe": "iron_blue",
            "palette": "grey_and_blue",
            "secret_slot": False,
            "sprite_spawn_hint": False,
        })
    if "shop" in tags:
        return next(mapping for key, value, mapping in RULES if key == "shop" and value == "convenience")
    return None


def _infer_osm_type(tags: dict[str, Any]) -> str:
    for key in ("amenity", "shop", "leisure", "tourism", "historic", "building"):
        if key in tags:
            return str(tags[key])
    return "unknown"


def _preferred_real_name(tags: dict[str, Any], *, prefer_zh: bool = False) -> str | None:
    for key in ("name:zh-Hans", "name:zh", "official_name:zh", "alt_name:zh"):
        value = tags.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    base_name = tags.get("name")
    normalized_name = base_name.strip() if isinstance(base_name, str) and base_name.strip() else None
    if not prefer_zh:
        return normalized_name

    if normalized_name:
        translated_name = _translate_name_to_simplified_chinese(normalized_name)
        if translated_name:
            return translated_name

    return _generic_real_name_zh(tags) or normalized_name


def _should_prefer_simplified_chinese(*, lat: float, lon: float, elements: list[dict[str, Any]]) -> bool:
    if 18.0 <= lat <= 54.5 and 73.0 <= lon <= 135.5:
        return True

    country_keys = ("addr:country", "country", "ISO3166-1", "ISO3166-1:alpha2")
    for element in elements:
        tags = element.get("tags") or {}
        for key in country_keys:
            value = tags.get(key)
            if isinstance(value, str) and value.strip().upper() in {"CN", "CHN", "中国", "中华人民共和国"}:
                return True
    return False


def _translate_name_to_simplified_chinese(name: str) -> str | None:
    if _contains_japanese_kana(name):
        return None

    if _contains_cjk(name):
        return _to_simplified_chinese(name)

    normalized = name.casefold()
    punctuation_map = str.maketrans({"&": " ", "-": " ", "_": " ", "/": " "})
    tokens = [token for token in normalized.translate(punctuation_map).split() if token]
    if not tokens:
        return None

    direct_map = {
        "hospital": "医院",
        "clinic": "诊所",
        "pharmacy": "药店",
        "drugstore": "药店",
        "park": "公园",
        "garden": "花园",
        "school": "学校",
        "college": "学院",
        "university": "大学",
        "bank": "银行",
        "restaurant": "餐厅",
        "cafe": "咖啡馆",
        "coffee": "咖啡",
        "library": "图书馆",
        "gym": "健身房",
        "fitness": "健身",
        "police": "警察局",
        "station": "站",
        "hotel": "酒店",
        "inn": "酒店",
        "hostel": "旅舍",
        "motel": "汽车旅馆",
        "mall": "商场",
        "market": "市场",
        "shop": "商店",
        "supermarket": "超市",
        "store": "商店",
        "tower": "塔",
        "gate": "门",
        "bridge": "桥",
        "road": "路",
        "street": "街",
        "avenue": "大道",
        "plaza": "广场",
        "square": "广场",
        "center": "中心",
        "centre": "中心",
        "building": "大厦",
        "museum": "博物馆",
        "theatre": "剧院",
        "cinema": "影院",
        "temple": "寺",
        "memorial": "纪念地",
        "monument": "纪念碑",
        "garden": "花园",
        "international": "国际",
        "peoples": "人民",
        "people's": "人民",
        "mcdonalds": "麦当劳",
        "starbucks": "星巴克",
        "kfc": "肯德基",
        "burger": "汉堡",
        "king": "王",
        "subway": "赛百味",
        "metro": "地铁",
        "line": "线",
        "exit": "出口",
        "entrance": "入口",
        "tower": "塔",
        "office": "办公楼",
        "centerpoint": "中心点",
        "home": "家园",
        "express": "快捷",
        "holiday": "假日",
        "inns": "酒店",
        "ji": "全季",
        "hanting": "汉庭",
        "rujia": "如家",
        "homeinn": "如家",
        "homeinns": "如家",
        "hi": "海友",
    }
    directional_map = {
        "east": "东",
        "west": "西",
        "south": "南",
        "north": "北",
        "central": "中央",
    }

    translated_tokens = [direct_map.get(token, directional_map.get(token)) for token in tokens]
    recognized = [token for token in translated_tokens if token]
    if not recognized:
        return None

    if len(recognized) == 1 and len(tokens) > 1:
        return recognized[0]
    return "".join(recognized)


def _generic_real_name_zh(tags: dict[str, Any]) -> str | None:
    return {
        "hospital": "医院",
        "clinic": "诊所",
        "pharmacy": "药店",
        "drugstore": "药店",
        "park": "公园",
        "garden": "花园",
        "school": "学校",
        "college": "学院",
        "university": "大学",
        "bank": "银行",
        "restaurant": "餐厅",
        "cafe": "咖啡馆",
        "library": "图书馆",
        "gym": "健身房",
        "fitness": "健身房",
        "police": "警察局",
        "station": "站",
        "hotel": "酒店",
        "inn": "酒店",
        "hostel": "旅舍",
        "motel": "汽车旅馆",
        "mall": "商场",
        "market": "市场",
        "shop": "商店",
        "supermarket": "超市",
        "store": "商店",
        "museum": "博物馆",
        "theatre": "剧院",
        "cinema": "影院",
        "temple": "寺",
        "attraction": "景点",
        "memorial": "纪念地",
        "monument": "纪念碑",
        "tower": "塔",
        "gate": "门",
        "bridge": "桥",
        "building": "建筑",
        "yes": "建筑",
        "commercial": "商业建筑",
        "residential": "住宅楼",
        "apartments": "公寓",
        "office": "办公楼",
    }.get(_infer_osm_type(tags))

def _contains_cjk(value: str) -> bool:
    return any("CJK" in unicodedata.name(char, "") for char in value)



def _contains_japanese_kana(value: str) -> bool:
    return any("HIRAGANA" in unicodedata.name(char, "") or "KATAKANA" in unicodedata.name(char, "") for char in value)



def _to_simplified_chinese(value: str) -> str:
    traditional_to_simplified = str.maketrans(
        {
            "臺": "台",
            "門": "门",
            "廣": "广",
            "場": "场",
            "醫": "医",
            "圖": "图",
            "書": "书",
            "館": "馆",
            "樓": "楼",
            "學": "学",
            "體": "体",
            "藝": "艺",
            "藥": "药",
            "處": "处",
            "國": "国",
            "號": "号",
            "樂": "乐",
            "區": "区",
            "會": "会",
        }
    )
    return value.translate(traditional_to_simplified)


def _fantasy_name(real_name: str | None, suffix: str, fantasy_type: str, *, prefer_zh: bool = False) -> str:
    base = real_name or fantasy_type.replace("_", " ").title()
    if prefer_zh and real_name and _contains_cjk(real_name):
        zh_suffix = _fantasy_suffix_zh(suffix, fantasy_type)
        return base if not zh_suffix or base.endswith(zh_suffix) else f"{base}{zh_suffix}"
    return base if base.endswith(suffix) else f"{base} {suffix}"


def _fantasy_suffix_zh(suffix: str, fantasy_type: str) -> str:
    return {
        "Grove": "林苑",
        "Sanctum": "圣所",
        "Outpost": "站",
        "Tower": "塔",
        "Parlor": "馆",
        "Academy": "学堂",
        "Cathedral": "堂",
        "Hall": "厅",
        "Station": "站",
        "Archive": "档案馆",
        "Temple": "神殿",
        "Lot": "空场",
        "Post": "铺",
        "Forge": "工坊",
        "Spire": "尖塔",
    }.get(suffix, {
        "whispering_grove": "林苑",
        "healing_sanctum": "圣所",
        "supply_outpost": "站",
        "judgement_tower": "塔",
        "ember_parlor": "馆",
        "lore_academy": "学堂",
        "debt_cathedral": "堂",
        "feast_hall": "厅",
        "refuel_station": "站",
        "memory_archive": "档案馆",
        "spirit_sanctum": "神殿",
        "dormant_lot": "空场",
        "remedy_post": "铺",
        "labor_forge": "工坊",
        "contract_spire": "尖塔",
    }.get(fantasy_type, ""))


def _compact_tags(tags: dict[str, Any]) -> list[str]:
    keys = ("amenity", "shop", "leisure", "tourism", "historic", "highway", "landuse")
    return [f"{key}={tags[key]}" for key in keys if key in tags]


def _geo_bounds(points: list[dict[str, float]]) -> dict[str, float]:
    if not points:
        return {
            "min_lat": 0.0,
            "max_lat": 1.0,
            "min_lon": 0.0,
            "max_lon": 1.0,
        }
    lats = [point["lat"] for point in points]
    lons = [point["lon"] for point in points]
    min_lat = min(lats)
    max_lat = max(lats)
    min_lon = min(lons)
    max_lon = max(lons)
    if min_lat == max_lat:
        max_lat += 0.0001
    if min_lon == max_lon:
        max_lon += 0.0001
    return {
        "min_lat": min_lat,
        "max_lat": max_lat,
        "min_lon": min_lon,
        "max_lon": max_lon,
    }



def _tile_grid(bounds: dict[str, float], poi_count: int, road_count: int) -> dict[str, Any]:
    lat_span = bounds["max_lat"] - bounds["min_lat"]
    lon_span = bounds["max_lon"] - bounds["min_lon"]
    columns = max(24, min(48, 24 + poi_count * 2 + road_count * 2))
    rows = max(18, min(40, int(round(columns * (lat_span / lon_span))) if lon_span else 18))
    return {
        "tile_size": 16,
        "columns": columns,
        "rows": max(18, rows),
        "origin": {"x": 0, "y": 0},
    }



def _world_to_tile(position: dict[str, float], bounds: dict[str, float], tile_grid: dict[str, Any]) -> dict[str, int]:
    lon_span = bounds["max_lon"] - bounds["min_lon"]
    lat_span = bounds["max_lat"] - bounds["min_lat"]
    x_ratio = (position["lon"] - bounds["min_lon"]) / lon_span if lon_span else 0.5
    y_ratio = (bounds["max_lat"] - position["lat"]) / lat_span if lat_span else 0.5
    return {
        "x": max(0, min(tile_grid["columns"] - 1, int(round(x_ratio * (tile_grid["columns"] - 1))))),
        "y": max(0, min(tile_grid["rows"] - 1, int(round(y_ratio * (tile_grid["rows"] - 1))))),
    }



def _camera_anchor(
    poi_nodes: list[dict[str, Any]],
    landmark_nodes: list[dict[str, Any]],
    tile_grid: dict[str, Any],
) -> dict[str, int]:
    if poi_nodes:
        return dict(poi_nodes[0]["tile_position"])
    if landmark_nodes:
        return dict(landmark_nodes[0]["tile_position"])
    return {"x": tile_grid["columns"] // 2, "y": tile_grid["rows"] // 2}



def _poi_to_map_node(index: int, poi: dict[str, Any], bounds: dict[str, float], tile_grid: dict[str, Any]) -> dict[str, Any]:
    tile_position = _world_to_tile(poi["position"], bounds, tile_grid)
    return {
        "id": poi["id"],
        "kind": "poi",
        "label": poi["fantasy_name"],
        "tile_position": tile_position,
        "footprint": _poi_footprint(poi["fantasy_type"]),
        "icon": poi.get("map_icon", "district_node"),
        "layer": "structures",
        "z_index": 20 + index,
        "collision_radius": poi.get("collision_radius", 1),
        "interact_radius": 2 if poi.get("secret_slot") else 1,
        "biome_hint": poi["visual_hint"]["palette"],
    }



def _landmark_to_map_node(index: int, landmark: dict[str, Any], bounds: dict[str, float], tile_grid: dict[str, Any]) -> dict[str, Any]:
    tile_position = _world_to_tile(landmark["visual_hint"]["position"], bounds, tile_grid)
    return {
        "id": landmark["id"],
        "kind": "landmark",
        "label": landmark["name"],
        "tile_position": tile_position,
        "footprint": {"w": 3, "h": 3},
        "icon": "memory_spire",
        "layer": "overlays",
        "z_index": 40 + index,
        "interact_radius": 3,
    }



def _road_to_map_path(road: dict[str, Any], bounds: dict[str, float], tile_grid: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": road["id"],
        "kind": road["fantasy_role"],
        "layer": "roads",
        "stroke": road.get("tile_stroke", 1),
        "flow_intensity": road["flow_intensity"],
        "points": [_world_to_tile(point, bounds, tile_grid) for point in road["points"]],
    }



def _encounter_zones(
    poi_nodes: list[dict[str, Any]],
    landmark_nodes: list[dict[str, Any]],
    sprites: list[dict[str, Any]],
    memory_anchors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    zones = []
    for node in poi_nodes[:6]:
        zone_type = "memory" if any(anchor["linked_pois"][0] == node["id"] for anchor in memory_anchors) else "resource"
        zones.append(
            {
                "id": f"zone-{node['id']}",
                "center": node["tile_position"],
                "radius": 3 if zone_type == "memory" else 2,
                "encounter_type": zone_type,
                "intensity": 0.7 if any(sprite["linked_poi"] == node["id"] for sprite in sprites) else 0.45,
            }
        )
    for landmark in landmark_nodes[:2]:
        zones.append(
            {
                "id": f"zone-{landmark['id']}",
                "center": landmark["tile_position"],
                "radius": 4,
                "encounter_type": "landmark_echo",
                "intensity": 0.85,
            }
        )
    return zones



def _extract_position(element: dict[str, Any], fallback: dict[str, float]) -> dict[str, float]:
    if "lat" in element and "lon" in element:
        return {"lat": element["lat"], "lon": element["lon"]}
    if "center" in element:
        return {"lat": element["center"]["lat"], "lon": element["center"]["lon"]}
    geometry = element.get("geometry") or []
    if geometry:
        return {"lat": geometry[0]["lat"], "lon": geometry[0]["lon"]}
    return {"lat": fallback["lat"], "lon": fallback["lon"]}


def _extract_points(element: dict[str, Any], fallback: dict[str, float]) -> list[dict[str, float]]:
    geometry = element.get("geometry") or []
    if geometry:
        return [{"lat": point["lat"], "lon": point["lon"]} for point in geometry]
    position = _extract_position(element, fallback)
    return [position, position]


def _district_role(fantasy_type: str, real_type: str) -> str:
    role_map = {
        "ember_parlor": "social_hearth",
        "supply_outpost": "daily_supply_node",
        "whispering_grove": "memory_shelter",
        "healing_sanctum": "fragile_recovery_node",
        "debt_cathedral": "debt_administration_hub",
        "feast_hall": "public_desire_stage",
        "memory_archive": "civic_recall_chamber",
        "remedy_post": "micro_triage_counter",
        "labor_forge": "discipline_theatre",
        "contract_spire": "clerical_command_post",
    }
    return role_map.get(fantasy_type, f"{real_type}_node")



def _ritual_affordances(fantasy_type: str, secret_slot: bool, sprite_spawn_hint: bool) -> list[str]:
    affordances = ["observe"]
    if secret_slot:
        affordances.append("leave_memory")
    if sprite_spawn_hint:
        affordances.append("collect_trace")
    if fantasy_type in {"healing_sanctum", "remedy_post", "spirit_sanctum"}:
        affordances.append("seek_relief")
    if fantasy_type in {"memory_archive", "ember_parlor", "lore_academy"}:
        affordances.append("exchange_stories")
    return affordances



_SATIRE_HOOKS_ZH = {
    "whispering_grove": "绿色喘息仍旧夹在通勤压力之间。",
    "healing_sanctum": "照护像圣事一样被陈列，但可获得性依旧被配给。",
    "supply_outpost": "货物总能买到，只是不是每个人都买得起。",
    "judgement_tower": "秩序无处不在，舒适却少得多。",
    "ember_parlor": "谈话很温暖，但时间始终明码标价。",
    "lore_academy": "知识承诺流动性，也复制着层级。",
    "debt_cathedral": "财富在这里被膜拜，体现在廊柱与队列里。",
    "feast_hall": "快乐始终供应，只为出得起价的人开放。",
    "refuel_station": "速度与便利掩盖了交易里真正流失的东西。",
    "memory_archive": "公共记忆被保存在这里，等着仍愿意在意它的人。",
    "spirit_sanctum": "即使会众减少，神圣感也没有真正退场。",
    "dormant_lot": "空间先分配给机器，人才被排到后面。",
    "remedy_post": "缓解可以买到，但身体会继续替价格埋单。",
    "labor_forge": "身体像生产单元一样被优化与展示。",
    "contract_spire": "层级通过楼层数和工牌颜色被表达出来。",
}

_EMOTION_HOOKS_ZH = {
    "whispering_grove": "这里像一块安静的夹层，能容纳私人记忆慢慢沉下去。",
    "healing_sanctum": "门口附近悬着一种焦虑却不肯熄灭的希望。",
    "supply_outpost": "细小的日常让这片地带勉强维持着可生活感。",
    "judgement_tower": "你会先被注视，然后才被允许靠近。",
    "ember_parlor": "暖意、闲谈和等待在这里悄悄重叠。",
    "lore_academy": "抱负与疲惫共用着同一条走廊。",
    "debt_cathedral": "一种关于义务的低鸣始终悬着，不会真正散去。",
    "feast_hall": "饥饿与庆祝被摆在同一张桌上。",
    "refuel_station": "效率开始殖民每一次停顿。",
    "memory_archive": "这里安静、克制，像积年照料留下的微尘。",
    "spirit_sanctum": "有些比城市更古老的东西，正从这里看着你。",
    "dormant_lot": "这里的空缺，本身就像一种被安排好的期待。",
    "remedy_post": "小小的急迫感，与漫长的耐受并排存在。",
    "labor_forge": "用力和疲惫都被公开表演出来。",
    "contract_spire": "野心沿着冷白灯的走廊持续循环。",
}


def _localized_satire(fantasy_type: str, fallback: str, *, prefer_zh: bool = False) -> str:
    if prefer_zh:
        return _SATIRE_HOOKS_ZH.get(fantasy_type, fallback)
    return fallback



def _localized_emotion(fantasy_type: str, fallback: str, *, prefer_zh: bool = False) -> str:
    if prefer_zh:
        return _EMOTION_HOOKS_ZH.get(fantasy_type, fallback)
    return fallback



def _rumor_hook(real_name: str | None, fantasy_type: str, district_role: str, *, prefer_zh: bool = False) -> str:
    subject = real_name or (fantasy_type.replace("_", " ") if not prefer_zh else _localized_emotion(fantasy_type, fantasy_type, prefer_zh=True))
    if prefer_zh:
        return f"人们说，{subject} 会在 {district_role} 失衡时，悄悄改变这片街区的走向。"
    return f"People say {subject} quietly shapes the district whenever the {district_role} falls out of sync."



def _map_icon(fantasy_type: str) -> str:
    return {
        "ember_parlor": "tea_house",
        "supply_outpost": "supply_crate",
        "whispering_grove": "grove_tree",
        "healing_sanctum": "clinic_cross",
        "judgement_tower": "watchtower",
        "lore_academy": "open_book",
        "debt_cathedral": "vault_gate",
        "feast_hall": "market_bowl",
        "refuel_station": "neon_burger",
        "memory_archive": "archive_stack",
        "spirit_sanctum": "shrine_gate",
        "dormant_lot": "empty_plot",
        "remedy_post": "small_phial",
        "labor_forge": "forge_anvil",
        "contract_spire": "office_block",
    }.get(fantasy_type, "district_node")



def _collision_radius(fantasy_type: str) -> int:
    return {
        "whispering_grove": 2,
        "healing_sanctum": 2,
        "judgement_tower": 2,
        "debt_cathedral": 2,
        "feast_hall": 2,
        "memory_archive": 2,
        "contract_spire": 2,
    }.get(fantasy_type, 1)



def _poi_footprint(fantasy_type: str) -> dict[str, int]:
    return {
        "whispering_grove": {"w": 3, "h": 3},
        "healing_sanctum": {"w": 3, "h": 2},
        "judgement_tower": {"w": 2, "h": 3},
        "debt_cathedral": {"w": 3, "h": 3},
        "feast_hall": {"w": 3, "h": 2},
        "memory_archive": {"w": 3, "h": 2},
        "contract_spire": {"w": 2, "h": 3},
    }.get(fantasy_type, {"w": 2, "h": 2})



def _road_tile_stroke(fantasy_role: str) -> int:
    return {
        "iron_lane": 3,
        "trade_route": 3,
        "market_street": 2,
        "lantern_lane": 2,
        "ritual_path": 1,
    }.get(fantasy_role, 1)



def _map_theme_skin(vibe_profile: str) -> str:
    return {
        "amber_evening": "lantern_evening",
        "neon_nostalgia": "neon_market",
        "quiet_rain": "mist_clinic",
        "ghibli_town": "soft_verdant",
        "chalk_dawn": "paper_dawn",
        "iron_blue": "blue_steel",
    }.get(vibe_profile, "quiet_city")



def _road_travel_mood(fantasy_role: str) -> str:
    return {
        "iron_lane": "relentless",
        "trade_route": "transactional",
        "market_street": "negotiated",
        "lantern_lane": "intimate",
        "ritual_path": "reflective",
    }.get(fantasy_role, "uncertain")



def _counter_faction(faction_id: str) -> str:
    return {
        "trade_guild": "memory_collective",
        "order_bureau": "night_bloom",
        "clinic_circle": "trade_guild",
        "memory_collective": "order_bureau",
        "night_bloom": "order_bureau",
    }.get(faction_id, "memory_collective")



def _build_disturbance_metrics(
    *,
    social_tension: float,
    commerce_flux: float,
    anomaly_pressure: float,
    comfort_level: float,
    control_score: float,
    roads: list[dict[str, Any]],
    pois: list[dict[str, Any]],
) -> dict[str, float]:
    spawn_potential = round(min(1.0, anomaly_pressure * 0.55 + len([poi for poi in pois if poi.get("sprite_spawn_hint")]) * 0.08), 2)
    comfort_drift = round(comfort_level - 0.5, 2)
    vibe_amplitude = round(min(1.0, control_score * 0.35 + len(roads) * 0.08 + len({poi["visual_hint"]["style"] for poi in pois}) * 0.07), 2)
    return {
        "social_tension": social_tension,
        "commerce_flux": commerce_flux,
        "anomaly_pressure": anomaly_pressure,
        "comfort_drift": comfort_drift,
        "vibe_amplitude": vibe_amplitude,
        "spawn_potential": spawn_potential,
    }



def _digest(*parts: Any) -> str:
    joined = "|".join(str(part) for part in parts)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()
