# S2-N 验证记录：完美捕获与鱼获品质提升

日期：2026-09-11

## 范围

- 以当前张力小游戏的安全范围 `22–78` 作为完美捕获资格；收线过程中任何越界都会永久取消本次资格。
- 完美捕获将银星鱼提升为金星、金星鱼提升为铱星，普通鱼不提升；经验仍使用提升前的原始品质，再乘 `2.4` 并向下取整。
- 最终品质、库存和钓鱼经验沿用同一 `GameSession` 候选与保存重试链，不增加持久字段或版本。

## 代码路径

- `apps/mirror-island/godot/domain/fishing_rules.gd`
  - 记录 `runtime.perfect`，咬钩时开启，张力越界时永久关闭。
  - 用 `FarmQualityRules.VALUES` 将银星 / 金星分别提升到金星 / 铱星。
  - 库存使用最终品质，XP 调用传入原始品质和完美标记。
- `apps/mirror-island/godot/domain/skill_rules.gd`
  - `fishing_xp` 保留原始品质公式，完美时对基础 XP 乘 `2.4` 并向下取整。
- `apps/mirror-island/godot/ui/game_ui.gd`
  - 成功提示在品质名称后显示 `完美捕获`，不参与结算。

## 自动验证

运行：

```powershell
npm --prefix .\apps\mirror-island run godot:prepare
npm --prefix .\apps\mirror-island run typecheck:client
npm --prefix .\apps\mirror-island run test:fishing
npm --prefix .\apps\mirror-island run test:godot
npm --prefix .\apps\mirror-island run build:client
npm --prefix .\apps\mirror-island run build:windows
git diff --check
git diff --cached --check
```

结果：通过。

- `godot:prepare`：通过，准备 12 张地图、43 张源图，YATI 2.2.7 校验通过。
- `typecheck:client`：通过，TypeScript 与 Godot 脚本检查通过。
- `test:fishing`：通过，`Fishing skill checks: 57/57 passed`。
- `test:godot`：通过，`PARITY 33 cases; hash 5; failures=[]`。
- `build:client`：通过，Web 导出完成。
- `build:windows`：通过，Windows 导出完成。
- `git diff --check` 与 `git diff --cached --check`：通过，无差异空白错误；Git 仅提示现有 LF/CRLF 转换。

专项断言包括：

- 满级旧码头远投的原始金星鲤鱼在完美收线后变为铱星，库存价格 / 恢复 / 名称复用铱星品质，经验为原始金星 XP 的 `2.4` 倍向下取整。
- 张力越界后回到安全范围仍保持非完美，最终金星鱼只按基础 XP 结算。
- 普通鱼完美捕获不升级品质但仍获得完美 XP 倍率。
- 既有满包、逃脱、保存失败与重复重试语义未被改变。

## 未验证项

- 真人连续收线、键盘 / 触屏手感与真实玩家存档介质。
- 原作独立鱼条位置、宝箱期间完美判定、鱼饵、鱼尺寸、完整鱼池权重、季节和最终鱼类美术。
- Web / Windows 导出产物的人工启动与长时游玩验收；自动导出只证明构建完成。
