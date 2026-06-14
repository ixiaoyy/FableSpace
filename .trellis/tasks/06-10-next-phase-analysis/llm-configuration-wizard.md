# P1-3: LLM 配置向导

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-llm-configuration-wizard` |
| 标题 | LLM 配置向导 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P1 |
| 关联需求 | 简化接入流程，降低技术门槛 |

## 背景与问题

### 当前状态
- 店主在设置页面配置 LLM（API Key、Base URL、Model）
- 配置分散在 owner_config 相关 API
- 缺少引导和测试

### 问题分析
1. **概念抽象**: API Key、Base URL 等概念对非技术用户不友好
2. **配置复杂**: 需要填写多个字段且格式要求严格
3. **无法验证**: 配置后无法确认是否正确
4. **缺少推荐**: 没有推荐配置选项

### 用户故事
```
作为 技术背景薄弱的店主
我希望 有一个引导式的 LLM 配置流程
以便 成功配置并使用 AI 功能
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 向导式配置 | 分步骤引导配置 LLM | P0 |
| 服务商选择 | 提供主流服务商选项 | P0 |
| 配置验证 | 配置后发送测试请求 | P0 |
| 状态反馈 | 实时显示配置状态 | P1 |
| 成本估算 | 预估 Token 消耗 | P2 |

### 支持的服务商

```typescript
type LLMProvider = {
  id: string
  name: string
  logo: string
  baseUrl: string
  models: LLMModel[]
  apiKeyPlaceholder: string
  docsUrl: string
  isPopular: boolean
}

type LLMModel = {
  id: string
  name: string
  description: string
  inputCost: number  // $/1M tokens
  outputCost: number
  recommendedFor: string[]
}

const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "🤖",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "最新旗舰模型", inputCost: 5, outputCost: 15 },
      { id: "gpt-4o-mini", name: "GPT-4o mini", description: "轻量快速", inputCost: 0.15, outputCost: 0.6 },
    ],
    apiKeyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    isPopular: true
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "🧠",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "平衡之选", inputCost: 3, outputCost: 15 },
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", description: "性价比高", inputCost: 3, outputCost: 15 },
    ],
    apiKeyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    isPopular: true
  },
  {
    id: "ollama",
    name: "Ollama",
    logo: "🦙",
    baseUrl: "http://localhost:11434/v1",
    models: [
      { id: "llama3", name: "Llama 3", description: "开源模型", inputCost: 0, outputCost: 0 },
      { id: "qwen2.5", name: "Qwen 2.5", description: "通义千问", inputCost: 0, outputCost: 0 },
    ],
    apiKeyPlaceholder: "不需要 API Key（本地部署）",
    docsUrl: "https://ollama.com",
    isPopular: false
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    logo: "🌐",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude via OpenRouter", description: "聚合服务", inputCost: 3, outputCost: 15 },
    ],
    apiKeyPlaceholder: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
    isPopular: false
  },
]
```

## 设计方案

### 方案一: 向导式配置（推荐）

**核心思路**: 4 步完成 LLM 配置

```
┌─────────────────────────────────────────────────────────┐
│  🤖 LLM 配置向导                              [×]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  步骤 1/4: 选择服务商                            │   │
│  │  ──────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐   │   │
│  │  │    🤖     │ │    🧠     │ │    🦙     │   │   │
│  │  │  OpenAI   │ │ Anthropic │ │  Ollama   │   │   │
│  │  │  最流行   │ │ Claude   │ │ 本地部署  │   │   │
│  │  │  [选择]   │ │  [选择]   │ │  [选择]   │   │   │
│  │  └────────────┘ └────────────┘ └────────────┘   │   │
│  │                                                   │   │
│  │  ┌────────────┐                                   │   │
│  │  │    🌐     │                                   │   │
│  │  │ OpenRouter│                                   │   │
│  │  │  聚合服务 │                                   │   │
│  │  │  [选择]   │                                   │   │
│  │  └────────────┘                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  步骤 2/4: 选择模型                              │   │
│  │  ──────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  当前: OpenAI                                     │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ ○ GPT-4o ($5/1M in, $15/1M out)         │   │   │
│  │  │   最新旗舰模型，适合复杂对话            │   │   │
│  │  ├─────────────────────────────────────────┤   │   │
│  │  │ ● GPT-4o mini ($0.15/1M in, $0.6/1M out)│   │   │
│  │  │   轻量快速，适合日常对话              │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  步骤 3/4: 填写配置                              │   │
│  │  ──────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  API Key: [sk-****************************]    🔑  │   │
│  │  Base URL: [https://api.openai.com/v1      ]    │   │
│  │                                                   │   │
│  │  💡 需要帮助？查看 API Key 获取指南              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  步骤 4/4: 测试连接                              │   │
│  │  ──────────────────────────────────────────────  │   │
│  │                                                   │   │
│  │  正在发送测试请求...                              │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ ✅ 连接成功！                            │   │   │
│  │  │ 响应时间: 1.2s                          │   │   │
│  │  │ 模型: gpt-4o-mini                       │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                   │   │
│  │  ┌──────────────┐ ┌──────────────┐              │   │
│  │  │  上一步      │ │  完成配置    │              │   │
│  │  └──────────────┘ └──────────────┘              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `LLMConfigWizard` 向导组件
2. 新增 `ProviderSelector` 服务商选择器
3. 新增 `ModelSelector` 模型选择器
4. 新增 `LLMConfigForm` 配置表单
5. 新增 `LLMTestPanel` 测试面板

### 方案二: 一键导入

**核心思路**: 提供预设配置一键导入

```
┌─────────────────────────────────────────────────────────┐
│  一键配置 (推荐小白用户)                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎯 适合你的配置方案                             │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ OpenAI + GPT-4o mini                      │   │   │
│  │  │ 性价比高，适合大多数场景                  │   │   │
│  │  │ 预估成本: ¥10/天                          │   │   │
│  │  │                                           │   │   │
│  │  │ [一键配置]                                 │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 向导式配置
- **Phase 2**: 方案二 - 一键导入

