# brainstorm: 增加抽卡抽角色玩法

## Goal

探索在 FableMap 空间主线中加入“抽卡 / 抽角色”式轻玩法的可行 MVP：让用户以有趣的方式发现或获得 NPC 互动入口，同时必须保留真实坐标、店主主权、SillyTavern 角色卡兼容、无平台充值/结算和无传统 RPG 化的边界。

## What I already know

* 用户明确要求使用 Trellis 头脑风暴来增加“抽卡抽角色玩法”。
* FableMap 主线是：坐标 / 定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
* 现有产品允许店主手动创建、导入 SillyTavern 角色卡，或生成未发布 AI 草稿并由店主确认后保存。
* 现有 `GameplayDefinition` / `GameplaySession` 支持店主发布轻量文本玩法，访客通过专用 Gameplay API 开始、推进、完成或放弃。
* 现有“玩法模板库”已经证明：模板只能生成本地草稿，店主检查并保存/发布后访客才可见。
* 仓库已有系统角色预设、AI 角色草稿、批量背景 NPC 预览、角色 Prompt 风险检查、NPC 头像/精灵图和 Tavern NPC Stage 相关能力。
* 当前工作区已有大量未提交改动；本 brainstorm 只新增/维护 Trellis 任务文档，不直接改代码。
* 2026-05-06 用户补充：空间内可以存在隐藏角色；抽卡可随机抽到隐藏角色；抽到普通角色时增加好感度；好感度提升后逐步解锁更多互动玩法。
* 2026-05-06 用户选择混合方案：抽卡既可以抽到“空间卡”，也可以抽到“角色卡”；两类卡分别拥有独立好感度。
* 2026-05-06 用户选择隐藏角色解锁方式：抽中隐藏角色后，永久解锁给当前访客。
* 2026-05-06 用户选择抽卡频率：每日一次免费抽。
* 2026-05-06 用户选择权重策略：公益/系统空间默认采用阶段权重；店主空间可自由配置权重，也可选择默认阶段权重。
* 2026-05-06 用户选择空间卡效果：空间卡包含互动卡、隐藏角色线索卡、空间好感卡三类子类型。
* 2026-05-06 用户选择角色卡效果：抽中后先展示角色结果卡片，由访客选择进入聊天或角色专属玩法。
* 2026-05-06 用户选择隐藏角色配置方式：角色管理中标记角色隐藏/抽卡解锁，卡池配置中再设置权重和出现条件。
* 2026-05-06 用户选择 MVP 实现深度：真实后端 + API + 持久化。
* 2026-05-06 用户选择抽卡进度存储方式：独立 `_gacha_progress` 私有桶。

## Constraints from authoritative docs

* 不做平台绕过店主确认自动生成/发布空间内容、NPC、世界书或故事。
* 不做平台级 Token 充值、结算、抽成或 Token 市场。
* 不做无真实坐标的自由空间；空间仍必须锚定真实坐标。
* 不做战斗、等级、装备、竞技排行榜或可交易奖励。
* 访客间无边界社交仍不做；若涉及公开关系、认领、展示，必须保持空间内、角色内、店主审批内。
* Gameplay 会话是访客私有运行时数据，不进入公开 Tavern payload；店主内容定义可随空间导出。
* NPC / TavernCharacter 数据应优先兼容 SillyTavern 角色卡字段和可导出性。

## Assumptions (temporary)

* “抽卡”更适合被重新诠释为“抽取一次空间内的角色邂逅 / 今日值班 NPC / 互动玩法入口”，而不是付费卡池或稀有度攀比。
* MVP 应优先无付费、无真实货币、无可交易资源、无概率商业化，避免把产品带向博彩/氪金方向。
* 若允许店主配置卡池，也应先生成草稿或选择既有角色；抽到的结果不能自动创建或修改 TavernCharacter。

## Open Questions


## Requirements (evolving)

