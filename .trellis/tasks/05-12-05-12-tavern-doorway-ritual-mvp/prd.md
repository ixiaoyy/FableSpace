# Tavern Doorway Ritual MVP

## 背景

多条真人/游客反馈都指向同一处首屏断裂：用户进入 `/tavern/:id` 后第一眼像一个赛博朋克聊天页面，而不是一间“可以沟通的酒馆”。现有工作台已经有 NPC 列表、聊天记录、游客第一分钟卡片，但缺少“推门进店”的明确仪式感：我在哪里、谁在接待我、我第一句话可以说什么。

## 目标

在不改后端 Schema/API、不引入新依赖、不弱化真实坐标锚点的前提下，把酒馆详情首屏补上一段可操作的进门仪式：真实坐标门牌 + 正在接待的 NPC + NPC 第一句招呼 + 一键填入打招呼。

## 非目标

- 不做平台自动生成空间内容；只展示店主已有描述、NPC first message 或安全 fallback。
- 不做访客间社交、排行榜、传统地图导航、战斗/等级/装备、平台 Token 付费。
- 不改 `Tavern` / `TavernCharacter` 数据结构与 API payload。
- 不把店主管理能力塞回游客页主链路。

## 方案拆解

1. 在 `frontend/app/features/tavern-chat-workbench/index.tsx` 增加 `TavernDoorwayRitual` 首屏区块。
2. 复用 `buildTavernFirstMinuteGuide(tavern)` 输出真实坐标/地址锚点文案，避免重复实现地图门牌 copy。
3. 从现有 `characters` 中选择接待 NPC：优先当前选中 NPC，其次第一个 NPC；使用 `first_mes` 作为门口招呼，缺失时退回 `entranceReactionContent`。
4. 增加主 CTA：`和 NPC 打招呼` / `推门进店`，点击后切到对应 NPC 私聊、把开场句填入 composer、聚焦输入框并滚到输入区；不自动发送，避免替用户发言。
5. 保持移动端单主线：`data-chat-workbench="sillytavern-style"`、`aria-label="NPC 角色列表"`、`aria-label="聊天记录"`、`data-chat-composer="fast-entry"` 不变；新增区块要紧凑，不能把聊天主线替换成营销页。
6. 增加脚本测试，锁定门口仪式 marker、文案、CTA 行为源码证据，并纳入 `npm test`。

## 验收标准

- `/tavern/:id` 工作台源码包含 `data-tavern-doorway-ritual`、`data-doorway-host-greeting`、`data-doorway-start-chat`。
- 首屏文案能看到“推门进店”、“今晚在吧台/正在接待”以及真实锚点 `firstMinute.anchorLine`。
- 点击 CTA 不自动发送消息，只执行：选择 NPC 私聊、填入 composer、聚焦输入框、滚动到输入区。
- 既有游客主线 marker 保留，店主管理 UI 不回流到游客页。
- 通过：`node frontend/scripts/tavern-doorway-ritual-test.mjs`、`npm --prefix .\frontend test`、`npm --prefix .\frontend run typecheck`、`npm --prefix .\frontend run build`。
- 对可见 UI 运行 Playwright 桌面 + 窄屏自验收，并把截图/报告路径写回本 PRD。

## 验证记录

2026-05-12 已完成：

- `node frontend/scripts/tavern-doorway-ritual-test.mjs`：PASS，确认门口仪式 marker、真实坐标门牌 copy、接待 NPC 状态、CTA 不自动发送且只填 composer。
- `npm --prefix .\frontend run typecheck`：PASS。
- `npm --prefix .\frontend test`：PASS，新增 `tavern-doorway-ritual-test.mjs` 已纳入全量前端脚本链。
- `npm --prefix .\frontend run build`：PASS。
- `git diff --check`：PASS。
- Playwright 自验收：PASS。开发服务器实际占用 `http://127.0.0.1:5175`（5173/5174 已被占用自动顺延），脚本 `node frontend/scripts/playwright-tavern-doorway-check.mjs` 完成桌面 + 窄屏验证。

## Playwright 证据

- Report：`artifacts/playwright/tavern-doorway-ritual/report.md`
- Desktop screenshot：`artifacts/playwright/tavern-doorway-ritual/desktop-1440.png`
- Mobile screenshot：`artifacts/playwright/tavern-doorway-ritual/mobile-390.png`
