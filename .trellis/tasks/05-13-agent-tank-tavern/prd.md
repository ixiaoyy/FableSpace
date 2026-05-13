# brainstorm: agent tank tavern

## Goal

评估并收敛一个“AgentTank 类 AI 坦克大战”如何作为 FableMap 的游戏工坊类酒馆补充体验：玩家不直接操控坦克，而是观察战斗表现、向 Agent 提出策略方向、由 Agent 修改战斗逻辑，再回战场迭代。

## What I already know

* 用户提供的参考产品是浏览器中的 Agent 驱动坦克对战：坦克有出生技能和独特外观，战场公开参数/函数，玩家通过 Agent 改写坦克战斗逻辑，并基于胜负复盘迭代。
* FableMap 当前主线是：坐标/定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
* FableMap 核心约束：真实地图锚点、主人主权、平台不绕过店主自动发布内容、Token 由店主承担、数据尽量可导出/兼容。
* `docs/WHAT_NOT_TO_BUILD.md` 明确排除平台级战斗系统、等级装备、竞技排行榜、传统 RPG 游戏化，以及无锚点自由空间。
* 现有 `GameplayDefinition` 支持店主发布轻量结构化玩法；`GameplaySession` 是访客私有运行时状态，不进入公开 Tavern payload。
* 现有 `layout_style='quest-play'` 可表达玩法型空间；`place_type='board-game'` 可表达现实桌游/游戏工坊地点语义。新增 `special_type` 属于协议层变更，目前仅支持空值、`cultivation`、`divination`。

## Assumptions (temporary)

* “补充这种游戏”优先理解为：在 FableMap 中承载 AgentTank 的工坊/复盘/角色化引导层，而不是把 FableMap 改造成原生坦克竞技平台。
* AgentTank 的真实战斗引擎、代码执行沙盒、排行榜/对局撮合最好保持在外部系统或独立模块，不进入 FableMap 核心主线。
* FableMap 侧可存储经用户/店主确认的复盘摘要、策略方向、NPC 互动记录，但不应自动改写店主正史或公开内容。

## Open Questions

* 第一批“NPC 对战”应优先支持哪一类游戏：确定性棋/牌/谜题、轻动作对战、还是 AgentTank 类策略竞技？

## Requirements (evolving)

* AgentTank 类内容若进入 FableMap，必须锚定真实坐标，表现为某个店主创建的“游戏工坊/战术酒馆/俱乐部空间”。
* 店主决定空间内容、NPC、活动说明、外部游戏入口和访问规则；平台不自动发布坦克、赛制、NPC 或故事内容。
* FableMap 不应在 MVP 内执行不可信玩家代码；战斗逻辑运行和代码沙盒应由 AgentTank 外部服务处理。
* FableMap 可以提供 NPC 教练、裁判、装备工匠等角色来做教学、复盘、战术建议和版本记录。
* 复盘结果可作为 `pending` 状态卡/玩法事件候选，用户或店主确认后才进入长期连续性。
* 用户确认的新方向：希望建设 FableMap 自有 Web 游戏库，并允许访客与酒馆 NPC 对战。
* “对战”应先定义为 tavern-local 的小局体验：NPC 以角色身份担任对手/主持人，游戏局绑定单个空间和单个访客会话，不形成平台级竞技系统。
* 自有游戏库优先复用现有 `tavernMiniGames.js` / `GameplayDefinition` 思路：模板、规则说明、局内状态、结算文案、NPC 语气，而不是先做大型游戏引擎。
* MVP 需要避免不可信代码执行；游戏逻辑应由项目内白名单游戏模块实现，NPC 只能通过受控 action/choice 或策略 JSON 参与。

## Acceptance Criteria (evolving)

* [ ] 方案说明清楚区分 FableMap 承载的“空间/工坊/复盘层”和 AgentTank 承载的“战斗/代码执行层”。
* [ ] 方案不引入平台级战斗系统、等级装备、竞技排行榜或无锚点空间。
* [ ] 方案能复用现有 Tavern、TavernCharacter、WorldInfoEntry、GameplayDefinition、StateCard 思路，尽量不先改 Schema。
* [ ] 若未来需要内嵌对战或新增 `special_type`，必须另开协议/API/安全评审任务。
* [ ] 自有 Web 游戏库的 MVP 明确“游戏目录 / 局内状态 / NPC 行动接口 / 结算写回”四个边界。
* [ ] NPC 对战不暴露 owner API key、不让 NPC 自动修改店主角色卡或空间内容、不产生平台级排行榜。

