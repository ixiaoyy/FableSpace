# P0-4: 新手引导流程

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-newcomer-guidance-flow` |
| 标题 | 新手引导流程 |
| 阶段 | brainstorm |
| 类型 | frontend |
| 优先级 | P0 |
| 关联需求 | 降低流失率，提升新用户转化 |

## 背景与问题

### 当前状态
- 公益空间 `pw_lantern_helpdesk` 作为新手入口
- `resolveNewcomerTavern` 提供新手空间解析
- 缺少系统性的新手引导流程

### 问题分析
1. **入口模糊**: 新用户不知道该进入哪个空间
2. **缺少教程**: 没有交互式引导教用户怎么玩
3. **目标不明确**: 新用户不知道能在这里做什么
4. **成就感缺失**: 没有「新手上路」的引导和反馈

### 用户故事
```
作为 新注册用户
我希望 有一个清晰的新手引导带我体验核心功能
以便快速了解这个产品能给我带来什么价值
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 首次进入引导 | 检测新用户并展示引导浮层 | P0 |
| 交互式教程 | 分步骤引导用户完成首个任务 | P0 |
| 目标激励 | 设定小目标并展示进度 | P1 |
| 完成反馈 | 完成新手任务后展示轻量反馈 | P1 |
| 跳过机制 | 可选择跳过引导直接体验 | P0 |

### 新手任务设计

```typescript
type NewcomerTask = {
  id: string
  title: string
  description: string
  type: "explore" | "chat" | "create" | "share"
  target: {
    type: "tavern" | "character" | "action"
    id?: string
    count?: number
  }
  feedback?: {
    message: string
    nextAction?: string
  }
}

type NewcomerGuideFlow = {
  steps: NewcomerStep[]
  tasks: NewcomerTask[]
  completionReward: CompletionReward
}

type NewcomerStep = {
  step: number
  title: string
  target: {
    type: "discover" | "tavern" | "chat" | "create"
    path: string
  }
  highlight?: {
    selector: string
    message: string
  }
  completion: {
    condition: string
    successMessage: string
  }
}
```

## 设计方案

### 方案一: 引导浮层 + 任务面板

**核心思路**: 检测新用户，展示引导浮层引导完成任务

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎯 新手任务 1/4                                 │   │
│  │                                                 │   │
│  │  探索你的第一个空间                             │   │
│  │  ────────────────────                           │   │
│  │  点击下方地图，发现附近亮起的空间入口，        │   │
│  │  选择一个感兴趣的空间进入。                   │   │
│  │                                                 │   │
│  │  ┌─────────────┐         ┌─────────────┐       │   │
│  │  │   我知道了   │         │   跳过引导   │       │   │
│  │  └─────────────┘         └─────────────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📍 [地图/Discover 页面]                        │   │
│  │  [高亮标注引导点击位置]                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**新手任务列表**:

| 任务 | 描述 | 目标 |
|------|------|------|
| 任务 1 | 探索第一个空间 | 进入任意公开空间 |
| 任务 2 | 和 NPC 打个招呼 | 发送一条消息 |
| 任务 3 | 留下你的足迹 | 提交一条访客反馈 |
| 任务 4 | 记住回访入口 | 看到自己的回访/记忆入口 |

**实现要点**:
1. 新增 `NewcomerGuideProvider` 上下文组件
2. 新增 `GuideOverlay` 浮层组件
3. 新增 `NewcomerTaskPanel` 任务面板
4. 新增 `NewcomerCompletionToast` 完成反馈

### 方案二: 场景化引导

**核心思路**: 把引导嵌入真实场景，边做边学

```
┌─────────────────────────────────────────────────────────┐
│  [空间内部]                                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💬 首次对话引导                                  │   │
│  │                                                 │   │
│  │  「嗨，我是小月！」                              │   │
│  │                                                 │   │
│  │  小提示: 输入你的回复，按 Enter 发送。           │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  输入框: 和小月打个招呼                   │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                       [发送]                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**问题**: 实现复杂度高，需要和 NPC 聊天深度集成

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 引导浮层 + 任务面板（快速上线）
- **Phase 2**: 方案二 - 场景化引导（深度体验）

## 技术实现

### 前端改动

```typescript
// frontend/app/components/NewcomerGuide/

// NewcomerGuideProvider.tsx
export function NewcomerGuideProvider({ children }: { children: ReactNode }) {
  const [guideState, setGuideState] = useState<NewcomerGuideState>()
  const [currentStep, setCurrentStep] = useState(0)

  // 检测是否新用户
  const isNewcomer = useIsNewcomer()

  // 已完成新手引导
  const hasCompleted = useHasCompletedNewcomerGuide()

  if (!isNewcomer || hasCompleted) {
    return <>{children}</>
  }

  return (
    <NewcomerGuideContext.Provider value={{ guideState, currentStep }}>
      {children}
      <GuideOverlay />
      <NewcomerTaskPanel />
    </NewcomerGuideContext.Provider>
  )
}