* 抽卡结果必须来自店主已确认的角色 / 预设 / 玩法定义，或只作为未发布草稿供店主确认。
* MVP 不包含付费、充值、稀有度售卖、交易、排行榜、等级装备。
* 抽卡应能解释为空间内的仪式（例如今日邂逅、命运牌、吧台抽签、值班轮盘），服务进入对话与回访。
* 必须记录随机选择的可回放 seed 或事件，避免“抽到什么”不可复现。
* 抽卡 MVP 以访客端“角色邂逅”为核心：普通结果进入已确认角色互动，稀有/特殊结果可揭示店主预先配置的隐藏角色。
* 隐藏角色仍然必须由店主创建、导入或确认后保存；平台不得在访客抽卡时即时生成并发布隐藏 NPC。
* 抽到普通角色时可给对应关系增加少量好感；好感变化应有上限、节流和可解释来源，避免靠反复抽卡刷满。
* 好感提升后解锁的内容优先是轻量互动入口、专属问候、GameplayDefinition 入口或话题提示，不是装备、战力、交易奖励。
* 隐藏角色和解锁玩法的展示必须保护访客私有进度：其他访客不能看到“某访客抽到了谁 / 解锁了什么”。
* 抽卡结果类型分为至少两类：`tavern_card`（空间卡）与 `character_card`（角色卡）；两者都不代表可交易资产，只是当前空间内的互动入口/关系进度。
* 空间卡好感度表示“访客与这间空间的熟悉度 / 归属感”，可复用或扩展现有 `VisitorState.relationship`。
* 角色卡好感度表示“访客与某个 NPC 的熟悉度”，MVP 需要新增私有 per-character affinity 结构，或在 VisitorState 私有扩展中按 character_id 保存。
* 抽到空间卡时增加空间好感，并解锁空间级互动：例如隐藏角色线索、吧台仪式、回访信笺、整间空间的特殊入口。
* 抽到角色卡时增加该角色好感，并解锁角色级互动：例如专属问候、角色委托、私密话题、角色绑定的 Gameplay。
* 隐藏角色抽中后对当前访客永久解锁；该解锁状态是访客私有进度，不改变其他访客视图，也不把隐藏角色变成全空间公开角色。
* 已永久解锁的隐藏角色后续应能在该访客的空间角色列表 / 抽卡记录 / 专属入口中再次访问。
* 店主仍应能撤下、停用或删除隐藏角色；访客已解锁记录遇到角色被停用时展示“暂不可见/已离席”而不是泄露已删除内容。
* 抽卡频率采用“每个访客 × 每间空间每日一次免费抽”；每日边界按空间时区优先，缺失时按服务器/客户端统一日期兜底。
* 好感增量也按每日抽卡节流：每日免费抽可产生空间卡/角色卡好感，重复访问不能无限刷好感。
* 免费抽是产品互动节奏，不引入付费补抽、充值、购买次数或平台结算。
* 卡池权重支持两种策略：`stage_default`（阶段权重）与 `owner_custom`（店主自定义权重）。
* 公益空间 / 系统空间默认使用 `stage_default`：随着空间好感、角色好感或已解锁状态变化，隐藏角色/高阶互动的出现概率提高。
* 普通店主空间可选择 `stage_default`，也可切换为 `owner_custom` 并配置空间卡、普通角色卡、隐藏角色卡等条目的权重。
* 店主自定义权重仍必须受安全边界限制：不能配置付费概率、不能售卖稀有度、不能绕过店主确认自动生成角色，隐藏角色仍必须是店主已确认内容。
* 权重配置需要可解释：访客端可用“今日更容易遇见熟悉的人/有隐藏传闻”这类叙事文案，不展示商业化抽卡概率诱导。
* 空间卡支持三类子类型：`interaction`（空间级互动卡）、`hidden_clue`（隐藏角色线索卡）、`affinity_boost`（空间好感卡）。
* 空间互动卡应启动或推荐店主已发布的空间级 Gameplay / 回访信笺 / 吧台仪式，不创建新内容。
* 隐藏角色线索卡只给出店主确认范围内的线索或氛围提示；线索不等于直接公开隐藏角色详情，除非抽中的是隐藏角色卡本身。
* 空间好感卡主要提升 tavern-scoped affinity，并可推动阶段权重和空间级解锁。
* 角色卡抽中后先展示结果卡片，不自动发送消息、不自动进入玩法；访客可选择“去聊天”或“进入角色专属玩法”。
* 角色结果卡片应显示安全的公开信息：角色名、头像/剪影、简短提示、好感变化、可用下一步；隐藏角色首次抽中时作为揭示仪式展示。
* 若该角色没有已发布专属玩法，则只展示聊天入口和“暂无专属玩法/好感提升后再来”的安全文案。
* 隐藏角色配置采用组合方式：TavernCharacter 层有“隐藏/抽卡解锁”标记；抽卡卡池层配置该隐藏角色的权重、出现条件和线索文案。
* 未标记隐藏的角色默认为普通可见角色；标记隐藏的角色在未解锁访客的公开/访客 payload 中不直接出现。
* 卡池配置不能把不存在、未确认或已删除的角色作为可抽条目；保存时需校验 character_id。
* 若店主取消隐藏标记，该角色可按普通角色显示；若重新隐藏，已解锁访客是否保留访问权应在实现设计中明确，推荐保留但受 owner 停用/删除优先级控制。
* MVP 需要真实后端、API 和持久化：每日抽卡、抽卡历史、隐藏角色永久解锁、空间好感、角色好感、卡池配置都不能只停留在前端本地状态。
* API 必须区分 owner 配置接口与 visitor 抽卡接口：非 owner 不能修改卡池/隐藏标记；visitor 只能读取自己的抽卡状态和解锁结果。
* 公开/匿名 payload 默认不暴露隐藏角色详情；owner payload 可管理隐藏角色；visitor payload 仅在对应访客已解锁后返回可访问隐藏角色。
* 抽卡进度、角色好感、隐藏角色解锁和每日抽卡状态使用独立 `_gacha_progress` 私有桶存储；不混入公开 Tavern payload。
* `VisitorState.relationship` 保持空间级好感的主来源；`_gacha_progress[visitor_id].character_affinity[character_id]` 保存角色级好感。
* `_gacha_progress` 至少需要保存：`last_draw_date`、`last_draw_result`、`unlocked_hidden_character_ids`、`character_affinity`、简短 `draw_history`。

