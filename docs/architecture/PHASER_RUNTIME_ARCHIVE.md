# Mirror Island Phaser Single-player

当前实现合同为下方 v13 仓储场景与开发存档重置政策。旧 v1–v12 场景保留历史来源；与当前背包容量、堆叠上限、宠物位置、存档版本或验证方式冲突时，以 v13、当前 AGENTS 和对应 child PRD 为准，不据历史 `Tests Required` 扩建自动测试矩阵。

## Mobile startup loading (2026-09-07)

- 首页只检查唯一试玩槽；角色素材、全地图和 Phaser 不阻塞首页菜单。角色预览必须在图集校验完成后挂载，游戏必须在地图、角色、引擎准备完成后启动。
- Phaser 只能由游戏入口动态导入；Vue 图标/外观共用的纯数据不得导入带 Phaser 运行时的模块。
- WorldCatalog 完成全地图和 NPC/宠物校验后才发布缓存；Phaser 消费地图的独立副本，不二次下载。地图请求有 15 秒上限、失败可重试，URL 版本来自地图内容哈希。
- 首页 WebP 按视口选择手机/桌面副本，来源和发布前置条件见 `docs/assets/mobile-startup-2026-09-07.md`。新副本必须先上传且回读验证，再发布应用引用；原 PNG 保留。
- 未使用的音效和未进入区域的环境音不预取。current v13 存档、覆盖确认和错误提示保持原业务合同。

## Active development save reset policy (2026-09-04)

### 1. Scope / Trigger

- Trigger：镜像岛仍处于本地玩法开发与试玩阶段，新增或重塑 `GameState` / `StoredGame` 字段时，不再为此前开发版本投入迁移、回填、隐藏备份或兼容测试成本。
- 本节优先于下方 v1–v10 历史场景中的迁移要求；历史段落只记录当时已经实施的版本事实，不构成后续版本继续兼容的义务。
- 本政策只适用于浏览器本地 gameplay save。它不授权删除或忽略 PostgreSQL、Keycloak、论坛、媒体对象、部署数据或其他生产数据的迁移与保护规则。

### 2. Signatures

```typescript
const GAME_STATE_VERSION: number;
const SAVE_FORMAT_VERSION: number;

function createInitialGameState(catalog: WorldCatalog): GameState;
function decodeStoredGame(value: unknown): StoredGame;
```

### 3. Contracts

- 每个开发里程碑只定义一个 current `GameState` / `StoredGame` 形态；新游戏直接创建完整 current state。
- `decodeStoredGame()` 只需完整验证 current version。旧 version 可以明确拒绝并引导清除本地试玩存档后新建，不需要迁移为 current。
- 不新增 `migrateGameStateV*`、旧字段 alias、旧坐标映射、旧版本原始备份或“背包满时待补发”等仅为开发存档兼容存在的状态。
- 新增开局物品时直接修改 current new-game defaults；不为旧存档设计自动插槽、替换物品、邮件、NPC 补领或隐藏队列。
- 当前版本内的刷新、继续游戏、原子保存、损坏值校验和保存失败反馈仍是必须合同；“不兼容旧版”不等于可以静默覆盖、丢失 current save 或跳过 decoder。
- 若用户未来明确宣布一个可对外保留的发布基线，再从该基线开始单独恢复 forward migration 评审；不得自行假定某次开发存档已经成为兼容基线。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 全新浏览器槽 | 创建完整 current state，包含本版本全部默认字段和开局物品 |
| 合法 current save | 完整解码并继续，刷新前后 current state 保持 |
| 旧开发版本 save | 明确报告版本不兼容；允许用户清除本地试玩存档并重新开始，不执行迁移或备份 |
| current save 缺字段、非法 ID、越界数值或重复记录 | 解码失败且不静默覆盖原记录 |
| IndexedDB 写入失败 | 保持已提交前状态并显示可恢复错误；不得用“开发阶段”作为忽略原子性的理由 |
| PostgreSQL、Keycloak、论坛或部署数据变更 | 不适用本政策；继续遵守人工评审、备份和 migration 约束 |

### 5. Good / Base / Bad Cases

- Good：新版本增加基础镐和共建状态；新游戏直接拥有完整字段，同版本刷新可恢复，旧 v10 存档显示“不兼容，请重新开始”。
- Base：只调整纯表现且不改变 state 时，继续使用当前 schema，不为版本号制造无意义变更。
- Bad：为每个开发版本继续堆叠 v1→v2→…迁移链；或反过来因为不兼容旧版而跳过 current decoder、静默覆盖坏档或删除外部服务数据。

### 6. Tests Required

- 保留 current state / stored envelope 的创建、严格解码、round-trip、损坏值失败和 current-version 刷新恢复检查。
- 新开局默认值直接断言当前工具、物品和持久状态；不新增或维护旧开发版本迁移、备份、回填和满背包补领测试。
- 浏览器人工路线从清理本地试玩站点数据后的新游戏开始；若保留一个旧开发存档样本，只验证它得到明确不兼容反馈，不验证进度保留。
- 本政策不改变最小 `typecheck`、client build、玩法路线与保存失败检查，也不允许连接数据库。

### 7. Wrong vs Correct

```typescript
// Wrong: new development content carries an ever-growing compatibility chain.
const state = raw.version === 10 ? migrateGameStateV10(raw.state) : decodeCurrent(raw.state);

// Correct: fresh games create current state and the decoder validates only that shape.
if (raw.version !== GAME_STATE_VERSION) throw new Error("Local playtest save version is no longer supported.");
const state = decodeCurrentGameState(raw.state);
```

## Scenario: storage shipping placement current v13

### 1. Scope / Trigger

- Trigger：用户于 2026-09-06 单独启动仓储、出货与摆放批次；当时分支为 `codex/storage-shipping-v1`，v13 领域与客户端实现位于工作区，完整浏览器/真人路线仍待验收。
- 本场景拥有背包/Hotbar、制作入口、普通箱、摆放占用、持久掉落、出货和墨子出货箱建筑服务；其他基础盘 child 仍是规划，不能据本节提前接入技能、矿洞、四季、施工、肥料或自动化。
- 精确参考证据由 child 的 PRD/design/research 持有。公开推箱快照固定在 `5225ef409e42a6159a82cf81200bf6eb315c9961`，实际程序集 `1.6.8.24119`；对 PC 1.6.15 的推断必须保留标记，不把反编译实现纳入产品源码。

### 2. Signatures and state owners

```typescript
const GAME_STATE_VERSION = 13;
const SAVE_FORMAT_VERSION = 13;

type InventoryCapacity = 12 | 24 | 36;
type OccupancyStatus = "blocked" | "clear-on-place" | "relocate-on-place" | "free";

interface StorageWorldState {
  worldObjects: WorldObjectState[];
  worldDrops: WorldDropState[];
  nextWorldEntitySequence: number;
}

interface ShippingState {
  shippingQueue: ShippingEntry[];
  unacknowledgedShippingReport: ShippingReport | null;
}

class StorageCommandSystem {
  apply(state: GameState, npcs: readonly NpcSpawnDefinition[], command: StorageCommand): ActionFeedback;
}
```

- `GameState` 扩展 `StorageWorldState` 与 `ShippingState`。`world-object-state.ts` 持有对象/掉落 identity、严格 decode、clone 和地图对账；单调 `world-N` 序号不能倒退或与默认出货箱 identity 重复。
- `PetState` 直接持有 `regionId/x/y/facing/motion/anchorIndex/pauseRemainingMs`，`PetSystem` 推进领域位置；Phaser `PetEntity` 只投影位置、动画和反馈，不保留第二套行走计时或碰撞事实。
- item definition 唯一拥有 `maxStack`、`inventorySortOrder`、出货资格/分类和普通箱 placement allowlist；各系统不能按售价、物品分类或旧硬编码推断资格。

### 3. Contracts

- 新档背包 12 槽，五件开局工具仍占前五槽，默认空手；普通堆叠与箱体物品上限 999，工具 1。种子店独立陈列按 2,000g / 10,000g 逐级扩为 24/36 槽，购买不依赖华强柜台营业；完成第二档后陈列消失。
- 当前世界 Hotbar 固定前 12 槽；轮换操作保存行顺序，世界焦点下 `Tab` / `Shift+Tab` 前后轮换，面板内继续用于焦点导航。鼠标/触摸有等价操作；整理合并普通堆叠并按 item 顺序排序，工具保持原槽位。
- 制作页暂停世界，仅从玩家背包取料；普通箱新档已知，50 Wood 制作一个，支持 1/5/25。产物选择/持有预览只属于菜单临时状态，确定合法背包落槽后由同一次候选保存扣料并放入；取消、关闭、缺料、满包或保存失败不能丢失材料/产物。
- 普通箱是稳定 identity 的 1×1 物件、36 个槽位和默认色加 20 色，不命名、不腐坏；存取复用整组/单件/半组规则，“放入已有堆叠”只补箱内已有类型的现有堆叠，不因存在空格而引入新类型。
- 空箱回收先确认背包能完整接收箱体。非空箱由玩家斧/镐/锄推动时使用有界四向搜索，成功移动同一 identity，失败保持原位；NPC 路径碰撞沿用同一搜索，未传面对方向时按已核实的默认南方向处理。NPC 终局失败才销毁箱体并生成持久内容掉落，箱体不回收；掉落须完整拾取才删除。
- 12 张现有地图显式提供 `Placeable`，Farm 另有 `Buildable`，缺失 mask 全 false；普通箱仅允许 item 白名单区域，普通矿洞和未知 region 默认禁止。出货箱仅限 Farm 2×1 Buildable footprint，不从 Collision 反集、Tillable 或视觉空白推断合法格。
- `WorldOccupancySystem` 统一输出四类状态及受影响 identity；现有作物/资源、静态阻挡、其他物件与角色参与判断。普通箱保留空耕地但拒绝宠物；出货箱清除空耕地并在可行时先迁移宠物。检查、清除/迁移、扣费和创建/移动须在同一个候选内原子完成，未出现的树种/高草/路径/肥料不新增虚构状态。
- 跨日资源复用同一世界 footprint：树受占时保持 cleared 与原 `regrowOnDay`，释放后下一日结再试；石块/杂草在既有 hash 排序和上限截取前过滤受占点，不累计欠额、不改变数量/周期；野采在纯派生候选入口过滤，移物后可按当天原规则重新可见，不写“已采集”或补偿。资源恢复不得推箱、清箱或重抽保存失败的 candidate。
- 新档按 Farm Tiled 点创建 `farm-shipping-bin-default`，初始 cell `(23,14)`、2×1 footprint，之后可移动。全部普通出货箱共享当天队列；可投一个/整组，只显示并允许完整取回最后一次投入，不能读取或取回更早条目。
- 睡眠 candidate 一次性计算出货收入、清空队列并增加 Gold，报告按 Farming/Foraging/Fishing/Mining/Other 分组。保存成功后展示报告，确认操作也经保存；刷新恢复未确认报告，确认前不开放新一天操作，失败重试同一 candidate 不重复发钱。
- 墨子只在西街住宅正式 `building-service` 柜台提供服务；普通日、周二/周五、雨天和过柜窗口均由专属日程 resolver 与实际 NPC 坐标共同决定，Vue 不自行按星期判断。追加出货箱 250g + 150 Wood，即时完成；移动免费，拆除始终保留至少一个普通出货箱。
- Summer 18、节日、Night Market、绿雨由四季 child 在真实 calendar markers 可用时接通；施工日关闭由鸡舍/筒仓、农舍升级 child 在真实 job 出现时接通。本阶段只留清楚的输入合同，不创建无调用方持久字段或宣称特殊日已可玩。
- 仓储命令通过 `StorageCommandSystem` 修改 GameSession 深克隆 candidate；只在保存成功后发布新 snapshot。保存中锁定重复输入，失败显示重试并保持已提交状态。候选、面板焦点、放置预览和菜单持有状态不能另存到 localStorage 或形成第二套玩法 owner。
- 所有新字段只按 current v13 严格解码、地图对账与同版本恢复；旧开发档明确拒绝，不新增迁移、回填或隐藏备份。

### 4. Validation and acceptance boundary

| 情况 | 必须结果 |
|---|---|
| 整理/拆分/合并、制作取消或目标满格 | 工具位置与总量正确，拒绝操作不扣料或丢物 |
| 非法摆放、无法迁移宠物、建筑材料不足 | 世界、农田、宠物、背包和 Gold 都保持原状态 |
| 玩家推箱失败 / NPC 推箱终局失败 | 前者箱物不变；后者仅丢失箱体，内容变为持久可拾取掉落并有明确反馈 |
| 资源点被箱/建筑占用并跨日 | 不覆盖物件，不补刷超额，不改变既有确定性 |
| 出货或日结保存失败后重试 | 重试同一候选，不重复扣物、收费或发收入 |
| 报告未确认时刷新 / current save 非法 identity、容量、颜色或数量 | 前者恢复报告；后者明确拒绝，不覆盖原记录 |
| 桌面、手机、200% zoom、键盘焦点导航 | 能完成完整闭环；暂停与锁输入有效，关闭后焦点可恢复 |

自动检查选择相关 `typecheck`、`build:client`、必要模块/地图解析及 `git diff --check`，不建设新的测试矩阵。真人路线从新 v13 开发档覆盖制作→摆箱→存取→出货→睡眠报告→刷新继续，以及升级/木匠服务、资源占用、NPC 推箱和失败重试。当前工作区实现和最小检查不代替完整浏览器/真人验收；实际结果记录在 child implement.md，未验证部署。

## Historical scenario: surface resource tools v12

### 1. Scope / Trigger

- Trigger：`09-04-surface-mining-v1` 先为小镇共建提供石料来源，再按用户确认补齐《星露谷物语》式开局基础镰刀；两者共用 formal Farm/Foothills/Lakeshore 地表资源链。
- 本场景拥有基础镐/镰刀、石料/植物纤维、一次 impact、确定性掉落、有限每日恢复和 current v12；矿洞、矿石、干草、筒仓、动物、战斗、技能与工具升级不进入范围。

### 2. Signatures

```typescript
type MiningResult =
  | "mined"
  | "missing-target"
  | "depleted"
  | "too-far"
  | "wrong-tool"
  | "inventory-full"
  | "insufficient-stamina";

interface GameState {
  readonly version: 12;
  lastSurfaceStoneRefreshDay: number;
  lastSurfaceWeedRefreshDay: number;
}

class MiningSystem {
  use(state: GameState, targetId: string, itemId: ItemId | ""): MiningResult;
  settleDay(state: GameState): number;
}

type WeedCuttingResult =
  | { code: "cut"; cutCount: number; fiberCount: number }
  | { code: "missing-target" | "depleted" | "too-far" | "wrong-tool" | "wrong-direction" | "inventory-full"; cutCount: 0; fiberCount: 0 };

class WeedCuttingSystem {
  use(state: GameState, targetId: string, itemId: ItemId | "", facing?: Facing): WeedCuttingResult;
  settleDay(state: GameState): number;
}
```

- `ITEM_ID.pickaxe="pickaxe"`、`ITEM_ID.scythe="scythe"`、`ITEM_ID.stone="stone"`、`ITEM_ID.fiber="fiber"`；工具 stack=1，资源 stack=99，stone/fiber 售价为 2g/1g。
- 复用现有 `{ type:"use-item-on-target", itemId, targetId, facing? }`，不增加 mining/scythe-only command kind；Facing 只作为镰刀扇区输入，不由客户端提交命中列表。

### 3. Contracts

- 新游戏 slots 0..4 固定为 hoe、watering-can、axe、pickaxe、scythe；默认仍为空手。v12 只创建/解码 current shape，v1–v11 一律 unsupported，不迁移或备份。
- `MiningSystem` 是 stone phase、距离、体力和掉落的唯一规则 owner；依赖现有 InventorySystem、StaminaSystem、WorldCatalog 和 `stableHash()`。
- 合法采石要求同 region、42px 内、stone phase=standing、背包确实持有并选中 pickaxe、至少 2 stamina 且能完整加入 1 stone。成功顺序为容量校验 → 扣 2 stamina → phase=cleared → +1 stone → 一次 critical save。
- formal stone 数量固定为 Farm 1、Foothills 4、Lakeshore 2。Farm/Lakeshore cleared 永久保持；Foothills 是唯一可持续来源。
- 日结增加 day 后调用 `settleDay`，只从 Foothills cleared 点按 `stableHash(worldSeed, day, "surface-stone:"+entityId)` 排序恢复最多两个；hash 同值按 ASCII stable ID。`lastSurfaceStoneRefreshDay` 使同日重复调用返回 0，已 standing 点不消耗恢复名额。
- Tiled 继续拥有七个坐标和 stable IDs；GameState 只保存 standing/cleared。Phaser 的 RockEntity 只投影 phase、播放震动/碎屑，ActionTimeline impact 只 dispatch 一次。
- 基础镐复用已登记 GARDENS 原图 `(6,1)`；stone 图标由 `item-pixel-art.ts` 的原创 16×16 配方生成，成功结果复用已登记 stone SFX，不增加媒体对象或 Git 图片/音频二进制。
- IndexedDB 当前 save 只 put main record；不再创建 v2/v9 backup。显式删除仍精确清理 main 和两个已知 retired backup key，不枚举其他记录。
- formal weed 数量固定为 Farm 6、Foothills 5、Lakeshore 4。WeedCuttingSystem 是 phase、Facing 扇区、目标上限、掉落与恢复的唯一规则 owner；weed 只允许 standing/cleared 且 `regrowOnDay=null`。
- 合法挥割要求同 region、42px 内、目标位于当前 Facing 的前方 90° 扇区、背包持有且选中 scythe；按距离和 ASCII stable ID 最多清除三株，不调用 StaminaSystem。
- 每株 fiber 用 `stableHash(worldSeed, day, "weed-fiber:"+entityId)%2` 固定判定 50%。先计算总量并通过 `InventorySystem.canAdd`，再统一 cleared/+fiber/一次 critical save；零掉落仍成功，背包不足时全部不变。
- 新日按 `surface-weed:<entityId>` 分区稳定排序，Farm/Foothills/Lakeshore 最多恢复 1/2/1 株；standing 不占名额，Farm 已有 `farmTiles` 的格子跳过。`lastSurfaceWeedRefreshDay` 使同日重复结算为 0。
- WeedEntity 使用源码图元渲染并从 saved standing→cleared transition 播放叶片；FarmingActionPresenter 只画挥割弧线。scythe/fiber 使用源码 16×16 图标，成功 `cut` 复用 harvest cue；无新增媒体对象或二进制。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| pickaxe + nearby standing stone + capacity + stamina | -2 stamina、+1 stone、phase=cleared、一次保存与 stone cue |
| 背包满或 stamina < 2 | inventory/stamina/resource 全部不变，明确错误 |
| wrong tool | 零 domain mutation；clicked rock 可播放轻敲但无成功 cue/碎裂 |
| unknown、跨 region、>42px 或 cleared | 零 mutation，返回 closed result |
| 同一 Foothills 新日首次 settle | 恢复 0..2 个 cleared 点，并写 refresh day |
| 同日再次 settle / 保存失败重试同一 candidate | 恢复 0，不重抽、不多生石块 |
| current stone=stump、regrowOnDay 非 null、refresh day > state.day | current decoder 失败 |
| scythe + facing + 1–3 nearby weeds | stamina 不变，命中全部 cleared，固定 0–3 fiber、一次保存与 harvest cue |
| wrong tool、背向、跨 region、>42px 或 cleared weed | 零 mutation；错误工具只允许轻微 rustle，无成功 cue/叶片 |
| 本次 fiber 总量无法完整入包 | 所有候选 weed、inventory 和 stamina 全部不变 |
| 新日 weed settle | Farm/Foothills/Lakeshore 恢复 0..1/0..2/0..1，跳过农田；同日再次为 0 |
| current weed=stump、regrowOnDay 非 null、任一 refresh day > state.day | current decoder 失败 |
| v11 或更早 envelope | 明确 unsupported；原 IndexedDB record 不覆盖 |

