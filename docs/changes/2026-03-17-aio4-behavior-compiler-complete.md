# AIO4 · 行为到意义编译器实现完成

**日期**：2026-03-17
**任务**：AIO4 · 行为到意义编译器
**状态**：done

## 变更摘要

### 新增文件

- `fablemap/behavior_compiler.py`
  - `BehaviorEvent`：单次玩家行为事件 dataclass
  - `BehaviorTrace`：行为序列容器
  - `MeaningVector`：五维语义向量输出（explorer / chronicler / restorer / recluse / resonant）+ dominant_meaning + myth_entry
  - `BehaviorCompiler.compile()`：核心编译逻辑，按五维规则计分，择优选 dominant
  - `build_trace()`：从原始 dict 列表快速构建 BehaviorTrace

- `docs/BEHAVIOR_COMPILER_PROTOCOL.md`
  - 完整协议文档：输入输出结构、五维编译规则、myth_entry 映射、编排器集成方式、影响边界

- `tests/test_behavior_compiler.py`
  - 11 个测试用例：空序列、单事件、五维各自触发、混合行为、action_counts、dominant_district、scores 边界

### 修改文件

- `fablemap/orchestrator/schemas.py`
  - 新增 `from ..behavior_compiler import MeaningVector`
  - `OrchestratorOutput` 新增字段 `meaning_vector: Optional[MeaningVector] = None`

- `fablemap/orchestrator/rule_engine.py`
  - 新增 `from ..behavior_compiler import BehaviorCompiler, build_trace`
  - `orchestrate()` 中读取 `player_state.behavior_events`，调用 `BehaviorCompiler().compile()` 并将结果写入 `OrchestratorOutput.meaning_vector`
  - 若无 behavior_events 则 meaning_vector 为 None，不影响其余输出

## myth_entry 对照

| dominant_meaning | myth_entry |
|---|---|
| explorer | ghost_cartographer |
| chronicler | memory_keeper |
| restorer | sanctuary_weaver |
| recluse | void_walker |
| resonant | echo_bearer |
| wanderer | unnamed_drifter |

## 上下游关系

- 上游：`LensEngine`（lens_id 作为行为事件上下文输入）
- 下游：AIO5 城市人格代理（消费 MeaningVector）
