# S2-E 四种标准春季野采基础内容

日期：2026-09-10；本地 `main`，起点 `173bebc5`。续接当前技能任务已记录的连续开发授权。

## 行为变化

- 新增 `wild-horseradish` / 野山葵：普通出货价 50、食用恢复 13；新增 `dandelion` / 蒲公英：普通出货价 40、食用恢复 25。两者与水仙、韭葱一样，成功地面拾取授予采集经验 7。
- 保持八个既有稳定出生点且不新增日刷新数量：农场入口近似点为水仙 / 蒲公英；镇区两个点均为水仙；山麓和湖岸各为韭葱 / 野山葵。出生点 ID 和坐标不变，当前地图近似不冒充原作完整区域与权重。
- 两个新物品加入全量显式礼物偏好，当前自定义居民统一为 `neutral`。完整性检查同时发现 S2-B 的煤炭 / 稻草人缺少偏好并可能在直接索引时出错，本批为八名居民补齐 `neutral`；不声称已对齐原作居民喜好。
- 复用 S2-D 的 `gather` 成功候选和 7 XP 路径，没有增加命令、状态字段或保存迁移。封套 9 / 状态 21 不变，S2-D 同版本记录继续有效。

基础数值与经验依据为本日读取的 [Wild Horseradish](https://stardewvalleywiki.com/Wild_Horseradish)、[Dandelion](https://stardewvalleywiki.com/Dandelion) 与 [Foraging](https://stardewvalleywiki.com/Foraging)。区域近似参考 [Backwoods](https://stardewvalleywiki.com/Backwoods)、[Cindersap Forest](https://stardewvalleywiki.com/Cindersap_Forest) 和 [Bus Stop](https://stardewvalleywiki.com/Bus_Stop)。本批未运行原作 1.6.15 可执行程序，也未实现原作完整刷新权重。

## 实际验证

- 相关 JSON / TMJ 解析、像素矩阵 16×16、四个区域素材映射和 34 个连续且唯一的排序值检查通过；所有八名居民均有两个新物品的偏好值。
- `godot:prepare` 生成 12 张地图并校验 43 张源图；生成目录统计为水仙 3、蒲公英 1、韭葱 2、野山葵 2。
- `artifacts/forage-s2e-2026-09-10/validate_spring_forage.gd` 使用内存仓库执行 71/71：内容、点位、前 28 天可见性、四类拾取 7 XP、蒲公英 93→100、保存失败重试、13 / 25 体力恢复、全部可赠物品偏好、煤炭 / 稻草人实际送礼和同版本恢复。
- `typecheck:client`、`test:godot`（33 个规则案例 / 5 个哈希）和 `test:energy` 均通过。
- Web / Windows release 导出通过。隐藏 Web 隔离新档检查快捷栏与背包详情：野山葵 50g / `食用 +13 体力`，蒲公英 40g / `食用 +25 体力`；临时起始物品已恢复，检查页和服务已关闭，最终两端产物已重建。

## 限制与回退

当前八点分布只是适配现有四区的内容底座，没有实现每天累积生成、原作各地图概率、季节切换、品质、Gatherer 翻倍、Botanist 或 Spring Seeds。真人随机拾取、真机、长期刷新和最终美术仍待验收。

无需数据库、依赖、配置或 schema migration。没有连接数据库、上传素材、提交、推送或部署。生产代码与配置暂存；任务文档、素材记录和诊断脚本不自动暂存。

回退须一起移除两个物品、素材、价格、礼物偏好与构建白名单，并恢复四个被重新分配的稳定点位；不降低封套 / 状态版本，也不修改玩家存档。含新物品的同版本开发档在回退代码下会被严格拒绝，因此回退前须明确接受该开发档不可继续，不做自动转换。