## 技术实现

### 组件清单

```typescript
// frontend/app/features/llm-config-wizard/

LLMConfigWizard/
├── index.tsx              // 向导容器
├── StepIndicator.tsx      // 步骤指示器
├── ProviderSelector.tsx    // 服务商选择器
├── ModelSelector.tsx       // 模型选择器
├── ConfigForm.tsx         // 配置表单
├── TestPanel.tsx          // 测试面板
└── SuccessPanel.tsx       // 成功面板
```

### API 复用

第一阶段不新增 owner-config 测试端点，优先复用已有 runtime API：

| 端点 | 用途 |
|------|------|
| `POST /api/v1/llm/test-config` | 测试一组临时 LLM 参数是否可用 |
| `POST /api/v1/taverns/{id}/test-llm` | 测试当前空间的 LLM 配置 |

Provider/model preset 先放在前端本地配置或项目配置文件中；如需后端动态下发 provider list，需要另起配置契约，并说明模型价格/名称如何更新。

### 测试请求

```typescript
// frontend/app/lib/llm-config.ts

export async function testLLMConfig(config: LLMConfig): Promise<LLMTestResult> {
  const response = await fetch("/api/v1/llm/test-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      backend: config.backend,
      model: config.model,
      api_key: config.api_key,
      base_url: config.base_url,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "配置测试失败")
  }

  return response.json()
}
```

## 验收标准

### 功能验收

- [ ] 可选择服务商
- [ ] 可选择模型
- [ ] 可填写配置
- [ ] 可测试连接
- [ ] 测试结果准确

### 交互验收

- [ ] 向导步骤可正常切换
- [ ] 表单验证正常
- [ ] 测试过程有 loading 状态
- [ ] 错误提示清晰

### 安全性验收

- [ ] API Key 不在日志中明文输出
- [ ] 测试请求不记录 API Key
- [ ] 敏感信息加密存储

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试请求失败 | 用户困惑 | 提供详细错误信息 |
| API Key 泄露 | 安全问题 | 不在客户端存储 |
| 服务商变更 | 配置失效 | 提供配置迁移 |

### 依赖

- `owner_config` API
- LLM 测试服务

## 校准补充

### 已核对事实

- 已存在 `POST /api/v1/llm/test-config` 和 `POST /api/v1/taverns/{id}/test-llm`。
- 前端 `frontend/app/lib/taverns.ts`、`frontend/app/product/services/tavernService.js` 已有 LLM 测试相关调用。
- 店主默认 LLM 配置也有 owner config service 线索；实现前要确认空间级配置和 owner 默认配置的优先级。

### 边界修正

- 不需要新增 `/api/v1/owner-config/llm-config/test`，优先复用既有 runtime route。
- 服务商模型列表和价格变化很快，文档中的模型/价格只能作为示意；实现时要么用本地可维护配置，要么标注“仅供参考/需人工更新”。
- API Key 不应进入日志、公开响应、分享 payload、截图或测试报告。前端只能短暂持有用户输入，保存必须走 owner-only 接口。

### 建议 MVP

1. 将现有 `LLMConfigForm` 包装成 3 步：选择 provider preset、填写/确认参数、调用 `test-config`。
2. 测试成功后再允许保存；测试失败必须保留可编辑输入和明确错误。
3. 首批 provider preset 只提供 backend/base_url/model placeholder，不承诺“最新模型”或固定价格。

### 需要确认的问题

- 店主配置应保存到单个 Tavern，还是保存为 owner 默认并可应用到多个 Tavern？
- 是否允许 Ollama/local base_url？如果允许，浏览器端和后端部署网络可达性怎么提示？
- 测试连接是否会真实消耗 token？如果会，UI 需明确提示。

## 下一步

1. **research**: 调研用户常用的 LLM 配置
2. **implement**: 实现向导组件
3. **check**: 配置测试验证
4. **update-spec**: 更新店主文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
