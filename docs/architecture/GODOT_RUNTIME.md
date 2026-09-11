# Godot 单人引擎迁移

用户于 2026-09-07 明确要求完整迁移。当前本地客户端为 Godot/GDScript，原玩法已接入，npm 默认入口已切换；真人完整验收和公开部署仍需分别完成。真实城市和新玩法不属于本轮范围；物品、配方、技能与职业显示名按用户最新要求使用星露谷官方简体中文名，地图、角色和游戏标题仍保留当前项目身份。

## Scenario: 春季深山湖大头鱼

### 1. Scope / Trigger

- `lakeshore-old-dock-fishing` 的 `fishHabitat` 为 `mountain-lake`；当前春季普通鱼已含鲤鱼、鲢鱼、大嘴鲈鱼，补入同水域的大头鱼。
- 该批只扩内容数据与像素图标，复用已有钓鱼候选、品质、完美、库存、出货、食用和礼物入口，不新增 `GameState` 字段、命令或存档版本。

### 2. Signatures

- 鱼定义：`{itemId:"bullhead", minMinute:360, maxMinute:1560, minCast:0, pull:14, difficulty:46, habitats:["mountain-lake"]}`。
- 物品：`items.bullhead={category:"fish", shippingCategory:"fishing", staminaRestore:25, hasQuality:true, edibility:10}`；`prices.bullhead=75`。
- 筛选入口：`FarmFishingRules._eligible(state, strength) -> Array`，必须读取当前钓位 `fishHabitat`。

### 3. Contracts

- 大头鱼为全天、任意天气、全季深山湖鱼；当前春季世界无季节字段，因此不添加不存在的季节过滤。
- 普通品质经验按 `floor(3 + 46 / 3)=18`，品质与完美仍复用 `FarmSkillRules.fishing_xp()`；`pull=14` 只控制当前简化张力，不能当作原作 Smooth 行为或难度。
- 当前八位居民必须都有 `bullhead` 礼物偏好，图标必须是 `media.items.bullhead` 的 16×16 矩阵；物品排序连续唯一。`FarmSocialRules.GIFT_POINTS` 固定为 `liked:45 / neutral:20 / disliked:-20 / hated:-40`，负向偏好不受品质倍率。
- 封套 13 / 状态 25 不变。不得为新增内容虚构开发档迁移或宣称旧运行时可读取含大头鱼的存档。

### 4. Validation & Error Matrix

- 镇河钓位 → 大头鱼不在候选池。
- 满包、逃脱或保存失败 → 大头鱼和 18 XP 均不发布；`retry-fishing-save` 只提交原候选。
- 任一当前居民缺少 `bullhead` 偏好或图标行数/宽度不是 16 → 内容检查失败，不能交付。
- `hated` → 返回 `gift-hated`、扣 40 好感并消费一件；未知偏好 → `invalid-gift-preference`，库存与好感均不变。

### 5. Good / Base / Bad Cases

- Good：在湖岸旧码头收线大头鱼，库存增加 1 条、钓鱼经验增加 18，后续可出货、食用或送礼。
- Base：同一时段镇河只从河鱼池选择，湖岸雨天仍可选择大头鱼。
- Bad：把夏季虹鳟、绿藻或传说之鱼当作本批普通鱼，或给大头鱼另设 UI 发奖路径。

### 6. Tests Required

- `test:fishing` 逐项断言大头鱼水域、时段、价格、体力、难度、XP、当前 `pull`、八位偏好与真实收线结果。
- 命名检查断言 `bullhead` 显示 `大头鱼`；`typecheck:client` 和 `build:client` 校验 JSON、16×16 图标、内容准备和 Web 导出。
- `test:godot` 保留既有确定性钓鱼 fixture；新增鱼池后先复算其索引，再更新期望，禁止用实际结果反推不相关字段。

### 7. Wrong vs Correct

Wrong：只把 `bullhead` 加到 `rules.fish`，遗漏 item、price、media 或任一居民偏好，或把 `pull` 当作原作难度。

Correct：在同一内容表补全物品、价格、鱼池、素材和偏好，由既有 `FarmFishingRules` 统一结算品质、XP 和保存。

## Scenario: 围栏寿命与大门

### 1. Scope / Trigger

- 当前围栏体系包含 `wood-fence`、`stone-fence` 和 `gate`，只允许在农场合法 `placeableTiles` 上摆放。
- 关闭的大门与普通围栏一样阻挡移动；打开的大门允许通行，但仍然占用格子，不能被野采、作物或其它物件覆盖。

### 2. Signatures

- 状态：普通围栏对象为 `{id, kind, regionId:"farm", column, row, placedDay:int, damaged:bool}`。
- 状态：大门对象额外带 `{open:bool}`。
- 命令：`place-world-object`、`recover-fence`、兼容旧入口 `recover-stone-fence`、`toggle-gate`。
- 规则：`FarmFenceRules.durability_days(state, object) -> int` 与 `FarmFenceRules.settle_day(state) -> {damaged, vanished}`。

### 3. Contracts

- `wood-fence` 默认已知，2 木材制作 1 个，1g 出货，寿命 48–52 天；`gate` 默认已知，10 木材制作 1 个，4g 出货，寿命 360 天；`stone-fence` 为耕种 2 级确认后解锁，2 石头制作 1 个，2g 出货，寿命 106–109 天。
- 放置成功必须在同一候选中扣物品、应用预检副作用、写入 `placedDay/damaged/open` 并追加世界对象；保存失败不能发布半状态。
- `GameSession._settle_day()` 在天数加一后结算围栏老化：寿命结束的新一天先标记损坏，损坏状态再过一天消失。`fenceEvents` 只放在 UI 日结摘要，不持久化到出货报告。
- 完整围栏和大门用十字镐回收时先检查背包容量并返还同名物品；损坏对象只清理不返还物品。错误工具不能回收完整围栏。
- 任意新围栏可替换损坏围栏；大门可替换未损坏普通围栏。替换发生在 `FarmWorldRules.apply_placement()`，避免放置层和世界层各删一次。
- `toggle-gate` 只处理可达大门。打开直接成功；关闭前必须确认玩家、居民和伙伴脚点不与门格重叠。
- 封套 13 / 状态 25 严格校验围栏区域、坐标、`placedDay`、`damaged` 和大门 `open`；缺字段或旧封套直接拒绝，不迁移开发档。

### 4. Validation & Error Matrix

