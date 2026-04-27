# brainstorm: NPC 一对一永久关系与公开身份

## Goal

探索一个高风险但有传播力的赛博酒馆关系玩法：真人访客在满足条件后，可以与单个 NPC 建立 1 对 1 的长期/永久公开关系，并让该关系改变 NPC 对外身份，对其他用户可见。该功能不只服务“伴侣/婚配”，而是一个可扩展的 NPC 公开关系系统。

## What I already know

- 用户希望“真人达到一定条件”后触发，而不是任意访客立即绑定。
- 用户确认关系有很多种，“伴侣”只是其中一种；“结缘 / 契约 / 专属羁绊”等目前只是候选语义，不代表最终关系类型或最终枚举。
- 用户确认店分两种：公开店、私人店；公开关系规则需要按店类型治理。
- 用户确认不是所有关系都 1 对 1：只有专属 / 伴侣类关系严格 1 对 1；守护者、学徒等可允许多人。
- 关系是永久性 / 强持久化：会改变 NPC 身份，并对其他用户可见。
- 项目已有 `VisitorState.relationship_strength/stage`、回访关系、结构化记忆、玩家扮演 NPC `CharacterClaim`、PlaceRelationship 审批边界。
- `docs/WHAT_NOT_TO_BUILD.md` 禁止无边界访客社交、访客好友/私信/动态墙、绕过店主审批真人扮演；允许酒馆内、角色内、店主治理的受控关系。
- 最近已完成游客/NPC 性别字段，但性别不得用于公开发现筛选或全局匹配。
- 现有规划中有 `.trellis/tasks/04-27-affinity-system-mvp/`，但尚未写 PRD；本任务可作为其高阶玩法分支或后续子任务。

## Assumptions (temporary)

- 为避免真实法律/伦理误解，产品层主概念使用“结缘 / 契约 / 专属羁绊”；“伴侣”可作为一种关系类型，而不是系统唯一主语义。
- MVP 必须保留店主主权：不能让访客单方面永久改写店主 NPC 公共身份。
- MVP 必须避免未成年人、真实身份、现实法律婚姻、性内容或强社交网络扩散。

## Open Questions (resolved)

- ~~公开店 / 私人店分别由谁审批~~ → **已确认**：私人店主 NPC 由店主审批；系统店纯 NPC 由平台管理员审批。
- ~~关系类型词表~~ → **已确认**：情侣、兄弟、姐妹、闺蜜、知己、红颜知己、蓝颜知己、姐弟、兄妹、师徒、师姐、师兄、师妹、师弟、守护、契约兽，全部系统内置枚举。
- ~~触发条件~~ → **已确认**：close_friend（strength ≥ 0.70）。
- ~~公开展示边界~~ → **已确认**：只显示「已结缘」和关系类型，不暴露访客。
- ~~冲突处理~~ → **已确认**：排队等待，当前关系优先。
- ~~撤销规则~~ → **已确认**：店主可随时撤销。
- ~~名额规则~~ → **已确认**：1对1（情侣/兄妹/姐弟/闺蜜/知己/红颜知己/蓝颜知己）vs 多人（师徒/师姐/师兄/师妹/师弟/守护/契约兽）。
- 暂无新 Open Questions。

## Requirements (resolved)

- 店分两类：
  - 公开店：对外公开展示 / 可被公共访客进入的店，NPC 公开关系对其他用户可见；审批方为系统店运营方 / 平台管理员。
  - 私人店：不进入公共发现，仅授权访客可进入，NPC 公开关系不泄露到公共发现；审批方为店主。
- NPC 分两类治理来源：
  - 私人 / 店主酒馆 NPC：访客达成 close_friend 条件后提交申请，必须由该酒馆店主审批后才能改变 NPC 公开身份。
  - 系统店纯 NPC：访客达成条件后提交申请，审批方是系统店运营方 / 平台管理员。