// GuideOverlay.tsx
function GuideOverlay() {
  const { guideState, currentStep } = useContext(NewcomerGuideContext)
  const step = GUIDE_STEPS[currentStep]

  return (
    <div className="guide-overlay">
      <div
        className="highlight-area"
        style={calculateHighlightPosition(step.target)}
      >
        <div className="guide-tooltip">
          <p className="guide-title">{step.title}</p>
          <p className="guide-description">{step.description}</p>
          <div className="guide-actions">
            <button onClick={handleNext}>我知道了</button>
            <button onClick={handleSkip}>跳过引导</button>
          </div>
        </div>
      </div>
      <div className="mask-layer" onClick={handleMaskClick} />
    </div>
  )
}
```

### 状态管理

```typescript
// frontend/app/lib/newcomer-guide.ts

export const GUIDE_STEPS: NewcomerStep[] = [
  {
    step: 1,
    title: "探索你的第一个空间",
    target: { type: "discover", path: "/discover" },
    highlight: {
      selector: "[data-tavern-list]",
      message: "点击这里发现附近的空间"
    },
    completion: {
      condition: "visit_tavern",
      successMessage: "太棒了！你找到了第一个空间"
    }
  },
  // ...
]

export const NEWCOMER_TASKS: NewcomerTask[] = [
  {
    id: "explore-first",
    title: "探索你的第一个空间",
    description: "发现附近亮起的空间入口",
    type: "explore",
    target: { type: "tavern", count: 1 },
    feedback: { message: "你找到了第一个空间入口" }
  },
  {
    id: "chat-greeting",
    title: "和 NPC 打个招呼",
    description: "发送一条消息给空间里的 NPC",
    type: "chat",
    target: { type: "action", count: 1 },
    feedback: { message: "你完成了第一次 NPC 对话" }
  },
  {
    id: "leave-feedback",
    title: "留下你的足迹",
    description: "提交一条访客反馈",
    type: "explore",
    target: { type: "action", count: 1 },
    feedback: { message: "这条反馈只会进入店主可见范围" }
  },
  {
    id: "find-revisit-entry",
    title: "记住回访入口",
    description: "看到这个空间的回访/记忆入口",
    type: "explore",
    target: { type: "action", count: 1 },
    feedback: { message: "你之后可以从这里回到这个空间" }
  }
]
```

### 数据存储

```typescript
// localStorage 存储
const NEWCOMER_STORAGE_KEY = "fablemap.newcomer"

type NewcomerProgress = {
  isNewcomer: boolean
  completedSteps: number[]
  completedTasks: string[]
  startedAt: number
  completedAt?: number
}
```

## 验收标准

### 功能验收

- [ ] 新用户首次访问显示引导浮层
- [ ] 引导步骤可正常切换
- [ ] 完成任务后显示进度更新
- [ ] 可选择跳过引导
- [ ] 完成后显示轻量反馈
- [ ] 再次访问不再显示引导

### 交互验收

- [ ] 高亮区域可点击
- [ ] 点击遮罩层有反馈
- [ ] 引导浮层位置正确
- [ ] 进度条展示清晰

### 性能验收

- [ ] 引导组件不影响页面加载
- [ ] 动画流畅（60fps）

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 引导过于干扰 | 用户厌烦 | 提供跳过 + 减少步骤 |
| 高亮位置不准 | 引导失效 | 多端测试 + 回退机制 |

### 依赖

- `resolveNewcomerTavern` 现有实现
- `NewcomerTavernService` 服务

## 校准补充

### 已核对事实

- 现有 `frontend/app/product/services/newcomerTavern.js` 和 `resolveNewcomerTavern` 可作为新手入口基础。
- 第一阶段可完全前端本地状态实现，不需要新增用户表或成就表。

### 边界修正

- “奖励/成就/亲密度 +10”容易滑向传统游戏化系统。新手引导应强调完成核心体验，而不是发放数值奖励。
- 不应把“分享给朋友”列为必须完成的新手任务；分享可以是可选出口，避免增长任务压过产品主线。
- 引导不应干扰用户进入真实空间，也不应强制创建空间。

### 建议 MVP

1. 新手 checklist 只保留三步：发现一个空间、进入空间、发送/编辑第一条消息。
2. 状态用 localStorage 保存，用户可跳过和重置。
3. 公益新手空间只作为兜底入口，不替代真实附近空间发现。

### 需要确认的问题

- 新用户定义是什么：首次打开浏览器、本地未完成引导，还是后端真实账号首次访问？
- 新手流程优先服务探索者，还是也要覆盖店主首次创建空间？
- 是否允许引导浮层遮住真实内容，还是采用页面内轻提示更合适？

## 下一步

1. **research**: 调研其他产品新手引导设计
2. **implement**: 实现引导浮层 + 任务面板
3. **check**: 用户测试 + 漏斗分析
4. **update-spec**: 更新新手入口文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
