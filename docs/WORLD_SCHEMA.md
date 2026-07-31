# FableSpace 故事世界 Schema

本文档定义角色故事平台的目标 durable data contract。产品边界见 [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md)，负面清单见 [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md)。

当前仓库的应用运行时、公开 API、前端、ORM、配置和迁移入口已经完成旧 Space 合同清退。既有部署数据库在人工执行 `008_retire_legacy_space_schema.sql` 前仍可能保留旧物理表，但它们不构成应用兼容要求；新代码不得为了复用这些残留而把坐标、owner、密码、营业状态或 SillyTavern 字段带入新 Schema。

本文从本版本起同时冻结 StoryWorld 内多审核故事的**目标逻辑合同**。当前 Python 内容模型、`managed_story_worlds.payload_json`、运行时 API 和八张现役表仍是“一世界一套章节 / 结局、世界级单活动轮次、轮次级关系”的旧物理基线，尚未实现该合同。除“当前物理基线与原子迁移边界”一节外，下文 Schema 均描述下一次经批准的原子切换目标；不得用它声称线上数据已经迁移。

## 命名与边界

领域文档、API 和前端统一使用：

| 概念 | 代码命名 | 说明 |
|---|---|---|
| 故事世界 | `StoryWorld` / `story_world_id` | 系统策划并由固定管理员维护的完整故事边界 |
| 角色 | `Character` / `character_id` | 属于一个 StoryWorld、由 AI 在边界内演绎的人物 |
| 审核故事 | `ReviewedStory` / `story_id` | StoryWorld 内经过策划、审核、随世界内容版本追踪且可独立发布的故事内容单元；不是数据库实体 |
| 故事角色参与 | `StoryCharacterParticipation` | Character 在一个 ReviewedStory 中的处境、开场与入口能力 |
| 玩家身份 | `PlayerRole` / `player_role_id` | 属于一个 StoryWorld 的固定故事身份 |
| 玩家世界状态 | `PlayerStoryState` | 按玩家与 StoryWorld 唯一定位的长期私有状态根 |
| 分故事进度 | `PlayerStoryProgress` | 按玩家、StoryWorld 与 `story_id` 隔离的活动轮次和完成摘要 |
| 故事轮次 | `StoryRun` | 锁定一个 `story_id`、内容版本和 PlayerRole 的可回放运行实例 |
| 角色关系 | `CharacterRelationship` | 按玩家、StoryWorld 与 Character 唯一定位并跨本世界故事 / 轮次延续的长期关系 |

`NPC` 只描述 Character 由 AI 演绎的运行方式，不作为持久化实体名。`Space`、`SpaceCharacter`、`VisitorState`、`space_id` 和 `play_identity_id` 不是新合同的别名。

## 数据分层

系统内容与玩家运行时数据必须分开：

```text
当前系统内容
  StoryWorld
    -> PlayerRole[]
    -> Character[]
    -> 正史边界
    -> ReviewedStory[]
      -> StoryCharacterParticipation[]
      -> 章节 / Character 或系统节点 / 选择 / CharacterDecision / 结局

玩家私有运行时数据
  PlayerStoryState
    -> PlayerStoryProgress[story_id]
      -> 当前 StoryRun
      -> 关键选择 / 故事标记
      -> 私有记忆 / 消息 / 可回放事件
      -> 已完成轮次摘要
    -> CharacterRelationship[character_id]
      -> 跨本世界故事 / 轮次的长期关系与来源
```

系统内容以数据库 `managed_story_worlds` 中每个 StoryWorld 一份 JSON 文档维护，ReviewedStory 作为该文档内的值对象，不单独建表。文档只可由部署级固定管理员通过受保护 API 整体替换，并在写入前转换为不可变领域对象、通过全注册表结构校验。Python 内容注册表只负责首次幂等引导，不在正常运行时覆盖管理员保存内容。玩家运行时仍不能写入或改类 StoryWorld 正史或审核故事。

## StoryWorld

StoryWorld 是系统策划并由固定管理员维护的完整故事世界。

### 必需字段

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 稳定且唯一 |
| `title` | string | 玩家可见名称 |
| `summary` | string | 玩家可见的简短故事处境 |
| `genre` | string | 内容题材，不改变运行合同 |
| `publication_status` | `draft` / `published` / `archived` | 唯一发布生命周期 |
| `content_version` | string | 每次后台保存由服务端生成的当前内容标识 |
| `player_roles` | PlayerRole[] | 至少一个系统审核身份 |
| `characters` | Character[] | 至少包含一个属于本世界的角色 |
| `stories` | ReviewedStory[] | 至少一个审核故事；每个故事独立拥有入口、剧情图与结局 |
| `canon_entries` | CanonEntry[] | 固定史实、剧情设定和待核验内容的明确分层 |

领域层继续使用 `dataclass(frozen=True, slots=True)` 和 tuple 保存这些字段。后台 JSON 必须先经过显式 codec 构造完整领域合同；注册表不接收任意 dict，不自动补字段，也不把非法状态降级为 `draft`。

### 约束

- 公开发现和新轮次只能使用 `published` StoryWorld 中的 `published` ReviewedStory。
- 已发布 StoryWorld 可以包含 `draft` ReviewedStory；草稿不进入公开 API 或普通玩家运行时。
- 世界或故事为 `archived` 时停止新玩家开始，但保留既有 StoryRun、进度和事件历史。
- Character、PlayerRole 和 CanonEntry 引用必须在同一 StoryWorld 当前文档内闭合；章节、节点、选择、决定和结局进一步限制在同一 ReviewedStory 内。
- StoryWorld 不再直接拥有唯一 `entry_chapter_id`、`chapters` 或 `endings`。
- StoryWorld 不包含 `owner_id`、`lat`、`lon`、现实地址、访问密码、营业状态、用户发布配置或私有 LLM 配置。
- 历史地点是内容事实，不是 StoryWorld 的通用坐标字段。

## ReviewedStory

ReviewedStory 是 StoryWorld JSON 文档内可审核、可独立发布的故事值对象，不是新的持久化实体或用户创作容器。

