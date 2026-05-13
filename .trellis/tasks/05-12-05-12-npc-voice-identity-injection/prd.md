# NPC Voice Identity Injection

## 背景

真人反馈指出 NPC 回话“人机感太重”。本任务聚焦一条可执行修复：每个 NPC 的身份、性格、语气、标签、爱好、开场白和示例话术必须进入聊天上下文，不能只让模型看到一个泛泛的角色名或通用系统提示。

## 目标

在不新增 Schema、不自动生成/覆盖店主内容、不改 API payload 的前提下，强化单聊与群聊的 Prompt 构建：

- 每个 NPC 都以自己的 `name / description / personality / scenario / system_prompt / first_mes / mes_example / tags / hobbies / traits / gender` 形成独立口吻契约。
- 聊天 Prompt 必须明确注入“只能作为该 NPC 回应，不得自称 AI/助手/系统，不得替其它 NPC 发言”。
- 自定义 Prompt Blocks 也不能绕过最低限度的 NPC 身份与口吻底线。
- 规则后端 fallback 也要尽量沿用角色身份线索，不能退回完全通用模板。

## 非目标

- 不新增 `TavernCharacter` 字段，不修改 `docs/WORLD_SCHEMA.md`。
- 不替店主自动创作/发布新 NPC 内容；只使用已有字段和通用口吻护栏。
- 不改变 LLM 配置、Token 计费、地图、访客社交、玩法系统。
- 不重写默认公益 NPC 文案/资产。

## 技术方案

1. 新增或扩展后端 Prompt helper，统一生成 NPC voice contract。
2. 扩展 `PromptBuildConfig`，把 description、gender、tags、mes_example、traits 等已有字段纳入 prompt 构建。
3. 在兼容 PromptBuilder 和 Prompt Blocks 模式中都追加不可绕过的 `【NPC身份与口吻底线】` 系统消息。
4. 更新 enterprise runtime 与 core web service 的单聊/群聊 prompt 构建调用，传入完整角色字段。
5. 补充回归测试：
   - 不同 NPC 的 Prompt 中包含各自身份/性格/语气线索，并相互区分。
   - 自定义 Prompt Blocks 仍保留 NPC 身份与口吻底线。
   - 规则后端 fallback 能体现角色身份线索。

## 验收标准

- [x] 单聊 LLM prompt 包含当前 NPC 的身份描述、性格、标签、爱好、开场白/示例话术线索。
- [x] 群聊每个 speaker 的 prompt 只注入该 speaker 的 voice contract，不混入其它 NPC 的身份。
- [x] 自定义 Prompt Blocks 不能移除最低 NPC 身份与口吻底线。
- [x] 无 Schema/API 字段变更。
- [x] 通过 Python compileall 与相关 pytest。

## 验证记录

- `py -3 -m compileall -q backend/src`：通过。
- `py -3 -m pytest -q tests/test_tavern_prompt_blocks.py tests/test_tavern_llm_degradation.py backend/tests/test_v1_dynamic_npc_responses.py --tb=short`：25 passed，31 warnings。
- `py -3 .trellis/scripts/task.py validate .trellis/tasks/05-12-05-12-npc-voice-identity-injection`：通过。
- 额外尝试 `py -3 -m pytest -q --tb=short`：失败，主要为既有全量套件环境/历史问题（Windows 临时 SQLite 文件锁、默认公益酒馆夹具/旧 API 断言等），本任务相关聚焦测试已通过。

## 实现摘要

- 新增 `npc_voice` helper，将既有 TavernCharacter 字段统一渲染成不可绕过的 `【NPC身份与口吻底线】`。
- `PromptBuilder` 兼容模式与 Prompt Blocks 模式都会追加该 voice contract；自定义 Blocks 不能删掉最低身份/口吻注入。
- v1 runtime 单聊/群聊与 core web service 都传入完整角色字段：description/personality/scenario/system_prompt/first_mes/mes_example/gender/tags/hobbies/traits。
- rules backend fallback 增加短身份短语，避免无模型时完全退化成通用模板。
- 同步修正 PromptBuilder 状态卡渲染只展示 `confirmed + fixed_canon`，符合 `.trellis/spec/backend/state-card-api-contract.md`。

