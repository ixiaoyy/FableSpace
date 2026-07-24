# 玩家故事状态持久化设计

## 1. 边界

本任务只交付运行时领域对象、SQLAlchemy ORM 模型、事务型存储接口、单个显式迁移和 Schema 文档。系统故事仍来自不可变 `StoryWorldRegistry`；新代码不读取或写入旧 `Space`、`VisitorState`、`GameplaySession`、`MemoryAtom` 或 `MySQLSpaceStore`。

调用方必须提供可信 `player_id`。持久化层负责隔离和数据库不变量，不负责识别匿名访客、账号或 HTTP 请求。

## 2. 领域对象

新增独立运行时领域模块，定义不可变的：

- `PlayerStoryState`
- `StoryRun`
- `CompletedRunSummary`
- `CharacterRelationship`
- `StoryMessage`
- `PrivateMemory`
- `StoryEvent`

状态枚举只包含文档允许值。运行时对象不暴露 SQLAlchemy Session，不复用旧模型类型。

## 3. 表结构

| 表 | 主键 / 唯一性 | 主要职责 |
|---|---|---|
| `player_story_states` | 复合主键 `(player_id, story_world_id)` | 固定 PlayerRole、活动轮次指针、回访信息、已完成摘要 |
| `story_runs` | 主键 `id`；按玩家、世界、状态索引 | 锁定内容版本、当前章节/节点、关键选择、故事标记、结局 |
| `character_relationships` | 复合主键 `(story_run_id, character_id)` | 轮次内 affinity、关系阶段、原因和标记 |
| `story_messages` | 主键 `id`；`(story_run_id, sequence)` 唯一 | 可观察的玩家/角色消息 |
| `private_memories` | 主键 `id` | 已筛选私有记忆及来源事件 |
| `story_events` | 主键 `id`；`(story_run_id, sequence)` 唯一 | 追加式可回放事件与确定性规则来源 |

StoryWorld、Character、PlayerRole、章节和节点属于代码注册表，不建立指向旧数据库内容表的外键。所有运行时子表通过 `story_run_id` 级联绑定 StoryRun；StoryRun 保存 `player_id + story_world_id`，由存储事务与 PlayerStoryState 活动指针共同约束。

JSON 只用于合同中明确为 collection 或安全结构化载荷的字段：已完成摘要、关键选择、故事标记、关系标记和事件载荷。需要唯一性、排序、来源追踪或独立查询的消息、关系、记忆与事件使用独立表。

## 4. 注册表校验

存储对象构造时接收 `StoryWorldRegistry`：

- 创建 PlayerStoryState 时校验 StoryWorld 存在且 `player_role_id` 等于固定角色身份。
- 创建 StoryRun 时校验内容版本、初始章节和节点属于同一 StoryWorld。
- 初始化关系时只使用该 StoryWorld 的 Character 和审核关系阶段。
- 写消息、关系、记忆或事件时校验可选 `character_id` 属于该 StoryWorld。

存储层不自行补默认 ID、阶段、节点或内容版本；不合法引用直接拒绝。

## 5. 事务与生命周期

### 开始轮次

1. 读取或创建 `(player_id, story_world_id)` PlayerStoryState。
2. 在同一事务中确认 `active_story_run_id` 为空。
3. 创建 `active` StoryRun，锁定内容版本和入口节点。
4. 按所有 StoryWorld Character 的初始关系规则创建 CharacterRelationship。
5. 写入 `run_started` 事件。
6. 更新 PlayerStoryState 活动轮次指针和回访信息。
7. 提交；任何一步失败全部回滚。

MySQL 使用行级锁保护既有 PlayerStoryState；SQLite 依赖单写事务并在提交冲突时失败。存储接口再次检查活动指针，禁止复用已存在的活动轮次。

### 追加写入

事件、消息和记忆使用 StoryRun 内单调 sequence。调用方提交确定性状态变化时，存储接口在一个事务中：

- 校验轮次仍为 `active`；
- 追加事件；
- 追加消息/记忆或修改关系、节点、关键选择、故事标记；
- 将来源事件 ID/sequence 写入关联记录；
- 提交。

关键选择只提供 append-if-absent；重复 ID 是幂等命中，不同载荷复用 ID 则拒绝。事件、消息和记忆不提供更新或删除方法。

### 完成轮次

1. 校验 StoryRun 为 `active` 且仍是 PlayerStoryState 的活动轮次。
2. 写入终局事件和 `ending_summary`。
3. 将 StoryRun 改为 `completed`。
4. 把仅含 `story_run_id`、`ending_id`、安全短摘要和完成时间的结局摘要按完成顺序追加到 PlayerStoryState。
5. 清空活动轮次指针。
6. 同一事务提交。

完成后的 StoryRun 只读。新轮次重新建立关系和空状态，不从旧轮次复制可变数据。

## 6. 隐私与可回放

- 存储读取方法全部需要 `player_id + story_world_id`，即使已有 `story_run_id` 也必须复核所属关系。
- 不提供跨玩家列表、公开查询或按 Character 汇总其他玩家关系的方法。
- 事件载荷只允许 JSON 标量、数组和对象，不保存模型隐藏推理、API Key、系统 Prompt 或未筛选记忆候选。
- 关系和记忆来源通过 `source_event_id` 或事件 sequence 连接；事件记录 `rule_source` 和安全原因。

## 7. 迁移与兼容

- 新增一个 `005_player_story_state_storage.sql`。已提交的 `004_annie_story_runtime.sql` 已建立四张垂直切片表，因此 005 复用这四张表并只新增 `story_messages`、`private_memories`，不改写已发布迁移。关系变化来源通过现有追加式 StoryEvent 关联查询，规则来源写入现有 `source_kind`、`source_id` 与安全 `payload`，避免给已有 SQLite 静默追加 ORM 列。
- ORM Metadata 是 SQLite 定向验证和新部署建表的跨数据库来源；显式 SQL 迁移服务现有 MySQL 部署。
- 不修改 001–003，不回填旧 Visitor/Gameplay/Chat/Memory 数据，不删除旧表。
- 回滚边界是删除 005 新增且确认无生产数据的两张表；一旦已有玩家运行数据，回滚前必须先备份和导出，不能由应用启动静默删除。

## 8. Schema 注释

新表和列登记在 `infrastructure/schema_comments.py`。注释说明私有性、ID 作用域、追加语义和来源边界，不沿用 Tavern/Visitor 术语。

## 9. 取舍

- 选择关系、消息、记忆和事件独立表，而非把整个 StoryRun 存成单个 JSON：换取数据库唯一性、来源追踪、增量写入和隔离验证。
- 保留少量 JSON collection：避免为故事专属 flags 和安全事件载荷制造无稳定查询价值的通用实体表。
- 不在本任务引入 Alembic：仓库当前没有该依赖或运行机制，新增依赖需要额外批准；沿用 ORM Metadata + 单个显式 SQL 迁移。
- 不把新方法加进 `MySQLSpaceStore`：避免新 StoryWorld 合同继续依赖待清退的旧 Space 边界。

## 10. 已确认决策

PlayerStoryState 保留全部有序安全结局摘要。摘要只记录轮次、结局、短摘要和完成时间，不复制已完成 StoryRun 的关系、标记、消息或记忆。