## Acceptance Criteria (evolving)

* [ ] 方案明确选择目标用户路径：访客抽 / 店主配 / 两者兼有。
* [ ] 方案明确抽取来源、概率/权重、结果展示、重复结果、访客隐私和持久化边界。
* [x] 隐藏角色解锁方式已确认：抽中后永久解锁给当前访客，作为访客私有进度。
* [x] 隐藏角色访客解锁状态存储位置已确认：独立 `_gacha_progress` 私有桶。
* [x] 隐藏角色 payload 边界已确认：公开/匿名不暴露；owner 可管理；已解锁访客可见。
* [x] 方案选择混合好感：tavern-scoped 空间好感 + character-scoped 角色好感并存。
* [x] 抽卡频率已确认：每个访客 × 每间空间每日一次免费抽；不做付费补抽。
* [x] 权重策略已确认：系统/公益空间默认阶段权重；店主可自定义权重或选择阶段权重。
* [ ] 方案明确空间卡 / 角色卡的卡池配置、好感增量和重复抽取处理。
* [x] 空间卡效果已确认：互动卡 / 隐藏角色线索卡 / 空间好感卡三类子类型。
* [x] 角色卡结果行为已确认：先展示结果卡片，再由访客选择聊天或角色专属玩法。
* [x] 隐藏角色配置入口已确认：角色管理标记隐藏，卡池配置权重/出现条件。
* [x] MVP 实现深度已确认：真实后端 + API + 持久化。
* [ ] 方案明确好感度解锁哪些互动玩法，并说明这些玩法仍由店主发布或确认。
* [ ] 方案说明如何复用现有 `TavernCharacter`、`GameplayDefinition`、`GameplaySession` 或角色草稿能力。
* [ ] 方案列出明确 Out of Scope，覆盖付费、充值、交易、排行榜、战斗/等级/装备、平台自动发布内容。
* [ ] 若进入实现，前端 build 和相关脚本测试纳入验证；若有用户可见视觉/交互，需 Playwright 桌面 + 窄屏自验收。

## Definition of Done (team quality bar)

