# 多故事后端原子切换：技术设计

## 1. 设计依据与边界

本设计实现 `docs/PRODUCT_BRIEF.md`、`docs/FABLESPACE_SPACE_PLATFORM.md`、
`docs/WORLD_SCHEMA.md` 与 `docs/WHAT_NOT_TO_BUILD.md` 已冻结的目标合同。已检查的当前
实现证据包括：

- `domain/story_world.py` 仍由 StoryWorld 直接持有一套章节与结局；
- `story_world_codec.py` 仍把 Character 的处境和开场写在 Character 上；
- `story_state_models.py` 仍是世界级活动指针、无 `story_id` 的 StoryRun 和轮次级关系；
- `application/story_worlds.py` 直接操作 ORM，而
  `infrastructure/player_story_state_store.py` 是未接入组合根的第二套持久化实现；
- 公开 / 私有 API、前端 client、登录回跳白名单和后台编辑器均仍是单故事合同；
- `deploy.yml` 会在 `main` 的后端改动后直接构建并启动新后端，不能承载本次先数据后代码
  的切换。

本任务实现并提交迁移能力，但不执行生产写入、DDL、备份恢复或环境变更。生产执行需要
用户在看到只读审计结果和最终迁移哈希后另行确认。

## 2. 目标数据流

```text
内建审核内容 / 管理员完整文档
  -> 唯一新 codec
  -> StoryWorldRegistry（世界 + stories[] 全量校验）
  -> ManagedStoryWorldStore
  -> 公开 Character / ReviewedStory 投影

可信登录 player_id + story_world_id + story_id + character_id
  -> StoryWorldApplicationService（用例、AI 边界、响应投影）
  -> PlayerStoryStateStore（唯一事务 / 查询边界）
  -> PlayerStoryState + PlayerStoryProgress + StoryRun
  -> StoryEvent + StoryMessage + PrivateMemory
  -> 世界内长期 CharacterRelationship
```

`application/story_worlds.py` 不再维护与 Store 重复的 ORM 查询和写入逻辑。Store 接受当前
`StoryWorldSource`，每次请求仍读取数据库中的当前托管内容；不会缓存、推导或默认选择
`story_id`。

## 3. 内容领域合同

### 3.1 新值对象

- `ReviewedStory`
  - `id`、`title`、`summary`、`kind`、`publication_status`
  - `focus_character_id`
  - `participants`
  - `entry_chapter_id`、`chapters`、`endings`
  - `character_decisions`
- `StoryCharacterParticipation`
  - `character_id`、`current_situation`、`opening_line`、`can_start`
- `StoryNode`
  - 在现有字段上增加 `presentation_kind` 与 `character_id`
- `CharacterDecision` / `DecisionRule`
  - 规则保持声明顺序，最后一条必须无条件兜底；
  - 条件为封闭的 typed predicate，不接受任意表达式或管理员脚本。

Typed predicate 使用以下封闭形状：

| `kind` | 字段 | 读取来源 |
|---|---|---|
| `story_flag` | `flag`, `expected` | 当前 StoryRun 的审核 story flags |
| `investigation_result` | `result_id`, `expected_value` | 同轮次审核事件中的结构化查证结果 |
| `player_commitment` | `action_id`, `expected` | 同轮次审核事件中的结构化承诺动作 |
| `current_character` | `character_id` | 当前请求已校验的参与 Character |
| `relationship_range` | `character_id`, `minimum_affinity?`, `maximum_affinity?` | 世界内长期关系；至少一个边界 |

现有两个故事不新增 CharacterDecision，`character_decisions=[]`；实现用独立内存样例验证
规则顺序、兜底、跨故事引用拒绝和确定性回放，不改变现有剧情语义。

### 3.2 校验边界

- StoryWorld 必须有 `stories[]`，不再有世界级入口、章节或结局。
- published StoryWorld 至少有一个结构完整的 published ReviewedStory。
- `growth` 必须指定一个参与焦点 Character；`ensemble` 不得指定焦点。
- published ReviewedStory 至少有一个 `can_start=true` 参与者。
- 章节、节点、选择、决定与结局 ID / 引用只在所属 ReviewedStory 内解析。
- `character` 节点必须绑定参与 Character；`system` / `action` 节点不得绑定 Character。
- 同一决定只允许绑定与触发节点一致的 Character；最后规则无条件，规则按顺序首个命中。
- codec 是唯一 JSON 边界；运行时不保留旧形状 decoder。

