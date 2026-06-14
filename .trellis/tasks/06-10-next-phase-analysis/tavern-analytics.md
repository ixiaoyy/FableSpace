# P1-4: 空间数据统计

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-tavern-analytics` |
| 标题 | 空间数据统计 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P1 |
| 关联需求 | 增强运营能力，提供数据支撑 |

## 背景与问题

### 当前状态
- `getTavernMetrics` API 提供部分指标
- 店主管理页有简单的数据展示
- 缺少时序分析和可视化

### 问题分析
1. **数据分散**: 各指标分散在不同面板
2. **缺少趋势**: 只有当前值，没有历史对比
3. **可视化弱**: 数据以数字展示，不直观
4. **导出缺失**: 无法导出数据

### 用户故事
```
作为 店主
我希望 看到空间的数据统计和趋势分析
以便 了解空间运营状况并做出优化决策
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 核心指标 | 访客量、互动量、Token 消耗 | P0 |
| 时序图表 | 按天/周/月展示趋势 | P0 |
| 对比分析 | 和上一周期对比 | P1 |
| 实时数据 | 今日实时数据 | P1 |
| 数据导出 | 导出 Excel/CSV | P2 |

### 指标定义

```typescript
type TavernMetric = {
  id: string
  label: string
  value: number
  unit: string
  change?: {
    value: number
    percent: number
    trend: "up" | "down" | "stable"
  }
}

type TavernAnalytics = {
  tavernId: string
  period: "today" | "week" | "month" | "all"
  metrics: {
    visitors: TavernMetric          // 访客数
    visits: TavernMetric           // 访问次数
    avgDuration: TavernMetric      // 平均时长
    messages: TavernMetric         // 消息数
    tokenUsage: TavernMetric       // Token 消耗
    activeNPCs: TavernMetric       // 活跃 NPC
    topCharacters: TavernMetric    // Top NPC
  }
  timeSeries: {
    date: string
    visitors: number
    visits: number
    messages: number
    tokenUsage: number
  }[]
  breakdown: {
    byHour: HourBreakdown[]
    byDay: DayBreakdown[]
    byCharacter: CharacterBreakdown[]
  }
}
```

## 设计方案

### 方案一: 仪表盘可视化（推荐）

**核心思路**: 统一仪表盘展示各项指标

```
┌─────────────────────────────────────────────────────────┐
│  📊 街角便利店 · 数据统计                    [导出] [📅] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  指标选择: [今日] [本周] [本月] [全部]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  核心指标                                        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │  访客  │ │  访问  │ │  消息  │ │ Token  │   │   │
│  │  │   45   │ │   128  │ │   892  │ │  23.5k │   │   │
│  │  │ +12% ▲ │ │  +8% ▲ │ │  -3% ▼ │ │ +15% ▲ │   │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📈 趋势图                                        │   │
│  │  ──────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  120 ┤                    ╭─╮                    │   │
│  │  100 ┤              ╭─╮  ╱ ╲ ╭─╮                │   │
│  │   80 ┤        ╭─╮  ╱ ╲ ╱   ╲ ╱ ╲                │   │
│  │   60 ┤      ╱ ╲ ╱ ╲ ╱       ╲                    │   │
│  │   40 ┤    ╱   ╲                    ╭─╮           │   │
│  │   20 ┤  ╱                         ╱ ╲           │   │
│  │    0 └───┴──┴──┴──┴──┴──┴──┴──┴──┴──┴───       │   │
│  │        Mon Tue Wed Thu Fri Sat Sun              │   │
│  │                                                   │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │   │
│  │  │访客量 │ │访问量 │ │消息量 │ │Token  │       │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⏰ 时段分布                                        │   │
│  │  ──────────────────────────────────────────────  │   │
│  │  00-06: ██░░░░░░░░░░░░░░░░░░░░░░░░░░░ 5%        │   │
│  │  06-12: ████████░░░░░░░░░░░░░░░░░░░░ 20%        │   │
│  │  12-18: ██████████████░░░░░░░░░░░░░░ 35%        │   │
│  │  18-24: ██████████░░░░░░░░░░░░░░░░░░ 40%        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🏆 NPC 排行                                        │   │
│  │  ──────────────────────────────────────────────  │   │
│  │  1. 小月          324 条消息      45 次互动     │   │
│  │  2. 神秘旅人      128 条消息      12 次互动     │   │
│  │  3. 智慧老者       64 条消息       8 次互动     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `TavernAnalyticsDashboard` 组件
2. 新增 `MetricsGrid` 指标网格
3. 新增 `TrendChart` 趋势图表
4. 新增 `TimeBreakdown` 时段分布
5. 新增 `CharacterRanking` NPC 排行

### 方案二: 简单表格展示

**核心思路**: 表格形式展示统计数据

```
┌─────────────────────────────────────────────────────────┐
│  数据统计                                              │
├─────────────────────────────────────────────────────────┤
│  指标          今日    昨日    本周    变化           │
│  ──────────────────────────────────────────────────── │
│  访客数        45      40      280     +12.5%         │
│  访问次数      128     115     890     +11.3%         │
│  消息数        892     850     5600    +4.9%          │
│  Token 消耗    23.5k   21.2k   156k    +10.8%        │
└─────────────────────────────────────────────────────────┘
```

**问题**: 不直观，数据量大时难以阅读

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 仪表盘可视化
- **Phase 2**: 方案二 - 简单表格（降级方案）

## 技术实现

### 后端改动

```python
# backend/src/fablemap_api/api/v1/analytics.py

