# Fix local SQLite taverns.special_type backfill

## Goal
修复本地默认 SQLite 旧数据库在后端启动时因 `taverns` 表缺少新增列 `special_type` 而反复启动失败的问题。

## Scope
- 后端数据库初始化 / SQLAlchemy SQLite 兼容逻辑。
- `taverns.special_type` 的旧表补列与默认值回填。
- 相关后端测试与最小验证。

## Requirements
- 旧 SQLite 数据库中 `taverns` 表缺少 `special_type` 时，后端启动/初始化应自动补齐该列。
- 补列逻辑需幂等；已存在列时不能重复报错。
- 新列默认按规范为 `""`，保持特殊空间类型薄层语义。
- 不改动 `place_type` 语义，不新增 schema 字段，不引入新依赖。
- 尽量保持 MySQL/其他数据库路径不受影响。

## Acceptance Criteria
- [x] 能用缺少 `taverns.special_type` 的旧 SQLite 数据库复现并验证补列后不再失败。
- [x] 相关测试覆盖旧 SQLite 表缺列场景或初始化补列行为。
- [x] 运行 `py -3 -m compileall -q backend/src`。
- [x] 运行相关后端 pytest。

## Reference Docs
- `AGENTS.md`
- `docs/WORLD_SCHEMA.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/special-tavern-types.md`
- `.trellis/spec/backend/quality-guidelines.md`

## Not in Scope
- 不设计通用迁移框架。
- 不修改前端 UI。
- 不引入新的特殊空间类型或改变已有 `cultivation`/`divination` 语义。

