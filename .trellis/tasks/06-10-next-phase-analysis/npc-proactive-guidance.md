# P0-3: NPC 主动引导机制

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-npc-proactive-guidance` |
| 标题 | NPC 主动引导机制 |
| 阶段 | brainstorm |
| 类型 | frontend + backend + LLM |
| 优先级 | P0 |
| 关联需求 | 增强空间生命力，提升互动深度 |

## 背景与问题

### 当前状态
- NPC 作为被动响应者，等待用户输入
- 首次进入时可能有 starter prompts
- 缺少 NPC 主动发起的互动

### 问题分析
1. **单向互动**: 用户不主动，NPC 就不动
2. **冷启动难**: 首次进入时用户不知道说什么
3. **缺少氛围**: 空间缺乏「活」的感觉
4. **回访动机弱**: NPC 不会记住用户或主动联系

### 用户故事
```
作为 回访用户
我希望 NPC 能记住我并在适当时候主动问候
以便感受到这个空间是「活的」
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 入场问候 | 进入空间时 NPC 主动打招呼 | P0 |
| 状态播报 | NPC 定期播报空间/自身状态 | P1 |
| 主动邀请 | NPC 根据用户历史邀请参与活动 | P1 |
| 记忆回调 | NPC 记住上次对话内容并在适当时机提及 | P0 |
| 节日/事件触发 | 特殊时间 NPC 主动发起特殊互动 | P2 |

### NPC 主动行为类型

```typescript
type NpcProactiveAction = {
  type: "greeting" | "status_broadcast" | "invitation" | "memory_recall" | "event_trigger"
  trigger: "enter" | "interval" | "user_history" | "time_based" | "manual"
  priority: number                    // 优先级，数字越小越高
  content: {
    text: string                     // 主动发送的文字
    options?: string[]               // 可选的回复选项
    action?: NpcAction               // 关联的动作
    cooldown?: number                // 冷却时间（秒）
  }
  conditions?: {
    minVisits?: number               // 最少访问次数
    lastVisitDays?: number          // 距上次访问天数
    relationshipLevel?: string      // 关系等级
    timeRange?: [string, string]    // 时间范围
  }
}
```

## 设计方案

### 方案一: 规则引擎驱动（推荐）

**核心思路**: 基于规则配置 + 模板生成触发主动行为

```
┌─────────────────────────────────────────────────────────┐
│  NPC 主动行为引擎                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  触发器     │───▶│  条件检查   │───▶│  行为生成   │  │
│  │  Trigger    │    │  Condition  │    │  Action     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                                    │           │
│         ▼                                    ▼           │
│  ┌─────────────┐                    ┌─────────────┐    │
│  │  冷却管理    │◀──────────────────│  内容渲染    │    │
│  │  Cooldown   │                    │  Render     │    │
│  └─────────────┘                    └─────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**触发器配置示例**:

```javascript
const npcProactiveRules = [
  {
    id: "enter-greeting",
    type: "greeting",
    trigger: "enter",
    conditions: { minVisits: 0 },
    content: {
      firstVisit: "欢迎来到{tavern_name}，我是{name}。有什么我可以帮你的吗？",
      returning: "欢迎回来！上次你走之后，我一直在等你。",
      frequent: "又见面了！感觉你越来越喜欢这里了~"
    },
    cooldown: 3600  // 1小时冷却
  },
  {
    id: "memory-recall-pending-task",
    type: "memory_recall",
    trigger: "enter",
    conditions: { minVisits: 2 },
    content: {
      text: "对了，你上次说想做的事情，完成了吗？",
    },
    cooldown: 7200
  },
  {
    id: "status-broadcast-evening",
    type: "status_broadcast",
    trigger: "interval",
    conditions: { timeRange: ["18:00", "20:00"] },
    content: {
      text: "傍晚的{tavern_name}特别安静呢。要不要来杯咖啡？",
    },
    cooldown: 14400
  }
]
```

**实现要点**:
1. 新增 `NpcProactiveEngine` 服务
2. 新增 `ProactiveTrigger` 配置系统
3. 新增 `ProactiveMessagePanel` 组件
4. 与 `buildFirstMinuteGuide` 集成

### 方案二: LLM 动态生成

**核心思路**: NPC 由 LLM 驱动自主决定主动行为

```
用户进入空间 → LLM 分析上下文 → NPC 决定主动行为 → 执行
```

**问题**:
- 成本高
- 延迟大
- 不可控

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 规则引擎驱动（快速上线）
- **Phase 2**: 方案二 - LLM 增强（作为高级功能）

## 技术实现

### 后端改动

```python
# backend/src/fablemap_api/application/services/npc_proactive_service.py

from dataclasses import dataclass
from typing import Optional
import time

@dataclass
class ProactiveAction:
    id: str
    type: str
    text: str
    options: list[str]
    action: Optional[dict]
    cooldown_end: float