### 3.3 两个内建内容的显式转换

| StoryWorld | ReviewedStory | 参与和类型 |
|---|---|---|
| `history_broad_street_water_1854` | `broad_street_water_1854` | `growth`；安妮为焦点和可开始参与者 |
| `story_palace_snow_edict` | `palace_snow_edict` | `ensemble`；魏观海、萧明珠均可开始 |

转换规则：

1. ReviewedStory 的标题 / 摘要复制现有世界标题 / 摘要，发布状态固定为 `published`。
2. 每个现有 Character 的 `current_situation` / `opening_line` 原值移到对应 participation，
   `can_start=true`；Character 其余字段逐项保留。
3. 原世界 `entry_chapter_id` / `chapters` / `endings` 原值移动到唯一 ReviewedStory。
4. 现有节点文本均是混合叙事正文，统一标记为 `presentation_kind=system`、
   `character_id=null`；不把第三人称叙述伪装成 Character 消息，也不拆改文本或剧情图。
5. `character_decisions=[]`，现有 `content_version` 保持不变，使结构等价且引用仍有效的
   活动轮次继续锁定原版本。
6. 管理员 JSON 使用同一固定映射逐字段转换并保留管理员已保存值；未知世界、目标字段已
   混入、缺字段、异常类型或旧 codec 无法完整解析时阻断。

迁移专用转换器只在受控运维命令中读取旧形状，不被运行时或管理 API 导入；目标 codec
只接受新形状。

## 4. 精确物理 Schema 提案

以下是需要人工批准后才能创建的唯一迁移版本；当前规划阶段不创建迁移文件。

### 4.1 `player_story_states`（保留并收窄）

保留：

- `player_id VARCHAR(64)` + `story_world_id VARCHAR(128)` 复合主键；
- `visit_count INT NOT NULL DEFAULT 0`；
- `last_visited_at DATETIME NOT NULL`。

删除：

- `player_role_id`；
- `active_story_run_id`；
- `completed_run_summaries`。

### 4.2 新增 `player_story_progress`

| 列 | 类型 / 约束 |
|---|---|
| `player_id` | `VARCHAR(64) NOT NULL` |
| `story_world_id` | `VARCHAR(128) NOT NULL` |
| `story_id` | `VARCHAR(128) NOT NULL` |
| `active_story_run_id` | `VARCHAR(36) NULL` |
| `last_visited_at` | `DATETIME NULL` |
| `completed_run_summaries` | `JSON NOT NULL` |

- 主键：`(player_id, story_world_id, story_id)`。
- `fk_player_story_progress_state`：
  `(player_id, story_world_id)` -> `player_story_states`，`ON DELETE CASCADE`。
- `fk_player_story_progress_active_run`：
  `active_story_run_id` -> `story_runs.id`，`ON DELETE SET NULL`。
- Store 在读写时再次校验活动轮次的玩家、世界和故事三元组；单列 FK 不代替归属校验。

摘要只含 `story_run_id`、`story_id`、`ending_id`、`summary`、`completed_at`。

### 4.3 `story_runs`

新增：

- `story_id VARCHAR(128) NOT NULL`（位于 `story_world_id` 后）；
- `active_slot TINYINT GENERATED ALWAYS AS
  (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED`。

约束 / 索引：

- `fk_story_runs_state`：
  `(player_id, story_world_id)` -> `player_story_states`，`ON DELETE CASCADE`；
- `ck_story_runs_status`：只允许 `active` / `completed`；
- `uq_story_runs_player_world_story_active`：
  `(player_id, story_world_id, story_id, active_slot)`，利用 completed 行的 `NULL` 允许历史
  多轮，同时物理保证每故事至多一个 active；
- `idx_story_runs_player_world_story_status`：
  `(player_id, story_world_id, story_id, status, completed_at)`；
- 删除旧 `idx_story_runs_player_world_status`。

`story_id`、`content_version`、`player_role_id` 创建后不可修改。

### 4.4 `character_relationships`（原表重建）

| 列 | 类型 / 约束 |
|---|---|
| `player_id` | `VARCHAR(64) NOT NULL` |
| `story_world_id` | `VARCHAR(128) NOT NULL` |
| `character_id` | `VARCHAR(128) NOT NULL` |
| `affinity` | `DOUBLE NOT NULL` |
| `stage` | `VARCHAR(64) NOT NULL` |
| `last_change_reason` | `TEXT NOT NULL` |
| `flags` | `JSON NOT NULL` |
| `last_source_story_run_id` | `VARCHAR(36) NULL` |
| `last_source_event_id` | `VARCHAR(36) NULL` |
| `updated_at` | `DATETIME NOT NULL` |

