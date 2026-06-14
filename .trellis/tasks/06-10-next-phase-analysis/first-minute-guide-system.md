# P0-2: 第一分钟引导系统完善

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-first-minute-guide-system` |
| 标题 | 第一分钟引导系统完善 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P0 |
| 关联需求 | 降低进入门槛，提升空间体验 |

## 背景与问题

### 当前状态
- `tavern-first-minute.ts` 提供 `buildTavernFirstMinuteGuide` 函数
- 输出包含: `whyHere`, `experienceType`, `tryThisFirst[]`
- 在 Discover 卡片和 RadarEchoCard 中展示

### 问题分析
1. **引导信息单一**: 只有静态文案，缺少动态适配
2. **NPC 未参与**: 第一分钟引导由系统生成，NPC 无法介入
3. **缺少分叉**: 用户无法选择「我想做什么」
4. **过渡生硬**: 进入空间后缺少衔接性引导

### 用户故事
```
作为 首次进入空间的用户
我希望在进入后的 60 秒内明确知道这个空间怎么玩
以便决定是否深入体验
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 空间类型适配 | 不同类型空间展示不同风格引导 | P0 |
| 多入口场景 | 支持「继续上次」「重新开始」「随便看看」 | P1 |
| NPC 开场白 | NPC 根据空间类型生成开场白 | P0 |
| 互动式引导 | 用户可选择「我想做什么」 | P1 |
| 分步引导 | 引导分步骤展示，每步聚焦一个动作 | P2 |

### 引导类型定义

```typescript
type ExperienceType =
  | "conversation"     // 对话探索型
  | "quest"            // 任务委托型
  | "companionship"     // 陪伴树洞型
  | "creation"         // 创作工坊型
  | "ritual"           // 仪式体验型
  | "mystery"          // 悬疑解谜型

type FirstMinuteStep = {
  step: number           // 步骤序号
  title: string          // 步骤标题
  description: string   // 描述
  action?: {
    type: "chat" | "select" | "browse"
    prompt?: string      // 预设输入
    options?: string[]   // 选择项
  }
  npcResponse?: string   // NPC 预期回应
}
```

## 设计方案

### 方案一: 静态引导增强（推荐）

**核心思路**: 扩展现有 `buildTavernFirstMinuteGuide`，增加更多引导维度

```
┌─────────────────────────────────────────────────────────┐
│  欢迎来到「街角便利店」                                  │
│  📍 上海市浦东新区 · 便利店                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🌙 为什么在这里                                        │
│  ────────────────────                                   │
│  这里是城市中最安静的角落，店主「小月」每天              │
│  都会在货架前等待愿意停下脚步的旅人。                   │
│                                                         │
│  🎭 这是一个什么样的空间                                 │
│  ────────────────────                                   │
│  【陪伴树洞】你可以在这里倾诉、聊天，                   │
│  或者只是安静地坐着。小月不会评判，只会倾听。           │
│                                                         │
│  🎯 你想做什么？                                        │
│  ────────────────────                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💬 和小月聊聊今天的烦心事                      │   │
│  │  📖 看看小月分享的故事                          │   │
│  │  🍵 安静地喝一杯                               │   │
│  │  🔍 随便逛逛                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  正在输入... 💬                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 扩展 `ExperienceType` 枚举
2. 新增 `buildFirstMinuteSteps` 生成步骤式引导
3. 新增 `FirstMinuteChoicePanel` 选择面板组件
4. 适配不同空间类型生成不同风格文案

### 方案二: NPC 动态生成

**核心思路**: 第一分钟引导由 LLM 动态生成

```
┌─────────────────────────────────────────────────────────┐
│  [NPC 头像]                                             │
│                                                         │
│  「欢迎来到这里，我是小月。」                          │
│                                                         │
│  「你是第一次来吗？让我给你介绍一下这里吧。」           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [AI 生成的个性化引导文案]                      │   │
│  │  · 这个空间是做什么的                          │   │
│  │  · 你可以在这里做什么                          │   │
│  │  · 从哪里开始比较好                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**问题**: 依赖 LLM 响应速度，需要流式输出优化

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 静态引导增强
- **Phase 2**: 方案二 - NPC 动态生成（作为高级功能）

## 技术实现

### 数据层改动

