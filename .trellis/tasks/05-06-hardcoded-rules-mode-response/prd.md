# PRD: De-demo hardcoded rules response mode

## Problem
公益/无 Key 场景当前用规则后端支撑，但代码里有“demo behavior”与写死回复，容易导致访客看到像系统说明拼接出来的回复，而不是角色聊天。这与“AI 是 NPC 对话与体验引擎”存在体验落差，也解释了用户反馈的“像系统回复 / 写死”。

## Evidence
- `backend/src/fablemap_api/core/public_welfare_rules.py:5` 明确写着 `demo behavior for no-network public-welfare taverns`。
- `backend/src/fablemap_api/core/web/service.py:2198` / `:3069` 在 chat 路径调用 `_rules_backend_response(...)`。
- `backend/src/fablemap_api/core/web/service.py:2437` 定义 `_rules_backend_response`，其中根据关键词和角色信息生成规则回复。
- `backend/src/fablemap_api/core/default_taverns.py` 给公益酒馆配置 `backend=rules` / `public-welfare-rules-v1`。

## Goal
把“规则回复”产品化为明确、数据驱动、范围可控的 no-key 模式，而不是 demo 级硬编码：
1. 对内：规则模式有清晰契约、测试、配置数据来源；
2. 对外：UI 明确区分“规则模式 / 无 Key 轻量接待”和“LLM NPC”；
3. 对角色体验：规则回复不再暴露系统设定拼接感。

## Non-goals
- 不让平台自动替店主创作酒馆内容。
- 不取消公益酒馆的 no-key 可用性。
- 不把所有用户酒馆强制转为规则模式。

## Acceptance Criteria
- [x] `public_welfare_rules.py` 中 demo 注释和写死规则被替换为可维护的数据/配置结构，或改名为明确的 built-in rules fixture。
- [x] 用户自建酒馆若没有 LLM Key，不应静默伪装成 AI NPC；需要明确降级状态或引导店主配置。
- [x] 公益酒馆规则回复基于角色卡字段和配置模板生成，不直接把系统设定句拼给访客。
- [x] 前端聊天页能展示“规则模式/AI 模式”的差异，但不把内部 prompt、系统策略暴露给访客。
- [x] 增加回归测试：公益酒馆 no-key 可聊天、用户酒馆 no-key 降级透明、规则回复不含内部配置字段。

## Suggested files
- `backend/src/fablemap_api/core/public_welfare_rules.py`
- `backend/src/fablemap_api/core/web/service.py`
- `backend/src/fablemap_api/core/default_taverns.py`
- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/product/TavernChatRoom.jsx`

## 2026-05-06 LLM config boundary note

User decision: 系统店 / 公益店应正常开通；`kilo-auto/free` 只作为店主可选免费模型，不作为平台强制默认。当前实现任务 `05-06-05-06-system-public-welfare-llm-config` 只处理开门与规则兜底边界；本任务继续负责后续产品化事项：

- 在聊天 UI 明确区分“规则模式 / no-key 轻量接待”和“外部 LLM 模式”。
- 继续去 demo 化 `public_welfare_rules.py` 的命名、注释与配置来源。
- 如果未来要真正直连 Kilo Code，需要单独设计 adapter 或 OpenAI-compatible bridge；不能仅靠模型名暗示已接入。
- 免费模型文案必须提示额度、速率、稳定性与隐私边界，并保持店主确认。

## 2026-05-06 Implementation Notes

- Backend chat payloads now include `response_mode` metadata:
  - `built_in_rules` for公益/内置规则模式；
  - `owner_llm` for 店主外部 LLM；
  - `llm_not_configured` for 自建酒馆无可用模型配置；
  - `local_fallback` for 外部 LLM 调用失败后本地规则兜底。
- v1 runtime and migrated product-core chat service both return the same mode labels/messages without exposing `api_key`、`system_prompt`、`scene_prompt`、`prompt_blocks` or internal rules model names to visitors.
- Frontend native tavern workbench and legacy product chat room show a visible mode badge: “规则模式 / 无 Key 轻量接待”, “外部 LLM 模式”, or closed/unconfigured guidance.
- `public_welfare_rules.py` wording now describes the rules content as a built-in local rules fixture rather than demo behavior.

Validation:

- `py -3 -m pytest -q backend/tests/test_v1_runtime_features.py tests/test_tavern_llm_degradation.py --tb=short` → 18 passed, 17 existing `datetime.utcnow()` deprecation warnings.
- `py -3 -m compileall -q backend/src` → passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed, with CRLF normalization warnings only.
