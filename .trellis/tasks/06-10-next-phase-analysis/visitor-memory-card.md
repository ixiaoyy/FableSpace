# P2-3: 访客记忆卡片

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-visitor-memory-card` |
| 标题 | 访客记忆卡片 |
| 阶段 | brainstorm |
| 类型 | frontend |
| 优先级 | P2 |
| 关联需求 | 强化回访动机，增强情感连接 |

## 背景与问题

### 当前状态
- 访客可提交私密反馈
- 有记忆系统记录对话
- 缺少可视化的记忆展示

### 问题分析
1. **记忆无形**: 记忆只是数据，没有可视化
2. **关系不可见**: 关系进度条太简单
3. **缺少故事感**: 用户不知道自己在这个空间留下了什么
4. **回访动机弱**: 没有"想回去看看"的冲动

### 用户故事
```
作为 回访用户
我希望 看到我在这个空间留下的故事和记忆
以便 感受到我是这个空间的一部分
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 记忆时间线 | 可视化展示记忆历程 | P0 |
| 关系进度 | 展示与 NPC 的关系阶段 | P0 |
| 高光时刻 | 展示经典对话片段 | P1 |
| 专属标签 | 根据行为生成专属标签 | P1 |
| 记忆导出 | 导出为卡片分享 | P2 |

### 记忆卡片设计

```typescript
type VisitorMemoryCard = {
  id: string
  tavernId: string
  tavernName: string
  characterId: string
  characterName: string
  visitCount: number
  totalMessages: number
  relationshipStage: string
  relationshipProgress: number
  firstVisit: Date
  lastVisit: Date
  highlights: Highlight[]
  tags: string[]
  timeline: TimelineEvent[]
}

type Highlight = {
  id: string
  message: string
  timestamp: Date
  type: "funny" | "heartwarming" | "mystery" | "milestone"
}

type TimelineEvent = {
  date: Date
  type: "visit" | "milestone" | "memory" | "state_card"
  title: string
  description: string
}

type RelationshipStage =
  | "stranger"      // 陌生人
  | "acquaintance"  // 点头之交
  | "familiar"      // 熟人
  | "friend"        // 朋友
  | "close_friend"  // 挚友
  | "best_friend"   // 至交
```

## 设计方案

### 方案一: 故事化记忆展示

**核心思路**: 把记忆展示成故事卡片

```
┌─────────────────────────────────────────────────────────┐
│  📖 你在「街角便利店」的故事                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  👤 小月                                         │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  ┌─────┐                                         │   │
│  │  │     │  「欢迎回来！                         │   │
│  │  │ 🧑  │   上次你说的事情有进展了~」           │   │
│  │  │     │                                         │   │
│  │  └─────┘                                         │   │
│  │                                                   │   │
│  │  关系: 挚友 ████████░░ 80%                      │   │
│  │  访问: 12 次   消息: 89 条                      │   │
│  │  首次: 2026-05-01   最近: 2026-06-08            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⭐ 高光时刻                                     │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  💝 「谢谢你愿意和我分享这些」                  │   │
│  │     05-15 · 关系升级为「朋友」时               │   │
│  │                                                   │   │
│  │  🔮 「这件事可能没那么简单...」                 │   │
│  │     05-28 · 触发隐藏剧情                       │   │
│  │                                                   │   │
│  │  🎉 「你是我见过最特别的客人」                 │   │
│  │     06-01 · 第 10 次访问                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🏷️ 专属标签                                     │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │  倾听者  │ │  好奇宝宝 │ │  故事王  │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📅 记忆时间线                                   │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  ● 06-08  第 12 次访问                          │   │
│  │  │                                                  │   │
│  │  ● 06-01  解锁成就「第 10 次访问」             │   │
│  │  │                                                  │   │
│  │  ● 05-28  触发隐藏剧情                         │   │
│  │  │                                                  │   │
│  │  ● 05-15  关系升级为「挚友」                  │   │
│  │  │                                                  │   │
│  │  ● 05-01  第一次来到便利店                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `VisitorMemoryCard` 组件
2. 新增 `RelationshipProgress` 关系进度
3. 新增 `HighlightMoments` 高光时刻
4. 新增 `MemoryTimeline` 时间线
5. 新增 `VisitorTags` 专属标签

### 方案二: 简洁数据展示

**核心思路**: 简单列表展示数据

```
┌─────────────────────────────────────────────────────────┐
│  📖 我的记忆                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  街角便利店 · 小月                                      │
│  ──────────────────────────────────────────────────── │
│  访问次数: 12 次                                        │
│  对话消息: 89 条                                        │
│  关系阶段: 挚友 (80%)                                   │
│  首次访问: 2026-05-01                                   │
│  最近访问: 2026-06-08                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**问题**: 缺少故事感，不够吸引人

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 故事化记忆展示
- **Phase 2**: 方案二 - 简洁展示（降级方案）

