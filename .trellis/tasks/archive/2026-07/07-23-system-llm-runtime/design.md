# 系统 LLM 运行配置设计

## 边界

配置流固定为：

```text
部署环境
  -> ApiSettings 严格解析
  -> app_factory 组合根校验并构造 LLMConfig
  -> SystemStoryDialogueResponder
  -> core.llm_clients.complete
```

StoryWorld、Character、PlayerRole、管理 API 和玩家状态均不承载模型配置。

## 配置合同

`ApiSettings` 新增七个 `llm_*` 字段。字符串字段无代码默认值；三个数值字段使用专用严格解析器，未提供或解析失败均保留为 `None`，避免非法输入静默回退。

`app_factory` 负责唯一一次结构校验：

- backend 已注册，model 与 API Key 非空，base URL 为绝对 HTTP(S) 地址；
- temperature、max tokens、top-p 已成功解析且位于 PRD 范围；
- 失败时返回 `None` 配置并记录安全的变量名清单；
- 成功时构造现有 `core.llm_clients.LLMConfig`。

## Responder

`SystemStoryDialogueResponder` 只接收 `LLMConfig | None`。它不导入 `os`、`json` 或 `Path`，也不再知道配置来源。

- 配置为空：抛出 `StoryRuntimeError("dialogue_unavailable", "故事对话配置暂不可用。")`。
- provider 抛出 `LLMError`：仅记录 backend 与异常类型，随后返回现有角色暂不可回应文案。
- 空响应：返回同一受控错误。

现有 API 已把 `dialogue_unavailable` 映射为 HTTP `503`，无需改变公开协议。

## 兼容与迁移

- 当前 StoryWorld 运行时不再读取 `system_public_welfare_llm.json` 或 `OPENCODE_API_KEY`。
- `.env.example` 和部署文档提供完整 `FABLESPACE_LLM_*` 示例。
- 旧 Space 模块暂不删除；其历史 JSON 路径由后续旧合同清退任务处理，不作为新运行时回退。
- 配置缺失不会让 API 整体无法启动，便于公开浏览和内容后台继续工作。

## 安全与回滚

- API Key 只存在于后端环境和内存配置对象，不进入响应、日志或文档示例值。
- 日志不拼接异常正文，避免供应商错误回显敏感请求。
- 回滚只需恢复 responder 文件加载和 app factory 无参构造，不涉及数据库或迁移。
