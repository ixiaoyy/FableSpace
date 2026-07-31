# 多故事权威合同与迁移边界：实施计划

## 0. Review Gate

- [x] 用户审阅并批准本任务 `prd.md`、`design.md` 与本计划。
- [x] 用户确认本叶子任务只改文档；当前批准不自动授权下一任务创建或执行迁移。
- [x] 运行 `task.py start`，确认状态进入 `in_progress` 后再修改权威文档。
- [x] 保留用户未提交的 `AGENTS.md` 与 `UI稿/`，不暂存、不提交。

## 1. Product Contract

- [x] 更新 `docs/PRODUCT_BRIEF.md`：同世界多审核故事、进度隔离、长期关系共享。
- [x] 保留两个 P0 StoryWorld、三个公开 Character 和长明宫两个 PlayerRole 的现状。
- [x] 明确 Character 详情负责审核 story 选择，story 页进入后保持纯聊天。

## 2. Platform Contract

- [x] 更新 `docs/FABLESPACE_SPACE_PLATFORM.md`：Character-first 多故事闭环、
  玩家主动跨 Character 拜访、系统 / Character 消息边界和 draft 默认关闭。
- [x] 不新增故事大厅、世界目录、自动跳转、任务式文案或第二套玩法引擎。

## 3. Schema Contract

- [x] 更新 `docs/WORLD_SCHEMA.md`：ReviewedStory、StoryCharacterParticipation、
  Character-scoped node、CharacterDecision 与发布校验。
- [x] 定义 StoryRun `story_id`、per-story progress、长期 CharacterRelationship、
  消息可见性、幂等关系来源与 story-scoped API。
- [x] 记录 `managed_story_worlds.payload_json` 也是必须迁移的数据合同。
- [x] 前端规范路径保持 `/characters/:characterSlug` 与
  `/characters/:characterSlug/story`，以受信 `storyId` 查询参数选择 story。

## 4. Negative Contract

- [x] 核对 `docs/WHAT_NOT_TO_BUILD.md`，补充禁止旧 GameplayDefinition、故事大厅、
  AI 决定永久状态、兼容 decoder、双写与启动时静默修复。
- [x] 搜索四份文档中的旧“单故事 / 单一固定身份 / 仅安妮注册表”描述，逐项修正或
  标明历史上下文。

## 5. Verification

- [x] 从头阅读四份文档，确认同一概念没有冲突定义。
- [x] 用 `rg` 核对 `ReviewedStory`、`story_id`、`PlayerRole`、Character 短路由、
  `managed_story_worlds`、draft 与禁止兼容等关键合同。
- [x] 核对文档内部链接和引用文件存在。
- [x] 运行 `git diff --check`。
- [x] 运行完整 diff 审计，确认没有 Python、TypeScript、SQL、配置、图片或用户文件
  被修改。
- [x] 只改文档，不运行 Python / 前端构建，不连接数据库。

## 6. Handoff to the Atomic Code Task

- [x] 在权威 Schema 与本次交付中列出下一任务的精确数据影响、已知生产风险、备份和回滚
  边界。
- [x] 记录并遵守门禁：获得用户明确批准后，才创建或启动“多故事后端原子切换”任务及唯一迁移文件。
- [x] 当前未获得该批准，父任务保持 planning，不用兼容层或静默数据修复继续。

## Rollback

- 本任务仅改四份权威文档与任务文件；若评审不通过，只精确撤销本任务新增段落，
  不恢复整个文件，不触碰用户 `AGENTS.md` 或 `UI稿/`。
