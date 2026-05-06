# PRD: Hide visitor-facing memory/system panels

## Problem

访客侧酒馆详情/聊天页展示了「对话记忆」「当前访客的身份与回访状态」等内部状态。用户明确反馈这类系统设置和后台记忆不需要给访客看，会造成被监视感。

## Goal

- 访客聊天侧边栏只保留可帮助继续对话的公开线索和必要公开功能。
- 不在访客侧展示「对话记忆」、回访次数、最近访问时间、关系阶段等内部记忆/状态面板。
- 后端对话历史、记忆、访客状态仍保留，用于 NPC 连续性和店主管理。
- 店主管理入口仍然只对 owner 可见；本任务不删除 owner 后台能力。

## Non-goals

- 不删除后端记忆、状态卡或聊天历史数据。
- 不改 API schema。
- 不新增隐私/通知/社交功能。
- 不重构整个酒馆页视觉。

## Acceptance Criteria

1. `frontend/app/features/tavern-chat-workbench/index.tsx` 不再渲染访客侧「对话记忆」折叠面板。
2. 访客可见源码/测试中不再包含「当前访客的身份与回访状态」这类直接暴露后台记忆状态的文案。
3. `VisitorMemoryPanel` / `relationshipSummary` 等仅服务这个访客侧面板的 UI 代码被移除或不再引用。
4. `frontend/scripts/tavern-chat-workbench-test.mjs` 增加回归断言，防止重新展示这些访客侧记忆面板。
5. 运行 frontend typecheck/build/test，并做桌面+窄屏 Playwright 自验收截图。
