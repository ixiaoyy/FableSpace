# 清退旧 Schema 配置与部署引用

## Goal

在应用级 Space 合同已删除后，移除只服务于旧地图、Space、店主、访客社交、
SillyTavern 与通用玩法的物理 Schema、ORM、迁移入口和配置兼容层，使空库和
现有部署都只保留 StoryWorld 主线需要的持久化与部署合同。

## Background

- 生产入口已经只使用 StoryWorld 服务，但
  `apps/api/src/fablespace_api/infrastructure/models.py:33` 至
  `apps/api/src/fablespace_api/infrastructure/models.py:604` 仍声明 23 张旧表；
  旧迁移器、默认 Space seed 和 Schema compatibility helper 仍可重建这些表。
- 不连接数据库的 SQLAlchemy metadata 审计确认，当前两组 models 精确注册
  8 张表：6 张玩家私有运行表和 2 张管理员托管内容表；导入旧 ORM 后总数变为
  31 张，因此删除集合精确为 23 张。
- `story_runs.private_memories` 是
  `apps/api/sql/migrations/004_annie_story_runtime.sql:22` 遗留的内联 JSON 列；
  当前运行时只在新建轮次时写入空数组
  （`application/story_worlds.py:745`、`infrastructure/player_story_state_store.py:137`），
  没有读取消费者，真实记忆已经写入独立 `private_memories` 表。
- 配置仍接受 `FABLEMAP_*`、旧数据库 URL、JSON storage、旧前端 root 和默认
  Space seed；共享部署脚本还要求未被应用使用的 Redis。
- 旧 `apps/api/config/system_public_welfare_llm.json`、部署 workflow 的
  `VITE_AMAP_*` build args 和 Docker 中的旧 config copy 已无运行消费者。
- 本任务不主动连接任何数据库。托管数据库中旧表是否存在、各表行数以及
  `story_runs.private_memories` 是否含非空数据目前未知。

## Requirements

### R1 — 精确物理 Schema 清退

在获得人工批准后，只允许新增一个显式迁移版本，删除以下 23 张旧表：

- `taverns`
- `characters`
- `world_info`
- `visitors`
- `chat_messages`
- `memory_atoms`
- `gameplay_sessions`
- `llm_configs`
- `npc_public_bonds`
- `npc_public_bond_queues`
- `tavern_messages`
- `state_cards`
- `relationship_edges`
- `visitor_relationship_projections`
- `owner_configs`
- `visitor_notes`
- `notifications`
- `neighborhood_rumors`
- `neighborhood_knowledge`
- `homes`
- `home_visits`
- `writeback_states`
- `territories`

同一迁移删除 `story_runs.private_memories` 旧内联列，但必须先满足：

- 下列 8 张当前表全部存在；
- `story_runs.private_memories` 已不存在，或该列每一行都是 JSON 空数组 `[]`
  或 SQL `NULL`；JSON `null`、空对象、字符串、非空数组及其他值一律视为非空；
- 任一前置条件不满足时迁移立即失败，不删除任何目标；
- 不把无来源的旧 JSON 猜测性写入 `private_memories` 表。

迁移只删除旧表与这一列，不新增表、列或索引，不修改当前表中的其他数据。
MySQL DDL 回滚依赖执行前的完整逻辑备份，不声称事务性回滚。

### R2 — 保留当前 Schema

必须完整保留：

- `player_story_states`
- `story_runs`
- `character_relationships`
- `story_events`
- `story_messages`
- `private_memories`
- `managed_story_worlds`
- `managed_media_assets`

删除旧 ORM 后，应用启动的 `Base.metadata.create_all()` 必须从空库只创建这 8 张
表。`schema_comments.py` 和注释同步工具只描述这 8 张表，且补齐当前缺失的
`managed_story_worlds`、`managed_media_assets` 注释。

### R3 — 删除旧 Schema 代码与迁移入口

删除：

- `infrastructure/models.py`
- `infrastructure/legacy_schema.py`
- `infrastructure/migrate.py`
- `infrastructure/migrate_database.py`
- `core/default_spaces.py`
- 旧 SQL 迁移 `001_initial_schema.sql`、`002_add_territories.sql`、
  `003_add_engagement_columns.sql`

保留 004–007 当前主线迁移；新增的单一清退迁移排在其后。现有 Schema comment
工具改为只导入当前 runtime 与 managed-content models，不保留旧 URL alias。

### R4 — 删除旧配置与部署引用

仓库不再把下列键作为运行时输入、部署输出、示例项或遗留配置入口：

- `FABLEMAP_OUTPUT_ROOT`
- `FABLEMAP_FRONTEND_ROOT`
- `FABLEMAP_CORS_ORIGINS`
- `FABLEMAP_DATABASE_URL`
- `FABLEMAP_MYSQL_URL`
- `FABLEMAP_STORAGE_BACKEND`
- `FABLEMAP_MYSQL_POOL_SIZE`
- `FABLEMAP_MYSQL_MAX_OVERFLOW`
- `FABLEMAP_MYSQL_ECHO`
- `FABLESPACE_MYSQL_URL`
- `FABLESPACE_STORAGE_BACKEND`
- `FABLESPACE_FRONTEND_ROOT`
- `FABLESPACE_SEED_DEFAULT_SPACES`
- `FABLESPACE_REDIS_URL`
- `HF_TOKEN`
- `OPENCODE_API_KEY`

