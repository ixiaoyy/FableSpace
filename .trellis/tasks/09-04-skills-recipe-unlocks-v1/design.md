# 技能任务设计：先处理体力前置

## S2-K 基础钓鱼技能（2026-09-10）

`FarmSkillRules.NAMES` 新增 `fishing: 钓鱼`，`TOOL_SKILLS` 将 `fishing-rod` 映射到该技能。初始 `skills` / `professions` 同步增加第四键；职业选择表保持只有采集 5 级，避免为尚无蟹笼等消费者的分支创建空效果。状态结构变化使用封套 12 / 状态 24，codec 继续按 `NAMES` 的完整键集和等级阈值严格校验。

活动 `rules.fish` 收紧为当前湖岸可成立的三条：鲤鱼 `difficulty=15`、全天、30g / 13 体力；鲢鱼 `difficulty=35`、全天、50g / 25 体力；大嘴鲈鱼 `difficulty=50`、06:00–19:00、100g / 38 体力。三者任意天气且不使用虚构抛竿距离门槛。西鲱、小嘴鲈鱼和鲷鱼暂时退出活动鱼表，但保留 `items`、媒体和礼物偏好，等待真实河流 / 池塘钓位。现有 `pull` 仍只控制本项目张力，不参与经验公式。

`FarmSkillRules.fishing_xp(quality, difficulty)` 实现基础公式 `floor((quality + 1) * 3 + difficulty / 3)`；本批调用固定传当前真实产物品质 0，不伪造未实现的尺寸、完美、宝箱或传奇状态。当前湖岸三条鱼因此分别获得 8 / 14 / 19 XP。

成功链为 `GameSession.tick` 复制候选 → `FarmFishingRules.tick` 完成收线 → 库存完整加入普通品质鱼 → 同一候选增加钓鱼 XP → `_commit` 保存并发布。满包发生在加经验前；保存失败把已经计算好的候选留在 `_pending`，`retry-fishing-save` 只重写同一候选。抛竿预检与扣费都读取 `FarmEnergyRules.unit_cost`，升级后的下一次抛竿才使用新等级。

UI 只为技能页增加竹鱼竿图标与来源说明，日结继续遍历统一技能表。定向检查覆盖三条湖鱼数据 / XP、河鱼不进入活动池、技能结构、旧版本拒绝、满包 / 逃脱 / 保存失败、阈值升级与下一次耗能；既有 migration / energy / profession / naming / view 检查按新四键和版本做最小同步。

## S2-J 采集 5 级职业（2026-09-10）

状态新增顶层 `professions`，键与当前三技能完全一致，每项保存已确认职业 ID；本批仅允许 `foraging=[forester|gatherer]`，其它技能保持空数组。日结报告新增必填 `professionChoices`。升级记录跨越采集 5 级且尚未选择时生成 `foraging/5/[forester,gatherer]`；报告存在时只允许选择职业或关闭，待选项未清空时关闭返回 `profession-choice-required`。选择在独立候选中写职业并移除待选项，保存失败复用同一候选。

护林人作用于当前普通树和树桩：先把基础木材最低产量从占位 3 / 1 对齐为 12 / 5，再向下取整乘 1.25，得到 15 / 6；未接入的技能 / 运气额外 0–4 木材继续列为缺口。树木 / 树桩经验沿用锁定 1.6.15 已核实的 14 / 2。收集者以世界种子、来源、日期或播种日和收获序号建立独立稳定键，模 5 命中时地面野采或野生种子获得双份同品质；经验分别为 14 或采集 4，野种种植经验仍按一株给 3。容量不足、保存失败和重试均不部分发放或重抽。

封套 11 / 状态 23 严格校验职业集合、等级门槛、报告选项及对应升级。职业只在玩家确认成功后的新一天生效，当日已完成的出货与劳动不追溯。10 级分支、职业重置、大型木桩 / 原木、完整木材随机和植物学家品质另批实现。

命名以官方简体中文维基为准，不自行使用近义译名：例如 `木材 / 石头 / 纤维`、`斧头 / 十字镐 / 镰刀 / 喷壶 / 竹鱼竿`、`甘蓝菜 / 黄水仙 / 工作小食 / 初级肥料 / 宝箱`、`耕种 / 采集 / 采矿`、`护林人 / 收集者`。内部 ID 暂时保持，避免纯显示名变更扩大存档影响。现有六条鱼按研究候选显示为鲤鱼、鲢鱼、西鲱、小嘴鲈鱼、鲷鱼和大嘴鲈鱼，行为差异继续显式登记。

