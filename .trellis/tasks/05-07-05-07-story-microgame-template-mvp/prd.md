# 子任务：剧情微玩法模板（A1/A2）MVP

## Goal

在现有 `GameplayDefinition` / `GameplaySession` 机制上补齐“可嵌入空间的剧情微玩法”，先做轻量模板和复玩闭环，支撑“聊天更有趣”与“回访可追踪”。

## Parent

`D:\work\ai-\.trellis\tasks\05-07-05-07-embedded-story-minigames-game-workshop-brainstorm\`

## 需求范围

- 先设计 2–3 个可复用的剧情模板（以 JSON 配置化为主）：
  - 线索推进型（多分支）
  - 任务澄清型（收集关键信息）
  - 决策/后果型（可复盘）
- 每个模板字段：
  - 标题、简介、步骤、分支、提示、完成条件、回访摘要文案模板。
- 将模板与空间入口打通（依赖 D1 能力卡片中的“互动玩法”入口）：
  - 一键开启模板
  - 完成后返回聊天
  - 完成摘要可用于店主回访面板（复用现有能力）
- 提供最小化可编辑路径：
  - Owner 可先选用“平台内置模板”
  - 后续配置开关再放到 owner 工具页（不在本轮实现）

## 接受标准

- [ ] 可从空间内以“互动玩法”入口进入 1 个以上可玩剧情微玩法。
- [ ] 微玩法支持至少 1 个可变分支路径。
- [ ] 完成后有“已完成 + 复盘摘要”返回，可供店主查看。
- [ ] 不新增数据库 schema；前端基于现有 GameplayDefinition 结构扩展少量配置即可。

## 验收补充

*本轮仅拆任务，不执行实现。*

## 依赖

- `frontend/app/features/tavern-chat-workbench/*`
- `frontend/app/components/tavern/GameplaySessionPanel*`（或对应现有玩法渲染链路）

## 非目标

- 不做复杂叙事编辑器/可视化编排。
- 不接入外部脚本型小游戏运行时。

## 2026-05-12 Closure Note

This task is closed as `mvp_verified_by_existing_templates`. Closed after verifying current gameplay and mini-game template catalogs support playable story/microgame entries with branching/fallback coverage; focused mini-games/gameplay tests and full frontend test/build passed in this session.

Deferred / not done:
- No new visual editor or external script-game runtime was added; owner custom editor improvements remain future work.
