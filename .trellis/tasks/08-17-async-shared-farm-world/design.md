# 技术设计

## 1. 开源采用与拒绝记录

| 能力 | 采用 | 固定版本/提交 | 许可证 | 边界 |
|---|---|---|---|---|
| 游戏运行时 | RPGJS | `5.0.0-beta.32` / `7c7db1b...` | MIT | 地图房间、玩家同步、NPC/Event、动态 tile、物品/背包、save/auth hooks |
| 身份 | Keycloak Server | `26.7.1` | Apache-2.0 | 独立用户名密码、Remember Me、会话、用户主体 |
| 身份客户端 | `keycloak-js` | `26.2.4` | Apache-2.0 | 浏览器 SSO、内存 token、刷新 |
| 论坛 OIDC 桥 | `oidc-provider` | `9.11.1` | MIT | 把现有 ParallelLines 一次性票据适配为 Keycloak 标准 OIDC broker，不接管用户库或密码 |
| 数据访问 | Prisma / `@prisma/client` | `7.9.1` | Apache-2.0 | PostgreSQL schema、事务、OCC、迁移 |
| 地形噪声 | `simplex-noise` | `4.0.3` | MIT | 固定 seed 基础地形生成 |
| 地图编辑 | Tiled | 实施时固定稳定版 | GPL-2.0 工具 | 仅开发工具与导出格式，不分发编辑器 |

拒绝：

- Kaetram：功能接近，但附加 OPL 限制 AI 相关用途，与当前 AI 协作开发冲突。
- Nakama：能力完整，但与 RPGJS 地图/背包/认证能力重复，并增加第二套游戏服务。
- FastAPI Users：已进入维护模式，且新方向不保留 Python 游戏后端。
- 来源不明的 Phaser 背包示例：维护与许可证证据不足；RPGJS 已有原生 Items/Inventory。

RPGJS v5 仍为 beta，但 2026-08-19 用户明确取消旧应用回滚能力。退出路径只保留开源替换设计和 Git 历史，不在当前工作树、生产路由、镜像、数据或备份中保留旧 React/Phaser/FastAPI 系统。

## 2. 应用拓扑

```text
Browser
  -> / (RPGJS client)
  -> Keycloak (pixel login/register/remember-me)
  -> RPGJS client (in-memory access token)
  -> RPGJS server rooms (auth hook validates Keycloak JWT)
  -> Prisma
       -> PostgreSQL mirror-island game database

ParallelLines forum
  -> existing /play + one-time ticket
  -> Mirror Island OIDC bridge
  -> Keycloak OIDC Identity Broker
  -> prefixed Keycloak forum identity
```

- 新建独立 `apps/mirror-island/` RPGJS 应用，不在旧 `apps/web/app/game/` 内继续抽象。
- `apps/mirror-island/` 接管新静态前端镜像和 Nginx 配置，`apps/web/` 整体删除；`/mirror-island/` 只 308 到 `/`，不再构建第二份产物。
- Keycloak 自注册页仅用户名和密码；关闭邮箱验证、找回密码、账号链接和游客能力，启用 Remember Me。
- Forum SSO 桥使用 `oidc-provider` 向 Keycloak 提供 Authorization Code + PKCE/nonce/state 合同；桥内部只处理短期交互、兑换 ParallelLines 一次性 ticket 并回查 capability，不保存论坛密码或建立第二个用户库。
- 论坛 subject 在 Keycloak 中使用独立 federated identity 和内部前缀用户名，防止与同名独立账号自动合并；公开角色名不等于登录用户名。
- RPGJS `auth()` 验证 Keycloak JWT 签名、issuer、audience 和有效期，返回 stable subject 作为 `player.id`。

## 2.1 Keycloak 镜像岛主题

- 主题使用 Keycloak 原生 theme 扩展，父主题为 `keycloak.v2`；不引入 Keycloakify 或另一个 React 登录应用。
- 视觉方向是“镜像岛渡口登记簿”：深湖蓝/苔藓绿背景、暖纸表单、硬边 2–4px 像素边框、小范围金色强调和现有 Ninja Adventure CC0 村落/角色精灵。
- 主题只引用 `game/media/v1` 已登记的不可变资源，不把 PNG 复制进 Git；所有远程资源有可读的纯色/CSS 降级。
- 同一表面显示一个主操作和一个“使用论坛账号”次操作，保留标准 label、自动填充、密码可见、键盘焦点、错误关联和 200% zoom。
- 中文用户名通过删除 `up-username-not-idn-homograph` 开放；保留 1–32 字符与 `username-prohibited-characters`，因此汉字可用而空白、控制字符及注入高风险符号仍拒绝。

