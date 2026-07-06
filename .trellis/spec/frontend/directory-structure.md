# Frontend Directory Structure

> How React/Vite frontend code is organized in FableSpace.

---

## Overview

> **Refactor target note (2026-04-22)**: root `apps/web/src/` has been retired. React Router Framework code lives under `apps/web/app/`; parity product modules retained from the previous UI now live under `apps/web/app/product/` for staged native extraction.

The frontend lives in `apps/web/` and uses React 18 + Vite + ESM. Most source files are plain `.js` / `.jsx`; TypeScript is configured for checking JavaScript but `strict` is currently disabled.

Do not treat `apps/web/dist/` or `apps/web/node_modules/` as source.

---

## Directory layout

### Target React Router Framework layout

```text
apps/web/
├── app/
│   ├── root.tsx                 # document shell, global providers, styles
│   ├── routes.ts                # route module registry
│   ├── routes/                  # native route modules for product pages
│   ├── shell/                   # product shell/layout components
│   ├── ui/                      # owned design-system primitives
│   ├── lib/                     # typed API client and frontend contracts
│   └── product/                 # migrated parity product modules from the previous UI
│       ├── App.jsx              # parity shell, routes, session-level state
│       ├── Space*.jsx          # space discovery/entry/interior/owner/gameplay UI
│       ├── Character*.jsx       # character editor/avatar/management UI
│       ├── Gameplay*.jsx        # gameplay owner/visitor UI
│       ├── World*.jsx           # old world-stage map/writeback UI still used by parity shell
│       ├── hooks/               # reusable state/effect orchestration hooks
│       ├── services/            # API clients, payload/view-model utilities, persistence
│       ├── worldMap/            # Canvas map rendering helpers
│       ├── mapAssets/           # map asset manifest/loading/mapping helpers
│       └── mapAdapter/          # map adapter abstraction and AMap adapter
├── package.json                 # scripts: dev/build/test/preview
├── vite.config.js               # Vite dev proxy to FastAPI `/api` and `/generated`
├── tsconfig.json                # allowJs + JSX checking; no emit
└── scripts/                     # Node regression tests for services/rules
```

Route modules must keep API calls behind `app/lib` or `app/product/services`; do not scatter `fetch` in route components.

---

## Module organization rules

### Put API calls in services

New React Router route modules should call `apps/web/app/lib/` clients. Current `apps/web/app/product/` code should keep using `apps/web/app/product/services/spaceService.js` and `apps/web/app/product/services/apiClient.js`.

Existing pattern:

```javascript
export function createSpaceService(getBaseUrl) {
  return {
    async getSpace(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/spaces/${encodeURIComponent(spaceId)}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },
  }
}
```

Do not add duplicate `readJson`/header builders inside UI components.

### Keep reusable stateful orchestration in hooks

`apps/web/app/product/hooks/` contains composable hooks such as `useWorldSession`, `useBackendStatus`, `useNearbySession`, `usePoiFilters`, `useWritebackSession`, and `useMapLayerControls`.

Create a hook when state/effects are reused or when moving orchestration out of a component improves clarity. Keep purely presentational state local to the component.

### Keep domain/view helpers in services or local pure functions

Examples:

- `services/appShellViewModel.js` builds app shell display data.
- `services/appDisplay.js` contains display formatting.
- `services/sessionPersistence.js` isolates localStorage persistence.
- Component-local pure helpers such as `sortSpacesForDiscovery` in `App.jsx` are acceptable when only used there.

### Co-locate small subcomponents when they are only used once

Large UI files currently contain local subcomponents, e.g. `SpaceOwnerPanel.jsx` defines owner-specific sections and modals. If a subcomponent becomes reusable or makes the file too broad, extract it into a sibling file with a clear domain name.

---

## Naming conventions

- React component files: `PascalCase.jsx`.
- Hooks: `hooks/useSomething.js`, exported as `useSomething`.
- Services/utilities: `camelCase.js` under `services/`.
- Constants: `UPPER_SNAKE_CASE` for module-level constants.
- CSS: shared product styles in `apps/web/app/product/styles.css`; domain-specific styles may use a targeted file such as `spaceGameplay.css`.
- Current repo intentionally does not keep frontend test scripts or a `package.json` `test` entry.

---

## Where to put new work

| Change type | Preferred location |
|-------------|--------------------|
| New space API method for route modules | `apps/web/app/lib/spaces.ts` |
| Generic API/world endpoint for product parity source | `apps/web/app/product/services/apiClient.js` |
| New space UI panel | `apps/web/app/product/Space*.jsx` or `apps/web/app/product/components/` only if a component folder is introduced deliberately |
| New reusable hook | `apps/web/app/product/hooks/use*.js` |
| App shell derived data | `apps/web/app/product/services/appShellViewModel.js` or `appPanelProps.js` |
| Session/localStorage persistence | `apps/web/app/product/services/sessionPersistence.js` |
| Gameplay owner/visitor UI | `Gameplay*.jsx`, `SpaceGameplay*.jsx`, `spaceGameplay.css` |
| Map drawing internals | `apps/web/app/product/worldMap/` or `mapAdapter/`, but avoid reviving map visuals as the product center |

---

## Real examples to follow

1. `apps/web/app/product/SpaceCreatePanel.jsx`: imports service helpers, form/editor components, templates, and readiness logic instead of embedding all logic inline.
2. `apps/web/app/product/useWorldSession.js` pattern is actually `apps/web/app/product/hooks/useWorldSession.js`: it composes smaller hooks and returns a view-model-like object to `App.jsx`.
3. `apps/web/app/product/services/spaceService.js`: centralizes `X-User-Id` headers, JSON parsing, and URL encoding for space APIs.
4. `apps/web/app/product/GameplayDefinitionEditor.jsx`: keeps lightweight owner gameplay configuration in React state and avoids custom scripting.

---

## Common mistakes

- Adding a new service under a component file instead of `services/`.
- Duplicating constants for access/status labels instead of reusing `spaceService.js` helpers.
- Editing generated `apps/web/dist/` output.
- Treating old `WorldMap.jsx` visual enhancement as the primary product direction when docs say space experience is the mainline.
