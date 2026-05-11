# Orphan Signal Gameplay UI Implementation

- **Status**: COMPLETED
- **Assignee**: Antigravity
- **Last Updated**: 2026-05-11

## Goal

在 Tavern 内部实现一套基于“孤信号 (Orphan Signal)”氛围的结构化文游（Text Adventure）交互面板。将参考图中的“指令/叙事/日志”结构转译为 FableMap 的 `GameplaySession` 渲染层，提供深空终端质感的沉浸式体验。

## Requirements

### 1. 视觉风格 (Cyber Terminal Aesthetics)
- **配色**：深空暗色背景 (#020710 或更深)，青绿 (#22d3ee) / 青蓝发光文字与线条。
- **元素**：细线边框、扫描线背景效果、单色终端字体 (Monospace)、状态指示灯。
- **动效**：面板切入时的微动画，文字逐字显现效果（已实现），按钮 hover 的发光增强。
- **音效 (已实现)**：基于 Web Audio API 的微弱电传打字音效 (Teletype Ticks)，与文字打印同步。

### 2. 三栏信息架构 (The Console Structure)
- **COMMAND (指令)**：显示当前节点的“目标”与“可选动作”。
    - 展示 `GameplaySession.scene.objective`。
    - 渲染 `GameplaySession.scene.choices` 为按钮。
    - 提供自由输入框（如果支持）。
- **COMMS (叙事)**：显示 NPC 的回应与环境描述。
    - 渲染 `GameplaySession.scene.narration`。
    - 展示当前对话的 NPC 头像/名称。
- **LOG (日志)**：显示玩法事件流。
    - 渲染 `GameplaySession.events`。
    - 明确标记系统边界（如“未写入正史”、“已生成回响”）。

### 3. 接线与范围
- **目标组件**：重构或新增 `TavernGameplayPanel` 的变体。
- **触发条件**：
    - 当 `tavern.special_type === 'divination'`。
    - 或通过 URL 参数 `?ui_style=orphan-signal` 强制开启。
- **数据源**：直接使用现有的 `GameplayDefinition` 和 `GameplaySession` 结构，不新增后端 API/Schema。

### 4. 响应式
- **桌面端**：左右三栏布局。
- **移动端**：纵向堆叠，Log 部分默认收起或作为抽屉。

## Acceptance Criteria

- [x] 在 `/tavern/:id` 开启文游时，能看到深空终端风格的 UI 面板。
- [x] 页面包含明确的 COMMAND、COMMS、LOG 区域。
- [x] 点击选项能正确触发 `choose` 并更新叙事。
- [x] LOG 区域实时更新玩法事件。
- [x] `npm --prefix .\frontend run build` 通过。
- [x] Playwright 捕获桌面与移动端的 UI 截图。

## Technical Notes

- 涉及文件：
    - `frontend/app/product/TavernGameplayPanel.jsx` (或相似命名的玩法组件)
    - `frontend/app/product/tavernGameplay.css` (新增或更新)
    - `frontend/app/routes/tavern.tsx`
- 参考规范：
    - `.trellis/spec/frontend/component-guidelines.md`
    - `.trellis/spec/frontend/image-asset-guidelines.md`
