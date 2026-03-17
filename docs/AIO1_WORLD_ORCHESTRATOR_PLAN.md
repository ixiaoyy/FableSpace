# AIO1 世界编排器实施计划 v1.0

## 文档目的

这份文档是 **AIO1 世界编排器**的完整实施计划，从协议定义到前后端实现的分步指南。

世界编排器是 FableMap AI-native 架构的**核心引擎**，负责读取世界状态并生成"下一步世界反应"。

---

## 核心定位

> **世界编排器不是地图生成器，而是一个持续读取世界状态并生成"下一步世界反应"的编排系统。**

它��职责：
- 根据玩家行为重排地点优先级
- 触发广播、异常、任务苗头与回声显影
- 结合动态信号调整世界气氛与事件概率
- 决定默认显示哪个世界镜头
- 判断哪些变化沉淀为私人记忆，哪些进入公共层

它**不负责**：
- 创造空间（由 Reality Kernel 负责）
- 生成视觉（由 Generative Surface 负责）
- 直接修改世界状态（只输出建议，由其他系统执行）

---

## 架构位置

```
┌─────────────────────────────────────────────────────────┐
│  Generative Surface (生成式表现层)                        │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  World Orchestrator (世界编排器) ← 本文档重点             │
│  - 读取: world_state, player_state, events, signals     │
│  - 输出: 结构化编排指令                                    │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Semantic Runtime (语义运行时)                            │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Reality Kernel + Structured World State (稳定底座)      │
└─────────────────────────────────────────────────────────┘
```

---

## 实施阶段

### Phase 0: 协议定义（AIO1.1）

**目标**: 定义世界编排器的输入输出边界、数据结构、失败降级策略。

**输出物**: `docs/WORLD_ORCHESTRATOR_PROTOCOL.md`

#### 输入结构

```python
class OrchestratorInput:
    # 世界状态
    world_state: WorldState  # 来自 world.json
    slice_id: str

    # 玩家状态
    player_state: PlayerState  # 来自 writeback.py
    player_id: str
    current_position: Coordinate
    recent_actions: List[WritebackEvent]  # 最近 N 个行为

    # 写回事件流
    writeback_events: List[WritebackEvent]  # 来自 writeback.py

    # 动态信号（Phase 1 实现）
    dynamic_signals: Optional[DynamicSignals]
    time_of_day: str  # "morning" | "afternoon" | "evening" | "night"
    weather: Optional[str]
    traffic_level: Optional[float]
    crowd_density: Optional[float]

    # 治理规则
    governance_rules: GovernanceRules  # 来自 WORLD_WRITEBACK_GOVERNANCE.md
```

#### 输出结构

```python
class OrchestratorOutput:
    # 事件建议
    event_suggestions: List[EventSuggestion]

    # 地点排序与高亮
    poi_ranking: List[POIRanking]

    # 世界反馈
    broadcast_suggestions: List[BroadcastSuggestion]
    echo_suggestions: List[EchoSuggestion]

    # 镜头切换建议
    lens_switch_suggestion: Optional[LensSwitchSuggestion]

    # 收集物刷新
    collectable_spawns: List[CollectableSpawn]

    # 回访钩子
    callback_hooks: List[CallbackHook]

    # 元数据
    orchestration_metadata: OrchestrationMetadata
    confidence_score: float  # 0.0-1.0
    fallback_triggered: bool
```

#### 事件建议结构

```python
class EventSuggestion:
    type: str  # "broadcast" | "echo" | "anomaly" | "quest_hint" | "spirit_spawn"
    target: str  # poi_id | zone_id | "global"
    priority: int  # 1-10
    trigger_condition: TriggerCondition
    effect: EventEffect
    visibility: str  # "private" | "local_public" | "global"
    ttl: Optional[int]  # 生命周期（秒）
```

#### 失败降级策略

```python
class FallbackStrategy:
    # Level 1: AI 编排失败 -> 规则编排
    rule_based_fallback: bool = True

    # Level 2: 规则编排失败 -> 静默降级
    silent_degradation: bool = True

    # Level 3: 关键路径保护
    critical_path_protection: List[str] = [
        "poi_ranking",  # 必须返回，即使是默认排序
        "broadcast_suggestions"  # 可以返回空列表
    ]
```

**验收标准**：
- [ ] 协议文档完成，包含完整的输入输出结构
- [ ] 定义了至少 5 种事件类型
- [ ] 定义了失败降级策略
- [ ] 与 P5 写回协议、P3 治理边界对齐

