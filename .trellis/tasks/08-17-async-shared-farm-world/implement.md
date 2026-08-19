# 实施计划

> 2026-08-19 用户明确取消旧应用回滚并要求永久清退旧代码/数据。下方历史 Phase 0/1/2A 记录保留事实，其中“不切换 `/`”和“保留回滚”不再是未来执行要求。

## Phase 0：基线与审批

1. 用户评审并明确批准 RPGJS/Keycloak/PostgreSQL/Prisma 方向、上述游戏表结构、一个迁移版本和回滚范围。
2. 单独决定当前已暂存 Phaser 湖畔代码：提交为 rollback checkpoint，或精确丢弃；未批准前不改其暂存状态。
3. 建立 `apps/mirror-island/` 独立应用与固定依赖清单，不修改 `/` 或生产部署。

## Phase 1：可删除开源纵向 spike

1. 使用 RPGJS `5.0.0-beta.32` 建一张 32×32 测试地图和两名测试玩家。
2. 验证 RPGJS 原生玩家渲染/移动、map room、动态 tile、NPC/Event、Items/Inventory 和 SaveStorageStrategy 接口。
3. 验证浏览器刷新、房间切换、第二客户端同步和生产构建；失败则删除 spike，不污染旧应用。

### 2026-08-17 实施记录

- 已从官方 starter 固定提交 `3b2ca14b9fed26aa9975bb3c43127cde9f25a515` 创建独立 `apps/mirror-island/`，未修改生产 `/` 与 `apps/web/`。
- 已切换为 MMORPG 启动、标签页级临时连接 ID 与服务端内存 `SaveStorageStrategy`；没有认证、数据库、迁移或旧存档兼容。
- 两个 Chrome 标签页生成不同连接 ID，服务端日志显示两者进入同一个 `map-simplemap` room；在玩家 graphic/name 先于 `changeMap` 初始化后，两端都能同屏看到两名玩家与一个 NPC。
- 欢迎 NPC 的动作组合已接入 RPGJS Items、dynamic tile、save 与 dialogue API；合同测试验证调用顺序和参数，浏览器自动按键未可靠触发 Canvas 键盘事件，因此真实移动输入同步、NPC 对话与背包仍需人工再验一次。
- `npm run typecheck` 通过；`npm test` 两项通过（生产 root/subpath 预览、NPC 组合合同）；`npm run build` 通过。大包警告保留，尚未做性能优化。
- 已修复 audit 中有补丁的间接依赖；仍有 `@rpgjs/vite -> image-size@2.0.2` 的高危拒绝服务公告且无修复版，Phase 1 可继续本地验证，但生产切流被阻断。
- starter 的 Pipoya 图片不进入 Git、也不被运行时引用；构建前只从不可变 CDN 下载三项已登记 Ninja Adventure CC0 素材，并严格校验字节数与 SHA-256。

## Phase 2：身份

1. 增加固定 Keycloak realm 配置：用户名密码、自注册、Remember Me、无邮箱/找回、无密码复杂度、禁游客与账号链接。
2. 实现 ParallelLines 一次性 SSO 到 Keycloak 的最小桥接，并做 issuer/audience/replay 测试。
3. RPGJS auth hook 验证 Keycloak token；无会话拒绝连接，论坛老用户与独立用户得到稳定不同 subject。

### 2026-08-18 Phase 2A 实施记录

- Keycloak Server 固定 `26.7.1` 多架构 digest，`keycloak-js` 固定 `26.2.4`，`jose` 固定 `6.2.9`。
- Realm 已开启用户名注册和 Remember Me，关闭邮箱登录/验证、找回和 direct grant；用户自助资料只显示 username，密码策略只限制最大 72 字符。
- 浏览器使用 Authorization Code + PKCE S256；token 只在 Keycloak JS 内存实例中刷新，Keycloak `sub` 作为 RPGJS 稳定连接 ID。
- 发现 RPGJS Node transport 会打印 WebSocket query，已禁止 `?token=`；bearer token 改为第二 WebSocket 子协议，第一项固定 `mirror-island` 供服务端安全回显。真实日志只显示非秘密连接 ID。
- 真实 Keycloak 集成验证通过：临时账号密码 `123` 获取有效 token，RPGJS 返回 `connected`，随后按精确 ID 删除临时用户与 OAuth 测试客户端。
- 生产预览固定 `/mirror-island/`，身份入口固定 `/identity/`，WebSocket 固定 `/parties/`；旧 `/` 不切换。
- 2核/4GB 单机新增预算：Keycloak 768MB、PostgreSQL 512MB、RPGJS 384MB。Keycloak 使用独立 PostgreSQL volume；部署升级前强制生成非空 `pg_dump`。
- Forum SSO bridge 尚未实现；当前只完成独立账号路径。游戏世界和背包仍是内存状态，生产重启后不会保留，等待 Phase 3 Prisma SaveStorageStrategy。