## Definition of Done (team quality bar)

* 头脑风暴结论得到用户确认。
* 如进入实现，补充小切片 PRD / implementation plan。
* 涉及前端 UI 时运行 `npm --prefix .\frontend run build`，视觉/交互改动另做 Playwright 桌面+窄屏自验收。
* 涉及后端/API/Schema 时运行 `py -3 -m compileall -q backend/src` 和相关 pytest，并更新权威文档/规范。

## Out of Scope (explicit)

* 不在本 brainstorm 中实现代码。
* 不把 FableMap 做成坦克大战引擎。
* 不做平台级天梯、竞技排行榜、匹配、下注/付费、等级装备系统。
* 不在 FableMap 后端直接执行玩家提交的 JavaScript/Agent 代码。
* 不新增 Schema 字段或枚举，除非后续单独确认协议变更。
* MVP 不做多人实时 PVP、跨空间匹配、战斗资产商城或复杂物理引擎。

## Technical Notes

* 依据文档：`README.md`、`docs/INDEX.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/ARCHITECTURE.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/AI参与开发协议.md`、`.trellis/workflow.md`。
* 相关规范：`.trellis/spec/backend/index.md`、`.trellis/spec/frontend/index.md`、`.trellis/spec/backend/database-guidelines.md`、`.trellis/spec/backend/special-tavern-types.md`、`.trellis/spec/frontend/component-guidelines.md`、`.trellis/spec/frontend/quality-guidelines.md`、`.trellis/spec/guides/cross-layer-thinking-guide.md`。
* 推荐优先复用：`layout_style='quest-play'`、`place_type='board-game'` 或普通 `tavern`、`gameplay_definitions`、NPC 角色卡、WorldInfo、StateCard pending/confirmed 机制。
* 已检查现有前端游戏相关文件：`frontend/app/product/tavernMiniGames.js`、`TavernMiniGamePanel.jsx`、`ownerGameplayTemplates.js`、`GameplayDefinitionEditor.jsx`、`GameplaySessionPanel.jsx`，以及脚本测试 `frontend/scripts/mini-games-test.mjs`、`gameplay-test.mjs`。
* 现有模板库已有“桌游/博弈”类别，但测试明确禁止战斗、等级、装备、排行或交易奖励；后续若做“NPC 对战”，应命名为“小局 / 对局 / 竞技练习 / 逻辑对战”，并保留非排行榜、非成长装备边界。

## Research Notes

### What similar tools/patterns imply

* 这种 Agent 游戏的核心不是手速，而是“观察 → 假设 → 改策略 → 回放验证”的迭代闭环。
* 对 FableMap 来说，最有价值的是把冷冰冰的代码竞技变成“有地点、有 NPC、有社群仪式感的工坊”。

### Feasible approaches here

**Approach A: 复盘教练酒馆（Recommended）**

* How it works: FableMap 创建一个 AgentTank 工坊空间；访客粘贴/导入对局摘要或外部 replay 链接；NPC 教练分析输赢原因，帮玩家形成给 Agent 的策略 brief；用户确认后保存为状态卡或玩法事件。
* Pros: 最符合空间主线；不需要 FableMap 执行代码；可复用 NPC/chat/gameplay/state-card；安全边界清楚。
* Cons: 对战画面和真实代码迭代不在 FableMap 内完成，沉浸感弱一些。

**Approach B: 内嵌对战入口 + 酒馆复盘**

* How it works: FableMap 空间内嵌 AgentTank 外部页面/iframe，旁边保留 NPC 复盘面板和 Agent Guide；对战、代码执行、TANK KEY 仍由外部服务处理。
* Pros: 体验更连续，用户在一个空间内看战斗和问 NPC。
* Cons: 需要 iframe/跨域/身份传递/隐私边界设计；要防止把外部游戏变成 FableMap 核心。

**Approach C: FableMap 原生 Agent Arena（Not recommended for MVP）**

* How it works: FableMap 自己实现坦克战斗、代码沙盒、赛制、排行榜等。
* Pros: 完整控制体验。
* Cons: 明显偏离主线；触碰战斗/竞技排行榜/代码执行沙盒等高风险范围；与负面清单冲突，除非作为独立产品而非 FableMap 主线。

