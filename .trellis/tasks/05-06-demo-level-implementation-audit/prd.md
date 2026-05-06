# PRD: Demo-level implementation audit and Trellis backlog

## Goal

检索 FableMap 全项目开发与实现，识别仍停留在 demo / mock / placeholder / preview-only / hardcoded 样例层面的功能或设计，并为确实影响主链路产品化的项创建针对性 Trellis 开发任务。

## Scope

- 扫描 `backend/`、`frontend/`、`tests/`、`docs/`、`.trellis/spec/` 中与当前主链路相关的实现与文档。
- 区分三类结果：
  1. **需要产品化开发任务**：代码可见、会进入用户链路、当前只是 demo/stub/mock/只读预览或硬编码。
  2. **刻意 preview-only / not-to-build**：规范明确要求只预览或明确不做，不创建产品化任务。
  3. **低优先历史/测试样例**：只在测试或旧 product parity 源里，不阻塞当前主链路。
- 创建 Trellis 子任务或独立任务，PRD 写清目标、验收标准、相关证据和不可做边界。

## Acceptance Criteria

- [ ] 生成审计报告，列出检索关键词、命中证据、结论和优先级。
- [ ] 为 P0/P1/P2 级别 demo 层实现创建 Trellis 开发任务。
- [ ] 每个新任务包含 `task.json` 和 `prd.md`，并能通过 `task.py validate` 基础校验。
- [ ] 不创建违反 `docs/WHAT_NOT_TO_BUILD.md` 的任务。
- [ ] 不改业务代码；本任务只做审计和任务拆分。
