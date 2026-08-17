# 开源采用记录

## 尖峰基线

- RPGJS starter 固定提交：`3b2ca14b9fed26aa9975bb3c43127cde9f25a515`。
- RPGJS 核心包固定为 `5.0.0-beta.32`；许可证为 MIT。
- `cross-env` 固定为 `10.1.0`；许可证为 MIT，仅用于跨平台启动 MMORPG 开发模式。
- 通过 `overrides` 固定已披露且已有补丁的间接依赖版本，避免自动漂移。

## 安全例外

`@rpgjs/vite@5.0.0-beta.32` 间接依赖 `image-size@2.0.2`。截至本尖峰建立时，对应高危公告没有上游修复版本，且其仓库已归档。本应用只允许该包在构建期读取仓库内受信任的本地模板图片，不接收用户上传或远程不可信图片；它不应进入浏览器运行时包。

这只是阶段性、可撤销的尖峰隔离，不是风险豁免。进入生产切流前必须满足其一：RPGJS 上游移除/替换该依赖、项目安全替换构建插件，或重新评估并批准替代框架。

## 图片素材

starter 自带的 Pipoya 示例图片不进入 Git，也不被运行时引用。尖峰只读取 `deploy/cdn/game-media-manifest.json` 已登记的 Ninja Adventure CC0 素材：男女角色和 `floor.png`。`npm run prepare:media` 从不可变 CDN 下载三项并严格校验字节数与 SHA-256，再写入 Git 忽略目录供 RPGJS 使用。
