# Relationship graph owner UI

## Goal

Add a minimal owner-facing UI and frontend API client for relationship graph management.

## Requirements

- Add typed frontend client for relationship edge APIs.
- Add owner-only panel to list relationship edges and pending candidates.
- Support create/edit for behavior type, display name, strength preset, source/target nodes, and status.
- Support confirm/reject for pending candidates.
- Clearly label cross-owner unilateral perspectives so they are not shown as platform truth.
- Keep mobile/narrow-screen usability.

## Acceptance Criteria

- [x] Frontend normalizer tests cover behavior type, strength preset, governance mode, and status fallbacks.
- [x] Owner UI can list/create/edit/confirm/reject through service methods.
- [x] Visitor-facing UI does not expose management controls.
- [x] `npm --prefix .\frontend test` passes.
- [x] `npm --prefix .\frontend run build` passes.
- [x] If visual route changes are made, Playwright/self-acceptance screenshots are recorded before human review.

## Out of Scope

- Complex graph visualization canvas; MVP can be list/form based.
