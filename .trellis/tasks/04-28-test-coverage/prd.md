# Test Coverage Improvement

## 目的

提升前端组件和后端核心逻辑的测试覆盖率。

## 当前状态

### 后端测试
- pytest 测试基本覆盖 API 端点
- 公益酒馆测试完整
- 缺少：LLM clients, char card parser 等新模块测试

### 前端测试
- 只有 Node.js scripts（service contract tests）
- 缺少：React 组件单元测试
- 缺少：E2E 测试

## 测试工具

### 后端
- pytest + pytest-asyncio
- pytest-cov (coverage)
- hypothesis (property-based testing)

### 前端
- Vitest (React 测试)
- React Testing Library (组件测试)
- Playwright (E2E 测试)

## 实现方案

### 1. 后端测试覆盖

```python
# tests/test_llm_clients.py
class TestLLMClients:
    """Test LLM client implementations."""

    async def test_openai_chat(self):
        """Test OpenAI client chat completion."""

    async def test_claude_chat(self):
        """Test Claude client chat completion."""

    async def test_ollama_local(self):
        """Test Ollama local model."""

    async def test_token_counting(self):
        """Test token usage tracking."""

# tests/test_char_card_parser.py
class TestCharCardParser:
    """Test character card parsing."""

    def test_parse_json_v2(self):
        """Test JSON V2 format parsing."""

    def test_parse_png_with_text_chunk(self):
        """Test PNG tEXt chunk extraction."""

    def test_field_mapping(self):
        """Test field mapping correctness."""
```

### 2. 前端组件测试

```javascript
// frontend/tests/components/CharacterAvatar.test.jsx
import { render, screen } from '@testing-library/react'
import { CharacterAvatar } from '../CharacterAvatar'

describe('CharacterAvatar', () => {
  it('renders neutral expression by default', () => {
    render(<CharacterAvatar character={mockCharacter} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('switches expression on click', async () => {
    const { user } = render(<CharacterAvatar character={mockCharacter} />)
    await user.click(screen.getByTitle('开心'))
    expect(screen.getByTitle('开心')).toHaveClass('selected')
  })
})

// frontend/tests/services/characterEngine.test.js
describe('characterEngine', () => {
  describe('setExpression', () => {
    it('updates active expression', () => {
      const state = { ...initialState }
      const updated = setExpression(state, 'npc1', 'joy')
      expect(updated.activeExpressions.npc1).toBe('joy')
    })
  })

  describe('detectExpressionFromMessage', () => {
    it('detects joy expression', () => {
      const result = detectExpressionFromMessage('我很开心！')
      expect(result).toBe('joy')
    })
  })
})
```

### 3. E2E 测试 (Playwright)

```typescript
// frontend/e2e/tavern-chat.spec.ts
import { test, expect } from '@playwright/test'

test('visitor can chat with NPC', async ({ page }) => {
  await page.goto('/tavern/pw_lantern_helpdesk')

  // Enter tavern
  await page.click('button:has-text("进入")')
  await expect(page.locator('.chat-messages')).toBeVisible()

  // Send message
  await page.fill('.chat-input', '你好')
  await page.click('button:has-text("发送")')

  // Verify response
  await expect(page.locator('.chat-message--npc')).toBeVisible()
})
```

## 覆盖率目标

| 模块 | 当前 | 目标 |
|------|------|------|
| backend LLM clients | 0% | 80% |
| backend char_card_parser | 0% | 80% |
| frontend services | 0% | 70% |
| frontend components | 0% | 50% |

## 实现步骤

### 后端
1. [ ] 安装 pytest-cov, hypothesis
2. [ ] 创建 `test_llm_clients.py`
3. [ ] 创建 `test_char_card_parser.py`
4. [ ] 运行覆盖率检查
5. [ ] 补充缺失测试

### 前端
1. [ ] 安装 Vitest + React Testing Library
2. [ ] 配置 Vitest
3. [ ] 创建组件测试
4. [ ] 创建 service 测试
5. [ ] (可选) 安装 Playwright E2E

## 验收标准

- [ ] 后端覆盖率 > 80%（新模块）
- [ ] 前端 service 测试覆盖 > 70%
- [ ] 前端组件测试覆盖 > 50%
- [ ] CI 配置覆盖率检查