from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta

@dataclass
class TavernAnalytics:
    tavern_id: str
    period_start: datetime
    period_end: datetime
    visitors: int
    visits: int
    messages: int
    token_usage: int
    active_characters: int

@router.get("/taverns/{tavern_id}/analytics")
def get_tavern_analytics(
    request: Request,
    tavern_id: str,
    period: str = "week",
    start_date: str = "",
    end_date: str = "",
) -> dict[str, Any]:
    """获取空间统计数据"""
    user_id = get_user_id(request)
    tavern = taverns_service(request).get_tavern(tavern_id, user_id)

    # 解析日期范围
    if start_date and end_date:
        period_start = datetime.fromisoformat(start_date)
        period_end = datetime.fromisoformat(end_date)
    else:
        period_end = datetime.now()
        if period == "today":
            period_start = period_end.replace(hour=0, minute=0, second=0)
        elif period == "week":
            period_start = period_end - timedelta(days=7)
        elif period == "month":
            period_start = period_end - timedelta(days=30)
        else:
            period_start = datetime.min

    # 获取统计数据
    analytics = analytics_service.get_analytics(
        tavern_id,
        period_start,
        period_end,
    )

    return analytics.to_response()
```

### 数据聚合

```python
class AnalyticsService:
    def get_analytics(
        self,
        tavern_id: str,
        period_start: datetime,
        period_end: datetime,
    ) -> TavernAnalytics:
        # 访客统计
        visitors = self.store.count_visitors(tavern_id, period_start, period_end)

        # 访问统计
        visits = self.store.count_visits(tavern_id, period_start, period_end)

        # 消息统计
        messages = self.store.count_messages(tavern_id, period_start, period_end)

        # Token 统计
        token_usage = self.store.sum_token_usage(tavern_id, period_start, period_end)

        # 活跃 NPC
        active_characters = self.store.get_active_characters(
            tavern_id, period_start, period_end
        )

        return TavernAnalytics(
            tavern_id=tavern_id,
            period_start=period_start,
            period_end=period_end,
            visitors=visitors,
            visits=visits,
            messages=messages,
            token_usage=token_usage,
            active_characters=len(active_characters),
        )
```

### 前端组件

```typescript
// frontend/app/features/tavern-analytics/

TavernAnalyticsDashboard/
├── index.tsx              // 主容器
├── MetricsGrid.tsx       // 指标网格
├── TrendChart.tsx         // 趋势图表
├── TimeBreakdown.tsx      // 时段分布
├── CharacterRanking.tsx  // NPC 排行
└── ExportButton.tsx       // 导出按钮

// index.tsx
function TavernAnalyticsDashboard({ tavern }: { tavern: Tavern }) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week")
  const { data, loading } = useTavernAnalytics(tavern.id, period)

  if (loading) return <AnalyticsSkeleton />

  return (
    <div className="analytics-dashboard">
      <PeriodSelector period={period} onChange={setPeriod} />
      <MetricsGrid metrics={data.metrics} />
      <TrendChart data={data.timeSeries} />
      <TimeBreakdown breakdown={data.breakdown.byHour} />
      <CharacterRanking characters={data.breakdown.byCharacter} />
    </div>
  )
}
```

## 验收标准

### 功能验收

- [ ] 可选择时间周期
- [ ] 核心指标显示正确
- [ ] 趋势图展示正确
- [ ] 时段分布正确
- [ ] NPC 排行正确

### 性能验收

- [ ] 数据加载 < 2s
- [ ] 图表渲染流畅
- [ ] 支持大数据量

### 安全性验收

- [ ] 仅店主可查看数据
- [ ] 访客无法访问统计 API

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据量大 | 查询慢 | 添加索引 + 分页 |
| Token 统计不准 | 用户困惑 | 说明统计方式 |

### 依赖

- 现有 `getTavernMetrics` API
- 数据存储层

## 校准补充

### 已核对事实

- `GET /api/v1/taverns/{id}/metrics` 已存在，适合做第一版 owner 概览。
- 现有文档和 Schema 允许 owner 可见 token 使用量，但不允许平台级充值、结算或抽成。

### 边界修正

- “NPC 排行”建议改名为“NPC 互动分布”，避免排行榜语义。
- Token 统计只能是 owner 参考，不应出现成本结算、充值、返利或平台账单语言。
- 时序图表需要确认数据库里是否已有足够的 timestamp 和聚合索引；没有证据前不要承诺“低复杂度”。

### 建议 MVP

1. 先展示现有 metrics API 能返回的指标，不新增 analytics service。
2. 若要趋势，只做最近 7 天消息/访问的轻量聚合，并补后端测试。
3. CSV 导出放到后续，避免引入表格/Excel 依赖和隐私导出边界。

### 需要确认的问题

- 店主最需要哪三个指标来改进空间：访问、消息、回访、玩法完成、LLM 配置状态，还是 token？
- 是否需要按 visitor_id 展示明细？这会触及访客隐私边界。
- 指标统计口径是否包含私密空间、owner 自己访问、测试消息和 dry-run？

## 下一步

1. **research**: 确定需要统计的指标
2. **implement**: 实现统计 API 和组件
3. **check**: 数据准确性验证
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
