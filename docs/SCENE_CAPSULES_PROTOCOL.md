# AIO6 · 生成式场景胶囊协议 v1.0

## 定位

生成式场景胶囊（Scene Capsules）是 FableMap AI-native 世界编排层中的**局部生成式表现层**。

它的职责不是决定“世界发生什么”，而是在上游世界状态、写回事件、镜头选择与城市人格已经给出结构化信号后，为单个地点、单次接近、一次回访或一个短时段状态生成可消费的**局部场景呈现片段**。

换句话说：

- [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md) 负责“世界下一步反应是什么”
- [`docs/LENS_ENGINE_PROTOCOL.md`](LENS_ENGINE_PROTOCOL.md) 负责“世界以什么感知模式呈现”
- [`docs/CITY_PERSONA_PROTOCOL.md`](CITY_PERSONA_PROTOCOL.md) 负责“城市如何对玩家说话”
- AIO6 Scene Capsules 负责“把这些上游信号压缩成一个可渲染、可降级、可缓存的局部体验单元”

## 核心原则

1. **局部，不改世界状态**
   - Scene Capsule 只读取状态并输出表现层 payload
   - 它不直接写回 `world_state`、`player_state` 或治理结果

2. **生成失败可回退**
   - 任何胶囊都必须能退回到确定性 UI
   - 主舞台不能依赖生成成功才能工作

3. **可见性优先于文案风格**
   - `private / local_public / global` 是第一层过滤条件
   - 不能因为生成能力而突破可见性边界

4. **短生命周期、可缓存、可替换**
   - 胶囊是“当前时刻的局部世界显影”，不是永久世界事实
   - 永久状态仍由写回协议与世界存储负责

5. **前后端都消费结构，不直接消费自由文本**
   - 文本、视觉提示、音景提示、交互 affordance 必须包在结构化 schema 内
   - 便于渲染、缓存、审计与降级

---

## 一、适用场景

Scene Capsule 适用于以下体验：

- 玩家接近某个 POI 时出现的局部叙事显影
- 玩家在某地点驻留后触发的短时氛围场
- 玩家留下 `mark` 后出现的私人或局部反馈片段
- 城市人格对玩家给出的情境化回应
- 回访同一 slice 时，对先前痕迹进行再解释的局部场景层

不适用于：

- 世界规则判定
- 长期任务树编排
- 地图资源包生成
- 持久存储写回结构本身
- 独立取代 [`fablemap/bundle.py`](../fablemap/bundle.py) 已有的确定性 `echo` / `capsule mark` / `panel` 呈现

---

## 二、触发来源与优先级

Scene Capsule 由上游信号共同驱动，但必须遵守统一优先级，避免同一时刻生成多个互相冲突的胶囊。

### 2.1 四类主要触发来源

#### 1. `event_driven`
由编排器输出的 `event_suggestions` 或最近写回事件触发。

典型来源：
- `observe`
- `dwell`
- `mark`
- `echo`
- `memory_anchor`
- `quest_hint`

#### 2. `lens_driven`
由当前 `lens_output` 决定局部显影的渲染方式与文案风格。

典型用途：
- `veil`：边界感、异象感、低可见噪声
- `hearth`：温暖、庇护、私人驻留
- `oracle`：预言感、回访解释、世界主动说话

#### 3. `persona_driven`
由 `city_persona` 决定城市如何称呼玩家、偏好提供何种内容。

典型用途：
- `response_bias == story`：偏叙事 capsule
- `response_bias == repair`：偏修复提示 capsule
- `response_bias == mystery`：偏隐喻与异常 capsule

#### 4. `revisit_driven`
由回访、历史痕迹、回声积累触发。

典型来源：
- 同一 `slice_id` 下存在既往 `mark`
- 同一目标已有 `echo_entries`
- `poi_familiarity` 或 `zone_familiarity` 达到阈值

### 2.2 触发优先级

当多个来源同时满足时，按以下优先级选出**一个主胶囊**：