- 非农场、地图阻挡、水面、出口、资源、作物、其它物件或实体占用 → `blocked`，不扣围栏。
- 未确认耕种 2 级石围栏配方 → `unknown-recipe`，不扣石头。
- 完整围栏回收时工具不是十字镐 → `wrong-tool`；背包满 → `inventory-full`，世界物件保留。
- 大门关闭且门格有人或伙伴 → `blocked`，保持打开。
- 存档缺 `placedDay`、`damaged` 或大门 `open` → 拒绝，不补默认值。

### 5. Good / Base / Bad Cases

- Good：放置石围栏后睡到寿命结束的新一天，报告提示围栏损坏；再睡一天对象消失。
- Base：木围栏和大门新档即可制作；大门关闭阻挡，打开后同一格移动不再被 `covers()` 拦截。
- Bad：把打开的大门当空地刷野采、回收损坏围栏返还物品、保存失败后仍删除围栏，或允许角色站在门格上关门，均违反合同。

### 6. Tests Required

- 围栏专项覆盖三类配方、价格、图标、礼物偏好、石围栏升级解锁、摆放原子性、碰撞、回收、替换、老化和存档字段。
- 命名检查断言 `木围栏`、`石围栏`、`大门`，并拒绝运行时残留 `木栅栏` / `石栅栏`。
- 运行 `typecheck:client`、`test:godot`、`test:energy`、`test:fishing`、`test:views` 和 `build:client`，确认版本升级与 UI 入口未破坏既有链路。

### 7. Wrong vs Correct

Wrong：直接让 `covers()` 对打开大门返回 false 并复用于所有系统，会导致野采、摆放和作物把门格误判为空。

Correct：`covers()` 默认保持占用语义，只在移动碰撞调用时传入打开大门可通行参数。

## Scenario: 湖岸基础钓鱼经验与熟练度

### 1. Scope / Trigger

- 当前唯一可用钓位为 `lakeshore-old-dock-fishing`；只有原作可在山湖出现的现有候选鱼才能进入活动鱼表。
- 成功钓获必须进入第四条 `fishing` 技能及同一候选保存，不能由界面、音效或保存重试补发经验。

### 2. Signatures

- 状态：`skills.fishing={xp,level,reportedLevel}`，`professions.fishing=[]`。
- 规则：`FarmSkillRules.fishing_xp(quality: int, difficulty: int) -> int`。
- 活动鱼：`{itemId,minMinute,maxMinute,minCast,pull,difficulty}`；`pull` 只控制当前张力，`difficulty` 只进入原作基础经验公式。
- 工具映射：`FarmSkillRules.TOOL_SKILLS["fishing-rod"]="fishing"`。

### 3. Contracts

- 湖岸活动鱼只含鲤鱼、鲢鱼、大嘴鲈鱼；普通售价 / 恢复 / 时段 / 难度 / XP 分别为 `30/13/全天/15/8`、`50/25/全天/35/14`、`100/38/06:00–19:00/50/19`。三者任意天气且 `minCast=0`。
- 西鲱、小嘴鲈鱼、鲷鱼保留物品、素材和偏好记录，没有真实河流 / 池塘钓位前不进入活动鱼表。
- 当前鱼没有 `hasQuality`，钓获品质固定为 0；完美、宝箱和传奇结果尚未存在，因此只计算 `floor((quality+1)*3+difficulty/3)`，不添加虚假的布尔状态。
- 满包必须在增加 XP 前返回；保存失败保留已算好的鱼获候选，`retry-fishing-save` 只重写该候选。
- 封套 12 / 状态 24 要求 `skills` 与 `professions` 都具有 farming / foraging / mining / fishing 四键；旧 11 / 23 保留并拒绝。

```gdscript
if inventory.add(state.inventory, runtime.fish.itemId, 1, 0):
	FarmSkillRules.gain(state, "fishing", FarmSkillRules.fishing_xp(0, runtime.fish.difficulty))
```

### 4. Validation & Error Matrix

- 缺 `skills.fishing` 或 `professions.fishing` → `技能集合无效。` / `职业集合无效。`
- `professions.fishing` 非空 → `职业重复或未知。`，未接入两条真实效果前不允许写入。
- 体力恰为当前 `unit_cost` → 允许抛竿；少于该值 → `insufficient-stamina` 且状态不变。
- 鱼获满包 → `inventory-full`，鱼和 XP 都不发布；鱼逃脱 → `escaped`，不增加 XP。
- 捕获保存失败 → `save-failed`，公开状态不变；重试成功后鱼与 XP 各出现一次。

### 5. Good / Base / Bad Cases

- Good：92 钓鱼 XP 捕获普通鲤鱼后变为 100 / 1 级，下一次抛竿耗能 7.9，夜间报告显示 `钓鱼提升：0 → 1 级`。
- Base：0 级捕获普通鲢鱼获得 14 XP；技能页显示钓鱼进度，没有职业按钮。
- Bad：湖岸抽到西鲱、用 `pull` 计算 XP、满包后仍加 XP，或保存重试再次运行捕鱼 tick，均违反合同。

### 6. Tests Required

- 三条湖鱼逐项断言价格、恢复、时段、`pull`、`difficulty` 与 8 / 14 / 19 XP；三条河流 / 池塘鱼不在活动池。
- 内存会话覆盖普通品质入包、满包、逃脱、保存失败和重复重试；断言经验与鱼获原子提交。
- 断言封套 12 / 状态 24 四键往返，当前封套拒绝状态 23，旧封套 11 原文保留。
- 固定迁移钓鱼案例在三鱼池下得到大嘴鲈鱼、19 XP 与取整张力 47；技能页、日结文字、typecheck 及两端导出通过。

### 7. Wrong vs Correct

Wrong：在 `GameSession.tick()` 收到 `caught` 后另行修改公开状态，或按固定 8 点预检抛竿；前者会绕开候选保存，后者会错误拒绝已有熟练度的 7.9 体力玩家。

Correct：`FarmFishingRules.tick()` 在候选库存成功入鱼后增加 XP，抛竿预检与实际扣费都读取 `FarmEnergyRules.unit_cost()`。

## Scenario: 采集 5 级职业与星露谷命名基线

### 1. Scope / Trigger

- 当技能升级跨越 5 级并有两条已接入真实效果的职业时，日结必须生成持久选择，玩家选择成功后才可开始新一天。
- 直接映射《星露谷物语》的现有物品、配方、技能和职业，显示名使用官方简体中文维基名称；内部 ID 可在行为映射完成前保持稳定，但必须记录仍未对齐的数值与生成条件。

