# MySQL 下一阶段运行时存储迁移方案

## 结论

FableMap 下一阶段生产运行时数据以 MySQL 为目标数据库，入口使用 `FABLEMAP_DATABASE_URL`，`FABLEMAP_MYSQL_URL` 仅保留旧别名。SQLite 只作为本地未配置 DB URL 时的开发默认数据库；JSON/file store 只保留为迁移输入、显式本地 fallback、导入导出和 cache/artifact。

## 迁移命令

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
$env:FABLEMAP_DATABASE_URL = "mysql+pymysql://user:pass@localhost:3306/fablemap"
py -3 -m fablemap_api.infrastructure.migrate --output-root .fablemap-api
```

兼容旧参数：

- `--database-url` 优先。
- `--mysql-url` 可用但视为旧别名。
- 环境变量优先级：`FABLEMAP_DATABASE_URL` > `FABLEMAP_MYSQL_URL`。
- `--drop-existing` 仍是显式危险选项，默认不删除现有表。

## 已覆盖迁移输入

| 旧位置 | 目标表/模型 |
| --- | --- |
| `<output-root>/taverns/taverns.json` | `taverns`, `characters`, `world_info`, `visitors`, `memory_atoms`, `gameplay_sessions`, `state_cards` |
| `<output-root>/taverns/taverns_keyvault.json` | `llm_configs` |
| `<output-root>/taverns/chat_history/**/*.jsonl` | `chat_messages` |
| `<output-root>/owner_configs.json` | `owner_configs` |
| `<output-root>/visitor_notes.json` | `visitor_notes` |
| `<output-root>/homes/homes.json` | `homes` |
| `<output-root>/homes/visits.json` | `home_visits` |
| `<output-root>/writeback/writeback-state.json` | `writeback_states` |

## 不迁移的数据

- Overpass/cache、可再生缓存、临时下载缓存：不是用户运行时权威数据。
- Tavern 导出包、备份包、测试 fixtures：属于导入导出/测试输入，不应进入生产库。
- 生成图片、prompt sidecar、前端静态资源：资产走资源目录规范，不进 MySQL runtime 表。
- 旧 in-memory notification/rumor 进程内数据：没有可靠 durable source；运行时已由 SQLAlchemy store 接管，历史进程内数据不可恢复。

## 验证

- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest -q backend/tests/test_mysql_migration_runtime_side_stores.py --tb=short`

