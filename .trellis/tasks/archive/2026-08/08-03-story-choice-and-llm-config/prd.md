# 修复故事选择语义与公共模型配置

## Goal

恢复 StoryWorld 故事页已经验收过的交互语义与模型可用性：审核选择作为玩家的行动意图展示，只有自由输入才作为玩家原话；StoryWorld 对话复用部署中已经存在的公共模型路由，不再因未迁移的 `FABLESPACE_LLM_*` 别名误报“未配置”。

## Background

- `StoryWorldApplicationService.choose()` 记录 `type="choice"`、`source_kind="reviewed_choice"` 的玩家选择事件，事件正文是审核选项标签，不是逐字对白。
- 当前 `StoryTimeline` 把 `event.type === "choice"` 与 `event.role === "player"` 合并为同一种玩家对话气泡并统一标为“你”；同一逻辑也把乐观选择显示成“你”。
- 归档验收 `07-28-annie-character-presence/verification.md` 已明确要求时间线按“你的选择 → 安妮动作 / 短句”显示；当前行为是回归。
- 变更 `693c7d55` 把 StoryWorld 模型配置从既有公共福利路由切换为七项 `FABLESPACE_LLM_*`，并明确禁止读取原 `OPENCODE_API_KEY` 路径；提交只更新了受版本控制的示例和文档，未迁移被 Git 忽略的真实 `.env`。
- 当前 `apps/api/.env` 已存在 `FABLEMAP_DEFAULT_FREE_LLM_BACKEND`、`FABLEMAP_DEFAULT_FREE_LLM_MODEL`、`FABLEMAP_DEFAULT_FREE_LLM_BASE_URL`、`FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 及其指向的服务端 Key，但不存在七项 `FABLESPACE_LLM_*`。
- 用户明确要求恢复并复用已有公共模型配置，不再要求手工查找或复制另一套密钥。

## Requirements

1. 审核选择事件和乐观选择必须标为“你的选择”，采用独立的行动记录视觉，不得使用玩家对白气泡。
2. 玩家自由输入继续标为“你”并使用玩家对白气泡；Character 对白、审核后的 Character 动作 / 短句和系统叙述保持现有投影边界。
3. 选择后的审核 narration 必须继续出现在时间线中，不得因修正选择样式而被过滤。
4. 完整显式的 `FABLESPACE_LLM_*` 配置仍是最高优先级；只要部署开始提供其中任一项，就必须按该组完整严格校验，不能用旧值掩盖部分配置或非法值。
5. 当七项 `FABLESPACE_LLM_*` 全部未提供时，StoryWorld 必须复用现有部署级公共模型路由：backend、model、base URL 和 API Key 环境变量指针来自 `FABLEMAP_DEFAULT_FREE_LLM_*`，API Key 只在服务端内存解析，生成参数沿用原工作配置 `0.8 / 1024 / 0.9`。
6. 公共模型路由复用不得读取 owner、StoryWorld、数据库或仓库 JSON，不得把 Key、Key 值、玩家消息或 Prompt 写入日志和响应。
7. 配置诊断必须区分显式 FableSpace 配置与既有公共模型路由，并只记录安全的变量名。
8. 前端错误状态不得承诺单纯刷新可以修复服务端配置；保留只读恢复动作，但删除误导性的“重新载入后继续”。
9. 同步 README、`.env.example`、`docs/DEPLOYMENT.md`、`docs/WORLD_SCHEMA.md` 与相关 Trellis 规范，明确优先级、复用条件和安全边界。
10. 不连接数据库，不创建迁移，不修改 StoryWorld 内容、事件 Schema 或 API 请求 / 响应形状。

## Acceptance Criteria

- [x] 已持久化和乐观状态中的 `choice` 都显示“你的选择”，无玩家对白气泡；自由输入仍显示“你”的对白气泡。
- [x] 选择后的审核 Character 动作 / 短句仍按原顺序可见，移动端不产生横向溢出。
- [x] 当前工作区已有公共模型环境可在不新增、打印或复制 Key 的情况下构造有效 `LLMConfig`。
- [x] 完整 `FABLESPACE_LLM_*` 覆盖公共路由；部分或非法显式配置被拒绝且不静默回退。
- [x] 公共路由缺字段、Key 指针非法或目标 Key 缺失时返回安全的 `dialogue_unavailable`，日志不含敏感值。
- [x] 故障界面不再显示“重新载入后继续”的错误承诺。
- [x] 权威文档与运行时配置合同一致。
- [x] `py -3 -m compileall -q apps/api/src`、无数据库定向配置验证、`npm --prefix .\apps\web run typecheck`、`npm --prefix .\apps\web run build` 通过。
- [x] changed-scope React Doctor、Impeccable detector 和最终 Trellis 检查无新增阻断问题。

## Out of Scope

- 不恢复旧 Space、owner 私有模型配置、Token 计费或仓库 JSON 运行时配置。
- 不修改审核选项正文、安妮剧情、历史事实、关系效果、节点或结局。
- 不自动重放失败的消息或选择写请求。
- 不修改真实部署环境、远端服务器或数据库数据。
