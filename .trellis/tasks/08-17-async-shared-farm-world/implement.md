# 实施计划

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

1. 仅在数据库评审批准后创建单个 Prisma migration，建立 worlds/profile/cells/chunks/houses/occupancy/inventory/saves/settlements 表。
2. 用 `simplex-noise` 固定 seed 生成 512×512 世界并导出 256 个 RPGJS map room。
3. 实现 Prisma SaveStorageStrategy、动态 cell/house room load 和跨 chunk transfer。
4. 实现全服 epoch、2:00 幂等 settlement 与离线 chunk lazy catch-up。

## Phase 4：玩法切片

1. 使用 RPGJS item/inventory 实现锄头、种子、浇水壶和土豆 stack。
2. 实现无主共享 cell 状态机、服务器 OCC、争抢收获和 room 广播。
3. 实现迎宾 NPC、选址标记、房屋 footprint 事务、外观 Event 和私有室内 map。
4. 实现旧 local 名称/外观一次性导入与全服 HUD。

## Phase 5：切换

1. 双浏览器验收注册/登录、玩家可见、跨区、共享作物竞态、全服跨日、NPC 建房和私有室内。
2. 验证备份、迁移、Keycloak/PostgreSQL 健康检查、资源许可证和依赖锁。
3. 先部署独立预览入口；用户验收后再把 `/` 切换到 RPGJS。
4. 稳定观察后单独审计并清退旧 React/Phaser/FastAPI 故事能力，不与首次切换提交混合。
