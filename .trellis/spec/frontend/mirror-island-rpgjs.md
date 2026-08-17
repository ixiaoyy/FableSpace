# Mirror Island RPGJS

## Ownership

- 新共享游戏位于独立 `apps/mirror-island/`，以 RPGJS v5 为运行时，不在旧 React/Phaser 目录继续抽象。
- Phase 1 只验证 RPGJS 原生 map room、两玩家渲染/移动、NPC/Event、Items/Inventory、dynamic tile 和 SaveStorageStrategy 接口。
- 旧 `apps/web/` 与生产 `/` 在纵向切片验收前保持不变；不要在 Phase 1 清退或兼容旧游戏模块。

## Open-source contract

- 固定 `@rpgjs/server` 与 `@rpgjs/client` `5.0.0-beta.32`，并记录上游提交 `7c7db1b51e6f9deea8c33926f729c013a39340a6`、MIT 许可证和 beta 风险。
- 从官方 `rpgjs/starter#v5` 建立应用；只采用官方包、模板和文档，不复制来源不明示例。
- Phase 1 不引入 Keycloak、Prisma、PostgreSQL 或论坛 SSO；auth/save 只使用可替换测试适配，避免把 spike 变成生产实现。
- 模板资产只用于本地验证；未核对来源、许可证、尺寸、哈希和发布路径前不得作为正式 Git 图片或生产媒体。
- `@rpgjs/vite@5.0.0-beta.32` 当前间接依赖存在无修复版本的高危 `image-size@2.0.2`；只允许它在隔离尖峰构建期读取受信任本地模板图片，风险解除或重新批准前不得生产切流。

## Verification

- 运行 RPGJS starter 自带 type/test/build 命令，以实际 `package.json` 为准。
- MMORPG 模式用两个独立浏览器会话验证同地图玩家可见和移动同步。
- 验证 NPC 对话、物品进入背包、动态 tile 同步和存档策略调用；不以代码存在代替运行证据。
- 浏览器自动化不能可靠向 Canvas 保持按键时，必须同时保留双客户端截图、同 room 不同连接 ID 日志和 NPC 组合合同测试，并把实际键盘交互列为人工待验，不得宣称已自动验收。
- 检查生产 `/`、旧前端构建和部署配置没有被 Phase 1 改动。
