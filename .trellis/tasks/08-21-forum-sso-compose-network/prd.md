# 修复论坛 SSO 跨 Compose 网络

## Goal

恢复生产环境的论坛账号登录，使 `mirror-game` 能通过服务端内部网络兑换并实时回查 ParallelLines 一次性票据，同时让未来部署在接流量前自动发现同类网络断路。

## Background

- `PARALLELLINES_API_BASE_URL` 当前固定为 `http://api:8000/api/v1`，依赖 Docker 服务发现。
- `/opt/fablespace` 与 `/opt/parallellines` 由两个独立 Compose 项目启动，默认网络彼此隔离。
- `mirror-game` 当前仅连接镜像岛默认网络，未连接 ParallelLines `api` 所在网络。
- 票据兑换网络异常在 `apps/mirror-island/src/sso/ticket.ts:66` 被归类为论坛授权服务不可用，随后在 `apps/mirror-island/src/sso/provider.ts:273` 被统一显示为“论坛登录票据无效或已过期”。
- 2026-08-21 的只读线上检查确认游戏 OIDC discovery、论坛入口、exchange/introspect 公共路由均可达；最近 SSO 部署成功，但部署门禁仅验证元数据，没有从 `mirror-game` 验证论坛 API 连通性。

## Requirements

- `mirror-game` 必须同时连接镜像岛默认网络与 ParallelLines `api` 可解析的外部网络；其他镜像岛服务不得因此暴露到论坛网络。
- GitHub Actions 部署必须从当前 ParallelLines `api` 容器解析唯一、带 `api` 网络别名的网络名，并将其传给镜像岛 Compose，避免依赖未经验证的固定项目名。
- 在替换生产前端前，部署必须从 `mirror-game` 容器访问由 `PARALLELLINES_API_BASE_URL` 推导出的论坛 `/healthz`；失败时中止部署。
- 票据、Cookie、SSO secret、响应正文和账号数据不得进入命令行输出或日志。
- 不连接或修改任何数据库，不新增 migration，不改变现有 OIDC、票据或身份数据合同。
- 保留工作区中种植、建房及其他与本任务无关的既有改动。
- 更新权威部署文档与 Trellis 规范，记录跨 Compose 网络和健康门禁约束。

## Acceptance Criteria

- [x] Compose 渲染结果显示 `mirror-game` 同时位于 `default` 与外部 ParallelLines 网络，且 frontend、Keycloak、两个 PostgreSQL 和 migration 服务不连接该外部网络。
- [x] 部署脚本在启动镜像岛服务前确认 ParallelLines `api` 容器存在，并唯一解析包含 `api` 别名的网络。
- [x] 部署健康检查从 `mirror-game` 请求论坛 `/healthz`，网络/DNS/HTTP 失败会使部署失败。
- [x] 部署合同测试覆盖共享网络声明、动态网络发现及跨容器健康检查。
- [ ] `npm --prefix ./apps/mirror-island test` 与组合 Compose 配置检查通过。
- [ ] 生产发布后，新签发论坛票据可完成首次登录；既有 Keycloak 论坛账号可再次登录。
- [x] Git diff 不包含本任务范围外的改动，且不包含 secret、票据、Cookie、数据库连接或图片二进制。

## Out of Scope

- 不调整论坛账户资格、`fablespace.access`、票据 TTL 或一次性消费规则。
- 不修改 Keycloak realm、OIDC client、数据库 Schema 或业务数据。
- 不通过公共 HTTPS 反向代理替代内部 API 网络。