## 3. 世界与房间

- 世界固定 512×512 tiles，chunk 32×32，共 256 个 RPGJS map room；中心区块包含公共起点和迎宾 NPC。
- `simplex-noise` + seed + world revision 生成基础 tile；构建时导出 RPGJS/Tiled 可读地图，运行时不重新随机。
- 跨 chunk 使用 RPGJS map transfer；玩家只连接当前 room，RPGJS 原生同步同 room 玩家和动态事件。
- 房屋外观作为服务端动态 Event 加入对应 room；私有室内使用按 house id 创建/加载的独立 map instance。

## 4. 世界时间与结算

- `world.epoch_utc` 是 Year 1 Spring 1 06:00；每 7 秒对应 10 game minutes，2:00 边界直接进入下一天 6:00。
- 当前日期由服务器 epoch 纯计算；不信任客户端时间。
- `world_day_settlement` 以 `(world_id, absolute_day)` 唯一，保证跨日结算幂等。
- 在线 room 在检测到 day 变化时触发结算；离线 chunk 通过 `settled_day` 在加载时补算，避免必须常驻 256 个房间。

## 5. 共享耕作状态机

- 基础地形不入库；只有被修改的可耕格写 `world_cells` 稀疏表。
- cell state：tilled / growing(stage, watered_day) / mature / withered。没有 owner/account 字段。
- 所有动作在 RPGJS server hook 内验证当前版本；用 Prisma OCC `WHERE version = expected` 更新。
- 收获事务：条件更新 mature cell -> tilled，同时 `player_inventory` potato +1、chunk revision +1；更新 0 行表示已被抢收。
- 房间内由 RPGJS 广播成功后的动态 tile/事件结果。

## 6. NPC 与住宅

- 公共起点 NPC 使用 RPGJS Event 和固定对话：“欢迎来到镜像岛”。账号 onboarding 状态决定是否给选址标记。
- 选址标记是一次性 RPGJS item；使用时进入 footprint preview，只负责提交位置，不代表玩家建造技能。
- 放置事务插入 `houses` 和 footprint 对应的 `world_occupancy` 行；组合主键防重叠。成功后移除标记并立即广播房屋 Event。
- 每账号 `houses.owner_account_id` 唯一；私有室内 map id 由 house id 派生，只有 RPGJS auth player id 与 owner 匹配时允许 transfer。

## 7. 建议数据库表结构（仅评审，不创建）

Keycloak 使用独立数据库/Schema 并自行管理用户、凭证、会话和 federated identity 表；游戏库不复制密码或论坛凭证。

### `worlds`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `id` | UUID PK | world identity |
| `slug` | VARCHAR UNIQUE | `mirror-island` |
| `seed` | BIGINT NOT NULL | deterministic terrain |
| `width_tiles` / `height_tiles` | INT CHECK = 512 | fixed boundary |
| `chunk_size` | INT CHECK = 32 | room size |
| `revision` | INT NOT NULL | terrain contract revision |
| `epoch_utc` | TIMESTAMPTZ NOT NULL | global clock origin |
| `created_at` / `updated_at` | TIMESTAMPTZ | audit |

### `player_profiles`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `account_id` | VARCHAR PK | Keycloak subject; no cross-db FK |
| `player_name` | VARCHAR(12) NOT NULL | public display name |
| `avatar_id` | VARCHAR NOT NULL | male/female authored id |
| `onboarding_state` | VARCHAR NOT NULL | welcome / choosing_home / complete |
| `last_chunk_x/y` | SMALLINT | safe room |
| `last_tile_x/y` | SMALLINT | safe position |
| `local_imported_at` | TIMESTAMPTZ NULL | one-time legacy import |
| timestamps | TIMESTAMPTZ | audit |

### `world_cells`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `world_id, tile_x, tile_y` | composite PK | sparse dynamic cell |
| `chunk_x, chunk_y` | SMALLINT + index | room query |
| `state` | VARCHAR CHECK | tilled/growing/mature/withered |
| `crop_kind` | VARCHAR NULL | potato |
| `growth_stage` | SMALLINT NULL | 0..2 |
| `watered_day` | INT NULL | global day |
| `version` | INT NOT NULL | OCC token |
| `last_actor_account_id` | VARCHAR NULL | audit only, never ownership |
| `updated_at` | TIMESTAMPTZ | audit |

### `chunk_state`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `world_id, chunk_x, chunk_y` | composite PK | room persistence |
| `revision` | INT NOT NULL | dynamic update revision |
| `settled_day` | INT NOT NULL | lazy day catch-up |
| `updated_at` | TIMESTAMPTZ | audit |

