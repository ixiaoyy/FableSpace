# 修复聊天输入框双重焦点框

## Goal

移除聊天输入框自身的矩形焦点描边，只保留完整胶囊容器焦点环，同时维持发送按钮与键盘导航的可见焦点。

## Evidence

- 用户截图显示 textarea 聚焦时同时出现外层胶囊焦点环和 textarea 自身的矩形紫色
  outline；矩形右边缘在发送按钮前形成不应存在的竖线。
- `.annieStoryMessageForm textarea` 已声明 `outline: 0`，但后出现且特异性更高的
  `.annieStoryMessageForm textarea:focus-visible` 通用规则重新添加了 `3px` outline。
- 外层 `.annieStoryMessageForm > div:focus-within` 已提供可见的边框与焦点光晕，因此
  textarea 的第二层 outline 是重复反馈。

## Requirements

### R1 — 单一输入焦点环

- textarea 聚焦时只显示输入组合容器的完整胶囊焦点状态。
- 不显示 textarea 自身的矩形 outline，也不在发送按钮前形成焦点竖线。
- 保留输入容器现有尺寸、圆角、颜色、间距和页面视觉风格。

### R2 — 可访问性与状态

- 键盘 Tab 进入 textarea 时仍有明确可见的焦点反馈。
- 发送按钮获得键盘焦点时继续显示其独立焦点轮廓。
- hover、disabled、输入、提交和移动端布局行为不变。

### R3 — 范围

- 仅修改拥有该焦点规则的前端 CSS，不修改 React、API、数据或故事内容。
- 不连接数据库、不部署，并保留工作区现有无关改动。

## Acceptance Criteria

- [x] textarea 鼠标或键盘聚焦后只有胶囊容器焦点环，没有内部矩形框或竖线。
- [x] 键盘焦点仍清晰可见，发送按钮的 `:focus-visible` 行为保持不变。
- [x] 390px 窄屏与桌面宽度均无横向溢出或布局跳动。
- [x] 前端生产 build、Impeccable detector 和浏览器视觉验收通过。

## Out of Scope

- 重做输入组件、发送按钮或配色。
- 改变 Enter / Shift+Enter、消息提交或失败恢复逻辑。
- 推送或部署。

## Notes

- 本任务是 PRD-only 的局部 CSS 修复。
- 2026-07-31 新鲜验证：
  - `npm --prefix .\apps\web run build`
  - Impeccable detector：`[]`
  - 1024×768 与 390×844 浏览器验收：textarea 在 `:focus-visible` 状态下计算样式为
    `outline: none 0px`，外层胶囊保留紫色 border 和 3.2px 焦点光晕，无内部竖线、
    横向溢出或控制台 warning / error。
