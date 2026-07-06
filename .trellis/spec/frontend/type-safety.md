# Frontend Type Safety

Concise type/data-boundary rules for the React Router frontend.

## Type organization

- New route API clients: `apps/web/app/lib/`.
- Product-parity/legacy services: `apps/web/app/product/services/`.
- Shared route/component types should stay close to the service/helper that produces them.
- Avoid duplicating backend enum strings in several components; centralize normalization.

## API response handling

- Use shared API helpers for `{ data, meta }` envelope unwrapping.
- Components should receive normalized view models, not raw unknown API payloads.
- Keep owner/visitor/public projections distinct.
- Missing optional fields should render safe empty states.

## Runtime validation

Use small normalization helpers when data crosses boundaries:

- URL/query params;
- localStorage/sessionStorage;
- backend JSON;
- owner-edited JSON blocks;
- imported SillyTavern/community presets.

Helpers should return stable defaults rather than throwing in render paths.

## Schema alignment

- Do not invent frontend-only schema meanings for backend fields.
- `place_type`, `special_space_type`, layout, gender, identity, and access/status values must match backend/docs.
- API/schema changes require corresponding client/test updates.

## Forbidden patterns

- Scattered direct `fetch` calls in components.
- Storing owner API keys or private config in visitor-visible state.
- Treating AI drafts as published content without owner confirmation.
- Large UI/state dependencies without approval.
- Script tests that assert exact UI copy/CSS/source internals for simple layout changes.

## Tests

Keep data helpers, API clients, and safety boundaries easy to typecheck. Avoid adding brittle source-string checks for normal UI copy/layout.

## Context policy

Long scenario examples were removed to reduce AI context. For feature-specific frontend contracts, use the focused spec file from `.trellis/spec/frontend/index.md`.