- 主键：`(player_id, story_world_id, character_id)`。
- `fk_character_relationships_state`：
  `(player_id, story_world_id)` -> `player_story_states`，`ON DELETE CASCADE`。
- `ck_character_relationships_source_pair`：两个来源列同时为空或同时非空。
- `story_events` 增加 `uq_story_events_run_id(story_run_id, id)`；
  `fk_character_relationships_source_event` 以
  `(last_source_story_run_id, last_source_event_id)` 引用该键，`ON DELETE RESTRICT`。
- 迁移完成后删除旧 `(story_run_id, character_id)` 主键和轮次级级联 FK。

### 4.5 其余表

- `story_events`、`story_messages`、`private_memories` 除上述来源索引外不增加业务列。
- `managed_story_worlds` / `managed_media_assets` 不改表结构；只受控转换前者 JSON。
- `story_messages.visible_to_character_ids` 原值保留，但必须全部通过参与 Character 校验。
- 目标物理基线由 8 表变为 9 表，Schema 注释和数据库 spec 同步更新。

## 5. 运行时事务

### 5.1 开始 / 恢复

1. 解析 published StoryWorld、显式 `story_id`、可开始 participation 和 PlayerRole。
2. 锁定 PlayerStoryState 与对应 PlayerStoryProgress。
3. 同故事已有 active 时只返回该轮次；PlayerRole 不同返回 `player_role_locked`。
4. 新轮次写入 `story_id + content_version + player_role_id`，初始化 / 复用故事参与
   Character 的长期关系，写入 run-start、入口节点和开场消息，再设置活动指针。
5. 不同 `story_id` 可以分别有 active；同一故事的数据库唯一约束处理并发竞态。

### 5.2 消息与可见性

- 玩家自由消息和 Character 回复同时写 StoryEvent 与 StoryMessage。
- 默认玩家消息只对当前 `character_id` 可见；Character 回复只绑定并对该 Character 可见。
- LLM 上下文只读取当前 run 且 `visible_to_character_ids` 包含当前 Character 的消息；
  `system` / `action` 节点不注入 Character 上下文。
- 自由消息不推进节点、选择、story flags、决定或结局；受限自然关系变化必须与
  `relationship_changed` 事件及长期关系来源指针在同一事务提交。
- LLM 调用前读取快照，调用后再次锁定并核对 run、story、版本、节点和关系来源；变化时
  返回 `dialogue_state_changed`，不写过期回复。

### 5.3 选择、节点和 CharacterDecision

1. 复核玩家 / 世界 / 故事 / run / 当前 Character 归属与 choice 可用性。
2. 相同 run + reviewed choice source 已存在时返回当前投影，不重复效果。
3. 写 choice 事件 / 消息、story flags 与审核关系效果。
4. 移动到同一 ReviewedStory 的目标节点，按 presentation kind 记录系统 / 行动 /
   Character 可观察结果。
5. 若目标节点触发 CharacterDecision，按规则顺序解析唯一结果，记录 decision / rule /
   结构化输入 / 原因，再原子应用 flags、关系效果与结果节点；不调用 AI 选择规则。
6. 终局写 run completion、清空本故事活动指针并追加本故事安全摘要。

跨 Character 的审核 choice 本身是玩家明确动作。目标节点属于另一参与 Character 时，
响应增加 `next_character` 投影；当前页面显示显式前往动作，不自动导航。服务端已记录的
目标 Character 节点消息只在玩家点击其稳定 Character 短路由后呈现。

### 5.4 内容版本变化

- 结构仍可按当前文档安全解析时，活动 run 继续使用锁定的 `content_version`，不得改写。
- story / role / chapter / node / ending 无法解析时，普通 current / message / choice 停止并
  返回 `story_content_changed`，不自动新建轮次。
- 玩家显式 restart 可以把该失效 active run 记录为已停止的 completed 历史（不生成故事
  结局摘要），再按当前 published 内容创建新轮次；有效 active 仍返回 `active_run_exists`。

## 6. API 与前端合同

### 6.1 API

公开详情保持：

```text
GET /api/v1/story-worlds/{story_world_id}/characters/{character_id}
```

返回稳定 Character、世界、PlayerRole 和该 Character 可开始的 published stories：

