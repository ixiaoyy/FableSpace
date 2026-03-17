# 镜头引擎协议 v1.0 (AIO2)

## 文档目的

本协议定义 FableMap 镜头引擎的 lens schema、vibe_profile → lens 映射规则、镜头切换对资源包/文案口吻/可见性/事件权重的影响边界。

镜头引擎是世界编排器输出中负责「如何呈现世界」的子系统，与编排器负责「世界发生什么」形成分工。

---

## 一、核心定位

镜头引擎**不是**视觉渲染器，而是：

- 接收 `vibe_profile`（当前世界气氛描述）
- 输出 `LensOutput`（镜头切换指令 + 资源建议 + 文案风格 + 可见性调整 + 事件权重偏移）
- 为前端消费层提供统一的「世界感知模式」

镜头引擎**不负责**：
- 直接修改 world_state
- 生成视觉素材
- 决定事件是否发生（只调整权重）

---

## 二、Lens 类型定义

共 6 种镜头，覆盖主要世界气氛模式：

| lens_id | 中文名 | 触发气氛 | 核心感受 |
|---------|--------|----------|----------|
| `drift` | 漂流者 | 迷失、边缘、孤独 | 静默漂移，世界轮廓模糊 |
| `chronicle` | 编年者 | 历史、记忆、时间褶皱 | 沉静记录，痕迹可见 |
| `surge` | 共振者 | 高密度、多人聚集、节庆 | 能量密集，世界呼应玩家 |
| `veil` | 隐匿者 | 夜晚、工业、边缘地带 | 半透明边界，异常可见 |
| `hearth` | 庇护者 | 治愈、公园、家园、温暖 | 柔光驻留，私人感强 |
| `oracle` | 先知者 | 高 attunement、回访、标记累积 | 世界主动说话，预言感 |

---

## 三、Lens Schema

```python
@dataclass
class LensSchema:
    lens_id: str           # drift | chronicle | surge | veil | hearth | oracle
    label: str             # 中文显示名
    tone: str              # 文案口吻风格
    asset_pack_hint: str   # 推荐资源包前缀
    visibility_bias: str   # private | local_public | global
    event_weight_modifiers: Dict[str, float]  # 事件类型 -> 权重倍数
    ui_filter_hint: str    # 前端滤镜/渲染提示
```

### 各镜头参数详表

#### drift（漂流者）
- `tone`: `"sparse_poetic"` - 稀疏诗意，短句，留白多
- `asset_pack_hint`: `"pack_b_night"`
- `visibility_bias`: `"private"`
- `event_weight_modifiers`: `{"anomaly_detected": 1.4, "special_event": 0.6, "memory_echo": 1.2}`
- `ui_filter_hint`: `"desaturate_edges"`

#### chronicle（编年者）
- `tone`: `"archival_calm"` - 档案式冷静，有历史感
- `asset_pack_hint`: `"pack_a_aged"`
- `visibility_bias`: `"local_public"`
- `event_weight_modifiers`: `{"echo_surface": 1.8, "mark_resonance": 1.5, "anomaly_detected": 0.7}`
- `ui_filter_hint`: `"sepia_overlay"`

#### surge（共振者）
- `tone`: `"energetic_plural"` - 活跃复数视角，强调集体
- `asset_pack_hint`: `"pack_a_bright"`
- `visibility_bias`: `"global"`
- `event_weight_modifiers`: `{"special_event": 1.8, "broadcast_amplify": 2.0, "anomaly_detected": 0.5}`
- `ui_filter_hint`: `"saturation_boost"`

#### veil（隐匿者）
- `tone`: `"liminal_terse"` - 边界感，简短，不确定性
- `asset_pack_hint`: `"pack_b_industrial"`
- `visibility_bias`: `"private"`
- `event_weight_modifiers`: `{"anomaly_detected": 2.0, "echo_surface": 1.3, "special_event": 0.4}`
- `ui_filter_hint`: `"dark_vignette"`

#### hearth（庇护者）
- `tone`: `"warm_intimate"` - 温暖亲密，第二人称，鼓励性
- `asset_pack_hint`: `"pack_a_warm"`
- `visibility_bias`: `"private"`
- `event_weight_modifiers`: `{"mark_resonance": 1.6, "echo_surface": 1.4, "special_event": 0.8}`
- `ui_filter_hint`: `"warm_glow"`