## Phase 3：世界和持久化

1. 使用已评审的九表边界创建且仅创建一个 Prisma migration：`worlds`、`player_profiles`、`world_cells`、`chunk_state`、`houses`、`world_occupancy`、`player_inventory`、`player_saves`、`world_day_settlements`。
2. 固定 `prisma`/`@prisma/client` `7.9.1`、`@prisma/adapter-pg`、`pg` 和对应类型；按 Prisma 7 使用 `prisma.config.ts`、`prisma-client` 显式输出和单例 `PrismaPg` adapter，不把连接串写入 schema 或构建产物。
3. 在 `deploy/docker-compose.mirror-island.yml` 增加独立 `mirror-game-db` PostgreSQL 17 服务和 `mirror_game_db` volume，与 Keycloak `mirror-identity-db` 分库/分凭据；`configure_mirror_island.py` 生成新游戏 DB 凭据且不输出值。
4. 创建 `apps/mirror-island/src/persistence/prisma-save-storage.ts`，完整实现 RPGJS `SaveStorageStrategy.list/get/save/delete`；键只来自 Keycloak `player.id` + slot，snapshot/meta 在入库前做大小和 JSON 边界验证，upsert 使用 version 防止旧写覆盖新写。
5. 在 `onConnected` 先加载 slot 0，无存档才创建新角色；地图切换、背包/角色关键变更和 `onDisconnected` 调用显式存档，不在每帧/`syncChanges` 上无界写库。
6. 用 `simplex-noise` 固定 seed 生成 512×512 世界并导出 256 个 RPGJS map room；世界初始化以 `worlds.slug=mirror-island` 唯一键幂等建立，基础地形不入库。
7. 实现动态 `world_cells`/`chunk_state`/`houses`/`world_occupancy` 按当前 room 加载，耕作/收获/建房使用 Prisma transaction + 唯一约束/OCC；成功提交后才广播 RPGJS 动态 tile/event。
8. 实现全服 epoch、2:00 幂等 `world_day_settlements`、离线 chunk lazy catch-up 和存档安全位置恢复。
9. 在创建 migration 前核对 `PRODUCTION.md`、Compose、deploy workflow 和前进恢复说明：首次空库应用 `prisma migrate deploy`，迁移失败则不启动 `mirror-game`；旧系统清退前可删除未接流量的新空库重试，清退后只允许新的 forward-fix migration。

### Phase 3 验证

- 静态断言仅有一个镜像岛 migration，Prisma schema/生成 client/SQL 列、键、索引、外键和 check 与评审表一致。
- 在隔离 PostgreSQL 测试容器运行 `prisma validate`、`prisma generate`、`prisma migrate deploy`；不连生产库生成 migration。
- 合同测试：SaveStorage list/get/upsert/delete、重启恢复、旧 version 写拒绝、snapshot/meta 大小/结构拒绝、同时收获/建房只一个成功、跨日只结算一次。
- 停止并重建 `mirror-game` 后，两个不同 Keycloak subject 各自恢复角色、背包和安全位置，共享 cell/house/world day 状态一致。

## Phase 2B：身份补齐与主题

1. 审计部署主机上 ParallelLines 的实际 `/play`、`/auth/fablespace/exchange`、`/auth/fablespace/introspect`、callback 和 `FABLESPACE_*` 配置；只读核对路径、票据 TTL、capability 和稳定用户 ID，不读取论坛业务数据。
2. 在 `apps/mirror-island/src/sso/` 集成固定 `oidc-provider@9.11.1`；用镜像岛 Node HTTP server 暴露 `/forum-sso/**` 与旧论坛回调兼容路径，使用短期签名 state/cookie 绑定浏览器交互。
3. 后端兑换一次性 ticket，校验 `fablespace.access`、`authorization_version`、`access_expires_at` 和稳定 forum ID；票据重放、过期、错 capability、响应异常或主站不可用均 fail closed。
4. 在 `apps/mirror-island/keycloak/mirror-island-realm.json` 增加 OIDC Identity Provider、安全的 first-broker-login flow 和前缀 forum identity mapper；禁用邮箱/用户名自动链接与账号合并。
5. 修改 `mirror-island-user-profile.json`：删除 `up-username-not-idn-homograph`，保留 `length(1..32)` 和 `username-prohibited-characters`；合同测试要求 `张三` 通过而空白/控制/危险字符拒绝。
6. 新增 `apps/mirror-island/keycloak/themes/mirror-island/login/`，基于 `keycloak.v2` 实现“渡口登记簿”像素主题；挂载主题并在 realm 设置 `loginTheme=mirror-island`。
7. 主题只使用 `game/media/v1` 已登记 CC0 资源和 CSS，无新 Git 图片二进制；验收 1440px、390px、200% zoom、键盘顺序、可见焦点、对比度、错误关联与 `prefers-reduced-motion`。

