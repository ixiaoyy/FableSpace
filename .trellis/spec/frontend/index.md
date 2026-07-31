# Frontend Development Guidelines

## Scope

These specs cover the React Router 7 SPA in `apps/web/app/`. Public navigation
is Character-first, API calls use the `/api/v1/story-worlds/...` backend, and
real server states must drive loading, empty, failure, continuity, and ending
surfaces.

## Guidelines Index

| Guide | Use it for |
|---|---|
| [Directory Structure](./directory-structure.md) | Route, component, lib, hook, UI, CSS, and asset ownership |
| [Component Guidelines](./component-guidelines.md) | Function components, props, styling, and accessibility |
| [Hook Guidelines](./hook-guidelines.md) | Reusable stateful logic, loaders, effects, and subscriptions |
| [State Management](./state-management.md) | Loader, URL, local reducer, and server-state boundaries |
| [Type Safety](./type-safety.md) | Boundary types, registries, runtime narrowing, and legacy debt |
| [Quality Guidelines](./quality-guidelines.md) | Build/typecheck, mobile checks, SPA routing, and commit snapshots |
| [User-Facing UI Copy](./ui-copy-guidelines.md) | Mandatory no-explanatory-copy and collection structure |
| [Character Routing](./character-routing.md) | Canonical Character routes and stable slug mapping |
| [Managed StoryWorld Content](../backend/managed-story-content.md) | Admin content, managed images, and runtime adoption |

## Pre-Development Checklist

1. Read root `AGENTS.md`, [User-Facing UI Copy](./ui-copy-guidelines.md), and
   [Quality Guidelines](./quality-guidelines.md).
2. Read [Character Routing](./character-routing.md) for navigation, public
   routes, login returns, or Character entry surfaces.
3. Read [State Management](./state-management.md) for protected writes,
   continuity restoration, or multi-step async UI.
4. Read [Managed StoryWorld Content](../backend/managed-story-content.md) for
   `/admin`, managed Character media, or current StoryWorld forms.
5. Keep the UI mobile/narrow-screen capable and backed by real data. Do not
   invent characters, statistics, timestamps, memories, or placeholder worlds.
6. For a new top-level SPA route, update both `app/routes.ts` and
   `apps/web/nginx.conf`.

## Verification Baseline

- Frontend behavior/style: `npm --prefix .\apps\web run build`
- Type or API-client changes: also
  `npm --prefix .\apps\web run typecheck`
- React code before commit: run changed-scope React Doctor when available and
  do not accept a score regression.
- Visual/interaction work: reason about mobile first; use browser acceptance
  only when requested or materially necessary. Playwright is not a universal
  prerequisite.
