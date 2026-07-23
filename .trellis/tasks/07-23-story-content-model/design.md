# 系统故事内容模型技术设计

## 1. 设计目标

本任务只建立“什么是有效且可发布的 StoryWorld 内容”。它不负责保存玩家进度、处理请求或迁移旧数据。

目标数据流：

```text
代码审查过的 Python 系统内容
  -> 不可变 dataclass
  -> StoryWorldRegistry 单一校验边界
  -> 后续内容 / API / 运行时任务只读查询
```

旧 Space dict、`normalize_gameplay_definition()` 和 owner CRUD 不进入这条链路。

## 2. 文件边界

### 新增

- `apps/api/src/fablespace_api/domain/story_world.py`
  - 所有系统内容枚举和不可变 dataclass。
  - `StoryContentValidationError`。
  - StoryWorld 结构 / 图校验。
  - `StoryWorldRegistry`。
- `.trellis/tasks/07-23-story-content-model/verify_story_content_model.py`
  - 两个非生产最小样例。
  - 成功读取断言和失败矩阵。

### 更新

- `docs/WORLD_SCHEMA.md`
  - 把章节、选择、结局、正史条目和关系规则的占位描述替换为实际合同。

### 不修改

- `apps/api/src/fablespace_api/core/default_spaces.py`
- API router、application service、infrastructure 和前端文件
- 旧 Space / Gameplay 实现

## 3. 类型结构

### 枚举

| 类型 | 值 | 用途 |
|---|---|---|
| `PublicationStatus` | `draft` / `published` / `archived` | StoryWorld 发布生命周期 |
| `CanonCategory` | `fixed_fact` / `story_setting` / `needs_verification` | 固定史实、剧情设定、待核验内容分层 |

使用 `class X(str, Enum)` 与当前 Python 风格一致，并保持序列化值稳定。

### 正史

`CanonEntry`

- `id`
- `category`
- `statement`
- `sources: tuple[str, ...]`

任何 `fixed_fact` 至少两个非空来源。任何 published StoryWorld 都不能包含 `needs_verification`。

### 关系

`RelationshipStage`

- `id`
- `label`
- `minimum_affinity`
- `attitude`

`RelationshipRules`

- `minimum_affinity`
- `maximum_affinity`
- `initial_affinity`
- `natural_turn_max_delta`
- `stages: tuple[RelationshipStage, ...]`

阶段阈值严格递增并落在上下界内；初始好感必须能映射到至少一个阶段。

`RelationshipEffect`

- `character_id`
- `affinity_delta`
- `reason`
- `set_flags: tuple[str, ...]`

效果必须同时包含非零变化或至少一个关系标记，并引用同一 StoryWorld 的 Character。

### 角色与玩家身份

`Character`

- Schema 已确认的 `id`、`story_world_id`、`name`、`motive`、`secret`、`voice`、`current_situation`、`opening_line`
- `relationship_rules: RelationshipRules`

`PlayerRole`

- `id`
- `story_world_id`
- `name`
- `gender`
- `background`
- `entry_reason`
- `character_visible_information: tuple[str, ...]`

P0 StoryWorld 恰好一个 PlayerRole，由 StoryWorld 直接持有。

### 剧情图

`StoryChoice`

- `id`
- `label`
- `next_node_id`
- `is_key`
- `required_flags`
- `blocked_flags`
- `set_flags`
- `relationship_effects`

`StoryNode`

- `id`
- `narration`
- `choices`
- `ending_id: str | None`

`StoryChapter`

- `id`
- `title`
- `entry_node_id`
- `nodes`

`StoryEnding`

- `id`
- `title`
- `summary`

`StoryWorld`

- Schema 已确认的 `id`、`title`、`summary`、`genre`、`publication_status`、`content_version`
- `entry_chapter_id`
- `player_role`
- `characters`
- `chapters`
- `endings`
- `canon_entries`

节点 ID 和选择 ID 在整个 StoryWorld 内唯一，允许选择跨章节指向节点。这样 StoryRun 只需存 `current_chapter_id + current_node_id`，事件也能用稳定 choice ID 回放。

## 4. ID 作用域

| ID | 唯一范围 |
|---|---|
| StoryWorld | Registry |
| Character | Registry 内 Character 类型 |
| PlayerRole | Registry 内 PlayerRole 类型 |
| Chapter / Node / Choice / Ending / CanonEntry | 所属 StoryWorld |
| RelationshipStage | 所属 Character |
| Story flag / relationship flag | 所属 StoryWorld 运行语义，不作为实体 ID |

