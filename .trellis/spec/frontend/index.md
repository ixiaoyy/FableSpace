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
| [Image Asset Guidelines](./image-asset-guidelines.md) | AI-generated bitmap placement, project paths, and verification | Current |
| [NPC Art Guidelines](./npc-art-guidelines.md) | Tavern-themed NPC portrait assets and fallback contracts | Current |
| [State Card UI Boundary](./state-card-ui-boundary.md) | Canon Ledger pending-card service/UI contract | Current |
| [Tavern GM Layer Preview Boundary](./gm-layer-preview-boundary.md) | Preview-only structured GM suggestion service/UI contract | Current |
| [Serial Episode Export Boundary](./episode-export-boundary.md) | Deterministic chat/state-card episode export service/UI contract | Current |
| [Voice Greeting Preview Boundary](./voice-greeting-preview-boundary.md) | No-audio NPC first-greeting preview and safe TTS request boundary | Current |
| [Visual Souvenir Preview Boundary](./visual-souvenir-preview-boundary.md) | No-image shared-moment prompt preview and future asset guardrail | Current |
| [Tavern Skill Pack UI Boundary](./skill-pack-ui-boundary.md) | Owner-visible skill-pack service/UI contract | Current |
| [Preset Import Preview UI Boundary](./preset-import-preview-ui-boundary.md) | Owner-only preview modal/service contract for community preset risk reports | Current |
| [Character Prompt Risk Linter](./character-prompt-risk-linter.md) | Owner-facing NPC prompt linting before character save/import | Current |
| [Map Anchor Emotional Copy](./map-anchor-copy.md) | Real-coordinate tavern entrance copy and marker/card wording | Current |
| [Discovery Liveliness Signals](./discovery-liveliness-signals.md) | Discovery page rumor/feedback/activity labels without visitor social features | Current |
| [Mobile Single-mainline Experience](./mobile-single-mainline.md) | Mobile dock and tavern first-screen contracts for the visitor-first entry path | Current |
| [Revisit-care Notification Boundary](./revisit-care-notification-boundary.md) | Preview-only proactive revisit notification policy with opt-in/quiet-hours/rate-limit/unsubscribe guardrails | Current |

---

## Pre-development checklist

1. Read `AGENTS.md`; for medium/high-risk UI work also read the product/architecture/schema docs listed there.
2. Inspect the relevant existing component/service/hook before adding a new one.
3. Keep API calls in `frontend/app/lib/` for new routes or `frontend/app/product/services/` for product parity source unless there is a strong existing pattern otherwise.
4. For UI work, check narrow-screen behavior and avoid desktop-only layouts.
5. For any AI-generated bitmap or image replacement, read `image-asset-guidelines.md`; a deliverable image is not complete while it only exists in `.codex/generated_images`, a temp folder, or a chat preview.
6. For any new formal NPC role, NPC portrait, expression sprites, or tavern interior visual work, read `npc-art-guidelines.md`; a shipped NPC is not implementation-complete without a project/owner `avatar` or `sprites.neutral`, required expression semantics, and payload/file-existence tests.
7. For Canon Ledger / state-card UI changes, read `state-card-ui-boundary.md`.
8. For GM Layer preview UI/service changes, read `gm-layer-preview-boundary.md`.
9. For Serial Episode Export UI/service changes, read `episode-export-boundary.md`.
10. For Voice Greeting Preview UI/service changes, read `voice-greeting-preview-boundary.md`.
11. For Visual Souvenir Preview UI/service changes, read `visual-souvenir-preview-boundary.md` and `image-asset-guidelines.md`.
12. For Tavern Skill Pack UI/service changes, read `skill-pack-ui-boundary.md`.
13. For preset import preview UI/service changes, read `preset-import-preview-ui-boundary.md`.
14. For character editor prompt risk checks, role-card import safety, or NPC prompt linter tests, read `character-prompt-risk-linter.md`.
15. For map/discovery card copy that describes real coordinates, tavern markers, or street entrance wording, read `map-anchor-copy.md`.
16. For discovery liveliness labels using rumor, guestbook/feedback, visits, or activity summaries, read `discovery-liveliness-signals.md`.
17. For mobile dock order, mobile first-screen tavern entry, or collapsed tavern secondary panels, read `mobile-single-mainline.md`.
18. For revisit-care, return-visit reminders, proactive notification copy, or notification scheduling previews, read `revisit-care-notification-boundary.md`.
19. Run the right verification:
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
