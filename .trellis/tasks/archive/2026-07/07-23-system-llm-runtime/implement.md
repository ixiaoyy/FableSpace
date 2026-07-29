# 系统 LLM 运行配置执行清单

## 实现

- [x] 在 `ApiSettings` 增加七个 `FABLESPACE_LLM_*` 字段和严格数值解析。
- [x] 在 `app_factory` 集中校验字段、记录安全诊断并构造 `LLMConfig`。
- [x] 把 `SystemStoryDialogueResponder` 改为只消费注入配置，删除 JSON / 环境读取。
- [x] 保持 `dialogue_unavailable` 的 HTTP `503` 合同和无密钥错误文案。
- [x] 更新 `.env.example`、README、`docs/DEPLOYMENT.md`、`docs/WORLD_SCHEMA.md`。
- [x] 搜索新运行链路，确认不再引用 `system_public_welfare_llm.json`、`OPENCODE_API_KEY`、owner 配置或 Token 状态。

## 验证

```powershell
py -3 -m compileall -q apps/api/src
```

另运行不访问数据库的定向脚本，覆盖：

- 完整环境配置生成预期 `LLMConfig`；
- 缺失 API Key、非法 temperature、越界 max tokens 和非法 top-p 均拒绝；
- responder 配置为空时产生 `dialogue_unavailable`；
- 诊断文本不包含 API Key 值。

## 风险与回滚点

- 不调用真实 LLM，不把网络可用性当作配置验证。
- 不运行数据库查询或迁移。
- 不修改旧 Space / owner 模块；若发现新运行时仍依赖旧合同，停止并回到设计阶段。

## 验证结果

- `py -3 -m compileall -q apps/api/src`：通过。
- 无数据库、无真实模型调用的定向脚本：通过。
- 当前 StoryWorld 运行时旧配置引用审计：通过。
- `git diff --check`：通过。
