# LLM Client Extension

## 目的

扩展 LLM 客户端，支持 OpenAI、Claude、Ollama 和 OpenRouter 后端，使酒馆 NPC 能够进行真正的 AI 对话。

## 当前状态

- `rules` backend 已实现（公益酒馆用，基于规则的回复）
- 缺少真正的 LLM 集成

## 待实现功能

### 1. 统一 LLM 工厂 (LLM Factory)

```python
# backend/src/fablemap_api/core/llm_clients.py
class LLMClient:
    """Base class for LLM clients."""

    def chat(messages: list[dict], config: LLMConfig) -> str:
        """Send chat request and return response."""
        pass

def create_llm_client(backend: str) -> LLMClient:
    """Factory function to create LLM client by backend type."""
    backends = {
        "openai": OpenAIClient,
        "claude": ClaudeClient,
        "ollama": OllamaClient,
        "openrouter": OpenRouterClient,
    }
    return backends.get(backend, RulesClient)()
```

### 2. 各后端实现

| Backend | API | 特点 |
|---------|-----|------|
| OpenAI | `/v1/chat/completions` | GPT-4o, GPT-4 Turbo |
| Claude | `/v1/messages` | Claude 3.5 Sonnet |
| Ollama | `/api/chat` | 本地模型 |
| OpenRouter | `/v1/chat/completions` | 多模型聚合 |

### 3. 配置结构

```python
@dataclass
class LLMConfig:
    backend: str  # openai | claude | ollama | openrouter | rules
    model: str  # gpt-4o, claude-3-5-sonnet-20241014, etc.
    api_key: str
    base_url: str  # For Ollama/OpenRouter custom endpoints
    temperature: float = 0.7
    max_tokens: int = 512
    top_p: float = 1.0
```

### 4. Token 统计

- 每个请求记录 `token_used`
- 酒馆 Owner 面板显示用量

## 实现步骤

1. [ ] 创建 `llm_clients.py` 基础结构
2. [ ] 实现 OpenAI Client
3. [ ] 实现 Claude Client
4. [ ] 实现 Ollama Client
5. [ ] 实现 OpenRouter Client
6. [ ] 更新 `/api/taverns/{id}/chat` 端点使用新客户端
7. [ ] 添加 token 统计
8. [ ] 单元测试

## 验收标准

- [ ] 所有后端能正常发起 chat 请求
- [ ] Token 用量正确统计
- [ ] 错误处理完善（超时、API Key 错误等）
- [ ] 单元测试覆盖
