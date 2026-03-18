# AIO5 · 城市人格代理协议 v1.0

## 定位

城市人格代理（CityPersonaAgent）是 AI-native 世界编排层的个性化回应层。

它接收 AIO4 行为编译器输出的 MeaningVector，生成城市对单个玩家所持有的持续人格状态（CityPersona），包括：称谓、情绪倾向、问候语、回应偏好与信任度。

---

## 输入

`MeaningVector`（来自 `fablemap/behavior_compiler.py`）

关键字段：`dominant_meaning`、`myth_entry`、五维 score。

---

## 输出：CityPersona

| 字段 | 类型 | 含义 |
|---|---|---|
| `address` | str | 城市给玩家的称谓 |
| `emotional_tone` | str | 城市当前情绪倾向（warm/curious/respectful/wary/silent） |
| `greeting` | str | 个性化问候语（用于 broadcast / toast） |
| `response_bias` | str | 城市倾向提供的内容类型（story/repair/mystery/solitude/resonance/drift） |
| `trust_level` | float [0,1] | 城市对玩家的信任度 |
| `persona_tags` | List[str] | 人格标签（可供前端渲染徽章/图鉴） |
| `dominant_meaning` | str | 来源 dominant_meaning |

---

## 人格配置表

| dominant_meaning | address | emotional_tone | response_bias | trust_base |
|---|---|---|---|---|
| explorer | 幽灵制图者 | curious | mystery | 0.50 |
| chronicler | 记忆守护者 | respectful | story | 0.60 |
| restorer | 圣域编织者 | warm | repair | 0.65 |
| recluse | 虚空行者 | wary | solitude | 0.35 |
| resonant | 回声承载者 | warm | resonance | 0.70 |
| wanderer | 过路人 | curious | drift | 0.30 |

---

## 信任度修正规则

在 `trust_base` 基础上：

- `resonant_score × 0.15` 加分
- `explorer_score × 0.05` 加分
- `restorer_score × 0.10` 加分
- `recluse_score × 0.10` 减分
- 结果 clamp 到 [0.0, 1.0]

---

## myth_entry 标签

当 `trust_level >= 0.6` 且 `myth_entry` 非空时，`persona_tags` 中附加 `myth:{myth_entry}` 标签，供前端图鉴与徽章系统消费。

---

## 滑动更新（merge）

城市人格不是一次性生成，而是随玩家行为持续更新。

`CityPersonaAgent.merge(existing, new_meaning)` 使用指数滑动平均更新信任度：

```
trust = 0.3 × new_trust + 0.7 × existing_trust
```

其余字段（address、tone、bias、tags）直接替换为最新值。

---

## 编排器集成

```python
if meaning_vector is not None:
    city_persona = CityPersonaAgent().generate(meaning_vector)
```

结果挂载在 `OrchestratorOutput.city_persona`。

若 `meaning_vector` 为 None（无行为事件），则 `city_persona` 为 None，不影响其余编排输出。

---

## 影响边界

- CityPersonaAgent **不修改** world_state 或 player_state
- CityPersona 供上层（前端个性化 toast、图鉴系统、AIO6 场景胶囊）消费
- trust_level 不直接控制游戏内权限，仅作为表现层倾向信号

---

## 相关文件

- 实现：[`fablemap/city_persona.py`](../fablemap/city_persona.py)
- 测试：[`tests/test_city_persona.py`](../tests/test_city_persona.py)
- 上游：[`docs/BEHAVIOR_COMPILER_PROTOCOL.md`](BEHAVIOR_COMPILER_PROTOCOL.md)
- 下游：AIO6 生成式场景胶囊（待实现）
