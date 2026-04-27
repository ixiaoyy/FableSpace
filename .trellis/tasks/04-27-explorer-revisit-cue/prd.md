# 探索者回访提示

## 背景

FableMap 主链路要求「进入酒馆 → 对话互动 → 写回记忆 → 回访反馈」。后端 `/api/v1/taverns/{id}/enter` 和 `/chat` 已返回 `visitor_state`，但当前原生酒馆聊天 UI 只显示首句/降级提示，没有把访客与酒馆的关系状态展示给探索者。

## 目标

在不新增后端字段、不改变 Schema、不生成酒馆内容的前提下，让探索者进入酒馆后能看到一个轻量「回访提示」：

- 首访时明确已建立回访档案，可继续和 NPC 对话。
- 回访时显示欢迎回来、到访次数、关系阶段、关系强度、最近到访时间等结构化反馈。
- 发送消息后若后端返回更新后的 `visitor_state`，前端提示同步刷新。

## 非目标

- 不做跨酒馆访客社交、好友、私信、动态墙。
- 不做平台自动生成酒馆/NPC/剧情内容。
- 不新增后端持久化字段或修改 `docs/WORLD_SCHEMA.md`。
- 不改店主 Token 计费或敏感 LLM 配置展示。

## 实现范围

- `frontend/app/lib/revisit-summary.js`：纯函数，把 `VisitorState` payload 归一化为显示模型。
- `frontend/scripts/revisit-summary-test.mjs`：脚本回归测试，覆盖空状态、首访、回访、聊天后状态刷新。
- `frontend/app/lib/taverns.ts`：补齐 `VisitorStatePayload`、enter/chat response 类型。
- `frontend/app/features/tavern-chat/index.tsx`：在进入/对话后显示并刷新回访提示卡。
- `frontend/package.json`：把新脚本接入 `npm test`。

## 验收标准

1. 未进入酒馆前，聊天区显示「进入酒馆后建立回访状态」的低噪提示。
2. 首访后展示首访标题、关系阶段和下一步提示。
3. `visit_count >= 2` 或关系阶段超过 `stranger` 时展示「欢迎回来」类提示，以及次数/强度/最近到访。
4. 聊天响应返回新的 `visitor_state` 后，提示卡能刷新为最新关系状态。
5. 前端测试、typecheck、build 通过。
