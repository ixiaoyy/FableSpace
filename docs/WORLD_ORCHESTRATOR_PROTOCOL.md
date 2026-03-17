# 世界编排器协议 v1.0

## 文档目的

本协议定义 FableMap 世界编排器的输入输出边界、失败降级策略、动态信号接入规范与前后端消费关系。

世界编排器是 AI-native 架构的核心引擎，负责读取世界状态并生成"下一步世界反应"。

## 核心定位

世界编排器**不是**地图生成器，而是持续读取世界状态并生成结构化编排指令的系统。

**职责**：
- 根据玩家行为重排地点优先级
- 触发广播、异常、任务苗头与回声显影
- 结合动态信号调整世界气氛与事件概率
- 决定默认显示哪个世界镜头
- 判断哪些变化沉淀为私人记忆，哪些进入公共层

**不负责**：
- 创造空间（由 Reality Kernel 负责）
- 生成视觉（由 Generative Surface 负责）
- 直接修改世界状态（只输出建议，由其他系统执行）

---

## 一、输入结构

### 1.1 完整输入定义

```python
class OrchestratorInput:
    # 世界状态
    world_state: WorldState  # 来自 world.json
    slice_id: str

    # 玩家状态
    player_state: PlayerState  # 来自 PLAYER_STATE.md
    player_id: str
    current_position: Coordinate
    recent_actions: List[WritebackEvent]  # 最近 N 个行为

    # 写回事件流
    writeback_events: List[WritebackEvent]  # 来自 WORLD_WRITEBACK_PROTOCOL.md

    # 动态信号
    dynamic_signals: DynamicSignals

    # 治理规则
    governance_rules: GovernanceRules  # 来自 WORLD_WRITEBACK_GOVERNANCE.md
```

### 1.2 WorldState 结构

```python
class WorldState:
    world_id: str
    seed: str
    region: RegionInfo
    pois: List[POI]
    roads: List[Road]
    landmarks: List[Landmark]
    factions: List[Faction]
    historical_echoes: List[HistoricalEcho]
    memory_anchors: List[MemoryAnchor]
    sprites: List[Sprite]
    state: Dict[str, Any]  # 动态状态
```

### 1.3 PlayerState 结构

```python
class PlayerState:
    player_id: str

    # 即时状态层
    position: Position
    action_state: str  # "idle" | "moving" | "observing" | "interacting"
    focus_target_id: Optional[str]

    # 感知状态
    clarity: float  # 0-100
    tension: float  # 0-100
    attunement: float  # 0-100
    fatigue: float  # 0-100
    warmth: float  # 0-100

    # 世界关系层
    zone_familiarity: Dict[str, int]
    poi_familiarity: Dict[str, int]
    faction_standing: Dict[str, FactionStanding]

    # 长期人格层
    home_style: str
    style_affinity: Dict[str, float]
    archetype_traits: Dict[str, float]
```

### 1.4 DynamicSignals 结构

```python
class DynamicSignals:
    # 时间信号（必须）
    time_of_day: str  # "morning" | "afternoon" | "evening" | "night"
    day_of_week: str
    is_holiday: bool
    timestamp: datetime

    # 天气信号（可选）
    weather: Optional[str]  # "sunny" | "rainy" | "cloudy" | "foggy"
    temperature: Optional[float]

    # 交通信号（可选）
    traffic_level: Optional[float]  # 0.0-1.0

    # 人流信号（可选）
    crowd_density: Optional[float]  # 0.0-1.0

    # 元数据
    signal_sources: Dict[str, str]
```

### 1.5 WritebackEvent 结构

```python
class WritebackEvent:
    event_id: str
    player_id: str
    action: str  # "observe" | "dwell" | "mark" | "collect" | "restore"
    target_type: str  # "poi" | "zone" | "route" | "landmark"
    target_id: str
    timestamp: datetime
    visibility: str  # "private" | "local_public" | "global"
    metadata: Dict[str, Any]
```

---

## 二、输出结构

### 2.1 完整输出定义

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

    # 观察者效应
    observer_effect: Optional[ObserverEffect]

    # 元数据
    orchestration_metadata: OrchestrationMetadata
    confidence_score: float  # 0.0-1.0
    fallback_triggered: bool
```

### 2.2 EventSuggestion 结构

```python
class EventSuggestion:
    event_id: str
    type: str  # 见 2.3 事件类型定义
    target_type: str  # "poi" | "zone" | "route" | "global"
    target_id: str
    priority: int  # 1-10
    trigger_condition: TriggerCondition
    effect: EventEffect
    visibility: str  # "private" | "local_public" | "global"
    ttl: Optional[int]  # 生命周期（秒）
    metadata: Dict[str, Any]

