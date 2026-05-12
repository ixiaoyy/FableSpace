# brainstorm: 游客身份画像驱动初始好感与空间可见性

## Goal

设计一套“游客身份画像 → 初始好感 → 长期记忆 → 空间/NPC 可见性”的 MVP：游客进入空间前可选择/确认性别、年龄段、城市等基础身份；NPC 和空间对新游客的初始好感不再固定，而是由店主配置的首印象规则计算；注册/登录用户可保留长期记忆，普通游客只拥有临时会话，不写入长期记忆；空间和 NPC 可以按性别、年龄段等规则隐藏或限制，普通游客 / 未完善身份游客默认不满足隐藏条件。

## What I already know

* 用户希望 NPC 和空间对游客的初始好感不是固定值，而与游客一开始选择的性别、年龄、城市有关。
* 用户明确指出这涉及游客身份建立、注册和登录。
* 用户希望注册/登录用户可以保留长期记忆，普通游客无长期记忆。
* 用户希望空间可增设性别、年龄限制：对不同性别、年龄可以隐藏。
* 用户明确要求：普通游客默认不满足隐藏条件。
* 当前后端的身份机制仍是 MVP 级 `X-User-Id` / query `user_id`，没有完整账号、密码、OAuth 或 session auth。
* 当前 `VisitorState` 已记录 `visitor_id`、`tavern_id`、`gender`、visit count、first/last visit、relationship strength/stage。
* 当前 `VisitorState.gender` 被文档明确限定为“当前 tavern_id + visitor_id 作用域”，不能扩展为公开社交筛选或自动推断。
* 当前 `enter_tavern` 只有 `visitor_gender` 入参；没有 age/city/profile/identity_kind。
* 当前聊天链路会根据 `visitor_id` 写 ChatMessage、更新 VisitorState、自动创建 MemoryAtom；如果访客只是普通游客，需要显式阻止长期记忆写入。
* 当前 Tavern 访问控制只有 public/password/private；`can_view_tavern` 只判断 private/owner，没有画像规则。

## Constraints from authoritative docs

* 主人主权：空间内容、角色、氛围、访问规则由店主决定。
* 平台不得从姓名、头像、对话或 AI 草稿中自动推断/覆盖游客或 NPC 性别。
* VisitorState.gender 当前只绑定 tavern_id + visitor_id，不得扩展为全局公开社交筛选。
* 不做无边界访客社交：身份画像不能变成好友、匹配、动态墙或跨空间社交图谱。
* 记忆必须结构化落库、可回放、可测试；长期记忆必须绑定明确访客状态。
* 未成年人/学校相关信息不得采集或展示真实未成年人身份；年龄应使用粗粒度年龄段，不采集身份证、生日或真实未成年人资料。
* 平台不绕过店主确认自动发布内容；画像规则只能选择/隐藏店主已确认的空间内容、NPC、玩法或话题。

## Recommended Framing

把这套能力拆成三层：

1. **身份层**：游客可以是 `guest`、`registered`、`owner`。只有 `registered/owner` 有稳定 user_id 和长期记忆资格；`guest` 是临时身份。
2. **画像层**：游客自声明 profile，包括 `gender`、`age_band`、`city`。MVP 只存粗粒度、可改、可清除的自声明资料；不做自动推断或真实身份验证。
3. **规则层**：店主配置 `first_impression_rules` 和 `visibility_rules`，用于计算初始好感、隐藏空间/NPC/玩法入口。

关键产品口径：这是“空间内的第一印象和访问礼仪”，不是平台级用户画像广告系统、匹配系统或实名审核系统。

## Requirements

### 1. 游客身份类型

MVP 建议定义：

```ts
type VisitorIdentityKind = 'guest' | 'registered' | 'owner';
```

规则：

* `guest`：普通游客，未登录或未建立稳定账号。
  * 可以临时聊天/体验公开内容。
  * 不保留长期记忆。
  * 默认不满足任何“隐藏可见性”条件。
  * 可在本次会话选择性别/年龄段/城市用于当前会话体验，但不写入长期用户档案。
* `registered`：已登录游客。
  * 有稳定 `user_id`。
  * 可保存长期 VisitorState、ChatMessage、MemoryAtom、抽卡/礼物/金币等后续长期进度。
  * 可保存自声明 profile。
* `owner`：店主身份。
  * 可看到/管理自己空间的全部配置和隐藏内容。
  * 可用“以某类游客预览”的方式测试规则。

### 2. 游客画像字段

MVP 推荐使用自声明、低敏、粗粒度字段：

```ts
interface VisitorProfile {
  user_id: string;
  identity_kind: 'registered' | 'owner';
  display_name?: string;
  gender: 'unspecified' | 'female' | 'male' | 'nonbinary' | 'other';
  age_band: 'unspecified' | 'under_18' | '18_24' | '25_34' | '35_44' | '45_59' | '60_plus';
  city?: string; // 自声明城市，不自动用 IP / GPS 推断
  updated_at: string;
}
```

