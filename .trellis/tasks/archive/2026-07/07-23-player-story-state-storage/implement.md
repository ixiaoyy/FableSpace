# 玩家故事状态持久化执行计划

## 0. 启动门槛

- [x] 用户确认保留全部有序安全结局摘要。
- [x] 对 PRD 做最终 convergence pass，移除已解决开放问题。
- [x] 用户审阅并批准 PRD、设计和执行计划。
- [x] 运行 `task.py start`；启动前不得修改业务代码或 Schema。

## 1. 允许与禁止范围

允许修改：

- `apps/api/src/fablespace_api/domain/`：新增玩家运行时领域对象与错误。
- `apps/api/src/fablespace_api/infrastructure/`：新增独立 ORM 模型、事务型 store，登记 Schema 注释和必要导出。
- `apps/api/sql/migrations/`：本需求只新增一个 005 迁移，不改写已提交的 004。
- `docs/WORLD_SCHEMA.md`：同步消息、记忆、事件、事务和摘要保留合同。

禁止修改：

- HTTP 路由、前端、LLM、身份解析、系统故事内容和旧数据清退逻辑。
- 旧 Space / Visitor / Gameplay / Memory 表及 `MySQLSpaceStore` 的业务行为。
- 当前工作区里与本任务无关的首页组件、媒体临时目录、日志和历史 backlog 资料。

## 2. 实现顺序

- [x] 新增不可变运行时领域对象、状态枚举和稳定校验错误。
- [x] 复用现有四张 StoryWorld 运行时 ORM 表并新增消息、记忆两张表，定义唯一索引、外键、级联与 JSON collection。
- [x] 新增独立 `PlayerStoryStateStore`，所有公开读取均要求玩家与 StoryWorld 范围。
- [x] 实现读取/创建 PlayerStoryState 与访问计数更新。
- [x] 实现事务型开始轮次：活动轮次检查、内容注册表校验、初始关系、起始事件和状态指针。
- [x] 实现追加消息、关键选择、状态变化、关系变化和已筛选记忆；不提供事件/消息/记忆删除接口。
- [x] 实现事务型完成轮次和结局摘要写回。
- [x] 实现新轮次零继承语义。
- [x] 新增唯一 `005_player_story_state_storage.sql`，与 ORM 表结构核对一致。
- [x] 更新 Schema 注释和 `docs/WORLD_SCHEMA.md`。

## 3. 定向验证

- [x] `py -3 -m compileall -q apps/api/src`
- [x] 在临时 SQLite 数据库上创建 Metadata，并确认新表、主键、唯一索引和外键存在。
- [x] 用已发布测试 StoryWorld 执行：创建状态 → 开始轮次 → 写消息/选择/关系/记忆/事件 → 完成 → 新轮次。
- [x] 验证同一玩家/世界第二个活动轮次被拒绝。
- [x] 验证两个玩家 × 两个 StoryWorld 的读取与写入互不可见。
- [x] 验证完成轮次、关键选择和内容版本不能回退或改写。
- [x] 注入事务中途异常并确认无孤立记录、活动指针或半写入关系。
- [x] 运行 `schema_comment_errors(Base.metadata)` 并确认无新表/列缺失注释。
- [x] 对照版本基线确认本需求只新增一个迁移文件。
- [x] 核对完整 `git diff`，确认未触碰工作区既有首页、媒体、日志和 backlog 改动。

## 4. Review Gates

- [x] 数据表、领域对象和 WORLD_SCHEMA 字段逐项一致。
- [x] 所有 store 入口都要求玩家 + StoryWorld 范围，且没有公开或跨玩家查询。
- [x] 新代码不导入旧 Space、VisitorState、GameplaySession、MemoryAtom 或 MySQLSpaceStore。
- [x] StoryWorld/Character/PlayerRole/章节/节点引用均通过不可变注册表校验。
- [x] 所有永久变化有事件来源，不保存 chain-of-thought、密钥或系统 Prompt。
- [x] SQLite 与 MySQL 的 JSON、外键、唯一性和事务差异有明确处理。

## 5. 回滚点

- 领域对象完成但 ORM 未落地：只回滚新增领域文件。
- ORM 与 store 完成但未接 API：停止集成，不影响旧运行时入口；新增表可保留为空。
- 005 迁移已执行但尚无玩家数据：经精确表名核验后删除本迁移新增表。
- 已有玩家数据：先备份和导出六张新表，再执行经确认的显式回滚；不得由应用启动自动删表。