- 关系类型为系统内置枚举集合（16种，见上方 Product Vocabulary），MVP 不开放店主自定义。
- 触发条件：访客与 NPC 的 AffinityStage 达到 `close_friend`（strength ≥ 0.70）且无挂起申请时，展示申请入口。
- 1 对 1 冲突处理：若 NPC 已有活跃 1:1 关系，新申请进入等待队列；按排队顺序依次激活。
- 多人关系（capacity=N）：可允许多个访客同时与同一 NPC 保持活跃关系（如师徒、守护、契约兽）。
- 公开展示：NPC 卡片显示”已结缘”徽标，悬停显示关系类型，不暴露访客身份。
- 撤销：店主可随时撤销，撤销后该访客申请记录清除。
- 对其他用户可见的是 NPC 的公开身份状态，而非访客隐私资料。
- 支持可审计、可撤销策略；即便叫永久，也必须考虑违规、店主后悔、用户注销、骚扰等治理场景。

## Acceptance Criteria

- [x] 明确定义店类型：公开店 / 私人店，以及各自审批方。
- [x] 明确定义最终关系类型集合（16种内置枚举，不做店主自定义）。
- [x] 明确定义 NPC 治理来源：私人店主 NPC 与系统店纯 NPC 的不同审批规则。
- [x] 私人店主 NPC 必须由店主审批；系统店纯 NPC 必须由系统店运营方 / 平台管理员审批。
- [x] 明确定义关系名称、状态机、权限边界、可见范围。
- [x] 明确资格条件：close_friend（strength ≥ 0.70）。
- [x] 明确 1 对 1 冲突处理（排队等待）和公开展示文案（只显示「已结缘」+关系类型，不暴露访客）。
- [x] 明确撤销（店主可随时撤销）、名额（1对1 vs 多人）规则。
- [x] 明确不做全局社交、私信、匹配或现实法律婚姻。
- [x] 完成 NpcPublicBond 数据模型设计（数据库 schema + WORLD_SCHEMA.md）。
- [x] 完成 API 端点设计（申请/审批/撤销/查询）。
- [x] 完成前端展示设计（NPC卡片徽标、申请入口）。
- [x] 实现后端 API + 服务逻辑。
- [x] 实现前端 UI。
- [x] 补充测试用例（51 个测试全部通过）。
- [x] 更新 WORLD_SCHEMA.md 并完成代码审查。

## Definition of Done (team quality bar)

- 产出经用户确认的 MVP 方案。
- 若进入实现，必须先更新 `docs/WORLD_SCHEMA.md` / Trellis spec，再补 TDD 测试。
- 验证包含后端 schema/API、前端公开展示、权限 / 冲突 / 旧数据兼容。

## Out of Scope (explicit)

- 不做访客之间的好友、私信、动态墙或全局在线状态。
- 不做现实法律婚姻声明、年龄 / 身份真实性采集或成人内容。
- 不允许 AI 或访客绕过店主确认发布 / 改写 NPC 公共身份。
- 不做按性别 / 婚配状态的公开发现匹配。
- MVP 不做店主自定义关系类型、复杂名额配置或自定义规则 DSL，避免打破酒馆沉浸。

## Technical Notes

- 相关现有模型：`TavernCharacter`、`VisitorState`、`CharacterClaim`、`PlaceRelationship`。
- 相关边界文档：`docs/WHAT_NOT_TO_BUILD.md`、`docs/WORLD_SCHEMA.md`、`docs/ARCHITECTURE.md`。
- 相关任务：`04-27-affinity-system-mvp`（规划中）、`04-27-visitor-npc-gender-fields`（已完成）、归档 `04-24-player-npc-roleplay-mvp`。

## Product Vocabulary (confirmed — MVP 内置枚举)

> 以下为最终确认的关系类型，全部为系统内置枚举，MVP 不开放店主自定义。

