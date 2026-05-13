# 05-12-npc-memory-enrichment-system: Brainstorm

**Date**: 2026-05-12
**Task**: `05-12-npc-memory-enrichment-system`
**Phase**: 1 — brainstorm

---

## 问题分析

### 现状

1. **记忆创建（Working）**: `auto_create_memories_from_chat()` 在每轮对话后提取记忆，存入 `MemoryAtom`
2. **记忆存储（Working）**: `MemoryStore.list_memory_atoms()` 可按 tavern/visitor/character 过滤
3. **记忆格式化（Working）**: `format_memory_atoms_for_prompt()` 有正确模板，但 `config.memory_atoms = []`
4. **记忆注入（Broken）**: `_chat_response_text()` 从未调用 `list_memory_atoms()`，所以没有数据注入

### 断环位置

```
runtime.py: _chat_response_text()
    ↓
    PromptBuildConfig(memory_atoms=[])  ← 始终为空
    ↓
    PromptBuilder.build()
    ↓
    format_memory_atoms_for_prompt([]) → ""
```

---

## Phase 1 实现方案

### 方案 A: 最小修复（推荐）

在 `_chat_response_text()` 中，`PromptBuildConfig()` 之前插入记忆加载逻辑：

```python
# 加载记忆 atoms（去重后的 visitor + character 记忆）
memory_atoms = []
try:
    raw_atoms = self.store.list_memory_atoms(
        tavern_id,
        visitor_id=visitor_id,
        character_id=character_id,
        limit=24,
    )
    # 转换格式
    memory_atoms = [
        atom.to_dict() if hasattr(atom, 'to_dict') else atom
        for atom in raw_atoms
    ]
except Exception as e:
    logger.warning(f"Failed to load memory atoms: {e}")

config = PromptBuildConfig(
    # ... existing fields ...
    memory_atoms=memory_atoms,
    memory_budget_tokens=1200,
)
```

**Pros**: 最小改动，3-5 行代码，零风险
**Cons**: 缺少话题相关性排序，所有记忆平等对待

---

### 方案 B: 增强检索

在方案 A 基础上，增加 `select_memory_atoms_for_prompt()` 调用：

```python
# 先加载全部候选记忆
all_atoms = self.store.list_memory_atoms(
    tavern_id,
    visitor_id=visitor_id,
    character_id=character_id,
)

# 用增强算法选择
selected = select_memory_atoms_for_prompt(
    all_atoms,
    visitor_id=visitor_id,
    character_id=character_id,
    current_message=message,
    budget_tokens=1200,
    limit=24,
)

memory_atoms = [
    atom.to_dict() if hasattr(atom, 'to_dict') else atom
    for atom in selected
]
```

**Pros**: 话题相关性强者优先，pinned 强制注入
**Cons**: 需要增强 `select_memory_atoms_for_prompt()` 逻辑

---

### 方案 C: 完整重构

将记忆系统重构为独立 Service：

```python
class MemoryService:
    def __init__(self, store):
        self.store = store

    def load_memories_for_prompt(self, tavern_id, visitor_id, character_id, message):
        """加载并排序记忆 atoms"""
        atoms = self.store.list_memory_atoms(tavern_id, ...)
        return select_memory_atoms_for_prompt(atoms, ...)

    def extract_memories_from_turn(self, ...):
        """从对话轮次提取新记忆"""
        return auto_create_memories_from_chat(...)

    def reinforce_memory(self, memory_id, referenced: bool):
        """强化被引用的记忆"""
        atom = self.store.get_atom(tavern_id, memory_id)
        atom.reinforcement_count += 1
        atom.importance = min(1.0, atom.importance + 0.05)
        self.store.save_atom(tavern_id, atom)
```

**Pros**: 解耦，易测试，易扩展
**Cons**: 需要更多时间和测试覆盖

---

## 推荐路径

**Phase 1 选方案 B**（最小修复 + 基础检索）：
1. 修复 memory atoms 注入（方案 A）
2. 确保 `select_memory_atoms_for_prompt()` 正常工作（方案 B）
3. 验证 NPC 能记住访客名字

**Phase 2+** 按需扩展到方案 C

---

## 实现检查清单

- [ ] `runtime.py` 导入 `select_memory_atoms_for_prompt`
- [ ] `_chat_response_text()` 调用 `store.list_memory_atoms()`
- [ ] 调用 `select_memory_atoms_for_prompt()` 排序
- [ ] `PromptBuildConfig(memory_atoms=[...])` 注入
- [ ] 添加单元测试：验证记忆注入逻辑
- [ ] 手动测试：访客说"我叫张三" → NPC 回复 → 访客问"我的名字？" → NPC 引用"张三"

---

## 相关代码位置

| 文件 | 函数 | 状态 |
|------|------|------|
| `runtime.py` | `_chat_response_text()` | 需修改 |
| `runtime.py` | `send_chat()` | 已有 `auto_create_memories_from_chat` |
| `memory/core.py` | `select_memory_atoms_for_prompt()` | 已有，需增强 |
| `memory/core.py` | `format_memory_atoms_for_prompt()` | 已有，正常 |
| `prompt_builder.py` | `build()` | 已有，正常 |

---

## 下一步

1. 确认 store 是否有 `list_memory_atoms()` 方法
2. 确认 `select_memory_atoms_for_prompt()` 签名
3. 编写 Phase 1 实现代码