---

### Phase 1: 动态信号接入层（AIO1.2）

**目标**: 接入时间、天气、拥堵、人流等现实代理信号。

**输出物**: `fablemap/dynamic_signals.py`

#### 信号源

```python
class DynamicSignals:
    # 时间信号
    time_of_day: str  # "morning" | "afternoon" | "evening" | "night"
    day_of_week: str
    is_holiday: bool

    # 天气信号（可选，Phase 1 可 mock）
    weather: Optional[str]  # "sunny" | "rainy" | "cloudy"
    temperature: Optional[float]

    # 交通信号（可选，Phase 1 可 mock）
    traffic_level: Optional[float]  # 0.0-1.0

    # 人流信号（可选，Phase 1 可 mock）
    crowd_density: Optional[float]  # 0.0-1.0

    # 元数据
    signal_timestamp: datetime
    signal_sources: Dict[str, str]  # 信号来源
```

#### 实现策略

**Phase 1.1: 时间信号（必须）**
```python
def get_time_signals() -> TimeSignals:
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

    return TimeSignals(
        time_of_day=time_of_day,
        day_of_week=now.strftime("%A").lower(),
        is_holiday=check_holiday(now)  # 简单实现
    )
```

**Phase 1.2: Mock 信号（可选）**
```python
def get_mock_signals(slice_id: str) -> DynamicSignals:
    # 基于 slice_id 生成确定性 mock 数据
    # 用于测试和演示
    seed = hash(slice_id) % 100

    return DynamicSignals(
        weather="sunny" if seed < 70 else "rainy",
        traffic_level=0.3 + (seed % 50) / 100,
        crowd_density=0.2 + (seed % 60) / 100
    )
```

**Phase 1.3: 真实信号接入（长期）**
- 天气 API（OpenWeatherMap / 和风天气）
- 交通 API（高德 / Google Maps）
- 人流数据（需要数据源）

**验收标准**：
- [ ] 时间信号接入完成
- [ ] Mock 信号生成器完成
- [ ] 信号数据可被编排器消费
- [ ] 单元测试覆盖

---

### Phase 2: 规则编排引擎（AIO1.3 基础版）

**目标**: 基于规则的事件编排引擎，作为 AI 编排的 fallback。

**输出物**: `fablemap/orchestrator/rule_engine.py`

#### 规则示例

```python
class OrchestrationRule:
    name: str
    condition: Callable[[OrchestratorInput], bool]
    action: Callable[[OrchestratorInput], List[EventSuggestion]]
    priority: int

# 示例规则 1: 深夜 + 便利店 -> 夜行者广播
NIGHT_CONVENIENCE_RULE = OrchestrationRule(
    name="night_convenience_broadcast",
    condition=lambda inp: (
        inp.dynamic_signals.time_of_day == "night" and
        any(poi.fantasy_type == "supply_depot"
            for poi in inp.world_state.pois)
    ),
    action=lambda inp: [
        EventSuggestion(
            type="broadcast",
            target="global",
            priority=5,
            effect=BroadcastEffect(
                text_key="night_wanderer_detected",
                mood="mysterious"
            ),
            visibility="local_public"
        )
    ],
    priority=10
)

# 示例规则 2: 玩家连续观察 3 个地点 -> 探索者标记
EXPLORER_PATTERN_RULE = OrchestrationRule(
    name="explorer_pattern_detection",
    condition=lambda inp: (
        len([e for e in inp.player_state.recent_actions
             if e.action == "observe"]) >= 3
    ),
    action=lambda inp: [
        EventSuggestion(
            type="player_trait_update",
            target=inp.player_id,
            priority=7,
            effect=TraitEffect(
                trait="explorer",
                increment=1
            ),
            visibility="private"
        )
    ],
    priority=8
)
```

#### 规则引擎实现

