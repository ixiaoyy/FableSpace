# 多故事后端原子切换

## Goal

把已经冻结在四份权威文档中的多故事目标合同一次性落到内容模型、托管 JSON、
运行时状态、API 与 Character-first 前端；迁移过程中不得丢失管理员内容或玩家状态，
不得形成旧新双合同。

## Background

- 权威合同已由归档任务 `07-31-multi-story-content-contract` 冻结：
  StoryWorld 拥有 `stories[]`，ReviewedStory 拥有剧情图，
  StoryCharacterParticipation 拥有故事专属处境与开场。
- 安妮宽街固定映射为 `broad_street_water_1854`，雪夜封宫固定映射为
  `palace_snow_edict`。
- 当前仓库代码仍是 StoryWorld 直接拥有一套章节 / 结局、StoryRun 无 `story_id`、
  世界级单活动轮次、轮次级 CharacterRelationship。
- 当前 `deploy.yml` 会在 `main` 后端改动后直接启动新后端；新 decoder 不能先于旧托管
  JSON 转换上线，因此普通部署必须同时对新前端和新后端增加持久化 revision 闸门。
- 本地环境只保存容器网络数据库地址，Docker daemon 未运行；现有 SSH 配置没有可验证的
  FableSpace 运维主机，GitHub Secrets 无法在本地读取，因此不能从本机直连审计。经批准
  的手动 GitHub Actions 工作流将复用现有部署 Secrets 建立受控通道。
- 用户已授权本规划阶段进行迁移前数据库只读审计；该授权不包含写入、DDL、迁移执行
  或数据修复。
- 用户已批准新增并推送仅手动触发的 GitHub Actions 只读审计工作流，以复用现有部署
  Secrets 建立审计通道；工作流不得改变服务器 checkout、镜像、容器或数据库。
