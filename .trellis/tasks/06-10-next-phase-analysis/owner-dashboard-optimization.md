# P1-1: 店主后台优化

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-owner-dashboard-optimization` |
| 标题 | 店主后台优化 |
| 阶段 | brainstorm |
| 类型 | frontend |
| 优先级 | P1 |
| 关联需求 | 提升配置效率，改善店主体验 |

## 背景与问题

### 当前状态
- `tavern-owner-management/index.tsx` 包含多个管理面板
- 面板包括: RoleplayPanel, PlayPackPanel, PlaceHomePanel, TerritoryOwnerPanel, StateCardOwnerPanel, OwnerVisitorNotesPanel
- 页面较长，缺少导航和分组

### 问题分析
1. **信息过载**: 一个页面承载太多功能
2. **导航缺失**: 无法快速定位到目标面板
3. **状态分散**: 同一个实体的状态分散在多个地方
4. **操作复杂**: 某些高频操作需要多步完成

### 用户故事
```
作为 店主
我希望 在管理后台能快速找到我要的功能
以便 高效完成空间配置和管理工作
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 仪表盘概览 | 快速查看空间关键指标 | P0 |
| Tab 导航 | 按功能分组快速切换 | P0 |
| 快捷操作 | 首页展示高频操作入口 | P1 |
| 操作反馈 | 重要操作后显示确认提示 | P0 |
| 数据统计 | 访客量、互动量、Token 消耗 | P1 |

### 仪表盘布局设计

```typescript
type OwnerDashboardSection =
  | { type: "overview"; metrics: DashboardMetric[] }
  | { type: "quick-actions"; actions: QuickAction[] }
  | { type: "recent-visitors"; visitors: RecentVisitor[] }
  | { type: "pending-tasks"; tasks: PendingTask[] }
  | { type: "character-management"; characters: TavernCharacter[] }
  | { type: "settings"; settings: TavernSettings[] }
```

## 设计方案

### 方案一: Tab 分组 + 仪表盘（推荐）

**核心思路**: 重构为 Tab 分组，首页为仪表盘

```
┌─────────────────────────────────────────────────────────┐
│  🏠 街角便利店 · 店主管理台                   [预览] [⚙️] │
├─────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 概览 │ │ NPC  │ │ 玩法 │ │ 访客 │ │ 关系 │ │ 设置 │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  【概览 Tab - 默认显示】                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📊 今日数据                                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│  │
│  │  │ 访客量  │ │ 互动量  │ │ Token   │ │ 评分    ││  │
│  │  │   12   │ │   45   │ │  2.3k  │ │  4.8   ││  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘│  │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⚡ 快捷操作                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │  + NPC   │ │  配置LLM │ │  访客反馈 │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📋 待处理事项                                    │   │
│  │  · [3] 条访客反馈待查看                          │   │
│  │  · [1] 个扮演申请待审批                          │   │
│  │  · [2] 个关系申请待处理                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tab 分组设计**:

| Tab | 内容 |
|-----|------|
| 概览 | 仪表盘、快捷操作、待处理事项 |
| NPC | NPC 列表、添加 NPC、角色卡导入 |
| 玩法 | 玩法列表、WorldInfo、Skill Packs |
| 访客 | 访客列表、反馈管理、记忆查看 |
| 关系 | Home 成员、领地管理、地点关系 |
| 设置 | LLM 配置、访问规则、空间信息 |

### 方案二: 侧边栏导航

**核心思路**: 左侧导航 + 右侧内容区

```
┌───────┬───────────────────────────────────────────────┐
│       │                                               │
│  概览 │   [右侧内容区]                                │
│  NPC  │                                               │
│  玩法 │                                               │
│  访客 │                                               │
│  关系 │                                               │
│  设置 │                                               │
│       │                                               │
│ ───── │                                               │
│ 返回  │                                               │
└───────┴───────────────────────────────────────────────┘
```

**问题**: 需要较大改动，可能影响现有布局

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - Tab 分组 + 仪表盘
- **Phase 2**: 方案二 - 侧边栏导航（移动端优化）

## 技术实现

### 组件重构

```typescript
// frontend/app/features/tavern-owner-management/

