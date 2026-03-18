"""Dynamic Signals - Time, Weather, Traffic"""
from datetime import datetime
from typing import Optional

class DynamicSignals:
    def __init__(
        self,
        time_of_day: str,
        day_of_week: str,
        is_holiday: bool,
        weather: Optional[str] = None,
        traffic_level: Optional[float] = None,
        crowd_density: Optional[float] = None,
    ):
        self.time_of_day = time_of_day
        self.day_of_week = day_of_week
        self.is_holiday = is_holiday
        self.weather = weather
        self.traffic_level = traffic_level
        self.crowd_density = crowd_density

def get_time_signals() -> DynamicSignals:
    """Get current time-based signals"""
    now = datetime.now()
    hour = now.hour

    if 6 <= hour < 12:
        time_of_day = "morning"
    elif 12 <= hour < 18:
        time_of_day = "afternoon"
    elif 18 <= hour < 22:
        time_of_day = "evening"
    else:
        time_of_day = "night"

    return DynamicSignals(
        time_of_day=time_of_day,
        day_of_week=now.strftime("%A").lower(),
        is_holiday=False,  # Simple implementation
    )

def get_mock_signals(slice_id: str) -> DynamicSignals:
    """Generate deterministic mock signals for testing."""
    normalized = (slice_id or "default").lower()

    if "night" in normalized:
        time_of_day = "night"
    elif "evening" in normalized:
        time_of_day = "evening"
    elif "afternoon" in normalized:
        time_of_day = "afternoon"
    else:
        seed = sum(ord(ch) for ch in normalized) % 100
        time_of_day = "evening" if seed > 50 else "morning"

    if "rain" in normalized or "storm" in normalized:
        weather = "rainy"
    elif "fog" in normalized or "mist" in normalized:
        weather = "foggy"
    else:
        seed = sum(ord(ch) for ch in normalized) % 100
        weather = "sunny" if seed < 70 else "rainy"

    seed = sum(ord(ch) for ch in normalized) % 100

    return DynamicSignals(
        time_of_day=time_of_day,
        day_of_week="friday" if seed > 70 else "monday",
        is_holiday=seed > 90 or "holiday" in normalized or "festival" in normalized,
        weather=weather,
        traffic_level=0.3 + (seed % 50) / 100,
        crowd_density=0.2 + (seed % 60) / 100,
    )
