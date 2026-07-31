# 实施计划：修复 StoryRun 生产 Schema 漂移

## 评审门

- 用户已批准创建任务、连接生产 FableSpace database、完整备份并依序执行
  006 与 008。
- 在用户评审最终 PRD/设计/本计划并允许 `task.py start` 前，不连接数据库、
  不创建生产 workflow、不执行 DDL。
- 除 008 已审核的 23 张旧表和 `story_runs.private_memories` 外，其他删表、
  Schema 变更及 database 始终不在授权范围内。

## 仓库实现

1. 运行 `trellis-before-dev`，加载 backend database/deployment/quality 规范。
2. 新增专用 `workflow_dispatch` workflow：
   - 精确确认词；
   - 校验部署 SSH secrets；
   - 固定 `/opt/fablespace`、`fablespace` 与已审核 006/008 SHA-256；
   - 通过固定内联远端脚本执行维护；
   - 不接受 SQL、数据库名或 shell 输入；
   - 与普通 Deploy workflow 分离但共享不可取消的生产 concurrency lock。
3. 远端维护流程：
   - 校验路径、目标 SHA、数据库容器和当前 ORM；
   - 重建当前 backend，停止写入；
   - 完整逻辑备份并生成 SHA-256；
   - 验证表/列、未审核额外表、状态唯一性与回填覆盖；
   - 执行 006 并验证后置条件，再执行带自身前置保护的 008；
   - 验证列定义与空值；
   - 成功后重启并轮询 `/api/v1/health`；
   - DDL 前失败重启，DDL 后失败保持停止。
4. 把普通 Deploy 的同组 concurrency 改为排队而非取消，防止 DDL 期间被新
   部署中断。
5. 同步 `docs/DEPLOYMENT.md` 与 backend database spec，记录专用入口、确认词、
   备份位置、失败处理，以及禁止自动或超范围执行 008。

## 无数据库质量检查

1. `py -3 -m compileall -q apps/api/src deploy/server`
2. `docker compose config --quiet`
3. `npm --prefix .\apps\web run build`
4. shell/workflow 静态合同：
   - workflow 只有 `workflow_dispatch`；
   - 确认词精确匹配；
   - 固定迁移 SHA-256 与仓库文件一致；
   - 远端脚本只按顺序引用 006 与 008；
   - DDL 前允许表集合等于当前 8 表与 008 精确 23 表的并集；
   - 不出现 `mysql --force`、任意 SQL 输入或凭据输出；
   - DDL 前/后失败路径符合设计；
   - staged snapshot 不含 `AGENTS.md`、`UI稿/` 或图片二进制。

## 生产执行

1. 提交并推送仓库实现，等待普通 Deploy 成功，确认服务器为目标 SHA。
2. 人工 dispatch 专用 workflow，并传入精确确认词。
3. 等待 workflow 终态；失败则读取日志：
   - DDL 前失败：确认 backend 已恢复；
   - DDL 后失败：不自动继续，保留停写状态和备份证据。
4. 成功后用当前 Chrome 登录态重试安妮故事页。
5. 获取新鲜 backend 时间戳日志，确认 1054 不再出现。

## 最终检查与提交

- 使用 `trellis-check` 做全量任务范围复核。
- 使用 `trellis-break-loop` 记录为何普通 health 未发现 Schema 漂移，以及后续
  防复发边界。
- 使用 `trellis-update-spec` 固化人工 Schema 修复合同。
- 工作提交、任务归档、会话日志依序提交并推送 `main`。

## 回滚点

- workflow 未 dispatch：revert 仓库提交即可。
- DDL 前失败：脚本重新启动 backend，数据库不变。
- DDL 后失败：保持 backend 停止，从本轮完整逻辑备份人工恢复后再启动。
- 成功执行 006 后不得通过删除 `player_role_id` 回滚当前应用；如必须回退，
  应同时回退应用与整库备份。

## 执行结果

- [x] 无数据库质量检查全部通过。
- [x] 工作提交 `ee9f73b9` 已推送 `main`。
- [x] 普通 Deploy run `30610875124` 成功。
- [x] 生产修复 run `30610955460` 成功并保留完整备份与 SHA-256。
- [x] 006 与 008 的全部后置条件、backend health 和真实 ORM 查询成功。
- [x] 现有 Chrome 登录态下安妮故事页恢复到聊天界面。