## S2-I 初级保湿土（2026-09-10）

承接连续开发授权，在当前肥料字段中新增枚举 2 表示初级保湿土，0 / 1 语义保持不变，不升级封套 10 / 状态 22。品质抽取只能将肥料 1 映射为品质倍率参数 1，不能直接把新枚举传给品质公式。初级保湿土与基础肥料互斥，可在空耕地或任意作物阶段施用；日结先生长，再对已湿地块以世界种子 / 当前日 / 地块 ID 的稳定独立哈希模 3 判保水，次日雨水继续覆盖为湿。干地不自行变湿。石头 2 制作 1，种植 4 级夜间确认学习；第 15 天起商店 100g，出售 4g。沿用候选保存与库存，不新增依赖、通用框架或数据库。

## S2-H 品质与基础肥料（2026-09-10 已确认实施）

库存、箱子、掉落、出货队列和报告的堆叠增加必填 quality=0/1/2/4；空格固定0，hasQuality内容才可非零。转移、补堆、整理、撤回和掉落保留品质。出售、食用和礼物按命令品质准确消费；配方和委托允许跨品质，按低品质优先消费。价格向下取整、食用由原始edibility计算后向上取整，喜欢礼物才有品质加成。

普通收获按动作前种植等级与fertilizer=0/1抽金/银；额外土豆保持普通，野采与春季野种用采集等级。稳定随机键绑定世界、来源、日期/播种日及收获次数，保存失败复用候选。农田增加必填fertilizer；基础肥料由树液2制作，种植1级夜间确认，只能施于空耕地或未发芽种子，收获与清除作物保留土壤肥料。现有树倒/树桩增加树液5/1，合计6；不扩展树木其余产量。

使用封套10/状态22，旧开发档拒绝且保留。现有无负体力模型不扩写；树液负恢复限制于0下限，疲劳另列缺口。品质系统只为已核实作物和野采生成银/金，铱档只支持保存与消费，职业、高级肥料及鱼种品质生成另批实现。验证覆盖跨品质转移/交换/补堆、出货/撤回/报告恢复、指定品质食用/出售/送礼、稳定抽取、联合容量、肥料门禁/材料来源/保存重试及旧档拒绝。

## S2-G 树种与野外小吃合同（2026-09-10）

`treeSpeciesById` 显式覆盖 38 棵当前树，`treeSeedItems` 映射 maple / oak / pine，`treeSeedOnChopChance=0.75`。`FarmResourceRules` 读取同一内容表；只有 standing 树且 `foraging.reportedLevel>=1` 才用世界种子、日期和实体 ID 计算一次稳定掉落。reportedLevel 结合日结世界锁表示奖励已确认，不用即时 level 提前开放。

砍树先在库存副本写木材和可选树种，全部成功后才扣斧头体力、发 14 XP、更新 stump 并发布；命中返回 `chopped-with-seed`。树桩继续木材 1 / 采集 2，不掉种。`field-snack` 为 foraging 1 配方，acorn / maple-seed / pine-cone 各 1，输出 1，恢复 45、售价 20。无状态字段，封套 9 / 状态 21 不变。

树种采用当前 ID 的显式均衡分配，树本体外观暂不变化。松散种子、扩散、树种子种植、Sap、完整木材产量和生命恢复不在本批伪造。素材见 [记录](../../../docs/assets/tree-seeds-field-snack-local-2026-09-10.md)。

## S2-F 春季种子跨层合同（2026-09-10）

`rules.recipes.spring-seeds` 由 foraging 1 解锁，日结报告和 `dismiss-day-settlement` 沿用既有待学 / 确认保存流程。配方四料各 1、输出 10；物品 35g、可出货，作物定义使用 `seedPrice:null`，UI 与 `_shop` 都拒绝购买，避免只隐藏菜单而领域仍可绕过。

农田保存 `cropId:spring-forage`，不新增 tile 字段。`harvest_item_id()` 以世界种子、地块和播种日从四项 `harvestItems` 稳定等概率选择；成功入包后 `_finish_harvest()` 增加 farming 3 / foraging 2。`crowVulnerable:false` 同时排除乌鸦机会计数和目标选择。三阶段素材为 3 / 4 天，总 7 次有效生长；混合作物不使用单一收获徽记。

