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

- [ ] Frontend normalizer tests cover behavior type, strength preset, governance mode, and status fallbacks.
- [ ] Owner UI can list/create/edit/confirm/reject through service methods.
- [ ] Visitor-facing UI does not expose management controls.
- [ ] `npm --prefix .\frontend test` passes.
- [ ] `npm --prefix .\frontend run build` passes.
- [ ] If visual route changes are made, Playwright/self-acceptance screenshots are recorded before human review.

## Out of Scope

- Complex graph visualization canvas; MVP can be list/form based.