### 2. Signatures

- 命令：`{type:"choose-profession", skill:"foraging", level:5, profession:"forester"|"gatherer"}`。
- 状态：`professions:{farming:[], foraging:[], mining:[], fishing:[]}`；S2-J 仅允许 `foraging` 含一个 5 级职业。
- 日结：`professionChoices:[{skill:"foraging", level:5, options:["forester","gatherer"]}]`。
- 效果入口：`FarmSkillRules.has_profession(state, skill, profession)` 与 `FarmResourceRules.gatherer_double(state, day, key)`。

### 3. Contracts

- `sleep` 先结算当日出货与升级，再持久化待选项；职业不追溯当日收入或劳动。
- `choose-profession` 在状态副本写入职业并移除对应待选项，保存成功后发布；待选项存在时 `dismiss-day-settlement` 必须拒绝。
- 护林人对普通树 / 树桩最低木材 12 / 5 应用 1.25 倍并向下取整为 15 / 6；技能和每日运气导致的额外木材尚未接入。
- 收集者只作用于地面野采与野生种子收获，使用独立稳定键判 20%；双份保持同品质，采集经验按 2 件计算，野种耕种经验仍按一株计算。
- 当前显示名示例：`wood` 为 `木材`、`pickaxe` 为 `十字镐`、`field-snack` 为 `工作小食`、`basic-fertilizer` 为 `初级肥料`、`farming` 为 `耕种`、`gatherer` 为 `收集者`。不得自行翻译成近义词。

### 4. Validation & Error Matrix

- 缺少 `professions`、技能键不完整、未知职业、非采集技能写入职业 → 存档拒绝。
- 职业存在但采集 `reportedLevel < 5` → `职业等级条件不满足。`
- 采集已确认 5 级、无职业且无合法待选项 → `采集五级职业尚未选择。`
- 待选项不是固定技能 / 等级 / 顺序，或没有对应跨级记录 → 报告拒绝。
- 待选未清空就关闭报告 → `profession-choice-required`；未知命令选项 → `invalid-profession-choice`。
- 双份产物容量不足或职业选择保存失败 → 当前状态不变，重试复用同一候选。

### 5. Good / Base / Bad Cases

- Good：采集 4→5 日结出现护林人 / 收集者；选择保存后按钮消失，关闭报告后技能页显示职业。
- Base：采集未到 5 级、或达到 5 级但尚未过夜，职业数组为空且效果不生效。
- Bad：客户端直接发送 `botanist`、删除待选项、交换固定选项顺序，或给耕种写 `forester`，均不得发布状态。

### 6. Tests Required

- 内存会话断言日结失败、选择失败、继续恢复和关闭门禁；当前断言封套 12 / 状态 24，旧 11 / 23 原文保留并拒绝。
- 真实资源入口断言普通 / 护林树木 12 / 5 与 15 / 6，经验保持锁定 1.6.15 的 14 / 2。
- 命中收集者样本时断言地面野采 2 件 / 14 XP，野生种子 2 件同品质 / 3 耕种 XP / 4 采集 XP，并覆盖满包与保存重试。
- 命名检查逐项断言当前物品、配方、技能、职业及旧显示名残留为零；UI 隔离档核对选择与技能页。

### 7. Wrong vs Correct

Wrong：用 `reportedLevel >= 5` 直接启用职业，或在 UI 点击时只改本地标签；这样能跳过选择，也无法从失败保存恢复。

Correct：日结保存 `professionChoices`，`choose-profession` 修改 GameSession 候选，领域效果只读取已持久化的 `professions`。

## 工程合同

- S2-I 将肥料枚举扩为 0 无 / 1 初级肥料 / 2 初级保湿土，保存字段形状不变。保湿土全阶段可用且与其他肥料互斥；结算当日生长后仅已湿地块进行稳定保水判定，次日雨水再覆盖。品质公式只接收 0/1 品质肥料等级，不能直接消费土壤类型枚举。下文 S2-H 的 0/1 范围由本条更新。

