# 变更说明：P3 玩家写回权限与语义治理边界

- 日期：2026-03-17
- 任务：P3 · 玩家写回权限与语义治理边界
- 类型：协议文档
- 状态：已完成

## 为什么改

在 P5 World Writeback Protocol v0.1 定义了统一事件模型后，需要立即补充完整的治理边界协议，明确：
- 什么内容只属于玩家自己
- 什么内容可以进入公共空间
- 什么内容可能进入全局神话层
- AI 改写的允许范围与禁止边界
- 如何审核、精选与晋升玩家写回内容

## 改了什么

### 新增文档

- **[docs/WORLD_WRITEBACK_GOVERNANCE.md](docs/WORLD_WRITEBACK_GOVERNANCE.md)**：世界写回治理协议 v0.1

### 核心内容

1. **三层可见性完整定义**
   - `private` 层：个人写回，永久保留，玩家可随时删除
   - `local_public` 层：区域共享，30-90天保留，需审核与熟悉度门槛��zone_familiarity >= 3）
   - `global` 层：全局神话，永久保留，需社区共识（10+点赞）与人工精选

2. **AI 改写边界**
   - 允许：翻译、压缩摘要、格式规范化（需玩家授权）
   - 禁止：私密表达、命名权内容、社区投票内容
   - 溯源机制：保留原文，标注"AI 改写"

3. **Moderation 与审核机制**
   - 自动审核：敏感词过滤、长度检查（3-200字符）、格式验证
   - 晋升流程：private → local_public（自动审核）→ global（社区共识+人工精选）
   - 违规处理：警告、降级、删除、封禁，支持7天申诉期

4. **写回生命周期管理**
   - private：永久保留
   - local_public：30天（高质量延长至90天）
   - global：永久保留
   - 过期内容归档到 archived_layers（为 P4 Time Folds 预留）

5. **与现有系统的衔接**
   - 复用 P5 的 event/target/effect/visibility 结构
   - 为 P4 预留 archived_layers、historical_echoes 接口
   - 为 E1-E4 社会化功能定义治理边界

### 更新文档

- **[docs/AI_SHARED_TASKLIST.md](docs/AI_SHARED_TASKLIST.md)**：P3 任务状态从 `planned` 更新为 `done`

### 新增认领说明

- **[docs/claims/2026-03-17-writeback-governance-p3.md](docs/claims/2026-03-17-writeback-governance-p3.md)**：P3 任务认领说明

## 影响了哪些文件或模块

- 新增：`docs/WORLD_WRITEBACK_GOVERNANCE.md`
- 新增：`docs/claims/2026-03-17-writeback-governance-p3.md`
- 新增：`docs/changes/2026-03-17-p3-writeback-governance.md`
- 修改：`docs/AI_SHARED_TASKLIST.md`（P3 任务状态）

## 没改什么

- 不改 P5 的事件模型、target schema、effect schema
- 不改 PLAYER_STATE.md 的玩家状态字段定义
- 不改 WORLD_SCHEMA.md 的世界数据结构
- 不进入 P4 的历史深度 / Time Folds 协议范围
- 不实现具体的后端代码、API 接口或前端交互（仅定义协议）

## 是否涉及协议 / Schema / 命名变更

- **协议变更**：是（新增治理协议）
- **Schema 变更**：否
- **命名变更**：否

## 做了哪些验证

- ✅ 协议文档能明确回答"什么内容只属于玩家自己、什么内容可以进入公共空间、什么内容可能进入全局神话层"
- ✅ 协议文档能明确定义 AI 改写的允许范围与禁止边界
- ✅ 协议文档能为后续实现 moderation 系统提供清晰的规则基础
- ✅ 协议文档与 AI参与开发协议.md 的治理原则保持一致
- ✅ 协议文档不与 P5 的事件结构产生冲突

## 风险点是什么

- 本任务为纯协议设计任务，不涉及代码实现，风险较低
- 治理边界的定义需要在"开放共创"与"内容质量控制"之间找到平衡
- 第一版协议保持最小可行性，避免过度设计复杂的审核流程
- AI 改写边界的定义需要特别谨慎，避免破坏玩家原始表达的语义完整性

## 后续工作

P3 协议完成后，建议按以下顺序推进：

1. **P5 最小写回闭环实现**：实现 observe/dwell/mark 三种行为的 API 与持久化
2. **实现 local_public 的完整审核流程**：人工复审队列、举报与申诉机制
3. **开放 global 层的晋升通道**：社区投票系统、精选与公示流程
4. **实现 AI 改写的完整功能**：翻译、压缩、摘要
5. **与 P4 Time Folds 对接**：archived_layers 的历史证据提取

## 依据的协议文档

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/AI_SHARED_TASKLIST.md](docs/AI_SHARED_TASKLIST.md)
- [docs/AI参与开发协议.md](docs/AI参与开发协议.md)
- [docs/WORLD_WRITEBACK_PROTOCOL.md](docs/WORLD_WRITEBACK_PROTOCOL.md)
- [docs/WORLD_WRITEBACK_PLAN.md](docs/WORLD_WRITEBACK_PLAN.md)
- [docs/PLAYER_STATE.md](docs/PLAYER_STATE.md)
