# 修复 StoryRun 生产 Schema 漂移

## Goal

恢复生产环境角色故事聊天，使当前 StoryWorld ORM 与既有 MySQL
`story_runs` 表重新一致；修复必须可审计、有执行前备份，并且只执行已审核的
006 与 008，不扩大物理清退范围。

## Background

- 用户提供的生产日志显示
  `GET /api/v1/story-worlds/{story_world_id}/runs/current` 在
  `application/story_worlds.py:293` 读取活动轮次时失败，MySQL 返回
  `1054 Unknown column 'story_runs.player_role_id' in 'field list'`。
- 附件中的 SQL 投影同时包含 `story_runs.private_memories`。提交
  `40e0e307` 的 ORM 仍声明该列，而当前 `main` 提交 `5331cdf9` 已删除它；
  因此附件是旧后端生成的请求日志或旧请求残留，不能单独证明当前容器版本。
- 当前 ORM 在
  `apps/api/src/fablespace_api/infrastructure/story_state_models.py:42`
  要求 `StoryRunModel.player_role_id` 非空。既有
  `apps/api/sql/migrations/006_story_run_player_role.sql` 会先新增 nullable
  列，按 `(player_id, story_world_id)` 从 `player_story_states` 回填，再改为
  `NOT NULL`。
- `Base.metadata.create_all()` 只会创建缺表，不会给已有 `story_runs` 增加
  `player_role_id`。部署 workflow 只检查 `/api/v1/health`，该端点不读取故事
  表，所以 Schema 漂移不会阻止部署显示成功。
- 004 把 `story_runs.private_memories` 定义为 `JSON NOT NULL` 且没有数据库
  默认值；当前 `main` 已不再映射或写入该列。因此只执行 006 可以恢复既有轮次
  的读取，但新建/重新开始 StoryRun 仍可能因遗漏这个必填旧列失败；完整恢复
  还需要执行带保护条件的 008。
- 2026-07-31 用户明确授权创建本热修任务，并连接生产数据库完成只读检查、
  逻辑备份、依序执行 006 与 008、重启和验收。

## Requirements

### R1 — 精确目标与禁止范围

- 只允许操作当前生产 FableSpace 使用的 `fablespace` database。
- 只执行仓库中已审核的 006 与 008；不创建新迁移版本。
- 008 只允许删除其已审核的精确 23 张旧表和
  `story_runs.private_memories`；不修改其他表结构或 StoryWorld 内容。
- 不把迁移加入应用启动或普通 push 部署；生产变更必须是带精确确认词的人工
  一次性操作。

### R2 — DDL 前置条件

在任何 DDL 前必须：

- 确认服务器仓库与运行 backend 使用当前目标提交；运行 ORM 必须包含
  `player_role_id` 且不再映射内联 `private_memories`。
- 确认仓库中的 006 与 008 SHA-256 等于本次人工审核的固定值，避免后续文件
  漂移后仍借用该一次性入口执行。
- 停止 backend 写入，并在退出前明确区分“尚未执行 DDL”和“DDL 已开始”。
- 从生产 MySQL 容器生成完整 `fablespace` 逻辑备份，确认文件非空并写出
  SHA-256；凭据不得出现在命令行参数、workflow 输出或日志中。
- 确认 `story_runs`、`player_story_states` 与
  `player_story_states.player_role_id` 存在。
- 确认 `story_runs.player_role_id` 当前完全不存在；若已存在、处于 nullable
  中间态或定义与预期不同，停止并转人工评审，不盲目重跑 006。
- 确认每条 `story_runs` 都能按 `(player_id, story_world_id)` 唯一关联到一个
  非空 `player_story_states.player_role_id`；任一无法回填时停止。
- 确认 008 要求的 8 张当前表全部存在；若旧内联
  `story_runs.private_memories` 存在，只允许 SQL `NULL` 或 JSON 空数组
  `[]`，其他 JSON 类型或非空数组一律阻断。
- 确认 database 中没有位于当前 8 表和 008 精确 23 表清单之外的额外表；
  未审核表必须在任何 DDL 前阻断，而不是等 008 后置检查失败。

### R3 — 受控执行

- 只向已核验的 `fablespace` database 输入仓库中的
  `006_story_run_player_role.sql`；验证 006 后置条件后，再输入
  `008_retire_legacy_space_schema.sql`。MySQL client 遇首个错误即失败。
- DDL 开始前失败时可以重新启动原 backend；DDL 开始后失败时保持写入停止，
  保留备份与日志并进入人工恢复，不自动猜测反向 SQL 或静默恢复。
- 成功后保留备份文件及 SHA-256，不把数据库凭据、玩家数据或 SQL 查询结果
  上传为 GitHub artifact。

### R4 — 成功验证

- `story_runs.player_role_id` 存在、定义为 `VARCHAR(128) NOT NULL`，且没有
  SQL NULL 或空字符串。
- `information_schema.TABLES` 中只剩 8 张当前表，且
  `story_runs.private_memories` 已不存在。
- 当前 backend 重新构建/启动并通过 `/api/v1/health`。
- 当前 backend 使用 `StoryRunModel` 完成一次真实 SQLAlchemy 查询；健康端点
  本身不读取故事表，不能单独作为 Schema 一致性证据。
- 使用用户现有登录态访问安妮故事页时，不再显示“服务暂时不可用”，当前轮次
  能恢复或进入新的聊天界面。
- 获取一次新的 backend 请求结果或等价的当前 ORM 直接查询，确认相同投影不再
  因 1054 缺列失败；不得用附件中的旧日志或单独健康端点声称修复完成。
- 普通 push/手动部署不会自动执行 006 或 008；只有专用人工修复入口可触发。

## Acceptance Criteria

- [x] 生产执行入口要求精确确认词，并在 DDL 前完成目标提交、迁移哈希、运行
      ORM、Schema、回填覆盖、未审核表与备份 SHA-256 检查。
- [x] 只按顺序执行现有 006 与 008；除 008 精确清单外没有其他 Schema 变化。
- [x] 成功后 `story_runs.player_role_id` 为 `VARCHAR(128) NOT NULL` 且数据完整。
- [x] 成功后物理 Schema 精确为 8 张当前表，旧内联记忆列不存在。
- [x] 当前 backend 和健康检查成功，安妮故事页在真实登录态下恢复。
- [x] 新鲜 ORM/API 证据不再出现本次 1054；备份路径与 SHA-256 可追踪且不泄密。
- [x] Python/脚本静态检查、workflow 语法检查和相关构建通过。
- [x] 用户现有 `AGENTS.md` 与 `UI稿/` 改动未修改、未暂存。

## Verification Evidence

- 普通 Deploy run `30610875124` 与生产修复 run `30610955460` 均在提交
  `ee9f73b9` 上成功。
- 生产备份与 SHA-256、维护开始时间及前置/后置检查结果记录在
  `retrospective.md`。
- 当前 ORM 对 StoryRun 的真实查询成功；现有 Chrome 登录态下“重新连接”后
  直接恢复到安妮聊天界面。

## Out of Scope

- 自动恢复生产备份、自动迁移框架或通用数据库管理后台。
- 修改 PlayerRole、StoryWorld 内容、前端错误文案或聊天交互。
- 查询、修改其他 database，或把生产数据复制到本地。

## Approval Decision

用户已批准本任务创建，以及对生产 FableSpace database 执行 R2–R4 的检查、完整
逻辑备份、依序执行 006 与 008、重启和真实登录态验收。授权的破坏性范围仅包含
008 已审核的 23 张旧表与 `story_runs.private_memories`；不包含其他 Schema
变更、跨数据库操作或自动恢复。