class TriggerCondition:
    condition_type: str  # "immediate" | "on_approach" | "on_dwell" | "on_time"
    params: Dict[str, Any]

class EventEffect:
    effect_type: str  # "broadcast" | "state_change" | "spawn" | "unlock"
    params: Dict[str, Any]
```

### 2.3 事件类型定义

编排器可输出以下 8 种核心事件类型：

#### 1. `broadcast` - 全城播报
触发全局或区域广播消息。

```python
{
    "type": "broadcast",
    "target_type": "global",
    "effect": {
        "effect_type": "broadcast",
        "params": {
            "text_key": "night_wanderer_detected",
            "mood": "mysterious",
            "duration": 10
        }
    }
}
```

#### 2. `echo` - 地点回声
在特定地点显现历史回声或记忆片段。

```python
{
    "type": "echo",
    "target_type": "poi",
    "target_id": "poi_old_station",
    "effect": {
        "effect_type": "spawn",
        "params": {
            "echo_text": "此地曾是旅人的最后一站...",
            "echo_intensity": 0.7
        }
    }
}
```

#### 3. `anomaly` - 异常事件
触发区域异常或扰动。

```python
{
    "type": "anomaly",
    "target_type": "zone",
    "target_id": "zone_commercial",
    "effect": {
        "effect_type": "state_change",
        "params": {
            "tension_delta": +15,
            "anomaly_type": "crowd_surge"
        }
    }
}
```

#### 4. `quest_hint` - 任务苗头
生成任务线索或探索提示。

```python
{
    "type": "quest_hint",
    "target_type": "poi",
    "target_id": "poi_library",
    "effect": {
        "effect_type": "unlock",
        "params": {
            "hint_text": "图书馆的灯光似乎在呼唤你...",
            "quest_id": "quest_forgotten_books"
        }
    }
}
```

#### 5. `spirit_spawn` - 精灵刷新
在特定位置刷新都市精灵或收集物。

```python
{
    "type": "spirit_spawn",
    "target_type": "poi",
    "target_id": "poi_park",
    "effect": {
        "effect_type": "spawn",
        "params": {
            "spirit_type": "healing_sprite",
            "rarity": "uncommon"
        }
    }
}
```

#### 6. `player_trait_update` - 玩家特质更新
更新玩家的长期特质或画像。

```python
{
    "type": "player_trait_update",
    "target_type": "global",
    "effect": {
        "effect_type": "state_change",
        "params": {
            "trait": "explorer",
            "increment": 1
        }
    }
}
```

#### 7. `lens_shift` - 镜头切换
建议切换世界镜头或审美模式。

```python
{
    "type": "lens_shift",
    "target_type": "global",
    "effect": {
        "effect_type": "state_change",
        "params": {
            "target_lens": "neon_nostalgia",
            "reason": "night_time_affinity"
        }
    }
}
```

#### 8. `memory_anchor` - 记忆锚点
创建或激活记忆锚点。

```python
{
    "type": "memory_anchor",
    "target_type": "poi",
    "target_id": "poi_cafe",
    "effect": {
        "effect_type": "unlock",
        "params": {
            "anchor_type": "personal_ritual",
            "memory_text": "你常在这里停留..."
        }
    }
}
```

### 2.4 POIRanking 结构

```python
class POIRanking:
    poi_id: str
    rank: int  # 1-N
    score: float  # 0.0-1.0
    highlight: bool
    reason: str  # "player_affinity" | "time_relevance" | "faction_activity"
```

### 2.5 BroadcastSuggestion 结构

```python
class BroadcastSuggestion:
    broadcast_id: str
    text_key: str  # 文案键，用于多语言
    text: str  # 实际文本
    mood: str  # "mysterious" | "urgent" | "peaceful" | "chaotic"
    scope: str  # "global" | "zone" | "poi"
    target_id: Optional[str]
    duration: int  # 显示时长（秒）
    priority: int  # 1-10
```

### 2.6 LensSwitchSuggestion 结构

```python
class LensSwitchSuggestion:
    target_lens: str  # "ghibli_town" | "neon_nostalgia" | "cyber_noir"
    reason: str
    confidence: float  # 0.0-1.0
    auto_switch: bool  # 是否自动切换
```

### 2.7 ObserverEffect 结构

观察者效应描述多人观察同一地点时的世界浓度变化。

```python
class ObserverEffect:
    poi_id: str
    observer_count: int  # 当前观察者数量
    world_density: float  # 0.0-1.0，世界浓度
    rarity_level: str  # "common" | "uncommon" | "rare" | "legendary"
    density_change: float  # 相比上次的变化
    effects: List[str]  # 触发的效果列表
