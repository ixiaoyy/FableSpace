# 收敛系统 LLM 运行配置

## Goal

把当前 StoryWorld 对话运行时的模型配置收敛到 FableSpace 部署环境，删除其对仓库 JSON、owner、StoryWorld 私有配置和 Token 状态的依赖。

## Background

- 当前 `SystemStoryDialogueResponder` 直接读取 `apps/api/config/system_public_welfare_llm.json`。
- API Key 通过该 JSON 间接指向 `OPENCODE_API_KEY`，但 backend、model、base URL、temperature、max tokens 和 top-p 仍由仓库文件决定。
- `app_factory.py` 是当前 StoryWorld 运行时的组合根，适合把已解析、已校验的系统配置注入 responder。

## Requirements

- 只收敛当前 StoryWorld 故事运行链路的系统级 LLM 配置。
- 使用 `FABLESPACE_LLM_BACKEND`、`FABLESPACE_LLM_MODEL`、`FABLESPACE_LLM_API_KEY`、`FABLESPACE_LLM_BASE_URL`、`FABLESPACE_LLM_TEMPERATURE`、`FABLESPACE_LLM_MAX_TOKENS` 和 `FABLESPACE_LLM_TOP_P`。
- 所有字段都从部署环境读取；不得回退到仓库 JSON、`OPENCODE_API_KEY` 或 owner / StoryWorld 数据。
- 数值配置必须严格校验：temperature 为 `0..2`，max tokens 为 `1..4096`，top-p 为 `(0, 1]`。
- 缺失或非法配置不阻断公开浏览和内容后台启动；真正请求角色对话时返回现有 `dialogue_unavailable` / HTTP `503`。
- 启动日志只允许记录缺失或非法的环境变量名，不记录值、API Key、玩家输入、Prompt 或供应商响应正文。
- 删除新运行链路对 owner / StoryWorld 私有配置和 Token 统计的依赖。
- provider 调用失败只记录安全的 backend 和异常类型，并继续向玩家返回通用受控错误。
- 不删除旧 owner 模块；旧模块由后续清退任务处理。

## Acceptance Criteria

- [x] 新运行时只通过一组 `FABLESPACE_LLM_*` 部署变量构造单一系统配置并调用模型。
- [x] `SystemStoryDialogueResponder` 不再读取文件或环境变量。
- [x] 缺失或非法配置产生明确、无密钥泄露的错误。
- [x] 日志和响应不包含 API Key。
- [x] 新代码不读取 owner LLM 配置或店主 Token 状态。
- [x] `.env.example`、README、部署说明和 `WORLD_SCHEMA.md` 与新变量及失败语义一致。
- [x] Python 语法检查和定向配置验证通过。

## Out of Scope

- 不修改公开 API 响应 Schema、前端页面或 StoryWorld 内容文档结构。
- 不新增管理员模型配置页面、动态热更新、provider 管理、Token 计费或数据库字段。
- 不删除旧 Space / owner 模块；其仓库 JSON 依赖留给已排期的旧合同清退任务。
