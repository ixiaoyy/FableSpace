# brainstorm: 修仙在线离线挂机文字加图片游戏

## Goal

围绕“修仙 + 在线/离线挂机 + 文字加图片”的游戏体验做 Trellis 头脑风暴，判断它应如何落在 FableMap 的空间主线内，或是否应作为独立方向拆分；最终收敛到一个不违背真实坐标、主人主权、SillyTavern 兼容、无平台付费/充值、无传统 RPG 战斗/等级装备的可实现 MVP。

## What I already know

* 用户明确要求使用 Trellis 头脑风暴。
* 用户想探索“修仙”题材、“在线/离线挂机”的游戏循环，以及“文字 + 图片”版本。
* FableMap 当前主线是：坐标 / 定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
* FableMap 已有 `GameplayDefinition` / `GameplaySession` 用于店主发布轻量文字玩法；玩法会话是访客私有运行时数据，不进入公开 Tavern payload。
* 仓库已有“玩法模板库”经验：模板只能生成店主可确认的玩法草稿，不自动发布内容。
* 仓库已有“抽卡抽角色玩法” brainstorm，可复用其中“每日一次、访客私有进度、好感 / 解锁、无付费卡池”的边界。
* 图片相关交付必须遵守 `docs/IMAGE_ASSETS_SPEC.md` 和 `.trellis/spec/frontend/image-asset-guidelines.md`：正式图片必须落到项目路径，并有 prompt sidecar；不能只留在 `.codex/generated_images` 或聊天预览。
* 当前工作区已有大量未提交变更；本轮先做 brainstorm / PRD 留痕，不直接实现代码或生成正式项目图片。

## Constraints from authoritative docs

* 不做平台绕过店主确认自动生成 / 发布空间、NPC、世界书或故事。
* 不做平台级 Token 充值、结算、抽成或 Token 市场。
* 不做脱离真实坐标的自由空间；若在 FableMap 内落地，“洞府 / 宗门 / 秘境 / 修行馆”仍必须挂接真实地图坐标或现实地点隐喻。
* 不做无边界访客社交、全局在线状态、陌生人匹配或私信。
* 不做传统 RPG 战斗、等级装备、竞技排行榜、可交易奖励。
* “修仙境界 / 灵力 / 法宝”等词需要谨慎转译：可作为叙事阶段、心境标签、回访仪式或空间内关系进度；不得变成战力数值、装备系统、排行榜或付费养成。
* AI 只能在店主确认的内容和安全边界内主持对话 / 玩法；图片生成若成为项目资产，需要 prompt-first、项目路径和 sidecar。

## Assumptions (temporary)

* 若留在 FableMap 主线内，最合适的解释不是“独立修仙网游”，而是“真实坐标上的洞府 / 茶馆 / 山门 / 修行空间”，访客在空间内通过文字、NPC、图像卡片和回访纪要进行轻量修行。
* “在线挂机”可以理解为用户在页面内进行短时文字事件 / NPC 指引 / 选择分支；“离线挂机”可以理解为每日回来领取一段由规则生成的修行纪要、图片卡或回访事件，而不是实时多人在线或刷资源。
* “文字 + 图片版本”可以先做为 UI/内容规格：事件文本 + 场景图/角色图/修行卡面/回访图；是否真实生成图片应另设资源任务。

## Open Questions

* “离线挂机”更偏向哪种节奏：按现实时间自然推进、每日一次回访结算、还是店主配置的阶段事件？
* 图片版本的 MVP 是先做图片槽位/示例资源，还是要真实生成并落盘一组可用资产？

## Requirements (evolving)

* 必须保留真实坐标锚点和店主确认边界。
* 修仙体验应服务“进入空间、与 NPC 对话、写回记忆、回访反馈”，而不是替换主线为传统网游。
* 在线/离线进度必须是访客私有运行时数据，不进入公开 Tavern payload。
* 文字事件应可落库、可回放、可测试；AI 输出不可直接成为无法追踪的一次性散文。
* 若使用图片，正式项目图片必须有项目内路径、尺寸/hash 验证和 prompt sidecar。
* MVP 明确不包含：付费加速、充值抽卡、装备、战斗、竞技排行、访客间交易、全局在线社交。

## Acceptance Criteria (evolving)

