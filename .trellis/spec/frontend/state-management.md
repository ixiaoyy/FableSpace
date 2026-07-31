# State Management

> How state is managed in this project.

---

## Overview

<!--
Document your project's state management conventions here.

Questions to answer:
- What state management solution do you use?
- How is local vs global state decided?
- How do you handle server state?
- What are the patterns for derived state?
-->

(To be filled by the team)

---

## State Categories

<!-- Local state, global state, server state, URL state -->

(To be filled by the team)

---

## When to Use Global State

<!-- Criteria for promoting state to global -->

(To be filled by the team)

---

## Server State

<!-- How server data is cached and synchronized -->

(To be filled by the team)

---

## Common Mistakes

<!-- State management mistakes your team has made -->

(To be filled by the team)

---

## Scenario: Recovering Protected Story State After an Uncertain Write

### 1. Scope / Trigger

Use this contract when a Character story page combines cached access status,
private server state, and POST actions whose response may be lost after the
server has committed the write. The authoritative product contract remains in
`docs/WORLD_SCHEMA.md`.

### 2. Signatures

- `invalidateAccessStatusCache(): void`
- `getAccessStatus(forceRefresh?: boolean): Promise<AccessStatus>`
- `GET /api/v1/story-worlds/{story_world_id}/runs/current?character_id=...`
- Browser event: `SESSION_EXPIRED_EVENT`

### 3. Contracts

- Cache invalidation must cover both settled and in-flight access decisions.
  Use a generation/version guard so an older response cannot repopulate an
  invalidated cache.
- A protected-request `401` invalidates the access cache and the page's private
  run, pending action, optimistic exchange, failed action, and draft input.
  Late action results from the expired generation must be ignored.
- A non-`401` write failure keeps the last confirmed server projection but
  freezes all further writes. Do not automatically replay start, restart,
  message, or choice requests.
- Only a successful read of `runs/current` may replace the local run and clear
  the write-failure freeze. The recovery path may check access status first,
  but it must not call a write endpoint.

### 4. Validation & Error Matrix

| Condition | Required state transition |
|---|---|
| Cached access status is still valid | Reuse it without another request |
| Cache is forcibly invalidated while a read is in flight | Ignore that read for cache population |
| Protected request returns `401` | Enter `expired`, clear private state and require login |
| Story POST returns a non-`401` failure | Preserve confirmed projection, set `failedAction`, disable writes |
| Recovery GET fails | Keep the page non-writable and show a read retry |
| Recovery GET succeeds | Dispatch `run-loaded`, adopt server state and clear failure/draft state |

### 5. Good / Base / Bad Cases

- Good: a response is lost after a message POST; the player reloads, the page
  reads the committed server run, and no duplicate message is sent.
- Base: a normal page visit reads access status and `runs/current`, then enables
  writes for the confirmed run.
- Bad: a failed POST leaves the composer enabled or a retry handler resends the
  original request without first reading server state.

### 6. Tests Required

Until a frontend test suite is restored, the minimum verification is:

- run frontend typecheck and production build;
- verify reducer transitions for `401`, late success, write freeze, failed
  recovery, and successful `run-loaded`;
- inspect the recovery callback and assert it calls only access status and
  `runs/current`;
- inspect StoryWorld client payloads for `player_id`, retry timers, or automatic
  POST replay.

When reducer tests become available, assert both the complete cleared-state
shape and that expired generations ignore late success and failure actions.

### 7. Wrong vs Correct

Wrong:

```ts
catch {
  await sendStoryMessage(content)
}
```

Correct:

```ts
catch {
  dispatch({ type: "action-failed", kind: "message", message: errorMessage })
}

// A separate player action performs GET runs/current.
dispatch({ type: "run-loaded", run: await getCurrentStoryRun(worldId, characterId) })
```