### 5. Good / Base / Bad Cases

- Good：Day 1 第四/第五槽为镐/镰刀；采石使体力 100→98、+1 石料，面向三株杂草挥割最多清除三株、体力保持、固定获得纤维；刷新继续仍保持。
- Base：错误工具只提示；杂草可清除但本次 hash 为零纤维。没有矿洞、干草、战斗、作物挥割或升级承诺。
- Bad：Phaser 自行决定 AoE/掉落、每次 render 随机重抽、背包不足仍部分清草、镰刀扣体力、同日重复恢复，或继续维护旧 migration chain。

### 6. Tests Required

- life-loop contract：formal stone 1/4/2、weed 6/5/4、采石与三株挥割成功、wrong tool/direction、背包满原子性、固定 fiber、current v12 round-trip、v1–v11 unsupported、两个日结 marker 与 GameSession 一次保存。
- town/audio contract：第四/第五 Hotbar 槽可选择；`mined -> stone`、`cut -> harvest`，错误结果静音。
- 最小自动门禁：`test:life-loop`、`test:town-population`、typecheck、client build；Git 游戏媒体二进制增量为零。
- 浏览器从新 origin 正常新建，核对镐/镰刀图标、Farm stone/weed、采矿扣体力、镰刀零消耗、fiber 图标、刷新继续与 console error/warn；Foothills/Lakeshore 全路线和主观手感由真人确认。

### 7. Wrong vs Correct

```typescript
// Wrong: presentation decides the area hit, drop and resource removal.
nearbyWeeds.forEach((weed) => weed.setVisible(false));
gameUiState.inventory.push({ itemId: "fiber", quantity: Math.random() < 0.5 ? 1 : 0 });

// Correct: the existing command reaches the sole domain owner once at ActionTimeline impact.
dispatchLocalGameCommand({
  type: "use-item-on-target",
  itemId: ITEM_ID.scythe,
  targetId: weed.entityId,
  facing,
});
```

## Active Spring v10 contract (human acceptance confirmed 2026-09-03)

### 1. Scope / Trigger

- 用户已批准 2026-09-02 春季完整玩法范围。本节优先于下方历史 v3–v9 场景：实施日程/体力/天气、动态农田、六作物、资源再生、钓鱼、送礼和营业；删除镜门伏笔，不增加剧情/节庆/数据库。

### 2. Signatures

- `GameState.version = StoredGame.version = 10`；`minuteOfDay` 为 360..1560，10 分钟粒度。
- 新命令：`use-item-on-tile`、`refill-watering-can`、`eat-item`、`gift-item-to-npc`、`claim-fishing-rod`、钓鱼 press/release/dismiss、`retry-fishing-save`、`retry-day-settlement`；payload 以 `domain/session/commands.ts` 为准。
- `tick(now, paused, activityPaused)` 返回 `ActionFeedback | null`；`subscribeFishing` 与 `subscribeDaySettlement` 提供不进入存档的防御性 UI 投影。
- 坐标农田键为 `farm:column:row`；允许区域只由 Tiled 提供。
- `facingFromVector(x, y, fallback)` 为输入无关的朝向解析；Phaser 必须用同区域 snapshot 位移同步触摸方向，不能仅从 WASD 读取。

### 3. Contracts

- `GameSession` 是唯一 mutable aggregate，所有新状态只保存在一个 v10 中；Phaser/Vue 消费只读投影。
- 午夜提醒一次，02:00 强制日结；Cottage 外扣 `min(floor(gold/10),1000)`，不丢物品。晚睡恢复下降但不低于50%。
- 日结先生成候选 snapshot，保存失败不得推进日期或重复扣款；失败有明确重试路径。
- `.game-canvas` 占满已定尺寸的 Vue 容器，Phaser 使用 `RESIZE` / `NO_CENTER`，不通过 CSS 拉伸固定尺寸画布；手机方向键、聚焦和 resize 后 `.world-frame.scrollTop` 保持 0。恢复画布焦点使用 `preventScroll: true`。
- v9 原记录在首次 v10 写入的同一个 IndexedDB transaction 中备份；不枚举旧账号、不增加可玩槽。
- 钓鱼只有 casting/waiting 继续岛上计时，reeling/result 暂停；隐藏页面冻结两者且不补算隐藏时间。开始一竿扣 6 体力并保存 attempt；刷新取消 runtime，不返还体力。
- caught 投影附加 `saveStatus: saving/saved/failed`。只有写入成功才能收竿；失败持续显示重试入口，重试不得重新加鱼。escaped 不暴露未获得的鱼名。
- 所有 DOM dialog 的 keydown/keyup 在 App 边界停止冒泡，但不取消按钮原生默认行为；Tab 留在 dialog，钓鱼输入 blur/pointercancel 必须释放。
- HUD 原生 Space/Enter 激活也与 Phaser 捕获隔离；输入转为 locked 时 WorldScene 重置已有 keyboard keys，防止被 dialog 接走的 keyup 导致回到世界后继续移动。
- 方向键长按必须在 modal lock、全局 pointerup/pointercancel、blur、visibilitychange 时停止；首个 nudge 触发弹框后不得再创建 interval，防止按钮禁用吞掉 pointerup 后自动续走。
- 体力上限 100，锄地/砍伐 2、浇水每实际格 1；水壶 20/40 水。雨天新开垦与采收后土壤保持湿润，重复浇水不扣资源。
- Farm `Tillable` 当前 492 格，稀疏 key 必须是规范 `farm:column:row`，不接受前导零或越界。原 8 格迁移到列 27–30、行 18–19。
- Farm 外清桩 7 天再生，Farm 树不再生；枯枝不刷在已有农田上。Foothills 春笋仅每轮 28 天第 4–14 天参与候选，其他地区仍保留零星来源。
- 礼物每日/每周计数按 NPC 保存：1/日、2/周，周日重置，没有全镇总限制。营业 09:00–17:00，休息日优先于雨天覆盖；UI 不另算服务资格。
- Day 7 从祥子免费领取鱼竿，雨天去东岸民宅；不得让提示断言 NPC 此刻必在码头。原始剧情/节庆/品质/矿洞均不进入本版。
- 天气图层与 `AudioDirector -> WeatherAmbience` 只表现 saved weather；后者用原生 Web Audio 合成原创噪声，不新增第三方素材 URL、库或二进制。

### 4. Validation & Error Matrix

- 不可耕/越界/远距/遮挡坐标：无 mutation；不足体力/水/库存：明确失败且原子保持。
- v9 合法记录：原8格按发布坐标迁移，镜门 marker 移除；未知字段值/未来版本：不覆盖原记录。
- 02:00 与床铺竞态：只能一个日结；保存失败重试复用同一候选，不能再次扣钱。
- 鱼获保存失败：结果框保持失败状态，`dismiss-fishing` 被拒绝，`retry-fishing-save` 保存同一背包。
- 菜单/角色创建时 visibilitychange：不调用未开始的 GameSession.tick；显式新游戏只等待旧队列结束，不能因旧失败标记永久禁止重建。

### 5. Good / Base / Bad

- Good：种田、雨天、钓鱼、送礼均可刷新恢复，Day28→29继续春季内容。
- Base：剧情和活动为空，不用虚构入口承诺后续玩法。
- Bad：客户端计算鱼获/扣体力、静默覆盖坏档、重载重抽结果或部署半完成 v10。

### 6. Checks

- 相关检查：life-loop 21 项、town/audio 12 项、typecheck 与 client build 通过；用户于2026-09-03明确确认本批真人验收全部完成。后续改动仍按范围覆盖完整种植/钓鱼/送礼手感、真实 v9 备份、02:00 与 200% 浏览器缩放，不连接服务端数据库。
- 开发 HMR 若仍返回旧 domain 模块，重新构建并用隔离 origin 的 production preview 复验；不能把热更新中 GameSession 重建错误记为生产验收通过。

### 7. Wrong vs Correct

- Wrong：Phaser 更新背包后再按钓鱼动画判断成功。
- Correct：FishingSystem 判定成功并由 GameSession 原子保存，客户端只显示结果。

## Spring art polish v1 (2026-09-03, human review pending)

- 范围为 Cottage、当前 25 个物品与种田动作，保留 v10；不从本表现合同扩展其他地图或玩法。
- `itemIconForItem()` 是 Hotbar、Backpack、Gift、Fishing result 与 Phaser 持物的共享源。原图 frame 使用 `AtlasItemIcon`，原创小图形使用 `PixelArt`；seed badge 复用 `cropForSeed()` 身份，不复制种植规则。
- GARDENS 正式坐标：hoe `(0,2)`、watering `(0,5)`、axe `(0,10)`、seed bag `(6,5)`；旧 Gate A 记录中的部分坐标误指铁锹/镰刀/钳子，不能作为现行依据。
- `FarmingActionPresenter` 只拥有原角色 pose、tool grip、held item 与有限视觉效果；`ActionTimeline -> WorldScene impact -> GameSession` 仍只有一次 mutation。错误反馈不产生成功效果，切图/动作结束清理本实例拥有的 tweens。
- 工具图片翻转时握点也要镜像；各工具使用其原图的手柄/提手位置，不共用一个任意旋转中心。正式角色统一使用 `PlayerAppearance` 驱动的头部、上装、下装三层和同一四方向动作帧合同；当前 v3 原生帧 48×64、脚底 `(24,60)`、世界 scale 0.5，手心 y43 换算为相对脚底的世界偏移 `-8.5`；不再按九种整身预设选择 profile，也不套用另一角色的 plowing sheet。
- Cottage 的 256×128 `cottage-woodwork` texture 由源码配方生成；Tiled metadata 的 PNG 只作为 ignored 编辑缓存，不是运行时 URL 或新 CDN 对象。布局、Collision、床/出口及 `cottage-room-view` 镜头点仍属于 TMJ。
- 即使 Collision 层不渲染，非零 GID 也必须属于当前内嵌 tileset；Phaser 解析全部图层，遗留 GID 会使切图失败。
- Cottage 收紧布局保留所有旧 stable IDs 与宠物锚点；旧坐标撞到新 Collision 时复用既有 `reconcileGameStateWithCatalog()` 安全入口逻辑，不添加迁移。
- 最小检查：typecheck、client build、Tiled/图标结构检查及当前画面；真人手感与审美单独确认，不扩大测试矩阵。

## Shop interiors and safe doorway transitions (2026-09-03)

- 第二批仅覆盖 Seed Shop/Blacksmith 的室内表现和接近路径；保留 NPC、商品、日程与 v10。Town 只允许本次已复现门口缺陷所需的单一落点调整。
- `shop-interiors` 在 256×256 Canvas atlas 内复用 Cottage 原有配方，再添加职业陈设；新图 GID 5001–5256，包括隐藏 Collision。静态摆放与脚部阻挡须一致。
- `fixedInteriorViewAnchorForRegion()` 只返回地图拥有的 camera spawn ID；有 anchor 的室内使用固定 2× 镜头，其余区域继续跟随角色。
- 华强的 home/counter/shelves 必须连通，柜台前有 42px 内的可达交谈点；炉前/架前有 48px 内的可达查看点，其他服务由 domain 决定。
- `WorldCatalog.exitAt()` 当前包含矩形上边界。返回点必须位于入口之外并保留脚部净空，禁止依赖玩家在淡入期间赶快移开来逃离反向触发。
- `WorldScene` 从淡出开始到淡入结束都须持有 `setWorldActionBusy(true)`；仅锁私有 transition phase 无法停止 DOM 方向控制。
- `fadeIntoWorld(durationMs)` 集中恢复画面并释放共享输入锁。拒绝切图也必须走淡入恢复，不得永久停留在黑屏。
- 不新增保存字段、数据迁移或动画框架；本次真实缺陷只增加一条门外落点净空回归检查。

## Ownership

- 唯一应用位于 `apps/mirror-island/`；公开 `/` 只服务一份 Phaser/Vue 单人 client。
- 当前技术栈固定为 Phaser 4 + Vue 3 + TypeScript + Vite + Tiled，不为美术验证迁移 Unity 或 Godot。
- 未来桌面版与 Steam 目标采用 Tauri 2，但当前不引入 Tauri/Rust/Steam 依赖或接口；Web Runtime 与未来 Desktop Runtime 只通过 adapter 边界解耦。
- `domain/` 拥有 GameSession、GameState、命令、物品、配方、Inventory/Gathering/Crafting/Farming 和 SaveRepository 合同。
- `client/` 负责 Phaser 输入/表现、Vue UI 和 IndexedDB adapter；`server/` 只保留论坛 SSO、health 与未来非实时 API。
- RPGJS 和 Colyseus 多人切片已分别通过 checkpoint tag 封存，单人分支不保留双运行时。

## Runtime contract

```text
Phaser/Vue -> typed GameCommand -> GameSession -> pure domain mutation
           -> immutable snapshot -> Phaser/Vue
           -> SaveRepository -> IndexedDB
```

- 实时玩法不调用 WebSocket、matchmaking、服务端 tick、Prisma 或 PostgreSQL。
- GameSession 是唯一 mutable aggregate；Phaser/Vue 只能发送命令和订阅只读 snapshot。
- Inventory/Gathering/Crafting/Farming 不导入 Phaser、Vue、IndexedDB、Keycloak、Prisma 或 Node API。
- Item/Recipe/phase 的 decoder 和 reducer 只有一个 owner，不在 UI 重复判断状态转换。

## Local persistence

- SaveRepository 暴露 `has/load/save/delete`，domain 不知道 IndexedDB。
- IndexedDB adapter 使用固定 DB `mirror-island-local`、store `game-saves`；当前工作区 save schema v10 保留 v9 宠物并增加春季玩法字段。旧 v1–v9 通过显式幂等 decoder 迁移，v9 原始记录在首次 v10 写入时同事务备份；不使用 localStorage 保存玩法。
- save value 包含 schema version、updatedAt、玩家、背包、资源、农田和 friendship；读取从 unknown 完整验证，未来/损坏版本明确失败。
- token、ticket、密码、Keycloak 对象、数据库 URL 和 secret 禁止写入 IndexedDB；当前 Web 试玩 ownerKey 由 client session adapter 以固定 opaque 值 `local-playtest-v1` 提供，不生成用户或设备身份。
- 关键玩法事件立即排队保存，移动使用有界 debounce，页面隐藏/退出调用 flush；不得逐帧写盘。
- 持久化拓扑固定为 `GameSession -> SaveRepository -> IndexedDB（当前 Web）/ FileSystem（未来 Tauri）`；当前只实现 IndexedDB，不把 filesystem、Rust command 或桌面路径渗入 domain。

## Scenario: generation-safe local session shutdown

### 1. Scope / Trigger

- Trigger：Vue/HMR 或页面重新挂载可能在旧 GameSession 的异步 `flush()` 尚未完成时初始化新会话；旧清理不得关闭新 IndexedDB adapter、停止新 projection 或把新 UI 清为 Day 0。

### 2. Signatures

```typescript
async function shutdownLocalGameSession(): Promise<void>;
```

### 3. Contracts

- shutdown 开始时一次捕获当前 `session`、`repository` 与 `stopStoreProjection`，并同步把三个模块级 active handle 置空，使后续初始化拥有独立新一代资源。
- 只对捕获的旧 session 执行 `flush()`；无论 flush 成功或失败，`finally` 都只停止捕获的旧 projection、关闭捕获的旧 repository。
- 旧 flush 完成后仅当模块级 `session` 仍为空才调用 `clearGameState()`；期间已初始化新会话时禁止清空其 snapshot。
- 不引入 generation ID、存档字段或第二个 repository owner；资源身份由捕获的对象引用区分。
- `WorldScene` 的 `SHUTDOWN` 发生在 Scene systems 仍可用时，可显式取消 timeline/销毁 region views；`DESTROY` 只解绑 GameSession/UI 外部状态并让 Phaser 自己销毁 GameObjects，禁止再读取 `container.scene.tweens`。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 当前没有会话 | 幂等完成并清理 transient UI |
| 旧 flush 完成前没有新初始化 | 关闭旧 adapter、停止旧 projection、清空 UI |
| 旧 flush pending 时初始化新会话 | 旧 shutdown 完成后新 session/repository/projection 与 UI 保持可用 |
| 旧 flush reject | 释放旧 projection/adapter 后原样 reject；不得触碰已存在的新会话 |
| Phaser 直接触发 Scene `DESTROY` | 不手动遍历实体，console 无 detached Scene/tween 错误 |

### 5. Good/Base/Bad Cases

- Good：HMR 卸载 A，A flush pending；B 初始化并 publish Day 2；A 随后完成，只释放 A，界面仍为 B 的 Day 2。
- Base：正常页面退出没有后继会话，旧存档 flush 后清空 transient store。
- Bad：await 旧 flush 后再读取模块级 `repository`/`stopStoreProjection`，从而关闭 B；或无条件 `clearGameState()` 显示 Day 0/0g。

### 6. Tests Required

- 有低成本 client lifecycle harness 时，用 deferred repository 交错执行 A shutdown 与 B initialize，断言 B projection 继续更新且 B repository 未关闭。
- flush reject 分支断言旧资源仍释放、Promise reject、新会话不受影响；真实 HMR 检查还要覆盖 `SHUTDOWN`/`DESTROY` 两种路径且 console 无 detached Scene 错误；日常最小门禁保留 client typecheck。

### 7. Wrong vs Correct