* Tests added/updated where behavior changes.
* Frontend build / relevant scripts pass for UI/service changes.
* Backend compile/tests pass for API/schema changes.
* Docs / Trellis notes updated if behavior or schema changes.
* Rollout/rollback and data compatibility considered if persistence changes.

## Technical Notes

### Docs inspected

* `docs/PRODUCT_BRIEF.md`: owner-authored taverns, SillyTavern import, AI drafts must be owner-confirmed.
* `docs/FABLEMAP_TAVERN_PLATFORM.md`: tavern/NPC/chat/LLM/token core model and “不做平台付费/充值系统”。
* `docs/WHAT_NOT_TO_BUILD.md`: no auto-publication, no platform token payment, no unanchored spaces, no unbounded social, no combat/levels/equipment/ranking.
* `docs/ARCHITECTURE.md`: `GameplayDefinition` / `GameplaySession`, character management, preset preview, skill packs, AI Director fallback.
* `docs/WORLD_SCHEMA.md`: Tavern contains `characters`, `gameplay_definitions`; Gameplay sessions private; StateCard changes pending; NPC public bond requires approval.

### Existing implementation touchpoints likely relevant

* Backend: `backend/src/fablemap_api/core/tavern.py` (`TavernCharacter`, `Tavern.gameplay_definitions`, private `_gameplay_sessions`, owner-only character writes).
* Backend: `backend/src/fablemap_api/core/gameplay.py` (normalization, deterministic fallback seed, gameplay event/session model).
* Frontend: `frontend/app/product/CharacterManagementModal.jsx` (manual add, preset draft, AI draft, import, batch preview, risk linter, save requires owner action).
* Frontend: `frontend/app/product/systemCharacterPresets.js` (system preset characters and `createCharacterDraftFromPreset`).
* Frontend: `frontend/app/product/GameplayManager.jsx` and `ownerGameplayTemplates.js` (template library generates local draft, owner saves/publishes later).
* Frontend: `frontend/app/product/TavernGameplayLauncher.jsx` / `GameplaySessionPanel.jsx` (visitor entry and session UI).
* API client: `frontend/app/lib/taverns.ts` for tavern/character/gameplay service methods.
* Affinity: `backend/src/fablemap_api/core/affinity.py` 已有 6 阶段好感度、对话/玩法完成加成、阶段解锁话题；`docs/WORLD_SCHEMA.md` 中 `VisitorState.relationship` 当前绑定 `visitor_id + tavern_id`。
* Current storage: `backend/src/fablemap_api/core/tavern.py` 的 `_visitors` 私有桶保存 VisitorState；`GameplaySession.character_id` 可把一局玩法关联到某个角色，但当前 GameplayDefinition 本身没有显式 affinity gate 字段。
* Risk/decision: 用户已选择混合好感，因此实现阶段需要同时保留 tavern-scoped affinity 与新增/扩展 character-scoped affinity；后者必须存为访客私有进度，不应写入公开 TavernCharacter。
* Hidden unlock storage candidate: visitor-private bucket under tavern record, e.g. `_visitors[visitor_id].unlocked_hidden_character_ids` or a dedicated `_gacha_progress` bucket keyed by visitor; final design should choose one to avoid leaking hidden NPCs in public payloads.
* Draw cadence storage candidate: same visitor-private progress should include `last_draw_date`, `last_draw_result`, and compact result history for audit/debug; never store paid currency or purchase counters.
* Weight config candidate: public tavern content stores only owner-visible/owner-authored card pool config; visitor-specific stage-default weight calculation reads private tavern affinity, character affinity, and unlocked hidden character IDs.
* Schema pressure: TavernCharacter currently has no documented `visibility`/`hidden` field; adding one would be a schema/API change requiring WORLD_SCHEMA/spec/tests, or MVP could store hidden status in a separate owner-only gacha config mapping character IDs. User preference favors both, so design must decide the least disruptive representation.

### Initial feasible directions

**Approach A: Visitor “Today’s Encounter” draw (recommended starting point)**

* Draw from already-published characters in the current tavern and start/resume chat or a lightweight gameplay session.
* Pros: matches discovery/chat loop, no schema change likely, no platform content generation, low monetization risk.
* Cons: less useful for taverns with 0–1 character unless fallback copy handles it.

