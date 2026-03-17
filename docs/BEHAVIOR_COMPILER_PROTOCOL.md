# AIO4 · 行为到意义编译器协议 v1.0

## 定位

行为到意义编译器（BehaviorCompiler）是 AI-native 世界编排层的中间层。

它接收玩家的原始行为序列（BehaviorTrace），输出结构化的高阶语义向量（MeaningVector），为个性化反馈、私人神话层与城市人格代理（AIO5）提供上游输入。

---

## 输入：BehaviorTrace

```python
@dataclass
class BehaviorEvent:
    action: str          # observe / dwell / mark / revisit / co_create
    target_id: str       # POI / zone / route id
    district_type: str   # 来自 district_classifier
    duration: float      # 停留时长（秒）
    lens_id: str         # 当时激活的镜头 id
    timestamp: float

@dataclass
class BehaviorTrace:
    player_id: str
    events: List[BehaviorEvent]
```

---

## 输出：MeaningVector

| 字段 | 类型 | 含义 |
|---|---|---|
| `explorer_score` | float [0,1] | 探索倾向：偏好发现新地点 |
| `chronicler_score` | float [0,1] | 叙事倾向：偏好故事/历史节点停留 |
| `restorer_score` | float [0,1] | 修复倾向：偏好 repair_rituals / healing_oasis |
| `recluse_score` | float [0,1] | 隐匿倾向：偏好私密低密度地点 |
| `resonant_score` | float [0,1] | 共鸣倾向：高 attunement 行为 + oracle/hearth 镜头 |
| `dominant_meaning` | str | 五维中得分最高的标签，< 0.15 则归为 wanderer |
| `myth_entry` | str | 私人神话层入口标签 |

---

## 五维编译规则

### Explorer（探索者）
- 触发动作：`observe`、`revisit`
- 额外信号：访问唯一目标比例（uniqueness ratio）
- myth_entry：`ghost_cartographer`

### Chronicler（记录者）
- 触发动作：`observe`、`co_create`
- 加权信号：`lens_id == "chronicle"` 时权重 ×2
- myth_entry：`memory_keeper`

### Restorer（修复者）
- 触发动作：`mark`、`co_create`
- 加权信号：`district_type in {healing_oasis, memory_grove}` 时权重 ×2
- myth_entry：`sanctuary_weaver`

### Recluse（隐者）
- 触发动作：`dwell`
- 加权信号：`lens_id in {veil, hearth}` 时权重 ×2
- myth_entry：`void_walker`

### Resonant（共鸣者）
- 触发动作：`dwell`、`mark`
- 加权信号：`lens_id in {oracle, hearth}` 时权重 ×2
- myth_entry：`echo_bearer`

---

## myth_entry 映射

| dominant_meaning | myth_entry |
|---|---|
| explorer | ghost_cartographer |
| chronicler | memory_keeper |
| restorer | sanctuary_weaver |
| recluse | void_walker |
| resonant | echo_bearer |
| wanderer | unnamed_drifter |

---

## 编排器集成

BehaviorCompiler 在 `RuleBasedOrchestrator.orchestrate()` 中被调用：

```python
raw_events = player_state.get("behavior_events", [])
if raw_events:
    trace = build_trace(player_state.get("player_id", "unknown"), raw_events)
    meaning_vector = BehaviorCompiler().compile(trace)
```

结果挂载在 `OrchestratorOutput.meaning_vector`。

若 `player_state` 中不含 `behavior_events`，则 `meaning_vector` 为 `None`，不影响编排器其余输出。

---

## 影响边界

- BehaviorCompiler **不修改** world_state，仅读取 player_state.behavior_events
- MeaningVector 由上层（AIO5 城市人格代理、个性化反馈层）消费，BehaviorCompiler 不直接输出 UI 内容
- 与 LensEngine 的关系：lens_id 作为行为事件的上下文输入，但编译结果不反向修改镜头

---

## 相关文件

- 实现：[`fablemap/behavior_compiler.py`](../fablemap/behavior_compiler.py)
- 测试：[`tests/test_behavior_compiler.py`](../tests/test_behavior_compiler.py)
- 上游：[`docs/LENS_ENGINE_PROTOCOL.md`](LENS_ENGINE_PROTOCOL.md)
- 下游：AIO5 城市人格代理（待实现）