1. `revisit_driven`
2. `event_driven`
3. `persona_driven`
4. `lens_driven`

原因：
- 回访显影最依赖时序上下文，最容易丢失语义
- 事件驱动是当前动作的直接反馈
- 城市人格是个性化偏向层
- 镜头层用于补足呈现风格，不应压过具体事件

### 2.3 冷却、互斥与去重

#### 冷却规则
- 同一 `player_id + target_id + capsule_type` 在 `90s` 内不重复生成
- `ambient` 类胶囊冷却 `180s`
- `revisit` 类胶囊同一 slice 每次进入最多触发 `1` 次

#### 互斥规则
以下类型同一时刻仅保留一个：
- `memory_reveal`
- `anomaly_glimpse`
- `persona_whisper`

#### 去重键
建议使用：

```text
capsule:{player_id}:{slice_id}:{target_type}:{target_id}:{capsule_type}:{visibility}
```

若新请求命中相同键且核心输入未变化，则直接返回缓存结果。

---

## 三、可见性规则

Scene Capsule 必须继承并服从写回协议中的可见性定义，见 [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)。

### 3.1 可见性层级

- `private`：只对当前玩家可见
- `local_public`：可对同 slice 或同 zone 的其他玩家可见
- `global`：允许进入全城或跨区域消费层

### 3.2 胶囊类型与可见性限制

| capsule_type | 允许可见性 | 说明 |
|---|---|---|
| `memory_reveal` | `private` | 私人回忆、内心注释、情绪显影 |
| `dwell_aura` | `private`, `local_public` | 驻留造成的局部氛围层 |
| `anomaly_glimpse` | `private`, `local_public` | 异常显影，默认不直接全局公开 |
| `persona_whisper` | `private` | 城市对玩家个人说话 |
| `legend_fragment` | `local_public`, `global` | 街头传说、公共叙事碎片 |
| `broadcast_echo` | `global` | 与全局广播或公共事件绑定 |

### 3.3 治理边界

- 当上游事件为 `private` 时，Scene Capsule 不得自动升级到 `local_public` 或 `global`
- 当输入包含玩家自由文本时，只能生成 `private` 或经治理通过的 `local_public` 胶囊
- `global` 胶囊必须来源于公共事件、公共地标或已治理通过的公共层信号

---

## 四、Capsule 类型定义

第一版统一定义 6 类 Scene Capsule：

### 4.1 `memory_reveal`
- **定位**：把既有写回、熟悉度或回声压缩成私人记忆显影
- **常见触发**：`revisit_driven`、`observe`、`echo_count` 上升
- **默认可见性**：`private`
- **典型镜头偏好**：`chronicle`、`oracle`

### 4.2 `dwell_aura`
- **定位**：把停留行为转成短时环境氛围场
- **常见触发**：`dwell`、高 attunement、黄昏或夜晚
- **默认可见性**：`private`
- **可扩展可见性**：`local_public`
- **典型镜头偏好**：`hearth`、`drift`

### 4.3 `anomaly_glimpse`
- **定位**：把异常感或边缘信号转成一段短时可见的异象片段
- **常见触发**：`veil`、`foggy`、`edge_rift`、异常事件
- **默认可见性**：`private`
- **典型镜头偏好**：`veil`、`oracle`

### 4.4 `persona_whisper`
- **定位**：让城市人格对玩家发出一句定向回应
- **常见触发**：存在 `city_persona` 且 `trust_level >= 0.45`
- **默认可见性**：`private`
- **典型镜头偏好**：随 `city_persona.response_bias` 变化

### 4.5 `legend_fragment`
- **定位**：把公共地点、历史回声或集体痕迹组装成一段局部传说碎片
- **常见触发**：`local_public/global mark`、`echo`、公共地标
- **默认可见性**：`local_public`
- **可扩展可见性**：`global`
- **典型镜头偏好**：`chronicle`、`surge`