**Approach B: Owner “Character Draft Capsule” tool**

* Store a themed pool of system presets / AI draft prompts; owner draws one as an editable character draft, then explicitly saves.
* Pros: helps creators add cast members, reuses AI draft/preset pipeline, strong owner sovereignty.
* Cons: more creation-tool than visitor gameplay; needs careful wording to avoid auto-generated content.

**Approach C: Tavern Gameplay “Fate Card” template**

* Add a gameplay template where each draw produces a prompt/event/material within a `GameplaySession`, not a new NPC.
* Pros: directly reuses GameplayDefinition/Session and deterministic seed; great for “轻玩法”.
* Cons: does not literally “抽角色” unless combined with character selection.

## Refined Direction from 2026-05-06 User Input

Current preferred product shape:

### Decision: Gacha progress storage boundary

User chose the dedicated private-bucket approach. Draw progress and character affinity should be stored under a private `_gacha_progress` bucket keyed by `visitor_id`, not embedded directly into public TavernCharacter and not represented as GameplaySession.

Recommended shape:

```json
{
  "_gacha_progress": {
    "visitor_123": {
      "last_draw_date": "2026-05-06",
      "last_draw_result": { "type": "character_card", "character_id": "...", "result_id": "..." },
      "unlocked_hidden_character_ids": ["char_hidden_1"],
      "character_affinity": {
        "char_a": { "strength": 0.2, "stage": "acquaintance", "updated_at": "..." }
      },
      "draw_history": []
    }
  }
}
```

Tavern-level affinity remains in existing `VisitorState.relationship`; `_gacha_progress` owns per-character affinity, hidden unlocks, and draw cadence/history.

### Decision: Real backend/API/persistence MVP

User chose a real implementation depth for MVP: draw cadence, draw result, hidden-character unlock, tavern affinity, character affinity, and owner card-pool config must persist through backend APIs. A frontend-only prototype is out of scope for this task once implementation begins.

Implementation implication:

* Add owner-side configuration APIs for card pool / hidden draw settings.
* Add visitor-side APIs for draw status and daily draw execution.
* Persist visitor-private draw progress and affinity.
* Update tests/docs for any TavernCharacter, VisitorState, or gacha-progress schema changes.

### Decision: Hidden character owner configuration

User chose a combined owner configuration model:

* Character management owns the character-level visibility flag: normal vs hidden / draw-unlocked.
* Card-pool configuration owns draw behavior: weight, stage condition, clue copy, and whether the hidden character can appear under the selected weight mode.

This keeps TavernCharacter as the source of truth for whether a character is hidden, while avoiding hard-coding every hidden character into a global pool. Card-pool saves must validate referenced character IDs and must not allow drawing unpublished/generated-but-unconfirmed characters.

### Decision: Character card result flow

User chose a result-card-first flow. When a character card is drawn, the UI should reveal a card and let the visitor choose the next action instead of automatically starting chat or gameplay. This preserves agency and makes hidden-character reveals feel intentional.

Result card should include:

* character identity or hidden-character reveal state,
* affinity delta / current stage,
* primary action: chat with this NPC,
* secondary action: start/resume a character-linked Gameplay if available,
* safe unavailable state if the owner disabled the character or no gameplay is published.

### Decision: Tavern card subtypes

User chose to include all three tavern-card effects. Tavern cards should be a family of place-level cards rather than a single reward type:

* `interaction`: points the visitor into an owner-published place-level interaction or Gameplay.
* `hidden_clue`: gives a clue toward hidden characters without revealing private hidden-character payload by default.
* `affinity_boost`: increases tavern-level affinity and helps stage-default weights evolve.

Implementation implication: tavern-card results need a subtype field and a safe payload shape. They should reference existing tavern/gameplay/owner-authored text, not generate new tavern canon on draw.

### Decision: Weight policy

User chose a combined policy:

* Public welfare / system taverns use stage-based default weights by default. As affinity and unlock state grow, the draw pool can naturally surface hidden characters or higher-touch interactions more often.
* Owner-created taverns can either use the same stage-based default weights or switch to owner-custom weights.
* Owner-custom weights let the tavernkeeper tune the relative chance of tavern cards, normal character cards, hidden character cards, and specific entries, but must not become paid probability design.

