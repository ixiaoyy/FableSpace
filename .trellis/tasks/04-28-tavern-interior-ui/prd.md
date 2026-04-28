# Tavern Interior UI - 酒馆内部场景展示

## 目的

实现完整的酒馆内部界面，展示场景氛围、NPC 形象、对话功能，让访客有沉浸式体验。

## 当前状态

- `TavernInterior.jsx` 存在但功能可能不完整
- `TavernChatRoom.jsx` 有基本聊天功能
- 需要整合场景渲染

## 待实现功能

### 1. 场景背景渲染

根据酒馆的 `layout_style` 和 `scene_prompt` 渲染不同风格：
- `lobby` - 传统酒馆大厅
- `quest-play` - 任务游戏风格
- 自定义场景

```jsx
// TavernInterior.jsx
function TavernInterior({ tavern, layoutStyle }) {
  return (
    <div className="tavern-interior">
      <SceneBackground tavern={tavern} />
      <CharacterStage characters={tavern.characters} />
      <ChatPanel />
      <AtmosphereOverlay atmosphere={tavern.scene_prompt} />
    </div>
  )
}
```

### 2. NPC 形象展示

- 头像（使用 sprites 中的 neutral）
- 站立位置（根据角色数量动态布局）
- 名称和描述
- 交互高亮

### 3. 场景氛围

- `scene_prompt` 解析并生成氛围描述
- 背景颜色/纹理
- 环境音效（可选）

### 4. 布局样式

```css
/* layout_style 样式 */
.tavern-interior--lobby {
  background: warm tavern interior
}

.tavern-interior--quest-play {
  background: adventure board / quest board style
}
```

## 实现步骤

1. [ ] 分析现有 `TavernInterior.jsx` 状态
2. [ ] 设计场景背景组件
3. [ ] 实现 NPC 站立展示
4. [ ] 添加布局样式支持
5. [ ] 整合到 `TavernChatRoom`
6. [ ] 测试不同酒馆场景

## 验收标准

- [ ] 场景背景正确渲染
- [ ] NPC 形象清晰展示
- [ ] 支持多种 layout_style
- [ ] `scene_prompt` 氛围体现
