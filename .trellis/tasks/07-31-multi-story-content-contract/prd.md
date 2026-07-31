# 多故事权威合同与迁移边界

## Goal

在不改变当前线上行为、不连接数据库的前提下，先把 StoryWorld 内多审核故事、
跨 Character 主动拜访、长期关系共享与故事进度隔离写成唯一权威合同，并明确后续
代码与数据必须一次切换的迁移边界。

本任务只改权威文档和本任务树，不修改 Python、前端、SQL、部署配置或任何数据库
记录。

## Background

- 当前注册表已经同时包含安妮宽街与长明宫·雪夜封宫，不再是旧规划所写的“只有
  安妮”：`apps/api/src/fablespace_api/content/__init__.py`。
- 长明宫已经发布魏观海、萧明珠以及“小太监 / 小宫女”两个 PlayerRole；多故事
  合同必须保留“一个或多个世界级审核身份”，不能退回单一固定身份。
- `StoryWorld` 仍把 `entry_chapter_id`、`chapters`、`endings` 直接挂在世界上，
  `Character` 仍直接保存 `current_situation` 与 `opening_line`：
  `apps/api/src/fablespace_api/domain/story_world.py`。
- `ManagedStoryWorldStore` 会从 `managed_story_worlds.payload_json` 解码完整
  StoryWorld，且不会用内置注册表覆盖既有管理文档：
  `apps/api/src/fablespace_api/infrastructure/managed_story_content_store.py`。
  因此只改 Python 内容模型会使现有数据库文档无法加载，不能拆成可先上线的半套切换。
- 当前前端规范路由是 `/characters/:characterSlug` 与
  `/characters/:characterSlug/story`；故事页已经按用户要求改为直接进入聊天，
  不再承担世界介绍、重复身份选择或故事说明。
- 当前运行时仍按玩家与 StoryWorld 保存一个活动轮次，StoryRun 没有 `story_id`，
  CharacterRelationship 仍归属单个 StoryRun。真实多故事运行必须与状态迁移一起
  切换，不能用 `content_version` 或兼容解码器伪装完成。

## Requirements

### R1 — 权威产品合同

- 更新 `docs/PRODUCT_BRIEF.md`，明确 Character 可以参与同一 StoryWorld 内多个
  审核故事；故事进度隔离，长期 Character 关系在同世界内共享。
- 更新 `docs/FABLESPACE_SPACE_PLATFORM.md`，明确 Character 详情负责选择审核故事，
  故事互动页进入后保持纯聊天工作区；跨 Character 拜访必须由玩家主动触发。
- 更新 `docs/WORLD_SCHEMA.md`，定义 `ReviewedStory`、故事参与 Character、
  Character 作用域节点、确定性 Character 决定、`story_id` 运行时锁定、每故事进度、
  长期关系和消息可见性。
- 核对并按需更新 `docs/WHAT_NOT_TO_BUILD.md`，明确这不是故事大厅、通用
  GameplayDefinition、AI 自行生成永久状态或旧 Space 兼容层。
- 不修改用户当前未提交的 `AGENTS.md`；若最终 Schema 需要同步其中的硬约束，
  必须在后续代码切换前基于届时完整 diff 单独处理。

### R2 — 最终内容模型

- StoryWorld 继续拥有世界正史、规则、`content_version`、一个或多个 PlayerRole
  以及稳定 Character 注册表；不再直接拥有唯一章节入口、章节和结局。
- `ReviewedStory` 是 StoryWorld 内的审核内容单元，不是新的数据库持久化实体。
  它拥有稳定 `story_id`、标题、摘要、内部类型、发布状态、参与 Character、可选焦点
  Character、入口章节、章节、结局和确定性 Character 决定。
- Character 只保存跨故事稳定的人格、动机、秘密、语言、关系规则和头像。
  `current_situation`、`opening_line` 与是否可从该 Character 开始属于
  `StoryCharacterParticipation`。
- 一个审核故事可以由多个 Character 参与。Character 作用域节点必须明确当前可对话
  Character；系统叙事节点不得伪装成 Character 发言。
