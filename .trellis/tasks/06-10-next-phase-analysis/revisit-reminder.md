# P2-2: 回访提醒系统

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-revisit-reminder` |
| 标题 | 回访提醒系统 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P2 |
| 关联需求 | 增强粘性，提升回访率 |

## 背景与问题

### 当前状态
- 访客可提交反馈
- NPC 有记忆系统
- 缺少主动回访引导

### 问题分析
1. **无提醒**: 用户不知道什么时候该回访
2. **关系淡化**: 长时间不回访，关系逐渐遗忘
3. **缺少动机**: 没有明确的回访理由
4. **时机不当**: 提醒可能打扰用户

### 用户故事
```
作为 回访用户
我希望 在合适的时候收到回访提醒
以便 延续和空间的情感联系
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 回访周期检测 | 检测用户适合回访的时机 | P0 |
| 站内回访建议 | 用户打开应用时展示，默认关闭并需 opt-in | P0 |
| 个性化文案 | 根据关系生成提醒内容 | P0 |
| 频率控制 | 避免过度打扰 | P1 |
| 免打扰设置 | 用户可关闭提醒 | P0 |

### 提醒类型

```typescript
type RevisitReminderType =
  | "affinity_decay"      // 亲密度下降提醒
  | "npc_memory"          // NPC 记得你
  | "new_content"         // 空间有新内容
  | "seasonal_event"      // 季节/节日事件
  | "relationship_stage"  // 关系阶段变化

type RevisitReminder = {
  id: string
  type: RevisitReminderType
  tavernId: string
  tavernName: string
  characterName?: string
  title: string
  content: string
  action: {
    label: string
    url: string
  }
  priority: "high" | "medium" | "low"
  sendAt?: Date
}
```

## 设计方案

### 方案一: 站内通知 + 智能提醒

**核心思路**: 站内通知为主，智能控制频率

```
┌─────────────────────────────────────────────────────────┐
│  🔔 通知中心                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💌 小月记得你                                   │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  「上次你来的时候说想吃草莓蛋糕，              │   │
│  │    我今天刚好做了，要不要来尝尝？」            │   │
│  │                                                   │   │
│  │  街角便利店 · 3天前                              │   │
│  │                                                   │   │
│  │  [去看看]                                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📅 回访时机                                     │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  「你已经 5 天没来街角便利店了，               │   │
│  │    小月有点想你了~」                            │   │
│  │                                                   │   │
│  │  [现在就去] [稍后提醒] [不再提醒]              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎁 空间更新                                     │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  委托社增加了新的委托任务                        │   │
│  │                                                   │   │
│  │  [查看更新]                                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⚙️ 提醒设置                                     │   │
│  │  [ ] 亲密度下降提醒                              │   │
│  │  [✓] NPC 记得你                                  │   │
│  │  [✓] 空间更新提醒                                │   │
│  │  提醒频率: [每天最多 1 次 ▼]                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `ReminderService` 服务
2. 新增 `ReminderEngine` 规则引擎
3. 新增 `NotificationPanel` 通知面板
4. 新增 `ReminderSettings` 设置组件

### 方案二: 站外 Push 推送（暂缓）

**核心思路**: 移动端 Push 推送为主

```
┌─────────────────────────────────────────────────────────┐
│  📱 手机通知                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  FableMap                                       │   │
│  │                                                   │   │
│  │  💌 小月: 上次你说的事情有进展了~               │   │
│  │  街角便利店                                      │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  现在                     查看                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**问题**: 需要用户授权推送，触达率不稳定

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 站内通知 + 智能提醒
- **Phase 2**: 方案二 - 站外 Push 推送（需另起 Schema/API/隐私任务）

## 技术实现

### 后端服务

