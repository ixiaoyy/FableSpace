# AIO5 · 城市人格代理实现完成

**日期**：2026-03-17
**任务**：AIO5 · 城市人格代理
**状态**：done

## 变更摘要

### 新增文件

- `fablemap/city_persona.py`
  - `CityPersona`：城市对单个玩家的持续人格状态 dataclass
  - `_PersonaConfig`：六种人格配置（explorer/chronicler/restorer/recluse/resonant/wanderer）
  - `_PERSONA_CATALOG`：dominant_meaning → 人格配置映射表
  - `_compute_trust()`：基于五维 score 对信任度进行修正
  - `CityPersonaAgent.generate()`：从 MeaningVector 生成 CityPersona
  - `CityPersonaAgent.merge()`：滑动更新现有人格（EMA alpha=0.3）

- `docs/CITY_PERSONA_PROTOCOL.md`
  - 完整协议文档：输入输出结构、人格配置表、信任度规则、myth_entry 标签、滑动更新、编排器集成、影响边界

- `tests/test_city_persona.py`
  - 15 个测试用例：六种 dominant 基础生成、信任度规则、myth_entry 标签、greeting 非空、merge EMA 验证、merge 更新 dominant

### 修改文件

- `fablemap/orchestrator/schemas.py`
  - 新增 `from ..city_persona import CityPersona`
  - `OrchestratorOutput` 新增字段 `city_persona: Optional[CityPersona] = None`

- `fablemap/orchestrator/rule_engine.py`
  - 新增 `from ..city_persona import CityPersonaAgent`
  - `orchestrate()` 中若 meaning_vector 非空则调用 `CityPersonaAgent().generate(meaning_vector)`
  - 结果写入 `OrchestratorOutput.city_persona`

## 人格配置对照

| dominant | address | tone | bias | trust_base |
|---|---|---|---|---|
| explorer | 幽灵制图者 | curious | mystery | 0.50 |
| chronicler | 记忆守护者 | respectful | story | 0.60 |
| restorer | 圣域编织者 | warm | repair | 0.65 |
| recluse | 虚空行者 | wary | solitude | 0.35 |
| resonant | 回声承载者 | warm | resonance | 0.70 |
| wanderer | 过路人 | curious | drift | 0.30 |

## 上下游关系

- 上游：`BehaviorCompiler` → `MeaningVector`（AIO4）
- 下游：AIO6 生成式场景胶囊（消费 CityPersona.response_bias + trust_level）
