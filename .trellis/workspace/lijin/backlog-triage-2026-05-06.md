# Trellis 待办任务整理（2026-05-06）

> Scope: 只整理 `.trellis/tasks/` 中的任务状态与优先队列；未修改业务代码、未改任何 task 状态。

## 1. 快照摘要

- 有效 `task.json`：92 个。
- 已完成/已做：72 个（`completed` 71，`done` 1）。
- 待办/待收口：20 个（`review` 1，`planning` 19）。
- `P1` 待办：9 个（其中 1 个 review、8 个 planning）。
- `P2` 待办：11 个。
- 目录但无 `task.json`：4 个：`archive`（预期）、`04-28-guest-message-board`、`04-28-owner-dashboard`、`04-29-new-feature-directions`。
- `task.py list` 只显示 80 个任务；另有 12 个有效 task 因父任务 `04-29-npc-role-prompt-safety-brainstorm` 缺失而不可达，但它们全是 completed，不影响当前待办。
- `task.py list --status planning` 只显示 5 个顶层 planning；completed 父任务下的 planning 子任务会被过滤隐藏，因此本次待办统计以直接解析 `task.json` 为准。

## 2. 当前最需要先收口

### A. Review / 分支收口

1. `05-05-homepage-seed-fallback-hero-scale` — **P1 / review / fullstack**
   - 状态：已有 notes 显示多轮验证已通过，仍停在 `review`。
   - 建议：先做人工确认、record-session/commit 或明确退回修改；不要在当前 103 个未提交变更上继续混入新功能。

## 3. P1 开发队列（建议顺序）

### B. Demo → Product 基础治理

1. `05-06-replace-demo-user-identity-defaults` — **P1 / fullstack**
   - 原因：owner/visitor 身份边界是通知、记忆、Home、权限测试的基础。
   - 建议先做：显式 owner identity、稳定匿名 visitor session、移除生产默认 `owner-demo` / `visitor-demo`。

2. `05-06-hardcoded-rules-mode-response` — **P1 / fullstack**
   - 原因：直接影响访客聊天主体验；当前规则模式容易被感知为“系统回复 / 写死”。
   - 建议先做：规则模式产品化、文案透明、避免 prompt/scene/system 字段泄露。

3. `05-06-productize-ai-draft-generation` — **P1 / fullstack**
   - 原因：店主 AI 草稿不应伪装为真实 LLM 生成；需要 owner LLM / fallback 元数据。
   - 建议先做：`source=owner_llm | local_template_fallback`，店主确认前访客不可见。

4. `05-06-persistent-notification-auth` — **P1 / fullstack**
   - 依赖/关联：建议在 identity 边界明确后做。
   - 建议先做：持久化通知、REST/WS 统一身份校验、越权测试。

5. `05-06-home-route-productization` — **P1 / fullstack**
   - 依赖/关联：建议在 identity 边界明确后做。
   - 建议先做：二选一——产品化为真实 `place_type=home` 主线，或从入口下线半成品 `home-me`。

### C. 角色关系图链路（按依赖顺序）

1. `05-06-relationship-graph-schema-storage` — **P1 / backend**
2. `05-06-relationship-graph-propagation-engine` — **P1 / backend**
3. `05-06-relationship-graph-api-governance` — **P1 / backend**
4. `05-06-relationship-graph-owner-ui` — **P2 / frontend**
5. `05-06-relationship-graph-prompt-discovery-integration` — **P2 / fullstack**

建议：先完成 schema/storage，再做 propagation，再开放 API；UI 和 prompt/discovery 必须等 confirmed/enabled 边界稳定后再接。

## 4. P2 产品化补齐队列

1. `05-06-memory-search-adapter-productization` — **P2 / backend**
   - 二选一：实现可配置 graph/vector adapter，或改名为 keyword/shared-field search，消除 `graph_stub` 能力错配。

2. `05-06-owner-dialogue-preview-dryrun` — **P2 / fullstack**
   - 二选一：接后端 prompt dry-run / 可选 owner LLM 测试，或 UI 明确改名为本地模拟器。

3. `05-06-preset-import-apply-flow` — **P2 / fullstack**
   - 在 preview risk report 之后补 owner-confirmed apply，只应用 supported 子集，blocked/warning 默认不自动应用。

4. `05-06-quest-checklist-persistence` — **P2 / fullstack**
   - 二选一：改成探索指南（不承诺进度），或做非竞技、非奖励化的 visitor 持久清单。

## 5. Brainstorm / 方案评估类待办

这些任务目前适合先继续沉淀方案，不建议和上面的实现任务混在同一次代码改动里：

- `05-05-brainstorm-sillytavern-vs-fablemap` — SillyTavern vs FableMap 架构对比。
- `05-05-character-gacha-gameplay-brainstorm` — 角色抽卡/玩法方向。
- `05-06-local-codex-llm-chat-evaluation` — 本地 Codex 作为 LLM/chat backend 可行性评估。
- `05-06-tavern-soft-currency-gifts-design` — 酒馆纪念币 / 礼物 / 好感度 / 限额抽卡券设计。
- `05-06-visitor-profile-affinity-access-brainstorm` — 游客身份画像、初始好感、可见性与长期记忆边界。

## 6. 建议的下一步认领策略

如果现在要继续开发，建议三选一：

1. **先收口当前分支**：认领/继续 `05-05-homepage-seed-fallback-hero-scale` review，完成 record-session 与提交。
2. **做产品化基础设施**：认领 `05-06-replace-demo-user-identity-defaults`，它会减少后续通知、记忆、Home、权限类任务返工。
3. **优先修聊天体验**：认领 `05-06-hardcoded-rules-mode-response`，直接回应“像系统回复 / 写死”的用户可见问题。

## 7. 建议但本次未执行的 Trellis 清理

- 可考虑把 `05-06-05-06-hide-visitor-memory-panels` 的 status 从 `done` 统一成 `completed`；当前 Trellis progress 已把 `done` 当完成处理，因此不是阻塞。
- 可考虑恢复或清理缺失父任务 `04-29-npc-role-prompt-safety-brainstorm` 的 12 个 completed 子任务 parent 链接；这只影响历史列表可达性，不影响当前待办。
- 可考虑增强 `task.py list --status <status>`：即使父任务不匹配，也应能显示匹配状态的子任务，避免漏掉 completed 父任务下的 planning backlog。
- `05-06-demo-level-implementation-audit` 与 `05-06-tavern-character-relationship-graph-brainstorm` 自身为 completed，但 children 仍 planning；这是“父任务完成产出 backlog”的合理状态，不建议改成未完成。

## 8. 开发前风险提醒

- 当前工作区有 103 个未提交变更；开始新实现前应先收口/提交/另开 worktree，避免把多个任务混在一起。
- P1 fullstack/API/schema 任务开始前需按 `AGENTS.md` 读取对应权威文档与 `.trellis/spec/` 指南，并预先确定验证命令。
