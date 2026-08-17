# 技术设计

## 1. 开源采用与拒绝记录

| 能力 | 采用 | 固定版本/提交 | 许可证 | 边界 |
|---|---|---|---|---|
| 游戏运行时 | RPGJS | `5.0.0-beta.32` / `7c7db1b...` | MIT | 地图房间、玩家同步、NPC/Event、动态 tile、物品/背包、save/auth hooks |
| 身份 | Keycloak Server | `26.7.1` | Apache-2.0 | 独立用户名密码、Remember Me、会话、用户主体 |
| 身份客户端 | `keycloak-js` | `26.2.4` | Apache-2.0 | 浏览器 SSO、内存 token、刷新 |
| 数据访问 | Prisma / `@prisma/client` | `7.9.1` | Apache-2.0 | PostgreSQL schema、事务、OCC、迁移 |
| 地形噪声 | `simplex-noise` | `4.0.3` | MIT | 固定 seed 基础地形生成 |
| 地图编辑 | Tiled | 实施时固定稳定版 | GPL-2.0 工具 | 仅开发工具与导出格式，不分发编辑器 |

拒绝：

- Kaetram：功能接近，但附加 OPL 限制 AI 相关用途，与当前 AI 协作开发冲突。
- Nakama：能力完整，但与 RPGJS 地图/背包/认证能力重复，并增加第二套游戏服务。
- FastAPI Users：已进入维护模式，且新方向不保留 Python 游戏后端。
- 来源不明的 Phaser 背包示例：维护与许可证证据不足；RPGJS 已有原生 Items/Inventory。

RPGJS v5 仍为 beta。退出策略是固定上游提交、在 `apps/mirror-island/` 独立实现并保留旧公开应用，纵向切片失败即可删除新目录而不影响线上。

## 2. 应用拓扑

```text
Browser
  -> Keycloak (login/register/remember-me)
  -> RPGJS client (in-memory access token)
  -> RPGJS server rooms (auth hook validates Keycloak JWT)
  -> Prisma
       -> PostgreSQL mirror-island game database

ParallelLines forum
  -> thin SSO bridge / Keycloak identity-provider adapter
  -> Keycloak forum identity
```

- 新建独立 `apps/mirror-island/` RPGJS 应用，不在旧 `apps/web/app/game/` 内继续抽象。
- Keycloak 自注册页仅用户名、密码和角色资料；关闭邮箱验证、找回密码、账号链接和游客能力，启用 Remember Me。
- Forum SSO 需要一个最小桥接：验证 ParallelLines 一次性票据并映射稳定 forum subject 到 Keycloak。若论坛未来提供 OIDC，替换桥接为 Keycloak 标准 OIDC broker。
- RPGJS `auth()` 验证 Keycloak JWT 签名、issuer、audience 和有效期，返回 stable subject 作为 `player.id`。

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

所有游戏表在同一需求版本只允许一个 Prisma migration。实现前需补充备份、部署顺序和 down/forward-fix 回滚脚本评审。

## 8. 旧原型与迁移

- 首次 Keycloak 注册后，浏览器只提交已 codec 验证的 local `player_name` / `avatar_id` 作为一次性资料建议；服务端再次验证。
- 不上传 local day/time/scene/spawn/house/crops。
- RPGJS vertical slice 未通过前，不撤销或删除当前已暂存 Phaser 改动；切换方案确认后再决定将其提交为 rollback checkpoint 或精确丢弃。

## 9. 风险

- RPGJS v5 为 beta：必须先做可删除 spike，验证 auth hook、room transfer、items、dynamic tile 和 save strategy 后才能承诺切换。
- Keycloak forum bridge 是不可避免的薄适配；必须保持一次性 ticket、issuer/audience 校验和禁止自动账号合并。
- 全服 2:00 settlement 和房屋 footprint 是高风险事务；依赖唯一约束/OCC/幂等表，而不是客户端判断。
