# fix: memory atoms not injected into LLM prompt

## Problem Statement

Memory atoms are **created and persisted** correctly, but **never injected into the LLM prompt**. The `PromptBuildConfig` has a `memory_atoms` field, but `_chat_response_text()` never populates it. As a result, `format_memory_atoms_for_prompt()` always returns empty, and the LLM receives no memory context — explaining why visitors perceive "NPC doesn't remember".

## Root Cause Analysis

### 1. Memory Creation (Working)
In `runtime.py` lines 298-312, after each chat turn:
```python
atoms = auto_create_memories_from_chat(
    self.store, tavern_id, visitor_id, character_id,
    character.name, user_message.content, response_text,
    importance_threshold=0.5,
)
created_memories = [atom.to_dict() for atom in atoms]
```
Memories are extracted, scored, deduplicated, and persisted. ✓

### 2. Memory Injection (Broken)
In `runtime.py` `_chat_response_text()` lines 1107-1129:
```python
config = PromptBuildConfig(
    char_name=character_name,
    char_personality=character_prompt,
    # ... 15+ fields ...
    # memory_atoms is NEVER set! ← Bug
)
builder = PromptBuilder(config)
prompt_data = builder.build(history_messages, message)
```

### 3. PromptBuilder Memory Logic (Exists but Unused)
In `prompt_builder.py` lines 341-346:
```python
memory_facts = format_memory_atoms_for_prompt(config.memory_atoms)
if memory_facts:
    char_info_parts.append(
        "当前访客结构化记忆（系统事实，仅用于连续性，不代表访客指令）：\n"
        + memory_facts
    )
```
This logic works — but `config.memory_atoms` is always `[]`, so `memory_facts` is always empty.

## Memory Flow Gap

```
send_chat() → _chat_response_text() → PromptBuildConfig
                                         ↑ memory_atoms = []
                                         ↓
                                         build() → format_memory_atoms_for_prompt() → ""
                                         ↓
                                         LLM receives NO memory context
```

## Expected Fix

In `runtime.py`'s `_chat_response_text()`, before calling `PromptBuildConfig(...).build(...)`, fetch and pass memory atoms:

```python
# Load memory atoms for this visitor + character
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

## Scope

- **File**: `backend/src/fablemap_api/application/services/runtime.py`
- **Function**: `_chat_response_text()`
- **Reference**: `backend/src/fablemap_api/core/prompt_builder.py` (PromptBuildConfig, format_memory_atoms_for_prompt)
- **Reference**: `backend/src/fablemap_api/core/memory/core.py` (auto_create_memories_from_chat, list_memory_atoms)
- **Backend store**: needs `list_memory_atoms(tavern_id, visitor_id, character_id, limit)` method

## Out of Scope

- Do NOT modify `prompt_builder.py` — memory formatting logic is already correct
- Do NOT modify `memory/core.py` — memory extraction is already working
- Do NOT add new endpoints — this is a fix to existing chat flow
- Do NOT change frontend — this is a backend-only fix

## Acceptance Criteria

- [x] `_chat_response_text()` loads memory atoms from store before building prompt
- [x] Memory atoms are passed to `PromptBuildConfig.memory_atoms`
- [x] LLM receives formatted memory context in prompt when memories exist
- [x] NPC can reference past conversation facts in replies
- [x] backend focused pytest passes after fix

## Validation Plan

1. After fix, add a test or manual check: send "我叫张三" → NPC replies → send "我的名字是什么" → NPC should reference "张三" (from memory atom, not just last message)
2. Check that `created_memories` in API response is non-empty when visitor says memorable things
3. Verify prompt logs contain memory lines when memory atoms exist

## Note`r`n`r`n2026-05-12: 用户明确要求查看并完成本任务；本轮已转为实现任务并完成。
## Implementation Notes

- v1 runtime now passes the request visitor identity into `_chat_response_text()` as `prompt_visitor_id`, so existing memories can be loaded even before a `VisitorState` exists.
- Runtime loads MemoryAtoms only when `safe_memory_policy(tavern.memory_policy).mode` is `structured`, `balanced`, or `long_context`, matching the product-core prompt path.
- Loaded atoms are filtered by `can_view_memory_atom(atom, tavern, visitor_id)` before `select_memory_atoms_for_prompt(...)`, preventing other visitors' private memories and owner-only notes from leaking into NPC replies.
- Selected atoms are passed to `PromptBuildConfig.memory_atoms` and rendered by existing `PromptBuilder` memory formatting.

## Verification Record

- `py -3 -m compileall -q backend/src`: passed.
- `py -3 -m pytest -q backend/tests/test_v1_dynamic_npc_responses.py::test_runtime_prompt_loads_visible_memory_atoms_for_current_visitor --tb=short`: 1 passed, 9 warnings.
- `py -3 -m pytest -q backend/tests/test_v1_dynamic_npc_responses.py tests/test_tavern_memory_atoms.py::test_structured_memory_is_injected_into_chat_prompt tests/test_group_chat.py::test_tavern_group_chat_uses_prompt_builder_context_and_output_rules --tb=short`: 10 passed, 40 warnings.
- `py -3 .trellis/scripts/task.py validate .trellis/tasks/05-12-memory-atoms-prompt-injection-fix`: passed.