### 必需字段

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 在所属 StoryWorld 内稳定且唯一的 `story_id`；不可从标题、顺序或版本推导 |
| `title` | string | Character 详情可展示的审核标题 |
| `summary` | string | Character 详情可展示的简短审核处境 |
| `kind` | `ensemble` / `growth` | 仅用于审核校验与呈现，不创建通用玩法引擎 |
| `publication_status` | `draft` / `published` / `archived` | 故事级发布状态 |
| `focus_character_id` | string? | `growth` 必填且必须引用参与 Character；`ensemble` 必须为空 |
| `participants` | StoryCharacterParticipation[] | 至少一个参与 Character |
| `entry_chapter_id` | string | 必须引用本故事的入口章节 |
| `chapters` | StoryChapter[] | 至少一个章节；引用只在本故事内闭合 |
| `endings` | StoryEnding[] | 至少一个被本故事可达终局节点引用的结局 |
| `character_decisions` | CharacterDecision[] | 可为空；非空时均为有序、确定性且可回放的审核规则 |

### 约束

- 每个 `published` ReviewedStory 至少有一个 `can_start=true` 的参与 Character，且所有参与者均来自所属 StoryWorld 的稳定 Character 注册表。
- `growth` 只声明一个焦点 Character，不限制其他 Character 参与；`ensemble` 不设置焦点 Character。
- 一个 Character 可以参与同一 StoryWorld 内多个 ReviewedStory；公开详情只列出该 Character 参与且已发布、可开始的故事。
- 故事内容随所属 StoryWorld 的 `content_version` 一起版本化；`content_version` 不是 `story_id`，不得作为玩家故事选择身份。
- 跨 ReviewedStory 的章节、节点、选择、决定、结局和故事标记引用一律拒绝。

## StoryCharacterParticipation

StoryCharacterParticipation 保存 Character 随 ReviewedStory 变化的入口合同。

| 字段 | 类型 | 约束 |
|---|---|---|
| `character_id` | string | 必须引用所属 StoryWorld 的 Character，在本故事参与列表中唯一 |
| `current_situation` | string | Character 在本故事当前事件中的简短审核处境 |
| `opening_line` | string | 从该 Character 进入本故事时的审核开场 |
| `can_start` | boolean | 是否允许从该 Character 详情开始本故事 |

`current_situation`、`opening_line` 与 `can_start` 不得回填为 Character 的跨故事字段。参与不等于获知整个故事：Character 只能看到消息可见性与审核节点明确授予的信息。

## Character

Character 必须属于一个 StoryWorld，并只保存跨 ReviewedStory 稳定的 AI 演绎合同。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在同一 StoryWorldRegistry 的 Character 类型中稳定且唯一 |
| `story_world_id` | string | 必须引用所属 StoryWorld |
| `name` | string | 玩家可见角色名 |
| `identity` | string | 已审核的角色身份；说明角色在所属世界中是谁 |
| `age` | string | 已审核的年龄或年龄边界；未知时明确禁止模型自行推断 |
| `social_position` | string | 角色的社会地位、权力范围和制度约束 |
| `motive` | string | 当前事件中主动追求的目标 |
| `secret` | string | 不应无条件向玩家公开的已审核信息 |
| `voice` | string | 语言、语气和表达边界 |
| `relationship_rules` | RelationshipRules | 长期好感范围、自然对话上限和审核关系阶段 |

### 可选字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `portrait_url` | string? | 角色展示图片的绝对 HTTPS URL；为空表示继续使用当前前端静态展示资源 |

### 约束

- 同一 StoryWorld 的 Character 必须有可区分的动机、秘密、语言、交易和拒绝边界，不能只替换姓名。
- Character 不能脱离 StoryWorld 成为通用聊天角色。
- Character 不保存某个 ReviewedStory 专属的当前处境、开场首句或入口资格。
- Character 不能修改 StoryWorld 正史、PlayerRole 或确定性剧情状态。
- 运行时演绎必须注入 Character 的身份、年龄和社会地位；关系阶段只能调节亲疏、称呼、坦白程度和合作意愿，不能覆盖这些稳定设定。
- 角色图片可由固定管理员在角色编辑页上传；URL、不可变对象 key、来源记录和静态 / 动态资产边界遵守 [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md)。
- Character 不要求兼容 SillyTavern 字段，也不提供角色卡导入或导出。

## PlayerRole

PlayerRole 是玩家在一个 StoryWorld 内可被 StoryRun 锁定的系统预设故事身份。单身份世界自动生效；多身份世界允许玩家在开始新轮次前选择一个当前世界已发布的身份。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在同一 StoryWorldRegistry 的 PlayerRole 类型中稳定且唯一 |
| `story_world_id` | string | 必须引用所属 StoryWorld |
| `name` | string | 前台使用的简短身份名 |
| `age` | string | 已审核的年龄或年龄边界；未知时明确禁止模型自行推断 |
| `social_position` | string | 玩家在本世界内的社会地位、能力与权力上限 |
| `gender` | string | 已审核的故事设定，不由玩家选择或平台推断 |
| `background` | string | 与时代、制度和正史一致 |
| `entry_reason` | string | 解释玩家为何进入当前事件 |
| `character_visible_information` | structured content | Character 可以据此识别和回应玩家的内容 |
| `avatar_url` | string? | 可选的审核头像 HTTPS URL；多身份选择界面使用时必须遵守图片资产规范 |

### 约束

- 每个 StoryWorld 至少一个 PlayerRole；同一 StoryWorld 可以提供多个经过审核的身份。
- 每个 StoryRun 必须锁定一个所属 StoryWorld 的 PlayerRole，活动轮次中不得更换。
- PlayerRole 不能跨 StoryWorld 复用，也不是账号权限、现实身份或公开社交资料。
- 客户端只能提交所属 StoryWorld 已发布的 `player_role_id`，不能提交任意身份 Prompt、替换 PlayerRole 内容或声明超出故事合同的能力。
- 1854 年宽街提供原创玩家角色“汤姆·里德”与“莉齐·贝尔”，每轮二选一；安妮分别称其为哥哥或姐姐，但称呼不是独立客户端字段。长明宫·雪夜封宫提供“小太监”与“小宫女”，每轮二选一。

## 系统故事内容子结构

本节定义 StoryWorldRegistry 接受的系统内容结构。后台 JSON、首次引导内容和运行时读取都必须转换为同一组不可变对象；它不是玩家可编辑脚本，也不允许运行时 AI 写入。

### 关系规则

