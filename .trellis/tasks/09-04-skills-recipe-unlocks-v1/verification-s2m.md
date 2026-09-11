# S2-M 验证记录：鱼获基础品质

日期：2026-09-11

## 本批范围

- 按 [Fishing](https://stardewvalleywiki.com/Fishing) 的离岸距离、钓鱼等级和 90–110 因子规则，接入当前可实现的原始鱼获品质。
- 源 TMJ 钓位新增 `maxQualityDistance`：湖岸旧码头为 5，镇河桥位为 3；构建期解码强制校验 1–5。
- 当前没有真实浮漂落点，暂用 `castPower` 在钓位最大距离内折算本次品质距离。
- 六条当前鱼类支持品质和 `edibility`；普通品质恢复不变，银星 / 金星复用既有库存、出货、食用、礼物和名称规则。
- 不实现完美捕获、品质浮标、宝箱、传奇倍率、鱼尺寸显示、训练竿、鱼饵、蟹笼或钓鱼职业。

## 自动检查

- `npm --prefix .\apps\mirror-island run godot:prepare`
  - 通过。输出：Godot 已准备 12 张地图、43 张源图；YATI 2.2.7 已校验。
- `npm --prefix .\apps\mirror-island run typecheck:client`
  - 通过。TypeScript 内容检查与 Godot 无窗口导入 / 脚本检查通过。
- `npm --prefix .\apps\mirror-island run test:fishing`
  - 通过。`Fishing skill checks: 54/54 passed`。
  - 覆盖钓位品质距离、六条鱼品质合同、普通近投仍按普通品质入包、满级远投金星鲤鱼、品质经验 14、金星价格 45g、金星恢复 23、金星名称和同版本存档恢复。
- `npm --prefix .\apps\mirror-island run test:godot`
  - 通过。`PARITY 33 cases; hash 5; failures=[]`。
- `npm --prefix .\apps\mirror-island run build:client`
  - 通过。Web 导出完成。
- `npm --prefix .\apps\mirror-island run build:windows`
  - 通过。Windows 导出完成。

## 未验证项

- 未做真人远近抛竿手感、触屏 / 键盘连续钓鱼和真实玩家存档介质恢复验收。
- 未显示或结算鱼尺寸；当前品质距离仍是 `castPower` 近似，不是实际浮漂落点离岸距离。
- 未实现完美捕获、宝箱、传奇倍率、鱼饵、浮标、蟹笼、完整鱼池权重、季节系统或钓鱼职业效果。
- 未制作新鱼类正式美术；继续使用既有临时内容映射。
