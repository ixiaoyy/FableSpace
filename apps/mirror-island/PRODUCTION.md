# 镜像岛生产运行边界

游戏直接服务于 `https://fable.pingxingxian.space/`；`/mirror-island/` 只 308 到 `/`。身份位于 `/identity/`，论坛 OIDC 桥位于 `/forum-sso/`，WebSocket 位于 `/parties/`。

Compose 运行 frontend、Keycloak、mirror-game、两个 PostgreSQL 和一次性 migration 服务。Keycloak 使用 `mirror_identity_db`，游戏使用 `mirror_game_db`；两者不共用凭据。

Deploy workflow 在替换前：

1. 核验 `game/media/v1` CDN。
2. 构建 frontend/game/migration 三个镜像，检查运行时不含 RPGJS 构建链。
3. 为两个已有数据库分别产生非空 gzip `pg_dump`。
4. 运行唯一 Prisma migration，再启动 Keycloak 和 mirror-game。
5. 幂等应用 realm、像素主题、论坛 provider、browser client 和 user profile。
6. 替换 frontend 并验证根入口、OIDC discovery、Keycloak discovery 和 WebSocket server health。
7. 健康后执行已批准的旧 FableSpace 容器、MySQL database、volume、备份/私密文件和 R2 `fablespace/` prefix 永久清退。

`configure_mirror_island.py` 只输出非密钥状态；`retire_legacy_fablespace.py` 默认 dry-run，必须显式 `--apply`。详细操作合同见根 [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)。
