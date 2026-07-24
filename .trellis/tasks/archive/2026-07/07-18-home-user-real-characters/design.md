# Technical Design

## ASCII route contract

Current code has the migration direction reversed: Chinese paths are canonical, while several ASCII paths are registered as legacy aliases and redirected back to Chinese. The implementation must make the following ASCII paths authoritative.

| Current canonical | Target canonical |
|---|---|
| `/` | `/` |
| `/空间` | `/spaces` |
| `/空间/新建` | `/spaces/new` |
| `/空间/:spaceRef` | `/spaces/:spaceRef` |
| `/空间/:spaceRef/角色/:characterRef` | `/spaces/:spaceRef/characters/:characterRef` |
| `/空间/:spaceRef/管理` | `/spaces/:spaceRef/manage` |
| `/空间/:spaceRef/角色/:characterRef/提示词` | `/spaces/:spaceRef/characters/:characterRef/prompt` |
| `/任务` | `/quests` |
| `/寻宝/:routeRef` | `/clue-hunts/:routeRef` |
| `/店主` | `/owner` |
| `/店主/:ownerRef` | `/owners/:ownerRef` |
| `/领地` | `/territory` |
| `/通知` | `/notifications` |
| `/我的家` | `/me` |
| public `?view=expanded` | creator-only `/owner/spaces` |

Canonical fragments are `#space-main`, `#discover-main`, `#guide-main`, `#create-main` and `#owner-main`. The existing Chinese fragments become compatibility inputs only.

`routes.ts` owns route matching; `web-routes.ts` owns canonical generation. Both must use the same table. Route helpers continue to emit compact public references, so this migration changes only static path vocabulary, not entity identity or database data.

### Compatibility boundary

- Preferred rollout: keep Chinese and older singular English paths in one isolated legacy route table for one release; every match returns `replace()` to the ASCII canonical path while preserving safe search/hash values.
- No component may link to a legacy alias.
- The root trailing-slash canonicalizer runs after the legacy destination is resolved and must not create a redirect loop.
- Static hosting must keep SPA fallback for direct refreshes of every ASCII deep link.
- A hard-cut 404 policy remains an explicit product decision before implementation.

### Discovery authorization boundary

The public `/spaces` loader always uses the three-story launch collection. URL parameters may narrow that collection but never replace its loader with `listSpaces()`.

The general catalog moves to `/owner/spaces` inside `creator-capability-layout.tsx`. A visitor requesting the old `view=expanded` parameter stays on `/spaces`; the parameter is ignored or removed with `replace`, and cannot grant catalog access.

## Truthful collection state model

The current component model mixes a collection-state panel with optional-card fallback builders. Replace that with a discriminated collection state consumed by both home and discovery:

| State | Data allowed | Rendering contract |
|---|---|---|
| `loading` | none | one bounded skeleton/status panel with `aria-busy`; no cards or CTA |
| `ready` | fully validated three Spaces / six Characters | real cards and links only |
| `revalidating` | last fully validated ready data | keep real cards; show a small non-blocking refresh indicator |
| `empty` | explicit authoritative empty result | one collection-level empty panel |
| `filtered-empty` | ready data exists but client filter matches none | one clear-filter state |
| `error` | none, plus sanitized user message | one alert and one retry action |

`FableSpaceDiscoverCard` and the homepage role-card adapter become ready-state components with required real data. Remove code paths that manufacture IDs, names, images, metrics or interaction labels when `Space`/`Character` is absent.

The launch contract remains atomic. Partial responses, wrong owner/access/status, or missing required Character IDs produce `error`, never `empty` and never a substitute from the general catalog.

## Scope and source of truth

This task restores an already accepted product contract; it does not invent a new content set.

| Order | Space ID | Public name | Required character IDs |
|---|---|---|---|
| 1 | `story_palace_snow_edict` | 长明宫·雪夜诏书 | `char_story_palace_eunuch_wei`, `char_story_palace_princess_xiao` |
| 2 | `story_ghost_foxfire_debt` | 青槐驿·狐火借命 | `char_story_ghost_fox_spirit_feiyue`, `char_story_ghost_scholar_ning` |
| 3 | `story_campus_last_class` | 临川大学·最后一堂课 | `char_story_campus_teacher_shen`, `char_story_campus_heir_gu` |

The names, copy, images, coordinates and links shown to visitors still come from persisted API responses. The frontend duplicates only the stable IDs needed to select and validate the accepted launch contract.

## Confirmed root cause

```text
unordered public database rows
  -> /api/v1/spaces truncates to the first 12 rows
  -> homepage ranks only those 12 rows
  -> round-robin keeps only 4 characters
  -> historical test fixtures displace five accepted launch characters
```

