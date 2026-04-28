# NPC Expression Switching UI

## 目的

在聊天界面中添加 NPC 表情切换功能，让用户可以主动切换 NPC 的表情状态。

## 当前状态

- `characterEngine.js` 有 `setExpression` 功能
- 后端支持 `expression` 参数
- 前端缺少切换 UI

## 表情类型

根据 `default_taverns.py` 定义：

```javascript
const EXPRESSION_TYPES = {
  neutral: { label: '正常', icon: '😐' },
  joy: { label: '开心', icon: '😊' },
  anger: { label: '生气', icon: '😠' },
  embarrassment: { label: '害羞', icon: '😳' },
  curiosity: { label: '好奇', icon: '🤔' },
}
```

## 实现方案

### UI 组件

```jsx
// CharacterExpressionPicker.jsx
function CharacterExpressionPicker({ character, currentExpression, onChange }) {
  const expressions = Object.entries(EXPRESSION_TYPES).map(([key, config]) => ({
    key,
    ...config,
    available: character.sprites?.[key] || character.sprites?.[EXPRESSION_KEYS[key]],
    selected: currentExpression === key
  }))

  return (
    <div className="expression-picker">
      {expressions.map(({ key, label, icon, available, selected }) => (
        <button
          key={key}
          className={`expression-btn ${selected ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
          onClick={() => available && onChange(key)}
          disabled={!available}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
```

### 集成到 TavernChatRoom

```jsx
function TavernChatRoom({ characters, ... }) {
  const [activeExpressions, setActiveExpressions] = useState({})

  // Auto-update expression based on AI response
  const handleAIMessage = (message) => {
    const detected = detectExpressionFromMessage(message)
    setActiveExpressions(prev => ({
      ...prev,
      [message.character_id]: detected
    }))
  }

  // Manual override
  const handleExpressionChange = (characterId, expression) => {
    setActiveExpressions(prev => ({
      ...prev,
      [characterId]: expression
    }))
    sendChatMessage({ expression })
  }

  return (
    <div className="chat-room">
      <CharacterStage
        characters={characters}
        expressions={activeExpressions}
        onExpressionChange={handleExpressionChange}
      />
      <ChatMessages />
      <ChatInput />
    </div>
  )
}
```

### 自动表情检测

```javascript
// From characterEngine.js pattern
function detectExpressionFromMessage(message) {
  const content = message.toLowerCase()

  if (content.includes('!') && content.includes('生气')) return 'anger'
  if (content.includes('好') && content.includes('开心')) return 'joy'
  if (content.includes('害羞')) return 'embarrassment'
  if (content.includes('?') || content.includes('怎么')) return 'curiosity'

  return 'neutral'
}
```

## 实现步骤

1. [ ] 创建 `CharacterExpressionPicker.jsx`
2. [ ] 定义表情类型常量
3. [ ] 集成到 `CharacterAvatar`
4. [ ] 集成到 `TavernChatRoom`
5. [ ] 添加自动表情检测
6. [ ] 添加手动切换功能
7. [ ] 样式美化

## 验收标准

- [ ] 表情选择器正确显示
- [ ] 只显示有资源的表情
- [ ] 自动表情检测工作
- [ ] 手动切换覆盖自动
- [ ] 视觉反馈清晰