```text
stories[] = {
  id, title, summary, kind,
  current_situation, opening_preview,
  focus_character_id, participant_character_ids
}
```

私有路由全部改为权威文档中的
`/{story_world_id}/stories/{story_id}/runs...`，旧无 story 路由直接删除，不做兼容。
每个 run 投影回显锁定 Story，所有 Store 查询即使已有 `run_id` 仍复核 `story_id`。

### 6.2 Character 详情

- 只有一个可进入故事时自动选中该明确 `story_id`；多个时呈现真实故事项供玩家选择。
- 当前处境来自选中 story 的 participation，不再从 Character 读取。
- continuity 按每个 story 独立读取；失败与确认无轮次保持不同状态。
- 新轮次身份选择仍使用世界级 PlayerRole。
- 进入链接始终携带白名单校验后的 `storyId` 和需要时的 `playerRoleId`。

### 6.3 故事页

- `storyId` 与 `playerRoleId` 均先对公开详情白名单校验。
- current / start / restart / message / choice 全部携带显式 story ID。
- 保留当前 reducer 的 401 清空、迟到响应隔离、写失败冻结与“先 GET 再恢复”合同。
- 首屏仍只显示 Character 身份、开场 / 对话、审核选择和输入框；不恢复剧情介绍或说明文。
- node presentation kind 决定结果气泡是 Character、系统还是行动，不再把所有 choice 后
  叙述标成当前 Character。
- `next_character` 只显示玩家可点的目标 Character 动作，点击后使用既有稳定短路由。

### 6.4 登录与后台

- 登录回跳只允许规范 story path，以及顺序无关但各最多一次的 ASCII
  `storyId` / `playerRoleId`；拒绝未知参数、重复参数和外部 URL。
- 后台把“章节管理”改为“故事管理”，由 story 列表进入 participation、入口、章节、节点、
  选择、结局和 CharacterDecision；Character 页删除故事专属处境 / 开场字段。
- 不增加通用 JSON 编辑器、故事大厅、拖拽玩法 DSL 或新 UI 依赖。

## 7. 迁移算法与阻断条件

### 7.1 只读审计

审计命令必须在 MySQL `READ ONLY` 事务内运行，只输出安全 ID、计数、哈希和违规分类，不
输出玩家标识、消息、记忆、关系内容、完整 JSON、连接 URL 或密钥。审计至少记录：

- MySQL 版本、精确表 / 列 / 索引 / FK、006 / 008 是否已落地；
- 9 个目标表相关的行数和 Schema 前置状态；
- 托管 world ID、payload SHA-256、旧 codec 校验和形状异常；
- run 按 world / status 的计数、未知映射、空角色、孤儿、活动重复和终局异常；
- state 活动指针、摘要引用和完成时间异常；
- 长期关系候选分组的“未变化 / 唯一变化来源 / 多变化来源 / 无事件变化”计数；
- message / memory / event 的参与 Character、来源事件与可见性异常。

报告不包含可还原私有内容的样本。

### 7.2 数据回填

- 所有已识别 run 按固定 world -> story 表回填；任何未知 world 阻断。
- 每个 state 创建唯一 story progress；活动指针必须指向同玩家 / 世界 / story 的 active run。
- 完成摘要从具有有效 `ending_id + ending_summary + completed_at` 的 completed runs 重建，
  再核对旧摘要引用；缺少审核结局或完成时间的 completed run 阻断。
- 审计识别到一个由现有 `_refresh_active_run()` 产生的精确旧轮次形状。待用户批准后，仅当
  `status=completed`、`completed_at` 非空、结局 ID / 摘要均空、不在完成摘要中、world 为
  固定宽街映射、锁定版本与旧审核身份都与本次脱敏 cohort 一致时，允许补固定
  `story_id` 并原样保留为不可恢复推进的封存历史；不得改写版本 / 身份、生成结局或加入
  完成摘要。任何额外或不完全匹配的记录仍阻断。
- 关系合并规则：
  - 所有旧行都没有关系变化事件时，必须与当前审核初始关系完全一致，合并为一条且来源为空；
  - 恰有一个旧 run 有可完整回放并与落库结果一致的关系变化时，保留该最终值与最后事件；
  - 两个及以上旧 run 都发生过关系变化、值无法回放、无事件却偏离初始值、来源 Character
    不一致时一律阻断；
  - 不使用最大 affinity、最新 run 时间、数组顺序或任意 winner。
- message 可见数组原样保留；不是 JSON 字符串数组、含非参与 Character、角色消息缺少合法
  speaker、来源事件跨 run 时阻断。

