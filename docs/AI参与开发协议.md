# AI 参与开发协议

本协议用于约束 AI 在 FableSpace 仓库内协作开发。更高优先级规则见 `AGENTS.md`。

## 基本原则

- 先理解目标和改动范围，再动代码。
- 优先读取当前权威文档、相关 spec、目标代码；不要批量读取历史任务。
- 小需求小处理，避免把文案/布局改动扩大成全量重构、全量测试或大量断言。
- 所有 AI 输出都是候选草稿；不得声称完成但未实际修改/验证。

## 任务记录

- 新功能/较大 bug/跨层改动：使用 `.trellis/tasks/<task>/` 留痕。
- 小修：可只在最终汇报说明，不强制创建新任务。
- 完成任务记录保持简短：目标、改动文件、验证、风险。
- 不要把截图、raw scan、Vite cache、pytest 临时数据、长日志放进 Trellis。

## 文档/spec

- 只有 durable contract 变化才更新 `.trellis/spec/`。
- 不要为一次性 UI 文案/布局修复追加长规范。
- 不要把历史 brainstorm 细节当作当前事实；以当前 docs/spec/code 为准。

## 验证

按改动范围选择最小真实验证：

- Python：`py -3 -m compileall -q backend/src`，行为变化跑 focused pytest。
- Frontend：UI/build 变化跑 `npm --prefix .\frontend run build`；类型或 API client 变化跑 `npm --prefix .\frontend run typecheck`；只有 package scripts 中存在对应测试脚本时才运行 focused test。
- 视觉验收/Playwright：仅在视觉还原、用户指定验收或高风险 UI 时使用。
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