Implementation implication: card-pool config should have a `weight_mode` like `stage_default | owner_custom`. For `owner_custom`, weights should be validated, normalized, and stored as owner-authored tavern configuration. For `stage_default`, weights can be computed at draw time from visitor-private affinity/unlock state.

### Decision: Daily free draw cadence

User chose one free draw per day. Interpret this as `visitor_id + tavern_id + local_date` cadence, not a monetized energy system. It should create a return-visit ritual while preventing affinity farming. No paid extra draws, recharge, purchase, pity monetization, or platform settlement are in scope.

Implementation implication: draw progress needs to remember the visitor's last draw date and result history privately. Tavern timezone should be used if already available; otherwise use a consistent server/client date fallback.

### Decision: Hidden character unlock persistence

User chose permanent per-visitor unlock: when a visitor draws a hidden character, that hidden character becomes accessible to that same visitor going forward. This unlock must be stored as visitor-private progression, not as a mutation to the public tavern character list.

Implications:

* Public/anonymous tavern payload should not reveal hidden character details before unlock.
* Owner/private payload can still manage hidden characters.
* Visitor-specific payload can include unlocked hidden characters for that visitor only.
* If owner later disables/deletes a hidden character, unlocked visitors should see a safe unavailable state rather than stale character content.

### Decision: Hybrid tavern-card + character-card affinity

User chose a hybrid model: draws can produce either tavern cards or character cards, and both card families carry affinity. This means MVP should not be “one global gacha meter”. It needs two private progression lanes:

* Tavern affinity: visitor-to-tavern familiarity, suitable for whole-place unlocks and hidden-character hints.
* Character affinity: visitor-to-character familiarity, suitable for NPC-specific greetings, topics, requests, and character-linked gameplay.

Recommended technical bias: keep `VisitorState.relationship` as the canonical tavern-level affinity, then add a private character-affinity map keyed by `character_id` rather than overloading global TavernCharacter fields.


1. 店主在空间内配置普通角色与隐藏角色；隐藏角色必须是已确认 TavernCharacter，不由平台在抽卡瞬间生成。
2. 访客在单个空间内抽“邂逅卡”：
   * 抽到普通角色：展示角色卡片、进入聊天/玩法，并产生受控好感增量。
   * 抽到隐藏角色：揭示一次特殊邂逅，允许进入该隐藏角色的对话或专属玩法。
3. 好感度越高，解锁越多互动玩法：例如专属开场、回访信笺、角色委托、隐藏角色线索、结缘申请入口。
4. 解锁内容优先复用 `GameplayDefinition` / `GameplaySession` 和现有 Affinity 阶段；新增字段需谨慎评估。

Design tension to resolve next: existing `VisitorState.relationship` is tavern-scoped, but “抽到普通角色增加好感度”听起来更像 character-scoped。MVP 可以先用空间好感降低复杂度，也可以新增 per-character affinity 以提高表达力。

### Current Recommended Approach: Daily Tavern Encounter Draw

Recommended MVP direction based on decisions so far:

* One daily free draw per visitor per tavern.
* Draw result can be a tavern card or a character card.
* Tavern cards increase tavern affinity and unlock place-level interactions.
* Tavern cards have three subtypes: interaction, hidden-character clue, and tavern-affinity boost.
* Character cards increase per-character affinity and unlock NPC-level interactions.
* Character card results show a card first, then let the visitor choose chat or character-linked gameplay.
* Hidden character cards permanently unlock that hidden NPC for the current visitor.
* System/public-welfare taverns default to stage-based weights; owner taverns can choose stage default or custom weights.

## Technical Approach Options to Converge

**Approach A: Extend `_visitors[visitor_id]` with gacha fields**

* Store tavern affinity in existing `VisitorState.relationship`.
* Add `character_affinity`, `unlocked_hidden_character_ids`, `last_draw_date`, and compact draw history into the visitor state payload.
* Pros: one visitor-private record; easy to return with enter/draw status.
* Cons: `VisitorState` grows beyond its current documented schema; requires careful backward compatibility and docs.

**Approach B: Dedicated `_gacha_progress` private bucket (recommended)**