约束：

* 年龄使用 `age_band`，不采集精确生日、身份证、真实年龄证明。
* 城市为自声明文本或标准化 city code；MVP 不自动从 IP/GPS 推断。
* 性别沿用现有 Gender 枚举，不自动推断。
* 普通游客的临时 profile 只用于当次入场/聊天，不进入长期 VisitorProfile。
* 对进入某个空间时使用的 profile，建议在 `VisitorState` 或私有进度桶中保存 `profile_snapshot`，用于解释“为什么初始好感是这个值”，避免游客之后改资料导致旧记录不可追踪。

### 3. 初始好感规则

推荐新增一个可配置的 `first_impression_rules`：

```ts
interface FirstImpressionConfig {
  default_strength: number; // MVP 默认 0.0-0.05
  max_initial_strength: number; // 推荐不超过 0.20，避免一进门就是朋友
  rules: Array<{
    id: string;
    label: string;
    scope: 'tavern' | 'character';
    character_id?: string;
    when: {
      gender_in?: string[];
      age_band_in?: string[];
      city_in?: string[];
      identity_kind_in?: VisitorIdentityKind[];
    };
    strength_delta: number;
    narrative_hint?: string;
  }>;
}
```

规则：

* 只在首次建立某个 `visitor_id + tavern_id` 的 VisitorState 时计算初始值。
* 后续访问不重复套用初始加成，避免通过改资料刷初始好感。
* 对匿名 `guest`，默认只给 `default_strength`，不匹配隐藏/加成规则。
* 规则总和需要 clamp 到 `0.0 <= strength <= max_initial_strength`。
* 初始好感最多到 `acquaintance` 边缘，不应直接到 friend/close_friend。
* 每条命中规则应记录到私有 `initial_affinity_sources`，方便店主/调试解释，但不要向其他访客公开。

### 4. 角色级初始好感

现有 `VisitorState.relationship` 是空间级。前序抽卡/礼物设计已经引入角色好感概念，因此这里建议：

* 空间级首印象：写入/初始化 `VisitorState.relationship_strength`。
* 角色级首印象：写入未来统一私有进度桶，如 `_visitor_progress.character_affinity[character_id]`。
* 如果当前版本还没有角色级进度落库，MVP 先只做空间级初始好感，角色级规则作为下一切片。
* NPC 的开场白可读取空间级和角色级好感，但不能因为游客画像生成歧视性、骚扰性或不适宜内容。

### 5. 登录与长期记忆

建议将“登录/注册”和“记忆保留”设计成强绑定：

* 只有 `registered/owner` 的稳定 user_id 可以写长期 ChatMessage、VisitorState、MemoryAtom、state cards、抽卡/礼物/金币进度。
* `guest` 可以保留短会话上下文：
  * 前端本地 state / sessionStorage；或
  * 后端短 TTL 会话记录，默认不进入长期记忆列表。
* `guest` 的聊天不触发 `auto_create_memories_from_chat`。
* 用户注册/登录后，可选择“把本次临时会话升级为长期记忆”，但必须明确确认；默认不自动合并匿名会话。
* 删除账号/清空 profile 时，应能删除或解绑相关长期记忆。

### 6. 空间 / NPC / 玩法可见性规则

推荐新增统一 `visibility_rules`，覆盖 tavern、character、gameplay、gacha hidden content：

```ts
interface VisibilityRuleSet {
  default_visibility: 'public' | 'hidden';
  require_registered_for_hidden: boolean; // 推荐 true
  rules: Array<{
    id: string;
    target_type: 'tavern' | 'character' | 'gameplay' | 'gacha_pool_item';
    target_id?: string;
    effect: 'show' | 'hide' | 'deny_enter';
    when: {
      identity_kind_in?: VisitorIdentityKind[];
      gender_in?: string[];
      age_band_in?: string[];
      city_in?: string[];
      profile_complete?: boolean;
    };
    fallback_message?: string;
  }>;
}
```

规则：

* 普通游客 `guest` 默认不满足隐藏内容条件。
* 未登录或 profile 不完整时，`gender/age/city` 规则默认不命中，除非店主明确配置 `unspecified` 可见。
* Owner 总是能看到自己空间的全部内容，并能预览不同画像下的可见结果。
* 列表/地图发现时：不满足 tavern 级隐藏规则的空间不显示。
* 直达链接时：返回通用提示，例如“这间空间需要登录或完善入场身份后查看”，避免泄露过多隐藏规则。
* NPC/玩法隐藏时：不出现在角色列表、玩法入口、抽卡可见池中。
* 不应把规则用于全局推荐、陌生人匹配或公开展示“这里不欢迎某类人”的排行榜式信息。