```typescript
// Wrong: globals may already belong to a newer session after await.
await session?.flush();
stopStoreProjection?.();
repository?.close();
clearGameState();

// Correct: release only the generation captured before awaiting.
const activeSession = session;
const activeRepository = repository;
const activeStop = stopStoreProjection;
session = repository = stopStoreProjection = null;
try {
  await activeSession?.flush();
} finally {
  activeStop?.();
  activeRepository?.close();
  if (!session) clearGameState();
}
```

## Scenario: atomic IndexedDB v2 backup before v3 switch

### 1. Scope / Trigger

- Trigger：生产首次把已发布 v2 browser save 写回 v3；必须保留可 forward-fix 的原始 v2，而不改变 SaveRepository port 或 IndexedDB schema。

### 2. Signatures

```typescript
interface IndexedDbGameRecord {
  readonly key: string;
  readonly game: unknown;
}

interface IndexedDbSaveWritePlan {
  readonly main: IndexedDbGameRecord;
  readonly backup: IndexedDbGameRecord | null;
}

function planIndexedDbSave(
  mainKey: string,
  existingMain: IndexedDbGameRecord | undefined,
  existingBackup: IndexedDbGameRecord | undefined,
  validatedGame: StoredGame,
): IndexedDbSaveWritePlan;
```

### 3. Contracts

- main key 仍为 `ownerKey:slotId`；backup key 固定为 `ownerKey:slotId:backup:v2`。
- `load()` 只从 main key 读取并用 `decodeStoredGame` 返回 v3；backup 不成为 slot。
- `save()` 先验证传入 v3，再在一个 readwrite transaction 中同时读取 main/backup；仅当 main raw envelope 为 version 2 且 backup 缺失时，原样 put backup，然后 put v3 main。
- 两个读取 request 必须在 transaction 创建后立即发出；两个 onsuccess 都到达后同步排队 put，不在中间 await 导致 transaction inactive。
- backup 已存在、main 已是 v3或主记录不存在 → 只写 main。
- `delete()` 在一个 transaction 删除 main 和 scoped backup；其他 owner/slot 不受影响。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 待写 game 不是合法 v3 | transaction 创建前失败，现有 main/backup 不变 |
| main 是 v2、backup 缺失 | 同 transaction 写 exact raw v2 backup + v3 main |
| main 是 v2、backup 已存在 | 保留首次 backup，只写 v3 main |
| 任一 IDB request/put/transaction 失败 | transaction abort/reject，不允许半迁移 |
| 显式 delete | 删除 main + backup，不保留隐藏用户数据 |

### 5. Good/Base/Bad Cases

- Good：v2 continue 解码、catalog reconcile 成功后，首次 critical save 原子留下原始 v2 并切换 v3。
- Base：全新本地试玩槽与后续 current saves 沿用原 main key，不产生 backup。
- Bad：`load()` 先覆盖 main 再进入 GameSession，或先写 v3 后用另一个 transaction 补 backup。

### 6. Tests Required

- 纯 write-plan 合同断言首次 v2 生成 exact backup、已有 backup 不覆盖、v3/new 不备份、delete keys 仅两条 scoped key。
- Life Loop v2→v3 幂等 domain 合同继续通过。
- typecheck、client build；原子 v2→v3 保留由确定性 fixture 验证，当前生产人工验收聚焦新本地试玩槽的新游戏、继续和刷新恢复。

### 7. Wrong vs Correct

```typescript
// Wrong: main can be overwritten before recovery evidence exists.
await put(mainKey, migratedV3);
await put(backupKey, rawV2);

// Correct: IndexedDB commits both writes or neither write.
const transaction = database.transaction("game-saves", "readwrite");
store.put({ key: backupKey, game: rawV2 });
store.put({ key: mainKey, game: validatedV3 });
```

## Preserved backend boundary

- Keycloak 26.7.1、oidc-provider 9.11.1、Prisma 7.9.1、PostgreSQL 17、论坛跨 Compose 网络、CDN 和部署设施继续保留；公开 Web 客户端不再依赖 `keycloak-js`。
- 后端近期只保留论坛 SSO、health 和未来非实时 API 边界；当前试玩客户端不调用它们，云存档、成就和排行榜另行规划。
- 现有九表基线不修改。新表/字段/migration 必须先单独评审并获批准。

## Scenario: future Tauri SaveRepository adapter gate

### 1. Scope / Trigger

- 仅当用户单独批准桌面阶段时，才允许为 Tauri 2 增加 FileSystem adapter；当前 Web/Farm 美术任务不得触发。

### 2. Signatures

```typescript
interface SaveRepository {
  has(ownerKey: string, slotId: string): Promise<boolean>;
  load(ownerKey: string, slotId: string): Promise<StoredGame | null>;
  save(ownerKey: string, slotId: string, game: StoredGame): Promise<void>;
  delete(ownerKey: string, slotId: string): Promise<void>;
}
```

### 3. Contracts

- Web 继续注入 `IndexedDbSaveRepository`；未来桌面 shell 只注入另一个 `SaveRepository` implementation。
- 两个 adapter 共用 `StoredGame`、`SAVE_FORMAT_VERSION` 与 `decodeStoredGame`；不得增加 platform 字段、Rust payload 或素材 frame 字段。
- 当前没有 Tauri env key、command signature、filesystem path 或 Steam identifier。

### 4. Validation & Error Matrix

- 空 `ownerKey`/`slotId` → adapter 明确失败，不读写共享默认槽。
- 损坏、未来版本或非法 `updatedAt` → `decodeStoredGame` 失败，原记录不覆盖。
- adapter 打开/事务/文件写入失败 → Promise reject，由应用错误状态处理，不回退到另一存储后端。

### 5. Good/Base/Bad Cases

- Good：未来 Tauri shell 注入 FileSystem adapter，GameSession 与存档格式零改动。
- Base：当前 Web 继续只使用 IndexedDB。
- Bad：在 GameSession 中检测 `window.__TAURI__`，或把桌面文件路径写进 GameState。

### 6. Tests Required

- 真正实现 FileSystem adapter 时，至少验证相同 `StoredGame` round-trip、owner/slot 隔离、损坏记录失败和原子替换；本阶段没有实现，因此不新增测试。

### 7. Wrong vs Correct

```typescript
// Wrong: domain selects one platform-specific backend.
const repository = window.__TAURI__ ? new FileRepository() : new IndexedDbSaveRepository();

// Correct: the runtime shell injects the existing port.
const session = new GameSession(runtimeSaveRepository, ownerKey, worldCatalog);
```

## Stardew Core scope

- 第一批：GameSession、IndexedDB、背包/采集/制作/种田本地化，代码绘制场景可接受。
- 第二批 World Foundation 严格拆为 A：Tilemap Foundation，B：World Entities + ActionTimeline，C：Visual Pass；不并行铺昼夜、经济或 NPC 日程。
- 第三批当前收窄为 `Stardew Life Loop 第一批`：Day、Gold、床睡觉、按天成长和 Seed Keeper 单商品买卖；不顺势加入 Season、完整时钟、昼夜、天气或更多 NPC。
- World Foundation 与 Farm Showcase 已由用户在 2026-08-25 的生产真实浏览器清单中确认通过，第三批实施门槛已解除。
- 长期产品方向仍是家园生活 + 灵兽培养 + 轻撤离探索 + 肉鸽事件 + 阶段性守家 + 东方志怪；当前继续 Stardew/Town，并仅额外批准 presentation-only 的空手 NPC 击打反馈，不构成敌人、伤害或战斗系统授权。未经新的明确批准不得创建 Expedition task、map、Cargo、敌人或捕获代码。
- `One Beautiful Slice`、Farm Gate A/B/C、Town Gate A/B/C 与三名 NPC 均已通过并进入生产；用户已于 2026-08-28 批准 `Town 世界元素扩展 v1`：增加铁匠工坊、五栋可进入公共区的民宅、静态阻挡的私人内屋、北侧山麓与南侧湖岸，但不实现工具升级、好感解锁、采矿、钓鱼或新经济。
- Ninja Adventure 从正式场景美术降级为开发/占位资源，不再为它进行 Gate C 级精修；Gate A 构图确认仍可使用现有占位画面。
- VectoRaith Farming Sim v1.08 已从 visual prototype 转为生产 Farm/Town 底座；运行时直接读取 6 张官方 Original/16×16 PNG，候选/旧 packed 流程不再是活跃实现面。
- Gate C 视觉样板已通过并冻结为 `docs/checkpoints/farm-showcase-v1/`，并正式成为生产 Farm v1；停止继续增加装饰。该 checkpoint 不等于 World Foundation 或完整世界美术完成。
- Town Gate A 已通过 reference study、40×30 空间蓝图和 ignored 候选视觉确认；正式 Town 固定为西入口→弯曲主街→桥头粉色地标→唯一河桥→Seed Shop，并保留南侧小巷与河畔次区回路。未经真实碰撞问题不得重开大构图。
- Town Gate B 建筑密度已于 2026-08-26 通过用户视觉确认：正式 40×30 Town 固定为 1 个蓝顶杂货铺、1 个红色大体量铁匠铺和 5 栋民宅，共 7 个建筑体量；石质粮仓已明确否决。允许橙顶/棕顶民宅非相邻复用，但相邻建筑不得完全同形；新增住宅只用短支路接入，河流、唯一桥、粉树广场、西入口、Seed Shop 出口和 5 个 stable object 保持不变。
- Town Gate C 已于 2026-08-26 通过用户视觉确认：生活感只通过成组静态 Props 建立，杂货铺使用货箱/招牌/门槛，铁匠铺使用灯具/木料/矿石，五栋民宅使用至少三类非均匀院落，粉树广场保留单一公告设施，桥头只放少量引导物。正式 Town 停止继续增加建筑或均匀铺装饰；后续只因真实通行、Collision、AbovePlayer 或功能入口问题窄修。
- Town Population MVP 已于 2026-08-27 通过生产人工验收：华强复用现有 Shop，昊天与阿禾使用线性 Dialogue，统一 modal lock、防出口触发和脚底碰撞均成立；后续输入精简为点击邻近 NPC 交互，当前世界交互不再注册 E；该验收不授权 NPC 日程、好感、任务或铁匠功能。
- 用户于 2026-08-28 批准 `Town 家庭与居民 v1`：五栋民宅各增加一名固定 dialogue NPC——墨子、浩南、阿澜、昊美丽、祥子；阿澜与阿禾、昊美丽与昊天只通过住址和对话表达家庭关系，不增加 Relationship、日程、好感、送礼或持久 NPC 状态。
- 用户于 2026-08-28 后续批准 `Town 时间与 NPC 日程 v1`：增加 06:00–24:00、8 秒/10 分钟的 GameSession 时钟和八名 NPC 四段固定日程；允许 v3→v4 存档迁移，但仍不增加 Season、天气、体力、好感、送礼或 NPC 寻路动画。
- 用户于 2026-08-28 继续批准 `NPC 日程移动 MVP`：同区域日程切换使用 Collision 网格短路径，跨区域只做离场/到场淡入淡出；瞬时位置由 GameSession runtime 拥有，不进入 StoredGame v4。
- 用户于 2026-08-28 批准 `NPC 轻量环境动作 MVP`，并后续确认补齐八人：华强营业、昊天锻造、阿禾照料、墨子修缮、浩南巡山、阿澜观湖、昊美丽整理、祥子巡视码头只在 day 到岗后运行；浩南/祥子使用 Tiled 短巡逻路线，其余六人为 body-local 两相表现。
- 用户于 2026-08-28 批准 `NPC 动态避让 MVP`：walking 遇玩家/居民立即等待，600ms 后尝试临时 tile 绕行，无旁路时持续等待，永不推人、穿人或瞬移。
- 用户于 2026-08-28 批准 `昼夜视觉变化 MVP`：现有 minuteOfDay 驱动晨/昼/暮/夜 CSS atmosphere；室外 24:00 最大 0.44 靛蓝遮罩、室内最大 0.12，HUD/modal 不受影响，路灯/点光源继续延期。
- 用户于 2026-08-28 批准 `基础好感与每日交谈 MVP`：八名 NPC 采用 250点/心、十心封顶、每日首次交谈 +20、漏聊 -2、满心停止衰减；StoredGame v5 持久化，Social 名册只显示心数/关系/今日状态，送礼和两心内屋继续延期。
- Town 任务若主动推迟玩家可感知能力，归档前必须把能力、依赖和实施触发条件登记到 `docs/TOWN_ROADMAP.md`；路线图是防遗忘清单，不替代独立 PRD，也不自动扩大当前实现范围。

## Scenario: Town Population MVP

### 1. Scope / Trigger

- Trigger：`life-loop-v1` 与 Town Gate C 已封存，需要用三个固定 NPC 验证小镇从静态地图变为生活空间。
- 本场景只拥有华强、昊天、阿禾、线性 1∼3 句对话、现有 Seed Shop 人格化入口、统一模态锁和固定脚底碰撞；不包含日程、好感、任务、分支、铁匠功能或持久 NPC 状态。

### 2. Signatures

```typescript
interface NpcSpawnDefinition extends WorldPoint {
  readonly entityId: string;
  readonly regionId: string;
  readonly npcId: string;
  readonly dialogueId: string;
  readonly interactionType: "shop" | "dialogue";
}

interface DialogueDefinition {
  readonly id: string;
  readonly speaker: string;
  readonly lines: readonly [string, ...string[]];
}

interface DialogueProjection {
  readonly speaker: string;
  readonly lines: readonly string[];
  readonly lineIndex: number;
}
```

### 3. Contracts

- 已发布华强保持 `entityId=seed-shop-keeper`、`npcId=seed-keeper`、`dialogueId=seed-keeper-welcome`，只补 `interactionType=shop`；不得为商店再造第二套入口。
- Town 新增且只新增 `town-blacksmith`（昊天）和 `town-resident-01`（阿禾），均为 `interactionType=dialogue`；坐标属于 Tiled，stable ID 不随移动改变。
- `interactionType` 是 decoder 必填枚举；WorldScene 以它分派现有 ShopPanel 或 DialoguePanel，ShopSystem 仍以 `seed-shop-keeper`、region 与 42px 距离验证买卖命令。
- Dialogue 只在 Vue transient state 中保存当前行；不进入 GameSession、StoredGame、IndexedDB 或 domain command。
- `isWorldInputLocked()` 在 Shop、Dialogue 或休息确认框打开时为 true，统一阻止 movement、interaction 与 exit transition；Dialogue 只通过界面按钮推进，最后一句关闭并恢复输入。
- 固定 `dialogue` NPC 使用约 5×3px 脚底半径；`shop` NPC 不新增脚底阻挡，避免已发布 Seed Shop 旧位置存档被困。
- 正式 NPC 图来自 VectoRaith NPC v1.6 DEMO 的完整 `DEMO/16x16/generic_people.png`：192×256、17354 bytes、SHA-256 `eb1fe419def5a351cfc147a8273b133f1e7daaa9f59a418fe4a7d3f8d7d67ba0`；Git 不跟踪 PNG，运行时只读 immutable CDN 原始 bytes。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| NPC 缺少/使用未知 `interactionType` | 地图解码失败，世界不启动 |
| `dialogueId` 不在 catalog | 显示固定错误 feedback，不打开空 modal |
| Dialogue/Shop 已打开时重复点击 NPC | 不创建第二 modal；当前 modal 保持唯一 |
| Shop 打开但玩家不在华强 42px 内 | ShopSystem 返回 `not-at-shop`，gold/inventory 不变 |
| NPC frame 缺失 | EntityFactory 明确失败，不回退 Ninja shopkeeper |
| NPC 脚底堵住 reviewed route | 路线门禁失败，不提交/部署 |
| NPC CDN bytes/hash 不匹配 | prepare/deploy 失败，不加载未知素材 |

### 5. Good/Base/Bad Cases

- Good：玩家从 Farm 进入 Town，先点击阿禾并完成两句对话，找到昊天，再进入 Seed Shop 点击华强打开原子买卖面板。
- Base：Dialogue 用按钮逐句推进，Shop/Dialogue 期间世界停止响应，关闭后恢复；刷新不保存任何对话位置。
- Bad：Vue 直接修改 gold、按 `entityId` 硬编码多个商店分支、把 sprite frame 写进 save，或引入 DialogueGraph/Quest/Schedule 框架。

### 6. Tests Required

- 正式四地图 decoder 断言 Town 两名 dialogue NPC、Seed Shop 一名 shop NPC、全局 stable ID 唯一及非法 `interactionType` 失败。
- WorldCatalog 断言 Town NPC 脚底阻挡、华强不阻挡旧位置、三人均有 42px 内可达交互点，Farm↔Town/桥/商店路线不回退。
- transient modal 合同断言对话逐句关闭、Shop 欢迎语、统一输入锁和关闭恢复；Life Loop 原子买卖合同继续通过。
- `prepare:media`、NPC/ Life Loop 窄合同、typecheck、client build、manifest totals、Git 图片二进制为 0；生产最终由 30∼60 秒真实浏览器验收。

### 7. Wrong vs Correct

```typescript
// Wrong: UI guesses identity and owns shop/economy state.
if (npc.entityId === "some-shopkeeper") snapshot.gold -= 20;

// Correct: Tiled declares interaction; UI reuses the existing command owner.
if (npc.interactionType === "shop") openShop(dialogue.lines[0]);
session.dispatch({ type: "buy-item", itemId: "turnip-seed", quantity: 1 });
```

## Scenario: Town clock and fixed NPC schedules

### 1. Scope / Trigger

- Trigger：五栋住宅与八名固定 NPC 已成立，需要用可见时间让住宅、工作地点、山麓和湖岸形成日常生活网络。
- 本场景拥有单日时钟、四段 anchor 目标、活跃 NPC 碰撞和 Seed Shop 白天营业；后续 NPC runtime 如何在 anchor 之间移动由下一场景覆盖，不改变本场景的持久时间和目标合同。

### 2. Signatures

```typescript
interface GameStateV4 {
  readonly version: 4;
  day: number;
  minuteOfDay: number; // 360..1440, step 10
}

type NpcSchedulePhase = "morning" | "day" | "evening" | "night";

function activeNpcSpawns(
  catalog: WorldCatalog,
  minuteOfDay: number,
): readonly NpcSpawnDefinition[];

function GameSession.tick(now?: number, paused?: boolean): void;
```

### 3. Contracts

