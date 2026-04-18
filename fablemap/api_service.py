from __future__ import annotations

from pathlib import Path
from typing import Any


def build_health_payload(*, fixture_file: Path | None, frontend_root: Path | None, output_root: Path) -> dict[str, Any]:
    return {
        "status": "ok",
        "fixture_available": bool(fixture_file and fixture_file.exists()),
        "frontend_available": bool(frontend_root and frontend_root.exists()),
        "output_root": str(output_root),
    }


def build_meta_payload(*, base_url: str) -> dict[str, Any]:
    return {
        "project": "FableMap",
        "frontend_mode": "separated-shell",
        "api_base": base_url,
        "default_preview_base": f"{base_url}/generated",
        "default_coordinates": {
            "lat": 35.6580,
            "lon": 139.7016,
            "radius": 300,
        },
        "supported_modes": ["live", "fixture"],
        "default_mode": "fixture",
        "endpoints": {
            "health": "/api/health",
            "meta": "/api/meta",
            "nearby": "/api/nearby",
        },
    }


def build_nearby_payload(*, result: dict[str, Any], base_url: str, mode: str, run_id: str) -> dict[str, Any]:
    import json as _json

    payload = dict(result)
    world_path = Path(result["world"]) if result.get("world") else None
    world_data = _json.loads(world_path.read_text(encoding="utf-8")) if world_path and world_path.exists() else None
    pois = world_data.get("pois") or [] if isinstance(world_data, dict) else []
    landmarks = world_data.get("landmarks") or [] if isinstance(world_data, dict) else []
    roads = world_data.get("roads") or [] if isinstance(world_data, dict) else []
    map2d = world_data.get("map2d") or {} if isinstance(world_data, dict) else {}
    encounter_zones = map2d.get("encounter_zones") or [] if isinstance(map2d, dict) else []
    primary_poi_id = pois[0].get("id") if pois and isinstance(pois[0], dict) else None
    primary_zone_id = encounter_zones[0].get("id") if encounter_zones and isinstance(encounter_zones[0], dict) else None

    # Compute POI statistics (place protocol P0)
    pois_by_type: dict[str, int] = {}
    pois_by_faction: dict[str, int] = {}
    pois_by_osm_type: dict[str, int] = {}
    for poi in pois:
        if not isinstance(poi, dict):
            continue
        poi_type = str(poi.get("fantasy_type") or "unknown")
        poi_faction = str(poi.get("faction_alignment") or "neutral")
        poi_osm = str(poi.get("osm_type") or "unknown")
        pois_by_type[poi_type] = pois_by_type.get(poi_type, 0) + 1
        pois_by_faction[poi_faction] = pois_by_faction.get(poi_faction, 0) + 1
        pois_by_osm_type[poi_osm] = pois_by_osm_type.get(poi_osm, 0) + 1

    payload.update(
        {
            "mode": mode,
            "run_id": run_id,
            "preview_url": f"{base_url}/generated/{run_id}/bundle/index.html",
            "manifest_url": f"{base_url}/generated/{run_id}/bundle/manifest.json",
            "world_url": f"{base_url}/generated/{run_id}/world.json",
            "frontend_url": f"{base_url}/",
            "world": world_data,
            "primary_poi_id": primary_poi_id,
            "primary_zone_id": primary_zone_id,
            "poi_count": len(pois),
            "landmark_count": len(landmarks),
            "road_count": len(roads),
            "poi_states": {
                "total": len(pois),
                "by_type": pois_by_type,
                "by_faction": pois_by_faction,
                "by_osm_type": pois_by_osm_type,
            },
        }
    )
    return payload
