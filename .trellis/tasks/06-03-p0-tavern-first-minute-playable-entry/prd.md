# P0 Tavern First-minute Playable Entry

## Goal

把 `/tavern/:id` 的游客首屏从“直接进聊天工具台”改成“可玩的第一分钟入口”：游客先看到这个空间怎么玩、由哪个 NPC 主持、下一步能点什么，再进入聊天。

## Requirements

- 不改后端 Schema、API、数据库或依赖。
- 复用 `buildTavernFirstMinuteGuide(tavern)`，不要把 PRD 内部话术直接展示给游客。
- 非店主游客先看到 doorway ritual：地点锚点、空间 hook、主持 NPC、一个主 CTA。
- CTA 可以切换/预填/聚焦聊天输入，但不能自动替游客发消息。
- 增加 3 个可点的快捷行动，用来把“怎么玩”落到可执行操作；点击只填入输入框或选择频道，不自动发送。
- 密码空间仍先显示密码门禁；店主视角不强制 doorway。
- 移动端第一屏可用，关键 CTA 不被底部导航挡住。

## Acceptance

- `/tavern/:id` 首屏有 `data-first-minute-play-entry` 标记。
- 游客能看到：空间类型/地点锚点、怎么玩、主持 NPC、3 个快捷行动、开始游玩 CTA。
- 点击快捷行动不会调用 chat API，只会填入输入框/准备发言。
- 现有 chat workbench 标记 `data-chat-workbench="sillytavern-style"` 保留。
- `node frontend/scripts/tavern-doorway-ritual-test.mjs`、`node frontend/scripts/tavern-chat-workbench-test.mjs`、`npm --prefix .\frontend run build` 通过，或记录失败原因。

## Files

- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/lib/tavern-first-minute.ts`
- `frontend/scripts/tavern-doorway-ritual-test.mjs`
- `frontend/scripts/tavern-chat-workbench-test.mjs` if needed
