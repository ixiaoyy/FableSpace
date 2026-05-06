# brainstorm: 设计酒馆软货币与礼物系统

## Goal

在 FableMap 的赛博酒馆主线中设计一个轻量、非付费、非交易的“酒馆软货币 + 礼物 + 好感度 + 有限额外抽卡”系统：访客通过完成店主已发布的酒馆玩法/任务获得酒馆内纪念币，用纪念币购买店主配置的礼物送给 NPC，推动角色好感与互动解锁；也可以在严格限额下兑换额外抽卡券，延长回访节奏。设计必须避开平台充值、结算、抽成、交易市场和传统 RPG 化。

## What I already know

* 用户希望“做任务可以获得金币”。
* 用户希望“金币可以购买礼物送给 NPC，刷好感度”。
* 用户希望“金币也可以额外抽卡”。
* 项目已有 Tavern / TavernCharacter / VisitorState / GameplayDefinition / GameplaySession 等基础模型；`VisitorState` 已有酒馆级 relationship strength/stage。
* 既有玩法系统 `GameplayDefinition` 已有 completion reward_text，但当前没有可结算的货币、礼物或钱包系统。
* 前一个抽卡 brainstorm 已确认：混合抽卡（酒馆卡 + 角色卡）、隐藏角色由店主配置、每个访客 × 每间酒馆每日一次免费抽、抽卡进度存 `_gacha_progress` 私有桶，并明确“不做付费补抽/充值/购买次数”。
* 这次“金币额外抽卡”会改变前一个抽卡 PRD 的边界，因此只能设计成非充值、任务获得、每日/每周限额、不可交易的 bonus draw voucher，而不能做付费补抽或无限买次数。

## Constraints from authoritative docs

* `AGENTS.md`：主人主权优先；酒馆内容、角色、氛围、访问规则由店主决定。
* `AGENTS.md` / `docs/WHAT_NOT_TO_BUILD.md`：Token 由店主自行承担，平台不做充值、结算、抽成或 Token 市场。
* `docs/WHAT_NOT_TO_BUILD.md`：不做战斗、等级、装备、竞技排行榜，不把 FableMap 做成传统游戏。
* `docs/PRODUCT_BRIEF.md` / `docs/FABLEMAP_TAVERN_PLATFORM.md`：平台不绕过店主确认自动生成/发布酒馆内容；AI 只能辅助，最终内容由店主确认。
* `docs/WORLD_SCHEMA.md` 是核心数据模型约束；若后续实现新增配置/API 字段，必须同步 schema、测试和文档，不能暗中扩展协议。

## Recommended Product Framing

将用户口中的“金币”产品化为 **酒馆纪念币 / 心意点**，而不是平台通用金币：

* 仅在“当前访客 × 当前酒馆”范围内有效。
* 只能通过完成店主已发布的酒馆玩法、每日回访仪式或系统默认公益酒馆任务获得。
* 不能充值、不能提现、不能转让、不能跨酒馆流通、不能与店主或平台结算。
* UI 可以显示为“金币”图标，但文案要解释为“本酒馆的纪念币/心意点”，避免被理解成平台钱包。
* 店主可配置任务奖励、礼物目录、每日上限和 bonus 抽卡券规则；公益酒馆/系统酒馆使用平台默认安全模板，店主酒馆可选择默认模板或自定义。

## Requirements

### 1. 赚取：任务/玩法完成给纪念币

* 纪念币来源必须是店主已发布的 `GameplayDefinition`、每日回访仪式或平台预设的公益/系统酒馆模板。
* 每个奖励必须有可审计来源：`source_type`、`source_id`、`session_id`、`amount`、`created_at`、`idempotency_key`。
* 同一个 GameplaySession 完成奖励只能结算一次，避免重复点击刷币。
* 必须有酒馆级每日/每周获取上限，例如 MVP 默认每访客每酒馆每日最多 50 枚。
* 奖励只影响访客体验，不影响店主真实成本结算，也不代表 LLM Token 额度。

### 2. 消耗：购买礼物送给 NPC

* 礼物必须来自店主配置或系统模板的 `gift_catalog`，不能由平台即时生成并自动发布。
* 礼物只是一种互动动作和叙事道具，不形成可交易库存经济。
* 送礼消耗纪念币，产生一条 ledger，并可增加目标 NPC 的角色好感。
* 每个 NPC、每个访客、每间酒馆必须有每日好感上限和礼物冷却，避免“刷好感度”无限堆叠。
* 好感提升应可解释：记录 `gift_id`、`character_id`、`affinity_delta`、`cap_applied`、`narration`。
* 高价礼物不能简单线性堆高数值；建议使用递减收益或阶段上限。

### 3. 好感度：复用酒馆/角色双层关系

* 酒馆好感：继续使用/扩展现有 `VisitorState.relationship` 作为“访客与酒馆”的关系进度。
* 角色好感：与前一个抽卡方案保持一致，集中在私有进度桶中维护 `character_affinity[character_id]`，不要再新建一套冲突系统。
* 送礼主要提升角色好感，可按配置少量影响酒馆好感；抽卡与礼物的好感收益共同受每日上限约束。
* 好感解锁的内容必须是店主已配置/确认的互动入口、问候语、GameplayDefinition 或话题标签，不允许平台自动生成并发布剧情。

