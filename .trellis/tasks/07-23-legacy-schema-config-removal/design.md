# 技术设计：清退旧 Schema 配置与部署引用

## 当前与目标边界

当前生产导入图不需要旧 ORM，但仓库仍存在第二套可重建的物理 Schema：

```text
显式旧迁移入口
  -> default_spaces / migrate*
  -> legacy_schema
  -> infrastructure.models
  -> 23 张 Space / owner / visitor / map / social 表
```

目标只保留：

```text
app_factory
  -> StoryWorld application/store
  -> story_state_models            # 6 张玩家私有运行表
  -> managed_content_models        # 2 张管理员内容表
  -> Base.metadata.create_all()     # 精确 8 张表
```

## Schema 影响

### 保留表

| 领域 | 表 |
|---|---|
| 玩家故事状态 | `player_story_states` |
| 故事轮次 | `story_runs` |
| 角色关系 | `character_relationships` |
| 可回放事件 | `story_events` |
| 可回放消息 | `story_messages` |
| 私有记忆 | `private_memories` |
| 当前系统内容 | `managed_story_worlds` |
| 管理员媒体登记 | `managed_media_assets` |

### 删除表

删除 PRD R1 列出的 23 张表。ORM metadata 显示 12 张表直接外键引用
`taverns`，因此迁移先删除所有 child/独立旧表，最后删除 `taverns`，不使用
全局 `FOREIGN_KEY_CHECKS=0`。

### 删除列

`story_runs.private_memories` 只在创建 `StoryRunModel` 时写入 `[]`，没有读取
消费者。独立 `private_memories` 表要求 `source_event_id` 和顺序来源，旧内联
JSON 无法可靠补造这些字段。

清退迁移必须在任何目标表或列 DDL 前检查旧列是否存在非空 JSON：

- 列已不存在：视为已清退，幂等跳过列删除；
- 每一行都是 JSON 空数组 `[]` 或 SQL `NULL`：允许删除该列；
- JSON `null`、空对象、字符串、非空数组或其他值：按非空处理；
- 任一非空：`SIGNAL` 失败并停止，要求人工决定导出或处置；
- 不把旧值静默丢弃，也不生成伪造来源事件。

### 单一迁移

新增一个 `008_retire_legacy_space_schema.sql`：

1. 检查当前 8 张表全部存在；
2. 若 `story_runs.private_memories` 存在，检查其数据前置条件；
3. 按依赖顺序 `DROP TABLE IF EXISTS` 23 张旧表；
4. 若该列仍存在且为空，删除 `story_runs.private_memories`；
5. 不创建任何表、列、索引或数据回填。

MySQL DDL 会隐式提交。执行前必须生成完整逻辑备份并记录文件、时间和 SHA-256；
回滚只能通过恢复备份完成。应用启动和部署 workflow 都不得自动执行 008。

008 使用一个迁移期临时存储过程承载前置条件与 `SIGNAL`：MySQL 不允许把
`SIGNAL` 作为 prepared statement 动态执行，但允许在 stored program 中使用。
成功执行后迁移会删除该过程；若在 `CALL` 中失败，过程可能暂时保留，下一次执行
开头的 `DROP PROCEDURE IF EXISTS` 会先清理它。`DELIMITER` 是 mysql client
指令，因此迁移只允许由该客户端显式执行，不由 SQLAlchemy 或启动钩子加载。

## 空库初始化

删除 `infrastructure/models.py` 后，生产组合在调用 `create_tables()` 前已经通过
StoryWorld application/store 导入两组当前 models。无数据库验证应导入生产
组合并断言 `Base.metadata.tables` 精确等于 8 张保留表。

004–007 继续保存当前 Schema 的历史演进；001–003 只创建旧 FableMap/Space
Schema，删除后不再作为空库迁移序列的一部分。文档以应用 `create_tables()` 为
空库基线，以 004–007 为已有迁移历史，以 008 为已有库显式清退。

## Schema comments

`schema_comments.py` 删除 23 张旧表及其列注释，保留 6 张 runtime 表并新增
2 张 managed-content 表的完整注释。`apply_schema_comments.py` 只注册：

- `story_state_models`
- `managed_content_models`

它只读取 `FABLESPACE_DATABASE_URL`，默认仍为 dry-run；本任务不会执行它。

## 配置收敛

### Runtime settings

- `_env_value`、整数和布尔解析只接受一个 `FABLESPACE_*` 主键；
- 删除 `frontend_root`、`storage_backend`、`mysql_url`；
- `resolve_database_url()` 只使用 `database_url`，为空时固定落到
  `<output_root>/fablespace.sqlite3`；
- 删除未使用的 `create_database_from_settings()` 与 `Database.drop_tables()`；
- 保留当前 MySQL pool、认证、LLM、媒体和 generated-storage 参数。

### Shared deployment configurator

`configure_shared_services.py`：

- 只要求 ParallelLines `DATABASE_URL`，不要求 `REDIS_URL`；
- 不再接受 `--redis-db`，不再写 `FABLESPACE_REDIS_URL` 或
  `FABLESPACE_STORAGE_BACKEND`；
- 继续在写入前备份 `.env`；
- 把退役键作为“待删除键”处理，而不是配置 fallback；
- SSO、数据库、CORS、媒体映射和私密生成文件边界不变。

### Repository/deployment residue

- 删除 `redis>=5.0`；
- 删除 `apps/api/config/system_public_welfare_llm.json` 及 Docker config copy；
- 删除 Docker 中无消费者的 `FABLESPACE_ENV`；
- 删除 Actions 中无 Docker 参数消费者的两个 `VITE_AMAP_*` build args；
- 清理 `.env.example`、README 与部署文档中的旧键和旧迁移说明。

## 部署顺序

1. 先部署当前 8 表 ORM；新运行时可在旧表仍存在时继续工作，并确保旧进程不会
   在列删除后继续写入 `story_runs.private_memories`。
2. 维护窗口前生成完整逻辑备份，记录 SHA-256。
3. 在明确指定的目标库上用 mysql client 执行 008；任一前置条件或 DDL 失败即
   停止。
4. 验证只存在 8 张当前表，并运行后端健康检查与最小故事读写验收。
5. 若失败，停止应用写入并从逻辑备份恢复；不依赖反向 SQL 猜测恢复旧数据。

本任务只交付第 1 步的仓库代码，以及第 2–5 步所需的迁移和文档。没有数据库
授权时，不执行第 2–5 步，也不声称托管数据库已清退。

## 风险与取舍

- 无数据库证据，无法确认旧表实际存在或有多少数据；使用 `IF EXISTS` 处理表
  差异，但以备份承接旧数据保留责任。
- 非空内联记忆没有可靠来源映射；选择失败停止，而不是构造不可追踪数据。
- 保留 `FABLESPACE_MYSQL_POOL_*` 避免把仍有效的 MySQL 调优合同混入清退；
  如需泛化命名，应另立配置变更任务。
- 保留 standalone `legacy` auth mode；它是当前自托管认证选择，不是 Space
  领域兼容层。