### 严格 1 对 1（排他）— capacity: 1
| 枚举值 | 中文名 | 说明 |
|--------|--------|------|
| `sweetheart` | 情侣 | 浪漫亲密关系 |
| `brother` | 兄弟 | 男性友谊 |
| `sister` | 姐妹 | 女性友谊 |
| `best_friend` | 闺蜜 / 知己 | 亲密同性友谊 |
| `confidant` | 红颜知己 | 女性对男性知己 |
| `male_confidant` | 蓝颜知己 | 男性对女性知己 |
| `sibling_younger` | 兄妹 | 兄 + 妹妹 |
| `sibling_older` | 姐弟 | 姐 + 弟弟 |
| `sworn_sibling` | 结拜兄妹 | 结义兄弟/姐妹 |

### 非排他（可多人）— capacity: N
| 枚举值 | 中文名 | 说明 |
|--------|--------|------|
| `master` | 师徒 | 师父/师父 |
| `junior_sister` | 师姐 | 师姐（女）|
| `junior_brother` | 师兄 | 师兄（男）|
| `disciple_sister` | 师妹 | 师妹（女）|
| `disciple_brother` | 师弟 | 师弟（男）|
| `guardian` | 守护 | 守护者 |
| `contract_beast` | 契约兽 | 契约灵宠 |

> `best_friend`（闺蜜/知己）与 AffinityStage.best_friend 是不同的概念：前者是公开关系类型，后者是好感度阶段。内部枚举明确区分。

## Expansion Sweep

### Future evolution
- 从“结缘/婚配”扩展为多种公开 NPC 身份关系；具体关系类型词表后续再定，候选包括守护者、契约者、伴侣、赞助人、学徒等。
- 可以成为酒馆传播点：公开 NPC 卡片显示“已与某位访客结缘”，但不形成跨酒馆社交图。

### Related scenarios
- 与好感度系统联动：达到关系阶段后出现申请入口。
- 与店主治理联动：店主审批 / 撤销、NPC 是否开放结缘、展示昵称脱敏。

### Failure / edge cases
- 多个访客同时满足条件抢同一 NPC。
- 店主修改 / 删除 NPC、关店、转让酒馆。
- 访客注销、改名、骚扰、违规关系文本。
- “永久”与治理撤销之间的冲突。

## Feasible Approaches

### Approach A: 按店类型与 NPC 治理来源分流的“公开关系”状态机（当前推荐）
- 私人店：访客达成条件后提交某种 `relationship_type` 申请；店主批准后 `NpcPublicBond.status=active`，NPC 对外展示相应公开身份。
- 公开店：访客达成条件后提交某种 `relationship_type` 申请；由该店的治理方（店主 / 系统店运营方 / 平台管理员，待定）审批后 active。
- 优点：同时满足公开店治理、私人店主主权与多关系类型扩展；可复用现有 CharacterClaim / VisitorState 思路并扩展出公开身份记录。
- 缺点：系统店需要运营审批队列，反馈不如自动生效即时。

### Approach B: 全部自动达成，店主仅事后撤销（不推荐）
- 私人和系统 NPC 都在达成条件后自动绑定，店主只在后台看到并可撤销。
- 优点：即时反馈强。
- 缺点：私人 NPC 会被访客单方面永久改写，和项目边界冲突较大；已被用户后续“都需要店主审批吧”口径否定。

### Approach C: 店主预设“结缘候选名额 / 剧情线”，访客完成后进入审批（暂不做 MVP）
- 店主先为 NPC 开启一条专属剧情线和名额；访客完成后可申请。
- 优点：仪式感强，仍是 owner-authored；可扩展剧情。
- 缺点：MVP 比 A 更重，需要玩法 / 剧情配置；用户已明确先不要让店主配置过多内容，容易出戏。

## Decision Log

