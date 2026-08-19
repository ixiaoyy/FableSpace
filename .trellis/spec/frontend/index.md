# 镜像岛开发规范

## Scope

当前唯一应用是 `apps/mirror-island/` RPGJS 共享世界。旧 React/Phaser/FastAPI/StoryWorld 规范已删除，不是兼容面。

## Guideline

- [Mirror Island RPGJS](mirror-island-rpgjs.md) — RPGJS、Keycloak、论坛 OIDC、Prisma/PostgreSQL、路由、主题和部署合同。

## Pre-Development Checklist

1. 读取根 `AGENTS.md`、当前任务 PRD/design/implement 和 `mirror-island-rpgjs.md`。
2. 新 helper/常量/配置前搜索现有所有者，不复制 payload 解码、路由或密钥合同。
3. 区分 browser、Keycloak、OIDC bridge、RPGJS server、Prisma 和 deployment env 的信任边界。
4. 不让 Prisma/pg/SSO secret 进入 browser bundle，不让 RPGJS 构建链进入 Node runtime 镜像。
5. 只引用 `game-media-manifest.json` 已登记的 HTTPS/同源代理资源，Git 不新增图片二进制。
6. 数据库改动先核对单 migration、部署顺序、备份和 forward-fix 边界。

## Verification Baseline

```powershell
npm --prefix .\apps\mirror-island run prisma:validate
npm --prefix .\apps\mirror-island run typecheck
npm --prefix .\apps\mirror-island test
npm --prefix .\apps\mirror-island run build
npm --prefix .\apps\mirror-island run build:server
docker compose -f docker-compose.yml -f deploy/docker-compose.mirror-island.yml config
```

身份/主题改动还要用真实 Keycloak 验收中文用户名、论坛 provider、桌面/手机/键盘/错误状态。持久化改动还要在隔离 PostgreSQL 应用 migration 并跨 Prisma client/进程重连恢复。