`RelationshipRules`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `minimum_affinity` | number | 内部好感下界，必须小于上界 |
| `maximum_affinity` | number | 内部好感上界 |
| `initial_affinity` | number | 必须落在上下界内，并能映射到一个关系阶段 |
| `natural_turn_max_delta` | number | 自然对话单次变化绝对值上限；非负且不能超过完整好感范围 |
| `stages` | RelationshipStage[] | 至少一个阶段；阈值严格递增 |

`RelationshipStage`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 Character 内唯一 |
| `label` | string | 前台可使用的阶段名称 |
| `minimum_affinity` | number | 阶段生效下界，必须落在 Character 的好感范围内 |
| `attitude` | string | 该阶段下角色可观察的态度边界 |

`RelationshipEffect`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `character_id` | string | 必须引用同一 StoryWorld 的 Character |
| `affinity_delta` | number | 有限数值；绝对值不能超过该 Character 的完整好感范围 |
| `reason` | string | 已审核、可追踪的变化原因 |
| `set_flags` | string[] | 可选的长期关系标记；不得包含空值或重复值，且必须由审核效果明确声明 |

关系效果必须包含非零 `affinity_delta` 或至少一个 `set_flags`。它只定义已审核选择或 CharacterDecision 的确定性长期效果，不允许 AI 直接写入；仅属于某个 ReviewedStory 的条件与结果必须写入 StoryRun 的 `story_flags`，不能伪装为长期关系事实。

### 章节、节点、选择与结局

`StoryChapter`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 ReviewedStory 内唯一 |
| `title` | string | 章节名称 |
| `entry_node_id` | string | 必须引用本章节内的 StoryNode |
| `nodes` | StoryNode[] | 至少一个节点 |

`StoryNode`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 ReviewedStory 内唯一 |
| `presentation_kind` | `character` / `system` / `action` | 区分 Character 对白、系统叙述与玩家可观察行动 |
| `character_id` | string? | `character` 节点必填且必须引用本故事参与 Character；其他节点必须为空 |
| `narration` | string | 当前节点的已审核情境 |
| `choices` | StoryChoice[] | 非终局节点至少一个；终局节点必须为空 |
| `ending_id` | string? | 非空时表示终局，并必须引用本 ReviewedStory 的 StoryEnding |

`presentation_kind` 与 `character_id` 描述不可丢失的逻辑语义；具体 Python 字段名可在后续原子实现任务中确定并同步本文。系统 / 行动节点不授予任何 Character 新知识，也不得编码成 Character 消息；Character 节点只能从对应 Character 的交互上下文推进。

`StoryChoice`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 ReviewedStory 内唯一 |
| `label` | string | 玩家可见的已审核选择 |
| `next_node_id` | string | 必须引用本 ReviewedStory 的 StoryNode；允许跨章节，不允许跨故事 |
| `is_key` | boolean | 标记是否属于不可回退的关键选择 |
| `required_flags` | string[] | 进入选择所需的故事标记 |
| `blocked_flags` | string[] | 阻断选择的故事标记；不得与 `required_flags` 重叠 |
| `set_flags` | string[] | 选择确认后写入的已审核故事标记 |
| `relationship_effects` | RelationshipEffect[] | 同一 StoryWorld 内、由本故事审核的确定性长期关系变化 |

选择目标为另一参与 Character 的节点时，响应必须显式投影目标 Character 与可见动作；前端只有在玩家执行该选择并确认拜访目标后才导航到对应 Character 短路由，服务端和页面不得自动跳转。

### 确定性 CharacterDecision

`CharacterDecision` 表示 Character 在审核节点上的关键决定：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 ReviewedStory 内唯一 |
| `character_id` | string | 必须引用本故事参与 Character |
| `trigger_node_id` | string | 必须引用本故事节点，且节点上下文允许该 Character 作决定 |
| `rules` | DecisionRule[] | 至少一个，按声明顺序求值；最后一条必须是无条件兜底 |

`DecisionRule` 的逻辑合同为：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 CharacterDecision 内唯一 |
| `conditions` | typed predicates | 只能读取审核 choice 写入的 story flags、审核查证结果、审核玩家承诺行动、当前 Character，以及该 Character 的长期关系区间 |
| `next_node_id` | string | 必须引用同一 ReviewedStory 的节点 |
| `set_flags` | string[] | 可选的本故事审核标记 |
| `relationship_effects` | RelationshipEffect[] | 可选的确定性长期关系变化 |
| `reason` | string | 玩家可观察或可审计的审核原因 |

- 规则按声明顺序匹配第一条成立项，不允许模型排序、补条件或选择结果。
- 最后一条兜底规则的 `conditions` 必须为空，确保相同事实总能得到确定结果。
- 每次解析都记录决定 ID、规则 ID、输入的结构化事实、结果节点和原因，不记录模型思维链。
- 自由输入与 AI 文本可以形成普通对话，但不能直接设置决定所读的关键 flags、伪造查证 / 承诺结果、选择 DecisionRule 或写入永久状态。

`StoryEnding`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 ReviewedStory 内唯一 |
| `title` | string | 结局名称 |
| `summary` | string | 可写入已完成轮次摘要的已审核内容 |

每个 ReviewedStory 的剧情图允许循环，但必须满足：

- ReviewedStory 入口章节及其入口节点存在。
- 所有节点都能从 ReviewedStory 入口节点到达。
- 非终局节点不能成为无选择死路，终局节点不能继续提供选择。
- 从入口至少能到达一个终局，并且每个 StoryEnding 都被一个可达终局节点引用。
- 不要求每个循环分支最终都能自动到达结局；运行时退出策略由 StoryRun API 负责。

### 正史条目

`CanonEntry`：

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 在所属 StoryWorld 内唯一 |
| `category` | `fixed_fact` / `story_setting` / `needs_verification` | 不允许任意字符串或运行时改类 |
| `statement` | string | 经审核的事实或设定陈述 |
| `sources` | string[] | 来源说明；`fixed_fact` 至少两个不同的非空来源 |

注册表只能验证来源数量、非空和去重；来源是否独立、可靠以及是否忠于原始精度仍必须由人工审校。`published` StoryWorld 不得包含 `needs_verification`，但 `draft` 可以保留它继续研究。

### ID 作用域与注册表边界

