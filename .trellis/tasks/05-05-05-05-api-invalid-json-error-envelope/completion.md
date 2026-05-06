# 完成记录

## 改动

- 前端 `readApiJson`：非 JSON 的 HTTP 错误响应改为显示 `API 请求失败（status）：body/statusText`，不再误报“无效 JSON”。
- core web API：为 `TavernApplicationService` 挂接 `OwnerConfigStore` 与 `VisitorNoteStore`，修复 `python -m fablemap_api api` 路径下店主默认 LLM 配置存储不可用。
- native/core API：为未处理异常添加统一 JSON 兜底 `{ "error": "服务暂时不可用" }`，服务端记录异常栈，前端不暴露内部 traceback。
- 新增后端与前端回归测试。

## 验证

- `py -3 -m compileall -q backend/src`：通过。
- `py -3 -m pytest -q tests/test_core_api_owner_config.py tests/test_api_error_envelope.py tests/test_ai_assisted_tavern_drafts.py --tb=short`：10 passed。
- `npm --prefix .\frontend test`：通过。
- `npm --prefix .\frontend run typecheck`：通过。
- `npm --prefix .\frontend run build`：通过。
- `curl.exe --noproxy "*" http://127.0.0.1:8950/api/meta`：200 JSON。
- `curl.exe --noproxy "*" -X PUT http://127.0.0.1:8950/api/v1/owners/me/default-llm`：200 JSON，`api_key` 未回显。

## 备注

这是 API/错误处理修复，不涉及可见 UI 布局；因此未做 Playwright 视觉截图。

