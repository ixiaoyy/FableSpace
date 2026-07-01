# Frontend Hook Guidelines

> How custom hooks are used in FableSpace.

---

## Overview

Custom hooks live in `frontend/app/product/hooks/` for product parity source or beside `frontend/app/` route modules when route-specific. They do not replace services; API methods come from `frontend/app/lib/` or `frontend/app/product/services/`.

Existing hooks include:

- `useWorldSession` — composes world/session state, API client, filters, writeback, persistence.
- `useBackendStatus` — health/meta checks and initial coordinate defaults.
- `useNearbySession` — location and nearby preview submission.
- `useWritebackSession` — writeback event submission and ghost traces.
- `usePoiFilters` — derived POI filters and options.
- `useMapLayerControls` — visible map layers and presets.
- `useScrollToWorldStage` — DOM scroll side effect with timer cleanup.

---

## Custom hook patterns

Prefer hooks when:

- A component has several related `useState`/`useEffect` blocks that form one workflow.
- State/effects are reusable across components.
- Moving orchestration out of `App.jsx` or a panel makes the component easier to read.

Typical pattern:

```javascript
export function useBackendStatus({ api, apiBase, restoredSession, setForm }) {
  const [checking, setChecking] = useState(false)
  const [statusText, setStatusText] = useState('等待连接 FastAPI...')

  const checkBackend = useCallback(async () => {
    setChecking(true)
    try { ... } finally { setChecking(false) }
  }, [api, apiBase, ...])

  return { checkBackend, checking, statusText }
}
```

---

## Data fetching

- Hooks may orchestrate fetches, but the fetch implementation belongs in services (`apiClient.js`, `spaceService.js`).
- Set loading/error state around async calls.
- Use `cache: 'no-store'` in service methods for fresh server state where existing code does so.
- Do not hide failures silently unless the feature is explicitly non-critical; existing examples include ghost trace/disturbance best-effort flows.

Example orchestration from `useNearbySession.js`:

```javascript
setSubmitting(true)
setErrorText('正在生成附近地点切片...')
try {
  const payload = await api.createNearbyPreview({...})
  setResult(payload)
  setErrorText('')
} catch (error) {
  setErrorText(`生成失败：${error.message || String(error)}`)
} finally {
  setSubmitting(false)
}
```

---

## Effects and dependencies

- Include complete dependency arrays; do not suppress hook lint issues by omission.
- For one-time initial effects, existing code sometimes intentionally uses stable callbacks; preserve intent and be cautious before changing dependencies.
- Clean up timers and DOM side effects. `useScrollToWorldStage.js` uses `cancelled` and `window.clearTimeout` cleanup.
- Avoid effects that both derive data and mutate unrelated state; pure derived values should use `useMemo` or service view-model functions.

---

## Naming conventions

- File and export start with `use`, e.g. `useWorldSession.js` / `useWorldSession`.
- Hook arguments should be a single object when there are multiple dependencies/callbacks.
- Return an object with named values rather than an array when there are more than two values.
- Setter props passed into hooks should keep their original names (`setForm`, `setErrorText`, etc.) for clarity.

---

## Real examples to follow

1. `frontend/app/product/hooks/useWorldSession.js`: composes smaller hooks and returns a large but explicit session view model to `App.jsx`.
2. `frontend/app/product/hooks/usePoiFilters.js`: uses `useMemo` for derived filter options and filtered POIs.
3. `frontend/app/product/hooks/useBackendStatus.js`: wraps async health/meta check and applies default coordinates safely.
4. `frontend/app/product/hooks/useScrollToWorldStage.js`: demonstrates DOM/timer cleanup for side effects.

---

## Common mistakes

- Creating hooks that import component-specific CSS or render JSX.
- Calling `fetch` directly inside hooks when a service method should exist.
- Omitting dependencies to avoid rerenders without understanding stale closures.
- Returning positional arrays with many values, which makes call sites fragile.
- Putting product/schema decisions in hooks instead of services/docs/schema-aligned modules.