```python
class RuleBasedOrchestrator:
    def __init__(self):
        self.rules: List[OrchestrationRule] = []
        self._load_default_rules()

    def _load_default_rules(self):
        # 加载默认规则集
        self.rules = [
            NIGHT_CONVENIENCE_RULE,
            EXPLORER_PATTERN_RULE,
            # ... 更多规则
        ]
        self.rules.sort(key=lambda r: r.priority, reverse=True)

    def orchestrate(self, inp: OrchestratorInput) -> OrchestratorOutput:
        suggestions = []

        # 执行所有匹配的规则
        for rule in self.rules:
            try:
                if rule.condition(inp):
                    suggestions.extend(rule.action(inp))
            except Exception as e:
                logger.warning(f"Rule {rule.name} failed: {e}")

        # 生成 POI 排序（默认按距离）
        poi_ranking = self._default_poi_ranking(inp)

        return OrchestratorOutput(
            event_suggestions=suggestions,
            poi_ranking=poi_ranking,
            broadcast_suggestions=self._filter_broadcasts(suggestions),
            orchestration_metadata=OrchestrationMetadata(
                engine="rule_based",
                rules_matched=[r.name for r in self.rules
                              if r.condition(inp)]
            ),
            confidence_score=0.7,
            fallback_triggered=False
        )
```

**验收标准**：
- [ ] 规则引擎实现完成
- [ ] 至少 10 条默认规则
- [ ] 单元测试覆盖
- [ ] 可独立运行，不依赖 AI

---

### Phase 3: AI 编排引擎（AIO1.3 完整版）

**目标**: 基于 LLM 的智能编排引擎，理解玩家意图与世界状态。

**输出物**: `fablemap/orchestrator/ai_engine.py`

#### AI 编排策略

```python
class AIOrchestrator:
    def __init__(self, llm_client):
        self.llm = llm_client
        self.rule_fallback = RuleBasedOrchestrator()

    def orchestrate(self, inp: OrchestratorInput) -> OrchestratorOutput:
        try:
            # 构建 prompt
            prompt = self._build_orchestration_prompt(inp)

            # 调用 LLM（结构化输出）
            response = self.llm.generate(
                prompt=prompt,
                response_format=OrchestratorOutput,
                temperature=0.7,
                max_tokens=2000
            )

            # 验证输出
            output = self._validate_output(response, inp)
            output.orchestration_metadata.engine = "ai"
            output.fallback_triggered = False

            return output

        except Exception as e:
            logger.error(f"AI orchestration failed: {e}")
            # Fallback 到规则引擎
            output = self.rule_fallback.orchestrate(inp)
            output.fallback_triggered = True
            return output

    def _build_orchestration_prompt(self, inp: OrchestratorInput) -> str:
        return f"""
你是 FableMap 的世界编排器。根据当前世界状态与玩家行为，生成世界反应建议。

## 世界状态
- 切片: {inp.slice_id}
- 时间: {inp.dynamic_signals.time_of_day}
- POI 数量: {len(inp.world_state.pois)}
- 地标数量: {len(inp.world_state.landmarks)}

## 玩家状态
- 位置: {inp.player_state.current_position}
- 最近行为: {[e.action for e in inp.player_state.recent_actions]}
- 停留时长: {inp.player_state.dwell_duration}

## 任务
生成以下内容（JSON 格式）：
1. event_suggestions: 事件建议列表
2. poi_ranking: POI 排序建议
3. broadcast_suggestions: 广播建议
4. lens_switch_suggestion: 镜头切换建议（可选）

## 约束
- 事件必须符合治理规则
- 优先级 1-10
- 可见性: private / local_public / global
"""
```

**验收标准**：
- [ ] AI 编排引擎实现完成
- [ ] 结构化输出验证
- [ ] Fallback 机制测试通过
- [ ] 成本控制（缓存、批处理）

---

### Phase 4: API 接入（AIO1.4）

**目标**: 暴露编排器 API，供前端与其他系统调用。

**输出物**: `fablemap/web/orchestrator_router.py`

#### API 设计

```python
@router.post("/api/world/orchestrate")
async def orchestrate_world(
    request: OrchestrationRequest,
    orchestrator: AIOrchestrator = Depends(get_orchestrator)
) -> OrchestrationResponse:
    """
    世界编排 API

    输入: 玩家状态 + 切片 ID
    输出: 编排建议
    """
    # 加载世界状态
    world_state = load_world_state(request.slice_id)

    # 加载玩家状态
    player_state = load_player_state(request.player_id)

    # 获取动态信号
    dynamic_signals = get_dynamic_signals()

    # 构建输入
    inp = OrchestratorInput(
        world_state=world_state,
        player_state=player_state,
        dynamic_signals=dynamic_signals,
        slice_id=request.slice_id
    )

    # 执行编排
    output = orchestrator.orchestrate(inp)

    # 返回结果
    return OrchestrationResponse(
        event_suggestions=output.event_suggestions,
        poi_ranking=output.poi_ranking,
        broadcast_suggestions=output.broadcast_suggestions,
        metadata=output.orchestration_metadata
    )
```