### 4.6 `broadcast_echo`
- **定位**：把公共广播或全城事件压成地点化的局部回响
- **常见触发**：`broadcast`、节庆、人流高峰、公共事件
- **默认可见性**：`global`
- **典型镜头偏好**：`surge`、`oracle`

---

## 五、输入 Schema

```python
@dataclass
class SceneCapsuleInput:
    request_id: str
    player_id: str
    slice_id: str

    target_type: str          # poi | zone | route | landmark | world
    target_id: str
    visibility: str           # private | local_public | global

    # 上游编排输入
    recent_writeback_events: List[WritebackEvent]
    event_suggestions: List[EventSuggestion]
    lens_output: Optional[LensOutput]
    city_persona: Optional[CityPersona]

    # 世界与玩家上下文
    world_state_excerpt: Dict[str, Any]
    player_state_excerpt: Dict[str, Any]
    dynamic_signals: Dict[str, Any]

    # 历史与回访
    revisit_context: Dict[str, Any]

    # 安全与降级
    safety_flags: Dict[str, bool]
    deterministic_fallbacks: List[str]
```

### 5.1 必填字段

- `request_id`
- `player_id`
- `slice_id`
- `target_type`
- `target_id`
- `visibility`
- `recent_writeback_events`
- `world_state_excerpt`
- `player_state_excerpt`
- `safety_flags`
- `deterministic_fallbacks`

### 5.2 `world_state_excerpt` 建议最小字段

```json
{
  "world_id": "world_tokyo_shibuya",
  "district_type": "memory_ruins",
  "poi_name": "Clocktower of Quiet Rain",
  "tags": ["historical_echo", "secret_slot"],
  "existing_marks": 2,
  "existing_echoes": 1
}
```

### 5.3 `player_state_excerpt` 建议最小字段

```json
{
  "attunement": 72,
  "clarity": 61,
  "fatigue": 28,
  "poi_familiarity": 4,
  "zone_familiarity": 7,
  "last_action": "observe"
}
```

### 5.4 `safety_flags`

至少包含：

```json
{
  "allow_generated_text": true,
  "allow_public_capsule": false,
  "allow_persona_address": true,
  "sensitive_target": false,
  "low_confidence_mode": false
}
```

### 5.5 输入约束

- `world_state_excerpt` 必须是**局部摘录**，不应传整个 world json
- 玩家自由文本如进入输入，必须先经过治理过滤
- 所有字段必须可序列化为 JSON
- 单次输入建议控制在 `16KB` 以内，便于缓存与调试

---

## 六、输出 Schema

```python
@dataclass
class SceneCapsuleOutput:
    capsule_id: str
    capsule_type: str
    trigger_source: str       # event_driven | lens_driven | persona_driven | revisit_driven
    target_type: str
    target_id: str
    visibility: str

    title: str
    summary: str
    text_blocks: List[TextBlock]
    visual_hints: List[VisualHint]
    sound_hints: List[SoundHint]
    interaction_hooks: List[InteractionHook]

    render_mode: str          # panel | overlay | whisper | beacon | ambient
    ui_filter_hint: Optional[str]
    asset_pack_hint: Optional[str]

    ttl_seconds: int
    cooldown_seconds: int
    confidence: float
    fallback: bool
    fallback_reason: Optional[str]

    cache_key: str
    metadata: Dict[str, Any]
```

### 6.1 子结构

```python
@dataclass
class TextBlock:
    role: str                 # title | body | whisper | annotation
    text: str
    tone: Optional[str] = None

@dataclass
class VisualHint:
    hint_type: str            # glow | shimmer | vignette | marker_pulse | sepia | fog
    intensity: float          # 0.0-1.0
    anchor: Optional[str]     # poi | panel | route | viewport

@dataclass
class SoundHint:
    hint_type: str            # hush | wind | chime | crowd | resonance
    intensity: float          # 0.0-1.0
    loop: bool = False

@dataclass
class InteractionHook:
    action_id: str            # inspect_echo | dwell_more | leave_mark | dismiss
    label: str
    target_ref: Optional[str] = None
```

