# Frontend State Management

> How local, server, URL, and persisted state are managed in FableSpace.

---

## Overview

FableSpace does not use Redux, Zustand, MobX, React Query, SWR, or another global state library. State is managed with React `useState`, `useMemo`, `useEffect`, custom hooks, React Router, and small persistence helpers.

Do not add a new state management dependency without user approval.

---

## State categories

| State type | Current pattern | Examples |
|------------|-----------------|----------|
| Local UI state | `useState` in component | modal open flags, form drafts, active tab/section |
| Workflow/session state | custom hooks | `useWorldSession`, `useNearbySession`, `useWritebackSession` |
| Server state | explicit service calls + loading/error state | `spaceService.listSpaces`, `getSpace`, gameplay session methods |
| URL state | React Router route matching/navigation | `/discover`, `/templates`, `/owner`, `/space/:spaceId` in `App.jsx` |
| Persisted browser state | `localStorage` via service/helpers | visitor ID/nickname, theme, first-run mode, world session persistence |
| Derived display state | `useMemo` or pure service functions | `buildAppPanelProps`, `buildWorldSessionViewState`, sorted/filtered spaces |

---

## Local state patterns

Keep state near the component or hook that owns it. Use local drafts for forms/editors and emit normalized payloads on save.

Existing examples:

- `CharacterEditor.jsx` keeps a local `draft` and derives completion/preview with `useMemo`.
- `GameplayDefinitionEditor.jsx` keeps text versions of arrays/JSON and emits parsed structures.
- `SpaceOwnerPanel.jsx` owns owner-console panels/modals and passes callbacks to child editors.

---

## Server state patterns

Server state is loaded on demand and refreshed explicitly. Existing services expose methods such as:

```javascript
const service = getDefaultSpaceService()
const payload = await service.listSpaces({ lat, lon, radius })
```

Use visible loading and error state around calls. Do not assume successful network calls or valid JSON; service helpers already convert HTTP/JSON failures to `Error` objects.

When changing backend response shape, update:

- `frontend/app/product/services/spaceService.js` or `apiClient.js`,
- affected components/hooks,
- frontend script tests if service behavior changes,
- backend tests/docs if the contract is canonical.

---

## URL and navigation state

`App.jsx` derives the active view from React Router paths:

```javascript
function viewFromPath(pathname = '/') {
  if (matchPath('/discover', pathname)) return 'map'
  if (matchPath('/templates', pathname)) return 'templates'
  if (matchPath('/owner', pathname)) return 'owner'
  if (matchPath('/space/:spaceId', pathname)) return 'space'
  return 'home'
}
```

New top-level routes should fit this route/view model and preserve direct links to spaces where possible.

---

## Persisted state

Local browser persistence is used for visitor/session convenience, not authoritative security:

- `visitorId` and `visitorNickname` in `App.jsx` localStorage.
- theme and first-run mode in localStorage.
- world/writeback session persistence through `services/sessionPersistence.js`.

Do not store owner API keys or sensitive LLM configuration in localStorage unless an approved design explicitly says so.

---

## Derived state

Prefer pure helpers and `useMemo` for derived state instead of duplicating mutable state. Examples:

- `sortSpacesForDiscovery(...)` and `pickSpacesForMap(...)` in `App.jsx`.
- `usePoiFilters(...)` derives filter options and filtered POIs.
- `buildWorldSessionViewState(...)` returns display-ready world/writeback state.

---

## Real examples to follow

1. `frontend/app/product/App.jsx`: visitor identity/theme/route state plus top-level space discovery refresh keys.
2. `frontend/app/product/hooks/useWorldSession.js`: composed workflow state with persisted session restore.
3. `frontend/app/product/services/sessionPersistence.js`: isolates localStorage serialization details.
4. `frontend/app/product/GameplayManager.jsx`: loads/saves gameplay definitions through `spaceService` and keeps owner editing state local.

---

## Common mistakes

- Introducing global state for a single panel or editor.
- Treating localStorage identity as secure authorization; backend must enforce owner/visitor boundaries.
- Caching server state invisibly without refresh/error controls.
- Duplicating derived values in state and letting them drift.
- Storing secrets or raw API keys in browser-visible state.