#### oracle（先知者）
- `tone`: `"prophetic_direct"` - 预言式直接，世界主语
- `asset_pack_hint`: `"pack_b_mystic"`
- `visibility_bias`: `"local_public"`
- `event_weight_modifiers`: `{"special_event": 1.5, "anomaly_detected": 1.5, "broadcast_amplify": 1.3, "memory_echo": 1.8}`
- `ui_filter_hint`: `"golden_shimmer"`

---

## 四、vibe_profile → lens 映射规则

`vibe_profile` 是编排器或动态信号层输出的世界气氛描述，包含以下字段：

```python
@dataclass
class VibeProfile:
    district_type: str      # order_tower | memory_ruins | flowing_market | healing_oasis | edge_rift | mixed
    time_of_day: str        # morning | afternoon | evening | night
    observer_density: float # 0.0-1.0（来自 ObserverEffect.world_density）
    player_attunement: float  # 0.0-100.0（来自 PlayerState）
    weather: Optional[str]  # sunny | rainy | cloudy | foggy
    is_holiday: bool
    mark_count: int         # 当前 slice 的标记数量
    echo_count: int         # 当前 slice 的回声数量
```

### 映射优先级（从高到低）

1. **oracle 触发条件**（最高优先级）
   - `player_attunement >= 70` AND `(mark_count + echo_count) >= 3`

2. **surge 触发条件**
   - `observer_density >= 0.7`
   - OR `(is_holiday AND observer_density >= 0.4)`

3. **veil 触发条件**
   - `district_type == "edge_rift"` AND `time_of_day in ["night", "evening"]`
   - OR `weather == "foggy"`

4. **hearth 触发条件**
   - `district_type == "healing_oasis"`
   - OR `(district_type == "mixed" AND time_of_day == "evening" AND weather == "sunny")`

5. **chronicle 触发条件**
   - `district_type == "memory_ruins"`
   - OR `echo_count >= 5`

6. **drift（默认降级）**
   - 上述均不满足时

---

## 五、LensOutput 输出结构

```python
@dataclass
class LensOutput:
    lens_id: str
    label: str
    tone: str
    asset_pack_hint: str
    visibility_bias: str
    event_weight_modifiers: Dict[str, float]
    ui_filter_hint: str
    # 决策元数据
    trigger_reason: str        # 触发原因说明
    confidence: float          # 0.0-1.0
    fallback: bool             # 是否为降级镜头
```

---

## 六、与编排器的集成关系

镜头引擎作为编排器输出流程中的独立子步骤：

```
OrchestratorInput
    → RuleBasedOrchestrator.orchestrate()
        → LensEngine.resolve_lens(vibe_profile)  ← 新增
        → _calculate_observer_effect()
        → _generate_events()  [使用 lens.event_weight_modifiers 调整权重]
        → _generate_broadcasts()  [使用 lens.tone 调整文案风格]
    → OrchestratorOutput  [新增 lens_output 字段]
```

### OrchestratorOutput 扩展

```python
# 在现有 OrchestratorOutput 中新增：
lens_output: Optional[LensOutput] = None
```

---

## 七、前端消费关系

前端通过 `/api/world/orchestrate` 响应中的 `lens_output` 字段消费镜头指令：

```json
{
  "lens_output": {
    "lens_id": "veil",
    "label": "隐匿者",
    "tone": "liminal_terse",
    "asset_pack_hint": "pack_b_industrial",
    "visibility_bias": "private",
    "ui_filter_hint": "dark_vignette",
    "trigger_reason": "edge_rift district at evening",
    "confidence": 0.85,
    "fallback": false
  }
}
```

前端应根据 `ui_filter_hint` 切换 CSS 滤镜/主题类，根据 `asset_pack_hint` 优先加载对应资源包。

---

## 八、失败降级策略

| 场景 | 降级行为 |
|------|---------|
| `vibe_profile` 字段不完整 | 使用 `drift` 镜头，`fallback=true` |
| `observer_density` 缺失 | 视为 0.2 |
| `player_attunement` 缺失 | 视为 0 |
| `district_type` 未知 | 视为 `mixed` |

---

## 九、文件变更记录

- `docs/LENS_ENGINE_PROTOCOL.md` - 本协议文档（新增）
- `fablemap/lens_engine.py` - 实现文件（新增）
- `fablemap/orchestrator/schemas.py` - 新增 `LensOutput`、`VibeProfile` 类型
- `fablemap/orchestrator/rule_engine.py` - 集成镜头引擎
- `tests/test_lens_engine.py` - 测试用例（新增）
