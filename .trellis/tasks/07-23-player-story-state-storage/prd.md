# 持久化玩家故事状态

## Goal

建立与系统 StoryWorld 内容注册表分离的玩家私有运行时持久化，使后续运行时 API 可以原子地创建、恢复和完成 StoryRun，并能追踪消息、关键选择、关系变化、私有记忆与状态事件的来源。

## Background

- 系统故事内容已经由不可变 `StoryWorldRegistry` 管理，不写入玩家运行时数据库。
- 当前后端使用 SQLAlchemy 2.x，默认 SQLite，生产可配置 MySQL；现有 `infrastructure/models.py` 和 `MySQLSpaceStore` 仍是待清退的旧 Space 实现。
- `docs/WORLD_SCHEMA.md` 已定义 PlayerStoryState、StoryRun 和 CharacterRelationship 的顶层合同，并授权本任务定义消息、记忆和事件的具体嵌套字段。
- 当前仓库没有 pytest 测试目录；本任务使用临时 SQLite 数据库执行定向真实验证。

## Requirements

### R1. PlayerStoryState 隔离

- `player_id + story_world_id` 唯一定位一条 PlayerStoryState。
- 保存所属 StoryWorld 的固定 `player_role_id`、当前活动轮次、非负回访次数、最近回访时间和全部有序已完成轮次摘要。
- 每份已完成轮次摘要只保存 `story_run_id`、`ending_id`、安全短摘要和完成时间，不携带上一轮好感、标记、消息或记忆。
- 持久化层接收上游可信边界提供的 `player_id`，但不实现匿名或账号身份解析。
- 任意读取和写入必须同时限定玩家与 StoryWorld，不提供公开列表或跨玩家查询。

### R2. StoryRun 生命周期

- StoryRun 只允许 `active` 和 `completed` 两种状态。
- 开始轮次时锁定 `content_version`、初始章节与节点；已持久化轮次不得被新内容版本静默改写。
- 同一 `player_id + story_world_id` 同时最多一个活动轮次；创建、完成和 PlayerStoryState 活动轮次指针更新必须处于同一事务。
- 完成轮次必须写入结局摘要并清空活动轮次指针；已完成轮次不可重新激活。
- 新轮次重新创建初始关系，不继承上一轮好感、关系标记、故事标记、关键选择或私有记忆。

### R3. 关系、选择与故事状态

- CharacterRelationship 按 `story_run_id + character_id` 唯一，保存内部 affinity、已审核关系阶段、最近变化原因和关系标记。
- StoryRun 保存不可回退的关键选择与故事标记；持久化接口只允许追加关键选择，不提供删除或回退能力。
- Character、PlayerRole、章节、节点、关系阶段和内容版本必须来自同一 StoryWorld 的已发布内容注册表。
- 不把旧 `VisitorState`、`GameplaySession`、`MemoryAtom`、公开关系或 Space 合同作为兼容来源。

### R4. 可追踪消息、记忆与事件

- 每条消息绑定 StoryRun、顺序、角色来源、可观察角色、正文和发生时间。
- 每条私有记忆绑定 StoryRun、内容、来源事件和可选 Character 来源；只保存已通过上游筛选的记忆，不保存候选或 chain-of-thought。
- 事件日志按 StoryRun 内单调顺序追加，记录事件类型、可观察输入/结果、确定性规则来源、相关 Character 和安全结构化载荷。
- 关系变化、关键选择、节点变化、消息和记忆写入必须能够通过事件 ID 或事件顺序追踪来源。
- 事件、消息和记忆不提供原地覆盖或公开读取接口。

### R5. 数据库与迁移

- 新运行时模型和存储接口独立于 `MySQLSpaceStore`，不得继续扩大旧 Space 服务边界。
- ORM 模型同时支持 SQLite 和 MySQL；本需求版本只新增一个显式数据库迁移文件。
- 新表必须登记项目 SQLAlchemy Schema 注释；迁移不得删除、重命名或回填旧表。
- 失败事务不得留下孤立 StoryRun、关系、消息、记忆、事件或悬空活动轮次指针。

## Acceptance Criteria

- [ ] AC1：可创建 PlayerStoryState，并以相同 `player_id + story_world_id` 唯一恢复。
- [ ] AC2：可原子创建、恢复和完成一个 StoryRun，且同一玩家与 StoryWorld 无法拥有两个活动轮次。
- [ ] AC3：完成后开始新轮次时，上一轮 affinity、关系标记、故事标记、关键选择和私有记忆均不继承。
- [ ] AC3a：PlayerStoryState 按完成顺序保留每轮安全结局摘要，且摘要不含上一轮可变状态。
- [ ] AC4：两个玩家和两个 StoryWorld 的状态、轮次、消息、关系、记忆与事件严格隔离。
- [ ] AC5：关键选择不可删除或回退，内容版本不可改写，完成轮次不可重新激活。
- [ ] AC6：消息、关系变化、关键选择和记忆均能追踪到所属 StoryRun 及来源事件/规则。
- [ ] AC7：任一事务中途失败时，数据库保持原状态且无孤立记录。
- [ ] AC8：SQLAlchemy Schema 注释完整；只新增一个本需求迁移文件。
- [ ] AC9：Python 语法检查和临时 SQLite 定向数据库验证通过。
- [ ] AC10：`docs/WORLD_SCHEMA.md` 与最终消息、记忆、事件和事务合同一致。

## Out of Scope

- HTTP API、请求/响应 DTO、鉴权、匿名访客生成、账号绑定和跨设备合并。
- LLM 调用、自由输入解析、剧情动作判定、关系/记忆候选审核和输出生成。
- 前端界面、公开发现响应和管理员工具。
- 旧 Space 表、旧开发数据或旧存储接口的删除、迁移或兼容适配。
- 存档槽、章节回退、并行时间线、跨 StoryWorld 状态或关系传播。
