# PRD: Owner-confirmed preset import apply flow

## Problem
预设导入已有 preview UI/API，但 apply 尚未实现。若用户把它理解为“导入预设”，当前其实只给风险报告，不会写入任何 Tavern 配置，属于 preview-only 半成品。

## Evidence
- `backend/src/fablemap_api/core/preset_import.py:202`：`Return a preview-only risk report...`
- `backend/src/fablemap_api/core/preset_import.py:226`：报告不会写入 runtime_presets / prompt_blocks / world_info / characters。
- `backend/src/fablemap_api/core/preset_import.py:234`：返回 `preview_only: True`。
- `frontend/app/product/PresetImportPreviewModal.jsx:93`：`Preset Import · preview only`。
- `frontend/app/product/PresetImportPreviewModal.jsx:117`：`apply 尚未实现`。

## Goal
在不破坏安全边界的前提下，实现 owner-confirmed apply：
1. Preview 继续负责风险分类；
2. 店主明确选择 supported 子集后才写入；
3. blocked/warning 默认不自动应用。

## Non-goals
- 不自动导入高风险 prompt / jailbreak / 外部 Key。
- 不绕过店主确认。
- 不修改 SillyTavern 兼容字段语义。

## Acceptance Criteria
- [x] 后端新增/补齐 apply 流程，只接受 preview 中 supported 且店主选择的项目。
- [x] Apply 前展示 diff/影响范围，支持取消。
- [x] Apply 操作 owner-only，有权限测试和 blocked/warning 拦截测试。
- [x] Apply 后实际写入 Tavern 的 runtime_presets / prompt_blocks / world_info / characters 中的安全子集。
- [x] 前端不再把 preview-only 当作完整导入；按钮状态和结果状态准确。
- [x] 更新 preset import spec 或新增 apply contract。

## Suggested files
- `backend/src/fablemap_api/core/preset_import.py`
- `backend/src/fablemap_api/core/web/service.py`
- `backend/src/fablemap_api/core/web/router.py`
- `frontend/app/product/PresetImportPreviewModal.jsx`
- `.trellis/spec/backend/preset-import-preview-contract.md`
- `.trellis/spec/frontend/preset-import-preview-ui-boundary.md`

## Completion Notes — 2026-05-06

- 新增 owner-only `POST /api/v1/taverns/{tavern_id}/preset-import/apply`。
- `confirm=false` 只返回 apply diff，不写入 Tavern；`confirm=true` 只应用店主选择的 supported 子集。
- Apply 会拒绝 warning / blocked / unknown selected IDs，返回 400。
- 支持把 supported 项写入 `prompt_blocks` / `world_info` / `characters`，并在店主勾选时把安全运行参数生成自定义 `runtime_presets`；不会保留上传 JSON 中的 API Key。
- 前端 Modal 改为“风险报告 → 选择 supported → 预览 diff → 确认应用”两步流；warning / blocked 仅展示不可选。
- 已更新 `.trellis/spec/backend/preset-import-preview-contract.md`、`.trellis/spec/frontend/preset-import-preview-ui-boundary.md` 与 `docs/ARCHITECTURE.md`。

## Verification — 2026-05-06

- RED：`py -3 -m pytest -q backend/tests/test_v1_preset_import_preview.py --tb=short` → 2 failed / 2 passed，失败原因为 `/preset-import/apply` 404（预期缺失功能）。
- GREEN：`py -3 -m pytest -q backend/tests/test_v1_preset_import_preview.py --tb=short` → 4 passed。
- `py -3 -m pytest -q tests/test_preset_import_preview.py backend/tests/test_v1_preset_import_preview.py --tb=short` → 7 passed。
- `py -3 -m compileall -q backend/src` → passed。
- `node .\scripts\preset-import-preview-test.mjs`（cwd=`frontend`）→ `preset-import-preview-test: ok`。
- `npm --prefix .\frontend run typecheck` → passed。
- `npm --prefix .\frontend test` → passed。
- `npm --prefix .\frontend run build` → passed。

## Notes / Limits

- 本轮未做 Playwright 桌面/窄屏截图自验收；已完成 build 与脚本契约测试。
- 按用户要求：当前任务完成后停止，不继续认领后续任务。
