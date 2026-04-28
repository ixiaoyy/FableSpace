# 好感度系统研究文档

## 1. 现有实现分析

### 1.1 数据库模型

**文件**: `backend/src/fablemap_api/infrastructure/models.py`

```python
class VisitorModel(Base):
    __tablename__ = "visitors"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visit_count = Column(Integer, default=0)
    first_visit = Column(DateTime, nullable=True)
    last_visit = Column(DateTime, nullable=True)
    relationship_strength = Column(Float, default=0.0)  # 好感度强度
    relationship_stage = Column(String(32), default="stranger")  # 好感度阶段
```

**现状**:
- 仅有 `relationship_strength` (Float) 和 `relationship_stage` (String)
- 无计算规则
- 无等级晋升机制
- 无 NPC 行为影响

### 1.2 数据访问层

**文件**: `backend/src/fablemap_api/infrastructure/mysql_store.py`

关键方法：
- `get_visitor_state(tavern_id, visitor_id)` - 获取访客状态
- `update_visitor_state(tavern_id, state)` - 更新访客状态
- `_to_visitor_state(model)` - 模型转 DTO

```python
def _to_visitor_state(self, model: VisitorModel) -> VisitorState:
    return VisitorState(
        visitor_id=model.visitor_id,
        tavern_id=model.tavern_id,
        visit_count=model.visit_count or 0,
        first_visit=...,
        last_visit=...,
        relationship_strength=model.relationship_strength or 0.0,
        relationship_stage=model.relationship_stage or "stranger",
    )
```

### 1.3 前端类型定义

**文件**: `frontend/app/lib/taverns.ts`

```typescript
export type VisitorRelationshipPayload = {
  strength?: number
  stage?: string
  [key: string]: unknown
}

export type VisitorStatePayload = {
  visitor_id?: string
  tavern_id?: string
  visit_count?: number
  first_visit?: string | null
  last_visit?: string | null
  relationship?: VisitorRelationshipPayload | null
  [key: string]: unknown
}
```

### 1.4 前端 UI 占位

**文件**: `frontend/app/features/tavern-layout-showcase/index.tsx:473`
```tsx
<span className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-violet-50">好感度</span>
```

**文件**: `frontend/app/product/TavernContextPanel.jsx:206-207`
```javascript
const stage = relationship.stage || visitorState.relationship_stage || ''
const strength = Number(relationship.strength ?? visitorState.relationship_strength ?? 0)
```

**文件**: `frontend/app/product/TavernMemoryPanel.jsx:57-58`
```javascript
stage: relationship.stage || visitorState.relationship_stage || '',
strength: Number(relationship.strength ?? visitorState.relationship_strength ?? 0),
```

### 1.5 Orchestrator 集成

**文件**: `frontend/app/product/services/orchestrator.js`

```javascript
export function applyOrchestration(output, callbacks) {
  const { observer_effect, broadcasts, events, relationship_strength } = output;
  // ...
  if (relationship_strength !== undefined && callbacks.onRelationshipUpdate) {
    callbacks.onRelationshipUpdate(relationship_strength);
  }
}
```

### 1.6 Place Protocol

**文件**: `frontend/app/product/services/placeProtocol.js`

```javascript
* @property {number} relationship_strength - 关系强度 0.0–1.0
* @property {'unexplored'|'observed'|'dwelling'|'marked'|'familiar'|'home'} relationship_stage
```

## 2. 需要修改的文件

### Backend

| 文件 | 修改内容 |
|------|---------|
| `backend/src/fablemap_api/core/affinity.py` | **新建** - 好感度枚举、计算器、Prompt 生成 |
| `backend/src/fablemap_api/core/prompt_builder.py` | 注入好感度上下文 |
| `backend/src/fablemap_api/application/services/characters.py` | 对话后触发好感度更新 |
| `backend/src/fablemap_api/application/services/gameplay.py` | 完成任务触发好感度更新 |
| `backend/src/fablemap_api/infrastructure/models.py` | 可选扩展字段（milestones, exp_points） |
| `backend/src/fablemap_api/infrastructure/mysql_store.py` | 添加好感度便捷方法 |
| `backend/src/fablemap_api/api/v1/affinity.py` | **新建** - API 端点 |

### Frontend

| 文件 | 修改内容 |
|------|---------|
| `frontend/app/components/AffinityBadge.tsx` | **新建** - 好感度徽章组件 |
| `frontend/app/components/AffinityProgress.tsx` | **新建** - 好感度进度条组件 |
| `frontend/app/components/AffinityContext.tsx` | **新建** - React Context |
| `frontend/app/product/TavernContextPanel.jsx` | 集成好感度展示 |
| `frontend/app/product/TavernMemoryPanel.jsx` | 集成好感度展示 |
| `frontend/app/lib/taverns.ts` | 添加亲和度相关类型 |

## 3. 设计决策

### 3.1 向后兼容策略

保持现有字段不变：
- `relationship_strength` 继续存储 0.0-1.0 浮点数
- `relationship_stage` 继续存储字符串（枚举名）

新增字段（可选扩展）：
- `affinity_exp_points`: 累积经验值
- `affinity_milestones`: 已解锁里程碑列表

### 3.2 计算触发点

1. **每次 Chat 响应后** - 评估访客消息情感
2. **每次 Gameplay 完成/放弃后** - 根据结果调整
3. **定时任务** - 好感度衰减（可选）

### 3.3 NPC 行为影响方式

通过 Prompt Builder 注入：

```
[VISITOR_AFFINITY]
stage: friend
strength: 0.65
unlocked_topics: ["深夜心事", "童年回忆"]
exclusive_greetings: ["嘿，老朋友！", "今天又来啦？"]
[/VISITOR_AFFINITY]
```

NPC 应该：
- 根据 stage 选择称呼风格
- 根据 unlocked_topics 开放话题
- 根据 exclusive_greetings 选择问候语

## 4. 风险与注意事项

1. **LLM Token 消耗** - 情感分析会增加每次请求 token
   - 缓解：可采样分析而非每次都分析

2. **好感度通胀** - 长期玩家可能积累极高好感度
   - 缓解：设置上限 + 衰减机制

3. **跨酒馆一致性问题** - 好感度是否跨酒馆？
   - MVP 决策：好感度按酒馆独立

4. **恶意刷好感度** - 自动化脚本刷好感
   - 缓解：设置每日上限 + 冷却时间

## 5. 参考资料

- SillyTavern 的 character interactions 机制
- 原神/崩坏等游戏的角色好感度系统
- visual novel 游戏的 relationship meters
