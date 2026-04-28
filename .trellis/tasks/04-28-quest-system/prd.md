# Quest System - 任务系统

## 目的

为探索者设计引导性任务系统，通过任务目标增加探索动力和游戏化体验。

## 任务类型

| 类型 | 描述 | 示例 |
|------|------|------|
| 探索任务 | 发现并拜访特定地点 | "拜访 3 家咖啡店" |
| NPC 任务 | 与特定 NPC 互动 | "和老王聊一次天" |
| Home 拜访 | 拜访朋友 Home | "拜访 5 个公开 Home" |
| 创作任务 | 创建新内容 | "创建一个自己的酒馆" |
| 收集任务 | 收集特定角色/物品 | "收集 10 种不同表情" |

## 数据模型

```python
@dataclass
class Quest:
    id: str
    title: str
    description: str
    type: str  # exploration, social, creation, collection
    objectives: list[QuestObjective]
    rewards: list[QuestReward]
    visibility: str  # public, private
    created_by: str  # platform or user_id

@dataclass
class QuestObjective:
    id: str
    type: str  # visit_tavern, chat_npc, create_tavern, etc.
    target: str  # tavern_id, npc_id, etc.
    count: int  # 需要完成次数
    progress: int  # 当前进度

@dataclass
class QuestProgress:
    quest_id: str
    visitor_id: str
    status: str  # active, completed, abandoned
    progress: float  # 0.0 - 1.0
    completed_objectives: list[str]
    started_at: datetime
    completed_at: Optional[datetime]
```

## 任务示例

### 探索任务：咖啡店达人
```
标题：咖啡店达人
描述：探索不同的咖啡店，体验各种氛围
目标：
  - 拜访 3 家不同咖啡店
奖励：
  - "咖啡店达人"徽章
  - 解锁咖啡店专属表情
```

### NPC 任务：健谈者
```
标题：健谈者
描述：与不同类型的 NPC 交流
目标：
  - 与 5 个 NPC 聊满 10 轮对话
奖励：
  - "健谈者"徽章
```

## 实现步骤

1. [ ] 定义 Quest 数据模型
2. [ ] 创建 Quest API 端点
3. [ ] 实现任务进度追踪
4. [ ] 创建任务列表页面
5. [ ] 任务进度展示组件
6. [ ] 任务完成奖励发放

## MVP 范围

- 平台预设任务（3-5 个探索任务）
- 任务列表展示
- 进度追踪
- 任务完成展示

## 验收标准

- [ ] 显示可用任务列表
- [ ] 正确追踪任务进度
- [ ] 任务完成时有反馈
- [ ] 奖励正确发放
