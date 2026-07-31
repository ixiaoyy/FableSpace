# 实施计划：删除地图与坐标能力

## 修改顺序

1. 更新 `apps/api/src/fablespace_api/core/default_spaces.py`
   - 删除 `_tavern()` 的 `lat` / `lon` 参数和返回字段。
   - 删除四个旧默认种子的坐标实参。
2. 更新 `apps/api/src/fablespace_api/core/space.py`
   - 删除 `Space.lat` / `Space.lon`。
   - 删除完整序列化与反序列化中的坐标。
   - 删除默认种子完整性检查对坐标的要求。
3. 更新 `apps/api/src/fablespace_api/infrastructure/mysql_space_store.py`
   - 停止从 `TavernModel` 投影坐标。
   - 新建旧 Space 时向旧物理列写固定兼容值。
   - 更新旧 Space 时不再重写坐标。
4. 不修改前端、ORM 表定义、SQL 迁移、Schema 注释或部署配置；审计确认这些残留分别无运行入口或属于后续 Schema 清退。

## 验证

1. Python 语法：

   ```powershell
   py -3 -m compileall -q apps/api/src
   ```

2. 最小无数据库实例验证：
   - 构造默认 Space 列表；
   - 断言默认 payload、`Space` 字段及 `to_dict()` 均无 `lat` / `lon`；
   - 断言 `to_dict_entry()` 仍保留公开角色故事所需字段。

3. 前端合同验证：

   ```powershell
   npm --prefix .\apps\web run typecheck
   npm --prefix .\apps\web run build
   ```

4. 残留审计：
   - 搜索 `lat` / `lon`、AMap、geolocation、nearby、地图、坐标、POI；
   - 将命中分为历史内容、禁止性文档/图片提示、旧物理 Schema/迁移；
   - 确认应用领域、默认种子、公开 API 与前端没有坐标能力。

5. 变更完整性：

   ```powershell
   git diff --check
   git status --short
   ```

## 评审门

- 实施前由用户确认本 PRD、设计和实施计划。
- 若要求本任务同时删除 `taverns.lat/lon`、`neighborhood_knowledge` 或 `territories`，必须停止实施，先提交表结构、数据影响、备份与回滚方案，并取得数据库迁移的明确人工批准。

## 回滚点

- 本任务不接触数据库或用户文件；出现回归时精确 revert 本任务提交即可。
- 不使用整文件恢复覆盖工作区中 `AGENTS.md` 或 `UI稿/` 的既有改动。