```

**世界浓度计算规则**：
- 1 人观察：`world_density = 0.2`
- 2-5 人：`world_density = 0.4`
- 6-10 人：`world_density = 0.6`
- 11-20 人：`world_density = 0.8`
- 20+ 人：`world_density = 1.0`

**浓度效果映射**：
- `density < 0.3`：普通描述，基础交互
- `density 0.3-0.6`：增强细节，解锁隐藏文案
- `density 0.6-0.8`：触发特殊事件，精灵刷新
- `density > 0.8`：稀有内容显现，历史回声激活

### 2.8 OrchestrationMetadata 结构

```python
class OrchestrationMetadata:
    engine: str  # "ai" | "rule_based" | "hybrid"
    rules_matched: List[str]  # 匹配的规则名称
    execution_time_ms: float
    input_hash: str  # 输入哈希，用于缓存
    cache_hit: bool
    timestamp: datetime
```

---

## 三、失败降级策略

### 3.1 降级层级

编排器采用三级降级策略：

```python
class FallbackStrategy:
    # Level 1: AI 编排失败 -> 规则编排
    rule_based_fallback: bool = True

    # Level 2: 规则编排失败 -> 静默降级
    silent_degradation: bool = True

    # Level 3: 关键路径保护
    critical_path_protection: List[str] = [
        "poi_ranking",  # 必须返回，即使是默认排序
        "broadcast_suggestions"  # 可以返回空列表，但不能失败
    ]
```

### 3.2 降级触发条件

#### Level 1: AI -> 规则引擎
触发条件：
- AI 调用超时（> 5s）
- AI 返回格式错误
- AI 置信度 < 0.3
- AI 服务不可用

降级行为：
- 切换到规则引擎
- 设置 `fallback_triggered = True`
- 记录降级原因到 metadata

#### Level 2: 规则引擎 -> 静默降级
触发条件：
- 规则引擎抛出异常
- 无规则匹配
- 规则执行超时

降级行为：
- 返回最小可用输出
- POI 排序使用默认距离排序
- 事件建议返回空列表
- 设置 `confidence_score = 0.0`

#### Level 3: 关键路径保护
无论何种情况，必须保证：
- `poi_ranking` 至少返回按距离排序的列表
- `broadcast_suggestions` 返回空列表而非 null
- `orchestration_metadata` 包含错误信息

### 3.3 降级示例

```python
# AI 失败，降级到规则引擎
if ai_orchestration_failed:
    output = rule_engine.orchestrate(input)
    output.fallback_triggered = True
    output.orchestration_metadata.engine = "rule_based"

# 规则引擎失败，静默降级
if rule_engine_failed:
    output = OrchestratorOutput(
        event_suggestions=[],
        poi_ranking=default_distance_ranking(input.world_state.pois),
        broadcast_suggestions=[],
        echo_suggestions=[],
        lens_switch_suggestion=None,
        collectable_spawns=[],
        callback_hooks=[],
        observer_effect=None,
        orchestration_metadata=OrchestrationMetadata(
            engine="fallback",
            rules_matched=[],
            execution_time_ms=0,
            error="silent_degradation"
        ),
        confidence_score=0.0,
        fallback_triggered=True
    )
```

---

## 四、前后端消费关系

### 4.1 后端生成流程

```python
# 1. 接收前端请求
@router.post("/api/world/orchestrate")
async def orchestrate_world(request: OrchestrationRequest):
    # 2. 加载世界状态
    world_state = load_world_state(request.slice_id)

    # 3. 加载玩家状态
    player_state = load_player_state(request.player_id)

    # 4. 获取动态信号
    dynamic_signals = get_dynamic_signals()

    # 5. 构建输入
    inp = OrchestratorInput(
        world_state=world_state,
        player_state=player_state,
        dynamic_signals=dynamic_signals,
        slice_id=request.slice_id
    )

    # 6. 检查缓存
    cache_key = generate_cache_key(inp)
    if cached := get_from_cache(cache_key):
        return cached

    # 7. 执行编排
    output = orchestrator.orchestrate(inp)

    # 8. 缓存结果
    cache_result(cache_key, output, ttl=300)

    # 9. 返回结果
    return output
```

### 4.2 前端消费流程

```javascript
// 1. 调用编排 API
async function fetchOrchestration(sliceId, playerId) {
  const response = await fetch('/api/world/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slice_id: sliceId, player_id: playerId })
  });
  return await response.json();
}