### 7.3 迁移产物

- 一个编号版本 `009_multi_story_atomic_switch`；
- 一份显式 DDL SQL；
- 一个同版本、仅运维调用的严格旧 JSON / 数据转换器；
- 一个只读 audit / postflight verifier；
- 一个手动 GitHub Actions 原子迁移工作流。

这些产物共同属于一个迁移版本；运行时不导入迁移转换器。

## 8. 发布闸门、备份与回滚

### 8.1 普通部署闸门

- 仓库保存目标 Schema revision。
- `deploy.yml` 在改变服务器 checkout、镜像或容器前，核对生产主机已验证 revision marker。
- marker 不匹配时同时阻止后端和前端部署，避免新前端打旧 API 或新 decoder 读取旧 JSON。
- 普通应用启动只对空库执行当前 `create_all` / `seed_missing`；不执行 009、不修复记录。

### 8.2 手动原子工作流

1. 校验确认短语、目标 commit、迁移 / 转换器哈希与固定数据库名。
2. 在不停写状态运行只读预检并记录快照哈希。
3. 构建新后端 / 前端镜像，保留当前 commit 与旧镜像恢复标签。
4. 停止后端写入，创建非空全库逻辑备份并记录 SHA-256。
5. 在停写状态重跑同一预检并比对快照；变化即停止。
6. 执行唯一 009、托管 JSON 转换和数据回填。
7. 运行目标 codec / Registry、精确 9 表 Schema、当前 ORM 真实查询和两世界公开投影 postflight。
8. 启动新后端和前端，验证健康与真实 StoryRun 查询。
9. 所有检查通过后才写 revision marker 并恢复流量。

DDL 前失败可恢复旧镜像并重新开放。DDL 开始后的任何失败都保持前后端停止、保留备份与
旧镜像；不执行反向 SQL。经再次明确批准后，用整库备份恢复、回到迁移前 commit / 镜像并
移除 marker。

## 9. 验证

- Python：`py -3 -m compileall -q apps/api/src deploy/server`。
- 内容：两个内建 world round-trip、完整 Registry、story 内图引用、决定顺序 / 兜底验证。
- 持久化：临时 SQLite 开启 FK，验证父子顺序、每故事 active 唯一、跨故事并行、长期关系
  复用、来源事件、消息可见性和完成摘要；不恢复 pytest 目录。
- 前端：`npm --prefix .\apps\web run typecheck` 与 `npm --prefix .\apps\web run build`，
  changed-scope React Doctor，移动端 / 窄屏人工验收。
- 部署：静态解析普通部署与手动迁移工作流，确认共享非取消并发、固定目标、哈希、
  数据备份、失败状态和前后端共同闸门。
- 历史内容：只做结构搬迁；逐项比对安妮文本、选择、效果、正史和来源哈希，记录
  `PASS / FAIL / BLOCKED`，不得用“未改意图”代替证据。

## 10. 生产只读审计证据

- 权威运行：commit `5fbe505a`，2026-07-31，
  [Actions run 30624934752](https://github.com/ixiaoyy/FableSpace/actions/runs/30624934752)。
- 目标：MySQL 8.4.10 / `fablespace`；事务 `READ ONLY`；`AUDIT_DB_WRITES=0`。
- Schema：精确八表；006 的 `story_runs.player_role_id` 已存在且旧 inline memories 已删除；
  009 的 progress 表、run `story_id` 和世界级关系键均不存在。
- 行数：managed worlds 2、managed media 0、states 1、runs 2、relationships 2、events 6、
  messages 0、memories 0。
- 两份托管 JSON 均为合法旧形状，固定映射唯一；长明宫 payload hash 中段被 GitHub 自动
  masker 遮蔽，完整 hash 必须在原子迁移内部重新计算比较。
- 两条宽街 run 分别为 active / completed。active 无审计问题；completed 的全部四类阻断
  属于同一 cohort：旧版本 `annie-broad-street-2026-07-27.1`、旧审核身份
  `role_history_broad_street_beggar`、有完成时间、无结局和摘要。
- state 活动指针 / 摘要、事件归属、消息 / 记忆来源均无异常。两条轮次级关系均为初始值，
  可无损合并为一条世界级长期关系。

审计结论为 `BLOCKED`，原因不是 Schema 漂移或未知私有记录，而是上述已识别封存历史尚未
获得迁移处置批准。PRD 的唯一 Open Decision 解决前不得启动 009 实现。
