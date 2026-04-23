# Frontend Development Guidelines

> FableMap frontend conventions for the React 18 + Vite UI.

---

## Scope and authority

This guide applies to `frontend/`, especially new `frontend/app/` route modules and current `frontend/app/product/` source retained during migration. It does not replace `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, or `docs/WHAT_NOT_TO_BUILD.md`.

The frontend should support the current FableMap mainline:

```text
coordinates/location → real map → tavern discovery → enter tavern → owner configures AI NPC → visitor chats/plays → memory/writeback → revisit feedback
```

Frontend work must preserve:

- Real map/coordinate anchoring.
- Owner-authored tavern content.
- Service-layer API boundaries through `frontend/app/lib/` for new routes and `frontend/app/product/services/` for product parity source.
- Mobile/narrow-screen usability for UI changes.
- Tailwind CSS and Radix/shadcn-style primitives are approved; no additional large UI/state/map dependencies without user approval.

---

## Guidelines index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | File layout and module placement | Current |
| [Component Guidelines](./component-guidelines.md) | Function components, props, styling, accessibility | Current |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, effects, data-fetch orchestration | Current |
| [State Management](./state-management.md) | Local/server/URL/persisted state rules | Current |
| [Quality Guidelines](./quality-guidelines.md) | Build/test requirements and forbidden patterns | Current |
| [Type Safety](./type-safety.md) | JS/JSDoc/runtime normalization conventions | Current |
| [NPC Art Guidelines](./npc-art-guidelines.md) | Tavern-themed NPC portrait assets and fallback contracts | Current |

---

## Pre-development checklist

1. Read `AGENTS.md`; for medium/high-risk UI work also read the product/architecture/schema docs listed there.
2. Inspect the relevant existing component/service/hook before adding a new one.
3. Keep API calls in `frontend/app/lib/` for new routes or `frontend/app/product/services/` for product parity source unless there is a strong existing pattern otherwise.
4. For UI work, check narrow-screen behavior and avoid desktop-only layouts.
5. For NPC portrait or tavern interior visual work, read `npc-art-guidelines.md`; real tavern-themed character art is required, not placeholder geometry.
6. Run the right verification:
   - UI/build change: `npm --prefix .\frontend run build`
   - Service/rule script change: `npm --prefix .\frontend test`

---

## Real examples to follow

- `frontend/app/routes/discover.tsx`, `frontend/app/routes/create.tsx`, `frontend/app/routes/tavern.tsx`: native React Router route modules for the enterprise product shell.
- `frontend/app/lib/taverns.ts`: typed `/api/v1/taverns` client for new route modules.
- `frontend/app/product/services/tavernService.js`: product-parity Tavern API client and frontend helpers for access/status labels.
- `frontend/app/product/hooks/useWorldSession.js`: composed hook that owns world-session orchestration and persistence.
- `frontend/app/product/CharacterEditor.jsx`: draft normalization, runtime validation, reusable editor component.
- `frontend/app/product/GameplayDefinitionEditor.jsx`: lightweight gameplay editor that keeps advanced JSON behind `<details>` and avoids script expressions.
- `frontend/scripts/*.mjs`: service/behavior regression tests executed by `npm --prefix .\frontend test`.

---

## Common frontend anti-patterns

- Calling `/api/...` directly from scattered components instead of adding a service method.
- Introducing Redux/Zustand/React Query/UI frameworks/map libraries without approval.
- Storing owner API keys or sensitive data in logs or visitor-visible UI.
- Adding platform-generated tavern/NPC/story content that bypasses owner confirmation.
- Making old RPG-map visuals the product center instead of tavern discovery/entry/chat/gameplay.
- Breaking mobile layout by assuming wide panels.
