# 2026-04-17 — P1-07 输出修正 / 风格护栏

## 完成内容

- 新增 `fablemap/output_rules.py`：
  - 内置默认输出规则：去除 AI 自称、OOC 开头、总结式标题、压缩多余空行、玩家主导权示例。
  - `apply_output_rules()` 返回 `changed / applied / errors` 诊断信息。
  - 无效正则只记录错误，不中断调用链路。
- `Tavern` 增加 `output_rules` 持久化字段。
- 聊天回复在落库前自动应用输出护栏，并在响应中返回规则应用摘要。
- 新增输出护栏 API：
  - `GET /api/taverns/{id}/output-rules`
  - `PUT /api/taverns/{id}/output-rules`
  - `POST /api/taverns/{id}/output-rules/test`
- 酒馆包导入 / 导出包含 `output_rules`，仍过滤 API Key、密码和访客聊天。
- 新增 `frontend/src/OutputRulesEditor.jsx`，店主可开关、编辑、复制、恢复默认和预览规则。
- `TavernOwnerPanel` 酒馆卡片新增“护栏”入口。

## 验证

- `py -3 -m pytest -q --tb=short tests/test_tavern_output_rules.py` → 2 passed
- `py -3 -m compileall -q fablemap` → passed
- `npm --prefix .\frontend run build` → passed
- `py -3 -m pytest -q --tb=short` → 173 passed