class NpcProactiveService:
    def __init__(self, store, llm_client=None):
        self.store = store
        self.llm_client = llm_client
        self.rules = load_proactive_rules()

    def evaluate_actions(
        self,
        tavern_id: str,
        character_id: str,
        user_id: str,
        context: dict
    ) -> list[ProactiveAction]:
        """评估并返回符合条件的主动行为"""
        actions = []
        for rule in self.rules:
            if self._check_trigger(rule, context) and \
               self._check_conditions(rule, tavern_id, character_id, user_id) and \
               self._check_cooldown(rule, tavern_id, character_id):
                action = self._render_action(rule, context)
                if action:
                    actions.append(action)
        return sorted(actions, key=lambda a: a.priority)

    def record_action(self, tavern_id: str, character_id: str, action_id: str):
        """记录已执行的主动行为，用于冷却管理"""
        key = f"{tavern_id}:{character_id}:{action_id}"
        self.store.set_proactive_cooldown(key, int(time.time()))
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/taverns/{id}/characters/{cid}/proactive` | GET | 获取待触发主动行为 |
| `POST /api/v1/taverns/{id}/characters/{cid}/proactive/execute` | POST | 执行主动行为 |

### 前端改动

```typescript
// frontend/app/components/ProactiveMessagePanel.tsx

function ProactiveMessagePanel({
  actions: ProactiveAction[],
  onAction: (action: ProactiveAction) => void,
  onDismiss: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 优先显示高优先级行为
  const sortedActions = actions.sort((a, b) => a.priority - b.priority)
  const currentAction = sortedActions[currentIndex]

  if (!currentAction) return null

  return (
    <div className="proactive-message-panel">
      <div className="npc-avatar">{/* NPC 头像 */}</div>
      <div className="message-content">
        <p>{currentAction.text}</p>
        {currentAction.options && (
          <div className="options">
            {currentAction.options.map(opt => (
              <button key={opt} onClick={() => handleOption(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onDismiss}>稍后再说</button>
    </div>
  )
}
```

### 数据存储

```sql
-- NPC 主动行为冷却记录
CREATE TABLE npc_proactive_cooldown (
    id TEXT PRIMARY KEY,
    tavern_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    last_executed_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_proactive_cooldown ON npc_proactive_cooldown(tavern_id, character_id, action_id);
```

## 验收标准

### 功能验收

- [ ] 首次进入空间时 NPC 显示入场问候
- [ ] 回访用户显示不同的问候文案
- [ ] 满足条件时显示「记忆回调」
- [ ] 冷却时间内不重复触发同一行为
- [ ] 可手动触发「状态播报」

### 交互验收

- [ ] 主动消息以气泡形式展示
- [ ] 支持选择选项快速回复
- [ ] 支持「稍后再说」折叠
- [ ] 消息有淡入动画

### 性能验收

- [ ] 主动行为查询 < 500ms
- [ ] 不阻塞用户正常聊天输入

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 行为过于频繁 | 用户厌烦 | 严格冷却机制 |
| 文案质量差 | 体验下降 | 模板 + 审核 |
| 多 NPC 冲突 | 多个 NPC 同时发消息 | 优先级 + 互斥 |

### 依赖

- `memories` 服务 - 读取用户历史
- `affinity` 服务 - 读取关系等级
- `taverns` 服务 - 读取空间信息

## 校准补充

### 已核对事实

- 当前已有 first-minute guide、starter prompts、memory atoms、affinity、notifications 等基础能力，但没有独立的 NPC proactive engine。
- `/api/v1/notifications` 支持站内通知和 WebSocket；这不等于 NPC 可以主动跨会话联系访客。
- `docs/FABLEMAP_TAVERN_PLATFORM.md` 允许 NPC 主动接待/引导，但要求服务于空间体验和回访连续性。

### 边界修正

- P0 不建议做“LLM 自主决定主动行为”。第一阶段应是规则/模板驱动，而且只在用户进入空间后的当前会话内触发。
- 主动消息默认不应写入 chat history 或 memory atom；只有用户回应后，才进入正常对话链路。
- 不做站外 push/email/SMS，不做“NPC 追着用户回来”的打扰机制。

### 建议 MVP

1. 做入场接待气泡：首次访问、回访、有未完成玩法/记忆时显示不同模板。
2. 冷却先放在前端会话或 visitor runtime 现有字段可承载的范围内；新增表需要单独 Schema 任务。
3. 多 NPC 情况只选一个 lead character，避免多个 NPC 同时抢话。

### 需要确认的问题

- 主动问候是否允许展示为“系统建议”，而不是 NPC 已发送消息？
- 哪些触发条件可用现有数据可靠判断：visit_count、last_visit、memory atom、gameplay session、affinity？
- 店主是否需要开关来关闭某个空间的主动接待？

## 下一步

1. **research**: 调研其他产品 NPC 主动行为设计
2. **implement**: 实现规则引擎 + 基本触发器
3. **check**: 手工验收 + 用户测试
4. **update-spec**: 更新 NPC 配置文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
