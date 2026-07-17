# Execution Plan

## 1. Preserve evidence and contracts

- [x] Keep `prd.md` aligned with the accepted three-Space/six-character tasks and remove resolved questions.
- [x] Record current production DOM evidence, historical fixture keys and database audit limitations in `data-audit.md`.
- [x] Curate Trellis implementation/check context before activation.

## 2. Load only the accepted visitor collection

- [x] Add a reusable frontend launch-story contract and loader that calls `getSpace()` for the three stable Space IDs.
- [x] Validate `public + open` and the six expected Character IDs without copying role content into frontend fallback data.
- [x] Update the homepage to clear stale results, expose loading/error/empty/ready states and retry safely.
- [x] Update default `/空间` visitor discovery to use the same three-Space collection while preserving explicit expanded listing.
- [x] Replace invented discovery relative-time/online labels with actual access/state semantics.

## 3. Render the real account separately from play identity

- [x] Add a shared session-account hook using `getAccessStatus()` and `subscribeAccessStatus()`.
- [x] Render linked user, legacy guest, loading and error states without example names, IDs or avatars.
- [x] Keep account identity separate from “男 / 女 · 乞丐” private play identity.
- [x] Remove the fake notification red dot and incorrect `/我的家` account link.

## 4. Recompose homepage around six real roles

- [x] Change desktop cards to a non-overlapping 3 × 2 layout.
- [x] Render all six actual characters and their three actual Space names.
- [x] Add a compact mobile account summary and render only actual character rows.
- [x] Add bounded loading, empty and retryable error states.
- [x] Remove homepage render paths for fabricated memory, quote, fixed statistics, revisit badge and fake platform readiness.
- [x] Keep the restrained navy/blue-violet palette already present in the dirty worktree.

## 5. Add guarded fixture retirement

- [x] Inventory fixed historical fixture signatures; exclude every name-only or runtime-generated ID.
- [x] Add one shared full-signature retirement contract.
- [x] Apply it idempotently in database and JSON seed maintenance.
- [x] Prove exact owner match retires, mismatched owner remains untouched, and canonical stories remain public/open.
- [x] Do not directly mutate production while the deployment database audit is unavailable.

## 6. Verification

- [x] `py -3 -m compileall -q apps/api/src`
- [x] Focused Python contract verification for canonical seeds and fixture owner guards.
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [ ] Run React diagnostics after the final React edits and investigate any score regression. (Stopped at user request; an earlier run reported no errors.)
- [x] Start the local app with an isolated JSON data root.
- [ ] Browser-check all failure states. (Desktop and 360 px ready states passed; further acceptance stopped at user request.)
- [x] Adversarially compare default homepage/discovery DOM and links against the accepted Space/Character ID table.

## 7. Migrate canonical browser routes to ASCII — pending, do not implement yet

- [ ] Confirm whether old Chinese URLs receive one release of redirects or an immediate 404 hard cut.
- [ ] Replace Chinese route patterns in `apps/web/app/routes.ts` with the approved ASCII route table, including creator-only `/owner/spaces`.
- [ ] Reverse `legacy-web-route.tsx`: Chinese and older singular English paths become inputs; ASCII paths become destinations.
- [ ] Change `WEB_PATHS`, `spacePath`, `characterPath`, `spaceManagePath`, `promptEditorPath`, `clueHuntPath`, `ownerProfilePath` and fragment aliases to emit ASCII only.
- [ ] Update route comments, navigation, redirects, path comparisons, deep links and share links to use helpers; remove business-component path concatenation.
- [ ] Remove public `?view=expanded` catalog widening; old parameter must not change the visitor loader.
- [ ] Keep public reference codes and API resource IDs unchanged.
- [ ] Verify static-host SPA fallback and direct refresh for every canonical deep link.

## 8. Replace optional fake cards with a truthful collection state machine — pending, do not implement yet

- [ ] Define one discriminated `loading / ready / revalidating / empty / filtered-empty / error` state shared by home and discovery.
- [ ] Make ready-state Space and Character card props required; delete `undefined`-entity card construction.
- [ ] Remove generated “等待真实空间 N”“等待角色入住”“待开放”“等待空间同步” card branches and fabricated metrics.
- [ ] Render one collection-level loading skeleton with `aria-busy`, not three clickable-looking cards.
- [ ] Render one sanitized error panel with one retry action; never reuse stale fixture data after a failed request.
- [ ] Separate authoritative empty from filtered-empty and provide the correct recovery action for each.
- [ ] Keep only last-known fully validated launch data during background revalidation, with a non-blocking refresh indicator.
- [ ] Prove partial or invalid launch contracts fail atomically and cannot fall through to `listSpaces()`.

## 9. Future verification for the added scope

- [ ] Static route inventory contains no Chinese canonical pathname or hash.
- [ ] Direct navigation matrix covers `/spaces`, Space, Character, manage, prompt, quests, clue hunt, owner, territory, notifications and `/me`.
- [ ] Legacy aliases, if approved, redirect once with `replace`; query/hash preservation is safe and no loop exists.
- [ ] Visitor query tampering cannot reach the general catalog; `/owner/spaces` requires creator capability.
- [ ] Component checks cover all six collection states and assert zero entity cards outside ready/revalidating.
- [ ] `npm --prefix .\apps\web run typecheck`
- [ ] `npm --prefix .\apps\web run build`
- [ ] Desktop and 360 px browser checks for routes and state panels.

## Risk and rollback points

- Before backend edits: snapshot the exact fixture allow-list in `data-audit.md`.
- Before any connected-data mutation: require a read-only row audit with exact IDs and owners.
- If the launch loader rejects a valid seed, inspect the API payload; never weaken it to a name match.
- If the six-card layout cannot fit the 1536 × 1024 artboard, reduce decorative content before reducing touch targets or hiding roles.
