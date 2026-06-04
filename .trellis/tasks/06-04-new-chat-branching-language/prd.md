# New chat branching language

## Goal

Reframe reset/new-chat style actions as story branch controls so visitors understand the difference between continuing a memory-backed run and locally restarting from the entrance.

## Scope

Frontend-only visitor controls in native `/tavern/:id` and legacy product chat surfaces.

## Non-goals

- No API/Schema/database change.
- No deletion of visitor memory, relationship, messages, or gameplay sessions.
- No no-memory trial mode implementation.
- No owner/admin destructive reset copy changes.

## Acceptance criteria

- Visitor chat shows a compact branch control using story language such as “当前支线 / 从门口重新开始”.
- The restart action resets only current local chat UI state and returns to the entrance/opening scene.
- Copy explicitly says long-term private memory is not deleted.
- Existing gameplay abandon/reset destructive flows are not renamed into safe-sounding actions.
- Typecheck/build pass; visual self-acceptance is attempted where feasible.

## Implementation notes (2026-06-04)

Implemented local story branch controls in:

- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/product/TavernChatRoom.jsx`
- `frontend/app/product/styles.css`

What changed:

- Added visitor-facing `data-story-branch-controls` near the composer.
- Copy reframes restart as “当前支线 / 从门口开新支线”.
- The restart action clears only transient local chat UI state and returns to the doorway / opening scene.
- Copy explicitly states private revisit memory, relationship, and saved progress are not deleted.
- Existing destructive or gameplay-abandon flows were not renamed into safe-sounding actions.

Boundary:

- No API call for the restart action.
- No backend/API/Schema/database change.
- No memory, relationship, persisted message, or gameplay-session deletion.
- No no-memory trial mode implementation.

## Validation

Passed:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
git -c safe.directory=D:/work/ai- diff --check
node .\.trellis\tmp\branching-language-visual-acceptance.cjs
```

Playwright evidence:

- `D:\work\ai-\.trellis\tmp\branching-language-evidence\branching-language-visual-acceptance-report.json`
- `D:\work\ai-\.trellis\tmp\branching-language-evidence\branch-controls-desktop.png`
- `D:\work\ai-\.trellis\tmp\branching-language-evidence\branch-controls-mobile.png`
- `D:\work\ai-\.trellis\tmp\branching-language-evidence\branch-doorway-desktop.png`
- `D:\work\ai-\.trellis\tmp\branching-language-evidence\branch-doorway-mobile.png`

Checked desktop and mobile/narrow viewports for branch copy, no memory-deletion warning, return-to-doorway behavior, absence of chat/gameplay/reset/memory POSTs on branch click, and horizontal overflow.

Additional quality check note:

- `npx -y react-doctor@latest . --verbose --diff` was attempted.
- Sandbox run failed with npm cache `EPERM`.
- Escalated rerun was rejected by the approval reviewer because it would download and execute unpinned third-party npm code with repository access.
- No workaround was attempted; the completed validations above remain the basis for this task.