### 4. 额外抽卡：只能做非付费 bonus draw voucher

* “金币额外抽卡”不能实现为充值买次数或平台售卖抽卡次数。
* 推荐实现为：纪念币可兑换 **额外邂逅券 / bonus draw voucher**。
* voucher 只能由任务获得的纪念币兑换，不能真实货币购买，不能转让，不能跨酒馆。
* MVP 默认限制：每访客每酒馆每日最多兑换/使用 1 张，或每周最多 3 张；具体数值由实现时配置。
* bonus 抽卡与每日免费抽分开记录：`draw_source = daily_free | bonus_voucher`。
* bonus 抽卡的好感收益也必须受每日好感上限限制；不能因为额外抽卡无限刷角色好感。
* 隐藏角色是否可被 bonus 抽卡解锁应默认关闭或强限额，由店主明确开启；避免纪念币变成“买隐藏角色”。

### 5. Owner configuration

店主配置项建议包含：

```json
{
  "coin_label": "酒馆纪念币",
  "earn_limits": { "daily_per_visitor": 50, "weekly_per_visitor": 200 },
  "reward_rules": [
    { "source_type": "gameplay_completion", "gameplay_id": "gp_x", "amount": 10, "daily_claim_limit": 1 }
  ],
  "gift_catalog": [
    {
      "id": "gift_warm_tea",
      "name": "一杯热茶",
      "price": 10,
      "target": "character",
      "affinity_delta": 2,
      "cooldown_hours": 12,
      "status": "published"
    }
  ],
  "bonus_draw": {
    "enabled": true,
    "voucher_price": 30,
    "daily_limit": 1,
    "weekly_limit": 3,
    "hidden_unlock_allowed": false
  }
}
```

这些字段是设计草案；后续实现前必须正式更新 `docs/WORLD_SCHEMA.md` / API contracts / tests。

### 6. Visitor experience

* 访客在酒馆中看到本酒馆纪念币余额、今日可获得/可使用状态。
* 完成玩法后显示“获得 X 枚纪念币”和来源说明。
* NPC 对话/角色页中可打开礼物面板，礼物送出后显示角色反应和好感变化。
* 抽卡入口显示“每日免费抽”与“额外邂逅券”，避免展示商业化概率诱导。
* 当达到每日好感上限时，UI 应提示“今天已经很有心意了，明天再来吧”，而不是继续扣币但不给收益。

## Technical Approach

### Storage boundary

推荐使用一个新的私有进度桶，例如 `_engagement_progress`，不要把余额/流水塞进公开 Tavern payload：

```json
{
  "version": 1,
  "visitors": {
    "visitor_id": {
      "wallet": { "balance": 20, "lifetime_earned": 80, "lifetime_spent": 60, "updated_at": "..." },
      "ledger": [
        { "id": "led_x", "type": "earn", "source_type": "gameplay_completion", "source_id": "gps_x", "amount": 10, "created_at": "..." },
        { "id": "led_y", "type": "spend", "source_type": "gift", "source_id": "gift_warm_tea", "amount": -10, "created_at": "..." }
      ],
      "daily_counters": {
        "2026-05-06": { "earned": 20, "gift_affinity_by_character": { "char_x": 4 }, "bonus_draws_used": 1 }
      },
      "gift_history": [],
      "bonus_draw_vouchers": []
    }
  }
}
```

与前一抽卡方案对接：

* `_gacha_progress` 继续负责每日免费抽、抽卡历史、隐藏角色解锁、抽卡产生的酒馆/角色卡好感。
* `_engagement_progress` 负责钱包、流水、礼物、voucher。
* bonus voucher 被消费后，抽卡服务写入 `_gacha_progress.draw_history`，并在结果中标记 `draw_source=bonus_voucher` 与 `voucher_id`。
* 如果实现时发现两个桶读写耦合过高，可将二者合并成一个 `_visitor_progress` 私有桶，但必须在 PRD/Schema 中一次性说明，不能散落扩展。

### API sketch

Owner side:

* `GET /taverns/{tavern_id}/engagement-config`
* `PUT /taverns/{tavern_id}/engagement-config`

Visitor side:

* `GET /taverns/{tavern_id}/engagement/me`
* `POST /taverns/{tavern_id}/gameplay-sessions/{session_id}/claim-reward`
* `POST /taverns/{tavern_id}/gifts/send`
* `POST /taverns/{tavern_id}/gacha/bonus-vouchers`
* `POST /taverns/{tavern_id}/gacha/draw` with `draw_source=bonus_voucher` when consuming a voucher

All visitor endpoints must derive visitor identity from the existing user-id mechanism and only return that visitor’s own progress.

### Implementation slices if approved later

