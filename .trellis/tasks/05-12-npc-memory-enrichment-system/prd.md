# NPC 记忆增强训练系统

## Context

FableMap 的 NPC 当前已经具备基础记忆提取能力（`auto_create_memories_from_chat`），但存在以下问题：

1. **记忆注入断裂**：`PromptBuildConfig` 有 `memory_atoms` 字段，但 `_chat_response_text()` 从未填充它，导致 LLM 从不接收记忆上下文
2. **记忆质量粗糙**：目前只用重要性阈值 0.5 筛选，没有对话题、角色一致性、关系深度的精细控制
3. **记忆检索简单**：仅用关键词匹配 + importance 排序，没有考虑时间衰减、话题相关性、记忆新鲜度
4. **缺少训练循环**：没有让 NPC 通过多轮对话学习访客偏好、积累长期关系记忆的机制

本任务旨在构建完整的"记忆训练"闭环：访客聊天 → 结构化记忆提取 → 记忆注入 LLM → NPC 回复体现记忆 → 访客反馈 → 记忆强化/修正。

## Goals

### 核心目标
- NPC 能记住访客的名字、偏好、重要事件，并在后续对话中自然引用
- 记忆系统能区分"短期 / 中期 / 长期"记忆，自动管理记忆生命周期
- 店主可配置 NPC 记忆风格（话痨型 / 沉默型 / 只记重要事）

### 子目标
1. 修复 memory atoms 注入断环（PRD: `05-12-memory-atoms-prompt-injection-fix`）
2. 增强记忆提取质量：多维度重要性评分 + 去重 + 合并
3. 实现记忆检索优先级：话题相关性 > 时间新鲜度 > importance 排序
4. 增加访客反馈闭环：访客可纠正 NPC 记忆，NPC 自动强化
5. 长期记忆积累：多会话跨天记忆融合，产生"老朋友"效果

## Architecture

```
访客消息 → chat_response_text()
           ├── 1. 加载记忆 atoms（visitor + character + 话题）
           │      ├── 关键词检索
           │      ├── 时间衰减打分
           │      └── 按 budget 选择 top-N
           │
           ├── 2. 注入 PromptBuildConfig.memory_atoms
           │
           ├── 3. PromptBuilder.build() → format_memory_atoms_for_prompt()
           │      输出格式: "- [短期/事实] 访客名叫张三"
           │
           ├── 4. LLM 回复 → 体现记忆上下文
           │
           ├── 5. auto_create_memories_from_chat() 提取新记忆
           │      ├── 重要性评分（多维度）
           │      ├── 去重（fingerprint）
           │      └── 合并/更新已有 atom
           │
           └── 6. 访客可选：纠正记忆 / 强化重要记忆
                  └── 触发记忆更新/置顶
```

## Key Data Models

### MemoryAtom (已有)
```python
@dataclass
class MemoryAtom:
    id: str
    tavern_id: str
    scope: str  # "visitor_character" | "visitor_tavern" | "tavern_public"
    dimension: str  # "fact" | "emotion" | "event" | "preference" | "promise"
    horizon: str  # "short" | "mid" | "long"
    subject: str  # NPC name or visitor_id
    content: str  # 记忆内容
    importance: float  # 0.0-1.0
    confidence: float  # 0.0-1.0
    pinned: bool  # 置顶记忆（强制注入）
    visibility: str  # "private" | "owner" | "public"
    visitor_id: str
    character_id: str
    metadata: dict  # hit_count, source_roles, memory_fingerprint, ...
```

### 扩展字段（新增）

```python
@dataclass
class MemoryAtom:
    # ... existing fields ...
    last_reinforced_at: str = ""  # 上次被强化时间
    reinforcement_count: int = 0  # 被引用/强化次数
    topic_tags: list[str] = field(default_factory=list)  # 话题标签
    related_atom_ids: list[str] = field(default_factory=list)  # 关联记忆
    decay_score: float = 1.0  # 衰减分数（用于淘汰）
```

### NPCMemoryConfig (店主配置)
```python
@dataclass
class NPCMemoryConfig:
    memory_enabled: bool = True
    memory_style: str = "balanced"  # "talkative" | "reserved" | "essential_only"
    memory_budget_tokens: int = 1200
    max_memory_atoms_per_turn: int = 24
    short_term_ttl_days: int = 3
    mid_term_ttl_days: int = 14
    long_term_ttl_days: int = 90
    auto_promote_threshold: float = 0.8  # 重要性超过此值自动晋升为长期
    reinforcement_boost: float = 0.15  # 每次被 NPC 引用时 importance + boost
    decay_rate_per_day: float = 0.02  # 每日衰减
```

