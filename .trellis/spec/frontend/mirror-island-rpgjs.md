# Mirror Island RPGJS

## Ownership

- 唯一应用位于 `apps/mirror-island/`，公开 `/` 只服务一份 RPGJS client。
- `/mirror-island` 只 308 到 `/`；`/identity/`、`/forum-sso/`、`/parties/` 和 `/game-media/v1/` 由同一 Nginx 路由。
- 不恢复 `apps/web/`、`apps/api/`、React/Phaser、StoryWorld 或旧 FableSpace 数据/媒体。

## Open-source contract

- RPGJS server/client 固定 `5.0.0-beta.32` 和上游 `7c7db1b...`，MIT。
- Keycloak Server 固定 `26.7.1` digest，Apache-2.0；`keycloak-js` 固定 `26.2.4`。
- `oidc-provider` 固定 `9.11.1`，MIT/OpenID Certified，只适配既有论坛 ticket。
- Prisma/@prisma/client/@prisma/adapter-pg 固定 `7.9.1`，PostgreSQL driver 使用 `pg`。
- `@rpgjs/vite` 的 `image-size@2.0.2` 只允许在隔离构建阶段读取受信本地资源；Node runtime 镜像必须使用 SSR bundle 且不含 `image-size`/`@rpgjs/vite`。
- Prisma CLI 只存在一次性 migration 镜像，不进 browser 或 game runtime 镜像。

## Authentication flow

```text
Browser -> Keycloak Authorization Code + PKCE S256
Keycloak local account OR ParallelLines OIDC broker
ParallelLines /play -> one-time ticket callback
Mirror OIDC bridge -> ticket exchange + live introspection
Keycloak -> stable sub + mirror-island-game audience
Browser WebSocket protocols -> ["mirror-island", "bearer.<access-token>"]
RPGJS auth hook -> verified Keycloak sub
```

- 浏览器 token 只在 `keycloak-js` 内存中；禁止 query/localStorage/sessionStorage/cookie 持久化。
- RPGJS 只接受 RS256、正确 issuer/audience/exp 与非空 `sub`；失败不降级游客。
- 论坛 ticket 仅服务端兑换，紧接着实时 introspect `fablespace.access`、authorization version 和 expiry。
- 固定 callback 使用签名、短期、HttpOnly、Secure、SameSite=Lax cookie 绑定 OIDC interaction；状态和 ticket 不进 URL 或日志。
- 论坛 identity 使用 `forum:<stable-id>` subject 和 `forum_<base64url-id>` 内部用户名；不根据同名或邮箱自动合并。
- OIDC bridge ID Token 使用首次部署生成并持久复用的 P-256/ES256 私钥；Keycloak 通过稳定 JWKS 验签，游戏进程重启不轮换签名身份。

## Scenario: Keycloak broker client algorithm contract

### 1. Scope / Trigger

- 修改论坛 OIDC bridge 的 signing JWK、`enabledJWA`、静态 client 或 Keycloak broker 配置时触发。
- Discovery 返回 200 只证明 endpoint 可发现，不证明静态 client 元数据能通过 authorization 校验。

### 2. Signatures

- Provider factory: `createForumSsoBridge(env): Promise<ForumSsoBridge>`。
- 静态 client 必须包含 `id_token_signed_response_alg: "ES256"`。
- 生产门禁命令：`node scripts/probe-forum-oidc.mjs`。

### 3. Contracts

- 必需 env：`MIRROR_ISLAND_PUBLIC_ORIGIN`、`MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID`。
- 探针请求：`client_id` 为论坛 bridge client，`redirect_uri` 为 Keycloak broker endpoint，`response_type=code`、`scope=openid`、`code_challenge_method=S256`。
- 成功响应：HTTP 303，`Location` 必须以公网 `${MIRROR_ISLAND_PUBLIC_ORIGIN}/forum-sso/interaction/` 开头。
- login interaction 必须跳到 `${PARALLELLINES_PUBLIC_BASE_URL}/play?mirror_sso=1`，由论坛登录态继续签发一次性 ticket。
- 探针只创建短期内存 interaction，不兑换论坛 ticket，不读取数据库，不记录 query、cookie 或响应体。

### 4. Validation & Error Matrix

