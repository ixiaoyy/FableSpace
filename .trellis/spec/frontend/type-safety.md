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

## Scenario: Place/Home payload boundaries

When route components create or display Place/Home data, shared types and runtime normalizers belong in `frontend/app/lib/taverns.ts`, `frontend/app/lib/place-types.js`, and `frontend/app/lib/place-home.js`.

```typescript
type PlaceType = "tavern" | "cafe" | "milk-tea-shop" | "restaurant" | "convenience-store" | "bookstore" | "school" | "hospital" | "home"
type HomeMemberType = "conversational_character" | "silent_member" | "display_object"
type PlaceRelationshipType = "school_enrollment" | "care_link" | "membership" | "work_affiliation" | "story_link"
type PlaceRelationshipStatus = "pending" | "approved" | "rejected" | "revoked"
```

Contracts:

- Use persisted `tavern.place_type` when present; keyword inference is only a fallback for old payloads.
- Do not include `home` in public discovery filter chips.
- Include public `hospital` chips through the shared `PLACE_TYPES` config only; hospital copy must stay in safe nursing/triage wording and avoid diagnosis, prescription, or emergency-care replacement claims.
- Normalize Home create payloads through `normalizeCreatePlacePayload(...)` so public access becomes private before POST.
- Normalize Home member drafts so `silent_member` and `display_object` cannot drift into conversational speech modes.
- Components must call service helpers (`addHomeMember`, `createPlaceRelationship`, `createSchoolEnrollment`, `decidePlaceRelationship`) instead of ad hoc `fetch`.
- The legacy `/home/me` route is only a compatibility/retirement page: it must not call `getMyHome`, `createHome`, `chatWithHomeMember`, or `leaveHomeMessage`, must not hardcode owner privileges, and must route owners to `/create?place_type=home` / `/owner` instead of creating a second Home product surface.
- `/create` may accept `?place_type=home`, but it must normalize the query value through `normalizePlaceTypeId(...)` and still submit through the standard Tavern/Place create flow.
- UI copy must make the pending approval boundary visible; cross-owner Place relationships are not publicly shown until approved by the target Place owner.
- Student-school is only the `school_enrollment` relationship type; generic relationship drafts must use `target_tavern_id` + `relation_type`, while `school_tavern_id` is legacy compatibility.

Required verification after changing these clients or route components:

```powershell
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

For `/home/me` compatibility-page changes, also run:

```powershell
node frontend/scripts/home-route-productization-test.mjs
```

## Scenario: Visitor/NPC gender payload boundaries

When route components create/display visitor or NPC gender, shared constants and runtime normalizers belong in `frontend/app/lib/gender.js`, with v1 API types in `frontend/app/lib/taverns.ts`.

```typescript
type Gender = "unspecified" | "female" | "male" | "nonbinary" | "other"
```

Contracts:

- Use `normalizeGender(...)` before sending owner-authored NPC `gender` or visitor `visitor_gender`.
- NPC payload key is `gender`; visitor request key is `visitor_gender`; returned `VisitorStatePayload` uses `gender`.
- Missing/unknown values display as `未说明` and submit as `unspecified`.
- Do not add `home`/discovery filters, social matching, or global visitor profiles from gender.
- Character editor and tavern chat UI should use `GENDER_OPTIONS` rather than duplicating labels.

Required verification after changing these clients or route components:

```powershell
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

## Common mistakes

- Trusting localStorage data without defaults.
- Passing raw imported card JSON straight to backend without using parser/normalizer helpers.
- Adding a new backend field and only updating the component that first uses it.
- Treating `tsconfig` as proof of runtime safety when the source is still JavaScript and external payloads are dynamic.

---

## Scenario: Create-Page AI Tavern Draft Boundary

When `/create` offers AI-assisted tavern drafting, the frontend must keep draft generation separate from persistence. The draft is owner-editable form input, not a created Tavern.

### 1. Scope / Trigger

Use this contract when changing `frontend/app/routes/create.tsx`, `frontend/app/lib/tavern-drafts.js`, or `frontend/app/lib/taverns.ts` methods for owner default LLM or tavern draft generation.

### 2. Signatures

```typescript
getOwnerDefaultLLM(userId?: string): Promise<OwnerDefaultLLMSafe>
saveOwnerDefaultLLM(data: OwnerDefaultLLMSave, userId?: string): Promise<...>
generateTavernDraft(data: TavernDraftRequest, userId?: string): Promise<TavernDraftResponse>
```

```javascript
createTavernDraftRequest({ lat, lon, address, placeType, styleTagsText, forbiddenText, tone })
draftResponseToCreateForm(response)
```

```http
GET /api/v1/owners/me/default-llm
PUT /api/v1/owners/me/default-llm
POST /api/v1/owners/me/tavern-drafts/generate
```

### 3. Contracts

- Route modules must call `frontend/app/lib/taverns.ts` service helpers, not raw `fetch('/api/...')`.
- Draft helper code must normalize dynamic UI text at the boundary: comma/Chinese-comma lists, numeric coordinates, blank strings.
- `draftResponseToCreateForm` must reject missing `draft` / `character` instead of silently filling undefined values.
- The AI draft panel may fill `name`, `description`, `scene_prompt`, `character_name`, `character_description`, and `first_mes`; it must not call `createTavern` or `addCharacter`.
- The create-page submit path must require `character_name` before calling `createTavern`; every UI-created shop needs at least one formal NPC so the core character chat loop is available immediately after creation.
- `LLMConfigForm` is controlled: pass both `value` and `onChange`; do not keep owner API keys in `localStorage`.
- UI copy must tell the owner that the draft is editable and only becomes real after clicking `创建酒馆`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Default LLM missing | UI asks owner to configure default AI before generation |
| Owner edits style/forbidden/tone | Request sends normalized arrays/text |
| Draft response missing `character` | Helper throws user-readable draft-empty error |
| Draft generation succeeds | Existing create form fields are filled; no create request is sent |
| Owner clicks `创建酒馆` without NPC name | UI blocks submission with a user-readable error and sends no create request |
| Owner clicks `创建酒馆` with NPC name | Existing create flow calls `createTavern` / `addCharacter` with owner-confirmed form data |
| Typecheck on LLM form props | `LLMConfigForm` receives `value` and `onChange` |

