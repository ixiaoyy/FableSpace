# Frontend Development Guidelines

Frontend guide index. Read only files relevant to the change.

## Authority

Do not override `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, or `docs/WHAT_NOT_TO_BUILD.md`.

Current frontend principles:

- Real map/coordinate anchoring.
- Owner-authored tavern/NPC/world content.
- Centralized API clients in `frontend/app/lib/` or `frontend/app/product/services/`.
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

- API envelope/tavern page clients: `api-envelope-client-boundary.md`, `tavern-api-client-boundary.md`
- Homepage dynamic data: `homepage-dynamic-data-boundary.md`
- Clue hunt UI/API client boundary: `clue-hunt-ui-boundary.md`
- Tavern doorway ritual UI: `tavern-doorway-ritual-ui.md`
- Visitor-first discovery reduction: `visitor-first-discovery-reduction.md`
- Images/NPC art: `image-asset-guidelines.md`, `npc-art-guidelines.md`
- State cards / GM / episode / voice / souvenir / skill packs / preset import / risk linter / digital-human / map copy / discovery signals / mobile / revisit-care / engagement: corresponding focused files.

## Pre-development checklist

1. Inspect existing component/service/hook first.
2. Keep API calls centralized.
3. Keep owner/visitor/public state separate.
4. For UI changes, account for narrow screens.
5. Add/update tests only for real helper/service/contract behavior, not incidental copy/CSS.

## Verification

- UI/build change: `npm --prefix .\frontend run build`
- Helper/service rule change: focused script or `npm --prefix .\frontend test`
- Browser/Playwright only when visual acceptance is actually needed.

## Anti-patterns

- Scattered direct `fetch` calls.
- Visitor-visible owner secrets/private memory.
- Platform-generated content as owner-authored content.
- Old RPG-map/game center replacing tavern discovery/entry/chat.
- Brittle tests for simple copy/layout internals.