- apps/mirror-island/godot 为新工程；版本、官方来源与校验值由 engine-lock.json 固定。
- GDScript 使用类型标注和方法级中文注释。Compatibility、单线程 Web；Windows 产物为原生引擎和 pck。
- generated/、media/、addons/YATI/、exports/ 和 .godot/ 由限定脚本重建，不进入 Git。
- scenes/regions 是人工覆盖入口，生成脚本只在文件不存在时创建，不覆盖编辑器保存的修改。
- YATI 输入不包含碰撞掩码的可见图层；碰撞体由当前 decoder 的 blocked 数组按连续横段生成。出口与出生点稳定 ID 不重命名。
- 角色保持 48×64 原帧、脚底 60、0.5 世界缩放；遮罩 R 指定材质，换色保留原 alpha。农具动作只在内存中拆分并转动当前上装的原手臂像素，不改写源 PNG；正常行走仍使用完整原帧。
- 五类工具共用一次动作生命周期，各自具有举臂、工具轨迹和上身姿态。保持 0.12 秒命中、0.16 秒恢复与一次领域命令；切图、菜单或取消发生在命中前时不提交，结束或退出时恢复姿势。成功后才生成对应碎屑/水花，声音沿用成功反馈映射，不重复播放。
- 中文必须绑定明确 Font/Theme，不能依赖 Web 导出不可用的系统字体。原浏览器 UI 字体不是 Godot Web 字体来源。
- 窗口尺寸变化时保持可读 UI 和原游戏像素比例，不把固定横屏画布整体缩成手机中间小图。
- 已打开背包切换宽窄屏时也必须重算列数，并在最小尺寸更新后应用弹窗目标宽度；不能只在初次打开时决定十二列/六列。Godot 元数据键使用合法标识符，例如 `slot_grid`。
- `game_session.gd` 为唯一可变状态所有者；关键命令在隔离候选里执行并保存成功后发布。普通移动检查点不冻结输入，关键保存等其完成后再写，失败重试使用同一候选。
- `data/*.json` 为物品、配方、鱼种、对话、日程和美术元数据，是直接维护的权威内容。旧客户端和旧 TS 玩法已删除，不再生成跨引擎快照。`scripts/content/` 只做 Tiled 构建期校验；`tools/interior-atlases.json` 为室内绘图源，由原生工具重建，不随游戏发布。
- Godot JSON 整数会读成 float；规范化安全整数后再做封闭枚举校验。规范化前限制未知输入嵌套和节点数，保存字段仍逐层严格验证。
- 当前封套版本为 13，状态版本为 25。S1-A 将 `turnip/turnip-seed` 替换为 `parsnip/parsnip-seed`，防风草生长 4 天、种价 20、普通售价 35、普通食用恢复 25；花椰菜生长 12 天、种价 80、普通售价 175、普通食用恢复 75。`items/crops/prices` 与对话、委托、礼物和素材映射同步，现有素材仍是临时外观，不添加旧 ID alias。
- 体力允许有限小数，当前范围 0–270；上限、基础工具耗能和正常/晚睡恢复由 FarmEnergyRules 统一提供。UI 只用 roundi 显示，不能把显示取整写回存档。`FarmSaveCodec.decode()` 只接受封套 13 / 状态 25；旧开发版本拒绝且原记录保留，不自动迁移或覆盖。不能仅提升版本号后用新内容解释旧物品。
- S2-H 品质为必填整数 `0/1/2/4`，空槽 / 固定品质物品只能为 0；合并键为物品 ID + 品质。背包、箱子、出货队列、掉落和日结报告保持该键。配方 / 委托默认从低品质消耗，指定出售 / 食用 / 礼物只消费所选品质。售价、原始食用值与礼物倍率统一由 FarmQualityRules 提供，禁止 UI 重算后写入状态。
- 每块耕地必填 `fertilizer=0/1/2`；初级肥料仅在空地或 `growthDays < seedStageDays` 使用，重复施用拒绝。普通作物首个产物按动作前等级与肥料判品质，额外土豆普通；春季野种 / 地面野采按采集等级，不受肥料影响。当前只自然生成普通 / 银星 / 金星，铱星品质获得条件仍待后续职业等批次。
- 本节为当前合同；下文 S2-G 及更早批次的版本和缺口是历史记录，品质 / 初级肥料 / 树液内容以 S2-H 及后续更新为准。历史 fixture 补字段仅供 tools 检查使用，生产解码器不得引用 FarmLegacyFixture。
- 当前 Lv2 喷壶保留最多三格行为，按实际可浇格数分别扣水和体力；当前每格为 1 水 / (2 - 0.1 × 耕种等级) 体力，不能宣称是铜喷壶蓄力规则。完整技能奖励、疲劳/负体力、永久上限成长和完整工具升级尚未实现，不得借本批完成将其永久排除。
- Web 存储桥只访问 `mirror-island-godot-v1/saves/main`，成功来自事务 `oncomplete`；Windows 只使用当前独立目录原子替换。禁止枚举、迁移或清除旧客户端存档。
- 工具、交互、菜单、数量选择和拖放由原生控件发送明确意图；界面不得自行扣材料、加金币或结算日期。
- 快捷栏在配置时创建固定十二个槽位，后续只投影图标、数量、水量和选中状态，不通过销毁按钮刷新选择。槽号显示真实快捷键 `1–0、-、=`；Tab/Shift+Tab 沿用领域的背包行轮换。
- 快捷栏采用浅木色直角边框与桃橙选中框；选中物品名称置于上方，水壶细水量条仅投影当前水量和已有等级容量。窄于 680 的视口使用两排六格，横竖屏切换必须重新应用容器尺寸；最窄已检查 320 像素，每格宽度至少 44。
- 快捷栏首次投影自动选中首个非空槽；数字键或点击空槽不改变当前选择，已选物品被消耗后清除选择，避免标题投影为 `空槽` 却继续向世界发送旧工具意图。再次选择当前非空槽仍可主动收起手持物。
- 背包复用同一槽位样式，显示已占用格数和实际容量；物品详情与现有操作集中显示，价格、水量和可出货性读取当前规则。数量模式必须显示选中状态；制作不展示无效的转移数量，出货仅展示整组/单件。12/24/36 格均保留桌面十二列、窄屏六列，长内容允许纵向滚动。
- HUD 右上只读显示日期、天气、时间和金币，右下竖向体力条同时显示当前数值。低于 FarmEnergyRules.LOW_STAMINA 的体力与午夜后的时钟只改变提示颜色，不改变规则。窄屏左上收为背包/菜单，制作保留在菜单内；移动按钮保持原四方向意图。
- 菜单打开时隐藏移动/使用/交互按钮并释放触屏移动意图；摆放确认按钮不得覆盖工具栏。临时反馈有独立底色，常规提示三秒收起；摆放提示保留至结束，退出摆放后清理已过期提示。
- 操作按钮的显示同时要求会话已开始、无菜单，且视口宽度小于 680 或 DisplayServer.is_touchscreen_available() 为真。渲染和窗口尺寸变化共用 _update_touch_controls；可见变隐藏时发送 Vector2.ZERO，避免残留移动。宽屏触屏设备仍保留按钮，不能仅按桌面平台名判断。
- 删除阶段一的预览 `world.gd/main.tscn`，唯一主场景为 `scenes/game.tscn`。

## 验证

最小相关命令为 npm 的 typecheck:client、build:client、build:windows；脚本统一使用跨平台 godot.mjs。typecheck:client 同时校验独立地图准备工具的 TypeScript 类型。Godot 部分错误仍返回零状态，必须检查 SCRIPT ERROR/ERROR 日志。test:godot 对照 test/fixtures/godot-migration.json 的固定期望值，不依赖旧玩法或本机历史产物；不要据此扩建大规模测试矩阵。

生产代码和配置通过最小检查后暂存；文档与诊断截图不自动暂存。远端、数据、身份、媒体上传和部署保护继续按根规则执行。

## S1-B 已接入部分

- 青豆 `green-bean/bean-starter`：10 天成熟、3 天复收、种价 60、售价 40、恢复 25；蓝爵士 `blue-jazz/jazz-seed`：7 天、30、50、45。羽衣甘蓝 `kale/kale-seed`：6 天、70、110、50，领域要求镰刀；原作命中范围与满包行为采用已批准临时规则，仍待校准。
- `FarmWorldRules(catalog, crop_definitions)` 索引作物，`FarmResourceRules(world, inventory)` 复用同一字典。`isRaised` 只影响移动阻挡与播种占用，不加入 `covers()`，以免阻断浇水 / 收获。
- 架子播种前检查玩家和当前 NPC 脚底，重叠返回 `trellis-occupied` 不扣种子；幼苗 / 成熟 / 复收阻挡。codec 拒绝角色与架子重叠档。青豆复收保持成熟外观。
- 斧头命中青豆经原 `use-item-on-tile` 命令返回 `crop-cleared`，按 S0 基础耗能扣 2，保留耕地和浇水，不发作物。一次候选保存，失败重试不再次结算。其他作物清除与镰刀范围不借此扩展。
- `tools/validate_crops.gd` 用内存会话验证上述边界；真实输入、NPC 避让和两端恢复仍需人工验收。

