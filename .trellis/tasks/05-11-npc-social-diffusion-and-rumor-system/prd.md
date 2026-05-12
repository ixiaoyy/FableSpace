# NPC 社交扩散与八卦系统 (Social Diffusion) PRD

## 1. 目标 (Objectives)
让 NPC 具备相互交流的能力，打破单一空间的信息孤岛，形成具备流动性的“镜像世界”舆论场。

## 2. 核心功能 (Core Features)
- **社交触发器 (Social Trigger)**: [已实现] 当两个或多个 NPC 处于同一个 `current_tavern_id` 超过 1 个 Tick 时，触发社交事件。
- **信息交换协议 (Rumor Protocol)**: [v0.1 已实现]
  - **身份自白**: 交换性格特质信息。
  - **籍贯信息**: 交换 Home Tavern 信息。
  - **场所推荐**: 交换对当前空间的评价。
- **社交知识库检索 (KB Retrieval)**: [新增规划] 为了防止 Prompt 过大，不再全量注入。
  - **关联检索**: 根据用户输入的关键词（如人名、地名）动态筛选相关的社交记忆。
  - **Top-K 限制**: 每次对话最多注入 3 条最相关的社交记忆。
  - **时效性权重**: 优先展示新鲜的传闻。
- **记忆改写 (Memory Writeback)**: [已实现] 交换后的信息写入 NPC 的 `social_memories` 列表。

## 3. 验收标准 (Success Criteria)
- NPC 能够在对话中提到非当前空间的、由其它 NPC 传递给它的信息。
- 在后台日志中能观察到 NPC 间的“握手”与“信息包”传递。

## 4. 后续规划
- **情感影响**: 社交互动可以回升 `social` 需求，并根据谈话内容的积极/消极程度修正心情。

## 2026-05-12 Completion Update

### Implemented evidence
- `backend/src/fablemap_api/application/simulation_worker.py` contains NPC social handshake / information exchange through `_exchange_info`, duplicate prevention, social memory cap, sentiment classification, and social/mood impact.
- `backend/src/fablemap_api/application/services/runtime.py` filters NPC `social_memories` with source-name match, n-gram overlap, recency bonus, and top-k prompt injection.
- `backend/src/fablemap_api/core/prompt_builder.py` includes the selected social memories in the prompt context.
- Owner-facing frontend debug support was added in `D:\work\ai-\.trellis\tasks\05-11-05-11-social-memory-debug-panel` to inspect estimated retrieval.

### Validation
- `py -3 -m pytest -q --tb=short backend/tests/test_emotional_impact.py backend/tests/test_social_memory_retrieval.py` — PASS (49 passed)
- `npm --prefix .\frontend test` — PASS (from social-memory-debug-panel task validation)
- `npm --prefix .\frontend run build` — PASS (from social-memory-debug-panel task validation)

### Residual risk
- This is an NPC/tavern scoped memory diffusion system, not a visitor-to-visitor social network. No public social feed or private messaging was added.
