# S2-L 验证记录：河流钓位与河鱼接入

日期：2026-09-11

## 本批范围

- 新增镇区河边钓位 `town-river-bridge-fishing`，旧湖岸钓位补充 `fishHabitat=mountain-lake`。
- 构建期 `FishingZones` 对象必须声明 `fishHabitat`，当前只接受 `lakeshore/mountain-lake` 和 `town/town-river`。
- `FarmFishingRules._eligible` 按当前钓位水域过滤鱼池，再套用既有时间、天气和抛竿强度条件。
- 西鲱、小嘴鲈鱼和鲷鱼进入镇河鱼池；湖岸鱼池保持鲤鱼、鲢鱼和大嘴鲈鱼。

## 自动检查

- `npm --prefix .\apps\mirror-island run godot:prepare`
  - 通过。输出：Godot 已准备 12 张地图、43 张源图；YATI 2.2.7 已校验。
  - 生成 catalog 核对：`lakeshore-old-dock-fishing` 带 `mountain-lake`，`town-river-bridge-fishing` 带 `town-river`。
- `npm --prefix .\apps\mirror-island run typecheck:client`
  - 通过。TypeScript 内容检查与 Godot 无窗口导入 / 脚本检查通过。
- `npm --prefix .\apps\mirror-island run test:fishing`
  - 通过。`Fishing skill checks: 50/50 passed`。
  - 覆盖湖岸不串河鱼、镇河雨天 / 夜间候选、镇河西鲱入包与 18 XP、满包 / 逃脱 / 保存失败重试等既有原子性。
- `npm --prefix .\apps\mirror-island run test:godot`
  - 通过。`PARITY 33 cases; hash 5; failures=[]`。
- `npm --prefix .\apps\mirror-island run build:client`
  - 通过。Web 导出完成。
- `npm --prefix .\apps\mirror-island run build:windows`
  - 通过。Windows 导出完成。

## 未验证项

- 未做真人镇区河边抛竿、触屏 / 键盘手感和连续游玩验收。
- 未用真实玩家存档介质验证恢复；本批没有升级存档版本或迁移旧档。
- 未实现鱼品质、尺寸、完美捕获、宝箱、传奇倍率、鱼饵、蟹笼、完整鱼池权重、季节系统或钓鱼职业效果。
- 未制作新鱼类正式美术；继续使用既有临时内容映射。