The default Space discovery route has the same source problem with a larger limit and adds invented presence/time labels. The current production DOM confirms that fixture content is visible; `data-audit.md` records the evidence and the database-access limitation.

## Visitor discovery data flow

Add one frontend launch-story service with the canonical Space and Character IDs.

```text
home or default visitor discovery
  -> load all three canonical Space IDs in parallel through getSpace()
  -> require each response to be public + open
  -> require the two expected character IDs in contract order
  -> return three ordered Spaces containing six real API characters
  -> render success / loading / empty / error explicitly
```

- A missing, private, closed or incomplete canonical Space fails the launch collection as a unit. The UI reports that the official story data is unavailable; it must not fill the gap with another public record.
- Default `/spaces` visitor discovery uses this same three-Space collection.
- General discovery is not controlled by a public query parameter; it is available only at creator-gated `/owner/spaces`.
- Search and category filters remain client-side over the selected collection.
- No new API parameter or Schema field is required.

## Account identity flow

Add a small hook over the existing shared `getAccessStatus()` cache and `subscribeAccessStatus()` stream.

| Session result | Account presentation |
|---|---|
| Linked user | `display_name || username`, `@username`, real `avatar_url` or the real name initial |
| Legacy with no trusted user | “访客模式” / “独立模式” |
| Loading | neutral account-loading state |
| Request failure | “账号状态不可用”; never presented as guest |

The account card is independent from the private play identity. “男 · 乞丐” remains in the hero as a private role selection and is never reused as account data.

The account surface is informational because the repository has no dedicated account-profile route. It must not link to `/me`, which represents revisit/memory rather than account ownership.

## Homepage composition

### Desktop

- Mount the real account summary in the existing top-right reservation.
- Replace the four arbitrary cards with a 3 × 2 grid of the six accepted characters.
- Use the area previously occupied by fabricated memory/guide/stat panels for the second card row.
- Keep the right rail limited to:
  - three real launch-story entries with no invented relative time;
  - six real character links with “进入” semantics rather than online presence.
- Remove the notification red dot, fixed revisit badge, fake “ready” status, daily quote, fabricated memory stream and hard-coded world statistics from the homepage render tree.

### Mobile

- Show a compact account summary in the header without displacing the theme control.
- Render only actual characters after a successful load.
- Render one bounded loading, empty or retryable error panel instead of six placeholder identities.
- Keep all touch targets at least 44 CSS pixels and avoid horizontal scrolling at 360 px.

## Fixture retirement

Historical test records are not deleted or hidden by character name.

1. Keep a reviewed allow-list of full fixture signatures recovered from historical test source: fixed Space ID, owner ID, Space name, original `public + open` state, and at least one fixed Character ID / name.
2. During the existing seed-maintenance pass, fetch only those exact Space IDs.
3. Change a record only when every signature field matches; a Space ID or display name alone is never sufficient.
4. Retirement is idempotent and reversible: set `access=private`, `status=closed`; preserve characters, chat, memories, gameplay and visit history.
5. Apply the same guard to database and explicit JSON development stores.
6. Runtime-generated fixture IDs, including any record that can only be identified by display name, are audit-only and never automatically retired.

The local machine cannot currently resolve the configured container database host, and the production API rejects unauthenticated command-line reads. Therefore this task can ship the guarded migration and prove its contract locally, but it must not claim that production rows were already mutated before deployment.

## Privacy and truthfulness

- Do not call the existing cross-visitor platform recent-message endpoint from the public homepage.
- Space descriptions may appear as Space descriptions, never as a visitor's “memory”.
- Presence labels such as “在线” or “N 分钟前” are removed unless backed by a real presence/timestamp field.
- Platform stats are omitted from the homepage unless their real endpoint and exact aggregation labels are wired.

## Compatibility

- No `Space`, `SpaceCharacter` or `VisitorState` field changes.
- No role or story copy changes.
- Existing raw Space and Character IDs, public-reference codes and targeted `character_ref` navigation remain stable.
- Existing creator/owner list behavior remains available only through creator-gated `/owner/spaces`.

## Rollout and rollback

### Rollout

1. Deploy ASCII route generation, compatibility redirects, truthful collection states and frontend selection/account/layout changes together.
2. API startup runs the guarded fixture-retirement pass and refreshes the three system-owned seeds.
3. Re-run the read-only database audit in the deployment network and record matched/retired pairs.

### Rollback

- Frontend discovery can return to the general list path without changing stored content.
- Retired fixture records can be reopened by restoring their previous `access/status`; no records are deleted.
- The three canonical system stories are not touched by the fixture allow-list, and no canonical ID appears in that allow-list.
