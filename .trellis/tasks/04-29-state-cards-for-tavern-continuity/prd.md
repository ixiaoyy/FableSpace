# State Cards for Tavern Continuity

## Goal

为 FableMap 设计并落地“酒馆连续性状态卡 / Canon Ledger”基础能力，让长期酒馆会话中的角色事实、任务、资源、冲突和事件日志可追踪、可验证、可回放。AI 可以制造困难、提出冲突和剧情变化，但不能只靠聊天上下文静默改写权威状态。

## Parent context

Parent brainstorm: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`

核心结论：

```text
State Cards make the tavern remember.
Skill Packs let the tavern act.
```

本子任务优先解决“remember”：长期会话中 AI 忘记早期资源、任务条件、人物状态、已发生事件，导致后续剧情乱编的问题。

## Product principles

* 保持 FableMap 的真实地图赛博酒馆定位，不转向通用修仙/RPG 模拟器。
* 主人主权优先：店主设定的酒馆事实、NPC 身份、访问规则不能被 AI 静默覆盖。
* AI 是 NPC / GM 辅助引擎：可以提出候选变化，但 durable canon 必须进入结构化记录并经过验证。
* 不做 jailbreak / 破甲 / provider-specific safety bypass。
* 不新增持久 Schema 字段，除非设计阶段明确必要并同步 `docs/WORLD_SCHEMA.md`、测试和前后端契约。

## Problem

正常 AI 酒馆/角色扮演体验的爽点来自：AI 像轻量 GM 一样制造障碍、强敌、资源压力、关系冲突和剧情分支。

但长线游玩会出现连续性 bug：

* AI 忘记某个角色已经达到某资格/阶段。
* AI 忘记早期放置、种植、获得或承诺过的资源。
* AI 编造不存在的资源、任务线索或世界事实。
* NPC 关系、任务状态、冲突后果只存在聊天历史里，无法被可靠检索和验收。

## Proposed MVP

先做“状态卡与事件台账”的设计与最小实现，不先做完整 GM 自动化。

### Card categories

1. **Character State Card**
   * NPC / 访客相关的稳定事实：角色名、关系摘要、公开状态、承诺、限制。

2. **Task / Quest Card**
   * 酒馆委托、调查线索、回访目标、未完成事项。

3. **Resource / Asset Card**
   * 已确认存在的物品、线索、房间摆件、地方特产、合照/纪念品、可被后续剧情引用的资源。

4. **Conflict / Opportunity Card**
   * AI 或店主提出的强敌、阻碍、传闻、债务、竞争者、风险。

5. **Event Log Card**
   * 每轮关键变化的可观察总结：发生了什么、影响哪些卡、是否已确认。
   * 只记录 observable summary，不记录 chain-of-thought。

### Canon ledger rules

* AI 可以提出候选 card update。
* 系统应区分：confirmed / pending / rejected / superseded。
* 固定正史（店主设定、NPC 身份、坐标、访问规则）不能被 AI 覆盖。
* 如果 AI 输出引用了不存在的资源/任务/关系，系统应标记为 contradiction candidate。
* 用户或店主可确认：“加入正史 / 改回已有事实 / 忽略本次新增”。

## Requirements

* 设计状态卡的数据边界，优先复用已有模型：`VisitorState`、`GameplayDefinition`、`GameplaySession`、`WorldInfoEntry`、chat history writeback。
* 明确哪些内容属于 owner-authored fixed canon，哪些属于 visitor/session canon。
* 提供一个最小 UI/服务流程：从对话中产生候选事件 → 展示变化摘要 → 确认后写入结构化记录。
* 避免把状态卡做成传统 RPG 战斗/等级装备系统。
* 避免暴露私密 visitor memory、owner API key、隐藏 prompt。

## Acceptance Criteria

* [ ] 有明确设计说明：卡片类型、生命周期、确认规则、与现有 Schema 的关系。
* [ ] 至少覆盖任务、资源、事件日志三类连续性问题。
* [ ] AI 生成内容不会直接覆盖 owner-authored tavern canon。
* [ ] 如果新增/改变 API 或 Schema，同步更新 `docs/WORLD_SCHEMA.md` 和相关测试。
* [ ] 前端能让用户/店主看见本轮状态变化或 pending changes。
* [ ] 验证命令按实际改动范围执行并记录。

## Out of Scope

* 不实现完整 Tavern GM Layer 自动导演。
* 不实现 NanoMate-style companion skill packs。
* 不实现 preset import converter。
* 不实现 NSFW、破甲或模型审查绕过。
* 不实现通用修仙 RPG 属性系统。
* 不实现公开社交、好友、私信或跨酒馆社交图谱。

## Initial technical notes

Likely files to inspect before design/implementation:

* `docs/WORLD_SCHEMA.md`
* `docs/FABLEMAP_TAVERN_PLATFORM.md`
* `docs/WHAT_NOT_TO_BUILD.md`
* `backend/src/fablemap_api/core/tavern.py`
* `backend/src/fablemap_api/core/gameplay.py`
* `backend/src/fablemap_api/core/web/service.py`
* `backend/src/fablemap_api/core/web/router.py`
* `frontend/app/product/hooks/useWorldSession.js`
* `frontend/app/product/services/tavernService.js`
* `frontend/app/product/GameplayDefinitionEditor.jsx`
* `frontend/app/product/ChatPanel.jsx` or current chat/session UI equivalent

## Design questions to resolve next

1. MVP should be **docs/design only** first, or proceed to a minimal implementation?
2. Should state cards be represented by existing gameplay/session structures first, or introduce a new explicit card abstraction?
3. Who confirms pending canon changes in MVP: visitor, owner, or both depending on card type?

## Design decisions (2026-04-29, resolved by review)

1. **MVP approach**: Proceed to minimal implementation — StateCard abstraction already exists in backend `core/state_cards.py`, frontend has `StateCardReviewPanel.jsx`

2. **Card abstraction**: New explicit `StateCard` abstraction — not represented by existing Gameplay structures; separate from `MemoryAtom`

3. **Confirmation authority**: Visitor confirms their own `visitor` scope cards; Owner manages `tavern` scope or `fixed_canon=true` cards

### StateCard Schema (already in WORLD_SCHEMA.md Section 12)

```typescript
type StateCardCategory = 'character' | 'task' | 'resource' | 'conflict' | 'event_log'
type StateCardStatus = 'pending' | 'confirmed' | 'rejected' | 'superseded'
type StateCardScope = 'visitor' | 'tavern'

