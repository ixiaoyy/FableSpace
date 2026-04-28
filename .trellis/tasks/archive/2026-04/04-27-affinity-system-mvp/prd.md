# 好感度系统 MVP PRD

## Goal

实现完整的访客-NPC 好感度系统，包括：
1. **好感度等级制度**：从陌生人到挚友（以及可能的宿敌路线）
2. **好感度计算规则**：基于聊天内容质量、互动事件、正负反馈
3. **好感度影响 NPC 行为**：prompt 注入机制，让 AI 根据好感度调整语气、话题开放度、解锁专属对话
4. **前端 UI 展示**：好感度进度条、等级名称、阶段标识

## What I Already Know

- 现有 `VisitorModel` 已有 `relationship_strength` (Float, 0.0) 和 `relationship_stage` (String, "stranger")
- `mysql_store.py` 的 `update_visitor_state` 方法更新这些值
- 前端 `taverns.ts` 有 `VisitorRelationshipPayload` 类型
- `placeProtocol.js` 和 `orchestrator.js` 处理 relationship_strength 回调
- `TavernContextPanel.jsx` 和 `TavernMemoryPanel.jsx` 已有"好感度"UI 占位

## Requirements

### 1. 好感度等级制度

定义有限枚举的阶段类型：

| Stage | Name (CN) | Name (EN) | Strength Range | Description |
|-------|-----------|-----------|----------------|-------------|
| stranger | 陌生人 | Stranger | 0.0 - 0.15 | 初次接触，礼貌但保持距离 |
| acquaintance | 点头之交 | Acquaintance | 0.15 - 0.30 | 知道对方存在，偶有交流 |
| familiar | 熟面孔 | Familiar | 0.30 - 0.50 | 经常见面，开始闲聊 |
| friend | 朋友 | Friend | 0.50 - 0.70 | 可以分享日常，有一定信任 |
| close_friend | 挚友 | Close Friend | 0.70 - 0.90 | 无话不谈，互相关心 |
| best_friend | 知己 | Best Friend | 0.90 - 1.0 | 最高羁绊，特殊待遇 |

可选扩展（负向路线）：

| Stage | Name (CN) | Name (EN) | Strength Range |
|-------|-----------|-----------|----------------|
| disliked | 厌恶 | Disliked | -0.3 - 0.0 |
| rival | 宿敌 | Rival | -0.6 - -0.3 |
| nemesis | 死敌 | Nemesis | -1.0 - -0.6 |

### 2. 好感度计算规则

#### 2.1 基础变化规则

- 每次成功对话：+1~3 好感度点
- 完成小游戏/任务：+5~10 好感度点
- 长时间未访问（>7天）：-2 好感度点（衰减）
- 长时间未访问（>30天）：-5 好感度点（大幅衰减）
- 连续 3 次未回复：-3 好感度点

#### 2.2 内容质量评估

基于聊天内容情感分析（LLM 判断）：
- 真诚赞美、关心：+2~5
- 积极互动、幽默回应：+1~3
- 中性对话：+0~1
- 敷衍、无意义消息：+0
- 负面情绪、抱怨：-1~2
- 冒犯、不礼貌：-5~10

#### 2.3 等级晋升条件

- 每个等级需要累积一定"好感度经验值"
- 晋升时触发特殊对话/事件
- 降级时触发警告对话

### 3. 好感度影响 NPC 行为

#### 3.1 Prompt 注入机制

在 `prompt_builder.py` 中注入访客好感度上下文：

```
[VISITOR_CONTEXT]
当前关系：朋友 (Friend)
好感度：65%
上次访问：2天前
特殊羁绊：已完成"深夜心事"对话
[/VISITOR_CONTEXT]

NPC 应该：
- 使用更亲密的称呼
- 分享更多个人话题
- 偶尔主动问候
```

#### 3.2 行为差异

| 等级 | 称呼风格 | 话题范围 | 特殊权限 |
|------|---------|---------|---------|
| Stranger | 礼貌称呼 | 公共话题 | 无 |
| Acquaintance | 直呼姓名 | 日常闲聊 | 无 |
| Familiar | 昵称 | 兴趣爱好 | 无 |
| Friend | 昵称+亲昵词 | 个人话题 | 查看日常 |
| Close Friend | 亲昵称呼 | 秘密话题 | 解锁表情 |
| Best Friend | 特殊称呼 | 核心秘密 | 专属剧情 |

### 4. 前端 UI