共享部署配置器不再要求 `REDIS_URL` 或写入 Redis/JSON-storage 配置；它仍可在
备份服务器 `.env` 后删除上述已退役键。删除未使用的 `redis` Python 依赖、
`system_public_welfare_llm.json`、Docker `FABLESPACE_ENV`/config copy，以及
GitHub workflow 的 `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`。

以下当前合同必须保留：

- `FABLESPACE_DATABASE_URL` 与默认 SQLite；
- `FABLESPACE_MYSQL_POOL_SIZE`、`FABLESPACE_MYSQL_MAX_OVERFLOW`、
  `FABLESPACE_MYSQL_ECHO`，作为仍受支持的 MySQL 连接池参数；
- `FABLESPACE_OUTPUT_ROOT`、CORS、认证、会话、系统 LLM、管理员媒体、
  generated storage、S3/CDN 配置；
- ParallelLines 自身环境中的 `FABLESPACE_SSO_SERVICE_SECRET`；
- `FABLESPACE_AUTH_MODE=legacy` 的独立自托管认证模式。

### R5 — 文档与部署合同同步

- README 使用当前 `python -m fablespace_api --host/--port` CLI 和
  `/api/v1/health`，不再声称后端托管旧前端入口。
- `docs/DEPLOYMENT.md` 区分空库初始化与已有库清退，记录备份、前置检查、
  显式迁移、验证和 restore-only 回滚。
- `docs/WORLD_SCHEMA.md` 在清退完成后只描述 8 张当前表。
- `.trellis/spec/backend/` 删除“隔离旧物理 Schema”的临时规范，改为当前
  Schema 基线和禁止恢复旧 ORM/迁移入口的长期约束。

## Out of Scope

- 连接、查询、备份或修改任何本地、测试、共享或托管数据库。
- 自动在应用启动或 GitHub Actions 部署中执行破坏性迁移。
- 把旧 Space、Character、聊天、关系、owner 或 LLM 数据转换为 StoryWorld
  当前内容；旧数据只通过执行前逻辑备份保留。
- 修改 8 张保留表中除 `story_runs.private_memories` 外的字段、索引或数据。
- 重命名仍有效的 MySQL pool 环境键或改变认证、系统 LLM、媒体、SSO 行为。
- 恢复 pytest，增加新依赖，或改动 StoryWorld 内容与前端产品体验。

## Acceptance Criteria

- [x] 人工明确批准 23 张表和 `story_runs.private_memories` 的破坏性影响后，
      才创建或修改清退迁移。
- [x] 单一显式迁移验证 8 张当前表存在；旧内联列已不存在时幂等跳过，
      存在且含非空记忆时失败。
- [x] 当前 SQLAlchemy metadata 精确包含 8 张表，Schema comment 覆盖无缺漏。
- [x] 旧 ORM、seed、迁移器、001–003 SQL 与旧 config JSON 不再存在或可达。
- [x] 退役环境键、Redis、AMap 和旧 Docker/config 引用已从运行时、示例、
      README、Compose、部署 workflow 与部署文档清除。
- [x] 空库初始化静态验证、Python compile、前端 build、部署配置检查和残留
      引用审计通过；不使用数据库输出声称迁移已执行。
- [x] `AGENTS.md` 与 `UI稿/` 的用户现有改动未被修改或暂存。

## Approval Decision

用户于 2026-07-31 明确批准按 R1 的精确范围在仓库内创建破坏性清退迁移：
删除 23 张旧表，并在旧内联列存在且满足空值合同（JSON 空数组 `[]` 或 SQL
`NULL`）时删除 `story_runs.private_memories`；该列已不存在时幂等跳过。

本批准不授权连接、查询、备份或执行任何数据库。实际数据库操作仍需另行明确
授权，并提供目标标识与执行前完整逻辑备份证据。

## Verification Evidence

2026-07-31 在未创建或连接数据库的前提下完成：

- `py -3 -m compileall -q apps/api/src deploy/server`：通过。
- 导入两组当前 models 并断言精确 8 表及
  `schema_comment_errors(Base.metadata) == []`：通过。
- 静态解析 008 的 23 表集合、8 表 guard、唯一列删除、JSON 空数组/SQL NULL
  合同、临时过程创建/调用/清理：通过。
- 隔离环境实例化 `ApiSettings`，并调用共享配置器纯函数验证主键、默认路径、
  退役键忽略/删除及无 Redis 依赖：通过。
- `docker compose config --quiet`：通过。
- `npm --prefix .\apps\web run build`：通过。
- 旧文件、路由、运行时环境键、Redis、AMap、ORM 表数量和 staged 图片残留
  审计：通过。
- `git diff --cached --check` 与 `git diff --check`：通过。

首次 metadata 校验因调用时缺少 `apps/api/src` 的 `PYTHONPATH` 未能导入包；
补齐源码路径后通过。首次残留审计把部署文档中的禁止性清理说明误判为运行时
引用；将审计范围收紧到运行配置后通过。两次均为校验脚本范围问题，未进入
数据库或改变实现。
