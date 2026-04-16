"""AI-powered Orchestrator Engine"""
import json
from typing import Any

from .rule_engine import RuleBasedOrchestrator
from .schemas import EventSuggestion, ObserverEffect, OrchestratorOutput


class AIOrchestrator:
    def __init__(self, llm_client=None):
        self.llm = llm_client
        self.rule_fallback = RuleBasedOrchestrator()

    def orchestrate(self, world_state: dict, player_state: dict) -> OrchestratorOutput:
        """Execute AI-powered orchestration with rule-based fallback"""

        if not self.llm:
            # No LLM available, use rule-based
            return self.rule_fallback.orchestrate(world_state, player_state)

        try:
            # Build prompt for LLM
            prompt = self._build_prompt(world_state, player_state)

            # Call LLM (structured output)
            response = self.llm.generate(
                prompt=prompt,
                temperature=0.7,
                max_tokens=1000
            )

            # Parse and validate
            output = self._parse_response(response)
            output.fallback_triggered = False
            return output

        except Exception as e:
            # Fallback to rule-based
            print(f"AI orchestration failed: {e}, using rule-based fallback")
            output = self.rule_fallback.orchestrate(world_state, player_state)
            output.fallback_triggered = True
            return output

    def _build_prompt(self, world_state: dict, player_state: dict) -> str:
        """Build orchestration prompt for LLM"""
        return f"""你是 FableMap 的世界编排器。根据世界状态和玩家行为，生成世界反应。

世界状态:
- 切片: {world_state.get('slice_id')}
- 观察者数量: {world_state.get('observer_count', 1)}
- POI 数量: {len(world_state.get('pois', []))}

玩家状态:
- 玩家ID: {player_state.get('player_id')}
- 位置: ({player_state.get('lat')}, {player_state.get('lon')})

任务: 生成事件建议、广播和地点排序。输出 JSON 格式。
"""

    def _parse_response(self, response: str) -> OrchestratorOutput:
        """Parse LLM response into OrchestratorOutput"""
        payload = json.loads(response)
        if not isinstance(payload, dict):
            raise ValueError("LLM response must decode to a JSON object.")

        observer_payload = payload.get("observer_effect")
        observer_effect = None
        if observer_payload is not None:
            observer_effect = self._parse_observer_effect(observer_payload)

        return OrchestratorOutput(
            event_suggestions=self._parse_event_suggestions(payload.get("event_suggestions", [])),
            poi_ranking=self._parse_poi_ranking(payload.get("poi_ranking", [])),
            broadcast_suggestions=self._parse_broadcast_suggestions(payload.get("broadcast_suggestions", [])),
            observer_effect=observer_effect,
            confidence_score=self._coerce_float(payload.get("confidence_score", 0.0)),
            fallback_triggered=bool(payload.get("fallback_triggered", False)),
            warnings=self._parse_warnings(payload.get("warnings", [])),
        )

    def _parse_event_suggestions(self, events: Any) -> list[EventSuggestion]:
        if not isinstance(events, list):
            raise ValueError("event_suggestions must be a list.")
        parsed: list[EventSuggestion] = []
        for event in events:
            if not isinstance(event, dict):
                raise ValueError("Each event suggestion must be an object.")
            parsed.append(
                EventSuggestion(
                    type=str(event.get("type", "unknown")),
                    target=str(event.get("target", "global")),
                    priority=int(event.get("priority", 0)),
                    visibility=str(event.get("visibility", "private")),
                )
            )
        return parsed

    def _parse_poi_ranking(self, poi_ranking: Any) -> list[dict[str, Any]]:
        if not isinstance(poi_ranking, list):
            raise ValueError("poi_ranking must be a list.")
        parsed: list[dict[str, Any]] = []
        for item in poi_ranking:
            if not isinstance(item, dict):
                raise ValueError("Each poi ranking item must be an object.")
            parsed.append(dict(item))
        return parsed

    def _parse_broadcast_suggestions(self, broadcasts: Any) -> list[dict[str, Any]]:
        if not isinstance(broadcasts, list):
            raise ValueError("broadcast_suggestions must be a list.")
        parsed: list[dict[str, Any]] = []
        for item in broadcasts:
            if not isinstance(item, dict):
                raise ValueError("Each broadcast suggestion must be an object.")
            parsed.append(dict(item))
        return parsed

    def _parse_observer_effect(self, observer_payload: Any) -> ObserverEffect:
        if not isinstance(observer_payload, dict):
            raise ValueError("observer_effect must be an object.")
        return ObserverEffect(
            poi_id=str(observer_payload.get("poi_id", "unknown")),
            observer_count=int(observer_payload.get("observer_count", 0)),
            world_density=self._coerce_float(observer_payload.get("world_density", 0.0)),
            rarity_level=str(observer_payload.get("rarity_level", "common")),
            density_change=self._coerce_float(observer_payload.get("density_change", 0.0)),
        )

    def _parse_warnings(self, warnings: Any) -> list[str]:
        if not isinstance(warnings, list):
            raise ValueError("warnings must be a list.")
        return [str(item) for item in warnings]

    def _coerce_float(self, value: Any, default: float = 0.0) -> float:
        if value is None:
            return default
        return float(value)
