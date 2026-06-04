# Visitor-side roleplay reply composer coach

## Goal

Help visitors compose their first and early replies in-character, especially when they are tempted to type out-of-character questions such as “你会做什么”.

## Scope

Frontend-only guidance near chat composers for native `/tavern/:id` and legacy product chat surfaces.

## Non-goals

- No AI rewriting or auto-send.
- No API/Schema/database change.
- No moderation/blocking validation.
- No persistent visitor preference.

## Acceptance criteria

- The chat composer shows a compact local “接戏提示” while chatting.
- The hint reacts to common OOC/blank/short/question-only inputs.
- The coach suggests action + dialogue phrasing without overwriting the visitor text.
- Existing starter chips remain explicit draft-fill actions and never auto-send.
- Build/typecheck pass.

## Implementation notes (2026-06-04)

Implemented a local roleplay reply coach in:

- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/product/TavernChatRoom.jsx`
- `frontend/app/product/styles.css`

What changed:

- Native `/tavern/:id` composer now shows a compact `data-roleplay-reply-coach` panel.
- Legacy product chat composer shows the same local coach with matching CSS.
- The coach reacts to:
  - blank / initial draft state;
  - OOC-like questions such as “你会做什么”;
  - missing action/stage-direction cues;
  - ready-to-send action + next-step replies.
- The example button fills the textarea only; it does not call `onSend`, does not call an API, and does not persist chat.

Boundary:

- No AI rewriting.
- No backend/API/Schema/database change.
- No blocking validation or moderation.

## Validation

Passed:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
git -c safe.directory=D:/work/ai- diff --check
node .\.trellis\tmp\reply-composer-coach-visual-acceptance.cjs
```

Playwright evidence:

- `D:\work\ai-\.trellis\tmp\reply-composer-coach-evidence\reply-composer-coach-visual-acceptance-report.json`
- `D:\work\ai-\.trellis\tmp\reply-composer-coach-evidence\reply-coach-desktop.png`
- `D:\work\ai-\.trellis\tmp\reply-composer-coach-evidence\reply-coach-mobile.png`

Checked desktop and mobile/narrow viewports for coach visibility, OOC guidance, example-fill behavior, and horizontal overflow.

Additional quality check note:

- `npx -y react-doctor@latest . --verbose --diff` was attempted.
- Sandbox run failed with npm cache `EPERM`.
- Escalated rerun was rejected by the approval reviewer because it would download and execute unpinned third-party npm code with repository access.
- No workaround was attempted; the completed validations above remain the basis for this task.