```python
# backend/src/fablemap_api/application/services/revisit_reminder_service.py

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

@dataclass
class RevisitReminder:
    id: str
    type: str
    tavern_id: str
    tavern_name: str
    user_id: str
    title: str
    content: str
    action_url: str
    priority: str
    created_at: datetime

class RevisitReminderService:
    def __init__(self, store, llm_client=None):
        self.store = store
        self.llm_client = llm_client
        self.rules = self._load_rules()

    def check_reminders(self, user_id: str) -> list[RevisitReminder]:
        """检查用户是否有待发送的提醒"""
        reminders = []

        # 获取用户访问过的空间
        visited_taverns = self.store.get_user_visited_taverns(user_id)

        for tavern in visited_taverns:
            # 检查每条规则
            for rule in self.rules:
                if self._should_trigger(rule, tavern, user_id):
                    reminder = self._generate_reminder(rule, tavern, user_id)
                    if reminder:
                        reminders.append(reminder)

        return sorted(reminders, key=lambda r: r.priority)

    def _should_trigger(self, rule, tavern, user_id) -> bool:
        """检查规则是否应该触发"""
        # 检查冷却
        cooldown_key = f"{user_id}:{tavern.id}:{rule.id}"
        if self.store.is_in_cooldown(cooldown_key):
            return False

        # 检查条件
        last_visit = self.store.get_last_visit(user_id, tavern.id)
        days_since_visit = (datetime.now() - last_visit).days

        if "min_days" in rule.conditions:
            if days_since_visit < rule.conditions["min_days"]:
                return False

        if "max_days" in rule.conditions:
            if days_since_visit > rule.conditions["max_days"]:
                return False

        return True

    def _generate_reminder(self, rule, tavern, user_id) -> Optional[RevisitReminder]:
        """生成提醒内容"""
        if self.llm_client:
            # 使用 LLM 生成个性化内容
            return self._generate_llm_reminder(rule, tavern, user_id)
        else:
            # 使用模板
            return self._generate_template_reminder(rule, tavern, user_id)
```

### API 端点

```python
# backend/src/fablemap_api/api/v1/notifications.py

@router.get("/notifications/revisit")
def get_revisit_notifications(
    request: Request,
    limit: int = 20,
) -> dict[str, Any]:
    """获取回访提醒列表"""
    user_id = get_user_id(request)
    reminders = reminder_service.check_reminders(user_id)
    return {"reminders": reminders[:limit]}

@router.put("/notifications/settings")
def update_reminder_settings(
    request: Request,
    data: ReminderSettingsUpdate,
) -> dict[str, Any]:
    """更新提醒设置"""
    user_id = get_user_id(request)
    reminder_service.update_user_settings(user_id, data)
    return {"success": True}

@router.post("/notifications/{notification_id}/dismiss")
def dismiss_notification(
    request: Request,
    notification_id: str,
) -> dict[str, Any]:
    """关闭提醒"""
    user_id = get_user_id(request)
    reminder_service.dismiss_notification(user_id, notification_id)
    return {"success": True}
```

### 前端组件

```typescript
// frontend/app/features/revisit-reminder/

RevisitReminderSystem/
├── index.tsx              // 系统入口
├── ReminderPanel.tsx      // 提醒面板
├── ReminderCard.tsx       // 提醒卡片
├── ReminderSettings.tsx   // 设置组件
└── ReminderNotification.tsx // 推送通知
```

## 验收标准

### 功能验收

- [ ] 正确检测回访时机
- [ ] 提醒内容符合空间氛围
- [ ] 可设置免打扰
- [ ] 可关闭重复提醒

### 交互验收

- [ ] 提醒不打扰正常操作
- [ ] 点击跳转到正确页面
- [ ] 可一键设置

### 频率验收

- [ ] 不超过设定的提醒频率
- [ ] 同类提醒有冷却

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 提醒过于频繁 | 用户厌烦 | 严格频率控制 |
| 文案质量差 | 体验下降 | 模板 + 审核 |

### 依赖

- `memories` 服务 - 读取用户历史
- `affinity` 服务 - 读取关系等级
- `notifications` 服务 - 通知系统

## 校准补充

### 已核对事实

- `.trellis/spec/frontend/revisit-care-notification-boundary.md` 明确规定：当前只能做 design/policy preview，不能启用 push/email/SMS、持久调度或后端投递。
- `/api/v1/notifications` 已有站内通知基础设施，但没有专门的回访提醒调度 Schema。

### 边界修正

- 第一阶段只能做 in-app、opt-in、频率受限、可退订的设计或站内候选提醒。
- 不做营销复活、好友在线提醒、排行榜、公开 feed 或访客社交图谱。
- 个性化文案不能编造新剧情；只能引用已有 owner/visitor 可见事实，或显示模板化回访理由。

### 建议 MVP

1. 先做回访提醒策略预览：用户看到“如果开启，会怎样提醒”，但不真正发送。
2. 若要接入现有通知中心，必须另起 Schema/API 任务，补 opt-in、quiet hours、frequency cap、unsubscribe。
3. 文案来源优先为 last_visit、pending gameplay、owner 回复反馈、已确认 memory/state card。

### 需要确认的问题

- 用户是否愿意接收主动回访提醒？有没有真实用户反馈或目标场景？
- 当前阶段是否接受“只在用户打开应用时展示站内回访建议”，而不是离线推送？
- 回访提醒由店主配置，还是访客自己订阅？

## 下一步

1. **research**: 调研用户偏好的提醒频率
2. **implement**: 实现提醒引擎
3. **check**: 用户测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
