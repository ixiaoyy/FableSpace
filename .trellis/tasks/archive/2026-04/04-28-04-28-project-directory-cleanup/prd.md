# brainstorm: 项目目录整理与过时内容清理

## Goal

整理 FableMap 项目目录，识别并清理无效、过时或重复的内容，让仓库结构更清晰，同时避免误删仍被代码、文档、Trellis 工作流或未提交变更引用的文件。

## What I already know

* 用户希望做“项目目录整理，删掉无效或过时内容”。
* 当前没有 active Trellis task。
* 当前工作区存在较多未提交变更，删除操作风险较高，必须先审计再确认范围。
* 近期有两个 UI/美术升级任务已移动到 .trellis/tasks/archive/2026-04/，原 active task 路径在 git status 中显示为删除，archive 路径为未跟踪。

## Assumptions (temporary)

* 本任务优先整理项目内已明显过时的 Trellis 任务目录、临时产物、废弃资源和未引用内容。
* 不删除源码、docs 权威文档、Schema、测试或用户未确认的资产。
* 对任何会影响运行时行为的删除，先找引用证据并让用户确认。

## Open Questions

* 本轮 cleanup 的 MVP 范围需要用户确认：只清 Trellis/临时归档，还是也审计前端资产和旧文档。

## Requirements (evolving)

* 先生成审计清单，再删除。
* 删除前必须确认文件不再被代码、文档、测试、构建或 Trellis 工作流引用。
* 不执行 git reset、git clean 或大目录递归删除。
* 保留可追踪说明。

## Acceptance Criteria (evolving)

* [ ] 产出候选清理清单，标明“可删 / 需确认 / 保留”及证据。
* [ ] 仅删除用户确认范围内的无效或过时内容。
* [ ] 清理后 git status 可解释，没有意外丢失。
* [ ] 如涉及前端资源引用，运行必要的 build/test 或给出未运行原因。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / build verification selected by actual改动范围.
* Docs/notes updated if behavior or workflow changes.
* Rollback considered for risky cleanup.

## Out of Scope (explicit)

* 不做产品功能重构。
* 不移动、删除或重命名既有 docs/ 权威文档，除非用户单独确认具体文件。
* 不删除可能仍被引用的图片、测试 fixture、seed 数据或源码文件。
* 不使用破坏性 git 命令批量恢复或清空工作区。

## Technical Notes

* 本 PRD 会在初步审计后补充候选文件和建议方案。

## Initial Audit Notes

### Git/workspace state

* Working tree has many uncommitted changes; cleanup must not assume everything untracked is disposable.
* Two completed UI/art tasks are already copied under `.trellis/tasks/archive/2026-04/` while their original tracked active-task paths show as deleted:
  * `.trellis/tasks/archive/2026-04/04-27-art-upgrade-image-surfaces/`
  * `.trellis/tasks/archive/2026-04/04-27-mimi-nya-anime-art-upgrade/`
* Several completed tasks still live directly under `.trellis/tasks/`; likely archive candidates, not deletion candidates.
* Several new `.trellis/tasks/04-28-*` tasks are `in_progress`; do not delete or archive without explicit owner decision.

### Obvious local/generated cleanup candidates

These are covered by `.gitignore` and appear to be local generated/test outputs:

* `.pytest_cache/`
* `tmp_pytest/`
* `tmp_pytest_backend_route_split/`
* `tmp_pytest_codex/`
* `tmp_pytest_usability/`
* `manual_tmp_test/`
* `demo-output/`
* `.fablemap-api/`

### Keep / do not touch in first pass

* `frontend/public/assets/npcs/char_pw_*.png` untracked expression sprites appear to be newly generated deliverables from the art-upgrade task; do not delete as “untracked junk”.
* Modified source/tests/assets from the image work must be preserved unless the user explicitly wants rollback.
* `docs/`, source, tests, schema, and task PRDs are not cleanup targets without file-specific evidence.

### Candidate approaches

**Approach A: Safe workspace hygiene**

* Delete only ignored local generated/test output directories.
* No source/docs/assets/Trellis task movement.
* Lowest risk, mostly reduces noise on disk.

**Approach B: Trellis directory normalization**

* Keep all task history, but move completed root tasks into `.trellis/tasks/archive/2026-04/` consistently.
* Preserve in-progress tasks and current cleanup task.
* Medium risk due to many file moves, but aligns with existing archive pattern.

**Approach C: Full project cleanup audit**

* Start with A+B, then audit potentially unused assets/docs/scripts before deleting anything.
* Highest effort; every deletion needs reference search evidence and likely build/test verification.

