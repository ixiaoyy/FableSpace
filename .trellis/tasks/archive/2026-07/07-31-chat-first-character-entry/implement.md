# 聊天优先角色入口实施计划

1. 激活任务并读取 frontend、state、copy、routing 与质量规范。
2. 删除 `PlayerRoleOption` 的称呼提取与徽章，清理对应 CSS。
3. 重构 `character-story.tsx`：
   - 删除 StoryWorld opening 和 `StoryEntry`；
   - 增加一次性自动 start 守卫；
   - 把访问、加载、失败与缺少身份状态收进聊天壳；
   - 结局后直接使用锁定身份 restart；
   - 保留事件顺序、快捷选择、输入与只读恢复合同。
4. 收敛 `story-world-character.css`：
   - 删除向导与称呼徽章死样式；
   - 建立桌面和移动端聊天高度、滚动与 composer 可达性；
   - 保持既有主题，不做无关视觉重构。
5. 静态审计：
   - 搜索 `StoryEntry`、`annieStoryOpening`、`annieStoryIdentityAddress` 残留；
   - 检查重试路径没有调用 `start` / `restart` / message / choice POST；
   - 核对工作区只暂存本任务文件，排除旧 Schema 规划、`AGENTS.md` 与 `UI稿/`。
6. 验证：
   - `npm --prefix .\apps\web run typecheck`
   - `npm --prefix .\apps\web run build`
   - changed-scope React Doctor
   - Impeccable detector
   - 本地生产构建的窄屏聊天、无身份、加载和错误状态定向验收
7. 更新必要的前端 spec，完成 Trellis check，暂存生产文件与任务记录，提交并推送
   `main`。

## 验证记录

- `npm --prefix .\apps\web run typecheck`：通过。
- `npm --prefix .\apps\web run build`：通过。
- `npx -y react-doctor@latest . --verbose --diff`（`apps/web`）：100 / 100，
  无问题。
- Impeccable detector：无命中。
- 390 × 844 浏览器验收：页面宽高与视口一致，聊天时间线、快捷回复、composer 和折叠
  参考均可达，无页面横向或纵向溢出。
- 一次性入场验收：`runs/current -> null` 后恰好发起 1 次 start POST。
- 不确定写恢复验收：start 失败后点击“重新载入”只读取当前轮次，POST 计数仍为 1，
  确认无轮次后才显示显式“开始对话”动作。
- 通用 500 验收：错误只在聊天壳内显示“服务暂时不可用 / 重新连接”，不再显示
  StoryWorld 介绍页。