* [x] 明确选择目标形态：作为 FableMap 内的一种特殊空间 / 修行空间类型，并为后续更多空间类型与多玩法集成预留轻量扩展点。
* [ ] 明确在线循环：用户在线时做什么、每轮多长、如何通过文字/NPC/选择推进。
* [ ] 明确离线循环：离线期间如何计算、回访时展示什么、是否有上限和节流。
* [ ] 明确图片范围：占位/已有资产/真实生成，以及项目落盘与 sidecar 要求。
* [ ] 明确数据边界：哪些是店主内容定义，哪些是访客私有进度。
* [ ] 明确与现有 `GameplayDefinition` / `GameplaySession` / `VisitorState.relationship` / 抽卡 PRD 的复用关系。
* [ ] 明确 Out of Scope，覆盖传统 RPG、付费、交易、排行、平台自动发布内容。
* [ ] 若进入实现，列出前端 build、脚本测试、后端 compile/pytest、以及 Playwright 桌面 + 窄屏自验收计划。

## Definition of Done (team quality bar)

* Tests added/updated where behavior changes.
* Frontend build / relevant scripts pass for UI/service changes.
* Backend compile/tests pass for API/schema changes.
* Docs / Trellis notes updated if behavior or schema changes.
* Rollout/rollback and data compatibility considered if persistence changes.

## Technical Notes

### Docs and task context inspected

* `docs/PRODUCT_BRIEF.md`: FableMap 是空间 UGC 平台，内容由店主创作/确认，核心闭环是地图空间与 NPC 对话。
* `docs/FABLEMAP_TAVERN_PLATFORM.md`: 强调真实锚点、主人主权、AI 草稿必须经店主确认、Token 由店主自行承担。
* `docs/WHAT_NOT_TO_BUILD.md`: 禁止平台自动发布内容、平台 Token 充值/结算、无锚点自由空间、访客无边界社交、传统 RPG 战斗/等级装备/排行榜。
* `docs/WORLD_SCHEMA.md`: `VisitorState.relationship` 是访客与空间关系；`GameplayDefinition` 是店主内容，`GameplaySession` 是访客私有运行时数据；玩法不等于战斗/等级/装备/排行榜。
* `docs/IMAGE_ASSETS_SPEC.md` and `.trellis/spec/frontend/image-asset-guidelines.md`: 正式图片必须项目内落盘、同目录 sidecar、hash/尺寸验证。
* `.trellis/tasks/04-30-gameplay-template-library-for-owners/prd.md`: 轻量玩法模板通过本地草稿 + 店主保存发布，避免 RPG 化。
* `.trellis/tasks/05-05-character-gacha-gameplay-brainstorm/prd.md`: 可复用每日节奏、访客私有进度、好感/解锁、无付费抽卡边界。

### Initial feasible directions

**Approach A: FableMap “洞府/修行空间”轻挂机模板（recommended）**

* How it works: 店主把一个真实坐标配置成洞府、山门茶馆、夜市卦摊或修行驿站；访客在线时与 NPC/玩法节点互动，离线后下次回访获得一段修行纪要、心境变化或图文卡片。
* Pros: 最贴合 FableMap 主线，能复用 Tavern、NPC、Gameplay、VisitorState、图片资产规范。
* Cons: 需要克制“境界/资源/法宝”表达，避免滑向传统 RPG。

**Approach B: 独立“文字 + 图片修仙挂机游戏”设计案**

* How it works: 暂时不绑定 FableMap 架构，先写一份独立游戏循环、数值与视觉规格，用作外部产品概念。
* Pros: 设计自由度高，更接近用户字面“在线离线挂机游戏”。
* Cons: 与当前仓库主线冲突更大，后续若要落地到 FableMap 需要二次转译。

**Approach C: 两阶段方案：先做概念，后转译为 FableMap 空间模板**

* How it works: 先用 1 页概念稿定义修仙挂机幻想，再马上标注哪些可进 FableMap、哪些必须删改；最终只实现可兼容部分。
* Pros: 不压制创意，同时保留项目边界。
* Cons: Brainstorm 时间更长，容易产出不可实现内容，需要后续收敛。

## Expansion Sweep

### Future evolution

* 可演化为店主可选的“主题玩法模板”：修行、占卜、夜巡、心境记录、回访图文纪念。
* 图片可从静态卡面逐步演化为角色表情、地点卡、修行札记图，但每一步都需要资产规范和验收。

### Related scenarios

* 与“抽卡抽角色玩法”共享每日节奏、隐藏角色/线索、好感解锁，但避免付费抽卡。
* 与现有 Gameplay 模板库共享店主确认流程，访客进度保持私有。

### Failure & edge cases

* 离线收益不能无限累积或鼓励刷号；需要上限、节流和可解释结算。
* 图片不能暴露真实私人地址、真实人物相似、品牌/Logo 或未授权 IP。
* AI 生成的修行纪要不能自动改写店主设定、不能生成现实危险行动、不能替代医疗/法律/金融建议。

