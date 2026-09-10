# S2-K 湖岸基础钓鱼经验与熟练度

日期：2026-09-10；本地 `main`，基线 `173bebc5`。本批续接技能与配方任务，不连接数据库，不修改玩家存档或远端环境。

## 行为变化

- 当前状态新增第四条 `fishing / 钓鱼` 技能；`skills` 与 `professions` 均固定为耕种、采集、采矿、钓鱼四键。技能等级立即提高竹鱼竿熟练度，每级使下一次抛竿少消耗 0.1 体力。
- 唯一钓位 `lakeshore-old-dock-fishing` 只启用原作可在山湖出现的三个现有候选。当前张力参数 `pull` 保持本项目行为，不作为原作难度。

| 当前 ID | 显示名 | 时段 | 普通售价 | 普通恢复 | 难度 | 当前 XP |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `lake-carp` | 鲤鱼 | 06:00–02:00 | 30g | 13 | 15 | 8 |
| `silver-minnow` | 鲢鱼 | 06:00–02:00 | 50g | 25 | 35 | 14 |
| `jade-bream` | 大嘴鲈鱼 | 06:00–19:00 | 100g | 38 | 50 | 19 |

依据为[钓鱼经验](https://stardewvalleywiki.com/Fishing#Experience_Points)、[鲤鱼](https://stardewvalleywiki.com/Carp)、[鲢鱼](https://stardewvalleywiki.com/Chub)与[大嘴鲈鱼](https://stardewvalleywiki.com/Largemouth_Bass)。当前小游戏只产出普通品质，没有宝箱、完美或传奇结果，因此使用基础公式 `floor((quality + 1) * 3 + difficulty / 3)` 并传实际品质 0。西鲱、小嘴鲈鱼和鲷鱼保留物品、素材与礼物偏好，等待真实河流或池塘钓位后再开放。

鱼获链路为 `GameSession.tick` 建立候选，`FarmFishingRules.tick` 先完整入包，再在同一候选增加经验，最后由 `_commit` 保存并发布。满包和逃脱在经验前返回；保存失败保留已计算候选，`retry-fishing-save` 只重写一次，不重新运行捕鱼状态机。

封套升级为 12、状态版本升级为 24。旧 11 / 23 开发档原文保留并拒绝，不迁移、覆盖或自动重置。

## 自动检查

- `npm --prefix apps/mirror-island run test:fishing`：32 / 32，通过三湖鱼数据、河鱼退出活动池、四技能结构、旧版本拒绝、满包、逃脱、保存失败重试、夜间报告、满体力恢复与 7.9 / 7.89 抛竿边界。
- `test:godot`：33 个固定案例、5 个哈希通过；原确定性钓鱼序列在三鱼池下得到普通大嘴鲈鱼、19 XP，终局张力取整为 47。
- `test:energy`、`validate_professions.gd` 27 / 27、`validate_stardew_names.gd` 72 / 72、`validate_quality.gd` 61 / 61、`validate_retaining_soil.gd` 18 / 18 和作物检查通过。
- `validate_views.gd`：33 项通过，技能页显示 `钓鱼 · 0 级`，日结显示 `钓鱼提升：0 → 1 级`。
- `typecheck:client`、Web release 和 Windows release 导出通过，日志未见 `SCRIPT ERROR`。

## 未验证与后续

自动检查不代替真人连续钓鱼、实际 IndexedDB / Windows 文件恢复或真机触控。完整山湖鱼池、原作权重、河流 / 池塘钓位、鱼类品质与尺寸、完美捕获、宝箱、鱼饵、蟹笼及钓鱼 5 / 10 级职业仍待后续，当前 `pull` 也不代表原作鱼类行为。

## 交付与回退

生产代码与配置通过检查后暂存；测试和文档不自动暂存。没有新增依赖、数据库、migration、素材二进制、远程写入、提交、推送或部署。

回退须一起恢复六条活动鱼表及三湖鱼旧价格 / 恢复 / 时段，移除 `difficulty`、钓鱼 XP、第四技能 / 职业键、鱼竿熟练度与技能页内容，并恢复封套 11 / 状态 23。含四技能的新档不能由旧代码解释，不做降级转换。
