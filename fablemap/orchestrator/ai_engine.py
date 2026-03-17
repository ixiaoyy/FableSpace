"""AI-powered Orchestrator Engine"""
from typing import Optional
from .rule_engine import RuleBasedOrchestrator
from .schemas import OrchestratorOutput

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
        # TODO: Implement structured parsing
        return self.rule_fallback.orchestrate({}, {})