// 2. 应用编排结果
function applyOrchestration(output) {
  // 2.1 更新 POI 排序
  if (output.poi_ranking) {
    updatePOIRanking(output.poi_ranking);
  }

  // 2.2 显示广播
  output.broadcast_suggestions.forEach(broadcast => {
    showBroadcast(broadcast.text, broadcast.mood, broadcast.duration);
  });

  // 2.3 触发事件
  output.event_suggestions.forEach(event => {
    handleEvent(event);
  });

  // 2.4 显示回声
  output.echo_suggestions.forEach(echo => {
    displayEcho(echo);
  });

  // 2.5 切换镜头（如果建议）
  if (output.lens_switch_suggestion && output.lens_switch_suggestion.auto_switch) {
    switchLens(output.lens_switch_suggestion.target_lens);
  }

  // 2.6 刷新收集物
  output.collectable_spawns.forEach(spawn => {
    spawnCollectable(spawn);
  });

  // 2.7 显示观察者效应
  if (output.observer_effect) {
    updateWorldDensity(output.observer_effect);
  }
}

// 3. 事件处理分发
function handleEvent(event) {
  switch (event.type) {
    case 'broadcast':
      showBroadcast(event.effect.params.text_key);
      break;
    case 'echo':
      displayEcho(event.target_id, event.effect.params.echo_text);
      break;
    case 'anomaly':
      triggerAnomaly(event.target_id, event.effect.params.anomaly_type);
      break;
    case 'spirit_spawn':
      spawnSpirit(event.target_id, event.effect.params.spirit_type);
      break;
    case 'player_trait_update':
      updatePlayerTrait(event.effect.params.trait, event.effect.params.increment);
      break;
    default:
      console.warn('Unknown event type:', event.type);
  }
}
```

### 4.3 调用时机

前端应在以下时机调用编排器：

1. **玩家进入新切片**：加载世界时
2. **玩家完成写回动作**：`observe / dwell / mark` 后
3. **时间变化**：每 5-10 分钟轮询一次
4. **玩家状态显著变化**：感知状态波动 > 20
5. **手动刷新**：玩家点击"刷新世界"按钮

### 4.4 响应式更新

```javascript
// 订阅编排更新
function subscribeToOrchestration(sliceId, playerId) {
  // 定时轮询
  setInterval(async () => {
    const output = await fetchOrchestration(sliceId, playerId);
    applyOrchestration(output);
  }, 300000); // 5 分钟

  // 写回后立即更新
  eventBus.on('writeback_complete', async () => {
    const output = await fetchOrchestration(sliceId, playerId);
    applyOrchestration(output);
  });
}
```

---

## 五、缓存与性能策略

### 5.1 缓存键生成

```python
def generate_cache_key(inp: OrchestratorInput) -> str:
    # 缓存键包含：
    # - slice_id
    # - player_id
    # - 时间段（小时级）
    # - 玩家状态哈希（简化）

    player_hash = hash_player_state(inp.player_state)
    time_bucket = inp.dynamic_signals.timestamp.strftime("%Y%m%d%H")

    return f"orch:{inp.slice_id}:{inp.player_id}:{time_bucket}:{player_hash}"

def hash_player_state(state: PlayerState) -> str:
    # 只哈希关键字段，忽略微小变化
    key_fields = {
        "zone": state.position.zone_id,
        "action": state.action_state,
        "clarity_bucket": int(state.clarity / 20),  # 0-5
        "tension_bucket": int(state.tension / 20)
    }
    return hashlib.md5(json.dumps(key_fields).encode()).hexdigest()[:8]
```

### 5.2 缓存策略

```python
class CacheStrategy:
    # 缓存时长
    default_ttl: int = 300  # 5 分钟

    # 不同场景的 TTL
    ttl_by_scenario = {
        "high_activity": 60,      # 高活跃区域：1 分钟
        "normal": 300,            # 正常：5 分钟
        "low_activity": 600,      # 低活跃：10 分钟
        "static": 1800            # 静态区域：30 分钟
    }

    # 缓存失效条件
    invalidate_on = [
        "player_writeback",       # 玩家写回后
        "world_state_change",     # 世界状态变化
        "time_bucket_change"      # 时间段变化
    ]
```

### 5.3 批处理优化

```python
# 批量编排多个玩家
async def batch_orchestrate(requests: List[OrchestrationRequest]) -> List[OrchestratorOutput]:
    # 1. 按 slice_id 分组
    by_slice = group_by_slice(requests)

    # 2. 每个切片只加载一次世界状态
    results = []
    for slice_id, slice_requests in by_slice.items():
        world_state = load_world_state(slice_id)

        # 3. 并行处理同一切片的多个玩家
        outputs = await asyncio.gather(*[
            orchestrate_single(req, world_state)
            for req in slice_requests
        ])
        results.extend(outputs)

    return results
```
