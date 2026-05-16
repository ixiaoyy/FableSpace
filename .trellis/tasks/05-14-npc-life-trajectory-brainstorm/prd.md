# Brainstorm: NPC 人生轨迹（Life Trajectory）

## Goal

- 让每个 NPC 拥有可追溯、可确认的“人生轨迹”：出生/锚点、关键经历、关系变化、跨空间见闻与当前阶段。
- 轨迹用于增强 NPC 长期连续性和店主管理，而不是让平台自动替店主写正史。
- MVP 优先复用现有 `StateCard / Canon Ledger`、`TavernCharacter`、`simulation_state`、`social_memories`，避免新增 Schema。

## Source of truth / constraints

- `docs/WORLD_SCHEMA.md`: `TavernCharacter` 兼容 SillyTavern；`StateCard` 是长期连续性台账；chat/group chat 只能生成 `pending` 候选。
- `docs/ARCHITECTURE.md`: StateCard 不进入公开 Tavern payload，不覆盖 `TavernCharacter` / `WorldInfoEntry` / 访问规则 / LLM 配置。
- `docs/WHAT_NOT_TO_BUILD.md`: 不做平台绕过店主确认发布内容、无边界社交、端到端散文式不可落库 AI 输出、战斗/等级/装备/排行榜。
- 现有代码：`backend/src/fablemap_api/core/tavern.py` 已有 `current_tavern_id`、`home_tavern_id`、`simulation_state`、`traits`、`social_memories`；`backend/src/fablemap_api/core/state_cards.py` 已有可确认状态卡。

## In scope

- NPC 维度的时间线视图：按 `character_id` 聚合已确认/待确认的轨迹事件。
- 轨迹事件来源：
  - 店主手动创建的角色履历事件；
  - chat / group chat 生成的 `pending` 候选，确认后进入轨迹；
  - 仿真/流动产生的“可观察事件”只作为候选或近期动态，不自动变成正史。
- 轨迹事件类型建议先作为 `StateCard.metadata.life_event_type` 约定：`origin`、`milestone`、`relationship`、`location_visit`、`memory`、`turning_point`、`current_arc`。
- Owner 管理侧展示：角色详情里出现“人生轨迹”分组，支持确认/忽略候选、手动补事件。
- Prompt 注入：只注入 `status=confirmed` 且满足现有 StateCard 过滤规则的简短可观察摘要。

## Out of scope

- 不新增 `TavernCharacter` 固定字段，不自动改写角色卡描述、性格、世界书或开场白。
- 不把轨迹作为公开社交资料、访客动态墙、排行榜或跨空间私信。
- 不做“平台自动生成 NPC 一生并发布”；AI 只能给候选，店主/有权限访客确认后才成为正史。
- 不做传统 RPG 成长数值、等级、装备、战斗履历。
- 不做大规模全局实时 NPC 轨迹地图；跨空间流动可保留为后续任务。

## Approaches

### A. StateCard-only timeline（推荐 MVP）

复用现有 `StateCard`，用 `category=character/event_log` + `character_id` + `metadata.life_event_type` 表示轨迹事件。前端按 NPC 聚合展示。

- Pros: 最小改动；直接继承 pending/confirmed/rejected/superseded、权限、私有桶与 Prompt 过滤规则；不破坏 SillyTavern 角色卡。
- Cons: 轨迹类型依赖 metadata 约定，查询/统计能力有限。

### B. 新增 `NpcLifeEvent` 持久模型

新建专用表/API：强类型事件、时间轴、来源、权限、确认状态。

- Pros: 查询清晰，后续可做轨迹编辑、导出、分析。
- Cons: 需要 Schema / migration / API / docs / 测试；与 StateCard 重叠，容易形成两个正史来源。

### C. Prompt-only biography assembler

不落库，只在对话时从角色字段、已确认 StateCard、记忆摘要临时拼装“人生履历”。

- Pros: 最快，无持久化改动。
- Cons: 无法审计/回放/确认；不满足“轨迹”作为产品能力的可管理性。

## Chosen approach

选择 **A. StateCard-only timeline** 作为 MVP。

MVP 定义：

1. 轨迹事件本质仍是 `StateCard`，不新增核心 Schema。
2. `metadata.life_event_type` 只是受控约定，不改变现有状态卡状态机。
3. 默认 owner-only 管理视图；访客可见性另开任务评审。
4. Prompt 只读取已确认且符合现有 StateCard prompt 过滤规则的短摘要，防止 pending 候选污染 NPC 人设。
5. 仿真/流动事件先作为“近期动态/候选”，不能直接写入 NPC 正史。

## Affected files/layers for implementation

- Backend
  - `backend/src/fablemap_api/core/state_cards.py`: 如需，增加 life-event metadata 规范化 helper。
  - `backend/src/fablemap_api/application/services/state_cards.py`: 复用现有创建/决策流程，必要时补 `character_id` / category 过滤测试。
  - `backend/src/fablemap_api/application/services/runtime.py`: 聊天候选生成时可标记 `metadata.life_event_type`，但仍为 pending。
  - `.trellis/spec/backend/state-card-api-contract.md`: 若实现 metadata 约定，需要补充契约与测试矩阵。
- Frontend
  - `frontend/app/lib/taverns.ts`: 如需补充 `life_event_type` metadata 类型。
  - `frontend/app/product/OwnerStateCardPanel.jsx` 或新 `frontend/app/features/npc-life-trajectory/`: 按 NPC 展示轨迹、候选与确认动作。
  - `frontend/app/product/CharacterEditor.jsx` / owner management route: 入口与角色详情集成。
  - `.trellis/spec/frontend/*`: 若新增 UI 边界，补一份 focused spec。

## Validation plan

Brainstorm-only 本轮：

- 检查 task PRD 已写入 `.trellis/tasks/05-14-npc-life-trajectory-brainstorm/prd.md`。
- 不运行 build/test，因为未改代码。

若进入实现：

- Backend: `py -3 -m compileall -q backend/src`；状态卡相关行为跑 `tests/test_tavern_state_cards.py` 与 `backend/tests/test_v1_state_cards.py` 的聚焦用例。
- Frontend: `npm --prefix .\frontend run build`；如改 API helper/服务规则，补/跑 focused script 或 `npm --prefix .\frontend test`。
- UI 可见改动：Playwright 桌面 + 窄屏自验收，截图/报告写入任务记录或最终汇报。

## Open questions

- 默认是否只给店主看？建议 MVP owner-only；访客公开人生轨迹需要单独设计可见性。
- 是否允许“访客确认自己的 visitor-scope 轨迹事件”？建议只允许成为个人连续性，不进入 tavern/NPC 固定正史。
- 是否需要导出到 SillyTavern 角色卡？建议 MVP 不写入角色卡，仅后续提供可选 sidecar/Markdown 导出。

## Completion Note (2026-05-16)

This task is complete as a brainstorm-only deliverable. No implementation was added because the task scope explicitly says requirements and implementation approach only; a separate implementation Trellis task is required before coding the NPC life trajectory UI/API.
