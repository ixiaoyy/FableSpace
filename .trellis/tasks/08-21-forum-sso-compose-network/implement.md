# 修复论坛 SSO 跨 Compose 网络：实施计划

## Implementation

- [x] 更新 `deploy/docker-compose.mirror-island.yml`：声明外部 ParallelLines 网络，仅将 `mirror-game` 同时接入 `default` 与该网络。
- [x] 更新 `.github/workflows/deploy.yml`：无论论坛 env 是否变化，都定位 ParallelLines Compose、解析 `api` 容器唯一别名网络并导出网络名。
- [x] 在服务就绪门禁中，从 `mirror-game` 访问论坛 API origin 的 `/healthz`，不携带或输出敏感数据。
- [x] 更新 `apps/mirror-island/test/deployment-contract.test.mjs`，覆盖网络隔离、动态发现和健康探针合同。
- [x] 更新 `docs/DEPLOYMENT.md` 与 `.trellis/spec/frontend/mirror-island-rpgjs.md`，记录跨 Compose 网络不变量。

## Validation

- [ ] `npm --prefix ./apps/mirror-island test`（本任务相关 deployment/SSO 测试通过；全量测试被既有 `spike-contract.test.mjs` 导入已移除 `GuideNpc` 阻塞）
- [x] `docker compose -f docker-compose.yml -f deploy/docker-compose.mirror-island.yml config`，检查 `mirror-game` 的两个网络及其他服务隔离。
- [x] 检查本任务目标文件完整 diff，确认无 secret、票据、Cookie、数据库连接或范围外变更。
- [ ] 发布后人工验证论坛首次 SSO 与再访登录；失败时检查非敏感容器网络/健康状态，不查询数据库。

补充验证：`prisma:validate`、`typecheck`、`build` 与 `build:server` 已通过。

## Risk and Rollback Points

- 外部网络解析必须在任何镜像岛 `up` 命令前完成，否则 Compose 会使用错误默认值。
- 显式设置 `mirror-game.networks` 时必须保留 `default`，否则会切断 Keycloak 与游戏数据库。
- Workflow shell 重构不得改变现有 ParallelLines 重启条件或生产服务替换顺序。
- 回滚仅精确撤销本任务文件中的网络与门禁改动，不整文件覆盖其他人的修改。
