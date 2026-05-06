# PRD: Productize owner AI draft generation

## Problem
店主创建 NPC 时的“AI 草稿”当前更像确定性模板，而不是实际由店主配置的 AI 生成。用户会误以为平台在生成角色，但代码默认会返回固定角色名和模板文案，体验容易显得假、系统化。

## Evidence
- `backend/src/fablemap_api/application/services/characters.py:41` 标记 `AI 草稿`。
- `backend/src/fablemap_api/application/services/characters.py:69` 固定在 `猫铃看板娘` / `夜航招待员` 两个名称之间选择。
- `backend/src/fablemap_api/application/services/characters.py:71-73` 固定输出“这只是 AI 草稿 / 临时招待员”等模板化问候。
- `backend/src/fablemap_api/application/services/characters.py:108` 说明必须店主确认保存，符合主权原则，但生成来源需要透明。

## Goal
把店主 NPC 草稿生成从“写死模板伪装 AI”升级为：
1. 有店主有效 LLM 配置时，调用 owner LLM 生成 NPC 草稿；
2. 无有效配置时，只提供明确标注的“本地模板草稿 / fallback”，且 UI 不把它包装成真实 AI 生成。

## Non-goals
- 不自动发布 NPC；仍必须店主确认保存。
- 不让平台替店主生成最终酒馆内容；AI 只作为店主工具。
- 不引入平台级 Token 计费。

## Acceptance Criteria
- [x] 后端生成路径在 owner LLM 配置有效时会进入真实 LLM 调用，并有测试覆盖。
- [x] 响应包含来源元数据，例如 `source=owner_llm | local_template_fallback`，前端据此展示不同文案。
- [x] 本地 fallback 不再固定两个默认角色名作为“AI 结果”；至少从店主输入派生，或明确显示为模板占位。
- [x] 店主未确认保存前，访客不可见草稿。
- [x] LLM 失败时降级文案克制、透明，不出现“系统回复式”的假角色聊天。
- [x] 不泄漏 owner API key / LLM 配置到访客响应或日志。
- [x] 更新/补充对应测试：后端服务测试 + 前端生成按钮/状态测试。

## Suggested files
- `backend/src/fablemap_api/application/services/characters.py`
- `frontend/app/product/aiCharacterDrafts.js`
- `frontend/app/routes/create.tsx`
- `frontend/scripts/ai-character-drafts-test.mjs`
- `docs/WHAT_NOT_TO_BUILD.md`

## Implementation note — 2026-05-06

- 后端 `generate_character_draft` 现在优先读取店主默认 LLM 配置；配置有效时通过 owner LLM 生成未发布 NPC 草稿，并返回 `source=owner_llm` / `source_label=店主默认 LLM 草稿`。
- 无默认 LLM 或 LLM 调用失败时返回 `source=local_template_fallback`，`source_reason` 区分 `missing_owner_llm` / `owner_llm_failed`，并用本地模板占位文案明确说明“不是真实 AI 生成”。
- 本地 fallback 角色名从店主输入风格标签或酒馆名派生，不再固定 `猫铃看板娘` / `夜航招待员`。草稿仍只返回给店主编辑器，未调用 `addCharacter` 前不会进入公开/访客 Tavern payload。
- 前端 `aiCharacterDrafts` 增加来源说明 helper，角色管理面板在生成后展示 owner LLM / 本地模板的不同文案。
- 验证：
  - `node frontend/scripts/ai-character-drafts-test.mjs`
  - `py -3 -m pytest -q backend/tests/test_character_draft_generation.py --tb=short`
  - `py -3 -m compileall -q backend/src`
  - `py -3 -m pytest -q backend/tests/test_character_draft_generation.py tests/test_core_api_owner_config.py --tb=short`
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run typecheck`
  - `npm --prefix .\frontend run build`
