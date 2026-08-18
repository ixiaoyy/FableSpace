# Mirror Island RPGJS

## Ownership

- 新共享游戏位于独立 `apps/mirror-island/`，以 RPGJS v5 为运行时，不在旧 React/Phaser 目录继续抽象。
- Phase 1 只验证 RPGJS 原生 map room、两玩家渲染/移动、NPC/Event、Items/Inventory、dynamic tile 和 SaveStorageStrategy 接口。
- 旧 `apps/web/` 与生产 `/` 在纵向切片验收前保持不变；不要在 Phase 1 清退或兼容旧游戏模块。

## Open-source contract

- 固定 `@rpgjs/server` 与 `@rpgjs/client` `5.0.0-beta.32`，并记录上游提交 `7c7db1b51e6f9deea8c33926f729c013a39340a6`、MIT 许可证和 beta 风险。
- 从官方 `rpgjs/starter#v5` 建立应用；只采用官方包、模板和文档，不复制来源不明示例。
- Phase 1 不引入 Keycloak、Prisma、PostgreSQL 或论坛 SSO；auth/save 只使用可替换测试适配，避免把 spike 变成生产实现。
- 模板资产只用于本地验证；未核对来源、许可证、尺寸、哈希和发布路径前不得作为正式 Git 图片或生产媒体。
- `@rpgjs/vite@5.0.0-beta.32` 当前间接依赖存在无修复版本的高危 `image-size@2.0.2`；只允许它在隔离尖峰构建期读取受信任本地模板图片，风险解除或重新批准前不得生产切流。
- RPGJS Node 运行镜像必须使用 `ssr.noExternal=true` 的服务端 bundle，运行阶段不得安装包含 `image-size` 的 npm 依赖；每次构建核对 bundle 中不存在 `image-size`/`@rpgjs/vite`。

## Verification

- 运行 RPGJS starter 自带 type/test/build 命令，以实际 `package.json` 为准。
- MMORPG 模式用两个独立浏览器会话验证同地图玩家可见和移动同步。
- 验证 NPC 对话、物品进入背包、动态 tile 同步和存档策略调用；不以代码存在代替运行证据。
- 浏览器自动化不能可靠向 Canvas 保持按键时，必须同时保留双客户端截图、同 room 不同连接 ID 日志和 NPC 组合合同测试，并把实际键盘交互列为人工待验，不得宣称已自动验收。
- 检查生产 `/`、旧前端构建和部署配置没有被 Phase 1 改动。

## Scenario: Keycloak 认证与 RPGJS WebSocket 门禁

### 1. Scope / Trigger

- Phase 2 起所有 MMORPG 连接必须来自 Keycloak 登录账号；不提供游客或匿名连接。
- 生产预览固定为 `/mirror-island/`，Keycloak 固定走同域 `/identity/`，旧 `/` 保持回滚能力。

### 2. Signatures

```text
Browser -> /identity/realms/mirror-island (Authorization Code + PKCE S256)
WebSocket protocols -> ["mirror-island", "bearer.<access-token>"]
RPGJS engine.auth(socket) -> verified Keycloak sub

VITE_KEYCLOAK_URL
VITE_KEYCLOAK_REALM
VITE_KEYCLOAK_CLIENT_ID
KEYCLOAK_ISSUER
KEYCLOAK_AUDIENCE
KEYCLOAK_JWKS_URI
KEYCLOAK_ALLOW_HTTP_JWKS
```

### 3. Contracts

- `keycloak-js` 使用 `login-required`、PKCE S256 和内存 token；不得把 access/refresh token 写入 localStorage、sessionStorage 或 Cookie。
- 服务端只接受 RS256、正确 issuer、`mirror-island-game` audience、未过期且含非空 `sub` 的 access token。
- 浏览器不能设置自定义 WebSocket Authorization header；token 放在第二个子协议中，第一项固定为可安全回显的 `mirror-island`。
- 禁止把 bearer token 放 query。RPGJS Node transport 会记录 query 参数，URL token 会进入日志。
- 生产 JWKS 可通过显式 `KEYCLOAK_ALLOW_HTTP_JWKS=true` 访问无点号的内部 Compose 服务名；公开 issuer 仍必须 HTTPS。
- Keycloak 使用独立 PostgreSQL volume，只保存身份服务内部表；本阶段不创建 Prisma 游戏表。升级前必须生成非空 `pg_dump` 备份。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 未登录打开镜像岛 | 重定向 Keycloak，不启动 RPGJS |
| token 缺失、过长、签名/issuer/audience/exp 错误 | WebSocket 拒绝，固定 `Authentication failed` |
| Keycloak/JWKS 暂时不可用 | 不降级游客；显示可重试登录错误 |
| 外部 HTTP issuer/JWKS | 配置启动失败 |
| 内部 HTTP JWKS 未显式授权或主机名含点 | 配置启动失败 |
| 数据库已有运行实例但备份失败/为空 | 部署停止，不替换身份服务 |

### 5. Good / Base / Bad Cases

- Good：登录后用当前内存 token 建立连接，RPGJS 以稳定 `sub` 创建玩家；日志只含连接 ID。
- Base：token 到期后 `keycloak-js` 刷新；下一次重连/换房使用新 token。
- Bad：在 `?token=` 中传 JWT、把 token 写浏览器存储、JWT 失败时生成随机游客 ID。

### 6. Tests Required

- 单元测试：真实 RS256 签名验证、错 audience、缺 token、外部 HTTP 拒绝、显式内部 JWKS 允许。
- Realm 合同：注册开启、Remember Me、无邮箱/找回、最大密码 72、PKCE、audience mapper、只有 username 对用户可编辑。
- 本地集成：`123` 能创建临时账号；真实 Keycloak token 收到 RPGJS `connected`；按精确 ID 删除临时用户/客户端。
- 日志验收：WebSocket 日志不得包含 token 或 `bearer.`，query 只允许非秘密连接 ID。
- 部署：Compose 合并、YAML、Nginx、生产客户端/服务端构建和三条路由健康检查通过。

### 7. Wrong vs Correct

#### Wrong

```ts
provideMmorpg({ query: () => ({ token: keycloak.token }) })
```

#### Correct

```ts
provideMmorpg({
  socketOptions: {
    protocols: () => ["mirror-island", `bearer.${keycloak.token}`],
  },
})
```