- 2026-04-27: 用户先提出 NPC 分两类：私人 / 店主 NPC 与系统店纯 NPC。随后确认两类都需要审批；私人 NPC 由店主审批，系统店纯 NPC 由系统店运营方 / 平台管理员审批。
- 2026-04-27: 规则收敛：任何会永久改变 NPC 对外身份的 1 对 1 关系，都不能自动生效，必须先进入审批流。
- 2026-04-27: 用户确认关系采用”结缘”和”契约 / 专属羁绊”方向；关系有很多种，”伴侣”只是其中一种。
- 2026-04-27: 用户确认店分两类：公开店、私人店。公开关系状态机必须按店类型区分可见范围和审批方。
- 2026-04-27: 用户确认采用”只有专属 / 伴侣类关系 1 对 1；守护者、学徒等可多人”的关系容量规则。
- 2026-04-27: 用户明确 MVP 先不要让店主配置过多内容，避免出戏；因此关系类型、名额、展示文案优先采用系统内置规则。
- 2026-04-27: 用户确认 `bond / 结缘` 与 `contract / 契约` 也不一定是最终关系类型；需要把关系词表、名额、审批、展示、治理等未定项作为 Trellis 待拍板内容，而不是边聊边默认完成。

---

### Decision Log (2026-04-27 — 第二轮拍板)

- **关系类型词表**：多种概念并存——情侣、兄弟、姐妹、闺蜜、知己、红颜知己、蓝颜知己、姐弟、兄妹、师徒、师姐、师兄、师妹、师弟、守护、契约兽等。恋人/伴侣/红颜/蓝颜/闺蜜等暗示性别与情感方向；师徒/守护/契约兽等为非1对1关系。全部为系统内置枚举，MVP 不开放店主自定义。
- **触发条件**：访客达到一定好感度阶段（推荐方案）。MVP 使用 close_friend（strength ≥ 0.70）作为触发阈值；低于此阶段不展示申请入口。
- **公开展示边界**：只显示「已结缘」状态，不暴露访客身份。NPC 卡片展示”已结缘”徽标，悬停显示关系类型（如”契约兽”），但不透露访客是谁。
- **冲突处理**：排队等待，当前关系优先。若某 NPC 已有活跃 1:1 关系，新申请进入等待队列；当前关系撤销/过期后按排队顺序依次激活。
- **撤销规则**：店主可随时撤销（推荐方案）。撤销后该访客的申请记录清除，NPC 可接受新的申请。
- **名额规则**：按关系类型区分。严格 1 对 1（排他）：情侣、兄妹、姐弟、闺蜜、知己、红颜知己、蓝颜知己；非排他（可多人）：师徒、师姐、师兄、师妹、师弟、守护、契约兽。

---

## Implementation Plan

### 1. Data Model

#### 1.1 NpcPublicBondType 枚举（系统内置，MVP 不开放店主自定义）

```typescript
type PublicBondType =
  // ── 严格 1:1 排他 ─────────────────────────────
  | 'sweetheart'        // 情侣
  | 'brother'           // 兄弟
  | 'sister'            // 姐妹
  | 'best_friend'       // 闺蜜 / 知己
  | 'confidant'         // 红颜知己
  | 'male_confidant'    // 蓝颜知己
  | 'sibling_younger'   // 兄妹
  | 'sibling_older'     // 姐弟
  | 'sworn_sibling'     // 结拜兄妹
  // ── 非排他（可多人）──────────────────────────
  | 'master'            // 师徒
  | 'junior_sister'     // 师姐
  | 'junior_brother'    // 师兄
  | 'disciple_sister'   // 师妹
  | 'disciple_brother'  // 师弟
  | 'guardian'          // 守护
  | 'contract_beast';   // 契约兽
```

> `best_friend`（公开关系类型）与 AffinityStage.best_friend（好感度阶段）是不同概念，内部明确区分。

#### 1.2 PublicBondCapacity

```typescript
// 1:1 类型：sweetheart/brother/sister/best_friend/confidant/male_confidant/sibling_younger/sibling_older/sworn_sibling
// is_exclusive=true, max_count=1
// 多人类型：master/junior_sister/junior_brother/disciple_sister/disciple_brother/guardian/contract_beast
// is_exclusive=false, max_count=N
```

#### 1.3 NpcPublicBond Schema

```typescript
interface NpcPublicBond {
  id: string;
  tavern_id: string;
  character_id: string;
  visitor_id: string;
  bond_type: PublicBondType;
  status: PublicBondStatus;
  created_at: string;
  approved_at?: string;
  revoked_at?: string;
  approved_by?: string;
  revoked_by?: string;
  visitor_note?: string;
  owner_note?: string;
  revoke_reason?: string;
  metadata?: Record<string, unknown>;
}

type PublicBondStatus = 'pending' | 'active' | 'revoked' | 'expired';
```

