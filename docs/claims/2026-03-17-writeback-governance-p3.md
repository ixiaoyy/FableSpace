# 模块认领说明

- 模块名 / 区域名：P3 · 玩家写回权限与语义治理边界
- 负责人：AI 协作者
- 改动类型：协议 / 文档
- 当前状态：claimed

## 目标

在 [`P5 · World Writeback Protocol v0.1`](docs/WORLD_WRITEBACK_PROTOCOL.md) 最小写回闭环跑通后，立即补充完整的写回治理边界协议，定义：

- `private / local_public / global` 三层写回的完整语义边界与权限约束
- AI 改写、翻译、压缩与摘要的允许范围与禁止边界
- moderation、审核、精选与晋升机制的基础规则
- 玩家写回内容的可见性、持久化层级与生命周期管理

## 计划修改范围

- 会新增 `docs/WORLD_WRITEBACK_GOVERNANCE.md` 协议文档
- 可能补充 [`docs/WORLD_WRITEBACK_PROTOCOL.md`](docs/WORLD_WRITEBACK_PROTOCOL.md) 中与治理相关的章节引用
- 会更新 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 中 P3 任务状态
- 会新增对应的 `docs/changes/` 变更说明文档

## 明确不改范围

- 不改 [`P5`](docs/claims/2026-03-13-world-writeback-protocol-v0-1.md) 已定义的事件结构、target schema、effect schema
- 不改 [`docs/PLAYER_STATE.md`](docs/PLAYER_STATE.md) 的玩家状态字段定义
- 不改 [`docs/WORLD_SCHEMA.md`](docs/WORLD_SCHEMA.md) 的世界数据结构
- 不进入 [`P4`](docs/AI_SHARED_TASKLIST.md:40) 的历史深度 / Time Folds 协议范围
- 不实现具体的后端代码、API 接口或前端交互（仅定义协议）
- 不引入数据库设计或完整多人并发冲突处理机制

## 依据的协议文档

- [`README.md`](README.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/AI参与开发协议.md`](docs/AI参与开发协议.md)
- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](docs/WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_PLAN.md`](docs/WORLD_WRITEBACK_PLAN.md)
- [`docs/PLAYER_STATE.md`](docs/PLAYER_STATE.md)

## 预期产出

新增协议文档 `docs/WORLD_WRITEBACK_GOVERNANCE.md`，至少包含以下章节：

### 1. 三层可见性完整定义
- `private` 层：个人写回的语义边界、存储位置、生命周期
- `local_public` 层：区域共享写回的准入条件、审核规则、覆盖范围
- `global` 层：全局神话层写回的高门槛标准、晋升机制、持久化策略

### 2. AI 改写边界
- 哪些内容允许 AI 改写、压缩、翻译或摘要
- 哪些内容必须保留原始语义或原始记录
- AI 改写的触发条件与审核流程
- 改写结果的可见性与溯源机制

### 3. Moderation 与审核机制
- 玩家写回内容的基础审核规则（敏感词、垃圾信息、恶意内容）
- 从 `private` 晋升到 `local_public` 的审核标准
- 从 `local_public` 晋升到 `global` 的精选机制
- 违规内容的处理流程与申诉机制

### 4. 写回生命周期管理
- 不同可见性层级的写回内容保留时长
- 过期内容的归档、压缩或删除策略
- 玩家删除自己写回内容的权限与限制
- 公共写回内容的版本管理与历史追溯

### 5. 与现有系统的衔接
- 与 [`P5`](docs/WORLD_WRITEBACK_PROTOCOL.md) 事件模型的对接方式
- 与 [`P4`](docs/AI_SHARED_TASKLIST.md:40) 历史深度协议的预留接口
- 与 [`E1-E4`](docs/AI_SHARED_TASKLIST.md:70-73) 社会化功能的治理边界

## 验证方式

- 协议文档能明确回答"什么内容只属于玩家自己、什么内容可以进入公共空间、什么内容可能进入全局神话层"
- 协议文档能明确定义 AI 改写的允许范围与禁止边界
- 协议文档能为后续实现 moderation 系统提供清晰的规则基础
- 协议文档与 [`docs/AI参与开发协议.md`](docs/AI参与开发协议.md) 的治理原则保持一致
- 协议文档不与 [`P5`](docs/WORLD_WRITEBACK_PROTOCOL.md) 的事件结构产生冲突

## 风险与备注

- 本任务为纯协议设计任务，不涉及代码实现，风险较低
- 治理边界的定义需要在"开放共创"与"内容质量控制"之间找到平衡
- 第一版协议应保持最小可行性，避免过度设计复杂的审核流程
- AI 改写边界的定义需要特别谨慎，避免破坏玩家原始表达的语义完整性
- 本协议完成后，应立即同步到 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 并更新 P3 任务状态为 `in_progress` 或 `done`
