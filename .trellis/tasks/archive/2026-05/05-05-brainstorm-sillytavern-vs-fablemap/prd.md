# PRD: FableMap Continuity 2.0 (StateCard Maturity)

**Status**: Implemented
**Version**: 1.0.0

## Goal

在 FableMap 已实现的 SillyTavern 兼容层基础上，深化独有的 `StateCard`（状态台账）连续性机制。目标是实现从“静态注入”到“动态维护与矛盾检测”的跨越，解决长线叙事中 AI 容易遗忘或违反已确认事实（正史）的痛点。

## What I already know

* **现有能力**：
    * `PromptBuilder` 已支持注入 `confirmed` 且 `fixed_canon` 的 `StateCard`。
    * `StateCard` 包含 `category` (character/task/resource/conflict/event_log)、`title`、`summary` 等字段。
    * 访客可确认自己的 `visitor` scope 卡，店主维护 `tavern` scope 卡。
* **技术现状**：注入方式是简单的文本拼接（见 `prompt_builder.py:318-329`），缺乏与当前对话内容的实时校验。

## Requirements (evolving)

### 1. 矛盾检测 (Contradiction Detection)
* **场景**：如果 AI 在回复中说“张三已经离开了”，但 `StateCard` 中有一张 `confirmed` 的卡显示“张三正在禁闭室”，系统应能识别。
* **机制**：在 `writeback` 流程中，除了生成 `pending` 状态卡，还需要对比已有的 `confirmed` 状态卡。
* **UI/UX**：在访客/店主看到 AI 回复的同时，如果检测到矛盾，前端应给予“逻辑冲突”提示。

### 2. 状态卡演进 (Card Evolution)
* **场景**：一个任务状态从“进行中”变为“已完成”。
* **机制**：新生成的 `pending` 卡如果指向同一个实体（如同一个任务 ID），应标记为 `supersedes` 旧卡。
* **自动化**：利用 AI 提取 content 中的“实体 ID”或“标签”，自动关联相关卡片。

### 3. 分层权重 (Layered Weighting)
* **场景**：随着卡片增多，Prompt 长度会爆炸。
* **机制**：根据当前对话的关键词触发相关的 `StateCard` 注入（类似 WorldInfo 的 Keyword 触发，但对象是 StateCard）。

## Acceptance Criteria (evolving)

* [ ] **设计方案**：完成一套基于 LLM 提取实体的“状态卡关联与矛盾检测”协议方案。
* [ ] **Prototype**：在 `backend` 中实现一个实验性的 `validate_consistency(response, confirmed_cards)` 端点。
* [ ] **UI 适配**：在 `ChatPanel` 中预留矛盾提示的视觉锚点。

## Technical Approach

### 矛盾检测逻辑
1.  **Extract**: 在 AI 发言后，异步调用一个小模型（或在 writeback 流程中）提取当前回合涉及的关键状态（人物位置、物品归属、任务进度）。
2.  **Compare**: 将提取出的状态与 `db.state_cards` 中 `confirmed` 的卡片进行语义匹配。
3.  **Signal**: 如果匹配度高但内容冲突，生成一个 `system_notice` 或标记当前 `StateCard` 候选为 `contradictory`。

## Decision (ADR-lite)

* **Context**: 为什么不做类似 ST 的“Long-term memory”向量检索？
* **Decision**: FableMap 选择“结构化台账（StateCard）”是因为它具有“主人主权”和“确定性”。向量检索不可控，而经过确认的状态卡是“正史”。
* **Consequences**: 需要更多的 LLM 调用来维护一致性，但能极大地提升长线互动的逻辑严密性。

## Out of Scope

* 全自动的正史改写（必须保留确认流程）。
* 复杂的逻辑推理机（如 Prolog 等硬逻辑规则）。

## Technical Notes

* 涉及文件：
    * `backend/src/fablemap_api/core/state_cards.py`
    * `backend/src/fablemap_api/core/writeback.py`
    * `backend/src/fablemap_api/core/prompt_builder.py`
* 参考：
    * SillyTavern 的 WorldInfo 注入逻辑（用于借鉴 Keyword 触发状态卡）。
