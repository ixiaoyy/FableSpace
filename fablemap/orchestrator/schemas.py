"""World Orchestrator Schemas"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from ..lens_engine import LensOutput
from ..behavior_compiler import MeaningVector
from ..city_persona import CityPersona
from ..scene_capsule import CapsuleOutput

@dataclass
class ObserverEffect:
    poi_id: str
    observer_count: int
    world_density: float
    rarity_level: str
    density_change: float

@dataclass
class EventSuggestion:
    type: str
    target: str
    priority: int
    visibility: str

@dataclass
class OrchestratorOutput:
    event_suggestions: List[EventSuggestion]
    poi_ranking: List[dict]
    broadcast_suggestions: List[dict]
    observer_effect: Optional[ObserverEffect]
    confidence_score: float
    fallback_triggered: bool

    lens_output: Optional[LensOutput] = None
    meaning_vector: Optional[MeaningVector] = None
    city_persona: Optional[CityPersona] = None
    scene_capsule: Optional[CapsuleOutput] = None

    # E4: Player home & ghost replay
    home_state: Optional[dict] = None      # {target_id, target_type, comfort_score, home_tags}
    ghost_traces: Optional[List[dict]] = None  # [{trace_id, waypoints, mood_arc, visibility}]

    # Task metadata (waoowaoo-inspired)
    stage: str = "orchestrate"
    status: str = "completed"
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    warnings: List[str] = field(default_factory=list)
