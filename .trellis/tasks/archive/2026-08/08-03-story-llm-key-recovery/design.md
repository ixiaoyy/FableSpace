# 修复生产 LLM Key 配置传播 — Design

## Root Cause

这是跨层配置合同和变更传播失败：运行时开始复用
`FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV`，但服务器配置脚本仍把该指针常用的目标
`OPENCODE_API_KEY` 当作旧能力删除。单独验证本地 `apps/api/.env` 无法覆盖生产部署脚本。

## Boundaries

- 配置修复归 `deploy/server/configure_shared_services.py` 所有；运行时仍只消费完整的
  `ApiSettings`，不读取备份。
- 只从目标 `apps/api/.env` 同目录、由既有脚本产生的 `.env.pre-shared-*` 恢复。
- 恢复逻辑泛化到指针指定的合法环境变量名，不硬编码 Key 值。
- 不连接数据库，不调用模型服务，不打印任何环境变量值。

## Recovery Contract

1. 解析当前 FableSpace 环境。
2. 读取 `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV`：
   - 未配置：状态 `not-configured`，继续部署。
   - 非法环境变量名：失败。
   - 当前目标变量非空：状态 `existing`，原样保留。
   - 当前目标变量为空：按文件名倒序扫描 `.env.pre-shared-*`。
3. 找到非空目标值时，把它加入本次受控 `updates`，状态 `recovered`。
4. 所有备份都没有目标值时失败；容器替换尚未发生。

## Diagnostics and Security

- 只输出 `story_llm_key=not-configured|existing|recovered`。
- 错误只指出 `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 或其固定目标变量名，不输出值。
- `update_env_text` 继续以 0600 权限原子写入并保留备份。

## Rollout and Rollback

- 修改 `deploy/server/**` 会触发后端部署；配置脚本先运行，成功后才重建容器。
- 若备份无法恢复，部署失败并保留当前容器，需人工在服务器环境补回 Key。
- 回滚代码不会删除已恢复的 Key，因为 `OPENCODE_API_KEY` 已从退役集合移除。
