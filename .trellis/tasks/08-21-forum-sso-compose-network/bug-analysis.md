# Bug Analysis: 论坛 SSO 内部 API 网络断路

## 1. Root Cause Category

- **Category**: B - Cross-Layer Contract
- **Specific Cause**: `PARALLELLINES_API_BASE_URL=http://api:8000/api/v1` 隐含依赖 ParallelLines Compose 网络中的 `api` DNS，但 `mirror-game` 只连接另一个 Compose 项目的默认网络。环境值、容器拓扑与部署探针没有形成完整可执行合同。

## 2. Why Fixes Failed

1. ES256 client 元数据修复解决了 OIDC authorization 校验，但没有跨过 ticket exchange 的网络边界。
2. `mirror_sso=1` 修复解决了论坛登录续接，但仍未验证 callback 后的服务端 API 调用。
3. 部署探针只验证 `mirror-game` 本地 OIDC discovery/interaction 与同项目 Keycloak，因而在论坛内部 API DNS 断路时仍可成功。
4. catch-all 把网络不可用与真实票据拒绝统一显示为票据无效，页面症状把排查注意力锚定在票据本身。

## 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
| --- | --- | --- | --- |
| P0 | Architecture | 仅将 `mirror-game` 同时连接默认网络与动态解析的论坛 API 外部网络 | DONE |
| P0 | Runtime | 从 `mirror-game` 请求论坛 API origin 的 `/healthz`，失败时阻止 frontend 替换 | DONE |
| P0 | Test Coverage | 部署合同断言网络隔离、实际网络解析和调用方容器健康探针 | DONE |
| P1 | Documentation | 在镜像岛代码规范中记录七段式跨 Compose 网络合同 | DONE |
| P1 | Review Guide | 在跨层检查中加入 bare service DNS/Compose project/network 核对项 | DONE |

## 4. Systematic Expansion

- **Similar Issues**: 任何通过裸服务名访问另一个 Compose 项目的内部 HTTP、队列或缓存都可能出现同类断路；当前 Keycloak 与游戏数据库和调用方同属镜像岛 Compose，不受此问题影响。
- **Design Improvement**: 把网络名视为部署期解析的拓扑数据，而不是应用配置常量；外部网络只授予实际调用方。
- **Process Improvement**: 健康门禁必须从真实调用方跨过被修改的网络边界，不能用 discovery、公开入口或同容器 `/health` 替代。

## 5. Knowledge Capture

- [x] 更新 `.trellis/spec/frontend/mirror-island-rpgjs.md`。
- [x] 更新 `.trellis/spec/guides/cross-layer-thinking-guide.md`。
- [x] 添加 `deployment-contract.test.mjs` 回归断言。
- [x] 当前仓库没有 `src/templates/markdown/spec/` 镜像目录，无模板同步目标。
