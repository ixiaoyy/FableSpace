# P2-4: 分享机制增强（非裂变）

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-share-mechanism` |
| 标题 | 分享机制增强（非裂变） |
| 阶段 | brainstorm |
| 类型 | frontend |
| 优先级 | P2 |
| 关联需求 | 降低分享理解成本，帮助空间被正确进入 |

## 背景与问题

### 当前状态
- `TavernShareCard` 提供分享功能
- 可复制邀请文案
- 已有 `GET /api/v1/taverns/{id}/share` public-safe 分享 payload
- 缺少更清晰的分享预览和渠道降级体验

### 问题分析
1. **价值表达不足**: 用户不确定分享出去的内容是否能解释空间玩法
2. **门槛高**: 分享流程复杂
3. **渠道差异**: 浏览器、微信、微博等分享能力不同，需要降级
4. **效果不可见**: 店主和访客难以知道分享是否帮助朋友理解这个空间

### 用户故事
```
作为 访客
我希望 能把一个空间以清晰、安全的方式分享给朋友
以便 对方进入前就知道这个空间是什么、能做什么
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 一键分享 | 支持多种分享渠道 | P0 |
| 专属邀请码 | 暂不进入当前范围 | 暂缓 |
| 分享统计 | owner-only 点击统计，需另起 API/隐私设计 | 暂缓 |
| 邀请奖励 | 不建议进入当前范围 | 暂缓 |
| 排行榜 | 不符合当前产品边界 | 不做 |

### 分享类型

```typescript
type ShareChannel =
  | "copy_link"     // 复制链接
  | "wechat"        // 微信
  | "weibo"         // 微博
  | "qq"            // QQ
  | "twitter"       // Twitter
  | "telegram"      // Telegram

type SharePayload = {
  title: string
  description: string
  url: string
  image?: string
  miniProgram?: {
    title: string
    imageUrl: string
    path: string
  }
}

type ShareRecord = {
  id: string
  userId: string
  tavernId: string
  channel: ShareChannel
  sharedAt: Date
  clickCount: number
  conversionCount: number
}
```

## 设计方案

### 方案一: 社交分享 + 安全预览

**核心思路**: 简化分享流程，提供 public-safe 分享预览，不引入奖励裂变

```
┌─────────────────────────────────────────────────────────┐
│  📤 分享「街角便利店」                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  分享给朋友，一起探索这个有趣的空间              │   │
│  │                                                   │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │   │
│  │  │  💬  │ │  📱  │ │  🌐  │ │  📋  │       │   │
│  │  │ 微信  │ │  QQ   │ │ 微博  │ │ 复制  │       │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  分享预览                                        │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  对方会看到：空间名、短描述、坐标/地址、NPC 数、 │   │
│  │  访问状态，以及可复制的进入链接。                │   │
│  │                                                   │   │
│  │  当前分享不会包含：API Key、密码、隐藏 prompt、   │   │
│  │  对话、记忆、玩法会话或 owner-only 统计。         │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  fablemap.app/tavern/street-corner      │   │   │
│  │  │                              [复制]      │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  分享后的下一步                                  │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  好友进入后，由空间自己的入场引导和 NPC 接待承接。│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `SharePanel` 分享面板
2. 新增 `ShareButton` 分享按钮
3. 优化 `TavernShareCard` 预览和复制文案
4. 可选新增 owner-only 分享点击统计，但需单独 API/隐私设计
5. 不做邀请奖励和排行榜

### 方案二: 简单分享按钮

**核心思路**: 只保留分享功能

```
┌─────────────────────────────────────────────────────────┐
│  [分享到微信] [分享到微博] [复制链接]                   │
└─────────────────────────────────────────────────────────┘
```

**问题**: 增长激励弱，但更符合当前产品边界

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 社交分享 + 安全预览
- **Phase 2**: owner-only 分享效果统计（是否需要待确认）

## 技术实现

### 分享 API

```typescript
// frontend/app/lib/tavern-share.ts

export async function getSharePayload(
  tavernId: string,
  userId = ""
): Promise<TavernSharePayload> {
  return getTavernShare(tavernId, userId)
}

export function shareToWechat(payload: SharePayload) {
  // 使用微信 JS-SDK 分享
  if (typeof wx !== "undefined") {
    wx.updateAppMessageShareData({
      title: payload.title,
      desc: payload.description,
      link: payload.url,
      imgUrl: payload.image,
    })
  }
}

export function shareToClipboard(payload: SharePayload): Promise<boolean> {
  const text = `${payload.title}\n${payload.description}\n${payload.url}`
  return navigator.clipboard.writeText(text)
}
```

### 邀请码/归因

当前不建议实现邀请码、转化归因或奖励。若未来确实需要分享归因，应另起 Schema/API 任务，并先确认反作弊、隐私、奖励边界和“无平台 Token 奖励”原则。

### 前端组件

```typescript
// frontend/app/features/share-mechanism/

SharePanel/
├── index.tsx              // 分享面板
├── ShareButton.tsx        // 分享按钮
├── ShareChannels.tsx      // 分享渠道
├── SharePreview.tsx       // public-safe 分享预览
└── ShareFallbackCopy.tsx  // 复制降级文案
```

## 验收标准

### 功能验收

- [ ] 各渠道分享正常
- [ ] public-safe 分享 payload 正确展示
- [ ] 分享失败时有降级复制文案

### 交互验收

- [ ] 分享按钮易于发现
- [ ] 分享流程简洁
- [ ] 反馈及时

### 安全性验收

- [ ] 不暴露 API Key、密码、hidden prompt、对话、记忆、玩法会话或 owner-only 统计
- [ ] 私密空间遵守 owner/visitor 可见性

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 分享 payload 泄露敏感字段 | 隐私和安全问题 | 复用 `tavern_share_policy.py` |
| 微信限制 | 分享失败 | 提供备选方案 |

### 依赖

- 微信 JS-SDK（微信分享）
- 现有分享 API

## 校准补充

### 已核对事实

- 当前分享源头是 `GET /api/v1/taverns/{id}/share`，由 `tavern_share_policy.py` 构造 public-safe payload。
- `.trellis/spec/backend/tavern-share-api-contract.md` 明确禁止 share payload 包含 API Key、密码、prompt internals、chat history、visitor state、memory atoms、gameplay sessions、owner-only analytics。

### 边界修正

- “裂变、奖励、排行榜、Token 配额”不符合当前产品边界，建议从本任务移除。
- 分享增强应聚焦“对方看得懂、能安全进入”，不是平台增长系统。
- 若要统计分享效果，只能 owner-visible，且不能公开访客社交图谱。

### 建议 MVP

1. 优化现有 `TavernShareCard`：预览、复制文案、Web Share API、失败降级。
2. 前端始终优先调用 `/share`，不要从完整 Tavern 详情对象拼公开分享 payload。
3. 增加或复用 share helper 测试，确认敏感字段不会出现在 UI 文案里。

### 需要确认的问题

- 是否接受把任务名从“分享裂变机制”正式改为“分享机制增强”？
- 分享渠道优先级是复制链接、系统分享、微信/微博，还是只做浏览器通用能力？
- 店主是否需要看到分享点击统计？如果需要，应单独设计隐私和归因口径。

## 下一步

1. **research**: 确认分享渠道优先级和分享后落地页
2. **implement**: 优化现有分享预览、复制文案和 Web Share 降级
3. **check**: 分享流程测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
