# S2-Q 验证记录：春季深山湖大头鱼

日期：2026-09-11
范围：`D:\work\ai-` 当前 Godot 单人本地实现。

## 已接入范围

- `大头鱼`进入 `mountain-lake` 水域池，全天、任意天气可选；普通售价 75g、恢复 25 体力、难度 46、普通品质经验 18。
- 复用现有鱼获品质、完美捕获、库存、出货、食用、礼物和候选保存链；当前简化张力 `pull=14` 只是项目参数，不代表原作 Smooth 鱼类 AI。
- 皮埃尔 / 艾芙琳讨厌大头鱼，克林特 / 罗宾 / 莉亚 / 艾米丽不喜欢，德米特里厄斯 / 威利为普通反应；`hated` 实际扣 40 好感，未知偏好在消费前拒绝。本地 16×16 矩阵图标与连续物品排序已接入。
- 不新增持久字段，封套 13 / 状态 25 保持不变；当前旧档可继续读取，不做迁移或降级承诺。

原作依据：[大头鱼](https://zh.stardewvalleywiki.com/大头鱼)、[Bullhead](https://stardewvalleywiki.com/Bullhead)、[深山](https://stardewvalleywiki.com/The_Mountain)、[钓鱼经验](https://stardewvalleywiki.com/Fishing)。

## 自动检查

- `npm --prefix .\apps\mirror-island run test:fishing`：`Fishing skill checks: 73/73 passed`。
- 命名检查：`Stardew naming checks: 81/81 passed`。
- `npm --prefix .\apps\mirror-island run typecheck:client`：TypeScript 内容检查及 Godot headless 导入/解析通过。
- `npm --prefix .\apps\mirror-island run test:godot`：`PARITY 33 cases; hash 5; failures=[]`。
- `npm --prefix .\apps\mirror-island run build:client`：`Prepared 40 verified Mirror Island media assets.`、`Godot 已准备 12 张地图、43 张源图；YATI 2.2.7 已校验。`，Web release 导出完成。

## 未验证与后续

- 真人湖岸钓获节奏、真实 IndexedDB / Windows 文件恢复和最终鱼类美术。
- 绿藻的非鱼类直获物与 3 XP、深山湖近木头的传说之鱼、夏季虹鳟、原作鱼池权重、宝箱、鱼饵、蟹笼、鱼尺寸和完整鱼条。

本批未连接数据库，未提交、推送、部署或发布。生产内容已暂存；测试、文档和本记录按项目约定不自动暂存。
