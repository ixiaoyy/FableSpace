# 模块认领说明

- 模块名 / 区域名：T0.2 前端边界拆分（App shell / world session / writeback 面板职责收敛）
- 负责人：Roo
- 改动类型：功能 / 工具 / 测试 / 文档
- 当前状态：in_progress

## 目标

本次准备围绕当前最高优先级任务 `T0.2` 推进一次最小侵入的前端边界拆分：

1. 收敛 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 的页面装配职责，只保留 app shell 级组合。
2. 继续收敛 [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js) 的会话编排职责，优先抽离可独立复用的派生状态与展示状态。
3. 为后续写回闭环补平与地图模块治理提供更稳定的前端接线点，不改变当前主链路 `坐标输入 -> nearby preview -> world map -> writeback -> feedback`。

## 计划修改范围

- [`frontend/src/App.jsx`](../frontend/src/App.jsx)
- [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js)
- [`frontend/src/`](../frontend/src/) 下与上述拆分直接相关的新建组件 / hooks / services 文件
- [`tests/`](../tests/) 下与本次拆分直接相关的最小验证
- [`docs/changes/`](../docs/changes/) 下本次改动说明

## 明确不改范围

- 不改写回协议文档与治理协议本身
- 不改后端 API 结构与 [`fablemap/`](../fablemap/) 领域逻辑
- 不扩写新的世界机制、镜头引擎或编排器能力
- 不做与本次边界拆分无关的视觉大改或地图资源重构

## 依据的协议文档

- [`README.md`](../README.md)
- [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`docs/CURRENT_TASKS.md`](../docs/CURRENT_TASKS.md)
- [`docs/AI_SHARED_TASKLIST.md`](../docs/AI_SHARED_TASKLIST.md)
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)

## 预期产出

- 边界更清晰的前端组合层代码
- 至少一个可复用的派生状态 / 展示状态抽离点
- 必要的最小验证结果
- 一份对应的变更记录

## 验证方式

- 执行前端相关测试或构建校验
- 确认现有地图主舞台、写回面板与入口链路不被破坏
- 确认拆分后导入关系与运行时状态保持兼容

## 风险与备注

- [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js) 当前承担较多会话、派生状态与副作用编排，拆分时需避免破坏持久化与自动进入逻辑
- [`frontend/src/App.jsx`](../frontend/src/App.jsx) 已基本承担组合层职责，本次更适合继续抽离会话派生状态，而不是做无边界重构
- 若实现过程中发现需要协议或主链路口径调整，应停止执行并先回到规划阶段
