# 定义系统故事内容模型

## Goal

建立角色故事平台的只读系统内容领域模型和注册表，使后续 P0 故事、玩家状态、运行时 API 与前端都能引用同一套经过严格校验的 StoryWorld 内容，而不继续依赖旧 Space、owner、坐标、SillyTavern 或通用 Gameplay 合同。

## Background

- 权威合同已统一到 `StoryWorld`、`Character`、`PlayerRole`、`PlayerStoryState`、`StoryRun` 和 `CharacterRelationship`。
- 当前后端仍以可变 dict、旧 Space 种子和 `core/gameplay.py` 为主；旧 Gameplay 会为非法状态提供默认值或静默归一，不适合作为经过审核、版本化发布的系统故事边界。
- `apps/api/requirements.txt` 没有单独声明数据建模依赖；领域层现有轻量策略模块使用标准库，仓库也已有 `@dataclass(frozen=True, slots=True)` 模式。
- 当前仓库不保留 pytest 目录，既有复杂合同使用 Trellis 任务目录中的定向验证脚本。
- 安妮宽街和雪夜封宫的正式内容分别由后续 P0 故事任务迁移。本任务的两个最小样例只用于构造和失败矩阵验证，不进入公开注册表。

## Requirements

### 1. 不可变领域类型

- 在 `apps/api/src/fablespace_api/domain/` 新建独立 StoryWorld 内容模块。
- 使用标准库 `Enum`、`dataclass(frozen=True, slots=True)`、tuple 和只读 mapping；不新增依赖。
- 定义 `PublicationStatus`、正史分类、`StoryWorld`、`Character`、`PlayerRole`、章节、节点、选择、结局、关系阶段、关系规则和关键选择关系效果。
- StoryWorld 必须显式保存入口章节、内容版本、固定 PlayerRole、角色、章节、结局与正史条目。
- 不定义 PlayerStoryState、StoryRun 数据库模型、消息存储或 API payload。

### 2. 最小可执行剧情骨架

- 每个 StoryWorld 至少包含一个章节、一个入口节点、一个可达结局和一个角色。
- 选择使用稳定 ID 指向下一节点，可声明是否为关键选择、所需 / 阻断故事标记、写入故事标记和角色关系效果。
- 关系规则必须定义内部好感上下界、初始值、自然对话单次变化上限和故事专属关系阶段。
- 关键选择的关系效果必须绑定同一 StoryWorld 的 Character，包含变化值、原因和可选关系标记。
- 结局由终局节点引用；终局节点不得继续提供选择。

### 3. 严格注册表校验

- 提供无添加、更新、删除方法的只读 `StoryWorldRegistry`。
- 注册表构造时一次性校验所有字段、ID、引用、发布状态、内容版本、关系范围和剧情图。
- 非法输入必须抛出带稳定错误代码、字段路径和可读说明的 `StoryContentValidationError`；不得静默修正、补默认值或降级为 draft。
- StoryWorld、Character 和 PlayerRole ID 在同一注册表的各自实体类型中全局唯一；章节、节点、选择、结局和正史条目 ID 在所属 StoryWorld 内唯一。
- Character、PlayerRole、关系效果、章节入口、选择目标和终局引用不得跨 StoryWorld 或指向不存在的对象。
- 从入口节点不可达的节点、无可达结局、非终局死路和带选择的终局节点必须被拒绝。
- published StoryWorld 不得包含 `待核验` 正史条目；固定史实必须带至少两个非空来源。

### 4. 内容读取边界

- 注册表提供按 StoryWorld ID 查询、必取、列出全部和列出 published 内容的只读接口。
- 返回值保持原始不可变对象，不暴露可修改的内部 dict 或 list。
- 本任务不创建生产级全局注册表，也不迁移当前 `default_spaces.py`；后续 P0 故事任务负责实例化正式内容注册表。

### 5. 文档同步

- 用本任务最终类型更新 `docs/WORLD_SCHEMA.md` 中章节、选择、结局、正史和关系规则的占位描述。
- 不修改 README、产品简报、平台边界或前端文档。
- 旧 `Space`、`GameplayDefinition` 等只在迁移 / 禁止语境出现，不作为新模块依赖。

### 6. 定向验证

- 在当前 Trellis 任务目录提供可执行验证脚本。
- 两个最小 StoryWorld 样例必须通过同一注册表构造。
- 至少验证并拒绝：错误 Character 引用、重复 ID、缺失 PlayerRole、非法发布状态、错误节点 / 结局引用、published 待核验正史。
- 运行 Python compileall 和定向验证脚本。

## Acceptance Criteria

- [ ] 两个最小样例通过 StoryWorldRegistry 校验并可通过只读接口查询。
- [ ] 错误角色引用、重复 ID、缺失 PlayerRole 和非法发布状态均以稳定验证错误被拒绝。
- [ ] 错误节点 / 结局引用、不可达节点、非终局死路和 published 待核验正史被拒绝。
- [ ] 注册表与领域对象不暴露可变 list / dict，也没有运行时写入接口。
- [ ] 领域类型和模块引用不包含坐标、owner、密码、SillyTavern、Space 或旧 Gameplay 字段。
- [ ] `docs/WORLD_SCHEMA.md` 与实际类型、ID 作用域和失败边界一致。
- [ ] `py -3 -m compileall -q apps/api/src` 通过。
- [ ] 任务级定向构造验证通过并输出稳定成功标记。

## Out of Scope

- 迁移安妮宽街或雪夜封宫的正式内容。
- 数据库表、迁移、PlayerStoryState、StoryRun 和 CharacterRelationship 持久化。
- 身份解析、LLM 配置、聊天 / 选择 API 或前端。
- 删除、改写或适配 `default_spaces.py`、旧 Space API、旧 Gameplay 或已有开发数据。
- JSON / YAML 内容加载器、管理后台、热更新或用户编辑能力。

## Technical Notes

- 领域对象只接受已构造的可信 Python 内容，不负责解析外部 dict 或请求 payload。
- 所有跨对象校验集中在注册表构造边界，避免每个消费者重新解释内容合同。
- 章节图允许循环，但从 StoryWorld 入口出发必须能到达至少一个结局，且所有节点都可达。
- 两个验证样例使用非生产 ID，不得被 API、种子或后续正式注册表引用。