| ID | 唯一范围 |
|---|---|
| StoryWorld | StoryWorldRegistry |
| Character | StoryWorldRegistry 内 Character 类型 |
| PlayerRole | StoryWorldRegistry 内 PlayerRole 类型 |
| ReviewedStory | 所属 StoryWorld |
| StoryCharacterParticipation | 所属 ReviewedStory 内按 Character 唯一 |
| StoryChapter / StoryNode / StoryChoice / StoryEnding / CharacterDecision | 所属 ReviewedStory |
| DecisionRule | 所属 CharacterDecision |
| CanonEntry | 所属 StoryWorld |
| RelationshipStage | 所属 Character |
| 故事标记 | 所属 ReviewedStory 的运行语义，不作为实体 ID |
| 长期关系标记 | 所属 StoryWorld 与 Character 的运行语义，不作为实体 ID |

所有实体 ID 和标记必须是无首尾空白的非空 string。Character、PlayerRole 与 CanonEntry 引用必须在同一 StoryWorld 内闭合；参与、章节入口、节点、选择目标、决定和终局引用必须进一步在同一 ReviewedStory 内闭合。RelationshipEffect 可以指向本 StoryWorld 的参与 Character，但不能指向其他世界。

`StoryWorldRegistry` 是系统内容的结构校验边界，`ManagedStoryWorldStore` 是当前内容读取与原子替换边界：

- 构造时复制输入 iterable，并一次性校验字段、枚举、ID、参与关系、引用、关系范围、世界 / 故事发布状态、CharacterDecision 兜底和每个故事的完整剧情图。
- 失败抛出 `StoryContentValidationError`，包含稳定 `code`、具体 `path` 和开发者可读说明；不修复 ID、不补默认对象、不降级发布状态。
- Registry 只提供 `get(story_world_id)`、`require(story_world_id)`、`all()` 和 `published()`；返回原始不可变对象和 tuple。
- Store 每次读取数据库文档并经 codec 与 Registry 校验；保存时锁定全部管理记录、替换目标世界、校验完整集合并在一个事务中写入。
- 首版只允许更新已引导的 StoryWorld，不提供 StoryWorld 创建、删除、owner CRUD 或普通用户写接口。

## PlayerStoryState

PlayerStoryState 是一个玩家在一个 StoryWorld 中的长期私有状态根。它不再直接保存某个故事的 PlayerRole、活动轮次或完成摘要。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `player_id` | string | 由服务端身份边界解析 |
| `story_world_id` | string | 所属 StoryWorld |
| `visit_count` | integer | 非负回访次数 |
| `last_visited_at` | ISO timestamp? | 最近回访时间 |
| `story_progress` | PlayerStoryProgress[] | 按 `story_id` 唯一的分故事进度 |
| `character_relationships` | CharacterRelationship[] | 按 `character_id` 唯一的世界内长期关系 |

### 唯一性与身份

- `player_id + story_world_id` 唯一定位一条 PlayerStoryState。
- `player_id` 只来自服务端验证后的登录账号身份；未登录请求不得生成 PlayerStoryState、StoryRun 或其他私有状态。
- 平台不创建匿名玩家标识，也不提供匿名状态与账号之间的绑定、迁移或合并。
- 客户端不得提交、替换或冒充任意 `player_id`。
- PlayerStoryState 不跨 StoryWorld 传播，也不进入公开发现、公开资料、排行榜或其他玩家响应。

## PlayerStoryProgress

PlayerStoryProgress 隔离一个玩家在一个 StoryWorld 内对一个 ReviewedStory 的活动轮次与完成历史。目标物理实现使用独立进度记录，不把多个故事指针塞回 PlayerStoryState 单行。

| 字段 | 类型 | 约束 |
|---|---|---|
| `player_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_world_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_id` | string | 必须引用所属 StoryWorld 的 ReviewedStory |
| `active_story_run_id` | string? | 只能引用相同玩家、世界与故事的活动轮次 |
| `last_visited_at` | ISO timestamp? | 最近访问该故事的时间 |
| `completed_run_summaries` | collection | 本故事全部已完成轮次的有序安全结局摘要 |

- `player_id + story_world_id + story_id` 唯一定位一条 PlayerStoryProgress。
- 每个故事同时最多一个活动轮次；不同 ReviewedStory 可以分别拥有活动轮次。
- 每份完成摘要只包含 `story_run_id`、`story_id`、`ending_id`、安全短摘要和 `completed_at`，不得复制长期关系、故事标记、选择、消息或记忆。
- 一个故事的活动指针、完成摘要、flags、选择、消息和记忆不能被另一个故事读取或改写。

## StoryRun

StoryRun 表示一次从开始到结局的故事轮次。

### 必需字段

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 唯一轮次 ID |
| `player_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_world_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_id` | string | 必须引用所属 StoryWorld 的一个 ReviewedStory，创建后不可更换 |
| `content_version` | string | 轮次开始时锁定的 StoryWorld 内容标识，活动轮次中不可改写 |
| `player_role_id` | string | 轮次开始时锁定的所属 StoryWorld PlayerRole |
| `status` | `active` / `completed` | 唯一轮次生命周期 |
| `current_chapter_id` | string | 活动轮次处理请求时必须属于锁定 ReviewedStory |
| `current_node_id` | string | 必须属于当前章节和锁定 ReviewedStory |
| `key_choices` | collection | 已确认且不可回退的关键选择、幂等载荷及来源事件 |
| `story_flags` | collection | 仅由本 ReviewedStory 的已审核剧情动作与 CharacterDecision 改变 |
| `messages` | StoryMessage[] | 可回放的玩家、角色与系统消息 |
| `private_memories` | PrivateMemory[] | 经过筛选且可追踪来源的玩家私有记忆 |
| `events` | StoryEvent[] | 可回放的输入、选择与确定性状态变化 |
| `ending_summary` | string? | 完成时写入；活动轮次为空 |

### 约束

- 每个 `player_id + story_world_id + story_id` 同时最多一个 `active` StoryRun。
- `story_id`、`content_version` 与 `player_role_id` 在一个有效 StoryRun 生命周期内均不可更换。
- 关键选择在活动轮次中不能撤销；系统不提供章节回退或并行时间线。
- 完成后可以为同一故事开始新 StoryRun。新轮次不继承上一轮故事标记、选择、消息或记忆，但读取同一 PlayerStoryState 中已经持久化的长期 CharacterRelationship。
- 管理员保存新内容后不得重写活动 StoryRun 的 `content_version`。若运行时不能按锁定版本安全解析当前章节、节点、故事或 PlayerRole，必须保留旧轮次历史并停止推进；只能由玩家基于当前发布内容明确开始新轮次，不得静默迁移或自动重启。
- 已完成轮次不迁移为新的剧情状态；其事件、消息和安全结局摘要保持只读。
- `events` 必须保留可观察输入、确定性剧情动作、状态变化原因和来源；不得存储 chain-of-thought。

