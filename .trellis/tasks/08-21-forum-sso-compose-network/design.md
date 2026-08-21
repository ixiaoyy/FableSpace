# 修复论坛 SSO 跨 Compose 网络：技术设计

## Architecture

`mirror-game` 继续使用镜像岛默认网络访问 Keycloak 与游戏 PostgreSQL，并额外加入 ParallelLines `api` 当前所在的一个外部 Docker 网络。Compose 中使用 `PARALLELLINES_DOCKER_NETWORK` 绑定实际网络名；本地配置渲染使用 `parallellines_default` 作为非生产默认值。

生产部署从 `/opt/parallellines` 当前运行的 `api` 容器读取 `NetworkSettings.Networks`，只接受网络别名中包含精确 `api` 的唯一网络。解析结果仅是非敏感 Docker 网络名，通过 shell 环境变量传给镜像岛 Compose，不写入镜像或浏览器。

## Data Flow

1. ParallelLines Compose 启动 `api` 并为其注册 `api` 网络别名。
2. 部署脚本解析该别名所属网络并导出 `PARALLELLINES_DOCKER_NETWORK`。
3. 镜像岛 Compose 将 `mirror-game` 接入 `default` 和解析出的外部网络。
4. `mirror-game` 继续调用 `PARALLELLINES_API_BASE_URL=http://api:8000/api/v1`。
5. 启动门禁从该环境变量仅提取 origin，访问 `/healthz` 并要求 HTTP 2xx。
6. 浏览器登录仍只向镜像岛固定 callback 传递一次性票据；票据兑换、secret 和 introspection 均留在服务端。

## Boundaries

- 只有 `mirror-game` 接入论坛网络，frontend、Keycloak、数据库和 migration 服务保持隔离。
- 不改票据 JSON 请求/响应结构，不放宽 URL 或 secret 校验。
- 健康探针不携带 secret、票据或账号标识，不访问数据库接口，不打印响应正文。

## Compatibility

- GitHub Actions 生产路径使用动态解析出的网络名。
- 手工或本地 `docker compose config` 在未设置变量时渲染为标准的 `parallellines_default`；真正启动仍要求该外部网络已存在。
- 若 ParallelLines `api` 未运行、没有 `api` 别名或别名出现在多个网络，部署直接失败，避免选择错误网络。

## Rollout and Rollback

- 发布顺序保持不变：论坛服务可用后，再启动/替换 `mirror-game`。
- 新健康门禁在 frontend 替换前执行，失败不会把新前端接入流量。
- 回滚只需恢复 Compose/Workflow/合同文档与测试改动；不涉及数据库或持久化状态。

## Alternatives Rejected

- 公共 HTTPS API：会让服务端内部鉴权调用依赖公网边缘，偏离既定内部服务边界。
- 固定写死 `parallellines_default`：无法覆盖 Compose 项目名或网络名被部署环境覆盖的情况。
- 把全部镜像岛服务加入论坛网络：扩大不必要的网络可达面。