## 临时镰刀合同（S1-B）

### 范围

用户已批准 T-SCYTHE-01（42 像素方向扇区、混合目标最多 3 个）与 T-SCYTHE-02（联合容量不足整次拒绝），后续原作校准仍需完成。

### 命令签名

`dispatch({type: "sweep-scythe", facing: "up" | "down" | "left" | "right"})`；场景保持一次命中派发一次命令。领域入口 `FarmResourceRules.sweep_scythe(state, direction) -> String`。

### 状态合同

`harvestTool: "scythe"` 从作物内容读取；只有当前区域有效杂草与成熟镰刀作物进入距离 / ID 排序。独立库存完整试放成功后才更新目标，零体力消耗。

### 返回与错误

含作物成功为 `harvested`，纯杂草成功为 `cut`；无目标 `no-effect`、缺镰刀 `wrong-tool`、非法方向 `wrong-direction`、容量不足 `inventory-full`。空手收获镰刀作物为 `requires-scythe`。所有失败不修改候选；保存失败保留同一候选重试。

### 正常与边界

两株作物加一株杂草占满三个名额；第四个目标不动。只有一个空格能装作物却不能装纤维时，所有目标保持。背后、超范围与未成熟目标排除。

### 验证

`tools/validate_crops.gd` 覆盖联合容量、三个名额、方向、范围、未成熟、空手拒绝与保存重试；`test:godot` 继续验证既有手收 / 杂草路径。真人输入与观感单独验收。

### 实现约束

不能先清理作物再尝试入包，也不能作物和杂草分别选择三个目标；共用一次排序、库存试放和候选保存。

## S1-D 土豆基础产出

`potato/potato-seed` 为 6 天 / 种价 50 / 售价 80 / 恢复 25。`extraHarvestChance: 0.2` 由 `harvest_amount()` 的几何分布反函数消费，世界种子、播种日、地块与收获序号固定同次结果，不使用旧 55% / 15% 分支。单次均匀值来自现有 32 位哈希，避免无界循环；每日运气额外翻倍尚未接入。

## S2-G 采集 1 级树种与野外小吃

### 1. Scope / Trigger

Field Snack 需要实际可获得的 Acorn / Maple Seed / Pine Cone，因此该批同时建立当前 38 棵树的物种身份和确认后 chop seed。完整树木生长、摇树、扩散、Sap 与树种子种植不在本合同内。

### 2. Signatures

- `FarmResourceRules.new(world, inventory, rules)`：第三参数为同一只读内容表，不拥有另一份状态。
- `tree_seed_drop(state, spawn, resource) -> String`：返回对应种子 ID 或空字符串。
- standing 树成功返回 `chopped-with-seed` 或 `chopped`；树桩仍返回 `stump-cleared`。
- `craft-item {recipeId:"field-snack", quantity:1|5|25, targetIndex}`；每份三种种子各 1，输出 1。

### 3. Contracts

- `treeSpeciesById` 必须恰好覆盖当前 38 个 tree ID；maple / oak / pine 数量 13 / 13 / 12，对应 maple-seed / acorn / pine-cone。
- `treeSeedOnChopChance=0.75`；只有 standing 树且 `skills.foraging.reportedLevel>=1` 才判定。键为 worldSeed、day、entityId，失败重试保持结果。
- 木材与可选种子先写库存副本，全部可放后才扣动作前等级斧头体力、发 14 XP、更新 stump 并提交库存。树桩不掉种，仍发 2 XP。
- Field Snack 为 foraging 1，恢复 45、售价 20；Acorn / Maple Seed / Pine Cone 售价 20 / 5 / 5。封套 9 / 状态 21 不变。

### 4. Validation & Error Matrix

- 即时 level 1 但 reportedLevel 0 → 不掉种；日结报告未确认期间世界锁继续阻止资源命令。
- 木材可放但树种无格 → `inventory-full`，库存、体力、经验和树相位全部不变。
- 75% 未命中 → `chopped`；命中 → `chopped-with-seed`，两者均只提交一次。
- 树种映射缺失或未知 species → 无种子，不得用随机另一种补位；内容检查必须提前拒绝缺失映射。
- 野外小吃缺任一材料 → `requirements-not-met`；保存失败保留三种材料。

### 5. Good / Base / Bad Cases

- Good：已确认采集 1 级砍倒 maple standing 树，木材 +3、枫树种子 +1、采集 XP +14、斧头扣 1.9，失败保存重试后仍只各一次。
- Base：三种种子各 1 制作小吃 1，100 体力食用后为 145。
- Bad：按即时 level 提前掉种、分别提交木材和种子、在 UI 反馈时发种子，或在失败重试时重新 roll，均违反合同。

### 6. Tests Required

- 38 棵树映射无缺失 / 多余，三树种数量和种子 ID 准确；未确认等级全部不掉种。
- 当前日每种均有可获得样本，并覆盖 75% 命中、未命中、树桩、联合满包、动作前熟练度和保存失败重试。
- 夜间报告含 Spring Seeds / Field Snack，确认后两者各一次；缺料、制作失败重试、45 体力和当前封套恢复。
- 四张新图、客户端类型、旧规则 / 体力 / 作物素材、Web / Windows 导出及隐藏 Web 实际制作通过。

### 7. Wrong vs Correct

错误做法是从 entityId 临时取模推断树种，未来改 ID 会静默换种；或先把木材写入实际库存再尝试树种。正确做法是由 `treeSpeciesById` 显式拥有内容身份，并在库存副本中联合试放全部掉落后一次提交。

## S2-F 采集 1 级春季种子闭环

### 1. Scope / Trigger

Spring Seeds 跨越技能日结奖励、制作、种子店、农田、生长素材、可变产物、双技能经验、乌鸦和存档校验。该批只闭合春季普通品质玩法，不实现其它季节野种或职业质量分支。

### 2. Signatures

