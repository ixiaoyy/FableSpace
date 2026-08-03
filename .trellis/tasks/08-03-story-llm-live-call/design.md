# 生产 StoryWorld LLM 真实调用修复设计

## 数据流与故障边界

```text
apps/api/.env
  -> Docker Compose env_file
  -> ApiSettings / build_system_story_llm_config
  -> LLMConfig
  -> CustomBackend HTTP request
  -> provider response parsing
  -> SystemStoryDialogueResponder
  -> 503 dialogue_unavailable or Character reply
```

现有发布只检查到 `LLMConfig`。本次把发布门槛延伸到固定短提示的真实 provider 请求，但不创建 FastAPI 应用、不连接数据库、不读取用户状态。

## 安全诊断合同

- `CustomBackend` 为每个固定候选路径记录分类结果：HTTP 状态码、URL/超时异常类、JSON/响应结构错误。
- 不记录 base URL、Key、请求头、消息、响应正文或返回文本。
- 应用日志仍只记录 backend 和异常类；部署探针可输出固定分类摘要并以非零码失败。

## 发布与回滚

1. 在替换容器前抓取当前后端中固定 LLM 错误行，避免输出普通请求内容。
2. 构建新 backend 镜像。
3. 先做配置构造，再运行真实 provider 探针。
4. 两者均通过才执行 `compose up -d --no-build backend`。
5. 任一预检失败时当前运行容器不变；根据 HTTP/网络分类决定修配置或代理后重试。

代理不是默认设计的一部分。只有探针显示 DNS、连接、TLS 或超时类故障且目标在服务器直连不可达时，才增加后端专用代理环境；401/403、404、模型错误或响应格式错误不通过代理处理。

生产探针已返回 `v1_chat=http_500`，排除网络出口。部署把 GitHub Actions 中受保护的现有 `OPENCODE_API_KEY` 通过标准输入交给配置协调器，协调器只更新 `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 已指向的同名服务器变量。配置文件变更仍走既有备份和原子替换路径。

## 兼容性

- 不改变环境变量名和配置优先级。
- 不改变公开 API 的错误码或客户端文案。
- 不新增依赖；使用 Python 标准库和现有 provider 客户端。