- 时间由 GameSession 唯一拥有：新游戏/睡觉为 360，10 分钟一步，1440 冻结；现实 8000ms 推进一步，单 tick elapsed 最多消费 1000ms。
- modal、ActionTimeline、transition 通过 `paused=true` 切断 wall-clock 累积；恢复时不补算后台或暂停时间。
- minuteOfDay 在 v4 引入并由当前 GameState/StoredGame v5 原样保留；v3 完整验证后补 06:00 并继续迁移 v5，minute 必须可被 10 整除。
- Tiled SpawnPoints 拥有 schedule anchor 坐标；domain registry 只引用 regionId/spawnId。NpcSpawns 仍唯一拥有 entityId/npcId/dialogueId。
- 初始/恢复 reconcile 使用 schedule resolver；会话开始后的 movement、WorldScene 与 ShopSystem 必须消费 GameSession 的同一个 active NPC runtime projection，禁止 Phaser 单独移动 sprite 或留下旧脚底碰撞。
- 华强仅 day phase 投影为 `shop`，其他 phase 投影为 `dialogue`；买卖命令必须在当前 active counter 的 42px 内。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| minute 非安全整数、越界或非 10 分钟粒度 | save decode 失败，原记录不覆盖 |
| v3 save | 迁移到 v4 06:00，其他 state 字段保持 |
| pause / 后台长间隔 | 更新时间基线，不推进、不追赶 |
| 24:00 后 tick | 保持 24:00，等待主动睡觉 |
| schedule 缺 anchor、anchor 被 tile 阻挡或同 phase 重叠 | 启动 validation 失败 |
| NPC anchor 改变但 entityId 相同 | GameSession 为同一 identity 创建 transient route/transfer，identity/dialogue 保持 |
| 华强不在 day counter | 只对话，ShopSystem 返回 `not-at-shop` |

### 5. Good/Base/Bad Cases

- Good：09:00 时启动白天路线；到场后浩南位于山麓、祥子位于码头、华强在柜台可交易；17:00 同一 identity 开始前往 evening anchor。
- Base：对话打开一分钟现实时间后关闭，游戏 minute 不变；睡觉后 Day+1 且 06:00。
- Bad：Vue 自增时间、在 Phaser hardcode 像素日程、复制同一 NPC 实体，或只换 sprite 不换 movement collision。

### 6. Tests Required

- v3→v4 06:00、v4 幂等、非法 minute、8 秒步长、pause、24:00 freeze、sleep reset。
- 四个 phase 各断言八名 NPC identity 唯一、region anchor、无 tile 阻挡/重叠；active interaction range 可达。
- 华强 morning/evening 为 dialogue、day 为 shop；买卖只在 day counter 成功。
- Life Loop、Town、v2 backup、typecheck、client build；不扩建天气/好感测试。

### 7. Wrong vs Correct

```typescript
// Wrong: renderer invents a second schedule and collision remains at the TMJ base point.
npcSprite.setPosition(304, 240);

// Correct: GameSession owns the runtime projection consumed by every live-system caller.
const active = session.activeNpcSpawnsInRegion(regionId);
catalog.isBlocked(regionId, x, y, 5, 4, active);
```

## Scenario: NPC schedule movement MVP

### 1. Scope / Trigger

- Trigger：固定日程已成立，但时段边界瞬移使小镇缺少生活感；需要在不升级存档、不引入跨地图导航系统的前提下补齐可见移动。
- 本场景拥有同区域 Collision 短路径、跨区域 transfer、统一 runtime projection 和移动期间商店资格；动态避让与环境动作分别由后续场景扩展，不改变基础路线合同。

### 2. Signatures

```typescript
type NpcMotionKind = "idle" | "walking" | "waiting" | "leaving" | "arriving";

interface NpcRuntimeSpawn extends NpcSpawnDefinition {
  readonly opacity: number;
  readonly motion: NpcMotionKind;
}

function findNpcPath(
  collision: CollisionGrid,
  start: WorldPoint,
  end: WorldPoint,
  avoidedPoints?: readonly WorldPoint[],
): readonly WorldPoint[] | null;

function GameSession.activeNpcSpawnsInRegion(regionId: string): readonly NpcRuntimeSpawn[];
```

### 3. Contracts

- `NpcMotionRuntime` 是 GameSession 下的 transient owner；`GameState`、StoredGame v5、IndexedDB key/store/backup 和 save decoder 均不增加 NPC 坐标或 motion 字段。
- new/continue/sleep 直接 reset 到当前 schedule anchor；刷新不回放未完成路线，睡觉不播放跨日回家动画。
- 同区域 anchor 变化使用精确锁定的 `easystarjs@0.4.4` 同步模式和四方向 Collision grid；该 CommonJS 包必须通过默认导入后实例化 `.js`，具名 `js` 导入在 Node ESM 合同测试中不可用；路径保留精确 Tiled 起终点，中间使用 tile center，无路径时降级为 transfer。
- walking 以 48px/s 消费 waypoints；transfer 总时长 360ms，前 180ms 只属于旧区域并淡出，后 180ms 只属于新区域并淡入，同一 identity 不双重投影。
- `GameSession.tick(now, paused)` 复用现有单 tick 1000ms 上限；paused 时只刷新基线，时钟与 motion 都不推进、不追赶后台时间。
- movement collision、WorldScene click/hit/render 和 ShopSystem 只读取 GameSession runtime projection；Phaser 不自行 tween 玩法坐标。
- walking/leaving/arriving 一律投影为 `dialogue`；只有 idle target 恢复 schedule interactionType，因此华强到 day 柜台后才可交易，离柜开始后立即失去交易资格。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 起终点在 Collision grid 外 | path adapter 明确失败，启动/日程合同错误可见 |
| 终点被阻挡或不存在可达路径 | 返回 `null`，runtime 使用同区域 transfer 到达目标 |
| EasyStar 同步 callback 未在 `calculate()` 内完成 | 明确抛错，不把异步竞态带入 tick |
| tick paused、负 delta、非有限 delta | motion 不推进；恢复后从当前 runtime 位置继续 |
| walking/transfer 期间发起买卖 | ShopSystem 返回 `not-at-shop`，gold/inventory 不变 |
| Scene teardown 或切图 | 临时 NpcEntity 销毁；GameSession runtime 和存档均不受 Phaser tween 影响 |

### 5. Good/Base/Bad Cases

- Good：墨子在 Town 内沿道路走向傍晚 anchor，画面位置、点击命中和玩家脚底碰撞同步移动；到点后恢复 idle。
- Base：阿禾从住宅去 Town 时旧区域淡出、新区域淡入；刷新期间只按当前 minute 重建到目标 anchor。
- Bad：WorldScene 自己 tween sprite、movement 仍碰撞终点，或把 waypoint/progress 写入 StoredGame 以恢复动画。

### 6. Tests Required

- 正式 Town catalog：一个同区域 resident 从 walking 中间位置最终精确落到目标 anchor；一个跨区域 resident 在 transfer 中点切换 region 且始终只有一个 projection。
- Life Loop：华强在 09:00 route 开始时为 dialogue/`not-at-shop`，paused tick 位置不变，到柜 idle 后交易成功。
- Path adapter：被完整阻隔的网格返回 `null`；类型检查与 client build 证明 EasyStar CommonJS/内置 typings 可被当前 Vite/TS 配置消费。
- 不新增 DB、migration、图片或 E2E；真实浏览器人工检查走动、淡出/淡入、对话/击打和碰撞体感。

### 7. Wrong vs Correct

```typescript
// Wrong: renderer animates one position while gameplay still resolves the schedule endpoint.
sprite.setPosition(nextAnchor.x, nextAnchor.y);
const blocked = catalog.isBlocked(regionId, x, y, 5, 4, scheduledNpcs);

// Correct: every live consumer reads the same GameSession-owned transient projection.
session.tick(now, paused);
const active = session.activeNpcSpawnsInRegion(regionId);
renderNpcs(active);
catalog.isBlocked(regionId, x, y, 5, 4, active);
```

## Scenario: NPC lightweight environment activities

### 1. Scope / Trigger

- Trigger：八名 NPC 已有工作地点和移动 runtime，需要用低成本环境行为表达职业/地点关系，而不提前建设职业服务、任务或持久 NPC AI。
- 本场景拥有八名 NPC 的 morning/day/evening/night activity；工作日/休息日、天气/节日特殊动作继续延期，walking 避让由下一场景统一处理。

### 2. Signatures

```typescript
type NpcActivityKind =
  | "serve"
  | "forge"
  | "tend"
  | "repair"
  | "mountain-patrol"
  | "observe"
  | "organize"
  | "dock-watch"
  | "stock"
  | "close"
  | "prepare"
  | "tea"
  | "record"
  | "sew"
  | "rope-check";

interface NpcRuntimeSpawn extends NpcSpawnDefinition {
  readonly activity: NpcActivityKind | null;
  readonly activityPhase: 0 | 1;
}

function npcActivityAt(
  catalog: WorldCatalog,
  npcId: string,
  minuteOfDay: number,
): NpcActivityPlan | null;
```

### 3. Contracts

- `npc-activities.ts` 是 identity → phase → activity/route 的唯一 registry；Phaser 不按 npcId/phase 复制活动规则。
- day 保持华强=`serve`、昊天=`forge`、阿禾=`tend`、墨子=`repair`、浩南=`mountain-patrol`、阿澜=`observe`、昊美丽=`organize`、祥子=`dock-watch`；morning/evening/night 使用 prepare/stock/close/tea/record/sew/rope-check 与可复用既有 kind 表达备工、收店、观察和居家。
- 浩南 route 从 `npc-haonan-trail` 出发，经 `npc-haonan-patrol-mid`、`npc-haonan-patrol-lookout` 闭环；祥子 route 从 `npc-xiangzi-dock` 出发，经 east/west 两点闭环。坐标只属于 Tiled SpawnPoints。
- patrol 每点停留 2400ms，再复用既有 EasyStar 四方向路径；schedule phase 变化立即取消 ambient loop，从当前 runtime 坐标前往新 anchor。
- `activityPhase` 每 400ms 在 0/1 间切换，并只随 pause-aware GameSession tick 推进；刷新/continue/sleep 从当前 schedule target 重建，不保存进度。
- 阿禾/阿澜与昊天/昊美丽 night 均使用 `tea`；同一 phase transition 将各自 cadence 从0同步启动，不增加 pair/group owner、互相等待或额外寻路。
- walking/transfer 期间 arrival activity 不投影；NPC 抵达当前 phase anchor 并 idle 后才开始 stationary activity。day patrol 是唯一允许 walking 时保留 activity 的 ambient route。
- NpcEntity 只根据 activity/phase 偏移 body 并显示单字动作标记；container、点击、击打、depth 和碰撞继续使用 GameSession runtime 坐标。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 任一 identity 缺 activity phase 或 registry identity 不在 schedule | 启动失败 |
| activity region 与对应 phase schedule region 不同 | 启动失败 |
| patrol 第一项不等于对应 phase schedule anchor | 启动失败 |
| route point 缺失、被 Collision 阻挡或任一闭环 leg 不可达 | 启动失败，不在运行时瞬移兜底 |
| walking/leaving/arriving 属于 schedule transition | activity 为 null，抵达 phase target 后才建立 arrival activity |
| modal/action/region transition paused | activity cadence、dwell 和 patrol position 均不推进 |

### 5. Good/Base/Bad Cases

- Good：浩南白天闭环巡山，傍晚抵镇后记录；阿禾/阿澜夜间同屋同步显示两相喝茶动作。
- Base：墨子白天/傍晚修缮，夜间回家整理；17:00 离岗开始后旧活动立即消失，抵达后再建立新活动。
- Bad：WorldScene 按 npcId/phase 硬编码 tween，建立双人 group 状态，或把 activity/progress/routeIndex 写进 StoredGame。

### 6. Tests Required

- 正式 12-region catalog 调用 schedule/activity validators，断言八人四时段 activity region 与 schedule 一致，并保留四个巡逻 SpawnPoints。
- runtime 断言 400ms activity phase、家庭 night cadence 同步、phase transition 到达前 activity=null，以及浩南/祥子 day patrol 精确到下一个 Tiled point。
- typecheck 与 client build；不增加数据库、身份、Life Loop 全套、E2E 或图片检查矩阵。
- 真实浏览器人工检查单字标记、body-local 动作、巡逻路线和对话/击打暂停体感。

### 7. Wrong vs Correct

```typescript
// Wrong: presentation owns an untracked route and moves only the sprite container.
if (npc.npcId === "town-resident-haonan") scene.tweens.add({ targets: npc.container, x: 424 });

// Correct: domain resolves semantic phase activity and the existing runtime owns every cadence/route.
const activity = npcActivityAt(catalog, npc.npcId, minuteOfDay);
runtime.advance(deltaMs);
npcEntity.project(session.activeNpcById(npc.npcId));
```

## Scenario: NPC dynamic avoidance MVP

### 1. Scope / Trigger

- Trigger：schedule walking 与浩南/祥子巡逻已经成立，但 NPC 仍会穿过玩家或其他居民，需要统一动态占位且不能把规则下放 Phaser。
- 本场景只拥有 walking 的玩家/NPC 避让、等待与临时 tile 重规划；不包含推挤、穿人兜底、crowd steering、队列或持久路线。

### 2. Signatures

```typescript
interface NpcAvoidancePosition extends WorldPoint {
  readonly regionId: string;
}

function NpcMotionRuntime.advance(
  deltaMs: number,
  player?: NpcAvoidancePosition,
): void;

function worldFeetOverlap(
  left: WorldPoint,
  leftHalfWidth: number,
  leftHalfHeight: number,
  right: WorldPoint,
  rightHalfWidth: number,
  rightHalfHeight: number,
): boolean;
```

### 3. Contracts

- GameSession tick 把当前 `state.player` 传给 NpcMotionRuntime；Phaser 不暂停、推开或重规划 NPC。
- 玩家脚底固定半径 5×4px、NPC 5×3px，由 `regions.ts` 单一导出；玩家→NPC 碰撞和 NPC→玩家/NPC 避让共用 `worldFeetOverlap`。
- 最大 1000ms runtime delta 拆为至多 50ms substeps；48px/s 时单步最多 2.4px，禁止只检查长 delta 终点造成穿透。
- 每个 substep 按 stable entityId 排序；已处理 NPC 的新位置立即成为后续 NPC 的障碍，同一位置竞争结果确定。
- walking candidate 与动态脚底重叠或进入同一 Collision tile 时立即丢弃位移，并投影 `motion=waiting`；idle/transfer 不执行动态路径规则。
- blocked 累计 600ms 后把同区域玩家/NPC world points 作为本次 EasyStar `avoidAdditionalPoint` 输入；重规划成功后沿旁路继续，失败后每 600ms 限频重试。
- destination 被占用时同样不可穿透；无旁路可无限等待，障碍移开后下一可用 substep 恢复。
- blockedMs、动态 points 和新 route 都是 transient runtime，禁止进入 GameState/StoredGame/Tiled。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| candidate 与玩家/NPC overlap 或同 tile | 保持当前位置，motion=waiting |
| 阻挡未满 600ms | 不运行 A*，沿原 route 等待 |
| 600ms 后存在旁路 | 使用临时 avoided tiles 生成新 waypoints |
| 600ms 后无旁路或 target 被占 | 保留 target/route，继续等待并限频重试 |
| 玩家移开 | 原路线或已生成旁路立即恢复，blockedMs 清零 |
| paused / first tick / 非有限 delta | 不推进 avoidance 或 motion |

### 5. Good/Base/Bad Cases

- Good：玩家站在浩南直线路径上，浩南先停下，随后从相邻 tile 绕过并继续巡山，全程不与玩家重叠。
- Base：玩家占住巡逻终点，NPC 一直等待；玩家离开后抵达原 target，不丢失 activity routeIndex。
- Bad：NPC 把玩家推开、600ms 后穿人、每帧同步 A*，或 WorldScene 自己暂停 container。

### 6. Tests Required

- 正式 Town runtime：浩南遇玩家立即 waiting、foot boxes 不 overlap、600ms 后产生横向绕路并通过。
- target 占位：持续等待且不 idle；移开后精确到原 Tiled target。
- path adapter：单行三格中间 dynamic avoided tile 返回 null。
- Town contract、typecheck、client build；不新增数据库、身份、Life Loop 全套、E2E、地图或图片检查。

### 7. Wrong vs Correct

```typescript
// Wrong: presentation teleports through a blocker after an arbitrary timeout.
if (blockedForMs > 600) npc.container.setPosition(target.x, target.y);

// Correct: GameSession passes the player and runtime alone decides wait/replan state.
runtime.advance(elapsed, state.player);
const active = runtime.activeSpawnsInRegion(state.player.regionId);
```

## Scenario: day-night visual cycle MVP

### 1. Scope / Trigger

- Trigger：06:00–24:00 时钟和四段 NPC 日程已成立，但地图颜色全天不变，玩家只能从 HUD/人物位置理解时间。
- 本场景只拥有 client-only 晨曦、白天、黄昏、夜色和室内/室外强度差；不包含灯光点、天气、Season、星空、阴影或 gameplay 夜间规则。

### 2. Signatures

```typescript
type DaylightPhase = "dawn" | "day" | "dusk" | "night";
type DaylightEnvironment = "outdoor" | "indoor";

interface DaylightVisual {
  readonly phase: DaylightPhase;
  readonly environment: DaylightEnvironment;
  readonly color: `#${string}`;
  readonly opacity: number;
}