### Phase 2B 验证

- `npm --prefix .\apps\mirror-island run typecheck`
- `npm --prefix .\apps\mirror-island test`
- `npm --prefix .\apps\mirror-island run build`
- `npm --prefix .\apps\mirror-island run build:server`
- 本地 Keycloak + ParallelLines stub 端到端：独立中文账号、论坛首次注册、后续直登、同名账号不合并、票据重放拒绝。

## Phase 4：玩法切片

1. 使用 RPGJS item/inventory 实现锄头、种子、浇水壶和土豆 stack。
2. 实现无主共享 cell 状态机、服务器 OCC、争抢收获和 room 广播。
3. 实现迎宾 NPC、选址标记、房屋 footprint 事务、外观 Event 和私有室内 map。
4. 实现新账号角色名/外观创建与全服 HUD；不读取旧 localStorage。

## Phase 5：新版接管根入口

1. 把 `apps/web/Dockerfile` 和 `apps/web/nginx.conf` 的新运行边界迁入 `apps/mirror-island/`；只构建一份 RPGJS client 到 Nginx root，`/mirror-island` 和 `/mirror-island/` 都返回 308 `/`。
2. Nginx 保留 `/identity/`、`/parties/`、`/forum-sso/`、论坛票据 callback 和 `/game-media/v1/`；删除旧 SPA/API/assets 路由。
3. 新客户端首次启动精确删除 `farm-game.save.v1`–`farm-game.save.v4`；不清空整个 localStorage，不删 Keycloak 或新应用键。
4. 简化 root Compose 和 Deploy workflow：不再构建/更新 backend、memory-worker、llm-proxy，不再执行旧 Schema/LLM 门禁；只部署 frontend、mirror-game、Keycloak 与 mirror-identity-db。
5. 生产预清退验收：`/` 显示镜像岛，`/mirror-island/` 跳到 `/`，独立中文账号和论坛 SSO 各成功两次，两浏览器能进同房间，旧 API/SPA 路由不可达。

## Phase 6：永久清退旧系统

### 6.1 仓库清退

1. 删除已审计的 `apps/web/` 和 `apps/api/` 整树；在删除前保存其完整 `git diff -- <target>` 清单，确认其中旧产品未提交改动也属于本次丢弃。
2. 删除 `.github/workflows/repair-story-run-schema.yml`、`apply-multi-story-009.yml`、`audit-multi-story-readiness.yml` 和旧 backend/media 部署分支；`publish-media.yml` 只保留 `game/` 命名空间。
3. 删除 `deploy/cdn/media-manifest.json`、旧 schema/LLM/shared-service 脚本与 Compose overlay；保留 `game-media-manifest.json`、`configure_mirror_island.py` 和新版部署边界。
4. 删除 `docs/FABLESPACE_SPACE_PLATFORM.md`、`docs/WORLD_SCHEMA.md` 和旧 Story/Phaser 部署内容；重写 `README.md`、`docs/INDEX.md`、`PRODUCT_BRIEF.md`、`WHAT_NOT_TO_BUILD.md`、`DEPLOYMENT.md` 为镜像岛唯一真源。
5. 删除旧 StoryWorld/Phaser 专用 `.trellis/spec` 和尚未完结的旧产品 task 树；保留镜像岛任务、通用规则和 Git 历史。不触碰无关的 `AGENTS.md`、`UI稿/`、`%SystemDrive%/` 和其他用户文件。
6. 对生产代码/配置的删除和新增执行 `git add`；文档、任务、测试与清退报告不自动暂存。

### 6.2 生产数据清退（无备份/无恢复）