## Implementation Phases

### Phase 1: Fix Memory Injection (Critical)

**File**: `runtime.py` → `_chat_response_text()`

```python
# 在 PromptBuildConfig 之前加载记忆
memory_atoms = self.store.list_memory_atoms(
    tavern_id,
    visitor_id=visitor_id,
    character_id=character_id,
    limit=24,
)

config = PromptBuildConfig(
    # ... existing fields ...
    memory_atoms=[atom.to_dict() if hasattr(atom, 'to_dict') else atom
                  for atom in memory_atoms],
    memory_budget_tokens=1200,
)
```

**验收**:
- [ ] NPC 能记住访客刚说的名字
- [ ] `/api/taverns/{id}/chat` 响应中 `created_memories` 非空

### Phase 2: Memory Retrieval Enhancement

**File**: `memory/core.py` → `select_memory_atoms_for_prompt()`

增强打分算法：
- 话题相关性（TF-IDF 风格）
- 时间新鲜度（时间衰减函数）
- NPC 引用次数（reinforcement_count）
- pinned 强制优先级

```python
def _compute_relevance_score(atom, current_message, query_tokens):
    # 话题重叠度
    topic_overlap = len(query_tokens & set(atom.topic_tags or []))
    # 内容匹配度
    content_tokens = _keyword_tokens(atom.content)
    content_overlap = len(query_tokens & content_tokens)
    # 时间衰减
    days_since_update = (datetime.now() - atom.updated_at).days
    recency = math.exp(-decay_rate * days_since_update)
    # 强化加成
    reinforcement = atom.reinforcement_count * reinforcement_boost
    return (topic_overlap * 0.3 + content_overlap * 0.2 + recency * 0.3 + reinforcement * 0.2)
```

### Phase 3: Memory Extraction Quality

**File**: `memory/core.py` → `_score_memory_candidate()`

多维度重要性评分：
- 角色名提及 → +0.15
- 情感标记 → +0.1
- 第一人称陈述 → +0.08
- 承诺/约定 → +0.2
- 偏好表达 → +0.15
- 重要事件 → +0.12

### Phase 4: Memory Reinforcement Loop

**File**: `runtime.py` → `_chat_response_text()` + memory service

访客反馈纠正：
```python
POST /api/taverns/{id}/memories/{memory_id}/feedback
{
  "correct": true,  # NPC 记对了
  "content": "访客修正内容（可选）"
}
```

NPC 引用检测：
- 在 LLM 回复后检查是否引用了 memory atom 内容
- 如果引用了，reinforcement_count++，importance += 0.05

### Phase 5: Long-term Memory Evolution

跨会话记忆融合：
```python
# 当访客第 N 次来访时（N >= 5）
def merge_long_term_memories(atoms: list[MemoryAtom]) -> list[MemoryAtom]:
    """将多个短中期记忆合并为一个长期记忆"""
    # 按 visitor + character + dimension 分组
    # 合并 content（保留关键事实）
    # 提升 horizon 为 long
    # 设置 decay_score = 0.5
```

## Out of Scope

- 不改 frontend — 这是 backend 记忆系统增强
- 不改现有 API 契约（向后兼容）
- 不引入向量数据库（先用关键词 + 简单打分）
- 不做 NPC 间共享记忆（每个 NPC 独立记忆）

## Acceptance Criteria

### Phase 1
- [x] `_chat_response_text()` 加载并注入 memory atoms
- [x] 相同访客第二次说名字，NPC 能引用

### Phase 2
- [x] 记忆检索有话题相关性权重
- [x] pinned 记忆始终被注入
- [x] 衰减记忆自动降权

### Phase 3
- [x] 承诺类记忆 importance >= 0.75
- [x] 偏好类记忆 importance >= 0.68
- [x] 去重逻辑正确（fingerprint dedup）

### Phase 4
- [x] 访客可纠正记忆（correct=true/false）
- [x] NPC 引用记忆后 reinforcement_count 增加

### Phase 5
- [x] 多次来访后 NPC 展现"老朋友"感
- [x] 长期记忆 horizon = "long"