function daylightVisualAt(minuteOfDay: number, regionId: string): DaylightVisual;
function isOutdoorRegion(regionId: string): boolean;
```

### 3. Contracts

- `daylightVisualAt` 只消费 GameState 已有 `minuteOfDay` 和 `player.regionId`；GameSession、StoredGame v5、IndexedDB 与 Tiled 不新增视觉字段。
- `world/region-environment.ts` 是 Farm/Town/Foothills/Lakeshore outdoor 分类的唯一 owner；visual profile 与 daylight 共用它，其他 region 按 indoor。
- outdoor 关键点：06:00 rose/0.16、07:00–15:00 clear/0、16:00 warm/0.02、17:00 amber/0.08、18:00 terracotta/0.14、20:00 violet/0.28、21:00 indigo/0.36、24:00 deep indigo/0.44。
- indoor 使用独立暖灰紫曲线，白天为 0，24:00 最大 0.12；不得机械缩放 outdoor 造成冷蓝室内。
- 合法 10 分钟 minute 在相邻 keyframe 间线性插值 sRGB 与 opacity；phase 边界为 07:00、17:00、21:00。
- game-store 只增加 transient regionId read model；App.vue 输出 CSS variables/data attributes，不把视觉结果传回 domain。
- `.world-frame::after` 使用 isolated multiply overlay、z-index 2、pointer-events none；LifeHud/Hotbar/feedback/dialogue/shop/sleep 位于 z-index 3+，保持原色和输入。
- CSS transition 只在 `prefers-reduced-motion: no-preference` 中启用 700ms linear；HUD `HH:MM` 是非颜色时间提示。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| minute 非法、越界或非 10 分钟粒度 | 复用 `decodeGameMinute` 明确失败 |
| 06:00 / 07:00 / 17:00 / 21:00 | 分别投影 dawn/day/dusk/night 边界 |
| 未知 regionId | 按 indoor 低强度处理，不升级为 gameplay 错误 |
| 切图 | 下一 GameState snapshot 立即切换目标 environment 曲线 |
| modal/action/transition paused | minute 不变，daylight 不自行推进 |
| reduced motion | 无 CSS transition，但变量状态立即正确 |

### 5. Good/Base/Bad Cases

- Good：玩家黄昏从 Town 进入 Seed Shop，室外琥珀色在淡出期间切换为轻暖室内，HUD 和商店仍保持清晰。
- Base：正午 Farm 无遮罩；24:00 室外明显靛蓝但道路/人物仍可辨，Cottage 只轻微变暗。
- Bad：WorldScene 创建受 camera zoom 影响的巨大 rectangle、把 tint 写入 save，或用深黑夜色却没有灯光可玩性。

### 6. Tests Required

- 纯投影断言 06:00、正午、18:00、21:00、24:00 phase/environment/opacity，15:00 前保持 clear day，18:00–20:00 中点连续插值。
- indoor 24:00 opacity 明显低于 outdoor；非法 365 minute 失败。
- Town contract、typecheck、client build；Impeccable detector 不得在本次 daylight 改动行产生新 finding。
- 不新增数据库、身份、Life Loop 全套、E2E、地图、图片或 shader 检查。

### 7. Wrong vs Correct

```typescript
// Wrong: presentation invents another clock and dims the whole app, including HUD.
const hour = new Date().getHours();
document.body.style.opacity = hour > 20 ? "0.5" : "1";

// Correct: client projects the persisted game minute into canvas-only CSS roles.
const daylight = daylightVisualAt(gameUiState.minuteOfDay, gameUiState.regionId);
style["--daylight-color"] = daylight.color;
style["--daylight-opacity"] = String(daylight.opacity);
```

## Scenario: friendship and daily talk MVP

### 1. Scope / Trigger

- Trigger：八名 NPC 已有身份、家庭、日程、活动和对话，但交谈不产生持久关系进度；需要先建立可恢复的基础友情循环，再规划 gifts/rooms/events。
- 本场景只拥有十心 friendship、每日首次交谈、轻微漏聊衰减和 Social 名册；不包含送礼、生日、关系对话、私人房间解锁、心事件或婚恋。

### 2. Signatures

```typescript
interface FriendshipState {
  readonly npcId: string;
  points: number;        // 0..2500
  lastTalkedDay: number; // 0..state.day
}

type GameCommand =
  | { readonly type: "talk-to-npc"; readonly npcId: string }
  | ExistingGameCommand;

interface GameStateV5 {
  readonly version: 5;
  friendships: Record<string, FriendshipState>;
}
```

### 3. Contracts

- friendship 尺度固定 250 点/心、10心/2500封顶；每日首次有效交谈 +20，重复交谈 0。
- 漏聊日结：lastTalkedDay !== current day 且 points 在1..2499时 -2；0不再下降，2500停止衰减。
- activity/walking/waiting NPC 与普通 idle NPC 同样 +20，不采用动画中减半；华强 Shop 点击与 Dialogue 点击走同一个 command。
- GameSession 从当前 NpcMotionRuntime 按 npcId 取位置，要求同 region 且 42px 内；未知、远距或非当前 active NPC quiet no-op。
- WorldScene 每次 NPC 点击只 dispatch 一次 talk，再打开 Shop/Dialogue；对话逐行、买卖按钮和重复开面板不额外增加。
- sleep 在 day+1 前依序执行 FriendshipSystem.settleDay 与 FarmingSystem.settleDay，再推进 day、06:00 和 Cottage 位置，并只提交一次 critical save。
- GameState/StoredGame 当前版本 5；v4 完整验证后补空 friendships，continue catalog reconcile 补八名 defaults；v1–v3 迁移直接输出 v5 empty friendships。
- catalog reconcile 为唯一 base npcId 补零，拒绝未知 friendship key 和 key/npcId 不一致；v5 decoder 要求 points 0..2500、lastTalkedDay 0..day。
- Social panel open/closed、姓名、关系称谓、心图形和 focus 不进 save。
- Social 名称由 WorldCatalog base npc dialogueId → DialogueDefinition.speaker 投影，不复制角色名表。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 首次当天近距 talk | points +20（clamp 2500），lastTalkedDay=current day，publish/save |
| 当天重复 talk | byte-equivalent，无 save |
| 远距/未知/非 active NPC | quiet no-op |
| 漏聊且 points 1..2499 | 睡觉时 -2 |
| points=0 或 2500 | 漏聊不衰减 |
| v4 save | 验证旧字段后迁移 v5 empty friendships，catalog reconcile 补八名 |
| v5 points 越界、future lastTalkedDay、unknown friendship | decode/reconcile 失败，不覆盖原记录 |
| Social 打开 | world input/time locked；关闭后恢复 |

### 5. Good/Base/Bad Cases

- Good：Day 1 点击阿禾一次得到20点，继续推进所有对话不加；Day 2 再聊变40点，Social 显示0.2/10心和今日已聊。
- Base：一天没见已有20点的墨子，睡觉后变18；满心居民长期未聊保持2500。
- Bad：Vue 直接 points+=20、Shop 买一次加一次、对话每行刷分，或把 Social open/name/avatar 写进 save。

### 6. Tests Required

- v2/v3/v4→v5、v5幂等、非法 points/lastTalkedDay、v2 backup current-v5 main。
- FriendshipSystem 首聊/重复/次日/漏聊/0/满心；GameSession 远距与 active keeper 近距。
- 正式 Town catalog 新游戏八个 friendship defaults；store Social lock 与 friendship projection。
- Life Loop、Town、typecheck、client build；不连接数据库、不增加 identity/E2E。

### 7. Wrong vs Correct

```typescript
// Wrong: every dialogue line mutates a UI-owned heart count.
gameUiState.hearts[npcId] += 1;

// Correct: one NPC click sends one validated local command.
session.dispatch({ type: "talk-to-npc", npcId });
setDialogue(dialogue);
```

## Scenario: deterministic NPC contextual dialogue

### 1. Scope / Trigger

- Trigger：八名居民已有固定身份、四段日程、地点和活动，但单一静态台词无法表达早晨准备、白天工作、傍晚收工和夜间居家。
- 本场景只拥有八人×四时段×两日版本的客户端内容解析；不增加 gifts、quests、branches、events、calendar、weather 或持久对话状态。

### 2. Signatures

```typescript
interface DialogueContext {
  readonly day: number;
  readonly minuteOfDay: number;
  readonly shopAvailable?: boolean;
}

function getDialogueDefinition(
  dialogueId: string,
  context?: DialogueContext,
): DialogueDefinition | null;
```

### 3. Contracts

- `client/src/game/dialogue/definitions.ts` 是 speaker、固定 inspect 文案和 contextual variants 的唯一 owner；WorldScene 不按 npcId/phase 硬编码台词。
- NPC 点击传现有 GameState `day`/`minuteOfDay` 与 runtime `interactionType` 投影出的 `shopAvailable`；resolver 复用 `schedulePhaseAt()`，再以 `(day - 1) % 2` 确定当日版本。
- 同一天同 phase 重复交谈返回 byte-equivalent lines；跨 Day 1/2 轮换，禁止随机数、计数器或 last-dialogue save 字段。
- 华强 day + `shopAvailable=true` variant 第一行是 Shop welcome；前往柜台时显示开店准备文案，morning/evening/night 只描述备货、收店或休息，并由现有 interactionType 保证不能交易。
- 未提供 context 或 dialogueId 没有 variants 时返回固定 definition；公告板、家具、私人内屋、山路和湖岸 inspect 不参与轮换。
- 一次 NPC 点击仍先 dispatch 一次 `talk-to-npc`，再打开 Shop/Dialogue；逐句推进不再次增加 friendship。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| dialogueId 未知 | 返回 null，沿用 missing-dialogue feedback |
| day 非正安全整数 | resolver 明确失败，不打开半有效面板 |
| minute 非 06:00–24:00 十分钟粒度 | 复用 `schedulePhaseAt`/`decodeGameMinute` 明确失败 |
| contextual NPC + 合法 context | 返回原 speaker/id + 当前 phase/day lines |
| fixed inspect + 任意合法 context | 返回原固定 definition，内容不变 |
| 华强 day walking/到柜前 | interactionType=dialogue + shopAvailable=false，显示开店准备文案且不打开 Shop |

### 5. Good/Base/Bad Cases

- Good：Day 1 白天浩南谈山泉和碎石，Day 2 同时段谈巡过泉眼；傍晚回镇后改为收工内容。
- Base：同一天重复点击阿澜仍是同一段湖岸内容；家具 inspect 永远保持固定描述。
- Bad：每次点击随机选一句、把 phase/day 文案分支写在 WorldScene、为对话轮换升级 StoredGame，或台词承诺尚未实现的采矿/钓鱼/升级服务。

### 6. Tests Required

- 窄纯检查覆盖八个 NPC dialogueId × 四个 phase × Day 1/2：同日稳定、跨日不同、speaker/id 保持。
- 固定 `town-notice-board` 有/无 context 必须相同；非法 day/minute 明确失败。
- 最小门禁保留 typecheck + client build；真实浏览器抽查华强、浩南与一个家庭 NPC，不扩建 E2E/数据库/地图/图片矩阵。

### 7. Wrong vs Correct

```typescript
// Wrong: renderer owns another schedule and random conversation state.
const lines = npcId === "town-resident-haonan"
  ? variants[Math.floor(Math.random() * variants.length)]
  : fallback;

// Correct: the content owner consumes the existing persisted day and clock.
const dialogue = getDialogueDefinition(npc.spawn.dialogueId, {
  day: state.day,
  minuteOfDay: state.minuteOfDay,
});
```

## Scenario: local layered character creation and wardrobe

### 1. Scope / Trigger

- Trigger：用户要求参考农场生活游戏，将角色拆成上、中、下三部分，自由更换性别与衣服，取代九张整身预设卡片。
- 当前美术合同为 2026-09-07 的 v3 PNG 分层；用户拒绝两轮源码绘制后认可新的男女四向设计。被拒绝的 v2 只作历史来源，不能因其曾通过类型与构建而记为审美通过。
- 公开本地试玩 `/` 的新建角色和游戏内「外观」使用同一组合编辑器；正式角色不依赖 `?toolArt=preview`、候选图片或 VectoRaith farmer/NPC demo 外观。旧 React/localStorage 角色创建与 Ninja/Samurai 素材继续退役。
- 当前范围为性别、头部、上装、下装、肤色和三类配色；鞋子属于下装绘制，不提供独立鞋子选项。本章节替代历史素材章节中的玩家整身 farmer/profile 约定，地图和 NPC 素材合同保持原范围。

### 2. Signatures

```typescript
interface PlayerAppearance {
  gender: "male" | "female";
  head: "short" | "bob" | "ponytail";
  top: "shirt" | "overalls" | "jacket";
  bottom: "trousers" | "shorts" | "skirt";
  skinTone: "peach" | "tan" | "umber";
  hairColor: "chestnut" | "black" | "gold";
  topColor: "mint" | "cream" | "coral" | "sky";
  bottomColor: "denim" | "sand" | "forest";
}

interface PlayerState {
  regionId: string;
  x: number;
  y: number;
  appearanceId: PlayerAppearanceId; // 仅保留旧存档兼容身份，渲染不再读取它。
  appearance: PlayerAppearance;
}

declare function decodePlayerAppearance(value: unknown): PlayerAppearance;
declare function legacyPlayerAppearance(appearanceId: PlayerAppearanceId): PlayerAppearance;

// GameSession 的外观相关入口；未传参时使用 DEFAULT_PLAYER_APPEARANCE。
interface AppearanceSession {
  newGame(appearance?: PlayerAppearance | PlayerAppearanceId): Promise<GameState>;
  dispatch(command: { type: "change-appearance"; appearance: PlayerAppearance }): ActionFeedback | null;
}

declare function playerMediaProfile(): PlayerMediaProfile;
declare function ensureCharacterArtReady(): Promise<void>;
```

### 3. Contracts

- `domain/player/appearance.ts` 是八个语义字段、默认值和 decoder 的唯一 owner；domain/save 禁止出现 URL、texture key、atlas frame 或 NPC identity。性别不限制发型和衣服，切换性别保留其余七项搭配。
- `GameState` 与 `StoredGame` 继续使用 v13，不改变 IndexedDB 对象仓库或后端数据库结构。已有 v13 若没有 `player.appearance`，decoder 根据已验证的旧 `appearanceId` 作固定映射，返回包含完整八字段的状态；已有组合则逐字段验证。旧 ID 只承担兼容职责，不开放整身预设选择，也不扩展对其他存档版本的支持。
- 新游戏只在角色页最终确认后调用 `GameSession.newGame(appearance)`，并在首次保存成功后挂载 Phaser。创建页浏览、取消或返回不写当前存档；已有农场的覆盖提示仍由原新游戏入口处理。
- 游戏内「外观」从只读 snapshot 复制草稿；编辑阶段只影响编辑器预览，取消直接丢弃草稿。保存时发送 `change-appearance`，domain 校验后仅替换 `player.appearance`，发布新 snapshot 并排队保存，不修改位置、背包、日期、金币或体力。
- 「外观」面板等待 `flushLocalGameSession()` 完成后才关闭并显示已保存。失败时保留已提交草稿和未保存提示，锁定编辑、取消及世界输入；重试重新发送同一草稿以排队一次新写入，然后再次等待 flush，不能只重复 flush 已经失败的旧队列。
- `character-art.ts` 从已发布 v3 PNG 裁切、组合和按材质遮罩调色，不再以源码像素簇或图元绘制人体。`CharacterPreview` 与 `LayeredPlayerArtwork` 共用 `paintCharacterFrame()`；正常 `/` 的 Vue 预览和 Phaser 角色必须使用同一组部件。原生帧 48×64，头部、上装、下装各生成一张三列四行的 144×256 透明 CanvasTexture；方向为下、左、右、上，步态 1 为站立，显示循环为 0→1→2→1。
- 两张源图 `character-layers-v3.png` 与 `character-materials-v3.png` 均为 432×1536 RGBA，位于已发布的不可变 `game/media/v1/assets/original/islander/2026-09-07-v3/`，由 manifest 登记、浏览器默认通过同源 `/game-media/v1` 读取。媒体配置与来源文本已进入 main `633f29e`；应用源码本地接入不等于生产应用已部署。真实来源与处理链路见 [v3 素材记录](../assets/islander-raster-character-v3-2026-09-07.md)。
- `App` 在初始化本地入口之前等待 `ensureCharacterArtReady()`；两图共同加载、432×1536 尺寸与 Canvas 可读性全部成功后才发布可用素材。单图请求最多等待 15 秒，失败不发布半套 source，入口进入错误页并提供“刷新重试”；不得回退到 v2 或空白角色。
- `visual-profile.ts` 只返回统一帧和脚底锚点合同；`LayeredPlayerArtwork` 用上装精灵驱动原行走、种田及出拳动作，在 `POST_UPDATE` 同步另两层的 frame、位置、缩放、旋转与可见性。换装按八字段组合 key 原位重绘三张固定纹理，避免每套搭配累计新纹理；场景关闭时解绑同步回调和状态订阅。
- 统一原生脚底为 `(24,60)`，世界 scale 为 0.5；手心参考 y43，换算为相对脚底的世界偏移 `(43-60)×0.5=-8.5`。角色素材不拥有碰撞、移动或存档规则；图像二进制不进入 Git。UI 使用原生性别按钮、款式选择和配色按钮，方向和行走预览均为临时表现状态。
- 头部固定使用各向站立帧，接触相位向下沉一个原生像素，维持面部一致性；已明确排除女性马尾右向第三帧的错向源图。侧面步势仍是短接触/站立循环，完整交替肢体动画尚待精修，不能把现有循环或静态设计获认可记为动画验收通过。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 外观任一字段未知、缺失或类型错误 | 新建/存档 decoder 明确失败；换装命令返回错误且不修改当前外观 |
| v13 只保存已知旧 appearanceId | 固定转换为八字段组合，其他存档进度保持；后续保存包含组合字段 |
| v13 已有完整合法组合 | 原样恢复组合，返回防御性副本 |
| 未知旧 appearanceId 或不支持的存档版本 | 保持现行 decoder 拒绝，不静默回退或重建农场 |
| 创建页浏览、取消或返回 | 不调用 newGame，不写当前存档 |
| 新建最终确认且保存成功 | 进入 Phaser，三层绘制与创建页同一组合 |
| 新建保存失败 | 进入可恢复错误页，不挂载半初始化 Phaser 世界 |
| 角色源图失败、超时、尺寸错误或 Canvas 不可读 | 入口明确报错并提供刷新重试；不初始化半套角色或回退到 v2 |
| 游戏内编辑草稿后取消 | 当前角色和存档不变 |
| 换装已提交但保存失败 | 新外观已投影到当前 session，尚未持久化；面板保留失败状态并提供重新排队保存 |
| 换装或切图 | 保持当前三层组合、统一朝向和动作相位，碰撞尺寸及脚底位置不随服装变化 |

### 5. Good/Base/Bad Cases

- Good：短发、薄荷衬衫与牛仔长裤可分别调整，换为另一性别仍保留服装；保存后世界与预览使用同一组合。
- Base：已有 v13 农场确定性补齐组合；创建或换装草稿取消不改动农场，已保存组合可由继续游戏恢复。
- Bad：继续用九张整身候选卡代替分层、只改预览不改世界、把 texture/frame 写进 IndexedDB、切换性别重置服装，或将未完成写入显示为已保存。

### 6. Checks

- 自动验证选择最小相关类型和客户端构建检查，不新增测试矩阵。旧 v13 补齐、非法字段拒绝、快照隔离及换装不改变玩法状态可用有界内存检查复核，不连接数据库。
- 人工验收关注正式 `/` 的新建与「外观」、草稿取消、保存与失败重试、四方向走路/使用工具、切图和刷新恢复，以及手机与键盘可达性；本章节记录实现合同，不宣称这些人工项目已经全部完成。
- 不新增数据库、migration、账号、E2E 矩阵或图片二进制。

### 7. Wrong vs Correct

```typescript
// Wrong: browsing already replaces the farm and persistence knows an atlas frame.
await session.newGame();
state.player.textureKey = "vectoraith-npcs";

// Correct: only final confirmation crosses the domain boundary; the client paints independent layers.
await session.newGame(selectedAppearance);
const media = playerMediaProfile();
registerCharacterTextures(scene, snapshot.player.appearance);

