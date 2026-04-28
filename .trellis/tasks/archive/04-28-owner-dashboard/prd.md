# Owner Dashboard - 酒馆主人数据面板

## 目的

为酒馆主人提供数据统计面板，展示酒馆运营数据，帮助主人了解访客行为和优化酒馆体验。

## 核心功能

### 1. 访客统计
- 今日/本周/本月访客数量
- 访客趋势图
- 独立访客数 vs 回访访客数
- 平均停留时长

### 2. Token 用量统计
- 每日/每周/每月 Token 消耗
- Token 消耗趋势图
- 各 NPC 的 Token 使用分布

### 3. NPC 互动排行
- 各 NPC 的对话次数
- 最受欢迎 NPC
- 平均对话时长

### 4. 热门时段
- 访客高峰时段
- 最佳营业时间建议

### 5. 访客反馈
- 简单的满意度收集
- 访客留言汇总

## 数据模型

```python
@dataclass
class TavernMetrics:
    tavern_id: str
    visit_count: int
    unique_visitors: int
    avg_session_duration: float
    token_used: int
    top_characters: list[dict]
    peak_hours: list[int]
```

## 实现步骤

1. [ ] 创建后端 API 端点 `/api/taverns/{id}/metrics`
2. [ ] 实现访客统计逻辑
3. [ ] 实现 Token 用量统计
4. [ ] 实现 NPC 互动排行
5. [ ] 创建前端 OwnerDashboard 组件
6. [ ] 集成到 TavernOwnerPanel

## 验收标准

- [ ] 显示访客数量和趋势
- [ ] 显示 Token 用量统计
- [ ] 显示 NPC 互动排行
- [ ] 页面加载流畅
