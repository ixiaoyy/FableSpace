# Visitor Profile Affinity and Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first product slice for self-declared visitor profile, profile-driven initial affinity, audience visibility rules, and guest no-long-term-memory behavior.

**Architecture:** Keep Phase 1 on the current `X-User-Id` identity placeholder: `identity_kind=guest` is ephemeral and cannot unlock hidden/profile-gated content or write long-term memory; `registered/owner` are stable identities. Store owner-authored audience rules on the tavern record, derive a per-entry `profile_snapshot`, and route list/enter/character/gameplay/gacha visibility through a shared policy helper.

**Tech Stack:** Python dataclasses + FastAPI/Pydantic contracts, JSON/MySQL-backed TavernStore compatibility, pytest/TestClient, React Router/Vite frontend service layer, npm build/tests, Playwright for visible entry-flow self-check when UI is implemented.

---

## Source and fixed contract

- PRD: `D:\work\ai-\.trellis\tasks\05-06-visitor-profile-affinity-access-brainstorm\prd.md`
- Product guardrails: `D:\work\ai-\AGENTS.md`, `D:\work\ai-\docs\WHAT_NOT_TO_BUILD.md`
- Schema authority: `D:\work\ai-\docs\WORLD_SCHEMA.md`
- Related future identity task: `D:\work\ai-\.trellis\tasks\05-06-demo-level-implementation-audit\05-06-replace-demo-user-identity-defaults` if/when it exists as a child task in this repo layout.

Approved Phase 1 decision:

- Use existing `X-User-Id` as the logged-in/stable identity placeholder.
- Add `identity_kind` and self-declared `visitor_profile` at tavern entry.
- `guest` cannot satisfy hidden visibility rules and cannot write long-term memory.
- Defer full registration/login/session auth to a later iteration, but keep the data contract compatible with it.

---

## Iteration map

### Iteration 1 — MVP now: visitor profile entry + initial affinity + visibility + guest memory guard

**Outcome:** A testable vertical slice where a registered placeholder identity can enter with gender/age_band/city, get one-time initial tavern affinity from owner rules, see matched hidden content, while guest remains temporary and not long-term remembered.

**Must include:** schema/docs/tests/API/frontend minimal UI.

### Iteration 2 — Formal auth and profile persistence

**Outcome:** Replace `X-User-Id` demo identity with real register/login/session or token auth, persistent `VisitorProfile`, logout, profile edit/delete, and account-level privacy controls.

**Must remain separate:** Do not mix with Iteration 1 unless user explicitly approves a larger auth project.

### Iteration 3 — Character-level affinity and content gating

**Outcome:** Extend Phase 1 tavern-level first impression into NPC-specific starting affinity and NPC/gameplay/gacha pool filters, sharing the same visibility policy.

**Depends on:** the private visitor progress bucket chosen by gacha/gifts plans.

### Iteration 4 — Guest-to-registered migration with explicit consent

**Outcome:** Let a guest convert a current temporary session into a registered account only after an explicit confirmation screen. No automatic merge.

**Must include:** audit note in UI and backend migration tests.

### Iteration 5 — Governance, audit, and owner previews

**Outcome:** Owner can preview different profile snapshots, see rule hit explanations, and catch risky/overly broad rules without exposing visitor private data to other visitors.

---

## Phase 0: Pre-development checklist

**Files to read before code:**

- `D:\work\ai-\AGENTS.md`
- `D:\work\ai-\docs\WORLD_SCHEMA.md`
- `D:\work\ai-\docs\WHAT_NOT_TO_BUILD.md`
- `D:\work\ai-\.trellis\spec\backend\directory-structure.md`
- `D:\work\ai-\.trellis\spec\backend\database-guidelines.md`
- `D:\work\ai-\.trellis\spec\backend\error-handling.md`
- `D:\work\ai-\.trellis\spec\backend\quality-guidelines.md`
- `D:\work\ai-\.trellis\spec\frontend\component-guidelines.md`
- `D:\work\ai-\.trellis\spec\frontend\state-management.md`
- `D:\work\ai-\.trellis\spec\frontend\quality-guidelines.md`
- `D:\work\ai-\.trellis\spec\guides\cross-layer-thinking-guide.md`

