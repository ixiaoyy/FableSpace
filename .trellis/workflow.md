# Development Workflow

Compact Trellis workflow for AI development in this repo.

## Start of task

1. Read `AGENTS.md`.
2. Read only the relevant product docs/specs for the requested change.
3. Check current git status before editing.
4. For new feature/bug/refactor work, use or create a `.trellis/tasks/<task>/` record.
5. Keep the task note short: goal, files touched, validation, remaining risk.

## Context rule

Do not bulk-load historical `.trellis/tasks/**`. Active task records and focused specs are enough. Completed task folders are archive only unless the user asks for historical context.

## Spec rule

- Use `.trellis/spec/<layer>/index.md` to find the smallest relevant spec.
- Do not read every spec file by default.
- If a spec becomes long, split focused contracts or summarize; do not append large scenario dumps to general guides.

## Development flow

1. Reproduce/understand the issue.
2. Make the smallest coherent change.
3. Update docs/spec only when the contract actually changed.
4. Run proportional validation.
5. Report changed files, reason, validation, and risks.

## Validation selection

- Docs only: content/path check.
- Python source: `py -3 -m compileall -q apps/api/src`.
- Frontend source: `npm --prefix .\apps\web run build` when UI/build changes; run `npm --prefix .\apps\web run typecheck` for TypeScript/API boundary changes.
- Visual changes: browser/Playwright only when visual acceptance is actually needed.
- Do not add broad regression scripts for small copy/layout changes unless they protect a real contract.

## Completion rule

Do not say a task is complete unless:

- code/docs are actually changed as requested;
- validation was run or explicitly skipped with reason;
- known remaining work is listed.

## Task file hygiene

- Keep `task.json` as status metadata.
- Keep `prd.md` concise; archive old verbose brainstorm content.
- Do not store large generated screenshots, Vite caches, pytest temp DBs, or raw scans in `.trellis`.
- `.trellis/tmp/` is disposable and ignored.

## Common commands

```powershell
py -3 .\.trellis\scripts\get_context.py --mode packages
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run build
npm --prefix .\apps\web run typecheck
```

## Do / don't

Do:

- keep changes scoped;
- preserve owner/visitor/public boundaries;
- prefer focused services/helpers over scattered logic;
- keep AI context files short.

Don't:

- bulk-read or bulk-edit unrelated history;
- add huge screenshots/raw scans to `.trellis`;
- turn local task rules into global rules;
- reintroduce test files for incidental UI copy/CSS/source internals.
