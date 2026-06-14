# P3-2: 状态卡可视化

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-state-card-visualization` |
| 标题 | 状态卡可视化 |
| 阶段 | brainstorm |
| 类型 | frontend |
| 优先级 | P3 |
| 关联需求 | 增强沉浸感，提升可读性 |

## 背景与问题

### 当前状态
- `StateCardOwnerPanel` 存在于店主管理页
- 状态卡数据存储在 `state_cards` 服务
- 缺少前端可视化展示

### 问题分析
1. **不可见**: 状态卡只在店主后台可见
2. **不直观**: 数据以表格形式展示
3. **不生动**: 缺少视觉表现力
4. **不参与**: 访客无法感知状态卡变化

### 用户故事
```
作为 访客
我希望 能看到我和 NPC 之间关系的变化
以便 感受到游戏世界的真实性
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 状态卡展示 | 在空间内展示关键状态 | P0 |
| 关系可视化 | 以图形展示关系进度 | P0 |
| 变化通知 | 状态变化时通知用户 | P1 |
| 事件记录 | 展示已确认的重要状态变化 | P1 |
| 状态历史 | 展示状态变化历史 | P2 |

### 状态卡类型

```typescript
type StateCard = {
  id: string
  category: "character" | "task" | "resource" | "conflict" | "event_log"
  status: "pending" | "confirmed" | "rejected" | "superseded"
  canonScope: "visitor" | "tavern"
  title: string
  description: string
  characterId?: string
  visitorId?: string
  sourceMessageIds?: string[]
}

type RelationshipStateCard = StateCard & {
  category: "character"
  characterId: string
  characterName: string
  stage: RelationshipStage
  progress: number
}
```

## 设计方案

### 方案一: 沉浸式状态卡

**核心思路**: 以游戏化方式展示状态卡

```
┌─────────────────────────────────────────────────────────┐
│  📜 你的状态卡                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ╔═══════════════════════════════════════════╗ │   │
│  │  ║  事件记录                                    ║ │   │
│  │  ╠═══════════════════════════════════════════╣ │   │
│  │  ║                                           ║ │   │
│  │  ║    首次进入便利店                           ║ │   │
│  │  ║    ─────────────────────────────────      ║ │   │
│  │  ║    完成时间: 2026-05-01                    ║ │   │
│  │  ║                                           ║ │   │
│  │  ║    来源: 已确认的访客状态卡                 ║ │   │
│  │  ║                                           ║ │   │
│  │  ╚═══════════════════════════════════════════╝ │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💝 关系进度                                     │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  小月                                            │   │
│  │  ════════════════════════░░░░  80%             │   │
│  │  阶段: 挚友                                      │   │
│  │                                                   │   │
│  │  下个阶段「至交」还需:                           │   │
│  │  · 完成 3 次深入对话                            │   │
│  │  · 触发隐藏剧情                                 │   │
│  │                                                   │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │   │
│  │  │   ✓   │ │   ✓   │ │   ○   │ │   ○   │       │   │
│  │  │  初识  │ │  朋友  │ │  挚友  │ │ 至交  │       │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📖 进行中的任务                                 │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  🔍 寻找草莓蛋糕的配方                           │   │
│  │  ═══════════════════════░░░░░  60%             │   │
│  │  · [✓] 询问小月                                 │   │
│  │  · [✓] 找到旧食谱本                             │   │
│  │  · [ ] 收集材料                                 │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `StateCardGallery` 状态卡画廊
2. 新增 `RelationshipProgress` 关系进度
3. 新增 `EventLogCard` 事件记录卡
4. 新增 `QuestProgress` 任务进度
5. 新增 `StateChangeToast` 状态变化通知

### 方案二: 简单数据面板

**核心思路**: 以列表形式展示状态

```
┌─────────────────────────────────────────────────────────┐
│  关系: 小月 - 挚友 (80%)                                │
│  事件记录: 3 条                                         │
│  任务: 2 个进行中                                       │
└─────────────────────────────────────────────────────────┘
```

**问题**: 缺少沉浸感

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 沉浸式状态卡
- **Phase 2**: 方案二 - 简单展示（降级方案）

## 技术实现

### 组件清单

```typescript
// frontend/app/features/state-card-visualization/

StateCardGallery/
├── index.tsx              // 主容器
├── RelationshipProgress.tsx // 关系进度
├── EventLogCard.tsx       // 事件记录卡
├── QuestProgress.tsx      // 任务进度
├── StateChangeToast.tsx   // 变化通知
└── StateHistory.tsx       // 状态历史
```

### 数据获取

```typescript
// frontend/app/lib/state-cards.ts

export async function getVisitorStateCards(
  tavernId: string,
  visitorId: string
): Promise<{
  relationshipCards: RelationshipStateCard[]
  eventLogCards: StateCard[]
  questCards: QuestStateCard[]
}> {
  const result = await listStateCards(tavernId, {
    visitor_id: visitorId,
    canon_scope: "visitor",
    status: "confirmed",
  })
  return groupVisibleStateCards(result.state_cards || [])
}
```

> 第一阶段不新增 `state-cards/stream`。如果后续要做实时状态变化，需要另起任务设计 SSE/WebSocket 契约、频率限制和权限过滤。

## 验收标准

### 功能验收

- [ ] 状态卡正确展示
- [ ] 关系进度可视化
- [ ] 变化时有通知
- [ ] 状态确认/忽略有清晰反馈

### 性能验收

- [ ] 加载 < 1s
- [ ] 动画流畅

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据量大 | 加载慢 | 懒加载 |
| 通知过多 | 打扰用户 | 频率控制 |

### 依赖

- 现有 `StateCardOwnerPanel`
- `state_cards` API

## 校准补充

### 已核对事实

- `WORLD_SCHEMA.md` 中 StateCard 类别为 `character`、`task`、`resource`、`conflict`、`event_log`，状态为 `pending`、`confirmed`、`rejected`、`superseded`。
- `.trellis/spec/frontend/state-card-ui-boundary.md` 要求 pending cards 作为候选变化展示，不能当作已确认事实。
- `/api/v1/taverns/{id}/state-cards` 已支持 status/category/canon_scope/visitor_id/character_id 过滤。

### 边界修正

- 不应新增 `achievement/property/rarity/reward` 这套 RPG 卡片语义，除非先更新 WORLD_SCHEMA 并确认不是传统游戏化系统。
- 访客侧只能展示自己可见的 visitor-scope 或已确认内容；tavern-scope/fixed_canon 维护权归店主。
- 状态变化通知要限频，不能把 pending AI 候选包装成“已发生的世界事实”。

### 建议 MVP

1. 先做“状态台账阅读视图”：按 category 展示 confirmed/visitor-visible cards。
2. 对 pending cards 使用“候选变化/待确认”文案，复用已有 decision 语义。
3. 关系进度继续使用 VisitorState/Affinity，不并入 StateCard 新枚举。

### 需要确认的问题

- 访客是否可以确认自己的 visitor-scope pending card，还是只能忽略/反馈？
- 状态卡可视化放在聊天侧栏、记忆卡片内，还是店主后台？
- 是否需要实时订阅？如果没有强需求，轮询/重新进入刷新可能足够。

## 下一步

1. **research**: 分析需要可视化的状态类型
2. **implement**: 实现可视化组件
3. **check**: 用户测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