## Related Tasks

- `05-12-memory-atoms-prompt-injection-fix` — Phase 1 依赖
- `05-11-social-memory-debug-panel` — 记忆调试面板（frontend）
- `05-07-conversation-intent-chips-ui` — 记忆纠正 UI（frontend）

## Implementation Record

### 2026-05-12 — Phase 1/2 backend slice

- Phase 1 memory prompt injection has been completed by `05-12-memory-atoms-prompt-injection-fix` and is treated as done for this parent task.
- Phase 2 retrieval ranking has been implemented in `backend/src/fablemap_api/core/memory/core.py` without adding new `MemoryAtom` top-level schema fields.
- `select_memory_atoms_for_prompt()` now ranks pinned memories first, then topic relevance, recency, reinforcement metadata, character/scope fit, and deterministic fallback fields.
- Chinese memory matching now uses overlapping CJK n-grams so short phrases such as `茉莉茶` and `焦糖布丁` can match inside longer Chinese sentences.
- Optional ranking hints remain in `MemoryAtom.metadata` (`topic_tags`, `topics`, `tags`, `keywords`, `entities`, `reinforcement_count`, `referenced_count`, `hit_count`).
- Added focused tests in `tests/test_tavern_memory_atoms.py` for pinned priority, topic relevance over importance/recency, recency tie-break, and reinforcement tie-break.
- Updated `.trellis/spec/backend/directory-structure.md` with the executable MemoryAtom prompt retrieval ranking contract.

### Verification

- `py -3 -m pytest -q tests/test_tavern_memory_atoms.py::test_select_memory_atoms_for_prompt_prioritizes_pin_relevance_horizon_and_flags tests/test_tavern_memory_atoms.py::test_select_memory_atoms_for_prompt_ranks_topic_relevance_before_importance_and_recency tests/test_tavern_memory_atoms.py::test_select_memory_atoms_for_prompt_uses_recency_then_reinforcement_as_tiebreakers --tb=short` → passed (`3 passed`).
- `py -3 -m pytest -q tests/test_tavern_memory_atoms.py tests/test_memory_store_adapters.py backend/tests/test_v1_dynamic_npc_responses.py::test_runtime_prompt_loads_visible_memory_atoms_for_current_visitor --tb=short` → passed (`11 passed`).

### 2026-05-12 — Phase 3 extraction acceptance verified

- Existing auto extraction already scores promise memories at `>= 0.75`, preference memories at `>= 0.68`, and merges duplicate fingerprints by increasing `metadata.hit_count` while preserving source message ids.
- Added explicit assertions to `tests/test_tavern_memory_atoms.py::test_auto_memory_pipeline_extracts_scores_and_merges` so these thresholds cannot silently regress.

### 2026-05-12 — Phase 4 feedback loop

- Added native v1 feedback endpoint: `POST /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback`.
- `correct=true` reinforces the memory via `metadata.reinforcement_count`, `feedback_correct_count`, `last_reinforced_at`, and small importance/confidence boosts.
- `correct=false` with `content` corrects the same atom content and keeps it prompt-eligible; `correct=false` without content flags the atom wrong and excludes it from prompt selection.
- Runtime now reinforces visible, prompt-selected memory atoms when the NPC reply substantially references their content.
- Added backend tests for feedback permissions/correction/flagging and runtime reinforcement after an NPC reply references a memory.

### 2026-05-12 — Phase 5 long-term promotion

- `_merge_memory_atom()` now promotes repeated memories to `horizon="long"` once `metadata.hit_count >= 5` or at least five source messages are merged.
- Promotion keeps the single deduped atom, ensures `importance >= 0.75`, and records `metadata.long_term_promoted=true`.
- Added `tests/test_tavern_memory_atoms.py::test_auto_memory_pipeline_promotes_repeated_memory_to_long_term` for repeated-visit long-term accumulation.

### Final Verification

- `py -3 -m compileall -q backend/src` → passed.
- `py -3 -m pytest -q tests/test_tavern_memory_atoms.py tests/test_memory_store_adapters.py backend/tests/test_v1_memory_atoms.py backend/tests/test_v1_dynamic_npc_responses.py::test_runtime_prompt_loads_visible_memory_atoms_for_current_visitor --tb=short` → passed (`15 passed`, warnings only for existing FastAPI/deprecated datetime usage).