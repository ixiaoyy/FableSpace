# Frontend Type Safety

> Type and validation conventions for FableMap's JavaScript/React frontend.

---

## Overview

The frontend is JavaScript-first (`.js` / `.jsx`) with `tsconfig.json` configured for `allowJs`, JSX, and `noEmit`. `strict` is currently `false`; runtime normalization and service-contract tests are therefore important.

Do not assume TypeScript-level safety exists for all payloads.

---

## Type organization

Current conventions:

- Shared frontend data operations are implemented as plain functions in `services/`.
- Component-specific draft shapes are normalized in the component file.
- Public exports are used for reusable normalizers/helpers, e.g. `createEmptyCharacterDraft`, `normalizeCharacterPayload`, `createBlankGameplay`.
- JSDoc comments exist in `tavernService.js` for service methods and should be continued for new service APIs.

Example service JSDoc:

```javascript
/**
 * 获取酒馆详情
 * @param {string} tavernId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async getTavern(tavernId, userId = '') { ... }
```

---

## Runtime validation patterns

Because payloads are dynamic, normalize and validate at boundaries.

Examples from existing code:

```javascript
function toText(value) {
  return typeof value === 'string' ? value : ''
}
```

```javascript
function normalizeTalkativeness(value) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0.5
  return Math.max(0, Math.min(1, parsed))
}
```

```javascript
function safeParseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '')
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}
```

Use this style when accepting backend payloads, imported SillyTavern cards, owner-authored JSON, or localStorage data.

---

## API response handling

Central service helpers parse text, guard invalid JSON, and turn HTTP errors into `Error` objects. Follow existing `readJson` patterns in `services/apiClient.js` and `services/tavernService.js`.

Do not parse backend responses ad hoc in components.

---

## Schema alignment

Frontend object expectations must stay aligned with `docs/WORLD_SCHEMA.md` and backend dataclasses in `backend/src/fablemap_api/core/tavern.py` / `backend/src/fablemap_api/core/gameplay.py`.

Schema-sensitive fields include:

- `Tavern`: `id`, `name`, `description`, `lat`, `lon`, `access`, `status`, `characters`, `world_info`, `gameplay_definitions`.
- `TavernCharacter`: SillyTavern-compatible fields such as `name`, `description`, `personality`, `scenario`, `system_prompt`, `first_mes`, `mes_example`, `tags`, `alternate_greetings`, `sprites`.
- `GameplayDefinition` / `GameplaySession`: owner brief, nodes, fallback events, session state, current node, events.

Do not introduce frontend-only schema fields into persistent payloads unless backend/docs/tests are updated.

---

## Forbidden patterns

- Blind `JSON.parse` in render paths or without fallback for owner-editable fields.
- Widespread `any`-style assumptions such as calling `.map` on unknown values without `Array.isArray`.
- Mutating backend payload objects in place and then reusing them as original state.
- Type assertions by convention only, e.g. assuming every tavern has `characters` as an array.
- Changing enum values in UI without backend/schema docs.

---

## Real examples to follow

1. `frontend/app/product/CharacterEditor.jsx`: converts unknown character payloads to safe strings/lists/maps before rendering.
2. `frontend/app/product/GameplayDefinitionEditor.jsx`: parses advanced JSON with fallback and user-facing validation errors.
3. `frontend/app/lib/taverns.ts`: URL-encodes IDs, shares route-module types, and reads JSON through `api-client.ts`.
4. `frontend/app/product/services/tavernService.js`: URL-encodes IDs and reads JSON consistently for product parity source.
5. `frontend/scripts/service-contract-test.mjs`: protects service/helper behavior outside the browser.

---

## Scenario: roleplay state in native tavern routes

When a route renders player-as-NPC roleplay state, shared types and API clients belong in `frontend/app/lib/taverns.ts`:

```typescript
type RoleplayMode = "ai_only" | "hybrid"
type RoleplayClaimStatus = "pending" | "approved" | "rejected" | "revoked"
type RoleplayState = {
  tavern_id: string
  roleplay_mode: RoleplayMode | string
  claims: RoleplayClaim[]
  characters: Pick<TavernCharacter, "id" | "name" | "avatar">[]
}
```

Use these service methods from route modules instead of calling `fetch` in components:

```typescript
getRoleplayState(tavernId, userId)
saveRoleplayConfig(tavernId, { roleplay_mode }, userId)
requestRoleplayClaim(tavernId, { character_id, player_name }, userId)
decideRoleplayClaim(tavernId, claimId, { status, note }, userId)
```

Roleplay UI must tolerate `roleplay` being unavailable from a loader and fall back to `tavern.roleplay_mode || "ai_only"` plus `tavern.character_claims || []`. Do not treat local visitor/owner IDs as secure authorization; backend owner and visibility checks remain authoritative.

Required verification after changing these clients or route components:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

## Common mistakes

- Trusting localStorage data without defaults.
- Passing raw imported card JSON straight to backend without using parser/normalizer helpers.
- Adding a new backend field and only updating the component that first uses it.
- Treating `tsconfig` as proof of runtime safety when the source is still JavaScript and external payloads are dynamic.
