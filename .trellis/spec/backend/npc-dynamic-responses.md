# NPC Dynamic Responses Guidelines

> 规范 NPC 基于身份、性格、爱好（Hobbies）和状态卡（StateCards）的动态回复生成逻辑。

---

## 核心机制

FableMap 的 NPC 回复分为 **LLM 模式** 和 **规则模式** (Rules Backend)，两者均需感知角色的个性化背景。

### 1. 爱好字典 (Hobby Taxonomy)
为了确保 Prompt 的一致性和规则回复的可读性，系统维护了一套精选爱好字典：
- **文件路径**: `backend/src/fablemap_api/core/hobbies.py`
- **内容**: 包含爱好分类、显示名称 (Label) 和 Prompt 提示语 (Hint)。
- **规范**: 
  - 角色模型中的 `hobbies` 字段存储 Hobby ID 或自由文本。
  - 使用 `get_hobby_label(id)` 获取显示名。
  - 使用 `get_hobby_prompt_hint(id)` 获取用于 LLM 注入的性格描述。

### 2. LLM Prompt 注入
在构建系统 Prompt 时，身份、爱好和状态卡通过以下方式注入：
- **NPC identity / voice contract**: 每一次单聊、群聊 speaker 调用和 Prompt Blocks 预览都必须注入 `【NPC身份与口吻底线】`，来源只能是已有 `TavernCharacter` 字段，不能自动创作或覆盖店主内容。
- **Hobbies**: 注入到 `char_info` 层。除了爱好名称，还应包含对应的 `prompt_hint`，引导模型将爱好融入语气或比喻中。
- **StateCards**: 注入到 `result_messages` 层级（或专门的状态层）。PromptBuilder 渲染时只允许 `status == "confirmed"` 且 `fixed_canon == true` 的卡片进入 LLM Prompt；详见 `state-card-api-contract.md`。

### 3. 规则后端 (Rules Backend) Fallback
当没有特定规则匹配时，规则后端应使用动态模板生成带有上下文感的回复：
- **身份感知**: 使用 `description / personality / tags` 生成短身份短语，避免退化成完全通用模板。
- **Hobbies 感知**: 从角色爱好中随机选择一个，并使用其显示名称。
- **StateCards 感知**: 若存在确认的状态卡，回复中应包含对最新状态卡的提及（如：“并留意到了关于‘XX’的动态”）。
- **模板示例**: `{character_name}停下了手中关于{hobby_label}的动作，并留意到了关于“{card_title}”的动态，抬头看向你...`

---

## 开发约束

1. **禁止硬编码**: 不要在 `runtime.py` 中直接写死具体的爱好名称，优先引用 `hobbies.py` 中的字典。
2. **身份来源约束**: NPC 身份/口吻契约只能复用 `name / description / personality / scenario / system_prompt / first_mes / mes_example / gender / tags / hobbies / traits`；不得新增 Schema 字段，不得替店主自动生成角色内容。
3. **不可绕过契约**: 自定义 Prompt Blocks 可以调整 owner-authored 段落顺序，但不能移除最低 NPC 身份与口吻底线。
4. **状态卡过滤**: PromptBuilder 必须严格检查状态卡的 `status == "confirmed"` 且 `fixed_canon == true`；规则 fallback 如需提及动态，至少检查 `status == "confirmed"`。
5. **性能**: 对注入的状态卡进行数量限制（当前上限为 10），并按 `updated_at` 逆序排序，确保最新信息被优先处理。

---

## Scenario: NPC Voice Identity Contract

### 1. Scope / Trigger
- Trigger: 聊天回复需要保证“每个 NPC 都有独立身份和说话风格”，并覆盖单聊、群聊、Prompt Blocks、自定义 Blocks 和规则 fallback。