所有 ID 必须是去除首尾空白后仍非空的 string。注册表不自动 trim 或重命名。

## 5. 校验架构

### 单一入口

`StoryWorldRegistry.__init__(story_worlds: Iterable[StoryWorld])` 先把输入复制为 tuple，再按固定顺序执行：

1. 验证对象类型、必需文本、枚举和数值边界。
2. 验证 Registry 级 StoryWorld / Character / PlayerRole 唯一 ID。
3. 验证 StoryWorld 内章节、节点、选择、结局和正史 ID。
4. 验证所有同世界引用。
5. 从入口节点遍历图，验证全节点可达、无非终局死路且至少一个结局可达。
6. 验证 published 内容没有待核验条目。
7. 构造只读 ID mapping。

不在 dataclass `__post_init__` 分散校验。这样所有加载路径只在 Registry 边界验证一次，错误也拥有一致的 code/path。

### 错误合同

`StoryContentValidationError(ValueError)` 暴露：

- `code`: 稳定机器可断言值，例如 `duplicate_id`、`missing_reference`、`invalid_publication_status`
- `path`: 具体字段路径，例如 `story_worlds[0].chapters[0].nodes[1].choices[0].next_node_id`
- message: 面向开发者的简短说明，不包含秘密或运行时玩家数据

非法内容一律拒绝，不提供默认 StoryWorld、自动 ID、状态降级或引用修复。

## 6. 剧情图规则

- StoryWorld `entry_chapter_id` 必须存在；该章节的 `entry_node_id` 必须属于该章节。
- 所有 Choice `next_node_id` 必须存在。
- 非终局节点至少一个 Choice；终局节点必须有合法 `ending_id` 且没有 Choice。
- 所有 Ending 至少被一个可达终局节点引用。
- 从世界入口节点遍历 Choice 边，所有节点必须可达，且至少一个终局可达。
- 循环合法；“所有节点都能到达结局”不作为本任务约束，避免禁止有意设计的拒绝 / 停留循环。运行时退出策略由后续 API 任务负责。
- `required_flags` 与 `blocked_flags` 不得重叠；同一 tuple 内不能重复或出现空标记。

## 7. 注册表 API

```python
class StoryWorldRegistry:
    def __init__(self, story_worlds: Iterable[StoryWorld]) -> None: ...
    def get(self, story_world_id: str) -> StoryWorld | None: ...
    def require(self, story_world_id: str) -> StoryWorld: ...
    def all(self) -> tuple[StoryWorld, ...]: ...
    def published(self) -> tuple[StoryWorld, ...]: ...
```

- 构造后没有 add/update/delete。
- 内部 dict 使用 `MappingProxyType`，输入 iterable 被复制为 tuple。
- `require()` 对未知 ID 抛出 `KeyError`；这不是内容校验错误。
- Registry 不做 API 序列化、缓存、数据库查询或热更新。

## 8. 两个验证样例

任务级脚本构造：

1. 一个含固定史实来源的最小历史样例。
2. 一个只含剧情设定的最小原创样例。

两者使用 `example_` 前缀、简短内容和单角色单章节，不引用安妮、魏观海、萧明珠或正式 StoryWorld ID。脚本还构造独立无效对象覆盖 PRD 失败矩阵，并断言 `code` 与 `path`。

## 9. 兼容与迁移

- 新模块不 import `core.default_spaces`、`core.gameplay`、Space contracts 或 infrastructure。
- 旧模块暂时继续运行；本任务不注册新 API，因此不会改变线上行为。
- 后续 P0 故事任务把正式内容构造成这些 dataclass，再创建生产注册表。
- 后续运行时任务只能消费已通过 Registry 校验的对象，不能接收原始 dict 绕过校验。

## 10. 风险与回滚

### 风险

- 过早定义过多字段会挤压后续运行时设计：本任务只保留已确认且运行最小闭环需要的字段。
- 过度宽松会让错误内容进入运行时：所有引用和图完整性在 Registry 构造时失败。
- 当前工作区的 `default_spaces.py` 有未提交改动：本任务明确不触碰该文件。

### 回滚

本任务没有数据库、API 或线上行为变化。回滚只需移除新 domain 模块和任务级验证脚本，并恢复 WORLD_SCHEMA 对嵌套结构的占位描述；旧系统继续原样运行。