| 条件 | 结果 |
| --- | --- |
| 仅允许 ES256，但 client 未声明 `id_token_signed_response_alg` | `400 invalid_client_metadata`，部署失败 |
| `redirect_uri` 不等于登记的 Keycloak broker endpoint | authorization 失败，部署失败 |
| 响应不是 303 或 `Location` 不在公网 interaction path | 探针抛出固定、无敏感内容的错误 |
| client 元数据、PKCE 和公网 origin 全部匹配 | 303 进入 interaction |

### 5. Good / Base / Bad Cases

- Good：真实 authorization 请求得到公网 interaction 303，再由 interaction 转到 ParallelLines。
- Base：Discovery issuer/endpoints 为 HTTPS，但仍必须继续跑 authorization 探针。
- Bad：只配置 ES256 JWK/`enabledJWA`，依赖 client 的默认 RS256 元数据。

### 6. Tests Required

- `sso-contract.test.mjs` 必须用登记 client、redirect URI 和 S256 challenge 发起请求，并断言 303 + interaction path。
- 同一测试必须携带 provider interaction cookies 继续请求，并断言论坛 `mirror_sso=1` 入口。
- `deployment-contract.test.mjs` 必须断言生产工作流执行 `probe-forum-oidc.mjs`。
- 生产部署后必须复测 Keycloak“使用论坛账号”，确认 `/forum-sso/auth` 不返回 `invalid_client_metadata`。

### 7. Wrong vs Correct

```typescript
// Wrong: provider only allows ES256 while the client silently defaults to RS256.
{ client_id, redirect_uris, response_types: ["code"] }

// Correct: the registered client explicitly matches the provider signing contract.
{ client_id, redirect_uris, response_types: ["code"], id_token_signed_response_alg: "ES256" }
```

## Keycloak user/theme contract

- 开启注册与 Remember Me，关闭邮箱登录/验证、找回和 direct grant；密码只限最大 72。
- 自助资料只暴露 `username`；用户名 1–32，保留 `username-prohibited-characters`，删除 `up-username-not-idn-homograph`，因此“张三”可用。
- `mirror-island` 原生 Keycloak 主题继承 `keycloak.v2`，使用镜像岛渡口登记簿视觉；保留语义 label、autocomplete、密码可见、可见焦点、错误关联和 reduced motion。
- 主题只引用 `game/media/v1` 已登记资源，资源不可用时有 CSS 纯色降级。

## Persistence contract

- Keycloak 库与游戏库分库/分凭据/分 volume；游戏库不复制密码或论坛凭据。
- 单一 migration 建立 `worlds`、`player_profiles`、`world_cells`、`chunk_state`、`houses`、`world_occupancy`、`player_inventory`、`player_saves`、`world_day_settlements`。
- `PrismaSaveStorageStrategy` 实现 RPGJS `list/get/save/delete`，只支持 slot 0，对 account ID、snapshot JSON/512KiB 和 meta/16KiB 在入库前验证。
- 玩家第一次连接幂等建 profile/world；有存档先 load，无存档才创建出生点并 save。
- 地图切换和断线显式存档，不在每帧或每次 `syncChanges` 无界写库。
- 基础地形不入库；动态格/房屋/背包/结算使用事务、唯一约束和 OCC，提交后才广播。

## Deployment and verification

- 顺序固定为：构建三镜像 -> 两库备份 -> migration -> Keycloak/game -> realm/profile reconcile -> frontend -> 健康验收 -> 旧系统永久清退。
- Keycloak Admin reconcile 接受成功的空响应体；仅在响应体非空时解析 JSON，禁止把合法 `201/204` 当成部署失败。
- Nginx 对外身份与论坛代理固定发布 HTTPS，同源旧路径只返回相对 `Location: /`；容器内验收必须携带公网 `Host` 并检查 discovery 的绝对 HTTPS endpoint。
- 通用 `/health` 不证明数据路径；必须实际迁移隔离 PostgreSQL，并跨 Prisma client/进程重连验证存档。
- 身份必须验收中文独立注册、论坛首次 SSO/再访直登、票据重放、同名不合并和日志无 token。
- 主题必须验收 1280×720、390×844、200% zoom、键盘、可见焦点、错误和 reduced motion。
- 生产清退前后必须确认论坛、`mirror_identity_db`、`mirror_game_db` 和 `game/` 完整，且旧 database/volume/backup/`fablespace/` prefix 不存在；R2 计数从实际 `Contents` 计算，清退前后 `game/` 数量必须等于媒体清单条目数且保持不变。