**Approach D: 自有 Web 小游戏库 + NPC 对手（New preferred direction）**

* How it works: FableMap 内置一组白名单 Web 小游戏，每个游戏有固定规则、局内状态和 NPC 行动接口；访客在酒馆内选择 NPC 对战，NPC 的人格与策略影响行动和台词，结算只写入本空间/本访客的会话摘要或 pending 状态卡。
* Pros: 符合用户想做“自己的 web 游戏库”的方向；能让 NPC 从聊天角色变成可互动对手；可从现有 mini-game/template/gameplay 体系小步扩展。
* Cons: 需要明确安全边界和游戏 DSL/接口；若走动作/实时对战，会比文字/棋牌/谜题复杂很多。

## Decision Update — 2026-05-13

用户确认：先做简单的 NPC 对战闭环，复杂能力放到未来 Trellis 任务演化。

### MVP Scope: Simple NPC Duel v0

优先做“规则非常简单、胜负可验证、能快速证明 NPC 可以成为对手”的小局：

1. **猜拳心理战**（推荐首个落地）
   - 规则简单：rock / paper / scissors。
   - NPC 可用角色性格影响出招倾向和台词。
   - 胜负由本地规则函数确定，不由 LLM 编造。
   - 适合验证：开始对局 → NPC 出招 → 结算 → NPC 复盘。

2. **三连棋 / 井字棋**（第二个简单游戏）
   - 有棋盘状态和合法落子。
   - NPC 可使用简单策略：能赢则赢、能堵则堵、否则偏好中心/角落/随机。
   - 适合验证：局内状态渲染、合法行动校验、胜平负判断。

### Future Trellis Evolution Tasks

复杂能力不进入当前 MVP，实现时另开 Trellis 任务：

1. **Tavern Web Game Library v1**
   - 游戏目录、启用/禁用、游戏详情页、店主选择哪些游戏出现在酒馆。

2. **Turn-based Tank Board Game**
   - 回合制坦克棋：格子、障碍、朝向、移动、开火、冷却、技能。
   - 仍不执行用户上传代码。

3. **Agent Strategy Arena**
   - Agent 根据公开参数输出策略 JSON 或 DSL，而不是任意 JS。
   - 后端/前端规则引擎验证合法 action。

4. **Replay + NPC Review**
   - 对局回放、NPC 复盘、策略建议、确认后写入 pending/confirmed StateCard。

5. **Optional External AgentTank Bridge**
   - 如未来接入外部 AgentTank，只做外部 replay/link/iframe 边界，不把其代码沙盒并入 FableMap 核心。

### Updated Out of Scope for MVP

* 不做实时动作游戏。
* 不做平台级排行榜、匹配、PVP、等级装备或奖励经济。
* 不做任意代码执行、用户 JS 上传或 Agent 自动改代码。
* 不新增持久 Schema；优先用现有 mini-game / gameplay session / chat prompt 路径或前端本地小局验证。

### Proposed Implementation Slice

PR1: `NPC Duel v0: 猜拳心理战`

* 新增/扩展前端小游戏模板与面板，允许从酒馆 NPC 发起一局猜拳。
* 用纯函数判断胜负。
* NPC 台词通过现有 chat / prompt 机制或本地 fallback 文案生成。
* 增加脚本测试覆盖模板 ID、规则函数、胜负矩阵、组件接线。
* 验证：`npm --prefix .\frontend test` + `npm --prefix .\frontend run build`。

PR2: `NPC Duel v0.1: 三连棋`

* 增加棋盘状态、合法落子、胜负判断和简单 NPC 策略。
* 继续保持 tavern-local、visitor-session-local，不进入排行榜。

## MVP Progress — 2026-05-13

Completed the first simple slice as child task `.trellis/tasks/05-13-npc-duel-rps/`:

* Added `NPC 猜拳心理战` to the tavern mini-game surface.
* Exposed it in the current native tavern chat workbench route.
* Kept complex systems deferred to future child tasks:
  * `.trellis/tasks/05-13-tavern-web-game-library/`
  * `.trellis/tasks/05-13-turn-based-tank-board-game/`
  * `.trellis/tasks/05-13-agent-strategy-arena/`
  * `.trellis/tasks/05-13-replay-npc-review/`

Validation evidence is recorded in the child task PRD and `artifacts/playwright/npc-duel-rps/report.md`.
