# 修复故事选择语义与公共模型配置：执行计划

## Phase A — 配置来源修复

- [x] 在 `ApiSettings` 增加只读的既有公共模型路由字段与安全 Key 指针解析。
- [x] 在 `build_system_story_llm_config` 实现来源级互斥：显式 FableSpace 配置优先；全缺省时复用公共路由。
- [x] 保持严格范围校验、安全诊断和 responder 注入边界。
- [x] 用不访问数据库、不输出密钥的定向脚本覆盖显式完整、显式部分、公共路由完整、公共路由缺 Key 四种情况。

检查点：当前 `.env` 必须在不修改秘密值的前提下生成预期 backend / model / base URL / 数值配置。

## Phase B — 选择与对白语义修复

- [x] 在 `StoryTimeline` 把 `choice` 与 `role=player` 分开投影。
- [x] 已持久化 choice 与 pending choice 统一显示“你的选择”。
- [x] 新增不具备对白气泡形状的 `.annieStoryEvent--choice` 样式和移动端约束。
- [x] 保留 choice 后 narration 的可见性、Character 投影和自动滚动。
- [x] 删除故障面板中“重新载入后继续”的错误承诺，保留只读恢复按钮。

检查点：静态检查 choice / free-input / choice response 三种事件分支和 pending 分支，不改变 API 类型。

## Phase C — 合同同步

- [x] 更新 `README.md`、`apps/api/.env.example`、`docs/DEPLOYMENT.md`、`docs/WORLD_SCHEMA.md`。
- [x] 更新前后端 Trellis 规范，记录 choice 行动语义和系统 LLM 配置来源回归防线。
- [x] 搜索并清理“七项必须全部手工配置”“不回退 OPENCODE”与“choice 标为你”的过期表述。

## Phase D — 验证与检查

- [x] `py -3 -m compileall -q apps/api/src`
- [x] 无数据库配置解析定向验证，并用无用户数据的最小 provider 请求验证现有公共路由。
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] changed-scope React Doctor，无分数回退。
- [x] Impeccable detector 检查改变的 TSX / CSS。
- [x] Trellis check：规范、跨层合同、移动端、密钥日志边界与差异范围。
- [x] `git diff --check`，核对 staged / unstaged 与工作区既有改动，不夹带无关文件。

## 回滚点

- 配置解析失败时只撤销本任务新增的公共路由来源，不改用户 `.env`。
- 前端验收失败时只撤销 choice 专用投影 / 样式和错误副文案，不恢复整文件。
- 不执行数据库、远端部署或秘密轮换。