- Character 的关键决定由有序、可回放的审核规则解析。规则只能读取审核选择写入的
  flags、玩家承诺行动、查证结果、长期关系与当前 Character；自由输入和模型输出不能
  直接选择结果或写入永久状态。
- published StoryWorld 可以包含 draft ReviewedStory，但公开发现与普通运行时只返回
  published 内容；draft 默认不可发现。

### R3 — 既有内容与玩家入口

- 安妮宽街与雪夜封宫各迁为一个 published ReviewedStory；现有角色、PlayerRole、
  正史、选择、关系效果与结局语义不得在结构迁移中顺带改写。
- 安妮仍是宽街故事的焦点 Character；雪夜封宫仍是魏观海与萧明珠共同参与的群像
  故事，两个 PlayerRole 都保留。
- 前端继续只使用规范 Character 短路由。Character 详情可用“命途 / 世事”呈现故事
  选择；进入 `/characters/:characterSlug/story` 后直接恢复或创建指定故事的聊天，
  不恢复剧情介绍页。
- 多故事选择使用明确的稳定 `story_id`，不得靠 Character 展示名、数组顺序、
  `content_version` 或当前唯一故事推导持久化身份。

### R4 — 原子迁移边界

- 后续代码切换必须同时处理领域模型、JSON codec、两个内置 StoryWorld、管理内容
  读写、StoryRun / 进度 / 长期关系持久化、运行时 API 与已有数据；不得先部署无法
  解码现有 `payload_json` 的代码。
- `managed_story_worlds.payload_json` 的单故事文档必须纳入显式、可备份、可验证的
  数据转换；`seed_missing()` 不能覆盖管理员已有文档，也不能承担迁移。
- 后续数据库版本仍遵守“本需求最多一个迁移”。任何 SQL、表结构或数据转换文件都要
  在用户审阅影响范围并明确批准后才可创建。
- 未识别 StoryWorld、无法唯一映射的活动轮次或无法确定归属的关系记录必须阻止迁移，
  不使用默认 `story_id` 猜测。
- 不增加旧字段兼容解码、双写、旧 Space 路由或启动时静默修复。

### R5 — 当前任务边界

- 只修改上述四份权威文档、本任务规划文件和必要的任务状态。
- 不访问数据库，不创建迁移，不修改生产代码，不改前端，不生成图片，不部署。
- 保留用户现有 `AGENTS.md` 与 `UI稿/` 改动，不暂存或提交它们。

## Acceptance Criteria

- [x] 四份权威文档对 StoryWorld、ReviewedStory、Character、PlayerRole、
  StoryRun、长期关系和发布边界使用同一套术语与归属。
- [x] 文档明确当前已有两个 published StoryWorld、三个公开 Character 和长明宫两个
  PlayerRole，不再引用已失效的“仅安妮 / 单一身份”基线。
- [x] 文档明确 Character 详情负责故事选择、故事页保持纯聊天，并且前端不新增
  `/story-worlds/...` 深链。
- [x] 文档明确安妮与雪夜封宫各自的稳定 `story_id` 映射要求，但不在本任务中改写
  内容或运行状态。
- [x] 文档列出 `managed_story_worlds.payload_json`、StoryRun、每故事进度、
  CharacterRelationship 与消息可见性的迁移影响。
- [x] 文档明确下一代码任务必须原子切换且需要用户先批准 Schema / 数据影响，不允许
  兼容解码、双写或静默修复。
- [x] `AGENTS.md`、`UI稿/`、Python、TypeScript、SQL、配置和数据库均未被本任务修改。
- [x] 术语与链接定向核对通过；由于本任务只改文档，不运行构建或测试。

## Out of Scope

- 实现 ReviewedStory dataclass、codec、注册表或内容迁移。
- 创建或执行数据库迁移、查询数据库、验证生产记录。
- 修改运行时 API、Character 页面、故事聊天页或登录回跳白名单。
- 添加林晚照、《封口之信》、draft allowlist、图片或后续章节。
- 清理本任务之外的父任务状态或用户工作区改动。
