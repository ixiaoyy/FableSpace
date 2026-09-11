# S2-O 验证记录：耕种 2 级石栅栏配方

日期：2026-09-11

## 范围

- 耕种 2 级夜间确认后学习 `石栅栏`，2 个石头制作 1 个，普通出货价 2g。
- 石栅栏只能放在农场一格合法位置，参与共享移动阻挡；十字镐可回收，满包、错误工具和保存失败不删除物件。
- 沿用当前 `GameSession` 候选保存和同版本存档；没有新增耐久字段、状态字段或存档版本。

原作依据：[石头与配方](https://stardewvalleywiki.com/Stone)、[Crafting / Fences](https://stardewvalleywiki.com/Crafting)。原作石栅栏有 106–109 天耐久，本批只接入可制作、摆放、阻挡和回收闭环，耐久衰减另批实现。

## 代码路径

- `apps/mirror-island/godot/data/rules.json`
  - 新增 `stone-fence` 物品、2g 出货价和耕种 2 级配方。
- `apps/mirror-island/godot/data/media.json`
  - 新增 16×16 本地像素图标。
- `apps/mirror-island/godot/domain/storage_rules.gd`
  - 扩展制作、摆放与十字镐回收，失败不部分修改。
- `apps/mirror-island/godot/domain/world_rules.gd` / `persistence/save_codec.gd`
  - 限制农场区域并纳入一格阻挡和存档白名单。
- `apps/mirror-island/godot/presentation/game_world.gd` / `ui/game_ui.gd`
  - 接入世界投影、放置入口、碰撞提示与回收输入。

## 自动验证

运行并通过：

```powershell
npm --prefix .\apps\mirror-island run typecheck:client
npm --prefix .\apps\mirror-island run test:stone-fence
npm --prefix .\apps\mirror-island run test:godot
npm --prefix .\apps\mirror-island run test:fishing
npm --prefix .\apps\mirror-island run build:client
npm --prefix .\apps\mirror-island run build:windows
git diff --check
git diff --cached --check
```

结果：

- `typecheck:client`：通过，TypeScript 与 Godot 脚本检查通过。
- `test:stone-fence`：通过，`Stone fence: 21/21 passed`。
- `test:godot`：通过，`PARITY 33 cases; hash 5; failures=[]`。
- `test:fishing`：通过，`Fishing skill checks: 57/57 passed`。
- `build:client`：通过，Web 导出完成；`build:windows`：通过，Windows 导出完成。
- `git diff --check` 与 `git diff --cached --check`：通过，无差异空白错误；Git 仅提示现有 LF/CRLF 转换。

## 未验证项

- 真人农场布局、连续移动、键盘 / 触屏回收与真实玩家存档介质。
- 原作 106–109 天耐久、损坏状态、围栏替换、围栏门、动物阻挡和最终石栅栏美术。
