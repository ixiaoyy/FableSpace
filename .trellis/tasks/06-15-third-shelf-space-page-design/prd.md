# Third Shelf Observatory Tavern Page Design

## Goal

参考首页的暗色镜像空间设计语言，为 `/tavern/pw_third_shelf_observatory` 做一个更强的空间入口视觉：第一屏要让访客看见空间封面、坐标锚点、NPC 阵容、第一分钟玩法和进入聊天的明确路径。

## Scope

- 只改前端 Tavern 入口呈现，不改后端 API、Schema 或 Tavern 数据。
- 保留 `TavernChatWorkbench` 的现有门口仪式、聊天输入、公开面板与移动端主链路。
- 使用仓库内现有视觉资产和 Tavern 数据，不新增平台自动生成空间内容。

## Validation

- 前端构建通过。
- Tavern 门口仪式脚本通过。
- 使用 Playwright 对目标 route 做桌面与窄屏截图，检查无横向溢出、入口工作台仍可见。

## Remaining Risk

- 本次是视觉重排，具体文案仍来自现有 Tavern 数据和 `buildTavernFirstMinuteGuide`。
