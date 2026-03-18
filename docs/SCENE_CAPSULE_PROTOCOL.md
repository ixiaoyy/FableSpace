# AIO6 · 生成式场景胶囊协议 v1.0

## 定位

生成式场景胶囊（SceneCapsule）是城市人格代理（AIO5）对玩家的具体表现输出单元。

它定义了局部生成式表现层的**触发条件、输入结构、输出格式与失败降级边界**，确保生成内容有边界、有衰减、可降级，不破坏底层世界底座。

---

## 输入：CapsuleInput

| 字段 | 来源 | 说明 |
|---|---|---|
| `player_id` | player_state | 玩家 ID |
| `poi_id` | world_state | 当前 POI ID |
| `district_type` | district_classifier | 区域类型 |
| `persona` | AIO5 CityPersonaAgent | 城市人格状态 |
| `lens` | AIO2 LensEngine | 当前激活镜头 |
| `dwell_seconds` | player_state | 当前 POI 停留时长 |
| `visit_count` | player_state | 当前 POI 访问次数 |
| `writeback_count` | player_state | 累计写回事件数 |

---

## 触发条件

满足以下**任一条件**时触发场景胶囊：

| 条件 | 说明 |
|---|---|---|
| `trust_level >= 0.5` | 城市信任度足够 |
| `dwell_seconds >= 30` | 玩家停留超过 30 秒 |
| `visit_count >= 3` | 玩家第三次及以上访问同一 POI |
| `writeback_count >= 2` | 累计写回事件达 2 次 |

若均不满足，返回 `CapsuleOutput(triggered=False)`，不生成任何内容。

---

## 输出：CapsuleOutput

| 字段 | 类型 | 含义 |
|---|---|---|
| `triggered` | bool | 是否触发胶囊 |
| `capsule_type` | str | 胶囊类型（见下表） |
| `narrative_fragment` | str | 叙事片段文本 |
| `asset_hint` | str | 资产包提示（来自 lens） |
| `visibility` | str | 可见性（private/local_public/global） |
| `decay_turns` | int | 胶囊有效轮次（超出后自动衰减） |
| `persona_address` | str | 城市称谓（来自 CityPersona） |
| `ui_hint` | str | 前端渲染提示 |

---

## 胶囊类型映射

| response_bias | capsule_type | decay_turns |
|---|---|---|
| story | lore_whisper | 5 |
| repair | healing_pulse | 3 |
| mystery | void_glimpse | 4 |
| solitude | silent_mark | 6 |
| resonance | echo_bloom | 4 |
| drift | passing_trace | 2 |

---

## 可见性规则

- `trust_level >= 0.65` → `local_public`
- `trust_level >= 0.80` → `global`
- 否则 → `private`

---

## 叙事片段模板

叙事片段由 `{address}`（城市称谓）+ 区域类型 + 胶囊类型组合生成。

当前实现为模板字符串（无 LLM 调用），格式：

```
{address}，{district_type} 在此留下了印记。
```

未来可替换为 LLM prompt，接口不变。

---

## 降级规则

- 触发条件不满足 → `triggered=False`，所有内容字段为空字符串，`decay_turns=0`
- `persona` 为 None → 使用默认 wanderer 人格参数
- `lens` 为 None → `asset_hint="default_pack"`

---

## 编排器集成

```python
# fablemap/orchestrator/rule_engine.py
from ..scene_capsule import SceneCapsuleGenerator, CapsuleInput

if city_persona is not None:
    capsule_input = CapsuleInput(
        player_id=..., poi_id=..., district_type=...,
        persona=city_persona, lens=lens_output,
        dwell_seconds=..., visit_count=..., writeback_count=...
    )
    scene_capsule = SceneCapsuleGenerator().generate(capsule_input)
```

`OrchestratorOutput.scene_capsule: Optional[CapsuleOutput]`

---

## 影响边界

- 仅影响前端表现层（叙事片段、资产提示、UI 渲染提示）
- 不修改 world_state、writeback 记录或任何持久化数据
- 不调用外部 LLM（当前版本为模板实现）
- 衰减由前端负责计数，后端不持久化 decay 状态
