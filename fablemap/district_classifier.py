"""District Type Identification"""
from typing import List, Dict

def identify_district_type(pois: List[Dict]) -> str:
    """Identify district type based on POI composition"""

    office_count = sum(1 for p in pois if p.get("fantasy_type") in ["power_tower", "order_hub"])
    residential_old = sum(1 for p in pois if p.get("age", 0) > 20)
    commercial = sum(1 for p in pois if p.get("fantasy_type") in ["supply_depot", "trade_post", "feast_hall"])
    park = sum(1 for p in pois if p.get("fantasy_type") == "healing_grove")
    industrial = sum(1 for p in pois if "factory" in p.get("name", "").lower())

    if office_count > 5:
        return "order_tower"
    if residential_old > 10:
        return "memory_ruins"
    if commercial > 8:
        return "flowing_market"
    if park > 3:
        return "healing_oasis"
    if industrial > 2:
        return "edge_rift"

    return "mixed"

def get_district_mood(district_type: str, time_of_day: str) -> str:
    """Get district mood based on type and time"""

    moods = {
        "order_tower": {
            "morning": "awakening_pressure",
            "afternoon": "peak_tension",
            "evening": "fading_control",
            "night": "empty_authority"
        },
        "memory_ruins": {
            "morning": "nostalgic_whispers",
            "afternoon": "faded_echoes",
            "evening": "deepening_shadows",
            "night": "haunted_silence"
        },
        "flowing_market": {
            "morning": "rising_energy",
            "afternoon": "chaotic_abundance",
            "evening": "neon_pulse",
            "night": "secret_trades"
        },
        "healing_oasis": {
            "morning": "gentle_awakening",
            "afternoon": "peaceful_refuge",
            "evening": "golden_serenity",
            "night": "mystical_calm"
        },
        "edge_rift": {
            "morning": "industrial_hum",
            "afternoon": "forgotten_edges",
            "evening": "liminal_space",
            "night": "void_calling"
        }
    }

    return moods.get(district_type, {}).get(time_of_day, "neutral")
