# P3-3: 多空间联动

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-multi-tavern-linkage` |
| 标题 | 多空间联动 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P3 |
| 关联需求 | 扩展玩法边界，增强空间关联 |

## 背景与问题

### 当前状态
- `PlaceHomePanel` 支持 Home 成员管理
- `createSchoolEnrollment` 支持跨空间关系
- 缺少空间联动机制

### 问题分析
1. **空间孤立**: 每个空间独立运营
2. **关系弱**: 空间之间没有关联
3. **玩法单一**: 只能在单个空间内活动
4. **流动性差**: 访客没有跨空间探索的动力

### 用户故事
```
作为 访客
我希望 能在相关联的空间之间流动
以便 体验更丰富的故事和玩法
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 空间关联 | 空间之间建立关联关系 | P0 |
| 跨空间移动 | 访客可移动到关联空间 | P0 |
| 故事联动 | 跨空间的故事叙事 | P1 |
| NPC 移动 | NPC 可在不同空间移动 | P1 |
| 连锁任务 | 跨多个空间的任务 | P2 |

### 空间关联类型

```typescript
type TavernLinkage = {
  id: string
  sourceTavernId: string
  targetTavernId: string
  type: TavernLinkageType
  description: string
  conditions?: LinkageCondition[]
  transition?: TransitionConfig
}

type TavernLinkageType =
  | "sibling"        // 兄弟空间（同主题）
  | "hierarchical"   // 层级空间（总分关系）
  | "sequential"     // 序列空间（剧情顺序）
  | "complementary"  // 互补空间（功能互补）

type LinkageCondition = {
  type: "visit_count" | "relationship" | "state_card" | "time"
  operator: ">" | ">=" | "==" | "<" | "<="
  value: number
}

type TransitionConfig = {
  prompt: string
  animation: "fade" | "slide" | "teleport"
  duration: number
}
```

## 设计方案

### 方案一: 空间门户系统

**核心思路**: 空间之间建立可发现的门户

```
┌─────────────────────────────────────────────────────────┐
│  🚪 空间门户                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  「街角便利店」 ────── 🚪 ────── 「深夜食堂」          │
│       │                              │                  │
│       │         关联: 同一街区        │                  │
│       │         距离: 500m           │                  │
│       │                              │                  │
│       │         描述:                │                  │
│       │         深夜的食堂有更       │                  │
│       │         神秘的访客...        │                  │
│       │                              │                  │
│       └──────────────────────────────┘                  │
│                                                         │
│  当你满足条件时，可以从这里前往深夜食堂                  │
│                                                         │
│  条件:                                                  │
│  · [✓] 访问「街角便利店」3 次以上                     │
│  · [✓] 和小月关系达到「朋友」                         │
│  · [ ] 完成「寻找草莓蛋糕」任务                       │
│                                                         │
│  [满足条件后可进入]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `SpacePortal` 空间门户组件
2. 新增 `LinkageGraph` 关联关系图
3. 新增 `PortalCondition` 条件展示
4. 新增 `SpaceTransition` 空间过渡动画
5. 第一阶段不新增 `tavern_linkages` API，先复用地点关系接口

### 方案二: 简单链接跳转

**核心思路**: 在空间详情页添加跳转链接

```
┌─────────────────────────────────────────────────────────┐
│  相关空间                                              │
│  ──────────────────────────────────────────────────── │
│  · 深夜食堂 (500m) → [跳转]                           │
└─────────────────────────────────────────────────────────┘
```

**问题**: 缺少关联感和过渡效果

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 空间门户系统
- **Phase 2**: 方案二 - 简单链接（降级方案）

## 技术实现

### 后端 API

第一阶段不新增 `linkages.py`。优先复用已存在的地点关系能力：

| 现有能力 | 用途 |
|----------|------|
| `POST /api/v1/taverns/{id}/relationships` | 店主创建地点关系申请 |
| `PUT /api/v1/taverns/{id}/relationships/{relationship_id}` | 目标 owner 审批或拒绝 |
| `POST /api/v1/taverns/{id}/relationships/school-enrollments` | 特定学校/成员关系场景 |
| RelationshipGraph API | owner/system 视角的关系图谱展示 |

如果这些现有接口无法返回“相关空间列表”，应先补一个只读查询或扩展 tavern detail payload，并同步 Schema/权限文档；不要直接新增条件传送 API。

### 关联检查服务

第一阶段不做可绕过/可刷新的“转移条件系统”。可展示的状态只有：

- 关系类型：如 `story_link`、`membership`、`school_enrollment`。
- 审批状态：`pending`、`approved`、`rejected`、`revoked`。
- 目标空间公开可见性：公开/密码/私密需按现有 tavern access 规则处理。

### 前端组件

```typescript
// frontend/app/features/multi-tavern-linkage/

