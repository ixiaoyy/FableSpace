# Frontend Component Guidelines

Concise React component rules.

## Structure

- Prefer function components.
- Keep route-level data loading in route/client helpers.
- Keep API calls in `frontend/app/lib/` or `frontend/app/product/services/`.
- Extract reusable logic only after repetition is real.

## Props/state

- Pass normalized view models, not raw unknown API responses.
- Keep owner/visitor/public state separate.
- Use local state for simple UI; avoid new global state dependencies without approval.

## Styling / UX

- Preserve FableSpace space-first product direction.
- Mobile/narrow screens must remain usable.
- Primary surfaces should look intentional, not bare admin forms.
- Avoid desktop-only panels blocking visitor-first flows.

## Accessibility

- Buttons/inputs need readable labels or aria labels.
- Interactive targets should be touch-safe.
- Loading/empty/error states should be visible and non-secret-leaking.

## Verification

- UI/build changes: `npm --prefix .\frontend run build`.
- Browser/Playwright only when visual acceptance is actually needed.
- Do not add script assertions for incidental copy/CSS/layout details.

## Anti-patterns

- Scattered `fetch` in components.
- Owner secrets in visitor UI.
- Platform-generated content presented as owner-authored.
- Broad visual rewrites mixed into small fixes.
- Brittle source-string tests for normal component layout.
