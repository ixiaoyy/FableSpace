# 镜像岛 RPGJS

安装并启动本地依赖：

```powershell
npm install
Copy-Item .env.example .env
npm run dev:services:up
npm run prisma:migrate:deploy
npm run identity:configure
npm run dev:mmorpg
```

- Keycloak：`http://127.0.0.1:8081`
- 游戏 PostgreSQL：`127.0.0.1:5433/mirror_island_game`
- Vite：以命令输出为准，默认 `http://127.0.0.1:5173/`

正式游戏要求 Keycloak 会话，并使用 Keycloak `sub` 作为稳定玩家 ID。游戏服务端通过 Prisma SaveStorageStrategy 保存 slot 0；论坛登录经 `/forum-sso/` OIDC 桥进入 Keycloak。

检查：

```powershell
npm run prisma:validate
npm run typecheck
npm test
npm run build
npm run build:server
```

生产路由、备份、迁移和旧系统清退见 [PRODUCTION.md](PRODUCTION.md)；开源版本/许可证/风险见 [OPEN_SOURCE_ADOPTION.md](OPEN_SOURCE_ADOPTION.md)。
