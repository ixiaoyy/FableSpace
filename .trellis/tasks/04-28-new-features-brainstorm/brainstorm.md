# 头脑风暴：FableMap 新功能方向

## 当前平台状态

### 已实现功能
- ✅ **LLM 客户端** - 24+ 后端支持（OpenAI、Claude、Ollama、OpenRouter 等）
- ✅ **角色卡导入** - SillyTavern V2/V3 JSON 和 PNG tEXt chunk
- ✅ **NPC 表情系统** - ExpressionSelector + 自动表情检测
- ✅ **酒馆内部 UI** - CharAvatar + 布局样式背景 + 场景氛围
- ✅ **公益酒馆** - 8 个预设公益酒馆（新手服务站、深夜树洞、社区修补铺等）
- ✅ **玩法系统** - GameplayDefinitionEditor + 游戏流程引擎
- ✅ **关系系统** - Affinity system（MVP 完成）
- ✅ **访客追踪** - visit_count、familiarity、visitor_relationship

### 技术栈
- **后端**: FastAPI + MySQL + Redis
- **前端**: React + React Router + Tailwind CSS + Radix UI
- **AI**: SillyTavern 兼容格式

---

## 新功能方向候选

### 方向 1：Home 个人主页系统

**核心概念**：每个用户都可以拥有自己的 Home，可以被其他用户拜访。

```typescript
interface Home {
  id: string
  owner_id: string
  name: string
  description: string
  avatar?: string
  theme: 'cozy' | 'modern' | 'vintage' | 'fantasy'
  characters: Character[]
  visit_settings: {
    public: boolean
    approval_required: boolean
    friends_only: boolean
  }
}
```

**候选功能**：
- Home 形象设置（封面、主题色）
- Home 成员管理（家庭成员、宠物、幻想生物）
- Home 拜访系统（邀请链接、访问审批）
- Home 访客留言板

**MVP 范围**：
- Home 基础 CRUD
- Home 角色列表
- 公开 Home 发现页面
- 拜访流程（进入 → 角色展示 → 对话）

---

### 方向 2：地点类型扩展

**核心概念**：酒馆只是 Place 的一种类型，扩展到更多现实地点。

| 类型 | 描述 | 默认氛围 | 典型场景 |
|------|------|----------|----------|
| 酒馆 | 夜间聚会 | 昏暗温暖 | 老友聊天 |
| 咖啡店 | 白日休闲 | 明亮轻快 | 独自工作 |
| 奶茶店 | 年轻人聚集 | 活泼可爱 | 闺蜜聚会 |
| 书店 | 安静阅读 | 文艺沉静 | 独自阅读 |
| 便利店 | 24h 服务 | 便利亲切 | 深夜独处 |
| 学校 | 教育场所 | 青春活力 | 师生互动 |

**候选功能**：
- 地点类型选择器
- 类型特定的模板预设
- 类型特定的 layout_style 变体
- 类型发现过滤器

**MVP 范围**：
- 添加 2-3 种新地点类型
- 类型选择 UI
- 类型发现页面筛选

---

### 方向 3：Quest 任务系统

**核心概念**：为探索者设计引导性任务，增加探索动力。

```typescript
interface Quest {
  id: string
  title: string
  description: string
  type: 'exploration' | 'social' | 'creation'
  objectives: QuestObjective[]
  rewards: QuestReward[]
}

interface QuestProgress {
  quest_id: string
  visitor_id: string
  status: 'active' | 'completed' | 'abandoned'
  progress: number  // 0-100
}
```

**候选任务类型**：

| 类型 | 描述 | 示例 |
|------|------|------|
| 探索任务 | 发现并拜访特定地点 | "拜访 3 家咖啡店" |
| NPC 任务 | 与特定 NPC 互动 | "和老王聊一次天" |
| Home 拜访 | 拜访朋友 Home | "拜访 5 个公开 Home" |
| 创作任务 | 创建新内容 | "创建一个自己的酒馆" |
| 收集任务 | 收集特定角色/物品 | "收集 10 种不同表情" |

**MVP 范围**：
- 系统预设任务列表
- 任务进度追踪
- 任务完成奖励展示

---

### 方向 4：社交互动增强

**核心概念**：增强访客与访客之间、访客与主人之间的互动。

**候选功能**：

| 功能 | 描述 | 复杂度 |
|------|------|--------|
| 访客留言板 | 在地点留下公开留言 | 中 |
| 主人回复 | 酒馆主人可以回复访客 | 低 |
| 访客名单 | 显示最近拜访过的人 | 低 |
| 点赞/收藏 | 对地点点赞或收藏 | 低 |
| 拜访通知 | 当有人拜访时通知主人 | 中 |

**MVP 范围**：
- 访客留言板（公开留言 → 主人回复）
- 拜访通知（WebSocket 推送）

---

### 方向 5：内容创作工具增强

**核心概念**：为酒馆主人提供更好的创作工具。

**候选功能**：

