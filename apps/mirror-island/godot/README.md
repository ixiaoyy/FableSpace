# Godot 迁移工程

当前为 **已接入现有玩法的 Godot 客户端**，默认开发和构建入口已切换。固定 Godot 4.7.2 标准版、GDScript、Compatibility 渲染器；Web 单线程，Windows x86_64 原生导出。本次迁移按用户要求纳入 `main`；代码提交不等于真人全流程验收或线上部署成功，发布结果以流水线和线上核验为准。

## 已有能力

- 12 张原 Tiled 地图由 YATI 2.2.7 导入，保留原出生点、出口与 Collision 掩码。
- 地图包装场景提供可见碰撞体和出生点；`scenes/regions/` 为可保留人工改动的继承场景，准备脚本不会覆盖它们。
- `scenes/islander.tscn` 的头部、上装、下装分别显示；选择根节点可修改性别、部件和颜色并预览。
- WASD、方向键与屏幕方向按钮移动，接近地图出口切换区域；Web 窗口尺寸随浏览器变化。
- 已有内景代码绘图由原函数重建，不依赖本机遗留的 runtime PNG。

| 范围 | 当前实现 |
|---|---|
| 生活规则 | 六种春作、生长/再生、采集、镐与镰刀、体力、食用、水壶补水/升级 |
| 背包与制作 | 12/24/36 格、十二格行轮换、整组/单件/半组、拖放、工具原槽固定、原两张配方 |
| 仓储与出货 | 36 槽普通箱、21 色、存取/整理/已有堆叠、摆放、推箱、掉落、最后一笔撤回、隔夜分类收入 |
| 小镇 | 八名居民、日程/休息日/雨天/柜台服务、对话、送礼、委托、背包陈列和木匠建造/移动/拆除 |
| 时间与伙伴 | 06:00–02:00、午夜提示、睡眠与昏倒、确定性天气、钓鱼、猫狗领养/漫步/抚摸 |
| 表现与界面 | 原地图/素材、分层外观、昼夜/雨风/声音、原生菜单、角色预览、鸣谢与许可证 |
| 保存 | Godot v8 封套、状态版本 20；关键候选原子保存、失败重试、浏览器事务完成确认、桌面临时文件替换 |

不读取、覆盖或迁移旧 Phaser 开发档。Web JavaScript 仅作引擎宿主、IndexedDB 和音量偏好适配，玩法不通过 JS 执行。

S0 体力批次使用 270 点基础上限并保留小数；基础单格浇水耗能 2、抛竿耗能 8，食用与正常/晚睡恢复不丢弃小数。旧 Godot 开发版本封套会明确拒绝，不自动迁移或覆盖；验收使用新开发档。现有 Lv2 水壶仍是最多三格的中间实现，每格扣 1 水和 2 体力，完整金属升级、疲劳与技能效果尚待后续批次。

## 本地准备

在仓库根目录执行。第一次需下载引擎和模板，缓存只写入忽略的 `artifacts/godot-runtime/`，不修改 PATH。

```powershell
npm --prefix .\apps\mirror-island ci --ignore-scripts
npm --prefix .\apps\mirror-island run godot:setup
npm --prefix .\apps\mirror-island run prepare:media
node --experimental-strip-types .\apps\mirror-island\scripts\prepare-godot.mjs
npm --prefix .\apps\mirror-island run typecheck:client
npm --prefix .\apps\mirror-island run godot:editor
```

旧客户端、旧 TypeScript 玩法、Vite 客户端入口和 EasyStar 依赖已清理。准备阶段仅使用 `scripts/content/` 的独立 Tiled 解析与校验；两张室内图由原生工具读取 `tools/interior-atlases.json` 重建。`data/*.json` 直接作为当前内容源维护，不再运行旧玩法生成快照。`test:godot` 使用固定迁移基线，不执行旧引擎代码。

## 导出与查看

```powershell
npm --prefix .\apps\mirror-island run dev:client
npm --prefix .\apps\mirror-island run build:windows
```

默认 Web 地址为 `http://127.0.0.1:8080/`；本轮临时验收服务使用 5183。Windows 输出为 `exports/windows/mirror-island.exe`，必须与同目录 `.pck` 一起保留。本地 Python 服务不配置压缩，不代表 CDN 或真实手机网络性能；Nginx 构建配置已包含 WASM/PCK 压缩与缓存再验证。

## 素材编辑

五件清新田园工具已提供显式本地构建：在应用目录运行 `npm run dev:tool-art`，或仅运行 `npm run build:tool-art` 后使用 Web/Windows 产物。它们尚未发布至 CDN；普通构建会清除候选并使用正式媒体。来源、尺寸与运行边界见 [工具素材接入记录](../../../docs/assets/pastoral-tools-local-2026-09-08.md)。