// A wardrobe retry queues the locked draft again before waiting for the durable write.
session.dispatch({ type: "change-appearance", appearance: { ...draft } });
await flushLocalGameSession();
```

## World Foundation contract

- 地图使用 16×16 正交 TMJ 区域文件；农场东侧连接小镇西侧，后续 forest/mountain/river/mine/temple/story regions 复用同一切图合同，不扩成单张超级地图。
- 每张 TMJ 固定 Tile Layers：`Ground`、`GroundDetail`、`Water`、`Buildings`、`AbovePlayer`、`Collision`；固定 Object Layers：`SpawnPoints`、`Exits`、`Interactions`、`ResourceSpawns`、`NpcSpawns`。
- 程序不按 Tiled object name 猜行为，只消费集中 decoder 验证过的 `type` 与 properties；stable entity ID 全世界唯一。
- Phaser 当前 parser 不支持 external tileset source，运行时 TMJ 必须内嵌 tileset metadata；先使用普通 TilemapLayer，不提前采用 TilemapGPULayer。
- Tilemap 只拥有地面、水、道路、墙、屋顶、桥和静态装饰；玩家、NPC、树、石头、箱子、作物、门和剧情对象由 EntityFactory 从 Object Layer 创建。
- 地图拥有 entity 静态位置，save 只保存动态状态；切图、刷新和继续游戏不得复活已耗尽资源。
- 可复用 ActionTimeline 固定 `windup -> impact -> recovery`；只有 impact 触发一次 GameSession mutation，动画期间拒绝重复交互。
- Commit C 后正式游戏世界是默认主视图；现有 LOCAL/grid 与指针方向盘只在显式 Debug Shell 模式出现。
- 正式 `public/map/*.tmj` 由 Tiled 手工维护，生成器只写 ignored fixture，运行时与构建命令禁止重写正式地图。
- 已登记 ID 是持久身份、坐标只是布局；Tiled 中可移动对象与重画 tile，但不得因构图变化重命名 `entityId`、`exitId`、`spawnId`、`npcId` 或 `dialogueId`。
- 地图阶段以实际画面、动线、碰撞与操作为主要验收证据；decoder、类型检查和构建仅证明最低结构完整性。
- 正式世界使用 2× 整数 camera zoom；不得退回 1× 全图总览造成角色和交互物过小。响应式尺寸由 Phaser `RESIZE` 处理，resize 时同步室内固定 anchor 和建筑预览镜头。建筑全农场预览单独按可用视口 fit，关闭后恢复 2×；世界中文标签使用 9px 中文无衬线字体和 resolution 2。
- Town 扩展继续使用分区切图而不是放大单张主镇：`blacksmith`、五栋 `town-house*` 使用现有室内占位图集，`foothills`、`lakeshore` 使用现有 VectoRaith 户外 profile；每栋住宅外门可进入公共区，私人内屋只由 Collision + Tiled-owned `inspect dialogueId` 阻挡，禁止把访问状态写入 GameState/save。
- Farm 固定扩为 64×48；核心构图集中在出生镜头附近，依次建立小屋、水塘/农田和东向道路三个视觉焦点。Gate A 只审大块构图，用户确认前禁止提前堆细节或新玩法实体。
- Gate A v2 与 VectoRaith 方向验证已通过；Gate B 冻结 23 个 stable object，只允许在 ignored 候选 TMJ 完成岸线、院落/石板、弯曲道路、农田边界、小桥、林缘、Collision 与 AbovePlayer。截图确认前不得进入 Gate C、装饰或新系统。

## Direct Original/16×16 art profile

**What**：正式 Farm 与 Town 直接使用 VectoRaith 官方完整 terrain/buildings/details/orchard/crops/farmer PNG、原始 GID 和原始 frame 坐标；Cottage、Seed Shop 等室内区域继续使用占位 profile。profile 选择仍只存在 client 表现层。

**Why**：用户明确否决 used-tile 裁剪、重排 atlas、合并 entities 和重编码 farmer，要求现成官方文件直接作为运行时资源；该发布决定仍不得渗入 domain 或存档。

```typescript
// Correct: presentation shell resolves a local profile; domain receives only the decoded catalog.
const mapUrl = "/map/farm.tmj";
const factory = new EntityFactory(scene, entityMediaForRegion(regionId));

// Wrong: persist an art profile or atlas frame in domain state.
gameState.player.tileset = "vectoraith";
```

- Production source root：同源 `/game-media/v1/assets/vendor/vectoraith/farming-sim-v1.08/original/16x16/`；只含 6 个 manifest 登记并保持官方 bytes 的完整 PNG。
- Runtime source tiles remain original 16×16; Phaser uses `pixelArt`、`roundPixels` 与 2× integer camera zoom，不采用 32/48px upscaled tileset。
- 禁止为发布再次 pack used tiles、重排 GID、裁切/合并 entity frames 或重编码 PNG；Tiled 直接使用原始 16-column metadata，EntityFactory 直接注册原 sheet frame。
- Missing local file or decoder failure → visible media/startup error；不得静默回退未知素材。
- Required checks：formal decoder + Farm 23 stable object/Town 7 stable object equality + Farm/Town route Collision replay + typecheck + client build；浏览器画布验收不需要 Keycloak session 或身份服务。
- Checkpoint 后只有真实游玩发现的明确碰撞、树脚、路径或院落操作问题允许修改 Farm v1；不以偏好性微调重开 Gate A/B/C。

### 1. Scope / Trigger

- Trigger：用户要求删除全部 VectoRaith used-tile packing/cropping，并让 Farm/Town 直接使用官方 Original/16×16 完整 PNG。

### 2. Signatures

```typescript
const VECTORAITH_MEDIA_KEYS = {
  terrain: "vectoraith-terrain",
  buildings: "vectoraith-buildings",
  details: "vectoraith-details",
  orchard: "vectoraith-orchard",
  crops: "vectoraith-crops",
  farmer: "vectoraith-farmer",
} as const;

interface TilesetBinding {
  readonly tiledName: "vectoraith-terrain" | "vectoraith-buildings" | "vectoraith-details";
  readonly textureKey: string;
}
```

### 3. Contracts

- CDN key 保留官方文件名，位于 `farming-sim-v1.08/original/16x16/`；manifest 的 bytes/SHA-256 必须等于归档原文件。
- Farm/Town TMJ 使用原始 16-column metadata；Farm firstgid 固定 terrain=1、buildings=257、details=513。
- EntityFactory frame 直接指向 orchard/details/crops/terrain 原 sheet 坐标，不创建合并 atlas。
- Git 不跟踪图片；`prepare-media` 只从 CDN 验证下载 exact originals 到 ignored runtime/Tiled 路径。
- 原图全部部署并验证后，精确删除 5 个旧 packed CDN keys；禁止递归删除 VectoRaith prefix。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 原图 bytes/hash 与 manifest 不同 | prepare/build/deploy 失败，不回退到 packed key |
| Farm 或 Town layer/GID 与已确认 original candidate 不同 | 不部署，不替换正式地图 |
| 任一 original CDN key 缺失 | 删除工作流拒绝执行 |
| runtime bundle 仍含旧 packed key | 不删除旧对象 |
| 图片出现在 Git diff | 质量门禁失败 |

### 5. Good/Base/Bad Cases

- Good：Tiled 从完整 sheet 选 tile，Phaser 直接加载同一官方 PNG，Farm 像素/Collision/objects 不变。
- Base：Town Gate A 的 ignored candidate 获确认后只机械投影 tileset image path，正式 tile/object data 与候选一致。
- Bad：为每张地图重新收集 used tiles、重排 GID、裁切 entity 或重编码 PNG。

### 6. Tests Required

- 6 个 CDN objects：dimensions、bytes、SHA-256、MIME、immutable cache。
- formal Farm/Town 与各自 full-original candidate：tile/object layers 相同；Farm→Town、主街→桥→Seed Shop、小巷→次区→桥头回路通过。
- Life Loop contracts、typecheck、client build、真实 Phaser Farm screenshot。
- Git tracked image binaries=0，代码/manifest/文档无旧 packed key 引用。

### 7. Wrong vs Correct

```typescript
// Wrong: runtime depends on a project-repacked entity atlas.
tree.textureKey = "vectoraith-entities";
tree.frame = { x: 0, y: 0, width: 48, height: 48 };

// Correct: runtime references the official orchard sheet directly.
tree.textureKey = "vectoraith-orchard";
tree.frame = { x: 5 * 16, y: 0, width: 3 * 16, height: 3 * 16 };
```

## Scenario: spring calendar and gameplay foundation v7

### 1. Scope / Trigger

- Trigger：当前绝对 Day 和单一萝卜不足以承载四季；需要先完成28天日历、春季多作物和每日采集，同时避免进入空内容夏季。
- 本场景拥有纯 calendar、三种春季作物、两种春季采集物、多商品商店与月历 UI；天气、节日、品质、肥料和完整夏秋冬内容继续延期。

### 2. Signatures

```typescript
function calendarAt(absoluteDay: number): GameCalendarDate;
function cropsForSeason(season: Season): readonly CropDefinition[];
interface DailyForageState { day: number; collectedIds: string[]; }
interface FarmTileStateV7 { cropId: CropId | ""; growthDays: number; }
```

### 3. Contracts

- 绝对 `GameState.day` 是唯一持久日期；year/season/dayOfSeason/weekday 纯推导，Spring 1 Year1=Monday，每季28天、每年112天。
- calendar 纯函数支持四季循环；当前 GameSession 在 Spring 28 sleep 返回 `season-content-limit`，不结算也不进入无内容 Summer 1。
- crop catalog 唯一拥有萝卜3天20/35、小白菜5天45/80、花椰菜8天80/170及 spring season；Farming/Shop/UI 不复制价格或 seed→crop 规则。
- v7 FarmTile 保存 cropId/growthDays；v6 `growthStage` 原样迁移为萝卜 watered-day progress。frame/scale 仍只属于 visual profile。
- ResourceSpawns 可包含 spring-wildflower/bamboo-shoot 候选；每日出现由 day+stable ID 确定，save 只保存当日 collected IDs，不保存坐标。
- 月历和 calendarOpen 是 transient client projection；打开时纳入统一 input/time lock，不进入 save。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| absolute day 非正安全整数 | calendar 明确失败 |
| Spring 28 请求睡觉 | 不结算/不推进，返回内容边界 feedback |
| 非春季种子或未知 seed/crop | 不扣物品、不改农田 |
| forage 当日未出现/已采集/远距 | 不改背包和 collected IDs |
| forage 背包满 | 地图对象保留，collected 不写入 |
| v6 合法存档 | 迁移 v7，萝卜/角色/好感/位置保留，dailyForage 为空 |

### 5. Good/Base/Bad Cases

- Good：春1种萝卜和花椰菜，按不同天数成熟；探索湖岸收野花，刷新不复活，春2出现新一批。
- Base：点击 HUD 日期打开28天月历，Escape 返回；春28睡觉得到明确边界且状态不变。
- Bad：同时保存 day/year/season 导致漂移、Vue直接算价格、Math.random刷新采集物，或提前展示未实现夏季。

### 6. Tests Required

- Day1/28/29/112/113 calendar、v6→v7/幂等/损坏、三作物成长与价格、forage确定性/采集/背包满。
- 正式四张户外地图 decoder、typecheck、client build；月历宽屏/手机/200% zoom 视觉由真实浏览器确认。
- 不连接数据库、不新增 Prisma migration、不扩建身份或全量 E2E。

### 7. Wrong vs Correct

```typescript
// Wrong: duplicate persisted calendar fields and random browser-only forage.
state.season = "spring";
if (Math.random() > 0.5) spawnFlower();

// Correct: one absolute day deterministically projects calendar and forage.
const date = calendarAt(state.day);
const active = forage.activeSpawns(state, state.player.regionId);
```

## Scenario: Stardew Life Loop v3

### 1. Scope / Trigger

- Trigger：Farm Showcase 已人工通过，当前需要让玩家完成第一个可重复生活日循环。
- 本场景只拥有 `day`、`gold`、床睡觉日结、三次有效浇水成长和 Seed Keeper 萝卜买卖；不包含 Season、Clock、天气、NPC 日程、远征或灵兽。

### 2. Signatures

```typescript
interface GameStateV3 {
  version: 3;
  day: number;
  gold: number;
  player: PlayerState;
  inventory: InventorySlot[];
  resources: Record<string, ResourceState>;
  farmTiles: Record<string, FarmTileStateV3>;
}

interface FarmTileStateV3 {
  id: string;
  phase: "untilled" | "tilled" | "growing" | "mature";
  cropId: "" | "turnip";
  growthStage: 0 | 1 | 2 | 3;
  watered: boolean;
}

type LifeLoopCommand =
  | { type: "sleep"; bedId: "cottage-bed" }
  | { type: "buy-item"; itemId: "turnip-seed"; quantity: 1 }
  | { type: "sell-item"; itemId: "turnip"; quantity: 1 };
```

### 3. Contracts

- 新游戏固定 `day=1`、`gold=100`；HUD 只投影 `Day N` 与 `Ng`。
- 玩家在 42px 内点击 Cottage 床后先打开“是否休息？”确认框；“否”只关闭 modal，“是”关闭 modal 后调用一次既有 sleep transition。远距离点击静默无效，E 不承担睡觉交互。
- `sleep` 必须在一次同步 mutation 中依序完成：结算所有 watered crops → 清除每日 watered → `day + 1` → Cottage 安全位置；随后由 GameSession 排队一次 critical save。
- 萝卜播种后只有“该日已浇水 + 成功睡觉”才增长 1 阶；3 次有效日结后 mature。wall-clock、刷新等待和同日重复浇水都不能额外成长。
- `turnip-seed` 每次只买 1 个、价格 20g；`turnip` 每次只卖 1 个、价格 35g。扣款/加物与背包 mutation 必须全成或全不成。
- ShopPanel open/closed 是 client UI state，不写入 GameState；打开期间 client shell 锁定 Phaser 世界移动、动作与地图交互输入。
- v2→v3 在内存中迁移 `alien-seed → turnip-seed`、`alien-crop → turnip` 和 FarmTile crop ID；`readyAt` 被丢弃，合法 phase/watered 保留。v3 重复 decode 不再运行 defaults 或 remap。
- SaveRepository、IndexedDB DB/store/ownerKey/slot 均不变；不新增数据库或 Tauri 代码。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| `day` 不是安全的 1-based 整数，或 `gold` 不是非负安全整数 | decode 明确失败，原 IndexedDB record 不覆盖 |
| 非 Cottage、错误 bed ID、距离超限或睡觉 command 正在处理 | 拒绝睡觉，day/crops/player 不变 |
| 作物未浇水 | 睡觉只清理 daily state 并推进 day，作物阶段不变 |
| 购买时 gold < 20 或背包无法完整加入 1 粒 | gold 与 inventory 全部不变 |
| 出售时没有 1 个 turnip | gold 与 inventory 全部不变 |
| future/损坏 save | 显式错误，不静默新建或降级覆盖 |

### 5. Good/Base/Bad Cases

- Good：玩家以 100g 买种，连续三次浇水后睡觉，收获 1 个萝卜并以 35g 出售；刷新后 day/gold/inventory/farmTiles 一致。
- Base：未浇水直接睡觉，Day 仍只增加 1，萝卜不成长；商店失败命令给出 feedback 且无 mutation。
- Bad：Vue 直接 `gold -= 20`、FarmingSystem 继续读取 `Date.now()`，或 sleep 分多次 command/save 导致半日结。

### 6. Tests Required

- v2 fixture decode 为 v3 后断言 day/gold、alien item/crop remap、phase/watered 保留、`readyAt` 消失；再次 decode v3 值完全相同。
- 连续三次 watered sleep 每次只增长一阶并最终 mature；未浇水、重复浇水和 wall-clock 等待不增长。
- buy/sell 的成功、金币不足、背包满和库存不足分别断言 gold/inventory 原子性。
- sleep 的错误位置、快速重复输入与成功路径分别断言 day/crop/save 次数。
- 最小门禁：窄确定性检查、typecheck、client build；最终由真实浏览器完成完整循环和刷新恢复。

### 7. Wrong vs Correct

```typescript
// Wrong: UI owns economy and sleep emits partial mutations.
snapshot.gold -= 20;
session.dispatch({ type: "grow-crops" });
session.dispatch({ type: "next-day" });

// Correct: UI sends one command; GameSession owns one atomic mutation.
session.dispatch({ type: "buy-item", itemId: "turnip-seed", quantity: 1 });
session.dispatch({ type: "sleep", bedId: "cottage-bed" });
```

### Convention: FarmPlot visual frames remain optional presentation data

**What**：`EntityMediaProfile.farmCrop` 可以提供 growing/mature atlas frame；`FarmPlotEntity.project` 只把现有 domain phase 映射为可见 frame，未耕/已耕阶段隐藏 crop image。

**Why**：作物种类、阶段和收获仍由 FarmingSystem/GameState 拥有，素材 key、坐标和 frame name 不得进入 command、save 或 domain。

```typescript
// Correct: presentation maps the existing phase.
crop.setVisible(tile.phase === "growing" || tile.phase === "mature");

// Wrong: domain or save stores an atlas frame.
farmTile.frameName = "vectoraith-crop-mature";
```

## Scenario: production Hotbar item icons

### 1. Scope / Trigger

- Trigger：Tool Art Gate A 已确认 GARDENS 工具/种子图标，正式 Hotbar 不再使用大号汉字占位；本场景只晋升 UI item frame，不晋升候选工具动作。

### 2. Signatures

```typescript
interface ItemIconDefinition {
  readonly url: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly x: number;
  readonly y: number;
  readonly width: 16;
  readonly height: 16;
}

function itemIconForItem(itemId: string): ItemIconDefinition | null;
```

### 3. Contracts

- `client/src/game/assets/item-icons.ts` 是正式 item ID → immutable source/frame 的唯一 owner；ItemDefinition、GameState、StoredGame 和 IndexedDB 不保存 URL、texture key 或 frame。
- GARDENS 采用原始 160×176 PNG：hoe `(0,1)`、watering can `(0,4)`、axe `(0,9)`、turnip seed `(6,5)`；turnip/wood 继续使用已登记 VectoRaith crops/details frame。
- GARDENS 对象固定在 `game/media/v1/assets/vendor/ivoryred/gardens-2026-08-27/original/`，bytes/SHA-256 必须等于 manifest；禁止裁图、重排、重编码或把 PNG 加入 Git。
- Hotbar 对 mapped item 显示 2× nearest-neighbor 图标并保留小字 name/quantity/selection；只有确实 unmapped 的 item 才回退 `hotbarMark`。
- CC BY 4.0 署名必须随产品交付到 `/THIRD_PARTY_NOTICES.txt` 并从 start UI 可发现；仓库内部采用记录不能替代产品署名。
- `tool-art-candidate.ts` 只保留 development-only action preview；生产 Hotbar 不读取 `import.meta.env.DEV` 或 query flag。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| CDN key 已存在但 SHA 不同 | 发布失败，禁止覆盖 immutable object |
| manifest totals/key/hash/URL 不一致 | 构建/部署媒体门禁失败 |
| mapped item 图标请求失败 | 生产验收失败，不把缺图当成功发布 |
| item 无正式 frame | Hotbar 使用 `hotbarMark`，name/quantity 仍正常 |
| notice 缺失或不可访问 | CC-BY 采用未完成，不部署 |

### 5. Good/Base/Bad Cases

- Good：新游戏前三格显示锄头、浇水壶、斧头像素图标，选择和数量不变，网络只请求登记的同源媒体。
- Base：未来新增尚未评审的 item 仍显示文字 mark，不猜 frame、不复用不相干图标。
- Bad：生产依赖 `/tool-art-candidate/`、在 ItemDefinition 写图片 URL、提交 PNG，或只在仓库 README 署名。

### 6. Tests Required

- manifest 断言 15 images / 2874147 bytes，并从 CDN 校验全部 SHA-256、dimensions、MIME 与 immutable cache。
- typecheck、client build；产物包含正式 GARDENS URL 和 `THIRD_PARTY_NOTICES.txt`，不包含旧 local GARDENS candidate URL。
- Git 图片 binary diff 为 0；真实浏览器断言前三格使用图标且 notice 可访问。

### 7. Wrong vs Correct

```typescript
// Wrong: production Hotbar remains behind a development-only visual gate.
const icon = import.meta.env.DEV ? candidateIconForItem(itemId) : null;

// Correct: production resolves one reviewed presentation frame without changing item state.
const icon = itemIconForItem(itemId);
```

## Scenario: selected Hotbar item owns world interaction

### 1. Scope / Trigger

- Trigger：玩家必须先选择工具/种子或空手，再点击 Tree/FarmPlot；系统不再根据目标 phase 自动猜测工具。
- 本场景只拥有 transient Hotbar selection、持续手持表现、精确 item/target command 和空手采摘；不包含工具品质、耐久、体力、升级或铁匠功能。

### 2. Signatures

```typescript
type HeldItemId = ItemId | "";

type ToolUseCommand = {
  readonly type: "use-item-on-target";
  readonly itemId: HeldItemId;
  readonly targetId: string;
};

interface ToolSelectionProjection {
  readonly selectedHotbarIndex: number | null;
  readonly selectedItemId: HeldItemId;
}
```

### 3. Contracts

- 新游戏 slots 0/1/2 固定 hoe/watering-can/axe；默认 `selectedHotbarIndex=null`、空手。开发期不 backfill 旧存档。
- 点击或按 `1–8` 选择槽位；再次选择当前槽或选择空槽回到空手。选择只在 client store，禁止进入 GameState、StoredGame、IndexedDB 或 domain。
- Phaser 在 ActionTimeline impact 发送 `use-item-on-target`；GameSession 重新验证背包仍拥有非空 item，并按 WorldCatalog target kind 路由。
- 精确合法组合只有：axe+tree、hoe+untilled、turnip-seed+tilled、watering-can+growing、empty+mature。
- 错误物品/phase 仍播放当前玩家动作，但 GameSession 返回 quiet no-effect；目标不播放 impact，不 publish/save，不显示文字错误。
- 空手收获使用当前 farmer 的代码俯身动作；mutation 仍只发生在 impact 一次。
- Shop/Dialogue/ActionTimeline busy 时 Hotbar 与数字键选择被锁；modal 关闭后保留先前选择。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| item 不在背包或 target 未知 | quiet no-effect，state byte-equivalent |
| wrong item/target phase | 玩家动作完成；target 无 impact；无反馈/保存 |
| axe + available nearby tree | tree depleted、+3 wood、一次 critical save |
| watering-can + already watered crop | waiting feedback；不重复成长 |
| empty + mature crop + 背包有容量 | 俯身 impact 时收获一次 |
| empty + mature crop + 背包满 | 俯身完成，作物保留，inventory-full feedback |
| selected slot 被消耗为空 | 下一 snapshot projection 自动清空 selection |
| modal/action busy | selection/use input ignored |

### 5. Good/Base/Bad Cases

- Good：按 1 选锄头→点击未耕地；选择种子→播种；选择浇水壶→浇水；成熟后取消选择→空手俯身收获。
- Base：选择斧头点击成熟作物，斧头动作播放但作物完全不动；再次按斧头槽回到空手。
- Bad：FarmPlot 根据 phase 自动选择动作、Vue 直接改 inventory、把 selected index 写进 current save，或错误工具仍触发 target shake。

### 6. Tests Required

- GameSession：新游戏三件工具；所有合法组合成功；tree 与每个 farm phase 的 wrong-item snapshot 全等；不存在旧 gather/farm-primary active 调用。
- Client store：初始空手、click/key toggle、空槽、最后一个 seed 消耗、modal/action lock。
- ActionTimeline：正确/错误工具都只派发一次；只有 success 调用 Tree/FarmPlot impact；空手 harvest 失败不移除 crop。
- 回归：Life Loop、Town Population、IndexedDB v2 backup、typecheck、client build；Git 图片/TMJ/migration diff 为零。

### 7. Wrong vs Correct

```typescript
// Wrong: target state chooses the player's item.
session.dispatch({ type: "farm-primary", tileId });

// Correct: client sends the selected item; domain validates the exact pair.
session.dispatch({ type: "use-item-on-target", itemId: selectedItemId, targetId: tileId });
```

## Scenario: presentation-only NPC hit reaction

### 1. Scope / Trigger

- Trigger：玩家空手按 Space 时需要一个短促挥拳反馈，并允许当前三个固定 NPC 产生非致命视觉反应；本场景不建立战斗领域状态。

### 2. Signatures

```typescript
type Facing = "down" | "up" | "left" | "right";

interface NpcHitCandidate extends WorldPoint {
  readonly entityId: string;
}

function selectNpcHitTarget<T extends NpcHitCandidate>(
  player: WorldPoint,
  facing: Facing,
  candidates: readonly T[],
): T | null;
```

### 3. Contracts

- Space 只在 `selectedItemId === ""`、world input unlocked、transition idle 和 ActionTimeline idle 时开始；工具、种子或其他手持物存在时完全无动作。
- 命中走廊固定为前向 `0..28px`、横向绝对距离 `<=10px`；多目标按欧氏距离平方、再按 stable entity ID 决定唯一目标。
- 玩家挥空仍播放 `120ms windup → 90ms impact → 180ms recovery`；命中只调用 NpcEntity 的临时闪白、约 6px 击退和复位。
- NPC Tiled spawn、脚底碰撞、GameState、StoredGame 和 IndexedDB 永远不因击打改变；切图/Scene shutdown 必须终止 tween、清 tint 并恢复 spawn。
- Phaser 4 的填充闪白使用 `setTint(color).setTintMode(Phaser.TintModes.FILL)`；禁止调用已移除参数语义的 `setTintFill(color)`。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| Space 时手持任意物品 | 无动画、无 NPC 反应 |
| 前方无合法 NPC | 只播放挥拳 |
| NPC 在背后、横向超 10px 或前向超 28px | NPC 不反应 |
| NPC 已在 reaction 中 | 不叠加 tween；当前挥拳正常结束 |
| Shop/Dialogue/休息确认/工具动作/切图中 | 忽略 Space |
| Scene teardown | 玩家与 NPC 临时坐标/tint 全部复位 |

### 5. Good/Base/Bad Cases

- Good：空手面对 NPC 按 Space，玩家短突进，最近的前方 NPC 闪白后退并回到原位，存档字节不变。
- Base：面对空地挥拳有动作；拿着锄头按 Space 完全无动作。
- Bad：把击打次数、NPC 坐标或血量写入 GameSession，按鼠标攻击，或让击退改变地图碰撞位置。

### 6. Tests Required

- 纯目标选择断言四方向、背后、横向、超距、最近目标与 stable ID tie-break。
- client typecheck 与 build 必须通过；Life Loop、Town Population 和工具交互窄合同不得回退。
- 真实浏览器检查空手/手持、挥空、命中、连续 Space、打开 modal 与切图后的 tint/坐标残留。

### 7. Wrong vs Correct

```typescript
// Wrong: a presentation hit becomes persistent combat state.
session.dispatch({ type: "damage-npc", npcId, amount: 1 });

// Correct: the client chooses one active-region visual target and restores it after feedback.
selectNpcHitTarget(player, facing, candidates)?.entity.playHitReaction(facingVector(facing));
```

## Scenario: anonymous local playtest entry

### 1. Scope / Trigger

- Trigger：前期只验证玩法，公开 `/` 取消注册、登录、论坛账号和身份检查门禁，但保留 Keycloak/OIDC/数据库基础设施供未来单独评审。

### 2. Signatures

```typescript
const LOCAL_PLAYTEST_OWNER_KEY = "local-playtest-v1";

function initializeLocalPlaytestGameSession(catalog: WorldCatalog): GameSession;
function initializeLocalGameSession(ownerKey: string, catalog: WorldCatalog): GameSession;
```

```json
{
  "registrationAllowed": false
}
```

### 3. Contracts

- `LOCAL_PLAYTEST_OWNER_KEY` 只由 `client/src/session/local-game-session.ts` 拥有；`App.vue` 只调用 `initializeLocalPlaytestGameSession`，不复制键值。
- `ownerKey` 不是用户 ID、设备 ID 或可识别信息；同一 origin + browser profile 只有一个试玩槽。tool-art preview 继续使用独立键，不覆盖正式试玩。
- IndexedDB 仍以 `ownerKey:slotId` 直接读写，不枚举 object store。旧 Keycloak subject hash owner key 记录保留但暂时不可达，不迁移、合并或删除。
- browser source/dependency/build env 不包含 `keycloak-js`、`VITE_KEYCLOAK_*`、token 刷新或 Keycloak/OIDC 请求；界面不显示账号入口。
- Compose 的 `frontend` 不得 `depends_on` Keycloak 或 `mirror-game`。Keycloak realm/client、论坛 Identity Provider、OIDC bridge、PostgreSQL、volumes 和 secrets 保留；realm 关闭独立注册。
- 未来重新引入账号时，必须单独评审试玩槽与账号槽的选择/合并规则；不在本合同预留自动绑定。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| Keycloak、论坛 bridge 或 PostgreSQL 不可达 | `frontend` 仍可启动，`/` 仍可新建/继续本地游戏 |
| 当前试玩槽缺失 | “继续游戏”禁用，“新游戏”可用 |
| 当前试玩槽损坏/未来版本 | 进入可恢复错误状态，不静默新建或覆盖 |
| 只存在旧 subject hash 槽 | 视为当前试玩槽缺失，旧记录不读取/改写 |
| 直接访问 Keycloak 注册 | realm 拒绝独立注册，已有 realm 数据不删除 |

### 5. Good/Base/Bad Cases

- Good：身份服务不可达时访问 `/`，新建 Day 1 / 100g 农场，刷新后“继续游戏”恢复同一 IndexedDB 槽。
- Base：首次访问直接显示本地菜单和存档丢失/不跨设备提示，不发起任何身份请求。
- Bad：只隐藏登录按钮但仍初始化 Keycloak，在 `App.vue` 复制 owner key，枚举旧存档猜测一个账号，或保留 `frontend -> keycloak/mirror-game` 启动依赖。

### 6. Tests Required

- 静态搜索 browser source、dependency、lockfile、Docker build args 和 env 样例，断言无 `keycloak-js`、`initializeKeycloakSession`、`deriveLocalSaveOwnerKey` 和 `VITE_KEYCLOAK_*`。
- 解析 realm JSON，断言 `registrationAllowed=false`，同时 `mirror-island-web` client 和 `parallellines` Identity Provider 仍存在；运行 `test:identity`。
- 解析 Compose config，断言 `frontend.depends_on` 不存在，Keycloak/bridge/database 服务仍存在。
- 运行 typecheck 和 client build；真实浏览器验证 `/` 不跳转、无账号入口、新游戏、刷新后继续和本地存档限制文案。

### 7. Wrong vs Correct

```typescript
// Wrong: the shell still owns authentication and derives a per-account key.
const auth = await initializeKeycloakSession();
initializeLocalGameSession(await deriveLocalSaveOwnerKey(auth.subject), catalog);

// Correct: the session adapter owns the single anonymous playtest key.
initializeLocalPlaytestGameSession(catalog);
```

```yaml
# Wrong: static gameplay cannot start until identity services start.
frontend:
  depends_on: [keycloak, mirror-game]

# Correct: frontend has no runtime service dependency.
frontend:
  build:
    dockerfile: apps/mirror-island/Dockerfile.web
```

## Scenario: generated homepage hero media

### 1. Scope / Trigger

- Trigger：公开 `/` 的非 playing 启动页需要一张项目原创东方田园主视觉；交互文字、按钮和存档状态仍由 Vue/HTML 渲染。

### 2. Signatures

```typescript
export const HOME_HERO_URL: string;
```

```text
assets/original/mirror-island-home/2026-08-31/mirror-island-home-hero.png
```

### 3. Contracts

- `client/src/game/assets/media-catalog.ts` 是首页 hero URL 的唯一 owner；`App.vue` 只把该 URL 注入 CSS custom property，不散落 CDN 地址。
- 正式 PNG 固定为 1672×941、2659416 bytes、SHA-256 `f1182c1ef76eba8a048dd2f424ed0219c80575629e01f46be8e59519e2fe7adf`。
- 图像不包含文字、按钮、品牌、存档状态或其他交互 UI；这些信息必须保持可访问 DOM。
- 对象通过 `/game-media/v1` 同源加载，CDN key 不可覆盖；生成 prompt 与采用记录位于 `docs/assets/mirror-island-home-hero-2026-08-31.md`。
- `prepare-media.mjs` 可以复用已存在且 bytes/hash 完全匹配的 ignored 本地输出；本地缺失或不匹配时必须从正式 CDN 下载并重新校验。
- repository-dispatch 使用 base64 临时源时，文本必须是无 BOM、无换行的纯 ASCII；本 hero 的精确长度为 3545888 字符。PowerShell 管道默认编码不可作为发布源，必须用 `UTF8Encoding(false)` 或等价无 BOM 写法并在 dispatch 前核对字符数和文件字节数相等。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| 本地 ignored hero bytes/hash 完全匹配 | `prepare:media` 复用，不发起重复下载 |
| 本地 hero 缺失或不匹配，CDN 对象正确 | 下载后校验并写入 ignored `public/game-media` |
| base64 临时源含 UTF-8 BOM、换行污染或长度不等于 3545888 | 工作流在 `base64 --decode` 阶段失败，S3 写入前终止；修正源后以同 object key/hash 幂等重试 |
| CDN 缺失、bytes/hash 不符或 key 已存在不同内容 | 发布/准备失败，不回退临时 Gist 或把图片提交 Git |
| 背景运行时加载失败 | CSS 同色系背景仍显示，菜单 DOM 和操作保持可用 |

### 5. Good/Base/Bad Cases

- Good：生产浏览器只请求登记的同源 PNG，画卷菜单和存档状态可被键盘与辅助技术读取。
- Base：本地已有精确生成输出时，开发启动不依赖重复网络下载。
- Bad：把生成图 base64 内联、指向临时 Gist、把按钮烘焙进 PNG，或把 PNG 加入 Git。

### 6. Tests Required

- `prepare:media` 断言 15 个对象并校验 hero bytes/hash；typecheck、client build 必须通过。
- dispatch 前断言 base64 字符数与无 BOM UTF-8 文件字节数都为 3545888；失败 run 必须确认停在 S3 写入之前。
- manifest 断言 15 images / 2874147 bytes；发布后从 CDN 和同源代理回读 hero 的尺寸、MIME、SHA-256 与 immutable cache。
- Git 图片 binary diff 为 0；真实浏览器覆盖桌面、手机、200% zoom、无存档/有存档、加载和错误状态。

### 7. Wrong vs Correct

```typescript
// Wrong: temporary generation output becomes a runtime dependency.
const hero = "https://gist.githubusercontent.com/.../hero.png";

// Correct: Vue injects the reviewed same-origin immutable media URL into CSS.
const homeHeroStyle = { "--home-hero-image": `url("${HOME_HERO_URL}")` };
```

## Scenario: browser-local audio feedback and ambience

### 1. Scope / Trigger

- Trigger：Farm/Town/Lakeshore/室内需要真实 SFX 与环境层，并提供独立于 gameplay save 的 Master/Music/SFX 本地音量设置。

### 2. Signatures

```typescript
interface AudioSettings {
  readonly version: 1;
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
}

type AudioCue =
  | "footstep" | "hoe" | "watering" | "axe" | "stone"
  | "harvest" | "pickup" | "door" | "buy" | "sell"
  | "dialogue-page" | "sleep";

function audioCueForCommandResult(
  command: GameCommand,
  feedback: ActionFeedback | null,
): AudioCue | null;

function updateAudioVolume(channel: "master" | "music" | "sfx", value: number): AudioSettings;
```

### 3. Contracts

- `AudioDirector` 是声音实例、one-shot、脚步轮换、区域 loop crossfade 和 teardown 的唯一 client owner；Vue、GameSession 与实体不得保存 `HTMLAudioElement`。
- typed command/result 先完成 gameplay mutation，再由 `audioCueForCommandResult` 映射成功 cue；失败交易、错误工具和无 mutation 结果不得播放成功音。
- 门声只在室内/室外边界播放，Farm↔Town、Town↔Foothills/Lakeshore 等纯室外切图不播放门声。
- current v12 中 stone/weed 只有在 `mined`/`cut` 已完成 domain mutation 后才映射 stone/harvest cue；错误工具、背包失败和无 mutation 结果保持静音。
- 音量设置 key 固定 `mirror-island.audio-settings.v1`，只含有限 0..1 数值；不进入 IndexedDB `GameState`，不包含身份、URL 或 secret。
- `Music Volume` 在本阶段保存但没有音乐轨；SFX 同时控制 one-shot 和环境层。
- 音频只从 manifest 登记的同源 `/game-media/v1` URL 读取。manifest schema v1 分别记录 `tracked_image_*` 与 `tracked_audio_*`；音频 MIME allowlist 为 `audio/ogg`、`audio/mpeg`、`audio/wav`，不得伪造 width/height。
- 19 个采用音频对象必须由 CDN 回读验证 bytes、SHA-256、MIME 与 `public,max-age=31536000,immutable`；Git tracked audio binary 必须为 0。
- autoplay/load rejection 只显示一次可恢复提示，游戏继续可用；直接用户点击“测试声音”后可恢复 one-shot 并重新启动当前环境层。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| localStorage 缺失、损坏、未来 version 或非有限音量 | 使用 reviewed defaults，不阻断游戏 |
| 音量超出 0..1 | decoder/update clamp 到边界 |
| buy/sell/harvest/pickup/tool mutation 失败 | 无对应成功 cue |
| autoplay 或单个文件 load/play reject | 一次错误提示；移除失败 voice，玩法继续；可通过测试声音重试 |
| 同 ambience group 重复 render | 保留当前层，不叠加 duplicate loop |
| region group 改变 | 旧层 650ms fade-out 并释放，新层从 0 fade-in |
| Scene shutdown/HMR | 取消 animation frame、停止所有 voice、解绑 cue/settings listener |
| manifest 音频包含 dimensions、未知 MIME、错误 totals/hash/URL | 构建/部署媒体校验失败 |

### 5. Good/Base/Bad Cases

- Good：玩家在 Farm 行走、耕作和浇水，进入 Town/室内/Lakeshore 时环境平滑切换；刷新后 80/70/80 音量偏好恢复。
- Base：Music slider 可调整并保存，但明确显示本阶段暂无配乐。
- Bad：Vue 直接 `new Audio`、失败购买也响金币、每次 render 都新增 loop、把音量写入 GameState，或从 Freesound/OpenGameArt URL 直接运行时加载。

### 6. Tests Required

- 纯合同断言 settings v1 decode/default/clamp、成功/失败 command→cue 映射和 region→ambience group。
- `test:town-population`、typecheck、client build；`prepare:media` 必须准备 19 个音频且逐项 hash 匹配。
- manifest validator 断言图片仍需正尺寸、音频禁止尺寸且 totals 分类型匹配；CDN verifier 对所有媒体检查 bytes/hash/MIME/cache，仅 PNG 检查 IHDR。
- 真人按交付清单听取所有 cue、Farm/Town/Lakeshore/室内层、循环接缝、相对响度、静音和 autoplay 恢复；Agent 不伪造听感通过。

### 7. Wrong vs Correct

```typescript
// Wrong: component duplicates mutation rules and plays success before the domain result.
coinSound.play();
dispatchLocalGameCommand({ type: "buy-item", itemId, quantity: 1 });

// Correct: one adapter maps the committed typed result into a semantic cue.
const feedback = activeSession.dispatch(command);
const cue = audioCueForCommandResult(command, feedback);
if (cue) emitAudioCue(cue);
```

```typescript
// Wrong: audio preference changes the durable gameplay schema.
state.musicVolume = sliderValue;

// Correct: non-sensitive local preference remains outside GameState.
updateAudioVolume("music", sliderValue);
```

## Scenario: retention GameState v8

### 1. Scope / Trigger

- Trigger：首周需要 24→32 背包、水壶 Lv2、确定性每日委托、关系对话历史、once-only 事件和 Spring28 后继续 Day N，必须一次升级本地 durable contract。

### 2. Signatures

```typescript
type InventoryCapacity = 24 | 32;
type WateringCanLevel = 1 | 2;
type RelationshipStage = "stranger" | "familiar" | "friendly";

interface DailyRequestState {
  day: number;
  requestId: string;
  completed: boolean;
}

interface NpcDialogueState {
  recent: Array<{ dialogueId: string; day: number }>;
  acknowledgedStage: RelationshipStage;
}

interface GameState {
  readonly version: 8;
  inventory: InventorySlot[];
  inventoryCapacity: InventoryCapacity;
  wateringCanLevel: WateringCanLevel;
  dailyRequest: DailyRequestState | null;
  npcDialogue: Record<string, NpcDialogueState>;
  seenEventIds: RetentionEventId[];
}
```

```typescript
type GameCommand =
  | { type: "use-item-on-target"; itemId: ItemId | ""; targetId: string; facing?: Facing }
  | { type: "upgrade-watering-can" }
  | { type: "upgrade-backpack" }
  | { type: "acknowledge-retention-event"; eventId: RetentionEventId }
  | /* existing commands */;