interface StateCard {
  id, tavern_id, category, status, canon_scope, title, summary
  visitor_id, character_id, source, source_message_ids
  proposed_by, confirmed_by, created_at, updated_at
  fixed_canon: boolean  // true → only owner can manage
  metadata: { contradiction_candidate?, decision_note?, ... }
}
```

### API endpoints (already implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/taverns/{id}/state-cards` | List visible cards, filter by status/category/canon_scope/visitor_id/character_id |
| POST | `/api/v1/taverns/{id}/state-cards` | Create manual or chat-generated pending card |
| PUT | `/api/v1/taverns/{id}/state-cards/{card_id}/decision` | Confirm/reject/supersede card |

### Card lifecycle

1. Chat/GroupChat/Gameplay generates **pending** candidates via rule-based extraction (backend `core/state_cards.py`)
2. `state_card_candidates` returned in chat response
3. `StateCardReviewPanel.jsx` shows pending cards to visitor
4. Visitor confirms → `confirmed`; rejects → `rejected`; superseded → `superseded`
5. Confirmed cards stored in `TavernStore._state_cards` (private bucket)
6. Not exposed in public Tavern payload, not in tavern package export

### Confirmation authority

| Card scope | Who can confirm | Can reject | Can delete |
|------------|-----------------|------------|------------|
| `visitor` scope, own card | Visitor only | Visitor only | Not via decision API |
| `tavern` scope | Owner only | Owner only | Owner |
| `fixed_canon=true` | Owner only | Owner only | Owner |

### AI cannot overwrite owner-authored canon

- AI only generates `pending` candidate cards via `extract_state_card_candidates_from_turn()`
- No AI output directly mutates `Tavern`, `TavernCharacter`, `WorldInfoEntry`, `LLMConfig`, or access rules
- `fixed_canon` cards can only be managed by owner

## Implementation status

### Backend — DONE

| File | Status |
|------|--------|
| `backend/src/fablemap_api/core/state_cards.py` | StateCard dataclass, rule-based extraction, filtering |
| `backend/src/fablemap_api/application/services/state_cards.py` | Service layer: list/create/decide with scope filtering |
| `backend/src/fablemap_api/api/v1/state_cards.py` | Router: GET/POST/PUT decision |
| `backend/tests/test_v1_state_cards.py` | Chat creates pending cards, user confirms own, others cannot confirm |

### Frontend — DONE

| File | Status |
|------|--------|
| `frontend/app/product/StateCardReviewPanel.jsx` | Shows pending cards, confirm/reject buttons |
| `frontend/app/product/TavernChatRoom.jsx` | Integrates StateCardReviewPanel, loads on mount, handles decisions |
| `frontend/app/product/services/tavernService.js` | `listStateCards()` and `decideStateCard()` |

### Schema docs — DONE

| Document | Status |
|----------|--------|
| `docs/WORLD_SCHEMA.md` Section 12 | StateCard schema + API endpoints + constraints |

### Tests — DONE

```powershell
py -3 -m pytest -q backend/tests/test_v1_state_cards.py  # 1 passed
```

### Acceptance Criteria

* [x] 有明确设计说明：卡片类型、生命周期、确认规则、与现有 Schema 的关系。
* [x] 至少覆盖任务、资源、事件日志三类连续性问题。 (task/resource/event_log in rule-based extraction)
* [x] AI 生成内容不会直接覆盖 owner-authored tavern canon。 (only pending, requires confirmation)
* [x] 如果新增/改变 API 或 Schema，同步更新 `docs/WORLD_SCHEMA.md` 和相关测试。 (WORLD_SCHEMA.md Section 12 + test_v1_state_cards.py)
* [x] 前端能让用户/店主看见本轮状态变化或 pending changes。 (StateCardReviewPanel in TavernChatRoom)
* [x] 验证命令按实际改动范围执行并记录。 (pytest + compileall documented above)

## Remaining work

- Owner-side StateCard management UI (view all cards, manage tavern-scope cards)
- `canon_scope='tavern'` card creation by owner
- `StateCardPanel` for owner dashboard (see all pending/confirmed cards)
- Cross-check for contradiction candidates in UI (already in `metadata.contradiction_candidate`)

## Out of Scope

## 2026-04-30 Backlog hardening: SC-03 follow-up task

`docs/AI_SHARED_TASKLIST.md` 中预留的 SC-03 状态卡 Prompt 注入已拆成 Trellis 子任务：

- `04-30-state-card-prompt-injection-sc-03`