```typescript
// frontend/app/lib/tavern-first-minute.ts

export type FirstMinuteGuideEnhanced = {
  // 现有字段
  whyHere: string
  experienceType: ExperienceType
  tryThisFirst: string[]

  // 新增字段
  atmosphere: string              // 氛围描述
  npcGreeting?: string            // NPC 开场白（可选）
  steps: FirstMinuteStep[]       // 分步骤引导
  choices: FirstMinuteChoice[]   // 选择项
  quickStarters: StarterPrompt[] // 快速开始选项
}

export type FirstMinuteChoice = {
  id: string
  label: string
  icon: string
  description: string
  starterPrompt?: string
}

export function buildFirstMinuteGuideEnhanced(
  tavern: Tavern,
  characters: TavernCharacter[],
  options?: {
    userVisitCount?: number
    lastVisitDate?: string
    userRelationship?: string
  }
): FirstMinuteGuideEnhanced
```

### 组件层改动

| 组件 | 改动 |
|------|------|
| `FirstMinuteGuidePanel` | 扩展支持多步骤展示 |
| `FirstMinuteChoicePanel` | 新增选择面板 |
| `FirstMinuteNpcGreeting` | NPC 开场白展示 |
| `TavernChatWorkbench` | 集成第一分钟引导 |

### 后端改动

| 端点 | 改动 |
|------|------|
| `GET /api/v1/taverns/{id}` | 新增 `view=first-minute` |
| `POST /api/v1/chat` | 支持 `context=first-minute` |

## 验收标准

### 功能验收

- [ ] 不同 `place_type` 生成不同风格的引导
- [ ] 首次访问显示完整引导
- [ ] 回访用户可选择「继续上次」或「重新开始」
- [ ] 选择「我想做什么」后自动填充输入框
- [ ] 引导文案符合空间氛围

### 交互验收

- [ ] 选择后自动进入对应场景
- [ ] 引导可折叠/展开
- [ ] 跳过引导后可随时呼出

### 内容验收

- [ ] 引导文案符合 SillyTavern 角色设定
- [ ] 避免生成违禁内容
- [ ] 文案长度控制在合理范围（< 200 字）

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 文案生成质量不稳定 | 引导效果差 | 提供模板兜底 |
| 不同角色冲突 | 多个 NPC 冲突 | 优先级排序 |

### 依赖

- `buildTavernFirstMinuteGuide` 现有实现
- `place-types.js` 空间类型定义
- `special-tavern-types.js` 特殊类型定义

## 校准补充

### 已核对事实

- `frontend/app/lib/tavern-first-minute.ts` 已输出 `anchorLine`、`sceneHint`、`experienceType`、`experienceHelper`、`hostRole`、`playObjective`、`startLabel`、`whyHere`、`tryThisFirst`、`quickActions`。
- `TavernChatWorkbench` 已使用 first-minute guide 和 starter prompts；因此本任务不是从零实现，而是优化入口呈现和选择动作。
- `GET /api/v1/taverns/{id}` 已有 `view` 参数，新增 `view=first-minute` 不是必须前置。

### 边界修正

- “NPC 动态生成”不能自动发布空间内容或写入正史。若使用 LLM，只能是运行时引导候选，并且默认不写入 Tavern payload。
- 点击引导选项建议只预填输入框或开始已有 gameplay session，不应自动替用户发送消息。
- 引导文案要来自 owner-authored tavern/NPC/gameplay 信息和现有模板，不能凭空生成新的空间设定。

### 建议 MVP

1. 复用 `quickActions` 做一个更明确的“第一步选择面板”。
2. 回访用户只展示“继续上次/重新开场/随便看看”的本地分支，不新增后端状态字段。
3. 补充针对 `buildTavernFirstMinuteGuide` 的轻量脚本测试，覆盖不同 `place_type`、无 NPC、无坐标降级。

### 需要确认的问题

- 第一分钟引导应展示在 Discover 预览、Tavern 入场页，还是聊天工作台内部首屏？
- NPC 开场白优先取 `first_mes`，还是从 first-minute guide 模板生成“接待语”？
- 是否允许引导自动打开一个已发布玩法，还是必须由用户点击确认？

## 下一步

1. **research**: 分析不同空间类型的引导需求
2. **implement**: 实现 `buildFirstMinuteGuideEnhanced`
3. **check**: 手工验收 + 内容审核
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