## Out of Scope (draft)

* 付费加速、充值、抽卡付费、代币结算、平台抽成。
* 战斗、战力、等级装备、法宝装备栏、竞技排行榜、交易市场。
* 脱离真实坐标的开放修仙大世界。
* 访客好友、公会聊天、跨空间陌生人社交、全局在线状态。
* 平台自动生成并发布 NPC、世界书、剧情或图片资产。

## Decisions

### 2026-05-06: Target product shape

用户选择 Approach A：作为 FableMap 内的一种特殊空间来设计，而不是独立修仙挂机网游。当前名称可暂定为“修行空间 / 洞府空间 / 问道茶馆”类型。

Implications:

* MVP 必须挂接真实坐标，保持 Tavern / Place 主体不变。
* “修仙挂机”作为空间内玩法包和页面表现方式，不替代 FableMap 主链路。
* 后续可以扩展更多特殊空间类型，例如占卜空间、侦探空间、短剧空间、公益分诊空间、关系图谱空间等。
* 需要预留轻量的“空间类型 + 玩法包”抽象，但 MVP 不应先做复杂插件市场、泛游戏框架或跨空间在线系统。
* 修行空间内的进度仍是访客私有运行时数据；店主负责确认 NPC、世界书、玩法定义和图像资产。

### Recommended next convergence point

下一步应收敛 MVP 深度：是只做一个修行空间模板，还是同时做一层轻量的特殊空间类型配置。推荐采用“薄类型层 + 修行玩法包”：Tavern 仍是核心实体，只增加可展示/筛选/初始化模板的 `special tavern type` 观念；具体互动仍复用 Gameplay / NPC / VisitorState。

### 2026-05-06: MVP depth

用户选择“薄类型层 + 修行玩法包”。当前建议将其理解为：

* 薄类型层：在现有 Tavern / Place 基础上增加可筛选、可展示、可初始化模板的特殊空间类型能力；不要先做完整插件市场或泛游戏框架。
* 修行玩法包：提供一组店主可确认的修行主题默认内容，包括 tavern copy、NPC/世界书建议、GameplayDefinition 模板、离线回访纪要规则和图文卡槽位。
* 后续其它特殊空间类型复用同一抽象：类型只决定展示、默认模板和可用玩法包，不自动生成或发布店主内容。

Code context checked:

* `backend/src/fablemap_api/core/tavern.py` already has `place_type`, `layout_style`, `gameplay_definitions`, and a finite `PLACE_TYPES` set.
* Current `PLACE_TYPES` includes `tavern`, `cafe`, `milk-tea-shop`, `restaurant`, `convenience-store`, `bookstore`, `school`, `hospital`, and `home`; no cultivation-like type exists yet.
* `layout_style` currently supports `lobby`, `npc-chat`, `quest-play`, and `hybrid-room`, so a cultivation tavern can likely use `quest-play` without introducing a new layout style in MVP.

Preliminary technical recommendation:

* Use a new narrow type value such as `cultivation-retreat` only if the implementation is willing to update schema/docs/tests/frontend option lists.
* Otherwise, lower-risk MVP can keep `place_type="tavern"` or `cafe` and add a theme/play-pack marker in owner-confirmed metadata/templates. Final implementation design should choose one explicitly.

## Reference Capture: 修炼酒馆参考图（2026-05-08）

用户提供两张参考图，用于继续收敛“修炼的酒馆”：

### Reference A: NPC 野外历练回执

截图要点：

* “韩天尊 / 浪浪山的猪毛剧 / 野外历练”式消息卡。
* NPC 或玩家触发“野外历练”，系统回报一段短叙事结果。
* 结果包含明确收益：例如“获得修为 +24000”“获得【一截灵眼之树】x1”。
* 文案强调“不牵连其他修士”，可理解为单人 / 私有 / 不影响他人。

可转译到 FableMap 的方向：

* 作为“修行空间”的**历练回执 / 闭关纪要 / NPC 归来札记**，服务回访动机。
* 收益应是访客私有、不可交易、不可排行的“进境值 / 心境记录 / 灵物线索卡”，而不是战力、装备或付费资源。
* “灵眼之树”这类物品更适合作为**故事线索卡 / 纪念卡 / 世界书触发线索**，不做可交易库存或装备栏。
* “不牵连其他修士”应成为边界：不做 PvP、不偷取、不跨访客竞争、不影响其他访客进度。

### Reference B: LINUX DO Connect 信任级别要求面板