```

### 3. Contracts

- `SAVE_FORMAT_VERSION` 与 `GAME_STATE_VERSION` 同步为 8；v7 通过唯一 `migrateGameStateV7` 增加 24/Lv1、deterministic current request、空 dialogue/event state，v1–v6 继续走各自 released decoder 后补同一 v8 defaults。
- current v8 inventory length 必须等于 `inventoryCapacity`；v1–v7 迁移输入仍必须先满足 released 24-slot shape。24→32 只在华强附近、Day≥5、1500g 时追加八个空槽，前24槽和八格 Hotbar 不移动。
- 水壶 Lv2 只在 Town/Blacksmith 的昊天附近、Day≥3、900g+15 wood 时购买；无耐久、体力、水量或通用 upgrade tree。
- Lv2 watering 先验证 clicked plot 42px 距离，再按 facing 的 0/16/32 像素中心查找 catalog 注册的 same-region contiguous plots；只改变 `growing && !watered`，不得合成 ID 或越界。
- Day1 `dailyRequest=null`；Day≥2 使用 `(day-2)%8` 选择并保存 request ID。submit 必须 target NPC、足量 item、safe Gold；consume + Gold + capped Friendship + completed 在同一 GameSession mutation 中完成，重复 submit 不领奖，sleep 无惩罚替换次日 request。
- 内部 friendship 保持 250 points/heart、2500 max、daily talk +20、missed -2；外显 stage 只投影 250 familiar / 500 friendly。
- Domain `NpcDialogueSystem` 按 request→event→new stage→activity→personality 选择稳定 ID，排除当前及前三个 absolute day history，最多保存12条。中文文本由 client catalog 按 stable ID 渲染，不进入 save；候选/优先级/history mutation 不能在 client 复制。
- 两心事件继续由同一 `NpcDialogueSystem` 按 NPC identity + 当前 `regionId` 判定：华强只允许在 `seed-shop`，昊天只允许在 `town` 或 `blacksmith`；住宅或其他日程地点的普通交谈不得消费 once-only event ID。
- `seenEventIds` 是 closed catalog，当前含华强/昊天两心事件与 Day3/5/7 里程碑；unknown/duplicate ID current decode 失败。
- `FirstWeekMilestoneSystem` 只接受 Day3/5/7 三个 milestone ID：日期未到、两心 event ID 或重复确认均不写 state；成功确认由 GameSession 立即 publish/save，并由现有 feedback toast 展示一次。功能可用性始终按 absolute day 判定，不能反向依赖 seen ID。
- 当前 gameplay 使用 `playableCalendarAt`：absolute Day N 永不进入未实现 Summer，crop/shop/forage 继续 spring content。`calendarAt` 只保留未来四季工具，不得被当前 gameplay/UI 用来重置 Day29。
- LifeHud/CalendarPanel 只外显 absolute `Day N`、星期与滚动 28 天页，不显示“春季结束”或未实现季节；TodayHint 只从 snapshot 派生首周目标，Day4 必须读取实际 friendship points。
- v10 已删除 `lakeshore-waystone` 的微光和镜门预告；所有日期均是普通环境说明。Day7 改为领取鱼竿/旧码头钓鱼引导，不注册出口或 Expedition state。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| v7 合法 Day1/Day28 save | 确定性迁移 v8；保留位置、Gold、inventory、farm、friendship |
| current v8 缺字段、future version、unknown request/dialogue/event | load 明确失败，原 IndexedDB record 不覆盖 |
| capacity=32 但 inventory=24 或其他长度 | `Inventory state is invalid` |
| upgrade locked/remote/already owned/Gold或wood不足 | fixed error feedback；inventory/Gold/level/capacity 不变 |
| request missing item/non-target/already completed | 无扣物、无奖励；对应 dialogue state 可见 |
| 两心 NPC 在非工作地点交谈 | 不选择 event dialogue，不写入 `seenEventIds`；到正确地点后仍可触发一次 |
| request reward Gold 超 safe integer 或 friendship missing | mutation 抛错并恢复 inventory/Gold/friendship |
| dialogue history >12、future/过旧 day、unknown/duplicate recent ID | current v8 decode 失败 |
| milestone 日期未到 / two-heart ID / 已确认 | 返回固定 feedback，`seenEventIds` 不变；只有首次已解锁 milestone 追加并保存 |
| Day28 sleep | friendship/farm/forage/request 只结算一次，进入 Day29 06:00 |

### 5. Good/Base/Bad Cases

- Good：Day2 华强委托完成后加170，Day1–4 每日交谈各20，Day4 恰好250并优先 familiar 台词；刷新不 reroll。
- Base：玩家不做委托，睡觉后请求自然过期，无惩罚；absolute day 继续增长。
- Bad：Vue 直接 push 8 slots/seen ID、Phaser 循环调用三次 watering、用 `Math.random()` 生成委托、保存中文 dialogue text，让 `calendarAt(29).season` 驱动当前玩法，或把 Day7 石标注册成出口。

### 6. Tests Required

- Life Loop：Day3 之前确认失败、two-heart ID 不被 milestone system 接受、首次确认保存、重复确认幂等；Day6 deterministic request 仍为15木材/320g/100关系奖励。
- Town/client：Day6/Day7 waystone 都保持同一句普通说明；新 typed command 在 audio mapping 明确映射或静音。
- 自动门禁：`test:life-loop`、`test:town-population`、typecheck、client build；镜光体感、提示时机、手机/200% zoom 与 Day1–7/Day29 连玩由真人验收，不由 Agent 代签。

### 7. Wrong vs Correct

```typescript
// Wrong: UI writes durable presentation history or uses it as an unlock flag.
state.seenEventIds.push("day-5-backpack-intro");
const backpackAvailable = state.seenEventIds.includes("day-5-backpack-intro");

