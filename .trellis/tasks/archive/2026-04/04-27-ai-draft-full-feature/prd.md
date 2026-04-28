# AI 草稿正式设计与猫娘素材完善 PRD

## 目标

把已确认的 `AI 草稿` 产品边界从文档草稿推进到可用 MVP，并补齐默认猫娘 NPC `眯眯喵桑` 的头像 / 表情素材引用。

## 范围

1. 后端新增 owner-only 的 `/api/v1/taverns/{tavern_id}/characters/ai-draft` 预览端点。
2. 端点只返回未发布 `AI 草稿`，不写入 Tavern，不覆盖已有角色，不导出。
3. 店主可在前端角色管理面板触发生成，草稿进入现有角色编辑器，确认保存后走现有 `addCharacter`。
4. 默认公益酒馆 `pw_jingan_catbell_refuge` 的 `char_pw_mimi_nya` 增加项目内头像和多表情 PNG 路径。
5. 更新架构 / 设计留痕，不新增持久化 Schema 字段。

## 非目标

- 不调用外部 LLM，不新增依赖。
- 不自动发布或自动保存 NPC。
- 不生成酒馆描述、世界书、玩法或长期记忆。
- 不实现草稿历史、多版本审核流、Token 计费或平台内容发布。

## 验收标准

- owner POST AI 草稿端点返回 `status: "ai_draft"` 和完整 `NpcDraftPreview` 字段。
- 非 owner 访问返回 403。
- 生成草稿后 GET characters 列表不增加角色。
- 将草稿提交到现有 POST characters 后才新增角色。
- 猫娘默认角色返回 `avatar` 和 `sprites.neutral/joy/anger/embarrassment/curiosity`，对应 PNG 文件存在。
- 前端角色管理可触发 AI 草稿，显示禁忌输入，不直接保存。

## 设计选择

采用确定性规则生成器：根据酒馆名称 / 简介 / 标签和店主禁忌方向组合出安全角色卡字段。这样不需要外部 API Key，能稳定测试，并保持“AI 草稿只是创作辅助”的产品边界。

## 验证计划

- `py -3 -m pytest -q backend/tests/test_v1_character_ai_drafts.py tests/test_default_public_welfare_taverns.py --tb=short`
- `py -3 -m compileall -q backend/src`
- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run build`
- 必要时全量：`$env:NO_PROXY='127.0.0.1,localhost'; py -3 -m pytest -q --tb=short`

## Implementation Notes (2026-04-27)

已完成：

- 新增后端 native v1 端点：`POST /api/v1/taverns/{tavern_id}/characters/ai-draft`。
- 新增 `CharacterDraftRequest` 与确定性 `generate_character_draft` 应用服务；不调用外部 LLM，不持久化草稿。
- 新增后端测试 `backend/tests/test_v1_character_ai_drafts.py`，覆盖 owner 成功、非 owner 403、不持久化、确认保存后持久化。
- 猫娘默认角色已接入项目内 PNG 头像 / 表情素材：`frontend/public/assets/npcs/mimi-nya-*.png`。
- 前端角色管理面板新增 `生成 AI 草稿` 表单；生成结果进入现有 `CharacterEditor`，保存仍走 `addCharacter`。
- 新增前端 helper 与脚本测试：`frontend/app/product/aiCharacterDrafts.js`、`frontend/scripts/ai-character-drafts-test.mjs`。
- 更新 `docs/ARCHITECTURE.md` 与 `docs/IMAGE_ASSETS_SPEC.md`。

验证：

- RED: `py -3 -m pytest -q backend/tests/test_v1_character_ai_drafts.py --tb=short` 初始 405 失败。
- GREEN: `py -3 -m pytest -q backend/tests/test_v1_character_ai_drafts.py --tb=short` → `2 passed in 0.75s`。
- RED: `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py::test_jingan_catbell_refuge_contains_safe_original_catgirl_npc --tb=short` 初始 avatar 为空失败。
- GREEN focused: `py -3 -m pytest -q backend/tests/test_v1_character_ai_drafts.py tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short` → `15 passed in 1.25s`。
- `py -3 -m compileall -q backend/src` → 通过。
- `npm --prefix .\frontend test` → 通过。
- `npm --prefix .\frontend run build` → 通过。
- `npm --prefix .\frontend run typecheck` → 通过。
- `$env:NO_PROXY='127.0.0.1,localhost'; $env:no_proxy='127.0.0.1,localhost'; py -3 -m pytest -q --tb=short` → `373 passed, 6 warnings in 18.32s`。

说明：修正了既有 `creator-conversion-test.mjs` 对 `sourceOwnerId` 新字段的期望，使当前前端脚本测试与已有代码保持一致。
