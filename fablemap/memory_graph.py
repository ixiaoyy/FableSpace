"""Memory Graph for World State"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class PlayerPOIRelation:
    player_id: str
    poi_id: str
    visit_count: int
    last_visit: datetime
    total_dwell_time: float
    emotions: List[str]
    marks: List[str]

@dataclass
class POIMemory:
    poi_id: str
    total_observers: int
    unique_visitors: int
    recent_events: List[dict]
    dominant_emotion: Optional[str]
    world_density_history: List[float]

@dataclass
class PlayerZoneRelation:
    player_id: str
    zone_id: str
    visit_count: int
    last_visit: datetime
    total_dwell_time: float
    familiarity: float  # 0.0-1.0

@dataclass
class PlayerRouteMemory:
    player_id: str
    route_hash: str
    waypoints: List[str]
    repeat_count: int
    last_traveled: datetime

@dataclass
class EchoMemory:
    echo_id: str
    poi_id: str
    player_id: str
    content: str
    timestamp: datetime
    visibility: str

@dataclass
class PlayerFactionRelation:
    player_id: str
    faction_id: str
    reputation: float  # -1.0 to 1.0
    interaction_count: int
    last_interaction: datetime

class WorldMemoryGraph:
    def __init__(self):
        self.player_poi_relations: Dict[str, PlayerPOIRelation] = {}
        self.poi_memories: Dict[str, POIMemory] = {}
        self.player_zone_relations: Dict[str, PlayerZoneRelation] = {}
        self.player_routes: Dict[str, List[PlayerRouteMemory]] = {}
        self.echoes: Dict[str, EchoMemory] = {}
        self.player_faction_relations: Dict[str, PlayerFactionRelation] = {}

    def record_observation(self, player_id: str, poi_id: str):
        """Record a player observing a POI"""
        key = f"{player_id}:{poi_id}"

        if key not in self.player_poi_relations:
            self.player_poi_relations[key] = PlayerPOIRelation(
                player_id=player_id,
                poi_id=poi_id,
                visit_count=0,
                last_visit=datetime.now(),
                total_dwell_time=0.0,
                emotions=[],
                marks=[]
            )

        relation = self.player_poi_relations[key]
        relation.visit_count += 1
        relation.last_visit = datetime.now()

        # Update POI memory
        if poi_id not in self.poi_memories:
            self.poi_memories[poi_id] = POIMemory(
                poi_id=poi_id,
                total_observers=0,
                unique_visitors=0,
                recent_events=[],
                dominant_emotion=None,
                world_density_history=[]
            )

        self.poi_memories[poi_id].total_observers += 1

    def record_dwell(self, player_id: str, poi_id: str, duration: float):
        """Record a player dwelling at a POI"""
        key = f"{player_id}:{poi_id}"

        if key in self.player_poi_relations:
            self.player_poi_relations[key].total_dwell_time += duration

    def record_mark(self, player_id: str, poi_id: str, mark_text: str, emotion: str):
        """Record a player marking a POI"""
        key = f"{player_id}:{poi_id}"

        if key in self.player_poi_relations:
            relation = self.player_poi_relations[key]
            relation.marks.append(mark_text)
            relation.emotions.append(emotion)

        # Update POI dominant emotion
        if poi_id in self.poi_memories:
            memory = self.poi_memories[poi_id]
            memory.recent_events.append({
                "type": "mark",
                "player_id": player_id,
                "emotion": emotion,
                "timestamp": datetime.now().isoformat()
            })

    def get_player_history(self, player_id: str, poi_id: str) -> Optional[PlayerPOIRelation]:
        """Get player's history with a POI"""
        key = f"{player_id}:{poi_id}"
        return self.player_poi_relations.get(key)

    def get_poi_memory(self, poi_id: str) -> Optional[POIMemory]:
        """Get POI's accumulated memory"""
        return self.poi_memories.get(poi_id)

    def calculate_relationship_strength(self, player_id: str, poi_id: str) -> float:
        """Calculate relationship strength (0.0-1.0)"""
        relation = self.get_player_history(player_id, poi_id)

        if not relation:
            return 0.0

        # Simple formula: visits + dwell time + marks
        score = (
            min(relation.visit_count / 10, 0.4) +
            min(relation.total_dwell_time / 3600, 0.3) +
            min(len(relation.marks) / 5, 0.3)
        )

        return min(score, 1.0)

    def record_zone_visit(self, player_id: str, zone_id: str, duration: float = 0.0):
        """Record player visiting a zone"""
        key = f"{player_id}:{zone_id}"

        if key not in self.player_zone_relations:
            self.player_zone_relations[key] = PlayerZoneRelation(
                player_id=player_id,
                zone_id=zone_id,
                visit_count=0,
                last_visit=datetime.now(),
                total_dwell_time=0.0,
                familiarity=0.0
            )

        relation = self.player_zone_relations[key]
        relation.visit_count += 1
        relation.last_visit = datetime.now()
        relation.total_dwell_time += duration
        relation.familiarity = min(relation.visit_count / 20, 1.0)

    def record_route(self, player_id: str, waypoints: List[str]):
        """Record player traveling a route"""
        if len(waypoints) < 2:
            return

        route_hash = ">".join(sorted(waypoints))

        if player_id not in self.player_routes:
            self.player_routes[player_id] = []

        for route in self.player_routes[player_id]:
            if route.route_hash == route_hash:
                route.repeat_count += 1
                route.last_traveled = datetime.now()
                return

        self.player_routes[player_id].append(PlayerRouteMemory(
            player_id=player_id,
            route_hash=route_hash,
            waypoints=waypoints,
            repeat_count=1,
            last_traveled=datetime.now()
        ))

    def record_echo(self, echo_id: str, poi_id: str, player_id: str, content: str, visibility: str):
        """Record an echo at a POI"""
        self.echoes[echo_id] = EchoMemory(
            echo_id=echo_id,
            poi_id=poi_id,
            player_id=player_id,
            content=content,
            timestamp=datetime.now(),
            visibility=visibility
        )

    def update_faction_reputation(self, player_id: str, faction_id: str, delta: float):
        """Update player's reputation with a faction"""
        key = f"{player_id}:{faction_id}"

        if key not in self.player_faction_relations:
            self.player_faction_relations[key] = PlayerFactionRelation(
                player_id=player_id,
                faction_id=faction_id,
                reputation=0.0,
                interaction_count=0,
                last_interaction=datetime.now()
            )

        relation = self.player_faction_relations[key]
        relation.reputation = max(-1.0, min(1.0, relation.reputation + delta))
        relation.interaction_count += 1
        relation.last_interaction = datetime.now()

    def get_zone_familiarity(self, player_id: str, zone_id: str) -> float:
        """Get player's familiarity with a zone"""
        key = f"{player_id}:{zone_id}"
        relation = self.player_zone_relations.get(key)
        return relation.familiarity if relation else 0.0

    def get_player_routes(self, player_id: str) -> List[PlayerRouteMemory]:
        """Get all routes traveled by player"""
        return self.player_routes.get(player_id, [])

    def get_poi_echoes(self, poi_id: str) -> List[EchoMemory]:
        """Get all echoes at a POI"""
        return [echo for echo in self.echoes.values() if echo.poi_id == poi_id]

    def get_faction_reputation(self, player_id: str, faction_id: str) -> float:
        """Get player's reputation with faction"""
        key = f"{player_id}:{faction_id}"
        relation = self.player_faction_relations.get(key)
        return relation.reputation if relation else 0.0