### StoryEvent

当前 P0 运行时将 `events` 持久化为按 StoryRun 严格排序的 StoryEvent：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 唯一事件 ID |
| `story_run_id` | string | 所属 StoryRun |
| `sequence` | integer | 同一 StoryRun 内唯一且严格递增 |
| `event_type` | string | `run_started`、`message`、`choice`、`character_decision`、`relationship_changed`、`node_changed`、`memory_added`、`character_visit`、`run_completed` 等受控事件类型 |
| `character_id` | string? | 角色消息或访问事件必须指向锁定 ReviewedStory 的参与 Character |
| `role` | `player` / `character` / `system`? | 消息或叙事的可观察发出方 |
| `content` | string | 玩家可观察正文 |
| `source_kind` | `authored` / `free_input` / `reviewed_choice` / `reviewed_decision` | 内容或动作来源 |
| `source_id` | string? | 审核节点、开场、choice、decision 或 rule ID；用于追踪、回放与幂等 |
| `payload` | object | 保存结构化可观察结果和确定性 `rule_source`，不保存模型思维链 |
| `created_at` | ISO timestamp | 事件创建时间 |

自由消息只追加消息及其来源事件，不改变节点、关键选择、故事标记、长期关系或结局。`reviewed_choice` 事件必须引用当前节点中可用的发布 choice，`reviewed_decision` 必须引用相同事实下唯一命中的 DecisionRule，随后才允许在同一事务内确定性写入关系、标记、节点与结局。事件序号由持久化层分配，调用方不得自行维护第二套游标。

### StoryMessage

StoryMessage 将可回放消息从通用事件载荷中独立出来，同时保留来源事件：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 唯一消息 ID |
| `story_run_id` | string | 所属 StoryRun |
| `sequence` | integer | 同一 StoryRun 内唯一且严格递增 |
| `role` | `player` / `character` / `system` | 消息发出方 |
| `character_id` | string? | `character` 消息必须指向锁定 ReviewedStory 的参与 Character |
| `visible_to_character_ids` | string[] | 允许观察该消息的本故事参与 Character；不得包含未参与或其他世界 Character |
| `content` | string | 玩家可观察正文 |
| `source_event_id` | string | 产生该消息的 StoryEvent |
| `source_event_sequence` | integer | 来源事件在轮次内的序号 |
| `created_at` | ISO timestamp | 消息创建时间 |

消息只追加，不提供原地更新或删除接口。玩家始终可以查看自己的时间线；Character 上下文只能注入 `visible_to_character_ids` 包含自身的消息。`system` / `action` 叙述对玩家可见不等于已向任何 Character 公开，系统也不得因为两个 Character 参与同一故事而自动共享消息。

### PrivateMemory

PrivateMemory 只接收上游已经筛选通过的记忆：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 唯一记忆 ID |
| `story_run_id` | string | 所属 StoryRun |
| `content` | string | 已筛选的私有记忆正文 |
| `source_event_id` | string | 产生该记忆的 StoryEvent |
| `source_event_sequence` | integer | 来源事件在轮次内的序号 |
| `character_id` | string? | 可选的本故事参与 Character 来源 |
| `created_at` | ISO timestamp | 记忆创建时间 |

记忆不保存候选文本、系统 Prompt、密钥或 chain-of-thought，不提供公开读取、原地更新或删除接口。

## CharacterRelationship

CharacterRelationship 保存一个玩家在一个 StoryWorld 内与具体 Character 的长期关系。它由 PlayerStoryState 统一拥有，不再归属单个 StoryRun。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `player_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_world_id` | string | 必须与所属 PlayerStoryState 一致 |
| `character_id` | string | 必须属于同一 StoryWorld |
| `affinity` | number | 内部连续值，不直接向玩家展示 |
| `stage` | string | StoryWorld 审核的关系阶段 |
| `last_change_reason` | string? | 最近一次有依据变化的可追踪原因 |
| `flags` | collection | 经审核、可跨本世界故事延续的长期关系标记 |
| `last_source_story_run_id` | string? | 最近永久变化的来源 StoryRun |
| `last_source_event_id` | string? | 最近永久变化的来源 StoryEvent |
| `updated_at` | ISO timestamp | 最近一次成功写入时间 |

### 约束

- `player_id + story_world_id + character_id` 唯一。
- 自然对话只能产生有依据、受限的小幅 `affinity` 变化。
- 已审核的关键选择可以产生较大变化，并打开或关闭分支。
- 重复闲聊不得无成本获得重大关系阶段、关键标记或结局。
- 前端只展示角色态度、关系阶段和变化原因，不展示 `affinity` 数值。
- 关系不跨 StoryWorld 传播，但在同一 StoryWorld 内跨 ReviewedStory 与 StoryRun 延续。
- 每次永久变化必须与来源 StoryRun 中同 Character 的 `relationship_changed` StoryEvent 在同一事务提交；`last_source_story_run_id` 与 `last_source_event_id` 必须同时为空或同时有效。
- 故事专属 flags、查证结果、选择和结局只能保存在对应 StoryRun / PlayerStoryProgress，不能写入长期关系以绕过故事隔离。

## 运行时持久化事务

- 所有 Store 读取都同时要求 `player_id + story_world_id`；故事进度与轮次请求还必须复核 `story_id`，即使已有 `story_run_id` 也不能省略范围校验。
- 创建 PlayerStoryState / PlayerStoryProgress、开始轮次、读取或初始化所需长期关系、写入起始事件和更新该故事活动指针在同一事务完成。
- 消息、长期关系变化、关键选择、CharacterDecision、节点变化、记忆和结局写入必须与各自来源 StoryEvent 同事务提交。
- 完成轮次、向对应 PlayerStoryProgress 追加安全结局摘要和清空该故事活动指针在同一事务完成。
- 任一步失败都回滚整个事务，不得留下孤立记录、半写入关系或悬空活动指针。
- 已完成轮次只读；开始新轮次使用空故事标记、空选择、空消息和空记忆，但读取已有长期 CharacterRelationship，不重新建立或清零关系。

