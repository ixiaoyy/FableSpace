# 修复生产 LLM Key 配置传播

## Goal

让生产 StoryWorld 对话继续使用部署中原有的公共模型配置，且部署过程不得删除
`FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 所引用的服务端 Key。

## Background

- 生产部署 `30792802139` 已成功更新前后端到 `1be902b1`，新开的生产页面已显示
  `你的选择`；选择展示代码已生效，用户看到旧样式属于部署前 SPA 页面仍驻留。
- 后端容器从 `docker-compose.yml:13-15` 指定的 `apps/api/.env` 读取环境变量。
- `deploy/server/configure_shared_services.py:16-33` 把 `OPENCODE_API_KEY` 列为退役键，
  每次部署都会从同一个 `apps/api/.env` 删除它。
- 公共模型配置通过 `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV=OPENCODE_API_KEY`
  间接引用该 Key；因此部署脚本破坏了运行时配置链。
- 部署脚本在改写环境文件前会保留 `.env.pre-shared-*` 备份，可用于无日志恢复
  被它误删的原 Key。
- Actions run `30608551985` 在引入无条件退役列表的首次生产部署中记录了
  `/opt/fablespace/apps/api/.env.pre-shared-20260731T060428Z`，生产恢复源已确认存在。

## Requirements

- R1：`OPENCODE_API_KEY` 不再作为无条件退役键删除；部署脚本必须保留当前有效值。
- R2：当公共模型 Key 指针存在而目标变量缺失时，部署脚本按时间倒序检查同目录
  `.env.pre-shared-*`，恢复第一个非空旧值，且不得输出 Key、备份内容或 Key 值。
- R3：Key 指针必须是合法环境变量名；指针非法、目标缺失且无可恢复备份时，部署在
  替换后端容器前明确失败，不再静默发布一个必然返回 `dialogue_unavailable` 的版本。
- R4：没有配置公共模型 Key 指针的部署保持可启动，不强制引入模型配置。
- R5：部署输出只记录 `existing`、`recovered` 或 `not-configured` 等固定状态，供 Actions
  验证真实配置来源。
- R6：不修改数据库、StoryWorld 内容、玩家状态或真实 `.env`；不在仓库中保存密钥。

## Acceptance Criteria

- [x] AC1：现有 Key 不被删除，配置结果报告 `existing`。
- [x] AC2：当前 Key 缺失但备份存在时恢复同一变量，配置结果报告 `recovered`。
- [x] AC3：指针非法或无法恢复时脚本非零退出，诊断只含固定变量名。
- [x] AC4：未配置指针时脚本保持成功并报告 `not-configured`。
- [x] AC5：部署脚本最小验证、Python compileall、前后端既有检查通过。
- [x] AC6：推送 `main` 后 Actions 后端部署成功，日志确认 Key 状态为 `existing` 或
  `recovered`；生产新开页面继续显示 `你的选择`。

## Out of Scope

- 不把 Key 复制到 GitHub Secrets、仓库文件、前端变量或数据库。
- 不提交测试消息或选择来改变用户的 StoryRun。
- 不为部署前已打开的 SPA 实现热版本切换；生产验收使用全新页面加载。
