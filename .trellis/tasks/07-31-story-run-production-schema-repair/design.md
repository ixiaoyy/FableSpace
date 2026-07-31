# 技术设计：修复 StoryRun 生产 Schema 漂移

## 故障链路

```text
故事页
  -> GET /api/v1/story-worlds/.../runs/current
  -> StoryWorldApplicationService.current()
  -> SQLAlchemy SELECT story_runs.player_role_id
  -> 生产 MySQL 缺列 1054
  -> 前端显示“服务暂时不可用”
```

普通健康检查只读取静态系统状态，不触及 `story_runs`，因此部署成功与故事数据
路径可用是两个独立信号。

## 修复边界

现有 006 是唯一 Schema 变更来源：

1. `ADD COLUMN player_role_id VARCHAR(128) NULL AFTER content_version`；
2. 从同一玩家、同一 StoryWorld 的 `player_story_states.player_role_id` 回填；
3. 改为 `VARCHAR(128) NOT NULL`。

本任务不创建 009，也不修改 006 的业务含义。006 本身不是可盲目重跑脚本：
如果第一次执行在新增列后失败，再次从第一句运行会因列已存在而失败。因此生产
入口必须在 DDL 前证明列完全不存在；任何中间态都阻断自动继续。

生产表仍保留 004 的 `private_memories JSON NOT NULL` 且没有默认值，而当前
ORM 已不再把该列加入 INSERT。006 与这个写入不兼容无关，因此它只修复读取
路径。用户已批准在验证 006 后置条件后继续执行已审核的 008，以清退精确 23 张
旧表和该内联列，恢复完整读写闭环。

## 执行面

推荐增加一个只由 `workflow_dispatch` 触发的专用生产修复 workflow；现有仓库
没有可注入任意迁移命令的运维入口，workflow 通过现有 SSH secrets 执行固定的
内联维护脚本：

- workflow 只复用现有 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`，
  验证输入等于精确确认词后才建立 SSH；
- workflow 不接收 SQL、数据库名、主机或任意 shell 文本输入；
- 远端脚本固定目标为 `/opt/fablespace` 与 `fablespace`，从
  `/opt/parallellines` Compose 项目解析数据库容器，不接受数据库名、SQL 或
  shell 文本输入；
- 远端脚本内固定当前已审核的 006 与 008 SHA-256，文件内容漂移时在连接
  database 前停止；
- MySQL 用户名和密码只在数据库容器内部展开，不通过宿主参数或 workflow
  输出传递；
- 远端脚本核对服务器 Git SHA 与 workflow SHA，先重建当前 backend 并静态检查
  运行 ORM 列集合，再停止 backend。

这个入口是人工、显式、可审计的运维动作，不属于普通 push 部署，也不会在应用
启动时运行。它与普通 Deploy 共用 `fablespace-production` concurrency group，
且两边都必须使用 `cancel-in-progress: false`，避免维护窗口被新部署取消。

## 备份与前置检查

停止 backend 后，从 MySQL 容器运行 `mysqldump`：

- `--single-transaction --routines --triggers --events --databases fablespace`
- 输出到服务器受保护目录，例如
  `/opt/fablespace/backups/story-run-schema-repair/`
- 文件名包含 UTC 时间；
- `test -s` 后生成同名 `.sha256`。

随后用 batch/skip-column-names 模式查询 `information_schema` 和回填覆盖：

- 两张父表存在；
- `player_story_states.player_role_id` 存在；
- `story_runs.player_role_id` 列数为 0；
- 当前 8 表之外的全部表只能属于 008 已审核的 23 表清单；
- `player_story_states` 的 `(player_id, story_world_id)` 不存在重复键；
- `story_runs LEFT JOIN player_story_states` 的缺失/空 role 行数为 0；
- 008 的 8 张当前表完整；
- 旧内联 `private_memories` 只含 SQL NULL 或 JSON 空数组。

查询只输出 PASS/BLOCKED 和计数，不输出玩家 ID、角色 ID或其他私有数据。

## 状态机与失败处理

```text
检查运行版本
  -> 重建当前 backend
  -> 停止 backend
  -> 完整备份 + SHA
  -> Schema/回填前置检查
     -> 失败：未开始 DDL，重新启动 backend，任务失败
     -> 通过：标记 DDL_STARTED
        -> 执行 006
           -> 失败：保持 backend 停止，保留备份，人工恢复
           -> 成功：验证 player_role_id 定义/数据
              -> 执行 008
                 -> 失败：保持 backend 停止，保留备份，人工恢复
                 -> 成功：验证精确 8 表且旧内联列消失
                    -> 启动 backend + health
                    -> 浏览器与新日志验收
```

不自动导入备份。DDL 已开始后的自动恢复可能覆盖未识别的外部状态，必须由人工根据
备份、SHA 和失败位置决定。

## 验证

仓库内不连接数据库：

- shell 语法与危险命令静态审计；
- workflow YAML/Compose 解析；
- Python compile、前端 build；
- 静态断言专用 workflow 只有 `workflow_dispatch`，固定按顺序执行 006 与
  008，迁移哈希与仓库文件一致、允许表集合与 008 精确清单一致，且不接受任意
  用户 SQL 输入。

生产执行后：

- 查询列类型、nullable 和空值计数；
- 查询表集合精确为当前 8 表并确认内联列不存在；
- backend 容器中的 ORM 包含 `player_role_id`、不包含内联
  `private_memories`；
- `/api/v1/health` 成功；
- 用户登录态故事页恢复；
- 查看新的带时间戳 backend 日志，确认 1054 消失。

## 回滚边界

- DDL 前：重新启动 backend；数据库未改变。
- 006 或 008 DDL 后：保持写入停止，使用本轮完整逻辑备份做人工整库恢复；
  不依赖反向 `ALTER`。
- 仓库代码：精确 revert 本任务提交，不覆盖用户的 `AGENTS.md` 或 `UI稿/`。