- 解锁：`FarmSkillRules.recipe_unlocks(state, rules.recipes)` 产生 `spring-seeds`，`dismiss-day-settlement` 保存成功后写入 `knownRecipes`。
- 制作：`craft-item {recipeId:"spring-seeds", quantity:1|5|25, targetIndex}`；每份四料各 1，输出每份 10。
- 播种：`use-item-on-tile {itemId:"spring-seeds", column, row, facing}` → tile `cropId:"spring-forage"`。
- 收获：`harvest_item_id(state,tile,crop) -> String`，普通作物返回 cropId，混合作物返回 `harvestItems` 中的稳定候选。

### 3. Contracts

- 配方条件 foraging 1；物品 `spring-seeds` 为 seed、可出货 35g；作物 `seedPrice:null`，UI 与 `_shop()` 均不得出售。
- `spring-forage` 的 `growthDays:7`、素材阶段 `[3,4]`、四种 `harvestItems` 等概率、`harvestXp:3`、`foragingHarvestXp:2`、`crowVulnerable:false`。
- 产物键绑定 worldSeed、tile.id、plantedDay；满包重新操作与保存失败重试必须保持同一结果。成功入包后才发双 XP 并清空作物。
- 不新增保存字段，封套 9 / 状态 21 不变；旧 v21 档的已达等级配方在后续日结补入待学报告。

### 4. Validation & Error Matrix

- 零级或报告未确认 → `unknown-recipe`；确认写入失败 → 保留报告和未知状态。
- 缺任一材料 → `requirements-not-met`；目标格冲突 → `target-full`；两者库存整次不变。
- 对 `seedPrice:null` 发购买命令 → `unavailable-item`，金币与库存不变。
- 第 6 次有效生长仍 growing，第 7 次 mature；漏浇不增长。
- 满包收获 → `inventory-full`，地块与双 XP 不变；保存失败 → `save-failed`，重试同一候选。
- 春季野种不计入乌鸦机会且不能成为损失目标。

### 5. Good / Base / Bad Cases

- Good：采集 1 级夜间确认后，四料各 1 制作 10 个，播种 1 个后库存剩 9，七次浇水后收获 1 个稳定野采并获得 farming 3 / foraging 2。
- Base：春季种子可投入出货箱按 35g 结算，在种子店购买列表中不可见且领域购买拒绝。
- Bad：只在 UI 隐藏购买、在收获前发 XP、按重试次数重抽产物，或让乌鸦用极大 `crowEdibleAfterDays` 间接跳过，均违反合同。

### 6. Tests Required

- 日结解锁与确认分别模拟一次保存失败；knownRecipes 只加入一次。
- 缺料、目标冲突和制作保存失败保持原子；成功严格得到 10。
- 6 / 7 天边界、四个候选覆盖、稳定结果、满包、双 XP、乌鸦豁免和当前封套恢复。
- 七作物逐日素材、客户端类型、旧规则 / 体力检查、Web / Windows 导出及隐藏 Web 真实制作通过。

### 7. Wrong vs Correct

错误做法是把四种野采建成四个共用 seedId 的 crop，后写入的定义会覆盖前三个；或把 `seedPrice` 设为 35，导致种子店出售。正确做法是单个 `spring-forage` crop 持有四项 `harvestItems`，`prices.spring-seeds=35` 只负责出售价值，而 `seedPrice:null` 同时由 UI 和领域拒售。

## S2-E 四种标准春季野采集合

### 1. Scope / Trigger

在 S2-D 的水仙 / 韭葱基础上新增野山葵 / 蒲公英，跨越 Tiled kind、构建期联合类型、内容与素材、礼物偏好、领域白名单和 codec。只建立当前地图的四种基础材料，不实现原作完整刷新器。

### 2. Signatures

- 地图 kind：`"wild-horseradish" | "daffodil" | "leek" | "dandelion" | "fallen-branch"`，所有构建与运行时白名单必须一致。
- 普通拾取沿用 `dispatch({type:"use-item-on-target", targetId, itemId:""})` → `gather(...) -> "collected"`。
- 食用沿用 `dispatch({type:"eat-item", itemId})`；野山葵 / 蒲公英成功返回 `ate`。

### 3. Contracts

- 野山葵 `{price:50, staminaRestore:13}`；蒲公英 `{price:40, staminaRestore:25}`；两者 `shippingCategory:"foraging"`，地面拾取各增加采集 XP 7。
- 八个稳定点位不改 ID / 坐标：farm 为 daffodil / dandelion，town 为 daffodil / daffodil，foothills 与 lakeshore 各为 wild-horseradish / leek。
- 每个非工具、非种子的可赠物品必须出现在每名当前居民的 `giftPreferences`；未核实偏好统一为 `neutral`，不从物品类别猜测喜欢程度。S2-E 同步补齐此前遗漏的 coal / scarecrow。
- 物品排序为 0..33 连续唯一。没有新增状态字段，继续使用封套 9 / 状态 21。

### 4. Validation & Error Matrix

- 任一层遗漏新 kind → 构建拒绝或 codec 返回 `野采记录无效。`。
- 礼物偏好缺项 → `gift()` 直接索引失败；内容检查必须覆盖全部居民 × 全部可赠物品。
- 满包 / 非活动点 / 保存失败 → 沿用 `inventory-full` / `inactive` / `save-failed`，物品、XP 和 collected ID 不变。
- 回退后档中含新 item ID → 旧内容表严格拒绝；不得降低版本号或静默替换物品。

### 5. Good / Base / Bad Cases

- Good：采集 XP 93 时拾取蒲公英，保存成功后物品 +1、XP 100、等级 1。
- Base：100 体力分别食用野山葵 / 蒲公英后为 113 / 125；已有 v21 空背包档继续恢复。
- Bad：将新物品仅加到 `items` 而漏掉地图 kind、badge、区域 forage 或居民偏好，均视为未完成接线。

### 6. Tests Required

- JSON / TMJ 可解析；像素图均为 16×16；四个区域素材映射齐全；排序连续唯一。
- 生成地图数量为 daffodil 3、dandelion 1、leek 2、wild-horseradish 2，点位 ID 映射准确。
- 四类拾取各 +7 XP；蒲公英失败重试一次提交；13 / 25 体力恢复准确；coal / scarecrow 实际送礼返回 neutral 而不报错。
- 客户端类型、既有规则 / 体力检查、Web / Windows 导出及隐藏 Web 详情检查通过。

### 7. Wrong vs Correct

错误做法是新增四个点以凑齐四种材料，或按 `shippingCategory` 在普通入包时统一发 XP。正确做法是重用现有八个稳定点位，并继续由 `gather()` 的成功候选按真实地面拾取来源发 7 XP，避免改变刷新数量和其它入包语义。

