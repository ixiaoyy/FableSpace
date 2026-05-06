# PRD: Next-stage MySQL runtime storage and targeted migration

## Goal

下一阶段正式运行时数据存储以 MySQL 为目标数据库，使用现有 SQLAlchemy 模型/Store 作为唯一权威运行时存储层。旧 JSON 文件、内存 store 和缓存不得作为正式运行时权威数据源；它们只能作为迁移输入、显式本地 fallback、导入导出文件或可再生 cache。

## Requirements

- `FABLEMAP_DATABASE_URL` / `FABLEMAP_MYSQL_URL` 支持 MySQL SQLAlchemy URL，并作为生产配置入口。
- 定向迁移旧 runtime 文件：taverns、keyvault、chat history、visitor state、memory atoms、gameplay sessions、state cards、owner configs、visitor notes、home/visits、writeback state。
- 迁移默认非破坏性：已有 DB 行默认跳过或按明确 upsert 策略处理；`--drop-existing` 保持显式危险选项。
- 迁移日志不得打印完整 DB 凭据或 owner API key。
- 不把缓存、导出包、生成图片、前端静态资源迁进 MySQL。
- 增加迁移测试，覆盖至少 owner config、visitor note、home visit、writeback/state card 这些上一阶段新表。

## Acceptance Criteria

- [x] Trellis 中有本任务和迁移范围说明。
- [x] 迁移脚本支持 `FABLEMAP_DATABASE_URL` 优先，`FABLEMAP_MYSQL_URL` 兼容。
- [x] 迁移脚本支持从 `--output-root` 定位 side stores，不要求用户手动指定多个文件目录。
- [x] state cards / owner configs / visitor notes / homes / visits / writeback state 可迁移到 DB 表。
- [x] 迁移脚本说明哪些数据不会迁移以及原因。
- [x] `py -3 -m compileall -q backend/src` 通过。
- [x] 迁移相关测试通过。

## Non-goals

- 不把 Overpass cache、导出 artifacts、生成图片、测试 fixtures 迁入 MySQL。
- 不实现在线迁移 UI。
- 不做 destructive migration；除非用户显式传 `--drop-existing`。

