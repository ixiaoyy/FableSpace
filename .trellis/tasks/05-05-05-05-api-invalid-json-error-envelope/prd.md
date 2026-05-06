# 修复 API 500 非 JSON 错误提示

## 背景

用户在前端看到：`API 返回了无效 JSON：Internal Server Error`。这说明前端把非 JSON 的 HTTP 500 响应当成“JSON 解析失败”展示，用户无法判断是服务端错误还是响应格式问题。

## 目标

- 非 JSON 的 HTTP 错误响应不再展示“无效 JSON”，而是带 HTTP 状态的失败提示。
- 后端未处理异常统一返回 JSON `{ "error": "服务暂时不可用" }`，避免裸 `Internal Server Error` 泄漏到前端。
- `python -m fablemap_api api` / core web app 启动路径可正常保存店主默认 LLM 配置，不再返回“存储不可用”。

## 非目标

- 不改变 API 错误信封字段名。
- 不暴露异常栈、API Key、LLM prompt 或其它敏感信息给前端。
- 不改动酒馆/NPC Schema。

## 验收

- 新增后端回归测试覆盖 core API 店主默认 LLM 配置持久化。
- 新增后端回归测试覆盖 native/core API 的未处理异常 JSON 信封。
- 新增前端脚本测试覆盖非 JSON HTTP 错误提示逻辑。
- 运行后端编译、聚焦 pytest、前端 test/typecheck/build。