## S2-D 标准春季野采与零恢复食用合同

### 1. Scope / Trigger

现有自定义 `spring-wildflower` / `bamboo-shoot` 被标准春季野采 `daffodil` / `leek` 取代，跨越 Tiled 源地图、构建 decoder、内容表、领域命令、存档校验和 UI。当前四区点位仍是临时分布，不代表原作完整刷新表。

### 2. Signatures

- 拾取：`dispatch({type:"use-item-on-target", targetId, itemId:""})` → `FarmResourceRules.gather(state, target_id, "", direction) -> "collected"`。
- 食用：`dispatch({type:"eat-item", itemId:"daffodil"|"leek"})` → `"ate" | "ate-zero" | "stamina-full" | "missing-item" | "not-edible"`；`ate-zero` 使用中性成功提示。
- 地图资源 kind：`"daffodil" | "leek" | "fallen-branch"`，与 TypeScript 联合类型、decoder 和 codec 白名单一致。

### 3. Contracts

- 水仙：普通出货价 30，`edible:true`、`staminaRestore:0`；韭葱：普通出货价 60、`staminaRestore:40`。
- 成功地面拾取先完整入包，再追加 `dailyForage.collectedIds` 并增加采集经验 7；一次候选保存后发布。
- `edible` 表达可否食用，`staminaRestore` 表达恢复量。未声明 `edible` 的旧物品继续以正恢复值推导，不要求批量补字段。
- 内容身份变化使用封套 9 / 状态 21，旧档保留但拒绝；地图稳定点位 ID 不随内容身份改名。

### 4. Validation & Error Matrix

- 未知 Tiled kind → 构建期 `Resource kind is invalid.`。
- 非当前区域 / 超距离 / 当日不可见 → `missing-target` / `too-far` / `inactive`，状态不变。
- 满包 → `inventory-full`，不登记点位、不加经验。
- `edible` 为假且恢复值不大于 0 → `not-edible`；物品不存在 → `missing-item`。
- 正恢复物品在满体力时 → `stamina-full`；零恢复但可食用的水仙仍可消费。
- 非封套 9 或非状态 21 → 解码拒绝，不改写原文本。

### 5. Good / Base / Bad Cases

- Good：采集经验 93 时拾取水仙，物品 +1、经验 100、等级立即变 1，日结等级仍保持待报告。
- Base：270 体力食用水仙，物品 -1、体力仍为 270；100 体力食用韭葱后为 140。
- Bad：保存失败、满包或同日重复点击同一点位，物品、经验和 `collectedIds` 均不得重复变化。

### 6. Tests Required

- 构建期：四张 TMJ 可解码，生成目录各含 4 个水仙 / 韭葱点。
- 领域：两类各 7 XP、跨级、满包、重复拾取、保存失败重试一次提交。
- 食用与 UI：水仙显示 `食用` 且零恢复可消费；韭葱显示 `食用 +40 体力`。
- 持久化：当前封套往返，旧封套拒绝且仓库内容不变；Web / Windows 导出无脚本错误。

### 7. Wrong vs Correct

错误做法是在普通 `inventory.add()`、拾取声音或 UI 反馈里统一补 7 XP，并把 `staminaRestore == 0` 解释为不可食用。正确做法是在 `gather()` 的成功候选中按来源发经验，并分别读取 `edible` 与 `staminaRestore`，这样保存重试、零恢复食物和其它入包来源不会串线。

## S2-C 枯枝增量合同（2026-09-10）

1. 范围：现有 `fallen-branch` 的工具交互和采集经验；当前刷新、直接入包与满包整次拒绝仍待原作对齐。
2. 签名：`dispatch({type:"use-item-on-target", targetId, itemId:"axe", facing})` → `FarmResourceRules.gather(state, target_id, item_id, direction) -> String`。
3. 状态与返回：成功 `branch-chopped`，木材+1、采集XP+1、追加当日已采ID；先按动作前等级扣斧头体力，再增加经验。沿用封套8/状态20，不补发历史经验。
4. 错误边界：非当前区域/超距离/当天不可见分别为 `missing-target`/`too-far`/`inactive`；空手、错误工具或背包无斧头为 `requires-axe`；满包、体力不足整次不变。
5. 场景：斧头树木选取包含当前可见枯枝，按点击距离取最近目标；采集99XP成功变100/等级1，本次仍扣2体力，下次斧击为1.9。纯交互只提示使用斧头。
6. 验证：检查工具、容量、体力、场景选取、重复命中、失败重试和同版本恢复。内存诊断15项通过，真实输入和实际存档介质仍待人工验收；不据此扩建测试矩阵。
7. 约束：经验只能在成功候选中授予；不得在木屑、声音、普通木材入包或保存重试时补发。场景按 `active_forage` 判断枯枝，不访问其不存在的 `state.resources` 项。

## S2-A 技能合同

### 范围与入口

种植、采集、采矿三条已核实劳动路径通过 `FarmSkillRules.gain(state, skill, amount)` 在成功候选内授予；`level_for(xp)` 为唯一等级计算，`settle_day(state)` 返回升级报告。无独立 UI 发奖接口。

### 状态

`skills` 固定 farming/foraging/mining/fishing，每项 `{xp, level, reportedLevel}`；整数经验 0..FarmWorldRules.LIMIT、等级 0..10 且与阈值一致、reportedLevel 为 0..level。reportedLevel 仅表示日结展示，不表示已领取配方或职业。

### 来源与效果

防风草/花椰菜/青豆/羽衣甘蓝/蓝爵士/土豆每株分别 8/23/9/17/10/14 XP，土豆额外产物不乘 XP；普通树倒/树桩为采集14/2，当前地表石头为采矿1。湖岸普通鲤鱼/鲢鱼/大嘴鲈鱼为钓鱼 8/14/19。新矿洞或其它水域不得直接沿用这些来源。工具耗能用动作前等级，每级节省0.1；水壶预算与扣费、鱼竿预检与扣费都共用 `unit_cost`。

### 日结

先结算原出货，再将等级差写入持久报告 `skillUpgrades`，每项 `{skill, from, to}`，最多四项且技能唯一；更新 reportedLevel。存在升级则次日恢复满体力。确认仍用 `dismiss-day-settlement`；保存失败重试原候选，未闭合的配方和职业待真实系统接入。

### 校验与示例

经验100/等级0、缺失技能、重复报告技能或 from>=to 均拒绝，不回填。经验92收获一株防风草变为100/等级1，下次单格浇水从2降为1.9；浇水不授予经验。

