# brainstorm: docs and test script cleanup

## Goal

整理仓库中过多、过时或不应纳入版本库的文档、测试脚本、临时验证产物与工具脚本，降低维护噪音；对明显生成物/缓存优先移出版本库，对既有 `docs/` 文档删除或合并前保留候选清单并等待确认。

## What I already know

- 用户希望“文档和测试脚本”做一次清理，过时或不再需要的删除或移出版本库。
- 仓库硬约束要求：不要未经确认移动、删除或重命名既有 `docs/` 文档；破坏性文件操作必须有明确范围。
- 当前权威入口是 `README.md`、`docs/INDEX.md`、`.trellis/tasks/`、`.trellis/spec/`。
- `docs/AI参与开发协议.md` 明确：新任务/认领/验收进入 Trellis；`docs/claims/` 降级为历史归档。
- `.gitignore` 已忽略 `.trellis/tmp/**/node_modules/`、`.trellis/tmp/**/.vite/`、`test-results/` 等，但仓库目前仍 tracked 了大量 `.trellis/tmp/playwright-mainline/node_modules` 与 evidence。

## Initial inventory notes

- `git ls-files`：tracked 文件约 3946 个。
- Markdown/docs-like tracked 文件约 819 个：根目录 5 个，`docs/` 136 个，`.trellis/` 511 个。
- `docs/` 分布：根层 14 个左右，`docs/changes/` 76 个，`docs/claims/` 41 个，`docs/superpowers/` 8 个。
- standalone scripts/tools：约 187 个，其中 `.trellis/scripts/` 是工作流代码，`frontend/scripts/` 89 个，`tools/` 59 个。
- `.trellis/tmp/` tracked：约 756 个文件，约 42.37 MiB，包含 Playwright `node_modules`、test-results、截图 evidence；这类与 `.gitignore` 口径冲突，属于优先清理候选。
- `artifacts/` tracked：约 297 个文件，约 146.70 MiB；可能包含验收截图/资产证据，需按资源规范确认后再删。
- `frontend/package.json` 中 `npm test` 引用了 77 个脚本；当前未发现 missing referenced scripts。
- `frontend/scripts/` 中有 15 个未被 `package.json` scripts 直接引用的脚本，多数是 Playwright/manual visual check，不能仅凭未引用删除。
- `docs/README.md` 当前引用大量不存在的旧协议/地图/Godot 文档，应视为过时文档入口候选：建议删除或重写为指向 `docs/INDEX.md` 的简短说明。
- `docs/CURRENT_TASKS.md` 与 `docs/AI_SHARED_TASKLIST.md` 已明确降级为历史/迁移索引，但 `docs/INDEX.md` 仍把它们列为当前有效/待实现入口，存在口径漂移。

## Assumptions (temporary)

- “不再需要”应优先定义为：生成缓存、临时验证输出、已被 `.gitignore` 忽略但仍 tracked 的依赖/构建产物、明显只用于一次性调试的脚本、与当前文档索引冲突且没有历史归档价值的文档入口。
- 对权威 docs 的删除需要二次确认；对 `.trellis/tmp/**/node_modules` 这类生成依赖可优先移出版本库。

## Open Questions

- 清理策略采用“保守瘦身”“中等清理”还是“激进删除历史留痕”？

## Requirements (evolving)

- 先产出候选清单，按风险分级。
- 删除或移出版本库前，明确每类文件的判定依据。
- 不删除当前 README / docs/INDEX / PRODUCT_BRIEF / ARCHITECTURE / WORLD_SCHEMA / WHAT_NOT_TO_BUILD / AI 协作协议等权威入口。
- 不删除仍被 `npm test`、pytest、构建脚本直接引用的测试脚本。
- 对 `docs/claims/`、`docs/changes/`、`.trellis/workspace/`、`artifacts/` 这类历史留痕目录，默认先归档/保留，除非用户选择激进清理。

## Acceptance Criteria (evolving)

- [ ] 有一份清理候选清单，标出 Safe / Needs confirmation / Keep。
- [ ] 对每个删除或 `git rm --cached` 的路径给出理由。
- [ ] 更新 `.gitignore` 或文档索引，防止被清理内容再次入库。
- [ ] 运行最小验证：`git status`、文档链接/路径检查；若改动前端测试脚本则运行 `npm --prefix .\frontend test` 或相应子集。
- [ ] 最终汇报列出已删除/移出版本库、保留项、未做项与风险。

## Definition of Done

- 清理改动可回滚、范围清晰。
- 不破坏 Trellis workflow、npm test、pytest 与核心文档入口。
- 对不能确认过时的内容保留并标注后续处理建议。

## Out of Scope (explicit)

- 不重写产品方向或 Schema。
- 不做大规模代码重构。
- 不删除权威产品/架构/Schema 文档。
- 不删除生成图片资产，除非确认未被项目引用且非验收证据。

## Technical Notes

- Inspected: `README.md`, `docs/INDEX.md`, `docs/README.md`, `docs/CURRENT_TASKS.md`, `docs/AI_SHARED_TASKLIST.md`, `docs/FABLEMAP_ROADMAP_PHASE2.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/AI参与开发协议.md`, `.gitignore`, `frontend/package.json`.
- Current unrelated `.current-task`: `.trellis/tasks/05-12-search-page-visual-audit`; this cleanup task was created but not activated yet to avoid silently switching active work.
- Candidate commands after confirmation:
  - `git rm -r --cached .trellis/tmp/playwright-mainline/node_modules .trellis/tmp/playwright-mainline/test-results`
  - `git rm test_out.txt`
  - Review then possibly `git rm docs/README.md` or replace it with redirect to `docs/INDEX.md`.

## Implementation Result (2026-05-12)

- [x] User selected aggressive cleanup option 3.
- [x] Removed outdated docs/history, tracked generated artifacts/cache, one-off local tools, task evidence artifacts, and non-formal frontend tests/check scripts from version control.
- [x] Preserved core docs, Trellis workflow/spec/scripts/task records, formal pytest suites, and `frontend/package.json`-referenced script tests.
- [x] Updated `.gitignore`, `README.md`, `docs/INDEX.md`, `docs/IMAGE_ASSETS_SPEC.md`, `docs/AI参与开发协议.md`, and `.trellis/spec/frontend/image-asset-guidelines.md` to match the cleanup policy.
- [x] Verification passed: core markdown link check, frontend package script reference check, `npm --prefix .\frontend test`.

Details: see `cleanup-report.md` and `cleanup-delete-paths.txt` in this task directory.
