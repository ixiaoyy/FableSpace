# 镜像岛生产预览

当前生产部署只增加独立预览，不替换旧根入口：

- 游戏：`https://fable.pingxingxian.space/mirror-island/`
- Keycloak：`https://fable.pingxingxian.space/identity/`
- RPGJS WebSocket：`wss://fable.pingxingxian.space/parties/`

## 单机拓扑

`deploy/docker-compose.mirror-island.yml` 面向现有 2核/4GB 主机：Keycloak 限制 768MB、PostgreSQL 限制 512MB、RPGJS 限制 384MB。它们只在默认 Compose 网络内可见，由现有 frontend Nginx 代理，不开放新的宿主机端口。

身份数据库使用独立 `mirror_identity_db` volume。`deploy/server/configure_mirror_island.py` 在服务器生成 mode `0600` 的忽略文件 `apps/mirror-island/.env.production`，只报告是否生成密钥，不输出密钥内容。

## 发布与恢复

推送 `main` 后，Deploy workflow 会：

1. 在 Actions 构建 frontend 与 `mirror-island-game:local` 镜像。
2. 服务器生成或复用身份密钥。
3. 若 Keycloak PostgreSQL 已运行，先生成非空备份到 `/opt/fablespace/backups/mirror-island-keycloak/`。
4. 启动 PostgreSQL、Keycloak、RPGJS，应用用户资料合同，再替换 frontend。
5. 核对旧根入口、镜像岛入口、OIDC discovery 和 RPGJS health。

失败时保留旧根入口和最近备份。身份数据库恢复是单独授权操作；普通部署不会自动还原或删除 volume。

## 当前限制

- Forum SSO 尚未接入，只有 Keycloak 独立用户名密码。
- Keycloak 身份持久化；RPGJS 世界、背包和位置仍使用内存存档，等待 Phase 3 PostgreSQL/Prisma 实现。
- RPGJS v5 和其构建链安全例外仍阻止把预览直接宣布为正式主入口。
