# P1-01: 酒馆内三栏工作台

## 概述

将 TavernChatRoom 从双栏布局升级为三栏布局，左侧角色列表，中间聊天区，右侧新增上下文面板。

## 改动

### 新增文件

- `frontend/src/TavernContextPanel.jsx` — 上下文面板组件，提供五个标签页：
  - 角色：当前角色卡、性格、场景设定等
  - 场所：酒馆名称、简介、场景氛围、访问权限
  - 世界书：所有世界书条目及状态
  - 记忆：访客关系、到访次数、历史消息
  - AI：AI 后端配置、模型、温度等参数

### 修改文件

- `frontend/src/TavernChatRoom.jsx`:
  - 新增 `tavern` prop 接收完整酒馆数据
  - 新增 `contextPanelOpen` 状态控制右侧面板显示
  - header 新增"📋 上下文"按钮切换面板
  - 引入 `TavernContextPanel` 组件

- `frontend/src/App.jsx`:
  - TavernChatRoom 调用新增 `tavern` prop 传入完整酒馆数据

- `frontend/src/styles.css`:
  - 新增 `.tavern-context-panel` 布局样式（三栏固定宽度 300px）
  - 新增 `.ctx-*` 上下文面板内部组件样式
  - 新增 `.btn-context-panel` 按钮样式（紫色主题）
  - 移动端响应式：在 960px 以下变为抽屉式

## 验证

- `npm --prefix ./frontend run build` 通过
- `pytest` 171 passed

## 影响

- 访客进入酒馆后可以看到更丰富的上下文信息
- 店主可以在上下文面板快速查看酒馆配置
- 移动端保持可用性