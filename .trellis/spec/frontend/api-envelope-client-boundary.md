# API Envelope Client Boundary

> Frontend contract for consuming transitional `{data, meta}` API responses.

## Scenario: Clients accept both raw legacy payloads and enveloped payloads

### 1. Scope / Trigger

Use this when changing frontend API readers, route loaders, product service clients, or tests that parse backend JSON. Backend envelope behavior is defined in `../backend/api-response-envelope-contract.md`.

### 2. Signatures

```typescript
export function unwrapApiPayload<T>(payload: unknown): T

export async function readApiJson<T>(
  path: string,
  init?: RequestInit & { userId?: string },
): Promise<T>
```

JavaScript product-parity readers should implement the same runtime behavior in:

- `frontend/app/product/services/apiClient.js`
- `frontend/app/product/services/spaceService.js`

### 3. Contracts

- API reader helpers must accept both:
  - raw legacy payloads, e.g. `{ spaces, count }`;
  - transitional envelopes, e.g. `{ spaces, count, data: { spaces, count }, meta: {...} }`;
  - strict envelopes in future, e.g. `{ data: { spaces, count }, meta: {...} }`.
- For successful responses, frontend helpers return the unwrapped `data` value when a `{data, meta}` envelope is detected; otherwise they return the raw payload.
- For HTTP errors, helpers must extract a user-facing message from legacy `error` / `detail` first, then from `meta.error.message`, then fall back to `HTTP <status>`.
- Route modules should continue calling service helpers (`frontend/app/lib/*` or `frontend/app/product/services/*`) rather than parsing envelopes in components.
- Binary readers such as `readApiBlob(...)` must not unwrap successful blob bodies, but should parse enveloped JSON error responses when the HTTP status is not OK.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Raw success payload | Returned unchanged |
| Transitional success payload | Returned as `payload.data`, preserving the legacy object shape for callers |
| Future strict envelope | Returned as `payload.data` |
| Legacy error `{"error": "..."}` | Throws that message |
| Enveloped error with `meta.error.message` | Throws that message if no legacy key exists |
| Non-JSON error body | Throws a status/snippet message instead of a misleading parse error |
| Blob request succeeds | Returns `Blob`, no unwrap |
| Blob request fails with enveloped JSON | Throws parsed envelope/legacy error message |

### 5. Good/Base/Bad Cases

- Good: centralize unwrapping in `readApiJson` / product `readJson` helpers.
- Base: TypeScript types still describe the domain payload (`SpaceListResponse`, `Space`, etc.), not the transport envelope.
- Bad: route components doing `payload.data ?? payload` ad hoc.
- Bad: assuming a top-level `data` key always means API envelope without also checking for a `meta` object.

### 6. Tests Required

Run:

```powershell
node frontend/scripts/api-client-error-test.mjs
node frontend/scripts/service-contract-test.mjs
npm --prefix .\frontend run typecheck
```

If route/service behavior changes beyond the JSON reader helpers, also run:

```powershell
npm --prefix .\frontend test
npm --prefix .\frontend run build
```

Required assertions:

- `api-client.ts` exposes `unwrapApiPayload(...)`.
- Native and product service readers detect `{data, meta}` envelopes.
- Error readers consider `meta.error`.

### 7. Wrong vs Correct

#### Wrong

```tsx
const payload = await readApiJson("/api/v1/spaces")
const spaces = payload.data?.spaces ?? payload.spaces
```

This leaks transport compatibility into route UI code.

#### Correct

```tsx
const result = await readApiJson<SpaceListResponse>("/api/v1/spaces")
const spaces = result.spaces
```

The shared client unwraps the envelope before route code sees the response.