### 7. 入场流程

推荐访客进入空间前的流程：

1. 访客点击空间。
2. 后端返回公开预览：名称、简介、是否需要 profile/登录，不泄露隐藏内容。
3. 若规则要求身份，前端显示“选择入场身份”：登录/注册、继续普通游客、填写自声明资料。
4. 后端调用 `POST /taverns/{id}/enter`，携带 profile snapshot 或 profile id。
5. 后端评估 `visibility_rules`：
   * guest / profile 不完整默认不满足隐藏。
   * 不满足 deny_enter 则拒绝进入。
   * 满足则创建或读取 VisitorState。
6. 若是首次稳定访问，计算 initial affinity。
7. 返回可见角色、可见玩法、visitor_state、memory_mode。

### 8. API 草案

认证/身份（完整账号系统可分阶段实现）：

* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/logout`
* `GET /api/v1/me`
* `PUT /api/v1/me/profile`

空间入场/规则：

* `POST /api/v1/taverns/{tavern_id}/enter`
  * 增加 `identity_kind`、`visitor_profile` 或 `profile_snapshot`。
* `GET /api/v1/taverns/{tavern_id}/visibility-preview`
  * 店主预览不同 profile 下可见内容。
* `PUT /api/v1/taverns/{tavern_id}/audience-rules`
  * 店主保存 first impression + visibility 配置。

注意：当前项目还没有完整 auth，不能在同一小 PR 里把登录、profile、访问控制、记忆策略全部铺满；需要分切片。

## Technical Approach Options

### Approach A: Tavern-scoped profile gate first, auth placeholder later (Recommended MVP)

* 使用现有 `X-User-Id` 作为稳定身份占位。
* 新增入场 profile snapshot、初始好感规则、可见性规则、guest memory_mode。
* 不先实现完整密码/OAuth 登录，只把身份类型与长期记忆边界打通。
* Pros: 最快验证产品体验；贴合现有代码；风险可控。
* Cons: 仍不是完整真实账号系统，后续要替换为正式 auth。

### Approach B: Full auth first, then profile/affinity/rules

* 先实现注册、登录、session/token、用户表、profile 表，再改入场/记忆/规则。
* Pros: 长期架构更稳；“普通游客 vs 登录用户”边界清晰。
* Cons: 工作量大，容易把本次产品玩法拖成账号系统工程；不适合一个 Trellis brainstorm 后直接开工。

### Approach C: Only local visitor profile, no backend persistence

* 前端本地选择性别/年龄/城市，后端只接收当次 payload。
* Pros: 最快做 UI demo。
* Cons: 无法可靠控制隐藏、长期记忆和防刷；容易被绕过；不满足用户提到的注册/登录和长期记忆。

## Recommended MVP Slice

第一阶段只做 **“入场身份画像 + 空间级初始好感 + 隐藏可见性评估 + guest 不写长期记忆”**：

* 不做完整 OAuth/密码账号系统，继续用 `X-User-Id` 代表已登录占位身份。
* 增加 `identity_kind` 与 `profile_snapshot`。
* 扩展 `VisitorState` 或新建 visitor profile 私有结构，支持 age_band/city。
* 增加 owner 配置 `audience_rules`，包含 `first_impression_rules` 和 `visibility_rules`。
* 修改 enter/list/character/gameplay/chat/memory 读取路径，统一走可见性过滤。
* 修改 memory 写入：guest 不触发长期 memory/state card 自动生成。
* 前端提供入场身份选择与 owner 规则配置的最小 UI。

第二阶段再做完整注册/登录账号系统。

## Acceptance Criteria

* [ ] 新游客首次进入空间时，初始好感由 default + profile 命中规则计算，而不是固定 0。
* [ ] 初始好感只计算一次，后续改资料不会重复刷首印象。
* [ ] 游客可自声明 gender、age_band、city；平台不自动推断这些字段。
* [ ] 普通游客/未登录游客默认不满足隐藏内容条件。
* [ ] 不满足 tavern 级隐藏规则的空间不出现在地图/列表；直达链接只显示通用提示。
* [ ] 不满足 NPC/玩法规则的内容不出现在访客可见列表、抽卡池或入口。
* [ ] 登录/稳定用户可保留长期 VisitorState/ChatMessage/MemoryAtom。
* [ ] guest 聊天不创建长期 MemoryAtom / state card / 抽卡长期进度。
* [ ] Owner 可预览不同画像下的可见内容和初始好感结果。
* [ ] 文档、Schema、后端测试、前端 build/必要视觉验收随实现同步。

## Definition of Done

* Backend tests cover profile normalization, initial affinity rule matching, visibility filtering, guest non-persistence, owner override and direct-link fallback.
* API contracts and `docs/WORLD_SCHEMA.md` updated for any new fields.
* Frontend build passes if UI changed.
* 涉及入场/隐藏 UI 时，Playwright 自验收至少覆盖桌面 + 窄屏：guest、profile incomplete、registered matched、owner preview。
* Trellis PRD/implementation/check notes updated.

## Out of Scope

* 真实身份验证、身份证/生日采集、人脸识别、自动年龄/性别推断。
* 基于 IP/GPS 自动推断城市或位置画像。
* 全局用户画像推荐、广告定向、陌生人匹配、好友/私信/动态墙。
* 用性别/年龄规则生成歧视性、骚扰性或不适宜 NPC 台词。
* 一次性实现完整 OAuth/密码登录 + profile + audience rules + memory migration 的大重构。
* 未经用户确认自动把 guest 临时会话合并为长期记忆。

## Decision (ADR-lite)

### Context

该需求把好感度、游客身份、注册登录、长期记忆和访问控制连在一起。仓库当前只有 `X-User-Id` MVP 身份、VisitorState.gender、public/password/private 访问控制和自动记忆写入；没有完整账号系统，也没有 age/city/profile 或画像规则。

### Decision

先设计并推荐“身份画像入场层”：以 self-declared profile 和 identity_kind 为核心，普通游客默认不满足隐藏条件、不写长期记忆；已登录稳定身份才能保留长期记忆；初始好感与可见性都通过店主配置的 audience rules 计算。完整注册/登录系统作为后续独立 Trellis task。

### Consequences

* 可以快速验证“不同游客进入同一空间第一印象不同”的体验。
* 能把普通游客和长期记忆用户的边界说清楚，避免匿名 ID 污染长期记忆。
* 需要后续实现统一可见性过滤，否则只过滤入口、不过滤角色/玩法/抽卡池会产生越权可见。
* 未来做正式 auth 时，需要迁移 `X-User-Id` 占位身份到真实 user/account/session 模型。

## Resolved Decision

* 2026-05-06: 第一阶段按“现有 X-User-Id 作为登录占位 + visitor profile 入场规则 + guest 不写长期记忆”推进；完整注册/登录系统作为后续迭代写入任务计划。

## Technical Notes

### Docs inspected

* `README.md`: 主链路包含浏览空间、进入空间、对话互动、写回记忆、回访反馈。
* `docs/PRODUCT_BRIEF.md`: 主人主权、访问规则、写回与记忆是 MVP 能力。
* `docs/WORLD_SCHEMA.md`: `VisitorState` 当前包含 `gender`，且限定为当前 tavern_id + visitor_id 作用域。
* `docs/WHAT_NOT_TO_BUILD.md`: 不做无边界访客社交；记忆必须结构化落库；不自动发布 NPC/空间内容。
* `docs/AI参与开发协议.md`: 新功能优先 Trellis 留痕，最小闭环。

### Code inspected

* `backend/src/fablemap_api/api/v1/common.py`: `get_user_id` 只读 `X-User-Id` / query，当前无完整 auth。
* `backend/src/fablemap_api/contracts/chat.py`: ChatRequest/GroupChatRequest 已有 `visitor_gender`，无 age/city。
* `backend/src/fablemap_api/core/tavern.py`: `VisitorState` 和 `enter_tavern`；匿名空 user_id 不写 VisitorState，但有 user_id 会写 visit_count/gender。
* `backend/src/fablemap_api/application/services/runtime.py`: `send_chat` 更新 affinity，并调用 `auto_create_memories_from_chat` 自动写长期记忆。
* `backend/src/fablemap_api/infrastructure/mysql_store.py`: VisitorModel 当前持久化 gender、visit_count、relationship_strength/stage。
* `backend/src/fablemap_api/domain/tavern_policy.py`: `can_view_tavern` 目前只处理 private/owner。
* `frontend/app/lib/taverns.ts`: `DEFAULT_VISITOR_ID`、`enterTavern(visitorGender)`、`sendTavernChat(visitor_gender)`；暂无 age/city/profile/auth。
* `frontend/app/lib/gender.js`: 现有 gender 枚举和 normalize 逻辑。

### Current status

Design/brainstorm only. No code or schema changes have been made.

## Approval

* 2026-05-06: User approved the recommended Phase 1 boundary: use existing `X-User-Id` as logged-in placeholder, add visitor profile entry rules, and keep guest users out of long-term memory.
* User explicitly requested that follow-up iterations be written into the task plan. See `implementation-plan.md`, especially “Iteration map” and “Future iteration backlog to keep visible”.

## 2026-05-12 Closure Note

This task is closed as `brainstorm_complete`. Closed as brainstorm/design complete: PRD captures requirements, privacy/visibility boundaries, and implementation considerations. No API/schema code was changed in this brainstorm slice.

Deferred / not done:
- Visitor profile affinity/visibility implementation requires a separate scoped backend/frontend task.
