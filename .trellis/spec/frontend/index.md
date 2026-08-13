# Frontend Development Guidelines

## Scope

这些规范覆盖 `apps/web/app/` 中的 React Router 7 SPA 与 Phaser 3 游戏运行时。当前公开入口只有 `/`；游戏不读取旧 Character/StoryWorld API、论坛身份或数据库状态。

仍留在本目录中的 Character 路由、聊天、StoryRun 与后台规范只服务旧代码的只读审计和后续精确清退，不是新游戏实现依据。

## Current guideline

| Guide | Use it for |
|---|---|
| [Pixel Game Runtime](./pixel-game-runtime.md) | Phaser 生命周期、输入、碰撞、场景、存档和游戏资源 |

`directory-structure.md`、`component-guidelines.md`、`hook-guidelines.md`、`type-safety.md`、`quality-guidelines.md`、`ui-copy-guidelines.md` 与其他 Character/StoryRun 指南只用于定位、审计和清退旧源码，不是新游戏的实现合同。可复用的通用规则已经收敛到根 `AGENTS.md` 和本运行时指南；不得从旧指南恢复 Character 路由、API 或故事 UI。

## Pre-Development Checklist

1. 读取根 `AGENTS.md`、当前任务 PRD/design/implement 和 [Pixel Game Runtime](./pixel-game-runtime.md)。
2. React 生命周期、组件、样式和可访问性改动均以根 `AGENTS.md` 与 [Pixel Game Runtime](./pixel-game-runtime.md) 为准。
3. 新 helper 或配置先搜索现有实现；常量只保留一个来源。
4. 确认本次不接入 `apps/api/`、数据库、LLM、认证或论坛接口。
5. 确认只使用官方已核验素材 URL，图片二进制不进入 Git。
6. 保留根路由 `/`；若未来增加顶级 SPA 路由，同时更新 `app/routes.ts` 和 `apps/web/nginx.conf`。

## Verification Baseline

- 前端类型：`npm --prefix .\apps\web run typecheck`
- 前端生产构建：`npm --prefix .\apps\web run build`
- React 改动：运行 changed-scope React Doctor，不接受本轮引入的回退。
- 游戏交互：桌面浏览器验收移动、碰撞、遮挡、进出门、睡眠单次结算、刷新恢复和画布缩放。
- 图片引用：核对 URL/key/manifest/hash/同源代理回读；只有跨域直连时才要求 CORS。确认本轮没有新增或替换 Git 图片二进制。
