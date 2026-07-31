# Frontend Quality Guidelines

## Required Patterns

- Keep public navigation on `/characters/:characterSlug` and
  `/characters/:characterSlug/story`.
- Put new route API calls in `app/lib/`; resolve the player on the server.
- Represent loading, empty, error, expired-session, continuity, and ending
  states explicitly from real data.
- Keep interactive surfaces usable on mobile/narrow screens and expose
  keyboard/focus/accessible-name behavior.
- Follow `ui-copy-guidelines.md`: product UI shows content, state, and actions,
  not explanatory implementation prose.
- Add a method-level comment for every new helper/method when its purpose,
  parameters, return, or constraints are not obvious.

## Forbidden Patterns

- New frontend `/story-worlds/...` deep links, `/spaces` routes, global
  identity gates, or client-supplied `player_id`.
- Placeholder Character/world/statistics/time/memory data used to hide a real
  loading, empty, or failure state.
- Automatic retry of StoryWorld writes after an uncertain response.
- New large UI/state/map dependencies without approval.
- Expansion of legacy product/Space compatibility modules.
- Unrelated formatting, dependency upgrades, or visual redesign in a scoped
  behavior fix.

## Verification Requirements

The package exposes only `typecheck` and `build`; there is no lint or frontend
test script. Do not claim nonexistent checks.

| Changed scope | Minimum fresh verification |
|---|---|
| Frontend code/style | `npm --prefix .\apps\web run build` |
| Type/API-client contract | Typecheck and build |
| React component/state flow | Above plus changed-scope React Doctor when available; no score regression |
| Visual/interaction behavior | Above plus mobile reasoning; browser acceptance when requested or materially necessary |
| New production route | Build plus Nginx direct-deep-link/unknown-route checks |
| Image reference | URL/key/manifest/hash checks, zero Git image binaries, then build |

Playwright is installed as a development dependency but is not a universal
precondition. Do not add a test system solely to verify one task.

### Verify the staged snapshot in a dirty worktree

### Verify the staged snapshot in a dirty worktree

A successful build of a dirty working tree does not prove that the staged or
committed tree can build. An unstaged file can satisfy an import or reference
that is still broken in the index.

Before committing a deleted or renamed route, export, type, or shared constant:

1. Compare staged and unstaged paths with `git diff --cached --name-only` and
   `git diff --name-only`.
2. Search the staged index for every removed symbol, not only the working tree:

   ```powershell
   git grep --cached -n "REMOVED_SYMBOL" -- apps/web
   ```

3. Treat `typecheck` and `build` as commit-snapshot evidence only when no
   unstaged file in `apps/web/` can mask the staged change. Otherwise, stage the
   required dependency or validate the resulting commit from a clean worktree
   before pushing.

Wrong:

```powershell
# The combined worktree passes because an unstaged consumer was already edited.
npm --prefix .\apps\web run build
git commit
```

Correct:

```powershell
git grep --cached -n "WEB_PATHS\.myHome" -- apps/web
git diff --cached --check
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```

### Verify production SPA deep links

A React Router build proves that a route is bundled, but it does not prove that
the production web server serves `index.html` for a direct request to that
route. When adding a new top-level SPA route, update both
`apps/web/app/routes.ts` and `apps/web/nginx.conf`.

Keep API, generated-file, asset, and unknown-route 404 behavior explicit. Add a
scoped SPA fallback for the new route instead of turning every unknown path
into a successful HTML response.

Before declaring the route usable, run the built client through the production
Nginx configuration and verify:

- the route root returns the SPA entry with `200`;
- at least one nested deep link returns the SPA entry with `200`;
- one unrelated unknown path still returns `404`.

For the content backend, this includes `/admin`, `/admin/story-worlds`, and one
`/admin/story-worlds/:storyWorldId/:section` path.

### Hide introductions without losing authored choice results

`StoryRun.events` is the ordered player-visible record. The `narration` event
appended after a reviewed choice is that choice's authored result, not merely a
duplicate of `current_node.narration`.

The chat-first story page does not render an initial or otherwise standalone
`narration` event: public Character context already exists on the Character
page, and the authored opening Character message starts the conversation.
However, a narration immediately following a reviewed `choice` must remain as
the visible result of that interaction.

First remove non-timeline relationship events, then keep narration only when
the preceding visible event is the player's choice. Do not compare narration
content or IDs with `current_node`; the legitimate choice result commonly is
the current node narration.

Wrong:

```tsx
const events = run.events.filter(
  (event) => event.type !== "narration",
)
```

Correct:

```tsx
const storyEvents = run.events.filter(
  (event) => event.type !== "relationship_changed",
)
const timelineEvents = storyEvents.filter(
  (event, index) => (
    event.type !== "narration"
    || storyEvents[index - 1]?.type === "choice"
  ),
)
```

The chat header renders Character identity only: portrait or monogram plus
name. Do not render relationship `label`, `attitude`, `last_change_reason`, or
the internal `affinity` value there. These fields remain part of the run
contract and runtime logic; the player experiences the relationship through
dialogue and authored interaction results instead of a page-level
interpretation. After changing this projection, verify a narrow viewport starts
with the Character opening message, shows the sequence “player choice →
authored Character action or reply,” and automatically scrolls to that reply.

---

## Code Review Checklist

- Does the route/component use real data and the canonical Character path?
- Are URL/query values validated before becoming domain IDs?
- Can a stale async response overwrite a newer route/session generation?
- Are all write controls blocked together during pending/uncertain states?
- Are semantic controls, labels, focus states, and live/error announcements
  present where needed?
- Does mobile show the latest authored result and keep the primary action
  reachable without horizontal overflow?
- Do types match the backend projection without exposing private/internal
  fields?
- Were both staged and unstaged paths considered before claiming the commit
  snapshot builds?
- Was the smallest relevant fresh verification run after the final edit?
