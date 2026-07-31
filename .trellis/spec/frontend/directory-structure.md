# Frontend Directory Structure

## Application Layout

```text
apps/web/
├── app/
│   ├── routes.ts              # React Router route registration
│   ├── routes/                # Route loaders, orchestration, and route CSS
│   ├── components/            # Reusable product components
│   │   └── admin/             # Content-admin panels and field helpers
│   ├── lib/                   # API clients, route registries, and pure utilities
│   ├── hooks/                 # Reusable stateful React logic
│   ├── ui/                    # Small generic UI primitives
│   ├── assets/                # Text sidecars and source-controlled metadata
│   ├── root.tsx
│   └── styles.css
├── nginx.conf                 # Production SPA/API routing
├── react-router.config.ts
└── vite.config.js
```

The built app is an SPA (`ssr: false`). `app/routes.ts` proves a route is
bundled; `nginx.conf` separately proves production deep-link reachability.

## Ownership Rules

- Route modules own `clientLoader`, URL params/search params, navigation, and
  page-level async orchestration. Examples:
  `routes/home.tsx`, `routes/story-world-character.tsx`, and
  `routes/character-story.tsx`.
- Put HTTP calls and response types in `app/lib/`, not inline in components.
  New StoryWorld calls belong in `lib/story-worlds.ts` or a focused peer.
- Put reusable visual/product units in `components/`; keep admin-only units
  under `components/admin/`.
- Put reusable stateful behavior in `hooks/`; do not extract one-off route
  state merely to make a file shorter.
- Put small generic controls in `ui/`. Do not introduce a large UI or state
  dependency without approval.
- Keep feature CSS beside the owning route/component. Shared theme/reset rules
  stay in `styles.css`.
- AI image binaries do not live in Git. Store prompt sidecars under `assets/`
  and use registered HTTPS URLs through `lib/media-assets.ts`.

## Naming Rules

- Route/component files use lowercase kebab-case; React components and exported
  types use `PascalCase`; functions and variables use `camelCase`.
- Custom hooks start with `use`.
- Feature CSS class names use a stable feature prefix such as `annieStory`,
  `characterDiscovery`, or `admin-`; avoid generic global selectors.
- Stable public Character slugs live only in `lib/character-routes.ts`.

## Legacy Boundary

Files that still expose Space, visitor identity, map, or old product concepts
are retirement targets. Do not move their contracts into new components,
create new adapters for them, or use them as the naming standard.