### 验证

`validate_crops.gd` 覆盖真实劳动、阈值、原子重试、日结恢复和坏档；`test:energy` 实例化技能页；原迁移比较双方统一 JSON 数字表示，只添加本批明确 XP 期望。真人和真机仍单独验收。

### 禁止的替代实现

不从库存入包、动画或反馈文本补经验，不按额外产物倍增经验，不把日结已展示视为职业或配方已领取；不能用三技能前置完成替代整个技能任务。

## S2-O 石栅栏配方合同

### 1. Scope / Trigger

- 耕种达到 2 级并完成夜间报告确认后，开放当前唯一已接入的耕种 2 级围栏配方；配方学习、制作、摆放、阻挡、回收和出货必须形成真实闭环。
- 本批只接入静态一格石栅栏，不创建耐久、损坏、围栏门或动物路径字段；原作 106–109 天寿命另由围栏寿命批次接入。

### 2. Signatures

- 内容：`rules.items["stone-fence"]` 为可摆放、可出货物品，`rules.prices["stone-fence"] = 2`；`rules.recipes["stone-fence"]` 为 `stone × 2 -> stone-fence × 1`、`skill=farming`、`level=2`、`knownByDefault=false`。
- 摆放命令：`{type:"place-world-object", inventoryIndex, column, row}`；只接受背包中的 `stone-fence`。
- 回收命令：`{type:"recover-stone-fence", objectId, itemId:"pickaxe"}`；成功返回 `recovered-stone-fence`。
- 世界物件：`{id, kind:"stone-fence", regionId:"farm", column, row}`，占用一格，不含耐久字段。

### 3. Contracts

- `knownRecipes` 是唯一配方门禁；耕种 2 级只在睡眠候选的 `recipeUnlocks` 中待学，`dismiss-day-settlement` 保存成功后才写入。
- `FarmWorldRules.placement()` 复用 `placeableTiles`、静态阻挡、资源、出口、作物、玩家、NPC 和宠物检查；石栅栏只允许 `farm`，`covers()` 将其作为一格物件参与移动阻挡。
- 制作与摆放都先在候选状态完整预检，保存失败保留候选；十字镐回收先预检背包容量，再删除物件并加入一件石栅栏。出货沿用 `other` 分类和 2g 单价。
- `FarmSaveCodec` 世界物件白名单允许 `stone-fence`，并拒绝非农场区域；同版本 12 / 24 不新增字段或迁移。

### 4. Validation & Error Matrix

- 未学习或技能不足 → `unknown-recipe` / 存档配方条件错误；不消费石头。
- 材料不足或目标格无法完整接收 → `requirements-not-met` / `target-full`；候选库存保持不变。
- 非农场、地图阻挡、作物、资源、角色或其它物件占用 → `blocked`；不扣石栅栏。
- 回收错误物件或错误工具 → `missing-object` / `wrong-tool`；物件保持。
- 回收时背包无空位 → `inventory-full`；物件保持。
- 任一制作、摆放或回收保存失败 → `save-failed`；公开状态和原记录保持，重试只能提交原候选。

### 5. Good / Base / Bad Cases

- Good：耕种 2 级过夜确认后学会配方，2 石制作 1 栅栏，农场空格摆放后角色无法穿过，十字镐回收返还 1 件。
- Base：有等级但未确认日结时配方仍不可制作；石栅栏不在农场外显示为合法放置。
- Bad：UI 直接扣石头、把石栅栏放到镇区、用斧头回收、背包满时先删世界物件，或保存重试再次生成栅栏，均违反合同。

### 6. Tests Required

- `validate_stone_fence.gd` 断言二级配方门禁、夜间待学/确认、2 石制作、目标格和保存失败原子性。
- 断言农场区域、一格 `blocked()`、十字镐回收、错误工具、满包、2g 出货和同版本 codec 往返。
- `typecheck:client`、`test:stone-fence`、`test:godot`、`test:fishing`、Web / Windows 导出通过；真人布局、耐久和最终美术单独验收。

### 7. Wrong vs Correct

Wrong：只在制作菜单显示石栅栏，或回收时先删除世界物件再尝试放回库存。

Correct：领域从 `knownRecipes` 和 `rules.items` 读取门禁，在候选中完整预检材料/容量/位置，成功后才写 `worldObjects`，由 `GameSession` 原子保存并发布。

## S2-B 稻草人配方合同

### 范围与命令

`buy-coal` 只在铁匠铺工具架42像素内购买1个，第一年150/以后250；入门09:00–16:00，屋内柜台不因此硬停。原 `craft-item` / `place-world-object` 增加稻草人，回收用 `recover-scarecrow` 并校验工具 / 距离 / 完整入包。

### 状态和学习

`knownRecipes` 是唯一制作门禁。普通箱默认已知；旧木斧占位移除。稻草人要求种植1级，夜间 `recipeUnlocks` 仅为待学列表，`dismiss-day-settlement` 确认保存后才写入 knownRecipes，重复确认不重复学习。

### 物件与日结

稻草人 `{id, kind, regionId, column, row, scaredCount}` 限农场一格。范围格距平方<81共249格。生长后每16株一个机会，上限4，每个30%，最多10次从当前耕地/树要素格选择；只吃过前两生长阶段的作物。驱赶计数与 `crows: {lost:[{tileId,cropId}], scared}` 报告同候选保存。回收重置计数。

### 校验与错误

拒绝未知/重复配方、不满足技能的知识或待学配方、非农场稻草人、非法计数和不一致损失报告。材料不足、满包、离柜、保存失败均不能部分发放 / 消费；旧版本不补字段。

### 例子

达到种植1级但未确认夜间报告时仍不能制作。50木材+1煤炭+20纤维制作1个；满包不能回收。少于16株没有乌鸦机会，受保护目标只加驱赶计数，不删除作物。

### 验证

`validate_crops.gd` 覆盖上述真实命令和日结重试；33个旧规则案例/5个哈希继续通过。原木斧制作的1个退役案例不再执行，真实配方由本批定向验证覆盖。已在隔离浏览器内存农场检查实际制作与摆放，不代签真人 / 真机通过。

### 实现边界

不能用 reportedLevel 充当已知配方，不在保存重试时重跑乌鸦随机过程。草地/地板、自动退耕、节庆营业例外、基础肥料/品质等仍未接入。像素占位和乌鸦报告不代表最终美术 / 动画完成。
