# Frontend Component Guidelines

## Component Shape

Use function components. Route modules keep page orchestration at the top and
extract focused rendering units below it. `routes/character-story.tsx` is the
reference for a reducer-owned page with `StoryEntry`, `StoryAccessPanels`,
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

## Common Mistakes

- Putting fetch calls or API envelope parsing inside a visual component.
- Repeating PlayerRole/Character contract types in multiple component files.
- Leaving a visually disabled write path active in keyboard/form handlers.
- Treating an icon as its own accessible label.
- Redesigning the page around the current record count.