- 2026-07-31 的生产只读审计由 commit `5fbe505a` 运行：
  [Actions run 30624934752](https://github.com/ixiaoyy/FableSpace/actions/runs/30624934752)。
  MySQL 8.4.10 在 `READ ONLY` 事务内返回 `AUDIT_DB_WRITES=0`；006 / 008 已落地，当前是
  精确八表基线，009 目标表 / 列 / 关系键均未提前混入。
- 两份托管 StoryWorld 均为旧形状且可由当前 codec 完整解析；宽街 payload hash 完整记录，
  长明宫 hash 的中段被 GitHub Secrets masker 自动遮蔽，后续原子迁移须在服务器内重新计算
  并比对，不得把被遮蔽日志当作完整 hash 证据。
- 生产共有 1 条 PlayerStoryState、2 条宽街 StoryRun（1 active、1 completed）、2 条关系、
  6 条事件，无 StoryMessage / PrivateMemory。状态指针、摘要引用、事件归属和关系合并均无
  异常；两条关系归为同一长期关系，且都与审核初始值一致。
- 唯一阻断 cohort 是同一条已封存的宽街 completed run：锁定旧版本
  `annie-broad-street-2026-07-27.1` 和旧审核身份
  `role_history_broad_street_beggar`，有 `completed_at`，但没有结局 ID / 摘要。当前
  `_refresh_active_run()` 在内容或身份失配时正是以该形状封存旧 active run；归档设计也能
  证明该身份曾是审核 PlayerRole，因此不能把它误判成任意身份或伪造结局。

## Requirements

### R1 — 原子内容模型切换

- StoryWorld、ReviewedStory、StoryCharacterParticipation、Character-scoped node
  与确定性 CharacterDecision 必须按 `docs/WORLD_SCHEMA.md` 一次切换。
- 两个内建 StoryWorld 转为明确 `stories[]`，不顺带改写既有角色、PlayerRole、
  正史、选择、关系效果或结局语义。
- `managed_story_worlds.payload_json` 必须显式转换；`seed_missing()` 不得覆盖管理员
  内容或承担迁移。

### R2 — 原子运行时状态切换

- StoryRun 增加非空 `story_id`，锁定 `story_id + content_version + player_role_id`。
- 新增按玩家、StoryWorld、ReviewedStory 唯一的分故事进度。
- CharacterRelationship 改为按玩家、StoryWorld、Character 唯一的长期关系，并保存
  最近来源 StoryRun / StoryEvent。
- 旧关系自动合并只允许“没有任何变化来源”或“唯一一个发生过变化的旧轮次”；多变化
  来源、无事件变化或无法回放一致时阻断，不猜 winner。
- 世界级活动指针和完成摘要不再权威，不保留双写。
- 消息可见性只允许锁定 ReviewedStory 的参与 Character。
- Store 成为唯一 ORM / 事务边界；移除应用层和未接入 Store 之间的重复持久化实现。

### R3 — API 与前端同步

- 私有运行时 API 显式包含 `story_id`；公开 Character 详情返回可进入的已发布故事。
- 前端继续只使用 `/characters/:characterSlug` 和
  `/characters/:characterSlug/story?storyId=...&playerRoleId=...`。
- Character 详情负责故事与 PlayerRole 选择；故事页保持纯聊天 / 交互。
- 跨 Character 拜访由玩家显式触发，不能自动跳转。

### R4 — 迁移与运维门禁

- 本需求最多一个数据库迁移；创建任何迁移文件前必须先完成人工评审。
- 迁移前只读审计实际托管 JSON、StoryRun、活动指针、关系归属和消息可见性。
- 未知 StoryWorld、异常 JSON、无法唯一映射的轮次、关系合并冲突或不确定消息可见性
  必须阻止迁移。
- 执行迁移前必须停写并完整备份受影响表和托管 JSON；失败后从整组备份恢复。
- 普通 Deploy 在目标 Schema revision 未经 postflight 确认前必须同时阻止前端与后端；
  只有手动原子工作流可以在同一停写窗口切换数据、代码与两个运行容器。
- 不增加旧 JSON decoder、默认 `story_id`、双写、旧路由或启动时静默修复。

### R5 — 工作区与范围

- 保留现有未提交的 `AGENTS.md`、父任务文件和 `UI稿/`，不夹带提交。
- 实现时同步相关权威文档与 Trellis spec；图片、部署和历史内容语义不在本任务中改变。

## Acceptance Criteria

- [x] 只读审计记录实际 Schema 与数据分布，不执行任何写入或 DDL。
- [ ] 规划文档列出精确表、列、唯一约束、JSON 转换、阻断条件、备份和回滚步骤，并经
  用户审核后才启动实现。
- [ ] 物理 Schema 精确落为收窄的 `player_story_states`、新
  `player_story_progress`、带 `story_id` / active 唯一约束的 `story_runs` 和世界级重键
  `character_relationships`；完整细节以 `design.md` 第 4 节为准。
- [ ] 两个内建 StoryWorld 与所有识别到的托管 JSON 都转换为目标 `stories[]`。
- [ ] 既有 StoryRun、进度、关系、事件、消息和记忆均有确定的迁移归属或被预检阻断。
- [ ] 运行时 API、管理 API、codec、Store、内建内容和前端 client 在同一发布单元使用
  唯一新合同。
- [ ] Character 详情可选择审核故事，故事页保持纯聊天，消息可见性与主动跨 Character
  拜访符合权威合同。
- [ ] Python compileall、前端 typecheck / build、内容校验、迁移 dry-run / 预检和
  变更范围检查通过。
- [ ] 不保留兼容 decoder、双写、默认故事猜测或静默修复。
- [ ] 普通推送在生产 revision 未就绪时不会部署新前端或新后端；手动工作流有固定目标、
  完整备份、哈希、停写复检、postflight 和失败停机边界。

## Out of Scope

- 新增林晚照、《封口之信》或其他 ReviewedStory 内容。
- 改写安妮与雪夜封宫的剧情语义、历史事实、角色图片或 PlayerRole。
- 执行生产迁移、写数据库或修改部署环境；这些需要后续独立执行确认。
- 修改用户现有 `AGENTS.md` 或 `UI稿/`。

## Open Decision

是否批准把唯一已识别的旧宽街轮次作为“内容失配后封存的历史轮次”原样保留：按固定
world -> story 映射补 `story_id`，保留其旧 `content_version`、旧审核
`player_role_id`、事件和 `completed_at`，不伪造结局、不加入完成摘要、永不恢复推进；只有
同时满足本次审计全部特征的记录可走此分支，任何新增或不完全匹配的记录继续阻断迁移。

推荐批准。这样既不删除或改写历史，也不把它冒充成正常通关；若不批准，009 必须继续
阻断，另行评审该轮次的数据修复或归档方案。
