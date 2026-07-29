# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

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

### Keep authored choice results in the story timeline

`StoryRun.events` is the ordered player-visible record. The `narration` event
appended after a reviewed choice is that choice's authored result, not merely a
duplicate of `current_node.narration`.

Do not remove the latest narration event from the timeline just because the
same text is available on `current_node`. On mobile, the timeline scrolls to
the newest event after a choice; filtering that event leaves the player at the
bottom without the Character's response.

Wrong:

```tsx
const events = run.events.filter(
  (event) => event.id !== currentNarrationEventId,
)
```

Correct:

```tsx
const events = run.events.filter(
  (event) => event.type !== "relationship_changed",
)
```

Render the updated relationship `label`, authored `attitude`, and optional
`last_change_reason` in a separate compact status surface. Never render the
internal `affinity` value. After changing this projection, verify a narrow
viewport shows the sequence “player choice → authored Character action or
reply” and automatically scrolls to that reply.

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
