# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

希望无需注册就能立即进入一个安静、可持续经营的单人生活世界的 Web 玩家；当前试玩用户在同一浏览器 profile 中创建或继续唯一的本地农场。

## Product Purpose

镜像岛是一款单人 2D 像素生活 RPG。当前目标是让玩家从安全家园出发，完成可重复的种田、采集、制作、城镇交往和每日生活循环，并可靠地在本地恢复进度。

## Positioning

它把东方世界气质与可直接试玩的本地 GameSession 结合：没有账号或多人房间的进入摩擦，玩家访问根页面即可开始一个由 IndexedDB 保存的个人世界。

## Operating Context

公开 `/` 是唯一入口。玩家选择新游戏或继续游戏，经角色创建后进入 Godot 世界；玩法状态由 GDScript GameSession 管理。Web 通过 IndexedDB 保存，Windows 使用原子文件；桌面正式版优先，同工程 Web 试玩仍须支持手机触控与高倍缩放。

## Capabilities and Constraints

- 当前可玩范围包含 12 个农场、小镇、住宅与商店区域，支持采集、背包、制作、种田、仓储出货、四项生活技能、品质肥料、围栏、湖河钓鱼、春季日历、时间、NPC 日程、对话与基础好感。
- 试玩版无账号、无 Keycloak/OIDC 客户端请求、无实时后端、无多人和云存档。
- 同一浏览器 profile 只有一个固定本地存档；清除站点数据会丢失进度，且不跨设备同步。
- Godot 场景和界面只发送命令并渲染 snapshot；`domain`、`persistence`、`presentation` 与 `ui` 边界不得为视觉工作改变。
- 游戏图片通过不可变 `game/media/v1` 对象和 manifest 交付，Git 不跟踪正式图片二进制。

## Brand Commitments

- 产品名称固定为“镜像岛 / Mirror Island”。
- 用户已指定东方山水田园、归园生活与明亮自然的首页方向；不得复制其他游戏的品牌、角色、地图、文本或 UI。
- 语气克制、温暖、清楚，强调个人世界、本地保存和慢生活，不虚构联网、社交或云能力。

## Evidence on Hand

- 产品与范围：`docs/PRODUCT_BRIEF.md`、`docs/WHAT_NOT_TO_BUILD.md`。
- 运行时与持久化：`docs/architecture/GODOT_RUNTIME.md`；历史 Phaser 规则见 `docs/architecture/PHASER_RUNTIME_ARCHIVE.md`。
- 媒体规范：`docs/IMAGE_ASSETS_SPEC.md` 与 `deploy/cdn/game-media-manifest.json`。
- 用户提供一张东方田园画卷式首页参考图，只作为构图与气质参考，不作为生产素材直接复制。

## Product Principles

- 先让玩家无摩擦地进入并继续自己的世界。
- 产品事实与存档风险必须清楚，不用氛围掩盖关键状态。
- 一张精美、统一的场景优先于大量粗糙内容。
- 玩法规则保持单一 owner，视觉层只负责表达。
- 正式素材来源、授权和发布链路必须可追踪。

## Accessibility & Inclusion

公共入口必须支持键盘、手机、200% zoom、清晰错误状态和减少动态效果；关键文字与控件不能只存在于图片中。