- 人物：打开 `scenes/islander.tscn`，检查器参数对应旧版相同的三层图集和遮罩颜色。
- 地图：打开 `scenes/regions/farm.tscn` 等继承场景做额外调整；`generated/` 是再生成结果，不直接手改。
- 当前领域碰撞以原 Tiled Collision 掩码为准，生成的碰撞节点用于检查；只改继承场景中的碰撞外观不会自动更改玩法规则。修改通行区域须同步地图掩码后重新准备。
- 原图仍从已登记 CDN 素材准备，名称、哈希与源信息在 `generated/media-provenance.json`；不要将图片二进制加入 Git。
- 中文预览字体为 Noto Sans CJK SC Sans2.004，OFL-1.1，完整许可证随导出包提供；公开发布前还须按媒体流程上传登记。不得直接发布当前本地候选引用。

## 开源依赖与局部修复

- Godot：官方 4.7.2-stable，MIT，归档 SHA-512 固定于 `engine-lock.json`。
- YATI：官方作者仓库 GDScript 2.2.7 发布归档，MIT，SHA-256 固定；仅作编辑器导入，不随运行包发布。准备脚本在匹配固定源码锚点后补充两个释放动作：释放打包后的临时 Node2D，释放从树中移除的空 ParallaxBackground。失败即停止，不自动适配未知版本。
- 未使用较旧的 Godot4-TiledImporter，也未自研通用 TMJ 导入器。YATI 可处理当前图块翻转和 TileMapLayer；后续升级必须重新验证导入结果。

## 验证边界与回滚

实际完成：Godot 解析/导入、服务端类型检查与构建、Web/Windows 导出、Windows headless 启动；34 个旧规则案例和 5 个哈希对照；32 项地图/菜单实例化及窄屏重排检查。隔离文件验证新建/日结失败重试、重复重试和继续读取。

实际 Web 路线包括新建、背包移动、刷新继续恢复、锄地、农场至小镇通行及 02:00 日结。仍未代替完整真人玩法、真机触摸、长时间存档与低端手机性能验收。本机 Docker daemon 未运行，Linux 容器构建没有实测。完整证据见 `.trellis/tasks/09-07-godot-engine-migration/implement.md`。

回滚需回到迁移前基线 `02ee7d0c` 并按其 lockfile 安装依赖；当前分支已经更换 npm 入口和依赖，不能直接运行旧 Vite 配置。迁移分支为 `codex/godot-engine-migration`；线上未改动，数据库、CDN 对象和旧存档均未触碰。任何提交、推送或部署仍需针对本次动作授权。

## 2026-09-09 两种作物基础对齐

防风草取代原萝卜，生长 4 天、种价 20、售价 35、食用恢复 25；花椰菜生长 12 天、种价 80、售价 175、食用恢复 75。使用封套 3 / 状态 15，旧开发档保留但不迁移。素材沿用现有图集作为临时外观，完整技能尚未接入；本批检查和待验收项见 [S1-A 验证记录](../../../.trellis/tasks/09-04-skills-recipe-unlocks-v1/verification-s1a.md)。

## S1-B 当前进度

三种作物已接入，青豆支持架子阻挡、斧头清除和复收外观；羽衣甘蓝需要镰刀，采用用户已批准的 42 像素/最多 3 个混合目标和满包整次拒绝临时规则。当前封套 5 / 状态 17，原作校准仍待完成；见 [S1-B 阶段记录](../../../.trellis/tasks/09-04-skills-recipe-unlocks-v1/verification-s1b.md)。素材仍为临时显示，真人验收未完成。

## 当前技能成长

菜单可查看耕种、采集、采矿、钓鱼经验与等级；升级会立即提高对应工具熟练度，配方和职业经夜间报告确认。采集 5 级已选择护林人或收集者后才可进入新一天，两项均有真实伐木或野采效果。湖岸旧码头当前只产生鲤鱼、鲢鱼和大嘴鲈鱼，普通品质分别增加 8 / 14 / 19 钓鱼经验；西鲱、小嘴鲈鱼和鲷鱼等待真实河流或池塘钓位。品质、初级肥料与初级保湿土也已进入当前玩法。当前封套 12 / 状态 24；鱼类品质、完美捕获、宝箱、其余职业、完整配方和每日运气仍待接入，详见 [S2-K 验证记录](../../../.trellis/tasks/09-04-skills-recipe-unlocks-v1/verification-s2k.md)。

## 首个配方奖励

种植1级夜间报告确认后可学会并制作稻草人，煤炭在铁匠铺工具架购买。稻草人可摆放、保护作物、查看计数和回收；日结报告记录乌鸦损失与驱赶。当前用本地像素占位，其它配方 / 品质等继续补齐，见 [S2-B 验证记录](../../../.trellis/tasks/09-04-skills-recipe-unlocks-v1/verification-s2b.md)。