- [ ] Confirm there are no newer task decisions that supersede this plan.
- [ ] Run `git status --short` and do not touch unrelated existing changes.
- [ ] Decide exact verification slice before coding.

---

## Task 1: Backend audience policy core

**Files:**

- Create: `D:\work\ai-\backend\src\fablemap_api\core\visitor_profile.py`
- Create: `D:\work\ai-\tests\test_visitor_profile_policy.py`

- [ ] Write tests for normalizing `identity_kind`, `gender`, `age_band`, and `city`.
- [ ] Test that `guest` profile cannot match hidden rules even if it supplies matching gender/age/city.
- [ ] Test that `registered` can match a rule only when profile fields match exactly after normalization.
- [ ] Test that initial affinity result clamps to configured `max_initial_strength`.
- [ ] Implement constants:
  - `IDENTITY_KINDS = {"guest", "registered", "owner"}`
  - `AGE_BANDS = {"unspecified", "under_18", "18_24", "25_34", "35_44", "45_59", "60_plus"}`
- [ ] Implement helpers:
  - `normalize_identity_kind(value, user_id="")`
  - `normalize_age_band(value)`
  - `normalize_city(value)`
  - `normalize_visitor_profile(value, *, user_id="", identity_kind="")`
  - `normalize_audience_rules(value)`
  - `evaluate_initial_affinity(rules, profile, *, existing_state)`
  - `is_visible_to_profile(rule_set, target_type, target_id, profile, *, owner=False)`
- [ ] Run: `py -3 -m pytest -q tests/test_visitor_profile_policy.py --tb=short`

---

## Task 2: Backend schema integration and persistence compatibility

**Files:**