MultiTavernLinkage/
├── index.tsx              // 主容器
├── RelatedTavernList.tsx  // 相关空间列表
├── RelationshipStatus.tsx // 关系审批状态
├── RelatedTavernCard.tsx  // 目标空间摘要
└── LinkedTavernList.tsx   // 关联空间列表
```

### 空间过渡

```typescript
// frontend/app/lib/space-transition.ts

export function openRelatedTavern(targetTavernId: string) {
  // 第一阶段只是跳转到目标空间详情/入场页，访问控制继续由 Tavern enter/detail API 处理。
  navigateToTavern(targetTavernId)
}
```

## 验收标准

### 功能验收

- [ ] 已确认的相关空间正确展示
- [ ] pending/rejected/revoked 状态不被误展示为可进入联动
- [ ] 点击相关空间跳转到目标空间详情/入场页
- [ ] 私密/密码空间继续遵守现有访问控制

### 性能验收

- [ ] 关联加载 < 500ms
- [ ] 相关空间列表不会阻塞 Tavern 主体验

### 安全性验收

- [ ] 跨 owner 关系必须经过目标 owner 确认
- [ ] 不公开访客跨空间状态或社交图谱

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 条件可被绕过 | 破坏平衡 | 后端验证 |
| 循环跳转 | 死循环 | 深度限制 |

### 依赖

- 现有 `PlaceHomePanel`
- `createSchoolEnrollment` API

## 校准补充

### 已核对事实

- `WORLD_SCHEMA.md` 已有 `PlaceRelationship` 和 `RelationshipGraph`，跨 owner 关系默认需要 pending/approved/rejected/revoked 等治理状态。
- `backend/src/fablemap_api/api/v1/taverns.py` 已有 `/relationships`、`/relationships/school-enrollments` 等关系接口。
- 当前没有独立的 `linkages.py` 路由；新增 linkages API 不是小改。

### 边界修正

- 多空间联动必须是“地点/空间治理关系”，不能变成访客社交图谱、好友系统或无锚点世界地图。
- 跨 owner 联动不能由 source owner 单方面生效；目标空间 owner 必须确认。
- “连锁任务/成就条件/空间传送动画”都属于高级玩法，第一阶段不应引入新成就/等级体系。

### 建议 MVP

1. 先复用 `PlaceRelationship` 的 `story_link`、`membership`、`school_enrollment` 等关系，做“相关空间”只读展示。
2. 只允许跳转到目标空间详情/入场页，不做门户条件系统。
3. 跨 owner 关系全部走 pending/approved 流程，并在 UI 中明确目标 owner 是否已确认。

### 需要确认的问题

- 多空间联动主要服务同一 owner 的系列空间，还是跨 owner 协作？
- 访客“跨空间进度”是否真的需要持久化？如果需要，应该归 gameplay session、memory atom 还是 state card？
- NPC 移动是否进入当前阶段？`current_tavern_id/home_tavern_id` 虽有字段，但需要明确 owner 审批和公开展示规则。

## 下一步

1. **research**: 分析空间联动场景
2. **implement**: 实现关联和过渡
3. **check**: 逻辑测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