## 技术实现

### 数据获取

```typescript
// frontend/app/lib/visitor-memory.ts

export async function getVisitorMemory(
  tavernId: string,
  characterId: string,
  visitorId: string
): Promise<VisitorMemoryCard> {
  const [visits, messages, affinity, highlights] = await Promise.all([
    getVisitHistory(tavernId, visitorId),
    getMessageHistory(tavernId, characterId, visitorId),
    getAffinityState(tavernId, characterId, visitorId),
    getHighlights(tavernId, characterId, visitorId),
  ])

  return buildVisitorMemoryCard({
    tavernId,
    characterId,
    visitorId,
    visits,
    messages,
    affinity,
    highlights,
  })
}

function buildVisitorMemoryCard(data: MemoryData): VisitorMemoryCard {
  return {
    id: `${data.tavernId}:${data.characterId}:${data.visitorId}`,
    // ... 组合数据
  }
}
```

### 组件清单

```typescript
// frontend/app/features/visitor-memory/

VisitorMemoryCard/
├── index.tsx              // 主容器
├── RelationshipProgress.tsx // 关系进度
├── HighlightMoments.tsx   // 高光时刻
├── MemoryTimeline.tsx     // 时间线
├── VisitorTags.tsx        // 专属标签
└── MemoryShareButton.tsx  // 分享按钮
```

### 关系阶段定义

```typescript
const RELATIONSHIP_STAGES: RelationshipStage[] = [
  {
    id: "stranger",
    name: "陌生人",
    minProgress: 0,
    maxProgress: 20,
    icon: "👤",
    description: "初次见面的陌生人"
  },
  {
    id: "acquaintance",
    name: "点头之交",
    minProgress: 20,
    maxProgress: 40,
    icon: "🙂",
    description: "偶尔打招呼的熟人"
  },
  {
    id: "friend",
    name: "朋友",
    minProgress: 40,
    maxProgress: 60,
    icon: "🤝",
    description: "可以聊天的朋友"
  },
  {
    id: "close_friend",
    name: "挚友",
    minProgress: 60,
    maxProgress: 80,
    icon: "💝",
    description: "无话不说的挚友"
  },
  {
    id: "best_friend",
    name: "至交",
    minProgress: 80,
    maxProgress: 100,
    icon: "✨",
    description: "非常熟悉的长期访客"
  },
]
```

## 验收标准

### 功能验收

- [ ] 正确展示关系进度
- [ ] 高光时刻展示正确
- [ ] 时间线按时间排序
- [ ] 标签生成合理

### 交互验收

- [ ] 卡片可展开/收起
- [ ] 点击跳转正确
- [ ] 动画流畅

### 性能验收

- [ ] 数据加载 < 1s
- [ ] 组件渲染流畅

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据缺失 | 卡片不完整 | 提供降级展示 |
| 标签生成不准 | 用户困惑 | 提供手动调整 |

### 依赖

- `memories` 服务 - 记忆数据
- `affinity` 服务 - 关系数据

## 校准补充

### 已核对事实

- `frontend/app/product/TavernMemoryPanel.jsx` 已展示 relationship、visit count、memory atoms、反馈/纠错/固定等能力。
- `WORLD_SCHEMA.md` 的 `AffinityStage` 为 `stranger`、`acquaintance`、`familiar`、`friend`、`close_friend`、`best_friend`，不包含 `soulmate`。

### 边界修正

- 记忆卡片必须是当前访客私有视图，不能变成公开身份、社交资料或分享排行榜。
- “专属标签/高光时刻”如果由算法生成，必须可解释、可关闭或可纠错，避免用户误以为平台下结论。
- 不新增关系阶段枚举；先映射现有 AffinityStage。

### 建议 MVP

1. 复用 `TavernMemoryPanel` 数据，把关系、最近记忆、首次/最近访问整理成更故事化的卡片。
2. 高光时刻第一版只选 pinned/reinforced memory atoms，不做 LLM 摘要。
3. 分享导出暂缓；若做，也只能导出用户主动选择的内容，并清理 visitor_id 等隐私字段。

### 需要确认的问题

- 记忆卡片是访客自己看，还是店主也能看某个访客的版本？两者权限和文案不同。
- 高光时刻是否需要用户手动收藏，还是系统自动挑选？
- 用户是否可以删除/隐藏某段记忆在卡片中的展示？

## 下一步

1. **research**: 分析用户最在意哪些记忆点
2. **implement**: 实现记忆卡片组件
3. **check**: 用户测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