- Modify: `D:\work\ai-\backend\src\fablemap_api\core\tavern.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\infrastructure\mysql_store.py`
- Modify: `D:\work\ai-\docs\WORLD_SCHEMA.md`
- Add/modify tests under `D:\work\ai-\tests\`

- [ ] Add `audience_rules: dict[str, Any] = field(default_factory=dict)` to `Tavern` with safe public/private serialization.
- [ ] Extend `VisitorState` to support `age_band`, `city`, `identity_kind`, and `profile_snapshot` if the implementation chooses to store snapshots there.
- [ ] Keep old data backward-compatible: missing fields read as `unspecified` / `guest` / empty snapshot.
- [ ] Update MySQL model conversion only if matching DB columns/JSON fields already exist; otherwise keep fields in JSON-compatible tavern payload or explicitly plan a migration.
- [ ] Update `docs/WORLD_SCHEMA.md` with the new field contracts and privacy boundaries.
- [ ] Run: `py -3 -m compileall -q backend/src`

---

## Task 3: Entry, list, and content visibility filtering

**Files:**

- Modify: `D:\work\ai-\backend\src\fablemap_api\contracts\taverns.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\api\v1\taverns.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\core\tavern.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\domain\tavern_policy.py`
- Modify if needed: `D:\work\ai-\backend\src\fablemap_api\application\services\characters.py`
- Modify if needed: `D:\work\ai-\backend\src\fablemap_api\application\services\gameplay.py`

- [ ] Extend `EnterTavernRequest` with `identity_kind`, `visitor_profile`, `age_band`, and `city` while preserving existing `visitor_gender`.
- [ ] In `enter_tavern`, build a normalized profile snapshot before creating/updating VisitorState.
- [ ] Apply tavern-level visibility before returning full tavern content.
- [ ] Apply initial affinity only when the stable visitor has no prior state or no recorded initial affinity source.
- [ ] Filter returned `characters` and `gameplay_definitions` by visibility rules.
- [ ] Ensure owner bypass works for management and preview.
- [ ] Ensure direct-link failure uses a generic message and does not disclose exact hidden rule values.
- [ ] Add tests for guest denied/hidden, registered matched, owner bypass, and profile incomplete.

---

## Task 4: Guest memory guard

**Files:**

- Modify: `D:\work\ai-\backend\src\fablemap_api\application\services\runtime.py`
- Modify if needed: `D:\work\ai-\backend\src\fablemap_api\contracts\chat.py`
- Test: `D:\work\ai-\tests\test_guest_memory_guard.py`

- [ ] Extend chat requests to carry `identity_kind` or resolve it from existing VisitorState/profile snapshot.
- [ ] Ensure `guest` can receive a response but does not call `auto_create_memories_from_chat`.
- [ ] Ensure `guest` does not create state-card candidates or other long-term progression records.
- [ ] Ensure `registered` behavior remains unchanged.
- [ ] Return `memory_mode: "temporary" | "long_term"` in chat/enter payloads for frontend clarity.
- [ ] Run targeted tests plus compileall.

---

## Task 5: Owner configuration and preview API

**Files:**

- Add/modify backend owner config route/service in existing owner/tavern service pattern.
- Add tests under `D:\work\ai-\tests\`.

- [ ] Add owner-only endpoint for reading/saving audience rules.
- [ ] Normalize saved rules and drop unknown/unsafe fields.
- [ ] Add preview endpoint that accepts a profile snapshot and returns:
  - tavern visible/hidden result
  - visible character ids
  - visible gameplay ids
  - initial affinity preview
  - rule hit explanations for owner only
- [ ] Tests must cover non-owner rejection and no leakage to visitor endpoints.

---

## Task 6: Frontend service and entry UI

**Files:**

- Modify: `D:\work\ai-\frontend\app\lib\taverns.ts`
- Modify: relevant tavern entry/chat route/components discovered during implementation.
- Add/modify frontend tests if behavior is script-testable.

- [ ] Add TypeScript types for `VisitorIdentityKind`, `AgeBand`, `VisitorProfile`, `AudienceRules`, and `memory_mode`.
- [ ] Extend `enterTavern` and chat service calls to pass profile fields.
- [ ] Add entry UI for selecting identity mode and self-declared fields.
- [ ] For guest mode, show copy that long-term memory is off.
- [ ] For hidden/gated tavern direct links, show generic “login or complete entry identity” copy.
- [ ] Keep mobile/narrow layout usable.
- [ ] Run: `npm --prefix .\frontend run build`.

---

## Task 7: Owner rules UI and preview

**Files:**

- Modify or create owner panel components under `D:\work\ai-\frontend\app\` following existing owner management patterns.
- Modify: `D:\work\ai-\frontend\app\lib\taverns.ts`

- [ ] Add a minimal owner audience rules panel.
- [ ] Provide safe presets:
  - “Everyone public”
  - “Registered visitors only for hidden content”
  - “Profile-complete visitors only for selected NPCs”
- [ ] Add preview controls for gender/age_band/city/identity_kind.
- [ ] Show rule hit explanation only to owner.
- [ ] Run frontend build and, if UI is visible, Playwright desktop+narrow self-check.

---

## Task 8: Final verification and Trellis record

- [ ] Run backend syntax: `py -3 -m compileall -q backend/src`.
- [ ] Run targeted pytest files added above.
- [ ] Run frontend build if frontend changed: `npm --prefix .\frontend run build`.
- [ ] If UI changed, run Playwright/in-app browser self-check for guest, incomplete profile, matched registered profile, and owner preview.
- [ ] Update `D:\work\ai-\.trellis\tasks\05-06-visitor-profile-affinity-access-brainstorm\prd.md` if implementation deviates.
- [ ] Add check/acceptance notes under the task directory before final handoff.

---

## Future iteration backlog to keep visible

These are intentionally **not** part of Iteration 1 implementation unless the user explicitly expands scope:

1. Full register/login/logout/session/token auth.
2. Persistent global `VisitorProfile` edit/delete/export controls.
3. Guest-to-registered explicit migration wizard.
4. NPC-specific initial affinity and relationship reactions.
5. Integration with gacha hidden character pool, gifts, currency, and bonus vouchers.
6. Rule risk linter for discriminatory or unsafe owner configurations.
7. Account deletion / profile clearing with memory unlink/delete behavior.
8. Admin/audit tooling for hidden access complaints without public social graph.
