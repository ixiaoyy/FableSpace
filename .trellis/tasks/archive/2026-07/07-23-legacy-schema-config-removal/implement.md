# 实施计划：清退旧 Schema 配置与部署引用

## 评审门

在用户明确批准 PRD R1 的 23 张表与一个列级删除前：

- 不运行 `task.py start`；
- 不创建、修改或暂存数据库迁移；
- 不删除 ORM、迁移入口或配置；
- 不连接任何数据库。

批准仅授权仓库内实施。连接或执行真实数据库仍需单独明确授权、目标标识和备份
证据。

## 修改顺序

1. 激活任务并加载开发规范
   - `task.py start 07-23-legacy-schema-config-removal`
   - 使用 `trellis-before-dev` 读取 backend/database/deployment 约束。

2. 收敛当前 ORM 与 Schema comments
   - 从 `StoryRunModel` 删除旧内联 `private_memories` 列和创建参数。
   - 删除旧 `models.py`、`legacy_schema.py`、`migrate.py`、
     `migrate_database.py` 与 `default_spaces.py`。
   - 重写 Schema comments 为当前 8 张表，并让 comment 工具只注册两组当前
     models、只接受 `FABLESPACE_DATABASE_URL`。

3. 创建唯一清退迁移
   - 删除 001–003 旧 SQL。
   - 新增 `008_retire_legacy_space_schema.sql`，实现 8 表存在检查、非空内联
     记忆阻断、12 张直接依赖表优先的 23 表删除顺序和单列删除。
   - 使用迁移期临时存储过程承载 MySQL `SIGNAL`；成功后删除过程，失败重试前
     由脚本首句清理遗留过程。只允许 mysql client 解释 `DELIMITER`。
   - 不执行迁移。

4. 收敛运行配置
   - 删除 settings/storage/database 中的 alias、JSON storage 和无消费者
     字段/方法。
   - 保留当前数据库、MySQL pool、认证、LLM、媒体和 generated-storage 合同。
   - 更新 `.env.example`。

5. 收敛部署与依赖
   - 删除 Redis 映射/依赖、旧 LLM config、Docker config copy/无用 ENV。
   - 删除 GitHub Actions 的 AMap build args。
   - 扩展共享配置器的退役键清理集合，并保持备份、SSO、MySQL、媒体逻辑。

6. 同步文档与规范
   - 修正 README 当前 CLI/健康路径。
   - 更新 `docs/DEPLOYMENT.md` 的空库基线、备份、008 显式执行与 restore-only
     回滚。
   - 更新 `docs/WORLD_SCHEMA.md`、平台删除边界和 backend database/directory
     specs。

## 无数据库验证

1. Python 语法：

   ```powershell
   py -3 -m compileall -q apps/api/src deploy/server
   ```

2. 当前 metadata：
   - 导入生产组合所需模块但不调用 `create_app()`；
   - 断言 `Base.metadata.tables` 精确等于 8 张保留表；
   - 断言 `schema_comment_errors(Base.metadata)` 为空。

3. 清退迁移静态合同：
   - 解析 008 文本，断言 DROP 表集合精确等于 PRD 的 23 张表；
   - 断言保留表不出现在 DROP 集合；
   - 断言唯一列删除是 `story_runs.private_memories`；
   - 断言只把 JSON 空数组 `[]` 与 SQL `NULL` 视为可删除的空内联记忆，
     其他 JSON 类型和值均触发失败前置条件；
   - 断言旧内联列已不存在时迁移幂等跳过列删除。

4. 配置合同：
   - 在隔离 subprocess 中注入退役键，断言 `ApiSettings` 不读取它们；
   - 断言主键和默认 SQLite 路径仍生效；
   - 直接调用共享配置器纯函数，断言只映射当前键、会删除退役键且不再要求
     Redis；不读取真实 `.env`。

5. 部署与前端：

   ```powershell
   docker compose config --quiet
   npm --prefix .\apps\web run build
   ```

   Docker 不可用时明确报告并以配置文件静态检查替代，不伪造通过。

   实际执行 008 时必须先部署当前 8 表 ORM，确保仍写入旧内联列的旧进程不会
   在列删除后继续运行；本任务仅记录该顺序，不执行部署数据库操作。

6. 残留审计：
   - 搜索旧 23 表、`story_runs.private_memories` ORM 列、旧迁移模块、
     `FABLEMAP_*`、退役 `FABLESPACE_*`、Redis、AMap 和旧 config；
   - 允许旧名只出现在 008 的明确 DROP/阻断语句、部署清理键集合、禁止性文档
     和本任务归档记录。

7. 最终 staged snapshot：

   ```powershell
   git diff --cached --check
   git diff --check
   py -3 -m compileall -q apps/api/src deploy/server
   npm --prefix .\apps\web run build
   ```

## 回滚点

- 仓库代码：精确 revert 本任务提交，不覆盖 `AGENTS.md` 或 `UI稿/`。
- 真实数据库：本任务不执行；未来执行 008 后只能从执行前逻辑备份恢复。
- 服务器配置：`configure_shared_services.py` 写入前生成
  `.env.pre-shared-<UTC>`，可用该文件恢复退役键清理前状态。

## 暂存与提交

- 获批后，生产代码、配置和迁移确认属于需求即显式暂存。
- 任务文档与规范在质量门禁通过后暂存。
- 不暂存或修改用户现有的 `AGENTS.md` 与 `UI稿/`。
- 创建一个工作提交；随后按 Trellis 流程归档任务并记录日志。
