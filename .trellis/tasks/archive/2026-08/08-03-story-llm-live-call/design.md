# 生产 StoryWorld LLM 真实调用修复设计

## 数据流与故障边界

```text
apps/api/.env
  -> Docker Compose env_file
  -> ApiSettings / build_system_story_llm_config
  -> LLMConfig(extra.proxy_url)
  -> CustomBackend scoped ProxyHandler
  -> llm-proxy (private Docker network)
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
3. 从受保护 Secret 经标准输入原子生成 root 权限 Mihomo 配置，校验固定摘要镜像、配置与内部监听。
4. 做 LLM 配置构造，再经专用代理运行真实 provider 探针。
5. 所有预检均通过才执行 `compose up -d --no-build backend`。
6. 任一预检失败时当前运行 backend 不变；根据 HTTP/网络分类决定修配置或代理后重试。

代理不是默认设计的一部分。只有同一 Key、模型和端点的受控 A/B 探针证明直连与代理路径结果不同，才增加后端专用代理环境；HTTP 500 说明基础 DNS/TCP/TLS 可达，但仍可能是 provider 针对直连出口返回的上游错误，不能仅凭服务器位于海外排除路由差异。401/403、固定路径 404 或响应格式错误不能单独作为安装代理的依据。

生产与本地强制直连探针均返回 `v1_chat=http_500`、备用路径 404；本地通过系统代理曾以相同 Key 返回有效结果。Key 已同步并确认一致，剩余阻塞集中在 provider 对直连出口的处理。部署把 GitHub Actions 中受保护的现有 `OPENCODE_API_KEY` 通过标准输入交给配置协调器，协调器只更新 `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 已指向的同名服务器变量。配置文件变更仍走既有备份和原子替换路径。

用户提供的订阅保存为 `FABLESPACE_LLM_PROXY_SUBSCRIPTION_URL` Actions Secret。部署经标准输入生成 `/opt/fablespace-secrets/llm-proxy/config.yaml`，Mihomo 只连接项目私有 `llm_egress` 网络且不映射端口。Compose 只向 backend 注入非敏感的 `FABLESPACE_LLM_PROXY_URL=http://llm-proxy:7890`；运行时把它放入 `LLMConfig.extra`，仅 `CustomBackend` 创建局部 `ProxyHandler`，因此不会改变 SSO、媒体或其他 HTTP 出口。

## 兼容性

- 不改变既有模型环境变量名和配置优先级；新增的代理地址与七字段模型覆盖组正交。
- 不改变公开 API 的错误码或客户端文案。
- 不新增依赖；使用 Python 标准库和现有 provider 客户端。

## 对白与叙事边界

模型只返回固定 JSON 对象：`dialogue` 是角色实际说出口的话，`narration_before` 与 `narration_after` 是可选、可观察的第三人称动作。应用层先做结构与安全校验，再按时间顺序持久化：

```text
player message
  -> optional narration_before (role=system, character_id set)
  -> character message (role=character, dialogue only)
  -> optional narration_after (role=system, character_id set)
```

叙事事件沿用现有 `StoryEvent.event_type=narration`，不新增表、列或迁移。新事件 payload 标记 `presentation_version=2`。旧 `free_input` Character message 若缺少该标记且命中“角色名 + 第三人称动作”的窄规则，只在 API 投影中改为 narration，并从后续 Character 对话上下文排除；不改写持久化记录，也不从旁白反推虚构对白。

前端把 `role=character` 的 `message` 作为唯一 Character 气泡来源。所有 narration 都使用独立、无头像的“此刻”样式；初始场景仍隐藏，选择后的审核结果以及绑定 Character 的生成动作可见。

## Bug Analysis: 角色旁白冒充对白与生产模型假就绪

### 1. Root Cause Category

- **Category**: B - Cross-Layer Contract，兼有 D - Test Coverage Gap 与 E - Implicit Assumption。
- **Specific Cause**: 模型提示允许对白或动作，应用层却只接收一段字符串并统一存为 Character message，前端又根据调用来源推断气泡类型；部署则把“配置对象能构造”和“海外服务器可联网”误当作 provider 路由可用，没有验证实际出口与响应合同。

### 2. Why Fixes Failed

1. 只调整玩家 choice 展示，未同时修正生成回复的 prompt、解析、策略、持久化、上下文与旧记录投影，因此第三人称内容仍能进入 Character 气泡。
2. 恢复并同步 Key 只消除了缺配置，生产与强制直连仍返回相同 HTTP 500；缺少直连/代理 A/B 与替换容器前的真实 provider 探针。
3. 非空回复探针不能证明运行时结构可用；模型仍可能返回把旁白与对白混在一起的文本。

### 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
|---|---|---|---|
| P0 | Architecture | 固定三字段 JSON，Character message 与 system narration 分开持久化 | DONE |
| P0 | Runtime gate | 生产替换前校验代理配置、监听、真实 provider 与对白合同 | DONE，待生产 workflow 验证 |
| P0 | Egress scope | 仅 `CustomBackend` 使用局部 `ProxyHandler`，禁止全进程代理 | DONE |
| P1 | Compatibility | 旧混合记录只读投影为 narration，并从 Character 上下文排除 | DONE |
| P1 | Documentation | 同步后端、前端、部署、Schema 与跨层规范 | DONE |

### 4. Systematic Expansion

- **Similar Issues**: 其他 Character、审核 choice narration 与未来模型 provider 都必须沿用同一 presentation 合同。
- **Design Improvement**: 不再依据“由哪个模型生成”推断“谁说了什么”；用结构字段决定持久化与 UI。
- **Process Improvement**: 外部服务发布门槛必须跨过真实生产出口并验证运行时所需的具体响应合同。

### 5. Knowledge Capture

- [x] 更新 `.trellis/spec/backend/historical-choice-chat.md`。
- [x] 更新 `.trellis/spec/backend/system-story-llm-config.md`。
- [x] 更新 `.trellis/spec/frontend/quality-guidelines.md`。
- [x] 更新 `.trellis/spec/guides/cross-layer-thinking-guide.md`。
- [x] 更新 `docs/WORLD_SCHEMA.md` 与 `docs/DEPLOYMENT.md`。
- [x] 当前仓库不存在 `src/templates/markdown/spec/`，无可同步模板。