### 6.2 输出约束

- `title` 建议不超过 `48` 字符
- `summary` 建议不超过 `160` 字符
- `text_blocks` 最多 `3` 段
- 单段 `text` 建议不超过 `220` 字符
- `visual_hints` 最多 `4` 条
- `sound_hints` 最多 `2` 条
- `interaction_hooks` 最多 `4` 条
- `ttl_seconds` 建议范围：`15-180`

### 6.3 `render_mode` 定义

| render_mode | 含义 | 适合类型 |
|---|---|---|
| `panel` | 侧边或底部面板呈现 | `legend_fragment`, `memory_reveal` |
| `overlay` | 地图局部浮层 | `anomaly_glimpse`, `broadcast_echo` |
| `whisper` | 轻量短语或 toast | `persona_whisper` |
| `beacon` | 结合地图锚点脉冲 | `legend_fragment`, `broadcast_echo` |
| `ambient` | 不强调文本，强调环境变化 | `dwell_aura` |

---

## 七、叙事模板约束

第一版允许生成文本，但应优先落在模板化约束内。

### 7.1 文本风格来源

- 基础语气来自 `lens_output.tone`
- 称谓与回应偏好来自 `city_persona`
- 事件语义来自 `event_suggestions` 或 `recent_writeback_events`

### 7.2 推荐模板

#### `memory_reveal`
> 这里记得你上次留下的动作。某个细节重新浮出，但只对你成立。

#### `dwell_aura`
> 你停留得足够久，周围开始出现一层短暂的气候偏差。

#### `anomaly_glimpse`
> 世界边缘短暂张开，某个平时不会被看见的纹理露了出来。

#### `persona_whisper`
> 城市以称谓直呼玩家，并给出一句偏向 `story / repair / mystery / resonance` 的回应。

#### `legend_fragment`
> 地点的公共层开始拼出一句可被他人继承的传说碎片。

#### `broadcast_echo`
> 全城广播在这里留下地点化回响，形成局部事件残响。

### 7.3 禁止项

- 不输出伪装成“永久事实”的绝对陈述
- 不越权声明治理结论
- 不替代玩家自由表达
- 不在 `private` 输入上生成公共叙事断言

---

## 八、失败降级策略

Scene Capsule 必须支持三级降级：

### 8.1 Level 1：模板降级

触发条件：
- 模型不可用
- 模型超时
- 生成文本为空
- 置信度 `< 0.55`

处理方式：
- 保留结构化输出
- 改用模板文本填充 `title / summary / text_blocks`
- `fallback = true`
- `fallback_reason = "template_fallback"`

### 8.2 Level 2：确定性 UI 降级

触发条件：
- 输入不足以生成 capsule
- 安全标记禁止生成文本
- target 为敏感对象

处理方式：
- 不返回自由生成文本
- 回退到已存在的确定性元素：
  - `echo_entries`
  - `broadcast_hints`
  - `capsule mark`
  - `text panel`
  - `ui_state_changes`
- `render_mode` 退化为 `panel` 或 `beacon`
- `fallback_reason = "deterministic_ui_fallback"`

### 8.3 Level 3：静默跳过

触发条件：
- 可见性冲突
- 输入无有效 target
- 冷却未到
- 互斥类型已存在

处理方式：
- 不生成 scene capsule
- 上游流程继续，不阻断编排器其他输出

---

## 九、与编排器的集成

### 9.1 后端集成位置

建议作为编排器输出阶段的后处理步骤：

```python
OrchestratorInput
    -> RuleBasedOrchestrator.orchestrate()
        -> lens_output
        -> city_persona
        -> event_suggestions
        -> build_scene_capsule_input()
        -> SceneCapsuleResolver.resolve()
    -> OrchestratorOutput + scene_capsules
```

### 9.2 `OrchestratorOutput` 扩展建议

```python
scene_capsules: List[SceneCapsuleOutput] = []
```

