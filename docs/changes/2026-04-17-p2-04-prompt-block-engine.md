# 2026-04-17 — P2-04 Prompt Block 段落引擎

## 完成内容

- 新增 `fablemap/prompt_blocks.py`：
  - 内置默认段落：场景、角色指令、角色信息、访客关系、世界书、风格护栏、作者备注。
  - 提供 `normalize_prompt_blocks()`，统一段落类型、顺序、启用状态和预算字段。
  - 提供 `truncate_to_budget()`，用无依赖的粗略字符预算保护超长段落。
- `PromptBuildConfig` 新增 `prompt_blocks`：
  - 为空时沿用旧 PromptBuilder 分层行为，保证兼容。
  - 有配置时按段落 `enabled/order/type` 组装系统上下文。
  - `world_info` 段落保留动态命中注入，可通过关闭段落禁用世界书注入。
- `WorldInfoInjector` 兼容 `Tavern.world_info.to_dict()` 输出的 `tavern_id/order` 等扩展字段，避免 Prompt 预览和聊天构建因多余字段中断。
- `Tavern` 增加 `prompt_blocks` 持久化字段，并纳入酒馆更新、导入和导出。
- 新增店主 API：
  - `GET /api/taverns/{id}/prompt-blocks`
  - `PUT /api/taverns/{id}/prompt-blocks`
  - `POST /api/taverns/{id}/prompt-blocks/preview`
- 新增 `frontend/src/PromptBlockEditor.jsx`：
  - 支持段落开关、排序、类型、模板、预算、复制、删除自定义段、恢复默认。
  - 支持无 LLM 预览最终 `messages` 顺序。
  - 在酒馆卡片和高级工具台新增“段落”入口。
- `frontend/src/styles.css` 新增 Prompt Block 编辑器桌面 / 移动端样式。
- 新增 `tests/test_tavern_prompt_blocks.py`，覆盖段落构建、世界书关闭、预算裁剪、归一化和 API 权限。

## 验证

- `py -3 -m pytest -q --tb=short tests/test_tavern_prompt_blocks.py` → 4 passed
- `npm --prefix .\frontend run build` → passed
- `py -3 -m compileall -q fablemap` → passed
- `py -3 -m pytest -q --tb=short` → 177 passed
