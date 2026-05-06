# PRD: Owner dialogue preview prompt dry-run

## Problem
店主对话预览当前是本地模拟，不调用 LLM、不写历史、不写记忆。作为“模拟器”可以，但如果在店主管理台表现为“AI 对话预览”，会误导店主以为看到了真实角色效果。

## Evidence
- `frontend/app/product/OwnerDialoguePreviewSimulator.jsx:59`：`本地模拟回复效果，不调用 LLM，不写入聊天历史 / 记忆 / writeback`。
- `frontend/app/product/OwnerDialoguePreviewSimulator.jsx:121` 展示 `preview_only`。

## Goal
把 owner preview 从“前端假回复”升级为真实 prompt dry-run，或至少明确重命名为本地模拟：
1. 后端根据真实 Tavern/NPC/prompt/world info 组装 dry-run；
2. 可选调用 owner LLM 做一次测试回复；
3. 保证不写入聊天历史、记忆和 writeback。

## Non-goals
- 不把预览消息当作真实访客对话。
- 不把内部 prompt 全量暴露给访客。
- 不默认消耗 owner token，必须店主明确点击测试。

## Acceptance Criteria
- [x] 预览路径走后端统一 prompt builder / world info injector，而不是纯前端拼接假回复。
- [x] 预览结果明确标注 `dry_run=true`、`persisted=false`、`model_called=true|false`。
- [x] 可选 LLM 测试需要 owner 确认，并显示 token/错误降级。
- [x] 不写入 chat history / memory / writeback，有后端测试验证。
- [x] 如果暂不接后端，则 UI 重命名为“本地模拟器”，不再暗示真实 AI 效果。（N/A：本任务已接后端 dry-run；本地模拟仅保留为缺身份降级）

## Suggested files
- `frontend/app/product/OwnerDialoguePreviewSimulator.jsx`
- `frontend/app/product/dialoguePreviewSimulator.js`
- `backend/src/fablemap_api/core/web/service.py`
- `backend/src/fablemap_api/core/web/router.py`
- `frontend/scripts/owner-dialogue-preview-test.mjs`


## Implementation Notes

- Added owner-only `POST /api/v1/taverns/{id}/dialogue-preview/dry-run`.
- Backend dry-run uses `PromptBuilder` and WorldInfo matching with real Tavern/NPC/prompt data; default `call_model=false` only assembles prompt.
- Optional `call_model=true` calls external owner LLM only after explicit UI action; rules backend returns local rules response with `model_called=false`.
- Response exposes `dry_run`, `persisted`, `model_called`, write flags, matched WorldInfo count, model status/error, and token estimate.
- Tests verify no chat history, memory atoms, visitor state/writeback writes through observable history/memory endpoints and owner-only permission.
- Frontend owner preview component now calls centralized `previewOwnerDialogueDryRun(...)`, passes owner identity, displays dry-run/model/write flags, and keeps local simulator only as a degraded fallback.
- Updated architecture and backend/frontend specs with dry-run contracts.

## Validation

- RED: `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py --tb=short` failed with 404 before route existed.
- GREEN: `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py --tb=short` → 3 passed.
- `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py backend/tests/test_v1_owner_config.py --tb=short` → 17 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `node .\scripts\owner-dialogue-preview-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

## Deferred / Not Done

- No Playwright visual self-acceptance was run for the modal surface in this task; build/script/type checks passed, but browser screenshots were not captured.