1. 生成并输出不含密钥的精确目标清单：旧 Compose 容器/镜像，共享 MySQL 的 database `fablespace`，解析后的 `fablespace_data` volume，`/opt/fablespace/backups` 下非 `mirror-island-keycloak` 的已审计旧备份，旧 Schema/LLM/env 文件，R2 `fablespace/` prefix。
2. 在单一 PowerShell/远端 POSIX shell 中校验所有解析后绝对路径均位于 `/opt/fablespace` 或已审议的私密目录；禁止未解析变量、根目录和通配递归删除。
3. 停止并删除 backend、memory-worker、llm-proxy 及旧 frontend 容器/镜像；不停 ParallelLines、mirror-game、Keycloak、mirror-identity-db。
4. 使用 ParallelLines 现有 MySQL 管理凭据只执行 `DROP DATABASE` 的精确目标 `fablespace`；不删共享 DB 用户或其他 database。
5. 删除精确解析的旧 `fablespace_data` volume、旧备份/Schema/LLM/env 文件与 R2 `fablespace/` prefix；对象删除前后都分别列举 `fablespace/` 和 `game/` 计数，删除后 `fablespace/ == 0` 且 `game/` 与清单完全匹配。
6. 从 ParallelLines env 中仅清理不再使用的旧配置；新论坛 ticket SSO 仍依赖的 service secret、TTL 和 callback base 改由 `configure_mirror_island.py` 管理，不删除。

### 6.3 最终验证

- 仓库残留搜索：无 React/Phaser/FastAPI/StoryWorld/StoryRun/LLM proxy/旧 `fablespace/media/v1` 运行引用。
- `npm --prefix .\apps\mirror-island run typecheck`
- `npm --prefix .\apps\mirror-island test`
- `npm --prefix .\apps\mirror-island run build`
- `npm --prefix .\apps\mirror-island run build:server`
- Compose config、Nginx config、部署脚本 dry-run 与销毁目标 dry-run 通过。
- 生产人工：中文独立注册/登录、论坛直达/首次注册/再访直登、Remember Me、票据重放、同名不合并、两玩家同房间、像素主题桌面/手机/键盘/错误状态。
- 生产资源：旧容器/镜像/database/volume/备份/文件/R2 prefix 不存在；论坛、`mirror_identity_db`、`game/` 和新镜像岛服务健康。

## 2026-08-19 实施记录

- 已新增单一九表 Prisma `20260819000000_mirror_island_baseline` migration、独立 `mirror-game-db`/volume 和一次性 migration 镜像。
- 已用隔离 PostgreSQL 17 固定 digest 实际执行 `prisma migrate deploy`；RPGJS slot 0 经过第一个 Prisma client 写入、断开、第二个 client 读取恢复，演示共享 tile 也经重连恢复。临时容器/数据已删除。
- 已实现 ParallelLines ticket exchange + live introspection、OIDC Code+PKCE provider、Keycloak broker、直接论坛入口 confidential PKCE bootstrap 和同名不合并 subject 前缀。
- OIDC bridge 使用生产配置首次生成并持久复用的 P-256/ES256 私钥；已用 `oidc-provider` 真实初始化验证 Python 生成 JWK，防止 `mirror-game` 重启导致 Keycloak JWKS 缓存失配。
- 已在本机 `D:\work\ParallelLines` 修改并单独暂存论坛游乐场入口：调用既有 ticket API，含请求超时、AbortSignal、跳转未卸载恢复和可访问错误状态；`pnpm typecheck:web` 和 scoped `git diff --check` 通过。
- 已用真实 Keycloak 26.7.1 导入/幂等应用 realm、两个 client、ParallelLines provider、user profile 和像素主题；“张三”临时账号创建成功后按精确 ID 删除。
- 像素主题在真实 Keycloak 页面经 1280×720 和 390×844 截图/DOM 验收，修复标题错位、provider SVG 失控和多余页面滚动。
- 新 Nginx/frontend 只构建根入口，`/mirror-island/` 308 到 `/`；旧 `apps/web`、`apps/api`、Story/Phaser 规范/活跃任务、旧 workflow/Compose/迁移/媒体 manifest 已从当前工作树删除。
- 新 deploy workflow 在新系统健康后才执行旧容器、`fablespace` MySQL database、volume、备份/私密文件和 R2 `fablespace/` prefix 永久清退；脚本默认 dry-run并保留论坛、两个镜像岛库/volume 和 `game/`。
- 新鲜验证：`npm test` 21 项中 20 通过、1 项 PostgreSQL 集成在普通套件跳过（已单独真实通过）；`typecheck`、client build、server build、Prisma validate/generate、workflow YAML、Compose config 和 Python compile/纯合同通过。
- 本地 Docker 三镜像完整构建被容器内 npm registry 连续两次 `ECONNRESET` 阻断；固定 Node/PostgreSQL/Keycloak digest 均已成功拉取，失败发生在 `npm ci`、尚未进入项目构建。
- 尚未提交/推送两个仓库，因此生产 Deploy、论坛新前端和生产数据/R2 永久删除尚未执行。