1. Wallet ledger core: private storage, idempotent earn/spend, caps, tests.
2. Owner config: reward rules + gift catalog + bonus voucher caps, tests and docs.
3. Gameplay reward claim: session completion → earn coins, idempotency tests.
4. Gift sending: spend coins → apply capped character affinity, tests.
5. Gacha integration: coin → voucher → bonus draw, strict limits, tests.
6. Frontend: wallet badge, reward toast, gift panel, voucher CTA, owner config UI.

## Feasible approaches

### Approach A: Per-tavern “纪念币/心意点” + gifts + limited bonus vouchers (Recommended)

* How it works: each tavern has its own soft currency; tasks earn; gifts and capped bonus vouchers spend.
* Pros: satisfies user request while staying inside no-recharge/no-trade/no-settlement boundaries; reinforces tavern return visits; owner retains control.
* Cons: requires real backend persistence, idempotency and cap logic; adds more API surface.

### Approach B: Gift-only relationship tokens, no extra draw

* How it works: tasks directly grant “心意点” that can only buy gifts; no bonus抽卡.
* Pros: simplest and safest; avoids changing previous “每日一次免费抽” decision.
* Cons: does not satisfy the user’s “额外抽卡” desire.

### Approach C: Platform-wide gold/inventory economy (Not recommended / blocked)

* How it works: one global金币钱包, gifts/inventory across taverns, unlimited extra抽卡 or paid packs.
* Pros: more game-like retention loop.
* Cons: conflicts with product boundaries: looks like platform economy, could imply充值/结算/交易/博彩化, and drifts toward traditional game systems.

## Acceptance Criteria

* [ ] Completing a published tavern gameplay can grant per-tavern纪念币 once per completed session.
* [ ] Currency balance is private per visitor × tavern and never exposed as a platform-wide wallet.
* [ ] Currency cannot be purchased with real money, transferred, traded, cashed out, or settled with店主.
* [ ] Sending a gift spends currency, records a ledger entry, and applies capped character affinity.
* [ ] Gift affinity respects per-day/per-character caps, cooldowns and diminishing returns.
* [ ] Bonus draw vouchers are earned-only, capped, non-transferable and auditable.
* [ ] Bonus draws integrate with gacha history and cannot bypass hidden-character/affinity safety limits.
* [ ] Owner config and visitor actions are separated by API authorization.
* [ ] Schema/API/docs/tests are updated before implementation is considered complete.

## Definition of Done

* Backend unit tests cover earn, spend, gift cap, idempotent reward claim, voucher limit, and bonus draw integration.
* API contracts and docs are updated for any new fields/endpoints.
* Frontend build passes if UI is changed.
* If user-visible UI is implemented, Playwright self-check includes desktop and narrow viewport screenshots/report.
* PRD and task notes stay updated with any product decision changes.

## Decision (ADR-lite)

### Context

The user wants a currency loop that connects tasks, gifts, NPC affinity and extra gacha. This overlaps with FableMap’s explicit boundaries against platform-level payment, token recharge, settlement, game-like progression and monetized抽卡.

### Decision

Proceed only with a **per-tavern, non-paid, non-transferable soft currency**. Treat “金币” as a local tavern纪念币/心意点. Gifts are owner-authored interaction props. Extra抽卡 is allowed only as an earned and capped bonus voucher, not as paid补抽 or a platform economy.

### Consequences

* The design can support retention and affection loops without introducing a real-money economy.
* Implementation must include idempotency, caps and private progress storage from the first PR.
* If the product later wants platform-wide coins, paid packs, pity monetization or tradable gifts, that is a separate strategic decision and currently conflicts with authoritative docs.

## Out of Scope

* Real-money purchase,充值, cash-out, settlement, commission or token market.
* Platform-wide wallet, cross-tavern transferable金币, tradable inventory or player-to-player economy.
* Paid card packs, pity monetization, rarity selling or commercial抽卡概率展示.
* Unlimited “刷好感度” through repeated gifts or repeated抽卡.
* Combat, level, equipment, loot, competitive rankings or traditional RPG quest chains.
* Platform automatically generating and publishing gifts, NPCs, hidden角色 or story unlocks without店主 confirmation.

## Open Question

* 请确认是否采用推荐边界：把“金币”定义为每间酒馆内的非充值纪念币/心意点，并且“额外抽卡”只允许通过任务获得的纪念币兑换限额 bonus voucher，而不是通用金币或付费补抽。

## Technical Notes

* Docs inspected: `AGENTS.md`, `.codex/config.toml`, `.trellis/workflow.md`, `docs/WHAT_NOT_TO_BUILD.md`, previous gacha PRD at `.trellis/tasks/05-05-character-gacha-gameplay-brainstorm/prd.md`.
* Code touchpoints inspected:
  * `backend/src/fablemap_api/core/tavern.py`: `VisitorState.relationship`, `Tavern.gameplay_definitions`.
  * `backend/src/fablemap_api/core/gameplay.py`: `normalize_gameplay_definition`, `completion.reward_text`, `completion_payload`.
  * `backend/src/fablemap_api/api/v1/gameplay.py`: existing gameplay session endpoints.
* Current status: design/brainstorm only; no code or schema has been changed.