#### 4.1 好感度展示组件

- 进度条显示当前好感度百分比
- 阶段名称（中英文）
- 下一阶段进度预览
- 好感度变化动画（上升/下降提示）

#### 4.2 位置

- TavernContextPanel 中显示
- TavernMemoryPanel 中显示
- Tavern 进入时欢迎语中体现

## Acceptance Criteria

### Backend
- [ ] `AffinityStage` 枚举类型定义（向后兼容 relationship_stage String）
- [ ] `AffinityCalculator` 服务类实现好感度计算逻辑
- [ ] Chat/GroupChat 响应后自动计算并更新访客好感度
- [ ] Prompt builder 注入访客好感度上下文
- [ ] 新增 `/api/v1/affinity/stages` 端点返回阶段定义
- [ ] 单元测试覆盖好感度计算规则

### Frontend
- [ ] `AffinityBadge` 组件（阶段图标+名称）
- [ ] `AffinityProgress` 组件（进度条）
- [ ] ContextPanel 集成好感度展示
- [ ] 好感度变化动画效果
- [ ] 单元测试覆盖 UI 组件

### Integration
- [ ] E2E 测试：进入酒馆 → 对话 → 好感度变化
- [ ] 验证高好感度解锁特殊对话
- [ ] 验证好感度衰减机制

## Out of Scope

- 好友系统、私信、社交图谱
- 虚拟物品/礼物系统
- 公会/联盟好感度
- P2P 玩家间好感度
- 好感度排行榜
- 跨酒馆好感度继承

## Technical Approach

### Backend

1. **新增 `affinity.py` 模块**（`backend/src/fablemap_api/core/affinity.py`）：
   - `AffinityStage` 枚举
   - `AffinityCalculator` 类
   - 好感度计算规则实现
   - Prompt 上下文生成

2. **修改现有模块**：
   - `prompt_builder.py`：注入好感度上下文
   - `characters.py`：对话后触发好感度更新
   - `mysql_store.py`：保持现有字段，添加便捷方法

3. **向后兼容**：
   - `relationship_stage` 保持 String 类型，存储枚举名
   - `relationship_strength` 保持 Float，存储 0.0-1.0

### Frontend

1. **新增组件**：
   - `AffinityBadge.tsx`
   - `AffinityProgress.tsx`
   - `AffinityContext.tsx`（React Context）

2. **修改现有组件**：
   - `TavernContextPanel.jsx`：集成好感度展示
   - `ChatPanel.jsx`：显示好感度变化反馈

3. **新增 API**：
   - `getAffinityStages()`：获取阶段定义

### Data Model

```typescript
// 扩展现有 VisitorState
type AffinityStage =
  | 'stranger'
  | 'acquaintance'
  | 'familiar'
  | 'friend'
  | 'close_friend'
  | 'best_friend'
  | 'disliked'
  | 'rival'
  | 'nemesis'

type AffinityState = {
  stage: AffinityStage
  strength: number  // 0.0 - 1.0 (或负数用于负向)
  exp_points: number  // 累积经验值
  last_interaction: string  // ISO timestamp
  interaction_count: number  // 互动次数
  milestone_dialogues: string[]  // 已解锁的里程碑对话ID
}

type AffinityContext = {
  visitor_affinity: AffinityState
  npc_greeting_style: 'formal' | 'casual' | 'intimate' | 'special'
  unlocked_topics: string[]
  exclusive_dialogues: string[]
}
```

## Verification

```bash
# Backend
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_affinity.py --tb=short

# Frontend
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build

# E2E
py -3 -m pytest -q tests/test_affinity_e2e.py --tb=short

# Task validation
py -3 .\.trellis\scripts\task.py validate .\.trellis\tasks\04-27-affinity-system-mvp
```

## Decision (ADR-lite)

**Context**: 用户要求实现完整好感度系统 + NPC 行为影响。现有系统仅有基础字段，无计算规则、无行为影响、无完整 UI。

**Decision**: 在现有 VisitorModel 基础上扩展，采用"枚举阶段 + 数值强度 + Prompt 注入"方案：
1. 枚举保证类型安全，String 存储保证向后兼容
2. 计算规则基于事件驱动，LLM 辅助情感分析
3. Prompt 注入在 prompt_builder 层统一处理
4. UI 采用渐进式展示，不影响现有布局

**Consequences**: 可在 MVP 范围内完成完整好感度体验；长期可扩展为羁绊系统或关系树。