// Correct: UI dispatches one closed acknowledgement; domain unlocks remain day-owned.
dispatchLocalGameCommand({
  type: "acknowledge-retention-event",
  eventId: "day-5-backpack-intro",
});
const backpackAvailable = state.day >= 5;
```

### 6. Tests Required

- `test:life-loop` 覆盖 v1–v7→v8、current round-trip、unknown/future/capacity mismatch、upgrade atomicity、three-tile boundary、request once-only、Day4 points、dialogue history、event once-only、Day28→29。
- `test:town-population` 覆盖现有 modal/Hotbar/NPC contracts 与新 snapshot 字段兼容。
- typecheck + client build；不连接数据库、不新增 migration/E2E 矩阵。
- 真人后续验证 IndexedDB refresh/continue、三格实际朝向、委托交付和 Day29 UI；Agent 不伪造人工通过。

### 7. Wrong vs Correct

```typescript
// Wrong: UI owns the permanent capacity mutation.
gameUiState.inventory.push(...eightEmptySlots);

// Correct: UI sends a typed command; GameSession owns the atomic upgrade.
dispatchLocalGameCommand({ type: "upgrade-backpack" });
```

```typescript
// Wrong: reload can reroll the same day.
state.dailyRequest = requests[Math.floor(Math.random() * requests.length)];

// Correct: absolute day selects and save records one deterministic ID.
state.dailyRequest = createDailyRequestState(state.day);
```

## Scenario: home cat and dog GameState v9

### 1. Scope / Trigger

- Trigger：Retention v8 已稳定，但 Day 2 缺少一个可恢复、低负担的家园伙伴循环；本场景只拥有一次猫/狗领养、Farm/Cottage 表现与每日一次抚摸。
- 饥饿、喂食、疾病、繁殖、战斗、农场工作、第二只宠物、换宠和通用 animal framework 均不在本场景。

### 2. Signatures

```typescript
type PetSpecies = "cat" | "dog";

interface PetState {
  readonly species: PetSpecies;
  readonly name: string;
  readonly adoptedDay: number;
  bond: number;          // hidden 0..100
  lastPettedDay: number; // 0 or adoptedDay..state.day
}

type GameCommand =
  | { readonly type: "adopt-pet"; readonly species: PetSpecies; readonly name: string }
  | { readonly type: "pet-home-pet" }
  | ExistingGameCommand;

function homePetRegionAt(minuteOfDay: number): "farm" | "cottage";
```

### 3. Contracts

- `SAVE_FORMAT_VERSION` 与 `GAME_STATE_VERSION` 同步为 9；v8 完整验证后由唯一 `migrateGameStateV8` 补 `pet:null`，v1–v7 的既有 decoder 直接输出相同 current default。
- `adopt-pet` 只在 Day≥2 且 `pet===null` 成功；species 是 closed cat/dog，name trim 后为 1–12 Unicode code points 且不含控制字符。确认后没有遗弃、替换或重领命令。
- Day≥2、`pet===null` 只在玩家进入 Farm 小院时打开领养 modal；取消只写 client transient deferral，不写 `seenEventIds` 或 save，下一次进入 Farm/playing 仍可补发。
- `pet-home-pet` 只在当前 `homePetRegionAt` 对应区域成功；每日首次设置 `lastPettedDay=day` 并把 bond 加一、封顶100，同日重复只返回温和反馈且不 publish/save。
- 06:00–17:59 宠物在 Farm，18:00–24:00 在 Cottage；位置、anchor index、motion、idle/rest cadence 和 sprite frame 均为 client presentation，不进入 GameState/StoredGame。
- Farm/Cottage 各有三个 Tiled `SpawnPoints` pet anchor；client 在启动时采样验证短直线路径不穿 Collision。PetEntity 不进入 NPC registry、schedule、friendship、dynamic avoidance 或玩家碰撞集合。
- 正式媒体为 bluecarrot16 `[LPC] Cats and Dogs` 两个原始 512×256 PNG，按 CC BY 3.0 选项采用并交付 NOTICE；runtime 只选橘猫/黄犬 32×32 frame。CDN 缺图时 code-drawn fallback 保持命令与存档可用，Git 不跟踪媒体二进制。

### 4. Validation & Error Matrix

| 条件 | 结果 |
|---|---|
| v8 合法 save | 迁移 v9 `pet:null`，其余 retention/progression 字段保持 |
| current v9 缺 pet、unknown species、非法 name/bond/day | decode 明确失败，原 IndexedDB record 不覆盖 |
| Day1 adopt / 已有 pet 再 adopt | fixed error feedback；state byte-equivalent |
| Farm 白天或 Cottage 夜间首次 pet | bond +1、lastPettedDay=current day、critical save |
| 同日重复 pet | bond/day 不变，只返回 already-petted feedback |
| 非 home region、Town/Foothills/Lakeshore | 无宠物 projection；命令返回 pet-not-present |
| CDN pet sheet 缺失 | 显示可恢复媒体提示并使用 code-drawn pet；玩法继续 |

### 5. Good/Base/Bad Cases

- Good：Day 2 走出 Cottage 到小院，选择黄犬并命名“来福”，确认后 Farm 看见闲逛；刷新仍是来福，当日重复抚摸不加 bond，睡觉后可再互动。
- Base：选择“稍后再说”零 mutation；离开/刷新后再次进入 Farm 仍出现同一 pending choice。
- Bad：把宠物复用为 NPC friendship/schedule identity、保存 world 坐标/animation frame、Vue 直接写 bond，或用 seen event 永久吞掉取消后的领养。

### 6. Tests Required

- `test:life-loop` 覆盖 v8→v9、v9 幂等、损坏宠物字段、Unicode name、不可重复领养、每日 bond 与刷新恢复。
- `test:town-population` 覆盖 Farm-only pending modal、取消 deferral、统一 input lock 与 pet command 静音映射。
- 正式 Farm/Cottage decoder 断言各三个 anchor 且闭环采样不穿 Collision；typecheck、client build、manifest totals 与 Git 媒体二进制为0。
- 真人检查猫/狗各一次、闲逛/休息/爱心、手机/键盘/200% zoom、CDN 缺图 fallback；Agent 不代签 CDN 对象或听感。

### 7. Wrong vs Correct

```typescript
// Wrong: presentation invents durable identity/progress and joins NPC collision.
gameUiState.pet.bond += 1;
activeNpcs.push(petSprite);

// Correct: UI dispatches one typed command; domain owns durable progress and client owns only motion.
dispatchLocalGameCommand({ type: "pet-home-pet" });
const snapshot = session.snapshot();
if (snapshot.pet) petEntity.project(snapshot.pet, snapshot.day, presentationAnchors);
```

## Open-source contract

- Phaser/Vue 和既有固定开源来源继续锁版本；规则迁移以当前 checkpoint 源码为依据，不建立复制分叉。
- 已评审 `idb@8.0.3`，许可证 ISC 不在默认 allowlist，且当前接口窄，因此采用受控原生 IndexedDB 薄层并记录拒绝原因。
- 第三方图片与音频核对官方固定来源及覆盖实际用途的许可；原创媒体记录制作来源与版本，AI 生成保留真实 prompt sidecar。两者均遵循不可变 `game/media/v1` manifest 和 Git 游戏媒体二进制为零。
- 美术以质量和风格统一为准，不要求全部开源，不设现成/自制比例；达不到要求的现成素材可以由项目原创替换，具体制作与实景验收标准以 `docs/IMAGE_ASSETS_SPEC.md` 为准。
- 用户已选定 A「清新田园」作为后续视觉方向，采用明亮配色、清晰像素簇与轻快比例；先成组统一五件工具与小屋内外。示例尺寸不直接改变现有 Tilemap、碰撞、相机或存档合同，正式素材按实际缩放、动作和遮挡验收；当前示例尚未接入运行时。
- VectoRaith Farming v1.08 与 NPC v1.6 DEMO 采用自定义项目使用许可。用户已批准 Web runtime 直接读取登记的官方完整 PNG 并接受作者回复前的残余风险；禁止原 ZIP、32/48px 版本、未采用目录、素材浏览/下载入口或素材包式产品。作者回复若附加条件则 forward-fix。

## Verification

- 默认只运行 TypeScript、client build、必要 server build 和配置解析；不扩建大规模自动测试矩阵。
- 修改 Keycloak、论坛 OIDC bridge、反向代理或 server image 时，运行现有 `test:identity`；生产 server image 构建固定先执行容器内可独立运行的 `test:oidc`，确保带路径 issuer 的 discovery 与真实授权 route 一致。
- 人工浏览器验收新游戏、继续游戏、本地玩法闭环、刷新恢复和损坏存档错误状态。
- 默认不连接数据库、不新增 migration；生产部署只在用户明确授权后执行。

```powershell
npm --prefix .\apps\mirror-island run typecheck
npm --prefix .\apps\mirror-island run test:identity
npm --prefix .\apps\mirror-island run build:client
npm --prefix .\apps\mirror-island run build:server
docker compose -f docker-compose.yml -f deploy/docker-compose.mirror-island.yml config
```