#### 1.4 NpcPublicBondQueue

当 1:1 NPC 已有活跃关系时，新申请进入等待队列：

```typescript
interface NpcPublicBondQueue {
  id: string;
  tavern_id: string;
  character_id: string;
  visitor_id: string;
  bond_type: PublicBondType;
  position: number;
  status: 'waiting' | 'promoted' | 'expired';
  created_at: string;
  promoted_at?: string;
}
```

#### 1.5 触发条件

访客与特定 NPC 触发申请条件：
- `VisitorState.relationship.strength >= 0.70`（AffinityStage.close_friend 或以上）
- 同一访客对该 NPC 无任何 pending/active NpcPublicBond 记录

### 2. 权限与审批规则

| 场景 | 审批方 |
|------|--------|
| 私人店 NPC | 店主（`Tavern.owner_id`） |
| 系统店纯 NPC | 平台管理员 |

### 3. API 端点设计

```
GET  /api/v1/taverns/{tavern_id}/characters/{character_id}/public-bond
     → { bond, can_apply, reason?, queue_position? }

GET  /api/v1/taverns/{tavern_id}/characters/{character_id}/public-bonds
     → { bonds: NpcPublicBond[] }   # 公开端点，只含 bond_type，无访客隐私

POST /api/v1/taverns/{tavern_id}/characters/{character_id}/public-bond/apply
     Body: { bond_type, visitor_note? }
     → { bond, queue_position? }

POST .../public-bonds/{bond_id}/approve
     Body: { owner_note? }
     → { bond }

POST .../public-bonds/{bond_id}/reject
     Body: { owner_note? }
     → { bond }

POST .../public-bonds/{bond_id}/revoke
     Body: { revoke_reason? }
     → { bond }   # 撤销后 promote 队列第一个等待申请

GET  .../public-bond-queue
     → { queue: NpcPublicBondQueue[] }

DELETE .../public-bond-queue/{queue_id}
     → 取消等待位置
```

### 4. 前端集成

- **NPC 卡片**：有 active bond 时显示"已结缘"徽标，悬停显示关系类型，不暴露访客
- **申请入口**：访客在 NPC 对话界面看到"申请结缘"按钮（条件：strength >= 0.70）
- **店主审批 UI**：NPC 详情页显示 pending 申请列表，支持 approve/reject/revoke

### 5. 实现顺序

1. `backend/src/fablemap_api/core/public_bond.py` — NpcPublicBondType 枚举 + capacity 查询函数
2. `backend/src/fablemap_api/infrastructure/models.py` — NpcPublicBondModel + NpcPublicBondQueueModel
3. `backend/src/fablemap_api/application/services/public_bond.py` — NpcPublicBondApplicationMixin
4. `backend/src/fablemap_api/api/v1/public_bond.py` — API 路由
5. `backend/src/fablemap_api/api/v1/router.py` — 注册路由
6. `backend/tests/test_public_bond.py` — 核心逻辑测试（TDD）
7. `frontend/app/lib/publicBond.ts` — 前端 API 库
8. `frontend/app/components/BondBadge.tsx` + `BondApplyModal.tsx` — 组件
9. `docs/WORLD_SCHEMA.md` — 更新 v0.9，添加 NpcPublicBond / NpcPublicBondQueue

### 6. 关键业务规则

- 申请前置：`relationship.strength >= 0.70`；否则 403 "好感度不足"
- 1:1 排他：新申请自动入队，不替换现有 active
- 审批权威：只有 `Tavern.owner_id` 或平台管理员可 approve/reject/revoke
- 撤销传播：撤销后队列 `position=1` 自动晋升为 active
- 访客隐私：GET `/public-bonds` 公开端点只返回 bond_type，不含 visitor_id
- active 无过期，撤销是唯一退出机制