新增内容不改变保存 shape，继续封套 9 / 状态 21。回退后含新物品 / 作物 / 配方的同版本档会被严格拒绝。质量等级、职业、原作 RNG、成熟落地物和季末处理不在本批假实现。素材见 [记录](../../../docs/assets/spring-seeds-local-2026-09-10.md)。

## S2-E 四种标准春季野采集合（2026-09-10）

`ResourceSpawnDefinition.kind`、Tiled decoder、`active_forage`、`gather` 与 codec 白名单扩为 `wild-horseradish/daffodil/leek/dandelion/fallen-branch`。野山葵和蒲公英直接消费 S2-D 的普通地面野采分支，不在库存、素材或 UI 层另发经验。

八个稳定点位不增量：farm 为 daffodil / dandelion，town 为 daffodil / daffodil，foothills 与 lakeshore 各为 wild-horseradish / leek。物品表新增 50 / 13 与 40 / 25，所有自定义居民补显式 neutral；完整性检查同时补齐 S2-B 遗漏的 coal / scarecrow 偏好，排序保持连续唯一。没有新增状态字段，封套 9 / 状态 21 不变；含新物品档回退后会因未知 ID 被拒绝，不做自动转换。

素材使用 `media.json` 原生 pixels，记录见 [素材说明](../../../docs/assets/spring-forage-completion-local-2026-09-10.md)。验证覆盖地图生成、四类经验、失败重试、食用、偏好完整性、隐藏 Web 详情和两端导出；地图权重、品质与 Spring Seeds 另批闭合。

## S2-D 水仙、韭葱与零恢复食用（2026-09-10）

四张 TMJ 的现有两类野采 kind 改为 `daffodil` / `leek`，构建期联合类型与 decoder 使用相同封闭集合；稳定出生点 ID 和坐标不变。`active_forage` 返回两类普通春季野采，取消旧山麓竹笋日期特例；`gather` 在库存成功后登记原 `dailyForage.collectedIds` 并调用 `FarmSkillRules.gain(...,"foraging",7)`，失败候选不发布。

物品通过 `edible` 与 `staminaRestore` 分离可食用性和恢复值。水仙 `{edible:true, staminaRestore:0}` 可消费且不改变体力，返回 `ate-zero` 与中性提示；其它既有食物继续由正恢复值推导可食用，正恢复物品满体力仍拒绝。UI 同一字段决定按钮，零恢复只显示 `食用`。内容身份变化升级为封套 9 / 状态 21，不迁移、覆盖或清理旧档。

素材继续由 `media.json` 原生 pixels 生成，无图片二进制或远端对象；来源见 [素材记录](../../../docs/assets/spring-forage-local-2026-09-10.md)。现有地图分布、品质和职业效果不在本批伪造，验证覆盖构建、经验、食用、保存重试、版本拒绝与隐藏 Web 实景。

## S2-C 树枝调用合同（2026-09-10）

`game_world.gd::_resource_at` 将当前可见枯枝加入斧头选取，通过既有 `use-item-on-target` → `resource_rules.gd::gather` → 候选保存执行。成功返回 `branch-chopped`，缺少斧头返回 `requires-axe`；成功码、提示、声音和木屑共用现有反馈路径。库存预检后按动作前等级扣体力，再入包、登记 `dailyForage.collectedIds` 并增加采集经验。封套8/状态20不变，既有同版本档继续；此前已拾取记录不补发经验。无新增依赖、状态字段或数据库操作。原刷新与满包规则仍为待对齐项。

## 2026-09-09 研究后的下一批设计

### S2-B 稻草人配方与保护

