# 修复故事选择语义与公共模型配置：技术设计

## 1. 交互语义

`StoryRun.events[].type` 已经提供稳定的语义边界：

```text
choice  -> 玩家审核行动意图 -> “你的选择”行动记录
message + role=player -> 玩家自由输入 -> “你”对白气泡
narration immediately after choice -> 审核动作 / 短句 -> 现有 Character 回应投影
message + role=character -> Character 对白 -> Character 气泡
```

前端不改 API 类型或事件内容，只在时间线投影时先判断 `choice`，再判断 Character / player / system。乐观事件已有 `PendingStoryExchange.kind`，因此使用同一语义分支，避免成功前后样式跳变。

`.annieStoryEvent--choice` 使用现有纸张与薰衣草色系，但移除气泡背景、边框、圆角尾部和阴影，改为带细边线的行动记录；桌面和移动端均保持右侧玩家归属，但不伪装成说话。

## 2. 配置来源与优先级

配置解析保持在部署环境与组合根：

```text
ApiSettings
  -> 检测是否存在任一 FABLESPACE_LLM_* 显式值
     -> 是：完整严格校验显式配置，失败即 unavailable
     -> 否：解析已有公共模型路由
          FABLEMAP_DEFAULT_FREE_LLM_BACKEND
          FABLEMAP_DEFAULT_FREE_LLM_MODEL
          FABLEMAP_DEFAULT_FREE_LLM_BASE_URL
          FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV
          -> 解析该服务端环境变量中的实际 Key
          -> 使用原生成参数 0.8 / 1024 / 0.9
  -> LLMConfig | None
  -> SystemStoryDialogueResponder
```

显式配置按“任一出现即选择整组”处理，避免将部分新配置与旧公共路由拼接成不可审计的混合配置。公共路由只在显式组完全不存在时复用。

API Key 环境变量指针必须符合普通环境变量名格式，且只解析服务端进程环境；诊断只报告固定配置字段名，不报告指针目标值、Key 或异常正文。

## 3. 边界与兼容

- 不恢复 `system_public_welfare_llm.json` 或 responder 内部文件读取。
- 不读取数据库、owner、StoryWorld 文档或客户端输入中的模型配置。
- `SystemStoryDialogueResponder` 继续只消费注入的 `LLMConfig | None`，保持应用层与配置来源解耦。
- HTTP `dialogue_unavailable` / `503` 合同和 StoryRun 数据合同不变。
- 完整 `FABLESPACE_LLM_*` 继续允许部署显式覆盖共享公共路由。
- 前端失败写入继续冻结，恢复按钮仍只执行 access + `GET runs/current`，不重放 POST；只移除错误的恢复承诺。

## 4. 文档同步

- `README.md` 和 `apps/api/.env.example`：七项显式变量改为可选覆盖，说明全缺省时复用既有公共路由。
- `docs/DEPLOYMENT.md`：记录两种来源的优先级、现有路由字段和重启要求。
- `docs/WORLD_SCHEMA.md`：把“只读取七项且不得回退其他 Key”修订为“显式组优先、全缺省时复用部署级公共路由”，继续禁止 owner / StoryWorld / DB / 仓库 JSON。
- `.trellis/spec/backend/system-story-llm-config.md` 记录配置来源、优先级、错误矩阵和秘密边界。
- `.trellis/spec/frontend/quality-guidelines.md` 补充 choice 与 free-input 的时间线显示边界，防止再次合并。

## 5. 风险与回滚

- 风险：部分显式配置若被静默拼接会隐藏部署错误。通过来源级互斥避免。
- 风险：任意 Key 指针可能造成不可审计读取。通过环境变量名校验、固定诊断名和服务端边界控制。
- 风险：选择样式修复误删 narration。保留现有 `choice -> narration` 过滤规则并定向审计。
- 回滚前分别撤销前端投影 / CSS 与配置来源解析；不涉及数据库或持久化迁移。