### 2. Signatures
- Helper: `build_npc_voice_contract(name, description, personality, scenario, system_prompt, first_mes, mes_example, gender, tags, hobbies, traits) -> str`
- Helper: `build_npc_identity_block(...) -> str`
- Rules helper: `build_rules_identity_phrase(description, personality, tags) -> str`
- Config fields: `PromptBuildConfig.char_description`, `char_mes_example`, `char_gender`, `char_tags`, `char_traits`

### 3. Contracts
- `PromptBuilder.build(...)` compatibility mode must append a system message containing `【NPC身份与口吻底线】`.
- `PromptBuilder._build_with_blocks(...)` must append the same contract after normalized custom blocks so owner-defined Blocks cannot remove the baseline.
- v1 runtime and core web service must pass the complete existing character fields into `PromptBuildConfig`.
- Group chat must build a separate prompt per selected speaker; the voice contract must use only that speaker's fields.
- Contract text must explicitly instruct: respond only as current NPC; do not self-identify as AI/assistant/system/model; in group chat only represent self.

### 4. Validation & Error Matrix

| Case | Expected behavior |
| --- | --- |
| Character has full fields | Prompt includes identity, personality, tags, hobbies, first message and example style anchors. |
| Character only has name | Prompt still includes a minimal role-view guard and must not fall back to generic assistant identity. |
| Custom Prompt Blocks omit character section | Builder still appends `【NPC身份与口吻底线】`. |
| Group chat has multiple NPCs | Each LLM call contains only the active speaker's identity contract. |
| Rules backend no explicit rule matches | Fallback response includes a short identity phrase when description/personality/tags exist. |

### 5. Good/Base/Bad Cases
- Good: `弥夏` prompt contains “夜班护士/照护/克制、耐心”，`Pi-Pi` prompt contains “外星便利店观察员/荒诞”，且两者不串场。
- Base: `鹿灯` custom block prompt still contains `你现在只能作为「鹿灯」回应`.
- Bad: A custom block list of one generic template produces only “你是一个有帮助的助手”.

### 6. Tests Required
- `backend/tests/test_v1_dynamic_npc_responses.py::test_runtime_prompt_injects_distinct_identity_and_voice_per_npc`
- `backend/tests/test_v1_dynamic_npc_responses.py::test_group_chat_prompt_uses_current_speaker_voice_contract`
- `backend/tests/test_v1_dynamic_npc_responses.py::test_rules_backend_fallback_keeps_character_identity_phrase`
- `tests/test_tavern_prompt_blocks.py::test_custom_prompt_blocks_cannot_remove_npc_voice_contract`
- `tests/test_tavern_llm_degradation.py::test_core_web_prompt_injects_npc_identity_and_voice_contract`

### 7. Wrong vs Correct

#### Wrong
```python
PromptBuildConfig(
    char_name=character.name,
    char_personality=character.system_prompt or character.personality or character.description,
)
```

This collapses several owner fields into one generic prompt slot and loses tags, scenario, example speech and traits.

#### Correct
```python
PromptBuildConfig(
    char_name=character.name,
    char_description=character.description,
    char_personality=character.personality,
    char_scenario=character.scenario,
    char_system_prompt=character.system_prompt,
    char_first_mes=character.first_mes,
    char_mes_example=character.mes_example,
    char_gender=character.gender,
    char_tags=character.tags,
    char_hobbies=character.hobbies,
    char_traits=character.traits,
)
```

---

## 验证要求

- **LLM 模式**: 通过 `test_character_hobbies_injection_in_runtime` 验证 Prompt 中是否包含爱好和提示语。
- **身份/口吻模式**: 通过 `test_runtime_prompt_injects_distinct_identity_and_voice_per_npc`、`test_custom_prompt_blocks_cannot_remove_npc_voice_contract` 验证不同 NPC 不串场且自定义 Blocks 不可绕过底线。
- **规则模式**: 通过 `test_rules_backend_hobby_injection` 和 `test_rules_backend_state_card_awareness` 验证回复中是否正确提到了爱好名和状态卡标题。
