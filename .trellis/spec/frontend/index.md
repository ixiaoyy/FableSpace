# Frontend Development Guidelines

Frontend guide index. Read only files relevant to the change.

## Authority

Do not override `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, or `docs/WHAT_NOT_TO_BUILD.md`.

Current frontend principles:

- Real map/coordinate anchoring.
- Owner-authored space/NPC/world content.
- Centralized API clients in `apps/web/app/lib/` or `apps/web/app/product/services/`.
- Mobile/narrow-screen usability.
- No large UI/state/map dependency without approval.

## Always-use guides

- [Directory Structure](./directory-structure.md)
- [Component Guidelines](./component-guidelines.md)
- [Hook Guidelines](./hook-guidelines.md)
- [State Management](./state-management.md)
- [Quality Guidelines](./quality-guidelines.md)
- [Type Safety](./type-safety.md)

## Read only when touched

- Images/NPC art: `image-asset-guidelines.md`, `npc-art-guidelines.md`
- Web routes, links, redirects, and public references: `web-routing.md`
- Focused feature specs were pruned. For feature work, inspect the live route/component/service/hook files and core product docs.
- Add a new focused spec only when a durable frontend contract genuinely changes.

## Pre-development checklist

1. Inspect existing component/service/hook first.
2. Keep API calls centralized.
3. Keep owner/visitor/public state separate.
4. For UI changes, account for narrow screens.
5. Do not add test files or test scripts unless the user explicitly restores a test workflow.

## Verification

- UI/build change: `npm --prefix .\apps\web run build`
- Type/API client change: `npm --prefix .\apps\web run typecheck`
- Browser/Playwright only when visual acceptance is actually needed.

## Anti-patterns

- Scattered direct `fetch` calls.
- Visitor-visible owner secrets/private memory.
- Platform-generated content as owner-authored content.
- Old RPG-map/game center replacing space discovery/entry/chat.
- Brittle tests for simple copy/layout internals.