**验收标准**：
- [ ] API 端点实现完成
- [ ] 请求验证
- [ ] 错误处理
- [ ] API 文档

---

### Phase 5: 前端接入（AIO1.5）

**目标**: 前端消费编排器输出，更新 UI。

**输出物**: `frontend/src/services/orchestrator.js`

#### 前端集成

```javascript
// 调用编排器
async function fetchOrchestration(sliceId, playerId) {
  const response = await fetch('/api/world/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slice_id: sliceId, player_id: playerId })
  });

  return await response.json();
}

// 应用编排结果
function applyOrchestration(output) {
  // 1. 更新 POI 排序
  updatePOIRanking(output.poi_ranking);

  // 2. 显示广播
  output.broadcast_suggestions.forEach(b => {
    showBroadcast(b.text, b.mood);
  });

  // 3. 触发事件
  output.event_suggestions.forEach(e => {
    triggerEvent(e);
  });

  // 4. 切换镜头（如果建议）
  if (output.lens_switch_suggestion) {
    switchLens(output.lens_switch_suggestion.target_lens);
  }
}
```

**验收标准**：
- [ ] 前端服务层实现
- [ ] UI 更新逻辑
- [ ] 错误处理
- [ ] 用户体验测试

---

## 实施时间线

| 阶段 | 任务 | 预计工作量 | 依赖 |
|------|------|-----------|------|
| Phase 0 | 协议定义 | 2-3 天 | P5, P3, P4 |
| Phase 1 | 动态信号接入 | 3-5 天 | Phase 0 |
| Phase 2 | 规则编排引擎 | 5-7 天 | Phase 0, Phase 1 |
| Phase 3 | AI 编排引擎 | 7-10 天 | Phase 2 |
| Phase 4 | API 接入 | 2-3 天 | Phase 3 |
| Phase 5 | 前端接入 | 3-5 天 | Phase 4 |

**总计**: 22-33 天（约 1-1.5 个月）

---

## 风险与缓解

### 风险 1: AI 编排成本过高

**缓解**：
- Phase 2 规则引擎作为 fallback
- 缓存编排结果（相同输入 -> 相同输出）
- 批处理多个玩家的编排请求

### 风险 2: AI 输出不稳定

**缓解**：
- 结构化输出验证
- 置信度评分
- 低置信度时 fallback 到规则引擎

### 风险 3: 动态信号源不可用

**缓解**：
- Mock 信号生成器
- 信号缺失时使用默认值
- 不阻塞编排流程

---

## 成功标准

### 技术指标

- [ ] 编排器 API 响应时间 < 500ms（P95）
- [ ] AI 编排成功率 > 95%
- [ ] Fallback 触发率 < 10%
- [ ] 单元测试覆盖率 > 80%

### 产品指标

- [ ] 玩家能看到个性化的 POI 排序
- [ ] 世界广播根据时间/天气动态变化
- [ ] 玩家行为模式被识别并反馈
- [ ] 世界"记住"玩家的历史行为

---

## 后续演进方向

完成 AIO1 后，可以推进：

1. **AIO3 世界记忆图谱** - 让编排器能检索长期记忆
2. **AIO4 行为到意义编译器** - 让编排器理解玩家人格
3. **AIO5 城市人格代理** - 让编排器代表城市"说话"
4. **AIO6 生成式场景胶囊** - 让编排器触发局部生成

---

## 参考文档

- [ARCHITECTURE_PRINCIPLES.md](ARCHITECTURE_PRINCIPLES.md) - 架构原则
- [AI_NATIVE_WORLD_ORCHESTRATION.md](AI_NATIVE_WORLD_ORCHESTRATION.md) - 完整架构设计
- [WORLD_WRITEBACK_PROTOCOL.md](WORLD_WRITEBACK_PROTOCOL.md) - 写回协议（P5）
- [WORLD_WRITEBACK_GOVERNANCE.md](WORLD_WRITEBACK_GOVERNANCE.md) - 治理边界（P3）
- [TIME_FOLDS_PROTOCOL.md](TIME_FOLDS_PROTOCOL.md) - 时间褶皱（P4）

---

## 版本历史

- v1.0 (2026-03-17): 初始版本，完整实施计划
