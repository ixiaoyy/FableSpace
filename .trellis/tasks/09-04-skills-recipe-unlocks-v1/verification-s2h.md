# S2-H 品质基础与基础肥料

日期：2026-09-10；本地 `main`，基线 `173bebc5`。用户明确确认继续本批开发；此前批次改动保留。

## 行为与依据

- 十种现有春季作物 / 野采支持 `quality=0/1/2/4`。同物品不同品质独立堆叠，单件 / 半组 / 整组转移、整理、箱子、落地物、出货回收及日结报告保留品质。配方与委托按普通、银、金、铱顺序消耗；出售 / 食用 / 送礼精确消耗所选品质。
- 售价按 `floor(base*(1+quality*0.25))`；食用从原始 edibility 计算并向上取整，避免把普通恢复先取整再放大。喜欢 / 喜爱礼物倍率为 1 / 1.1 / 1.25 / 1.5，中立及负好感不放大。依据：[Farming](https://stardewvalleywiki.com/Farming)、[Energy](https://stardewvalleywiki.com/Energy)、[Friendship](https://stardewvalleywiki.com/Friendship)。
- 作物按动作前种植等级及肥料先判金再判银；春季野种与地面野采按采集等级，金概率 L/30、银条件概率 L/15。结果绑定世界种子、日期和稳定来源，保存失败重试同一候选。土豆仅首个产物带品质，其额外产量为普通。当前随机序列是项目实现，未声称逐种子复现原作。依据：[Foraging](https://stardewvalleywiki.com/Foraging)、[Basic Fertilizer](https://stardewvalleywiki.com/Basic_Fertilizer)。
- 树干新增树液 5，树桩新增 1，与木材 / 树种联合容量预检。树液售价 2g、食用 -5 体力；沿用当前体力最低 0，没有引入负体力 / 生命系统。种植 1 级夜间确认解锁两树液制作一基础肥料，肥料出售 2g，第 15 天起种子店买价 100g。仅空耕地或作物种子阶段施用，同地块不能叠加，收获后保留。依据：[Sap](https://stardewvalleywiki.com/Sap)、[Trees](https://stardewvalleywiki.com/Trees)、[Basic Fertilizer](https://stardewvalleywiki.com/Basic_Fertilizer)。
- 封套 10 / 状态 22：所有库存槽必须携带品质、所有耕地必须携带 0/1 肥料字段；报告核对品质、单价、金额及唯一性。不迁移旧档，旧版本拒绝且原文本不改写。测试历史 fixture 的补字段函数只供 tools 使用，不进入生产解码器。

## 已执行验证

- `typecheck:client` 通过；`tools/validate_quality.gd` 内存仓库 61/61，覆盖混合品质、容量、转移、严格存档、出售 / 食用 / 礼物、报告金额、原子重试、种子阶段施肥、配方门禁、树液联合产出和实际三类收获。
- `test:godot` 33 规则案例 / 5 哈希通过；`test:energy` 和 `tools/validate_crops.gd` 通过。历史案例仅补必填字段及本批改变的树液 / 配方预期，不把测试适配当成存档迁移。
- 最终 `build:client`、`build:windows` release 导出通过。独立 QA 工程在忽略目录 `artifacts/quality-s2h-2026-09-10/` 中，生产初始状态未加入演示材料。
- 隐藏 Web 独立内存档实际检查：四档品质各占一格；金品质防风草显示 52g / +45 体力，点击食用后金堆叠 3→2，普通 / 银 / 铱仍各 3，体力 100→145；重复施肥显示已施肥且数量不变；对空耕地施肥成功，肥料 3→2，出现成功反馈及地面像素。QA 初次有越界演示耕地，校验正确拒绝；修正独立演示数据后以上操作通过。检查页及 8085 临时服务已关闭。
- 新增素材为三个 16×16 原生 JSON 像素定义，见 [来源与哈希](../../../docs/assets/quality-fertilizer-local-2026-09-10.md)。没有新增图片二进制、依赖或数据库 migration。

## 未验证与交付边界

真人连续种植 / 收获、真实 IndexedDB / Windows 文件恢复、真机触控与最终美术尚未验收。铱品质目前只有数据 / 流转支持，没有提前开放植物学家或高级肥料来源；鱼类仍待独立对齐。跨季肥料清理、职业、更多肥料、完整树木及原作随机序列仍有缺口。

生产代码 / 配置已暂存，测试、文档与诊断不自动暂存。未提交、推送、部署、上传素材或连接数据库；不新增运行配置。回退须一起撤回本批品质字段与各消费链、肥料 / 树液内容及版本号，保留此前批次；新 v22 档不能给旧版本解释，旧 v21 原记录仍可由旧版本读取，不做自动降级转换。技能任务保持 `in_progress`。
