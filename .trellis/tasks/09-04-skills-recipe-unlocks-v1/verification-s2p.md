# S2-P 验证记录：围栏寿命与大门

日期：2026-09-11
范围：`D:\work\ai-` 当前 Godot 单人本地实现。

## 已接入范围

- `木围栏`：默认配方，2 木材制作 1 个，1g 出货，48–52 天寿命。
- `大门`：默认配方，10 木材制作 1 个，4g 出货，360 天寿命。
- `石围栏`：显示名校正为官方简体中文，继续由耕种 2 级夜间确认解锁，2 石头制作 1 个，2g 出货，106–109 天寿命。
- 围栏对象持久化 `placedDay` 与 `damaged`，大门额外持久化 `open`；封套升级为 13，状态版本升级为 25。
- 围栏寿命结束先进入损坏状态，再过一天消失；损坏围栏可被新围栏替换，完整围栏可用十字镐回收并返还物品，损坏围栏清理不返还。
- 大门关闭时阻挡，打开时允许通行；角色、居民或伙伴站在门格上时不能关闭。

原作依据：[Wood Fence](https://stardewvalleywiki.com/Wood_Fence)、[Stone Fence](https://stardewvalleywiki.com/Stone_Fence)、[Gate](https://stardewvalleywiki.com/Gate)、[制作 / 围栏](https://zh.stardewvalleywiki.com/制作)。

## 自动检查

- `npm --prefix .\apps\mirror-island run test:stone-fence`
  结果：`Fence rules: 76/76 passed`
- `.\artifacts\godot-runtime\4.7.2\Godot_v4.7.2-stable_win64_console.exe --headless --path .\apps\mirror-island\godot --script res://tools/validate_stardew_names.gd --quit-after 120`
  结果：`Stardew naming checks: 80/80 passed`
- `npm --prefix .\apps\mirror-island run typecheck:client`
  结果：TypeScript 内容检查和 Godot headless 导入检查通过。
- `npm --prefix .\apps\mirror-island run test:godot`
  结果：`PARITY 33 cases; hash 5; failures=[]`
- `npm --prefix .\apps\mirror-island run test:energy`
  结果：`ENERGY S0 failures=[]`
- `npm --prefix .\apps\mirror-island run test:fishing`
  结果：`Fishing skill checks: 57/57 passed`
- `npm --prefix .\apps\mirror-island run test:views`
  结果：`VIEWS 33 checks completed`
- `npm --prefix .\apps\mirror-island run build:client`
  结果：`Prepared 40 verified Mirror Island media assets.`、`Godot 已准备 12 张地图、43 张源图；YATI 2.2.7 已校验。`，Web release 导出完成。

## 未验证项

- 真人围栏布局、打开 / 关闭门的连续手感和长周期耐久观感。
- 真实 IndexedDB / Windows 文件存档恢复。
- 动物路径、配偶修复、金钟免衰减、横竖连接自动拼接和最终围栏美术。

本批未连接数据库，未提交、推送、部署或发布。
