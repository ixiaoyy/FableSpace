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
    """Generate deterministic mock signals for testing"""
    seed = hash(slice_id) % 100

    return DynamicSignals(
        time_of_day="evening" if seed > 50 else "morning",
        day_of_week="friday" if seed > 70 else "monday",
        is_holiday=seed > 90,
        weather="sunny" if seed < 70 else "rainy",
        traffic_level=0.3 + (seed % 50) / 100,
        crowd_density=0.2 + (seed % 60) / 100,
    )
