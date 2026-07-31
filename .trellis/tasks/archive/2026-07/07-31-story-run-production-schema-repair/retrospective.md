# Bug Analysis: StoryRun production Schema drift

### 1. Root Cause Category

- **Category**: C — Change Propagation Failure（主因），同时包含 B — Cross-Layer
  Contract 与 D — Test Coverage Gap。
- **Specific Cause**: 当前 ORM 已要求 `story_runs.player_role_id`，并已停止映射
  旧内联 `story_runs.private_memories`；生产 MySQL 仍停留在 004 的物理结构。
  `Base.metadata.create_all()` 只补缺表，不会给既有表补列或删列，普通 Deploy
  又没有迁移执行入口。部署健康端点不查询 StoryRun，因而代码、运行容器与物理
  Schema 三层状态漂移后仍显示部署成功。

### 2. Why Fixes Failed

1. **只改善前端错误态**：能让页面直接呈现聊天容器，但不会改变数据库缺列，
   所以“重新连接”仍返回相同服务错误。
2. **只考虑执行 006**：可以修复现有 StoryRun 读取，但当前 ORM 新建轮次不会
   写旧的 `private_memories JSON NOT NULL`；只做 006 会把读故障变成后续写
   故障，修复范围不完整。
3. **只依赖 `/api/v1/health`**：该端点不跨越 ORM→StoryRun→MySQL 边界，
   即使返回成功也无法区分 Schema 是否匹配。

### 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
|---|---|---|---|
| P0 | Architecture / Operations | 使用专用人工 workflow 固定目标、确认词、迁移哈希、完整备份和 006→008 顺序 | DONE |
| P0 | Runtime validation | 维护前验证运行容器与待启动镜像的 ORM；维护后执行真实 `StoryRunModel` 查询 | DONE |
| P0 | Failure handling | DDL 前失败恢复并检查 backend 健康；DDL 后失败保持停写并保留整库备份 | DONE |
| P0 | Documentation | 同步部署文档、WORLD_SCHEMA 和 backend database 7 段可执行合同 | DONE |
| P1 | Review checklist | 所有 durable contract 变更都区分仓库、运行进程和物理存储三种证据 | DONE |

### 4. Systematic Expansion

- **Similar Issues**: 后续任何新增必填列、删除旧列、重命名表或改变唯一性都可能
  出现相同漂移；`create_all()` 成功不能证明已部署数据库完成演进。
- **Design Improvement**: 普通健康端点继续保持轻量，但 Schema 变更的发布或
  维护必须附带跨越受影响数据边界的专用正向探针。
- **Process Improvement**: 破坏性迁移不进入启动或普通 Deploy；先审查表/列、
  数据回填、备份和失败状态，再提供固定、不可注入任意 SQL 的人工入口。

### 5. Knowledge Capture

- [x] `.trellis/spec/backend/database-guidelines.md` 已新增 006/008 生产修复合同。
- [x] `.trellis/spec/guides/cross-layer-thinking-guide.md` 已新增
      “Deployment Health vs Data-Path Health”检查清单。
- [x] `docs/DEPLOYMENT.md` 与 `docs/WORLD_SCHEMA.md` 已同步。
- [x] 项目不存在 `src/templates/markdown/spec/`，本仓库无需模板同步。

## Production Evidence

- 工作提交：`ee9f73b9`。
- 普通 Deploy：GitHub Actions run `30610875124`，结论 `success`。
- 生产修复：GitHub Actions run `30610955460`，结论 `success`。
- 维护开始：`2026-07-31T06:52:36Z`。
- 备份：
  `/opt/fablespace/backups/story-run-schema-repair/fablespace-before-006-008-20260731T065236Z.sql`。
- 备份 SHA-256：
  `4f4d9ec295a7f9ac674e84ee56dcb1e27231a702eade85ea9d834a085882f5b1`。
- workflow 新鲜证据：前置检查、006 后置检查、008 精确 8 表检查、backend
  health 与当前 ORM StoryRun 查询全部成功。
- 浏览器新鲜证据：复用现有登录态点击“重新连接”后，错误态消失；页面出现安妮
  开场消息、快捷选择、输入框与发送按钮。
- 本次没有复制服务器 stdout 日志到仓库；成功的相同 ORM 投影与真实受保护 API
  响应是比“日志中未搜索到 1054”更强的正向证据。
