# Frontend Component Guidelines

## Component Shape

Use function components. Route modules keep page orchestration at the top and
extract focused rendering units below it. `routes/character-story.tsx` is the
reference for a reducer-owned page with `StoryConversationGate`,
`StoryRunWorkspace`, and `StoryActions`.

Reusable cross-route components live in `app/components/`. `PlayerRoleOption`
shows the local pattern: typed props, controlled selection, callback ownership,
and accessible pressed/disabled state.

## Props and Data Flow

- Type props explicitly at the component boundary. Inline object types are
  common for one-use components; export a named type when multiple modules
  share it.
- Prefer controlled values and callbacks (`selected`, `disabled`, `onSelect`)
  over hidden component state.
- Keep server payload types in `app/lib/`; components consume those types
  rather than redefining partial copies.
- Derive display values during render when they are cheap. Do not synchronize
  derived values into an effect.
- Pass domain IDs through callbacks; do not derive persistent IDs from labels
  or display names.

New methods/helpers require a method-level comment describing their purpose,
important parameters, return value, and any non-obvious constraint.

## Styling

The project uses both feature CSS and small Tailwind-based primitives:

- Product pages use imported feature CSS such as
  `home-character-discovery.css`, `story-world-character.css`, and
  `admin.css`.
- `app/ui/` primitives use `class-variance-authority`, Tailwind utilities, and
  `cn()` for controlled variants.
- Follow the owning feature's existing style; do not mix a third styling
  system into one surface.
- Preserve mobile sizing, focus-visible states, disabled states, and theme
  variables.

## Accessibility

- Use semantic buttons/links/forms and always set `type="button"` for
  non-submit buttons.
- Label icon-only controls with `aria-label`; decorative icons/images use
  `aria-hidden="true"` or `alt=""`.
- Pair visible form labels with controls, or provide a precise accessible
  label when the visual layout omits one.
- Use `aria-pressed`, `aria-current`, `aria-live`, `aria-busy`, and
  `role="alert"` for state that actually changes.
- Keep keyboard activation and focus-visible styles equivalent to pointer
  interaction.

## Product UI Constraints

- Render names, state, content, and actions directly; follow
  `ui-copy-guidelines.md` and remove explanatory product prose.
- Loading, empty, failure, continuity, and ending states must come from real
  data. Do not fill gaps with fake characters, metrics, timestamps, or memory.
- The homepage remains a Character collection even when only one record is
  available.

## Scenario: Chat-first Character story entry

### 1. Scope / Trigger

`/characters/:characterSlug` owns public context and new-run PlayerRole
selection. For a signed-in returning player it also reads the current
StoryRun and replaces the first-run identity step with the real current
situation, latest Character message, locked PlayerRole, and a continuation
action. `/characters/:characterSlug/story` restores or starts the selected
Character run and renders the conversation surface without repeating the world
introduction, role cards, or Character picker.

### 2. Signatures

- `GET /api/v1/story-worlds/{story_world_id}/runs/current?character_id={character_id}`
  returns `{ run: StoryRun | null }`.
- `POST /api/v1/story-worlds/{story_world_id}/runs` accepts
  `{ character_id, player_role_id }`.
- `POST /api/v1/story-worlds/{story_world_id}/runs/restart` accepts the locked
  run's `{ character_id, player_role_id }`.

### 3. Contracts

- Accept `playerRoleId` only when it matches a PlayerRole in the public
  Character detail. A sole published PlayerRole may be selected automatically;
  multiple roles require an explicit selection on the Character page.
- The Character page checks access before reading `runs/current`. An active or
  completed run must render from the returned `StoryRun`; do not repeat the
  static opening or expose PlayerRole selection as though no run existed.
- If the Character-page continuity read fails, show a read-only retry instead
  of treating the failure as `run: null`.
- Always read `runs/current` before starting. When it returns an active or
  completed run, render that run directly.
- When it returns `null` and a validated role exists, auto-start at most once
  for the `story_world_id + character_id + player_role_id` entry key.
- Loading, login, failure, and recovery render inside the conversation shell.
  Retry after an uncertain write performs only the current-run read; it never
  silently repeats the write.

### 4. Validation & Error Matrix

- Missing or invalid `playerRoleId` with multiple published roles -> link back
  to the Character page to select one; do not guess.
- Returning player with an active run -> show current node narration, the most
  recent real message from that Character when available, locked PlayerRole,
  and `继续对话`.
- Returning player with a completed run -> show the real ending summary and a
  `查看结局` action; do not reset the page to the first meeting.
- Anonymous or expired session -> show the login action with the canonical
  story return URL; do not create anonymous progress.
- Current-run read failure -> keep the conversation shell and offer a read-only
  reconnect.
- Start, choice, message, or restart failure -> freeze writes until a fresh
  current-run read resolves the authoritative state.

### 5. Good/Base/Bad Cases

- Good: an existing run loads directly into its timeline and composer.
- Base: no run plus a valid role starts once, then displays the returned run.
- Bad: a timed-out POST is replayed automatically on rerender or by a generic
  retry button, risking duplicate state transitions.

### 6. Tests Required

- Typecheck and build the web app.
- Assert an existing run causes no start POST.
- Assert the Character page does not render identity choices when
  `runs/current` returns an active or completed run.
- Assert a failed Character-page continuity read renders retry and no
  selectable PlayerRole cards.
- Assert an authenticated `null` run with a valid role causes one start POST
  across rerenders.
- Assert recovery after a failed write calls only `runs/current`, keeps the
  composer disabled until recovery, and exposes an explicit manual start only
  after a confirmed `null` result.
- Check the timeline and composer remain reachable without horizontal overflow
  on a narrow viewport.

### 7. Wrong vs Correct

```typescript
// Wrong: retrying an uncertain write without reconciling server state.
onRetry={() => startStoryRun(storyWorldId, characterId, playerRoleId)}

// Correct: recover with a read; only a later explicit action may write again.
onRetry={() => loadPrivateStory(true)}
```

## Common Mistakes

- Putting fetch calls or API envelope parsing inside a visual component.
- Repeating PlayerRole/Character contract types in multiple component files.
- Leaving a visually disabled write path active in keyboard/form handlers.
- Treating an icon as its own accessible label.
- Redesigning the page around the current record count.