### `houses`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `id` | UUID PK | house / private map id |
| `world_id` | UUID FK | mirror island |
| `owner_account_id` | VARCHAR UNIQUE | one house per account |
| `origin_x/y` | SMALLINT | chosen footprint origin |
| `width/height` | SMALLINT | footprint |
| `exterior_variant` | VARCHAR | registered house art |
| `version` | INT NOT NULL | updates |
| timestamps | TIMESTAMPTZ | audit |

### `world_occupancy`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `world_id, tile_x, tile_y` | composite PK | prevent footprint overlap |
| `entity_kind` | VARCHAR | house |
| `entity_id` | UUID FK | houses.id |

### `player_inventory`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `account_id, item_id` | composite PK | RPGJS inventory stack |
| `quantity` | INT CHECK >= 0 | personal item count |
| `version` | INT NOT NULL | OCC |
| `updated_at` | TIMESTAMPTZ | audit |

### `player_saves`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `account_id, slot` | composite PK; slot=0 | RPGJS SaveStorageStrategy |
| `snapshot` | JSONB NOT NULL | RPGJS player snapshot |
| `meta` | JSONB NOT NULL | trusted map/date metadata |
| `version` | INT NOT NULL | stale-write protection |
| `updated_at` | TIMESTAMPTZ | audit |

### `world_day_settlements`

| 字段 | 类型/约束 | 用途 |
|---|---|---|
| `world_id, absolute_day` | composite PK | exactly-once settlement |
| `settled_at` | TIMESTAMPTZ | audit |

所有游戏表在同一需求版本只允许一个 Prisma migration。实现前需同步备份、部署顺序和 forward-fix 恢复说明；不提供旧系统回滚或破坏性 down migration。

## 8. 旧原型与迁移

- 新版不读取或迁移任何旧角色/存档字段；首次加载只精确删除已审计的 `farm-game.save.v1`–`v4` 键。
- 删除 `apps/web/` 和 `apps/api/` 前从当前完整 diff 生成清退清单；其中的旧产品未提交改动按用户“全部删除”决定一并丢弃，不使用整树 `git restore` 清理其他路径。
- Git 已有历史不改写；删除当前工作树、部署产物、运行数据和备份，不执行破坏性 Git history rewrite。

## 8.1 清退目标与保护边界

| 类别 | 永久删除 | 明确保留 |
|---|---|---|
| 仓库 | `apps/web/`、`apps/api/`、旧 Story/Phaser 专用 docs/spec/tasks、旧 schema/LLM/media workflow 与脚本 | `apps/mirror-island/`、镜像岛规格/任务、通用工程规则、无关未提交文件 |
| 服务 | backend、memory-worker、llm-proxy 容器/镜像与旧 frontend 产物 | 新 frontend、mirror-game、Keycloak、mirror-identity-db |
| 共享 MySQL | 精确 database `fablespace` | ParallelLines 其他 database、账号与论坛数据 |
| Docker data | Compose 解析后的旧 `fablespace_data` volume | `mirror_identity_db` 与新游戏 volume |
| 对象存储 | 精确 `fablespace/` prefix（含 `media/v1`和 `admin`） | `game/` prefix 及论坛自身 prefix |
| 主机文件 | 旧 FableSpace 备份、Schema marker/release approval、API env 与 LLM proxy 私密配置 | `backups/mirror-island-keycloak`、镜像岛 `.env.production` |

清退脚本必须先从 Compose/环境解析精确绝对目标并校验其位于 `/opt/fablespace` 或命名对象前缀下；禁止对根目录、用户主目录、未解析变量或通配符执行递归删除。

## 9. 风险

- RPGJS v5 为 beta：必须先做可删除 spike，验证 auth hook、room transfer、items、dynamic tile 和 save strategy 后才能承诺切换。
- Keycloak forum bridge 是不可避免的薄适配；必须保持一次性 ticket、issuer/audience 校验和禁止自动账号合并。
- 论坛代码不在当前工作区；实施前必须从部署主机只读核对 `/play`、ticket callback、exchange 和 introspect 的实际路径/响应，不用旧 FableSpace 客户端推测代替。
- 旧数据、volume、媒体和备份删除无恢复路径；只能在新 `/`、独立账号、论坛 SSO、Keycloak 主题和 RPGJS 连接的生产健康检查全部通过后执行。
- 全服 2:00 settlement 和房屋 footprint 是高风险事务；依赖唯一约束/OCC/幂等表，而不是客户端判断。