| 功能 | 描述 | 复杂度 |
|------|------|--------|
| 场景生成器 | AI 辅助生成场景描述 | 高 |
| NPC 批量创建 | 批量导入/创建 NPC | 中 |
| WorldInfo 可视化 | 可视化编辑 WorldInfo | 中 |
| 玩法模板 | 预设玩法模板库 | 中 |
| AI 对话模拟 | 预览 AI 回复效果 | 高 |

**MVP 范围**：
- 场景生成器（使用现有 LLM）
- NPC 批量创建
- 玩法模板库

---

### 方向 6：Owner Dashboard 酒馆主人面板

**核心概念**：为酒馆主人提供数据分析和管理工具。

```typescript
interface TavernMetrics {
  tavern_id: string
  visit_count: number
  unique_visitors: number
  avg_session_duration: number
  top_characters: Character[]
  peak_hours: string[]
  visitor_sentiment: 'positive' | 'neutral' | 'negative'
}
```

**候选功能**：

| 功能 | 描述 | 复杂度 |
|------|------|--------|
| 访客统计 | 访客数量、趋势图 | 低 |
| Token 用量 | LLM Token 消耗统计 | 低 |
| NPC 互动排行 | 最受欢迎 NPC | 低 |
| 访客反馈 | 访客满意度收集 | 中 |
| 营业时间 | 设置酒馆营业时间 | 中 |

**MVP 范围**：
- 访客统计面板
- Token 用量统计
- 访客趋势图

---

### 方向 7：通知系统

**核心概念**：实时通知用户重要事件。

**候选通知类型**：

| 类型 | 触发条件 | 接收人 |
|------|----------|--------|
| 新访客 | 有人进入酒馆 | 酒馆主人 |
| NPC 回复 | AI 生成新消息 | 访客 |
| 任务完成 | 任务达成 | 访客 |
| Home 拜访请求 | 有人想拜访 Home | Home 主人 |
| 访客留言 | 新留言 | 酒馆主人 |

**技术方案**：
- WebSocket 实时推送
- SSE (Server-Sent Events)
- 轮询（简单场景）

**MVP 范围**：
- WebSocket 基础架构
- 新访客通知（主人端）

---

### 方向 8：移动端适配

**核心概念**：优化移动端用户体验。

**候选功能**：

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 响应式布局 | 移动端自适应 | 高 |
| 触摸优化 | 更大的触摸目标 | 高 |
| 离线缓存 | 缓存已访问酒馆 | 中 |
| PWA 支持 | 添加到主屏幕 | 中 |
| 推送通知 | 移动端推送 | 中 |

**MVP 范围**：
- 响应式布局修复
- 触摸优化

---

## 2026-04-29 状态刷新

### 已从本 brainstorm 拆出并完成 / 进入 review 的方向

| 原方向 | 当前状态 | 备注 |
|--------|----------|------|
| Owner Dashboard | 尚未实现 | 仍是高价值方向，但应先做“店主驾驶舱视觉壳 + 已有数据入口”，避免提前承诺复杂统计口径。 |
| 访客留言板 | 已收敛为 **Tavern Visitor Notes** 并完成 | 原“公开留言板 / 主人回复 / pin”会滑向无边界访客社交，已改为访客给店主的 owner-visible 回访反馈。 |
| 通知系统 | review | WebSocket MVP 已接入，后续可做前端通知中心表现化，而不是继续扩协议。 |
| 地点类型扩展 | review | `/create` 已有地点类型视觉卡片；后续若继续做，应偏发现页筛选和视觉呈现，不急于改 Schema。 |
| 移动端适配 | review | 已有移动底部导航 dock；后续可做关键页面移动首屏质量。 |
| AI 辅助创作 | completed | 已做店主确认的 AI tavern drafts，符合“AI 草稿不得自动发布”。 |
| 街区传闻 | completed | 已做 neighborhood rumor system，注意保持“地点氛围 / 酒馆入口”，不要演化成公共社交流。 |

### 需要修正或降级的旧候选

- **Home 个人主页系统**：与当前“真实坐标酒馆”主线有张力。若继续，必须定义为“挂接真实坐标的私人/半私人场所类型”，不能变成无锚点个人空间。
- **Quest 任务系统**：不能做传统 RPG 任务、等级、装备、排行。可替代为“探索清单 / 店主配置的轻量引导”，目标是帮助访客理解酒馆内容，而不是游戏化刷任务。
- **社交互动增强**：公开留言、访客名单、点赞收藏、主人回复都需要重新评审，避免形成访客间社交网络。当前允许方向是 owner-visible feedback、单酒馆内且店主治理的互动。
- **Token 统计**：允许给店主参考，但不能做平台充值、结算、抽成或访客可见消耗。

### 下一轮最适合认领的 3 个实现候选

#### 候选 A：Owner Dashboard 表现化 MVP（推荐）

**目标**：给店主一个高质量视觉面板，把已有能力聚合起来：我的酒馆、访问/反馈摘要、LLM 配置状态、AI 草稿入口、通知入口。

**为什么推荐**：
- 贴合产品主线“店主维护”。
- 复用已有 taverns / visitor notes / notifications / owner LLM config，不需要先扩复杂 Schema。
- 能显著提升整体产品完成度和 demo 观感。