## 剧情动作与 AI 写回

运行时状态变化遵循固定顺序：

```text
预设选择或自由输入
  -> 加载当前 StoryWorld、锁定 ReviewedStory 与 StoryRun
  -> 校验 story_id / content_version / PlayerRole 与当前交互 Character
  -> 解析为允许的剧情动作，或保持普通对话
  -> 确定性规则校验前置条件；需要时按顺序解析 CharacterDecision
  -> 按消息可见性构建 Character、PlayerRole、正史、长期关系和该故事私有记忆上下文
  -> AI 生成角色可观察回应
  -> 输出校验
  -> 原子持久化消息、事件、故事状态、受限长期关系变化和记忆候选
```

- AI 不能直接写 StoryWorld、ReviewedStory、章节、节点、关键选择、故事标记、CharacterDecision 结果、长期关系或结局。
- 自由输入未匹配已审核剧情动作时不能推进关键状态。
- AI 提出的关系变化或记忆只能作为候选，必须经过规则、上限、来源和隐私校验。
- 所有永久写回必须可追踪、可回放并能解释其规则来源。
- 系统叙述不进入 Character 发言上下文；未向当前 Character 可见的消息与其他故事进度不得注入模型。

## 历史正史

历史 StoryWorld 必须在系统内容中区分：

| 内容层 | Schema 约束 |
|---|---|
| 固定史实（`fixed_fact`） | 有至少两个不同的非空来源；时间或时间范围、地点、真实参与者、可证实同场关系、制度阶段和已知公开结果不可被运行时改变 |
| 剧情设定（`story_setting`） | 明确为原创，且已核对不会改变任何固定史实 |
| 待核验（`needs_verification`） | 来源不足或存在实质争议；允许保留在 `draft`，不得进入 `published`、剧情因果或 Character 定论 |

实现不得把“史料未记载”自动归类为剧情设定，也不得让 AI 改变内容层级。原创或架空 StoryWorld 不受真实历史时间线约束，但仍受自身已发布正史和状态机约束。

历史 StoryRun 的私有响应可以附带派生的 `historical_reference`，供玩家主动打开参考表面：

| 字段 | 类型 | 约束 |
|---|---|---|
| `stage` | `opening` / `investigation` / `outcome` | 由当前节点与轮次状态确定，不由客户端提交 |
| `unlocked_count` | integer | 当前已解锁条目数 |
| `total_count` | integer | 当前 StoryWorld 的核验条目总数 |
| `entries` | HistoricalReferenceEntry[] | 只包含当前阶段已解锁条目；锁定条目的正文和来源不得提前下发 |

`HistoricalReferenceEntry` 只投影审核注册表中的 `id`、`category`、`statement` 和 `sources`。前端必须把 `fixed_fact`、`story_setting`、`needs_verification` 分别显示为“史实”“剧情设定”“待核验”，不得重写分类或让运行时 AI 生成参考条目。`published` 内容不会包含 `needs_verification`；前端可以显示该分类计数为零，但不能用占位文本伪造条目。

## 系统 LLM 配置

模型、API Key、服务地址和生成参数属于部署级系统配置，不是 StoryWorld 或 owner 数据实体。

- 当前 StoryWorld 对话运行时只读取 `FABLESPACE_LLM_BACKEND`、`FABLESPACE_LLM_MODEL`、`FABLESPACE_LLM_API_KEY`、`FABLESPACE_LLM_BASE_URL`、`FABLESPACE_LLM_TEMPERATURE`、`FABLESPACE_LLM_MAX_TOKENS` 和 `FABLESPACE_LLM_TOP_P`。
- 七项配置不得回退到仓库 JSON、其他 Key、owner 或 StoryWorld 数据；temperature 范围为 `0..2`，max tokens 范围为 `1..4096`，top-p 范围为 `(0, 1]`。
- 任一配置缺失或非法时，不阻断公开页面或内容后台启动；实际对话请求返回 `dialogue_unavailable` / HTTP `503`。
- 配置诊断只记录缺失或非法的环境变量名；provider 失败只记录受支持 backend 和异常类型。
- 公开 API 和前端不得接收 API Key、隐藏 Prompt 或生成参数。
- 密钥不得写入日志、消息、事件或 PlayerStoryState。
- 运维指标不得暴露玩家对话、私有记忆或可还原密钥的信息。
- 平台不提供 owner / StoryWorld 私有 LLM 配置或 Token 计费字段。

## 公开与私有响应边界

公开响应可以包含：

- `published` StoryWorld 的发现摘要；
- Character 的公开入口信息；
- 该 Character 参与且 `published`、`can_start=true` 的 ReviewedStory 投影，包括稳定 `story_id`、标题、摘要、类型和参与处境；
- 所属 StoryWorld 摘要和全部系统预设 PlayerRole 的玩家可见入场信息。

玩家私有响应必须经过当前登录账号身份校验，才可以包含：

- PlayerStoryState；
- 当前 `story_id` 的 PlayerStoryProgress 与 StoryRun；
- 自己的消息、选择、关系、记忆、事件和结局摘要。

任何公开响应都不得包含其他玩家标识、对话、进度、关系、记忆、隐藏正史、系统 Prompt 或密钥。

### 管理员内容 API

管理 API 使用现有可信会话，并要求 ParallelLines 票据兑换及实时回查返回的
`user.role` 为 `admin`。FableSpace 不保存第二份管理员账号或管理员 ID；
ParallelLines 管理员进入后自动具备内容后台权限：

```text
GET  /api/v1/admin/story-worlds
GET  /api/v1/admin/story-worlds/{story_world_id}
PUT  /api/v1/admin/story-worlds/{story_world_id}
     body: { "story_world": <完整 StoryWorld 文档> }
POST /api/v1/admin/story-worlds/{story_world_id}/characters/{character_id}/portrait
     multipart: image, source_note
```

`PUT` 只更新已存在的管理世界；路径 ID 必须与文档 ID 相同。服务端忽略客户端提交的版本意图，每次成功保存生成新的 `content_version`，并把目标文档与其他全部世界共同交给 Registry 校验。管理响应可以包含完整系统内容，但不得包含玩家私有状态、会话 Cookie、对象存储凭据或部署密钥。

