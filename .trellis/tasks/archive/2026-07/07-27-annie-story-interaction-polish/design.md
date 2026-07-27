# Technical Design

## Scope

This stage polishes the new StoryWorld Character route. It changes:

- the private StoryRun projection for reviewed choice feedback and unlocked
  historical references;
- the shared frontend StoryRun type;
- the new StoryWorld Character route and its route-local CSS;
- authority documentation for the added response projection.

It does not reuse or extend the old Space Gameplay reference dialog, whose
node IDs and response contract belong to the legacy pilot.

## Data Flow

```text
reviewed CanonEntry registry + current StoryRun node/status
  -> application-owned unlock projection
  -> private StoryRun response
  -> typed frontend client
  -> player-opened inline reference disclosure
```

```text
choice click
  -> one in-flight action guard
  -> reviewed choice event
  -> relationship_changed event with source choice event
  -> authored next-node narration
  -> run response
  -> timeline scrolls to latest event without stealing focus
```

## Historical Reference Contract

The private run projection adds:

```text
historical_reference:
  stage: opening | investigation | outcome
  unlocked_count: number
  total_count: number
  entries:
    id: CanonEntry.id
    category: fixed_fact | story_setting | needs_verification
    statement: reviewed text
    sources: reviewed HTTPS source URLs
```

Unlock rules are presentation metadata in the Annie application slice:

- opening: original Character and fixed PlayerRole setting;
- investigation: reviewed outbreak/inquiry/comparison facts and relevant
  Story Settings;
- outcome: remaining fixed public-history results and private-ending setting.

No unreviewed text is created. The UI maps categories to
`史实 / 剧情设定 / 待核验`, shows the zero count for categories with no
unlocked entries, and never exposes locked statements.

## Interaction State

- Replace the boolean pending flag with
  `start | choice | message | restart | null`.
- Keep a synchronous in-flight ref so double click/tap cannot submit twice
  before React paints the disabled state.
- Preserve typed message content after failure.
- Keep failures beside the action area with a direct recovery instruction.
- Ignore late success/failure actions after session expiry.
- Mark timeline/actions busy with accessible live status.
- Scroll the timeline container to its end on new events or node changes;
  do not move keyboard focus.

## Mobile and Accessibility

- Choices and send control keep at least 44px touch targets.
- The action composer remains reachable at the bottom of the story surface on
  narrow screens and respects safe-area inset.
- Text and source URLs wrap without horizontal overflow.
- Reference disclosure uses native details/summary semantics, visible focus,
  and no modal.
- Motion uses only state transitions and is removed under
  `prefers-reduced-motion`.

## Visual Alignment

Preserve the existing deep navy historical surface and restrained gold accent.
Fix route-local drift:

- display heading maximum and tracking;
- over-rounded hero corner;
- border plus oversized shadow pairings;
- missing active/disabled/focus states;
- muted contrast and mobile overflow safeguards.

No image is generated or replaced.

## Verification

- Python task-local projection verification without a database connection.
- Frontend typecheck and build.
- Commit-snapshot frontend verification from a temporary detached worktree
  because unrelated Web files are dirty in the shared workspace.
- Browser interaction at 390×844 and desktop using a no-database preview
  harness or request interception; no backend database session is allowed.
