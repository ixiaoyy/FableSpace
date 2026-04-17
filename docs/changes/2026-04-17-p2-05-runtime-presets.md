# 2026-04-17 — P2-05 运行预设管理器

## 完成内容

- 新增 `fablemap/presets.py`：
  - 定义运行预设结构：AI 参数、Prompt Blocks、记忆策略、输出护栏。
  - 内置 3 套运行预设：平衡剧情、低成本快速、长上下文世界书。
  - `safe_llm_preset_config()` 会剥离 API Key、token 使用量和未知字段。
  - `safe_memory_policy()` 归一化轻量 / 平衡 / 长上下文等记忆策略元数据。
- `Tavern` 新增字段：
  - `runtime_presets`
  - `active_preset_id`
  - `memory_policy`
- 新增店主 API：
  - `GET /api/taverns/{id}/runtime-presets`
  - `PUT /api/taverns/{id}/runtime-presets`
  - `POST /api/taverns/{id}/runtime-presets/apply`
- 应用预设时会同步：
  - AI 模型参数
  - Prompt Blocks
  - 输出护栏
  - 记忆策略
- 应用预设会尽量保留同 AI 服务下已有 API Key，但预设本身和酒馆包都不会保存 API Key。
- 酒馆包导出新增：
  - `runtime_presets`
  - `default_runtime_presets`
  - `active_preset_id`
  - `memory_policy`
- 新增 `frontend/src/PresetManager.jsx`：
  - 查看内置 / 自定义运行预设
  - 复制内置预设为自定义
  - 编辑模型参数、说明、记忆模式和预算
  - 从当前酒馆捕获 Prompt 段落 / 输出护栏 / 记忆策略组合
  - 保存自定义预设并应用到酒馆
- `TavernOwnerPanel` 与高级工具台新增“预设”入口。
- 新增 `tests/test_tavern_runtime_presets.py`，覆盖密钥剥离、默认预设、自定义保存、应用、导出和权限边界。

## 验证

- `py -3 -m pytest -q --tb=short tests/test_tavern_runtime_presets.py` → 3 passed
- `npm --prefix .\frontend run build` → passed
- `py -3 -m compileall -q fablemap` → passed
- `py -3 -m pytest -q --tb=short` → 180 passed