// 重构后的组件结构
OwnerDashboard/
├── index.tsx           // 主容器，管理 Tab 状态
├── OverviewTab.tsx     // 概览 Tab
├── NpcTab.tsx          // NPC Tab
├── GameplayTab.tsx     // 玩法 Tab
├── VisitorTab.tsx      // 访客 Tab
├── RelationshipTab.tsx // 关系 Tab
└── SettingsTab.tsx     // 设置 Tab

// index.tsx
export function OwnerDashboard({ tavern, roleplay }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>("overview")

  return (
    <div className="owner-dashboard">
      <DashboardHeader tavern={tavern} />

      <TabNavigation
        tabs={OWNER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="tab-content">
        {activeTab === "overview" && <OverviewTab tavern={tavern} />}
        {activeTab === "npc" && <NpcTab tavern={tavern} />}
        {activeTab === "gameplay" && <GameplayTab tavern={tavern} />}
        {activeTab === "visitor" && <VisitorTab tavern={tavern} />}
        {activeTab === "relationship" && <RelationshipTab tavern={tavern} />}
        {activeTab === "settings" && <SettingsTab tavern={tavern} />}
      </div>
    </div>
  )
}

// OverviewTab.tsx
function OverviewTab({ tavern }: { tavern: Tavern }) {
  const metrics = useTavernMetrics(tavern.id)
  const pendingTasks = usePendingTasks(tavern.id)

  return (
    <div className="overview-tab">
      <MetricsGrid metrics={metrics} />
      <QuickActions />
      <PendingTasksPanel tasks={pendingTasks} />
    </div>
  )
}
```

### 数据获取

```typescript
// 新增 API
async function getOwnerDashboard(tavernId: string, ownerId: string) {
  return Promise.all([
    getTavernMetrics(tavernId, ownerId),
    listVisitorNotes(tavernId, { limit: 10 }, ownerId),
    listPendingRelationships(tavernId, ownerId),
    listPendingRoleplayClaims(tavernId, ownerId),
  ])
}
```

## 验收标准

### 功能验收

- [ ] Tab 切换正常，内容正确
- [ ] 概览页显示关键指标
- [ ] 快捷操作可正常执行
- [ ] 待处理事项数量准确
- [ ] 跳转后保持 Tab 状态

### 交互验收

- [ ] Tab 切换有动画
- [ ] 移动端 Tab 可滚动
- [ ] 当前 Tab 高亮显示
- [ ] 页面标题同步更新

### 性能验收

- [ ] Tab 切换 < 100ms
- [ ] 数据懒加载，不阻塞首屏

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构影响现有功能 | 功能异常 | 完整回归测试 |
| 数据获取增加请求 | 性能下降 | 并行请求 + 缓存 |

### 依赖

- `tavern-owner-management` 现有实现
- `getTavernMetrics` API

## 校准补充

### 已核对事实

- 店主管理相关 UI 已分布在 `frontend/app/features/tavern-owner-management/` 和 `frontend/app/product/TavernOwnerPanel.jsx`。
- `GET /api/v1/taverns/{id}/metrics` 已存在，可作为概览指标第一版来源。
- 当前主要问题更像信息架构和导航，不一定需要新增后端 API。

### 边界修正

- 店主后台不能把 owner-only LLM 配置、token 统计或访客私密记忆暴露给访客视图。
- “评分”不是当前核心指标，容易引向 POI/商家评价系统，建议从仪表盘中移除。
- 大重构前应先确认现有面板使用频率和痛点，不要为了结构漂亮拆散稳定功能。

### 建议 MVP

1. 在现有管理页外层增加锚点/Tab 导航，先复用已有面板。
2. 概览只展示现有可得数据：open 状态、NPC 数、玩法数、访客反馈/待处理项、LLM 配置状态。
3. 快捷操作跳转到已有面板或打开已有 modal，不新增业务流程。

### 需要确认的问题

- 店主最常用的前三个操作是什么：加 NPC、配 LLM、看反馈、改访问规则，还是管理玩法？
- 现有 `tavern-owner-management` 与 `TavernOwnerPanel` 的职责是否需要合并，还是继续保持兼容双入口？
- 移动端店主后台是否是必须验收场景？

## 下一步

1. **research**: 分析现有面板使用频率
2. **implement**: 重构为 Tab 分组
3. **check**: 功能回归测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
