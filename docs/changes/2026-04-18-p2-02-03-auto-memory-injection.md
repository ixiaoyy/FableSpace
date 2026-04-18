# 2026-04-18 — P2-02 / P2-03 自动记忆与预算注入

把结构化记忆从手动 CRUD 推进到聊天后自动沉淀，并接入 Prompt 预算选择，让记忆可以成为对话连续性的默认能力。

## 范围

| 文件 | 说明 |
|------|------|
| `fablemap/memory/core.py` | 新增自动提炼、候选打分、去重合并、Prompt 优先级选择和格式化函数；`fablemap.memory` 保持兼容 re-export |
| `fablemap/web/service.py` | 聊天后自动写入 MemoryAtom；按 `memory_policy` 选择可见记忆注入 Prompt |
| `fablemap/web/router.py` | 新增 `/api/taverns/{id}/memories` 轻量列表端点，支持筛选、分页、关键词和 pinned |
| `fablemap/prompt_builder.py` | `PromptBuildConfig` 支持 `memory_atoms` / `memory_budget_tokens`，legacy 与 block 模式均可注入 |
| `fablemap/prompt_blocks.py` | 默认段落增加“结构化记忆”，无记忆时自动跳过 |
| `frontend/src/TavernMemoryPanel.jsx` | 访客记忆面板支持结构化记忆列表、手动添加、固定、删除、标错和新记忆提示 |
| `frontend/src/TavernContextPanel.jsx` | 右侧上下文“记忆”页展示自动提炼记忆，并支持刷新、固定、删除和标错 |
| `tests/test_tavern_memory_atoms.py` | 覆盖自动提炼 / 合并、Prompt 选择优先级和聊天 Prompt 注入 |

## 行为

- 自动提炼不依赖 LLM；使用规则启发式识别事实、情绪、事件、偏好和承诺。
- 同一访客 / 角色 / 维度下重复内容会合并，保留来源消息 ID、提高命中次数，并延展 horizon。
- 标错记忆保留在 UI 中，但会被 Prompt 选择器排除。
- Prompt 注入按 pinned、horizon、角色相关性、scope、关键词命中、重要度、置信度和更新时间排序，并按 token 预算裁剪。

## 验证

- `py -3 -m pytest tests/test_tavern_memory_atoms.py tests/test_tavern_prompt_blocks.py tests/test_tavern_llm_degradation.py -q`：12 passed, 1 skipped
- `py -3 -m pytest tests --ignore=tests/test_api.py -q`：160 passed, 8 skipped
- `py -3 -m compileall -q fablemap`：通过
- `npm --prefix .\frontend run build`：通过

`tests/test_api.py` 在当前环境缺少 `httpx` 时无法收集；仓库根目录直接跑 `pytest` 还会收进 `tools/ComfyUI` 的外部测试，当前环境缺少 torch / aiohttp / sqlalchemy / yaml 等依赖。