目标 `story_world` 文档包含完整 `stories[]`。现有单故事 `payload_json` 必须在批准的原子迁移中显式转换，不能让新 codec 猜测旧字段、让 `PUT` 顺便修复，或让 `seed_missing()` 覆盖管理员已保存文档。

管理持久化只新增：

- `managed_story_worlds`：`story_world_id` 主键、完整 `payload_json`、`updated_at`。
- `managed_media_assets`：角色页内不可变上传的对象 key、HTTPS URL、字节数、SHA-256、MIME、可选宽高、`user-provided` 来源、来源说明与时间。

没有 `managed_homepage`。首版也不提供媒体列表、通用素材选择、对象删除或独立媒体库 API。

### 目标 P0 StoryWorld API

原子迁移完成后，安妮与长明宫继续使用同一套 StoryWorld 后端路由，不通过旧 `/spaces` 合同；所有私有运行时路由都显式包含 `story_id`：

```text
GET  /api/v1/story-worlds/{story_world_id}/characters/{character_id}
GET  /api/v1/story-worlds/{story_world_id}/stories/{story_id}/runs/current?character_id={character_id}
POST /api/v1/story-worlds/{story_world_id}/stories/{story_id}/runs
     body: { "character_id": "...", "player_role_id": "..." }
POST /api/v1/story-worlds/{story_world_id}/stories/{story_id}/runs/{run_id}/messages
     body: { "character_id": "...", "content": "..." }
POST /api/v1/story-worlds/{story_world_id}/stories/{story_id}/runs/{run_id}/choices
     body: { "character_id": "...", "choice_id": "..." }
POST /api/v1/story-worlds/{story_world_id}/stories/{story_id}/runs/restart
     body: { "character_id": "...", "player_role_id": "..." }
```

公开详情只返回发布 StoryWorld、Character 稳定公开信息、该 Character 可开始的已发布 ReviewedStory 投影，以及系统预设 PlayerRole 列表。`story_id` 必须来自该公开投影；`character_id` 必须是本故事参与且允许当前动作的 Character；`player_role_id` 只能选择同一 StoryWorld 当前发布的 PlayerRole，不允许携带故事、身份或 Character 正文。

公开角色页使用 `/characters/:characterSlug`，以 `/characters/:characterSlug/story?storyId=...&playerRoleId=...` 进入互动。`storyId` 与 `playerRoleId` 都必须再次用公开白名单校验；活动 StoryRun 以服务端锁定三元组为准。登录回跳白名单只允许规范 Character 故事路径和这两个 ASCII ID 参数。前端不新增 `/story-worlds/...` 页面或深链。

长明宫从魏观海或萧明珠进入同一个 `palace_snow_edict` StoryRun，但每条消息按 `visible_to_character_ids` 投影到当前会见 Character。跨 Character 选择只返回已审核的目标 Character 和动作，由玩家明确点击后导航；服务端不得自动切换当前 Character。运行时请求不接受 `player_id`；服务端从已验证登录会话解析账号身份，无有效会话时返回 `401`，且不得创建或修改玩家状态。运行时响应不回显玩家 ID，但会回显该 StoryRun 锁定的公开 Story 与 PlayerRole 投影。

故事页在加载、刷新、重新进入或另一设备访问时，只通过对应 `story_id` 的 `GET runs/current` 恢复该账号在该故事的活动轮次；没有活动轮次时可以返回该故事最近完成轮次及其安全结局摘要。前端收到任一受保护请求的 `401` 后必须同时失效访问状态缓存和当前私有故事状态，清空未确认输入，并忽略已经过期的迟到响应。消息、选择、开始或重新开始请求不得自动重放；非 `401` 写失败后必须先读取相同 `story_id` 的 current 状态，成功前不得继续写入。现有开始请求只复用相同玩家、世界、故事的活动轮次，审核选择按已持久化 choice source 去重；自由消息和重新开始通过“失败后先读”处理响应不确定性。

## 当前物理基线与原子迁移边界

### 已检查的仓库基线

当前物理持久化合同精确包含 8 张表：玩家运行时使用 `player_story_states`、`story_runs`、`character_relationships`、`story_events`、`story_messages` 和 `private_memories`，托管系统内容使用 `managed_story_worlds` 与 `managed_media_assets`。

当前代码和 Schema 的关键旧形状为：

- `managed_story_worlds.payload_json` 中 StoryWorld 直接拥有唯一 `entry_chapter_id`、`chapters` 与 `endings`，Character 直接拥有 `current_situation` 与 `opening_line`。
- `player_story_states` 按玩家与世界保存 `player_role_id`、单个 `active_story_run_id` 和所有完成摘要，没有分故事进度记录。
- `story_runs` 没有 `story_id`。
- `character_relationships` 以 `story_run_id + character_id` 唯一，关系不会跨 StoryRun 延续。
- 现有运行时路由没有 `story_id` 路径段，前端登录回跳只识别 `playerRoleId`。

004–007 记录现役 Schema 的历史演进；008 只负责显式清退 23 张旧表和已经由独立 `private_memories` 表取代的 `story_runs.private_memories` 内联列，不在应用启动或普通 push 部署时自动执行。已有生产库若同时缺少 006 的 `story_runs.player_role_id` 并保留旧物理 Schema，必须在停止写入、完整逻辑备份和前置检查后先执行 006、验证回填，再执行 008；单独通过不读取故事表的健康端点不构成 Schema 一致性证据。

本次文档任务没有连接数据库，因此不知道生产 `payload_json` 是否与内建内容一致、是否包含管理员编辑，也不知道活动轮次和轮次级关系的真实分布。这些未知项是下一迁移任务的证据缺口，不能以仓库默认值代替。

### 既有内容的稳定映射

原子迁移必须按审核映射写入明确 `story_id`：

| `story_world_id` | 目标 `story_id` | 发布 / 类型 / 参与 Character |
|---|---|---|
| `history_broad_street_water_1854` | `broad_street_water_1854` | `published` / `growth` / 安妮（焦点 Character） |
| `story_palace_snow_edict` | `palace_snow_edict` | `published` / `ensemble` / 魏观海、萧明珠 |

映射只用于这两个已审核世界。未知 StoryWorld、无法唯一映射的 StoryRun、异常 JSON、重复进度或无法确定来源 / 合并结果的关系记录必须阻止迁移；不得使用数组第一项、Character、标题、`content_version` 或通用默认 `story_id` 猜测。

