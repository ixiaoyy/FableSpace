# 镜像岛

镜像岛是一个基于 RPGJS v5 的 Web 共享像素农场世界。玩家通过论坛账号或独立 Keycloak 账号登录，在同一地图房间中相互可见；玩家存档和共享世界状态由 PostgreSQL + Prisma 持久化。

旧 React/Phaser/FastAPI 故事和本地农场原型已退役，不再是兼容面。公开根入口 `/` 只服务镜像岛。

## 当前底座

- RPGJS `5.0.0-beta.32`：地图房间、玩家同步、NPC/Event、Items/Inventory 和 SaveStorageStrategy。
- Keycloak `26.7.1`：独立中文用户名密码、Remember Me、论坛 OIDC 身份代理。
- `oidc-provider` `9.11.1`：将 ParallelLines 现有一次性票据适配为标准 OIDC。
- Prisma `7.9.1` + PostgreSQL 17：玩家资料、存档、背包、动态格、区块、住宅和全服结算。
- Nginx：`/`、`/identity/`、`/forum-sso/`、`/parties/` 和 `/game-media/v1/` 同域路由。

## 本地开发

```powershell
npm --prefix .\apps\mirror-island install
Copy-Item .\apps\mirror-island\.env.example .\apps\mirror-island\.env
npm --prefix .\apps\mirror-island run prisma:validate
npm --prefix .\apps\mirror-island run dev:services:up
npm --prefix .\apps\mirror-island run prisma:migrate:deploy
npm --prefix .\apps\mirror-island run identity:configure
npm --prefix .\apps\mirror-island run dev:mmorpg
```

本地游戏服务需要 `MIRROR_ISLAND_DATABASE_URL`。不要将生产连接串、Keycloak 管理密码、论坛 SSO secret 或 OIDC cookie key 写入仓库。

## 最小检查

```powershell
npm --prefix .\apps\mirror-island run typecheck
npm --prefix .\apps\mirror-island test
npm --prefix .\apps\mirror-island run build
npm --prefix .\apps\mirror-island run build:server
```

数据库只有一个已评审 migration，位于 `apps/mirror-island/prisma/migrations/20260819000000_mirror_island_baseline/`。生产通过一次性 migration 镜像执行 `prisma migrate deploy`，不在游戏启动时建表。

## 资源

游戏图片使用 pixel-boy 官方 Ninja Adventure CC0 素材的已登记子集，位于不可变 `game/media/v1` CDN 命名空间。Git 不跟踪游戏图片二进制。详见 [图片与美术规范](docs/IMAGE_ASSETS_SPEC.md)。

## 文档

- [文档索引](docs/INDEX.md)
- [产品简报](docs/PRODUCT_BRIEF.md)
- [明确不做](docs/WHAT_NOT_TO_BUILD.md)
- [生产部署](docs/DEPLOYMENT.md)
- [RPGJS 运行时规范](.trellis/spec/frontend/mirror-island-rpgjs.md)
