# Tavern Doorway Ritual UI

## Scope

Use this for `/tavern/:id` visitor entry and `TavernChatWorkbench` first-screen behavior.

## Contracts

- Non-owner visitors see one immersion beat before workbench controls: real-coordinate doorway, space hook, host NPC greeting, and one CTA.
- Workbench controls such as public/private channel buttons, Shift+Enter composer behavior, identity/mention controls, and secondary tools remain hidden until the visitor clicks the doorway CTA.
- The CTA may select a private NPC and fill/focus the composer, but must not auto-send on behalf of the visitor.
- Password-gated spaces still show the password gate first; owner view bypasses the ritual for management efficiency.
- Doorway copy must reuse `buildTavernFirstMinuteGuide(tavern)` and remain visitor-facing, not PRD/internal language.

## Validation

- `node frontend/scripts/tavern-doorway-ritual-test.mjs`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`

## Affected Files

- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/lib/tavern-first-minute.ts`
- `frontend/scripts/tavern-doorway-ritual-test.mjs`