**边界**：
- 不做复杂 BI、排行、商业化 token 账单。
- Token 只作为 owner 参考状态，不做计费。
- 不暴露访客隐私或 API Key。

**MVP 交付**：
- 新增或强化 owner/dashboard 路由或组件。
- 展示店主名下酒馆卡片、公开状态、角色数量、反馈入口、LLM 配置状态。
- 做移动端可用的高视觉质量布局。

#### 候选 B：Create Tavern 分步向导 + 创作质量提升

**目标**：把 `/create` 从表单堆叠升级成分步创作流程：选坐标/地点类型 → 写酒馆设定 → 添加/导入/AI 草稿 NPC → 配置访问与 LLM。

**价值**：
- 直接改善“开店”核心转化。
- 能把 AI 草稿、角色卡导入、地点类型视觉卡整合成完整体验。

**风险**：
- UI 范围较大，容易夹带数据模型变更。
- 需要严格保持“店主确认后保存”，AI 草稿不能自动上线。

#### 候选 C：Tavern Discovery 高质量发现页

**目标**：强化 `/discover` 或首页到发现页的浏览体验：按地点类型 / 氛围 / 公开状态筛选，卡片更像“赛博酒馆入口”。

**价值**：
- 改善探索者第一体验。
- 可复用现有 place type 元数据、rumor bubble、public welfare tavern assets。

**风险**：
- 不能做传统 POI 搜索、评分排行、路线规划。
- 不应继续投入复杂地图视觉资源包。

### 当前建议

优先选择 **候选 A：Owner Dashboard 表现化 MVP**。它能把最近完成的“通知、访客反馈、AI 草稿、地点类型、移动导航”串成店主可理解的运营入口，同时不触碰负面清单。

---

## 功能优先级排序（原始记录）

根据实现复杂度和用户价值排序：

| 优先级 | 功能 | 原因 |
|--------|------|------|
| P1 | **Owner Dashboard** | 高价值，低复杂度，直接提升主人体验 |
| P1 | **访客留言板** | 低复杂度，增加互动 |
| P2 | **通知系统** | 中复杂度，提升留存 |
| P2 | **地点类型扩展** | 中复杂度，扩展内容 |
| P2 | **Quest 任务系统** | 高价值，中复杂度 |
| P3 | **Home 系统** | 高价值，高复杂度 |
| P3 | **移动端适配** | 中等价值，必备功能 |

---

## 待讨论问题

1. **Home 系统是否是核心方向？**
   - 选项 A：Home 是核心，所有用户都有 Home
   - 选项 B：Home 是可选扩展，优先完善酒馆体验
   - 选项 C：暂时搁置，专注完善现有酒馆功能

2. **通知系统使用什么技术？**
   - 选项 A：WebSocket（实时但复杂）
   - 选项 B：SSE（简单但单向）
   - 选项 C：轮询（简单但延迟）

3. **Quest 任务系统由谁创建？**
   - 选项 A：平台预设 + 用户创建
   - 选项 B：仅平台预设
   - 选项 C：AI 自动生成

4. **地点类型是否有数量限制？**
   - 选项 A：固定 5-8 种，手动管理
   - 选项 B：用户可自定义新类型
   - 选项 C：无限制，通过标签自由组织

---

## 下一步

1. 确定核心功能方向（建议从 Owner Dashboard + 访客留言板开始）
2. 设计数据模型
3. 实现 MVP
4. 用户反馈迭代

## 2026-04-30 Trellis 拆解更新

已从“下一轮最适合认领的实现候选”继续拆出：

| 子任务 | 优先级 | 状态 | 说明 |
|---|---:|---|---|
| `04-30-create-tavern-step-wizard-mvp` | P1 | planning → claimed by lijin | 认领本轮开发；把 `/create` 升级为分步开店向导，不改 Schema/API。 |
| `04-30-tavern-discovery-experience-polish-mvp` | P2 | planning | 暂缓；后续改善 `/discover` 浏览卡片和筛选体验。 |

选择顺序：Owner Dashboard 表现化 MVP 已在 review，因此本轮优先开发 Create Tavern 分步向导；Discovery Polish 作为下一候选保留。

## 2026-04-30 Backlog hardening: remaining planning split into child tasks

为防止原始 brainstorm 里的规划遗失，以下未落盘/后续方向已拆成 Trellis 子任务（均为 planning，不代表已实现）：

- `04-30-worldinfo-visual-editor-modern-mvp`
- `04-30-npc-batch-import-background-cast-mvp`
- `04-30-owner-ai-dialogue-preview-simulator`
- `04-30-gameplay-template-library-for-owners`
- `04-30-owner-token-usage-reference-status`
- `04-30-notification-center-presentational-followup`
- `04-30-mobile-critical-flow-first-screen-polish`
- `04-30-tavern-activity-signals-without-social-network`
- `04-30-home-real-coordinate-governance-review`
- `04-30-quest-exploration-checklist-reframe`

本轮之前已存在的子任务继续保留：Owner Dashboard、Create Wizard、Discovery Polish。