## Decision (ADR-lite)

**Context**: 用户选择范围 3，需要整理项目目录、删除无效或过时内容，但当前工作区有大量未提交变更，包含源码、资产和 Trellis 任务状态变化。

**Decision**: 执行完整清理审计：先清理 `.gitignore` 覆盖的本地临时/生成目录，再规范化 completed Trellis 任务归档，最后对可能无效/过时的资源、文档、脚本做引用审计；只有证据充分且风险低的项目内容才删除，否则列为保留或需后续确认。

**Consequences**: 目录会更干净，Trellis 已完成任务历史会进入 archive；但不追求一次性删除所有“看起来旧”的内容，避免误删仍被功能、测试或文档引用的文件。

## MVP Scope Confirmed

* Include safe cleanup of ignored generated/test output directories.
* Include Trellis normalization for completed tasks under `.trellis/tasks/` root.
* Include evidence-based audit of untracked/old-looking project content.
* Exclude destructive git reset/clean and unverified deletion of source/docs/assets.

## Implementation / Cleanup Results

### Safe generated-output cleanup

Removed accessible ignored/generated outputs:

* `.pytest_cache/`
* `demo-output/`
* `.fablemap-api/`
* Python `__pycache__/` directories under `.trellis/scripts/common/`, `backend/`, `backend/tests/`, `tests/`, and `tools/`
* Frontend generated outputs: `frontend/.react-router/`, `frontend/build/`, `frontend/dist/`
* Accessible ignored pytest artifact dirs: `artifacts/pytest-basetemp-current-escalated/`, `artifacts/pytest-tmp-current-escalated/`

Skipped because Windows denied access even after path verification:

* `tmp_pytest/`
* `tmp_pytest_backend_route_split/`
* `tmp_pytest_codex/`
* `tmp_pytest_usability/`
* `manual_tmp_test/`
* `artifacts/pytest-basetemp-current/`
* `artifacts/pytest-tmp/`
* `artifacts/pytest-tmp-current/`
* `artifacts/pytest-tmp-group/`

These skipped paths are ignored/generated and can be removed later with corrected OS permissions; they were not force-owned or permission-mutated in this task.

### Trellis normalization

* Archived completed root tasks without auto-commit into `.trellis/tasks/archive/2026-04/`.
* Preserved in-progress root tasks:
  * `04-28-docker-deployment/`
  * `04-28-tavern-interior-ui/`
  * `04-28-test-coverage/`
* Resolved the `04-24-tv-drama-tavern` archive conflict by renaming the earlier boundary-review snapshot to `04-24-tv-drama-tavern-boundary-review/`, then archiving the later completed task to the standard `04-24-tv-drama-tavern/` path.

### Project-content audit

* Deleted `artifacts/crew-plan/`: tracked old local multi-agent workflow validation artifact, no references found outside itself.
* Kept `artifacts/codex-generated-unmatched/`: README explicitly marks these as reference/draft archive assets, not runtime files.
* Kept `artifacts/art-upgrade-image-surfaces/`, `artifacts/mimi-nya-anime-art-upgrade/`, and `artifacts/design-reference-contact-sheet.png`: task/audit/design reference assets.
* Kept `设计参考/`: referenced by docs/easysdd notes as design reference material.
* Kept untracked `frontend/public/assets/npcs/char_pw_*.png`: although literal grep finds no direct URL refs, backend now derives expression URLs from neutral sprites; AST audit confirmed 13 neutral NPCs × 4 expression suffixes = 52 expected expression files, all present.
* Kept `.claude/settings.local.json` changes: pre-existing local settings diff; not safe to treat as obsolete without owner-specific confirmation.
* Kept `frontend/node_modules/` and `.idea/`: ignored local dependency/IDE state, but not invalid project content.

## Verification Notes

* `git status --short` used to inspect resulting file moves/deletions.
* `py -3 ./.trellis/scripts/get_context.py` used to verify active task root after Trellis archiving.
* AST audit against `backend/src/fablemap_api/core/default_taverns.py` verified all dynamically referenced public NPC expression asset files exist.
* No runtime build/test was run because this cleanup did not change source behavior; running frontend build would recreate ignored `frontend/build/` and `.react-router/` outputs that were intentionally cleaned.

### Context validation correction

`task.py init-context` auto-injected two missing `.claude/commands/trellis/*.md` references into check/debug context. Removed/replaced those missing entries, then `py -3 ./.trellis/scripts/task.py validate .trellis/tasks/04-28-04-28-project-directory-cleanup` passed.