### 同一批准版本必须完成的切换

下一代码任务必须把代码、托管内容和运行时数据作为一个发布单元原子切换，至少包括：

1. 把两个内建 StoryWorld 转成 `stories[]`，并把 Character 的处境、开场和入口能力移动到 StoryCharacterParticipation；不顺带改写现有角色、PlayerRole、正史、选择、关系效果或结局语义。
2. 显式转换每条已识别 `managed_story_worlds.payload_json`；保存备份和转换前后校验结果。`seed_missing()` 只能插入缺失内建世界，不能覆盖管理员文档或承担迁移。
3. 为 `story_runs` 增加非空 `story_id`，按上表回填既有轮次，并建立玩家、世界、故事活动唯一性约束。
4. 新增按 `player_id + story_world_id + story_id` 唯一的分故事进度记录，迁移当前活动指针与完成摘要；从世界级状态删除不再权威的对应字段，避免双写。
5. 把 `character_relationships` 重键为 `player_id + story_world_id + character_id`，保留最近来源 StoryRun / StoryEvent；多个旧轮次关系无法按审核规则唯一合并时阻止迁移，不以最大 affinity、最新时间或任意顺序猜测。
6. 校验每条既有 `story_messages.visible_to_character_ids` 只引用映射后 ReviewedStory 的参与 Character；无法判定可见范围时阻止迁移，不默认向全部参与者公开。
7. 同步 StoryWorld codec、Registry、管理 API、运行时 Store / API、消息可见性、内建内容、前端 client、Character 详情故事选择和登录回跳白名单。
8. 在切换后验证托管 JSON、StoryRun、分故事进度、长期关系、消息可见性和两个 P0 世界的完整引用，再恢复写入。

本需求最多创建一个数据库迁移。项目规则禁止在影响范围获明确批准前创建迁移、表或字段；下一任务必须先提交精确表 / 列 / 唯一约束、JSON 转换、备份、停写、失败阻断和回滚方案，并取得用户明确批准。迁移前的生产数据库只读审计也需要用户另行授权。

MySQL DDL 可能隐式提交，执行前必须停止应用写入并完整备份全部受影响表与管理 JSON。新 codec 不得先于数据转换部署，也不保留旧 JSON 兼容 decoder、新旧双写、启动时静默修复或反向 SQL 猜测。任一步失败都保持服务停写，并从同一组备份恢复代码、托管内容和运行时数据。

## 校验矩阵

| 条件 | 处理 |
|---|---|
| `publication_status` 或 StoryRun `status` 不在允许枚举 | 拒绝加载或写入，不静默归一 |
| published StoryWorld 缺少 PlayerRole、Character 或至少一个有效且 published 的 ReviewedStory | 拒绝保存 |
| published ReviewedStory 没有可开始参与 Character、有效入口、可达结局或确定性决定兜底 | 拒绝保存 |
| Character / PlayerRole 跨 StoryWorld，或章节 / 节点 / 选择 / 决定 / 结局跨 ReviewedStory 引用 | 拒绝 |
| draft / archived ReviewedStory 出现在公开详情或新轮次请求 | 不返回或拒绝开始；不得自动替换为数组中的其他故事 |
| 客户端提交任意 `player_id`、身份正文、未知 `story_id` 或跨世界 `player_role_id` | 拒绝；玩家 ID 由服务端解析，Story 与 PlayerRole 只从当前发布 StoryWorld 注册表解析 |
| 未登录或登录会话已过期时请求私有运行时能力 | 返回 `401`，不创建或修改任何玩家状态 |
| 客户端尝试指定管理内容的最终 `content_version` | 服务端保存时生成当前标识，不采用客户端版本意图 |
| 会话无效或 ParallelLines 可信角色不是 `admin` | 管理 API 返回 `401` / `403`，不读取或写入管理内容 |
| 请求的 `story_id` 与 StoryRun / PlayerStoryProgress 不一致 | 拒绝且不泄露其他故事私有状态 |
| 活动轮次锁定的内容版本、Story、PlayerRole、章节或节点无法安全解析 | 保留旧轮次历史并停止推进；不静默改写版本或自动新建轮次 |
| 未通过前置条件的剧情动作 | 不改变关键状态，并返回可观察的受控结果 |
| CharacterDecision 没有唯一确定规则结果 | 拒绝内容或动作，不调用 AI 猜测 |
| 消息请求把未参与 Character 或不可见历史注入上下文 | 拒绝或过滤，并保留安全诊断 |
| AI 输出尝试直接写正史、关键标记、长期关系、决定或结局 | 丢弃该写回并记录安全的诊断信息 |
| 私有状态被请求到错误玩家或公开端点 | 拒绝且不泄露记录是否存在 |

## 已删除的旧合同

以下内容不属于本 Schema，也不得作为新实现的兼容要求：

- `Space`、`SpaceCharacter`、`VisitorState`、`WorldInfoEntry` 和 `StateCard`；
- `Place`、`Home`、地点关系、公开关系图、NpcPublicBond 和 SkillPack；
- `lat` / `lon`、地图底图、POI、owner、访问密码和营业状态；
- SillyTavern 角色卡导入 / 导出与空间包；
- 全局 `play_identity`、脱离 StoryWorld 的玩家自声明性别和用户身份 Prompt；
- owner / 故事世界私有 LLMConfig 和 Token 统计；
- 旧 GameplayDefinition / GameplaySession 通用玩法合同。

旧类型、服务、路由、前端客户端、ORM、迁移入口和配置兼容层已经删除，不提供重定向或兼容包装器。已有数据库中的旧物理表只能在确认目标、完成逻辑备份并显式执行 008 后删除；应用启动不得静默清库，仓库完成也不得被表述为数据库已经执行清退。

## 版本与维护

- 新增字段、枚举或语义变化必须先获得产品确认，并同步本文、相关 API 合同和最小真实验证。
- 每次管理保存由服务端生成可追踪的 `content_version`；StoryRun 在创建时锁定该版本，活动轮次不得在下一请求静默改写为当前版本。版本失配的恢复 / 封存策略必须显式、可审计。
- 运行时表变更必须有显式迁移和回滚边界，不依赖兼容默认值掩盖协议变化。
- 本文不保存一次性 brainstorm、实现日志或历史长版本；过程记录留在 Trellis 任务、提交和发布说明中。
