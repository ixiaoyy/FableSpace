# Completion note

## Changed files

- `frontend/app/features/tavern-chat-workbench/index.tsx`
  - Removed forced `min-h-[680px]`/flex filler layout from the chat workbench.
  - Changed the chat log to a bounded scrolling area with `data-chat-log-compact`.
  - Changed the composer to `data-chat-composer="fast-entry"` and folded display name/gender into `data-visitor-identity-settings`.
  - Collapsed right-rail detail sections by default.
- `frontend/scripts/tavern-chat-workbench-test.mjs`
  - Added source-level regression checks for compact chat log, folded identity settings, and removed fixed-height layout.
- `frontend/app/lib/taverns.ts`
  - Widened default owner/visitor id exports to `string` while reading centralized runtime config values, so typecheck accepts non-demo ids.
- `frontend/app/features/tavern-npc-stage/portraitCatalog.ts`
  - Re-exported `NpcPortraitArchetype` from the extracted catalog config to keep imports type-safe.

## Verification

- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — passed.
- `npm --prefix .\frontend test` — passed.
- `npm --prefix .\frontend run typecheck` — passed.
- `npm --prefix .\frontend run build` — passed.
- Playwright visual self-acceptance — passed for desktop and mobile.
  - Report: `D:\work\ai-\.trellis\tasks\05-05-05-05-chat-composer-usability\artifacts\playwright-report.json`
  - Desktop screenshot: `D:\work\ai-\.trellis\tasks\05-05-05-05-chat-composer-usability\artifacts\desktop.png`
  - Mobile screenshot: `D:\work\ai-\.trellis\tasks\05-05-05-05-chat-composer-usability\artifacts\mobile.png`

## Notes

- Playwright reports the message-to-composer gap as 96px on desktop and 88px on mobile, with identity inputs hidden by default and no horizontal overflow.
- Sandbox cannot launch Playwright Chromium due `spawn EPERM`; the visual check was rerun with approved escalation.