截图要点：

* 一个清晰的“信任级别 3 的要求”面板。
* 顶部有状态标签“未达到”。
* 中部用环形进度展示核心指标：访问天数、浏览话题、浏览帖子。
* 下方用进度条展示互动参与：回复、点赞、获赞、获赞天数、获赞用户、合规记录等。

可转译到 FableMap 的方向：

* 作为“境界 / 心境 / 道行阶段”的**突破条件面板**，让访客知道下一步该做什么。
* 指标应绑定本空间内行为：回访天数、与 NPC 对话轮次、完成修行节点、阅读札记、获得店主确认的留言/回执等。
* 不要照搬平台级论坛社交指标；尤其不要做全局点赞、用户声望、排行榜或社交信用系统。
* UI 可借鉴“少量核心圆环 + 多条要求进度 + 顶部状态”的结构，避免修仙玩法变成隐藏数值黑箱。

## Refined Cultivation Tavern Concept（2026-05-08）

推荐把修炼酒馆的 MVP 收敛为：

**“真实坐标上的修行空间：访客与 NPC 对话/历练，回访时获得私有修行回执，并通过清晰的突破条件面板理解下一步。”**

核心模块：

1. **历练回执**
   * 访客选择一个店主已配置的 NPC 或玩法节点触发“问道 / 打坐 / 野外历练 / 读札记”。
   * 系统返回短叙事结果、私有进境值、1 个可展示但不可交易的线索/纪念卡。
   * 回执进入访客私有记录，可回放，不自动改写店主正史。

2. **突破条件面板**
   * 用明确的要求说明“下一心境/境界还差什么”。
   * 指标优先来自本空间内可解释行为：回访、对话、完成节点、确认回执。
   * 状态为“未达 / 可突破 / 已突破”，避免复杂等级、战力和排行。

3. **店主确认边界**
   * 店主决定空间主题、NPC、世界书、玩法定义和可出现的灵物/线索池。
   * 平台可以提供模板草稿，但不得自动发布 NPC、世界书或剧情。

4. **私有进度边界**
   * 修为/进境/灵物线索默认是访客私有运行时数据。
   * 不进入公开 Tavern payload，不参与跨访客交易、偷取、竞技或排行榜。

### MVP candidate options

**Option 1: 历练回执优先**（strongly recommended）

* 先做一个“出门历练/闭关回执”的短循环：触发 -> 回执 -> 私有记录 -> 下次回访可看。
* 优点：最贴近第一张参考图，也最符合 FableMap 的 NPC 对话与回访主线。
* 风险：如果没有要求面板，长期目标感会弱一些。

**Option 2: 突破条件面板优先**

* 先做一个“下一境界要求”面板，复用已有访客状态/玩法数据展示进度。
* 优点：最贴近第二张参考图，可解释性强。
* 风险：如果缺少有趣回执，容易变成普通仪表盘。

**Option 3: 细切片同时包含两者**

* 做一个极薄闭环：一次历练回执 + 一个下一境界要求卡。
* 优点：既有事件反馈，也有长期目标。
* 风险：实现面可能触及 UI、玩法定义、访客私有进度和测试，需严格控范围。

### Current recommendation

采用 **Option 3 的极薄版本**：只定义 1 个历练动作、1 种私有进境值、1 张线索/纪念卡、1 个下一境界要求卡。这样既保留“野外历练”的爽感，又避免先做完整修仙数值系统。

## Trellis Todo Backlog

Created on 2026-05-06 under this brainstorm parent:

* `.trellis/tasks/05-06-special-tavern-type-thin-layer/` — P1 — thin special tavern type layer.
* `.trellis/tasks/05-06-cultivation-tavern-play-pack-mvp/` — P1 — owner-confirmed cultivation play pack MVP.
* `.trellis/tasks/05-06-cultivation-offline-return-loop/` — P1 — visitor-private online/offline return loop.
* `.trellis/tasks/05-06-cultivation-text-image-card-slots/` — P2 — text + image card slots and asset rules.
* `.trellis/tasks/05-06-special-tavern-type-roadmap/` — P3 — future special tavern type roadmap.

Recommended implementation order:

1. Thin type layer.
2. Cultivation play pack MVP.
3. Offline return loop.
4. Text/image cards.
5. Future type roadmap.

## 2026-05-12 Closure Note

This task is closed as `brainstorm_complete`. Closed as brainstorm parent complete after child implementation/planning slices were completed or explicitly deferred. Parent does not itself add production code.

Deferred / not done:
- Any remaining cultivation roadmap expansion should be handled as new child tasks.
