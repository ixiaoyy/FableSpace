# AI 参与开发协议

本协议用于约束 AI 在 FableSpace 仓库内协作开发。更高优先级规则见 `AGENTS.md`。

## 基本原则

- 先理解目标和改动范围，再动代码。
- 优先读取当前权威文档和目标代码；不要批量读取无关历史资料。
- 小需求小处理，避免把文案/布局改动扩大成全量重构、全量测试或大量断言。
- 所有 AI 输出都是候选草稿；不得声称完成但未实际修改/验证。

## 任务记录

- 新功能、较大 bug、跨层改动和小修均在最终汇报中说明目标、改动文件、验证和风险。
- 只有长期产品、Schema、架构或开发约束变化时才更新对应权威文档。
- 截图、raw scan、Vite cache、pytest 临时数据和长日志只作为本地验收证据，不写入长期文档。

## 文档维护

- 不要为一次性 UI 文案/布局修复追加长规范。
- 不要把历史 brainstorm 细节当作当前事实；以当前 docs 和代码为准。

## 验证

按改动范围选择最小真实验证：

- Python：`py -3 -m compileall -q apps/api/src`。当前仓库不保留 pytest 套件，不新增 `test_*.py` 或 pytest 入口。
- Frontend：UI/build 变化跑 `npm --prefix .\apps\web run build`；类型或 API client 变化跑 `npm --prefix .\apps\web run typecheck`。当前 `apps/web/package.json` 不保留 `test` 脚本，不新增前端测试入口。
- 浏览器视觉验收：仅在用户明确要求或任务确有验收需要时使用，不要求先运行 Playwright 自检。
- 不要为简单文案/布局增加大量 brittle 断言。

## 禁止

- 泄露或记录 owner API key、LLM secret、访客私密记忆。
- 实现 `WHAT_NOT_TO_BUILD.md` 排除的方向。
- 无关格式化、依赖升级、跨层重构。
- 未确认就移动/删除产品权威 docs。
- 长时间只检索不落盘；清理任务应边查边删/压缩。

## 汇报

最终汇报只列：

- 改了哪些文件；
- 为什么改；
- 验证命令与结果；
- 未做/风险。