* Keep `VisitorState.relationship` for tavern-level affinity.
* Store per-character affinity, hidden unlocks, draw cadence, and draw history under `_gacha_progress[visitor_id]`.
* Store owner-authored card-pool config on Tavern, separate from visitor progress.
* Pros: clear boundary; avoids overloading VisitorState; easier to hide from public payload and evolve.
* Cons: one more private bucket and API normalization path.

**Approach C: Use GameplaySession as the draw record**

* Represent each daily draw as a specialized GameplaySession/event.
* Pros: reuses existing event/session persistence and seed pattern.
* Cons: draw progress is not really a gameplay session; harder to query daily status and hidden unlocks; risks mixing draw history into gameplay UX.

Decision: Approach B is selected. Use dedicated `_gacha_progress` for draw progress/per-character affinity/hidden unlocks, while keeping existing `VisitorState.relationship` as tavern-level affinity and `GameplayDefinition` for unlocked interactions.

## Proposed MVP Design Summary

**Goal**: Add a daily tavern encounter draw that can reveal tavern cards or character cards, with persistent tavern/character affinity and per-visitor hidden character unlocks.

**Core loop**:

1. Visitor enters a real-coordinate tavern.
2. Visitor can perform one free daily draw in that tavern.
3. Backend chooses from the tavern's card pool using either stage-default or owner-custom weights.
4. Result is one of:
   * tavern card: interaction / hidden clue / tavern affinity boost;
   * normal character card: result card + character affinity boost;
   * hidden character card: result card + permanent per-visitor unlock + character affinity.
5. Visitor sees a result card and chooses next action: chat, start/resume linked Gameplay, or close.
6. Affinity and unlock progress persist privately.

**Owner controls**:

* Character management: mark a character as normal or hidden/draw-unlocked.
* Gacha/card-pool settings: choose stage-default or owner-custom weights; configure tavern-card entries, character-card entries, hidden clues, and appearance conditions.
* Owner content still follows owner sovereignty: only existing/confirmed TavernCharacter and published/owner-authored GameplayDefinition can be drawn.

**Data boundary**:

* Tavern-level affinity: existing `VisitorState.relationship`.
* Character-level affinity + hidden unlocks + daily draw state: private `_gacha_progress[visitor_id]`.
* Owner card-pool config: Tavern-owned configuration, validated against existing characters/gameplays.
* Public payload: no hidden character details before unlock.

**API shape (draft)**:

* Owner: `GET/PUT /api/v1/taverns/{id}/gacha-config`
* Visitor: `GET /api/v1/taverns/{id}/gacha/status`
* Visitor: `POST /api/v1/taverns/{id}/gacha/draw`

**Verification needs**:

* Backend tests for daily cadence, hidden unlock privacy, owner config validation, stage-default/custom weights, affinity persistence.
* Frontend tests for service methods and result-card flow.
* Frontend build and Playwright desktop/mobile self-acceptance for visible UI.

## Out of Scope (draft)

* Paid gacha, token recharge, card packs, pity monetization, revenue share, platform settlement.
* Tradable rewards, inventory economy, rarity leaderboard, competitive ranking.
* Auto-creating or auto-publishing TavernCharacter without owner confirmation.
* Combat, levels, equipment, loot progression.
* Cross-tavern social graph or visitor-to-visitor trading.

## Approval

* 2026-05-06: 用户已确认本 PRD/MVP 设计可以作为后续实现方案。


## Implementation Plan

* 2026-05-06: 实施计划已落盘到 `.trellis/tasks/05-05-character-gacha-gameplay-brainstorm/implementation-plan.md`。当前尚未改业务代码；后续实现将按 dedicated `_gacha_progress`、`Tavern.gacha_config`、`TavernCharacter.visibility/unlock_mode`、owner/visitor API 分层推进。

## 2026-05-12 Closure Note

This task is closed as `brainstorm_complete`. Closed as brainstorm/design complete: PRD contains user-approved MVP boundaries, data/API sketch, implementation plan, and explicit non-goals. No production code was implemented in this brainstorm task.

Deferred / not done:
- Backend/frontend gacha implementation remains a future dedicated task; no gacha API/schema/UI was added here.
