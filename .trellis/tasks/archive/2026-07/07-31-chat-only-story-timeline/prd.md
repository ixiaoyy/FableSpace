# 故事页纯交互时间线

## Goal

让 `/characters/:characterSlug/story` 成为纯聊天 / 交互页面：不再显示截图红框中的
开场背景叙事，只保留紧凑角色状态、角色与玩家消息、审核互动选项、必要结果反馈和
输入框。

背景叙事继续存在于服务端审核内容和 StoryRun 事件中，用于约束角色与剧情；本任务
只改变前端展示，不删除或改写任何故事数据。

## Evidence

- `StoryTimeline` 当前会展示除 `relationship_changed` 外的所有事件，因此新轮次的
  首个 `narration` 被渲染成居中的大段斜体介绍：
  `apps/web/app/routes/character-story.tsx`。
- 同一时间线随后已经有 Character 的真实开场消息，足以直接开始对话；背景介绍与
  chat-first 目标重复。
- 玩家截图明确圈出该首段叙事，并要求故事页只呈现聊天或交互，不介绍任何内容。

## Requirements

### R1 — 隐藏介绍性叙事

- 时间线不渲染没有紧邻审核 Choice 来源的 `narration` 事件。
- 初始场景介绍不得占据视觉空间，也不得进入 `aria-live` 的可见时间线。
- 不以新的标题、摘要、提示卡或缩短版介绍替代被移除内容。

### R2 — 保留必要交互反馈

- Character 开场消息、后续 Character 消息、玩家消息、玩家已选 Choice、待响应状态、
  快捷互动选项和输入框继续显示。
- 紧邻玩家审核 Choice 的 narration 继续作为本次互动的结果反馈显示，避免玩家操作后
  不知道发生了什么。
- 关系阶段、写入失败恢复、结局与重新开始继续使用现有真实状态。

### R3 — 范围与数据边界

- 不修改 API、StoryWorld 内容、StoryRun 事件、数据库 Schema、历史事实或 PlayerRole。
- 不连接数据库，不部署，不生成图片。
- 删除因介绍性 narration 不再可见而成为死代码的专用 CSS；不重做页面视觉风格。
- 保留用户未提交的 `AGENTS.md`、`UI稿/` 和暂停中的多故事规划改动。

## Acceptance Criteria

- [x] 新轮次首屏直接从 Character 开场消息进入聊天，不显示场景背景介绍。
- [x] 玩家选择审核选项后仍能看到自己的选择与紧随其后的结果反馈。
- [x] 自由输入、发送中状态、失败恢复、结局和重新开始行为不变。
- [x] 移动端不因隐藏介绍而留下空白占位或横向溢出，输入框和互动选项仍可达。
- [x] 前端 typecheck 与生产 build 通过。
- [x] React Doctor 和 Impeccable detector 不出现本次改动导致的回退。
- [x] 本任务 diff 只包含前端、任务文件和必要规范记录；用户文件未被暂存。

## Out of Scope

- 删除服务端 narration 事件或更改故事审核内容。
- 隐藏审核 Choice 的结果反馈。
- 重做聊天头、角色气泡、互动选项、输入框或历史资料面板。
- 修改 Character 详情页或多故事选择流程。