依据：[Scarecrow](https://stardewvalleywiki.com/Scarecrow)、[Animals / Crows](https://stardewvalleywiki.com/Animals#Crows)、[Coal](https://stardewvalleywiki.com/Coal)、[Crop data](https://stardewvalleywiki.com/Modding:Crop_data)。每16株一个机会 / 上限4 / 30% / 最多10次、249格保护与种价均已核对。生长阶段由六种作物的前两阶段天数确定；当前地形池为已存在的耕地与未清除树木，草地和地板尚未建模，不伪造要素。

新增窄 `crop_protection.gd` 处理隔夜判定。使用固定引擎内置随机数生成器，以现有世界哈希 / 日期设种子；循环严格有界，失败重试保存原候选。保护范围以格距平方小于81表示，整数格合计249；多个保护对象按当前持久对象顺序选择首个并计数。

状态新增 `knownRecipes`；报告新增 `recipeUnlocks` 与 `crows`（lost数组记录tileId/cropId，scared计数）。报告确认前只显示待学配方，确认候选成功后进入 knownRecipes。reportedLevel 继续只代表等级展示，不能替代配方状态。新封套8 / 状态20，旧开发档保留但拒绝。

世界对象新增 `scarecrow` 和 `scaredCount`，复用摆放预检 / 占用与递增 ID；库存添加 `coal/scarecrow`。买煤验证工具架柜台距离和金币；09:00–16:00 限制新进入，已在屋内不硬停交易，不复用水壶 Day3 门槛。新增材料 / 物件暂用现有原生 pixels 图标机制做本地占位，没有采纳或上传新图片文件，正式美术仍待制作 / 发布。

生产影响限 Godot 内容、领域、codec 与当前 UI / 场景；不新增依赖、数据库或第二套状态。测试与文档不自动暂存；不提交 / 推送 / 部署。

### S2-A 经验与熟练度

新增窄领域 `skill_rules.gd`，拥有三条技能的等级表、工具对应和等级计算。`skills` 固定为 farming/foraging/mining，每项为整数 `xp`、`level`、`reportedLevel`；`level` 必须与累计经验阈值一致，`reportedLevel` 为上次日结已记录等级，范围 0..level。钓鱼和战斗待真实入口核实后接入同一结构，不填无消费字段。

收获和资源破坏在同一成功候选中更新经验，工具扣费使用动作前等级；不从库存 add、界面消息或动画授予。水壶每格预算与实际扣费共用当前单格成本，仍保留已有 Lv2 中间规则。源规则：[Skills](https://stardewvalleywiki.com/Skills)、[Farming](https://stardewvalleywiki.com/Farming)、[Foraging](https://stardewvalleywiki.com/Foraging)、[Mining](https://stardewvalleywiki.com/Mining)。

日结将三个技能的等级差写入现有持久出货报告 `skillUpgrades`（每项 skill/from/to，最多三项），再更新 reportedLevel；若有升级，按 [Energy / Leveling Up](https://stardewvalleywiki.com/Energy#Leveling_Up) 恢复 270 体力。报告继续通过原确认命令清除，不另建保存链。UI 增加只读技能页和日结升级文字；不虚构配方 / 职业选项。

codec 严格核对技能 ID、累计经验、等级一致性、日结报告的唯一技能及 from/to。当前版本升级为封套 7 / 状态 19；回退必须同时恢复技能字段、耗能消费与日结，旧开发档不迁移。本批不实现职业、配方、钓鱼 XP、精通或每日运气，这些仍为后续交付要求。

### S1-D 土豆基础产出

核对资料：[Potato 的 References](https://stardewvalleywiki.com/Potato#References)、[Crop data](https://stardewvalleywiki.com/Modding:Crop_data)。前者说明额外产出反复判定 0.2，后者给出土豆 `ExtraHarvestChance=0.2` 及字段的几何分布定义；内容示例标注 1.6.8，尚未用原作 1.6.15 运行核验。每日运气额外翻倍规则未接入，不对其公式作猜测。

数据修改落在 `rules.json`、`media.json` 和有相关文本的 `dialogues.json`，codec 提升至封套 6 / 状态 18；旧档仍保留但拒绝。资源规则采用当前稳定哈希作为均匀随机源，以世界种子、播种日、地块 ID 和收获序号确定同一结果。用几何分布的反函数一次计算额外数量，避免未设上限的随机循环；不增加人为的 3 个上限。随机源沿用项目实现，不声称能复现原作同一 seed 的每个结果。

`harvest_amount(state, tile, crop)` 返回完整产出，先计算再由既有库存完整预检；只有入包成功才更新地块。对 `extraHarvestChance=0` 的作物仍返回 1。新增字段只由实际收获入口消费，删除旧 `yieldKind` 分支。回退同时恢复 ID、数据、算法和版本，不撤销 S1-A/B。

S1-B 三种作物已接入，用户已批准临时镰刀规则；见 [三种春作与交互方案](research/s1b-interactions.md) 和 [阶段记录](verification-s1b.md)。下文 S1-A 保留为历史批次合同，该批使用 5 / 17；S2-A 为 7 / 19，最新 S2-B 为 8 / 20，真人验收与原作校准待完成。

本节不覆盖下方 S0 历史合同。用户于 2026-09-09 明确批准 S1-A，现已完成代码接入和本地检查 / 导出，真人验收待反馈。结果见 [S1-A 验证记录](verification-s1a.md)。

### S1-A：两种基础作物

选择防风草与花椰菜，是因为它们可复用当前单次、空手收获路径，不依赖架子碰撞、镰刀收获、运气或钓鱼小游戏。全量范围继续按 [研究结论](research/content-xp-2026-09-09.md) 的 S1-B / S1-C / S2 / S3 推进。

本批使用 `parsnip` / `parsnip-seed` 替换 `turnip` / `turnip-seed`；保留 `cauliflower` / `cauliflower-seed`。不保留运行时 alias，也不在加载时把旧物品偷偷转换成新物品。

| 文件（相对 `apps/mirror-island/godot/`） | 拟改内容与调用影响 |
|---|---|
| `data/rules.json` | `initial.version`、`initial.inventory`、`items`、`crops`、`prices`、`requests`、`giftPreferences` 及其他实际 ID 引用；防风草 4 天 / 20 / 35 / 25，花椰菜 12 天 / 80 / 175 / 75 |
| `data/dialogues.json` | 仅同步受影响的萝卜名称及天数说明，保留自定义 NPC 的现有对话链；不声称已对齐原作 NPC 偏好 |
| `data/media.json` | 道具、详情和各主题 `farmCrops` 中的语义键同步；保持已登记 URL、帧和对象内容，标记临时外观，不新增二进制 |
| `persistence/save_codec.gd` | 提升当前开发档版本，避免对旧作物生长状态静默应用新定义 |
| `tools/validate_energy.gd`、`tools/validate_migration.gd` | 仅在检查确实消费旧 ID / 食用恢复 / 版本时定向更新；历史 fixture 不整批重生成，不扩建测试矩阵 |

消费路径：`GameSession._ready()` 加载内容 → `FarmResourceRules.farm/settle_crops()`、`GameSession._shop()` / 食用、`FarmSocialRules`、`FarmStorageRules` → 既有候选验证与保存 → snapshot → 界面和地图。源码当前足以数据驱动这两种作物，不预设要重写这些领域方法。

改名必须枚举所有运行内容引用，不能只替换商店标签。初始种子数量、开局金币、其他四种作物、现有自定义 NPC 偏好数值不随本批调整；这些仍是完整复刻待核对项。原作生长阶段外观、品质、季节枯萎、巨型作物和技能奖励也不算本批已交付。

### 存档与回退

S1-A 已使用封套 3 / 状态 15，取代 S0 的 2 / 14。内容变化改变了旧档中 `cropId` 与 `growthDays` 的解释，旧版本不能继续通过。

只接受新的完整初始状态及同版本恢复，不添加迁移和自动重置；不连接数据库，不改变 Web IndexedDB / Windows 原子文件仓库实现。验收使用隔离开发档。实际玩家槽的原内容必须保留，不以测试便利为由新建覆盖。

回退时一并恢复本批内容定义、ID 引用与 codec 版本；新版本档由旧版本明确拒绝，不能只回退版本号后继续解释新内容。不撤销 S0 或其他既有改动。

### 后续技能状态的设计方向（未批准实施）

保持 GameSession 拥有唯一状态，新增窄的 `domain/skill_rules.gd` 负责有实际调用方的经验与等级计算。先复用既有内容字典、候选副本、验证器和仓库，不引入通用事件总线、独立存储或新依赖；本轮不新增通用工程能力。

- 经验来源由成功劳动入口显式给出，普通物品入包函数、UI 消息和动画不发经验。
- 建议 `skills` 按已接入技能保存 `xp`、`level`、夜间已处理等级及实际职业。XP 是有上限的非负整数，等级必须与阈值一致；经验上限须结合未来精通规则核定，不擅自截断在 15000。第五条 Combat 用同一结构在真实入口出现时接入。
- 一次动作先按动作前等级扣体力，成功改变资源后增加 XP；保存后发布新等级，下一次动作使用新熟练度。整次候选失败不改变经验；重试写原候选，不再触发劳动。
- 同一天越过多个等级时保留每个待处理等级；重复升级确认必须无副作用。具体字段、计数上限与顺序在该批批准前落定，不预建持久化历史事件日志。
- 夜间待确认奖励必须写入状态，不能只存在于当前瞬态 `day_summary`。日结候选先按旧职业结算当日收入，再持久化升级待办；用户确认后在新候选中写入配方 / 职业并移除对应待办。失败保留待办，重开继续同一确认步骤。
- 现有 `unacknowledgedShippingReport` 与后续升级待办共同控制日结期间的移动 / 命令锁。界面只是投影，不能独立发放配方或绕开选择。
- `storage_rules.gd:128` 的制作校验与 `game_ui.gd:518` 的配方列表共同消费实际解锁状态。职业价格、生长、产出等效果必须检查真实消费者；奖励设备未可用时不得把技能全量交付标为完成。

后续 schema、原作各等级奖励表和相关系统依赖尚未收敛，不能据本节直接开始 S2。

---

状态：2026-09-08 用户确认 S0 后进入实施，体力前置已接入；整个技能任务仍未完成。实际验证见 verification-s0.md。

## S0：已确认的实施范围

1. 统一当前基础最大体力、工具耗能及恢复计算的规则来源，去除 UI、食用、日结与存档校验中的重复常量。
2. 允许并完整保存小数体力，界面只负责显示取整，不能把取整结果写回状态。
3. 对齐当前可达的基础锄地、砍树、采石、单格浇水和抛竿耗能；浇水水量与耗能分开计算。
4. 修正当前可达的正常睡眠/晚睡恢复，使其使用统一体力上限与精度，避免降低仍较高的睡前余量。
5. 同步 HUD、食用入口和隔夜报告；保持关键候选只保存一次、失败重试同一候选。

这是技能系统的前置批次，不是完整技能或完整体力系统。疲劳/负体力、昏倒、星之果实、临时加成、技能升级恢复特例及合作恢复等仍要继续实现，不能因 S0 完成而移出第一阶段。

## 文件与调用链

`game_session.gd` → 体力规则 → `resource_rules.gd` / `fishing_rules.gd` → 候选保存 → `save_codec.gd` → `game_ui.gd`。

预计生产范围为新增 `godot/domain/energy_rules.gd`，以及 `game_session.gd`、`resource_rules.gd`、`fishing_rules.gd`、`godot/data/rules.json`、`godot/persistence/save_codec.gd`、`godot/ui/game_ui.gd`。体力上限与基准耗能由一个规则来源提供，UI 不再硬编码 100；仅增加实际调用需要的方法，不预建无调用方职业或加成框架。

现有水壶 Lv2 的区域作用、容量和升级方式属于独立对齐缺口，S0 不把它自动等同铜级；其具体耗能与水量偏差须在编码前列明，不能宣称完整水壶机制已复刻。

本批约定并采用：保留 Lv2 最多三格和原容量，每个实际浇水格扣 1 水、2 体力，可浇数量取地块、水量和体力预算的最小值。这个中间规则不等于原作铜级蓄力；无效或余额不足操作仍不扣费，负体力与失败挥空耗能后续再对齐。

## 存档边界

体力数值合同变化需要提升开发存档版本并同步完整初始状态和校验。不迁移、覆盖或清理旧开发存档；旧版本继续明确拒绝，验收使用新的隔离开发档。无需数据库或 SQL migration。

本批采用封套 2、状态 14。`rules.json` 的 `sourceVersion: 13` 仍记录旧迁移来源，不作为当前状态版本；存储位置名称保持原样，只升级内容合同。

## 后续技能批次

在内容映射和前置规则明确后接入 XP/等级与即时熟练度，再接日结升级记录、真实配方和职业效果。分批是实施顺序，不缩减父 PRD 的最终要求；不为尚未可用的生产系统展示可点击的假解锁。

## 验证与回退

后台验证小数体力往返、相应动作的一次扣费、失败不扣费、不同水量/体力预算、晚睡恢复及 HUD 数值。仅定向更新因已批准规则变化而失效的基线期望，不重新生成全部期望来掩盖回归。最后执行 Godot 检查及相关本地导出。

回退必须同时恢复规则、初始状态和校验版本，不对玩家存档做回填；已接入的工具素材、动作与界面优化不回退。