第一版建议单次输出 `0-2` 个胶囊：
- `1` 个主胶囊
- 可选 `1` 个辅助胶囊（仅限 `ambient` 或 `whisper`）

### 9.3 与现有输出的关系

- `broadcast_suggestions`：提供公共事件来源
- `echo_suggestions`：提供历史/地点显影来源
- `callback_hooks`：可转化为 `interaction_hooks`
- `observer_effect`：可影响 `visual_hints` 强度
- `lens_output`：决定 `tone / asset_pack_hint / ui_filter_hint`
- `city_persona`：决定 `persona_whisper` 内容和称谓方式

---

## 十、前端消费关系

前端不应把 Scene Capsule 当成整页模式，而应作为主舞台上的**渐进增强层**。

### 10.1 前端消费原则

- 没有 capsule 时，世界照常渲染
- 有 capsule 时，按 `render_mode` 局部增强
- `fallback = true` 时，不应显示“生成失败”，只显示退化后的正常 UI

### 10.2 推荐消费映射

| capsule_type | 首选前端呈现 |
|---|---|
| `memory_reveal` | POI 详情面板 + 弱发光锚点 |
| `dwell_aura` | 地图局部氛围 overlay + 微弱环境音提示 |
| `anomaly_glimpse` | 视口 vignette / shimmer + 短文本浮层 |
| `persona_whisper` | toast / side whisper card |
| `legend_fragment` | 侧边传说卡片 + 地点标记脉冲 |
| `broadcast_echo` | 广播卡片 + 全局/区域 beacon |

### 10.3 与资源包的兼容方式

- 优先读取 `asset_pack_hint`
- 若前端暂无对应素材，则仅消费 `visual_hints + text_blocks`
- 不要求先完成地图资源包接入，避免阻塞 [`M3`](AI_SHARED_TASKLIST.md)

### 10.4 与现有锚点的兼容关系

可直接复用现有确定性呈现锚点：
- [`fablemap/world_builder.py`](../fablemap/world_builder.py) 中的 `private_capsules`、`historical_echo`、myth thread 语义
- [`fablemap/bundle.py`](../fablemap/bundle.py) 中的 `capsule-mark`、`echo-panel`、地图锚点 SVG 结构

---

## 十一、缓存与审计建议

### 11.1 缓存键

```text
scene_capsule:{player_id}:{slice_id}:{target_id}:{capsule_type}:{lens_id}:{visibility}
```

### 11.2 缓存失效条件

以下任一变化应失效：
- `recent_writeback_events` 新增相关事件
- `lens_output.lens_id` 变化
- `city_persona.response_bias` 变化
- `visibility` 变化
- `revisit_context` 中回访层级变化

### 11.3 审计字段

`metadata` 建议包含：

```json
{
  "source_event_ids": ["evt_1", "evt_2"],
  "lens_id": "chronicle",
  "persona_bias": "story",
  "template_used": false,
  "governance_checked": true
}
```

---

## 十二、MVP 实施建议

第一阶段只需支持：

1. `memory_reveal`
2. `persona_whisper`
3. `legend_fragment`
4. 模板降级与确定性 UI 降级

第二阶段再进入：

5. `dwell_aura`
6. `anomaly_glimpse`
7. `broadcast_echo`
8. 更丰富的 visual / sound hints

这样可以保证：
- 先打通编排器 → 协议 → 前端消费链路
- 再逐步增加生成式复杂度

---

## 相关文件

- 上游协议：[`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md)
- 上游协议：[`docs/LENS_ENGINE_PROTOCOL.md`](LENS_ENGINE_PROTOCOL.md)
- 上游协议：[`docs/CITY_PERSONA_PROTOCOL.md`](CITY_PERSONA_PROTOCOL.md)
- 写回语义：[`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- 现有世界锚点：[`fablemap/world_builder.py`](../fablemap/world_builder.py)
- 现有确定性呈现：[`fablemap/bundle.py`](../fablemap/bundle.py)
