# 移除聊天页关系解释文案

## Goal

聊天页仅保留角色身份、对话与交互，隐藏开场旁白及关系态度、变化原因等替玩家下判断的说明；不改变关系运行数据或 API 合同。

## Evidence

- 玩家明确指出“你们从未见过。她也没有理由立刻相信你。”这类文案替用户解释关系，
  希望关系通过实际对话和互动被体验，而不是由页面预先下结论。
- 该示例来自安妮开场 `narration`；上一任务已在聊天时间线隐藏独立开场旁白，但对应
  提交仍未推送到远端。
- `CharacterConversationHeader` 仍同时渲染关系阶段 `label`、`attitude` 和
  `last_change_reason`，在进入对话前继续替玩家解释角色态度。

## Requirements

### R1 — 聊天头只呈现角色身份

- 活动对话和连接状态中的聊天头仅显示 Character 头像（或字母占位）与名称。
- 不显示关系阶段、关系态度或最近变化原因；关系由对话和互动结果自然表达。
- 不以新的提示、摘要、徽章或换一种说法替代被移除的关系说明。

### R2 — 保持互动与数据合同

- Character / 玩家消息、审核 Choice、Choice 结果、自由输入、加载、失败恢复和结局行为
  保持不变。
- `StoryRun.relationship` 与公开 `relationship_stage` 继续由 API 返回并供运行逻辑使用；
  不修改后端内容、Schema、持久化或关系计算。
- 上一任务对独立开场 `narration` 的隐藏规则继续保留，审核 Choice 后的结果反馈继续显示。

### R3 — 范围与清理

- 删除聊天头中因说明文案移除而失去用途的 props、标记和 CSS。
- 同步前端质量规范，明确聊天页不主动展示关系解释。
- 不连接数据库、不部署、不生成图片，并保留工作区已有的无关改动。

## Acceptance Criteria

- [x] 聊天头只显示 Character 头像（或字母占位）和名称。
- [x] 页面不再显示关系阶段、态度或变化原因，包括示例式的预设关系判断。
- [x] 新轮次仍不显示独立开场旁白，Choice 后的必要结果反馈仍可见。
- [x] 对话、互动、恢复和结局行为不变，移动端无空白占位或横向溢出。
- [x] 前端 typecheck、生产 build 和 changed-scope React Doctor 通过。
- [x] Impeccable 检查与 staged diff 检查无本次改动导致的问题。

## Out of Scope

- 删除或改写服务端审核故事内容。
- 删除 API 中的关系数据或改变关系计算、好感度、状态写回。
- 修改 Character 详情页的公开关系呈现。
- 推送、部署或查看数据库。

## Notes

- 本任务是 PRD-only 的轻量前端精简。
- 2026-07-31 新鲜验证：
  - `npm --prefix .\apps\web run typecheck`
  - `npm --prefix .\apps\web run build`
  - `npx -y react-doctor@latest . --verbose --diff`（100 / 100）
  - Impeccable detector：`[]`
  - 390×844 浏览器验收：聊天头仅“安妮”，时间线从 Character 台词开始，示例句与
    关系说明均不可见，输入框可见，无横向溢出，控制台无 warning / error。