### 5. Good/Base/Bad Cases

- Good: route state owns `llmConfigDraft`, passes it to `LLMConfigForm`, and uses `generateTavernDraft(...)` only in the draft button handler.
- Base: helper tests cover request normalization and draft-to-form mapping without a browser.
- Bad: calling `createTavern(...)` from `handleGenerateDraft`, storing `api_key` in browser persistence, or parsing API JSON in the route component.

### 6. Tests Required

Run:

```powershell
node frontend/scripts/ai-tavern-drafts-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Required assertions:

- helper normalizes comma-separated style and forbidden lists;
- helper maps backend draft response into create form fields;
- empty/malformed draft response throws;
- TypeScript catches missing controlled props for `LLMConfigForm`;
- production build succeeds.

### 7. Wrong vs Correct

#### Wrong

```tsx
async function handleGenerateDraft() {
  const draft = await fetch('/api/v1/owners/me/tavern-drafts/generate')
  await createTavern(draft)
}
```

This bypasses service helpers and turns an AI suggestion into persisted owner content.

#### Correct

```tsx
const result = await generateTavernDraft(createTavernDraftRequest(input), ownerId)
const mapped = draftResponseToCreateForm(result)
// fill/edit form fields only; persistence remains behind the create button
```

---

## Scenario: Tavern Visitor Notes UI Boundary

Visitor notes on `/tavern/:id` must be presented as owner-visible feedback, not a public comment wall.

### 1. Scope / Trigger

Use this when changing `frontend/app/routes/tavern.tsx` or visitor-note service helpers in `frontend/app/lib/taverns.ts`.

### 2. Signatures

```typescript
createVisitorNote(tavernId, { content, visitor_nickname }, userId)
listVisitorNotes(tavernId, { limit, offset }, ownerId)
deleteVisitorNote(tavernId, noteId, ownerId)
```

### 3. Contracts

- Route components use service helpers; no direct `fetch`.
- UI copy must say notes are sent to the owner and are not a public wall.
- Do not render `TavernMessageBoard` or visitor reply/pin controls on the tavern route.
- Owner review controls belong behind an owner ID boundary or owner context.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Visitor submits blank content | submit disabled or backend error shown |
| Submit succeeds | content clears and confirmation says sent to owner |
| Non-owner loads notes | error message shown |
| Owner deletes note | note disappears from local list |

### 5. Good/Base/Bad Cases

- Good: small feedback form plus owner-only review details.
- Base: static frontend contract test checks endpoint/helper names and no public board rendering.
- Bad: public list of all visitor notes with reply buttons.

### 6. Tests Required

```powershell
node frontend/scripts/visitor-notes-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

### 7. Wrong vs Correct

#### Wrong

```tsx
<TavernMessageBoard tavernId={tavern.id} />
```

#### Correct

```tsx
<VisitorNotesPanel tavern={tavern} />
```

---

## Scenario: Place Type Visual Cards

### 1. Scope / Trigger

Use this when changing `frontend/app/lib/place-types.js` or the `/create` place-type selection UI.

### 2. Signatures

```javascript
PLACE_TYPES: Array<{
  id: string
  label: string
  shortLabel: string
  icon: string
  discoverable: boolean
  description: string
  tone: string
  cardClass: string
}>

derivePlaceTypeDisplay(tavernOrType) -> PlaceTypeDisplay
```

### 3. Contracts

- Each place type must provide an icon, a short display tone, and a card visual class.
- `/create` should submit `place_type` through a hidden input when using visual cards instead of a native select.
- Place type cards must be real buttons with `type="button"`, visible text labels, and `aria-pressed` active state.
- Home remains selectable for controlled creation but must clearly indicate `默认私密` and stay out of public discoverable chips.
- Visual fields are presentation metadata only; they must not change persistent schema semantics.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Unknown place type | `derivePlaceTypeDisplay` falls back to tavern display |
| Cafe type selected | hidden `place_type` submits `cafe`; card shows cafe tone/style |
| Home type selected | UI marks default-private; discoverable list still excludes Home |
| New discoverable type added | test requires non-empty `tone` and `cardClass` |

### 5. Good/Base/Bad Cases

- Good: one `PLACE_TYPES` config feeds discover chips, create cards, labels, icons, and descriptions.
- Base: card class strings stay Tailwind class names already used by the app.
- Bad: hard-coding one-off type labels/styles in route components while `PLACE_TYPES` drifts.

### 6. Tests Required

```powershell
node frontend/scripts/place-types-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

### 7. Wrong vs Correct

#### Wrong

```tsx
<button onClick={() => setPlaceType("cafe")}>咖啡</button>
```

This duplicates config and can drift from discover filters.

#### Correct

```tsx
{PLACE_TYPES.map((type) => (
  <button aria-pressed={placeType === type.id} onClick={() => setPlaceType(type.id)}>
    {type.icon} {type.label}
  </button>
))}
<input type="hidden" name="place_type" value={placeType} />
```
